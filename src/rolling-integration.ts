// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import {spawnSync,type SpawnSyncReturns} from 'node:child_process';

export interface RollingIncrementTarget {
 readonly remote: string;
 readonly branch: string;
}
export interface RollingReviewedIncrement {
 readonly rootPath: string;
 readonly target: RollingIncrementTarget;
 readonly revision: string;
 readonly baseCommit: string;
}
interface RollingFastRebaseIdentity {
 readonly reviewedRevision: string;
 readonly reviewedBase: string;
 readonly integrationBase: string;
}
export interface RollingFastRebaseReady extends RollingFastRebaseIdentity {
 readonly state: 'REBASED';
 readonly revision: string;
 readonly proofRefreshRequired: boolean;
}
export interface RollingFastRebaseConflict extends RollingFastRebaseIdentity {
 readonly state: 'TEXTUAL_CONFLICT';
 readonly originalCommit: string;
 readonly conflictedPaths: readonly string[];
}
export interface RollingIncrementConflictInspection {
 readonly originalCommit: string;
 readonly reference: string;
}
// Discriminator: state
export type RollingFastRebaseResult = RollingFastRebaseReady | RollingFastRebaseConflict;

function requireIntegration(condition: unknown,message: string): asserts condition {
 if (!condition) throw new Error(`rolling integration: ${message}`);
}

function gitResult(rootPath: string,argv: readonly string[],processEnv: NodeJS.ProcessEnv = {...process.env,GIT_TERMINAL_PROMPT:'0'}): SpawnSyncReturns<string> {
 const spawnSyncReturns = spawnSync('git',['-C',rootPath,...argv],{encoding:'utf8',env:processEnv});
 if (spawnSyncReturns.error) throw spawnSyncReturns.error;
 return spawnSyncReturns;
}

function git(rootPath: string,argv: readonly string[]): string {
 const spawnSyncReturns = gitResult(rootPath,argv);
 requireIntegration(spawnSyncReturns.status === 0,spawnSyncReturns.stderr.trim() || `git ${argv[0]} failed`);
 return spawnSyncReturns.stdout;
}

function commit(value: string): string {
 requireIntegration(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value),'invalid commit identity');
 return value;
}

function rebaseResult(rootPath: string,rollingFastRebaseIdentity: RollingFastRebaseIdentity,
 spawnSyncReturns: SpawnSyncReturns<string>): RollingFastRebaseResult {
 if (spawnSyncReturns.status !== 0) {
  const conflictedPaths = git(rootPath,['diff','--name-only','--diff-filter=U','-z']).split('\0').filter(value=>value.length>0);
  requireIntegration(conflictedPaths.length > 0,spawnSyncReturns.stderr.trim() || 'interactive rebase failed without textual conflicts');
  return {...rollingFastRebaseIdentity,state:'TEXTUAL_CONFLICT',
   originalCommit:commit(git(rootPath,['rev-parse','REBASE_HEAD']).trim()),conflictedPaths};
 }
 const revision = commit(git(rootPath,['rev-parse','HEAD']).trim());
 git(rootPath,['merge-base','--is-ancestor',rollingFastRebaseIdentity.integrationBase,revision]);
 requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,'rebased checkout is not clean');
 return {...rollingFastRebaseIdentity,state:'REBASED',revision,
  proofRefreshRequired:revision !== rollingFastRebaseIdentity.reviewedRevision
   || rollingFastRebaseIdentity.integrationBase !== rollingFastRebaseIdentity.reviewedBase};
}

