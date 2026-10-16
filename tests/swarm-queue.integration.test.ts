// Copyright (c) 2026 Alex Baretta. MIT License.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {SwarmStore,type SwarmWorkerBinding,type SwarmWorkerAssignment} from '../src/swarm-store.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';
import {SwarmQueueStore,type SwarmQueueCommandV1,type SwarmQueueActorV1,type SwarmQueueTaskInputV1,type SwarmQueueDiscoveryV1,type SwarmQueueCandidateV1,type SwarmQueueVerdictV1} from '../src/swarm-queue.js';
import {fixture,git} from './helpers/obligation-fixture.js';
import {type ObligationDocumentV1,type ObligationEvidence,type ObligationCertificate,inputDigest,parseObligationDocument,acceptCheckpoint} from '../skills/plan-execution/scripts/obligations.js';
// Traceability: verifies REQ-SWARM-QUEUES
test('autonomous queues preserve parked work, race exclusive claims, service FIFO and publish discovery through real CLI',async testContext=>{
 const obligationFixture=fixture(testContext);const root=obligationFixture.root;
 fs.appendFileSync(path.join(root,'.gitignore'),'managed/\nsession_id.txt\n');
 const projectId=crypto.randomUUID();const pool=new Pool(databaseOptions(process.cwd()));
 testContext.after(async()=>{try{await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}finally{await pool.end();}});
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},maxActiveWorkers:2,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(process.cwd(),'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object');
 fs.writeFileSync(path.join(root,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 fs.mkdirSync(path.join(root,'pm/requirements'),{recursive:true});fs.writeFileSync(path.join(root,'pm/requirements/pilot.md'),'# REQ-PILOT: approved observable behavior\n');
 const bindingsPath='pm/plans/in_progress/pilot/bindings.json';fs.writeFileSync(path.join(root,bindingsPath),JSON.stringify({schemaVersion:1,scopeId:'pilot',revisions:[]}));
 const obligationDocumentV1:ObligationDocumentV1={...obligationFixture.document,baselines:obligationFixture.document.baselines.map(baselineObligationBaseline=>({...baselineObligationBaseline,requirements:[{id:'REQ-PILOT',path:'pm/requirements/pilot.md',digest:inputDigest(root,'pm/requirements/pilot.md')}]})),obligations:obligationFixture.document.obligations.map((obligation,index)=>({...obligation,execution:{...obligation.execution,plannedPaths:[`work-${index+1}.txt`],operations:['inspect','edit'],selection:['focused'],target:{identity:'local',profile:'fixture'}}}))};
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(obligationDocumentV1));
 for(let number=1;number<=6;number++)fs.writeFileSync(path.join(root,`work-${number}.txt`),'original\n');
 git(root,['add','.']);git(root,['commit','-m','queue fixture']);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`queue-${projectId}`]);
 const swarmStore=new SwarmStore(pool,projectId);await swarmStore.enrollOwner({rootPath:root,gitCommonDirectory:git(root,['rev-parse','--path-format=absolute','--git-common-dir'])});
 await swarmStore.bindCoordinator(root,{sessionId:'coordinator',threadId:`coordinator-${projectId}`,rootPath:root});
 const workers:SwarmWorkerBinding[]=[];
 const swarmWorkerAssignment:SwarmWorkerAssignment={kind:'plan',id:'pilot',summary:'Execute queue campaign'};
 for(let number=1;number<=2;number++){
  const workerRoot=path.join(root,'managed',String(100+number));git(root,['worktree','add','-q','-b',`worker-${number}`,workerRoot]);
  const membershipSwarmWorktreeMembership=await swarmStore.enrollWorktree(root,workerRoot);const sessionId=`worker-${projectId}-${number}`;
  const workerSwarmWorkerBinding=await swarmStore.bindWorker(membershipSwarmWorktreeMembership,{sessionId,threadId:`thread-${sessionId}`,rootPath:workerRoot},swarmWorkerAssignment);
  fs.writeFileSync(path.join(workerRoot,'session_id.txt'),sessionId+'\n');workers.push(workerSwarmWorkerBinding);
 }
 const firstSwarmWorkerBinding=workers[0],secondSwarmWorkerBinding=workers[1];assert.ok(firstSwarmWorkerBinding&&secondSwarmWorkerBinding);
 const coordinatorSwarmQueueActorV1:SwarmQueueActorV1={kind:'coordinator',sessionId:'coordinator'};
 const firstActorSwarmQueueActorV1:SwarmQueueActorV1={kind:'worker',sessionId:firstSwarmWorkerBinding.sessionId,generation:firstSwarmWorkerBinding.generation};
 const secondActorSwarmQueueActorV1:SwarmQueueActorV1={kind:'worker',sessionId:secondSwarmWorkerBinding.sessionId,generation:secondSwarmWorkerBinding.generation};
 const swarmQueueStore=new SwarmQueueStore(pool,projectId,root);
 const initSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'init',documentPath:obligationFixture.documentPath,bindingsPath,authority:['approved-CHNG'],assessor:'coordinator',recordRoots:{requirements:'pm/requirements',uat:'pm/uat',issues:'pm/bugs',plans:'pm/plans'}};
 await swarmQueueStore.execute(initSwarmQueueCommandV1,root);await swarmQueueStore.execute(initSwarmQueueCommandV1,root);
 const queued:readonly SwarmQueueTaskInputV1[]=[
  {id:'one',title:'First preferred task',obligationIds:['OBL-1'],preferredWorker:firstSwarmWorkerBinding.sessionId,context:['backend']},
  {id:'two',title:'Second preferred task',obligationIds:['OBL-2'],preferredWorker:secondSwarmWorkerBinding.sessionId,context:['frontend']},
  {id:'three',title:'Backend stealing target',obligationIds:['OBL-3'],preferredWorker:secondSwarmWorkerBinding.sessionId,context:['backend']},
  {id:'four',title:'Frontend stealing target',obligationIds:['OBL-4'],preferredWorker:firstSwarmWorkerBinding.sessionId,context:['frontend']}
 ];
 const addSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'add',tasks:queued};await swarmQueueStore.execute(addSwarmQueueCommandV1,root);
 const firstClaimSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:firstActorSwarmQueueActorV1,command:'claim'};
 const secondClaimSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:secondActorSwarmQueueActorV1,command:'claim'};
 const raced=await Promise.all([swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),swarmQueueStore.execute(secondClaimSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath)]);
 assert.equal(raced[0]?.task?.id,'one');assert.equal(raced[1]?.task?.id,'two');
 assert.equal((await swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath)).task?.claim?.generation,raced[0]?.task?.claim?.generation);
 await assert.rejects(swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath),/identity/);
 const firstTaskSwarmQueueTaskV1=raced[0]?.task;const secondTaskSwarmQueueTaskV1=raced[1]?.task;assert.ok(firstTaskSwarmQueueTaskV1?.claim&&secondTaskSwarmQueueTaskV1?.claim);
 fs.writeFileSync(path.join(firstSwarmWorkerBinding.rootPath,'work-1.txt'),'unfinished preserved\n');git(firstSwarmWorkerBinding.rootPath,['add','work-1.txt']);
 fs.writeFileSync(path.join(firstSwarmWorkerBinding.rootPath,'scratch.txt'),'untracked preserved');
 const helpSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:firstActorSwarmQueueActorV1,command:'handoff',taskId:'one',generation:firstTaskSwarmQueueTaskV1.claim.generation,requestId:'help-one',kind:'help',detail:'Needs external prerequisite; continue other work',evidencePaths:[],candidate:null};
 const parkedSwarmQueueResultV1=await swarmQueueStore.execute(helpSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);assert.ok(parkedSwarmQueueResultV1.task?.checkpoint?.indexPatchBase64);assert.equal(parkedSwarmQueueResultV1.task.checkpoint.untracked.some(valueSwarmQueueArtifactV1=>valueSwarmQueueArtifactV1.path==='scratch.txt'),true);
 await swarmQueueStore.execute(helpSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'work-2.txt'),'completed\n');git(secondSwarmWorkerBinding.rootPath,['add','work-2.txt']);git(secondSwarmWorkerBinding.rootPath,['commit','-m','Complete second obligation']);
 const revision=git(secondSwarmWorkerBinding.rootPath,['rev-parse','HEAD']);const base=secondTaskSwarmQueueTaskV1.claim.base;
 fs.mkdirSync(path.join(secondSwarmWorkerBinding.rootPath,'state'),{recursive:true});
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/review.json'),JSON.stringify({schemaVersion:1,reviewer:'independent-host-reviewer',base,revision,accepted:true}));
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/output.txt'),'focused proof passed');
 const proofObligationEvidence:ObligationEvidence={command:'fixture focused',selection:['focused'],target:{identity:'local',profile:'fixture',verification:'work-2.txt'},revision,dirty:false,startedAt:'2026-10-16T00:00:00Z',completedAt:'2026-10-16T00:00:01Z',outcome:'pass',skips:0,failures:0,inputs:[{path:'work-2.txt',digest:inputDigest(secondSwarmWorkerBinding.rootPath,'work-2.txt')},{path:'state/output.txt',digest:inputDigest(secondSwarmWorkerBinding.rootPath,'state/output.txt')}],outputPath:'state/output.txt',finalization:'pass'};
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/proof.json'),JSON.stringify(proofObligationEvidence));
 const swarmQueueCandidateV1:SwarmQueueCandidateV1={base,revision,reviewer:'independent-host-reviewer',verdictPath:'state/review.json',proofPaths:['state/proof.json']};
 const integrationSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:secondActorSwarmQueueActorV1,command:'handoff',taskId:'two',generation:secondTaskSwarmQueueTaskV1.claim.generation,requestId:'integrate-two',kind:'integration',detail:'Ready for exact candidate integration',evidencePaths:[],candidate: swarmQueueCandidateV1};
 await assert.rejects(swarmQueueStore.execute({...integrationSwarmQueueCommandV1,candidate:{...swarmQueueCandidateV1,base:revision}},secondSwarmWorkerBinding.rootPath),/claim base/);
 const wrongTargetObligationEvidence:ObligationEvidence={...proofObligationEvidence,target:{...proofObligationEvidence.target,identity:'wrong'}};const wrongSelectionObligationEvidence:ObligationEvidence={...proofObligationEvidence,selection:['unrelated']};
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/wrong-target.json'),JSON.stringify(wrongTargetObligationEvidence));fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/wrong-selection.json'),JSON.stringify(wrongSelectionObligationEvidence));
 await assert.rejects(swarmQueueStore.execute({...integrationSwarmQueueCommandV1,candidate:{...swarmQueueCandidateV1,proofPaths:['state/wrong-target.json','state/wrong-selection.json']}},secondSwarmWorkerBinding.rootPath),/selections/);
 const submittedSwarmQueueResultV1=await swarmQueueStore.execute(integrationSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath);assert.equal(submittedSwarmQueueResultV1.task?.state,'integration');
 fs.writeFileSync(path.join(secondSwarmWorkerBinding.rootPath,'state/review.json'),'overwritten');assert.ok(submittedSwarmQueueResultV1.request?.artifacts.some(valueSwarmQueueArtifactV1=>Buffer.from(valueSwarmQueueArtifactV1.contentBase64,'base64').toString().includes('independent-host-reviewer')));
 const more=await Promise.all([swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),swarmQueueStore.execute(secondClaimSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath)]);
 assert.equal(more[0]?.task?.id,'four');assert.equal(more[1]?.task?.id,'three');assert.equal(fs.readFileSync(path.join(firstSwarmWorkerBinding.rootPath,'work-1.txt'),'utf8'),'unfinished preserved\n');
 const takeSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'take'};
 assert.equal((await swarmQueueStore.execute(takeSwarmQueueCommandV1,root)).request?.id,'help-one');assert.equal((await swarmQueueStore.execute(takeSwarmQueueCommandV1,root)).request?.id,'integrate-two');
 const resolveSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'resolve',requestId:'help-one',response:'Prerequisite now available',outcome:'answered'};
 assert.equal((await swarmQueueStore.execute(resolveSwarmQueueCommandV1,root)).queue.tasks.find(valueSwarmQueueTaskV1=>valueSwarmQueueTaskV1.id==='one')?.state,'ready');await swarmQueueStore.execute(resolveSwarmQueueCommandV1,root);
 await assert.rejects(swarmQueueStore.execute({...resolveSwarmQueueCommandV1,outcome:'retry'},root),/differently/);
 await assert.rejects(swarmStore.prepareWorkerRemoval(root,firstSwarmWorkerBinding.sessionId,firstSwarmWorkerBinding.generation),/unfinished queue/);
 await assert.rejects(swarmStore.clear(root),/unfinished queue/);
 await assert.rejects(swarmQueueStore.execute({...resolveSwarmQueueCommandV1,requestId:'integrate-two',outcome:'accepted'},root),/host-collected/);
 // A worker can add already-canonical work with no coordinator response.
 const fifthSwarmQueueTaskInputV1:SwarmQueueTaskInputV1={id:'five',title:'Discovered canonical work',obligationIds:['OBL-5'],preferredWorker:null,context:['backend']};
 const discoveredSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={id:'discovery-five',kind:'work',actor:firstActorSwarmQueueActorV1,tasks:[fifthSwarmQueueTaskInputV1],updates:[
  {path:'pm/requirements/pilot.md',beforeContent:fs.readFileSync(path.join(root,'pm/requirements/pilot.md'),'utf8'),content:fs.readFileSync(path.join(root,'pm/requirements/pilot.md'),'utf8')},
  {path:'pm/uat/discovered.md',beforeContent:null,content:'# Pilot acceptance REQ-PILOT\n'},
  {path:'pm/plans/in_progress/pilot/discovered.md',beforeContent:null,content:'# Register existing OBL-5\n'}]};
 const discoverSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:firstActorSwarmQueueActorV1,command:'discover',discovery:discoveredSwarmQueueDiscoveryV1};
 const registeredSwarmQueueResultV1=await swarmQueueStore.execute(discoverSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);assert.equal(registeredSwarmQueueResultV1.queue.tasks.some(valueSwarmQueueTaskV1=>valueSwarmQueueTaskV1.id==='five'),true);await swarmQueueStore.execute(discoverSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:{...discoveredSwarmQueueDiscoveryV1,id:'stale-discovery'}},firstSwarmWorkerBinding.rootPath),/stale document/);
 const invalidSwarmQueueCommandV1:SwarmQueueCommandV1={...discoverSwarmQueueCommandV1,discovery:{...discoveredSwarmQueueDiscoveryV1,id:'escape',updates:discoveredSwarmQueueDiscoveryV1.updates.map(valueSwarmQueueDocumentUpdateV1=>({...valueSwarmQueueDocumentUpdateV1,path:'../outside'}))}};
 await assert.rejects(swarmQueueStore.execute(invalidSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),/safe repository-relative/);
 // Register a genuinely new canonical obligation during execution.
 const beforeDocument=fs.readFileSync(path.join(root,obligationFixture.documentPath),'utf8');
 const firstObligation=obligationDocumentV1.obligations[0];assert.ok(firstObligation);
 const extendedObligationDocumentV1:ObligationDocumentV1={...obligationDocumentV1,baselines:obligationDocumentV1.baselines.map(baselineObligationBaseline=>({...baselineObligationBaseline,obligationIds:[...baselineObligationBaseline.obligationIds,'OBL-7']})),
  obligations:[...obligationDocumentV1.obligations,{...firstObligation,id:'OBL-7',responsibilityId:'new-runtime-condition',condition:'A newly discovered runtime condition is verified',execution:{...firstObligation.execution,plannedPaths:['new-runtime.txt']}}],
  checkpoints:[...obligationDocumentV1.checkpoints,{id:'CP2',predecessorId:obligationDocumentV1.checkpoints.at(-1)?.id??null,baselineId:'B1',kind:'disturbance',selectedIds:[],registeredIds:['OBL-7'],certificateIds:[],invalidatedIds:[],before:[1,1,1,1,1,1],after:[2,1,1,1,1,1],preparation:null,reason:'Discovered missing runtime condition',assessor:'coordinator'}]};
 const seventhSwarmQueueTaskInputV1:SwarmQueueTaskInputV1={id:'seven',title:'New runtime condition',obligationIds:['OBL-7'],preferredWorker:null,context:['runtime']};
 const newDiscoverySwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={id:'discovery-seven',kind:'bug',actor:firstActorSwarmQueueActorV1,tasks:[seventhSwarmQueueTaskInputV1],updates:[
  discoveredSwarmQueueDiscoveryV1.updates[0]??{path:'invalid',beforeContent:null,content:''},
  {path:'pm/uat/runtime.md',beforeContent:null,content:'# REQ-PILOT runtime acceptance'},
  {path:'pm/bugs/in_progress/runtime.md',beforeContent:null,content:'# Missing runtime proof: REQ-PILOT'},
  {path:'pm/plans/in_progress/pilot/runtime.md',beforeContent:null,content:'# OBL-7 runtime condition'},
  {path:obligationFixture.documentPath,beforeContent:beforeDocument,content:JSON.stringify(extendedObligationDocumentV1)}]};
 const invalidExtendedObligationDocumentV1:ObligationDocumentV1={...extendedObligationDocumentV1,checkpoints:[...obligationDocumentV1.checkpoints,{...extendedObligationDocumentV1.checkpoints[1],id:'INVALID',predecessorId:'wrong',baselineId:'B1',kind:'disturbance',selectedIds:[],registeredIds:['OBL-7'],certificateIds:[],invalidatedIds:[],before:[1,1,1,1,1,1],after:[2,1,1,1,1,1],preparation:null,reason:'invalid predecessor',assessor:'coordinator'}]};
 const invalidDiscoverySwarmQueueCommandV1:SwarmQueueCommandV1={...discoverSwarmQueueCommandV1,discovery:{...newDiscoverySwarmQueueDiscoveryV1,id:'invalid-checkpoint',updates:newDiscoverySwarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===obligationFixture.documentPath?{...updateSwarmQueueDocumentUpdateV1,content:JSON.stringify(invalidExtendedObligationDocumentV1)}:updateSwarmQueueDocumentUpdateV1)}};
 await assert.rejects(swarmQueueStore.execute(invalidDiscoverySwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),/checkpoint|predecessor/);
 assert.equal(fs.readFileSync(path.join(root,obligationFixture.documentPath),'utf8'),beforeDocument);assert.equal((await swarmQueueStore.inspect('pilot')).pending,null);
 const rename=fs.renameSync;let renamed=0;
 const failing=testContext.mock.method(fs,'renameSync',(...args:Parameters<typeof fs.renameSync>):void=>{if(++renamed===2)throw new Error('injected publication interruption');rename(...args);});
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:{...newDiscoverySwarmQueueDiscoveryV1,id:'duplicate-seven',tasks:[seventhSwarmQueueTaskInputV1,{...seventhSwarmQueueTaskInputV1,id:'also-seven'}]}},firstSwarmWorkerBinding.rootPath),/already has queued/);
 const publishSwarmQueueCommandV1:SwarmQueueCommandV1={...discoverSwarmQueueCommandV1,discovery:newDiscoverySwarmQueueDiscoveryV1};await assert.rejects(swarmQueueStore.execute(publishSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),/injected/);failing.mock.restore();
 assert.equal((await swarmQueueStore.inspect('pilot')).pending?.id,'discovery-seven');await assert.rejects(swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath),/pending discovery/);
 const recoverSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:secondActorSwarmQueueActorV1,command:'recover',discoveryId:'discovery-seven'};
 const recoveredSwarmQueueResultV1=await swarmQueueStore.execute(recoverSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath);assert.equal(recoveredSwarmQueueResultV1.queue.pending,null);assert.ok(recoveredSwarmQueueResultV1.queue.tasks.some(swarmQueueTaskV1=>swarmQueueTaskV1.id==='seven'));await swarmQueueStore.execute(recoverSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath);
 // A failed inverse rename preserves complete bytes and remains safely abortable.
 const oldUat=fs.readFileSync(path.join(root,'pm/uat/runtime.md'),'utf8');const oldPlan=fs.readFileSync(path.join(root,'pm/plans/in_progress/pilot/runtime.md'),'utf8');
 const sixthSwarmQueueTaskInputV1:SwarmQueueTaskInputV1={id:'six',title:'Last inventory work',obligationIds:['OBL-6'],preferredWorker:null,context:['runtime']};
 const abortableSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={id:'abort-six',kind:'work',actor:firstActorSwarmQueueActorV1,tasks:[sixthSwarmQueueTaskInputV1],updates:[discoveredSwarmQueueDiscoveryV1.updates[0]??{path:'invalid',beforeContent:null,content:''},
  {path:'pm/uat/runtime.md',beforeContent:oldUat,content:oldUat+'\nAdditional REQ-PILOT proof'},
  {path:'pm/plans/in_progress/pilot/runtime.md',beforeContent:oldPlan,content:oldPlan+'\nAdditional OBL-6 work'}]};
 renamed=0;const partial=testContext.mock.method(fs,'renameSync',(...args:Parameters<typeof fs.renameSync>):void=>{if(++renamed===2)throw new Error('second interruption');rename(...args);});
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:abortableSwarmQueueDiscoveryV1},firstSwarmWorkerBinding.rootPath),/interruption/);partial.mock.restore();
 const abortSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:secondActorSwarmQueueActorV1,command:'abort-discovery',discoveryId:'abort-six'};
 const interruptedAbort=testContext.mock.method(fs,'renameSync',():void=>{throw new Error('abort interruption');});await assert.rejects(swarmQueueStore.execute(abortSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath),/abort interruption/);interruptedAbort.mock.restore();
 assert.equal(fs.readFileSync(path.join(root,'pm/uat/runtime.md'),'utf8'),oldUat+'\nAdditional REQ-PILOT proof');await swarmQueueStore.execute(abortSwarmQueueCommandV1,secondSwarmWorkerBinding.rootPath);
 assert.equal(fs.readFileSync(path.join(root,'pm/uat/runtime.md'),'utf8'),oldUat);assert.equal((await swarmQueueStore.inspect('pilot')).pending,null);
 // Rebase synchronization is self-service and retains its original frozen claim.
 git(root,['add','pm']);git(root,['commit','-m','Register discovered queue obligations']);const advanced=git(root,['rev-parse','HEAD']);const currentSwarmQueueTaskV1=more[0]?.task;assert.ok(currentSwarmQueueTaskV1?.claim);
 const refreshSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:firstActorSwarmQueueActorV1,command:'refresh-base',taskId:currentSwarmQueueTaskV1.id,generation:currentSwarmQueueTaskV1.claim.generation,base:advanced};
 const refreshedSwarmQueueResultV1=await swarmQueueStore.execute(refreshSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);assert.equal(refreshedSwarmQueueResultV1.task?.claim?.base,advanced);assert.equal(refreshedSwarmQueueResultV1.task?.claimHistory.at(-1)?.generation,currentSwarmQueueTaskV1.claim.generation);
 // Prospective reclaimed paths must be checked against another worker's live reservation.
 const refreshedTaskSwarmQueueTaskV1=refreshedSwarmQueueResultV1.task;assert.ok(refreshedTaskSwarmQueueTaskV1?.claim);
 await swarmQueueStore.execute({...helpSwarmQueueCommandV1,taskId:refreshedTaskSwarmQueueTaskV1.id,generation:refreshedTaskSwarmQueueTaskV1.claim.generation,requestId:'help-four'},firstSwarmWorkerBinding.rootPath);
 const oldHistory=fs.readFileSync(path.join(root,bindingsPath),'utf8');const originalFirstObligation=obligationDocumentV1.obligations[0];assert.ok(originalFirstObligation);
 const amendment={schemaVersion:1,scopeId:'pilot',revisions:[{id:'BIND-1',obligationId:'OBL-1',predecessorId:null,baselineId:'B1',assessor:'coordinator',authority:['approved-CHNG'],reason:'Necessary shared repair',dependsOn:[],execution:{...originalFirstObligation.execution,plannedPaths:['work-1.txt','work-3.txt']}}]};
 const firstInputSwarmQueueTaskInputV1=queued[0];assert.ok(firstInputSwarmQueueTaskInputV1);
 const amendSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={id:'amend-parked',kind:'work',actor:firstActorSwarmQueueActorV1,tasks:[firstInputSwarmQueueTaskInputV1],updates:[discoveredSwarmQueueDiscoveryV1.updates[0]??{path:'invalid',beforeContent:null,content:''},
  {path:'pm/uat/shared.md',beforeContent:null,content:'# REQ-PILOT shared repair'},
  {path:'pm/plans/in_progress/pilot/shared.md',beforeContent:null,content:'# OBL-1 scope repair'},
  {path:bindingsPath,beforeContent:oldHistory,content:JSON.stringify(amendment)}]};
 await swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:amendSwarmQueueDiscoveryV1},firstSwarmWorkerBinding.rootPath);const afterAmendSwarmQueueResultV1=await swarmQueueStore.execute(firstClaimSwarmQueueCommandV1,firstSwarmWorkerBinding.rootPath);
 assert.notEqual(afterAmendSwarmQueueResultV1.task?.id,'one','reclaim cannot overlap worker two current work-3.txt reservation');
 const overlapSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={...abortableSwarmQueueDiscoveryV1,id:'overlapping-documents',updates:[...abortableSwarmQueueDiscoveryV1.updates,{path:'pm/uat/runtime.md/child.md',beforeContent:null,content:'invalid child'}]};
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:overlapSwarmQueueDiscoveryV1},firstSwarmWorkerBinding.rootPath),/ancestor|descendant/);
 fs.symlinkSync(path.join(root,'pm/uat'),path.join(root,'pm/uat/link'));
 const linkedSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={...abortableSwarmQueueDiscoveryV1,id:'linked-documents',updates:abortableSwarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path==='pm/uat/runtime.md'?{path:'pm/uat/link/new.md',beforeContent:null,content:'REQ-PILOT'}:updateSwarmQueueDocumentUpdateV1)};
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:linkedSwarmQueueDiscoveryV1},firstSwarmWorkerBinding.rootPath),/symlink/);fs.unlinkSync(path.join(root,'pm/uat/link'));
 const statusSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:firstActorSwarmQueueActorV1,command:'status'};
 const requestPath=path.join(firstSwarmWorkerBinding.rootPath,'state','status.json');fs.mkdirSync(path.dirname(requestPath),{recursive:true});fs.writeFileSync(requestPath,JSON.stringify(statusSwarmQueueCommandV1));
 const result=spawnSync('node',[path.join(process.cwd(),'dist/src/swarm-info.js'),'queue','status','--request','@'+requestPath],{cwd:firstSwarmWorkerBinding.rootPath,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).queue.campaignId,'pilot');
 const completeSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'complete'};await assert.rejects(swarmQueueStore.execute(completeSwarmQueueCommandV1,root),/outstanding/);
});

