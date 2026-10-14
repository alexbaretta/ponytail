// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Pool} from 'pg';
import {RollingCampaignStore} from '../src/rolling-campaign-store.js';
import {RollingCampaignOperations,projectRollingCoordinatorActions,readRollingReviewerLoss,parseRollingCampaignInitialization,readRollingCampaignInitializationV1,type RollingCampaignInitializationV1} from '../src/rolling-operations.js';
import type {RollingCoordinatorSnapshot,RollingAction,RollingPublicationStatus,RollingStoredAssignment,RollingWorkerDispatchAttached,RollingWorkerDispatchStarted,RollingStoredWorkerDispatch,RollingReviewDispatchStarted,RollingReviewDispatchAttached,RollingStoredReviewDispatch,RollingAssignmentRelease,RollingStoredIncrement} from '../src/rolling-campaign-store.js';
import type {RollingPublicationFrozen,RollingPublicationTrigger} from '../src/rolling-publication.js';
import type {RollingIncrementClaimV1,RollingIncrementPublicationV1} from '../src/rolling-integration.js';
import type {RollingStoredReview,RollingReviewRequestV1} from '../src/rolling-review.js';
import type {RollingWorkerSelection,RollingBinding,RollingSchedulingBlock} from '../src/rolling-campaign.js';
import type {ObligationLeaseV1} from '../skills/plan-execution/scripts/obligation-binding-history.js';

