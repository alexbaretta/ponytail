// Copyright (c) 2026 Alex Baretta. MIT License.
import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/obligation-fixture.js';
import {freezeObligationLease,type ObligationBindingHistoryV1} from '../skills/plan-execution/scripts/obligation-binding-history.js';
import {projectObligationScope} from '../skills/plan-execution/scripts/obligations.js';
import {readSwarmQueueCommandV1,readSwarmQueueStateV1,readSwarmQueueVerdictV1,readSwarmQueueResultV1,parseSwarmQueueJson,selectSwarmQueueTask,type SwarmQueueTaskV1,type SwarmQueueCanonical,type SwarmQueueCommandV1,type SwarmQueueStateV1,type SwarmQueueVerdictV1,type SwarmQueueResultV1} from '../src/swarm-queue.js';
// Traceability: verifies REQ-SWARM-QUEUES
test('queue physical contracts reject ambiguous commands, unsafe numbers and paths',()=>{
 const swarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,command:'init',campaignId:'pilot',actor:{kind:'coordinator',sessionId:'coordinator'},documentPath:'pm/plans/pilot/obligations.json',bindingsPath:null,authority:['approved'],assessor:'coordinator',recordRoots:{requirements:'pm/requirements',uat:'pm/uat',issues:'pm/bugs',plans:'pm/plans'}};
 assert.deepEqual(readSwarmQueueCommandV1(parseSwarmQueueJson(JSON.stringify(swarmQueueCommandV1))),swarmQueueCommandV1);
 for(const input of [{...swarmQueueCommandV1,documentPath:'../outside'},{...swarmQueueCommandV1,schemaVersion:2},{...swarmQueueCommandV1,command:'unknown'},{...swarmQueueCommandV1,actor:{kind:'worker',sessionId:'worker'}},{...swarmQueueCommandV1,extra:true}])assert.throws(()=>readSwarmQueueCommandV1(input));
 assert.throws(()=>parseSwarmQueueJson('{"sequence":9007199254740993}'),/unsafe/);
 assert.throws(()=>parseSwarmQueueJson('{"schemaVersion":1.00000000000000001}'),/unsafe/);
 const swarmQueueStateV1:SwarmQueueStateV1={schemaVersion:1,campaignId:'pilot',ownerRoot:'/repo',documentPath:swarmQueueCommandV1.documentPath,bindingsPath:null,authority:['approved'],assessor:'coordinator',recordRoots:swarmQueueCommandV1.recordRoots,state:'open',sequence:0,tasks:[],requests:[],pending:null,discoveries:[]};
 assert.deepEqual(readSwarmQueueStateV1(parseSwarmQueueJson(JSON.stringify(swarmQueueStateV1))),swarmQueueStateV1);
 assert.throws(()=>readSwarmQueueStateV1({...swarmQueueStateV1,sequence:NaN}));
 const swarmQueueResultV1:SwarmQueueResultV1={schemaVersion:1,queue:swarmQueueStateV1,task:null,request:null};assert.deepEqual(readSwarmQueueResultV1(parseSwarmQueueJson(JSON.stringify(swarmQueueResultV1))),swarmQueueResultV1);
 assert.throws(()=>readSwarmQueueResultV1({...swarmQueueResultV1,task:{id:'unknown'}}));
 const swarmQueueVerdictV1:SwarmQueueVerdictV1={schemaVersion:1,reviewer:'reviewer',base:'a'.repeat(40),revision:'b'.repeat(40),accepted:true};assert.deepEqual(readSwarmQueueVerdictV1(swarmQueueVerdictV1),swarmQueueVerdictV1);assert.throws(()=>readSwarmQueueVerdictV1({...swarmQueueVerdictV1,accepted:false}));
});

// Traceability: verifies REQ-SWARM-QUEUES
test('stealing uses actual most recent acquisition rather than task creation order',testContext=>{
 const obligationFixture=fixture(testContext);const obligationBindingHistoryV1:ObligationBindingHistoryV1={schemaVersion:1,scopeId:'pilot',revisions:[]};
 const swarmQueueCanonical:SwarmQueueCanonical={document:obligationFixture.document,history:obligationBindingHistoryV1,scope:projectObligationScope(obligationFixture.document,obligationFixture.root),digest:'a'.repeat(64)};
 function task(id:string,sequence:number,claimSequence:number|null,context:string):SwarmQueueTaskV1 {
  const generation='12345678-1234-1234-1234-123456789abc';
  return {id,title:id,obligationIds:[`OBL-${sequence}`],preferredWorker:null,context:[context],sequence,claimSequence,state:claimSequence===null?'ready':'help',claimHistory:[],candidate:null,checkpoint:null,review:null,
   claim:claimSequence===null?null:{generation,sessionId:'worker',workerGeneration:generation,rootPath:obligationFixture.root,base:'b'.repeat(40),leases:[freezeObligationLease(obligationFixture.document,obligationBindingHistoryV1,{obligationId:`OBL-${sequence}`,graphDigest:swarmQueueCanonical.digest,generation,assessor:'coordinator',authority:['approved-CHNG']})]}};
 }
 const swarmQueueStateV1:SwarmQueueStateV1={schemaVersion:1,campaignId:'pilot',ownerRoot:obligationFixture.root,documentPath:obligationFixture.documentPath,bindingsPath:null,authority:['approved-CHNG'],assessor:'coordinator',recordRoots:{requirements:'pm/requirements',uat:'pm/uat',issues:'pm/bugs',plans:'pm/plans'},state:'open',sequence:10,tasks:[task('older-last-executed',1,10,'backend'),task('newer-previously-executed',2,5,'frontend'),task('backend-next',3,null,'backend'),task('frontend-next',4,null,'frontend')],requests:[],pending:null,discoveries:[]};
 assert.equal(selectSwarmQueueTask(swarmQueueStateV1,'worker',swarmQueueCanonical)?.id,'backend-next');
});