// Traceability: verifies REQ-SWARM-QUEUES
test('inspection-only gate discharges with reviewed canonical source evidence and no invented execution receipt',async testContext=>{
 const obligationFixture=fixture(testContext);const root=obligationFixture.root;const pool=new Pool(databaseOptions(process.cwd()));const projectId=crypto.randomUUID();
 testContext.after(async()=>{try{await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}finally{await pool.end();}});
 fs.appendFileSync(path.join(root,'.gitignore'),'managed/\nsession_id.txt\n');
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},maxActiveWorkers:1,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(root,'pm/requirements'),{recursive:true});fs.copyFileSync(path.join(root,'requirement.md'),path.join(root,'pm/requirements/pilot.md'));
 const firstObligation=obligationFixture.document.obligations[0];assert.ok(firstObligation);
 const obligationDocumentV1:ObligationDocumentV1={...obligationFixture.document,baselines:obligationFixture.document.baselines.map(obligationBaseline=>({...obligationBaseline,requirements:obligationBaseline.requirements.map(obligationRequirement=>({...obligationRequirement,path:'pm/requirements/pilot.md'})),obligationIds:[...obligationBaseline.obligationIds,'OBL-7']})),obligations:[...obligationFixture.document.obligations,{...firstObligation,id:'OBL-7',category:'gate',requirementIds:[]}],checkpoints:obligationFixture.document.checkpoints.map(obligationCheckpoint=>({...obligationCheckpoint,registeredIds:[...obligationCheckpoint.registeredIds,'OBL-7']}))};
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(obligationDocumentV1));
 fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));git(root,['add','.']);git(root,['commit','-m','Inspection queue fixture']);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`inspection-${projectId}`]);
 const swarmStore=new SwarmStore(pool,projectId);await swarmStore.enrollOwner({rootPath:root,gitCommonDirectory:git(root,['rev-parse','--path-format=absolute','--git-common-dir'])});
 const sessionId=`inspection-${projectId}`;await swarmStore.bindCoordinator(root,{sessionId:'coordinator',threadId:`coordinator-${projectId}`,rootPath:root});
 const workerRoot=path.join(root,'managed/101');git(root,['worktree','add','-q','-b','inspection-worker',workerRoot]);
 const swarmWorktreeMembership=await swarmStore.enrollWorktree(root,workerRoot);const swarmWorkerBinding=await swarmStore.bindWorker(swarmWorktreeMembership,{sessionId,threadId:`thread-${sessionId}`,rootPath:workerRoot},{kind:'plan',id:'pilot',summary:'Assess source inventory'});
 fs.writeFileSync(path.join(workerRoot,'session_id.txt'),sessionId+'\n');
 const coordinatorSwarmQueueActorV1:SwarmQueueActorV1={kind:'coordinator',sessionId:'coordinator'};const workerSwarmQueueActorV1:SwarmQueueActorV1={kind:'worker',sessionId,generation:swarmWorkerBinding.generation};
 const swarmQueueStore=new SwarmQueueStore(pool,projectId,root);
 const initSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'init',documentPath:obligationFixture.documentPath,bindingsPath:null,authority:['approved-CHNG'],assessor:'coordinator',recordRoots:{requirements:'pm/requirements',uat:'pm/uat',issues:'pm/bugs',plans:'pm/plans'}};
 await swarmQueueStore.execute(initSwarmQueueCommandV1,root);
 const swarmQueueTaskInputV1:SwarmQueueTaskInputV1={id:'inventory',title:'Assess finite T1 inventory',obligationIds:['OBL-7'],preferredWorker:sessionId,context:['source']};
 const requirementSwarmQueueTaskInputV1:SwarmQueueTaskInputV1={id:'requirements',title:'Existing requirement-backed work',obligationIds:['OBL-2'],preferredWorker:null,context:['source']};
 const addSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:workerSwarmQueueActorV1,command:'add',tasks:[swarmQueueTaskInputV1,requirementSwarmQueueTaskInputV1]};await swarmQueueStore.execute(addSwarmQueueCommandV1,workerRoot);
 const claimSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:workerSwarmQueueActorV1,command:'claim'};
 const claimedSwarmQueueResultV1=await swarmQueueStore.execute(claimSwarmQueueCommandV1,workerRoot);const swarmQueueTaskV1=claimedSwarmQueueResultV1.task;assert.ok(swarmQueueTaskV1?.claim);
 fs.mkdirSync(path.join(workerRoot,'state'),{recursive:true});fs.writeFileSync(path.join(workerRoot,'state/assessment.txt'),'Finite T1 scope inspected at exact source revision; no omitted noninventory responsibilities. No test execution claimed.');
 const revision=git(workerRoot,['rev-parse','HEAD']);
 const swarmQueueVerdictV1:SwarmQueueVerdictV1={schemaVersion:1,reviewer:'fixture-independent-assessor',base:revision,revision,accepted:true};fs.writeFileSync(path.join(workerRoot,'state/review.json'),JSON.stringify(swarmQueueVerdictV1));
 const swarmQueueCandidateV1:SwarmQueueCandidateV1={base:revision,revision,reviewer:swarmQueueVerdictV1.reviewer,verdictPath:'state/review.json',proofPaths:[]};
 const handoffSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:workerSwarmQueueActorV1,command:'handoff',taskId:swarmQueueTaskV1.id,generation:swarmQueueTaskV1.claim.generation,requestId:'assessment',kind:'integration',detail:'Reviewed finite inventory assessment',evidencePaths:[],candidate:swarmQueueCandidateV1};
 await assert.rejects(swarmQueueStore.execute(handoffSwarmQueueCommandV1,workerRoot),/assessment artifact/);
 await swarmQueueStore.execute({...handoffSwarmQueueCommandV1,evidencePaths:['state/assessment.txt']},workerRoot);
 const takeSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'take'};await swarmQueueStore.execute(takeSwarmQueueCommandV1,root);
 fs.mkdirSync(path.join(root,'state'),{recursive:true});fs.copyFileSync(path.join(workerRoot,'state/assessment.txt'),path.join(root,'state/assessment.txt'));fs.writeFileSync(path.join(root,'state/host-review.txt'),'Controlled host review fixture: independently accepted exact source assessment and candidate identity.');
 const reviewSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'record-review',taskId:swarmQueueTaskV1.id,generation:swarmQueueTaskV1.claim.generation,reviewer:swarmQueueVerdictV1.reviewer,hostEvidencePath:'state/host-review.txt'};await swarmQueueStore.execute(reviewSwarmQueueCommandV1,root);
 const obligationCertificate:ObligationCertificate={id:'CERT-inspection',obligationIds:['OBL-7'],inputs:{schemaVersion:2,revision,paths:['requirement.md','src.txt']},artifacts:['pm/plans/in_progress/pilot/assessment.txt'],assessor:'coordinator',authority:['approved-CHNG'],adequate:true,reason:'Independent finite inventory assessment',disposition:null,evidence:[],inventoryIds:[]};
 const candidateObligationDocumentV1:ObligationDocumentV1={...obligationDocumentV1,certificates:[obligationCertificate],checkpoints:[...obligationDocumentV1.checkpoints,{id:'CP2',predecessorId:'CP1',baselineId:'B1',kind:'neutral',selectedIds:['OBL-7'],registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:[1,1,1,1,1,1],after:[1,1,1,1,1,1],preparation:{obligationId:'OBL-7',operations:['inspect'],deliverable:'Finite gate assessment'},reason:'Reviewed source inventory complete',assessor:'coordinator'}]};
 const swarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={id:'assess-existing',kind:'work',actor:coordinatorSwarmQueueActorV1,tasks:[],updates:[
  {path:obligationFixture.documentPath,beforeContent:fs.readFileSync(path.join(root,obligationFixture.documentPath),'utf8'),content:JSON.stringify(candidateObligationDocumentV1)},
  {path:'pm/plans/in_progress/pilot/assessment.txt',beforeContent:null,content:fs.readFileSync(path.join(workerRoot,'state/assessment.txt'),'utf8')}]};
 const discoverSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'discover',discovery:swarmQueueDiscoveryV1};
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,actor:workerSwarmQueueActorV1,discovery:{...swarmQueueDiscoveryV1,actor:workerSwarmQueueActorV1}},workerRoot),/requires coordinator/);
 const workerSwarmQueueDiscoveryV1:SwarmQueueDiscoveryV1={...swarmQueueDiscoveryV1,actor:workerSwarmQueueActorV1,tasks:[requirementSwarmQueueTaskInputV1],updates:[...swarmQueueDiscoveryV1.updates,
  {path:'pm/requirements/pilot.md',beforeContent:fs.readFileSync(path.join(root,'pm/requirements/pilot.md'),'utf8'),content:fs.readFileSync(path.join(root,'pm/requirements/pilot.md'),'utf8')},
  {path:'pm/uat/pilot.md',beforeContent:null,content:'# REQ-PILOT accepted behavior'}]};
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,actor:workerSwarmQueueActorV1,discovery:workerSwarmQueueDiscoveryV1},workerRoot),/requires coordinator/,'an identical existing task cannot bypass assessment authority');
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:{...swarmQueueDiscoveryV1,updates:[...swarmQueueDiscoveryV1.updates,{path:'pm/requirements/unrelated.md',beforeContent:null,content:'Unrelated edit'}]}},root),/assessment updates/);
 const firstSwarmQueueDocumentUpdateV1=swarmQueueDiscoveryV1.updates[0];assert.ok(firstSwarmQueueDocumentUpdateV1);
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:{...swarmQueueDiscoveryV1,updates:swarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===obligationFixture.documentPath?{...firstSwarmQueueDocumentUpdateV1,content:JSON.stringify({...candidateObligationDocumentV1,obligations:[...candidateObligationDocumentV1.obligations,{...firstObligation,id:'OBL-8'}]})}:updateSwarmQueueDocumentUpdateV1)}},root),/scope|baseline|obligation/i);
 assert.equal((await swarmQueueStore.inspect('pilot')).pending,null,'invalid assessment cannot leave publication intent');
 assert.equal(fs.existsSync(path.join(root,'pm/plans/in_progress/pilot/assessment.txt')),false,'preflight must not publish evidence');
 await swarmQueueStore.execute(discoverSwarmQueueCommandV1,root);
 await swarmQueueStore.execute(discoverSwarmQueueCommandV1,root);
 const acceptedObligationDocumentV1=parseObligationDocument(fs.readFileSync(path.join(root,obligationFixture.documentPath),'utf8'));
 assert.equal(git(root,['rev-parse','HEAD']),revision,'canonical assessment requires no acceptance-only source commit');
 assert.equal((await swarmQueueStore.inspect('pilot')).tasks.length,2,'assessment must not invent another task');
 const invalidatedObligationDocumentV1=acceptCheckpoint(acceptedObligationDocumentV1,{...acceptedObligationDocumentV1,checkpoints:[...acceptedObligationDocumentV1.checkpoints,{id:'CP3',predecessorId:'CP2',baselineId:'B1',kind:'disturbance',selectedIds:[],registeredIds:[],certificateIds:[],invalidatedIds:[obligationCertificate.id],before:[1,1,1,1,1,1],after:[1,1,1,1,1,1],preparation:null,reason:'Retest assessment after explicit invalidation',assessor:'coordinator'}]},root);
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(invalidatedObligationDocumentV1));
 const reassessedObligationDocumentV1:ObligationDocumentV1={...invalidatedObligationDocumentV1,checkpoints:[...invalidatedObligationDocumentV1.checkpoints,{id:'CP4',predecessorId:'CP3',baselineId:'B1',kind:'neutral',selectedIds:['OBL-7'],registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:[1,1,1,1,1,1],after:[1,1,1,1,1,1],preparation:{obligationId:'OBL-7',operations:['inspect'],deliverable:'Source reassessment after explicit invalidation'},reason:'Fresh existing assessment reaccepted',assessor:'coordinator'}]};
 const reassessmentSwarmQueueDocumentUpdateV1={path:obligationFixture.documentPath,beforeContent:JSON.stringify(invalidatedObligationDocumentV1),content:JSON.stringify(reassessedObligationDocumentV1)};
 await assert.rejects(swarmQueueStore.execute({...discoverSwarmQueueCommandV1,actor:workerSwarmQueueActorV1,discovery:{...workerSwarmQueueDiscoveryV1,id:'worker-reaccept',updates:[reassessmentSwarmQueueDocumentUpdateV1,...workerSwarmQueueDiscoveryV1.updates.filter(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith('pm/requirements/')||updateSwarmQueueDocumentUpdateV1.path.startsWith('pm/uat/'))]}},workerRoot),/requires coordinator/,'existing certificate reacceptance requires coordinator despite unchanged certificate count');
 await swarmQueueStore.execute({...discoverSwarmQueueCommandV1,discovery:{...swarmQueueDiscoveryV1,id:'reaccept-existing',updates:[reassessmentSwarmQueueDocumentUpdateV1]}},root);
 const resolveSwarmQueueCommandV1:SwarmQueueCommandV1={schemaVersion:1,campaignId:'pilot',actor:coordinatorSwarmQueueActorV1,command:'resolve',requestId:'assessment',response:'Canonical finite source inventory accepted',outcome:'accepted'};
 assert.equal((await swarmQueueStore.execute(resolveSwarmQueueCommandV1,root)).queue.tasks[0]?.state,'done');assert.deepEqual(acceptedObligationDocumentV1.certificates[0]?.evidence,[]);
});
