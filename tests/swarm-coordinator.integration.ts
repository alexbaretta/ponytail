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
import {readSwarmInfoV2} from '../src/swarm-info.js';

// Traceability: verifies REQ-SWARM-OWNERSHIP
// Traceability: verifies REQ-SWARM-INFO
// Traceability: verifies REQ-SWARM-CLI
test('live native coordinator binds through the real CLI without acquiring its original writer',async t=>{
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
 t.after(async()=>{
  try {
   if(rollingCodex&&rollingNativeThread) {
    if(activeTurnId) {await rollingCodex.interruptTurn(rollingNativeThread.thread.id,activeTurnId);await rollingCodex.waitForTurn(rollingNativeThread.thread.id,activeTurnId);}
    await rollingCodex.archiveThread(rollingNativeThread.thread.id);
   }
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
 const bound=readSwarmInfoV2(JSON.parse(bind.stdout));
 assert.deepEqual(bound.coordinator,{kind:'bound',threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId});
 assert.equal((await rollingCodex.readThreadActivity(rollingNativeThread.thread.id)).status,'idle');
 const unbind=cli(['coordinator-unbind','--session',rollingNativeThread.thread.sessionId,'--json']);
 assert.equal(unbind.status,0,unbind.stderr);assert.deepEqual(readSwarmInfoV2(JSON.parse(unbind.stdout)).coordinator,{kind:'unbound'});
 assert.equal(await rollingCodex.isThreadArchived(rollingNativeThread.thread.id,ownerRoot),false);
 assert.equal(git(['rev-parse','HEAD']),revision);assert.equal(git(['status','--porcelain']),'');
 t.diagnostic(`native coordinator thread=${rollingNativeThread.thread.id}; session=${rollingNativeThread.thread.sessionId}; original writer retained; CLI bind/unbind preserved session and source`);
});
