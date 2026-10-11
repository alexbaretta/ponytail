// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import test,{type TestContext} from 'node:test';
import {fastRebaseRollingIncrement,continueFastRebaseRollingIncrement,publishRollingIncrement,reconcileRollingIncrementPublication,type RollingReviewedIncrement} from '../src/rolling-integration.js';

interface RollingIntegrationFixture {
 readonly root: string;
 readonly coordinatorRoot: string;
 readonly rollingReviewedIncrement: RollingReviewedIncrement;
}
function git(rootPath: string,argv: readonly string[]): string {
 return execFileSync('git',['-C',rootPath,'-c','user.name=Fixture','-c','user.email=fixture@example.test','-c','commit.gpgsign=false',...argv],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
function fixture(testContext: TestContext,conflict: boolean): RollingIntegrationFixture {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-increment-')));
 testContext.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const coordinatorRoot = path.join(root,'coordinator');
 const remoteRoot = path.join(root,'origin.git');
 const workerRoot = path.join(root,'worker');
 fs.mkdirSync(coordinatorRoot);
 git(root,['init','--bare','--initial-branch=main',remoteRoot]);
 git(coordinatorRoot,['init','--initial-branch=main']);
 fs.writeFileSync(path.join(coordinatorRoot,'value.ts'),'export const value: number = 1;\n');
 git(coordinatorRoot,['add','.']);git(coordinatorRoot,['commit','-m','Base']);
 git(coordinatorRoot,['remote','add','origin',remoteRoot]);git(coordinatorRoot,['push','origin','main']);
 const baseCommit = git(coordinatorRoot,['rev-parse','HEAD']);
 git(root,['clone',remoteRoot,workerRoot]);git(workerRoot,['switch','-c','worker']);
 // Rebase needs the fixture's own committer identity, including clean replay.
 git(workerRoot,['config','user.name','Fixture']);git(workerRoot,['config','user.email','fixture@example.test']);
 fs.writeFileSync(path.join(workerRoot,conflict ? 'value.ts' : 'obligation.txt'),conflict ? 'export const value: number = 2;\n' : 'Reviewed obligation\n');
 git(workerRoot,['add','.']);git(workerRoot,['commit','-m','Reviewed candidate']);
 if (!conflict) {
  git(workerRoot,['branch','retained-other-worker']);
  git(workerRoot,['config','rebase.updateRefs','true']);
  git(workerRoot,['config','rebase.autoSquash','true']);
  fs.appendFileSync(path.join(workerRoot,'obligation.txt'),'Second implementation step\n');
  git(workerRoot,['add','.']);git(workerRoot,['commit','-m','fixup! Reviewed candidate']);
 }
 const revision = git(workerRoot,['rev-parse','HEAD']);
 fs.writeFileSync(path.join(coordinatorRoot,conflict ? 'value.ts' : 'upstream.txt'),conflict ? 'export const value: number = 1; // upstream context\n' : 'Independent upstream increment\n');
 git(coordinatorRoot,['add','.']);git(coordinatorRoot,['commit','-m','Upstream increment']);git(coordinatorRoot,['push','origin','main']);
 return {root,coordinatorRoot,rollingReviewedIncrement:{rootPath:workerRoot,target:{remote:'origin',branch:'main'},revision,baseCommit}};
}

// Traceability: verifies REQ-ROLLING-REVIEW
test('fast integration interactively rebases clean commits and requests fresh proof on the new base',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const retainedRevision = git(rollingReviewedIncrement.rootPath,['rev-parse','retained-other-worker']);
 const rollingFastRebaseResult = fastRebaseRollingIncrement(rollingReviewedIncrement);
 assert.equal(rollingFastRebaseResult.state,'REBASED');assert.ok(rollingFastRebaseResult.state === 'REBASED');
 assert.equal(rollingFastRebaseResult.integrationBase,git(rollingIntegrationFixture.coordinatorRoot,['rev-parse','HEAD']));
 assert.notEqual(rollingFastRebaseResult.revision,rollingReviewedIncrement.revision);
 assert.equal(rollingFastRebaseResult.proofRefreshRequired,true);
 assert.equal(fs.readFileSync(path.join(rollingReviewedIncrement.rootPath,'upstream.txt'),'utf8'),'Independent upstream increment\n');
 assert.equal(fs.readFileSync(path.join(rollingReviewedIncrement.rootPath,'obligation.txt'),'utf8'),'Reviewed obligation\nSecond implementation step\n');
 assert.equal(git(rollingReviewedIncrement.rootPath,['rev-parse','retained-other-worker']),retainedRevision);
 assert.equal(git(rollingReviewedIncrement.rootPath,['rev-list','--count',`${rollingFastRebaseResult.integrationBase}..HEAD`]),'2');
 assert.equal(git(rollingReviewedIncrement.rootPath,['status','--porcelain']),'');
});

// Traceability: verifies REQ-ROLLING-REVIEW
test('fast integration retains textual conflicts for semantic review and does not reset the worker checkout',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,true);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const rollingFastRebaseResult = fastRebaseRollingIncrement(rollingReviewedIncrement);
 assert.equal(rollingFastRebaseResult.state,'TEXTUAL_CONFLICT');assert.ok(rollingFastRebaseResult.state === 'TEXTUAL_CONFLICT');
 assert.deepEqual(rollingFastRebaseResult.conflictedPaths,['value.ts']);
 assert.equal(rollingFastRebaseResult.reviewedRevision,rollingReviewedIncrement.revision);
 assert.ok(fs.readFileSync(path.join(rollingReviewedIncrement.rootPath,'value.ts'),'utf8').includes('<<<<<<<'));
 assert.ok(fs.existsSync(git(rollingReviewedIncrement.rootPath,['rev-parse','--path-format=absolute','--git-path','rebase-merge'])));
 assert.ok(fs.existsSync(git(rollingReviewedIncrement.rootPath,['rev-parse','--path-format=absolute','--git-path','rebase-merge/interactive'])));
 assert.throws(()=>continueFastRebaseRollingIncrement(rollingReviewedIncrement.rootPath,rollingFastRebaseResult,
  {originalCommit:rollingFastRebaseResult.originalCommit,reference:''}),/recorded semantic inspection/);
 fs.writeFileSync(path.join(rollingReviewedIncrement.rootPath,'value.ts'),'export const value: number = 2; // upstream context\n');
 git(rollingReviewedIncrement.rootPath,['add','value.ts']);
 assert.throws(()=>continueFastRebaseRollingIncrement(rollingReviewedIncrement.rootPath,rollingFastRebaseResult,
  {originalCommit:rollingFastRebaseResult.integrationBase,reference:'inspection-wrong-commit'}),/current conflicting commit/);
 const continuedRollingFastRebaseResult = continueFastRebaseRollingIncrement(rollingReviewedIncrement.rootPath,rollingFastRebaseResult,
  {originalCommit:rollingFastRebaseResult.originalCommit,reference:'inspection-preserves-reviewed-value-and-upstream-context'});
 assert.equal(continuedRollingFastRebaseResult.state,'REBASED');
 assert.equal(fs.readFileSync(path.join(rollingReviewedIncrement.rootPath,'value.ts'),'utf8'),'export const value: number = 2; // upstream context\n');
 assert.equal(git(rollingReviewedIncrement.rootPath,['status','--porcelain']),'');
});

