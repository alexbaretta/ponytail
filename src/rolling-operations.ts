// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {Pool} from 'pg';
import {spawnSync} from 'node:child_process';
import {parse} from 'lossless-json';
import {databaseOptions} from './project-index-database.js';
import {relativePath} from '../skills/plan-execution/scripts/obligations.js';
import {collectRollingGraph,loadRollingConfiguration,parseRollingProjectConfig,readRollingCampaignRequest,type RollingCampaignRequest} from './rolling-campaign.js';
import {resolveRollingManagedDirectory,validateRollingSessionMarker} from './rolling-worktrees.js';
import {RollingCampaignStore,readRollingConfigurationAmendmentRequestV1,readRollingBindingHistoryConfiguration,type RollingBindingHistoryConfiguration,type RollingCampaignRegistration,type RollingCampaignRegistrationResult,type RollingGraphReconciliation,type RollingCoordinatorSnapshot,type RollingAllocationResult,type RollingAction,type RollingStoredAssignment,type RollingPublicationStatus,type RollingAssignmentRelease,type RollingWorkerDispatchStarted,type RollingWorkerDispatch,type RollingReviewDispatchStarted,type RollingStoredIncrement} from './rolling-campaign-store.js';
import {readRollingWorkerSubmissionV1} from './rolling-worker-submission.js';
import {readRollingReviewOutcomeV1} from './rolling-review.js';
import type {RollingStoredReview,RollingReviewerLoss} from './rolling-review.js';
import {git,gitResult,publishRollingIncrement,reconcileRollingIncrementPublication,type RollingIncrementPublication,type RollingIncrementRepair,type RollingIncrementRebaseV1,rebasePreparedRollingIncrement,observePreparedRollingIncrement,refreshRollingIncrementProof,fastForwardRollingIncrement} from './rolling-integration.js';
import {RollingCodex,type RollingNativeServerRequest} from './rolling-codex.js';
import {provisionRollingWorker,attachRollingWorker,recoverRollingWorkerCreation,resumeRollingWorker,prepareRollingWorkerDispatch,acknowledgeRollingWorkerDispatch,dispatchRollingWorker,collectRollingWorkerSubmission,correctRollingWorker,readRollingWorkerOwnerObservationV1,suspendRollingWorker,retireRollingWorker,type RollingWorkerContext} from './rolling-worker.js';
import {readRollingPublicationRepairReviewV1,prepareRollingMainline,mergeRollingMainline,observeRollingMainlineCandidate,runRollingPublicationQa,prepareRollingMainlineRefresh,mergeRollingMainlineRefresh,observeRollingMainlineRefresh,type RollingMainlineCandidateV1,type RollingMainlineRefreshResultV1} from './rolling-publication.js';
import {dispatchRollingReview,collectRollingReview,startRollingReview} from './rolling-review.js';
import type {RollingPublicationFrozen,RollingPublicationTrigger} from './rolling-publication.js';
import {rollingCommandDefinitions,rollingCampaignHelp,isRollingCommandName,type RollingCommandName} from './rolling-cli-registry.js';

