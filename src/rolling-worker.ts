// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {git,type RollingIncrementRepair} from './rolling-integration.js';
import path from 'node:path';
import fs from 'node:fs';
import { parse } from 'lossless-json';
import { spawnSync } from 'node:child_process';
import { RollingCodex, type RollingNativeThread, type RollingNativeTurn, type RollingTurnStarted } from './rolling-codex.js';
import { validateRollingSessionMarker, requireRollingSessionMarkerAbsent, provisionRollingWorktree } from './rolling-worktrees.js';
import { parseRollingWorkerSubmission, type RollingWorkerSubmissionV1 } from './rolling-worker-submission.js';

import type { Obligation, ObligationRequirement } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type { RollingArgv, RollingBinding, RollingProjectConfigV1, RollingResolvedConfiguration } from './rolling-campaign.js';
import type { RollingCampaignStore, RollingSessionAttachment, RollingWorkerDispatchStarted, RollingWorkerDispatchAttached, RollingAssignmentTransition, RollingSubmissionReceipt, RollingWorkerRetirement } from './rolling-campaign-store.js';
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
 readonly incrementRepair: RollingIncrementRepair | null;
}

// Traceability: implements REQ-ROLLING-WORKERS
export function buildRollingWorkerInstructions(rollingWorkerContext: RollingWorkerContext): string {
 const {obligation,requirements,binding,lease} = rollingWorkerContext;
 requireWorker(obligation.id === lease.binding.obligationId && binding.obligationId === obligation.id,
  'worker instructions differ from frozen obligation');
 requireWorker(obligation.requirementIds.every(id => requirements.some(item => item.id === id))
  && requirements.every(item => obligation.requirementIds.includes(item.id)), 'worker instructions lack exact requirement references');
 const rollingArgv:RollingArgv=['git','fetch','--no-tags','--',rollingWorkerContext.configuration.mainline.remote,
  `refs/heads/${rollingWorkerContext.configuration.incrementRef}:refs/remotes/${rollingWorkerContext.configuration.mainline.remote}/${rollingWorkerContext.configuration.incrementRef}`];
 const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = {
  schemaVersion:1,campaignId:lease.scopeId,assignmentId:rollingWorkerContext.assignmentId,
  generation:lease.generation,sessionId:rollingWorkerContext.rollingWorkerCreationV1.sessionId,
  graphDigest:lease.graphDigest,revision:'<actual final HEAD>',baseCommit:rollingWorkerContext.baseCommit,stopped:true,
  proof:lease.binding.execution.target === null ? [] : [{operation:'test',evidence:{
   command:'<actual command string>',selection:lease.binding.execution.selection,
   target:{...lease.binding.execution.target,verification:'<relative verification file>'},
   revision:'<actual final HEAD>',dirty:false,startedAt:'<actual ISO timestamp>',completedAt:'<actual ISO timestamp>',
   outcome:'pass',skips:0,failures:0,
   inputs:{schemaVersion:2,revision:'<actual final HEAD>',paths:['<relative tracked source or test input>']},
   outputPath:'<relative output file>',finalization:'pass'
  }}]
 };
 return 'Execute the assigned atomic obligation in this existing checkout and original session. Read the applicable project rules and skills before work. '
  + 'The coordinator graph is authoritative; the frozen lease below owns current prerequisites, permitted paths, operations, proof selection and target. '
  + 'The obligation owns the canonical condition and discharge criterion. Its historical execution field does not override this frozen lease. '
  + 'Use the exact requirement references, acceptance arc and step references, implementation IDs, source paths, unit and integration selections below. '
  + 'Establish only this obligation within the lease. For a no-edit obligation, return fresh inspection and proof without inventing a code change or Git rebase. Run configured focused QA and the referenced focused arcs; publication QA belongs to the coordinator publication gate. For required QA approval, invoke the exact declared command separately without shell redirects or appended operations; retain the native captured output through ordinary in-scope file operations. Accepted host permissions still apply. '
  + 'Preserve static typing and project build-impact rules. Report newly discovered prerequisites to the coordinator; do not silently change the authoritative graph. '
  + 'If blocked, stop activity and report the blocker while retaining the checkout. Delivery is proposed discharge, not acceptance. '
  + 'When submitting code changes, fetch the configured campaign branch and perform a full semantic rebase commit by commit, refresh affected evidence, retain the exact candidate SHA and base, and stop activity. '
  + `Worker rebase upstream: refs/remotes/${rollingWorkerContext.configuration.mainline.remote}/${rollingWorkerContext.configuration.incrementRef}. Exact fetch argument vector: ${JSON.stringify(rollingArgv)}. The fetched FETCH_HEAD must identify this campaign increment branch before replay. The coordinator publication gate owns ${rollingWorkerContext.configuration.mainline.remote}/${rollingWorkerContext.configuration.mainline.branch}. `
  + 'For semantic replay after fetching the configured campaign branch, use GIT_SEQUENCE_EDITOR=\"sed -i.bak -e s/^pick/edit/\" git rebase --interactive --force-rebase FETCH_HEAD. Inspect each stopped commit before git rebase --continue. These exact commands are authorized only for this active leased worker and its original instruction turn; host permission approval remains required. '
  + 'If this checkout retains its owned in-progress rebase after a failed prior turn, inspect the stopped commit and continue that rebase before beginning a fresh replay; preserve its amendments and staged work. '
  + 'Git mutations in this linked checkout write shared repository metadata outside the checkout. Request sandbox escalation for each authorized Git mutation before its first execution (sandbox_permissions=require_escalated). Keep the lease and authorized command scope binding. '
  + 'Return the candidate and evidence to the coordinator for adversarial review; never publish to mainline yourself. '
  + (rollingWorkerContext.incrementRepair === null ? '' : `Substantive integration repair is required. Preserve and inspect the retained conflicting checkout and original replay identities before changing it. Resolve the recorded findings within the frozen paths, perform a fresh full semantic rebase against the campaign branch, and refresh all applicable focused QA. Submit the corrected candidate for fresh review by the original reviewer. Repair inspection and original conflict: ${JSON.stringify(rollingWorkerContext.incrementRepair)}\n`)
  + (rollingWorkerContext.rejectedReview === null ? '' : `Correct every finding from the original reviewer before resubmission. Rejected review: ${JSON.stringify(rollingWorkerContext.rejectedReview)}\n`)
  + 'For every successful obligation, including a no-edit inspection, the final message must be only strict JSON, without Markdown fences or surrounding prose. '
  + 'Use exactly the physical record keys shown in the outline, at every level. Do not add stoppedAt, timestamp, status, blocker, validation or any other field to a successful submission. Keep actual timestamps in evidence.startedAt and evidence.completedAt only. '
  + 'Replace every placeholder and provide nonempty actual proof in the following typed submission outline; placeholders are not evidence. '
  + 'Each proof entry contains operation and evidence. Evidence contains command, selection, target (identity, profile, verification), revision, dirty, startedAt, completedAt, outcome, skips, failures, inputs (schemaVersion: 2, revision, paths), outputPath and finalization. '
  + 'command is a string, not an argv array. finalization is the string "pass" for successful finalization, not an object. '
  + 'Use the frozen proof selection and target. inputs.revision must equal the tested final HEAD; paths lists the relevant tracked source and test inputs, relative to this checkout. Do not enumerate the repository or store file hashes. Git establishes whether these inputs changed. '
  + 'Evidence inputs.paths must include changed candidate artifacts, including assessment reports, and the tracked inputs actually consumed by the recorded QA command. Listing a deliverable binds its Git freshness; it does not claim that automated QA exercised inert prose. Reading coordinator authority alone does not make it an evidence input: keep the accepted obligation document, binding history and plan out when they are only authority reads. The frozen lease retains that authority separately. The accepted obligation document cannot certify its own bytes; if the QA command actually consumes that document, report the incompatible proof scope instead of omitting a genuine QA input. '
  + 'target.verification is a relative tracked verification-file path included in inputs.paths, not a prose claim. Retain command output at outputPath; it may be an ignored log and is not a source input. '
  + 'Retain actual command output and ISO timestamps; only passing, finalized, clean evidence with zero skips and failures is eligible. '
  + `Submission outline: ${JSON.stringify(rollingWorkerSubmissionV1)}\n`
  + `Worker responsibility: ${JSON.stringify(rollingWorkerContext)}`;
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function prepareRollingWorkerDispatch(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, assignmentId: string, generation: string): Promise<RollingWorkerDispatchStarted> {
 const rollingWorkerContext = await rollingCampaignStore.workerContext(campaignId,assignmentId,generation);
 const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
 const observedIdentity=await rollingCodex.readThreadIdentity(rollingWorkerContext.rollingWorkerCreationV1.threadId,rollingWorkerContext.rollingWorkerCreationV1.rootPath);
 requireWorker(observedIdentity.sessionId===rollingWorkerContext.rollingWorkerCreationV1.sessionId,'observed worker differs from attached session');
 const rollingNativeTurn=await rollingCodex.readLatestTurn(observedIdentity.threadId);
 requireWorker(['completed','failed','interrupted'].includes(rollingNativeTurn.status),'worker preparation requires a terminal original turn');
 const rollingNativeThreadActivity=await rollingCodex.readThreadActivity(observedIdentity.threadId);
 requireWorker(rollingNativeThreadActivity.status==='idle'||rollingNativeThreadActivity.status==='notLoaded','worker preparation cannot claim an active actor or a failed native runtime');
 validateRollingSessionMarker(rollingWorkerContext.rollingWorkerCreationV1.rootPath,rollingWorkerContext.rollingWorkerCreationV1.sessionId);
 return rollingCampaignStore.claimWorkerDispatch(campaignId,assignmentId,generation,instructions);
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function acknowledgeRollingWorkerDispatch(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,dispatchId:string,turnId:string):Promise<RollingWorkerDispatchAttached> {
 const rollingWorkerCreationV1=await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingWorkerDispatch=await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 requireWorker(rollingWorkerDispatch?.id===dispatchId&&rollingWorkerDispatch.threadId===rollingWorkerCreationV1.threadId,'prepared dispatch differs from original worker');
 const observedIdentity=await rollingCodex.readThreadIdentity(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(observedIdentity.sessionId===rollingWorkerCreationV1.sessionId,'observed dispatch session differs');
 const rollingNativeTurn=await rollingCodex.readTurn(rollingWorkerCreationV1.threadId,turnId);
 const input=rollingNativeTurn.items.filter(item=>item.type==='userMessage'||item.type==='functionCallOutput'&&item.text!==null);
 const item=input[0];
 const delegation=item?.type==='functionCallOutput'&&item.text!==null
  ?/^<codex_delegation>\n  <source_thread_id>[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}<\/source_thread_id>\n  <input>([\s\S]*)<\/input>\n<\/codex_delegation>$/u.exec(item.text):null;
 const escapedInstructions=rollingWorkerDispatch.instructions.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 requireWorker(input.length===1&&(item?.type==='userMessage'&&item.text===rollingWorkerDispatch.instructions
  ||delegation?.[1]===escapedInstructions),'worker turn input differs from frozen instructions');
 requireWorker((await rollingCodex.readLatestTurn(rollingWorkerCreationV1.threadId)).id===turnId,'another worker turn follows prepared instructions');
 return rollingCampaignStore.attachWorkerDispatch(campaignId,assignmentId,generation,dispatchId,turnId);
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function dispatchRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, assignmentId: string, generation: string): Promise<RollingWorkerDispatchAttached> {
 const rollingWorkerCreationV1=await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingNativeThread=await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireWorker(rollingNativeThread.thread.sessionId===rollingWorkerCreationV1.sessionId,'resumed worker differs from attached session');
 const rollingWorkerDispatchStarted=await prepareRollingWorkerDispatch(rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation);
 const instructions=rollingWorkerDispatchStarted.instructions;
 const rollingNativeThreadId=rollingWorkerDispatchStarted.threadId;
 const rollingTurnStarted = await rollingCodex.startTurn(rollingNativeThreadId,instructions);
 return rollingCampaignStore.attachWorkerDispatch(campaignId,assignmentId,generation,rollingWorkerDispatchStarted.id,rollingTurnStarted.turn.id);
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-REVIEW
// Traceability: implements REQ-ROLLING-READONLY-COLLECTION
async function observeRollingWorkerTerminalTurn(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,timeoutMs = 60000,
 rollingWorkerOwnerObservationV1:RollingWorkerOwnerObservationV1 | null = null,loadForCorrection=false):Promise<{readonly rollingWorkerCreationV1:RollingWorkerCreationV1;readonly rollingNativeTurn:RollingNativeTurn}> {
 const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 requireWorker(rollingWorkerDispatch?.state === 'ATTACHED','submission requires its known original instruction turn');
 requireWorker(rollingWorkerDispatch.threadId === rollingWorkerCreationV1.threadId,'instruction turn differs from original attached worker');
 const observedRollingWorkerCreationV1=readRollingWorkerCreationV1({schemaVersion:1,...await rollingCodex.readThreadIdentity(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath)});
 requireWorker(JSON.stringify(observedRollingWorkerCreationV1) === JSON.stringify(rollingWorkerCreationV1),
  'submission actor differs from original attached worker');
 let rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerDispatch.threadId,rollingWorkerDispatch.turnId);
 const deadline=Date.now()+timeoutMs;
 while (rollingNativeTurn.status === 'inProgress' && Date.now()<deadline) {
  await new Promise<void>(resolve=>setTimeout(resolve,Math.min(250,Math.max(1,deadline-Date.now()))));
  rollingNativeTurn=await rollingCodex.readTurn(rollingWorkerDispatch.threadId,rollingWorkerDispatch.turnId);
 }
 requireWorker(['completed','failed','interrupted'].includes(rollingNativeTurn.status),'submission instruction turn did not complete');
 const latestRollingNativeTurn=await rollingCodex.readLatestTurn(rollingWorkerDispatch.threadId);
 requireWorker(latestRollingNativeTurn.id===rollingWorkerDispatch.turnId && latestRollingNativeTurn.status===rollingNativeTurn.status,
  'another native turn follows the original instruction; preserve active ownership');
 let rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerDispatch.threadId);
 if(loadForCorrection&&rollingWorkerOwnerObservationV1===null&&rollingNativeThreadActivity.status==='notLoaded') {
  const rollingNativeThread=await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
  requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerCreationV1.rootPath))===JSON.stringify(rollingWorkerCreationV1),'correction writer differs from original actor');
  const reloadedRollingNativeTurn=await rollingCodex.readLatestTurn(rollingWorkerDispatch.threadId);
  requireWorker(reloadedRollingNativeTurn.id===rollingNativeTurn.id&&reloadedRollingNativeTurn.status===rollingNativeTurn.status,'correction writer observed a newer or active turn');
  rollingNativeThreadActivity=await rollingCodex.readThreadActivity(rollingWorkerDispatch.threadId);
 }
 if(rollingWorkerOwnerObservationV1!==null) {
  const checkedRollingWorkerOwnerObservationV1=readRollingWorkerOwnerObservationV1(rollingWorkerOwnerObservationV1);
  requireWorker(checkedRollingWorkerOwnerObservationV1.threadId===rollingWorkerCreationV1.threadId
   && checkedRollingWorkerOwnerObservationV1.sessionId===rollingWorkerCreationV1.sessionId
   && checkedRollingWorkerOwnerObservationV1.rootPath===rollingWorkerCreationV1.rootPath
   && checkedRollingWorkerOwnerObservationV1.turnId===rollingWorkerDispatch.turnId
   && checkedRollingWorkerOwnerObservationV1.generation===generation,'owning observation differs from original assignment');
  const age=Date.now()-Date.parse(checkedRollingWorkerOwnerObservationV1.observedAt);
  requireWorker(age>=0 && age<=60000,'owning observation is stale or future dated');
  requireWorker(checkedRollingWorkerOwnerObservationV1.status==='idle','owning transport reports active worker');
 }
 requireWorker(rollingNativeThreadActivity.status === 'idle'
  || rollingNativeThreadActivity.status === 'notLoaded' && rollingWorkerOwnerObservationV1!==null,
  'submission actor is not known idle; supply a fresh owning-transport observation when notLoaded; preserve active ownership');
 return {rollingWorkerCreationV1,rollingNativeTurn};
}

