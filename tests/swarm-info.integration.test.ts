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
import {inspectSwarmInfo,readSwarmInfoV1} from '../src/swarm-info.js';

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
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const userRoot=path.join(root,'user-001'),siblingRoot=path.join(root,'user-002'),managedRoot=path.join(root,'managed/101'),unassignedRoot=path.join(root,'managed/102');
 const checkouts:readonly (readonly [string,string])[]=[['user-one',userRoot],['user-two',siblingRoot],['worker-one',managedRoot],['worker-two',unassignedRoot]];
 for(const [branch,checkout] of checkouts) {
  assert.ok(branch&&checkout);git(['worktree','add','-q','-b',branch,checkout]);
 }
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 for(const checkout of [mainRoot,userRoot,siblingRoot,managedRoot,unassignedRoot]) fs.writeFileSync(path.join(checkout,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
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
 assert.equal(ownerInfo.worktrees[0]?.sessionId,sessionId);
 assert.equal((await inspectSwarmInfo(siblingRoot,pool,projectId)).worktrees.length,0);
 assert.equal((await inspectSwarmInfo(mainRoot,pool,projectId)).worktrees.length,0);
 await assert.rejects(inspectSwarmInfo(unassignedRoot,pool,projectId),/unassigned/);
 const cli=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','info','--json'],{cwd:managedRoot,encoding:'utf8',env});
 assert.equal(cli.status,0,cli.stderr);assert.deepEqual(readSwarmInfoV1(JSON.parse(cli.stdout)),ownerInfo);
 const invalid=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm','bad-command'],{cwd:userRoot,encoding:'utf8',env});
 assert.equal(invalid.status,2);assert.match(invalid.stderr,/Usage: ponytail swarm/);
 fs.rmSync(managedRoot,{recursive:true,force:true});
 assert.equal((await inspectSwarmInfo(userRoot,pool,projectId)).worktrees[0]?.present,false);
 assert.deepEqual((await pool.query<Record<string,unknown>>('SELECT assignment_id,state,generation,xmin::text AS version FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1',[projectId])).rows,before);
});
