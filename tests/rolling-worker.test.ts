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
 readRollingWorkerResumptionV1, parseRollingWorkerResumption, type RollingWorkerResumptionV1, readRollingWorkerStopV1, parseRollingWorkerStop, type RollingWorkerStopV1, buildRollingWorkerInstructions, type RollingWorkerContext, initializeRollingWorker, observeRollingWorkerInitialization, type RollingWorkerCreationV1 } from '../src/rolling-worker.js';
import { validateRollingSessionMarker, requireRollingSessionMarkerAbsent } from '../src/rolling-worktrees.js';
import { parseRollingWorkerSubmission, type RollingWorkerSubmissionV1 } from '../src/rolling-worker-submission.js';

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
  assignmentId:'assignment',
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
  baseCommit:'c'.repeat(40),rejectedReview:null,
  qa:{focused:[['node','--test','fixture.test.ts']],publication:[['npm','test']]}
 };
 const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
 const marker = 'Worker responsibility: ';
 const received: unknown = JSON.parse(instructions.slice(instructions.lastIndexOf(marker)+marker.length));
 assert.deepEqual(received,rollingWorkerContext);
 assert.ok(instructions.includes('publication QA belongs to the coordinator publication gate'));
 assert.ok(instructions.includes('coordinator graph is authoritative'));
 assert.ok(instructions.includes('For a no-edit obligation, return fresh inspection and proof'));
 assert.ok(instructions.includes('When submitting code changes, fetch the configured campaign branch'));
 assert.ok(instructions.includes('Request sandbox escalation for each authorized Git mutation before its first execution (sandbox_permissions=require_escalated).'));
 const correctedRollingWorkerContext: RollingWorkerContext = { ...rollingWorkerContext,
  rejectedReview: { schemaVersion:1,reviewId:'review',revision:'a'.repeat(40),reviewerSessionId:'original-reviewer',
   completedAt:'2026-10-11T17:00:00.000Z',decision:'rejected',findings:['fixture.ts:1: Correct the missing failure path.'] } };
 const correctedInstructions = buildRollingWorkerInstructions(correctedRollingWorkerContext);
 assert.ok(correctedInstructions.includes('Correct every finding from the original reviewer before resubmission.'));
 assert.ok(correctedInstructions.includes(JSON.stringify(correctedRollingWorkerContext.rejectedReview)));
 const outline = instructions.slice(instructions.indexOf('Code submission outline: ') + 'Code submission outline: '.length).split('\n')[0];
 assert.ok(outline);
 const submissionOutline:unknown = JSON.parse(outline);
 const expectedRollingWorkerSubmissionV1:RollingWorkerSubmissionV1 = {schemaVersion:1,campaignId:'fixture',assignmentId:'assignment',generation:'generation',
  sessionId:'session',graphDigest:'b'.repeat(64),revision:'<actual final HEAD>',baseCommit:'c'.repeat(40),stopped:true,
  proof:[{operation:'test',evidence:{command:'<actual command string>',selection:['focused fixture'],
   target:{identity:'local',profile:'fixture',verification:'<relative verification file>'},revision:'<actual final HEAD>',dirty:false,
   startedAt:'<actual ISO timestamp>',completedAt:'<actual ISO timestamp>',outcome:'pass',skips:0,failures:0,
   inputs:[{path:'<relative assessed input>',digest:'<actual SHA-256>'}],outputPath:'<relative output file>',finalization:'pass'}}]};
 assert.deepEqual(submissionOutline,expectedRollingWorkerSubmissionV1);
 assert.deepEqual(parseRollingWorkerSubmission(outline
  .replaceAll('<actual final HEAD>','d'.repeat(40)).replaceAll('<actual command string>','node --test fixture.test.ts')
  .replaceAll('<relative verification file>','tmp/verification.json').replaceAll('<actual ISO timestamp>','2026-10-11T09:00:00Z')
  .replaceAll('<relative assessed input>','fixture.ts').replaceAll('<actual SHA-256>','e'.repeat(64))
  .replaceAll('<relative output file>','tmp/focused.txt')).proof[0]?.evidence.finalization,'pass');
 assert.ok(instructions.includes('final message must be only strict JSON'));
 assert.ok(instructions.includes('Use exactly the physical record keys shown in the outline, at every level'));
 assert.throws(() => buildRollingWorkerInstructions({...rollingWorkerContext,requirements:[]}),/requirement references/);
 assert.throws(() => buildRollingWorkerInstructions({...rollingWorkerContext,binding:{...rollingWorkerContext.binding,obligationId:'OBL-2'}}),/frozen obligation/);
});

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint', () => {
 const rollingWorkerStopV1:RollingWorkerStopV1 = {schemaVersion:1,campaignId:'fixture',assignmentId:'assignment',generation:'generation',
  threadId:'thread',sessionId:'session',observedAt:'2026-10-11T13:00:00Z',nativeStatus:'idle',turn:{id:'turn',status:'interrupted'},
  checkpoint:{revision:'a'.repeat(40),gitStatus:'?? unfinished.ts\n'}};
 assert.deepEqual(parseRollingWorkerStop(JSON.stringify(rollingWorkerStopV1)),rollingWorkerStopV1);
 assert.deepEqual(readRollingWorkerStopV1({...rollingWorkerStopV1,turn:null}).turn,null);
 for (const value of [null, {...rollingWorkerStopV1,extra:true}, {...rollingWorkerStopV1,schemaVersion:2},
  {...rollingWorkerStopV1,nativeStatus:'active'}, {...rollingWorkerStopV1,nativeStatus:'notLoaded'},
  {...rollingWorkerStopV1,turn:{id:'turn',status:'inProgress'}}, {...rollingWorkerStopV1,turn:{id:'turn',status:'completed',extra:true}},
  {...rollingWorkerStopV1,checkpoint:{...rollingWorkerStopV1.checkpoint,gitStatus:'?? unfinished.ts\0'}},
  {...rollingWorkerStopV1,observedAt:'unknown'}, {...rollingWorkerStopV1,checkpoint:{revision:'short',gitStatus:''}},
  {...rollingWorkerStopV1,sessionId:'foreign\nsession'}]) assert.throws(() => readRollingWorkerStopV1(value));
 assert.throws(() => parseRollingWorkerStop(JSON.stringify(rollingWorkerStopV1).replace('"schemaVersion":1','"schemaVersion":1.0')));
});

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('resumption receipt retains original native identity and an exact refreshed campaign base',() => {
 const rollingWorkerResumptionV1:RollingWorkerResumptionV1 = {schemaVersion:1,
  rollingWorkerCreationV1:{schemaVersion:1,threadId:'thread',sessionId:'session',rootPath:'/fixture'},baseCommit:'a'.repeat(40)};
 assert.deepEqual(parseRollingWorkerResumption(JSON.stringify(rollingWorkerResumptionV1)),rollingWorkerResumptionV1);
 for (const value of [null,{...rollingWorkerResumptionV1,extra:true},{...rollingWorkerResumptionV1,schemaVersion:2},
  {...rollingWorkerResumptionV1,baseCommit:'short'},{...rollingWorkerResumptionV1,rollingWorkerCreationV1:{...rollingWorkerResumptionV1.rollingWorkerCreationV1,extra:true}}])
  assert.throws(() => readRollingWorkerResumptionV1(value));
 assert.throws(() => parseRollingWorkerResumption(JSON.stringify(rollingWorkerResumptionV1).replace('"schemaVersion":1','"schemaVersion":1.0')));
});