// Traceability: implements REQ-ROLLING-READONLY-COLLECTION
export async function collectRollingWorkerSubmission(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,timeoutMs=60000,
 rollingWorkerOwnerObservationV1:RollingWorkerOwnerObservationV1|null=null):Promise<RollingSubmissionReceipt> {
 const {rollingWorkerCreationV1,rollingNativeTurn}=await observeRollingWorkerTerminalTurn(rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation,timeoutMs,rollingWorkerOwnerObservationV1);
 requireWorker(rollingNativeTurn.status==='completed','submission instruction turn did not complete');
 const finalText = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
 requireWorker(finalText,'worker turn has no final submission');
 let rollingWorkerSubmissionV1:RollingWorkerSubmissionV1;
 try {rollingWorkerSubmissionV1=parseRollingWorkerSubmission(finalText);}
 catch(cause) {throw new Error(`rolling worker: completed turn has no valid submission JSON; use retry-worker for an observed terminal idle actor; retain the original worker for correction: ${cause instanceof Error?cause.message:String(cause)}`);}
 return rollingCampaignStore.submit(campaignId,assignmentId,generation,rollingWorkerSubmissionV1);
}

function checkpointRollingWorker(rollingWorkerCreationV1:RollingWorkerCreationV1):RollingWorkerStopV1['checkpoint'] {
 const root=rollingWorkerCreationV1.rootPath;
 validateRollingSessionMarker(root,rollingWorkerCreationV1.sessionId);
 requireWorker(git(root,['rev-parse','--show-toplevel']).trim()===root,'retained checkout identity differs');
 return {revision:git(root,['rev-parse','HEAD']).trim(),gitStatus:git(root,['status','--porcelain=v1','--untracked-files=all'])};
}