// Traceability: implements REQ-ROLLING-REVIEW
export function fastRebaseRollingIncrement(rollingReviewedIncrement: RollingReviewedIncrement): RollingFastRebaseResult {
 const {rootPath,revision,baseCommit} = rollingReviewedIncrement;
 const rollingIncrementTarget = rollingReviewedIncrement.target;
 commit(revision);commit(baseCommit);
 requireIntegration(fs.realpathSync(git(rootPath,['rev-parse','--show-toplevel']).trim()) === fs.realpathSync(rootPath),
  'designated checkout differs from Git root');
 git(rootPath,['symbolic-ref','--quiet','HEAD']);
 requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,
  'integration requires the stopped clean reviewed checkout');
 requireIntegration(git(rootPath,['rev-parse','HEAD']).trim() === revision,'checkout differs from accepted review');
 git(rootPath,['merge-base','--is-ancestor',baseCommit,revision]);
 git(rootPath,['check-ref-format',`refs/heads/${rollingIncrementTarget.branch}`]);
 requireIntegration(git(rootPath,['remote']).trim().split('\n').includes(rollingIncrementTarget.remote),'unknown campaign remote');
 const remoteRef = `refs/remotes/${rollingIncrementTarget.remote}/${rollingIncrementTarget.branch}`;
 git(rootPath,['fetch','--no-tags','--',rollingIncrementTarget.remote,`refs/heads/${rollingIncrementTarget.branch}:${remoteRef}`]);
 const integrationBase = commit(git(rootPath,['rev-parse',`${remoteRef}^{commit}`]).trim());
 git(rootPath,['merge-base','--is-ancestor',baseCommit,integrationBase]);
 const rollingFastRebaseIdentity: RollingFastRebaseIdentity = {reviewedRevision:revision,reviewedBase:baseCommit,integrationBase};
 // The approved fast-rebase exception performs an interactive replay without
 // edit stops for clean commits. Textual conflicts retain the rebase for review.
 const spawnSyncReturns = gitResult(rootPath,['rebase','-i','--no-autostash','--no-autosquash','--no-update-refs','--onto',integrationBase,baseCommit],
  {...process.env,GIT_SEQUENCE_EDITOR:'true',GIT_TERMINAL_PROMPT:'0'});
 return rebaseResult(rootPath,rollingFastRebaseIdentity,spawnSyncReturns);
}

// Traceability: implements REQ-ROLLING-REVIEW
export function continueFastRebaseRollingIncrement(rootPath: string,rollingFastRebaseConflict: RollingFastRebaseConflict,
 rollingIncrementConflictInspection: RollingIncrementConflictInspection): RollingFastRebaseResult {
 requireIntegration(rollingIncrementConflictInspection.reference.trim().length > 0,'textual conflict requires a recorded semantic inspection');
 requireIntegration(rollingIncrementConflictInspection.originalCommit === rollingFastRebaseConflict.originalCommit
  && git(rootPath,['rev-parse','REBASE_HEAD']).trim() === rollingFastRebaseConflict.originalCommit,
  'semantic inspection differs from the current conflicting commit');
 const rebaseMarkers: readonly (readonly ['orig-head' | 'onto',string])[] = [
  ['orig-head',rollingFastRebaseConflict.reviewedRevision],['onto',rollingFastRebaseConflict.integrationBase]];
 for (const [name,expected] of rebaseMarkers) {
  const rebasePath = git(rootPath,['rev-parse','--path-format=absolute','--git-path',`rebase-merge/${name}`]).trim();
  requireIntegration(fs.readFileSync(rebasePath,'utf8').trim() === expected,'retained rebase differs from inspected integration');
 }
 requireIntegration(git(rootPath,['diff','--name-only','--diff-filter=U','-z']).length === 0,'textual conflicts remain unresolved');
 const spawnSyncReturns = gitResult(rootPath,['rebase','--continue'],{...process.env,GIT_EDITOR:'true',GIT_TERMINAL_PROMPT:'0'});
 return rebaseResult(rootPath,{reviewedRevision:rollingFastRebaseConflict.reviewedRevision,
  reviewedBase:rollingFastRebaseConflict.reviewedBase,integrationBase:rollingFastRebaseConflict.integrationBase},spawnSyncReturns);
}

export interface RollingIncrementPublication {
 readonly rootPath: string;
 readonly target: RollingIncrementTarget;
 readonly revision: string;
}
export interface RollingIncrementPublished {
 readonly state: 'PUBLISHED';
 readonly revision: string;
 readonly remoteRevision: string;
}
export interface RollingIncrementRebaseRequired {
 readonly state: 'REBASE_REQUIRED';
 readonly revision: string;
 readonly remoteRevision: string;
}
export interface RollingIncrementUnconfirmed {
 readonly state: 'UNCONFIRMED';
 readonly revision: string;
 readonly reason: string;
}
export interface RollingIncrementPushRejected {
 readonly state: 'PUSH_REJECTED';
 readonly revision: string;
 readonly remoteRevision: string;
 readonly reason: string;
}
// Discriminator: state
export type RollingIncrementPublicationResult = RollingIncrementPublished | RollingIncrementRebaseRequired | RollingIncrementUnconfirmed | RollingIncrementPushRejected;

