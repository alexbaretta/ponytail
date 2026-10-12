// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {git} from '../src/rolling-integration.js';
import {prepareRollingMainline,mergeRollingMainline,runRollingPublicationQa,verifyRollingPublicationQa,
 type RollingPublicationBatchClaimV1} from '../src/rolling-publication.js';
import type {RollingArgv} from '../src/rolling-campaign.js';

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree',async testContext=> {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-full-publication-')));
 testContext.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const coordinatorRoot = path.join(root,'coordinator'),remoteRoot = path.join(root,'origin.git'),upstreamRoot = path.join(root,'upstream');
 fs.mkdirSync(coordinatorRoot);execFileSync('git',['init','-q','-b','main',coordinatorRoot]);
 git(coordinatorRoot,['config','user.name','Fixture']);git(coordinatorRoot,['config','user.email','fixture@example.test']);
 fs.writeFileSync(path.join(coordinatorRoot,'.gitignore'),'/node_modules\n/dist/\n/tmp/\n');
 fs.writeFileSync(path.join(coordinatorRoot,'package.json'),JSON.stringify({type:'module'}));
 fs.writeFileSync(path.join(coordinatorRoot,'tsconfig.json'),JSON.stringify({compilerOptions:{module:'NodeNext',moduleResolution:'NodeNext',target:'ES2022',
  strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,noEmit:true,allowImportingTsExtensions:true,types:['node']},include:['*.ts']}));
 fs.writeFileSync(path.join(coordinatorRoot,'value.ts'),'export const value:number = 1;\n');
 fs.writeFileSync(path.join(coordinatorRoot,'upstream.ts'),'export const upstream:number = 0;\n');
 fs.writeFileSync(path.join(coordinatorRoot,'total.ts'),"import {value} from './value.ts';\nimport {upstream} from './upstream.ts';\nexport function total():number {return value+upstream;}\n");
 git(coordinatorRoot,['add','.']);git(coordinatorRoot,['commit','-qm','project base']);
 execFileSync('git',['clone','--bare','-q',coordinatorRoot,remoteRoot]);git(coordinatorRoot,['remote','add','origin',remoteRoot]);
 git(coordinatorRoot,['switch','-c','campaign/fixture']);
 fs.writeFileSync(path.join(coordinatorRoot,'value.ts'),'export const value:number = 2;\n');
 fs.writeFileSync(path.join(coordinatorRoot,'unit.test.ts'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {value} from './value.ts';\ntest('unit value',()=>assert.equal(value,2));\n");
 fs.writeFileSync(path.join(coordinatorRoot,'integration.test.ts'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {total} from './total.ts';\ntest('combined mainline and campaign behavior',()=>assert.equal(total(),11));\n");
 git(coordinatorRoot,['add','.']);git(coordinatorRoot,['commit','-qm','accepted obligation']);
 const campaignRevision = git(coordinatorRoot,['rev-parse','HEAD']).trim();
 fs.writeFileSync(path.join(coordinatorRoot,'next.txt'),'Keep this next increment outside the frozen prefix.\n');
 git(coordinatorRoot,['add','.']);git(coordinatorRoot,['commit','-qm','subsequent accepted increment']);
 const sourceRevision = git(coordinatorRoot,['rev-parse','HEAD']).trim();git(coordinatorRoot,['push','origin','campaign/fixture']);
 execFileSync('git',['clone','-q',remoteRoot,upstreamRoot]);git(upstreamRoot,['config','user.name','Fixture']);git(upstreamRoot,['config','user.email','fixture@example.test']);
 fs.writeFileSync(path.join(upstreamRoot,'upstream.ts'),'export const upstream:number = 9;\n');
 git(upstreamRoot,['add','.']);git(upstreamRoot,['commit','-qm','independent mainline change']);git(upstreamRoot,['push','origin','main']);
 const mainlineRevision = git(upstreamRoot,['rev-parse','HEAD']).trim();
 fs.symlinkSync(path.resolve(__dirname,'../../node_modules'),path.join(coordinatorRoot,'node_modules'),'dir');
 const rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1 = {schemaVersion:1,id:crypto.randomUUID(),campaignId:'fixture',
  rootPath:coordinatorRoot,incrementRef:'campaign/fixture',target:{remote:'origin',branch:'main'},graphDigest:'a'.repeat(64),configurationDigest:'b'.repeat(64),
  publicationSize:1,trigger:'threshold',increments:[{id:crypto.randomUUID(),revision:campaignRevision}],campaignRevision};
 assert.equal(git(coordinatorRoot,['status','--porcelain']),'','fixture must be clean before publication');
 const rollingMainlinePreparationV1 = prepareRollingMainline(rollingPublicationBatchClaimV1);
 assert.equal(rollingMainlinePreparationV1.mainlineRevision,mainlineRevision);assert.equal(rollingMainlinePreparationV1.sourceRevision,sourceRevision);
 const rollingMainlineCandidateV1 = mergeRollingMainline(rollingPublicationBatchClaimV1,rollingMainlinePreparationV1);
 assert.equal(git(coordinatorRoot,['rev-parse','campaign/fixture']).trim(),sourceRevision);
 assert.equal(git(root,['--git-dir',remoteRoot,'rev-parse','campaign/fixture']).trim(),sourceRevision);
 assert.equal(fs.existsSync(path.join(coordinatorRoot,'next.txt')),false);
 const requiredCommands:readonly RollingArgv[] = [[process.execPath,path.resolve(__dirname,'../../node_modules/typescript/bin/tsc'),'--project','tsconfig.json'],
  ['env','-u','NODE_TEST_CONTEXT',process.execPath,'--test','unit.test.ts'],['env','-u','NODE_TEST_CONTEXT',process.execPath,'--test','integration.test.ts']];
 const failedRollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,crypto.randomUUID(),'c'.repeat(64),[['false']]);
 assert.equal(failedRollingPublicationQaV1.outcome,'FAIL');
 assert.throws(()=>verifyRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,failedRollingPublicationQaV1,'c'.repeat(64),requiredCommands),/all required/);
 const passingRollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,crypto.randomUUID(),'c'.repeat(64),requiredCommands);
 assert.equal(passingRollingPublicationQaV1.outcome,'PASS',JSON.stringify(passingRollingPublicationQaV1));
 assert.ok(passingRollingPublicationQaV1.commands[2]?.output.includes('combined mainline and campaign behavior'),passingRollingPublicationQaV1.commands[2]?.output);
 verifyRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,passingRollingPublicationQaV1,'c'.repeat(64),requiredCommands);
 assert.throws(()=>verifyRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,passingRollingPublicationQaV1,'d'.repeat(64),requiredCommands),/stale/);
 assert.throws(()=>verifyRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,{...passingRollingPublicationQaV1,commands:passingRollingPublicationQaV1.commands.slice(0,2)},'c'.repeat(64),requiredCommands),/all required/);
 fs.writeFileSync(path.join(coordinatorRoot,'value.ts'),'export const value:number = 3;\n');
 assert.throws(()=>verifyRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,passingRollingPublicationQaV1,'c'.repeat(64),requiredCommands),/work to preserve/);
 assert.equal(git(root,['--git-dir',remoteRoot,'rev-parse','main']).trim(),mainlineRevision,'QA never pushes the mainline');
});
