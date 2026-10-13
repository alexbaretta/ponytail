// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import crypto from 'node:crypto';
import type {RollingArgv} from './rolling-campaign.js';
import type {RollingWorkerSubmissionV1,RollingSubmissionProof} from './rolling-worker-submission.js';
import {obligationInputPaths} from '../skills/plan-execution/scripts/obligations.js';
import path from 'node:path';
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
export interface RollingFastRebaseIdentity {
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
export interface RollingIncrementRepair {
 readonly rebase: RollingIncrementRebaseV1;
 readonly reference: string;
}
// Discriminator: state
export type RollingFastRebaseResult = RollingFastRebaseReady | RollingFastRebaseConflict;

function requireIntegration(condition: unknown,message: string): asserts condition {
 if (!condition) throw new Error(`rolling integration: ${message}`);
}

export function gitResult(rootPath: string,argv: readonly string[],processEnv: NodeJS.ProcessEnv = {...process.env,GIT_TERMINAL_PROMPT:'0'}): SpawnSyncReturns<string> {
 const spawnSyncReturns = spawnSync('git',['-C',rootPath,...argv],{encoding:'utf8',env:processEnv});
 if (spawnSyncReturns.error) throw spawnSyncReturns.error;
 return spawnSyncReturns;
}

export function git(rootPath: string,argv: readonly string[]): string {
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
export function prepareRollingIncrementRebase(rollingReviewedIncrement: RollingReviewedIncrement): RollingFastRebaseIdentity {
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
 return {reviewedRevision:revision,reviewedBase:baseCommit,integrationBase};
}

// Traceability: implements REQ-ROLLING-REVIEW
export function rebasePreparedRollingIncrement(rootPath: string,rollingFastRebaseIdentity: RollingFastRebaseIdentity): RollingFastRebaseResult {
 const {reviewedRevision,reviewedBase,integrationBase} = rollingFastRebaseIdentity;
 commit(reviewedRevision);commit(reviewedBase);commit(integrationBase);
 requireIntegration(git(rootPath,['rev-parse','HEAD']).trim() === reviewedRevision,'checkout changed after rebase preparation');
 requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,'prepared rebase checkout is not clean');
 git(rootPath,['symbolic-ref','--quiet','HEAD']);
 git(rootPath,['merge-base','--is-ancestor',reviewedBase,integrationBase]);
 // The approved fast-rebase exception performs an interactive replay without
 // edit stops for clean commits. Textual conflicts retain the rebase for review.
 const spawnSyncReturns = gitResult(rootPath,['rebase','-i','--no-autostash','--no-autosquash','--no-update-refs','--onto',integrationBase,reviewedBase],
  {...process.env,GIT_SEQUENCE_EDITOR:'true',GIT_TERMINAL_PROMPT:'0'});
 return rebaseResult(rootPath,{reviewedRevision,reviewedBase,integrationBase},spawnSyncReturns);
}

// Traceability: implements REQ-ROLLING-REVIEW
export function observePreparedRollingIncrement(rootPath:string,rollingFastRebaseIdentity:RollingFastRebaseIdentity):RollingFastRebaseResult {
 const observedRollingFastRebaseIdentity:RollingFastRebaseIdentity={reviewedRevision:rollingFastRebaseIdentity.reviewedRevision,
  reviewedBase:rollingFastRebaseIdentity.reviewedBase,integrationBase:rollingFastRebaseIdentity.integrationBase};
 const conflictedPaths=git(rootPath,['diff','--name-only','--diff-filter=U','-z']).split('\0').filter(Boolean);
 const rebasePath=git(rootPath,['rev-parse','--path-format=absolute','--git-path','rebase-merge']).trim();
 if (conflictedPaths.length > 0) {
  requireIntegration(fs.readFileSync(path.join(rebasePath,'orig-head'),'utf8').trim() === rollingFastRebaseIdentity.reviewedRevision
   && fs.readFileSync(path.join(rebasePath,'onto'),'utf8').trim() === rollingFastRebaseIdentity.integrationBase,'retained conflict differs from original intent');
  return {...observedRollingFastRebaseIdentity,state:'TEXTUAL_CONFLICT',originalCommit:commit(git(rootPath,['rev-parse','REBASE_HEAD']).trim()),conflictedPaths};
 }
 requireIntegration(!fs.existsSync(rebasePath),'original rebase is still unfinished; preserve it');
 const revision=commit(git(rootPath,['rev-parse','HEAD']).trim());
 requireIntegration(git(rootPath,['rev-parse','ORIG_HEAD']).trim() === rollingFastRebaseIdentity.reviewedRevision,'completed replay lacks its original reviewed identity');
 const rollingFastRebaseResult:RollingFastRebaseResult={...observedRollingFastRebaseIdentity,state:'REBASED',revision,
  proofRefreshRequired:revision !== rollingFastRebaseIdentity.reviewedRevision || rollingFastRebaseIdentity.integrationBase !== rollingFastRebaseIdentity.reviewedBase};
 verifyRollingIncrementRebase(rootPath,rollingFastRebaseResult);
 return rollingFastRebaseResult;
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function refreshRollingIncrementProof(rollingIncrementClaimV1:RollingIncrementClaimV1,rollingFastRebaseReady:RollingFastRebaseReady,
 rollingWorkerSubmissionV1:RollingWorkerSubmissionV1,commands:readonly RollingArgv[]):RollingWorkerSubmissionV1 {
 const root=rollingIncrementClaimV1.rootPath;
 requireIntegration(commands.length > 0,'changed integration candidate requires configured focused QA');
 requireIntegration(rollingWorkerSubmissionV1.proof.every(proof=>commands.some(argv=>argv.join(' ') === proof.evidence.command)),
  'focused QA does not reproduce every reviewed proof command; reconcile its explicit argv selection before integration');
 const outcomes=new Map<string,{readonly startedAt:string;readonly completedAt:string;readonly outputPath:string}>();
 for (const argv of commands) {
  verifyRollingIncrementRebase(root,rollingFastRebaseReady);
  const prior=rollingWorkerSubmissionV1.proof.find(proof=>proof.evidence.command === argv.join(' '));
  requireIntegration(prior,'configured focused QA has no reviewed evidence scope');
  const outputPath=`${prior.evidence.outputPath}.integration-${rollingIncrementClaimV1.id}-${crypto.randomUUID()}`;
  requireIntegration(gitResult(root,['check-ignore','--quiet','--',outputPath]).status === 0,'integration QA output must be ignored in the existing proof directory');
  const outputFile=path.join(root,outputPath);
  requireIntegration(fs.realpathSync(path.dirname(outputFile)) === path.dirname(outputFile),'integration QA output directory must not be a symlink');
  const startedAt=new Date().toISOString();
  const spawnSyncReturns=spawnSync(argv[0],argv.slice(1),{cwd:root,encoding:'utf8'});
  const completedAt=new Date().toISOString();
  fs.writeFileSync(outputFile,(spawnSyncReturns.stdout ?? '')+(spawnSyncReturns.stderr ?? '')+(spawnSyncReturns.error?.message ?? ''),{flag:'wx',mode:0o600});
  requireIntegration(!spawnSyncReturns.error && spawnSyncReturns.status === 0,`focused integration QA failed; retained output: ${outputPath}`);
  verifyRollingIncrementRebase(root,rollingFastRebaseReady);
  outcomes.set(argv.join(' '),{startedAt,completedAt,outputPath});
 }
 return {...rollingWorkerSubmissionV1,revision:rollingFastRebaseReady.revision,baseCommit:rollingFastRebaseReady.integrationBase,
  proof:rollingWorkerSubmissionV1.proof.map((rollingSubmissionProof):RollingSubmissionProof=> {
   const outcome=outcomes.get(rollingSubmissionProof.evidence.command);requireIntegration(outcome,'reviewed proof command was not executed');
   return {...rollingSubmissionProof,evidence:{...rollingSubmissionProof.evidence,...outcome,revision:rollingFastRebaseReady.revision,
    inputs:{schemaVersion:2,revision:rollingFastRebaseReady.revision,paths:obligationInputPaths(rollingSubmissionProof.evidence.inputs)
     .filter(relative=>relative !== rollingSubmissionProof.evidence.outputPath || gitResult(root,['check-ignore','--quiet','--',relative]).status !== 0)}}};
  })};
}

// Traceability: implements REQ-ROLLING-REVIEW
export function fastRebaseRollingIncrement(rollingReviewedIncrement: RollingReviewedIncrement): RollingFastRebaseResult {
 const rollingFastRebaseIdentity = prepareRollingIncrementRebase(rollingReviewedIncrement);
 return rebasePreparedRollingIncrement(rollingReviewedIncrement.rootPath,rollingFastRebaseIdentity);
}

// Traceability: implements REQ-ROLLING-REVIEW
export function verifyRollingIncrementConflictInspection(rootPath: string,rollingFastRebaseConflict: RollingFastRebaseConflict,
 rollingIncrementConflictInspection: RollingIncrementConflictInspection): void {
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
}

// Traceability: implements REQ-ROLLING-REVIEW
export function continueFastRebaseRollingIncrement(rootPath: string,rollingFastRebaseConflict: RollingFastRebaseConflict,
 rollingIncrementConflictInspection: RollingIncrementConflictInspection): RollingFastRebaseResult {
 verifyRollingIncrementConflictInspection(rootPath,rollingFastRebaseConflict,rollingIncrementConflictInspection);
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

export interface RollingIncrementClaimV1 {
 readonly schemaVersion: 1;
 readonly id: string;
 readonly campaignId: string;
 readonly reviewId: string;
 readonly assignmentId: string;
 readonly generation: string;
 readonly graphDigest: string;
 readonly rootPath: string;
 readonly coordinatorRoot: string;
 readonly target: RollingIncrementTarget;
 readonly reviewedRevision: string;
 readonly reviewedBase: string;
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingIncrementClaimV1(value: unknown): RollingIncrementClaimV1 {
 requireIntegration(value !== null && typeof value === 'object' && !Array.isArray(value),'claim must be an object');
 requireIntegration(Object.keys(value).sort().join('\0') === ['schemaVersion','id','campaignId','reviewId','assignmentId','generation',
  'graphDigest','rootPath','coordinatorRoot','target','reviewedRevision','reviewedBase'].sort().join('\0'),'invalid claim fields');
 requireIntegration('schemaVersion' in value && value.schemaVersion === 1,'unsupported integration claim version');
 const claimIdentity = (field: unknown): string => {
  requireIntegration(typeof field === 'string' && field.trim() === field && field.length > 0 && !/[\0\r\n]/u.test(field),'invalid claim identity');
  return field;
 };
 requireIntegration('id' in value && 'campaignId' in value && 'reviewId' in value && 'assignmentId' in value
  && 'generation' in value && 'graphDigest' in value && 'rootPath' in value && 'coordinatorRoot' in value
  && 'target' in value && 'reviewedRevision' in value && 'reviewedBase' in value,'missing claim fields');
 const target = value.target;
 requireIntegration(target !== null && typeof target === 'object' && !Array.isArray(target)
  && Object.keys(target).sort().join('\0') === 'branch\0remote' && 'branch' in target && 'remote' in target,'invalid claim target');
 const rootPath = claimIdentity(value.rootPath);
 const coordinatorRoot = claimIdentity(value.coordinatorRoot);
 requireIntegration(path.isAbsolute(rootPath) && path.isAbsolute(coordinatorRoot),'claim checkout paths must be absolute');
 const graphDigest = claimIdentity(value.graphDigest);
 requireIntegration(/^[a-f0-9]{64}$/u.test(graphDigest),'invalid claim graph digest');
 const reviewedRevision = commit(claimIdentity(value.reviewedRevision));
 const reviewedBase = commit(claimIdentity(value.reviewedBase));
 return {schemaVersion:1,id:claimIdentity(value.id),campaignId:claimIdentity(value.campaignId),reviewId:claimIdentity(value.reviewId),
  assignmentId:claimIdentity(value.assignmentId),generation:claimIdentity(value.generation),graphDigest,rootPath,coordinatorRoot,
  target:{branch:claimIdentity(target.branch),remote:claimIdentity(target.remote)},reviewedRevision,reviewedBase};
}
export const RollingIncrementClaimReaders = {V1:readRollingIncrementClaimV1};

export interface RollingIncrementRebaseV1 extends RollingFastRebaseIdentity {
 readonly schemaVersion: 1;
 readonly incrementId: string;
 readonly result: RollingFastRebaseResult | null;
}

function isRecord(value: unknown): value is Record<string,unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function record(value: unknown,names: readonly string[]): Record<string,unknown> {
 requireIntegration(isRecord(value),'rebase record must be an object');
 requireIntegration(Object.keys(value).sort().join('\0') === [...names].sort().join('\0'),'invalid rebase record fields');
 return value;
}
function recordCommit(value: unknown): string {
 requireIntegration(typeof value === 'string','commit identity must be a string');
 return commit(value);
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingIncrementRebaseV1(value: unknown): RollingIncrementRebaseV1 {
 const rebaseRecord = record(value,['schemaVersion','incrementId','reviewedRevision','reviewedBase','integrationBase','result']);
 requireIntegration(rebaseRecord.schemaVersion === 1,'unsupported rebase record version');
 requireIntegration(typeof rebaseRecord.incrementId === 'string' && rebaseRecord.incrementId.trim().length > 0,'invalid increment identity');
 const rollingFastRebaseIdentity: RollingFastRebaseIdentity = {reviewedRevision:recordCommit(rebaseRecord.reviewedRevision),
  reviewedBase:recordCommit(rebaseRecord.reviewedBase),integrationBase:recordCommit(rebaseRecord.integrationBase)};
 let result: RollingFastRebaseResult | null = null;
 if (rebaseRecord.result !== null) {
  requireIntegration(isRecord(rebaseRecord.result),'invalid rebase result');
  switch (rebaseRecord.result.state) {
   case 'REBASED': {
    const resultRecord = record(rebaseRecord.result,['state','reviewedRevision','reviewedBase','integrationBase','revision','proofRefreshRequired']);
    requireIntegration(typeof resultRecord.proofRefreshRequired === 'boolean','invalid proof refresh flag');
    const revision = recordCommit(resultRecord.revision);
    requireIntegration(resultRecord.proofRefreshRequired === (revision !== rollingFastRebaseIdentity.reviewedRevision
     || rollingFastRebaseIdentity.integrationBase !== rollingFastRebaseIdentity.reviewedBase),'proof refresh differs from actual candidate identity');
    result = {...rollingFastRebaseIdentity,state:'REBASED',revision,proofRefreshRequired:resultRecord.proofRefreshRequired};
    break;
   }
   case 'TEXTUAL_CONFLICT': {
    const resultRecord = record(rebaseRecord.result,['state','reviewedRevision','reviewedBase','integrationBase','originalCommit','conflictedPaths']);
    requireIntegration(Array.isArray(resultRecord.conflictedPaths) && resultRecord.conflictedPaths.length > 0,'missing textual conflict paths');
    const conflictedPaths = resultRecord.conflictedPaths.map((value: unknown)=> {
     requireIntegration(typeof value === 'string' && value.length > 0 && !value.includes('\0'),'invalid conflict path');return value;
    });
    result = {...rollingFastRebaseIdentity,state:'TEXTUAL_CONFLICT',originalCommit:recordCommit(resultRecord.originalCommit),conflictedPaths};
    break;
   }
   default: throw new Error('rolling integration: unsupported rebase result state');
  }
  requireIntegration(rebaseRecord.result.reviewedRevision === rollingFastRebaseIdentity.reviewedRevision
   && rebaseRecord.result.reviewedBase === rollingFastRebaseIdentity.reviewedBase && rebaseRecord.result.integrationBase === rollingFastRebaseIdentity.integrationBase,
   'rebase result differs from recorded intent');
 }
 return {schemaVersion:1,incrementId:rebaseRecord.incrementId,...rollingFastRebaseIdentity,result};
}
export const RollingIncrementRebaseReaders = {V1:readRollingIncrementRebaseV1};

// Traceability: implements REQ-ROLLING-PUBLICATION
export function verifyRollingIncrementRebase(rootPath: string,rollingFastRebaseResult: RollingFastRebaseResult): void {
 if (rollingFastRebaseResult.state === 'REBASED') {
  git(rootPath,['symbolic-ref','--quiet','HEAD']);
  requireIntegration(git(rootPath,['rev-parse','HEAD']).trim() === rollingFastRebaseResult.revision,'rebase result differs from checkout');
  git(rootPath,['merge-base','--is-ancestor',rollingFastRebaseResult.integrationBase,rollingFastRebaseResult.revision]);
  requireIntegration(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,'rebased checkout is not clean');
 } else {
  requireIntegration(git(rootPath,['rev-parse','REBASE_HEAD']).trim() === rollingFastRebaseResult.originalCommit,'conflict result differs from checkout');
  const conflictedPaths = git(rootPath,['diff','--name-only','--diff-filter=U','-z']).split('\0').filter(value=>value.length > 0);
  requireIntegration(JSON.stringify(conflictedPaths) === JSON.stringify(rollingFastRebaseResult.conflictedPaths),'conflict paths differ from checkout');
 }
}

export interface RollingIncrementPublicationV1 {
 readonly schemaVersion: 1;
 readonly incrementId: string;
 readonly result: RollingIncrementPublicationResult;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingIncrementPublicationV1(value: unknown): RollingIncrementPublicationV1 {
 const publicationRecord = record(value,['schemaVersion','incrementId','result']);
 requireIntegration(publicationRecord.schemaVersion === 1,'unsupported publication version');
 requireIntegration(typeof publicationRecord.incrementId === 'string' && publicationRecord.incrementId.trim().length > 0,'invalid increment identity');
 return {schemaVersion:1,incrementId:publicationRecord.incrementId,result:readRollingIncrementPublicationResult(publicationRecord.result)};
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingIncrementPublicationResult(value:unknown):RollingIncrementPublicationResult {
 requireIntegration(isRecord(value),'invalid publication result');
 let rollingIncrementPublicationResult: RollingIncrementPublicationResult;
 switch (value.state) {
  case 'PUBLISHED':
  case 'REBASE_REQUIRED': {
   const resultRecord = record(value,['state','revision','remoteRevision']);
   rollingIncrementPublicationResult = {state:value.state,revision:recordCommit(resultRecord.revision),remoteRevision:recordCommit(resultRecord.remoteRevision)};
   break;
  }
  case 'PUSH_REJECTED': {
   const resultRecord = record(value,['state','revision','remoteRevision','reason']);
   requireIntegration(typeof resultRecord.reason === 'string' && resultRecord.reason.trim().length > 0,'missing push rejection reason');
   rollingIncrementPublicationResult = {state:'PUSH_REJECTED',revision:recordCommit(resultRecord.revision),remoteRevision:recordCommit(resultRecord.remoteRevision),reason:resultRecord.reason};
   break;
  }
  case 'UNCONFIRMED': {
   const resultRecord = record(value,['state','revision','reason']);
   requireIntegration(typeof resultRecord.reason === 'string' && resultRecord.reason.trim().length > 0,'missing unknown-outcome reason');
   rollingIncrementPublicationResult = {state:'UNCONFIRMED',revision:recordCommit(resultRecord.revision),reason:resultRecord.reason};
   break;
  }
  default: throw new Error('rolling integration: unsupported publication state');
 }
 return rollingIncrementPublicationResult;
}
export const RollingIncrementPublicationReaders = {V1:readRollingIncrementPublicationV1};

export interface RollingIncrementPushStarted {
 readonly claim: RollingIncrementClaimV1;
 readonly revision: string;
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function verifyRollingIncrementLocalIntegration(rootPath: string,branch: string,revision: string): void {
 commit(revision);
 git(rootPath,['check-ref-format',`refs/heads/${branch}`]);
 const spawnSyncReturns = gitResult(rootPath,['merge-base','--is-ancestor',revision,`refs/heads/${branch}`]);
 requireIntegration(spawnSyncReturns.status === 0,'local increment branch lacks the published candidate');
}
