// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {inspectSwarmInfo,readSwarmWorktreeDeletionReportV1,readSwarmInfoV6} from '../src/swarm-info.js';
import {SwarmStore} from '../src/swarm-store.js';
import type {SwarmUserWorktree} from '../src/swarm-owner.js';
import {resetRollingProject,type RollingResetRequestV1} from '../src/rolling-reset.js';
import {collectRollingGraph,type RollingProjectConfigV2,type RollingBinding,type RollingBindingsV1} from '../src/rolling-campaign.js';
import {RollingCampaignStore,type RollingNativeWorkerSelection} from '../src/rolling-campaign-store.js';
import {RollingCampaignOperations} from '../src/rolling-operations.js';
import {readRollingObligationFixtureSource} from './helpers/rolling-obligation-source.js';
import {inputDigest,type ObligationDocumentV1,type ObligationBaseline} from '../skills/plan-execution/scripts/obligations.js';
import type {ObligationBindingHistoryV1,ObligationBindingRevisionV1} from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type {SwarmWorkerAssignment} from '../src/swarm-store.js';

// Traceability: verifies REQ-SWARM-WORKTREES
// Traceability: verifies REQ-SWARM-CLI
test('host worktree enrollment preserves native paths, fences owners and never recycles host checkouts',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-host-')));
 const mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const projectId=crypto.randomUUID();const pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});
 fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(mainRoot,'.gitignore'),'/session_id.txt\n');
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const otherRoot=path.join(root,'other'),hostRoot=path.join(root,'managed/opaque/project'),secondHostRoot=path.join(root,'managed/second/project');
 for(const checkout of [otherRoot,hostRoot,secondHostRoot]) git(['worktree','add','-q','--detach',checkout,'HEAD']);
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-host-${projectId}`]);
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,path.join(root,'historical-managed')]);
 const swarmStore=new SwarmStore(pool,projectId);
 await swarmStore.enrollOwner({rootPath:mainRoot,gitCommonDirectory});await swarmStore.enrollOwner({rootPath:otherRoot,gitCommonDirectory});
 fs.writeFileSync(path.join(otherRoot,'.agents/config/project/rolling-campaigns.json'),'unrelated invalid configuration');
 await swarmStore.bindCoordinator(mainRoot,{rootPath:mainRoot,threadId:'coordinator-thread',sessionId:'coordinator-session'});
 await swarmStore.bindCoordinator(otherRoot,{rootPath:otherRoot,threadId:'other-thread',sessionId:'other-session'});
 await assert.rejects(swarmStore.enrollWorktree(mainRoot,mainRoot),/user worktree/);
 await assert.rejects(swarmStore.enrollWorktree(mainRoot,otherRoot),/user worktree/);
 const foreignRoot=path.join(root,'foreign');fs.mkdirSync(foreignRoot);execFileSync('git',['-C',foreignRoot,'init','-q']);
 await assert.rejects(swarmStore.enrollWorktree(mainRoot,foreignRoot),/canonical physical Git checkout/);
 fs.writeFileSync(path.join(hostRoot,'unfinished.txt'),'preserve');
 const swarmWorktreeMembership=await swarmStore.enrollWorktree(mainRoot,hostRoot);
 assert.equal(swarmWorktreeMembership.rootPath,hostRoot);
 assert.equal((await pool.query<Record<string,unknown>>('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1',[projectId])).rows[0]?.managed_directory,path.join(root,'historical-managed'));
 assert.equal(fs.readFileSync(path.join(hostRoot,'unfinished.txt'),'utf8'),'preserve');
 assert.deepEqual(await swarmStore.enrollWorktree(mainRoot,hostRoot),swarmWorktreeMembership);
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 fs.writeFileSync(path.join(mainRoot,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 const enrollment=spawnSync(process.execPath,[path.join(repositoryRoot,'src/swarm-info.js'),'worktree-enroll','--path',hostRoot,'--json'],{cwd:mainRoot,encoding:'utf8'});
 assert.equal(enrollment.status,0,enrollment.stderr);
 assert.deepEqual(readSwarmInfoV6(JSON.parse(enrollment.stdout)).worktrees[0]?.membership,{kind:'swarm',generation:swarmWorktreeMembership.generation});
 await assert.rejects(swarmStore.enrollWorktree(otherRoot,hostRoot),/original ownership/);
 fs.writeFileSync(path.join(hostRoot,'session_id.txt'),'host-session\n');
 const swarmWorkerBinding=await swarmStore.bindWorker(swarmWorktreeMembership,{rootPath:hostRoot,sessionId:'host-session',threadId:'host-thread'},
  {kind:'plan',id:'host-plan',summary:'Verify native placement'});
 const swarmInfoV4=await inspectSwarmInfo(hostRoot,pool,projectId);
 assert.equal(swarmInfoV4.ownerRoot,mainRoot);assert.equal(swarmInfoV4.workers[0]?.binding.rootPath,hostRoot);
 await swarmStore.detachWorker(await swarmStore.prepareWorkerRemoval(mainRoot,swarmWorkerBinding.sessionId,swarmWorkerBinding.generation));
 await swarmStore.releaseWorktree(swarmWorktreeMembership);
 assert.ok(fs.existsSync(hostRoot));
 assert.equal(fs.readFileSync(path.join(hostRoot,'unfinished.txt'),'utf8'),'preserve');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',[projectId,swarmWorktreeMembership.number])).rows[0]?.state,'QUARANTINED');
 await assert.rejects(swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),/configured physical directory differs/);
 const deletion=await swarmStore.deleteWorktrees(mainRoot,swarmWorktreeMembership.number);
 assert.equal(deletion[0]?.outcome,'retained');assert.ok(fs.existsSync(hostRoot));
 const secondSwarmWorktreeMembership=await swarmStore.enrollWorktree(mainRoot,secondHostRoot);
 await swarmStore.clear(mainRoot);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.length,0);
 assert.ok(fs.existsSync(secondSwarmWorktreeMembership.rootPath));
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',[projectId,secondSwarmWorktreeMembership.number])).rows[0]?.state,'QUARANTINED');
 await assert.rejects(swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),/configured physical directory differs/);
});

// Traceability: verifies REQ-SWARM-WORKTREES
test('competing user swarms exclusively claim the lowest available retained checkout',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-worktrees-')));
 const mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const projectId=crypto.randomUUID();const pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});
 fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(mainRoot,'.gitignore'),'/session_id.txt\n');
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const otherRoot=path.join(root,'other'),checkout101=path.join(root,'managed/101'),checkout102=path.join(root,'managed/102');
 const checkouts:readonly (readonly [string,string])[]=[['other',otherRoot],['worker-101',checkout101],['worker-102',checkout102]];
 for(const [branch,checkout] of checkouts) git(['worktree','add','-q','-b',branch,checkout]);
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 const swarmUserWorktree:SwarmUserWorktree={rootPath:mainRoot,gitCommonDirectory};
 const otherSwarmUserWorktree:SwarmUserWorktree={rootPath:otherRoot,gitCommonDirectory};
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-worktrees-${projectId}`]);
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,path.dirname(checkout101)]);
 for(const [number,checkout] of [[101,checkout101],[102,checkout102]] satisfies readonly (readonly [number,string])[]) await pool.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,$4)",[projectId,number,checkout,number===101?'AVAILABLE':'QUARANTINED']);
 const swarmStore=new SwarmStore(pool,projectId);
 await swarmStore.enrollOwner(swarmUserWorktree);await swarmStore.enrollOwner(otherSwarmUserWorktree);
 const claims=await Promise.all([swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),swarmStore.reserveWorktree(otherRoot,{kind:'retained'})]);
 assert.equal(claims.filter(claim=>claim!==null).length,1);
 const swarmWorktreeMembership=claims.find(claim=>claim!==null);assert.ok(swarmWorktreeMembership);
 assert.equal(swarmWorktreeMembership.number,101);assert.equal(swarmWorktreeMembership.rootPath,checkout101);
 assert.ok(swarmWorktreeMembership.ownerRoot===mainRoot||swarmWorktreeMembership.ownerRoot===otherRoot);
 const swarmInfoV3=await inspectSwarmInfo(swarmWorktreeMembership.ownerRoot,pool,projectId);
 assert.equal(swarmInfoV3.schemaVersion,6);assert.equal(swarmInfoV3.worktrees.length,1);
 assert.deepEqual(swarmInfoV3.worktrees[0]?.membership,{kind:'swarm',generation:swarmWorktreeMembership.generation});
 assert.equal(swarmInfoV3.worktrees[0]?.assignment,null);
 assert.deepEqual(await inspectSwarmInfo(checkout101,pool,projectId),swarmInfoV3);
 const unboundOwner=swarmWorktreeMembership.ownerRoot===mainRoot?otherRoot:mainRoot;
 assert.equal((await inspectSwarmInfo(unboundOwner,pool,projectId)).worktrees.length,0);
 assert.equal(execFileSync('git',['-C',checkout101,'status','--porcelain'],{encoding:'utf8'}),'');
 await pool.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=102",[projectId]);
 const editor=path.join(root,'rebase-editor.cjs');
 fs.writeFileSync(editor,"const fs=require('node:fs');const file=process.argv[2];fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/^pick /m,'edit '));");
 const pauseRebase=(checkout:string):void=>{
  execFileSync('git',['-C',checkout,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--allow-empty','-qm','paused fixture']);
  execFileSync('git',['-C',checkout,'rebase','-i','HEAD~1'],{env:{...process.env,GIT_SEQUENCE_EDITOR:`${process.execPath} ${editor}`},stdio:'pipe'});
  assert.equal(execFileSync('git',['-C',checkout,'status','--porcelain'],{encoding:'utf8'}),'');
 };
 pauseRebase(checkout102);
 await assert.rejects(swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),/active Git operation/);
 execFileSync('git',['-C',checkout102,'rebase','--abort'],{stdio:'pipe'});
 fs.writeFileSync(path.join(checkout102,'session_id.txt'),'retained-session\n');
 await assert.rejects(swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),/session marker/);
 fs.unlinkSync(path.join(checkout102,'session_id.txt'));
 fs.writeFileSync(path.join(checkout102,'unfinished.txt'),'preserve this work');
 await assert.rejects(swarmStore.reserveWorktree(mainRoot,{kind:'retained'}),/uncommitted work/);
 assert.equal(fs.readFileSync(path.join(checkout102,'unfinished.txt'),'utf8'),'preserve this work');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=102',[projectId])).rows[0]?.state,'AVAILABLE');
 const rollingResetRequestV1:RollingResetRequestV1={schemaVersion:1,id:crypto.randomUUID(),reason:'fixture reset',authority:['fixture']};
 const beforeResetBranch=execFileSync('git',['-C',checkout101,'symbolic-ref','HEAD'],{encoding:'utf8'});
 const beforeReset=execFileSync('git',['-C',checkout101,'rev-parse','HEAD'],{encoding:'utf8'});
 const resetPoolClient=await pool.connect();
 try {await assert.rejects(resetRollingProject(resetPoolClient,projectId,mainRoot,rollingResetRequestV1,true,null),/swarm.*membership/);}
 finally {resetPoolClient.release();}
 assert.equal(execFileSync('git',['-C',checkout101,'rev-parse','HEAD'],{encoding:'utf8'}),beforeReset);
 assert.equal(execFileSync('git',['-C',checkout101,'symbolic-ref','HEAD'],{encoding:'utf8'}),beforeResetBranch);
 assert.equal((await pool.query('SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1',[projectId])).rowCount,0);
 await swarmStore.releaseWorktree(swarmWorktreeMembership);
 assert.equal((await pool.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId])).rowCount,0);
 assert.equal(execFileSync('git',['-C',checkout101,'status','--porcelain'],{encoding:'utf8'}),'');
 const newOwner=swarmWorktreeMembership.ownerRoot===mainRoot?otherRoot:mainRoot;
 const transferredSwarmWorktreeMembership=await swarmStore.reserveWorktree(newOwner,{kind:'retained'});assert.ok(transferredSwarmWorktreeMembership);
 assert.equal(transferredSwarmWorktreeMembership.number,101);assert.equal(transferredSwarmWorktreeMembership.ownerRoot,newOwner);
 await assert.rejects(swarmStore.releaseWorktree(swarmWorktreeMembership),/membership changed/);
 await pool.query('INSERT INTO ponytail_index.swarm_native_session_v1(session_id,thread_id,project_id,root_path) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),crypto.randomUUID(),projectId,checkout101]);
 await assert.rejects(swarmStore.releaseWorktree(transferredSwarmWorktreeMembership),/native actor/);
 await pool.query('DELETE FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1',[projectId]);
 pauseRebase(checkout101);
 await assert.rejects(swarmStore.releaseWorktree(transferredSwarmWorktreeMembership),/active Git operation/);
 assert.equal((await pool.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=101',[projectId])).rowCount,1);
 execFileSync('git',['-C',checkout101,'rebase','--abort'],{stdio:'pipe'});
 fs.writeFileSync(path.join(checkout101,'retained.txt'),'cancelled work survives release');
 await swarmStore.releaseWorktree(transferredSwarmWorktreeMembership);
 assert.equal(fs.readFileSync(path.join(checkout101,'retained.txt'),'utf8'),'cancelled work survives release');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=101',[projectId])).rows[0]?.state,'QUARANTINED');
 await pool.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='QUARANTINED' WHERE project_id=$1 AND number=102",[projectId]);
 const pendingSwarmWorktreeMembership=await swarmStore.reserveWorktree(otherRoot,{kind:'provision',baseCommit:git(['rev-parse','HEAD'])});assert.ok(pendingSwarmWorktreeMembership);
 const preservedOtherRoot=path.join(root,'preserved-other');fs.renameSync(otherRoot,preservedOtherRoot);
 execFileSync('git',['clone','--quiet',mainRoot,otherRoot],{stdio:'pipe'});
 await assert.rejects(swarmStore.provisionWorktree(pendingSwarmWorktreeMembership),/canonical physical Git checkout/);
 assert.equal(fs.existsSync(pendingSwarmWorktreeMembership.rootPath),false);
 fs.rmSync(otherRoot,{recursive:true});fs.renameSync(preservedOtherRoot,otherRoot);

});

// Traceability: verifies REQ-SWARM-WORKTREES
// Traceability: verifies REQ-SWARM-CLI
test('installed swarm CLI creates, reuses and resumes exact durable project setup',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-setup-')));
 const mainRoot=path.join(root,'main'),home=path.join(root,'home');fs.mkdirSync(mainRoot);fs.mkdirSync(home);
 const env:NodeJS.ProcessEnv={...process.env,HOME:home};
 const projectId=crypto.randomUUID(),pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try {await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}
  finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const cli=(cwd:string,argv:readonly string[])=>spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm',...argv],{cwd,env,encoding:'utf8'});
 const registration=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['register'],{cwd:mainRoot,env,encoding:'utf8'});assert.equal(registration.status,0,registration.stderr);
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 fs.writeFileSync(path.join(mainRoot,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 const setupScript=path.join(root,'setup.cjs'),cleanupScript=path.join(root,'cleanup.cjs'),refusal=path.join(root,'refuse'),cleanupRefusal=path.join(root,'refuse-cleanup');
 fs.writeFileSync(setupScript,`const fs=require('node:fs');if(fs.existsSync(${JSON.stringify(refusal)}))process.exit(9);const file='setup-runs';fs.writeFileSync(file,String(Number(fs.existsSync(file)?fs.readFileSync(file,'utf8'):'0')+1));`);
 fs.writeFileSync(cleanupScript,`const fs=require('node:fs');if(fs.existsSync(${JSON.stringify(cleanupRefusal)})&&['all',process.env.PONYTAIL_WORKTREE_NUMBER].includes(fs.readFileSync(${JSON.stringify(cleanupRefusal)},'utf8')))process.exit(7);fs.writeFileSync('cleanup-runs',process.env.PONYTAIL_WORKTREE_GENERATION);`);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},
  maxActiveWorkers:null,publicationSize:null,setupCommands:[[process.execPath,setupScript]],retirementCommands:[[process.execPath,cleanupScript]],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(mainRoot,'.gitignore'),'/session_id.txt\n/setup-runs\n/cleanup-runs\n/ponytail-journal.json\n');
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-setup-${projectId}`]);
 const assignment=cli(mainRoot,['worktree-assign','--base','HEAD','--json']);assert.equal(assignment.status,0,assignment.stderr);
 const firstSwarmInfoV3=await inspectSwarmInfo(mainRoot,pool,projectId);
 const firstWorktree=firstSwarmInfoV3.worktrees[0];assert.ok(firstWorktree&&firstWorktree.membership.kind==='swarm');assert.equal(firstWorktree.number,101);
 assert.equal(firstWorktree.state,'RESERVED');assert.equal(fs.readFileSync(path.join(firstWorktree.rootPath,'setup-runs'),'utf8'),'1');
 fs.writeFileSync(path.join(firstWorktree.rootPath,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 fs.writeFileSync(cleanupRefusal,'all');
 const refusedRelease=cli(firstWorktree.rootPath,['worktree-release','--number','101','--generation',firstWorktree.membership.generation]);
 assert.equal(refusedRelease.status,1);assert.match(refusedRelease.stderr,/cleanup failed/);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees[0]?.state,'RESERVED');assert.ok(fs.existsSync(firstWorktree.rootPath));
 fs.unlinkSync(cleanupRefusal);
 const release=cli(firstWorktree.rootPath,['worktree-release','--number','101','--generation',firstWorktree.membership.generation,'--json']);assert.equal(release.status,0,release.stderr);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.length,0);
 assert.equal(fs.readFileSync(path.join(firstWorktree.rootPath,'cleanup-runs'),'utf8'),firstWorktree.membership.generation);
 assert.ok(fs.existsSync(firstWorktree.rootPath));
 const reassignment=cli(mainRoot,['worktree-assign','--base','HEAD','--json']);assert.equal(reassignment.status,0,reassignment.stderr);
 const secondWorktree=(await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees[0];assert.ok(secondWorktree&&secondWorktree.membership.kind==='swarm');assert.equal(secondWorktree.number,101);
 assert.notEqual(secondWorktree.membership.generation,firstWorktree.membership.generation);
 assert.equal(fs.readFileSync(path.join(secondWorktree.rootPath,'setup-runs'),'utf8'),'2');
 assert.equal(cli(mainRoot,['worktree-release','--number','101','--generation',firstWorktree.membership.generation]).status,1);
 fs.writeFileSync(refusal,'fail setup');
 const failed=cli(mainRoot,['worktree-assign','--base','HEAD','--json']);assert.equal(failed.status,1);assert.match(failed.stderr,/worktree 102.*worktree-setup/);
 const pendingWorktree=(await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.find(worktree=>worktree.number===102);assert.ok(pendingWorktree&&pendingWorktree.membership.kind==='swarm');
 assert.equal(pendingWorktree.state,'PROVISIONING');assert.ok(fs.existsSync(pendingWorktree.rootPath));
 assert.equal(cli(mainRoot,['worktree-setup','--number','102','--generation',crypto.randomUUID()]).status,1);
 fs.unlinkSync(refusal);
 const retry=cli(mainRoot,['worktree-setup','--number','102','--generation',pendingWorktree.membership.generation,'--json']);assert.equal(retry.status,0,retry.stderr);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.find(worktree=>worktree.number===102)?.state,'RESERVED');
 assert.equal(cli(mainRoot,['worktree-setup','--number','102','--generation',pendingWorktree.membership.generation]).status,0);
 assert.equal(fs.readFileSync(path.join(pendingWorktree.rootPath,'setup-runs'),'utf8'),'1');
 fs.writeFileSync(path.join(secondWorktree.rootPath,'retained-source.txt'),'original source survives checkout deletion');
 execFileSync('git',['-C',secondWorktree.rootPath,'add','retained-source.txt']);
 execFileSync('git',['-C',secondWorktree.rootPath,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','source to retain']);
 const retainedRevision=execFileSync('git',['-C',secondWorktree.rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 for(const worktree of [secondWorktree,pendingWorktree]) {
  assert.ok(worktree.membership.kind==='swarm');
  const release=cli(mainRoot,['worktree-release','--number',String(worktree.number),'--generation',worktree.membership.generation]);assert.equal(release.status,0,release.stderr);
 }
 fs.writeFileSync(cleanupRefusal,'all');
 const refusedDelete=cli(mainRoot,['worktree-delete','--number','101','--json']);assert.equal(refusedDelete.status,1);
 assert.equal(readSwarmWorktreeDeletionReportV1(JSON.parse(refusedDelete.stdout)).results[0]?.outcome,'retained');
 assert.ok(fs.existsSync(firstWorktree.rootPath));
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=101',[projectId])).rows[0]?.state,'QUARANTINED');
 const originalSourceBranch=execFileSync('git',['-C',firstWorktree.rootPath,'symbolic-ref','--short','HEAD'],{encoding:'utf8'}).trim();
 execFileSync('git',['-C',firstWorktree.rootPath,'switch','--detach'],{stdio:'pipe'});git(['branch','-D',originalSourceBranch]);

 // Reproduce the old interrupted-write state; intent independently fences reuse.
 await pool.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=101",[projectId]);
 const swarmStore=new SwarmStore(pool,projectId);
 const recoveredSwarmWorktreeMembership=await swarmStore.reserveWorktree(mainRoot,{kind:'retained'});assert.ok(recoveredSwarmWorktreeMembership);
 assert.equal(recoveredSwarmWorktreeMembership.number,102);await swarmStore.releaseWorktree(recoveredSwarmWorktreeMembership);

 const resetPoolClient=await pool.connect();
 try {await assert.rejects(resetRollingProject(resetPoolClient,projectId,mainRoot,{schemaVersion:1,id:crypto.randomUUID(),reason:'fixture reset',authority:['fixture']},true,null),/pending swarm worktree deletion/);}
 finally {resetPoolClient.release();}
 fs.unlinkSync(cleanupRefusal);
 const deleted=cli(mainRoot,['worktree-delete','--number','101','--json']);assert.equal(deleted.status,0,deleted.stderr);
 assert.equal(readSwarmWorktreeDeletionReportV1(JSON.parse(deleted.stdout)).results[0]?.outcome,'deleted');
 assert.equal(fs.existsSync(firstWorktree.rootPath),false);
 assert.equal(git(['rev-parse',`refs/ponytail/swarm/deleted/101/${retainedRevision}`]),retainedRevision);
 assert.equal(cli(mainRoot,['worktree-delete','--number','101']).status,0);
 // Deleted pool rows retain history and cannot be reused as a new incarnation.
 assert.equal(cli(mainRoot,['worktree-assign','--base','HEAD']).status,0);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees[0]?.number,102);
 const eligible: number[]=[];
 for(let i=0;i<2;i++) {
  const allocated=cli(mainRoot,['worktree-assign','--base','HEAD']);assert.equal(allocated.status,0,allocated.stderr);
 }
 for(const worktree of (await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.filter(worktree=>worktree.number!==102)) {
  assert.ok(worktree.membership.kind==='swarm');eligible.push(worktree.number);
  const released=cli(mainRoot,['worktree-release','--number',String(worktree.number),'--generation',worktree.membership.generation]);assert.equal(released.status,0,released.stderr);
 }
 assert.deepEqual(eligible,[103,104]);
 fs.writeFileSync(cleanupRefusal,'103');
 const all=cli(mainRoot,['worktree-delete','--all','--json']);assert.equal(all.status,1);
 assert.deepEqual(readSwarmWorktreeDeletionReportV1(JSON.parse(all.stdout)).results.map(result=>[result.number,result.outcome]),[[102,'protected'],[103,'retained'],[104,'deleted']]);
 assert.ok(fs.existsSync(mainRoot));assert.ok(fs.existsSync(path.join(root,'managed/102')));assert.ok(fs.existsSync(path.join(root,'managed/103')));assert.equal(fs.existsSync(path.join(root,'managed/104')),false);
 fs.unlinkSync(cleanupRefusal);
 const allRetry=cli(mainRoot,['worktree-delete','--all','--json']);assert.equal(allRetry.status,0,allRetry.stderr);
 assert.deepEqual(readSwarmWorktreeDeletionReportV1(JSON.parse(allRetry.stdout)).results.map(result=>[result.number,result.outcome]),[[102,'protected'],[103,'deleted']]);
 assert.equal(cli(mainRoot,['worktree-delete','--number','102']).status,1);
 // Pool reset removes obsolete resource-scoped deletion receipts with their rows.
 const remaining=(await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees[0];assert.ok(remaining&&remaining.membership.kind==='swarm');
 assert.equal(cli(mainRoot,['worktree-release','--number','102','--generation',remaining.membership.generation]).status,0);
 await pool.query('DELETE FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1',[projectId]);
 assert.equal((await pool.query('SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 WHERE project_id=$1',[projectId])).rowCount,0);
 const reincarnated=cli(mainRoot,['worktree-assign','--base','HEAD']);assert.equal(reincarnated.status,0,reincarnated.stderr);
 const recreated=(await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees[0];assert.ok(recreated&&recreated.membership.kind==='swarm');assert.equal(recreated.number,101);
 assert.equal(cli(mainRoot,['worktree-release','--number','101','--generation',recreated.membership.generation]).status,0);
 assert.equal(cli(mainRoot,['worktree-delete','--number','101']).status,0);
 assert.equal(git(['rev-parse',`refs/ponytail/swarm/deleted/101/${retainedRevision}`]),retainedRevision);
 const recreatedRevision=git(['rev-parse','HEAD']);assert.notEqual(recreatedRevision,retainedRevision);
 assert.equal(git(['rev-parse',`refs/ponytail/swarm/deleted/101/${recreatedRevision}`]),recreatedRevision);
 assert.equal(git(['show',`${retainedRevision}:retained-source.txt`]),'original source survives checkout deletion');
});

// Traceability: verifies REQ-SWARM-WORKTREES
// Traceability: verifies REQ-ROLLING-SCHEDULING
// Traceability: verifies REQ-ROLLING-WORKERS
test('native campaign allocation freezes one lease on the original worker and resumes it without another checkout',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-native-lease-')));
 const mainRoot=path.join(root,'main');fs.mkdirSync(mainRoot);
 const projectId=crypto.randomUUID(),pool=new Pool(databaseOptions(repositoryRoot));
 t.after(async()=>{try{await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);}finally{await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',mainRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 fs.mkdirSync(path.join(mainRoot,'.agents/config/project'),{recursive:true});
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(root,'new-pool'),anchor:'main'},maxActiveWorkers:2,publicationSize:1,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.writeFileSync(path.join(mainRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(mainRoot,'.gitignore'),'/session_id.txt\n/ponytail-journal.json\n');
 const sourceObligationDocumentV1:ObligationDocumentV1=readRollingObligationFixtureSource();
 const originalObligationBaseline=sourceObligationDocumentV1.baselines[0];assert.ok(originalObligationBaseline);
 for(const requirement of originalObligationBaseline.requirements){fs.mkdirSync(path.dirname(path.join(mainRoot,requirement.path)),{recursive:true});fs.copyFileSync(path.join(repositoryRoot,requirement.path),path.join(mainRoot,requirement.path));}
 const obligationBaseline:ObligationBaseline={...originalObligationBaseline,requirements:originalObligationBaseline.requirements.map(requirement=>({...requirement,digest:inputDigest(mainRoot,requirement.path)}))};
 const obligationDocumentV1:ObligationDocumentV1={...sourceObligationDocumentV1,scopeId:'native-fixture',baselines:[obligationBaseline],obligations:sourceObligationDocumentV1.obligations.filter(obligation=>obligationBaseline.obligationIds.includes(obligation.id)),certificates:[],checkpoints:[]};
 const obligation=obligationDocumentV1.obligations[1];assert.ok(obligation);
 const rollingBinding:RollingBinding={obligationId:obligation.id,implementationIds:[],sourcePaths:[],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
 const rollingBindingsV1:RollingBindingsV1={schemaVersion:1,bindings:[rollingBinding]};
 const obligationBindingRevisionV1:ObligationBindingRevisionV1={id:'BIND-1',obligationId:obligation.id,predecessorId:null,baselineId:obligationBaseline.id,assessor:'coordinator',authority:obligationBaseline.authority.references,reason:'Native assignment fixture',dependsOn:[],execution:{sprintId:null,taskletIds:[],plannedPaths:['fixture.ts'],operations:['inspect','edit','test'],selection:['fixture'],target:{identity:'local',profile:'fixture'}}};
 const obligationBindingHistoryV1:ObligationBindingHistoryV1={schemaVersion:1,scopeId:'native-fixture',revisions:[obligationBindingRevisionV1]};
 fs.writeFileSync(path.join(mainRoot,'obligations.json'),JSON.stringify(obligationDocumentV1));fs.writeFileSync(path.join(mainRoot,'bindings.json'),JSON.stringify(rollingBindingsV1));fs.writeFileSync(path.join(mainRoot,'history.json'),JSON.stringify(obligationBindingHistoryV1));
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);git(['branch','campaign/native-fixture']);
 const hostRoot=path.join(root,'host/opaque/repo'),otherRoot=path.join(root,'other'),foreignHostRoot=path.join(root,'host/foreign/repo'),wrongScopeRoot=path.join(root,'host/wrong/repo');
 for(const checkout of [hostRoot,otherRoot,foreignHostRoot,wrongScopeRoot])git(['worktree','add','-q','--detach',checkout,'HEAD']);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`native-lease-${projectId}`]);
 const historicalPool=path.join(root,'historical-pool');
 await pool.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[projectId,historicalPool]);
 const swarmStore=new SwarmStore(pool,projectId),rollingCampaignStore=new RollingCampaignStore(pool,projectId);
 const gitCommonDirectory=fs.realpathSync(git(['rev-parse','--path-format=absolute','--git-common-dir']));
 for(const ownerRoot of [mainRoot,otherRoot]){await swarmStore.enrollOwner({rootPath:ownerRoot,gitCommonDirectory});await swarmStore.bindCoordinator(ownerRoot,{rootPath:ownerRoot,threadId:ownerRoot,sessionId:ownerRoot});}
 const nativeSessionId=crypto.randomUUID(),nativeThreadId=crypto.randomUUID(),foreignSessionId=crypto.randomUUID(),foreignThreadId=crypto.randomUUID();
 const swarmWorktreeMembership=await swarmStore.enrollWorktree(mainRoot,hostRoot);
 const foreignSwarmWorktreeMembership=await swarmStore.enrollWorktree(otherRoot,foreignHostRoot);
 fs.writeFileSync(path.join(hostRoot,'session_id.txt'),nativeSessionId+'\n');fs.writeFileSync(path.join(hostRoot,'unfinished.txt'),'preserved source');
 fs.writeFileSync(path.join(foreignHostRoot,'session_id.txt'),foreignSessionId+'\n');
 const swarmWorkerAssignment:SwarmWorkerAssignment={kind:'plan',id:'native-fixture',summary:'Native frozen assignment'};
 const swarmWorkerBinding=await swarmStore.bindWorker(swarmWorktreeMembership,{rootPath:hostRoot,threadId:nativeThreadId,sessionId:nativeSessionId},swarmWorkerAssignment);
 const foreignSwarmWorkerBinding=await swarmStore.bindWorker(foreignSwarmWorktreeMembership,{rootPath:foreignHostRoot,threadId:foreignThreadId,sessionId:foreignSessionId},swarmWorkerAssignment);
 const wrongSwarmWorktreeMembership=await swarmStore.enrollWorktree(mainRoot,wrongScopeRoot);
 const wrongSessionId=crypto.randomUUID();fs.writeFileSync(path.join(wrongScopeRoot,'session_id.txt'),wrongSessionId+'\n');
 const wrongSwarmWorkerAssignment:SwarmWorkerAssignment={kind:'plan',id:'different-plan',summary:'Different native assignment'};
 const wrongSwarmWorkerBinding=await swarmStore.bindWorker(wrongSwarmWorktreeMembership,{rootPath:wrongScopeRoot,threadId:crypto.randomUUID(),sessionId:wrongSessionId},wrongSwarmWorkerAssignment);
 const rollingGraph=collectRollingGraph(mainRoot,'obligations.json','bindings.json','history.json');
 await rollingCampaignStore.registerCampaign({id:'native-fixture',coordinatorRoot:mainRoot,documentPath:'obligations.json',bindingsPath:'bindings.json',graphDigest:rollingGraph.digest,managedDirectory:rollingProjectConfigV2.managedWorktrees.directory,configuration:{mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/native-fixture',maxActiveWorkers:2,publicationSize:1},bindingHistory:{path:'history.json',assessor:'coordinator',authority:obligationBaseline.authority.references}});
 const rollingNativeWorkerSelection:RollingNativeWorkerSelection={sessionId:swarmWorkerBinding.sessionId,workerGeneration:swarmWorkerBinding.generation,worktreeGeneration:swarmWorkerBinding.worktreeGeneration};
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest),/explicit worker selectors/);
 const wrongRollingNativeWorkerSelection:RollingNativeWorkerSelection={sessionId:wrongSwarmWorkerBinding.sessionId,workerGeneration:wrongSwarmWorkerBinding.generation,worktreeGeneration:wrongSwarmWorkerBinding.worktreeGeneration};
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,wrongRollingNativeWorkerSelection),/assignment differs/);
 await assert.rejects(rollingCampaignStore.allocate('native-fixture','stale',null,true,rollingNativeWorkerSelection),/stale/);
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,{...rollingNativeWorkerSelection,workerGeneration:crypto.randomUUID()}),/generation changed/);
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,{...rollingNativeWorkerSelection,worktreeGeneration:crypto.randomUUID()}),/generation changed/);
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,{sessionId:foreignSwarmWorkerBinding.sessionId,workerGeneration:foreignSwarmWorkerBinding.generation,worktreeGeneration:foreignSwarmWorkerBinding.worktreeGeneration}),/owner or coordinator differs/);
 fs.writeFileSync(path.join(hostRoot,'session_id.txt'),'wrong-session\n');
 await assert.rejects(rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,rollingNativeWorkerSelection),/marker differs/);
 fs.writeFileSync(path.join(hostRoot,'session_id.txt'),nativeSessionId+'\n');
 assert.equal((await rollingCampaignStore.status('native-fixture')).assignments.length,0);
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 fs.writeFileSync(path.join(mainRoot,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 const args=['replenish','--campaign','native-fixture','--worker-session',rollingNativeWorkerSelection.sessionId,'--worker-generation',rollingNativeWorkerSelection.workerGeneration,'--worktree-generation',rollingNativeWorkerSelection.worktreeGeneration,'--existing-only','true'];
 const result=spawnSync(process.execPath,[path.join(repositoryRoot,'src/rolling-operations.js'),...args],{cwd:mainRoot,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const response:unknown=JSON.parse(result.stdout);
 assert.ok(response!==null&&typeof response==='object'&&'result' in response);
 assert.ok(response.result!==null&&typeof response.result==='object'&&'allocations' in response.result&&Array.isArray(response.result.allocations));
 assert.equal(response.result.allocations.length,1,'an explicit native worker request allocates one slot only');
 const first=(await rollingCampaignStore.status('native-fixture')).assignments[0];assert.ok(first?.lease);
 assert.equal(first.sessionId,swarmWorkerBinding.sessionId);assert.equal(first.worktreeNumber,swarmWorktreeMembership.number);assert.equal(first.state,'WORKING');assert.equal(first.lease.generation,first.generation);
 assert.notEqual(first.generation,swarmWorktreeMembership.generation);
 const retries=await Promise.all([rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,rollingNativeWorkerSelection),rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,rollingNativeWorkerSelection)]);
 assert.ok(retries.every(allocation=>allocation.assignment?.id===first.id&&allocation.assignment.generation===first.generation));
 assert.deepEqual(await swarmStore.workerBinding(mainRoot,swarmWorkerBinding.sessionId,swarmWorkerBinding.generation),swarmWorkerBinding);
 const rollingCampaignOperations=new RollingCampaignOperations(rollingCampaignStore,mainRoot);
 assert.ok((await rollingCampaignOperations.nextActions('native-fixture')).decisions.some(decision=>decision.kind==='host-assignment'&&decision.hostAction==='send-assignment'&&decision.assignment.id===first.id));
 await swarmStore.recordWorkerInactive(mainRoot,swarmWorkerBinding.sessionId,swarmWorkerBinding.generation,first.generation,[]);
 const resumed=await rollingCampaignStore.allocate('native-fixture',rollingGraph.digest,null,true,rollingNativeWorkerSelection);assert.ok(resumed.assignment&&resumed.actionId);
 assert.equal(resumed.assignment.id,first.id);assert.notEqual(resumed.assignment.generation,first.generation);assert.equal(resumed.assignment.sessionId,swarmWorkerBinding.sessionId);
 assert.deepEqual(await swarmStore.bindWorker(swarmWorktreeMembership,{rootPath:hostRoot,threadId:swarmWorkerBinding.threadId,sessionId:swarmWorkerBinding.sessionId},swarmWorkerAssignment,resumed.assignment.generation),swarmWorkerBinding);
 assert.equal((await rollingCampaignStore.status('native-fixture')).assignments[0]?.state,'WORKING');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*) AS count FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,'3');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1',[projectId])).rows[0]?.managed_directory,historicalPool);
 assert.equal(fs.existsSync(historicalPool),false);assert.equal(fs.readFileSync(path.join(hostRoot,'unfinished.txt'),'utf8'),'preserved source');
 assert.ok(git(['worktree','list','--porcelain']).includes(hostRoot));
});