function snapshot():RollingCoordinatorSnapshot {
 const rollingBinding:RollingBinding = {obligationId:'OBL-1',implementationIds:[],sourcePaths:['src/current.ts'],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
 const rollingWorkerSelection:RollingWorkerSelection = {kind:'start_worker',assignmentId:null,obligationId:'OBL-1',plannedPaths:['src/current.ts'],exclusiveResources:[],binding:rollingBinding};
 const rollingSchedulingBlock:RollingSchedulingBlock = {reason:'prerequisites',obligationId:'OBL-2',prerequisites:['OBL-1']};
 return {obligationProjection:{baselineId:'B1',vector:[1,1,1,1,1,1],satisfiedIds:[],unresolvedIds:['OBL-1','OBL-2'],gates:['OBL-2'],assessments:[],complete:false},closure:null,graphDigest:'a'.repeat(64),observedGraphDigest:'a'.repeat(64),configuration:{schemaVersion:3,bindingHistory:null,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/proof',maxActiveWorkers:2,publicationSize:1},
  assignments:[],actions:[],reviews:[],workerDispatches:[],reviewDispatches:[],releasableAssignments:[],publications:[],increments:[],publicationReadiness:{state:'WAITING',reason:'empty',count:0},scheduling:{digest:'a'.repeat(64),activeCount:0,availableCapacity:1,selected:[rollingWorkerSelection],blocked:[rollingSchedulingBlock]}};
}

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields',()=> {
 const rollingCampaignInitializationV1:RollingCampaignInitializationV1 = {schemaVersion:1,coordinatorRoot:'/coordinator',documentPath:'plan/obligations.json',bindingsPath:'plan/bindings.json',bindingHistory:{path:'plan/history.json',assessor:'coordinator',authority:['approved scope']},configuration:{mainline:null,incrementRef:'campaign/proof',maxActiveWorkers:10,publicationSize:null}};
 const text = JSON.stringify(rollingCampaignInitializationV1);
 assert.deepEqual(parseRollingCampaignInitialization(text),rollingCampaignInitializationV1);
 assert.throws(()=>parseRollingCampaignInitialization(text.replace('"maxActiveWorkers":10','"maxActiveWorkers":1.000000000000000001')),/exact/);
 assert.throws(()=>readRollingCampaignInitializationV1({...rollingCampaignInitializationV1,schemaVersion:2}),/V1/);
 assert.throws(()=>readRollingCampaignInitializationV1({...rollingCampaignInitializationV1,extra:true}),/V1/);
 assert.throws(()=>readRollingCampaignInitializationV1({...rollingCampaignInitializationV1,documentPath:'../foreign.json'}));
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
test('coordinator decisions require reconciliation before suggesting work from a changed authoritative graph',()=> {
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot = {...snapshot(),observedGraphDigest:'b'.repeat(64)};
 const rollingCoordinatorActions = projectRollingCoordinatorActions(rollingCoordinatorSnapshot);
 assert.deepEqual(rollingCoordinatorActions.decisions,[{kind:'reconcile',expectedDigest:'a'.repeat(64),observedDigest:'b'.repeat(64)}]);
 assert.equal(rollingCoordinatorActions.snapshot,rollingCoordinatorSnapshot);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('next actions retain exact fenced identities and prerequisite explanations before replenishment',()=> {
 const rollingAction:RollingAction = {id:'action',assignmentId:'assignment',kind:'RESUME_WORKER',generation:'generation',state:'STARTED'};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot = {...snapshot(),actions:[rollingAction]};
 const rollingCoordinatorActions = projectRollingCoordinatorActions(rollingCoordinatorSnapshot);
 assert.deepEqual(rollingCoordinatorActions.decisions,[{kind:'worker',hostAction:'observe-session-resumption',action:rollingAction},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
 assert.deepEqual(rollingCoordinatorActions.snapshot.scheduling.blocked,[{reason:'prerequisites',obligationId:'OBL-2',prerequisites:['OBL-1']}]);
 assert.equal(rollingCoordinatorActions.snapshot.scheduling.selected[0]?.obligationId,'OBL-1');
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-PUBLICATION
test('unknown publication is observed before worker replenishment and never suggested as a push retry',()=> {
 const rollingPublicationStatus:RollingPublicationStatus = {state:'UNCONFIRMED',qaId:'00000000-0000-0000-0000-000000000003',publicationId:'00000000-0000-0000-0000-000000000004',pendingRefreshId:null,
  claim:{schemaVersion:1,id:'00000000-0000-0000-0000-000000000001',campaignId:'proof',rootPath:'/coordinator',incrementRef:'campaign/proof',target:{remote:'origin',branch:'main'},graphDigest:'a'.repeat(64),configurationDigest:'b'.repeat(64),publicationSize:1,trigger:'threshold',increments:[{id:'00000000-0000-0000-0000-000000000002',revision:'c'.repeat(40)}],campaignRevision:'c'.repeat(40)}};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot = {...snapshot(),publications:[rollingPublicationStatus]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,[{kind:'publication',command:'observe-mainline',publication:rollingPublicationStatus},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

function workingAssignment():RollingStoredAssignment {
 const rollingBinding:RollingBinding={obligationId:'OBL-1',implementationIds:[],sourcePaths:['src/current.ts'],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
 return {id:'worker',scopeId:'pilot',obligationId:'OBL-1',state:'WORKING',blockers:[],activityStopped:false,
  plannedPaths:['src/current.ts'],exclusiveResources:[],generation:'generation',sessionId:'session',retired:false,worktreeNumber:101,binding:rollingBinding,lease:null};
}

// Traceability: verifies REQ-ROLLING-GRAPH
// Traceability: verifies REQ-ROLLING-INTERFACES
test('OBL-129: stopped retained workers receive lease rebinding before new allocation',()=>{
 const obligationLeaseV1:ObligationLeaseV1 = {schemaVersion:1,scopeId:'pilot',generation:'generation',
  graphDigest:'a'.repeat(64),baselineId:'B1',assessor:'coordinator',authority:['approved'],binding:{obligationId:'OBL-1',revisionId:'BIND-2',dependsOn:[],
   execution:{sprintId:null,taskletIds:[],plannedPaths:['src/current.ts'],operations:['edit','test'],selection:['focused'],target:{identity:'local',profile:'focused'}}}};
 const rollingStoredAssignment:RollingStoredAssignment = {...workingAssignment(),state:'INACTIVE',activityStopped:true,lease:obligationLeaseV1};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot = {...snapshot(),assignments:[rollingStoredAssignment],
  scheduling:{...snapshot().scheduling,selected:[],blocked:[{reason:'scope_changed',obligationId:'OBL-1',prerequisites:[]}]}};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,
  [{kind:'worker-rebinding',command:'renew-lease',assignment:rollingStoredAssignment}]);
 const activeRollingCoordinatorSnapshot:RollingCoordinatorSnapshot = {...rollingCoordinatorSnapshot,
  assignments:[{...rollingStoredAssignment,activityStopped:false}]};
 assert.deepEqual(projectRollingCoordinatorActions(activeRollingCoordinatorSnapshot).decisions,[]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-WORKERS
test('attached working worker receives an executable next action before new allocations',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,
  [{kind:'host-assignment',hostAction:'send-assignment',assignment:rollingStoredAssignment},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('rejected work stops its original worker before resume-first replenishment',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'REWORK',activityStopped:true};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,
  [{kind:'worker-suspension',hostAction:'quiesce-session',assignment:rollingStoredAssignment,blockers:[]},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
test('known worker instruction is collected and unknown creation keeps its original ownership',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingWorkerDispatchAttached:RollingWorkerDispatchAttached={id:'dispatch',threadId:'thread',instructions:'bounded work',state:'ATTACHED',turnId:'turn'};
 const rollingStoredWorkerDispatch:RollingStoredWorkerDispatch={assignmentId:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation,dispatch:rollingWorkerDispatchAttached};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],workerDispatches:[rollingStoredWorkerDispatch]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'host-assignment',hostAction:'collect-result',assignment:rollingStoredAssignment});
 const rollingWorkerDispatchStarted:RollingWorkerDispatchStarted={id:'dispatch',threadId:'thread',instructions:'bounded work',state:'STARTED'};
 const unknownRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,workerDispatches:[{...rollingStoredWorkerDispatch,dispatch:rollingWorkerDispatchStarted}]};
 assert.deepEqual(projectRollingCoordinatorActions(unknownRollingCoordinatorSnapshot).decisions[0],{kind:'blocked-worker-dispatch',reason:'instruction_turn_unknown',assignment:rollingStoredAssignment,dispatch:rollingWorkerDispatchStarted});
 const staleRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,workerDispatches:[{...rollingStoredWorkerDispatch,generation:'old-generation'}]};
 assert.deepEqual(projectRollingCoordinatorActions(staleRollingCoordinatorSnapshot).decisions[0],{kind:'host-assignment',hostAction:'send-assignment',assignment:rollingStoredAssignment});
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-WORKERS
test('pending original attachment is observed before worker dispatch and stopped workers are not restarted',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingAction:RollingAction={id:'action',assignmentId:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation,kind:'START_WORKER',state:'STARTED'};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],actions:[rollingAction]};
 assert.equal(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0]?.kind,'worker');
 assert.ok(!projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'host-assignment'));
 const stoppedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,actions:[],assignments:[{...rollingStoredAssignment,activityStopped:true}]};
 assert.ok(!projectRollingCoordinatorActions(stoppedRollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'host-assignment'));
});

function pendingReview():RollingStoredReview {
 const rollingReviewRequestV1:RollingReviewRequestV1={schemaVersion:1,id:'review',campaignId:'pilot',assignmentId:'worker',generation:'generation',baseCommit:'a'.repeat(40),revision:'b'.repeat(40),reviewerSessionId:'reviewer'};
 return {request:rollingReviewRequestV1,outcome:null};
}

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('new review request is dispatched before attempting to inspect its nonexistent turn',()=> {
 const rollingStoredReview:RollingStoredReview=pendingReview();
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),reviews:[rollingStoredReview]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'review',hostAction:'send-review',review:rollingStoredReview});
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('review decisions observe known turns and preserve uncertain original dispatch ownership',()=> {
 const rollingStoredReview:RollingStoredReview=pendingReview();
 const rollingReviewDispatchStarted:RollingReviewDispatchStarted={id:'dispatch',reviewerThreadId:'reviewer-thread',state:'STARTED'};
 const rollingStoredReviewDispatch:RollingStoredReviewDispatch={reviewId:rollingStoredReview.request.id,dispatch:rollingReviewDispatchStarted};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),reviews:[rollingStoredReview],reviewDispatches:[rollingStoredReviewDispatch]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'blocked-review-dispatch',reason:'instruction_turn_unknown',review:rollingStoredReview,dispatch:rollingReviewDispatchStarted});
 const rollingReviewDispatchAttached:RollingReviewDispatchAttached={...rollingReviewDispatchStarted,state:'ATTACHED',turnId:'original-turn'};
 const attachedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,reviewDispatches:[{...rollingStoredReviewDispatch,dispatch:rollingReviewDispatchAttached}]};
 assert.deepEqual(projectRollingCoordinatorActions(attachedRollingCoordinatorSnapshot).decisions[0],{kind:'review',hostAction:'observe-review',review:rollingStoredReview});
 const foreignRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...attachedRollingCoordinatorSnapshot,reviewDispatches:[{...rollingStoredReviewDispatch,reviewId:'earlier-review'}]};
 assert.deepEqual(projectRollingCoordinatorActions(foreignRollingCoordinatorSnapshot).decisions[0],{kind:'review',hostAction:'send-review',review:rollingStoredReview});
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('retired unassigned checkout is released even when no obligation is unblocked',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'RETIRING',retired:true,activityStopped:true,sessionId:null};
 const rollingAssignmentRelease:RollingAssignmentRelease={id:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],releasableAssignments:[rollingAssignmentRelease],scheduling:{...snapshot().scheduling,selected:[],availableCapacity:0}};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,[{kind:'release',command:'replenish',release:{id:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation},graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-WORKERS
test('attached retirement requires current cleanup eligibility before releasing its checkout',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'RETIRING',retired:true,activityStopped:true};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],scheduling:{...snapshot().scheduling,selected:[]}};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,[{kind:'host-assignment',hostAction:'detach-session',assignment:rollingStoredAssignment}]);
 const rollingAssignmentRelease:RollingAssignmentRelease={id:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation};
 const cleanedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,releasableAssignments:[rollingAssignmentRelease]};
 assert.deepEqual(projectRollingCoordinatorActions(cleanedRollingCoordinatorSnapshot).decisions,[{kind:'release',command:'replenish',release:rollingAssignmentRelease,graphDigest:cleanedRollingCoordinatorSnapshot.graphDigest}]);
 const staleRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...cleanedRollingCoordinatorSnapshot,releasableAssignments:[{...rollingAssignmentRelease,generation:'previous-generation'}]};
 assert.deepEqual(projectRollingCoordinatorActions(staleRollingCoordinatorSnapshot).decisions,[{kind:'host-assignment',hostAction:'detach-session',assignment:rollingStoredAssignment}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('published accepted increment retires instead of repeating integration',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'INTEGRATING',activityStopped:true};
 const rollingStoredIncrement:RollingStoredIncrement=publishedIncrement(rollingStoredAssignment,true);
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],increments:[rollingStoredIncrement]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'host-assignment',hostAction:'detach-session',assignment:rollingStoredAssignment});
});

