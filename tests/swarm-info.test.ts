// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import type {SwarmWorkerBinding} from '../src/swarm-store.js';
import {readSwarmInfo,readSwarmInfoV1,readSwarmInfoV2,readSwarmInfoV3,readSwarmInfoV4,observeSwarmWorkers,readSwarmWorktreeDeletionReportV1,renderSwarmInfo,type SwarmInfoV1,type SwarmInfoV2,type SwarmInfoV3,type SwarmInfoV4} from '../src/swarm-info.js';

const swarmInfoV1:SwarmInfoV1={schemaVersion:1,ownerRoot:'/repo/user-001',ownershipSource:'campaign-leases',
 coordinator:{kind:'unrecorded'},nativeActivity:'unobserved',worktrees:[{number:101,rootPath:'/repo/managed/101',present:true,
  state:'ACTIVE',assignmentId:'assignment',campaignId:'campaign',obligationId:'OBL-1',sessionId:'native-session'}]};

// Traceability: verifies REQ-SWARM-INFO
test('versioned inventory retains resource associations without inventing native activity',()=>{
 assert.deepEqual(readSwarmInfoV1(JSON.parse(JSON.stringify(swarmInfoV1))),swarmInfoV1);
 const swarmInfoV4:SwarmInfoV4=readSwarmInfo(swarmInfoV1);
 const output=renderSwarmInfo(swarmInfoV4);
 assert.match(output,/Coordinator session: not recorded/);
 assert.match(output,/Native activity: not observed/);
 assert.match(output,/101 ACTIVE \/repo\/managed\/101/);
 assert.match(output,/session: native-session \| assignment: assignment/);
 assert.doesNotMatch(output,/native-session.*running/);
 assert.match(renderSwarmInfo({...swarmInfoV4,worktrees:[]}),/Managed worktrees \(0\)/);
});

// Traceability: verifies REQ-SWARM-OWNERSHIP
// Traceability: verifies REQ-SWARM-INFO
test('V2 distinguishes enrolled empty bindings from legacy unknown coordinators',()=>{
 const swarmInfoV2:SwarmInfoV2={...swarmInfoV1,schemaVersion:2,ownershipSource:'swarm-owners-and-campaign-leases',coordinator:{kind:'bound',sessionId:'coordinator',threadId:'coordinator-thread'}};
 assert.deepEqual(readSwarmInfoV2(JSON.parse(JSON.stringify(swarmInfoV2))),swarmInfoV2);
 assert.match(renderSwarmInfo(readSwarmInfo(swarmInfoV2)),/Coordinator session: coordinator/);
 assert.match(renderSwarmInfo(readSwarmInfo({...swarmInfoV2,coordinator:{kind:'unbound'}})),/Coordinator session: not bound/);
 for(const coordinator of [{kind:'bound'},{kind:'unbound',sessionId:'invented'},{kind:'unknown'},null]) assert.throws(()=>readSwarmInfoV2({...swarmInfoV2,coordinator}));
 assert.throws(()=>readSwarmInfo({...swarmInfoV2,schemaVersion:5}));
});

// Traceability: verifies REQ-SWARM-INFO
test('inventory reader rejects foreign versions, extra fields and unsafe identities',()=>{
 const invalidInputs:readonly unknown[]=[null,[],{...swarmInfoV1,schemaVersion:2},{...swarmInfoV1,extra:true},
  {...swarmInfoV1,ownerRoot:'relative'},{...swarmInfoV1,nativeActivity:'active'},
  {...swarmInfoV1,coordinator:{kind:'unrecorded',sessionId:'invented'}},
  {...swarmInfoV1,worktrees:[{...swarmInfoV1.worktrees[0],number:100}]},
  {...swarmInfoV1,worktrees:[{...swarmInfoV1.worktrees[0],number:'9007199254740993'}]},
  {...swarmInfoV1,worktrees:[{...swarmInfoV1.worktrees[0],present:'yes'}]}];
 for(const invalidInput of invalidInputs) assert.throws(()=>readSwarmInfoV1(invalidInput));
});