function publicationRemoteRevision(rollingIncrementPublication: RollingIncrementPublication): string | null {
 const {rootPath,target} = rollingIncrementPublication;
 git(rootPath,['check-ref-format',`refs/heads/${target.branch}`]);
 requireIntegration(git(rootPath,['remote']).trim().split('\n').includes(target.remote),'unknown campaign remote');
 const remoteRef = `refs/remotes/${target.remote}/${target.branch}`;
 const spawnSyncReturns = gitResult(rootPath,['fetch','--no-tags','--',target.remote,`refs/heads/${target.branch}:${remoteRef}`]);
 if (spawnSyncReturns.status !== 0) return null;
 return commit(git(rootPath,['rev-parse',`${remoteRef}^{commit}`]).trim());
}

// Traceability: implements REQ-ROLLING-PUBLICATION
// Observation precedes every retry: a lost push response is never evidence of
// non-publication. Only freshly fetched containment permits delivery accounting.
export function reconcileRollingIncrementPublication(rollingIncrementPublication: RollingIncrementPublication): RollingIncrementPublicationResult {
 const {rootPath,revision} = rollingIncrementPublication;
 commit(revision);
 git(rootPath,['cat-file','-e',`${revision}^{commit}`]);
 const remoteRevision = publicationRemoteRevision(rollingIncrementPublication);
 if (remoteRevision === null) return {state:'UNCONFIRMED',revision,reason:'Remote observation failed; publication remains unknown.'};
 const spawnSyncReturns = gitResult(rootPath,['merge-base','--is-ancestor',revision,remoteRevision]);
 if (spawnSyncReturns.status === 0) return {state:'PUBLISHED',revision,remoteRevision};
 requireIntegration(spawnSyncReturns.status === 1,'remote containment check failed');
 return {state:'REBASE_REQUIRED',revision,remoteRevision};
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function publishRollingIncrement(rollingIncrementPublication: RollingIncrementPublication): RollingIncrementPublicationResult {
 const {rootPath,target,revision} = rollingIncrementPublication;
 const rollingIncrementPublicationResult = reconcileRollingIncrementPublication(rollingIncrementPublication);
 if (rollingIncrementPublicationResult.state !== 'REBASE_REQUIRED') return rollingIncrementPublicationResult;
 requireIntegration(git(rootPath,['rev-parse','HEAD']).trim() === revision,'publication checkout differs from verified increment');
 requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,'publication checkout is not clean');
 const spawnSyncReturns = gitResult(rootPath,['merge-base','--is-ancestor',rollingIncrementPublicationResult.remoteRevision,revision]);
 if (spawnSyncReturns.status === 1) return rollingIncrementPublicationResult;
 requireIntegration(spawnSyncReturns.status === 0,'increment ancestry check failed');
 // No force flag or '+' refspec. An upstream race is reconciled, never reset.
 const pushSpawnSyncReturns = gitResult(rootPath,['push','--porcelain','--',target.remote,`${revision}:refs/heads/${target.branch}`]);
 const reconciledRollingIncrementPublicationResult = reconcileRollingIncrementPublication(rollingIncrementPublication);
 if (reconciledRollingIncrementPublicationResult.state === 'REBASE_REQUIRED'
  && reconciledRollingIncrementPublicationResult.remoteRevision === rollingIncrementPublicationResult.remoteRevision) {
  if (pushSpawnSyncReturns.stdout.split('\n').some(line=>line.startsWith('!\t'))) {
   return {state:'PUSH_REJECTED',revision,remoteRevision:reconciledRollingIncrementPublicationResult.remoteRevision,
    reason:pushSpawnSyncReturns.stdout.trim()};
  }
  return {state:'UNCONFIRMED',revision,reason:pushSpawnSyncReturns.stderr.trim() || 'Push did not establish remote containment.'};
 }
 return reconciledRollingIncrementPublicationResult;
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function fastForwardRollingIncrement(rootPath: string,branch: string,revision: string): void {
 commit(revision);
 git(rootPath,['check-ref-format',`refs/heads/${branch}`]);
 requireIntegration(git(rootPath,['symbolic-ref','--quiet','HEAD']).trim() === `refs/heads/${branch}`,
  'coordinator checkout must own the configured increment branch');
 requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,
  'coordinator increment checkout is not clean');
 git(rootPath,['merge','--ff-only','--no-autostash',revision]);
 requireIntegration(git(rootPath,['rev-parse','HEAD']).trim() === revision,'increment branch differs from candidate');
}
