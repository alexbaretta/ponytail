// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import fs from 'node:fs';
import { parse } from 'lossless-json';
import { spawnSync } from 'node:child_process';
import { RollingCodex, type RollingNativeThread, type RollingTurnStarted } from './rolling-codex.js';
import { validateRollingSessionMarker, requireRollingSessionMarkerAbsent, provisionRollingWorktree } from './rolling-worktrees.js';
import { parseRollingWorkerSubmission, type RollingWorkerSubmissionV1 } from './rolling-worker-submission.js';

import type { Obligation, ObligationRequirement } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type { RollingBinding, RollingProjectConfigV1, RollingResolvedConfiguration } from './rolling-campaign.js';
import type { RollingCampaignStore, RollingSessionAttachment, RollingWorkerDispatchAttached, RollingAssignmentTransition, RollingSubmissionReceipt } from './rolling-campaign-store.js';
import type { RollingReviewRejectedV1 } from './rolling-review.js';

export interface RollingWorkerCreationV1 {
 readonly schemaVersion: 1;
 readonly threadId: string;
 readonly sessionId: string;
 readonly rootPath: string;
}
export interface RollingWorkerInitialization {
 readonly rollingWorkerCreationV1: RollingWorkerCreationV1;
 readonly rollingTurnStarted: RollingTurnStarted;
}
function requireWorker(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(`rolling worker: ${message}`);
}
function identity(value: unknown): string {
 requireWorker(typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\0\r\n]/u.test(value), 'invalid creation identity');
 return value;
}
// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export function readRollingWorkerCreationV1(value: unknown): RollingWorkerCreationV1 {
 requireWorker(value !== null && typeof value === 'object' && !Array.isArray(value), 'creation must be a record');
 requireWorker('schemaVersion' in value && value.schemaVersion === 1 && 'threadId' in value && 'sessionId' in value && 'rootPath' in value,
  'invalid creation version or fields');
 requireWorker(Object.keys(value).sort().join(',') === 'rootPath,schemaVersion,sessionId,threadId', 'unknown creation fields');
 const rootPath = identity(value.rootPath);
 requireWorker(path.isAbsolute(rootPath) && path.normalize(rootPath) === rootPath, 'creation checkout must be an absolute canonical path');
 return {schemaVersion:1,threadId:identity(value.threadId),sessionId:identity(value.sessionId),rootPath};
}
export function parseRollingWorkerCreation(text: string): RollingWorkerCreationV1 {
 return readRollingWorkerCreationV1(parse(text, null, token => {
  requireWorker(token === '1', 'invalid creation numeric token'); return 1;
 }));
}
export const RollingWorkerCreationReaders = {V1:readRollingWorkerCreationV1};

