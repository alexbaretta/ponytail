// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {fixture,git} from './helpers/obligation-fixture.js';
import {RollingCampaignStore} from '../src/rolling-campaign-store.js';
import {RollingCampaignOperations,type RollingCampaignInitializationV1,type RollingReplenishment} from '../src/rolling-operations.js';
import type {RollingProjectConfigV1,RollingBindingsV1} from '../src/rolling-campaign.js';
import {acceptCheckpoint,inputDigest,type ObligationCertificate,type ObligationCheckpoint,type ObligationDocumentV1,type Obligation} from '../skills/plan-execution/scripts/obligations.js';

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations',async testContext=> {
 const obligationFixture = fixture(testContext);
 const {root} = obligationFixture;
 const blockerObligation:Obligation = {id:'OBL-7',category:'gate',requirementIds:['REQ-PILOT'],responsibilityId:'fixture-blocker',condition:'Confirm the external fixture prerequisite',criterion:'Inspect the tracked prerequisite evidence',dependsOn:[],acceptanceGroups:['pilot'],supersedes:null,
  execution:{sprintId:null,taskletIds:[],plannedPaths:[],operations:['inspect'],selection:[],target:null}};
 const initialObligationDocumentV1:ObligationDocumentV1 = {...obligationFixture.document,
  obligations:[...obligationFixture.document.obligations,blockerObligation],baselines:obligationFixture.document.baselines.map(baseline=>({...baseline,obligationIds:[...baseline.obligationIds,blockerObligation.id]})),
  checkpoints:obligationFixture.document.checkpoints.map(checkpoint=>({...checkpoint,registeredIds:[...checkpoint.registeredIds,blockerObligation.id]}))};
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(initialObligationDocumentV1));
 const pool = new Pool(databaseOptions(process.cwd()));
 const projectId = crypto.randomUUID();
 testContext.after(async()=> {try {await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);} finally {await pool.end();}});
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`operations-${projectId}`]);
 const rollingProjectConfigV1:RollingProjectConfigV1 = {schemaVersion:1,mainline:null,managedWorktrees:{directory:'managed',anchor:'main'},maxActiveWorkers:2,publicationSize:null,setupCommands:[],qa:{focused:[],publication:[['node','--test']]}};
 fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV1));
 fs.appendFileSync(path.join(root,'.gitignore'),'managed/\n');
 git(root,['config','init.defaultBranch','main']);
 const sourceJournal:unknown = JSON.parse(fs.readFileSync(path.join(process.cwd(),'ponytail-journal.json'),'utf8'));
 assert.ok(sourceJournal !== null && typeof sourceJournal === 'object' && !Array.isArray(sourceJournal) && 'database' in sourceJournal);
 fs.writeFileSync(path.join(root,'ponytail-journal.json'),JSON.stringify({schemaVersion:1,projectId,projectName:`operations-${projectId}`,database:sourceJournal.database}));
 const rollingBindingsV1:RollingBindingsV1 = {schemaVersion:1,bindings:obligationFixture.document.obligations.slice(0,3).map(obligation=>({
  obligationId:obligation.id,implementationIds:[],sourcePaths:[],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]}))};
 fs.writeFileSync(path.join(root,'bindings.json'),JSON.stringify(rollingBindingsV1));
 git(root,['add','.']);git(root,['commit','-m','Configure rolling operations']);
 const remoteRoot = path.join(root,'managed','origin.git');
 fs.mkdirSync(path.dirname(remoteRoot),{recursive:true});
 git(root,['clone','--bare',root,remoteRoot]);git(root,['remote','add','origin',remoteRoot]);
 const rollingCampaignStore = new RollingCampaignStore(pool,projectId);
 const rollingCampaignOperations = new RollingCampaignOperations(rollingCampaignStore);
 const rollingCampaignInitializationV1:RollingCampaignInitializationV1 = {schemaVersion:1,coordinatorRoot:root,documentPath:obligationFixture.documentPath,bindingsPath:'bindings.json',bindingHistory:null,
  configuration:{mainline:null,incrementRef:'campaign/pilot',maxActiveWorkers:null,publicationSize:null}};
 const rollingCampaignRegistrationResult = await rollingCampaignOperations.initialize(rollingCampaignInitializationV1);
 assert.equal(rollingCampaignRegistrationResult.id,'pilot');
 assert.deepEqual(await rollingCampaignOperations.initialize(rollingCampaignInitializationV1),rollingCampaignRegistrationResult);
 const initializationPath = path.join(root,'managed','initialization.json');
 fs.writeFileSync(initializationPath,JSON.stringify(rollingCampaignInitializationV1));
 const cli = path.join(process.cwd(),'src/rolling-operations.js');
 const initializedSpawnSyncReturns = spawnSync(process.execPath,[cli,'init',initializationPath],{cwd:root,encoding:'utf8'});
 assert.equal(initializedSpawnSyncReturns.status,0,initializedSpawnSyncReturns.stderr);
 const initializedCliResult:unknown = JSON.parse(initializedSpawnSyncReturns.stdout);
 assert.deepEqual(initializedCliResult,rollingCampaignRegistrationResult);
 assert.equal(git(root,['branch','--show-current']),'campaign/pilot');
 assert.equal(git(remoteRoot,['rev-parse','refs/heads/campaign/pilot']),git(root,['rev-parse','HEAD']));
 git(root,['switch','-c','campaign/unreviewed']);
 fs.writeFileSync(path.join(root,'unreviewed.txt'),'Retain this unreviewed local work.\n');
 git(root,['add','unreviewed.txt']);git(root,['commit','-m','Unreviewed local candidate']);
 const unreviewedRevision = git(root,['rev-parse','HEAD']);
 const unreviewedRollingCampaignInitializationV1:RollingCampaignInitializationV1 = {...rollingCampaignInitializationV1,configuration:{...rollingCampaignInitializationV1.configuration,incrementRef:'campaign/unreviewed'}};
 await assert.rejects(rollingCampaignOperations.initialize(unreviewedRollingCampaignInitializationV1),/initial campaign base UNCONFIRMED/);
 assert.equal(git(root,['rev-parse','HEAD']),unreviewedRevision);
 assert.equal(fs.readFileSync(path.join(root,'unreviewed.txt'),'utf8'),'Retain this unreviewed local work.\n');
 assert.equal(git(remoteRoot,['for-each-ref','--format=%(refname)','refs/heads/campaign/unreviewed']),'');
 git(root,['switch','campaign/pilot']);
 assert.equal(git(root,['rev-parse','refs/heads/campaign/unreviewed']),unreviewedRevision);
 const initialRollingCoordinatorSnapshot = await rollingCampaignOperations.status('pilot');
 assert.deepEqual(initialRollingCoordinatorSnapshot.configuration,{schemaVersion:1,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/pilot',maxActiveWorkers:2,publicationSize:1});
 const rollingReplenishments:readonly RollingReplenishment[] = await Promise.all(Array.from({length:4},(_,index)=>rollingCampaignOperations.replenish('pilot',index%2 === 0 ? 'event' : 'periodic')));
 assert.equal(rollingReplenishments.reduce((count,item)=>count+item.allocations.length,0),2);
 const reservedRollingCoordinatorSnapshot = await new RollingCampaignOperations(new RollingCampaignStore(pool,projectId)).status('pilot');
 assert.equal(reservedRollingCoordinatorSnapshot.assignments.length,2);
 assert.equal(new Set(reservedRollingCoordinatorSnapshot.assignments.map(item=>item.obligationId)).size,2);
 assert.equal(reservedRollingCoordinatorSnapshot.scheduling.activeCount,2);
 assert.equal(reservedRollingCoordinatorSnapshot.actions.length,2);
 assert.deepEqual((await rollingCampaignOperations.replenish('pilot','periodic')).allocations,[]);
 const firstRollingStoredAssignment = reservedRollingCoordinatorSnapshot.assignments[0];assert.ok(firstRollingStoredAssignment);
 const rollingAction = reservedRollingCoordinatorSnapshot.actions.find(item=>item.assignmentId === firstRollingStoredAssignment.id);assert.ok(rollingAction);
 await rollingCampaignStore.acknowledgeAction('pilot',rollingAction.id,rollingAction.generation,'STARTED');
 await rollingCampaignStore.acknowledgeAction('pilot',rollingAction.id,rollingAction.generation,'COMPLETED','isolated stopped-session fixture');
 await rollingCampaignStore.attachSession('pilot',firstRollingStoredAssignment.id,firstRollingStoredAssignment.generation,'session-fixture');
 await rollingCampaignStore.suspend('pilot',firstRollingStoredAssignment.id,firstRollingStoredAssignment.generation,true,['OBL-7']);
 const inactiveRollingCoordinatorSnapshot = await rollingCampaignOperations.status('pilot');
 assert.equal(inactiveRollingCoordinatorSnapshot.scheduling.activeCount,1);
 assert.equal(inactiveRollingCoordinatorSnapshot.assignments.find(item=>item.id === firstRollingStoredAssignment.id)?.state,'INACTIVE');
 assert.ok(inactiveRollingCoordinatorSnapshot.scheduling.blocked.some(item=>item.reason === 'prerequisites' && item.obligationId === firstRollingStoredAssignment.obligationId && item.prerequisites.includes('OBL-7')));
 const replacementRollingReplenishment = await rollingCampaignOperations.replenish('pilot','event');
 assert.equal(replacementRollingReplenishment.allocations.length,1);
 const replacementRollingStoredAssignment = replacementRollingReplenishment.allocations[0]?.assignment;assert.ok(replacementRollingStoredAssignment);
 assert.notEqual(replacementRollingStoredAssignment.id,firstRollingStoredAssignment.id);
 const obligationCertificate:ObligationCertificate = {id:'CERT-unblock',obligationIds:['OBL-7'],inputs:[{path:'requirement.md',digest:inputDigest(root,'requirement.md')}],artifacts:['requirement.md'],assessor:'coordinator',authority:['approved-CHNG'],adequate:true,reason:'Inspect isolated prerequisite evidence',disposition:null,evidence:[],inventoryIds:[]};
 const obligationCheckpoint:ObligationCheckpoint = {id:'CP2',predecessorId:'CP1',baselineId:'B1',kind:'neutral',selectedIds:['OBL-1','OBL-7'],registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:[1,1,1,1,1,1],after:[1,1,1,1,1,1],preparation:{obligationId:'OBL-1',operations:['inspect'],deliverable:'requirement.md'},reason:'Resolve the isolated prerequisite',assessor:'coordinator'};
 const acceptedObligationDocumentV1 = acceptCheckpoint(initialObligationDocumentV1,{...initialObligationDocumentV1,certificates:[obligationCertificate],checkpoints:[...initialObligationDocumentV1.checkpoints,obligationCheckpoint]},root);
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(acceptedObligationDocumentV1));
 await rollingCampaignStore.retire('pilot',replacementRollingStoredAssignment.id,replacementRollingStoredAssignment.generation,true);
 const resumedRollingReplenishment = await rollingCampaignOperations.replenish('pilot','periodic',{id:replacementRollingStoredAssignment.id,generation:replacementRollingStoredAssignment.generation});
 assert.equal(resumedRollingReplenishment.allocations.length,1);
 assert.equal(resumedRollingReplenishment.allocations[0]?.assignment?.id,firstRollingStoredAssignment.id);
 assert.equal(resumedRollingReplenishment.allocations[0]?.assignment?.sessionId,'session-fixture');
 assert.notEqual(resumedRollingReplenishment.allocations[0]?.assignment?.generation,firstRollingStoredAssignment.generation);
 assert.deepEqual((await rollingCampaignOperations.replenish('pilot','event')).allocations,[]);
 fs.writeFileSync(path.join(root,'bindings.json'),JSON.stringify({...rollingBindingsV1,bindings:rollingBindingsV1.bindings.slice(0,2)}));
 const changedRollingCoordinatorActions = await rollingCampaignOperations.nextActions('pilot');
 assert.equal(changedRollingCoordinatorActions.decisions[0]?.kind,'reconcile');
 assert.equal(changedRollingCoordinatorActions.decisions.length,1);
 await rollingCampaignOperations.reconcile('pilot');
 const reconciledSpawnSyncReturns = spawnSync(process.execPath,[cli,'reconcile','pilot'],{cwd:root,encoding:'utf8'});
 assert.equal(reconciledSpawnSyncReturns.status,0,reconciledSpawnSyncReturns.stderr);
 const reconciledCliResult:unknown = JSON.parse(reconciledSpawnSyncReturns.stdout);
 assert.deepEqual(reconciledCliResult,await rollingCampaignOperations.reconcile('pilot'));
 const reconciledRollingCoordinatorActions = await rollingCampaignOperations.nextActions('pilot');
 assert.equal(reconciledRollingCoordinatorActions.snapshot.graphDigest,reconciledRollingCoordinatorActions.snapshot.observedGraphDigest);
 assert.ok(reconciledRollingCoordinatorActions.decisions.every(item=>item.kind !== 'reconcile'));
 const foreignRollingCampaignOperations = new RollingCampaignOperations(new RollingCampaignStore(pool,crypto.randomUUID()));
 await assert.rejects(foreignRollingCampaignOperations.status('pilot'));
});