// Traceability: implements REQ-ROLLING-WORKER-CORRECTION
export async function correctRollingWorker(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,reason:string,
 rollingWorkerOwnerObservationV1:RollingWorkerOwnerObservationV1|null=null):Promise<RollingAssignmentTransition> {
 requireWorker(reason.trim().length>0,'worker correction requires its actual reason');
 const {rollingWorkerCreationV1,rollingNativeTurn}=await observeRollingWorkerTerminalTurn(rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation,1,rollingWorkerOwnerObservationV1,true);
 const rollingWorkerStopV1=readRollingWorkerStopV1({schemaVersion:1,campaignId,assignmentId,generation,
  threadId:rollingWorkerCreationV1.threadId,sessionId:rollingWorkerCreationV1.sessionId,observedAt:new Date().toISOString(),nativeStatus:'idle',turn:{id:rollingNativeTurn.id,status:rollingNativeTurn.status},
  checkpoint:checkpointRollingWorker(rollingWorkerCreationV1)});
 return rollingCampaignStore.correctObservedWorker(campaignId,assignmentId,generation,rollingWorkerStopV1,reason);
}

export interface RollingWorkerOwnerObservationV1 {
 readonly schemaVersion:1;
 readonly threadId:string;
 readonly sessionId:string;
 readonly rootPath:string;
 readonly turnId:string;
 readonly generation:string;
 readonly status:'idle' | 'active';
 readonly observedAt:string;
}
// Traceability: implements REQ-ROLLING-READONLY-COLLECTION
export function readRollingWorkerOwnerObservationV1(value:unknown):RollingWorkerOwnerObservationV1 {
 const input=stopFields(value,['schemaVersion','threadId','sessionId','rootPath','turnId','generation','status','observedAt']);
 requireWorker(input.schemaVersion===1 && (input.status==='idle'||input.status==='active'),'invalid owning observation version or status');
 const rootPath=identity(input.rootPath),observedAt=identity(input.observedAt);
 requireWorker(path.isAbsolute(rootPath)&&path.normalize(rootPath)===rootPath&&Number.isFinite(Date.parse(observedAt)),'invalid owning observation checkout or timestamp');
 return {schemaVersion:1,threadId:identity(input.threadId),sessionId:identity(input.sessionId),rootPath,turnId:identity(input.turnId),generation:identity(input.generation),status:input.status,observedAt};
}
export const RollingWorkerOwnerObservationReaders={V1:readRollingWorkerOwnerObservationV1};

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