// Traceability: implements REQ-ROLLING-WORKERS
export function identifyRollingWorkerCreation(rollingNativeThread: RollingNativeThread, rootPath: string): RollingWorkerCreationV1 {
 requireWorker(rollingNativeThread.cwd === rootPath && fs.realpathSync(rootPath) === rootPath, 'native checkout differs from reservation');
 return readRollingWorkerCreationV1({schemaVersion:1,threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId,rootPath});
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function initializeRollingWorker(rollingCodex: RollingCodex, rollingNativeThread: RollingNativeThread,
 rollingWorkerCreationV1: RollingWorkerCreationV1): Promise<RollingWorkerInitialization> {
 const checkedRollingWorkerCreationV1 = readRollingWorkerCreationV1(rollingWorkerCreationV1);
 requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, checkedRollingWorkerCreationV1.rootPath))
  === JSON.stringify(checkedRollingWorkerCreationV1), 'native identity differs from retained creation');
 requireRollingSessionMarkerAbsent(checkedRollingWorkerCreationV1.rootPath);
 const rollingTurnStarted = await rollingCodex.startTurn(checkedRollingWorkerCreationV1.threadId,
  'Initialize this Ponytail worker in its assigned checkout. Create only session_id.txt at the checkout root, containing the exact sessionId below followed by one newline. Use exclusive creation; preserve any existing file. Do not edit other files or start implementation. Finish the turn after writing the marker.\n'
  + `Worker attachment: ${JSON.stringify(checkedRollingWorkerCreationV1)}`);
 return {rollingWorkerCreationV1:checkedRollingWorkerCreationV1,rollingTurnStarted};
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function observeRollingWorkerInitialization(rollingCodex: RollingCodex,
 rollingWorkerInitialization: RollingWorkerInitialization, timeoutMs = 60000): Promise<RollingWorkerCreationV1> {
 const {rollingWorkerCreationV1, rollingTurnStarted} = rollingWorkerInitialization;
 const rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId, rollingTurnStarted.turn.id, timeoutMs);
 requireWorker(rollingNativeTurn.id === rollingTurnStarted.turn.id && rollingNativeTurn.status === 'completed', 'worker initialization did not complete');
 validateRollingSessionMarker(rollingWorkerCreationV1.rootPath, rollingWorkerCreationV1.sessionId);
 return rollingWorkerCreationV1;
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export async function provisionRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, actionId: string, generation: string): Promise<RollingWorkerInitialization> {
 const rollingWorkerReservation = await rollingCampaignStore.claimWorkerCreation(campaignId, actionId, generation);
 provisionRollingWorktree(rollingWorkerReservation.coordinatorRoot, {number:rollingWorkerReservation.number,
  rootPath:rollingWorkerReservation.rootPath,generation}, rollingWorkerReservation.baseCommit);
 const rollingNativeThread = await rollingCodex.startThread(rollingWorkerReservation.rootPath);
 const rollingWorkerCreationV1 = identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerReservation.rootPath);
 await rollingCampaignStore.recordWorkerCreation(campaignId,actionId,generation,rollingWorkerCreationV1);
 return initializeRollingWorker(rollingCodex,rollingNativeThread,rollingWorkerCreationV1);
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export async function attachRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, actionId: string, generation: string, rollingWorkerInitialization: RollingWorkerInitialization,
 timeoutMs = 60000): Promise<RollingSessionAttachment> {
 const rollingWorkerCreationV1 = await observeRollingWorkerInitialization(rollingCodex,rollingWorkerInitialization,timeoutMs);
 return rollingCampaignStore.completeWorkerCreation(campaignId,actionId,generation,rollingWorkerCreationV1);
}

interface RollingWorkerCreationRecoveryIdentity {readonly assignmentId:string;readonly actionId:string;readonly generation:string;readonly rootPath:string}
export interface RollingWorkerCreationRecoveryUnknown extends RollingWorkerCreationRecoveryIdentity {readonly state:'unknown'}
export interface RollingWorkerCreationRecoveryActive extends RollingWorkerCreationRecoveryIdentity {
 readonly state:'active';readonly rollingWorkerCreationV1:RollingWorkerCreationV1;readonly turnId:string | null;
}
export interface RollingWorkerCreationRecoveryAttached extends RollingWorkerCreationRecoveryIdentity {
 readonly state:'attached';readonly rollingSessionAttachment:RollingSessionAttachment;
}
// Discriminator: state
export type RollingWorkerCreationRecovery = RollingWorkerCreationRecoveryUnknown | RollingWorkerCreationRecoveryActive | RollingWorkerCreationRecoveryAttached;

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export async function recoverRollingWorkerCreation(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,actionId:string,generation:string):Promise<RollingWorkerCreationRecovery> {
 const rollingWorkerCreationInspection = await rollingCampaignStore.inspectWorkerCreation(campaignId,actionId,generation);
 const rollingWorkerCreationRecoveryIdentity:RollingWorkerCreationRecoveryIdentity = {assignmentId:rollingWorkerCreationInspection.assignment.id,
  actionId,generation,rootPath:rollingWorkerCreationInspection.worktree.rootPath};
 const rollingWorkerCreationV1 = rollingWorkerCreationInspection.rollingWorkerCreationV1;
 if (rollingWorkerCreationV1 === null) return {...rollingWorkerCreationRecoveryIdentity,state:'unknown'};
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerCreationV1.rootPath)) === JSON.stringify(rollingWorkerCreationV1),
  'recovered native worker differs from original receipt');
 const rollingNativeTurn = rollingWorkerCreationInspection.action.state === 'COMPLETED' ? null
  : await rollingCodex.readInitializationTurn(rollingWorkerCreationV1.threadId);
 const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
 if (rollingNativeTurn?.status === 'inProgress' || rollingNativeThreadActivity.status === 'active')
  return {...rollingWorkerCreationRecoveryIdentity,state:'active',rollingWorkerCreationV1,turnId:rollingNativeTurn?.id ?? null};
 requireWorker(rollingNativeThreadActivity.status === 'idle' && (rollingNativeTurn === null || rollingNativeTurn.status === 'completed'),
  'original initialization is not verified completed and idle; preserve its reservation');
 validateRollingSessionMarker(rollingWorkerCreationV1.rootPath,rollingWorkerCreationV1.sessionId);
 const rollingSessionAttachment = await rollingCampaignStore.completeWorkerCreation(campaignId,actionId,generation,rollingWorkerCreationV1);
 return {...rollingWorkerCreationRecoveryIdentity,state:'attached',rollingSessionAttachment};
}

