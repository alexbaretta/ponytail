// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readRollingResetRequestV1,readRollingProjectResetV1,type RollingResetRequestV1,type RollingProjectResetV1} from '../src/rolling-reset.js';
// Traceability: verifies REQ-ROLLING-RESET
test('reset contracts require exact authority, inventory and bounded progress',()=>{
 const rollingResetRequestV1:RollingResetRequestV1={schemaVersion:1,id:'12345678-1234-1234-1234-123456789abc',reason:'Authorized restart',authority:['human']};
 const rollingProjectResetV1:RollingProjectResetV1={schemaVersion:1,request:rollingResetRequestV1,coordinatorRoot:'/fixture',mainRoot:'/fixture',managedDirectory:'/fixture/pool',gitDirectory:'/fixture/.git',baseCommit:'a'.repeat(40),campaignIds:['pilot'],actors:[],worktrees:[],retirementCommands:[],completedActors:[],completedWorktrees:[],state:'PENDING'};
 assert.deepEqual(readRollingProjectResetV1(rollingProjectResetV1),rollingProjectResetV1);
 for(const value of [null,{...rollingResetRequestV1,authority:[]},{...rollingResetRequestV1,id:'foreign'},{...rollingResetRequestV1,extra:true}])assert.throws(()=>readRollingResetRequestV1(value));
 for(const value of [{...rollingProjectResetV1,completedActors:['foreign']},{...rollingProjectResetV1,completedWorktrees:['/foreign']},{...rollingProjectResetV1,state:'FAILED'},{...rollingProjectResetV1,extra:true}])assert.throws(()=>readRollingProjectResetV1(value));
});
