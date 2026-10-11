// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readRollingReviewRequestV1, readRollingReviewOutcomeV1, parseRollingReviewRequest, parseRollingReviewOutcome,
 validateRollingReviewOutcome, RollingReviewRequestReaders, RollingReviewOutcomeReaders, readRollingReviewTurn, type RollingReviewTurn,
 readRollingReviewReplacementV1, parseRollingReviewReplacement, RollingReviewReplacementReaders,
 type RollingReviewReplacementV1, type RollingReviewRequestV1, type RollingReviewAcceptedV1, type RollingReviewRejectedV1 } from '../src/rolling-review.js';
function request(): RollingReviewRequestV1 {
 return { schemaVersion: 1, id: 'review', campaignId: 'campaign', assignmentId: 'assignment', generation: 'generation',
  baseCommit: 'a'.repeat(40), revision: 'b'.repeat(40), reviewerSessionId: 'reviewer' };
}
function accepted(): RollingReviewAcceptedV1 {
 return { schemaVersion: 1, reviewId: 'review', revision: 'b'.repeat(40), reviewerSessionId: 'reviewer', completedAt: '2026-10-11T10:00:00Z', decision: 'accepted', findings: [] };
}

// Traceability: verifies REQ-ROLLING-REVIEW
test('reviewer replacement records loss and fresh identities without changing historical review contracts', () => {
 const rollingReviewReplacementV1: RollingReviewReplacementV1 = { schemaVersion:1, reviewId:'original', replacementReviewId:'replacement',
  previousReviewerSessionId:'lost-reviewer', reviewerSessionId:'new-reviewer', recordedAt:'2026-10-11T18:00:00Z', lossReference:'host observation: original reviewer unavailable' };
 assert.deepEqual(Object.keys(RollingReviewReplacementReaders), ['V1']);
 assert.deepEqual(parseRollingReviewReplacement(JSON.stringify(rollingReviewReplacementV1)), rollingReviewReplacementV1);
 for (const value of [ { ...rollingReviewReplacementV1,schemaVersion:2 }, { ...rollingReviewReplacementV1,lossReference:'' },
  { ...rollingReviewReplacementV1,replacementReviewId:'original' }, { ...rollingReviewReplacementV1,reviewerSessionId:'lost-reviewer' },
  { ...rollingReviewReplacementV1,recordedAt:'not a timestamp' }, { ...rollingReviewReplacementV1,reason:'extra' } ]) {
  assert.throws(() => readRollingReviewReplacementV1(value));
 }
 for (const token of ['1.0','1e0','9007199254740993']) assert.throws(() => parseRollingReviewReplacement(JSON.stringify(rollingReviewReplacementV1).replace('"schemaVersion":1',`"schemaVersion":${token}`)));
});

test('shipped review runtime loads its generated native adapter outside the dist tree', async () => {
 const loaded: unknown = await import(pathToFileURL(path.resolve(__dirname, '../../src/rolling-review.js')).href);
 assert.ok(loaded !== null && typeof loaded === 'object');
});
// Traceability: verifies REQ-ROLLING-REVIEW
test('physical V1 requests and decisions retain exact immutable candidate and reviewer identities', () => {
 const rollingReviewRequestV1: RollingReviewRequestV1 = request();
 const rollingReviewAcceptedV1: RollingReviewAcceptedV1 = accepted();
 const rollingReviewRejectedV1: RollingReviewRejectedV1 = { ...rollingReviewAcceptedV1, decision: 'rejected', findings: ['Missing failure-path proof.'] };
 const original = JSON.stringify({ rollingReviewRequestV1, rollingReviewAcceptedV1, rollingReviewRejectedV1 });
 assert.deepEqual(Object.keys(RollingReviewRequestReaders), ['V1']);
 assert.deepEqual(Object.keys(RollingReviewOutcomeReaders), ['V1']);
 assert.deepEqual(parseRollingReviewRequest(JSON.stringify(rollingReviewRequestV1)), rollingReviewRequestV1);
 for (const outcome of [rollingReviewAcceptedV1, rollingReviewRejectedV1]) {
  assert.deepEqual(parseRollingReviewOutcome(JSON.stringify(outcome)), outcome);
  validateRollingReviewOutcome(rollingReviewRequestV1, outcome);
 }
 assert.equal(JSON.stringify({ rollingReviewRequestV1, rollingReviewAcceptedV1, rollingReviewRejectedV1 }), original);
});

