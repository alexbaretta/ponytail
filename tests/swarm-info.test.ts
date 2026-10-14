// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readSwarmInfo,readSwarmInfoV1,readSwarmInfoV2,readSwarmInfoV3,renderSwarmInfo,type SwarmInfoV1,type SwarmInfoV2,type SwarmInfoV3} from '../src/swarm-info.js';

const swarmInfoV1:SwarmInfoV1={schemaVersion:1,ownerRoot:'/repo/user-001',ownershipSource:'campaign-leases',
 coordinator:{kind:'unrecorded'},nativeActivity:'unobserved',worktrees:[{number:101,rootPath:'/repo/managed/101',present:true,
  state:'ACTIVE',assignmentId:'assignment',campaignId:'campaign',obligationId:'OBL-1',sessionId:'native-session'}]};

// Traceability: verifies REQ-SWARM-INFO
test('versioned inventory retains resource associations without inventing native activity',()=>{
 assert.deepEqual(readSwarmInfoV1(JSON.parse(JSON.stringify(swarmInfoV1))),swarmInfoV1);
 const swarmInfoV3:SwarmInfoV3=readSwarmInfo(swarmInfoV1);
 const output=renderSwarmInfo(swarmInfoV3);
 assert.match(output,/Coordinator session: not recorded/);
 assert.match(output,/Native activity: not observed/);
 assert.match(output,/101 ACTIVE \/repo\/managed\/101/);
 assert.match(output,/session: native-session \| assignment: assignment/);
 assert.doesNotMatch(output,/native-session.*running/);
 assert.match(renderSwarmInfo({...swarmInfoV3,worktrees:[]}),/Managed worktrees \(0\)/);
});

// Traceability: verifies REQ-SWARM-OWNERSHIP
// Traceability: verifies REQ-SWARM-INFO
test('V2 distinguishes enrolled empty bindings from legacy unknown coordinators',()=>{
 const swarmInfoV2:SwarmInfoV2={...swarmInfoV1,schemaVersion:2,ownershipSource:'swarm-owners-and-campaign-leases',coordinator:{kind:'bound',sessionId:'coordinator',threadId:'coordinator-thread'}};
 assert.deepEqual(readSwarmInfoV2(JSON.parse(JSON.stringify(swarmInfoV2))),swarmInfoV2);
 assert.match(renderSwarmInfo(readSwarmInfo(swarmInfoV2)),/Coordinator session: coordinator/);
 assert.match(renderSwarmInfo(readSwarmInfo({...swarmInfoV2,coordinator:{kind:'unbound'}})),/Coordinator session: not bound/);
 for(const coordinator of [{kind:'bound'},{kind:'unbound',sessionId:'invented'},{kind:'unknown'},null]) assert.throws(()=>readSwarmInfoV2({...swarmInfoV2,coordinator}));
 assert.throws(()=>readSwarmInfo({...swarmInfoV2,schemaVersion:4}));
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
 const swarmInfoV3:SwarmInfoV3={...readSwarmInfo(swarmInfoV1),worktrees:[{number:102,rootPath:'/repo/managed/102',present:true,state:'RESERVED',
  membership:{kind:'swarm',generation:'generation'},assignment:null}]};
 assert.deepEqual(readSwarmInfoV3(JSON.parse(JSON.stringify(swarmInfoV3))),swarmInfoV3);
 assert.match(renderSwarmInfo(swarmInfoV3),/membership: swarm \| generation: generation/);
 assert.match(renderSwarmInfo(swarmInfoV3),/assignment: \(none\)/);
 assert.equal(readSwarmInfo(swarmInfoV1).worktrees[0]?.assignment?.sessionId,'native-session');
 const worktree=swarmInfoV3.worktrees[0];assert.ok(worktree);
 for(const membership of [{kind:'campaign-lease'},{kind:'swarm'},{kind:'unknown'},null])
  assert.throws(()=>readSwarmInfoV3({...swarmInfoV3,worktrees:[{...worktree,membership}]}));
});
