// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {projectRollingCoordinatorActions,parseRollingCampaignInitialization,readRollingCampaignInitializationV1,type RollingCampaignInitializationV1} from '../src/rolling-operations.js';
import type {RollingCoordinatorSnapshot,RollingAction,RollingPublicationStatus,RollingStoredAssignment,RollingWorkerDispatchAttached,RollingWorkerDispatchStarted,RollingStoredWorkerDispatch,RollingReviewDispatchStarted,RollingReviewDispatchAttached,RollingStoredReviewDispatch,RollingAssignmentRelease,RollingStoredIncrement} from '../src/rolling-campaign-store.js';
import type {RollingIncrementClaimV1,RollingIncrementPublicationV1} from '../src/rolling-integration.js';
import type {RollingStoredReview,RollingReviewRequestV1} from '../src/rolling-review.js';
import type {RollingWorkerSelection,RollingBinding,RollingSchedulingBlock} from '../src/rolling-campaign.js';

function snapshot():RollingCoordinatorSnapshot {
 const rollingBinding:RollingBinding = {obligationId:'OBL-1',implementationIds:[],sourcePaths:['src/current.ts'],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
 const rollingWorkerSelection:RollingWorkerSelection = {kind:'start_worker',assignmentId:null,obligationId:'OBL-1',plannedPaths:['src/current.ts'],exclusiveResources:[],binding:rollingBinding};
 const rollingSchedulingBlock:RollingSchedulingBlock = {reason:'prerequisites',obligationId:'OBL-2',prerequisites:['OBL-1']};
 return {closure:null,graphDigest:'a'.repeat(64),observedGraphDigest:'a'.repeat(64),configuration:{schemaVersion:3,bindingHistory:null,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/proof',maxActiveWorkers:2,publicationSize:1},
  assignments:[],actions:[],reviews:[],workerDispatches:[],reviewDispatches:[],releasableAssignments:[],publications:[],increments:[],scheduling:{digest:'a'.repeat(64),activeCount:0,availableCapacity:1,selected:[rollingWorkerSelection],blocked:[rollingSchedulingBlock]}};
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
 assert.deepEqual(rollingCoordinatorActions.decisions,[{kind:'worker',command:'observe-resumption',action:rollingAction},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
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

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-WORKERS
test('attached working worker receives an executable next action before new allocations',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,
  [{kind:'assignment',command:'dispatch-worker',assignment:rollingStoredAssignment},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('rejected work stops its original worker before resume-first replenishment',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'REWORK',activityStopped:true};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,
  [{kind:'worker-suspension',command:'suspend-worker',assignment:rollingStoredAssignment,blockers:[]},{kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
test('known worker instruction is collected and unknown creation keeps its original ownership',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingWorkerDispatchAttached:RollingWorkerDispatchAttached={id:'dispatch',threadId:'thread',instructions:'bounded work',state:'ATTACHED',turnId:'turn'};
 const rollingStoredWorkerDispatch:RollingStoredWorkerDispatch={assignmentId:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation,dispatch:rollingWorkerDispatchAttached};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],workerDispatches:[rollingStoredWorkerDispatch]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'assignment',command:'collect-submission',assignment:rollingStoredAssignment});
 const rollingWorkerDispatchStarted:RollingWorkerDispatchStarted={id:'dispatch',threadId:'thread',instructions:'bounded work',state:'STARTED'};
 const unknownRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,workerDispatches:[{...rollingStoredWorkerDispatch,dispatch:rollingWorkerDispatchStarted}]};
 assert.deepEqual(projectRollingCoordinatorActions(unknownRollingCoordinatorSnapshot).decisions[0],{kind:'blocked-worker-dispatch',reason:'instruction_turn_unknown',assignment:rollingStoredAssignment,dispatch:rollingWorkerDispatchStarted});
 const staleRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,workerDispatches:[{...rollingStoredWorkerDispatch,generation:'old-generation'}]};
 assert.deepEqual(projectRollingCoordinatorActions(staleRollingCoordinatorSnapshot).decisions[0],{kind:'assignment',command:'dispatch-worker',assignment:rollingStoredAssignment});
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-WORKERS
test('pending original attachment is observed before worker dispatch and stopped workers are not restarted',()=> {
 const rollingStoredAssignment:RollingStoredAssignment=workingAssignment();
 const rollingAction:RollingAction={id:'action',assignmentId:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation,kind:'START_WORKER',state:'STARTED'};
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],actions:[rollingAction]};
 assert.equal(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0]?.kind,'worker');
 assert.ok(!projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'assignment'));
 const stoppedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,actions:[],assignments:[{...rollingStoredAssignment,activityStopped:true}]};
 assert.ok(!projectRollingCoordinatorActions(stoppedRollingCoordinatorSnapshot).decisions.some(decision=>decision.kind === 'assignment'));
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
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'review',command:'dispatch-review',review:rollingStoredReview});
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
 assert.deepEqual(projectRollingCoordinatorActions(attachedRollingCoordinatorSnapshot).decisions[0],{kind:'review',command:'inspect-review',review:rollingStoredReview});
 const foreignRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...attachedRollingCoordinatorSnapshot,reviewDispatches:[{...rollingStoredReviewDispatch,reviewId:'earlier-review'}]};
 assert.deepEqual(projectRollingCoordinatorActions(foreignRollingCoordinatorSnapshot).decisions[0],{kind:'review',command:'dispatch-review',review:rollingStoredReview});
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
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions,[{kind:'assignment',command:'retire-worker',assignment:rollingStoredAssignment}]);
 const rollingAssignmentRelease:RollingAssignmentRelease={id:rollingStoredAssignment.id,generation:rollingStoredAssignment.generation};
 const cleanedRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...rollingCoordinatorSnapshot,releasableAssignments:[rollingAssignmentRelease]};
 assert.deepEqual(projectRollingCoordinatorActions(cleanedRollingCoordinatorSnapshot).decisions,[{kind:'release',command:'replenish',release:rollingAssignmentRelease,graphDigest:cleanedRollingCoordinatorSnapshot.graphDigest}]);
 const staleRollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...cleanedRollingCoordinatorSnapshot,releasableAssignments:[{...rollingAssignmentRelease,generation:'previous-generation'}]};
 assert.deepEqual(projectRollingCoordinatorActions(staleRollingCoordinatorSnapshot).decisions,[{kind:'assignment',command:'retire-worker',assignment:rollingStoredAssignment}]);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-REVIEW
test('published accepted increment retires instead of repeating integration',()=> {
 const rollingStoredAssignment:RollingStoredAssignment={...workingAssignment(),state:'INTEGRATING',activityStopped:true};
 const rollingStoredIncrement:RollingStoredIncrement=publishedIncrement(rollingStoredAssignment,true);
 const rollingCoordinatorSnapshot:RollingCoordinatorSnapshot={...snapshot(),assignments:[rollingStoredAssignment],increments:[rollingStoredIncrement]};
 assert.deepEqual(projectRollingCoordinatorActions(rollingCoordinatorSnapshot).decisions[0],{kind:'assignment',command:'retire-worker',assignment:rollingStoredAssignment});
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
