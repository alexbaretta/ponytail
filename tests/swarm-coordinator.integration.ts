// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Explicit live acceptance; excluded from the default fixture-only test glob.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {RollingCodex,type RollingNativeThread} from '../src/rolling-codex.js';
import type {RollingProjectConfigV2} from '../src/rolling-campaign.js';
import {readSwarmInfoV4} from '../src/swarm-info.js';

// Traceability: verifies REQ-SWARM-OWNERSHIP
// Traceability: verifies REQ-SWARM-INFO
// Traceability: verifies REQ-SWARM-CLI
test('live original coordinator and worker bind and name through the CLI without acquiring writers',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'swarm-native-')));
 const ownerRoot=path.join(root,'owner');fs.mkdirSync(ownerRoot);
 const home=path.join(root,'home');fs.mkdirSync(home);
 const projectId=crypto.randomUUID();
 const env:NodeJS.ProcessEnv={...process.env,HOME:home,CODEX_HOME:process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),NODE_TEST_CONTEXT:undefined};
 const pool=new Pool(databaseOptions(repositoryRoot));
 let rollingCodex:RollingCodex|null=null;
 let rollingNativeThread:RollingNativeThread|null=null;
 let activeTurnId:string|null=null;
 let rollingNativeWorkerThread:RollingNativeThread|null=null;
 let activeWorkerTurnId:string|null=null;
 t.after(async()=>{
  try {
   if(rollingCodex&&rollingNativeWorkerThread) {
    if(activeWorkerTurnId) {await rollingCodex.interruptTurn(rollingNativeWorkerThread.thread.id,activeWorkerTurnId);await rollingCodex.waitForTurn(rollingNativeWorkerThread.thread.id,activeWorkerTurnId);}
    await rollingCodex.archiveThread(rollingNativeWorkerThread.thread.id);
   }
   if(rollingCodex&&rollingNativeThread) {
    if(activeTurnId) {await rollingCodex.interruptTurn(rollingNativeThread.thread.id,activeTurnId);await rollingCodex.waitForTurn(rollingNativeThread.thread.id,activeTurnId);}
    await rollingCodex.archiveThread(rollingNativeThread.thread.id);
   }
   await pool.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1',[projectId]);
   await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);
   fs.rmSync(root,{recursive:true,force:true});
  } finally {if(rollingCodex) await rollingCodex.close();await pool.end();}
 });
 const git=(args:readonly string[]):string=>execFileSync('git',['-C',ownerRoot,...args],{encoding:'utf8'}).trim();
 git(['init','-q','-b','main']);
 const cli=(args:readonly string[])=>spawnSync(path.join(repositoryRoot,'cli/ponytail'),['swarm',...args],{cwd:ownerRoot,encoding:'utf8',env});
 const registration=spawnSync(path.join(repositoryRoot,'cli/ponytail'),['register'],{cwd:ownerRoot,encoding:'utf8',env});
 assert.equal(registration.status,0,registration.stderr);
 const rollingProjectConfigV2:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},
  managedWorktrees:{directory:path.join(root,'managed'),anchor:'main'},maxActiveWorkers:null,publicationSize:null,
  setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--version']]}};
 fs.mkdirSync(path.join(ownerRoot,'.agents/config/project'),{recursive:true});
 fs.writeFileSync(path.join(ownerRoot,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(ownerRoot,'AGENTS.md'),'This is an isolated native verification checkout. Do not edit files or execute commands.\n');
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(journal!==null&&typeof journal==='object'&&!Array.isArray(journal));
 fs.writeFileSync(path.join(ownerRoot,'ponytail-journal.json'),JSON.stringify({...journal,projectId}));
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const revision=git(['rev-parse','HEAD']);
 await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`swarm-native-${projectId}`]);
 rollingCodex=await RollingCodex.connect({cwd:ownerRoot,executable:'env',argv:['-u','NODE_TEST_CONTEXT','codex','app-server','--listen','stdio://']});
 rollingCodex.on('serverRequest',request=>rollingCodex?.respondToServer(request.id,{decision:'decline'}));
 rollingNativeThread=await rollingCodex.startThread(ownerRoot);
 const rollingTurnStarted=await rollingCodex.startTurn(rollingNativeThread.thread.id,'Reply exactly PONYTAIL_SWARM_NATIVE_READY. Do not use tools or modify files.');
 activeTurnId=rollingTurnStarted.turn.id;
 assert.equal((await rollingCodex.waitForTurn(rollingNativeThread.thread.id,activeTurnId)).status,'completed');activeTurnId=null;
 const bind=cli(['coordinator-bind','--thread',rollingNativeThread.thread.id,'--session',rollingNativeThread.thread.sessionId,'--json']);
 assert.equal(bind.status,0,bind.stderr);
 const bound=readSwarmInfoV4(JSON.parse(bind.stdout));
 assert.deepEqual(bound.coordinator,{kind:'bound',threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId});
 assert.equal((await rollingCodex.readThreadActivity(rollingNativeThread.thread.id)).status,'idle');
 const allocation=cli(['worktree-assign','--base','HEAD','--json']);assert.equal(allocation.status,0,allocation.stderr);
 const allocatedSwarmInfoV4=readSwarmInfoV4(JSON.parse(allocation.stdout));
 const swarmWorktreeInfoV3=allocatedSwarmInfoV4.worktrees[0];assert.ok(swarmWorktreeInfoV3&&swarmWorktreeInfoV3.membership.kind==='swarm');
 rollingNativeWorkerThread=await rollingCodex.startThread(swarmWorktreeInfoV3.rootPath);
 const workerTurnStarted=await rollingCodex.startTurn(rollingNativeWorkerThread.thread.id,'Reply exactly PONYTAIL_SWARM_WORKER_READY. Do not use tools or modify files.');
 activeWorkerTurnId=workerTurnStarted.turn.id;assert.equal((await rollingCodex.waitForTurn(rollingNativeWorkerThread.thread.id,activeWorkerTurnId)).status,'completed');activeWorkerTurnId=null;
 const workerBind=cli(['worker-bind','--thread',rollingNativeWorkerThread.thread.id,'--session',rollingNativeWorkerThread.thread.sessionId,
  '--number',String(swarmWorktreeInfoV3.number),'--generation',swarmWorktreeInfoV3.membership.generation,'--kind','plan','--assignment','native-worker-acceptance','--summary','Verify original worker','--json']);
 assert.equal(workerBind.status,0,workerBind.stderr);
 const workerSwarmInfoV4=readSwarmInfoV4(JSON.parse(workerBind.stdout));const swarmWorkerInfoV1=workerSwarmInfoV4.workers[0];assert.ok(swarmWorkerInfoV1);
 assert.equal(swarmWorkerInfoV1.binding.sessionId,rollingNativeWorkerThread.thread.sessionId);assert.equal(swarmWorkerInfoV1.binding.rootPath,swarmWorktreeInfoV3.rootPath);
 assert.equal(swarmWorkerInfoV1.desiredName,'W1 P1 Verify original worker');assert.ok(swarmWorkerInfoV1.nativeObservation.kind==='observed');assert.equal(swarmWorkerInfoV1.nativeObservation.name,swarmWorkerInfoV1.desiredName);
 assert.equal((await rollingCodex.readThreadActivity(rollingNativeWorkerThread.thread.id)).status,'idle');
 assert.equal(await rollingCodex.isThreadArchived(rollingNativeWorkerThread.thread.id,swarmWorktreeInfoV3.rootPath),false);
 const unbind=cli(['coordinator-unbind','--session',rollingNativeThread.thread.sessionId,'--json']);
 assert.equal(unbind.status,0,unbind.stderr);assert.deepEqual(readSwarmInfoV4(JSON.parse(unbind.stdout)).coordinator,{kind:'unbound'});
 assert.equal(await rollingCodex.isThreadArchived(rollingNativeThread.thread.id,ownerRoot),false);
 assert.equal(git(['rev-parse','HEAD']),revision);assert.equal(git(['status','--porcelain']),'');
 t.diagnostic(`native coordinator thread=${rollingNativeThread.thread.id}; session=${rollingNativeThread.thread.sessionId}; original writers retained; CLI coordinator bind/unbind and worker bind/name preserved sessions and source`);
});