function publishedIncrement(rollingStoredAssignment:RollingStoredAssignment,obligationSatisfied:boolean):RollingStoredIncrement {
 const rollingIncrementClaimV1:RollingIncrementClaimV1={schemaVersion:1,id:'increment',campaignId:rollingStoredAssignment.scopeId,reviewId:'review',assignmentId:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation,graphDigest:'a'.repeat(64),rootPath:'/worker',coordinatorRoot:'/coordinator',target:{remote:'origin',branch:'campaign/pilot'},reviewedRevision:'b'.repeat(40),reviewedBase:'a'.repeat(40)};
 const rollingIncrementPublicationV1:RollingIncrementPublicationV1={schemaVersion:1,incrementId:rollingIncrementClaimV1.id,result:{state:'PUBLISHED',revision:'b'.repeat(40),remoteRevision:'b'.repeat(40)}};
 return {claim:rollingIncrementClaimV1,state:'PUBLISHED',publication:rollingIncrementPublicationV1,obligationSatisfied};
}

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-GRAPH
test('published delivery requests current certificate acceptance before worker retirement',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'INTEGRATING',activityStopped:true};
 const rollingStoredIncrement:RollingStoredIncrement=publishedIncrement(rollingStoredAssignment,false);
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],increments:[rollingStoredIncrement]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'acceptance',command:'accept',assignment:rollingStoredAssignment,increment:rollingStoredIncrement});
 const staleRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,increments:[{...rollingStoredIncrement,claim:{...rollingStoredIncrement.claim,generation:'previous-generation'}}]};
 assert.deepEqual(projectRollingCoordinatorActions(staleRollingCoordinatorSnapshot).decisions[0],{kind:'assignment',command:'integrate',assignment:rollingStoredAssignment});
 const pendingRollingStoredIncrement:RollingStoredIncrement={...rollingStoredIncrement,state:'UNCONFIRMED',publication:null};
 const pendingRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,increments:[pendingRollingStoredIncrement]};
 assert.deepEqual(projectRollingCoordinatorActions(pendingRollingCoordinatorSnapshot).decisions[0],{kind:'assignment',command:'integrate',assignment:rollingStoredAssignment});
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-PUBLICATION
test('ready publication selections supply the exact threshold or partial-flush command',()=> {
 const triggers:readonly RollingPublicationTrigger[]=['threshold','completion','quiescence'];
 for (const trigger of triggers) {
  const rollingPublicationFrozen:RollingPublicationFrozen={state:'FROZEN',trigger,increments:[{id:'00000000-0000-0000-0000-000000000001',revision:'a'.repeat(40)}],campaignRevision:'a'.repeat(40)};
  const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),publicationReadiness:rollingPublicationFrozen};
  assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'publication-freeze',command:'freeze-publication',selection:rollingPublicationFrozen,flush:trigger === 'threshold' ? null : trigger});
 }
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-PUBLICATION
test('publication blockers and below-threshold waiting never invent a freeze action',()=> {
 const reasons:readonly ('publication_owned' | 'integration_active' | 'certificate_acceptance')[]=['publication_owned','integration_active','certificate_acceptance'];
 for (const reason of reasons) {
  const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),publicationReadiness:{state:'BLOCKED',reason,ownerCampaignId:'pilot'}};
  assert.ok(!projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'publication-freeze'));
 }
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),publicationReadiness:{state:'WAITING',reason:'below_threshold',count:1}};
 assert.ok(!projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'publication-freeze'));
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
test('coordinator suggests final closure only after fresh scope, released owners and publication drain',()=> {
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),obligationProjection:{baselineId:'B1',vector:[0,0,0,0,0,0],satisfiedIds:['OBL-1','OBL-2'],unresolvedIds:[],gates:[],assessments:[],complete:true},scheduling:{...snapshot().scheduling,selected:[]}};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,[{kind:'closure',command:'close'}]);
 const unresolvedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,obligationProjection:{...rollingCoordinatorSnapshot.obligationProjection,complete:false,unresolvedIds:['OBL-1']}};
 assert.ok(!projectRollingCoordinatorActions(unresolvedRollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'closure'));
 const workingRollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const ownedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,assignments:[workingRollingStoredAssignment]};
 assert.ok(!projectRollingCoordinatorActions(ownedRollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'closure'));
 const partialRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,publicationReadiness:{state:'WAITING',reason:'below_threshold',count:1}};
 assert.ok(!projectRollingCoordinatorActions(partialRollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'closure'));
});