// Traceability: verifies REQ-SWARM-INFO
// Traceability: verifies REQ-SWARM-WORKTREES
test('V3 reports standalone swarm membership and preserves historical assignment normalization',()=>{
 const swarmInfoV3:SwarmInfoV3={schemaVersion:3,ownerRoot:swarmInfoV1.ownerRoot,ownershipSource:'campaign-leases',coordinator:{kind:'unrecorded'},nativeActivity:'unobserved',worktrees:[{number:102,rootPath:'/repo/managed/102',present:true,state:'RESERVED',
  membership:{kind:'swarm',generation:'generation'},assignment:null}]};
 assert.deepEqual(readSwarmInfoV3(JSON.parse(JSON.stringify(swarmInfoV3))),swarmInfoV3);
 assert.match(renderSwarmInfo(readSwarmInfo(swarmInfoV3)),/membership: swarm \| generation: generation/);
 assert.match(renderSwarmInfo(readSwarmInfo(swarmInfoV3)),/assignment: \(none\)/);
 assert.equal(readSwarmInfo(swarmInfoV1).worktrees[0]?.assignment?.sessionId,'native-session');
 const worktree=swarmInfoV3.worktrees[0];assert.ok(worktree);
 for(const membership of [{kind:'campaign-lease'},{kind:'swarm'},{kind:'unknown'},null])
  assert.throws(()=>readSwarmInfoV3({...swarmInfoV3,worktrees:[{...worktree,membership}]}));
});

// Traceability: verifies REQ-SWARM-WORKTREES
test('deletion report reader distinguishes deleted, protected and recoverable outcomes',()=>{
 const report={schemaVersion:1,ownerRoot:'/repo/user-001',results:[{number:101,rootPath:'/repo/managed/101',outcome:'deleted'},
  {number:102,rootPath:'/repo/managed/102',outcome:'protected',reason:'assigned'},
  {number:103,rootPath:'/repo/managed/103',outcome:'retained',reason:'cleanup failed'}]};
 assert.deepEqual(readSwarmWorktreeDeletionReportV1(report),report);
 for(const value of [{...report,schemaVersion:2},{...report,results:[{number:101,rootPath:'/repo/managed/101',outcome:'unknown'}]},
  {...report,results:[{number:101,rootPath:'/repo/managed/101',outcome:'protected'}]}]) assert.throws(()=>readSwarmWorktreeDeletionReportV1(value));
});

// Traceability: verifies REQ-SWARM-SESSIONS
// Traceability: verifies REQ-SWARM-INFO
test('V4 distinguishes desired names, native observations and current membership',async()=>{
 const swarmWorkerBinding:SwarmWorkerBinding={sessionId:'worker-session',threadId:'worker-thread',ownerRoot:swarmInfoV1.ownerRoot,rootPath:'/repo/managed/101',
  worktreeNumber:101,worktreeGeneration:'worktree-generation',generation:'membership-generation',workerNumber:1,shortAssignmentNumber:1,
  assignment:{kind:'plan',id:'traceability',summary:'Inspect acceptance coverage'},state:'BOUND',completed:false};
 const swarmInfoV4:SwarmInfoV4={...readSwarmInfo(swarmInfoV1),workers:[{binding:swarmWorkerBinding,desiredName:'W1 P1 Inspect acceptance coverage',nativeObservation:{kind:'observed',name:'W1 P1 Inspect acceptance coverage',status:'notLoaded'}}],nativeActivity:'worker-observations'};
 assert.deepEqual(readSwarmInfoV4(JSON.parse(JSON.stringify(swarmInfoV4))),swarmInfoV4);
 assert.match(renderSwarmInfo(swarmInfoV4),/native: notLoaded/);assert.doesNotMatch(renderSwarmInfo(swarmInfoV4),/native: idle/);
 const foreignObservedSwarmInfoV4=await observeSwarmWorkers(swarmInfoV4,{async readThreadState(){return {threadId:swarmWorkerBinding.threadId,sessionId:'foreign-session',rootPath:swarmWorkerBinding.rootPath,name:'foreign title',status:'idle'};}});
 assert.equal(foreignObservedSwarmInfoV4.workers[0]?.nativeObservation.kind,'unavailable');
 assert.doesNotMatch(renderSwarmInfo(foreignObservedSwarmInfoV4),/native: idle/);

 const worker=swarmInfoV4.workers[0];assert.ok(worker);
 for(const binding of [{...swarmWorkerBinding,state:'REMOVED'},{...swarmWorkerBinding,ownerRoot:'/other'},
  {...swarmWorkerBinding,worktreeNumber:1},{...swarmWorkerBinding,assignment:{...swarmWorkerBinding.assignment,summary:'only two'}}])
  assert.throws(()=>readSwarmInfoV4({...swarmInfoV4,workers:[{...worker,binding}]}));
 assert.throws(()=>readSwarmInfoV4({...swarmInfoV4,workers:[{...worker,nativeObservation:{kind:'observed',name:null,status:'unknown'}}]}));
});
