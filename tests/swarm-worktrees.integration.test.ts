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
import {inspectSwarmInfo} from '../src/swarm-info.js';
import {SwarmStore} from '../src/swarm-store.js';
import type {SwarmUserWorktree} from '../src/swarm-owner.js';
import {resetRollingProject,type RollingResetRequestV1} from '../src/rolling-reset.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';

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
 const claims=await Promise.all([swarmStore.claimExistingWorktree(mainRoot),swarmStore.claimExistingWorktree(otherRoot)]);
 assert.equal(claims.filter(claim=>claim!==null).length,1);
 const swarmWorktreeMembership=claims.find(claim=>claim!==null);assert.ok(swarmWorktreeMembership);
 assert.equal(swarmWorktreeMembership.number,101);assert.equal(swarmWorktreeMembership.rootPath,checkout101);
 assert.ok(swarmWorktreeMembership.ownerRoot===mainRoot||swarmWorktreeMembership.ownerRoot===otherRoot);
 const swarmInfoV3=await inspectSwarmInfo(swarmWorktreeMembership.ownerRoot,pool,projectId);
 assert.equal(swarmInfoV3.schemaVersion,3);assert.equal(swarmInfoV3.worktrees.length,1);
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
 await assert.rejects(swarmStore.claimExistingWorktree(mainRoot),/active Git operation/);
 execFileSync('git',['-C',checkout102,'rebase','--abort'],{stdio:'pipe'});
 fs.writeFileSync(path.join(checkout102,'session_id.txt'),'retained-session\n');
 await assert.rejects(swarmStore.claimExistingWorktree(mainRoot),/session marker/);
 fs.unlinkSync(path.join(checkout102,'session_id.txt'));
 fs.writeFileSync(path.join(checkout102,'unfinished.txt'),'preserve this work');
 await assert.rejects(swarmStore.claimExistingWorktree(mainRoot),/uncommitted work/);
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
 const transferredSwarmWorktreeMembership=await swarmStore.claimExistingWorktree(newOwner);assert.ok(transferredSwarmWorktreeMembership);
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
});