// Traceability: verifies REQ-ROLLING-REVIEW
test('OBL-160: reviewer loss is an explicit exact input contract',()=>{
 assert.equal(readRollingReviewerLoss(undefined),null);
 assert.deepEqual(readRollingReviewerLoss({reviewId:'original-review',lossReference:'observed original actor removal'}),
  {reviewId:'original-review',lossReference:'observed original actor removal'});
 const invalidInputs:readonly unknown[] = [null,[],{}, {reviewId:'original-review'},
  {reviewId:'original-review',lossReference:''},{reviewId:' ',lossReference:'observed'},
  {reviewId:'original-review',lossReference:'observed',retry:true}];
 for (const input of invalidInputs) assert.throws(()=>readRollingReviewerLoss(input));
});

// Traceability: verifies REQ-ROLLING-EXISTING-POOL
test('existing-only CLI admission rejects nonboolean boundary data before database or checkout work',async()=>{
 const pool:Pool=new Pool();
 try {
  const rollingCampaignStore=new RollingCampaignStore(pool,'00000000-0000-0000-0000-000000000001');
  const rollingCampaignOperations=new RollingCampaignOperations(rollingCampaignStore,'/unused');
  await assert.rejects(rollingCampaignOperations.execute('replenish',{campaign:'pilot','existing-only':'true'}),/existing-only must be boolean/);
 } finally {await pool.end();}
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('increment observation requires original command cessation evidence before database work',async()=>{
 const pool:Pool=new Pool();
 try {
  const rollingCampaignStore=new RollingCampaignStore(pool,'00000000-0000-0000-0000-000000000001');
  const rollingCampaignOperations=new RollingCampaignOperations(rollingCampaignStore,'/unused');
  await assert.rejects(rollingCampaignOperations.execute('observe-increment',{campaign:'pilot',review:'original'}),/stopped/);
  await assert.rejects(rollingCampaignOperations.observeIncrement('pilot','original',' '),/cessation evidence/);
 } finally {await pool.end();}
});
