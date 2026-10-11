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
import {buildRollingRetirementInstructions, type RollingWorkerRetirementV1} from '../src/rolling-worker.js';
import { runRollingReviewScenario, runRollingWorkerScenario } from './rolling-campaign-store.integration.test.js';

function declineApprovals(rollingCodex: RollingCodex): void {
  rollingCodex.on('serverRequest', message => rollingCodex.respondToServer(message.id, { decision: 'decline' }));
}

// Traceability: verifies REQ-ROLLING-REVIEW
test('live adversarial reviewer rejects the exact bad candidate and persists its decision after restart',
 t => runRollingReviewScenario(t, { decision: 'rejected', mode: 'native' }));

// Traceability: verifies REQ-ROLLING-REVIEW
test('live replacement reviewer freshly reviews the exact candidate after recorded original reviewer loss',
 t => runRollingReviewScenario(t,{decision:'rejected',mode:'native',replaceLostReviewer:true}));

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

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-SCHEDULING
// Traceability: verifies REQ-ROLLING-STATE
test('live worker resumption restores its original native session with refreshed scope and campaign base',
 t => runRollingWorkerScenario(t,'native','resumption'));

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-WORKERS
test('live worker creation recovery attaches original initialization after coordinator and native connection restart',
 t => runRollingWorkerScenario(t,'native','recovery'));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-REVIEW
test('live worker implements and semantically rebases its exact candidate before submission',
 t => runRollingWorkerScenario(t,'native','code'));

// Traceability: verifies REQ-ROLLING-REVIEW
test('live rejected candidate returns to its original worker and is accepted by its original reviewer after correction and semantic rebase',
 t => runRollingWorkerScenario(t,'native','code',true));

// Traceability: verifies REQ-ROLLING-WORKERS
test('live worker acknowledges retirement, becomes idle and reconciles archival of the same actor',async t => {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-native-retirement-')));
 execFileSync('git',['init','-q',root]);
 fs.writeFileSync(path.join(root,'AGENTS.md'),'Do not edit files or run commands. Reply briefly to the given notification.\n');
 const rollingCodex = await RollingCodex.connect({executable:'env',argv:['-u','NODE_TEST_CONTEXT','codex','app-server','--listen','stdio://']});
 declineApprovals(rollingCodex);
 let threadId:string | null = null, activeTurnId:string | null = null, archived = false;
 t.after(async()=> {
  try {
   if (threadId !== null && !archived) {
    if (activeTurnId !== null) {
     const turn = await rollingCodex.readTurn(threadId,activeTurnId);
     if (turn.status === 'inProgress') {await rollingCodex.interruptTurn(threadId,activeTurnId);await rollingCodex.waitForTurn(threadId,activeTurnId);}
    }
    assert.equal((await rollingCodex.readThreadActivity(threadId)).status,'idle');
    await rollingCodex.archiveThread(threadId);
   }
   fs.rmSync(root,{recursive:true,force:true});
  } finally {await rollingCodex.close();}
 });
 const rollingNativeThread = await rollingCodex.startThread(root);threadId = rollingNativeThread.thread.id;
 const initialization = await rollingCodex.startTurn(threadId,'Acknowledge this verification worker initialization. Do not edit files or run commands.');
 activeTurnId = initialization.turn.id;
 assert.equal((await rollingCodex.waitForTurn(threadId,activeTurnId)).status,'completed');activeTurnId = null;
 assert.equal((await rollingCodex.readThreadActivity(threadId)).status,'idle');
 const rollingWorkerRetirementV1:RollingWorkerRetirementV1 = {schemaVersion:1,campaignId:'native-retirement-fixture',
  assignmentId:crypto.randomUUID(),generation:crypto.randomUUID(),resourceGeneration:crypto.randomUUID(),number:101,
  rootPath:root,coordinatorRoot:root,threadId,sessionId:rollingNativeThread.thread.sessionId,integratedRevision:'a'.repeat(40)};
 const notification = await rollingCodex.startTurn(threadId,buildRollingRetirementInstructions(rollingWorkerRetirementV1));
 activeTurnId = notification.turn.id;
 const rollingNativeTurn = await rollingCodex.waitForTurn(threadId,activeTurnId);
 assert.equal(rollingNativeTurn.status,'completed');activeTurnId = null;
 assert.ok(rollingNativeTurn.items.some(item=>item.type === 'agentMessage' && item.text?.trim()));
 assert.equal((await rollingCodex.readThreadActivity(threadId)).status,'idle');
 assert.equal(await rollingCodex.isThreadArchived(threadId,root),false);
 await rollingCodex.archiveThread(threadId);archived = true;
 assert.equal(await rollingCodex.isThreadArchived(threadId,root),true);
 assert.equal(execFileSync('git',['-C',root,'status','--porcelain'],{encoding:'utf8'}),'?? AGENTS.md\n');
 t.diagnostic(`native retirement thread=${threadId}; session=${rollingNativeThread.thread.sessionId}; terminal notification=${notification.turn.id}; idle verified; archived inventory confirms the exact actor without another turn`);
});
