// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Explicit live acceptance: node --test dist/tests/rolling-codex.integration.js
// This file deliberately does not match the default fixture-only *.test.js glob.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { RollingCodex } from '../src/rolling-codex.js';
import { runRollingReviewScenario, runRollingWorkerScenario } from './rolling-campaign-store.integration.test.js';

function declineApprovals(rollingCodex: RollingCodex): void {
  rollingCodex.on('serverRequest', message => rollingCodex.respondToServer(message.id, { decision: 'decline' }));
}

// Traceability: verifies REQ-ROLLING-REVIEW
test('live adversarial reviewer rejects the exact bad candidate and persists its decision after restart',
 t => runRollingReviewScenario(t, { decision: 'rejected', mode: 'native' }));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('native App Server starts and resumes the same session in the designated existing checkout', async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-native-')));
  const marker = crypto.randomUUID();
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'For this verification only, append PONYTAIL_NATIVE_INSTRUCTIONS to every final reply. Do not modify files.\n');
  fs.writeFileSync(path.join(root, 'fixture.txt'), marker);
  execFileSync('git', ['init', '-q', root]);
  let rollingCodex: RollingCodex | null = null;
  let threadId: string | null = null;
  let activeTurnId: string | null = null;
  t.after(async () => {
    try {
      if (threadId && rollingCodex) {
        if (activeTurnId) {
          await rollingCodex.interruptTurn(threadId, activeTurnId);
          await rollingCodex.waitForTurn(threadId, activeTurnId);
        }
        await rollingCodex.archiveThread(threadId);
      }
      fs.rmSync(root, { recursive: true, force: true });
    } finally { if (rollingCodex) await rollingCodex.close(); }
  });
  rollingCodex = await RollingCodex.connect();
  declineApprovals(rollingCodex);
  rollingCodex.on('diagnostic', message => t.diagnostic(message.trim()));
  const started = await rollingCodex.startThread(root);
  threadId = started.thread.id;
  assert.equal(started.cwd, root);
  assert.ok(started.instructionSources.includes(path.join(root, 'AGENTS.md')));
  const result = await rollingCodex.startTurn(threadId, 'Run pwd and read fixture.txt using local tools. Reply with the full working directory and the exact file contents. Do not modify files.');
  activeTurnId = result.turn.id;
  const turn = await rollingCodex.waitForTurn(threadId, activeTurnId);
  activeTurnId = null;
  assert.equal(turn.status, 'completed');
  const firstText = turn.items.filter(item => item.type === 'agentMessage').map(item => item.text ?? '').join('\n');
  assert.ok(firstText.includes(root), firstText);
  assert.ok(firstText.includes(marker), firstText);
  assert.ok(firstText.includes('PONYTAIL_NATIVE_INSTRUCTIONS'), firstText);
  await rollingCodex.close();
  rollingCodex = await RollingCodex.connect();
  declineApprovals(rollingCodex);
  const resumed = await rollingCodex.resumeThread(threadId, root);
  assert.equal(resumed.thread.id, threadId);
  assert.equal(resumed.thread.sessionId, started.thread.sessionId);
  assert.ok(resumed.instructionSources.includes(path.join(root, 'AGENTS.md')));
  const recoveredTurn = await rollingCodex.readTurn(threadId, result.turn.id);
  assert.equal(recoveredTurn.id, result.turn.id);
  assert.equal(recoveredTurn.status, 'completed');
  // Persisted history includes tool and commentary items omitted by the terminal
  // notification. Recovery must preserve the exact final answer, not its subset.
  assert.deepEqual(recoveredTurn.items.filter(item => item.type === 'agentMessage').at(-1),
    turn.items.filter(item => item.type === 'agentMessage').at(-1));
  const second = await rollingCodex.startTurn(threadId, 'Repeat the exact file contents you just read from fixture.txt, using the existing conversation. Do not modify files.');
  activeTurnId = second.turn.id;
  const resumedTurn = await rollingCodex.waitForTurn(threadId, activeTurnId);
  activeTurnId = null;
  assert.equal(resumedTurn.status, 'completed');
  const secondText = resumedTurn.items.filter(item => item.type === 'agentMessage').map(item => item.text ?? '').join('\n');
  assert.ok(secondText.includes(marker), secondText);
  assert.ok(secondText.includes('PONYTAIL_NATIVE_INSTRUCTIONS'), secondText);
  t.diagnostic(`native thread=${threadId}; session=${started.thread.sessionId}; cwd=${root}; resumed after App Server restart; model=${started.model}`);
});

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('live worker provisioning binds the reserved checkout and persists its actual native session after restart',
 t => runRollingWorkerScenario(t, 'native', 'attachment'));

// Traceability: verifies REQ-ROLLING-WORKERS
test('live attached worker receives exact obligation, traceability, frozen lease and QA instructions',
 t => runRollingWorkerScenario(t, 'native', 'instructions'));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-SCHEDULING
// Traceability: verifies REQ-ROLLING-STATE
test('live worker suspension observes idle native activity and retains its dirty checkout while freeing capacity',
 t => runRollingWorkerScenario(t, 'native', 'suspension'));