export interface RollingWorkerContext {
 readonly assignmentId: string;
 readonly rollingWorkerCreationV1: RollingWorkerCreationV1;
 readonly obligation: Obligation;
 readonly requirements: readonly ObligationRequirement[];
 readonly binding: RollingBinding;
 readonly lease: ObligationLeaseV1;
 readonly configuration: RollingResolvedConfiguration;
 readonly qa: RollingProjectConfigV1['qa'];
 readonly baseCommit: string;
 readonly rejectedReview: RollingReviewRejectedV1 | null;
}

// Traceability: implements REQ-ROLLING-WORKERS
export function buildRollingWorkerInstructions(rollingWorkerContext: RollingWorkerContext): string {
 const {obligation,requirements,binding,lease} = rollingWorkerContext;
 requireWorker(obligation.id === lease.binding.obligationId && binding.obligationId === obligation.id,
  'worker instructions differ from frozen obligation');
 requireWorker(obligation.requirementIds.every(id => requirements.some(item => item.id === id))
  && requirements.every(item => obligation.requirementIds.includes(item.id)), 'worker instructions lack exact requirement references');
 const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = {
  schemaVersion:1,campaignId:lease.scopeId,assignmentId:rollingWorkerContext.assignmentId,
  generation:lease.generation,sessionId:rollingWorkerContext.rollingWorkerCreationV1.sessionId,
  graphDigest:lease.graphDigest,revision:'<actual final HEAD>',baseCommit:rollingWorkerContext.baseCommit,stopped:true,
  proof:lease.binding.execution.target === null ? [] : [{operation:'test',evidence:{
   command:'<actual command string>',selection:lease.binding.execution.selection,
   target:{...lease.binding.execution.target,verification:'<relative verification file>'},
   revision:'<actual final HEAD>',dirty:false,startedAt:'<actual ISO timestamp>',completedAt:'<actual ISO timestamp>',
   outcome:'pass',skips:0,failures:0,
   inputs:[{path:'<relative assessed input>',digest:'<actual SHA-256>'}],
   outputPath:'<relative output file>',finalization:'pass'
  }}]
 };
 return 'Execute the assigned atomic obligation in this existing checkout and original session. Read the applicable project rules and skills before work. '
  + 'The coordinator graph is authoritative; the frozen lease below owns current prerequisites, permitted paths, operations, proof selection and target. '
  + 'The obligation owns the canonical condition and discharge criterion. Its historical execution field does not override this frozen lease. '
  + 'Use the exact requirement references, acceptance arc and step references, implementation IDs, source paths, unit and integration selections below. '
  + 'Establish only this obligation within the lease. For a no-edit obligation, return fresh inspection and proof without inventing a code change or Git rebase. Run configured focused QA and the referenced focused arcs; publication QA belongs to the coordinator publication gate. '
  + 'Preserve static typing and project build-impact rules. Report newly discovered prerequisites to the coordinator; do not silently change the authoritative graph. '
  + 'If blocked, stop activity and report the blocker while retaining the checkout. Delivery is proposed discharge, not acceptance. '
  + 'When submitting code changes, fetch the configured campaign branch and perform a full semantic rebase commit by commit, refresh affected evidence, retain the exact candidate SHA and base, and stop activity. '
  + 'Git mutations in this linked checkout write shared repository metadata outside the checkout. Request sandbox escalation for each authorized Git mutation before its first execution (sandbox_permissions=require_escalated). Keep the lease and authorized command scope binding. '
  + 'Return the candidate and evidence to the coordinator for adversarial review; never publish to mainline yourself. '
  + (rollingWorkerContext.rejectedReview === null ? '' : `Correct every finding from the original reviewer before resubmission. Rejected review: ${JSON.stringify(rollingWorkerContext.rejectedReview)}\n`)
  + 'For code submissions, the final message must be only strict JSON, without Markdown fences or surrounding prose. '
  + 'Use exactly the physical record keys shown in the outline, at every level. Do not add stoppedAt, timestamp, status, blocker, validation or any other field to a successful submission. Keep actual timestamps in evidence.startedAt and evidence.completedAt only. '
  + 'Replace every placeholder and provide nonempty actual proof in the following typed submission outline; placeholders are not evidence. '
  + 'Each proof entry contains operation and evidence. Evidence contains command, selection, target (identity, profile, verification), revision, dirty, startedAt, completedAt, outcome, skips, failures, inputs (path, digest), outputPath and finalization. '
  + 'command is a string, not an argv array. finalization is the string "pass" for successful finalization, not an object. '
  + 'Use the frozen proof selection and target; hash every changed existing source plus test inputs and retained output with SHA-256, relative to this checkout. '
  + 'target.verification is a relative retained verification-file path, not a prose claim; include both that path and outputPath in the hashed inputs. '
  + 'Retain actual command output and ISO timestamps; only passing, finalized, clean evidence with zero skips and failures is eligible. '
  + `Code submission outline: ${JSON.stringify(rollingWorkerSubmissionV1)}\n`
  + `Worker responsibility: ${JSON.stringify(rollingWorkerContext)}`;
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function dispatchRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, assignmentId: string, generation: string): Promise<RollingWorkerDispatchAttached> {
 const rollingWorkerContext = await rollingCampaignStore.workerContext(campaignId,assignmentId,generation);
 const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
 const rollingWorkerDispatchStarted = await rollingCampaignStore.claimWorkerDispatch(campaignId,assignmentId,generation,instructions);
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerDispatchStarted.threadId,rollingWorkerContext.rollingWorkerCreationV1.rootPath);
 requireWorker(rollingNativeThread.thread.sessionId === rollingWorkerContext.rollingWorkerCreationV1.sessionId, 'resumed worker differs from attached session');
 const rollingTurnStarted = await rollingCodex.startTurn(rollingNativeThread.thread.id,instructions);
 return rollingCampaignStore.attachWorkerDispatch(campaignId,assignmentId,generation,rollingWorkerDispatchStarted.id,rollingTurnStarted.turn.id);
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-REVIEW
export async function collectRollingWorkerSubmission(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,timeoutMs = 60000):Promise<RollingSubmissionReceipt> {
 const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 requireWorker(rollingWorkerDispatch?.state === 'ATTACHED','submission requires its known original instruction turn');
 requireWorker(rollingWorkerDispatch.threadId === rollingWorkerCreationV1.threadId,'instruction turn differs from original attached worker');
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerCreationV1.rootPath)) === JSON.stringify(rollingWorkerCreationV1),
  'submission actor differs from original attached worker');
 let rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerDispatch.threadId,rollingWorkerDispatch.turnId);
 if (rollingNativeTurn.status === 'inProgress') rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerDispatch.threadId,rollingWorkerDispatch.turnId,timeoutMs);
 requireWorker(rollingNativeTurn.status === 'completed','submission instruction turn did not complete');
 const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerDispatch.threadId);
 requireWorker(rollingNativeThreadActivity.status === 'idle','submission actor is not known idle; preserve active ownership');
 const finalText = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
 requireWorker(finalText,'worker turn has no final submission');
 const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(finalText);
 return rollingCampaignStore.submit(campaignId,assignmentId,generation,rollingWorkerSubmissionV1);
}