export interface RollingWorkerRetirementV1 {
 readonly schemaVersion:1;
 readonly campaignId:string;
 readonly assignmentId:string;
 readonly generation:string;
 readonly resourceGeneration:string;
 readonly number:number;
 readonly rootPath:string;
 readonly coordinatorRoot:string;
 readonly threadId:string;
 readonly sessionId:string;
 readonly integratedRevision:string;
}
// Traceability: implements REQ-ROLLING-WORKERS
export function readRollingWorkerRetirementV1(value:unknown):RollingWorkerRetirementV1 {
 const record = stopFields(value,['schemaVersion','campaignId','assignmentId','generation','resourceGeneration','number',
  'rootPath','coordinatorRoot','threadId','sessionId','integratedRevision']);
 requireWorker(record.schemaVersion === 1,'invalid retirement version');
 requireWorker(typeof record.number === 'number' && Number.isSafeInteger(record.number) && record.number >= 101,'invalid retirement checkout number');
 const assignmentId = identity(record.assignmentId), generation = identity(record.generation), resourceGeneration = identity(record.resourceGeneration);
 for (const id of [assignmentId,generation,resourceGeneration]) requireWorker(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id),'invalid retirement UUID');
 const rootPath = identity(record.rootPath), coordinatorRoot = identity(record.coordinatorRoot);
 for (const root of [rootPath,coordinatorRoot]) requireWorker(path.isAbsolute(root) && path.normalize(root) === root,'invalid retirement root');
 const integratedRevision = identity(record.integratedRevision);
 requireWorker(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(integratedRevision),'invalid retirement integration revision');
 return {schemaVersion:1,campaignId:identity(record.campaignId),assignmentId,generation,resourceGeneration,number:record.number,
  rootPath,coordinatorRoot,threadId:identity(record.threadId),sessionId:identity(record.sessionId),integratedRevision};
}
export const RollingWorkerRetirementReaders = {V1:readRollingWorkerRetirementV1};

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
 const rollingWorkerStopV1 = await observeRollingWorkerStop(rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation,timeoutMs);
 return rollingCampaignStore.suspendObservedWorker(campaignId,assignmentId,generation,rollingWorkerStopV1,blockers);
}