// Traceability: verifies REQ-ROLLING-REVIEW
test('fast integration refuses a changed checkout before fetching or replaying',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 fs.writeFileSync(path.join(rollingReviewedIncrement.rootPath,'unfinished.txt'),'Preserve worker changes\n');
 assert.throws(()=>fastRebaseRollingIncrement(rollingReviewedIncrement),/stopped clean reviewed checkout/);
 assert.equal(git(rollingReviewedIncrement.rootPath,['rev-parse','HEAD']),rollingReviewedIncrement.revision);
 assert.equal(fs.readFileSync(path.join(rollingReviewedIncrement.rootPath,'unfinished.txt'),'utf8'),'Preserve worker changes\n');
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('normal increment push establishes containment and repeated reconciliation does not push again',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const rollingFastRebaseResult = fastRebaseRollingIncrement(rollingReviewedIncrement);
 assert.ok(rollingFastRebaseResult.state === 'REBASED');
 const rollingIncrementPublication = {rootPath:rollingReviewedIncrement.rootPath,target:rollingReviewedIncrement.target,
  revision:rollingFastRebaseResult.revision};
 const rollingIncrementPublicationResult = publishRollingIncrement(rollingIncrementPublication);
 assert.equal(rollingIncrementPublicationResult.state,'PUBLISHED');
 assert.ok(rollingIncrementPublicationResult.state === 'PUBLISHED');
 assert.equal(rollingIncrementPublicationResult.remoteRevision,rollingFastRebaseResult.revision);
 const remoteRoot = path.join(rollingIntegrationFixture.root,'origin.git');
 fs.writeFileSync(path.join(remoteRoot,'hooks','pre-receive'),'#!/bin/sh\nexit 1\n',{mode:0o755});
 assert.deepEqual(publishRollingIncrement(rollingIncrementPublication),rollingIncrementPublicationResult);
 assert.deepEqual(reconcileRollingIncrementPublication(rollingIncrementPublication),rollingIncrementPublicationResult);
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('upstream divergence requests another rebase and preserves both revisions',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const rollingIncrementPublicationResult = publishRollingIncrement({rootPath:rollingReviewedIncrement.rootPath,
  target:rollingReviewedIncrement.target,revision:rollingReviewedIncrement.revision});
 assert.equal(rollingIncrementPublicationResult.state,'REBASE_REQUIRED');
 assert.equal(git(rollingReviewedIncrement.rootPath,['rev-parse','HEAD']),rollingReviewedIncrement.revision);
 assert.equal(git(path.join(rollingIntegrationFixture.root,'origin.git'),['rev-parse','main']),
  git(rollingIntegrationFixture.coordinatorRoot,['rev-parse','HEAD']));
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('rejected push does not claim delivery and can be retried after rejection clears',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const rollingFastRebaseResult = fastRebaseRollingIncrement(rollingReviewedIncrement);
 assert.ok(rollingFastRebaseResult.state === 'REBASED');
 const rollingIncrementPublication = {rootPath:rollingReviewedIncrement.rootPath,target:rollingReviewedIncrement.target,
  revision:rollingFastRebaseResult.revision};
 const hook = path.join(rollingIntegrationFixture.root,'origin.git','hooks','pre-receive');
 fs.writeFileSync(hook,'#!/bin/sh\necho "fixture rejection" >&2\nexit 1\n',{mode:0o755});
 const rollingIncrementPublicationResult = publishRollingIncrement(rollingIncrementPublication);
 assert.equal(rollingIncrementPublicationResult.state,'UNCONFIRMED');
 assert.equal(git(rollingReviewedIncrement.rootPath,['rev-parse','HEAD']),rollingFastRebaseResult.revision);
 fs.rmSync(hook);
 assert.equal(publishRollingIncrement(rollingIncrementPublication).state,'PUBLISHED');
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('lost remote observation remains unconfirmed until actual containment can be read',testContext=> {
 const rollingIntegrationFixture = fixture(testContext,false);
 const rollingReviewedIncrement = rollingIntegrationFixture.rollingReviewedIncrement;
 const rollingFastRebaseResult = fastRebaseRollingIncrement(rollingReviewedIncrement);
 assert.ok(rollingFastRebaseResult.state === 'REBASED');
 const rollingIncrementPublication = {rootPath:rollingReviewedIncrement.rootPath,target:rollingReviewedIncrement.target,
  revision:rollingFastRebaseResult.revision};
 assert.equal(publishRollingIncrement(rollingIncrementPublication).state,'PUBLISHED');
 const remoteRoot = path.join(rollingIntegrationFixture.root,'origin.git');
 const unavailableRemoteRoot = path.join(rollingIntegrationFixture.root,'unavailable.git');
 fs.renameSync(remoteRoot,unavailableRemoteRoot);
 assert.equal(reconcileRollingIncrementPublication(rollingIncrementPublication).state,'UNCONFIRMED');
 fs.renameSync(unavailableRemoteRoot,remoteRoot);
 assert.equal(reconcileRollingIncrementPublication(rollingIncrementPublication).state,'PUBLISHED');
});
