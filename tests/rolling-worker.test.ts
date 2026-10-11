// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { RollingCodex, type RollingNativeThread } from '../src/rolling-codex.js';
import { readRollingWorkerCreationV1, parseRollingWorkerCreation, identifyRollingWorkerCreation,
 buildRollingWorkerInstructions, type RollingWorkerContext, initializeRollingWorker, observeRollingWorkerInitialization, type RollingWorkerCreationV1 } from '../src/rolling-worker.js';
import { validateRollingSessionMarker, requireRollingSessionMarkerAbsent } from '../src/rolling-worktrees.js';

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-WORKERS
test('creation receipt preserves exact native identity and rejects malformed physical contracts', () => {
 const rollingWorkerCreationV1: RollingWorkerCreationV1 = {schemaVersion:1,threadId:'thread',sessionId:'session',rootPath:'/fixture'};
 assert.deepEqual(parseRollingWorkerCreation(JSON.stringify(rollingWorkerCreationV1)),rollingWorkerCreationV1);
 for (const value of [null,[], {...rollingWorkerCreationV1,extra:true}, {...rollingWorkerCreationV1,schemaVersion:2},
  {...rollingWorkerCreationV1,sessionId:' session'}, {...rollingWorkerCreationV1,threadId:'thread\nforeign'},
  {...rollingWorkerCreationV1,rootPath:'relative'}, {...rollingWorkerCreationV1,rootPath:'/fixture/../foreign'}]) {
  assert.throws(() => readRollingWorkerCreationV1(value));
 }
 for (const token of ['1.0','1e0','9007199254740993']) {
  assert.throws(() => parseRollingWorkerCreation(JSON.stringify(rollingWorkerCreationV1).replace('"schemaVersion":1',`"schemaVersion":${token}`)));
 }
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('initialization uses the returned native thread directly and binds only its ignored marker', async testContext => {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-worker-')));
 const rollingCodex = new RollingCodex({executable:process.execPath,argv:[path.join(__dirname,'fixtures/rolling-codex-server.js')]});
 testContext.after(async () => {await rollingCodex.close();fs.rmSync(root,{recursive:true,force:true});});
 execFileSync('git',['init','-q',root]);
 fs.writeFileSync(path.join(root,'.gitignore'),'/session_id.txt\n');
 await rollingCodex.initialize();
 const rollingNativeThread = await rollingCodex.startThread(root);
 const rollingWorkerCreationV1 = identifyRollingWorkerCreation(rollingNativeThread,root);
 const foreignRollingNativeThread: RollingNativeThread = {...rollingNativeThread,thread:{...rollingNativeThread.thread,sessionId:'foreign'}};
 await assert.rejects(initializeRollingWorker(rollingCodex,foreignRollingNativeThread,rollingWorkerCreationV1),/identity differs/);
 const rollingWorkerInitialization = await initializeRollingWorker(rollingCodex,rollingNativeThread,rollingWorkerCreationV1);
 assert.deepEqual(await observeRollingWorkerInitialization(rollingCodex,rollingWorkerInitialization),rollingWorkerCreationV1);
 assert.equal(fs.readFileSync(path.join(root,'session_id.txt'),'utf8'),'session-fixture\n');
 assert.equal((await rollingCodex.resumeThread(rollingNativeThread.thread.id,root)).thread.sessionId,rollingWorkerCreationV1.sessionId);
 await assert.rejects(initializeRollingWorker(rollingCodex,rollingNativeThread,rollingWorkerCreationV1),/marker is still present/);
 validateRollingSessionMarker(root,rollingWorkerCreationV1.sessionId);
 fs.writeFileSync(path.join(root,'session_id.txt'),'foreign');
 assert.throws(() => validateRollingSessionMarker(root,rollingWorkerCreationV1.sessionId),/marker differs/);
 fs.unlinkSync(path.join(root,'session_id.txt'));
 fs.symlinkSync('missing',path.join(root,'session_id.txt'));
 assert.throws(() => requireRollingSessionMarkerAbsent(root),/marker is still present/);
 fs.unlinkSync(path.join(root,'session_id.txt'));
 fs.writeFileSync(path.join(root,'session_id.txt'),'session-fixture');
 execFileSync('git',['-C',root,'add','-f','session_id.txt']);
 assert.throws(() => validateRollingSessionMarker(root,rollingWorkerCreationV1.sessionId),/marker must be untracked/);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections', () => {
 const rollingWorkerContext: RollingWorkerContext = {
  rollingWorkerCreationV1:{schemaVersion:1,threadId:'thread',sessionId:'session',rootPath:'/fixture'},
  obligation:{id:'OBL-1',category:'gate',requirementIds:['REQ-FIXTURE'],responsibilityId:'owner',condition:'Exact fixture condition',
   criterion:'Exact fixture proof',dependsOn:[],acceptanceGroups:['acceptance'],supersedes:null,
   execution:{sprintId:null,taskletIds:[],plannedPaths:[],operations:['inspect'],selection:[],target:null}},
  requirements:[{id:'REQ-FIXTURE',path:'pm/requirements/fixture.md',digest:'a'.repeat(64)}],
  binding:{obligationId:'OBL-1',implementationIds:['IMPL-FIXTURE'],sourcePaths:['fixture.ts'],
   acceptances:[{id:'ACCEPT-FIXTURE',arcId:'ARC-FIXTURE',stepId:'STEP-FIXTURE'}],
   unitTests:[{id:'UNIT-FIXTURE',path:'fixture.test.ts',selection:['unit selection']}],
   integrationTests:[{id:'INTEGRATION-FIXTURE',path:'fixture.test.ts',selection:['integration selection']}],exclusiveResources:[]},
  lease:{schemaVersion:1,scopeId:'fixture',baselineId:'BASELINE-1',graphDigest:'b'.repeat(64),generation:'generation',assessor:'coordinator',authority:['fixture'],
   binding:{obligationId:'OBL-1',revisionId:'BIND-1',dependsOn:[],execution:{sprintId:null,taskletIds:[],plannedPaths:['fixture.ts'],
    operations:['inspect','edit','test'],selection:['focused fixture'],target:{identity:'local',profile:'fixture'}}}},
  configuration:{mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/fixture',maxActiveWorkers:1,publicationSize:1},
  qa:{focused:[['node','--test','fixture.test.ts']],publication:[['npm','test']]}
 };
 const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
 const marker = 'Worker responsibility: ';
 const received: unknown = JSON.parse(instructions.slice(instructions.lastIndexOf(marker)+marker.length));
 assert.deepEqual(received,rollingWorkerContext);
 assert.ok(instructions.includes('publication QA belongs to the coordinator publication gate'));
 assert.ok(instructions.includes('coordinator graph is authoritative'));
 assert.throws(() => buildRollingWorkerInstructions({...rollingWorkerContext,requirements:[]}),/requirement references/);
 assert.throws(() => buildRollingWorkerInstructions({...rollingWorkerContext,binding:{...rollingWorkerContext.binding,obligationId:'OBL-2'}}),/frozen obligation/);
});
