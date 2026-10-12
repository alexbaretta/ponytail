// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {fixture,git} from './helpers/obligation-fixture.js';
import {RollingCampaignStore,type RollingExecutionConfigV3,type RollingWorkerDispatchStarted,type RollingWorkerDispatchAttached,type RollingReviewDispatchStarted,type RollingReviewDispatchAttached} from '../src/rolling-campaign-store.js';
import {RollingCampaignOperations,type RollingCampaignInitializationV1,type RollingReplenishment} from '../src/rolling-operations.js';
import type {RollingProjectConfigV1,RollingBindingsV1} from '../src/rolling-campaign.js';
import {acceptCheckpoint,inputDigest,type ObligationCertificate,type ObligationCheckpoint,type ObligationDocumentV1,type Obligation,type ObligationVector} from '../skills/plan-execution/scripts/obligations.js';
import {freezeObligationLease,type ObligationBindingHistoryV1} from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type {RollingWorkerSubmissionV1} from '../src/rolling-worker-submission.js';
import type {RollingWorkerRetirementV1} from '../src/rolling-worker.js';
import type {RollingReviewRequestV1} from '../src/rolling-review.js';
import {rollingCommandDefinitions} from '../src/rolling-cli-registry.js';

// Traceability: verifies REQ-ROLLING-INTERFACES
async function verifyMcpParity(root:string,rollingCampaignOperations:RollingCampaignOperations):Promise<void> {
 const childProcess = spawn(process.execPath,[path.join(process.cwd(),'ponytail-mcp/index.js')],{cwd:root,stdio:['pipe','pipe','pipe']});
 let stderr = '';
 childProcess.stderr.setEncoding('utf8').on('data',(text:string)=>{stderr+=text;});
 const interface_ = createInterface({input:childProcess.stdout});
 const pending = new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
 interface_.on('line',line=> {
  const value:unknown = JSON.parse(line);
  if (value !== null && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
   const request = pending.get(value.id);
   if (request) {pending.delete(value.id);request.resolve(value);}
  }
 });
 childProcess.on('exit',()=> {for (const request of pending.values()) request.reject(new Error(`MCP exited: ${stderr}`));pending.clear();});
 let id = 0;
 async function request(method:string,params:unknown):Promise<unknown> {
  const requestId = ++id;
  return new Promise((resolve,reject)=> {
   const timeout = setTimeout(()=> {pending.delete(requestId);reject(new Error(`MCP request timed out: ${method}; ${stderr}`));},15000);
   pending.set(requestId,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
   childProcess.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n');
  });
 }
 try {
  const initialized:unknown = await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'ponytail-parity-proof',version:'1'}});
  assert.ok(initialized !== null && typeof initialized === 'object' && 'result' in initialized);
  childProcess.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listed:unknown = await request('tools/list',{});
  assert.ok(listed !== null && typeof listed === 'object' && 'result' in listed);
  const result = listed.result;
  assert.ok(result !== null && typeof result === 'object' && 'tools' in result && Array.isArray(result.tools));
  for (const rollingCommandDefinition of rollingCommandDefinitions) {
   const tool:unknown = result.tools.find((tool:unknown)=>tool !== null && typeof tool === 'object' && 'name' in tool && tool.name === `ponytail_campaign_${rollingCommandDefinition.name.replaceAll('-','_')}`);
   assert.ok(tool !== null && typeof tool === 'object' && 'inputSchema' in tool);
   const inputSchema = tool.inputSchema;
   assert.ok(inputSchema !== null && typeof inputSchema === 'object' && 'required' in inputSchema && Array.isArray(inputSchema.required));
   for (const field of rollingCommandDefinition.fields) assert.equal(inputSchema.required.includes(field.name),field.required,`${rollingCommandDefinition.name}: ${field.name} required schema parity`);
  }
  for (const command of ['status','reconcile'] as const) {
   const response:unknown = await request('tools/call',{name:`ponytail_campaign_${command}`,arguments:{root,campaign:'pilot'}});
   assert.ok(response !== null && typeof response === 'object' && 'result' in response);
   const called = response.result;
   assert.ok(called !== null && typeof called === 'object' && 'content' in called && Array.isArray(called.content));
   const content:unknown = called.content[0];
   assert.ok(content !== null && typeof content === 'object' && 'text' in content && typeof content.text === 'string');
   const observed:unknown = JSON.parse(content.text);
   assert.deepEqual(observed,await rollingCampaignOperations.execute(command,{campaign:'pilot'}));
  }
 } finally {
  interface_.close();childProcess.stdin.end();childProcess.kill();
  if (childProcess.exitCode === null && childProcess.signalCode === null) await new Promise<void>(resolve=>childProcess.once('exit',()=>resolve()));
 }
}

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
 const rollingCampaignOperations = new RollingCampaignOperations(rollingCampaignStore,root);
 const rollingCampaignInitializationV1:RollingCampaignInitializationV1 = {schemaVersion:1,coordinatorRoot:root,documentPath:obligationFixture.documentPath,bindingsPath:'bindings.json',bindingHistory:null,
  configuration:{mainline:null,incrementRef:'campaign/pilot',maxActiveWorkers:null,publicationSize:null}};
 const rollingCampaignRegistrationResult = await rollingCampaignOperations.initialize(rollingCampaignInitializationV1);
 assert.equal(rollingCampaignRegistrationResult.id,'pilot');
 assert.deepEqual(await rollingCampaignOperations.initialize(rollingCampaignInitializationV1),rollingCampaignRegistrationResult);
 await verifyMcpParity(root,rollingCampaignOperations);
 await assert.rejects(rollingCampaignOperations.execute('close',{campaign:'pilot'}),/fresh adequate evidence/);
 const initializationPath = path.join(root,'managed','initialization.json');
 fs.writeFileSync(initializationPath,JSON.stringify(rollingCampaignInitializationV1));
 const cli = path.join(process.cwd(),'src/rolling-operations.js');
 const initializedSpawnSyncReturns = spawnSync(process.execPath,[cli,'init','--request',`@${initializationPath}`],{cwd:root,encoding:'utf8'});
 assert.equal(initializedSpawnSyncReturns.status,0,initializedSpawnSyncReturns.stderr);
 const initializedCliResult:unknown = JSON.parse(initializedSpawnSyncReturns.stdout);
 assert.deepEqual(initializedCliResult,{command:'init',result:rollingCampaignRegistrationResult});
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
 const rollingExecutionConfigV3:RollingExecutionConfigV3={schemaVersion:3,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/pilot',maxActiveWorkers:2,publicationSize:1,bindingHistory:null};
 assert.deepEqual(initialRollingCoordinatorSnapshot.configuration,rollingExecutionConfigV3);
 const rollingReplenishments:readonly RollingReplenishment[] = await Promise.all(Array.from({length:4},(_,index)=>rollingCampaignOperations.replenish('pilot',index%2 === 0 ? 'event' : 'periodic')));
 assert.equal(rollingReplenishments.reduce((count,item)=>count+item.allocations.length,0),2);
 const reservedRollingCoordinatorSnapshot = await new RollingCampaignOperations(new RollingCampaignStore(pool,projectId),root).status('pilot');
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
 const workingRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.ok(workingRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'assignment' && decision.command === 'dispatch-worker' && decision.assignment.id === firstRollingStoredAssignment.id));
 // Stored native receipts are fixture data here; this Arc exercises real PostgreSQL
 // snapshot/decision boundaries, without claiming native turn execution.
 const rollingWorkerDispatchStarted:RollingWorkerDispatchStarted={id:crypto.randomUUID(),threadId:'receipt-fixture',instructions:'bounded snapshot fixture',state:'STARTED'};
 await pool.query("INSERT INTO ponytail_index.rolling_worker_dispatch_v1(project_id,campaign_id,assignment_id,generation,dispatch_id,thread_id,instructions_text,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
  [projectId,'pilot',firstRollingStoredAssignment.id,firstRollingStoredAssignment.generation,rollingWorkerDispatchStarted.id,rollingWorkerDispatchStarted.threadId,rollingWorkerDispatchStarted.instructions,rollingWorkerDispatchStarted.state]);
 const unknownRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(unknownRollingCoordinatorActions.snapshot.workerDispatches,[{assignmentId:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation,dispatch:rollingWorkerDispatchStarted}]);
 assert.ok(unknownRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'blocked-worker-dispatch' && decision.assignment.id === firstRollingStoredAssignment.id));
 const rollingWorkerDispatchAttached:RollingWorkerDispatchAttached={...rollingWorkerDispatchStarted,state:'ATTACHED',turnId:'retained-turn'};
 await pool.query("UPDATE ponytail_index.rolling_worker_dispatch_v1 SET state=$4,turn_id=$5 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",
  [projectId,'pilot',firstRollingStoredAssignment.id,rollingWorkerDispatchAttached.state,rollingWorkerDispatchAttached.turnId]);
 const attachedRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(attachedRollingCoordinatorActions.snapshot.workerDispatches,[{assignmentId:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation,dispatch:rollingWorkerDispatchAttached}]);
 assert.ok(attachedRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'assignment' && decision.command === 'collect-submission' && decision.assignment.id === firstRollingStoredAssignment.id));
 await verifyMcpParity(root,rollingCampaignOperations);
 await pool.query("UPDATE ponytail_index.rolling_worker_dispatch_v1 SET generation=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id,crypto.randomUUID()]);
 const staleRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(staleRollingCoordinatorActions.snapshot.workerDispatches,[]);
 assert.ok(staleRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'assignment' && decision.command === 'dispatch-worker' && decision.assignment.id === firstRollingStoredAssignment.id));
 await pool.query("DELETE FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 // Exact typed submission/request fixtures establish relational snapshot inputs;
 // their receipt states exercise the real database without claiming native execution.
 const obligationBindingHistoryV1:ObligationBindingHistoryV1={schemaVersion:1,scopeId:'pilot',revisions:[]};
 const currentObligationBaseline=obligationFixture.document.baselines.at(-1);assert.ok(currentObligationBaseline);
 const obligationLeaseV1=freezeObligationLease(obligationFixture.document,obligationBindingHistoryV1,{obligationId:firstRollingStoredAssignment.obligationId,graphDigest:staleRollingCoordinatorActions.snapshot.graphDigest,generation:firstRollingStoredAssignment.generation,assessor:'coordinator',authority:currentObligationBaseline.authority.references});
 const candidateRevision=git(root,['rev-parse','HEAD']);
 const observedAt=new Date().toISOString();
 const rollingWorkerSubmissionV1:RollingWorkerSubmissionV1={schemaVersion:1,campaignId:'pilot',assignmentId:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation,sessionId:'session-fixture',graphDigest:staleRollingCoordinatorActions.snapshot.graphDigest,revision:candidateRevision,baseCommit:candidateRevision,stopped:true,
  proof:[{operation:'inspect',evidence:{command:'snapshot-fixture',selection:['relational snapshot fixture'],target:{identity:'isolated-local',profile:'database-snapshot-fixture',verification:'requirement.md'},revision:candidateRevision,dirty:false,startedAt:observedAt,completedAt:observedAt,outcome:'pass',skips:0,failures:0,inputs:[{path:'requirement.md',digest:inputDigest(root,'requirement.md')}],outputPath:'requirement.md',finalization:'pass'}}]};
 await pool.query("INSERT INTO ponytail_index.rolling_submission_v1(project_id,campaign_id,assignment_id,generation,revision,submission_text,lease_text) VALUES($1,$2,$3,$4,$5,$6,$7)",[projectId,'pilot',firstRollingStoredAssignment.id,firstRollingStoredAssignment.generation,candidateRevision,JSON.stringify(rollingWorkerSubmissionV1),JSON.stringify(obligationLeaseV1)]);
 const rollingReviewRequestV1:RollingReviewRequestV1={schemaVersion:1,id:crypto.randomUUID(),campaignId:'pilot',assignmentId:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation,baseCommit:candidateRevision,revision:candidateRevision,reviewerSessionId:'reviewer-fixture'};
 await pool.query("INSERT INTO ponytail_index.rolling_review_v1(project_id,campaign_id,review_id,assignment_id,generation,revision,request_text) VALUES($1,$2,$3,$4,$5,$6,$7)",[projectId,'pilot',rollingReviewRequestV1.id,firstRollingStoredAssignment.id,firstRollingStoredAssignment.generation,candidateRevision,JSON.stringify(rollingReviewRequestV1)]);
 await pool.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='REVIEW',activity_stopped=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 assert.ok((await rollingCampaignOperations.nextActions('pilot')).decisions.some(decision=>decision.kind === 'review' && decision.command === 'dispatch-review' && decision.review.request.id === rollingReviewRequestV1.id));
 const rollingReviewDispatchStarted:RollingReviewDispatchStarted={id:crypto.randomUUID(),reviewerThreadId:'reviewer-thread-fixture',state:'STARTED'};
 await pool.query("INSERT INTO ponytail_index.rolling_review_dispatch_v1(project_id,campaign_id,review_id,dispatch_id,reviewer_thread_id,state) VALUES($1,$2,$3,$4,$5,$6)",[projectId,'pilot',rollingReviewRequestV1.id,rollingReviewDispatchStarted.id,rollingReviewDispatchStarted.reviewerThreadId,rollingReviewDispatchStarted.state]);
 const unknownReviewRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(unknownReviewRollingCoordinatorActions.snapshot.reviewDispatches,[{reviewId:rollingReviewRequestV1.id,dispatch:rollingReviewDispatchStarted}]);
 assert.ok(unknownReviewRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'blocked-review-dispatch' && decision.review.request.id === rollingReviewRequestV1.id));
 const rollingReviewDispatchAttached:RollingReviewDispatchAttached={...rollingReviewDispatchStarted,state:'ATTACHED',turnId:'retained-review-turn'};
 await pool.query("UPDATE ponytail_index.rolling_review_dispatch_v1 SET state=$4,turn_id=$5 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3",[projectId,'pilot',rollingReviewRequestV1.id,rollingReviewDispatchAttached.state,rollingReviewDispatchAttached.turnId]);
 const attachedReviewRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(attachedReviewRollingCoordinatorActions.snapshot.reviewDispatches,[{reviewId:rollingReviewRequestV1.id,dispatch:rollingReviewDispatchAttached}]);
 assert.ok(attachedReviewRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'review' && decision.command === 'inspect-review' && decision.review.request.id === rollingReviewRequestV1.id));
 await verifyMcpParity(root,rollingCampaignOperations);
 await pool.query("DELETE FROM ponytail_index.rolling_submission_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 await pool.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='WORKING',activity_stopped=false WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 const rollingWorkerRetirementV1:RollingWorkerRetirementV1={schemaVersion:1,campaignId:'pilot',assignmentId:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation,resourceGeneration:firstRollingStoredAssignment.generation,number:firstRollingStoredAssignment.worktreeNumber,rootPath:path.join(root,'managed',String(firstRollingStoredAssignment.worktreeNumber)),coordinatorRoot:root,threadId:'worker-thread-fixture',sessionId:'session-fixture',integratedRevision:candidateRevision};
 await pool.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',retired=true,activity_stopped=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 const previousRollingWorkerRetirementV1:RollingWorkerRetirementV1={...rollingWorkerRetirementV1,generation:crypto.randomUUID()};
 await pool.query("INSERT INTO ponytail_index.rolling_worker_retirement_v1(project_id,campaign_id,assignment_id,generation,context_text,state,turn_id) VALUES($1,$2,$3,$4,$5,'CLEANED','retained-notification-turn')",[projectId,'pilot',firstRollingStoredAssignment.id,previousRollingWorkerRetirementV1.generation,JSON.stringify(previousRollingWorkerRetirementV1)]);
 assert.deepEqual((await rollingCampaignOperations.status('pilot')).releasableAssignments,[]);
 await pool.query("UPDATE ponytail_index.rolling_worker_retirement_v1 SET generation=$4,context_text=$5,state='ARCHIVED' WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id,rollingWorkerRetirementV1.generation,JSON.stringify(rollingWorkerRetirementV1)]);
 assert.deepEqual((await rollingCampaignOperations.status('pilot')).releasableAssignments,[]);
 await assert.rejects(rollingCampaignStore.allocate('pilot',staleRollingCoordinatorActions.snapshot.graphDigest,{id:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation}),/completed native retirement/);
 await pool.query("UPDATE ponytail_index.rolling_worker_retirement_v1 SET state='CLEANED' WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 const cleanedRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 assert.deepEqual(cleanedRollingCoordinatorActions.snapshot.releasableAssignments,[{id:firstRollingStoredAssignment.id,generation:firstRollingStoredAssignment.generation}]);
 assert.ok(cleanedRollingCoordinatorActions.decisions.some(decision=>decision.kind === 'release' && decision.release.id === firstRollingStoredAssignment.id));
 await verifyMcpParity(root,rollingCampaignOperations);
 await pool.query("DELETE FROM ponytail_index.rolling_worker_retirement_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
 await pool.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='WORKING',retired=false,activity_stopped=false WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[projectId,'pilot',firstRollingStoredAssignment.id]);
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
 await rollingCampaignOperations.reconcile('pilot');
 const releaseRollingCoordinatorActions=await rollingCampaignOperations.nextActions('pilot');
 const rollingReleaseDecision=releaseRollingCoordinatorActions.decisions.find(decision=>decision.kind === 'release');assert.ok(rollingReleaseDecision && rollingReleaseDecision.kind === 'release');
 assert.deepEqual(rollingReleaseDecision.release,{id:replacementRollingStoredAssignment.id,generation:replacementRollingStoredAssignment.generation});
 const resumedRollingReplenishment = await rollingCampaignOperations.replenish('pilot','periodic',rollingReleaseDecision.release);
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
 const reconciledSpawnSyncReturns = spawnSync(process.execPath,[cli,'reconcile','--campaign','pilot'],{cwd:root,encoding:'utf8'});
 assert.equal(reconciledSpawnSyncReturns.status,0,reconciledSpawnSyncReturns.stderr);
 const reconciledCliResult:unknown = JSON.parse(reconciledSpawnSyncReturns.stdout);
 assert.deepEqual(reconciledCliResult,{command:'reconcile',result:await rollingCampaignOperations.reconcile('pilot')});
 const reconciledRollingCoordinatorActions = await rollingCampaignOperations.nextActions('pilot');
 assert.equal(reconciledRollingCoordinatorActions.snapshot.graphDigest,reconciledRollingCoordinatorActions.snapshot.observedGraphDigest);
 assert.ok(reconciledRollingCoordinatorActions.decisions.every(item=>item.kind !== 'reconcile'));
 const foreignRollingCampaignOperations = new RollingCampaignOperations(new RollingCampaignStore(pool,crypto.randomUUID()),root);
 await assert.rejects(foreignRollingCampaignOperations.status('pilot'));
});

// Traceability: verifies REQ-ROLLING-INTERFACES
// Traceability: verifies REQ-ROLLING-STATE
test('closure requires fresh evidence, persists an immutable receipt and fences later mutations',async testContext=> {
 const obligationFixture = fixture(testContext);
 const {root,documentPath,proofPath} = obligationFixture;
 let acceptedObligationDocumentV1:ObligationDocumentV1 = obligationFixture.document;
 const vectors:readonly ObligationVector[] = [[0,1,1,1,1,1],[0,0,1,1,1,1],[0,0,0,1,1,1],[0,0,0,0,1,1],[0,0,0,0,0,1],[0,0,0,0,0,0]];
 for (const [index,obligation] of obligationFixture.document.obligations.entries()) {
  const previous = acceptedObligationDocumentV1.checkpoints.at(-1),after = vectors[index];assert.ok(previous && after);
  const obligationCertificate:ObligationCertificate = {id:`CERT-${index+1}`,obligationIds:[obligation.id],
   inputs:['requirement.md',proofPath].map(relative=>({path:relative,digest:inputDigest(root,relative)})),artifacts:[proofPath],
   assessor:'coordinator',authority:['approved-CHNG'],adequate:true,reason:'Complete inspected fixture inventory',disposition:null,evidence:[],inventoryIds:[]};
  const obligationCheckpoint:ObligationCheckpoint = {id:`CP${index+2}`,predecessorId:previous.id,baselineId:'B1',kind:'productive',selectedIds:[obligation.id],
   registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:previous.after,after,preparation:null,assessor:'coordinator',reason:'Accept the earliest unresolved fixture inventory'};
  acceptedObligationDocumentV1 = acceptCheckpoint(acceptedObligationDocumentV1,{...acceptedObligationDocumentV1,certificates:[...acceptedObligationDocumentV1.certificates,obligationCertificate],checkpoints:[...acceptedObligationDocumentV1.checkpoints,obligationCheckpoint]},root);
 }
 fs.writeFileSync(path.join(root,documentPath),JSON.stringify(acceptedObligationDocumentV1));
 const pool = new Pool(databaseOptions(process.cwd()));
 const projectId = crypto.randomUUID();
 testContext.after(async()=> {try {await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);} finally {await pool.end();}});
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`closure-${projectId}`]);
 const rollingProjectConfigV1:RollingProjectConfigV1 = {schemaVersion:1,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:'managed',anchor:'main'},maxActiveWorkers:2,publicationSize:1,setupCommands:[],qa:{focused:[],publication:[['node','--test']]}};
 const rollingBindingsV1:RollingBindingsV1 = {schemaVersion:1,bindings:[]};
 fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV1));
 fs.writeFileSync(path.join(root,'bindings.json'),JSON.stringify(rollingBindingsV1));
 fs.appendFileSync(path.join(root,'.gitignore'),'managed/\n');
 git(root,['add','.']);git(root,['commit','-m','Complete closure fixture inventories']);
 const remoteRoot = path.join(root,'managed/origin.git');fs.mkdirSync(path.dirname(remoteRoot),{recursive:true});
 git(root,['clone','--bare',root,remoteRoot]);git(root,['remote','add','origin',remoteRoot]);
 const rollingCampaignOperations = new RollingCampaignOperations(new RollingCampaignStore(pool,projectId),root);
 const rollingCampaignInitializationV1:RollingCampaignInitializationV1 = {schemaVersion:1,coordinatorRoot:root,documentPath,bindingsPath:'bindings.json',bindingHistory:null,configuration:{mainline:null,incrementRef:'campaign/pilot',maxActiveWorkers:null,publicationSize:null}};
 await rollingCampaignOperations.initialize(rollingCampaignInitializationV1);
 const originalProof = fs.readFileSync(path.join(root,proofPath),'utf8');
 fs.writeFileSync(path.join(root,proofPath),'Changed certificate input');
 await assert.rejects(rollingCampaignOperations.execute('close',{campaign:'pilot'}),/fresh|stale/);
 fs.writeFileSync(path.join(root,proofPath),originalProof);
 const rollingOperationResponse = await rollingCampaignOperations.execute('close',{campaign:'pilot'});
 assert.equal(rollingOperationResponse.command,'close');
 assert.deepEqual(await rollingCampaignOperations.execute('close',{campaign:'pilot'}),rollingOperationResponse);
 const rollingCoordinatorSnapshot = await rollingCampaignOperations.status('pilot');
 assert.notEqual(rollingCoordinatorSnapshot.closure,null);
 assert.deepEqual((await rollingCampaignOperations.nextActions('pilot')).decisions,[]);
 await assert.rejects(rollingCampaignOperations.replenish('pilot','periodic'),/closed/);
 await assert.rejects(rollingCampaignOperations.initialize(rollingCampaignInitializationV1),/closed/);
});
