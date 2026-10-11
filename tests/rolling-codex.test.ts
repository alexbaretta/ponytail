// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { stringify } from 'lossless-json';
import { RollingCodex, RollingNativeResponseError, RollingObservationTimeout,
  RollingUnknownOutcome, type RollingNativeNotification } from '../src/rolling-codex.js';
import { startRollingReviewTurn, observeRollingReviewTurn, type RollingReviewRequestV1 } from '../src/rolling-review.js';

interface RollingProtocolFixture {
  readonly root: string;
  readonly rollingCodex: RollingCodex;
}

async function fixture(testContext: TestContext, requestTimeoutMs = 1000): Promise<RollingProtocolFixture> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-protocol-')));
  const program = path.join(__dirname, 'fixtures/rolling-codex-server.js');
  const rollingCodex = new RollingCodex({ executable: process.execPath, argv: [program], requestTimeoutMs });
  testContext.after(async () => { await rollingCodex.close(); fs.rmSync(root, { recursive: true, force: true }); });
  await rollingCodex.initialize();
  return { root, rollingCodex };
}

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns', async testContext => {
  const { root, rollingCodex } = await fixture(testContext);
  const started = await rollingCodex.startThread(root);
  assert.equal(started.thread.sessionId, 'session-fixture');
  assert.deepEqual(started.instructionSources, [path.join(root, 'AGENTS.md')]);
  const resumed = await rollingCodex.resumeThread(started.thread.id, root);
  assert.equal(resumed.thread.sessionId, started.thread.sessionId);
  await assert.rejects(rollingCodex.resumeThread('wrong-thread', root),
    (cause: unknown) => cause instanceof RollingNativeResponseError && cause.nativeResult !== undefined);
  for (const status of ['completed', 'failed', 'interrupted']) {
    const turn = await rollingCodex.startTurn(started.thread.id, status);
    assert.equal((await rollingCodex.waitForTurn(started.thread.id, turn.turn.id)).status, status);
  }
  await rollingCodex.interruptTurn(started.thread.id, 'turn-fixture');
  assert.equal(stringify(await rollingCodex.request('unsafe-number', {})), '{"value":9007199254740993}');
  const answer = new Promise<RollingNativeNotification>(resolve => rollingCodex.once('notification', resolve));
  rollingCodex.once('serverRequest', message => rollingCodex.respondToServer(message.id, { decision: 'decline' }));
  await rollingCodex.request('approval', {});
  assert.equal((await answer).method, 'approval/answered');
  await assert.rejects(rollingCodex.request('explode', {}), /fixture failure/);
  const pending = await rollingCodex.startTurn(started.thread.id, 'pending');
  await assert.rejects(rollingCodex.close(), /observe terminal turns/);
  await rollingCodex.interruptTurn(started.thread.id, pending.turn.id);
  assert.equal((await rollingCodex.waitForTurn(started.thread.id, pending.turn.id)).status, 'interrupted');
  await rollingCodex.archiveThread(started.thread.id);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('timeouts retain unknown outcome and late responses do not trigger a retry', async testContext => {
  const { rollingCodex } = await fixture(testContext);
  rollingCodex.requestTimeoutMs = 20;
  const late = new Promise<Readonly<Record<string, unknown>>>(resolve => rollingCodex.once('lateResponse', resolve));
  await assert.rejects(rollingCodex.request('late', {}), (cause: unknown) => cause instanceof RollingUnknownOutcome);
  assert.equal((await late).id, '2');
  await assert.rejects(rollingCodex.waitForTurn('thread-fixture', 'missing', 20),
    (cause: unknown) => cause instanceof RollingObservationTimeout);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('lost or malformed responses reject all affected pending operations', async testContext => {
  for (const method of ['drop', 'malformed']) await testContext.test(method, async childTestContext => {
    const { rollingCodex } = await fixture(childTestContext);
    await assert.rejects(rollingCodex.request(method, {}), (cause: unknown) => cause instanceof RollingUnknownOutcome);
  });
});

// Traceability: verifies REQ-ROLLING-REVIEW
test('review dispatch resumes the assigned native reviewer and observes its exact final decision', async testContext => {
  const { root, rollingCodex } = await fixture(testContext);
  const rollingReviewRequestV1: RollingReviewRequestV1 = { schemaVersion: 1, id: 'review-fixture', campaignId: 'campaign',
    assignmentId: 'assignment', generation: 'generation', baseCommit: 'a'.repeat(40), revision: 'b'.repeat(40), reviewerSessionId: 'session-fixture' };
  await assert.rejects(startRollingReviewTurn(rollingCodex, { ...rollingReviewRequestV1, reviewerSessionId: 'other' }, 'thread-fixture', root), /native session differs/);
  const rollingReviewTurn = await startRollingReviewTurn(rollingCodex, rollingReviewRequestV1, 'thread-fixture', root);
  const rollingReviewOutcomeV1 = await observeRollingReviewTurn(rollingCodex, rollingReviewTurn);
  assert.equal(rollingReviewOutcomeV1.reviewId, rollingReviewRequestV1.id);
  assert.equal(rollingReviewOutcomeV1.revision, rollingReviewRequestV1.revision);
  assert.equal(rollingReviewOutcomeV1.reviewerSessionId, rollingReviewRequestV1.reviewerSessionId);
  assert.equal(rollingReviewOutcomeV1.decision, 'accepted');
  assert.deepEqual(await observeRollingReviewTurn(rollingCodex, rollingReviewTurn), rollingReviewOutcomeV1);
});
