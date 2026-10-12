// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {projectRollingCoordinatorActions,parseRollingCampaignInitialization,readRollingCampaignInitializationV1,type RollingCampaignInitializationV1} from '../src/rolling-operations.js';
import type {RollingCoordinatorSnapshot,RollingAction,RollingPublicationStatus} from '../src/rolling-campaign-store.js';
import type {RollingWorkerSelection,RollingBinding,RollingSchedulingBlock} from '../src/rolling-campaign.js';

function snapshot():RollingCoordinatorSnapshot {
 const rollingBinding:RollingBinding = {obligationId:'OBL-1',implementationIds:[],sourcePaths:['src/current.ts'],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
 const rollingWorkerSelection:RollingWorkerSelection = {kind:'start_worker',assignmentId:null,obligationId:'OBL-1',plannedPaths:['src/current.ts'],exclusiveResources:[],binding:rollingBinding};
 const rollingSchedulingBlock:RollingSchedulingBlock = {reason:'prerequisites',obligationId:'OBL-2',prerequisites:['OBL-1']};
 return {closure:null,graphDigest:'a'.repeat(64),observedGraphDigest:'a'.repeat(64),configuration:{schemaVersion:1,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/proof',maxActiveWorkers:2,publicationSize:1},
  assignments:[],actions:[],reviews:[],publications:[],scheduling:{digest:'a'.repeat(64),activeCount:0,availableCapacity:1,selected:[rollingWorkerSelection],blocked:[rollingSchedulingBlock]}};
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
