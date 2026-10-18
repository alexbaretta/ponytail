// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import test,{type TestContext} from 'node:test';
import {runValidation,readValidationTag,listValidationTags,inspectValidationTag,revokeValidationTag} from '../src/validation-run.js';
import type {ValidationRequestV1,ValidationCommand} from '../src/validation-certificate.js';

function git(root: string, args: readonly string[]): string {
 return execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
}
function fixture(testContext: TestContext): string {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'validation-run-')));
 testContext.after(() => fs.rmSync(root,{recursive:true,force:true}));
 git(root,['init','-q']);git(root,['config','user.name','Fixture']);git(root,['config','user.email','fixture@example.test']);
 fs.writeFileSync(path.join(root,'source.txt'),'original\n');
 git(root,['add','.']);git(root,['commit','-qm','fixture']);
 return root;
}
function request(root: string, commands: readonly ValidationCommand[] = [{argv:[process.execPath,'-e','console.log("proof output")'],testIds:['TEST-A']}]): ValidationRequestV1 {
 const candidate = git(root,['rev-parse','HEAD']);
 return {schemaVersion:1,campaignId:'campaign-a',candidate,purpose:'focused',coveredIds:['OBL-A','ACC-A','TEST-A'],commands,
  reviews:[{reviewer:'review-session',candidate,coveredIds:['OBL-A','ACC-A','TEST-A'],verdict:'adequate',reference:'host-review:1'}],recordFailure:false};
}

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-REAL-TAGS
test('real validation publishes distinct annotated tags without source, index or HEAD changes', async testContext => {
 const root = fixture(testContext);
 const validationRequestV1: ValidationRequestV1 = request(root);
 const before = git(root,['ls-files','--stage']);
 const firstValidationRun = await runValidation(root,validationRequestV1);
 const secondValidationRun = await runValidation(root,validationRequestV1);
 assert.equal(firstValidationRun.outcome,'passed');
 assert.ok(firstValidationRun.tag && secondValidationRun.tag);
 assert.notEqual(firstValidationRun.tag.name,secondValidationRun.tag.name);
 assert.deepEqual(readValidationTag(root,firstValidationRun.tag.name),firstValidationRun.tag);
 assert.equal(listValidationTags(root,'campaign-a').length,2);
 assert.deepEqual(listValidationTags(root,'other'),[]);
 assert.match(fs.readFileSync(path.join(firstValidationRun.outputDirectory,'1.log'),'utf8'),/proof output/);
 assert.ok(firstValidationRun.outputDirectory.startsWith(path.join(root,'.git')+path.sep));
 assert.equal(git(root,['status','--porcelain']), '');
 assert.equal(git(root,['ls-files','--stage']),before);
 assert.equal(git(root,['rev-parse','HEAD']),validationRequestV1.candidate);
 assert.equal(fs.readFileSync(path.join(root,'source.txt'),'utf8'),'original\n');
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-FAILURES
test('failures and missing executables are observed; failed tags require explicit opt-in', async testContext => {
 const root = fixture(testContext);
 const validationRequestV1: ValidationRequestV1 = request(root,[
  {argv:[process.execPath,'-e','process.exit(7)'],testIds:['TEST-A']},
  {argv:[process.execPath,'-e','console.log("remaining suite ran")'],testIds:[]},
 ]);
 const unrecordedValidationRun = await runValidation(root,validationRequestV1);
 assert.equal(unrecordedValidationRun.outcome,'failed');assert.equal(unrecordedValidationRun.tag,null);
 assert.deepEqual(unrecordedValidationRun.results.map(result => result.termination),[{kind:'exit',code:7},{kind:'exit',code:0}]);
 assert.deepEqual(listValidationTags(root,'campaign-a'),[]);
 const recordedValidationRun = await runValidation(root,{...validationRequestV1,recordFailure:true});
 assert.equal(recordedValidationRun.tag?.certificate.outcome,'failed');
 const missingValidationRun = await runValidation(root,request(root,[{argv:[path.join(root,'missing-program')],testIds:['TEST-A']}]));
 assert.equal(missingValidationRun.outcome,'failed');assert.equal(missingValidationRun.results[0]?.termination.kind,'error');
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-FRESHNESS
test('validation rejects dirty, hidden and moved inputs and preserves the changed files for repair', async testContext => {
 const root = fixture(testContext);
 const validationRequestV1: ValidationRequestV1 = request(root);
 fs.writeFileSync(path.join(root,'source.txt'),'changed\n');
 await assert.rejects(runValidation(root,validationRequestV1),/clean index/);
 git(root,['update-index','--assume-unchanged','source.txt']);
 await assert.rejects(runValidation(root,validationRequestV1),/hidden/);
 git(root,['update-index','--no-assume-unchanged','source.txt']);git(root,['restore','source.txt']);
 fs.writeFileSync(path.join(root,'untracked.txt'),'new source');
 await assert.rejects(runValidation(root,validationRequestV1),/clean index/);fs.unlinkSync(path.join(root,'untracked.txt'));
 const mutationValidationRequestV1: ValidationRequestV1 = request(root,[{argv:[process.execPath,'-e','require("node:fs").writeFileSync("source.txt","changed by validation")'],testIds:['TEST-A']}]);
 await assert.rejects(runValidation(root,mutationValidationRequestV1),/clean index/);
 assert.equal(fs.readFileSync(path.join(root,'source.txt'),'utf8'),'changed by validation');
 assert.deepEqual(listValidationTags(root,'campaign-a'),[]);
 git(root,['restore','source.txt']);git(root,['commit','--allow-empty','-qm','moved']);
 await assert.rejects(runValidation(root,validationRequestV1),/current HEAD/);
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-CANCEL
test('cancellation terminates the owned process group and never certifies an exit-zero handler', async testContext => {
 const root = fixture(testContext);
 const abortController = new AbortController();
 const validationRequestV1: ValidationRequestV1 = request(root,[{argv:[process.execPath,'-e',`
 const fs = require('node:fs');
 const child = require('node:child_process').spawn(process.execPath,['-e','setInterval(() => {}, 1000)'],{stdio:'ignore'});
 process.on('SIGTERM',() => process.exit(0));
 fs.writeFileSync('.git/ready',String(child.pid));
 setInterval(() => {},1000);
 `],testIds:['TEST-A']},{argv:[process.execPath,'-e','require("node:fs").writeFileSync(".git/unexpected","ran")'],testIds:[]}]);
 const pending = runValidation(root,validationRequestV1,abortController.signal);
 testContext.after(() => abortController.abort());
 for (let attempt=0; attempt<500 && !fs.existsSync(path.join(root,'.git/ready'));attempt++) await delay(10);
 assert.ok(fs.existsSync(path.join(root,'.git/ready')),'command must reach its readiness point');
 const childPid = Number(fs.readFileSync(path.join(root,'.git/ready'),'utf8'));
 abortController.abort();
 const validationRun = await pending;
 assert.equal(validationRun.outcome,'cancelled');assert.equal(validationRun.tag,null);
 assert.equal(validationRun.results[0]?.termination.kind,'exit');
 assert.equal(validationRun.results[1]?.termination.kind,'not-run');
 assert.equal(fs.existsSync(path.join(root,'.git/unexpected')),false);
 assert.deepEqual(listValidationTags(root,'campaign-a'),[]);
 assert.throws(() => process.kill(childPid,0),/ESRCH/);
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-TAG-IDENTITY
test('tag readers reject lightweight tags and payloads bound to another commit', async testContext => {
 const root = fixture(testContext);
 const validationRun = await runValidation(root,request(root));
 assert.ok(validationRun.tag);
 const originalName = validationRun.tag.name;
 git(root,['tag','-f',originalName]);
 assert.throws(() => readValidationTag(root,originalName),/annotated tag/);
 git(root,['commit','--allow-empty','-qm','another candidate']);
 git(root,['tag','-a','-f',originalName,'-m',JSON.stringify(validationRun.tag.certificate)]);
 assert.throws(() => readValidationTag(root,originalName),/identity disagree/);
 assert.throws(() => readValidationTag(root,'../../HEAD'),/Invalid validation tag name/);
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-REVOCATION
test('revocation preserves the original and ordinary reads reject it while corrected runs remain usable', async testContext => {
 const root = fixture(testContext);
 const validationRequestV1: ValidationRequestV1 = request(root);
 const originalValidationRun = await runValidation(root,validationRequestV1);
 assert.ok(originalValidationRun.tag);
 const validationRevocationTag = revokeValidationTag(root,originalValidationRun.tag.name,'Review found an unverified assertion');
 assert.equal(validationRevocationTag.revocation.revokedObjectId,originalValidationRun.tag.objectId);
 assert.equal(git(root,['rev-parse',`refs/tags/${originalValidationRun.tag.name}`]),originalValidationRun.tag.objectId);
 assert.throws(() => { assert.ok(originalValidationRun.tag); return readValidationTag(root,originalValidationRun.tag.name); },/revoked/);
 const validationTagInspection = inspectValidationTag(root,originalValidationRun.tag.name);
 assert.deepEqual(validationTagInspection.tag,originalValidationRun.tag);
 assert.deepEqual(validationTagInspection.revocations,[validationRevocationTag]);
 const correctedValidationRun = await runValidation(root,validationRequestV1);
 assert.ok(correctedValidationRun.tag);
 assert.deepEqual(readValidationTag(root,correctedValidationRun.tag.name),correctedValidationRun.tag);
 const inspections = listValidationTags(root,'campaign-a');
 assert.equal(inspections.length,2);
 assert.equal(inspections.filter(inspection => inspection.revocations.length > 0).length,1);
 assert.equal(git(root,['rev-parse','HEAD']),validationRequestV1.candidate);
 assert.equal(git(root,['status','--porcelain']),'');
});

// Traceability: verifies ACC-CM-CERTIFICATES from integration-test TEST-CM-VALIDATION-REVOCATION-IDENTITY
test('forged revocations cannot bind another target or a replaced certificate object', async testContext => {
 const root = fixture(testContext);
 const validationRun = await runValidation(root,request(root));
 assert.ok(validationRun.tag);
 const validationRevocationTag = revokeValidationTag(root,validationRun.tag.name,'Incorrect selected tests');
 git(root,['commit','--allow-empty','-qm','later revision']);
 git(root,['tag','-a','-f',validationRevocationTag.name,'-m',JSON.stringify(validationRevocationTag.revocation)]);
 assert.throws(() => { assert.ok(validationRun.tag); return inspectValidationTag(root,validationRun.tag.name); },/identity disagree/);
 git(root,['tag','-a','-f',validationRevocationTag.name,validationRun.tag.certificate.request.candidate,'-m',JSON.stringify({...validationRevocationTag.revocation,revokedObjectId:'b'.repeat(40)})]);
 assert.throws(() => { assert.ok(validationRun.tag); return inspectValidationTag(root,validationRun.tag.name); },/original certificate object/);
});
