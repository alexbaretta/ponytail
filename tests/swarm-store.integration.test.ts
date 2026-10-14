// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {SwarmStore,swarmWorkerName,type SwarmWorkerAssignment} from '../src/swarm-store.js';
import type {SwarmUserWorktree} from '../src/swarm-owner.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';
import {RollingCodex,RollingUnknownOutcome,type RollingNativeThreadIdentity} from '../src/rolling-codex.js';
import {bindSwarmCoordinator,bindSwarmWorker,inspectSwarmInfo} from '../src/swarm-info.js';
function coordinatorIdentity(rootPath:string,sessionId:string):RollingNativeThreadIdentity {
 return {rootPath,sessionId,threadId:`thread-${sessionId}`};
}

// Traceability: verifies REQ-SWARM-OWNERSHIP
test('concurrent coordinator bindings are exclusive and release preserves campaign workers',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-store-')));
 const mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const pool=new Pool(databaseOptions(repositoryRoot));const projectId=crypto.randomUUID();
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--allow-empty','-qm','fixture']);
 const otherRoot=path.join(root,'other'),managedRoot=path.join(root,'managed/101'),retainedRoot=path.join(root,'managed/102');
 git(['worktree','add','-q','-b','other',otherRoot]);git(['worktree','add','-q','-b','worker',managedRoot]);
 git(['worktree','add','-q','-b','retained',retainedRoot]);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.dirname(managedRoot),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 for(const checkout of [mainRoot,otherRoot,managedRoot,retainedRoot]) {
  fs.mkdirSync(path.join(checkout,'.agents/config/project'),{recursive:true});
  fs.writeFileSync(path.join(checkout,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 }
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 const swarmUserWorktree:SwarmUserWorktree={rootPath:mainRoot,gitCommonDirectory};
 const otherSwarmUserWorktree:SwarmUserWorktree={rootPath:otherRoot,gitCommonDirectory};
 const managedSwarmUserWorktree:SwarmUserWorktree={rootPath:managedRoot,gitCommonDirectory};
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-${projectId}`]);
 const swarmStore=new SwarmStore(pool,projectId);
 const retainedSwarmUserWorktree:SwarmUserWorktree={rootPath:retainedRoot,gitCommonDirectory};
 await assert.rejects(swarmStore.enrollOwner(retainedSwarmUserWorktree),/managed checkout/);
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,path.dirname(managedRoot)]);
 await pool.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,101,$2,'ACTIVE')",[projectId,managedRoot]);
 await pool.query(`INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text)
  VALUES($1,'fixture',$2,'plan.json','bindings.json',$3,'{"schemaVersion":3}')`,[projectId,mainRoot,'a'.repeat(64)]);
 const assignmentId=crypto.randomUUID();
 await pool.query(`INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,session_id,scope_text)
  VALUES($1,'fixture',$2,'OBL-1',101,$3,'WORKING','worker-session','{"schemaVersion":3}')`,[projectId,assignmentId,crypto.randomUUID()]);
 assert.equal((await swarmStore.enrollOwner(swarmUserWorktree)).sessionId,null);
 assert.deepEqual(await swarmStore.enrollOwner(swarmUserWorktree),await swarmStore.coordinatorBinding(mainRoot));
 await swarmStore.enrollOwner(otherSwarmUserWorktree);
 assert.deepEqual((await inspectSwarmInfo(otherRoot,pool,projectId)).coordinator,{kind:'unbound'});
 const nativeThreadId=`thread-${projectId}`,nativeSessionId=`session-${projectId}`;
 const rollingCodex=await RollingCodex.connect({executable:'env',argv:[`ROLLING_NATIVE_FIXTURE_ID=${projectId}`,process.execPath,path.join(__dirname,'fixtures/rolling-codex-server.js')]});
 try {
  await rollingCodex.startThread(otherRoot);
  await rollingCodex.request('fixture-observer-only',{});
  await assert.rejects(bindSwarmCoordinator(swarmStore,otherSwarmUserWorktree,nativeSessionId,nativeSessionId,rollingCodex),/no rollout found/);
  await assert.rejects(bindSwarmCoordinator(swarmStore,otherSwarmUserWorktree,nativeThreadId,'foreign-session',rollingCodex),/differs from requested/);
  assert.equal((await swarmStore.coordinatorBinding(otherRoot))?.sessionId,null);
  await bindSwarmCoordinator(swarmStore,otherSwarmUserWorktree,nativeThreadId,nativeSessionId,rollingCodex);
  assert.deepEqual((await inspectSwarmInfo(otherRoot,pool,projectId)).coordinator,{kind:'bound',sessionId:nativeSessionId,threadId:nativeThreadId});
  await swarmStore.unbindCoordinator(otherRoot,nativeSessionId);
 } finally {await rollingCodex.close();}
 await assert.rejects(swarmStore.enrollOwner(managedSwarmUserWorktree),/managed checkout/);
 const candidates=['coordinator-one','coordinator-two'];
 const results=await Promise.allSettled(candidates.map(sessionId=>swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,sessionId))));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 const swarmCoordinatorBinding=await swarmStore.coordinatorBinding(mainRoot);assert.ok(swarmCoordinatorBinding?.sessionId);
 const sessionId=swarmCoordinatorBinding.sessionId;
 assert.deepEqual(await swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,sessionId)),swarmCoordinatorBinding);
 await assert.rejects(swarmStore.bindCoordinator(otherRoot,coordinatorIdentity(otherRoot,sessionId)),/original checkout changed/);
 assert.equal((await swarmStore.bindCoordinator(otherRoot,coordinatorIdentity(otherRoot,'independent-coordinator'))).sessionId,'independent-coordinator');
 await assert.rejects(swarmStore.unbindCoordinator(mainRoot,'stale-coordinator'),/binding changed/);
 assert.equal((await swarmStore.unbindCoordinator(mainRoot,sessionId)).sessionId,null);
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state,session_id FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1',[assignmentId])).rows[0]?.session_id,'worker-session');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1',[projectId])).rows[0]?.state,'ACTIVE');
 assert.equal((await swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,'successor'))).sessionId,'successor');
 assert.equal((await swarmStore.coordinatorBinding(otherRoot))?.sessionId,'independent-coordinator');
 await assert.rejects(swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,' ')),/nonempty/);
 const movedRoot=path.join(root,'temporarily-moved');fs.renameSync(mainRoot,movedRoot);
 try {
  await assert.rejects(swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,'successor')),/ENOENT/);
  const foreignRoot=path.join(root,'foreign');fs.mkdirSync(foreignRoot);
  execFileSync('git',['-C',foreignRoot,'init','-q','-b','replacement']);
  execFileSync('git',['-C',foreignRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--allow-empty','-qm','foreign']);
  execFileSync('git',['-C',foreignRoot,'worktree','add','-q','-b','replacement-worker',mainRoot]);
  await assert.rejects(swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,'successor')),/canonical physical Git checkout/);
 } finally {fs.rmSync(mainRoot,{recursive:true,force:true});fs.renameSync(movedRoot,mainRoot);}
 assert.equal((await swarmStore.coordinatorBinding(mainRoot))?.sessionId,'successor');
});

// Traceability: verifies REQ-SWARM-SESSIONS
test('original worker identity and exclusive checkout binding survive coordinator loss',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-workers-'))),mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const projectId=crypto.randomUUID(),pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(argv:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...argv],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(mainRoot,'.gitignore'),'/session_id.txt\n');git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const otherRoot=path.join(root,'other');git(['worktree','add','-q','-b','other',otherRoot]);
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 const swarmStore=new SwarmStore(pool,projectId);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-workers-${projectId}`]);
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,path.join(root,'managed')]);
 for(const number of [101,102]) {
  const rootPath=path.join(root,'managed',String(number));git(['worktree','add','-q','-b',`worker-${number}`,rootPath]);
  await pool.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'AVAILABLE')",[projectId,number,rootPath]);
 }
 await swarmStore.enrollOwner({rootPath:mainRoot,gitCommonDirectory});await swarmStore.enrollOwner({rootPath:otherRoot,gitCommonDirectory});
 await swarmStore.bindCoordinator(mainRoot,coordinatorIdentity(mainRoot,'main-coordinator'));await swarmStore.bindCoordinator(otherRoot,coordinatorIdentity(otherRoot,'other-coordinator'));
 const mainSwarmWorktreeMembership=await swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),otherSwarmWorktreeMembership=await swarmStore.reserveWorktree(otherRoot,{kind:'retained'});
 assert.ok(mainSwarmWorktreeMembership&&otherSwarmWorktreeMembership);
 const swarmWorkerAssignment:SwarmWorkerAssignment={kind:'plan',id:'traceability-convergence',summary:'Inspect acceptance coverage'};
 const identities=['worker-one','worker-two'].map(sessionId=>coordinatorIdentity(mainSwarmWorktreeMembership.rootPath,sessionId));
 const results=await Promise.allSettled(identities.map(identity=>swarmStore.bindWorker(mainSwarmWorktreeMembership,identity,swarmWorkerAssignment)));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 const result=results.find(result=>result.status==='fulfilled');assert.ok(result&&result.status==='fulfilled');
 const swarmWorkerBinding=result.value;
 assert.equal(swarmWorkerBinding.workerNumber,1);assert.equal(swarmWorkerBinding.shortAssignmentNumber,1);
 assert.equal(swarmWorkerName(swarmWorkerBinding),'W1 P1 Inspect acceptance coverage');
 assert.equal(swarmWorkerName({...swarmWorkerBinding,completed:true}),'DONE W1 P1 Inspect acceptance coverage');
 await assert.rejects(swarmStore.bindWorker(mainSwarmWorktreeMembership,coordinatorIdentity(mainSwarmWorktreeMembership.rootPath,'invalid-summary'),{...swarmWorkerAssignment,summary:'Only two'}),/three word summary/);
 assert.deepEqual(await swarmStore.bindWorker(mainSwarmWorktreeMembership,{sessionId:swarmWorkerBinding.sessionId,threadId:swarmWorkerBinding.threadId,rootPath:swarmWorkerBinding.rootPath},swarmWorkerAssignment),swarmWorkerBinding);
 await assert.rejects(swarmStore.bindWorker(otherSwarmWorktreeMembership,{sessionId:swarmWorkerBinding.sessionId,threadId:swarmWorkerBinding.threadId,rootPath:otherSwarmWorktreeMembership.rootPath},swarmWorkerAssignment),/original|origin/);
 const otherSwarmWorkerBinding=await swarmStore.bindWorker(otherSwarmWorktreeMembership,coordinatorIdentity(otherSwarmWorktreeMembership.rootPath,'independent-worker'),{kind:'sprint',id:'S01',summary:'Inspect unit proofs'});
 assert.equal(swarmWorkerName(otherSwarmWorkerBinding),'W1 S1 Inspect unit proofs');
 const extraRoot=path.join(root,'managed/103');git(['worktree','add','-q','-b','worker-103',extraRoot]);
 await pool.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,103,$2,'AVAILABLE')",[projectId,extraRoot]);
 const extraSwarmWorktreeMembership=await swarmStore.reserveWorktree(mainRoot,{kind:'retained'});assert.ok(extraSwarmWorktreeMembership);
 const extraSwarmWorkerBinding=await swarmStore.bindWorker(extraSwarmWorktreeMembership,coordinatorIdentity(extraRoot,'same-plan-worker'),{...swarmWorkerAssignment,summary:'Inspect integration coverage'});
 assert.equal(swarmWorkerName(extraSwarmWorkerBinding),'W2 P1 Inspect integration coverage');
 await assert.rejects(bindSwarmWorker(swarmStore,mainSwarmWorktreeMembership,swarmWorkerBinding.threadId,swarmWorkerBinding.sessionId,swarmWorkerAssignment,{
  async readThreadIdentity(){return {threadId:swarmWorkerBinding.threadId,sessionId:swarmWorkerBinding.sessionId,rootPath:swarmWorkerBinding.rootPath};},
  async setThreadName(){throw new RollingUnknownOutcome('naming-request','thread/name/set','lost naming acknowledgment');},
  async readThreadState(){throw new Error('unknown naming outcome must not use an alternate observation path');}
 }),/lost naming acknowledgment/);
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state,generation,worker_number FROM ponytail_index.swarm_worker_v1 WHERE session_id=$1',[swarmWorkerBinding.sessionId])).rows[0]?.generation,swarmWorkerBinding.generation);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).workers.length,2);

 await swarmStore.unbindCoordinator(mainRoot,'main-coordinator');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.swarm_worker_v1 WHERE session_id=$1',[swarmWorkerBinding.sessionId])).rows[0]?.state,'BOUND');
 await assert.rejects(swarmStore.bindWorker(mainSwarmWorktreeMembership,identities[0]??coordinatorIdentity(mainSwarmWorktreeMembership.rootPath,'third-worker'),swarmWorkerAssignment),/coordinator/);
 // Historical removed state must retain origin independently of current membership.
 await pool.query("UPDATE ponytail_index.swarm_worker_v1 SET state='REMOVED' WHERE session_id=$1",[swarmWorkerBinding.sessionId]);
 await assert.rejects(swarmStore.bindWorker(otherSwarmWorktreeMembership,{sessionId:swarmWorkerBinding.sessionId,threadId:swarmWorkerBinding.threadId,rootPath:otherSwarmWorktreeMembership.rootPath},swarmWorkerAssignment),/original|origin/);
});
