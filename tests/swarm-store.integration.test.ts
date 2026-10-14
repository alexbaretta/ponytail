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
import {SwarmStore} from '../src/swarm-store.js';
import type {SwarmUserWorktree} from '../src/swarm-owner.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';

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
 await assert.rejects(swarmStore.enrollOwner(managedSwarmUserWorktree),/managed checkout/);
 const candidates=['coordinator-one','coordinator-two'];
 const results=await Promise.allSettled(candidates.map(sessionId=>swarmStore.bindCoordinator(mainRoot,sessionId)));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 const swarmCoordinatorBinding=await swarmStore.coordinatorBinding(mainRoot);assert.ok(swarmCoordinatorBinding?.sessionId);
 const sessionId=swarmCoordinatorBinding.sessionId;
 assert.deepEqual(await swarmStore.bindCoordinator(mainRoot,sessionId),swarmCoordinatorBinding);
 await assert.rejects(swarmStore.bindCoordinator(otherRoot,sessionId),/unique constraint/);
 assert.equal((await swarmStore.bindCoordinator(otherRoot,'independent-coordinator')).sessionId,'independent-coordinator');
 await assert.rejects(swarmStore.unbindCoordinator(mainRoot,'stale-coordinator'),/binding changed/);
 assert.equal((await swarmStore.unbindCoordinator(mainRoot,sessionId)).sessionId,null);
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state,session_id FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1',[assignmentId])).rows[0]?.session_id,'worker-session');
 assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1',[projectId])).rows[0]?.state,'ACTIVE');
 assert.equal((await swarmStore.bindCoordinator(mainRoot,'successor')).sessionId,'successor');
 assert.equal((await swarmStore.coordinatorBinding(otherRoot))?.sessionId,'independent-coordinator');
 await assert.rejects(swarmStore.bindCoordinator(mainRoot,' '),/nonempty/);
 const movedRoot=path.join(root,'temporarily-moved');fs.renameSync(mainRoot,movedRoot);
 try {
  await assert.rejects(swarmStore.bindCoordinator(mainRoot,'successor'),/ENOENT/);
  const foreignRoot=path.join(root,'foreign');fs.mkdirSync(foreignRoot);
  execFileSync('git',['-C',foreignRoot,'init','-q','-b','replacement']);
  execFileSync('git',['-C',foreignRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--allow-empty','-qm','foreign']);
  execFileSync('git',['-C',foreignRoot,'worktree','add','-q','-b','replacement-worker',mainRoot]);
  await assert.rejects(swarmStore.bindCoordinator(mainRoot,'successor'),/canonical physical Git checkout/);
 } finally {fs.rmSync(mainRoot,{recursive:true,force:true});fs.renameSync(movedRoot,mainRoot);}
 assert.equal((await swarmStore.coordinatorBinding(mainRoot))?.sessionId,'successor');
});