export interface RollingWorkerStoppedTurn {readonly id: string;readonly status:'completed' | 'failed' | 'interrupted'}
export interface RollingWorkerStopV1 {
 readonly schemaVersion:1;
 readonly campaignId:string;
 readonly assignmentId:string;
 readonly generation:string;
 readonly threadId:string;
 readonly sessionId:string;
 readonly observedAt:string;
 readonly nativeStatus:'idle';
 readonly turn:RollingWorkerStoppedTurn | null;
 readonly checkpoint:{readonly revision:string;readonly gitStatus:string};
}
function isStopRecord(value:unknown):value is Record<string,unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function stopFields(value:unknown, names:readonly string[]):Record<string,unknown> {
 requireWorker(isStopRecord(value),'stop observation must be a record');
 requireWorker(Object.keys(value).sort().join(',') === [...names].sort().join(','),'invalid stop observation fields');
 return value;
}
function stoppedTurn(value:unknown):RollingWorkerStoppedTurn {
 const record = stopFields(value,['id','status']);
 const id = identity(record.id);
 switch(record.status) {
  case 'completed': case 'failed': case 'interrupted': return {id,status:record.status};
  default: throw new Error('rolling worker: observed turn is not stopped');
 }
}
// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export function readRollingWorkerStopV1(value:unknown):RollingWorkerStopV1 {
 const record = stopFields(value,['schemaVersion','campaignId','assignmentId','generation','threadId','sessionId','observedAt','nativeStatus','turn','checkpoint']);
 requireWorker(record.schemaVersion === 1 && record.nativeStatus === 'idle','stop requires supported version and observed native idle state');
 const observedAt = identity(record.observedAt);
 requireWorker(/^\d{4}-\d{2}-\d{2}T/u.test(observedAt) && Number.isFinite(Date.parse(observedAt)),'invalid activity observation timestamp');
 const checkpoint = stopFields(record.checkpoint,['revision','gitStatus']);
 requireWorker(typeof checkpoint.revision === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(checkpoint.revision)
  && typeof checkpoint.gitStatus === 'string' && !checkpoint.gitStatus.includes('\0'),'invalid retained checkout checkpoint');
 return {schemaVersion:1,campaignId:identity(record.campaignId),assignmentId:identity(record.assignmentId),generation:identity(record.generation),
  threadId:identity(record.threadId),sessionId:identity(record.sessionId),observedAt,nativeStatus:'idle',
  turn:record.turn === null ? null : stoppedTurn(record.turn),checkpoint:{revision:checkpoint.revision,gitStatus:checkpoint.gitStatus}};
}
export function parseRollingWorkerStop(text:string):RollingWorkerStopV1 {
 return readRollingWorkerStopV1(parse(text,null,token => {requireWorker(token === '1','invalid stop numeric token');return 1;}));
}
export const RollingWorkerStopReaders = {V1:readRollingWorkerStopV1};