// Traceability: verifies REQ-ROLLING-REVIEW
test('review completion requires the exact terminal turn and validated final message', () => {
 const rollingReviewTurn: RollingReviewTurn = { request: request(),
  thread: { thread: { id: 'thread', sessionId: 'reviewer' }, cwd: '/fixture', instructionSources: [], model: null },
  started: { turn: { id: 'turn' } } };
 const rollingNativeTurn = { id: 'turn', status: 'completed', items: [{ type: 'agentMessage', text: JSON.stringify(accepted()) }] };
 assert.deepEqual(readRollingReviewTurn(rollingReviewTurn, rollingNativeTurn), accepted());
 for (const status of ['failed', 'interrupted', 'inProgress']) assert.throws(() => readRollingReviewTurn(rollingReviewTurn, { ...rollingNativeTurn, status }), /assigned completed/);
 assert.throws(() => readRollingReviewTurn(rollingReviewTurn, { ...rollingNativeTurn, id: 'other' }), /assigned completed/);
 assert.throws(() => readRollingReviewTurn(rollingReviewTurn, { ...rollingNativeTurn, items: [] }), /lacks a final decision/);
 assert.throws(() => readRollingReviewTurn(rollingReviewTurn, { ...rollingNativeTurn, items: [{ type: 'agentMessage', text: JSON.stringify({ ...accepted(), revision: 'c'.repeat(40) }) }] }), /differs from assigned/);
 assert.throws(() => readRollingReviewTurn(rollingReviewTurn, { ...rollingNativeTurn, items: [...rollingNativeTurn.items, { type: 'agentMessage', text: 'No decision.' }] }));
});

test('unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary', () => {
 const rollingReviewRequestV1: RollingReviewRequestV1 = request();
 const rollingReviewAcceptedV1: RollingReviewAcceptedV1 = accepted();
 const invalidRequests: readonly unknown[] = [null, { ...rollingReviewRequestV1, schemaVersion: 2 }, { ...rollingReviewRequestV1, status: 'accepted' },
  { ...rollingReviewRequestV1, reviewerSessionId: '' }, { ...rollingReviewRequestV1, generation: 'bad\nidentity' }, { ...rollingReviewRequestV1, revision: 'not-a-commit' }];
 for (const value of invalidRequests) {
  const original = JSON.stringify(value); assert.throws(() => readRollingReviewRequestV1(value)); assert.equal(JSON.stringify(value), original);
 }
 const invalidOutcomes: readonly unknown[] = [{ ...rollingReviewAcceptedV1, schemaVersion: 2 }, { ...rollingReviewAcceptedV1, decision: 'lost' },
  { ...rollingReviewAcceptedV1, decision: 'rejected' }, { ...rollingReviewAcceptedV1, findings: [5] }, { ...rollingReviewAcceptedV1, completedAt: 'never' },
  { ...rollingReviewAcceptedV1, revision: 'bad' },
  { ...rollingReviewAcceptedV1, decision: 'rejected', findings: [{ path: 'fixture/current.ts', description: 'Wrong value.' }] }];
 for (const value of invalidOutcomes) assert.throws(() => readRollingReviewOutcomeV1(value));
 for (const token of ['1.0','1e0','9007199254740993']) {
  assert.throws(() => parseRollingReviewRequest(JSON.stringify(rollingReviewRequestV1).replace('"schemaVersion":1', `"schemaVersion":${token}`)));
  assert.throws(() => parseRollingReviewOutcome(JSON.stringify(rollingReviewAcceptedV1).replace('"schemaVersion":1', `"schemaVersion":${token}`)));
 }
});

test('candidate, review and reviewer mismatches cannot transfer approval to another request', () => {
 const rollingReviewRequestV1: RollingReviewRequestV1 = request();
 const rollingReviewAcceptedV1: RollingReviewAcceptedV1 = accepted();
 for (const outcome of [{ ...rollingReviewAcceptedV1, reviewId: 'other' }, { ...rollingReviewAcceptedV1, revision: 'c'.repeat(40) },
  { ...rollingReviewAcceptedV1, reviewerSessionId: 'other' }]) assert.throws(() => validateRollingReviewOutcome(rollingReviewRequestV1, outcome), /differs from assigned/);
});
