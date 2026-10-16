// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {inspectSwarmInfo,readSwarmInfoV6} from '../src/swarm-info.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';

// Traceability: verifies REQ-SWARM-OWNERSHIP
// Traceability: verifies REQ-SWARM-INFO
// Traceability: verifies REQ-SWARM-CLI
test('physical owner and managed invocation report the same isolated read-only lease inventory',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-info-')));
 const mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const home=path.join(root,'home');fs.mkdirSync(home);
 const env:NodeJS.ProcessEnv={...process.env,HOME:home};
 const projectId=crypto.randomUUID();
 const pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1',[projectId]);
  await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const registration=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['register'],{cwd:mainRoot,encoding:'utf8',env});
 assert.equal(registration.status,0,registration.stderr);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});
 fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const userRoot=path.join(root,'user-001'),siblingRoot=path.join(root,'user-002'),unenrolledRoot=path.join(root,'user-003'),managedRoot=path.join(root,'managed/101'),unassignedRoot=path.join(root,'managed/102');
 const checkouts:readonly (readonly [string,string])[]=[['user-one',userRoot],['user-two',siblingRoot],['user-three',unenrolledRoot],['worker-one',managedRoot],['worker-two',unassignedRoot]];
 for(const [branch,checkout] of checkouts) {
  assert.ok(branch&&checkout);git(['worktree','add','-q','-b',branch,checkout]);
 }
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 for(const checkout of [mainRoot,userRoot,siblingRoot,unenrolledRoot,managedRoot,unassignedRoot]) fs.writeFileSync(path.join(checkout,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-fixture-${projectId}`]);
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,path.join(root,'managed')]);
 for(const [campaignId,ownerRoot] of [['campaign-one',userRoot],['campaign-two',siblingRoot]]) await pool.query(`INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text)
  VALUES($1,$2,$3,'plan.json','bindings.json',$4,$5)`,[projectId,campaignId,ownerRoot,'a'.repeat(64),JSON.stringify({schemaVersion:3})]);
 const worktrees:readonly (readonly [number,string])[]=[[101,managedRoot],[102,unassignedRoot]];
 for(const [number,checkout] of worktrees) await pool.query('INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,$4)',[projectId,number,checkout,number===101?'ACTIVE':'AVAILABLE']);
 const assignmentId=crypto.randomUUID(),sessionId=crypto.randomUUID();
 await pool.query(`INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,session_id,scope_text)
  VALUES($1,'campaign-one',$2,'OBL-1',101,$3,'WORKING',$4,$5)`,[projectId,assignmentId,crypto.randomUUID(),sessionId,JSON.stringify({schemaVersion:3})]);
 const before=(await pool.query<Record<string,unknown>>('SELECT assignment_id,state,generation,xmin::text AS version FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1',[projectId])).rows;
 const ownerInfo=await inspectSwarmInfo(userRoot,pool,projectId);
 assert.deepEqual(await inspectSwarmInfo(managedRoot,pool,projectId),ownerInfo);
 assert.equal(ownerInfo.ownerRoot,userRoot);assert.equal(ownerInfo.worktrees.length,1);
 assert.equal(ownerInfo.worktrees[0]?.assignment?.sessionId,sessionId);
 assert.equal((await inspectSwarmInfo(siblingRoot,pool,projectId)).worktrees.length,0);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.length,0);
 await assert.rejects(inspectSwarmInfo(unassignedRoot,pool,projectId),/unassigned/);
 const cli=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','info','--json'],{cwd:managedRoot,encoding:'utf8',env});
 assert.equal(cli.status,0,cli.stderr);assert.deepEqual(readSwarmInfoV6(JSON.parse(cli.stdout)),ownerInfo);
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 await pool.query("INSERT INTO ponytail_index.swarm_owner_v1(project_id,owner_root,git_common_directory,coordinator_session_id) VALUES($1,$2,$3,'coordinator-fixture')",[projectId,userRoot,gitCommonDirectory]);
 const staleUnbind=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','coordinator-unbind','--session','stale'],{cwd:managedRoot,encoding:'utf8',env});
 assert.equal(staleUnbind.status,1);assert.match(staleUnbind.stderr,/binding changed/);
 const boundInfo=await inspectSwarmInfo(managedRoot,pool,projectId);
 assert.deepEqual(boundInfo.coordinator,{kind:'bound',sessionId:'coordinator-fixture',threadId:null});
 const unbind=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','coordinator-unbind','--session','coordinator-fixture','--json'],{cwd:managedRoot,encoding:'utf8',env});
 assert.equal(unbind.status,0,unbind.stderr);
 const unboundInfo=readSwarmInfoV6(JSON.parse(unbind.stdout));
 assert.deepEqual(unboundInfo.coordinator,{kind:'unbound'});assert.deepEqual(unboundInfo.worktrees,ownerInfo.worktrees);
 const bin=path.join(root,'bin');fs.mkdirSync(bin);
 const codexInvocation=path.join(root,'codex-was-invoked');
 fs.writeFileSync(path.join(bin,'codex'),`#!/bin/sh\ntouch '${codexInvocation}'\nexit 97\n`,{mode:0o755});
 t.after(()=>assert.equal(fs.existsSync(codexInvocation),false,'swarm bookkeeping must not invoke Codex'));
 const nativeThreadId=`thread-${projectId}`,nativeSessionId=`session-${projectId}`;
 const nativeBind=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','coordinator-bind','--session',nativeSessionId,'--thread',nativeThreadId,'--json'],
  {cwd:managedRoot,encoding:'utf8',env:{...env,PATH:bin+path.delimiter+env.PATH,ROLLING_NATIVE_FIXTURE_ID:projectId}});
 assert.equal(nativeBind.status,0,nativeBind.stderr);
 const nativeBoundInfo=readSwarmInfoV6(JSON.parse(nativeBind.stdout));
 assert.equal(nativeBoundInfo.ownerRoot,userRoot);
 assert.deepEqual(nativeBoundInfo.coordinator,{kind:'bound',sessionId:nativeSessionId,threadId:nativeThreadId});
 await assert.rejects(inspectSwarmInfo(unenrolledRoot,pool,projectId),/no recorded role/);
 const enrollment=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','owner-enroll','--json'],{cwd:unenrolledRoot,encoding:'utf8',env});
 assert.equal(enrollment.status,0,enrollment.stderr);
 assert.deepEqual(readSwarmInfoV6(JSON.parse(enrollment.stdout)).coordinator,{kind:'unbound'});
 assert.equal(readSwarmInfoV6(JSON.parse(enrollment.stdout)).ownerRoot,unenrolledRoot);
 const managedEnrollment=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','owner-enroll'],{cwd:managedRoot,encoding:'utf8',env});
 assert.equal(managedEnrollment.status,1);assert.match(managedEnrollment.stderr,/managed checkout/);
 const membershipGeneration=crypto.randomUUID();
 await pool.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation) VALUES($1,102,$2,$3)',[projectId,userRoot,membershipGeneration]);
 await pool.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=102",[projectId]);
 const standalone=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','info','--json'],{cwd:unassignedRoot,encoding:'utf8',env});
 assert.equal(standalone.status,0,standalone.stderr);
 const standaloneSwarmInfoV3=readSwarmInfoV6(JSON.parse(standalone.stdout));
 assert.equal(standaloneSwarmInfoV3.ownerRoot,userRoot);
 assert.deepEqual(standaloneSwarmInfoV3.worktrees.find(worktree=>worktree.number===102)?.membership,{kind:'swarm',generation:membershipGeneration});
 assert.equal(standaloneSwarmInfoV3.worktrees.find(worktree=>worktree.number===102)?.assignment,null);
 assert.deepEqual(await inspectSwarmInfo(userRoot,pool,projectId),standaloneSwarmInfoV3);
 const workerFixtureId=`${projectId}-worker`,workerNameFile=path.join(root,'worker-name');
 const workerEnv:NodeJS.ProcessEnv={...env,PATH:bin+path.delimiter+env.PATH,ROLLING_NATIVE_FIXTURE_ID:workerFixtureId,
  ROLLING_NATIVE_FIXTURE_ROOT:unassignedRoot,ROLLING_NATIVE_FIXTURE_NAME_FILE:workerNameFile};
 const workerBind=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','worker-bind','--thread',`thread-${workerFixtureId}`,'--session',`session-${workerFixtureId}`,
  '--number','102','--generation',membershipGeneration,'--kind','plan','--assignment','traceability','--summary','Inspect acceptance coverage','--json'],{cwd:userRoot,encoding:'utf8',env:workerEnv});
 assert.equal(workerBind.status,0,workerBind.stderr);
 const workerSwarmInfoV4=readSwarmInfoV6(JSON.parse(workerBind.stdout));
 assert.equal(workerSwarmInfoV4.workers.length,1);assert.equal(workerSwarmInfoV4.workers[0]?.desiredName,'W1 P1 Inspect acceptance coverage');
 assert.deepEqual(workerSwarmInfoV4.workers[0]?.nativeObservation,{kind:'unobserved'});
 assert.equal((await inspectSwarmInfo(siblingRoot,pool,projectId)).workers.length,0);
 const managedWorkerInfo=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','info','--json'],{cwd:unassignedRoot,encoding:'utf8',env:workerEnv});
 assert.equal(managedWorkerInfo.status,0,managedWorkerInfo.stderr);assert.deepEqual(readSwarmInfoV6(JSON.parse(managedWorkerInfo.stdout)),workerSwarmInfoV4);

 const worker=workerSwarmInfoV4.workers[0];assert.ok(worker);
 const complete=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','worker-complete','--session',worker.binding.sessionId,'--generation',worker.binding.generation,'--json'],{cwd:userRoot,encoding:'utf8',env:workerEnv});
 assert.equal(complete.status,0,complete.stderr);assert.equal(readSwarmInfoV6(JSON.parse(complete.stdout)).workers[0]?.desiredName,'DONE W1 P1 Inspect acceptance coverage');
 const detach=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','worker-unbind','--session',worker.binding.sessionId,'--generation',worker.binding.generation,'--json'],{cwd:userRoot,encoding:'utf8',env:workerEnv});
 assert.equal(detach.status,0,detach.stderr);assert.equal(readSwarmInfoV6(JSON.parse(detach.stdout)).workers.length,0);
 assert.equal(fs.existsSync(unassignedRoot),true);
 assert.deepEqual((await pool.query<Record<string,unknown>>('SELECT assignment_id,state,generation,xmin::text AS version FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1',[projectId])).rows,before);
 const clearing=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','clear','--json'],{cwd:unassignedRoot,encoding:'utf8',env:workerEnv});
 assert.equal(clearing.status,0,clearing.stderr);
 const clearedSwarmInfoV4=readSwarmInfoV6(JSON.parse(clearing.stdout));
 assert.deepEqual(clearedSwarmInfoV4.coordinator,{kind:'unbound'});assert.equal(clearedSwarmInfoV4.workers.length,0);assert.equal(clearedSwarmInfoV4.worktrees.length,0);
 assert.ok(fs.existsSync(managedRoot)&&fs.existsSync(unassignedRoot));
 // Restore this test's legacy lease for its subsequent read-only conflict proof.
 await pool.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='WORKING',activity_stopped=false,retired=false WHERE assignment_id=$1",[assignmentId]);
 const afterClearing=(await pool.query<Record<string,unknown>>('SELECT assignment_id,state,generation,xmin::text AS version FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1',[projectId])).rows;

 await pool.query('INSERT INTO ponytail_index.swarm_owner_v1(project_id,owner_root,git_common_directory) VALUES($1,$2,$3)',[projectId,siblingRoot,gitCommonDirectory]);
 await pool.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation) VALUES($1,101,$2,$3)',[projectId,siblingRoot,crypto.randomUUID()]);
 await assert.rejects(inspectSwarmInfo(userRoot,pool,projectId),/conflicting swarm and campaign owners/);
 await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);
 const invalid=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','bad-command'],{cwd:userRoot,encoding:'utf8',env});
 assert.equal(invalid.status,2);assert.match(invalid.stderr,/Usage: ponytail swarm/);
 fs.rmSync(managedRoot,{recursive:true,force:true});
 assert.equal((await inspectSwarmInfo(userRoot,pool,projectId)).worktrees[0]?.present,false);
 assert.deepEqual((await pool.query<Record<string,unknown>>('SELECT assignment_id,state,generation,xmin::text AS version FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1',[projectId])).rows,afterClearing);
});