export interface RollingWorkerResumptionV1 {
 readonly schemaVersion:1;
 readonly rollingWorkerCreationV1:RollingWorkerCreationV1;
 readonly baseCommit:string;
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export function readRollingWorkerResumptionV1(value:unknown):RollingWorkerResumptionV1 {
 const record = stopFields(value,['schemaVersion','rollingWorkerCreationV1','baseCommit']);
 requireWorker(record.schemaVersion === 1 && typeof record.baseCommit === 'string'
  && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(record.baseCommit),'invalid resumption version or campaign base');
 return {schemaVersion:1,rollingWorkerCreationV1:readRollingWorkerCreationV1(record.rollingWorkerCreationV1),baseCommit:record.baseCommit};
}
export function parseRollingWorkerResumption(text:string):RollingWorkerResumptionV1 {
 return readRollingWorkerResumptionV1(parse(text,null,token => {requireWorker(token === '1','invalid resumption numeric token');return 1;}));
}
export const RollingWorkerResumptionReaders = {V1:readRollingWorkerResumptionV1};

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-SCHEDULING
export async function resumeRollingWorker(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,actionId:string,generation:string):Promise<RollingSessionAttachment> {
 const rollingWorkerResumptionV1 = await rollingCampaignStore.claimWorkerResumption(campaignId,actionId,generation);
 const rollingWorkerCreationV1 = rollingWorkerResumptionV1.rollingWorkerCreationV1;
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerCreationV1.rootPath))
  === JSON.stringify(rollingWorkerCreationV1),'resumed worker differs from original identity');
 const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
 requireWorker(rollingNativeThreadActivity.status === 'idle','resumed worker is not known idle; preserve reserved capacity');
 return rollingCampaignStore.completeWorkerResumption(campaignId,actionId,generation,rollingWorkerResumptionV1);
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-SCHEDULING
export async function suspendRollingWorker(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,blockers:readonly string[],timeoutMs = 60000):Promise<RollingAssignmentTransition> {
 const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 if (rollingWorkerDispatch !== null && rollingWorkerDispatch.state !== 'ATTACHED') throw new Error('rolling worker: unknown worker dispatch must be reconciled before suspension');
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(rollingNativeThread.thread.sessionId === rollingWorkerCreationV1.sessionId,'native worker differs from attached session');
 let turn:RollingWorkerStoppedTurn | null = null;
 if (rollingWorkerDispatch) {
  requireWorker(rollingWorkerDispatch.threadId === rollingNativeThread.thread.id,'dispatch differs from original worker');
  let rollingNativeTurn = await rollingCodex.readTurn(rollingNativeThread.thread.id,rollingWorkerDispatch.turnId);
  if (rollingNativeTurn.status === 'inProgress') {
   await rollingCodex.interruptTurn(rollingNativeThread.thread.id,rollingWorkerDispatch.turnId);
   rollingNativeTurn = await rollingCodex.waitForTurn(rollingNativeThread.thread.id,rollingWorkerDispatch.turnId,timeoutMs);
  }
  turn = stoppedTurn({id:rollingNativeTurn.id,status:rollingNativeTurn.status});
 }
 const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingNativeThread.thread.id);
 requireWorker(rollingNativeThreadActivity.status === 'idle','native worker is not known idle; preserve its active slot');
 function git(argv:readonly string[]):string {
  const result = spawnSync('git',['-C',rollingWorkerCreationV1.rootPath,...argv],{encoding:'utf8'});
  requireWorker(!result.error && result.status === 0,result.error?.message || result.stderr.trim() || 'cannot checkpoint retained checkout');
  return result.stdout;
 }
 requireWorker(git(['rev-parse','--show-toplevel']).trim() === rollingWorkerCreationV1.rootPath,'retained checkout identity differs');
 const rollingWorkerStopV1 = readRollingWorkerStopV1({schemaVersion:1,campaignId,assignmentId,generation,
  threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId,observedAt:new Date().toISOString(),nativeStatus:'idle',turn,
  checkpoint:{revision:git(['rev-parse','HEAD']).trim(),gitStatus:git(['status','--porcelain=v1','--untracked-files=all'])}});
 return rollingCampaignStore.suspendObservedWorker(campaignId,assignmentId,generation,rollingWorkerStopV1,blockers);
}
