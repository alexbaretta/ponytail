// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readSwarmInfoV1,renderSwarmInfo,type SwarmInfoV1} from '../src/swarm-info.js';

const swarmInfoV1:SwarmInfoV1={schemaVersion:1,ownerRoot:'/repo/user-001',ownershipSource:'campaign-leases',
 coordinator:{kind:'unrecorded'},nativeActivity:'unobserved',worktrees:[{number:101,rootPath:'/repo/managed/101',present:true,
  state:'ACTIVE',assignmentId:'assignment',campaignId:'campaign',obligationId:'OBL-1',sessionId:'native-session'}]};

// Traceability: verifies REQ-SWARM-INFO
test('versioned inventory retains resource associations without inventing native activity',()=>{
 assert.deepEqual(readSwarmInfoV1(JSON.parse(JSON.stringify(swarmInfoV1))),swarmInfoV1);
 const output=renderSwarmInfo(swarmInfoV1);
 assert.match(output,/Coordinator session: not recorded/);
 assert.match(output,/Native activity: not observed/);
 assert.match(output,/101 ACTIVE \/repo\/managed\/101/);
 assert.match(output,/session: native-session \| assignment: assignment/);
 assert.doesNotMatch(output,/native-session.*running/);
 assert.match(renderSwarmInfo({...swarmInfoV1,worktrees:[]}),/Managed worktrees \(0\)/);
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