export interface RollingCampaignInitializationV1 {
 readonly schemaVersion:1;
 readonly coordinatorRoot:string;
 readonly documentPath:string;
 readonly bindingsPath:string;
 readonly bindingHistory:RollingBindingHistoryConfiguration | null;
 readonly configuration:RollingCampaignRequest;
}
function isRecord(value:unknown):value is Record<string,unknown> {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function record(value:unknown):Record<string,unknown> {
 if (!isRecord(value)) throw new Error('rolling campaign: expected an object');
 return value;
}
// Traceability: implements REQ-ROLLING-INTERFACES
export function readRollingCampaignInitializationV1(value:unknown):RollingCampaignInitializationV1 {
 const initialization = record(value);
 if (initialization.schemaVersion !== 1 || JSON.stringify(Object.keys(initialization).sort()) !== JSON.stringify(['schemaVersion','coordinatorRoot','documentPath','bindingsPath','bindingHistory','configuration'].sort())) throw new Error('rolling campaign: invalid initialization V1 fields');
 if (typeof initialization.coordinatorRoot !== 'string' || !path.isAbsolute(initialization.coordinatorRoot)) throw new Error('rolling campaign: initialization requires an absolute coordinator root');
 relativePath(initialization.documentPath);relativePath(initialization.bindingsPath);
 return {schemaVersion:1,coordinatorRoot:initialization.coordinatorRoot,documentPath:initialization.documentPath,bindingsPath:initialization.bindingsPath,
  bindingHistory:initialization.bindingHistory === null ? null : readRollingBindingHistoryConfiguration(initialization.bindingHistory),configuration:readRollingCampaignRequest(initialization.configuration)};
}
export const RollingCampaignInitializationReaders = {V1:readRollingCampaignInitializationV1};
function readJson(text:string):unknown {
 return parse(text,null,token=> {
  const number = Number(token);
  if (!/^(0|-?[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(number)) throw new Error('rolling campaign: JSON numbers must be exact safe integers');
  return number;
 });
}
export function parseRollingCampaignInitialization(text:string):RollingCampaignInitializationV1 {return readRollingCampaignInitializationV1(readJson(text));}
function stringField(input:Record<string,unknown>,name:string):string {
 const value = input[name];
 if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || value.includes('\0')) throw new Error(`rolling campaign: ${name} must be a nonempty string`);
 return value;
}
// Traceability: implements REQ-ROLLING-REVIEW
export function readRollingReviewerLoss(value:unknown):RollingReviewerLoss | null {
 if (value === undefined) return null;
 const rollingReviewerLossRecord = record(value);
 if (Object.keys(rollingReviewerLossRecord).length !== 2 || !Object.hasOwn(rollingReviewerLossRecord,'reviewId')
  || !Object.hasOwn(rollingReviewerLossRecord,'lossReference')) throw new Error('rolling campaign: invalid reviewer loss fields');
 return {reviewId:stringField(rollingReviewerLossRecord,'reviewId'),lossReference:stringField(rollingReviewerLossRecord,'lossReference')};
}
function stringArray(value:unknown):readonly string[] {
 if (!Array.isArray(value) || !value.every((item:unknown)=>typeof item === 'string' && item.length > 0)) throw new Error('rolling campaign: expected a string array');
 return value;
}
class RollingLegacyInspectionError extends Error {
 constructor(readonly exitCode:number,message:string) {super(message);}
}
function readRollingCommandInput(command:RollingCommandName,value:unknown):Record<string,unknown> {
 const input = record(value);
 const definition = rollingCommandDefinitions.find(item=>item.name === command);
 if (!definition || Object.keys(input).some(key=>!definition.fields.some(field=>field.name === key))) throw new Error('rolling campaign: undeclared command arguments');
 for (const field of definition.fields) if (field.required && input[field.name] === undefined) throw new Error(`rolling campaign: required argument ${field.name} is missing`);
 return input;
}
function inspectRollingLegacy(root:string,value:unknown):string {
 const input = readRollingCommandInput('legacy',value);
 const inspection = stringField(input,'command');
 if (!['validate','report','list','status','reservation-audit'].includes(inspection)) throw new Error('rolling campaign: legacy dispatch and mutation are retired; only explicit inspection is supported');
 const arguments_ = input.arguments === undefined ? [] : stringArray(input.arguments);
 const result = spawnSync(process.execPath,[path.join(__dirname,'campaign-census.js'),inspection,...arguments_],{cwd:root,encoding:'utf8'});
 if (result.error || result.status !== 0) throw new RollingLegacyInspectionError(result.status ?? 1,result.error?.message || result.stderr.trim() || 'historical campaign inspection failed');
 return result.stdout;
}
export interface RollingOperationResults {
 submit:Awaited<ReturnType<RollingCampaignStore['submit']>>;
 'record-review':Awaited<ReturnType<RollingCampaignStore['recordReviewOutcome']>>;
 reset:Awaited<ReturnType<RollingCampaignStore['resetProject']>>;
 init:RollingCampaignRegistrationResult;reconcile:RollingGraphReconciliation;status:RollingCoordinatorSnapshot;'next-actions':RollingCoordinatorActions;replenish:RollingReplenishment;
 'provision-worker':Awaited<ReturnType<typeof attachRollingWorker>>;'recover-worker':Awaited<ReturnType<typeof recoverRollingWorkerCreation>>;
 'resume-worker':Awaited<ReturnType<typeof resumeRollingWorker>>;'observe-resumption':Awaited<ReturnType<typeof resumeRollingWorker>>;
 'dispatch-worker':Awaited<ReturnType<typeof collectRollingWorkerSubmission>>;'collect-submission':Awaited<ReturnType<typeof collectRollingWorkerSubmission>>;
 'prepare-worker-dispatch':Awaited<ReturnType<typeof prepareRollingWorkerDispatch>>;'acknowledge-worker-dispatch':Awaited<ReturnType<typeof acknowledgeRollingWorkerDispatch>>;
 'retry-worker':Awaited<ReturnType<typeof correctRollingWorker>>;
 'suspend-worker':Awaited<ReturnType<typeof suspendRollingWorker>>;'retire-worker':Awaited<ReturnType<typeof retireRollingWorker>>;
 'rebind-worker':Awaited<ReturnType<RollingCampaignStore['rebindLease']>>;
 'start-review':Awaited<ReturnType<typeof startRollingReview>>;'request-review':Awaited<ReturnType<RollingCampaignStore['requestReview']>>;'dispatch-review':Awaited<ReturnType<typeof collectRollingReview>>;'inspect-review':Awaited<ReturnType<typeof collectRollingReview>>;
 'observe-increment':Awaited<ReturnType<RollingCampaignStore['observeIncrementPublication']>>;
 integrate:Awaited<ReturnType<RollingCampaignStore['publishIncrement']>> | RollingIncrementRepair;accept:Awaited<ReturnType<RollingCampaignStore['acceptIncrementCertificates']>>;
 'amend-configuration':Awaited<ReturnType<RollingCampaignStore['amendConfiguration']>>;
 'withdraw-publication':Awaited<ReturnType<RollingCampaignStore['withdrawPublication']>>;
 'freeze-publication':Awaited<ReturnType<RollingCampaignStore['claimPublicationBatch']>>;
 'prepare-publication':RollingMainlineCandidateV1;'observe-preparation':RollingMainlineCandidateV1;
 'inspect-publication-conflict':Awaited<ReturnType<RollingCampaignStore['publicationContext']>>;
 'run-publication-qa':Awaited<ReturnType<RollingCampaignStore['recordPublicationQa']>>;
 'observe-publication-qa':Awaited<ReturnType<RollingCampaignStore['publicationContext']>>;
 'publish-mainline':Awaited<ReturnType<RollingCampaignStore['publishMainline']>>;'observe-mainline':Awaited<ReturnType<RollingCampaignStore['observeMainlinePublication']>>;
 'refresh-mainline':RollingMainlineRefreshResultV1;'observe-refresh':RollingMainlineRefreshResultV1;
 'repair-publication':Awaited<ReturnType<RollingCampaignStore['repairPublication']>>;
 'synchronize-campaign':Awaited<ReturnType<RollingCampaignStore['synchronizePublishedCampaign']>>;
 close:Awaited<ReturnType<RollingCampaignStore['closeCampaign']>>;legacy:string;
}
// Discriminator: command
export type RollingOperationResponse = {[Command in keyof RollingOperationResults]:{readonly command:Command;readonly result:RollingOperationResults[Command]}}[keyof RollingOperationResults];
export interface RollingReplenishment {
 readonly trigger:'event' | 'periodic';
 readonly graphDigest:string;
 readonly allocations:readonly RollingAllocationResult[];
 readonly stopReason:RollingAllocationResult['reason'];
 readonly snapshot:RollingCoordinatorSnapshot;
}
export interface RollingReconcileDecision {readonly kind:'reconcile';readonly expectedDigest:string;readonly observedDigest:string;}
export interface RollingWorkerDecision {readonly kind:'worker';readonly hostAction:'create-session' | 'observe-session-creation' | 'resume-session' | 'observe-session-resumption';readonly action:RollingAction;}
export interface RollingReviewDecision {readonly kind:'review';readonly hostAction:'send-review' | 'observe-review';readonly review:RollingStoredReview;}
export interface RollingAssignmentDecision {readonly kind:'assignment';readonly command:'integrate';readonly assignment:RollingStoredAssignment;}
export interface RollingHostAssignmentDecision {readonly kind:'host-assignment';readonly hostAction:'request-adversarial-review' | 'send-assignment' | 'collect-result' | 'detach-session';readonly assignment:RollingStoredAssignment;}
export interface RollingWorkerSuspensionDecision {readonly kind:'worker-suspension';readonly hostAction:'quiesce-session';readonly assignment:RollingStoredAssignment;readonly blockers:readonly string[];}
export interface RollingWorkerRebindingDecision {readonly kind:'worker-rebinding';readonly hostAction:'reassign-scope';readonly assignment:RollingStoredAssignment;}
export interface RollingWorkerDispatchBlockedDecision {readonly kind:'blocked-worker-dispatch';readonly reason:'instruction_turn_unknown';readonly assignment:RollingStoredAssignment;readonly dispatch:RollingWorkerDispatchStarted;}
export interface RollingReviewDispatchBlockedDecision {readonly kind:'blocked-review-dispatch';readonly reason:'instruction_turn_unknown';readonly review:RollingStoredReview;readonly dispatch:RollingReviewDispatchStarted;}
export interface RollingPublicationDecision {readonly kind:'publication';readonly command:'prepare-publication' | 'observe-preparation' | 'observe-refresh' | 'inspect-publication-conflict' | 'run-publication-qa' | 'observe-publication-qa' | 'publish-mainline' | 'observe-mainline' | 'refresh-mainline' | 'synchronize-campaign';readonly publication:RollingPublicationStatus;}
export interface RollingClosureDecision {readonly kind:'closure';readonly command:'close';}
export interface RollingPublicationFreezeDecision {readonly kind:'publication-freeze';readonly command:'freeze-publication';readonly selection:RollingPublicationFrozen;readonly flush:Exclude<RollingPublicationTrigger,'threshold'> | null;}
export interface RollingIncrementAcceptanceDecision {readonly kind:'acceptance';readonly command:'accept';readonly assignment:RollingStoredAssignment;readonly increment:RollingStoredIncrement;}
export interface RollingReleaseDecision {readonly kind:'release';readonly command:'replenish';readonly release:RollingAssignmentRelease;readonly graphDigest:string;}
export interface RollingReplenishDecision {readonly kind:'replenish';readonly graphDigest:string;}
// Discriminator: kind
export type RollingCoordinatorDecision = RollingReconcileDecision | RollingWorkerDecision | RollingReviewDecision | RollingAssignmentDecision | RollingHostAssignmentDecision | RollingPublicationDecision | RollingReplenishDecision | RollingWorkerSuspensionDecision | RollingWorkerRebindingDecision | RollingWorkerDispatchBlockedDecision | RollingReviewDispatchBlockedDecision | RollingReleaseDecision | RollingIncrementAcceptanceDecision | RollingPublicationFreezeDecision | RollingClosureDecision;
export interface RollingCoordinatorActions {readonly snapshot:RollingCoordinatorSnapshot;readonly decisions:readonly RollingCoordinatorDecision[];}

function publicationCommand(rollingPublicationStatus:RollingPublicationStatus):RollingPublicationDecision['command'] {
 switch (rollingPublicationStatus.state) {
  case 'FROZEN': return 'prepare-publication';
  case 'PREPARING': return rollingPublicationStatus.pendingRefreshId === null ? 'observe-preparation' : 'observe-refresh';
  case 'CONFLICT': return 'inspect-publication-conflict';
  case 'CANDIDATE': case 'QA_FAILED': return 'run-publication-qa';
  case 'QA_RUNNING': return 'observe-publication-qa';
  case 'QA_PASSED': return 'publish-mainline';
  case 'PUSHING': case 'UNCONFIRMED': return 'observe-mainline';
  case 'REBASE_REQUIRED': case 'PUSH_REJECTED': return 'refresh-mainline';
  case 'PUBLISHED': return 'synchronize-campaign';
 }
}

// Traceability: implements REQ-ROLLING-STATE
// Traceability: implements REQ-ROLLING-INTERFACES
export function projectRollingCoordinatorActions(rollingCoordinatorSnapshot:RollingCoordinatorSnapshot):RollingCoordinatorActions {
 if (rollingCoordinatorSnapshot.closure !== null) return {snapshot:rollingCoordinatorSnapshot,decisions:[]};
 if (rollingCoordinatorSnapshot.graphDigest !== rollingCoordinatorSnapshot.observedGraphDigest) return {snapshot:rollingCoordinatorSnapshot,
  decisions:[{kind:'reconcile',expectedDigest:rollingCoordinatorSnapshot.graphDigest,observedDigest:rollingCoordinatorSnapshot.observedGraphDigest}]};
 const decisions:RollingCoordinatorDecision[] = [];
 for (const publication of rollingCoordinatorSnapshot.publications) decisions.push({kind:'publication',command:publicationCommand(publication),publication});
 for (const rollingStoredReview of rollingCoordinatorSnapshot.reviews) if (rollingStoredReview.outcome === null) {
  const rollingReviewDispatch=rollingCoordinatorSnapshot.reviewDispatches.find(rollingStoredReviewDispatch=>rollingStoredReviewDispatch.reviewId === rollingStoredReview.request.id)?.dispatch;
  switch (rollingReviewDispatch?.state) {
   case undefined: decisions.push({kind:'review',hostAction:'send-review',review:rollingStoredReview});break;
   case 'ATTACHED': decisions.push({kind:'review',hostAction:'observe-review',review:rollingStoredReview});break;
   case 'STARTED': decisions.push({kind:'blocked-review-dispatch',reason:'instruction_turn_unknown',review:rollingStoredReview,dispatch:rollingReviewDispatch});break;
   default: rollingReviewDispatch satisfies never;
  }
 }
 for (const rollingStoredAssignment of rollingCoordinatorSnapshot.assignments) {
  if (rollingCoordinatorSnapshot.actions.some(rollingAction=>rollingAction.assignmentId === rollingStoredAssignment.id && rollingAction.generation === rollingStoredAssignment.generation)) continue;
  if (rollingStoredAssignment.state === 'INACTIVE' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired
   && rollingStoredAssignment.sessionId && rollingStoredAssignment.lease
   && rollingCoordinatorSnapshot.scheduling.blocked.some(block=>block.reason === 'scope_changed' && block.obligationId === rollingStoredAssignment.obligationId)) {
   decisions.push({kind:'worker-rebinding',hostAction:'reassign-scope',assignment:rollingStoredAssignment});continue;
  }
  const rollingAssignmentRelease=rollingCoordinatorSnapshot.releasableAssignments.find(release=>release.id === rollingStoredAssignment.id && release.generation === rollingStoredAssignment.generation);
  if (rollingAssignmentRelease && rollingStoredAssignment.state === 'RETIRING' && rollingStoredAssignment.retired && rollingStoredAssignment.activityStopped) {
   decisions.push({kind:'release',command:'replenish',release:rollingAssignmentRelease,graphDigest:rollingCoordinatorSnapshot.graphDigest});continue;
  }
  const rollingStoredIncrement=rollingCoordinatorSnapshot.increments.find(increment=>increment.claim.assignmentId === rollingStoredAssignment.id && increment.claim.generation === rollingStoredAssignment.generation);
  if (rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredIncrement?.state === 'PUBLISHED') {
   if (rollingStoredIncrement.obligationSatisfied) decisions.push({kind:'host-assignment',hostAction:'detach-session',assignment:rollingStoredAssignment});
   else decisions.push({kind:'acceptance',command:'accept',assignment:rollingStoredAssignment,increment:rollingStoredIncrement});
   continue;
  }
  if (rollingStoredAssignment.state === 'WORKING' && !rollingStoredAssignment.retired && !rollingStoredAssignment.activityStopped && rollingStoredAssignment.sessionId !== null) {
   const rollingWorkerDispatch=rollingCoordinatorSnapshot.workerDispatches.find(rollingStoredWorkerDispatch=>rollingStoredWorkerDispatch.assignmentId === rollingStoredAssignment.id && rollingStoredWorkerDispatch.generation === rollingStoredAssignment.generation)?.dispatch;
   switch (rollingWorkerDispatch?.state) {
    case undefined: decisions.push({kind:'host-assignment',hostAction:'send-assignment',assignment:rollingStoredAssignment});break;
    case 'ATTACHED': decisions.push({kind:'host-assignment',hostAction:'collect-result',assignment:rollingStoredAssignment});break;
    case 'STARTED': decisions.push({kind:'blocked-worker-dispatch',reason:'instruction_turn_unknown',assignment:rollingStoredAssignment,dispatch:rollingWorkerDispatch});break;
    default: rollingWorkerDispatch satisfies never;
   }
  } else if (rollingStoredAssignment.state === 'REWORK') decisions.push({kind:'worker-suspension',hostAction:'quiesce-session',assignment:rollingStoredAssignment,blockers:[]});
  else if (['REVIEW','INTEGRATING','RETIRING'].includes(rollingStoredAssignment.state)
   && !rollingCoordinatorSnapshot.reviews.some(review=>review.request.assignmentId === rollingStoredAssignment.id && review.outcome === null))
   decisions.push(rollingStoredAssignment.state === 'INTEGRATING'
    ? {kind:'assignment',command:'integrate',assignment:rollingStoredAssignment}
    : {kind:'host-assignment',hostAction:rollingStoredAssignment.state === 'REVIEW' ? 'request-adversarial-review' : 'detach-session',assignment:rollingStoredAssignment});
 }
 for (const action of rollingCoordinatorSnapshot.actions) decisions.push({kind:'worker',hostAction:action.kind === 'START_WORKER' ? action.state === 'PENDING' ? 'create-session' : 'observe-session-creation' : action.state === 'PENDING' ? 'resume-session' : 'observe-session-resumption',action});
 if (rollingCoordinatorSnapshot.publicationReadiness.state === 'FROZEN') decisions.push({kind:'publication-freeze',command:'freeze-publication',selection:rollingCoordinatorSnapshot.publicationReadiness,flush:rollingCoordinatorSnapshot.publicationReadiness.trigger === 'threshold' ? null : rollingCoordinatorSnapshot.publicationReadiness.trigger});
 if (rollingCoordinatorSnapshot.scheduling.selected.length > 0) decisions.push({kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest});
 if (rollingCoordinatorSnapshot.obligationProjection.complete && rollingCoordinatorSnapshot.assignments.every(assignment=>assignment.state === 'RELEASED')
  && rollingCoordinatorSnapshot.actions.length === 0 && rollingCoordinatorSnapshot.publications.length === 0
  && rollingCoordinatorSnapshot.publicationReadiness.state === 'WAITING' && rollingCoordinatorSnapshot.publicationReadiness.reason === 'empty') decisions.push({kind:'closure',command:'close'});
 return {snapshot:rollingCoordinatorSnapshot,decisions};
}

// Traceability: implements REQ-ROLLING-QA-APPROVAL
// Traceability: implements REQ-ROLLING-WORKERS
export function readRollingWorkerCommandApproval(rollingNativeServerRequest:RollingNativeServerRequest,
 rollingWorkerContext:RollingWorkerContext,rollingWorkerDispatch:RollingWorkerDispatch | null):'start' | 'continue' | 'focused_qa' | null {
 const params=rollingNativeServerRequest.params;
 if (rollingNativeServerRequest.method !== 'item/commandExecution/requestApproval'
  || params === null || typeof params !== 'object' || Array.isArray(params)
  || 'kind' in params && params.kind !== 'command'
  || rollingWorkerDispatch?.state !== 'ATTACHED'
  || !('cwd' in params) || params.cwd !== rollingWorkerContext.rollingWorkerCreationV1.rootPath
  || !('threadId' in params) || params.threadId !== rollingWorkerContext.rollingWorkerCreationV1.threadId
  || params.threadId !== rollingWorkerDispatch.threadId
  || !('turnId' in params) || params.turnId !== rollingWorkerDispatch.turnId
  || !('command' in params) || typeof params.command !== 'string') return null;
 const matches=(command:string):boolean=>params.command===command||['/bin/bash','/bin/zsh','/bin/sh','/opt/homebrew/bin/bash'].some(shell=>params.command===`${shell} -lc '${command.replaceAll("'","'\\''")}'`);
 const render=(argv:readonly string[]):string=>argv.map(argument=>/^[A-Za-z0-9_./:=@%+-]+$/u.test(argument)?argument:`'${argument.replaceAll("'","'\\''")}'`).join(' ');
 if(rollingWorkerContext.lease.binding.execution.operations.includes('test')) {
  const selections=[rollingWorkerContext.lease.binding.execution.selection,...rollingWorkerContext.binding.unitTests.map(reference=>reference.selection),...rollingWorkerContext.binding.integrationTests.map(reference=>reference.selection)];
  const commands=[...rollingWorkerContext.qa.focused.map(render),...selections.filter(selection=>selection.length>0).flatMap(selection=> {
   const firstArgument=selection[0];
   if(firstArgument===undefined)throw new Error('rolling campaign: required QA selection lacks its executable');
   if(selection.length===1&&/\s/u.test(firstArgument))return /[;$|&<>`\r\n]/u.test(firstArgument)?[]:[firstArgument];
   return [render(selection)];
  })];
  if(commands.some(matches))return 'focused_qa';
 }
 if(!rollingWorkerContext.lease.binding.execution.operations.includes('edit')||rollingWorkerContext.lease.binding.execution.plannedPaths.length===0)return null;
 const commands:Readonly<Record<'start' | 'continue',string>>={
  start:'GIT_SEQUENCE_EDITOR="sed -i.bak -e s/^pick/edit/" git rebase --interactive --force-rebase FETCH_HEAD',
  continue:'git rebase --continue'
 };
 for (const kind of ['start','continue'] satisfies readonly ('start' | 'continue')[]) {
  // Native command display can insert empty shell quotes before the caret.
  // Both spellings retain the same fixed editor; no proposed rule grants authority.
  const commandSpellings=[commands[kind],commands[kind].replace('s/^pick/edit/',"s/''^pick/edit/")];
  if (commandSpellings.some(command=>params.command === command || ['/bin/bash','/bin/zsh','/bin/sh','/opt/homebrew/bin/bash'].some(shell=>
   params.command === `${shell} -lc '${command}'`))) return kind;
 }
 return null;
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function authorizeRollingWorkerCommandApproval(rollingCampaignStore:RollingCampaignStore,
 campaignId:string,assignmentId:string,generation:string,request:RollingNativeServerRequest):Promise<boolean> {
 const rollingWorkerContext=await rollingCampaignStore.workerContext(campaignId,assignmentId,generation);
 const rollingWorkerDispatch=await rollingCampaignStore.workerDispatch(campaignId,assignmentId,generation);
 const approval=readRollingWorkerCommandApproval(request,rollingWorkerContext,rollingWorkerDispatch);
 if (approval === null) return false;
 const root=rollingWorkerContext.rollingWorkerCreationV1.rootPath;
 validateRollingSessionMarker(root,rollingWorkerContext.rollingWorkerCreationV1.sessionId);
 if(approval==='focused_qa')return true;
 return approval === 'start' ? git(root,['rev-parse','--verify','FETCH_HEAD']).trim() ===
  git(root,['rev-parse','--verify',`refs/remotes/${rollingWorkerContext.configuration.mainline.remote}/${rollingWorkerContext.configuration.incrementRef}`]).trim()
  : gitResult(root,['rebase','--show-current-patch']).status === 0;
}

// Traceability: implements REQ-ROLLING-INTERFACES
// Both transports invoke this layer; it never allocates through a Codex plugin.
export class RollingCampaignOperations {
 constructor(private readonly rollingCampaignStore:RollingCampaignStore,private readonly root:string) {}

 // Traceability: implements REQ-ROLLING-CONFIGURATION
 async initialize(rollingCampaignInitializationV1:RollingCampaignInitializationV1):Promise<RollingCampaignRegistrationResult> {
  readRollingCampaignInitializationV1(rollingCampaignInitializationV1);
  if (fs.realpathSync(rollingCampaignInitializationV1.coordinatorRoot) !== fs.realpathSync(this.root)) throw new Error('rolling campaign: initialization root differs from the invoking project');
  return this.rollingCampaignStore.initializeCampaign(async()=> {
  const {coordinatorRoot,documentPath,bindingsPath,bindingHistory} = rollingCampaignInitializationV1;
  const rollingResolvedConfiguration = loadRollingConfiguration(coordinatorRoot,rollingCampaignInitializationV1.configuration);
  if (git(coordinatorRoot,['status','--porcelain']).trim() !== '') throw new Error('rolling campaign: initialization requires a clean coordinator checkout');
  const mainlineRef = `refs/remotes/${rollingResolvedConfiguration.mainline.remote}/${rollingResolvedConfiguration.mainline.branch}`;
  git(coordinatorRoot,['fetch','--no-tags','--',rollingResolvedConfiguration.mainline.remote,`refs/heads/${rollingResolvedConfiguration.mainline.branch}:${mainlineRef}`]);
  const branch = gitResult(coordinatorRoot,['show-ref','--verify','--quiet',`refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
  if (branch.status === 1) git(coordinatorRoot,['branch',rollingResolvedConfiguration.incrementRef,mainlineRef]);
  else if (branch.status !== 0) throw new Error('rolling campaign: cannot inspect the campaign branch');
  git(coordinatorRoot,['switch',rollingResolvedConfiguration.incrementRef]);
  git(coordinatorRoot,['merge','--ff-only',mainlineRef]);
  const revision = git(coordinatorRoot,['rev-parse','HEAD']).trim();
  const rollingIncrementPublication:RollingIncrementPublication = {rootPath:coordinatorRoot,target:{remote:rollingResolvedConfiguration.mainline.remote,branch:rollingResolvedConfiguration.incrementRef},revision};
  if (revision === git(coordinatorRoot,['rev-parse',mainlineRef]).trim()) {
   const remote = gitResult(coordinatorRoot,['ls-remote','--exit-code','--heads','--',rollingResolvedConfiguration.mainline.remote,`refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
   if (remote.status === 2) gitResult(coordinatorRoot,['push','--porcelain','--',rollingResolvedConfiguration.mainline.remote,`refs/heads/${rollingResolvedConfiguration.incrementRef}:refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
   else if (remote.status !== 0) throw new Error('rolling campaign: initial branch observation failed; retain the checkout');
  }
  const rollingIncrementPublicationResult = revision === git(coordinatorRoot,['rev-parse',mainlineRef]).trim()
   ? publishRollingIncrement(rollingIncrementPublication) : reconcileRollingIncrementPublication(rollingIncrementPublication);
  if (rollingIncrementPublicationResult.state !== 'PUBLISHED') throw new Error(`rolling campaign: initial campaign base ${rollingIncrementPublicationResult.state}; preserve the checkout and observe the remote`);
  git(coordinatorRoot,['merge','--ff-only',rollingIncrementPublicationResult.remoteRevision]);
  const rollingManagedDirectory = resolveRollingManagedDirectory(coordinatorRoot);
  const rollingGraph = collectRollingGraph(coordinatorRoot,documentPath,bindingsPath,bindingHistory?.path);
  const rollingCampaignRegistration:RollingCampaignRegistration = {
   id:rollingGraph.document.scopeId,coordinatorRoot:rollingGraph.coordinatorRoot,documentPath,bindingsPath,graphDigest:rollingGraph.digest,
   managedDirectory:rollingManagedDirectory.directory,configuration:rollingResolvedConfiguration,
   ...(bindingHistory === null ? {} : {bindingHistory})
  };
  return rollingCampaignRegistration;
  });
 }

 reconcile(campaignId:string):Promise<RollingGraphReconciliation> { return this.rollingCampaignStore.reconcileCoordinator(campaignId); }
 status(campaignId:string):Promise<RollingCoordinatorSnapshot> { return this.rollingCampaignStore.coordinatorSnapshot(campaignId); }
 async nextActions(campaignId:string):Promise<RollingCoordinatorActions> { return projectRollingCoordinatorActions(await this.status(campaignId)); }

 private async native<Result>(signal:AbortSignal | undefined,operation:(rollingCodex:RollingCodex)=>Promise<Result>,worker: {readonly campaignId:string;readonly assignmentId:string;readonly generation:string} | null = null):Promise<Result> {
  const rollingCodex = await RollingCodex.connect({cwd:this.root});
  let cancellation:Promise<void> | null = null;
  const abort = ():void=> {cancellation ??= rollingCodex.interruptOwnedTurns();};
  signal?.addEventListener('abort',abort,{once:true});
  rollingCodex.on('serverRequest',request=> {
   void (async()=> {
    let approved=false;
    try {
     if (worker !== null) {
      approved=await authorizeRollingWorkerCommandApproval(this.rollingCampaignStore,worker.campaignId,worker.assignmentId,worker.generation,request);
     }
    } catch (cause) {rollingCodex.emit('diagnostic',`worker approval withheld: ${cause instanceof Error ? cause.message : String(cause)}`);}
    rollingCodex.respondToServer(request.id,{decision:approved ? 'accept' : 'decline'});
   })().catch(cause=>rollingCodex.emit('diagnostic',`native approval response failed: ${cause instanceof Error ? cause.message : String(cause)}`));
  });
  try {
   if (signal?.aborted) throw new Error('rolling campaign: operation interrupted');
   return await operation(rollingCodex);
  } finally {
   try {
    if (cancellation !== null) await cancellation;
    await rollingCodex.waitForObservedTurns(3600000);
    if (cancellation !== null) await cancellation;
   } finally {signal?.removeEventListener('abort',abort);await rollingCodex.close();}
  }
 }

 private async preparePublication(campaignId:string,batchId:string):Promise<RollingMainlineCandidateV1> {
  let rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
  if(rollingPublicationContext.withdrawal!==null)throw new Error('rolling campaign: publication was withdrawn; inspect its preserved history instead');
  if (rollingPublicationContext.candidate !== null) return rollingPublicationContext.candidate;
  if (rollingPublicationContext.preparation === null) {
   const rollingPublicationBatchClaimV1 = await this.rollingCampaignStore.beginMainlinePreparation(campaignId,batchId);
   await this.rollingCampaignStore.recordMainlinePreparation(campaignId,batchId,prepareRollingMainline(rollingPublicationBatchClaimV1));
   rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
  }
  if (rollingPublicationContext.preparation === null) throw new Error('rolling campaign: publication preparation remains unresolved');
  const rollingMainlineCandidateV1 = git(rollingPublicationContext.claim.rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${rollingPublicationContext.claim.incrementRef}`
   ? mergeRollingMainline(rollingPublicationContext.claim,rollingPublicationContext.preparation)
   : observeRollingMainlineCandidate(rollingPublicationContext.claim,rollingPublicationContext.preparation);
  return this.rollingCampaignStore.recordMainlineCandidate(campaignId,batchId,rollingMainlineCandidateV1);
 }

 private async refreshPublication(campaignId:string,batchId:string,observe:boolean):Promise<RollingMainlineRefreshResultV1> {
  let rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
  if(rollingPublicationContext.withdrawal!==null)throw new Error('rolling campaign: publication was withdrawn; inspect its preserved history instead');
  if (observe && rollingPublicationContext.refreshResult !== null) return rollingPublicationContext.refreshResult;
  const rollingMainlineRefreshIntentV1 = observe ? rollingPublicationContext.refreshIntent : await this.rollingCampaignStore.beginMainlineRefresh(campaignId,batchId);
  if (rollingMainlineRefreshIntentV1 === null) throw new Error('rolling campaign: refresh has no original retained intent');
  rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
  if (rollingPublicationContext.refreshPreparation === null) {
   const rollingMainlineRefreshPreparationV1 = prepareRollingMainlineRefresh(rollingPublicationContext.claim,rollingMainlineRefreshIntentV1);
   await this.rollingCampaignStore.recordMainlineRefreshPreparation(campaignId,batchId,rollingMainlineRefreshPreparationV1);
   rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
  }
  if (rollingPublicationContext.refreshPreparation === null) throw new Error('rolling campaign: original refresh preparation is unresolved');
  const rollingMainlineRefreshResultV1 = git(rollingPublicationContext.claim.rootPath,['rev-parse','HEAD']).trim() === rollingPublicationContext.refreshPreparation.previousCandidate.revision
   ? mergeRollingMainlineRefresh(rollingPublicationContext.claim,rollingPublicationContext.refreshPreparation)
   : observeRollingMainlineRefresh(rollingPublicationContext.claim,rollingPublicationContext.refreshPreparation);
  return this.rollingCampaignStore.recordMainlineRefresh(campaignId,batchId,rollingMainlineRefreshResultV1);
 }

 private returnIncrementForRepair(campaignId:string,reviewId:string,rollingIncrementRebaseV1:RollingIncrementRebaseV1):Promise<RollingIncrementRepair> {
  if (rollingIncrementRebaseV1.result?.state !== 'TEXTUAL_CONFLICT') throw new Error('rolling campaign: worker repair requires a recorded textual conflict');
  return this.rollingCampaignStore.requestIncrementRepair(campaignId,reviewId,
   `Textual conflict in original integration ${rollingIncrementRebaseV1.incrementId}: ${rollingIncrementRebaseV1.result.originalCommit}; paths ${rollingIncrementRebaseV1.result.conflictedPaths.join(', ')}. Worker semantic repair and fresh original review are required.`);
 }

 // Traceability: implements REQ-ROLLING-PUBLICATION
 async observeIncrement(campaignId:string,reviewId:string,stopped:string):Promise<RollingOperationResults['observe-increment']> {
  if (!stopped.trim()) throw new Error('rolling campaign: increment observation requires original command cessation evidence');
  const rollingCoordinatorSnapshot=await this.status(campaignId);
  const rollingStoredIncrement=rollingCoordinatorSnapshot.increments.find(increment=>increment.claim.reviewId === reviewId);
  if (!rollingStoredIncrement || fs.realpathSync(this.root) !== rollingStoredIncrement.claim.coordinatorRoot) throw new Error('rolling campaign: increment observation requires the original coordinator checkout');
  return this.rollingCampaignStore.observeIncrementPublication(campaignId,reviewId);
 }

 // Traceability: implements REQ-ROLLING-REVIEW
 // Traceability: implements REQ-ROLLING-PUBLICATION
 async integrate(campaignId:string,reviewId:string):Promise<RollingOperationResults['integrate']> {
  const rollingCoordinatorSnapshot=await this.status(campaignId);
  const existingRollingStoredIncrement=rollingCoordinatorSnapshot.increments.find(increment=>increment.claim.reviewId === reviewId);
  if (existingRollingStoredIncrement?.state === 'PUBLISHED') return this.rollingCampaignStore.observeIncrementPublication(campaignId,reviewId);
  const retainedRollingIncrementRebaseV1=await this.rollingCampaignStore.incrementRebase(campaignId,reviewId);
  if (existingRollingStoredIncrement && ['PUSHING','UNCONFIRMED','PUSH_REJECTED','REBASE_REQUIRED'].includes(existingRollingStoredIncrement.state)) {
   if (fs.realpathSync(this.root) !== existingRollingStoredIncrement.claim.coordinatorRoot) throw new Error('rolling campaign: integration recovery requires the original coordinator checkout');
   if (retainedRollingIncrementRebaseV1?.result?.state !== 'REBASED') throw new Error('rolling campaign: push recovery lacks its original candidate');
   fastForwardRollingIncrement(existingRollingStoredIncrement.claim.coordinatorRoot,existingRollingStoredIncrement.claim.target.branch,retainedRollingIncrementRebaseV1.result.revision);
   const observedRollingIncrementPublicationV1=await this.rollingCampaignStore.observeIncrementPublication(campaignId,reviewId);
   if (observedRollingIncrementPublicationV1.result.state === 'PUBLISHED' || observedRollingIncrementPublicationV1.result.state === 'UNCONFIRMED') return observedRollingIncrementPublicationV1;
   return this.rollingCampaignStore.retryIncrementPush(campaignId,reviewId);
  }
  if (retainedRollingIncrementRebaseV1?.result?.state === 'TEXTUAL_CONFLICT') return this.returnIncrementForRepair(campaignId,reviewId,retainedRollingIncrementRebaseV1);
  const rollingIncrementClaimV1=await this.rollingCampaignStore.claimIncrement(campaignId,reviewId);
  if (fs.realpathSync(this.root) !== rollingIncrementClaimV1.coordinatorRoot) throw new Error('rolling campaign: integration requires the original coordinator checkout');
  const rollingIncrementRebaseV1=retainedRollingIncrementRebaseV1 ?? await this.rollingCampaignStore.beginIncrementRebase(campaignId,reviewId);
  let rollingFastRebaseResult=rollingIncrementRebaseV1.result;
  if (rollingFastRebaseResult === null) {
   const rebasePath=git(rollingIncrementClaimV1.rootPath,['rev-parse','--path-format=absolute','--git-path','rebase-merge']).trim();
   rollingFastRebaseResult=git(rollingIncrementClaimV1.rootPath,['rev-parse','HEAD']).trim() === rollingIncrementRebaseV1.reviewedRevision && !fs.existsSync(rebasePath)
    ? rebasePreparedRollingIncrement(rollingIncrementClaimV1.rootPath,rollingIncrementRebaseV1) : observePreparedRollingIncrement(rollingIncrementClaimV1.rootPath,rollingIncrementRebaseV1);
   await this.rollingCampaignStore.recordIncrementRebase(campaignId,reviewId,rollingFastRebaseResult);
  }
  if (rollingFastRebaseResult.state === 'TEXTUAL_CONFLICT') return this.returnIncrementForRepair(campaignId,reviewId,{...rollingIncrementRebaseV1,result:rollingFastRebaseResult});
  const rollingStoredSubmissions=await this.rollingCampaignStore.submissions(campaignId,rollingIncrementClaimV1.assignmentId);
  const reviewedRollingStoredSubmission=rollingStoredSubmissions.find(submission=>submission.submission.revision === rollingIncrementClaimV1.reviewedRevision && submission.submission.generation === rollingIncrementClaimV1.generation);
  if (!reviewedRollingStoredSubmission) throw new Error('rolling campaign: integration lacks its exact reviewed submission');
  const rollingPhysicalProjectConfig=parseRollingProjectConfig(fs.readFileSync(path.join(rollingIncrementClaimV1.coordinatorRoot,'.agents/config/project/rolling-campaigns.json'),'utf8'));
  const rollingWorkerSubmissionV1=rollingFastRebaseResult.proofRefreshRequired ? refreshRollingIncrementProof(rollingIncrementClaimV1,rollingFastRebaseResult,reviewedRollingStoredSubmission.submission,rollingPhysicalProjectConfig.qa.focused) : reviewedRollingStoredSubmission.submission;
  await this.rollingCampaignStore.recordIncrementProof(campaignId,reviewId,rollingWorkerSubmissionV1);
  return this.rollingCampaignStore.publishIncrement(campaignId,reviewId);
 }

 // Traceability: implements REQ-ROLLING-INTERFACES
 async execute(command:RollingCommandName,value:unknown,signal?:AbortSignal):Promise<RollingOperationResponse> {
  if (command === 'legacy') return {command,result:inspectRollingLegacy(this.root,value)};
  const input = readRollingCommandInput(command,value);
  const timeoutMs = 3600000;
  switch (command) {
   case 'reset': {
    if(input.execute!==undefined&&typeof input.execute!=='boolean')throw new Error('rolling campaign: execute must be boolean');
    return {command,result:await this.native(signal,rollingCodex=>this.rollingCampaignStore.resetProject(this.root,input.request,input.execute===true,rollingCodex))};
   }
   case 'init': return {command,result:await this.initialize(readRollingCampaignInitializationV1(input.request))};
   case 'reconcile': return {command,result:await this.reconcile(stringField(input,'campaign'))};
   case 'status': return {command,result:await this.status(stringField(input,'campaign'))};
   case 'next-actions': return {command,result:await this.nextActions(stringField(input,'campaign'))};
   case 'rebind-worker': {
    const campaignId = stringField(input,'campaign');
    const rollingGraphReconciliation = await this.reconcile(campaignId);
    return {command,result:await this.rollingCampaignStore.rebindLease(campaignId,stringField(input,'assignment'),stringField(input,'generation'),rollingGraphReconciliation.graphDigest)};
   }
   case 'replenish': {
    const trigger = input.trigger ?? 'periodic';
    if (trigger !== 'event' && trigger !== 'periodic') throw new Error('rolling campaign: trigger must be event or periodic');
    let rollingAssignmentRelease:RollingAssignmentRelease | null = null;
    if (input.release !== undefined) {const release = record(input.release);if (Object.keys(release).some(key=>!['id','generation'].includes(key))) throw new Error('rolling campaign: undeclared release fields');rollingAssignmentRelease={id:stringField(release,'id'),generation:stringField(release,'generation')};}
    if(input['existing-only']!==undefined&&typeof input['existing-only']!=='boolean')throw new Error('rolling campaign: existing-only must be boolean');
    return {command,result:await this.replenish(stringField(input,'campaign'),trigger,rollingAssignmentRelease,input['existing-only']===true)};
   }
   case 'provision-worker': return {command,result:await this.native(signal,async rollingCodex=> {
    const campaignId = stringField(input,'campaign'),actionId = stringField(input,'action'),generation = stringField(input,'generation');
    const rollingWorkerInitialization = await provisionRollingWorker(this.rollingCampaignStore,rollingCodex,campaignId,actionId,generation);
    return attachRollingWorker(this.rollingCampaignStore,rollingCodex,campaignId,actionId,generation,rollingWorkerInitialization,timeoutMs);
   })};
   case 'recover-worker': return {command,result:await this.native(signal,rollingCodex=>recoverRollingWorkerCreation(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'action'),stringField(input,'generation')))};
   case 'resume-worker': case 'observe-resumption': return {command,result:await this.native(signal,rollingCodex=>resumeRollingWorker(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'action'),stringField(input,'generation')))};
   case 'dispatch-worker': return {command,result:await this.native(signal,async rollingCodex=> {
    const campaignId = stringField(input,'campaign'),assignmentId = stringField(input,'assignment'),generation = stringField(input,'generation');
    await dispatchRollingWorker(this.rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation);
    return collectRollingWorkerSubmission(this.rollingCampaignStore,rollingCodex,campaignId,assignmentId,generation,timeoutMs);
   },{campaignId:stringField(input,'campaign'),assignmentId:stringField(input,'assignment'),generation:stringField(input,'generation')})};
   case 'prepare-worker-dispatch': return {command,result:await this.native(signal,rollingCodex=>prepareRollingWorkerDispatch(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation')))};
   case 'acknowledge-worker-dispatch': return {command,result:await this.native(signal,rollingCodex=>acknowledgeRollingWorkerDispatch(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),stringField(input,'dispatch'),stringField(input,'turn')))};
   case 'collect-submission': return {command,result:await this.native(signal,rollingCodex=>collectRollingWorkerSubmission(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),timeoutMs,input.observation===undefined?null:readRollingWorkerOwnerObservationV1(input.observation)))};
   case 'retry-worker': return {command,result:await this.native(signal,rollingCodex=>correctRollingWorker(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),stringField(input,'reason'),input.observation===undefined?null:readRollingWorkerOwnerObservationV1(input.observation)))};
   case 'suspend-worker': return {command,result:await this.native(signal,rollingCodex=>suspendRollingWorker(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),stringArray(input.blockers),timeoutMs))};
   case 'retire-worker': return {command,result:await this.native(signal,rollingCodex=>retireRollingWorker(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),timeoutMs))};
   case 'start-review': return {command,result:await this.native(signal,rollingCodex=>startRollingReview(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),stringField(input,'revision'),readRollingReviewerLoss(input.loss),timeoutMs))};
   case 'submit': return {command,result:await this.rollingCampaignStore.submit(stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),readRollingWorkerSubmissionV1(input.submission))};
   case 'record-review': {
    const rollingReviewOutcomeV1=readRollingReviewOutcomeV1(input.outcome);
    return {command,result:await this.rollingCampaignStore.recordReviewOutcome(stringField(input,'campaign'),stringField(input,'review'),rollingReviewOutcomeV1.reviewerSessionId,rollingReviewOutcomeV1)};
   }
   case 'request-review': return {command,result:await this.rollingCampaignStore.requestReview(stringField(input,'campaign'),stringField(input,'assignment'),stringField(input,'generation'),stringField(input,'revision'),stringField(input,'reviewer'),readRollingReviewerLoss(input.loss))};
   case 'dispatch-review': return {command,result:await this.native(signal,async rollingCodex=> {
    const campaignId = stringField(input,'campaign'),reviewId = stringField(input,'review');
    const rollingReviewContext = await this.rollingCampaignStore.reviewContext(campaignId,reviewId);
    const rollingNativeThread = await rollingCodex.resumeThread(stringField(input,'thread'),rollingReviewContext.rootPath);
    await dispatchRollingReview(this.rollingCampaignStore,rollingCodex,campaignId,reviewId,rollingNativeThread);
    return collectRollingReview(this.rollingCampaignStore,rollingCodex,campaignId,reviewId,timeoutMs);
   })};
   case 'inspect-review': return {command,result:await this.native(signal,rollingCodex=>collectRollingReview(this.rollingCampaignStore,rollingCodex,stringField(input,'campaign'),stringField(input,'review'),timeoutMs))};
   case 'observe-increment': return {command,result:await this.observeIncrement(stringField(input,'campaign'),stringField(input,'review'),stringField(input,'stopped'))};
   case 'integrate': return {command,result:await this.integrate(stringField(input,'campaign'),stringField(input,'review'))};
   case 'accept': return {command,result:await this.rollingCampaignStore.acceptIncrementCertificates(stringField(input,'campaign'),stringField(input,'review'),stringField(input,'candidate'),stringArray(input.bindings))};
   case 'amend-configuration': {
    const campaignId=stringField(input,'campaign');
    return {command,result:await this.rollingCampaignStore.amendConfiguration(campaignId,readRollingConfigurationAmendmentRequestV1(input.request),this.root)};
   }
   case 'withdraw-publication': {
    const campaignId=stringField(input,'campaign'),batchId=stringField(input,'batch');
    const rollingPublicationContext=await this.rollingCampaignStore.publicationContext(campaignId,batchId);
    if (fs.realpathSync(this.root)!==rollingPublicationContext.claim.rootPath) throw new Error('rolling campaign: withdrawal requires the original publication checkout');
    return {command,result:await this.rollingCampaignStore.withdrawPublication(campaignId,batchId,stringField(input,'reason'),stringArray(input.authority))};
   }
   case 'freeze-publication': {
    const campaignId = stringField(input,'campaign');const rollingGraphReconciliation = await this.reconcile(campaignId);
    const flush = input.flush ?? null;if (flush !== null && flush !== 'explicit_flush' && flush !== 'completion' && flush !== 'quiescence') throw new Error('rolling campaign: invalid publication flush trigger');
    return {command,result:await this.rollingCampaignStore.claimPublicationBatch(campaignId,rollingGraphReconciliation.graphDigest,flush)};
   }
   case 'prepare-publication': case 'observe-preparation': return {command,result:await this.preparePublication(stringField(input,'campaign'),stringField(input,'batch'))};
   case 'inspect-publication-conflict': case 'observe-publication-qa': return {command,result:await this.rollingCampaignStore.publicationContext(stringField(input,'campaign'),stringField(input,'batch'))};
   case 'repair-publication': {
    const campaignId=stringField(input,'campaign'),batchId=stringField(input,'batch');
    const rollingPublicationContext=await this.rollingCampaignStore.publicationContext(campaignId,batchId);
    if (fs.realpathSync(this.root)!==rollingPublicationContext.claim.rootPath) throw new Error('rolling campaign: repair requires the original publication checkout');
    return {command,result:await this.rollingCampaignStore.repairPublication(campaignId,batchId,readRollingPublicationRepairReviewV1(input.review))};
   }
   case 'run-publication-qa': {
    const campaignId = stringField(input,'campaign'),batchId = stringField(input,'batch');
    const rollingPublicationQaJobV1 = await this.rollingCampaignStore.beginPublicationQa(campaignId,batchId);
    const rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId,batchId);
    if (rollingPublicationContext.candidate === null) throw new Error('rolling campaign: QA has no verified candidate');
    const rollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationContext.claim,rollingPublicationContext.candidate,rollingPublicationQaJobV1.id,rollingPublicationQaJobV1.configurationDigest,rollingPublicationQaJobV1.commands);
    return {command,result:await this.rollingCampaignStore.recordPublicationQa(campaignId,batchId,rollingPublicationQaV1)};
   }
   case 'publish-mainline': return {command,result:await this.rollingCampaignStore.publishMainline(stringField(input,'campaign'),stringField(input,'batch'))};
   case 'observe-mainline': return {command,result:await this.rollingCampaignStore.observeMainlinePublication(stringField(input,'campaign'),stringField(input,'batch'))};
   case 'refresh-mainline': case 'observe-refresh': return {command,result:await this.refreshPublication(stringField(input,'campaign'),stringField(input,'batch'),command === 'observe-refresh')};
   case 'synchronize-campaign': return {command,result:await this.rollingCampaignStore.synchronizePublishedCampaign(stringField(input,'campaign'),stringField(input,'batch'))};
   case 'close': return {command,result:await this.rollingCampaignStore.closeCampaign(stringField(input,'campaign'))};
  }
 }

 // Traceability: implements REQ-ROLLING-SCHEDULING
 // A missed event and the periodic poll run the same fenced allocation path.
 async replenish(campaignId:string,trigger:RollingReplenishment['trigger'],rollingAssignmentRelease:RollingAssignmentRelease | null = null,existingOnly=false):Promise<RollingReplenishment> {
  const rollingGraphReconciliation = await this.reconcile(campaignId);
  const initialRollingCoordinatorSnapshot = await this.status(campaignId);
  const allocations:RollingAllocationResult[] = [];
  let stopReason:RollingAllocationResult['reason']=null;
  for (let index=0;index<initialRollingCoordinatorSnapshot.configuration.maxActiveWorkers;index++) {
   const rollingAllocationResult = await this.rollingCampaignStore.allocate(campaignId,rollingGraphReconciliation.graphDigest,index === 0 && rollingAssignmentRelease !== null ? rollingAssignmentRelease : undefined,existingOnly);
   if (rollingAllocationResult.assignment === null) {stopReason=rollingAllocationResult.reason;break;}
   allocations.push(rollingAllocationResult);
  }
  return {trigger,graphDigest:rollingGraphReconciliation.graphDigest,allocations,stopReason,snapshot:await this.status(campaignId)};
 }
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function withRollingCampaignOperations<Result>(root:string,operation:(rollingCampaignOperations:RollingCampaignOperations)=>Promise<Result>):Promise<Result> {
 const journal = readJson(fs.readFileSync(path.join(root,'ponytail-journal.json'),'utf8'));
 const project = record(journal);
 if (project.schemaVersion !== 1 || typeof project.projectId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(project.projectId)) throw new Error('rolling campaign: invoking project journal has no valid V1 identity');
 const pool = new Pool(databaseOptions(root));
 try {return await operation(new RollingCampaignOperations(new RollingCampaignStore(pool,project.projectId),root));}
 finally {await pool.end();}
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function executeRollingCommand(root:string,command:RollingCommandName,value:unknown,signal?:AbortSignal):Promise<RollingOperationResponse> {
 if (command === 'legacy') return {command,result:inspectRollingLegacy(fs.realpathSync(root),value)};
 return withRollingCampaignOperations(root,rollingCampaignOperations=>rollingCampaignOperations.execute(command,value,signal));
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function runRollingOperationCli(argv:readonly string[]):Promise<void> {
 const [command,...arguments_] = argv;
 if (command === undefined || command === '--help') {process.stdout.write(rollingCampaignHelp());return;}
 if (!isRollingCommandName(command)) throw new Error(`rolling campaign: unknown command ${command}`);
 const definition = rollingCommandDefinitions.find(item=>item.name === command);
 if (!definition?.cli) throw new Error(`rolling campaign: unknown or retired CLI command ${command}; session operations belong to the coordinator host tools`);
 if (arguments_.length === 1 && arguments_[0] === '--help') {process.stdout.write(rollingCampaignHelp(command));return;}
 const input:Record<string,unknown> = {};
 let jsonOutput = false;
 for (let index=0;index<arguments_.length;index++) {
  const flag = arguments_[index];
  if (flag === '--json') {if (jsonOutput) throw new Error('rolling campaign: repeated --json');jsonOutput=true;continue;}
  const field = definition.fields.find(item=>`--${item.name}` === flag);
  if (!field || Object.hasOwn(input,field.name)) throw new Error(`rolling campaign: unknown or repeated argument ${flag}`);
  const value = arguments_[++index];
  if (value === undefined || value.startsWith('--')) throw new Error(`rolling campaign: missing value for ${flag}`);
  input[field.name] = field.kind === 'json' ? readJson(value.startsWith('@') ? fs.readFileSync(value.slice(1),'utf8') : value) : value;
 }
 const abortController = new AbortController();
 const cancel = ():void=>abortController.abort();
 process.once('SIGINT',cancel);
 try {
  const rollingOperationResponse = await executeRollingCommand(fs.realpathSync(process.cwd()),command,input,abortController.signal);
  process.stdout.write(JSON.stringify(rollingOperationResponse)+'\n');
 } finally {process.removeListener('SIGINT',cancel);if (abortController.signal.aborted) process.exitCode=130;}
}
if (require.main === module) runRollingOperationCli(process.argv.slice(2)).catch((error:unknown)=> {
 if (process.exitCode === 130) return;
 process.stderr.write((error instanceof Error ? error.message : String(error))+'\n');process.exitCode=error instanceof RollingLegacyInspectionError ? error.exitCode : 1;
});