// Traceability: implements REQ-ROLLING-WORKERS
async function observeRollingWorkerStop(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,timeoutMs:number):Promise<RollingWorkerStopV1> {
 const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId,assignmentId,generation);
 const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 if (rollingWorkerDispatch !== null && rollingWorkerDispatch.state !== 'ATTACHED') throw new Error('rolling worker: unknown worker dispatch must be reconciled before stopping ownership');
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
 const rollingWorkerStopV1 = readRollingWorkerStopV1({schemaVersion:1,campaignId,assignmentId,generation,
  threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId,observedAt:new Date().toISOString(),nativeStatus:'idle',turn,
  checkpoint:checkpointRollingWorker(rollingWorkerCreationV1)});
 return rollingWorkerStopV1;
}

// Traceability: implements REQ-ROLLING-WORKERS
export function buildRollingRetirementInstructions(rollingWorkerRetirementV1:RollingWorkerRetirementV1):string {
 const checkedRollingWorkerRetirementV1 = readRollingWorkerRetirementV1(rollingWorkerRetirementV1);
 return 'Your Ponytail assignment has ended. Its generation is revoked. Do not edit files, run commands, send messages to other sessions or begin further work. Acknowledge this notification and finish the turn. The coordinator will archive this worker and no longer send or expect worker messages.\n'
  + `Retired assignment: ${checkedRollingWorkerRetirementV1.assignmentId}; generation: ${checkedRollingWorkerRetirementV1.generation}.`;
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function retireRollingWorker(rollingCampaignStore:RollingCampaignStore,rollingCodex:RollingCodex,
 campaignId:string,assignmentId:string,generation:string,timeoutMs = 60000):Promise<RollingWorkerRetirement> {
 let rollingWorkerRetirement = await rollingCampaignStore.workerRetirement(campaignId,assignmentId,generation);
 if (rollingWorkerRetirement === null) {
  const rollingWorkerStopV1 = await observeRollingWorkerStop(rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation,timeoutMs);
  rollingWorkerRetirement = await rollingCampaignStore.prepareWorkerRetirement(campaignId,assignmentId,generation,rollingWorkerStopV1);
 }
 if (rollingWorkerRetirement.state === 'CLEANED') return rollingWorkerRetirement;
 const {rollingWorkerRetirementV1} = rollingWorkerRetirement;
 if (rollingWorkerRetirement.state === 'PREPARED') {
  const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerRetirementV1.threadId);
  requireWorker(rollingNativeThreadActivity.status === 'idle','retiring worker is not known idle; preserve its reservation');
  rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId,assignmentId,generation,'PREPARED','NOTIFYING');
  const rollingTurnStarted = await rollingCodex.startTurn(rollingWorkerRetirementV1.threadId,buildRollingRetirementInstructions(rollingWorkerRetirementV1));
  rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId,assignmentId,generation,'NOTIFYING','NOTIFYING',rollingTurnStarted.turn.id);
 }
 if (rollingWorkerRetirement.state === 'NOTIFYING') {
  requireWorker(rollingWorkerRetirement.turnId !== null,'retirement notification outcome is unknown; reconcile its original native turn before continuing');
  let rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerRetirementV1.threadId,rollingWorkerRetirement.turnId);
  if (rollingNativeTurn.status === 'inProgress') rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerRetirementV1.threadId,rollingWorkerRetirement.turnId,timeoutMs);
  requireWorker(rollingNativeTurn.status === 'completed','retirement notification has not completed; preserve its reservation');
  const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerRetirementV1.threadId);
  requireWorker(rollingNativeThreadActivity.status === 'idle','retirement notification worker is not known idle');
  rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId,assignmentId,generation,'NOTIFYING','NOTIFIED');
 }
 if (rollingWorkerRetirement.state === 'NOTIFIED') rollingWorkerRetirement =
  await rollingCampaignStore.advanceWorkerRetirement(campaignId,assignmentId,generation,'NOTIFIED','ARCHIVING');
 if (rollingWorkerRetirement.state === 'ARCHIVING') {
  // Native archival is not idempotent. Reconcile a lost acknowledgement from
  // the authoritative, checkout-scoped archived inventory before mutating.
  if (!await rollingCodex.isThreadArchived(rollingWorkerRetirementV1.threadId,rollingWorkerRetirementV1.rootPath))
   await rollingCodex.archiveThread(rollingWorkerRetirementV1.threadId);
  rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId,assignmentId,generation,'ARCHIVING','ARCHIVED');
 }
 return rollingCampaignStore.cleanupWorkerRetirement(campaignId,assignmentId,generation);
}
