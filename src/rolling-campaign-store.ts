// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import crypto from 'node:crypto';
import {resetRollingProject,type RollingProjectResetV1} from './rolling-reset.js';
import type {RollingCodex} from './rolling-codex.js';
import {readRollingPublicationRepairReviewV1,readRollingPublicationRepairV1,validateRollingPublicationRepair,type RollingPublicationRepairReviewV1,type RollingPublicationRepairV1,readRollingMainlineRefreshIntentV1,readRollingMainlineRefreshPreparationV1,readRollingMainlineRefreshResultV1,type RollingMainlineRefreshIntentV1,type RollingMainlineRefreshPreparationV1,type RollingMainlineRefreshResultV1,synchronizeRollingCampaign,readRollingMainlinePublicationV1,type RollingMainlinePublicationV1,readRollingMainlinePreparationV1,readRollingMainlineCandidateV1,readRollingPublicationQaV1,parseRollingPublicationQa,readRollingPublicationQaJobV1,verifyRollingMainlineCandidate,verifyRollingPublicationQa,type RollingMainlinePreparationV1,type RollingMainlineCandidateV1,type RollingPublicationQaV1,type RollingPublicationQaJobV1,selectRollingPublicationBatch,readRollingPublicationBatchClaimV1,type RollingPublicationBatchClaimV1,type RollingPublicationWaiting,type RollingPublicationTrigger,type RollingAcceptedIncrement,type RollingPublicationSelection} from './rolling-publication.js';
import {git,gitResult,readRollingIncrementClaimV1,readRollingIncrementRebaseV1,verifyRollingIncrementRebase,prepareRollingIncrementRebase,readRollingIncrementPublicationV1,reconcileRollingIncrementPublication,publishRollingIncrement,verifyRollingIncrementLocalIntegration,fastForwardRollingIncrement,verifyRollingIncrementConflictInspection,type RollingIncrementConflictInspection,type RollingIncrementRepair,type RollingIncrementClaimV1,type RollingIncrementRebaseV1,type RollingFastRebaseResult,type RollingIncrementPublicationV1,type RollingIncrementPublicationResult,type RollingIncrementPushStarted} from './rolling-integration.js';
import path from 'node:path';
import { parse } from 'lossless-json';
import type { Pool, PoolClient } from 'pg';
import { isDeepStrictEqual } from 'node:util';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseRollingWorkerSubmission, readRollingWorkerSubmissionV1, validateRollingWorkerSubmission,
  type RollingWorkerSubmissionV1 } from './rolling-worker-submission.js';
import { readObligationLeaseV1, freezeObligationLease, assertObligationLeaseOperation,
  type ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import { relativePath,parseObligationDocument,inputDigest,obligationInputCovers,isObligationGitInputs,type ObligationDocumentV1,type ObligationProjection, type Obligation } from '../skills/plan-execution/scripts/obligations.js';
import {acceptBoundCheckpoint,type ObligationCertificateBindingRequest,type ObligationCertificateSubmission} from '../skills/plan-execution/scripts/obligation-certificate-bindings.js';
import type {SwarmWorktreeMembership,SwarmSessionIdentity,SwarmWorkerAssignment,SwarmWorkerBinding} from './swarm-store.js';
import {readWorker} from './swarm-store.js';
import { readRollingWorkerRetirementV1, type RollingWorkerRetirementV1, readRollingWorkerResumptionV1, parseRollingWorkerResumption, type RollingWorkerResumptionV1, readRollingWorkerStopV1, parseRollingWorkerStop, type RollingWorkerStopV1, buildRollingWorkerInstructions, readRollingWorkerCreationV1, parseRollingWorkerCreation, type RollingWorkerCreationV1, type RollingWorkerContext } from './rolling-worker.js';
import { cleanupRollingWorktree, validateRollingSessionMarker, resolveRollingManagedDirectory, requireRollingSessionMarkerAbsent, requireRollingGitOperationAbsent } from './rolling-worktrees.js';
import { readRollingReviewRequestV1, readRollingReviewOutcomeV1, parseRollingReviewRequest, parseRollingReviewOutcome,
  readRollingReviewReplacementV1, parseRollingReviewReplacement, validateRollingReviewOutcome, type RollingReviewRequestV1, type RollingReviewOutcomeV1,
  type RollingReviewReplacementV1, type RollingReviewerLoss, type RollingStoredReview } from './rolling-review.js';
import { collectRollingGraph, selectRollingAssignments, resolveRollingConfiguration, readRollingCampaignRequest, readRollingResolvedConfiguration, readRollingBindingsV1,
  type RollingAssignment, type RollingAssignmentState, type RollingBinding, type RollingCampaignRequest,
  type RollingArgv, type RollingGraph, type RollingResolvedConfiguration, type RollingSchedulingBlock, type RollingSchedulingResult } from './rolling-campaign.js';

export interface RollingAssignmentScopeV1 {
  readonly schemaVersion: 1;
  readonly plannedPaths: readonly string[];
  readonly exclusiveResources: readonly string[];
  readonly binding: RollingBinding;
}
export interface RollingExecutionConfigV1 extends RollingResolvedConfiguration { readonly schemaVersion: 1 }
export interface RollingBindingHistoryConfiguration {
  readonly path: string;
  readonly assessor: string;
  readonly authority: readonly string[];
}
export interface RollingExecutionConfigV2 extends RollingResolvedConfiguration {
  readonly schemaVersion: 2;
  readonly bindingHistory: RollingBindingHistoryConfiguration;
}
// Discriminator: schemaVersion
export type RollingExecutionConfig = RollingExecutionConfigV1 | RollingExecutionConfigV2 | RollingExecutionConfigV3;
export interface RollingExecutionConfigV3 extends RollingResolvedConfiguration {
  readonly schemaVersion: 3;
  readonly bindingHistory: RollingBindingHistoryConfiguration | null;
}
export interface RollingAssignmentScopeV2 {
  readonly schemaVersion: 2;
  readonly lease: ObligationLeaseV1;
  readonly exclusiveResources: readonly string[];
  readonly binding: RollingBinding;
}
// Discriminator: schemaVersion
export type RollingAssignmentScope = RollingAssignmentScopeV1 | RollingAssignmentScopeV2 | RollingAssignmentScopeV3;
export interface RollingUnleasedAssignmentExecution {readonly kind:'unleased';readonly plannedPaths:readonly string[];}
export interface RollingLeasedAssignmentExecution {readonly kind:'leased';readonly lease:ObligationLeaseV1;}
// Discriminator: kind
export type RollingAssignmentExecution = RollingUnleasedAssignmentExecution | RollingLeasedAssignmentExecution;
export interface RollingAssignmentScopeV3 {
  readonly schemaVersion:3;
  readonly execution:RollingAssignmentExecution;
  readonly exclusiveResources:readonly string[];
  readonly binding:RollingBinding;
}
export interface RollingStoredAssignment extends RollingAssignment {
  readonly generation: string;
  readonly sessionId: string | null;
  readonly retired: boolean;
  readonly worktreeNumber: number;
  readonly binding: RollingBinding;
  readonly lease: ObligationLeaseV1 | null;
}
interface RollingPoolRow { readonly managed_directory: string }
interface RollingCampaignRow {
  readonly campaign_id: string;
  readonly coordinator_root: string;
  readonly document_path: string;
  readonly bindings_path: string;
  readonly graph_digest: string;
  readonly configuration_text: string;
  readonly closure_text: string | null;
}
export interface RollingCampaignClosureV1 {
 readonly schemaVersion:1;readonly id:string;readonly campaignId:string;readonly graphDigest:string;
 readonly revision:string;readonly campaignRemoteRevision:string;readonly mainlineRevision:string;
}
// Traceability: implements REQ-ROLLING-STATE
// Traceability: implements REQ-ROLLING-INTERFACES
export function readRollingCampaignClosureV1(value:unknown):RollingCampaignClosureV1 {
 requireKeys(value,['schemaVersion','id','campaignId','graphDigest','revision','campaignRemoteRevision','mainlineRevision']);
 const id = stringColumn(value.id,'closure ID');requireState(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id),'invalid closure ID');
 const campaignId = stringColumn(value.campaignId,'closure campaign');
 const graphDigest = stringColumn(value.graphDigest,'closure graph');requireState(/^[a-f0-9]{64}$/u.test(graphDigest),'invalid closure graph');
 const revision = stringColumn(value.revision,'closure revision'),campaignRemoteRevision = stringColumn(value.campaignRemoteRevision,'closure campaign remote'),mainlineRevision = stringColumn(value.mainlineRevision,'closure mainline');
 for (const commit of [revision,campaignRemoteRevision,mainlineRevision]) requireState(/^([a-f0-9]{40}|[a-f0-9]{64})$/u.test(commit),'invalid closure commit');
 return {schemaVersion:1,id,campaignId,graphDigest,revision,campaignRemoteRevision,mainlineRevision};
}
export const RollingCampaignClosureReaders = {V1:readRollingCampaignClosureV1};
export interface RollingCampaignRegistration {
  readonly id: string;
  readonly coordinatorRoot: string;
  readonly documentPath: string;
  readonly bindingsPath: string;
  readonly graphDigest: string;
  readonly managedDirectory: string;
  readonly configuration: RollingCampaignRequest;
  readonly bindingHistory?: RollingBindingHistoryConfiguration;
}
export interface RollingCampaignRegistrationResult { readonly id: string; readonly graphDigest: string }
export interface RollingGraphReconciliation { readonly graphDigest: string }
export interface RollingConfigurationAmendmentRequestV1 {
 readonly schemaVersion:1;readonly id:string;readonly expected:RollingResolvedConfiguration;
 readonly configuration:RollingCampaignRequest;readonly reason:string;readonly authority:readonly string[];
}
export interface RollingConfigurationAmendmentV1 {
 readonly schemaVersion:1;readonly id:string;readonly campaignId:string;
 readonly request:RollingConfigurationAmendmentRequestV1;
 readonly previousConfiguration:RollingExecutionConfigV3;readonly configuration:RollingExecutionConfigV3;
}
export interface RollingPublicationWithdrawalV1 {
 readonly schemaVersion:1;readonly id:string;readonly campaignId:string;readonly batchId:string;
 readonly reason:string;readonly authority:readonly string[];
}
function lifecycleAuthority(reason:unknown,authority:unknown):{readonly reason:string;readonly authority:readonly string[]} {
 requireState(typeof reason==='string'&&reason.trim().length>0&&isStringArray(authority)&&authority.length>0,'lifecycle change requires reason and authority');
 return {reason,authority};
}
function requireSettledCoordinator(root:string):void {
 requireState(git(root,['status','--porcelain']).trim()==='','preserve dirty coordinator inputs before lifecycle change');
 for(const operation of ['MERGE_HEAD','CHERRY_PICK_HEAD','rebase-merge','rebase-apply','sequencer']) {
  requireState(!fs.existsSync(path.resolve(root,git(root,['rev-parse','--git-path',operation]).trim())),'finish the retained Git operation before lifecycle change');
 }
}
// Traceability: implements REQ-ROLLING-CONFIGURATION-AMENDMENT
export function readRollingConfigurationAmendmentRequestV1(value:unknown):RollingConfigurationAmendmentRequestV1 {
 requireKeys(value,['schemaVersion','id','expected','configuration','reason','authority']);
 const id=stringColumn(value.id,'amendment request ID');requireState(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id),'invalid amendment request ID');
 return {schemaVersion:1,id,expected:readRollingResolvedConfiguration(value.expected),configuration:readRollingCampaignRequest(value.configuration),...lifecycleAuthority(value.reason,value.authority)};
}
export const RollingConfigurationAmendmentRequestReaders={V1:readRollingConfigurationAmendmentRequestV1};
// Traceability: implements REQ-ROLLING-CONFIGURATION-AMENDMENT
export function readRollingConfigurationAmendmentV1(value:unknown):RollingConfigurationAmendmentV1 {
 requireKeys(value,['schemaVersion','id','campaignId','request','previousConfiguration','configuration']);
 const rollingConfigurationAmendmentRequestV1=readRollingConfigurationAmendmentRequestV1(value.request);
 requireState(value.id===rollingConfigurationAmendmentRequestV1.id,'amendment receipt differs from request');
 return {schemaVersion:1,id:rollingConfigurationAmendmentRequestV1.id,campaignId:stringColumn(value.campaignId,'campaign ID'),request:rollingConfigurationAmendmentRequestV1,
  previousConfiguration:readRollingExecutionConfigV3(value.previousConfiguration),configuration:readRollingExecutionConfigV3(value.configuration)};
}
export const RollingConfigurationAmendmentReaders={V1:readRollingConfigurationAmendmentV1};
// Traceability: implements REQ-ROLLING-PUBLICATION-WITHDRAWAL
export function readRollingPublicationWithdrawalV1(value:unknown):RollingPublicationWithdrawalV1 {
 requireKeys(value,['schemaVersion','id','campaignId','batchId','reason','authority']);
 for(const key of ['id','batchId'])requireState(typeof value[key]==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value[key]),'invalid withdrawal identity');
 return {schemaVersion:1,id:stringColumn(value.id,'withdrawal ID'),campaignId:stringColumn(value.campaignId,'campaign ID'),batchId:stringColumn(value.batchId,'batch ID'),...lifecycleAuthority(value.reason,value.authority)};
}
export const RollingPublicationWithdrawalReaders={V1:readRollingPublicationWithdrawalV1};
interface RollingPublicationQaConfiguration {readonly digest:string;readonly commands:readonly RollingArgv[]}
export interface RollingPublicationBatchClaimed { readonly state:'CLAIMED';readonly claim:RollingPublicationBatchClaimV1 }
// Discriminator: state
export type RollingPublicationBatchClaimResult = RollingPublicationBatchClaimed | RollingPublicationWaiting;

export interface RollingAssignmentTransition { readonly id: string; readonly state: RollingAssignmentState }
export interface RollingLeaseRenewal { readonly id: string; readonly generation: string; readonly lease: ObligationLeaseV1 }
export interface RollingSessionAttachment { readonly id: string; readonly sessionId: string; readonly state: 'WORKING' }
export interface RollingAssignmentRelease { readonly id: string; readonly generation: string }
export interface RollingNativeWorkerSelection {
 readonly sessionId:string;
 readonly workerGeneration:string;
 readonly worktreeGeneration:string;
}
export interface RollingWorkerRetirement {
  readonly rollingWorkerRetirementV1:RollingWorkerRetirementV1;
  readonly state:'PREPARED' | 'NOTIFYING' | 'NOTIFIED' | 'ARCHIVING' | 'ARCHIVED' | 'CLEANED';
  readonly turnId:string | null;
}
function readWorkerRetirement(row:Record<string,unknown>):RollingWorkerRetirement {
  const rollingWorkerRetirementV1 = readRollingWorkerRetirementV1(readStateText(stringColumn(row.context_text,'retirement context')));
  const state = row.state;
  requireState(state === 'PREPARED' || state === 'NOTIFYING' || state === 'NOTIFIED' || state === 'ARCHIVING' || state === 'ARCHIVED' || state === 'CLEANED','invalid retirement state');
  const turnId = row.turn_id === null ? null : stringColumn(row.turn_id,'retirement turn');
  return {rollingWorkerRetirementV1,state,turnId};
}

export interface RollingSubmissionReceipt { readonly assignmentId: string; readonly generation: string; readonly revision: string; readonly state: 'REVIEW' }
export interface RollingStoredSubmission { readonly submission: RollingWorkerSubmissionV1; readonly lease: ObligationLeaseV1 }
export interface RollingReviewCandidate { readonly rootPath: string; readonly obligation: Obligation; readonly binding: RollingBinding; readonly submission: RollingStoredSubmission }
export interface RollingReviewContext extends RollingReviewCandidate { readonly review: RollingStoredReview }
interface RollingReviewDispatchIdentity { readonly id: string; readonly reviewerThreadId: string }
export interface RollingReviewDispatchStarted extends RollingReviewDispatchIdentity { readonly state: 'STARTED' }
export interface RollingReviewDispatchAttached extends RollingReviewDispatchIdentity { readonly state: 'ATTACHED'; readonly turnId: string }
// Discriminator: state
export type RollingReviewDispatch = RollingReviewDispatchStarted | RollingReviewDispatchAttached;
export interface RollingWorkerReservation {
  readonly coordinatorRoot: string;
  readonly rootPath: string;
  readonly number: number;
  readonly baseCommit: string;
  readonly assignmentId: string;
  readonly generation: string;
}
interface RollingWorkerDispatchIdentity { readonly id: string; readonly threadId: string; readonly instructions: string }
export interface RollingWorkerDispatchStarted extends RollingWorkerDispatchIdentity { readonly state: 'STARTED' }
export interface RollingWorkerDispatchAttached extends RollingWorkerDispatchIdentity { readonly state: 'ATTACHED'; readonly turnId: string }
// Discriminator: state
export type RollingWorkerDispatch = RollingWorkerDispatchStarted | RollingWorkerDispatchAttached;
export interface RollingAllocatedWorktree { readonly number: number; readonly rootPath: string }
export interface RollingAllocationResult {
  readonly assignment: RollingStoredAssignment | null;
  readonly worktree?: RollingAllocatedWorktree;
  readonly actionId?: string;
  readonly reason: 'capacity_reached' | 'no_ready_obligation' | 'no_available_worktree' | null;
  readonly blocked?: readonly RollingSchedulingBlock[];
}
export interface RollingCampaignStatus { readonly graphDigest: string; readonly assignments: readonly RollingStoredAssignment[] }
export type RollingPublicationState = 'FROZEN' | 'PREPARING' | 'CONFLICT' | 'CANDIDATE' | 'QA_RUNNING' | 'QA_FAILED' | 'QA_PASSED' | 'PUSHING' | 'PUBLISHED' | 'REBASE_REQUIRED' | 'PUSH_REJECTED' | 'UNCONFIRMED';
export interface RollingPublicationStatus {
  readonly claim: RollingPublicationBatchClaimV1;
  readonly state: RollingPublicationState;
  readonly qaId: string | null;
  readonly publicationId: string | null;
  readonly pendingRefreshId: string | null;
}
export interface RollingPublicationContext {
  readonly withdrawal:RollingPublicationWithdrawalV1|null;
 readonly claim:RollingPublicationBatchClaimV1;readonly preparation:RollingMainlinePreparationV1 | null;
 readonly candidate:RollingMainlineCandidateV1 | null;readonly qaJob:RollingPublicationQaJobV1 | null;readonly qa:RollingPublicationQaV1 | null;
 readonly refreshIntent:RollingMainlineRefreshIntentV1 | null;readonly refreshPreparation:RollingMainlineRefreshPreparationV1 | null;readonly refreshResult:RollingMainlineRefreshResultV1 | null;
}
export type RollingIncrementState='CLAIMED' | 'REBASING' | 'CONFLICT' | 'REBASED' | 'PUSHING' | 'PUBLISHED' | 'REBASE_REQUIRED' | 'PUSH_REJECTED' | 'UNCONFIRMED';
export interface RollingPublicationReadinessBlocked {readonly state:'BLOCKED';readonly reason:'publication_owned' | 'integration_active' | 'certificate_acceptance';readonly ownerCampaignId:string}
export type RollingPublicationReadiness=RollingPublicationSelection | RollingPublicationReadinessBlocked;
interface RollingPublicationLane {readonly publicationCampaignId:string | null;readonly integrationCampaignId:string | null}
export interface RollingStoredIncrement {readonly claim:RollingIncrementClaimV1;readonly state:RollingIncrementState;readonly publication:RollingIncrementPublicationV1 | null;readonly obligationSatisfied:boolean}
export interface RollingStoredReviewDispatch {readonly reviewId:string;readonly dispatch:RollingReviewDispatch}
export interface RollingStoredWorkerDispatch {readonly assignmentId:string;readonly generation:string;readonly dispatch:RollingWorkerDispatch}
export interface RollingCoordinatorSnapshot extends RollingCampaignStatus {
  readonly obligationProjection:ObligationProjection;
  readonly closure:RollingCampaignClosureV1 | null;
  readonly observedGraphDigest: string;
  readonly configuration: RollingExecutionConfigV3;
  readonly scheduling: RollingSchedulingResult;
  readonly actions: readonly RollingAction[];
  readonly reviews: readonly RollingStoredReview[];
  readonly workerDispatches:readonly RollingStoredWorkerDispatch[];
  readonly reviewDispatches:readonly RollingStoredReviewDispatch[];
  readonly releasableAssignments:readonly RollingAssignmentRelease[];
  readonly publications: readonly RollingPublicationStatus[];
  readonly increments:readonly RollingStoredIncrement[];
  readonly publicationReadiness:RollingPublicationReadiness;
}
export type RollingActionState = 'PENDING' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export type RollingActionKind = 'START_WORKER' | 'RESUME_WORKER';
export interface RollingAction {
  readonly id: string;
  readonly assignmentId: string;
  readonly kind: RollingActionKind;
  readonly generation: string;
  readonly state: RollingActionState;
}
interface RollingActionRow extends RollingAction { readonly resultText: string | null }
export interface RollingActionAcknowledgment { readonly id: string; readonly state: 'STARTED' | 'COMPLETED' }
export interface RollingWorkerCreationInspection {
  readonly action:RollingAction;
  readonly assignment:RollingStoredAssignment;
  readonly worktree:RollingAllocatedWorktree;
  readonly rollingWorkerCreationV1:RollingWorkerCreationV1 | null;
}
export interface RollingStoredWorktree extends RollingAllocatedWorktree {
  readonly state: 'AVAILABLE' | 'PROVISIONING' | 'RESERVED' | 'ACTIVE' | 'QUARANTINED';
}

function requireState(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`rolling campaign: ${message}`);
}
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function readStateText(text: string): unknown {
  const value: unknown = parse(text, null, token => {
    requireState(/^(0|[1-9][0-9]*)$/.test(token), 'state numbers must be unsigned integers');
    const number = Number(token);
    requireState(Number.isSafeInteger(number), 'state number exceeds safe integer range'); return number;
  });
  return value;
}
function requireKeys(value: unknown, keys: readonly string[], schemaVersion: 1 | 2 | 3 = 1): asserts value is Record<string, unknown> {
  requireState(isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), 'invalid stored contract fields');
  requireState(value.schemaVersion === schemaVersion, 'unsupported stored contract version');
}
function isStringArray(value: unknown): value is readonly string[] { return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.length > 0); }
function storedBinding(value: unknown, exclusiveResources: unknown): RollingBinding {
  const rollingBindingsV1 = readRollingBindingsV1({ schemaVersion: 1, bindings: [value] });
  const rollingBinding = rollingBindingsV1.bindings[0];
  requireState(rollingBinding, 'stored binding is missing');
  requireState(isStringArray(exclusiveResources) && new Set(exclusiveResources).size === exclusiveResources.length, 'invalid stored exclusiveResources');
  requireState(JSON.stringify(exclusiveResources) === JSON.stringify(rollingBinding.exclusiveResources), 'stored scope and binding resources differ');
  return rollingBinding;
}
function isRollingAssignmentScopeV1(value: unknown): value is RollingAssignmentScopeV1 {
  requireKeys(value, ['schemaVersion', 'plannedPaths', 'exclusiveResources', 'binding']);
  storedBinding(value.binding, value.exclusiveResources);
  requireState(isStringArray(value.plannedPaths) && new Set(value.plannedPaths).size === value.plannedPaths.length, 'invalid stored plannedPaths');
  requireState(value.plannedPaths.every(item => !path.isAbsolute(item) && !item.includes('\\') && item.split('/').every(part => part !== '' && part !== '.' && part !== '..')), 'invalid stored planned path');
  return true;
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingAssignmentScopeV1(value: unknown): RollingAssignmentScopeV1 {
  requireState(isRollingAssignmentScopeV1(value), 'invalid stored scope'); return value;
}
function isRollingExecutionConfigV1(value: unknown): value is RollingExecutionConfigV1 {
  requireKeys(value, ['schemaVersion', 'mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize']);
  readRollingResolvedConfiguration({ mainline: value.mainline, incrementRef: value.incrementRef,
    maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize }); return true;
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingExecutionConfigV1(value: unknown): RollingExecutionConfigV1 {
  requireState(isRollingExecutionConfigV1(value), 'invalid stored execution configuration'); return value;
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingAssignmentScopeV2(value: unknown): RollingAssignmentScopeV2 {
  requireKeys(value, ['schemaVersion', 'lease', 'exclusiveResources', 'binding'], 2);
  const obligationLeaseV1 = readObligationLeaseV1(value.lease);
  const rollingBinding = storedBinding(value.binding, value.exclusiveResources);
  requireState(rollingBinding.obligationId === obligationLeaseV1.binding.obligationId, 'stored lease and binding obligation differ');
  return { schemaVersion: 2, lease: obligationLeaseV1, binding: rollingBinding, exclusiveResources: rollingBinding.exclusiveResources };
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingBindingHistoryConfiguration(value:unknown):RollingBindingHistoryConfiguration {
  requireState(isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(['assessor','authority','path']), 'invalid binding history configuration');
  relativePath(value.path);
  const assessor = stringColumn(value.assessor,'binding assessor');
  requireState(isStringArray(value.authority) && value.authority.length > 0 && new Set(value.authority).size === value.authority.length,'invalid binding authority');
  return {path:value.path,assessor,authority:[...value.authority]};
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingExecutionConfigV2(value: unknown): RollingExecutionConfigV2 {
  requireKeys(value, ['schemaVersion', 'mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize', 'bindingHistory'], 2);
  const rollingBindingHistoryConfiguration = readRollingBindingHistoryConfiguration(value.bindingHistory);
  const rollingResolvedConfiguration = readRollingResolvedConfiguration({ mainline: value.mainline, incrementRef: value.incrementRef,
    maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize });
  return { schemaVersion: 2, ...rollingResolvedConfiguration,
    bindingHistory:rollingBindingHistoryConfiguration };
}
// Traceability: implements REQ-ROLLING-STATE
export function readRollingExecutionConfigV3(value:unknown):RollingExecutionConfigV3 {
  requireKeys(value,['schemaVersion','mainline','incrementRef','maxActiveWorkers','publicationSize','bindingHistory'],3);
  const rollingResolvedConfiguration = readRollingResolvedConfiguration({mainline:value.mainline,incrementRef:value.incrementRef,maxActiveWorkers:value.maxActiveWorkers,publicationSize:value.publicationSize});
  return {schemaVersion:3,...rollingResolvedConfiguration,bindingHistory:value.bindingHistory === null ? null : readRollingBindingHistoryConfiguration(value.bindingHistory)};
}
// Traceability: implements REQ-ROLLING-STATE
// Traceability: implements REQ-ROLLING-GRAPH
export function readRollingAssignmentScopeV3(value:unknown):RollingAssignmentScopeV3 {
  requireKeys(value,['schemaVersion','execution','exclusiveResources','binding'],3);
  const rollingBinding = storedBinding(value.binding,value.exclusiveResources);
  requireState(isRecord(value.execution),'invalid assignment execution');
  const execution = value.execution;
  let rollingAssignmentExecution:RollingAssignmentExecution;
  switch(execution.kind) {
    case 'unleased':
      requireState(JSON.stringify(Object.keys(execution).sort()) === JSON.stringify(['kind','plannedPaths']),'invalid unleased execution fields');
      requireState(isStringArray(execution.plannedPaths) && new Set(execution.plannedPaths).size === execution.plannedPaths.length,'invalid stored plannedPaths');
      for(const relative of execution.plannedPaths) relativePath(relative);
      rollingAssignmentExecution={kind:'unleased',plannedPaths:execution.plannedPaths};break;
    case 'leased': {
      requireState(JSON.stringify(Object.keys(execution).sort()) === JSON.stringify(['kind','lease']),'invalid leased execution fields');
      const obligationLeaseV1=readObligationLeaseV1(execution.lease);
      requireState(obligationLeaseV1.binding.obligationId === rollingBinding.obligationId,'stored lease and binding obligation differ');
      rollingAssignmentExecution={kind:'leased',lease:obligationLeaseV1};break;
    }
    default: throw new Error('rolling campaign: unsupported assignment execution');
  }
  return {schemaVersion:3,execution:rollingAssignmentExecution,exclusiveResources:rollingBinding.exclusiveResources,binding:rollingBinding};
}
export const RollingAssignmentScopeReaders = { V1: readRollingAssignmentScopeV1, V2: readRollingAssignmentScopeV2, V3:readRollingAssignmentScopeV3 };
export const RollingExecutionConfigReaders = { V1: readRollingExecutionConfigV1, V2: readRollingExecutionConfigV2, V3:readRollingExecutionConfigV3 };
export function parseRollingExecutionConfig(text: string): RollingExecutionConfigV3 {
  const value = readStateText(text);
  requireState(isRecord(value), 'invalid execution configuration');
  switch (value.schemaVersion) {
    case 1: return {...readRollingExecutionConfigV1(value),schemaVersion:3,bindingHistory:null};
    case 2: return {...readRollingExecutionConfigV2(value),schemaVersion:3};
    case 3: return readRollingExecutionConfigV3(value);
    default: throw new Error('rolling campaign: unsupported stored execution configuration');
  }
}
export function parseRollingAssignmentScope(text: string): RollingAssignmentScopeV3 {
  const value = readStateText(text);
  requireState(isRecord(value), 'invalid assignment scope');
  switch (value.schemaVersion) {
    case 1: {
      const rollingAssignmentScopeV1=readRollingAssignmentScopeV1(value);
      return {schemaVersion:3,execution:{kind:'unleased',plannedPaths:rollingAssignmentScopeV1.plannedPaths},binding:rollingAssignmentScopeV1.binding,exclusiveResources:rollingAssignmentScopeV1.exclusiveResources};
    }
    case 2: {
      const rollingAssignmentScopeV2=readRollingAssignmentScopeV2(value);
      return {schemaVersion:3,execution:{kind:'leased',lease:rollingAssignmentScopeV2.lease},binding:rollingAssignmentScopeV2.binding,exclusiveResources:rollingAssignmentScopeV2.exclusiveResources};
    }
    case 3: return readRollingAssignmentScopeV3(value);
    default: throw new Error('rolling campaign: unsupported stored assignment scope');
  }
}

function stringColumn(value: unknown, label: string): string {
  requireState(typeof value === 'string' && value.length > 0, `invalid database ${label}`); return value;
}
function nullableStringColumn(value: unknown, label: string): string | null { return value === null ? null : stringColumn(value, label); }
function booleanColumn(value: unknown, label: string): boolean { requireState(typeof value === 'boolean', `invalid database ${label}`); return value; }
function publicationState(value: unknown): RollingPublicationState {
  switch (value) {
    case 'FROZEN': case 'PREPARING': case 'CONFLICT': case 'CANDIDATE': case 'QA_RUNNING': case 'QA_FAILED': case 'QA_PASSED': case 'PUSHING': case 'PUBLISHED': case 'REBASE_REQUIRED': case 'PUSH_REJECTED': case 'UNCONFIRMED': return value;
    default: throw new Error('rolling campaign: invalid database publication state');
  }
}
function readStoredReview(row: Record<string,unknown>): RollingStoredReview {
  const text = nullableStringColumn(row.outcome_text, 'review outcome');
  const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
  const rollingReviewOutcomeV1 = text === null ? null : parseRollingReviewOutcome(text);
  if (rollingReviewOutcomeV1) validateRollingReviewOutcome(rollingReviewRequestV1, rollingReviewOutcomeV1);
  return { request: rollingReviewRequestV1, outcome: rollingReviewOutcomeV1 };
}
function incrementState(value:unknown):RollingIncrementState {
 switch(value) {case 'CLAIMED':case 'REBASING':case 'CONFLICT':case 'REBASED':case 'PUSHING':case 'PUBLISHED':case 'REBASE_REQUIRED':case 'PUSH_REJECTED':case 'UNCONFIRMED':return value;default:throw new Error('rolling campaign: invalid increment state');}
}
function readReviewDispatch(row:Record<string,unknown>):RollingReviewDispatch {
  const id = stringColumn(row.dispatch_id, 'review dispatch');
  const reviewerThreadId = stringColumn(row.reviewer_thread_id, 'reviewer thread');
  if (row.state === 'STARTED') { requireState(row.turn_id === null, 'started review dispatch has a turn'); return { id, reviewerThreadId, state: 'STARTED' }; }
  requireState(row.state === 'ATTACHED', 'unsupported review dispatch state');
  return { id, reviewerThreadId, state: 'ATTACHED', turnId: stringColumn(row.turn_id, 'review turn') };
}
function readWorkerDispatch(row:Record<string,unknown>):RollingWorkerDispatch {
  const rollingWorkerDispatchIdentity: RollingWorkerDispatchIdentity = {id:stringColumn(row.dispatch_id,'worker dispatch'),
    threadId:stringColumn(row.thread_id,'worker thread'),instructions:stringColumn(row.instructions_text,'worker instructions')};
  if (row.state === 'STARTED') {requireState(row.turn_id === null,'started worker dispatch has a turn');return {...rollingWorkerDispatchIdentity,state:'STARTED'};}
  requireState(row.state === 'ATTACHED','invalid worker dispatch state');
  return {...rollingWorkerDispatchIdentity,state:'ATTACHED',turnId:stringColumn(row.turn_id,'worker turn')};
}
function worktreeNumber(value: unknown): number {
  requireState(typeof value === 'number' || typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), 'invalid database worktree number');
  const number = Number(value);
  requireState(Number.isSafeInteger(number) && number >= 101, 'invalid database worktree number'); return number;
}
function assignmentState(value: unknown): RollingAssignmentState {
  switch (value) {
    case 'RESERVED': case 'PROVISIONING': case 'ATTACHING': case 'WORKING': case 'REVIEW': case 'REWORK': case 'INTEGRATING': case 'RETIRING': case 'INACTIVE': case 'RELEASED': return value;
    default: throw new Error('rolling campaign: invalid database assignment state');
  }
}
function readPool(value: unknown): RollingPoolRow {
  requireState(isRecord(value), 'project pool is not registered'); return { managed_directory: stringColumn(value.managed_directory, 'managed directory') };
}
function readCampaign(value: unknown): RollingCampaignRow {
  requireState(isRecord(value), 'campaign is not registered');
  return { campaign_id: stringColumn(value.campaign_id, 'campaign ID'), coordinator_root: stringColumn(value.coordinator_root, 'coordinator root'),
    document_path: stringColumn(value.document_path, 'document path'), bindings_path: stringColumn(value.bindings_path, 'bindings path'),
    graph_digest: stringColumn(value.graph_digest, 'graph digest'), configuration_text: stringColumn(value.configuration_text, 'configuration text'),closure_text:nullableStringColumn(value.closure_text,'campaign closure') };
}
function readAssignment(value: unknown): RollingStoredAssignment {
  requireState(isRecord(value), 'assignment row is missing');
  const rollingAssignmentScopeV3 = parseRollingAssignmentScope(stringColumn(value.scope_text, 'scope text'));
  const obligationLeaseV1 = rollingAssignmentScopeV3.execution.kind === 'leased' ? rollingAssignmentScopeV3.execution.lease : null;
  requireState(obligationLeaseV1 === null || obligationLeaseV1.generation === value.generation
    && obligationLeaseV1.scopeId === value.campaign_id && obligationLeaseV1.binding.obligationId === value.obligation_id, 'stored lease identity differs from assignment');
  const blockers = readStateText(stringColumn(value.blockers_text, 'blockers text'));
  requireState(isStringArray(blockers) && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)), 'invalid stored blockers');
  return { id: stringColumn(value.assignment_id, 'assignment ID'), scopeId: stringColumn(value.campaign_id, 'campaign ID'), obligationId: stringColumn(value.obligation_id, 'obligation ID'),
    generation: stringColumn(value.generation, 'generation'), state: assignmentState(value.state), sessionId: nullableStringColumn(value.session_id, 'session ID'),
    activityStopped: booleanColumn(value.activity_stopped, 'activity stopped'), retired: booleanColumn(value.retired, 'retired'), worktreeNumber: worktreeNumber(value.worktree_number),
    plannedPaths: rollingAssignmentScopeV3.execution.kind === 'unleased' ? rollingAssignmentScopeV3.execution.plannedPaths : rollingAssignmentScopeV3.execution.lease.binding.execution.plannedPaths,
    exclusiveResources: rollingAssignmentScopeV3.exclusiveResources, binding: rollingAssignmentScopeV3.binding, lease: obligationLeaseV1, blockers };
}
export function readWorktree(value: unknown): RollingStoredWorktree {
  requireState(isRecord(value), 'worktree row is missing');
  const state = value.state;
  requireState(state === 'AVAILABLE' || state === 'PROVISIONING' || state === 'RESERVED' || state === 'ACTIVE' || state === 'QUARANTINED', 'invalid database worktree state');
  return { number: worktreeNumber(value.number), rootPath: stringColumn(value.root_path, 'worktree root'), state };
}
function readAction(value: unknown): RollingActionRow {
  requireState(isRecord(value), 'action row is missing');
  const state = value.state;
  const kind = value.kind;
  requireState(state === 'PENDING' || state === 'STARTED' || state === 'COMPLETED' || state === 'CANCELLED', 'invalid database action state');
  requireState(kind === 'START_WORKER' || kind === 'RESUME_WORKER', 'invalid database action kind');
  const resultText = value.result_text;
  requireState(resultText === null || typeof resultText === 'string', 'invalid database action result');
  return { id: stringColumn(value.action_id, 'action ID'), assignmentId: stringColumn(value.assignment_id, 'assignment ID'), generation: stringColumn(value.generation, 'generation'),
    state, kind, resultText };
}

// Traceability: implements REQ-ROLLING-STATE
// Traceability: supports REQ-ROLLING-SCHEDULING
export class RollingCampaignStore {
  constructor(private readonly pool: Pool, private readonly projectId: string) {}

  private async campaign(poolClient:PoolClient,campaignId:string):Promise<RollingCampaignRow> {
    return readCampaign((await poolClient.query<Record<string,unknown>>('SELECT c.*, (SELECT receipt_text FROM ponytail_index.rolling_campaign_closure_v1 r WHERE r.project_id=c.project_id AND r.campaign_id=c.campaign_id) AS closure_text FROM ponytail_index.rolling_campaign_v1 c WHERE c.project_id=$1 AND c.campaign_id=$2 FOR UPDATE',[this.projectId,campaignId])).rows[0]);
  }

  private async transaction<Result>(campaignId: string, operation: (poolClient: PoolClient, rollingCampaignRow: RollingCampaignRow, rollingPoolRow: RollingPoolRow) => Promise<Result>,allowClosed=false): Promise<Result> {
    const poolClient = await this.pool.connect();
    try {
      await poolClient.query<Record<string, unknown>>('BEGIN');
      await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);
      const pendingReset=(await poolClient.query("SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1 AND state='PENDING'",[this.projectId])).rows;
      requireState(pendingReset.length===0,'project reset is pending; resume reset before scheduling');
      const pool = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
      const rollingPoolRow = readPool(pool);
      const rollingCampaignRow = await this.campaign(poolClient,campaignId);
      requireState(allowClosed || rollingCampaignRow.closure_text === null,'campaign is closed; scheduling and mutations are refused');
      const result = await operation(poolClient, rollingCampaignRow, rollingPoolRow);
      await poolClient.query<Record<string, unknown>>('COMMIT');
      return result;
    } catch (error) { await poolClient.query<Record<string, unknown>>('ROLLBACK'); throw error; }
    finally { poolClient.release(); }
  }

  async resetProject(root:string,request:unknown,execute:boolean,rollingCodex:RollingCodex|null):Promise<RollingProjectResetV1> {
    const poolClient=await this.pool.connect();
    try{return await resetRollingProject(poolClient,this.projectId,root,request,execute,rollingCodex);}
    finally{poolClient.release();}
  }

  // Traceability: implements REQ-ROLLING-RESET
  async initializeCampaign(prepare:()=>Promise<RollingCampaignRegistration>):Promise<RollingCampaignRegistrationResult> {
    const poolClient=await this.pool.connect();
    let locked=false;
    try {
      const row=(await poolClient.query<Record<string,unknown>>('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[this.projectId])).rows[0];
      requireState(row?.locked===true,'project operation owns reset/initialization');locked=true;
      const pendingReset=(await poolClient.query("SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1 AND state='PENDING'",[this.projectId])).rows;
      requireState(pendingReset.length===0,'project reset is pending; resume reset before initialization');
      return await this.registerCampaign(await prepare(),poolClient);
    } finally {try{if(locked)await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[this.projectId]);}finally{poolClient.release();}}
  }

  async registerCampaign(request: RollingCampaignRegistration,initializationPoolClient:PoolClient|null=null): Promise<RollingCampaignRegistrationResult> {
    const rollingGraph = collectRollingGraph(request.coordinatorRoot, request.documentPath, request.bindingsPath, request.bindingHistory?.path);
    requireState(rollingGraph.digest === request.graphDigest && rollingGraph.document.scopeId === request.id, 'stale or mismatched coordinator graph');
    const rollingResolvedConfiguration = resolveRollingConfiguration(rollingGraph.projectConfiguration, request.configuration, null);
    const rollingExecutionConfigV3 = readRollingExecutionConfigV3({schemaVersion:3,...rollingResolvedConfiguration,bindingHistory:request.bindingHistory ?? null});
    requireState(path.isAbsolute(request.managedDirectory), 'managed directory must be absolute');
    const poolClient = initializationPoolClient ?? await this.pool.connect();
    try {
      await poolClient.query<Record<string, unknown>>('BEGIN');
      await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);
      const pendingReset=(await poolClient.query("SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1 AND state='PENDING'",[this.projectId])).rows;
      requireState(pendingReset.length===0,'project reset is pending; resume reset before scheduling');
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2) ON CONFLICT DO NOTHING', [this.projectId, request.managedDirectory]);
      const pool=(await poolClient.query<Record<string,unknown>>('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE',[this.projectId])).rows[0];
      if(readPool(pool).managed_directory!==request.managedDirectory) {
        const native=(await poolClient.query<Record<string,unknown>>(`SELECT n.root_path,k.worktree_number FROM ponytail_index.swarm_worker_v1 k
          JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.state='BOUND'`,[this.projectId,request.coordinatorRoot])).rows;
        requireState(native.some(row=>row.root_path!==path.join(readPool(pool).managed_directory,String(row.worktree_number))),'managed directory differs from project pool');
      }
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (project_id,campaign_id) DO NOTHING',
        [this.projectId, request.id, rollingGraph.coordinatorRoot, request.documentPath, request.bindingsPath, rollingGraph.digest, JSON.stringify(rollingExecutionConfigV3)]);
      const registeredRollingCampaignRow = readCampaign((await poolClient.query<Record<string,unknown>>('SELECT c.*, (SELECT receipt_text FROM ponytail_index.rolling_campaign_closure_v1 r WHERE r.project_id=c.project_id AND r.campaign_id=c.campaign_id) AS closure_text FROM ponytail_index.rolling_campaign_v1 c WHERE c.project_id=$1 AND c.campaign_id=$2',[this.projectId,request.id])).rows[0]);
      requireState(registeredRollingCampaignRow.closure_text === null,'campaign is closed');
      requireState(registeredRollingCampaignRow.coordinator_root === rollingGraph.coordinatorRoot && registeredRollingCampaignRow.document_path === request.documentPath
        && registeredRollingCampaignRow.bindings_path === request.bindingsPath && registeredRollingCampaignRow.graph_digest === rollingGraph.digest
        && isDeepStrictEqual(parseRollingExecutionConfig(registeredRollingCampaignRow.configuration_text),rollingExecutionConfigV3),'campaign is already initialized with different inputs; reconcile its retained state');
      await poolClient.query<Record<string, unknown>>('COMMIT');
      return { id: request.id, graphDigest: rollingGraph.digest };
    } catch (error) { await poolClient.query<Record<string, unknown>>('ROLLBACK'); throw error; }
    finally { if(initializationPoolClient===null)poolClient.release(); }
  }

  private collectGraph(rollingCampaignRow: RollingCampaignRow): RollingGraph {
    const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
    return collectRollingGraph(rollingCampaignRow.coordinator_root, rollingCampaignRow.document_path, rollingCampaignRow.bindings_path,
      rollingExecutionConfigV3.bindingHistory?.path);
  }
  private graph(rollingCampaignRow: RollingCampaignRow, expectedDigest: string): RollingGraph {
    const rollingGraph = this.collectGraph(rollingCampaignRow);
    requireState(rollingGraph.digest === expectedDigest && rollingCampaignRow.graph_digest === expectedDigest, 'stale coordinator graph');
    requireState(rollingGraph.document.scopeId === rollingCampaignRow.campaign_id, 'campaign scope changed');
    return rollingGraph;
  }

  async reconcileGraph(campaignId: string, expectedDigest: string, nextDigest: string): Promise<RollingGraphReconciliation> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      requireState(rollingCampaignRow.graph_digest === expectedDigest, 'stale accepted graph');
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      requireState(rollingGraph.digest === nextDigest && rollingGraph.document.scopeId === campaignId, 'stale proposed graph');
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2', [this.projectId, campaignId, nextDigest]);
      return { graphDigest: nextDigest };
    });
  }

  // Traceability: implements REQ-ROLLING-INTERFACES
  // Traceability: implements REQ-ROLLING-GRAPH
  async reconcileCoordinator(campaignId: string): Promise<RollingGraphReconciliation> {
    return this.transaction(campaignId, async (poolClient,rollingCampaignRow) => {
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      requireState(rollingGraph.document.scopeId === campaignId,'campaign scope changed');
      await poolClient.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2',[this.projectId,campaignId,rollingGraph.digest]);
      return {graphDigest:rollingGraph.digest};
    });
  }

  // Traceability: implements REQ-ROLLING-CONFIGURATION-AMENDMENT
  async amendConfiguration(campaignId:string,rollingConfigurationAmendmentRequestV1:RollingConfigurationAmendmentRequestV1,coordinatorRoot:string):Promise<RollingConfigurationAmendmentV1> {
    const checkedRollingConfigurationAmendmentRequestV1=readRollingConfigurationAmendmentRequestV1(rollingConfigurationAmendmentRequestV1);
    return this.transaction(campaignId,async(poolClient,rollingCampaignRow)=> {
      requireState(fs.realpathSync(coordinatorRoot)===rollingCampaignRow.coordinator_root,'amendment requires the original coordinator checkout');
      const previous=(await poolClient.query<Record<string,unknown>>('SELECT amendment_text FROM ponytail_index.rolling_configuration_amendment_v1 WHERE project_id=$1 AND campaign_id=$2 AND amendment_id=$3',[this.projectId,campaignId,checkedRollingConfigurationAmendmentRequestV1.id])).rows[0];
      if(previous) {
        const rollingConfigurationAmendmentV1=readRollingConfigurationAmendmentV1(readStateText(stringColumn(previous.amendment_text,'amendment')));
        requireState(isDeepStrictEqual(rollingConfigurationAmendmentV1.request,checkedRollingConfigurationAmendmentRequestV1),'amendment retry differs from original request');return rollingConfigurationAmendmentV1;
      }
      const previousRollingExecutionConfigV3=parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const previousRollingResolvedConfiguration:RollingResolvedConfiguration={mainline:previousRollingExecutionConfigV3.mainline,incrementRef:previousRollingExecutionConfigV3.incrementRef,maxActiveWorkers:previousRollingExecutionConfigV3.maxActiveWorkers,publicationSize:previousRollingExecutionConfigV3.publicationSize};
      requireState(isDeepStrictEqual(previousRollingResolvedConfiguration,checkedRollingConfigurationAmendmentRequestV1.expected),'stale expected campaign configuration');
      const rollingGraph=this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest);
      const gitDefaultBranchResult=gitResult(rollingCampaignRow.coordinator_root,['config','--get','init.defaultBranch']);
      requireState(gitDefaultBranchResult.status===0||gitDefaultBranchResult.status===1,'cannot resolve Git default branch');
      const rollingResolvedConfiguration=resolveRollingConfiguration(rollingGraph.projectConfiguration,checkedRollingConfigurationAmendmentRequestV1.configuration,gitDefaultBranchResult.stdout.trim()||null);
      requireState(rollingResolvedConfiguration.incrementRef===previousRollingExecutionConfigV3.incrementRef&&rollingResolvedConfiguration.mainline.remote===previousRollingExecutionConfigV3.mainline.remote,'amendment must preserve increment branch and remote');
      const rollingPublicationLane=await this.publicationLane(poolClient,rollingCampaignRow);
      requireState(rollingPublicationLane.publicationCampaignId===null&&rollingPublicationLane.integrationCampaignId===null,'settle or withdraw existing publication/integration ownership before amendment');
      requireSettledCoordinator(rollingCampaignRow.coordinator_root);
      const rollingExecutionConfigV3:RollingExecutionConfigV3={schemaVersion:3,...rollingResolvedConfiguration,bindingHistory:previousRollingExecutionConfigV3.bindingHistory};
      const rollingConfigurationAmendmentV1=readRollingConfigurationAmendmentV1({schemaVersion:1,id:checkedRollingConfigurationAmendmentRequestV1.id,campaignId,request:checkedRollingConfigurationAmendmentRequestV1,previousConfiguration:previousRollingExecutionConfigV3,configuration:rollingExecutionConfigV3});
      await poolClient.query('INSERT INTO ponytail_index.rolling_configuration_amendment_v1(project_id,campaign_id,amendment_id,amendment_text) VALUES($1,$2,$3,$4)',[this.projectId,campaignId,rollingConfigurationAmendmentV1.id,JSON.stringify(rollingConfigurationAmendmentV1)]);
      await poolClient.query('UPDATE ponytail_index.rolling_campaign_v1 SET configuration_text=$3 WHERE project_id=$1 AND campaign_id=$2',[this.projectId,campaignId,JSON.stringify(rollingExecutionConfigV3)]);
      return rollingConfigurationAmendmentV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION-WITHDRAWAL
  async withdrawPublication(campaignId:string,id:string,reason:string,authority:readonly string[]):Promise<RollingPublicationWithdrawalV1> {
    const authorized=lifecycleAuthority(reason,authority);
    return this.transaction(campaignId,async poolClient=> {
      const previous=(await poolClient.query<Record<string,unknown>>('SELECT withdrawal_text FROM ponytail_index.rolling_publication_withdrawal_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      if(previous) {
        const rollingPublicationWithdrawalV1=readRollingPublicationWithdrawalV1(readStateText(stringColumn(previous.withdrawal_text,'withdrawal')));
        requireState(rollingPublicationWithdrawalV1.reason===reason&&isDeepStrictEqual(rollingPublicationWithdrawalV1.authority,authority),'withdrawal retry differs from original authority');return rollingPublicationWithdrawalV1;
      }
      const batch=(await poolClient.query<Record<string,unknown>>('SELECT state,publication_id,pending_refresh_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(batch&&['FROZEN','CANDIDATE','QA_FAILED','QA_PASSED'].includes(stringColumn(batch.state,'publication state'))&&batch.publication_id===null&&batch.pending_refresh_id===null,'withdrawal requires settled QA/preparation and no started push');
      const rollingPublicationBatchClaimV1=await this.publicationClaim(poolClient,campaignId,id);
      requireSettledCoordinator(rollingPublicationBatchClaimV1.rootPath);
      const rollingPublicationWithdrawalV1=readRollingPublicationWithdrawalV1({schemaVersion:1,id:crypto.randomUUID(),campaignId,batchId:id,...authorized});
      await poolClient.query('INSERT INTO ponytail_index.rolling_publication_withdrawal_v1(project_id,campaign_id,batch_id,withdrawal_text) VALUES($1,$2,$3,$4)',[this.projectId,campaignId,id,JSON.stringify(rollingPublicationWithdrawalV1)]);
      await poolClient.query('UPDATE ponytail_index.rolling_publication_member_v1 SET withdrawn=true WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id]);
      await poolClient.query('UPDATE ponytail_index.rolling_publication_batch_v1 SET withdrawn=true WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id]);
      return rollingPublicationWithdrawalV1;
    });
  }

  private async assignment(poolClient: PoolClient, campaignId: string, id: string, generation: string): Promise<RollingStoredAssignment> {
    const row = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3', [this.projectId, campaignId, id])).rows[0];
    requireState(row && row.generation === generation && row.state !== 'RELEASED', 'invalid lease generation or released assignment');
    return readAssignment(row);
  }

  private async cancelActions(poolClient: PoolClient, assignmentId: string): Promise<void> {
    await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_action_v1 SET state='CANCELLED' WHERE project_id=$1 AND assignment_id=$2 AND state='PENDING'", [this.projectId, assignmentId]);
    const started = (await poolClient.query<Record<string, unknown>>("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND state='STARTED'", [this.projectId, assignmentId])).rows;
    requireState(started.length === 0, 'external action outcome must be reconciled before stopping ownership');
    const workerDispatches = (await poolClient.query<Record<string, unknown>>("SELECT dispatch_id FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND assignment_id=$2 AND state='STARTED'", [this.projectId, assignmentId])).rows;
    requireState(workerDispatches.length === 0, 'worker dispatch outcome must be reconciled before stopping ownership');
  }

  private async setWorkerInactive(poolClient:PoolClient,campaignId:string,id:string,blockers:readonly string[]):Promise<RollingAssignmentTransition> {
    await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='INACTIVE',activity_stopped=true,blockers_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",[this.projectId,campaignId,id,JSON.stringify(blockers)]);
    return {id,state:'INACTIVE'};
  }

  // Traceability: implements REQ-SWARM-CLI
  async recordSwarmWorkerInactive(poolClient:PoolClient,swarmWorkerBinding:SwarmWorkerBinding,leaseGeneration:string,blockers:readonly string[]):Promise<void> {
    requireState(blockers.every(id=>/^OBL-[1-9][0-9]*$/u.test(id)) && new Set(blockers).size===blockers.length,'inactive worker requires unique obligation blockers');
    const rows=(await poolClient.query<Record<string,unknown>>("SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED' FOR UPDATE",[this.projectId,swarmWorkerBinding.worktreeNumber])).rows;
    requireState(rows.length===1,'inactive worker requires its retained campaign assignment');
    const rollingStoredAssignment=readAssignment(rows[0]);
    const rollingCampaignRow=await this.campaign(poolClient,rollingStoredAssignment.scopeId);
    requireState(rollingCampaignRow.closure_text===null && rollingCampaignRow.coordinator_root===swarmWorkerBinding.ownerRoot,'inactive worker campaign owner changed or is closed');
    requireState(rollingStoredAssignment.generation===leaseGeneration && rollingStoredAssignment.sessionId===swarmWorkerBinding.sessionId && !rollingStoredAssignment.retired,'inactive worker lease or original session changed');
    requireState(['WORKING','INACTIVE','REWORK','RESERVED'].includes(rollingStoredAssignment.state),'campaign worker cannot become inactive in its current state');
    const rollingGraph=this.collectGraph(rollingCampaignRow);
    requireState(rollingGraph.digest===rollingCampaignRow.graph_digest,'campaign graph changed; reconcile before recording inactivity');
    requireState(blockers.every(id=>rollingGraph.document.obligations.some(obligation=>obligation.id===id)),'inactive worker blocker is not in the authoritative graph');
    validateRollingSessionMarker(swarmWorkerBinding.rootPath,swarmWorkerBinding.sessionId);
    await poolClient.query("UPDATE ponytail_index.rolling_action_v1 SET state='CANCELLED' WHERE project_id=$1 AND assignment_id=$2 AND state IN ('PENDING','STARTED')",[this.projectId,rollingStoredAssignment.id]);
    await this.setWorkerInactive(poolClient,rollingStoredAssignment.scopeId,rollingStoredAssignment.id,blockers);
  }

  async suspend(campaignId: string, id: string, generation: string, stopped: boolean, blockers: readonly string[]): Promise<RollingAssignmentTransition> {
    requireState(stopped === true && Array.isArray(blockers) && blockers.length > 0
      && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)) && new Set(blockers).size === blockers.length,
    'suspension requires stopped acknowledgment and unique obligation blockers');
    return this.transaction<RollingAssignmentTransition>(campaignId, async poolClient => {
      const assignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(assignment.sessionId && !assignment.retired, 'only an attached non-retired session may become inactive');
      await this.cancelActions(poolClient, id);
      return this.setWorkerInactive(poolClient,campaignId,id,blockers);
    });
  }

  async retire(campaignId: string, id: string, generation: string, stopped: boolean): Promise<RollingAssignmentTransition> {
    requireState(stopped === true, 'retirement requires stopped acknowledgment');
    return this.transaction<RollingAssignmentTransition>(campaignId, async poolClient => {
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, id, generation);
      await this.cancelActions(poolClient, id);
      requireState(rollingStoredAssignment.sessionId === null,'attached worker requires observed native retirement');
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',activity_stopped=true,retired=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id]);
      return { id, state: 'RETIRING' };
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  private async retirementValue(poolOrPoolClient:Pool | PoolClient,campaignId:string,id:string,generation:string):Promise<RollingWorkerRetirement | null> {
    const row = (await poolOrPoolClient.query<Record<string,unknown>>(
      'SELECT context_text,state,turn_id FROM ponytail_index.rolling_worker_retirement_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
      [this.projectId,campaignId,id,generation])).rows[0];
    return row ? readWorkerRetirement(row) : null;
  }

  async workerRetirement(campaignId:string,id:string,generation:string):Promise<RollingWorkerRetirement | null> {
    return this.retirementValue(this.pool,campaignId,id,generation);
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async prepareWorkerRetirement(campaignId:string,id:string,generation:string,rollingWorkerStopV1:RollingWorkerStopV1):Promise<RollingWorkerRetirement> {
    const checkedRollingWorkerStopV1 = readRollingWorkerStopV1(rollingWorkerStopV1);
    requireState(checkedRollingWorkerStopV1.campaignId === campaignId && checkedRollingWorkerStopV1.assignmentId === id
      && checkedRollingWorkerStopV1.generation === generation && checkedRollingWorkerStopV1.checkpoint.gitStatus === '',
      'retirement requires a clean original worker stop');
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      const existing = await this.retirementValue(poolClient,campaignId,id,generation);
      if (existing) return existing;
      requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,
        'retirement requires stopped integrated ownership');
      const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
      requireState(checkedRollingWorkerStopV1.threadId === rollingWorkerCreationV1.threadId && checkedRollingWorkerStopV1.sessionId === rollingWorkerCreationV1.sessionId,
        'retirement observation differs from original worker');
      const dispatch = (await poolClient.query<Record<string,unknown>>(
        'SELECT state,turn_id FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation])).rows[0];
      requireState(dispatch ? dispatch.state === 'ATTACHED' && dispatch.turn_id === checkedRollingWorkerStopV1.turn?.id
        : checkedRollingWorkerStopV1.turn === null,'retirement differs from known worker dispatch');
      await this.cancelActions(poolClient,id);
      const incrementRows = (await poolClient.query<Record<string,unknown>>(
        "SELECT i.candidate_revision FROM ponytail_index.rolling_increment_v1 i JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) WHERE i.project_id=$1 AND i.campaign_id=$2 AND r.assignment_id=$3 AND r.generation=$4 AND i.state='PUBLISHED'",
        [this.projectId,campaignId,id,generation])).rows;
      requireState(incrementRows.length === 1 && incrementRows[0],'retirement requires a uniquely published increment');
      const resourceRows = (await poolClient.query<Record<string,unknown>>(
        "SELECT generation FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND kind='START_WORKER' AND state='COMPLETED'",
        [this.projectId,campaignId,id])).rows;
      requireState(resourceRows.length === 1 && resourceRows[0],'retirement resource allocation is ambiguous');
      const rollingWorkerRetirementV1 = readRollingWorkerRetirementV1({schemaVersion:1,campaignId,assignmentId:id,generation,
        resourceGeneration:stringColumn(resourceRows[0].generation,'resource allocation generation'),number:rollingStoredAssignment.worktreeNumber,
        rootPath:rollingWorkerCreationV1.rootPath,coordinatorRoot:rollingCampaignRow.coordinator_root,
        threadId:rollingWorkerCreationV1.threadId,sessionId:rollingWorkerCreationV1.sessionId,
        integratedRevision:stringColumn(incrementRows[0].candidate_revision,'published revision')});
      await poolClient.query('INSERT INTO ponytail_index.rolling_worker_retirement_v1(project_id,campaign_id,assignment_id,generation,context_text,state) VALUES($1,$2,$3,$4,$5,\'PREPARED\')',
        [this.projectId,campaignId,id,generation,JSON.stringify(rollingWorkerRetirementV1)]);
      await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',activity_stopped=true,retired=true WHERE assignment_id=$1",[id]);
      return {rollingWorkerRetirementV1,state:'PREPARED',turnId:null};
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async advanceWorkerRetirement(campaignId:string,id:string,generation:string,expected:RollingWorkerRetirement['state'],
    next:RollingWorkerRetirement['state'],turnId:string | null = null):Promise<RollingWorkerRetirement> {
    requireState(expected === 'PREPARED' && next === 'NOTIFYING' || expected === 'NOTIFYING' && next === 'NOTIFYING' && turnId !== null
      || expected === 'NOTIFYING' && next === 'NOTIFIED' || expected === 'NOTIFIED' && next === 'ARCHIVING'
      || expected === 'ARCHIVING' && next === 'ARCHIVED','invalid retirement transition');
    if (turnId !== null) requireState(turnId.length > 0 && turnId.trim() === turnId && !/[\0\r\n]/u.test(turnId),'invalid retirement turn');
    return this.transaction(campaignId,async poolClient => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      requireState(rollingStoredAssignment.state === 'RETIRING' && rollingStoredAssignment.retired,'retirement ownership is not revoked');
      const rollingWorkerRetirement = await this.retirementValue(poolClient,campaignId,id,generation);
      requireState(rollingWorkerRetirement && rollingWorkerRetirement.state === expected,'retirement stage changed; inspect its retained outcome');
      if (turnId !== null) requireState(rollingWorkerRetirement.turnId === null || rollingWorkerRetirement.turnId === turnId,'retirement notification identity changed');
      const retainedTurnId = turnId ?? rollingWorkerRetirement.turnId;
      requireState(next === 'NOTIFYING' || retainedTurnId !== null,'retirement notification has no known turn');
      await poolClient.query('UPDATE ponytail_index.rolling_worker_retirement_v1 SET state=$5,turn_id=$6 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation,next,retainedTurnId]);
      return {...rollingWorkerRetirement,state:next,turnId:retainedTurnId};
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async cleanupWorkerRetirement(campaignId:string,id:string,generation:string):Promise<RollingWorkerRetirement> {
    return this.transaction(campaignId,async poolClient => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      requireState(rollingStoredAssignment.state === 'RETIRING' && rollingStoredAssignment.retired,'retirement ownership is not revoked');
      const rollingWorkerRetirement = await this.retirementValue(poolClient,campaignId,id,generation);
      requireState(rollingWorkerRetirement && (rollingWorkerRetirement.state === 'ARCHIVED' || rollingWorkerRetirement.state === 'CLEANED'),
        'retirement requires acknowledged native archival before cleanup');
      if (rollingWorkerRetirement.state === 'CLEANED') return rollingWorkerRetirement;
      cleanupRollingWorktree(rollingWorkerRetirement.rollingWorkerRetirementV1.coordinatorRoot,rollingWorkerRetirement.rollingWorkerRetirementV1);
      await poolClient.query("UPDATE ponytail_index.rolling_worker_retirement_v1 SET state='CLEANED' WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4",[this.projectId,campaignId,id,generation]);
      return {...rollingWorkerRetirement,state:'CLEANED'};
    });
  }

  // Traceability: implements REQ-SWARM-SESSIONS
  // Traceability: implements REQ-SWARM-CLI
  async recordSwarmWorkerBinding(poolClient:PoolClient,swarmWorktreeMembership:SwarmWorktreeMembership,swarmSessionIdentity:SwarmSessionIdentity,swarmWorkerAssignment:SwarmWorkerAssignment,leaseGeneration:string|null):Promise<void> {
    const rows=(await poolClient.query<Record<string,unknown>>("SELECT a.* FROM ponytail_index.rolling_assignment_v1 a WHERE a.project_id=$1 AND a.worktree_number=$2 AND a.state<>'RELEASED' FOR UPDATE",[this.projectId,swarmWorktreeMembership.number])).rows;
    if(rows.length===0) {requireState(leaseGeneration===null,'checkout has no campaign lease');return;}
    requireState(rows.length===1,'swarm checkout has multiple campaign assignments');
    const rollingStoredAssignment=readAssignment(rows[0]);
    requireState(leaseGeneration===null || rollingStoredAssignment.generation===leaseGeneration,'campaign lease generation changed before worker binding');
    const rollingCampaignRow=await this.campaign(poolClient,rollingStoredAssignment.scopeId);
    requireState(rollingCampaignRow.closure_text===null,'campaign is closed; binding is refused');
    requireState(rollingCampaignRow.coordinator_root===swarmWorktreeMembership.ownerRoot,'campaign checkout belongs to another swarm');
    const rollingGraph=this.collectGraph(rollingCampaignRow);
    requireState(rollingGraph.digest===rollingCampaignRow.graph_digest,'campaign graph changed; reconcile before binding a worker');
    requireState(isDeepStrictEqual(rollingStoredAssignment.binding,rollingGraph.bindings.find(binding=>binding.obligationId===rollingStoredAssignment.obligationId)),'campaign binding changed before worker admission');
    let sprintId:string|null;
    if(rollingStoredAssignment.lease!==null) sprintId=this.currentLease(rollingStoredAssignment,rollingGraph).binding.execution.sprintId;
    else {
      requireState(rollingGraph.bindingHistory===null,'adopted campaign assignment lacks its frozen lease');
      const obligationEffectiveBinding=rollingGraph.effectiveBindings.get(rollingStoredAssignment.obligationId);
      requireState(obligationEffectiveBinding && isDeepStrictEqual(rollingStoredAssignment.plannedPaths,obligationEffectiveBinding.execution.plannedPaths),'campaign execution scope changed before worker admission');
      requireState(obligationEffectiveBinding.dependsOn.every(dependency=>rollingGraph.projection.satisfiedIds.includes(dependency)),'campaign prerequisites are unresolved');
      sprintId=obligationEffectiveBinding.execution.sprintId;
    }
    requireState(swarmWorkerAssignment.kind==='plan'?swarmWorkerAssignment.id===rollingStoredAssignment.scopeId:swarmWorkerAssignment.id===sprintId,'worker plan or sprint differs from campaign assignment');
    requireState(!rollingStoredAssignment.retired && (rollingStoredAssignment.sessionId===null || rollingStoredAssignment.sessionId===swarmSessionIdentity.sessionId),'campaign assignment has another original worker');
    const rollingActionRows=(await poolClient.query<Record<string,unknown>>("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND kind='START_WORKER' FOR UPDATE",[this.projectId,rollingStoredAssignment.id])).rows;
    requireState(rollingActionRows.length===1,'campaign attachment has no unique creation action');
    const rollingActionRow=readAction(rollingActionRows[0]);
    const rollingWorkerCreationV1=readRollingWorkerCreationV1({schemaVersion:1,...swarmSessionIdentity});
    validateRollingSessionMarker(swarmWorktreeMembership.rootPath,swarmSessionIdentity.sessionId);
    if(rollingStoredAssignment.sessionId!==null) {
      requireState(rollingActionRow.state==='COMPLETED' && rollingActionRow.resultText!==null && isDeepStrictEqual(parseRollingWorkerCreation(rollingActionRow.resultText),rollingWorkerCreationV1),'original host worker identity changed');
      if(rollingStoredAssignment.state==='RESERVED') {
        requireState(leaseGeneration===rollingStoredAssignment.generation,'retained worker binding requires its current lease generation');
        const pending=(await poolClient.query<Record<string,unknown>>("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND generation=$3 AND kind='RESUME_WORKER' AND state='PENDING' FOR UPDATE",[this.projectId,rollingStoredAssignment.id,leaseGeneration])).rows;
        requireState(pending.length===1,'retained worker has no unique pending resumption');
        const resumptionRollingActionRow=readAction(pending[0]);
        const rollingWorkerResumptionV1:RollingWorkerResumptionV1={schemaVersion:1,rollingWorkerCreationV1,baseCommit:this.campaignBase(rollingCampaignRow)};
        await poolClient.query("UPDATE ponytail_index.rolling_action_v1 SET state='COMPLETED',result_text=$2 WHERE action_id=$1",[resumptionRollingActionRow.id,JSON.stringify(rollingWorkerResumptionV1)]);
        await this.attachWorkerSession(poolClient,rollingStoredAssignment,swarmSessionIdentity.sessionId);
      }
      return;
    }
    requireState(rollingStoredAssignment.state==='RESERVED' && rollingStoredAssignment.generation===swarmWorktreeMembership.generation
      && rollingActionRow.generation===rollingStoredAssignment.generation && rollingActionRow.state==='PENDING' && rollingActionRow.resultText===null,'campaign attachment requires its original pending reservation');
    await poolClient.query("UPDATE ponytail_index.rolling_action_v1 SET state='COMPLETED',result_text=$2 WHERE action_id=$1",[rollingActionRow.id,JSON.stringify(rollingWorkerCreationV1)]);
    await this.attachWorkerSession(poolClient,rollingStoredAssignment,swarmSessionIdentity.sessionId);
  }

  private async attachWorkerSession(poolClient:PoolClient,rollingStoredAssignment:RollingStoredAssignment,sessionId:string):Promise<RollingSessionAttachment> {
    await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET session_id=$2,state='WORKING' WHERE assignment_id=$1",[rollingStoredAssignment.id,sessionId]);
    await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2",[this.projectId,rollingStoredAssignment.worktreeNumber]);
    return {id:rollingStoredAssignment.id,sessionId,state:'WORKING'};
  }

  async attachSession(campaignId: string, id: string, generation: string, sessionId: string): Promise<RollingSessionAttachment> {
    requireState(typeof sessionId === 'string' && sessionId.length > 0
      && sessionId.trim() === sessionId && !sessionId.includes('\0'), 'invalid session identity');
    return this.transaction<RollingSessionAttachment>(campaignId, async poolClient => {
      const assignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(assignment.state === 'RESERVED' || assignment.state === 'WORKING', 'assignment cannot attach a session');
      requireState(assignment.sessionId === null || assignment.sessionId === sessionId, 'resumption must retain the original session');
      const completed = (await poolClient.query<Record<string, unknown>>("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND generation=$3 AND state='COMPLETED'", [this.projectId, id, generation])).rows;
      requireState(completed.length === 1, 'session attachment requires completed external action');
      return this.attachWorkerSession(poolClient,assignment,sessionId);
    });
  }

  private scope(rollingGraph: RollingGraph, rollingExecutionConfigV3: RollingExecutionConfigV3, generation: string,
    obligationId: string, rollingBinding: RollingBinding, plannedPaths: readonly string[]): RollingAssignmentScopeV3 {
    if (rollingExecutionConfigV3.bindingHistory === null) return readRollingAssignmentScopeV3({schemaVersion:3,execution:{kind:'unleased',plannedPaths},exclusiveResources:rollingBinding.exclusiveResources,binding:rollingBinding});
    requireState(rollingGraph.bindingHistory, 'binding-aware campaign has no coordinator history');
    const obligationLeaseV1 = freezeObligationLease(rollingGraph.document, rollingGraph.bindingHistory, {
      obligationId, graphDigest: rollingGraph.digest, generation,
      assessor: rollingExecutionConfigV3.bindingHistory.assessor, authority: rollingExecutionConfigV3.bindingHistory.authority });
    return readRollingAssignmentScopeV3({ schemaVersion: 3, execution:{kind:'leased',lease:obligationLeaseV1},
      exclusiveResources: rollingBinding.exclusiveResources, binding: rollingBinding });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-GRAPH
  async assertOperation(campaignId: string, id: string, generation: string, graphDigest: string,
    operation: string, changedPaths: readonly string[] = []): Promise<void> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingGraph = this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest);
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(rollingStoredAssignment.state === 'WORKING' && rollingStoredAssignment.sessionId
        && !rollingStoredAssignment.activityStopped && rollingStoredAssignment.lease, 'operation requires an active frozen lease');
      this.currentLease(rollingStoredAssignment, rollingGraph);
      assertObligationLeaseOperation(rollingStoredAssignment.lease, generation, graphDigest, operation, changedPaths);
    });
  }

  private currentLease(rollingStoredAssignment: RollingStoredAssignment, rollingGraph: RollingGraph): ObligationLeaseV1 {
    const obligationLeaseV1 = rollingStoredAssignment.lease;
    requireState(obligationLeaseV1 && isDeepStrictEqual(obligationLeaseV1.binding, rollingGraph.effectiveBindings.get(rollingStoredAssignment.obligationId))
      && isDeepStrictEqual(rollingStoredAssignment.binding, rollingGraph.bindings.find(item => item.obligationId === rollingStoredAssignment.obligationId)),
    'frozen binding differs from coordinator scope');
    requireState(obligationLeaseV1.binding.dependsOn.every(dependency => rollingGraph.projection.satisfiedIds.includes(dependency)), 'frozen prerequisites are unresolved');
    return obligationLeaseV1;
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-WORKERS
  async submit(campaignId: string, id: string, generation: string, rollingWorkerSubmissionV1: RollingWorkerSubmissionV1): Promise<RollingSubmissionReceipt> {
    const checkedRollingWorkerSubmissionV1 = readRollingWorkerSubmissionV1(rollingWorkerSubmissionV1);
    requireState(checkedRollingWorkerSubmissionV1.campaignId === campaignId && checkedRollingWorkerSubmissionV1.assignmentId === id
      && checkedRollingWorkerSubmissionV1.generation === generation, 'submission differs from requested assignment');
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingGraph = this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest);
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(rollingStoredAssignment.sessionId === checkedRollingWorkerSubmissionV1.sessionId && !rollingStoredAssignment.retired,
        'submission differs from attached session');
      const obligationLeaseV1 = this.currentLease(rollingStoredAssignment, rollingGraph);
      const existing = (await poolClient.query<Record<string, unknown>>('SELECT submission_text,lease_text FROM ponytail_index.rolling_submission_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4 AND revision=$5',
        [this.projectId, campaignId, id, generation, checkedRollingWorkerSubmissionV1.revision])).rows[0];
      if (existing) {
        requireState(isDeepStrictEqual(parseRollingWorkerSubmission(stringColumn(existing.submission_text, 'submission')), checkedRollingWorkerSubmissionV1)
          && isDeepStrictEqual(readObligationLeaseV1(readStateText(stringColumn(existing.lease_text, 'submission lease'))), obligationLeaseV1),
        'replayed submission differs from immutable result');
        requireState(rollingStoredAssignment.state === 'REVIEW' && rollingStoredAssignment.activityStopped, 'submission is no longer awaiting review');
        return { assignmentId: id, generation, revision: checkedRollingWorkerSubmissionV1.revision, state: 'REVIEW' };
      }
      requireState(rollingStoredAssignment.state === 'WORKING' && !rollingStoredAssignment.activityStopped, 'only an active attached worker may submit');
      await this.cancelActions(poolClient, id);
      const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',
        [this.projectId, rollingStoredAssignment.worktreeNumber])).rows[0]);
      function commonDirectory(root: string): string {
        const result = spawnSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' });
        requireState(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || 'invalid Git checkout');
        return fs.realpathSync(result.stdout.trim());
      }
      requireState(commonDirectory(rollingStoredWorktree.rootPath) === commonDirectory(rollingCampaignRow.coordinator_root), 'worker repository differs from coordinator');
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const base = spawnSync('git', ['-C', rollingCampaignRow.coordinator_root, 'rev-parse', `refs/heads/${rollingExecutionConfigV3.incrementRef}^{commit}`], { encoding: 'utf8' });
      requireState(!base.error && base.status === 0, 'cannot resolve current coordinator increment');
      const baseAncestrySpawnSyncReturns = spawnSync('git', ['-C', rollingCampaignRow.coordinator_root, 'merge-base', '--is-ancestor',
        checkedRollingWorkerSubmissionV1.baseCommit, base.stdout.trim()], {encoding:'utf8'});
      requireState(!baseAncestrySpawnSyncReturns.error && baseAncestrySpawnSyncReturns.status === 0,
        'submission base is not an ancestor of current coordinator increment');
      validateRollingWorkerSubmission(rollingStoredWorktree.rootPath, obligationLeaseV1, checkedRollingWorkerSubmissionV1);
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_submission_v1(project_id,campaign_id,assignment_id,generation,revision,submission_text,lease_text) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [this.projectId, campaignId, id, generation, checkedRollingWorkerSubmissionV1.revision, JSON.stringify(checkedRollingWorkerSubmissionV1), JSON.stringify(obligationLeaseV1)]);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='REVIEW',activity_stopped=true WHERE assignment_id=$1", [id]);
      return { assignmentId: id, generation, revision: checkedRollingWorkerSubmissionV1.revision, state: 'REVIEW' };
    });
  }

  async submissions(campaignId: string, id: string): Promise<readonly RollingStoredSubmission[]> {
    const rows = (await this.pool.query<Record<string, unknown>>('SELECT submission_text,lease_text FROM ponytail_index.rolling_submission_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 ORDER BY created_at,revision',
      [this.projectId, campaignId, id])).rows;
    return rows.map(row => ({ submission: parseRollingWorkerSubmission(stringColumn(row.submission_text, 'submission')),
      lease: readObligationLeaseV1(readStateText(stringColumn(row.lease_text, 'submission lease'))) }));
  }

  // Traceability: implements REQ-ROLLING-REVIEW
  async requestReview(campaignId: string, id: string, generation: string, revision: string, reviewerSessionId: string,
    rollingReviewerLoss: RollingReviewerLoss | null = null): Promise<RollingStoredReview> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(!rollingStoredAssignment.retired && rollingStoredAssignment.activityStopped, 'review requires a stopped retained worker');
      requireState(reviewerSessionId !== rollingStoredAssignment.sessionId, 'worker cannot review its own submission');
      if (rollingReviewerLoss !== null) {
        const replaced = (await poolClient.query<Record<string, unknown>>('SELECT replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND review_id=$4',
          [this.projectId,campaignId,id,rollingReviewerLoss.reviewId])).rows[0];
        requireState(replaced, 'lost review is absent from this assignment');
        const replacementText = nullableStringColumn(replaced.replacement_text, 'review replacement');
        if (replacementText !== null) {
          const rollingReviewReplacementV1 = parseRollingReviewReplacement(replacementText);
          requireState(rollingReviewReplacementV1.reviewerSessionId === reviewerSessionId && rollingReviewReplacementV1.lossReference === rollingReviewerLoss.lossReference, 'replacement retry differs from recorded reviewer loss');
          const replacement = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
            [this.projectId,campaignId,rollingReviewReplacementV1.replacementReviewId])).rows[0];
          requireState(replacement, 'recorded replacement request is missing');
          const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(replacement.request_text,'replacement review request'));
          requireState(rollingReviewRequestV1.generation === generation && rollingReviewRequestV1.revision === revision, 'replacement retry differs from candidate');
          const outcome = nullableStringColumn(replacement.outcome_text,'replacement review outcome');
          return { request: rollingReviewRequestV1, outcome: outcome === null ? null : parseRollingReviewOutcome(outcome) };
        }
      }
      const existing = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4 AND replacement_text IS NULL ORDER BY created_at DESC,review_id DESC LIMIT 1',
        [this.projectId, campaignId, id, generation])).rows[0];
      if (existing && rollingReviewerLoss === null) {
        const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(existing.request_text, 'review request'));
        requireState(rollingReviewRequestV1.revision === revision && rollingReviewRequestV1.reviewerSessionId === reviewerSessionId, 'review retry differs from assigned candidate or reviewer');
        const text = nullableStringColumn(existing.outcome_text, 'review outcome');
        return { request: rollingReviewRequestV1, outcome: text === null ? null : parseRollingReviewOutcome(text) };
      }
      requireState(rollingStoredAssignment.state === 'REVIEW', 'assignment is not awaiting review');
      const previous = (await poolClient.query<Record<string, unknown>>('SELECT r.request_text,r.outcome_text,i.repair_reference FROM ponytail_index.rolling_review_v1 r LEFT JOIN ponytail_index.rolling_increment_v1 i USING(project_id,campaign_id,review_id) WHERE r.project_id=$1 AND r.campaign_id=$2 AND r.assignment_id=$3 AND r.replacement_text IS NULL ORDER BY r.created_at DESC,r.review_id DESC LIMIT 1',
        [this.projectId, campaignId, id])).rows[0];
      if (previous) {
        const previousRollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(previous.request_text, 'previous review request'));
        const previousOutcome = nullableStringColumn(previous.outcome_text, 'previous review outcome');
        if (rollingReviewerLoss === null) {
          requireState(previousOutcome !== null && (parseRollingReviewOutcome(previousOutcome).decision === 'rejected' || previous.repair_reference !== null), 'corrected submission requires a rejected review or recorded integration repair');
          requireState(previousRollingReviewRequestV1.reviewerSessionId === reviewerSessionId, 'corrected submission must retain its original reviewer');
        } else {
          requireState(previousRollingReviewRequestV1.id === rollingReviewerLoss.reviewId, 'only the latest unreplaced reviewer may be replaced');
          requireState(previousRollingReviewRequestV1.reviewerSessionId !== reviewerSessionId, 'replacement requires a different reviewer');
          requireState(previousOutcome === null || parseRollingReviewOutcome(previousOutcome).decision === 'rejected' || previous.repair_reference !== null, 'accepted review cannot be replaced without recorded integration repair');
          if (previousOutcome === null) requireState(previousRollingReviewRequestV1.generation === generation && previousRollingReviewRequestV1.revision === revision, 'pending replacement must retain its exact candidate');
        }
      }
      this.currentLease(rollingStoredAssignment, this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest));
      const submission = (await poolClient.query<Record<string, unknown>>('SELECT submission_text,lease_text FROM ponytail_index.rolling_submission_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4 AND revision=$5',
        [this.projectId, campaignId, id, generation, revision])).rows[0];
      requireState(submission, 'candidate has no validated worker submission');
      const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(stringColumn(submission.submission_text, 'submission'));
      const obligationLeaseV1 = readObligationLeaseV1(readStateText(stringColumn(submission.lease_text, 'submission lease')));
      const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredAssignment.worktreeNumber])).rows[0]);
      validateRollingWorkerSubmission(rollingStoredWorktree.rootPath, obligationLeaseV1, rollingWorkerSubmissionV1);
      const rollingReviewRequestV1: RollingReviewRequestV1 = readRollingReviewRequestV1({ schemaVersion: 1, id: crypto.randomUUID(),
        campaignId, assignmentId: id, generation, baseCommit: rollingWorkerSubmissionV1.baseCommit, revision, reviewerSessionId });
      if (rollingReviewerLoss !== null) {
        requireState(previous, 'replacement requires a prior review');
        const previousRollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(previous.request_text,'lost review request'));
        const rollingReviewReplacementV1 = readRollingReviewReplacementV1({ schemaVersion:1, reviewId:previousRollingReviewRequestV1.id,
          replacementReviewId:rollingReviewRequestV1.id, previousReviewerSessionId:previousRollingReviewRequestV1.reviewerSessionId,
          reviewerSessionId, recordedAt:new Date().toISOString(), lossReference:rollingReviewerLoss.lossReference });
        await poolClient.query('UPDATE ponytail_index.rolling_review_v1 SET replacement_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
          [this.projectId,campaignId,previousRollingReviewRequestV1.id,JSON.stringify(rollingReviewReplacementV1)]);
      }
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_review_v1(project_id,campaign_id,review_id,assignment_id,generation,revision,request_text) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [this.projectId, campaignId, rollingReviewRequestV1.id, id, generation, revision, JSON.stringify(rollingReviewRequestV1)]);
      return { request: rollingReviewRequestV1, outcome: null };
    });
  }

  async reviewReplacement(campaignId: string, reviewId: string): Promise<RollingReviewReplacementV1 | null> {
    const row = (await this.pool.query<Record<string,unknown>>('SELECT replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId,campaignId,reviewId])).rows[0];
    requireState(row, 'review request is missing');
    const text = nullableStringColumn(row.replacement_text,'review replacement');
    return text === null ? null : parseRollingReviewReplacement(text);
  }

  async reviews(campaignId: string, id: string): Promise<readonly RollingStoredReview[]> {
    const rows = (await this.pool.query<Record<string, unknown>>('SELECT request_text,outcome_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 ORDER BY created_at,review_id', [this.projectId, campaignId, id])).rows;
    return rows.map(readStoredReview);
  }

  async claimReviewDispatch(campaignId: string, reviewId: string, reviewerThreadId: string): Promise<RollingReviewDispatchStarted> {
    requireState(reviewerThreadId.length > 0 && reviewerThreadId.trim() === reviewerThreadId && !/[\0\r\n]/u.test(reviewerThreadId), 'invalid reviewer thread identity');
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const row = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text,replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId])).rows[0];
      requireState(row && row.outcome_text === null, 'review is missing or already decided');
      requireState(row.replacement_text === null, 'review request has been replaced');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, rollingReviewRequestV1.assignmentId, rollingReviewRequestV1.generation);
      requireState(rollingStoredAssignment.state === 'REVIEW' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired, 'candidate is no longer awaiting review');
      this.currentLease(rollingStoredAssignment, this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest));
      const existing = await poolClient.query<Record<string, unknown>>('SELECT dispatch_id FROM ponytail_index.rolling_review_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId]);
      requireState(existing.rows.length === 0, 'review dispatch already claimed; recover its original outcome instead of retrying');
      const id = crypto.randomUUID();
      await poolClient.query('INSERT INTO ponytail_index.rolling_review_dispatch_v1(project_id,campaign_id,review_id,dispatch_id,reviewer_thread_id,state) VALUES($1,$2,$3,$4,$5,\'STARTED\')', [this.projectId, campaignId, reviewId, id, reviewerThreadId]);
      return { id, reviewerThreadId, state: 'STARTED' };
    });
  }

  async reviewContext(campaignId: string, reviewId: string): Promise<RollingReviewContext> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const row = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text,replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId])).rows[0];
      requireState(row, 'review request is missing');
      requireState(row.replacement_text === null, 'review request has been replaced');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
      const text = nullableStringColumn(row.outcome_text, 'review outcome');
      const rollingReviewOutcomeV1 = text === null ? null : parseRollingReviewOutcome(text);
      if (rollingReviewOutcomeV1) validateRollingReviewOutcome(rollingReviewRequestV1, rollingReviewOutcomeV1);
      const rollingReviewCandidate = await this.validateReviewCandidate(poolClient, rollingCampaignRow, rollingReviewRequestV1);
      return { review: { request: rollingReviewRequestV1, outcome: rollingReviewOutcomeV1 }, ...rollingReviewCandidate };
    });
  }

  private async publicationLane(poolClient:PoolClient,rollingCampaignRow:RollingCampaignRow):Promise<RollingPublicationLane> {
    const publication=(await poolClient.query<Record<string,unknown>>("SELECT campaign_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND coordinator_root=$2 AND NOT withdrawn AND (state<>'PUBLISHED' OR synchronized_revision IS NULL) LIMIT 1",[this.projectId,rollingCampaignRow.coordinator_root])).rows[0];
    const integration=(await poolClient.query<Record<string,unknown>>("SELECT i.campaign_id FROM ponytail_index.rolling_increment_v1 i JOIN ponytail_index.rolling_campaign_v1 c USING(project_id,campaign_id) WHERE i.project_id=$1 AND c.coordinator_root=$2 AND i.state<>'PUBLISHED' AND i.repair_reference IS NULL ORDER BY i.created_at,i.increment_id LIMIT 1",[this.projectId,rollingCampaignRow.coordinator_root])).rows[0];
    return {publicationCampaignId:publication ? stringColumn(publication.campaign_id,'publication owner') : null,integrationCampaignId:integration ? stringColumn(integration.campaign_id,'integration owner') : null};
  }

  private async orderedAcceptedIncrements(poolClient:PoolClient,rollingCampaignRow:RollingCampaignRow,rollingExecutionConfigV3:RollingExecutionConfigV3):Promise<readonly RollingAcceptedIncrement[]> {
    const rows = (await poolClient.query<Record<string,unknown>>(
      'SELECT d.increment_id,d.revision FROM ponytail_index.rolling_increment_delivery_v1 d LEFT JOIN ponytail_index.rolling_publication_member_v1 m ON m.project_id=d.project_id AND m.campaign_id=d.campaign_id AND m.increment_id=d.increment_id AND NOT m.withdrawn WHERE d.project_id=$1 AND d.campaign_id=$2 AND m.increment_id IS NULL',
      [this.projectId,rollingCampaignRow.campaign_id])).rows;
    const rollingAcceptedIncrements:readonly RollingAcceptedIncrement[] = rows.map(row=>({id:stringColumn(row.increment_id,'accepted increment ID'),revision:stringColumn(row.revision,'accepted increment revision')}));
    // Transaction timestamps are not Git ancestry. Build the prefix from the
    // frozen campaign history, including multiple receipts for the same commit.
    const map = new Map<string,number>();
    if (rollingAcceptedIncrements.length > 0) {
      const history = spawnSync('git',['-C',rollingCampaignRow.coordinator_root,'rev-list','--topo-order','--reverse',`refs/heads/${rollingExecutionConfigV3.incrementRef}^{commit}`],{encoding:'utf8'});
      requireState(!history.error && history.status === 0,'cannot order publication receipts by campaign history');
      for (const [index,revision] of history.stdout.trim().split('\n').entries()) map.set(revision,index);
    }
    requireState(rollingAcceptedIncrements.every(item=>map.has(item.revision)),'accepted increment is outside the retained campaign history');
    return [...rollingAcceptedIncrements].sort((left,right)=> {
      const leftOrdinal = map.get(left.revision), rightOrdinal = map.get(right.revision);
      requireState(leftOrdinal !== undefined && rightOrdinal !== undefined,'publication receipt ancestry changed');
      return leftOrdinal-rightOrdinal || left.id.localeCompare(right.id);
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async claimPublicationBatch(campaignId:string,expectedDigest:string,
    flush:Exclude<RollingPublicationTrigger,'threshold'> | null = null):Promise<RollingPublicationBatchClaimResult> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const rollingGraph = this.graph(rollingCampaignRow,expectedDigest);
      const existing = (await poolClient.query<Record<string,unknown>>(
        "SELECT claim_text FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND NOT withdrawn AND (state<>'PUBLISHED' OR synchronized_revision IS NULL)",
        [this.projectId,campaignId])).rows[0];
      if (existing) return {state:'CLAIMED',claim:readRollingPublicationBatchClaimV1(readStateText(stringColumn(existing.claim_text,'publication claim')))};
      const rollingPublicationLane=await this.publicationLane(poolClient,rollingCampaignRow);
      requireState(rollingPublicationLane.publicationCampaignId === null,'mainline publication checkout is owned by another campaign');
      requireState(rollingPublicationLane.integrationCampaignId === null,'finish the active increment before freezing mainline publication');
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      if (flush === 'completion') requireState(rollingGraph.bindings.every(binding=>rollingGraph.projection.satisfiedIds.includes(binding.obligationId)),
        'completion flush requires all bound delivery obligations to be satisfied');
      if (flush === 'quiescence') {
        const assignments = (await poolClient.query<Record<string,unknown>>(
          "SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND state<>'RELEASED'",[this.projectId])).rows.map(readAssignment);
        const rollingSchedulingResult = selectRollingAssignments(rollingGraph,assignments,rollingExecutionConfigV3.maxActiveWorkers,expectedDigest);
        requireState(rollingSchedulingResult.activeCount === 0 && rollingSchedulingResult.selected.length === 0,
          'quiescence flush requires no active or immediately schedulable work');
      }
      const orderedRollingAcceptedIncrements = await this.orderedAcceptedIncrements(poolClient,rollingCampaignRow,rollingExecutionConfigV3);
      const rollingPublicationSelection = selectRollingPublicationBatch(orderedRollingAcceptedIncrements,rollingExecutionConfigV3.publicationSize,flush);
      if (rollingPublicationSelection.state === 'WAITING') return rollingPublicationSelection;
      const rollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1({schemaVersion:1,id:crypto.randomUUID(),campaignId,
        rootPath:rollingCampaignRow.coordinator_root,incrementRef:rollingExecutionConfigV3.incrementRef,target:rollingExecutionConfigV3.mainline,
        graphDigest:rollingGraph.digest,configurationDigest:this.publicationConfigurationDigest(rollingExecutionConfigV3,rollingGraph),
        publicationSize:rollingExecutionConfigV3.publicationSize,trigger:rollingPublicationSelection.trigger,
        increments:rollingPublicationSelection.increments,campaignRevision:rollingPublicationSelection.campaignRevision});
      await poolClient.query("INSERT INTO ponytail_index.rolling_publication_batch_v1(project_id,campaign_id,batch_id,coordinator_root,claim_text,state) VALUES($1,$2,$3,$4,$5,'FROZEN')",
        [this.projectId,campaignId,rollingPublicationBatchClaimV1.id,rollingCampaignRow.coordinator_root,JSON.stringify(rollingPublicationBatchClaimV1)]);
      for (const [index,rollingAcceptedIncrement] of rollingPublicationBatchClaimV1.increments.entries()) await poolClient.query(
        'INSERT INTO ponytail_index.rolling_publication_member_v1(project_id,campaign_id,batch_id,increment_id,ordinal) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,rollingPublicationBatchClaimV1.id,rollingAcceptedIncrement.id,index+1]);
      return {state:'CLAIMED',claim:rollingPublicationBatchClaimV1};
    });
  }

  private async publicationClaim(poolClient:PoolClient,campaignId:string,id:string,inspect=false):Promise<RollingPublicationBatchClaimV1> {
    const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,withdrawn FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
    requireState(row,'publication batch is missing');
    requireState(inspect || row.withdrawn===false,'publication was withdrawn; historical receipts grant no mutation authority');
    return readRollingPublicationBatchClaimV1(readStateText(stringColumn(row.claim_text,'publication claim')));
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  // Traceability: implements REQ-ROLLING-INTERFACES
  async publicationContext(campaignId:string,id:string):Promise<RollingPublicationContext> {
    return this.transaction(campaignId,async poolClient=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT p.preparation_text,c.candidate_text,q.job_text,q.result_text AS qa_text,r.intent_text AS refresh_intent,r.preparation_text AS refresh_preparation,r.result_text AS refresh_result FROM ponytail_index.rolling_publication_batch_v1 b LEFT JOIN ponytail_index.rolling_publication_preparation_v1 p USING(project_id,campaign_id,batch_id) LEFT JOIN ponytail_index.rolling_publication_candidate_v1 c USING(project_id,campaign_id,batch_id) LEFT JOIN ponytail_index.rolling_publication_qa_v1 q ON q.project_id=b.project_id AND q.campaign_id=b.campaign_id AND q.batch_id=b.batch_id AND q.qa_id=b.qa_id LEFT JOIN ponytail_index.rolling_mainline_refresh_v1 r ON r.project_id=b.project_id AND r.campaign_id=b.campaign_id AND r.batch_id=b.batch_id AND r.refresh_id=CASE WHEN b.pending_refresh_id IS NULL THEN b.refresh_id ELSE b.pending_refresh_id END WHERE b.project_id=$1 AND b.campaign_id=$2 AND b.batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row,'publication batch is missing');
      const preparation = nullableStringColumn(row.preparation_text,'publication preparation');
      const job = nullableStringColumn(row.job_text,'QA job'),qa = nullableStringColumn(row.qa_text,'QA result');
      const refreshIntent = nullableStringColumn(row.refresh_intent,'refresh intent'),refreshPreparation = nullableStringColumn(row.refresh_preparation,'refresh preparation'),refreshResult = nullableStringColumn(row.refresh_result,'refresh result');
      const withdrawal=(await poolClient.query<Record<string,unknown>>('SELECT withdrawal_text FROM ponytail_index.rolling_publication_withdrawal_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      return {withdrawal:withdrawal?readRollingPublicationWithdrawalV1(readStateText(stringColumn(withdrawal.withdrawal_text,'withdrawal'))):null,
        claim:await this.publicationClaim(poolClient,campaignId,id,true),preparation:preparation === null ? null : readRollingMainlinePreparationV1(readStateText(preparation)),
        candidate:row.candidate_text === null ? null : await this.publicationCandidate(poolClient,campaignId,id),
        qaJob:job === null ? null : readRollingPublicationQaJobV1(readStateText(job)),qa:qa === null ? null : parseRollingPublicationQa(qa),
        refreshIntent:refreshIntent === null ? null : readRollingMainlineRefreshIntentV1(readStateText(refreshIntent)),
        refreshPreparation:refreshPreparation === null ? null : readRollingMainlineRefreshPreparationV1(readStateText(refreshPreparation)),
        refreshResult:refreshResult === null ? null : readRollingMainlineRefreshResultV1(readStateText(refreshResult))};
    },true);
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginMainlinePreparation(campaignId:string,id:string):Promise<RollingPublicationBatchClaimV1> {
    return this.transaction(campaignId,async poolClient=> {
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row && (row.state === 'FROZEN' || row.state === 'PREPARING'),'publication is not eligible for preparation');
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='PREPARING' WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id]);
      return rollingPublicationBatchClaimV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordMainlinePreparation(campaignId:string,id:string,rollingMainlinePreparationV1:RollingMainlinePreparationV1):Promise<RollingMainlinePreparationV1> {
    const checkedRollingMainlinePreparationV1 = readRollingMainlinePreparationV1(rollingMainlinePreparationV1);
    return this.transaction(campaignId,async poolClient=> {
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      requireState(checkedRollingMainlinePreparationV1.batchId === id && checkedRollingMainlinePreparationV1.rootPath === rollingPublicationBatchClaimV1.rootPath,'mainline preparation differs from batch identity');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row?.state === 'PREPARING','journal preparation before merging mainline');
      requireState(git(rollingPublicationBatchClaimV1.rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${rollingPublicationBatchClaimV1.incrementRef}`
        && git(rollingPublicationBatchClaimV1.rootPath,['rev-parse','HEAD']).trim() === checkedRollingMainlinePreparationV1.sourceRevision,
        'mainline preparation source no longer owns its campaign checkout');
      requireState(git(rollingPublicationBatchClaimV1.rootPath,['rev-parse',`refs/remotes/${rollingPublicationBatchClaimV1.target.remote}/${rollingPublicationBatchClaimV1.target.branch}^{commit}`]).trim()
        === checkedRollingMainlinePreparationV1.mainlineRevision,'mainline preparation differs from its fetched target');

      const previous = (await poolClient.query<Record<string,unknown>>('SELECT preparation_text FROM ponytail_index.rolling_publication_preparation_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      if (previous) requireState(isDeepStrictEqual(readRollingMainlinePreparationV1(readStateText(stringColumn(previous.preparation_text,'mainline preparation'))),checkedRollingMainlinePreparationV1),'mainline preparation is immutable');
      else await poolClient.query('INSERT INTO ponytail_index.rolling_publication_preparation_v1(project_id,campaign_id,batch_id,preparation_text) VALUES($1,$2,$3,$4)',[this.projectId,campaignId,id,JSON.stringify(checkedRollingMainlinePreparationV1)]);
      return checkedRollingMainlinePreparationV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordMainlineCandidate(campaignId:string,id:string,rollingMainlineCandidateV1:RollingMainlineCandidateV1):Promise<RollingMainlineCandidateV1> {
    const checkedRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(rollingMainlineCandidateV1);
    return this.transaction(campaignId,async poolClient=> {
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,checkedRollingMainlineCandidateV1);
      const preparation = (await poolClient.query<Record<string,unknown>>('SELECT preparation_text FROM ponytail_index.rolling_publication_preparation_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(preparation,'candidate requires a retained preparation intent');
      const rollingMainlinePreparationV1 = readRollingMainlinePreparationV1(readStateText(stringColumn(preparation.preparation_text,'mainline preparation')));
      requireState(isDeepStrictEqual({...rollingMainlinePreparationV1,revision:checkedRollingMainlineCandidateV1.revision},checkedRollingMainlineCandidateV1),'candidate differs from retained mainline preparation');
      const existing = (await poolClient.query<Record<string,unknown>>('SELECT candidate_text FROM ponytail_index.rolling_publication_candidate_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      if (existing) requireState(isDeepStrictEqual(readRollingMainlineCandidateV1(readStateText(stringColumn(existing.candidate_text,'mainline candidate'))),checkedRollingMainlineCandidateV1),'mainline candidate is immutable');
      else {
        const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
        requireState(row?.state === 'PREPARING','candidate requires its journaled preparation');
        await poolClient.query('INSERT INTO ponytail_index.rolling_publication_candidate_v1(project_id,campaign_id,batch_id,candidate_text) VALUES($1,$2,$3,$4)',[this.projectId,campaignId,id,JSON.stringify(checkedRollingMainlineCandidateV1)]);
        await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='CANDIDATE' WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id]);
      }
      return checkedRollingMainlineCandidateV1;
    });
  }

  private async publicationCandidate(poolClient:PoolClient,campaignId:string,id:string):Promise<RollingMainlineCandidateV1> {
    const row = (await poolClient.query<Record<string,unknown>>("SELECT CASE WHEN b.refresh_id IS NOT NULL THEN (r.result_text::jsonb->'candidate')::text WHEN b.repair_id IS NOT NULL THEN (a.repair_text::jsonb->'candidate')::text ELSE c.candidate_text END AS candidate_text FROM ponytail_index.rolling_publication_batch_v1 b JOIN ponytail_index.rolling_publication_candidate_v1 c USING(project_id,campaign_id,batch_id) LEFT JOIN ponytail_index.rolling_mainline_refresh_v1 r ON r.project_id=b.project_id AND r.campaign_id=b.campaign_id AND r.batch_id=b.batch_id AND r.refresh_id=b.refresh_id LEFT JOIN ponytail_index.rolling_publication_repair_v1 a ON a.project_id=b.project_id AND a.campaign_id=b.campaign_id AND a.batch_id=b.batch_id AND a.repair_id=b.repair_id WHERE b.project_id=$1 AND b.campaign_id=$2 AND b.batch_id=$3",[this.projectId,campaignId,id])).rows[0];
    requireState(row,'publication has no retained candidate');
    return readRollingMainlineCandidateV1(readStateText(stringColumn(row.candidate_text,'mainline candidate')));
  }

  private publicationConfigurationDigest(rollingExecutionConfigV3:RollingExecutionConfigV3,rollingGraph:RollingGraph):string {
    return crypto.createHash('sha256').update(JSON.stringify({execution:rollingExecutionConfigV3,project:rollingGraph.projectConfiguration})).digest('hex');
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION-REPAIR
  async repairPublication(campaignId:string,id:string,rollingPublicationRepairReviewV1:RollingPublicationRepairReviewV1):Promise<RollingPublicationRepairV1> {
    const checkedRollingPublicationRepairReviewV1=readRollingPublicationRepairReviewV1(rollingPublicationRepairReviewV1);
    return this.transaction(campaignId,async poolClient=> {
      const row=(await poolClient.query<Record<string,unknown>>('SELECT state,pending_refresh_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row,'publication batch is missing');
      const previous=(await poolClient.query<Record<string,unknown>>('SELECT repair_text FROM ponytail_index.rolling_publication_repair_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND previous_revision=$4',[this.projectId,campaignId,id,checkedRollingPublicationRepairReviewV1.previousRevision])).rows[0];
      if(previous) {
        const rollingPublicationRepairV1=readRollingPublicationRepairV1(readStateText(stringColumn(previous.repair_text,'publication repair')));
        requireState(isDeepStrictEqual(rollingPublicationRepairV1.review,checkedRollingPublicationRepairReviewV1),'publication repair retry differs from its original review');
        return rollingPublicationRepairV1;
      }
      requireState(row.state==='QA_FAILED'&&row.pending_refresh_id===null,'repair requires the original failed QA with no pending refresh');
      const rollingPublicationBatchClaimV1=await this.publicationClaim(poolClient,campaignId,id);
      const previousRollingMainlineCandidateV1=await this.publicationCandidate(poolClient,campaignId,id);
      const repairedRollingMainlineCandidateV1=validateRollingPublicationRepair(rollingPublicationBatchClaimV1,previousRollingMainlineCandidateV1,checkedRollingPublicationRepairReviewV1);
      const rollingPublicationRepairV1=readRollingPublicationRepairV1({schemaVersion:1,id:crypto.randomUUID(),batchId:id,review:checkedRollingPublicationRepairReviewV1,previousCandidate:previousRollingMainlineCandidateV1,candidate:repairedRollingMainlineCandidateV1});
      await poolClient.query('INSERT INTO ponytail_index.rolling_publication_repair_v1(project_id,campaign_id,batch_id,repair_id,previous_revision,repair_text) VALUES($1,$2,$3,$4,$5,$6)',[this.projectId,campaignId,id,rollingPublicationRepairV1.id,previousRollingMainlineCandidateV1.revision,JSON.stringify(rollingPublicationRepairV1)]);
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='CANDIDATE',repair_id=$4,refresh_id=NULL,qa_id=NULL WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id,rollingPublicationRepairV1.id]);
      return rollingPublicationRepairV1;
    });
  }

  private publicationQaConfiguration(rollingCampaignRow:RollingCampaignRow):RollingPublicationQaConfiguration {
    const rollingGraph = this.collectGraph(rollingCampaignRow);
    const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
    return {digest:this.publicationConfigurationDigest(rollingExecutionConfigV3,rollingGraph),
      commands:rollingGraph.projectConfiguration.qa.publication};
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginPublicationQa(campaignId:string,id:string):Promise<RollingPublicationQaJobV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      const rollingMainlineCandidateV1 = await this.publicationCandidate(poolClient,campaignId,id);
      verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row && (row.state === 'CANDIDATE' || row.state === 'QA_FAILED'),'finish or reconcile the original QA attempt before starting another');
      const rollingPublicationQaConfiguration = this.publicationQaConfiguration(rollingCampaignRow);
      const rollingPublicationQaJobV1 = readRollingPublicationQaJobV1({schemaVersion:1,id:crypto.randomUUID(),batchId:id,
        revision:rollingMainlineCandidateV1.revision,configurationDigest:rollingPublicationQaConfiguration.digest,commands:rollingPublicationQaConfiguration.commands});
      await poolClient.query('INSERT INTO ponytail_index.rolling_publication_qa_v1(project_id,campaign_id,batch_id,qa_id,job_text) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,id,rollingPublicationQaJobV1.id,JSON.stringify(rollingPublicationQaJobV1)]);
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='QA_RUNNING',qa_id=$4 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id,rollingPublicationQaJobV1.id]);
      return rollingPublicationQaJobV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordPublicationQa(campaignId:string,id:string,rollingPublicationQaV1:RollingPublicationQaV1):Promise<RollingPublicationQaV1> {
    const checkedRollingPublicationQaV1 = readRollingPublicationQaV1(rollingPublicationQaV1);
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      requireState(checkedRollingPublicationQaV1.batchId === id,'QA result differs from batch');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT job_text,result_text FROM ponytail_index.rolling_publication_qa_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND qa_id=$4',
        [this.projectId,campaignId,id,checkedRollingPublicationQaV1.id])).rows[0];
      requireState(row,'QA result has no original recorded job');
      if (row.result_text !== null) {
        const previous = parseRollingPublicationQa(stringColumn(row.result_text,'QA result'));
        requireState(isDeepStrictEqual(previous,checkedRollingPublicationQaV1),'QA receipt is immutable');return previous;
      }
      const rollingPublicationQaJobV1 = readRollingPublicationQaJobV1(readStateText(stringColumn(row.job_text,'QA job')));
      requireState(checkedRollingPublicationQaV1.revision === rollingPublicationQaJobV1.revision
        && checkedRollingPublicationQaV1.configurationDigest === rollingPublicationQaJobV1.configurationDigest
        && checkedRollingPublicationQaV1.commands.length <= rollingPublicationQaJobV1.commands.length
        && checkedRollingPublicationQaV1.commands.every((command,index)=>isDeepStrictEqual(command.argv,rollingPublicationQaJobV1.commands[index])),
        'QA result differs from its original command and input scope');
      const batch = (await poolClient.query<Record<string,unknown>>('SELECT state,qa_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(batch?.state === 'QA_RUNNING' && batch.qa_id === checkedRollingPublicationQaV1.id,'QA job no longer owns this publication');
      if (checkedRollingPublicationQaV1.outcome === 'PASS') {
        const rollingPublicationQaConfiguration = this.publicationQaConfiguration(rollingCampaignRow);
        verifyRollingPublicationQa(await this.publicationClaim(poolClient,campaignId,id),await this.publicationCandidate(poolClient,campaignId,id),
          checkedRollingPublicationQaV1,rollingPublicationQaConfiguration.digest,rollingPublicationQaConfiguration.commands);
      }
      await poolClient.query('UPDATE ponytail_index.rolling_publication_qa_v1 SET result_text=$5 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND qa_id=$4',
        [this.projectId,campaignId,id,checkedRollingPublicationQaV1.id,JSON.stringify(checkedRollingPublicationQaV1)]);
      await poolClient.query('UPDATE ponytail_index.rolling_publication_batch_v1 SET state=$4 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',
        [this.projectId,campaignId,id,checkedRollingPublicationQaV1.outcome === 'PASS' ? 'QA_PASSED' : 'QA_FAILED']);
      return checkedRollingPublicationQaV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginMainlinePush(campaignId:string,id:string):Promise<RollingMainlineCandidateV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const batch = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(batch?.state === 'QA_PASSED','full publication QA must pass before mainline push');
      const rows = (await poolClient.query<Record<string,unknown>>("SELECT q.result_text FROM ponytail_index.rolling_publication_qa_v1 q JOIN ponytail_index.rolling_publication_batch_v1 b USING(project_id,campaign_id,batch_id) WHERE q.project_id=$1 AND q.campaign_id=$2 AND q.batch_id=$3 AND q.qa_id=b.qa_id AND q.result_text IS NOT NULL",[this.projectId,campaignId,id])).rows;
      const row = rows[0];requireState(row,'publication lacks its complete QA receipt');
      const rollingPublicationQaV1 = parseRollingPublicationQa(stringColumn(row.result_text,'QA result'));
      const rollingMainlineCandidateV1 = await this.publicationCandidate(poolClient,campaignId,id);
      const rollingPublicationQaConfiguration = this.publicationQaConfiguration(rollingCampaignRow);
      verifyRollingPublicationQa(await this.publicationClaim(poolClient,campaignId,id),rollingMainlineCandidateV1,rollingPublicationQaV1,
        rollingPublicationQaConfiguration.digest,rollingPublicationQaConfiguration.commands);
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='PUSHING' WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id]);
      return rollingMainlineCandidateV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginMainlineRefresh(campaignId:string,id:string):Promise<RollingMainlineRefreshIntentV1> {
    return this.transaction(campaignId,async poolClient=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state,pending_refresh_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row,'publication batch is missing');
      if (row.pending_refresh_id !== null) {
        requireState(row.state === 'PREPARING','pending refresh has lost publication ownership');
        const pending = (await poolClient.query<Record<string,unknown>>('SELECT intent_text FROM ponytail_index.rolling_mainline_refresh_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND refresh_id=$4',[this.projectId,campaignId,id,row.pending_refresh_id])).rows[0];
        requireState(pending,'pending refresh intent is missing');
        return readRollingMainlineRefreshIntentV1(readStateText(stringColumn(pending.intent_text,'refresh intent')));
      }
      requireState(row.state === 'REBASE_REQUIRED' || row.state === 'PUSH_REJECTED','observe the original push outcome before refreshing mainline');
      const rollingMainlineCandidateV1 = await this.publicationCandidate(poolClient,campaignId,id);
      verifyRollingMainlineCandidate(await this.publicationClaim(poolClient,campaignId,id),rollingMainlineCandidateV1);
      const rollingMainlineRefreshIntentV1 = readRollingMainlineRefreshIntentV1({schemaVersion:1,id:crypto.randomUUID(),batchId:id,previousCandidate:rollingMainlineCandidateV1});
      await poolClient.query('INSERT INTO ponytail_index.rolling_mainline_refresh_v1(project_id,campaign_id,batch_id,refresh_id,intent_text) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,id,rollingMainlineRefreshIntentV1.id,JSON.stringify(rollingMainlineRefreshIntentV1)]);
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='PREPARING',pending_refresh_id=$4 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id,rollingMainlineRefreshIntentV1.id]);
      return rollingMainlineRefreshIntentV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordMainlineRefreshPreparation(campaignId:string,id:string,rollingMainlineRefreshPreparationV1:RollingMainlineRefreshPreparationV1):Promise<RollingMainlineRefreshPreparationV1> {
    const checkedRollingMainlineRefreshPreparationV1 = readRollingMainlineRefreshPreparationV1(rollingMainlineRefreshPreparationV1);
    return this.transaction(campaignId,async poolClient=> {
      requireState(checkedRollingMainlineRefreshPreparationV1.batchId === id,'refresh preparation belongs to another batch');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT r.intent_text,r.preparation_text,b.state,b.pending_refresh_id FROM ponytail_index.rolling_mainline_refresh_v1 r JOIN ponytail_index.rolling_publication_batch_v1 b USING(project_id,campaign_id,batch_id) WHERE r.project_id=$1 AND r.campaign_id=$2 AND r.batch_id=$3 AND r.refresh_id=$4',
        [this.projectId,campaignId,id,checkedRollingMainlineRefreshPreparationV1.id])).rows[0];
      requireState(row && row.state === 'PREPARING' && row.pending_refresh_id === checkedRollingMainlineRefreshPreparationV1.id,'refresh preparation has no current intent');
      const rollingMainlineRefreshIntentV1 = readRollingMainlineRefreshIntentV1(readStateText(stringColumn(row.intent_text,'refresh intent')));
      requireState(isDeepStrictEqual({...rollingMainlineRefreshIntentV1,mainlineRevision:checkedRollingMainlineRefreshPreparationV1.mainlineRevision},checkedRollingMainlineRefreshPreparationV1),'refresh preparation differs from its retained intent');
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineRefreshIntentV1.previousCandidate);
      requireState(git(rollingPublicationBatchClaimV1.rootPath,['rev-parse',`refs/remotes/${rollingPublicationBatchClaimV1.target.remote}/${rollingPublicationBatchClaimV1.target.branch}^{commit}`]).trim() === checkedRollingMainlineRefreshPreparationV1.mainlineRevision,'refresh preparation differs from the fetched target');
      if (row.preparation_text !== null) requireState(isDeepStrictEqual(readRollingMainlineRefreshPreparationV1(readStateText(stringColumn(row.preparation_text,'refresh preparation'))),checkedRollingMainlineRefreshPreparationV1),'refresh preparation is immutable');
      else await poolClient.query('UPDATE ponytail_index.rolling_mainline_refresh_v1 SET preparation_text=$5 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND refresh_id=$4',[this.projectId,campaignId,id,checkedRollingMainlineRefreshPreparationV1.id,JSON.stringify(checkedRollingMainlineRefreshPreparationV1)]);
      return checkedRollingMainlineRefreshPreparationV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordMainlineRefresh(campaignId:string,id:string,rollingMainlineRefreshResultV1:RollingMainlineRefreshResultV1):Promise<RollingMainlineRefreshResultV1> {
    const checkedRollingMainlineRefreshResultV1 = readRollingMainlineRefreshResultV1(rollingMainlineRefreshResultV1);
    return this.transaction(campaignId,async poolClient=> {
      requireState(checkedRollingMainlineRefreshResultV1.batchId === id,'refresh result belongs to another batch');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT r.preparation_text,r.result_text,b.state,b.pending_refresh_id FROM ponytail_index.rolling_mainline_refresh_v1 r JOIN ponytail_index.rolling_publication_batch_v1 b USING(project_id,campaign_id,batch_id) WHERE r.project_id=$1 AND r.campaign_id=$2 AND r.batch_id=$3 AND r.refresh_id=$4',
        [this.projectId,campaignId,id,checkedRollingMainlineRefreshResultV1.id])).rows[0];
      requireState(row && row.preparation_text !== null,'refresh result has no retained preparation');
      if (row.result_text !== null) {
        const previous = readRollingMainlineRefreshResultV1(readStateText(stringColumn(row.result_text,'refresh result')));
        requireState(isDeepStrictEqual(previous,checkedRollingMainlineRefreshResultV1),'refresh result is immutable');return previous;
      }
      requireState(row.state === 'PREPARING' && row.pending_refresh_id === checkedRollingMainlineRefreshResultV1.id,'refresh result no longer owns this publication');
      const rollingMainlineRefreshPreparationV1 = readRollingMainlineRefreshPreparationV1(readStateText(stringColumn(row.preparation_text,'refresh preparation')));
      requireState(checkedRollingMainlineRefreshResultV1.candidate.sourceRevision === rollingMainlineRefreshPreparationV1.previousCandidate.sourceRevision
        && checkedRollingMainlineRefreshResultV1.candidate.mainlineRevision === rollingMainlineRefreshPreparationV1.mainlineRevision,'refreshed candidate differs from its preparation');
      verifyRollingMainlineCandidate(await this.publicationClaim(poolClient,campaignId,id),checkedRollingMainlineRefreshResultV1.candidate);
      git(checkedRollingMainlineRefreshResultV1.candidate.rootPath,['merge-base','--is-ancestor',rollingMainlineRefreshPreparationV1.previousCandidate.revision,checkedRollingMainlineRefreshResultV1.candidate.revision]);
      await poolClient.query('UPDATE ponytail_index.rolling_mainline_refresh_v1 SET result_text=$5 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3 AND refresh_id=$4',[this.projectId,campaignId,id,checkedRollingMainlineRefreshResultV1.id,JSON.stringify(checkedRollingMainlineRefreshResultV1)]);
      await poolClient.query("UPDATE ponytail_index.rolling_publication_batch_v1 SET state='CANDIDATE',refresh_id=$4,pending_refresh_id=NULL,qa_id=NULL WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3",[this.projectId,campaignId,id,checkedRollingMainlineRefreshResultV1.id]);
      return checkedRollingMainlineRefreshResultV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async mainlinePublication(campaignId:string,id:string):Promise<RollingMainlinePublicationV1 | null> {
    const row = (await this.pool.query<Record<string,unknown>>(
      'SELECT p.publication_text FROM ponytail_index.rolling_mainline_publication_v1 p JOIN ponytail_index.rolling_publication_batch_v1 b USING(project_id,campaign_id,batch_id) WHERE p.project_id=$1 AND p.campaign_id=$2 AND p.batch_id=$3 AND p.publication_id=b.publication_id',
      [this.projectId,campaignId,id])).rows[0];
    return row ? readRollingMainlinePublicationV1(readStateText(stringColumn(row.publication_text,'mainline publication'))) : null;
  }

  private async mainlinePushContext(campaignId:string,id:string):Promise<{readonly claim:RollingPublicationBatchClaimV1;readonly candidate:RollingMainlineCandidateV1}> {
    return this.transaction(campaignId,async poolClient=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row && ['PUSHING','UNCONFIRMED','PUSH_REJECTED','REBASE_REQUIRED'].includes(stringColumn(row.state,'publication state')),
        'mainline observation requires its retained push intent');
      return {claim:await this.publicationClaim(poolClient,campaignId,id),candidate:await this.publicationCandidate(poolClient,campaignId,id)};
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordMainlinePublication(campaignId:string,id:string,rollingIncrementPublicationResult:RollingIncrementPublicationResult):Promise<RollingMainlinePublicationV1> {
    return this.transaction(campaignId,async poolClient=> {
      const rollingPublicationBatchClaimV1 = await this.publicationClaim(poolClient,campaignId,id);
      const rollingMainlineCandidateV1 = await this.publicationCandidate(poolClient,campaignId,id);
      const rollingMainlinePublicationV1 = readRollingMainlinePublicationV1({schemaVersion:1,id:crypto.randomUUID(),batchId:id,result:rollingIncrementPublicationResult});
      requireState(rollingMainlinePublicationV1.result.revision === rollingMainlineCandidateV1.revision,'mainline publication differs from its verified candidate');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row && ['PUSHING','UNCONFIRMED','PUSH_REJECTED','REBASE_REQUIRED'].includes(stringColumn(row.state,'publication state')),'mainline result has no retained push ownership');
      if (rollingMainlinePublicationV1.result.state === 'PUBLISHED') {
        const observed = reconcileRollingIncrementPublication({rootPath:rollingMainlineCandidateV1.rootPath,target:rollingPublicationBatchClaimV1.target,revision:rollingMainlineCandidateV1.revision});
        requireState(observed.state === 'PUBLISHED' && observed.remoteRevision === rollingMainlinePublicationV1.result.remoteRevision,'mainline publication requires freshly observed remote containment');
      }
      await poolClient.query('INSERT INTO ponytail_index.rolling_mainline_publication_v1(project_id,campaign_id,batch_id,publication_id,publication_text) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,id,rollingMainlinePublicationV1.id,JSON.stringify(rollingMainlinePublicationV1)]);
      await poolClient.query('UPDATE ponytail_index.rolling_publication_batch_v1 SET state=$4,publication_id=$5 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',
        [this.projectId,campaignId,id,rollingMainlinePublicationV1.result.state,rollingMainlinePublicationV1.id]);
      return rollingMainlinePublicationV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async observeMainlinePublication(campaignId:string,id:string):Promise<RollingMainlinePublicationV1> {
    const rollingMainlinePublicationV1 = await this.mainlinePublication(campaignId,id);
    if (rollingMainlinePublicationV1?.result.state === 'PUBLISHED') return rollingMainlinePublicationV1;
    const context = await this.mainlinePushContext(campaignId,id);
    const rollingIncrementPublicationResult = reconcileRollingIncrementPublication({rootPath:context.candidate.rootPath,target:context.claim.target,revision:context.candidate.revision});
    return this.recordMainlinePublication(campaignId,id,rollingIncrementPublicationResult);
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async publishMainline(campaignId:string,id:string):Promise<RollingMainlinePublicationV1> {
    const rollingMainlinePublicationV1 = await this.mainlinePublication(campaignId,id);
    if (rollingMainlinePublicationV1?.result.state === 'PUBLISHED') return rollingMainlinePublicationV1;
    const rollingMainlineCandidateV1 = await this.beginMainlinePush(campaignId,id);
    const context = await this.mainlinePushContext(campaignId,id);
    const rollingIncrementPublicationResult = publishRollingIncrement({rootPath:rollingMainlineCandidateV1.rootPath,target:context.claim.target,revision:rollingMainlineCandidateV1.revision});
    return this.recordMainlinePublication(campaignId,id,rollingIncrementPublicationResult);
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async synchronizePublishedCampaign(campaignId:string,id:string):Promise<RollingIncrementPublicationResult> {
    const context = await this.transaction(campaignId,async poolClient=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT state,synchronized_revision,synchronized_remote_revision FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row?.state === 'PUBLISHED','campaign base cannot synchronize before mainline publication is observed');
      return {claim:await this.publicationClaim(poolClient,campaignId,id),candidate:await this.publicationCandidate(poolClient,campaignId,id),
        synchronizedRevision:nullableStringColumn(row.synchronized_revision,'synchronized campaign revision'),
        synchronizedRemoteRevision:nullableStringColumn(row.synchronized_remote_revision,'observed synchronized remote revision')};
    });
    if (context.synchronizedRevision !== null) {
      requireState(context.synchronizedRemoteRevision !== null,'completed synchronization has no observed remote receipt');
      return {state:'PUBLISHED',revision:context.synchronizedRevision,remoteRevision:context.synchronizedRemoteRevision};
    }
    const rollingMainlinePublicationV1 = await this.mainlinePublication(campaignId,id);requireState(rollingMainlinePublicationV1,'mainline publication receipt is missing');
    const rollingIncrementPublicationResult = synchronizeRollingCampaign(context.claim,context.candidate,rollingMainlinePublicationV1);
    if (rollingIncrementPublicationResult.state !== 'PUBLISHED') return rollingIncrementPublicationResult;
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      requireState(git(context.claim.rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${context.claim.incrementRef}`
        && git(context.claim.rootPath,['rev-parse','HEAD']).trim() === rollingIncrementPublicationResult.revision,
        'synchronized campaign checkout changed; retain publication ownership');
      const observed = reconcileRollingIncrementPublication({rootPath:context.claim.rootPath,target:{remote:context.claim.target.remote,branch:context.claim.incrementRef},revision:rollingIncrementPublicationResult.revision});
      requireState(observed.state === 'PUBLISHED','campaign synchronization requires observed remote containment');
      const row = (await poolClient.query<Record<string,unknown>>('SELECT synchronized_revision FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',[this.projectId,campaignId,id])).rows[0];
      requireState(row && (row.synchronized_revision === null || row.synchronized_revision === rollingIncrementPublicationResult.revision),'synchronization receipt is immutable');
      await poolClient.query('UPDATE ponytail_index.rolling_publication_batch_v1 SET synchronized_revision=$4,synchronized_remote_revision=$5 WHERE project_id=$1 AND campaign_id=$2 AND batch_id=$3',
        [this.projectId,campaignId,id,rollingIncrementPublicationResult.revision,observed.remoteRevision]);
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      await poolClient.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2',[this.projectId,campaignId,rollingGraph.digest]);
      return rollingIncrementPublicationResult;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async claimIncrement(campaignId: string, reviewId: string): Promise<RollingIncrementClaimV1> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const existing = (await poolClient.query<Record<string, unknown>>('SELECT claim_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId,campaignId,reviewId])).rows[0];
      if (existing) {
        const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(existing.claim_text,'increment claim')));
        requireState(rollingIncrementClaimV1.campaignId === campaignId && rollingIncrementClaimV1.reviewId === reviewId,'stored claim identity differs');
        await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
        return rollingIncrementClaimV1;
      }
      const rollingPublicationLane=await this.publicationLane(poolClient,rollingCampaignRow);
      requireState(rollingPublicationLane.integrationCampaignId === null,'another increment owns the integration lane; finish its original operation');
      const activePublications = (await poolClient.query<Record<string,unknown>>(
        "SELECT batch_id FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND coordinator_root=$2 AND NOT withdrawn AND (state<>'PUBLISHED' OR synchronized_revision IS NULL)",
        [this.projectId,rollingCampaignRow.coordinator_root])).rows;
      requireState(activePublications.length === 0,'mainline publication owns the coordinator checkout; finish it before claiming another increment');
      const row = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text,replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.replacement_text === null && row.outcome_text !== null,'increment requires an unreplaced decided review');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text,'review request'));
      const rollingReviewOutcomeV1 = parseRollingReviewOutcome(stringColumn(row.outcome_text,'review outcome'));
      validateRollingReviewOutcome(rollingReviewRequestV1,rollingReviewOutcomeV1);
      requireState(rollingReviewOutcomeV1.decision === 'accepted','increment requires an accepted review');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingReviewRequestV1.assignmentId,rollingReviewRequestV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING','assignment is not integrating');
      const rollingReviewCandidate = await this.validateReviewCandidate(poolClient,rollingCampaignRow,rollingReviewRequestV1);
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1({schemaVersion:1,id:crypto.randomUUID(),campaignId,reviewId,
        assignmentId:rollingReviewRequestV1.assignmentId,generation:rollingReviewRequestV1.generation,
        graphDigest:rollingCampaignRow.graph_digest,rootPath:rollingReviewCandidate.rootPath,coordinatorRoot:rollingCampaignRow.coordinator_root,
        target:{remote:rollingExecutionConfigV3.mainline.remote,branch:rollingExecutionConfigV3.incrementRef},
        reviewedRevision:rollingReviewRequestV1.revision,reviewedBase:rollingReviewRequestV1.baseCommit});
      await poolClient.query('INSERT INTO ponytail_index.rolling_increment_v1(project_id,campaign_id,review_id,increment_id,claim_text,state) VALUES($1,$2,$3,$4,$5,\'CLAIMED\')',
        [this.projectId,campaignId,reviewId,rollingIncrementClaimV1.id,JSON.stringify(rollingIncrementClaimV1)]);
      return rollingIncrementClaimV1;
    });
  }

  private async validateIncrementClaim(poolClient: PoolClient,rollingCampaignRow: RollingCampaignRow,rollingIncrementClaimV1: RollingIncrementClaimV1): Promise<void> {
    const rollingStoredAssignment = await this.assignment(poolClient,rollingCampaignRow.campaign_id,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
    requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,
      'increment requires stopped retained integrating ownership');
    requireState(rollingIncrementClaimV1.graphDigest === rollingCampaignRow.graph_digest,'integration claim graph is stale');
    this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginIncrementRebase(campaignId: string,reviewId: string): Promise<RollingIncrementRebaseV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'CLAIMED','rebase already started; recover its recorded intent');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const rollingFastRebaseIdentity = prepareRollingIncrementRebase({rootPath:rollingIncrementClaimV1.rootPath,target:rollingIncrementClaimV1.target,
        revision:rollingIncrementClaimV1.reviewedRevision,baseCommit:rollingIncrementClaimV1.reviewedBase});
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1({schemaVersion:1,incrementId:rollingIncrementClaimV1.id,...rollingFastRebaseIdentity,result:null});
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=\'REBASING\',rebase_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
        [this.projectId,campaignId,reviewId,JSON.stringify(rollingIncrementRebaseV1)]);
      return rollingIncrementRebaseV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async incrementRebase(campaignId: string,reviewId: string): Promise<RollingIncrementRebaseV1 | null> {
    const row = (await this.pool.query<Record<string,unknown>>('SELECT rebase_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
    if (!row || row.rebase_text === null) return null;
    return readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'increment rebase')));
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordIncrementRebase(campaignId: string,reviewId: string,rollingFastRebaseResult: RollingFastRebaseResult): Promise<RollingIncrementRebaseV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.rebase_text !== null,'increment has no recorded rebase intent');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const previousRollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'increment rebase')));
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1({...previousRollingIncrementRebaseV1,result:rollingFastRebaseResult});
      if (previousRollingIncrementRebaseV1.result !== null) {
        requireState(isDeepStrictEqual(previousRollingIncrementRebaseV1,rollingIncrementRebaseV1),'recorded rebase result is immutable');
        return previousRollingIncrementRebaseV1;
      }
      requireState(row.state === 'REBASING','increment is not awaiting rebase observation');
      verifyRollingIncrementRebase(rollingIncrementClaimV1.rootPath,rollingFastRebaseResult);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=$4,rebase_text=$5,candidate_revision=$6 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
        [this.projectId,campaignId,reviewId,rollingFastRebaseResult.state === 'REBASED' ? 'REBASED' : 'CONFLICT',JSON.stringify(rollingIncrementRebaseV1),
          rollingFastRebaseResult.state === 'REBASED' ? rollingFastRebaseResult.revision : null]);
      return rollingIncrementRebaseV1;
    });
  }

  // Traceability: implements REQ-ROLLING-REVIEW
  async requestIncrementRepair(campaignId: string,reviewId: string,reference: string): Promise<RollingIncrementRepair> {
    requireState(reference.trim().length > 0,'substantive repair requires an inspection reference');
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text,repair_reference FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'CONFLICT','substantive repair requires a retained textual conflict');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'increment conflict')));
      requireState(rollingIncrementRebaseV1.result?.state === 'TEXTUAL_CONFLICT','recorded conflict is missing');
      if (row.repair_reference !== null) {
        requireState(row.repair_reference === reference,'repair retry differs from recorded inspection');
        return {rebase:rollingIncrementRebaseV1,reference};
      }
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      verifyRollingIncrementRebase(rollingIncrementClaimV1.rootPath,rollingIncrementRebaseV1.result);
      const continuation = (await poolClient.query('SELECT original_commit FROM ponytail_index.rolling_increment_continuation_v1 WHERE project_id=$1 AND campaign_id=$2 AND increment_id=$3 AND original_commit=$4',
        [this.projectId,campaignId,rollingIncrementClaimV1.id,rollingIncrementRebaseV1.result.originalCommit])).rows;
      requireState(continuation.length === 0,'conflict continuation already owns this commit; reconcile it first');
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET repair_reference=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId,reference]);
      await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='REWORK' WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4",
        [this.projectId,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation]);
      return {rebase:rollingIncrementRebaseV1,reference};
    });
  }

  // Traceability: implements REQ-ROLLING-REVIEW
  async beginIncrementContinuation(campaignId: string,reviewId: string,rollingIncrementConflictInspection: RollingIncrementConflictInspection): Promise<RollingIncrementRebaseV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'CONFLICT','increment is not awaiting conflict inspection');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'increment conflict')));
      requireState(rollingIncrementRebaseV1.result?.state === 'TEXTUAL_CONFLICT','recorded conflict is missing');
      verifyRollingIncrementConflictInspection(rollingIncrementClaimV1.rootPath,rollingIncrementRebaseV1.result,rollingIncrementConflictInspection);
      const inserted = await poolClient.query('INSERT INTO ponytail_index.rolling_increment_continuation_v1(project_id,campaign_id,increment_id,original_commit,inspection_reference,conflict_text) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING original_commit',
        [this.projectId,campaignId,rollingIncrementClaimV1.id,rollingIncrementConflictInspection.originalCommit,rollingIncrementConflictInspection.reference,JSON.stringify(rollingIncrementRebaseV1)]);
      requireState(inserted.rowCount === 1,'continuation already started; recover its recorded intent');
      return rollingIncrementRebaseV1;
    });
  }

  // Traceability: implements REQ-ROLLING-REVIEW
  async incrementConflictInspection(campaignId: string,reviewId: string,originalCommit: string): Promise<RollingIncrementConflictInspection | null> {
    const row = (await this.pool.query<Record<string,unknown>>('SELECT c.original_commit,c.inspection_reference FROM ponytail_index.rolling_increment_continuation_v1 c JOIN ponytail_index.rolling_increment_v1 i USING(project_id,campaign_id,increment_id) WHERE i.project_id=$1 AND i.campaign_id=$2 AND i.review_id=$3 AND c.original_commit=$4',
      [this.projectId,campaignId,reviewId,originalCommit])).rows[0];
    return row ? {originalCommit:stringColumn(row.original_commit,'inspected original commit'),reference:stringColumn(row.inspection_reference,'semantic inspection reference')} : null;
  }

  // Traceability: implements REQ-ROLLING-REVIEW
  async recordIncrementContinuation(campaignId: string,reviewId: string,rollingIncrementConflictInspection: RollingIncrementConflictInspection,rollingFastRebaseResult: RollingFastRebaseResult): Promise<RollingIncrementRebaseV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row,'increment is missing');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const continuation = (await poolClient.query<Record<string,unknown>>('SELECT inspection_reference,conflict_text,result_text FROM ponytail_index.rolling_increment_continuation_v1 WHERE project_id=$1 AND campaign_id=$2 AND increment_id=$3 AND original_commit=$4',
        [this.projectId,campaignId,rollingIncrementClaimV1.id,rollingIncrementConflictInspection.originalCommit])).rows[0];
      requireState(continuation && continuation.inspection_reference === rollingIncrementConflictInspection.reference,'continuation differs from recorded inspection intent');
      const previousRollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(continuation.conflict_text,'original conflict')));
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1({...previousRollingIncrementRebaseV1,result:rollingFastRebaseResult});
      if (continuation.result_text !== null) {
        const recordedRollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(continuation.result_text,'continuation result')));
        requireState(isDeepStrictEqual(recordedRollingIncrementRebaseV1,rollingIncrementRebaseV1),'continuation result is immutable');
        return recordedRollingIncrementRebaseV1;
      }
      requireState(row.state === 'CONFLICT' && isDeepStrictEqual(readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'current conflict'))),previousRollingIncrementRebaseV1),'increment no longer owns this conflict');
      verifyRollingIncrementRebase(rollingIncrementClaimV1.rootPath,rollingFastRebaseResult);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_continuation_v1 SET result_text=$5 WHERE project_id=$1 AND campaign_id=$2 AND increment_id=$3 AND original_commit=$4',
        [this.projectId,campaignId,rollingIncrementClaimV1.id,rollingIncrementConflictInspection.originalCommit,JSON.stringify(rollingIncrementRebaseV1)]);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=$4,rebase_text=$5,candidate_revision=$6 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
        [this.projectId,campaignId,reviewId,rollingFastRebaseResult.state === 'REBASED' ? 'REBASED' : 'CONFLICT',JSON.stringify(rollingIncrementRebaseV1),rollingFastRebaseResult.state === 'REBASED' ? rollingFastRebaseResult.revision : null]);
      return rollingIncrementRebaseV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordIncrementProof(campaignId: string,reviewId: string,rollingWorkerSubmissionV1: RollingWorkerSubmissionV1): Promise<RollingWorkerSubmissionV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text,proof_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'REBASED','increment requires a completed rebase before refreshed QA');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const rollingIncrementRebaseV1 = readRollingIncrementRebaseV1(readStateText(stringColumn(row.rebase_text,'increment rebase')));
      requireState(rollingIncrementRebaseV1.result?.state === 'REBASED','increment has no completed rebase result');
      const validatedRollingWorkerSubmissionV1 = readRollingWorkerSubmissionV1(rollingWorkerSubmissionV1);
      requireState(validatedRollingWorkerSubmissionV1.campaignId === campaignId && validatedRollingWorkerSubmissionV1.assignmentId === rollingIncrementClaimV1.assignmentId
        && validatedRollingWorkerSubmissionV1.generation === rollingIncrementClaimV1.generation
        && validatedRollingWorkerSubmissionV1.revision === rollingIncrementRebaseV1.result.revision
        && validatedRollingWorkerSubmissionV1.baseCommit === rollingIncrementRebaseV1.integrationBase,'QA belongs to another integration candidate');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.lease,'increment requires its original frozen lease');
      validateRollingWorkerSubmission(rollingIncrementClaimV1.rootPath,rollingStoredAssignment.lease,validatedRollingWorkerSubmissionV1);
      const rollingGraph = this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest);
      for (const argv of rollingGraph.projectConfiguration.qa.focused) requireState(validatedRollingWorkerSubmissionV1.proof.some(proof=>proof.evidence.command === argv.join(' ')),'configured focused QA is missing');
      const proofText = JSON.stringify(validatedRollingWorkerSubmissionV1);
      const proofDigest = crypto.createHash('sha256').update(proofText).digest('hex');
      await poolClient.query('INSERT INTO ponytail_index.rolling_increment_proof_v1(project_id,campaign_id,increment_id,proof_digest,proof_text) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [this.projectId,campaignId,rollingIncrementClaimV1.id,proofDigest,proofText]);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET proof_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId,JSON.stringify(validatedRollingWorkerSubmissionV1)]);
      return validatedRollingWorkerSubmissionV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async beginIncrementPush(campaignId: string,reviewId: string): Promise<RollingIncrementPushStarted> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,rebase_text,proof_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'REBASED' && row.proof_text !== null,'increment requires fresh QA before push; recover any existing push intent');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      await this.validateIncrementClaim(poolClient,rollingCampaignRow,rollingIncrementClaimV1);
      const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(stringColumn(row.proof_text,'increment proof'));
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.lease,'increment requires its original frozen lease');
      validateRollingWorkerSubmission(rollingIncrementClaimV1.rootPath,rollingStoredAssignment.lease,rollingWorkerSubmissionV1);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=\'PUSHING\' WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId]);
      return {claim:rollingIncrementClaimV1,revision:rollingWorkerSubmissionV1.revision};
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async publishIncrement(campaignId: string,reviewId: string): Promise<RollingIncrementPublicationV1> {
    const rollingIncrementPushStarted = await this.beginIncrementPush(campaignId,reviewId);
    fastForwardRollingIncrement(rollingIncrementPushStarted.claim.coordinatorRoot,rollingIncrementPushStarted.claim.target.branch,rollingIncrementPushStarted.revision);
    const rollingIncrementPublicationResult = publishRollingIncrement({rootPath:rollingIncrementPushStarted.claim.rootPath,
      target:rollingIncrementPushStarted.claim.target,revision:rollingIncrementPushStarted.revision});
    return this.recordIncrementPublication(campaignId,reviewId,rollingIncrementPublicationResult);
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async recordIncrementPublication(campaignId: string,reviewId: string,rollingIncrementPublicationResult: RollingIncrementPublicationResult): Promise<RollingIncrementPublicationV1> {
    return this.transaction(campaignId,async (poolClient)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,candidate_revision,publication_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && rollingIncrementPublicationResult.revision === row.candidate_revision,'publication differs from the verified increment');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      const rollingIncrementPublicationV1 = readRollingIncrementPublicationV1({schemaVersion:1,incrementId:rollingIncrementClaimV1.id,result:rollingIncrementPublicationResult});
      if (row.state === 'PUBLISHED') {
        const storedRollingIncrementPublicationV1 = readRollingIncrementPublicationV1(readStateText(stringColumn(row.publication_text,'increment publication')));
        requireState(isDeepStrictEqual(storedRollingIncrementPublicationV1,rollingIncrementPublicationV1),'published increment receipt is immutable');
        return storedRollingIncrementPublicationV1;
      }
      requireState(['PUSHING','UNCONFIRMED','PUSH_REJECTED','REBASE_REQUIRED'].includes(stringColumn(row.state,'increment state')),'increment has no push intent to reconcile');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,'publication ownership changed');
      if (rollingIncrementPublicationResult.state === 'PUBLISHED') {
        verifyRollingIncrementLocalIntegration(rollingIncrementClaimV1.coordinatorRoot,rollingIncrementClaimV1.target.branch,rollingIncrementPublicationResult.revision);
        const observedRollingIncrementPublicationResult = reconcileRollingIncrementPublication({rootPath:rollingIncrementClaimV1.rootPath,target:rollingIncrementClaimV1.target,revision:rollingIncrementPublicationResult.revision});
        requireState(observedRollingIncrementPublicationResult.state === 'PUBLISHED' && observedRollingIncrementPublicationResult.remoteRevision === rollingIncrementPublicationResult.remoteRevision,'publication requires freshly verified remote containment');
        await poolClient.query('INSERT INTO ponytail_index.rolling_increment_delivery_v1(project_id,campaign_id,increment_id,revision,remote_revision) VALUES($1,$2,$3,$4,$5)',
          [this.projectId,campaignId,rollingIncrementClaimV1.id,rollingIncrementPublicationResult.revision,rollingIncrementPublicationResult.remoteRevision]);
      }
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=$4,publication_text=$5,remote_revision=$6 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',
        [this.projectId,campaignId,reviewId,rollingIncrementPublicationResult.state,JSON.stringify(rollingIncrementPublicationV1),
          rollingIncrementPublicationResult.state === 'UNCONFIRMED' ? null : rollingIncrementPublicationResult.remoteRevision]);
      return rollingIncrementPublicationV1;
    });
  }

  // Traceability: implements REQ-ROLLING-GRAPH
  async acceptIncrementCertificates(campaignId: string,reviewId: string,candidatePath: string,bindingPaths: readonly string[]): Promise<ObligationDocumentV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,candidate_revision,proof_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.state === 'PUBLISHED' && row.proof_text !== null,'certificate assessment requires a published reviewed increment');
      const activeIncrementRecords = (await poolClient.query<Record<string,unknown>>('SELECT i.review_id FROM ponytail_index.rolling_increment_v1 i JOIN ponytail_index.rolling_campaign_v1 c USING(project_id,campaign_id) WHERE i.project_id=$1 AND c.coordinator_root=$2 AND i.state<>\'PUBLISHED\' AND i.repair_reference IS NULL',[this.projectId,rollingCampaignRow.coordinator_root])).rows;
      requireState(activeIncrementRecords.length === 0,'integration lane is occupied; finish its Git outcome before assessing certificates');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,'certificate assessment requires stopped retained integration ownership');
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      const obligationLeaseV1 = this.currentLease(rollingStoredAssignment,rollingGraph);
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      requireState(rollingExecutionConfigV3.bindingHistory !== null && rollingGraph.bindingHistory,'certificate assessment requires adopted binding history');
      const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(stringColumn(row.proof_text,'integrated proof'));
      requireState(rollingWorkerSubmissionV1.revision === row.candidate_revision,'retained proof differs from published candidate');
      verifyRollingIncrementLocalIntegration(rollingCampaignRow.coordinator_root,rollingIncrementClaimV1.target.branch,rollingWorkerSubmissionV1.revision);
      const documentPath = rollingCampaignRow.document_path;
      relativePath(candidatePath);
      requireState(candidatePath !== documentPath,'candidate must be separate from the accepted document');
      inputDigest(rollingCampaignRow.coordinator_root,candidatePath);
      const candidateObligationDocumentV1 = parseObligationDocument(fs.readFileSync(path.join(rollingCampaignRow.coordinator_root,candidatePath),'utf8'));
      requireState(isDeepStrictEqual(candidateObligationDocumentV1.obligations,rollingGraph.document.obligations)
        && isDeepStrictEqual(candidateObligationDocumentV1.baselines,rollingGraph.document.baselines),'certificate assessment cannot amend approved scope; reconcile scope changes separately');
      const obligationCheckpoint = candidateObligationDocumentV1.checkpoints.at(-1);
      requireState(obligationCheckpoint && obligationCheckpoint.assessor === rollingExecutionConfigV3.bindingHistory.assessor
        && obligationCheckpoint.selectedIds.length === 1 && obligationCheckpoint.selectedIds[0] === rollingStoredAssignment.obligationId,
        'assessment must identify the authorized coordinator and exact assigned obligation');
      requireState(obligationCheckpoint.certificateIds.length > 0,'assessment requires a discharge certificate');
      for (const certificateId of obligationCheckpoint.certificateIds) {
        const obligationCertificate = candidateObligationDocumentV1.certificates.find(certificate=>certificate.id === certificateId);
        requireState(obligationCertificate && obligationCertificate.obligationIds.length === 1
          && obligationCertificate.obligationIds[0] === rollingStoredAssignment.obligationId,'certificate exceeds assigned obligation');
        requireState(isObligationGitInputs(obligationCertificate.inputs) && obligationCertificate.evidence.every(evidence => isObligationGitInputs(evidence.inputs)), 'new campaign certificates require Git inputs; hash manifests are historical only');
        requireState(!obligationInputCovers(obligationCertificate.inputs,documentPath),'accepted document cannot certify its own bytes');
      }
      const obligationCertificateSubmission: ObligationCertificateSubmission = {lease:obligationLeaseV1,revision:rollingWorkerSubmissionV1.revision,
        operations:rollingWorkerSubmissionV1.proof.map(proof=>proof.operation),evidence:rollingWorkerSubmissionV1.proof.map(proof=>proof.evidence)};
      const obligationCertificateBindingRequests: readonly ObligationCertificateBindingRequest[] = bindingPaths.map(bindingPath=>{relativePath(bindingPath);return {path:bindingPath,submission:obligationCertificateSubmission};});
      // The file checkpoint is the accepted-state journal. A retry after a lost
      // database commit revalidates that exact checkpoint and its retained proof.
      const previousObligationDocumentV1 = isDeepStrictEqual(rollingGraph.document,candidateObligationDocumentV1)
        ? {...rollingGraph.document,checkpoints:rollingGraph.document.checkpoints.slice(0,-1),
          certificates:rollingGraph.document.certificates.filter(certificate=>!obligationCheckpoint.certificateIds.includes(certificate.id))}
        : rollingGraph.document;
      const documentDigest = inputDigest(rollingCampaignRow.coordinator_root,documentPath);
      const acceptedObligationDocumentV1 = acceptBoundCheckpoint(previousObligationDocumentV1,candidateObligationDocumentV1,
        rollingCampaignRow.coordinator_root,rollingGraph.bindingHistory,obligationCertificateBindingRequests);
      if (!isDeepStrictEqual(rollingGraph.document,acceptedObligationDocumentV1)) {
        const temporaryPath = path.join(rollingCampaignRow.coordinator_root,`${documentPath}.${crypto.randomUUID()}.tmp`);
        fs.writeFileSync(temporaryPath,JSON.stringify(acceptedObligationDocumentV1,null,2)+'\n',{flag:'wx',mode:0o600});
        try {
          requireState(inputDigest(rollingCampaignRow.coordinator_root,documentPath) === documentDigest,'accepted document changed during assessment');
          fs.renameSync(temporaryPath,path.join(rollingCampaignRow.coordinator_root,documentPath));
        } finally { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); }
      }
      const acceptedRollingGraph = this.collectGraph(rollingCampaignRow);
      await poolClient.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2',[this.projectId,campaignId,acceptedRollingGraph.digest]);
      return acceptedObligationDocumentV1;
    });
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async observeIncrementPublication(campaignId: string,reviewId: string): Promise<RollingIncrementPublicationV1> {
    const row = (await this.pool.query<Record<string,unknown>>('SELECT claim_text,state,candidate_revision,publication_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
    requireState(row,'increment publication is missing');
    if (row.state === 'PUBLISHED') return readRollingIncrementPublicationV1(readStateText(stringColumn(row.publication_text,'increment publication')));
    requireState(['PUSHING','UNCONFIRMED','PUSH_REJECTED','REBASE_REQUIRED'].includes(stringColumn(row.state,'increment state')),'increment has no committed push intent');
    const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
    const rollingIncrementPublicationResult = reconcileRollingIncrementPublication({rootPath:rollingIncrementClaimV1.rootPath,target:rollingIncrementClaimV1.target,
      revision:stringColumn(row.candidate_revision,'candidate revision')});
    return this.recordIncrementPublication(campaignId,reviewId,rollingIncrementPublicationResult);
  }

  // Traceability: implements REQ-ROLLING-PUBLICATION
  async retryIncrementPush(campaignId: string,reviewId: string): Promise<RollingIncrementPublicationV1> {
    const observedRollingIncrementPublicationV1 = await this.observeIncrementPublication(campaignId,reviewId);
    if (observedRollingIncrementPublicationV1.result.state === 'PUBLISHED' || observedRollingIncrementPublicationV1.result.state === 'UNCONFIRMED') return observedRollingIncrementPublicationV1;
    const rollingIncrementPushStarted = await this.transaction<RollingIncrementPushStarted>(campaignId,async (poolClient,rollingCampaignRow)=> {
      const row = (await poolClient.query<Record<string,unknown>>('SELECT claim_text,state,proof_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && (row.state === 'REBASE_REQUIRED' || row.state === 'PUSH_REJECTED'),'push retry is already claimed; observe its original outcome');
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,'push retry requires stopped retained ownership');
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      const obligationLeaseV1 = this.currentLease(rollingStoredAssignment,rollingGraph);
      const obligationBaseline = rollingGraph.document.baselines.at(-1);
      requireState(obligationBaseline && obligationBaseline.id === obligationLeaseV1.baselineId
        && obligationBaseline.authority.assessors.includes(obligationLeaseV1.assessor)
        && obligationLeaseV1.authority.every(reference=>obligationBaseline.authority.references.includes(reference)),'push retry authority changed');
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      requireState(rollingIncrementClaimV1.target.remote === rollingExecutionConfigV3.mainline.remote
        && rollingIncrementClaimV1.target.branch === rollingExecutionConfigV3.incrementRef,'push retry target changed');
      const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(stringColumn(row.proof_text,'increment proof'));
      validateRollingWorkerSubmission(rollingIncrementClaimV1.rootPath,obligationLeaseV1,rollingWorkerSubmissionV1);
      for (const argv of rollingGraph.projectConfiguration.qa.focused) requireState(rollingWorkerSubmissionV1.proof.some(proof=>proof.evidence.command === argv.join(' ')),'configured focused QA is missing');
      verifyRollingIncrementLocalIntegration(rollingIncrementClaimV1.coordinatorRoot,rollingIncrementClaimV1.target.branch,rollingWorkerSubmissionV1.revision);
      await poolClient.query('UPDATE ponytail_index.rolling_increment_v1 SET state=\'PUSHING\' WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3',[this.projectId,campaignId,reviewId]);
      return {claim:rollingIncrementClaimV1,revision:rollingWorkerSubmissionV1.revision};
    });
    const rollingIncrementPublicationResult = publishRollingIncrement({rootPath:rollingIncrementPushStarted.claim.rootPath,target:rollingIncrementPushStarted.claim.target,revision:rollingIncrementPushStarted.revision});
    return this.recordIncrementPublication(campaignId,reviewId,rollingIncrementPublicationResult);
  }

  private async validateReviewCandidate(poolClient: PoolClient, rollingCampaignRow: RollingCampaignRow, rollingReviewRequestV1: RollingReviewRequestV1): Promise<RollingReviewCandidate> {
    const rollingStoredAssignment = await this.assignment(poolClient, rollingReviewRequestV1.campaignId, rollingReviewRequestV1.assignmentId, rollingReviewRequestV1.generation);
    requireState(rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired, 'review candidate requires a stopped retained worker');
    const rollingGraph = this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest);
    this.currentLease(rollingStoredAssignment, rollingGraph);
    const obligation = rollingGraph.document.obligations.find(item => item.id === rollingStoredAssignment.obligationId);
    requireState(obligation, 'review obligation is absent from coordinator scope');
    const submission = (await poolClient.query<Record<string, unknown>>('SELECT submission_text,lease_text FROM ponytail_index.rolling_submission_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4 AND revision=$5',
      [this.projectId, rollingReviewRequestV1.campaignId, rollingReviewRequestV1.assignmentId, rollingReviewRequestV1.generation, rollingReviewRequestV1.revision])).rows[0];
    requireState(submission, 'reviewed candidate has no retained submission');
    const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredAssignment.worktreeNumber])).rows[0]);
    const rollingStoredSubmission: RollingStoredSubmission = { lease: readObligationLeaseV1(readStateText(stringColumn(submission.lease_text, 'submission lease'))),
      submission: parseRollingWorkerSubmission(stringColumn(submission.submission_text, 'submission')) };
    validateRollingWorkerSubmission(rollingStoredWorktree.rootPath, rollingStoredSubmission.lease, rollingStoredSubmission.submission);
    return { rootPath: rollingStoredWorktree.rootPath, obligation, binding: rollingStoredAssignment.binding, submission: rollingStoredSubmission };
  }

  async reviewDispatch(campaignId: string, reviewId: string): Promise<RollingReviewDispatch | null> {
    const row = (await this.pool.query<Record<string, unknown>>('SELECT dispatch_id,reviewer_thread_id,state,turn_id FROM ponytail_index.rolling_review_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId])).rows[0];
    if (!row) return null;
    return readReviewDispatch(row);
  }

  async attachReviewDispatch(campaignId: string, reviewId: string, dispatchId: string, reviewerSessionId: string, turnId: string): Promise<RollingReviewDispatchAttached> {
    requireState(turnId.length > 0 && turnId.trim() === turnId && !/[\0\r\n]/u.test(turnId), 'invalid review turn identity');
    return this.transaction(campaignId, async poolClient => {
      const row = (await poolClient.query<Record<string, unknown>>('SELECT d.dispatch_id,d.reviewer_thread_id,d.state,d.turn_id,r.request_text,r.replacement_text FROM ponytail_index.rolling_review_dispatch_v1 d JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) WHERE d.project_id=$1 AND d.campaign_id=$2 AND d.review_id=$3', [this.projectId, campaignId, reviewId])).rows[0];
      requireState(row && row.dispatch_id === dispatchId, 'invalid review dispatch identity');
      requireState(row.replacement_text === null, 'review request has been replaced');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
      requireState(rollingReviewRequestV1.reviewerSessionId === reviewerSessionId, 'native session differs from assigned reviewer');
      requireState(row.state === 'STARTED' || row.state === 'ATTACHED' && row.turn_id === turnId, 'review dispatch retry differs from original turn');
      await poolClient.query("UPDATE ponytail_index.rolling_review_dispatch_v1 SET state='ATTACHED',turn_id=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3", [this.projectId, campaignId, reviewId, turnId]);
      return { id: dispatchId, reviewerThreadId: stringColumn(row.reviewer_thread_id, 'reviewer thread'), state: 'ATTACHED', turnId };
    });
  }

  async recordReviewOutcome(campaignId: string, reviewId: string, actorSessionId: string, rollingReviewOutcomeV1: RollingReviewOutcomeV1): Promise<RollingStoredReview> {
    const checkedRollingReviewOutcomeV1 = readRollingReviewOutcomeV1(rollingReviewOutcomeV1);
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const row = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text,replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId])).rows[0];
      requireState(row, 'review request is missing');
      requireState(row.replacement_text === null, 'review request has been replaced');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
      requireState(actorSessionId === rollingReviewRequestV1.reviewerSessionId, 'only the assigned reviewer may report a decision');
      validateRollingReviewOutcome(rollingReviewRequestV1, checkedRollingReviewOutcomeV1);
      const text = nullableStringColumn(row.outcome_text, 'review outcome');
      if (text !== null) {
        requireState(isDeepStrictEqual(parseRollingReviewOutcome(text), checkedRollingReviewOutcomeV1), 'review retry differs from immutable decision');
        return { request: rollingReviewRequestV1, outcome: checkedRollingReviewOutcomeV1 };
      }
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, rollingReviewRequestV1.assignmentId, rollingReviewRequestV1.generation);
      requireState(rollingStoredAssignment.state === 'REVIEW' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired, 'candidate is no longer awaiting review');
      await this.validateReviewCandidate(poolClient, rollingCampaignRow, rollingReviewRequestV1);
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_review_v1 SET outcome_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId, campaignId, reviewId, JSON.stringify(checkedRollingReviewOutcomeV1)]);
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_assignment_v1 SET state=$2 WHERE assignment_id=$1', [rollingReviewRequestV1.assignmentId, checkedRollingReviewOutcomeV1.decision === 'accepted' ? 'INTEGRATING' : 'REWORK']);
      return { request: rollingReviewRequestV1, outcome: checkedRollingReviewOutcomeV1 };
    });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-SCHEDULING
  async renewLease(campaignId: string, id: string, generation: string, graphDigest: string): Promise<RollingLeaseRenewal> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingGraph = this.graph(rollingCampaignRow, graphDigest);
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(rollingStoredAssignment.state === 'INACTIVE' && rollingStoredAssignment.activityStopped
        && !rollingStoredAssignment.retired && rollingStoredAssignment.sessionId && rollingStoredAssignment.lease,
      'lease rebinding requires a stopped retained owner');
      await this.cancelActions(poolClient, id);
      const rollingBinding = rollingGraph.bindings.find(item => item.obligationId === rollingStoredAssignment.obligationId);
      requireState(rollingBinding, 'current obligation has no traceability binding');
      const nextGeneration = crypto.randomUUID();
      const rollingAssignmentScopeV3 = this.scope(rollingGraph, parseRollingExecutionConfig(rollingCampaignRow.configuration_text), nextGeneration,
        rollingStoredAssignment.obligationId, rollingBinding, rollingStoredAssignment.plannedPaths);
      requireState(rollingAssignmentScopeV3.execution.kind === 'leased', 'legacy assignments cannot adopt amended leases');
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,scope_text=$3 WHERE assignment_id=$1',
        [id, nextGeneration, JSON.stringify(rollingAssignmentScopeV3)]);
      return { id, generation: nextGeneration, lease: rollingAssignmentScopeV3.execution.lease };
    });
  }

  // Traceability: implements REQ-ROLLING-EXISTING-POOL
  // Traceability: implements REQ-SWARM-WORKTREES
  // Traceability: implements REQ-SWARM-CLI
  async allocate(campaignId: string, expectedDigest: string, release: RollingAssignmentRelease | null = null,existingOnly=false,rollingNativeWorkerSelection:RollingNativeWorkerSelection|null=null): Promise<RollingAllocationResult> {
    if(rollingNativeWorkerSelection!==null) {
      requireState(rollingNativeWorkerSelection.sessionId.trim()===rollingNativeWorkerSelection.sessionId&&rollingNativeWorkerSelection.sessionId.length>0,'native session must be nonempty without surrounding whitespace');
      for(const generation of [rollingNativeWorkerSelection.workerGeneration,rollingNativeWorkerSelection.worktreeGeneration])
        requireState(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(generation),'native worker selectors require exact UUID generations');
    }
    return this.transaction<RollingAllocationResult>(campaignId, async (poolClient, rollingCampaignRow, rollingPoolRow) => {
      const queue=(await poolClient.query<Record<string,unknown>>('SELECT campaign_id FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND NOT closed',[this.projectId,rollingCampaignRow.coordinator_root])).rows[0];
      requireState(queue===undefined,'swarm queue owns allocation; use swarm queue claim');
      const rollingGraph = this.graph(rollingCampaignRow, expectedDigest);
      if (release) {
        const row = await this.assignment(poolClient, campaignId, release.id, release.generation);
        requireState(row.state === 'RETIRING' && row.retired && row.activityStopped, 'checkout owner must retire before release');
        if (row.sessionId !== null) {
          const rollingWorkerRetirement = await this.retirementValue(poolClient,campaignId,row.id,row.generation);
          requireState(rollingWorkerRetirement?.state === 'CLEANED','attached checkout requires completed native retirement and owned-resource cleanup');
        }
        await this.cancelActions(poolClient, row.id);
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='RELEASED' WHERE assignment_id=$1", [row.id]);
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=$2", [this.projectId, row.worktreeNumber]);
      }
      const assignments = (await poolClient.query<Record<string, unknown>>("SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND state<>'RELEASED' ORDER BY created_at,assignment_id", [this.projectId])).rows.map(readAssignment);
      let swarmWorkerBinding:SwarmWorkerBinding|null=null;
      if(rollingNativeWorkerSelection!==null) {
        const row=(await poolClient.query<Record<string,unknown>>(`SELECT k.*,n.thread_id,n.root_path,m.generation AS membership_generation,m.owner_root AS membership_owner,
          w.root_path AS checkout_root,w.state AS checkout_state,o.coordinator_session_id,o.git_common_directory FROM ponytail_index.swarm_worker_v1 k
          JOIN ponytail_index.swarm_native_session_v1 n USING(session_id)
          JOIN ponytail_index.swarm_worktree_v1 m ON m.project_id=k.project_id AND m.number=k.worktree_number
          JOIN ponytail_index.rolling_worktree_v1 w ON w.project_id=m.project_id AND w.number=m.number
          JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=k.project_id AND o.owner_root=k.owner_root
          WHERE k.project_id=$1 AND k.session_id=$2
          AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 d WHERE d.project_id=k.project_id AND d.number=k.worktree_number) FOR UPDATE OF k,m,w,o`,[this.projectId,rollingNativeWorkerSelection.sessionId])).rows[0];
        requireState(row!==undefined,'native worker is not bound to an enrolled checkout');
        swarmWorkerBinding=readWorker(row);
        requireState(swarmWorkerBinding.state==='BOUND'&&!swarmWorkerBinding.completed
          &&swarmWorkerBinding.ownerRoot===rollingCampaignRow.coordinator_root&&row.membership_owner===swarmWorkerBinding.ownerRoot
          &&typeof row.coordinator_session_id==='string'&&fs.realpathSync(rollingCampaignRow.coordinator_root)===rollingCampaignRow.coordinator_root
          &&(row.checkout_state==='ACTIVE'||row.checkout_state==='RESERVED'),'native worker owner or coordinator differs');
        requireState(swarmWorkerBinding.generation===rollingNativeWorkerSelection.workerGeneration
          &&swarmWorkerBinding.worktreeGeneration===rollingNativeWorkerSelection.worktreeGeneration
          &&row.membership_generation===rollingNativeWorkerSelection.worktreeGeneration,'native worker or checkout generation changed');
        requireState(row.checkout_root===swarmWorkerBinding.rootPath&&fs.realpathSync(swarmWorkerBinding.rootPath)===swarmWorkerBinding.rootPath
          &&git(swarmWorkerBinding.rootPath,['rev-parse','--show-toplevel']).trim()===swarmWorkerBinding.rootPath
          &&git(rollingCampaignRow.coordinator_root,['worktree','list','--porcelain','-z']).split('\0').includes(`worktree ${swarmWorkerBinding.rootPath}`)
          &&fs.realpathSync(git(swarmWorkerBinding.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===row.git_common_directory,'native worker checkout identity changed');
        requireRollingGitOperationAbsent(swarmWorkerBinding.rootPath);
        validateRollingSessionMarker(swarmWorkerBinding.rootPath,swarmWorkerBinding.sessionId);
        const owners=assignments.filter(assignment=>assignment.worktreeNumber===swarmWorkerBinding?.worktreeNumber);
        requireState(owners.length<=1,'native checkout has multiple campaign owners');
        const owner=owners[0];
        if(owner!==undefined) {
          requireState(owner.scopeId===campaignId&&owner.sessionId===swarmWorkerBinding.sessionId&&!owner.retired,'native worker has another campaign owner');
          if(owner.state!=='INACTIVE') {
            this.currentLease(owner,rollingGraph);
            const action=(await poolClient.query<Record<string,unknown>>(`SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND generation=$3
              AND kind IN ('START_WORKER','RESUME_WORKER') ORDER BY created_at DESC LIMIT 1`,[this.projectId,owner.id,owner.generation])).rows[0];
            requireState(action!==undefined,'native worker admission action is missing');
            return {assignment:owner,worktree:{number:swarmWorkerBinding.worktreeNumber,rootPath:swarmWorkerBinding.rootPath},actionId:readAction(action).id,reason:null};
          }
        }
      }
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const rollingSchedulingResult = selectRollingAssignments(rollingGraph, assignments, rollingExecutionConfigV3.maxActiveWorkers, expectedDigest);
      const selected = rollingSchedulingResult.selected[0];
      if (!selected) return { assignment: null, reason: rollingSchedulingResult.activeCount >= rollingExecutionConfigV3.maxActiveWorkers ? 'capacity_reached' : 'no_ready_obligation', blocked: rollingSchedulingResult.blocked };
      const generation = crypto.randomUUID();
      const rollingAssignmentScopeV3 = this.scope(rollingGraph, rollingExecutionConfigV3, generation, selected.obligationId, selected.binding, selected.plannedPaths);
      if(swarmWorkerBinding!==null) {
        requireState(rollingAssignmentScopeV3.execution.kind==='leased','native allocation requires adopted frozen binding history');
        requireState(swarmWorkerBinding.assignment.kind==='plan'?swarmWorkerBinding.assignment.id===campaignId
          :swarmWorkerBinding.assignment.id===rollingAssignmentScopeV3.execution.lease.binding.execution.sprintId,'native worker assignment differs from campaign scope');
        const owner=assignments.find(assignment=>assignment.worktreeNumber===swarmWorkerBinding?.worktreeNumber);
        requireState(owner===undefined?selected.kind==='start_worker':selected.assignmentId===owner.id,'resume the selected original worker before allocating another obligation');
      }
      let id = selected.assignmentId;
      let worktree: RollingStoredWorktree;
        const rollingManagedDirectory=existingOnly&&swarmWorkerBinding===null?resolveRollingManagedDirectory(rollingCampaignRow.coordinator_root):null;
        function validateExistingCheckout(rootPath:string,sessionId:string|null=null,expectedNumber:number|null=null):void {
          requireState(rollingManagedDirectory!==null&&rollingManagedDirectory.worktrees.includes(rootPath)&&fs.existsSync(rootPath)&&fs.realpathSync(rootPath)===rootPath,'available checkout has no registered physical root');
          requireState(fs.realpathSync(git(rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===fs.realpathSync(git(rollingCampaignRow.coordinator_root,['rev-parse','--path-format=absolute','--git-common-dir']).trim()),'pool checkout belongs to another repository');
          const number=Number(path.basename(rootPath));
          requireState(path.dirname(rootPath)===rollingManagedDirectory.directory&&Number.isSafeInteger(number)&&number>=101&&String(number)===path.basename(rootPath)&&(expectedNumber===null||number===expectedNumber),'checkout escaped configured numbered pool or stored number');
          if(sessionId!==null)validateRollingSessionMarker(rootPath,sessionId);
          else {requireRollingSessionMarkerAbsent(rootPath);requireState(git(rootPath,['status','--porcelain']).trim()==='','retained pool checkout is dirty; preserve its claim');}
        }
      if (id) {
        const assignment = assignments.find(item => item.id === id);
        requireState(assignment && assignment.sessionId, 'inactive assignment has no resumable session');
        worktree = readWorktree((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, assignment.worktreeNumber])).rows[0]);
        if(existingOnly&&swarmWorkerBinding===null)validateExistingCheckout(worktree.rootPath,assignment.sessionId,worktree.number);
        if(swarmWorkerBinding!==null)requireState(assignment.sessionId===swarmWorkerBinding.sessionId&&assignment.worktreeNumber===swarmWorkerBinding.worktreeNumber,'selected retained assignment belongs to another worker');
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,state='RESERVED',activity_stopped=false,blockers_text='[]',scope_text=$3 WHERE assignment_id=$1", [id, generation, JSON.stringify(rollingAssignmentScopeV3)]);
      } else {
        if(swarmWorkerBinding!==null) {
          worktree=readWorktree((await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2 FOR UPDATE',[this.projectId,swarmWorkerBinding.worktreeNumber])).rows[0]);
        } else {
        const bound=(await poolClient.query<Record<string,unknown>>(`SELECT n.root_path,k.worktree_number FROM ponytail_index.swarm_worker_v1 k
          JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.state='BOUND'`,[this.projectId,rollingCampaignRow.coordinator_root])).rows;
        requireState(!bound.some(row=>row.root_path!==path.join(rollingPoolRow.managed_directory,String(row.worktree_number))),'native swarm allocation requires explicit worker selectors; preserve existing checkouts');
        if(existingOnly) {
          requireState(rollingManagedDirectory!==null,'numbered allocation requires owner configuration');
          requireState(rollingManagedDirectory.directory===rollingPoolRow.managed_directory,'physical pool differs from retained database identity');
          const known=(await poolClient.query<Record<string,unknown>>('SELECT root_path FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1',[this.projectId])).rows;
          for(const rootPath of rollingManagedDirectory.worktrees) {
            const number=Number(path.basename(rootPath));
            if(path.dirname(rootPath)!==rollingManagedDirectory.directory||!Number.isSafeInteger(number)||number<101||String(number)!==path.basename(rootPath)||known.some(row=>row.root_path===rootPath))continue;
            validateExistingCheckout(rootPath);
            await poolClient.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'AVAILABLE')",[this.projectId,number,rootPath]);
          }
        }
        const available = (await poolClient.query<Record<string, unknown>>(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w WHERE w.project_id=$1 AND w.state='AVAILABLE'
          AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_v1 s WHERE s.project_id=w.project_id AND s.number=w.number)
          AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 d WHERE d.project_id=w.project_id AND d.number=w.number)
          ORDER BY w.number LIMIT 1`, [this.projectId])).rows[0];
        if(existingOnly&&!available)return {assignment:null,reason:'no_available_worktree'};
        if (available) {
          worktree = readWorktree(available);
          if(existingOnly)validateExistingCheckout(worktree.rootPath,null,worktree.number);
        }
        else {
          const numbers = (await poolClient.query<Record<string, unknown>>('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number', [this.projectId])).rows;
          let number = 101;
          for (const row of numbers) { if (worktreeNumber(row.number) !== number) break; number++; }
          requireState(Number.isSafeInteger(number), 'worktree numbers exhausted');
          worktree = readWorktree((await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *", [this.projectId, number, path.join(rollingPoolRow.managed_directory, String(number))])).rows[0]);
        }
        }
        id = crypto.randomUUID();
        await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,scope_text) VALUES($1,$2,$3,$4,$5,$6,'RESERVED',$7)",
          [this.projectId, campaignId, id, selected.obligationId, worktree.number, generation,
            JSON.stringify(rollingAssignmentScopeV3)]);
      }
      if (worktree.state !== 'PROVISIONING') await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, worktree.number]);
      // A configured swarm owns campaign checkout reservations in the same transaction.
      // Historical campaigns without an enrolled swarm retain their original reader path.
      if (selected.kind === 'start_worker'&&swarmWorkerBinding===null) {
        const owner = (await poolClient.query<Record<string,unknown>>('SELECT coordinator_session_id FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE',[this.projectId,rollingCampaignRow.coordinator_root])).rows[0];
        if (owner !== undefined) {
          requireState(owner.coordinator_session_id !== null,'swarm coordinator must be bound before campaign allocation');
          const baseCommit = this.campaignBase(rollingCampaignRow);
          await poolClient.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation,base_commit) VALUES($1,$2,$3,$4,$5)',[this.projectId,worktree.number,rollingCampaignRow.coordinator_root,generation,baseCommit]);
          await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='PROVISIONING' WHERE project_id=$1 AND number=$2",[this.projectId,worktree.number]);
        }
      }
      const actionId = crypto.randomUUID();
      await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_action_v1(project_id,campaign_id,action_id,assignment_id,kind,generation,state) VALUES($1,$2,$3,$4,$5,$6,'PENDING')",
        [this.projectId, campaignId, actionId, id, selected.kind === 'resume_worker' ? 'RESUME_WORKER' : 'START_WORKER', generation]);
      if(swarmWorkerBinding!==null&&selected.kind==='start_worker') {
        const rollingWorkerCreationV1:RollingWorkerCreationV1={schemaVersion:1,sessionId:swarmWorkerBinding.sessionId,threadId:swarmWorkerBinding.threadId,rootPath:swarmWorkerBinding.rootPath};
        await poolClient.query("UPDATE ponytail_index.rolling_action_v1 SET state='COMPLETED',result_text=$2 WHERE action_id=$1",[actionId,JSON.stringify(rollingWorkerCreationV1)]);
        await this.attachWorkerSession(poolClient,readAssignment((await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1',[id])).rows[0]),swarmWorkerBinding.sessionId);
      }
      const row = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1', [id])).rows[0];
      return { assignment: readAssignment(row), worktree: { number: worktree.number, rootPath: worktree.rootPath }, actionId, reason: null };
    });
  }

  async status(campaignId: string): Promise<RollingCampaignStatus> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => ({ graphDigest: rollingCampaignRow.graph_digest,
      assignments: (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 ORDER BY created_at,assignment_id', [this.projectId, campaignId])).rows.map(readAssignment) }),true);
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-INTERFACES
  async coordinatorSnapshot(campaignId: string): Promise<RollingCoordinatorSnapshot> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const assignments = (await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 ORDER BY created_at,assignment_id',[this.projectId])).rows.map(readAssignment);
      const releasableAssignments=(await poolClient.query<Record<string,unknown>>("SELECT a.assignment_id,a.generation FROM ponytail_index.rolling_assignment_v1 a LEFT JOIN ponytail_index.rolling_worker_retirement_v1 r USING(project_id,campaign_id,assignment_id,generation) WHERE a.project_id=$1 AND a.campaign_id=$2 AND a.state='RETIRING' AND a.retired AND a.activity_stopped AND (a.session_id IS NULL OR r.state='CLEANED') ORDER BY a.created_at,a.assignment_id",[this.projectId,campaignId])).rows.map((row):RollingAssignmentRelease=>({id:stringColumn(row.assignment_id,'release assignment'),generation:stringColumn(row.generation,'release generation')}));
      const actions = (await poolClient.query<Record<string,unknown>>("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND state IN ('PENDING','STARTED') ORDER BY created_at,action_id",[this.projectId,campaignId])).rows.map(value => {const {resultText,...rollingAction} = readAction(value); return rollingAction;});
      const workerDispatches=(await poolClient.query<Record<string,unknown>>("SELECT d.* FROM ponytail_index.rolling_worker_dispatch_v1 d JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id,generation) WHERE d.project_id=$1 AND d.campaign_id=$2 AND a.state<>'RELEASED' ORDER BY d.created_at,d.assignment_id",[this.projectId,campaignId])).rows.map((row):RollingStoredWorkerDispatch=>({assignmentId:stringColumn(row.assignment_id,'worker dispatch assignment'),generation:stringColumn(row.generation,'worker dispatch generation'),dispatch:readWorkerDispatch(row)}));
      const reviews = (await poolClient.query<Record<string,unknown>>("SELECT r.request_text,r.outcome_text FROM ponytail_index.rolling_review_v1 r JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id) WHERE r.project_id=$1 AND r.campaign_id=$2 AND r.replacement_text IS NULL AND a.state IN ('REVIEW','REWORK','INTEGRATING') ORDER BY r.created_at,r.review_id",[this.projectId,campaignId])).rows.map(readStoredReview);
      const reviewDispatches=(await poolClient.query<Record<string,unknown>>("SELECT d.* FROM ponytail_index.rolling_review_dispatch_v1 d JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id) WHERE d.project_id=$1 AND d.campaign_id=$2 AND r.outcome_text IS NULL AND r.replacement_text IS NULL AND a.state IN ('REVIEW','REWORK','INTEGRATING') ORDER BY d.created_at,d.review_id",[this.projectId,campaignId])).rows.map((row):RollingStoredReviewDispatch=>({reviewId:stringColumn(row.review_id,'review dispatch request'),dispatch:readReviewDispatch(row)}));
      const increments=(await poolClient.query<Record<string,unknown>>("SELECT i.*,a.obligation_id FROM ponytail_index.rolling_increment_v1 i JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id,generation) WHERE i.project_id=$1 AND i.campaign_id=$2 AND i.repair_reference IS NULL AND a.state IN ('INTEGRATING','RETIRING') ORDER BY i.created_at,i.increment_id",[this.projectId,campaignId])).rows.map((row):RollingStoredIncrement=> {
        const rollingIncrementClaimV1=readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
        const rollingIncrementState=incrementState(row.state);
        const rollingIncrementPublicationV1=row.publication_text === null ? null : readRollingIncrementPublicationV1(readStateText(stringColumn(row.publication_text,'increment publication')));
        requireState(rollingIncrementState !== 'PUBLISHED' || rollingIncrementPublicationV1?.result.state === 'PUBLISHED','published increment lacks its confirmed original receipt');
        return {claim:rollingIncrementClaimV1,state:rollingIncrementState,publication:rollingIncrementPublicationV1,obligationSatisfied:rollingGraph.projection.satisfiedIds.includes(stringColumn(row.obligation_id,'increment obligation'))};
      });
      const publications = (await poolClient.query<Record<string,unknown>>("SELECT * FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND NOT withdrawn AND (state<>'PUBLISHED' OR synchronized_revision IS NULL) ORDER BY created_at,batch_id",[this.projectId,campaignId])).rows.map((row):RollingPublicationStatus => ({
        claim:readRollingPublicationBatchClaimV1(readStateText(stringColumn(row.claim_text,'publication claim'))),state:publicationState(row.state),
        qaId:nullableStringColumn(row.qa_id,'publication QA'),publicationId:nullableStringColumn(row.publication_id,'publication observation'),pendingRefreshId:nullableStringColumn(row.pending_refresh_id,'pending mainline refresh')
      }));
      const rollingSchedulingResult=selectRollingAssignments(rollingGraph,assignments,rollingExecutionConfigV3.maxActiveWorkers,rollingGraph.digest);
      const rollingPublicationLane=await this.publicationLane(poolClient,rollingCampaignRow);
      let rollingPublicationReadiness:RollingPublicationReadiness;
      if (rollingPublicationLane.publicationCampaignId !== null) rollingPublicationReadiness={state:'BLOCKED',reason:'publication_owned',ownerCampaignId:rollingPublicationLane.publicationCampaignId};
      else if (rollingPublicationLane.integrationCampaignId !== null) rollingPublicationReadiness={state:'BLOCKED',reason:'integration_active',ownerCampaignId:rollingPublicationLane.integrationCampaignId};
      else if (increments.some(increment=>increment.state === 'PUBLISHED' && !increment.obligationSatisfied)) rollingPublicationReadiness={state:'BLOCKED',reason:'certificate_acceptance',ownerCampaignId:campaignId};
      else {
        const orderedRollingAcceptedIncrements=await this.orderedAcceptedIncrements(poolClient,rollingCampaignRow,rollingExecutionConfigV3);
        const flush=rollingGraph.bindings.every(binding=>rollingGraph.projection.satisfiedIds.includes(binding.obligationId)) ? 'completion'
          : rollingSchedulingResult.activeCount === 0 && rollingSchedulingResult.selected.length === 0 ? 'quiescence' : null;
        rollingPublicationReadiness=selectRollingPublicationBatch(orderedRollingAcceptedIncrements,rollingExecutionConfigV3.publicationSize,flush);
      }
      return {obligationProjection:rollingGraph.projection,graphDigest:rollingCampaignRow.graph_digest,observedGraphDigest:rollingGraph.digest,configuration:rollingExecutionConfigV3,
        closure:rollingCampaignRow.closure_text === null ? null : readRollingCampaignClosureV1(readStateText(rollingCampaignRow.closure_text)),
        assignments:assignments.filter(assignment=>assignment.scopeId === campaignId),
        scheduling:rollingSchedulingResult,actions,reviews,workerDispatches,reviewDispatches,releasableAssignments,publications,increments,publicationReadiness:rollingPublicationReadiness};
    },true);
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-INTERFACES
  async closeCampaign(campaignId:string):Promise<RollingCampaignClosureV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow)=> {
      if (rollingCampaignRow.closure_text !== null) return readRollingCampaignClosureV1(readStateText(rollingCampaignRow.closure_text));
      const rollingGraph = this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest);
      requireState(rollingGraph.projection.unresolvedIds.length === 0,`closure requires fresh adequate evidence: ${rollingGraph.projection.unresolvedIds.join(', ')}`);
      const owners = (await poolClient.query<Record<string,unknown>>("SELECT EXISTS(SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 AND state<>'RELEASED') AS present",[this.projectId,campaignId])).rows[0];
      requireState(owners && owners.present === false,'closure requires every original worker owner retired and released');
      const actions = (await poolClient.query<Record<string,unknown>>("SELECT EXISTS(SELECT 1 FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND state IN ('PENDING','STARTED')) AS present",[this.projectId,campaignId])).rows[0];
      requireState(actions && actions.present === false,'closure requires reconciled action outcomes');
      const publications = (await poolClient.query<Record<string,unknown>>("SELECT EXISTS(SELECT 1 FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND campaign_id=$2 AND NOT withdrawn AND (state<>'PUBLISHED' OR synchronized_revision IS NULL)) OR EXISTS(SELECT 1 FROM ponytail_index.rolling_increment_delivery_v1 d LEFT JOIN ponytail_index.rolling_publication_member_v1 m ON m.project_id=d.project_id AND m.campaign_id=d.campaign_id AND m.increment_id=d.increment_id AND NOT m.withdrawn WHERE d.project_id=$1 AND d.campaign_id=$2 AND m.increment_id IS NULL) AS present",[this.projectId,campaignId])).rows[0];
      requireState(publications && publications.present === false,'closure requires all accepted increments published and synchronized');
      const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
      const rootPath = rollingCampaignRow.coordinator_root;
      requireState(git(rootPath,['status','--porcelain=v1','-z','--untracked-files=all']).length === 0,'closure requires a clean coordinator checkout');
      requireState(git(rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${rollingExecutionConfigV3.incrementRef}`,'closure requires the configured campaign checkout');
      const revision = git(rootPath,['rev-parse','HEAD']).trim();
      const rollingIncrementPublicationResult = reconcileRollingIncrementPublication({rootPath,target:{remote:rollingExecutionConfigV3.mainline.remote,branch:rollingExecutionConfigV3.incrementRef},revision});
      requireState(rollingIncrementPublicationResult.state === 'PUBLISHED','closure requires observed campaign remote containment');
      const mainlineRef = `refs/remotes/${rollingExecutionConfigV3.mainline.remote}/${rollingExecutionConfigV3.mainline.branch}`;
      git(rootPath,['fetch','--no-tags','--',rollingExecutionConfigV3.mainline.remote,`refs/heads/${rollingExecutionConfigV3.mainline.branch}:${mainlineRef}`]);
      const mainlineRevision = git(rootPath,['rev-parse',`${mainlineRef}^{commit}`]).trim();
      const deliveries = (await poolClient.query<Record<string,unknown>>('SELECT revision FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1 AND campaign_id=$2',[this.projectId,campaignId])).rows;
      for (const delivery of deliveries) git(rootPath,['merge-base','--is-ancestor',stringColumn(delivery.revision,'delivered increment'),mainlineRevision]);
      const rollingCampaignClosureV1 = readRollingCampaignClosureV1({schemaVersion:1,id:crypto.randomUUID(),campaignId,graphDigest:rollingGraph.digest,revision,campaignRemoteRevision:rollingIncrementPublicationResult.remoteRevision,mainlineRevision});
      await poolClient.query('INSERT INTO ponytail_index.rolling_campaign_closure_v1(project_id,campaign_id,receipt_text) VALUES($1,$2,$3)',[this.projectId,campaignId,JSON.stringify(rollingCampaignClosureV1)]);
      return rollingCampaignClosureV1;
    },true);
  }

  async nextActions(campaignId: string): Promise<readonly RollingAction[]> {
    const rows = (await this.pool.query<Record<string, unknown>>("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND state IN ('PENDING','STARTED') ORDER BY created_at,action_id", [this.projectId, campaignId])).rows;
    return rows.map(value => { const rollingActionRow = readAction(value); return { id: rollingActionRow.id, assignmentId: rollingActionRow.assignmentId, kind: rollingActionRow.kind, generation: rollingActionRow.generation, state: rollingActionRow.state }; });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-WORKERS
  async inspectWorkerCreation(campaignId:string,actionId:string,generation:string):Promise<RollingWorkerCreationInspection> {
    return this.transaction(campaignId,async poolClient => {
      const rollingActionRow = readAction((await poolClient.query<Record<string,unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId,campaignId,actionId])).rows[0]);
      requireState(rollingActionRow.kind === 'START_WORKER' && rollingActionRow.generation === generation
        && (rollingActionRow.state === 'STARTED' || rollingActionRow.state === 'COMPLETED'),'creation recovery requires its original started action');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingActionRow.assignmentId,generation);
      requireState(!rollingStoredAssignment.retired && (rollingStoredAssignment.state === 'RESERVED' || rollingStoredAssignment.state === 'WORKING'),
        'creation recovery no longer owns its reservation');
      const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string,unknown>>(
        'SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',
        [this.projectId,rollingStoredAssignment.worktreeNumber])).rows[0]);
      const rollingWorkerCreationV1 = rollingActionRow.resultText === null ? null : parseRollingWorkerCreation(rollingActionRow.resultText);
      if (rollingWorkerCreationV1) requireState(rollingWorkerCreationV1.rootPath === rollingStoredWorktree.rootPath
        && (rollingStoredAssignment.sessionId === null || rollingStoredAssignment.sessionId === rollingWorkerCreationV1.sessionId),
        'creation recovery identity differs from reservation');
      requireState(rollingActionRow.state !== 'COMPLETED' || rollingWorkerCreationV1 !== null,'completed creation lacks its native receipt');
      const rollingAction:RollingAction = {id:rollingActionRow.id,assignmentId:rollingActionRow.assignmentId,kind:rollingActionRow.kind,
        generation:rollingActionRow.generation,state:rollingActionRow.state};
      return {action:rollingAction,assignment:rollingStoredAssignment,worktree:{number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath},rollingWorkerCreationV1};
    });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-WORKERS
  async claimWorkerCreation(campaignId: string, actionId: string, generation: string): Promise<RollingWorkerReservation> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingActionRow = readAction((await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId, campaignId, actionId])).rows[0]);
      requireState(rollingActionRow.generation === generation && rollingActionRow.kind === 'START_WORKER'
        && rollingActionRow.state === 'PENDING', 'worker creation is already claimed or not eligible; reconcile its original outcome');
      const rollingStoredAssignment = await this.assignment(poolClient, campaignId, rollingActionRow.assignmentId, generation);
      requireState(rollingStoredAssignment.state === 'RESERVED' && rollingStoredAssignment.sessionId === null && !rollingStoredAssignment.retired,
        'worker creation requires an unattached reservation');
      this.currentLease(rollingStoredAssignment, this.graph(rollingCampaignRow, rollingCampaignRow.graph_digest));
      const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',
        [this.projectId, rollingStoredAssignment.worktreeNumber])).rows[0]);
      const baseCommit = this.campaignBase(rollingCampaignRow);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_action_v1 SET state='STARTED' WHERE action_id=$1", [actionId]);
      return {coordinatorRoot:rollingCampaignRow.coordinator_root,rootPath:rollingStoredWorktree.rootPath,
        number:rollingStoredWorktree.number,baseCommit,assignmentId:rollingStoredAssignment.id,generation};
    });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-WORKERS
  async recordWorkerCreation(campaignId: string, actionId: string, generation: string,
    rollingWorkerCreationV1: RollingWorkerCreationV1): Promise<RollingWorkerCreationV1> {
    const checkedRollingWorkerCreationV1 = readRollingWorkerCreationV1(rollingWorkerCreationV1);
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
      const rollingActionRow = readAction((await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId,campaignId,actionId])).rows[0]);
      requireState(rollingActionRow.generation === generation && rollingActionRow.kind === 'START_WORKER' && rollingActionRow.state === 'STARTED',
        'creation receipt requires its claimed action');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingActionRow.assignmentId,generation);
      requireState(rollingStoredAssignment.state === 'RESERVED' && rollingStoredAssignment.sessionId === null && !rollingStoredAssignment.retired,
        'creation receipt requires its unattached reservation');
      this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
      const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',
        [this.projectId,rollingStoredAssignment.worktreeNumber])).rows[0]);
      requireState(checkedRollingWorkerCreationV1.rootPath === rollingStoredWorktree.rootPath
        && fs.realpathSync(checkedRollingWorkerCreationV1.rootPath) === checkedRollingWorkerCreationV1.rootPath, 'native checkout differs from reservation');
      if (rollingActionRow.resultText !== null) {
        requireState(isDeepStrictEqual(parseRollingWorkerCreation(rollingActionRow.resultText),checkedRollingWorkerCreationV1), 'creation receipt is immutable');
      } else await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_action_v1 SET result_text=$2 WHERE action_id=$1',
        [actionId,JSON.stringify(checkedRollingWorkerCreationV1)]);
      return checkedRollingWorkerCreationV1;
    });
  }

  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-WORKERS
  async completeWorkerCreation(campaignId: string, actionId: string, generation: string,
    rollingWorkerCreationV1: RollingWorkerCreationV1): Promise<RollingSessionAttachment> {
    const checkedRollingWorkerCreationV1 = readRollingWorkerCreationV1(rollingWorkerCreationV1);
    return this.transaction<RollingSessionAttachment>(campaignId, async (poolClient,rollingCampaignRow) => {
      const rollingActionRow = readAction((await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId,campaignId,actionId])).rows[0]);
      requireState(rollingActionRow.generation === generation && rollingActionRow.kind === 'START_WORKER'
        && (rollingActionRow.state === 'STARTED' || rollingActionRow.state === 'COMPLETED') && rollingActionRow.resultText !== null,
        'worker attachment requires its retained creation receipt');
      requireState(isDeepStrictEqual(parseRollingWorkerCreation(rollingActionRow.resultText),checkedRollingWorkerCreationV1), 'creation receipt differs');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingActionRow.assignmentId,generation);
      requireState(!rollingStoredAssignment.retired && (rollingStoredAssignment.state === 'RESERVED'
        && rollingStoredAssignment.sessionId === null || rollingStoredAssignment.state === 'WORKING'
        && rollingStoredAssignment.sessionId === checkedRollingWorkerCreationV1.sessionId), 'worker attachment differs from reservation');
      this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
      validateRollingSessionMarker(checkedRollingWorkerCreationV1.rootPath,checkedRollingWorkerCreationV1.sessionId);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_action_v1 SET state='COMPLETED' WHERE action_id=$1",[actionId]);
      return this.attachWorkerSession(poolClient,rollingStoredAssignment,checkedRollingWorkerCreationV1.sessionId);
    });
  }

  private async attachedWorkerIdentity(poolClient:PoolClient,campaignId:string,
    rollingStoredAssignment:RollingStoredAssignment):Promise<RollingWorkerCreationV1> {
    requireState(rollingStoredAssignment.sessionId && !rollingStoredAssignment.retired,'worker has no retained session identity');
    const id = rollingStoredAssignment.id;
    const rows = (await poolClient.query<Record<string, unknown>>(
      "SELECT result_text FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND kind='START_WORKER' AND state='COMPLETED'",
      [this.projectId,campaignId,id])).rows;
    requireState(rows.length === 1, 'worker has no unique completed native creation');
    const row = rows[0];requireState(row,'worker creation is missing');
    const rollingWorkerCreationV1 = parseRollingWorkerCreation(stringColumn(row.result_text,'worker creation receipt'));
    requireState(rollingWorkerCreationV1.sessionId === rollingStoredAssignment.sessionId, 'creation receipt differs from attached worker');
    const rollingStoredWorktree = readWorktree((await poolClient.query<Record<string, unknown>>(
      'SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2',
      [this.projectId,rollingStoredAssignment.worktreeNumber])).rows[0]);
    requireState(rollingStoredWorktree.rootPath === rollingWorkerCreationV1.rootPath
      && fs.realpathSync(rollingWorkerCreationV1.rootPath) === rollingWorkerCreationV1.rootPath, 'creation checkout differs from assignment');
    validateRollingSessionMarker(rollingWorkerCreationV1.rootPath,rollingWorkerCreationV1.sessionId);
    return rollingWorkerCreationV1;
  }

  private campaignBase(rollingCampaignRow:RollingCampaignRow):string {
    const rollingExecutionConfigV3 = parseRollingExecutionConfig(rollingCampaignRow.configuration_text);
    const result = spawnSync('git',['-C',rollingCampaignRow.coordinator_root,'rev-parse',`refs/heads/${rollingExecutionConfigV3.incrementRef}^{commit}`],{encoding:'utf8'});
    requireState(!result.error && result.status === 0 && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(result.stdout.trim()),'campaign increment has no identified base');
    return result.stdout.trim();
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  // Traceability: implements REQ-ROLLING-STATE
  async claimWorkerResumption(campaignId:string,actionId:string,generation:string):Promise<RollingWorkerResumptionV1> {
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingActionRow = readAction((await poolClient.query<Record<string,unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId,campaignId,actionId])).rows[0]);
      requireState(rollingActionRow.kind === 'RESUME_WORKER' && rollingActionRow.generation === generation && rollingActionRow.state === 'PENDING',
        'worker resumption is already claimed or not eligible; reconcile its original outcome');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingActionRow.assignmentId,generation);
      requireState(rollingStoredAssignment.state === 'RESERVED' && rollingStoredAssignment.sessionId && !rollingStoredAssignment.retired,
        'resumption requires its retained reservation');
      this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
      const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
      const row = (await poolClient.query<Record<string,unknown>>(
        'SELECT observation_text FROM ponytail_index.rolling_worker_stop_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 ORDER BY created_at DESC LIMIT 1',
        [this.projectId,campaignId,rollingStoredAssignment.id])).rows[0];
      requireState(row,'retained native worker has no stopped observation');
      const rollingWorkerStopV1 = parseRollingWorkerStop(stringColumn(row.observation_text,'worker stop observation'));
      requireState(rollingWorkerStopV1.threadId === rollingWorkerCreationV1.threadId && rollingWorkerStopV1.sessionId === rollingWorkerCreationV1.sessionId,
        'stopped observation differs from retained identity');
      const rollingWorkerResumptionV1:RollingWorkerResumptionV1 = {schemaVersion:1,rollingWorkerCreationV1,baseCommit:this.campaignBase(rollingCampaignRow)};
      await poolClient.query<Record<string,unknown>>("UPDATE ponytail_index.rolling_action_v1 SET state='STARTED' WHERE action_id=$1",[actionId]);
      return rollingWorkerResumptionV1;
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  // Traceability: implements REQ-ROLLING-STATE
  async completeWorkerResumption(campaignId:string,actionId:string,generation:string,rollingWorkerResumptionV1:RollingWorkerResumptionV1):Promise<RollingSessionAttachment> {
    const checkedRollingWorkerResumptionV1 = readRollingWorkerResumptionV1(rollingWorkerResumptionV1);
    return this.transaction(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingActionRow = readAction((await poolClient.query<Record<string,unknown>>(
        'SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3',
        [this.projectId,campaignId,actionId])).rows[0]);
      requireState(rollingActionRow.kind === 'RESUME_WORKER' && rollingActionRow.generation === generation
        && (rollingActionRow.state === 'STARTED' || rollingActionRow.state === 'COMPLETED'),'resumption requires its claimed action');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingActionRow.assignmentId,generation);
      requireState(rollingStoredAssignment.state === 'RESERVED' || rollingStoredAssignment.state === 'WORKING','resumption reservation differs');
      this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
      const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
      requireState(isDeepStrictEqual(checkedRollingWorkerResumptionV1.rollingWorkerCreationV1,rollingWorkerCreationV1),'resumption differs from original native worker');
      if (rollingActionRow.resultText !== null) requireState(isDeepStrictEqual(parseRollingWorkerResumption(rollingActionRow.resultText),checkedRollingWorkerResumptionV1),
        'resumption receipt is immutable');
      else {
        requireState(checkedRollingWorkerResumptionV1.baseCommit === this.campaignBase(rollingCampaignRow),'resumption campaign base changed');
        await poolClient.query<Record<string,unknown>>("UPDATE ponytail_index.rolling_action_v1 SET state='COMPLETED',result_text=$2 WHERE action_id=$1",
          [actionId,JSON.stringify(checkedRollingWorkerResumptionV1)]);
      }
      await poolClient.query<Record<string,unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='WORKING' WHERE assignment_id=$1",[rollingStoredAssignment.id]);
      await poolClient.query<Record<string,unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2",
        [this.projectId,rollingStoredAssignment.worktreeNumber]);
      return {id:rollingStoredAssignment.id,sessionId:rollingWorkerCreationV1.sessionId,state:'WORKING'};
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async workerIdentity(campaignId:string,id:string,generation:string):Promise<RollingWorkerCreationV1> {
    return this.transaction(campaignId,async poolClient =>
      this.attachedWorkerIdentity(poolClient,campaignId,await this.assignment(poolClient,campaignId,id,generation)));
  }

  // Traceability: implements REQ-ROLLING-STATE
  async workerStop(campaignId:string,id:string,generation:string):Promise<RollingWorkerStopV1 | null> {
    return this.workerStopValue(this.pool,campaignId,id,generation);
  }

  private async workerStopValue(poolOrPoolClient:Pool | PoolClient,campaignId:string,id:string,
    generation:string):Promise<RollingWorkerStopV1 | null> {
    const row = (await poolOrPoolClient.query<Record<string,unknown>>(
      'SELECT observation_text FROM ponytail_index.rolling_worker_stop_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
      [this.projectId,campaignId,id,generation])).rows[0];
    return row ? parseRollingWorkerStop(stringColumn(row.observation_text,'worker stop observation')) : null;
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  // Traceability: implements REQ-ROLLING-STATE
  // Traceability: implements REQ-ROLLING-SCHEDULING
  async suspendObservedWorker(campaignId:string,id:string,generation:string,rollingWorkerStopV1:RollingWorkerStopV1,
    blockers:readonly string[]):Promise<RollingAssignmentTransition> {
    return this.stopObservedWorker(campaignId,id,generation,rollingWorkerStopV1,blockers,null);
  }

  // Traceability: implements REQ-ROLLING-WORKER-CORRECTION
  async correctObservedWorker(campaignId:string,id:string,generation:string,rollingWorkerStopV1:RollingWorkerStopV1,reason:string):Promise<RollingAssignmentTransition> {
    requireState(reason.trim().length>0,'worker correction requires its actual reason');
    return this.stopObservedWorker(campaignId,id,generation,rollingWorkerStopV1,[],reason);
  }

  private async stopObservedWorker(campaignId:string,id:string,generation:string,rollingWorkerStopV1:RollingWorkerStopV1,
    blockers:readonly string[],correctionReason:string|null):Promise<RollingAssignmentTransition> {
    const checkedRollingWorkerStopV1 = readRollingWorkerStopV1(rollingWorkerStopV1);
    requireState(checkedRollingWorkerStopV1.campaignId === campaignId && checkedRollingWorkerStopV1.assignmentId === id
      && checkedRollingWorkerStopV1.generation === generation,'stop observation differs from assignment');
    requireState(blockers.every(item => /^OBL-[1-9][0-9]*$/u.test(item))
      && new Set(blockers).size === blockers.length,'suspension requires unique obligation blockers');
    return this.transaction<RollingAssignmentTransition>(campaignId,async poolClient => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      requireState(rollingStoredAssignment.state === 'WORKING' || rollingStoredAssignment.state === 'INACTIVE' || rollingStoredAssignment.state === 'REWORK','worker is not eligible for suspension');
      const existing = await this.workerStopValue(poolClient,campaignId,id,generation);
      requireState(correctionReason!==null&&checkedRollingWorkerStopV1.turn!==null || blockers.length > 0 || rollingStoredAssignment.state === 'REWORK'
        || rollingStoredAssignment.state === 'WORKING' && checkedRollingWorkerStopV1.turn?.status === 'failed'
        || rollingStoredAssignment.state === 'INACTIVE' && rollingStoredAssignment.blockers.length === 0 && existing !== null,
        'suspension requires obligation blockers unless returning rejected work or an observed failed turn');
      const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
      requireState(checkedRollingWorkerStopV1.threadId === rollingWorkerCreationV1.threadId
        && checkedRollingWorkerStopV1.sessionId === rollingWorkerCreationV1.sessionId,'stop observation differs from attached native worker');
      const dispatch = (await poolClient.query<Record<string,unknown>>(
        'SELECT state,turn_id FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation])).rows[0];
      requireState(dispatch ? dispatch.state === 'ATTACHED' && dispatch.turn_id === checkedRollingWorkerStopV1.turn?.id
        : checkedRollingWorkerStopV1.turn === null,'stop observation differs from known worker turn');
      if(correctionReason!==null) {
        const correction=(await poolClient.query<Record<string,unknown>>('SELECT reason FROM ponytail_index.rolling_worker_correction_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',[this.projectId,campaignId,id,generation])).rows[0];
        if(correction)requireState(correction.reason===correctionReason,'correction retry differs from its original reason');
        else await poolClient.query('INSERT INTO ponytail_index.rolling_worker_correction_v1(project_id,campaign_id,assignment_id,generation,reason) VALUES($1,$2,$3,$4,$5)',[this.projectId,campaignId,id,generation,correctionReason]);
      }
      await this.cancelActions(poolClient,id);
      if (existing) requireState(isDeepStrictEqual(existing,{...checkedRollingWorkerStopV1,observedAt:existing.observedAt}),
        'stop observation checkpoint is immutable');
      else await poolClient.query<Record<string,unknown>>(
        'INSERT INTO ponytail_index.rolling_worker_stop_v1(project_id,campaign_id,assignment_id,generation,observation_text) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,id,generation,JSON.stringify(checkedRollingWorkerStopV1)]);
      return this.setWorkerInactive(poolClient,campaignId,id,blockers);
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async workerContext(campaignId: string, id: string, generation: string): Promise<RollingWorkerContext> {
    return this.transaction(campaignId,(poolClient,rollingCampaignRow) => this.workerContextValue(poolClient,rollingCampaignRow,id,generation));
  }

  private async workerContextValue(poolClient: PoolClient, rollingCampaignRow: RollingCampaignRow, id: string,
    generation: string): Promise<RollingWorkerContext> {
    const campaignId = rollingCampaignRow.campaign_id;
    const rollingGraph = this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest);
    const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
    requireState(rollingStoredAssignment.state === 'WORKING' && !rollingStoredAssignment.activityStopped
      && !rollingStoredAssignment.retired && rollingStoredAssignment.sessionId, 'worker instructions require an active attached session');
    const obligationLeaseV1 = this.currentLease(rollingStoredAssignment,rollingGraph);
    const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
    const action = readAction((await poolClient.query<Record<string,unknown>>(
      "SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4 AND state='COMPLETED'",
      [this.projectId,campaignId,id,generation])).rows[0]);
    requireState(action.resultText !== null,'worker generation has no native receipt');
    const generationRollingWorkerCreationV1 = action.kind === 'START_WORKER' ? parseRollingWorkerCreation(action.resultText)
      : parseRollingWorkerResumption(action.resultText).rollingWorkerCreationV1;
    requireState(isDeepStrictEqual(generationRollingWorkerCreationV1,rollingWorkerCreationV1),'worker generation differs from original native identity');
    const obligation = rollingGraph.document.obligations.find(item => item.id === rollingStoredAssignment.obligationId);
    const obligationBaseline = rollingGraph.document.baselines.at(-1);
    requireState(obligation && obligationBaseline, 'worker obligation or baseline is missing');
    const previousReview = (await poolClient.query<Record<string, unknown>>('SELECT r.outcome_text,i.repair_reference,i.rebase_text FROM ponytail_index.rolling_review_v1 r LEFT JOIN ponytail_index.rolling_increment_v1 i USING(project_id,campaign_id,review_id) WHERE r.project_id=$1 AND r.campaign_id=$2 AND r.assignment_id=$3 AND r.replacement_text IS NULL ORDER BY r.created_at DESC,r.review_id DESC LIMIT 1',
      [this.projectId, campaignId, id])).rows[0];
    const previousOutcome = previousReview ? nullableStringColumn(previousReview.outcome_text, 'previous review outcome') : null;
    const rollingReviewOutcomeV1 = previousOutcome === null ? null : parseRollingReviewOutcome(previousOutcome);
    return {assignmentId:id,rollingWorkerCreationV1,obligation,requirements:obligationBaseline.requirements.filter(item => obligation.requirementIds.includes(item.id)),
      binding:rollingStoredAssignment.binding,lease:obligationLeaseV1,configuration:parseRollingExecutionConfig(rollingCampaignRow.configuration_text),
      qa:rollingGraph.projectConfiguration.qa,baseCommit:this.campaignBase(rollingCampaignRow),
      rejectedReview:rollingReviewOutcomeV1?.decision === 'rejected' ? rollingReviewOutcomeV1 : null,
      incrementRepair:previousReview && previousReview.repair_reference !== null ? {reference:stringColumn(previousReview.repair_reference,'repair inspection reference'),rebase:readRollingIncrementRebaseV1(readStateText(stringColumn(previousReview.rebase_text,'repair conflict')))} : null};
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async claimWorkerDispatch(campaignId: string, id: string, generation: string, instructions: string): Promise<RollingWorkerDispatchStarted> {
    requireState(instructions.trim().length > 0,'worker instructions are empty');
    return this.transaction<RollingWorkerDispatchStarted>(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingWorkerContext = await this.workerContextValue(poolClient,rollingCampaignRow,id,generation);
      requireState(buildRollingWorkerInstructions(rollingWorkerContext) === instructions,'worker instructions differ from current coordinator scope');
      const rollingWorkerCreationV1 = rollingWorkerContext.rollingWorkerCreationV1;
      const existing = (await poolClient.query<Record<string, unknown>>(
        'SELECT dispatch_id FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation])).rows;
      requireState(existing.length === 0,'worker dispatch is already claimed; reconcile the original turn');
      const dispatchId = crypto.randomUUID();
      await poolClient.query<Record<string, unknown>>(
        "INSERT INTO ponytail_index.rolling_worker_dispatch_v1(project_id,campaign_id,assignment_id,generation,dispatch_id,thread_id,instructions_text,state) VALUES($1,$2,$3,$4,$5,$6,$7,'STARTED')",
        [this.projectId,campaignId,id,generation,dispatchId,rollingWorkerCreationV1.threadId,instructions]);
      return {id:dispatchId,threadId:rollingWorkerCreationV1.threadId,instructions,state:'STARTED'};
    });
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async workerDispatch(campaignId: string, id: string, generation: string): Promise<RollingWorkerDispatch | null> {
    const row = (await this.pool.query<Record<string, unknown>>(
      'SELECT * FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
      [this.projectId,campaignId,id,generation])).rows[0];
    if (!row) return null;
    return readWorkerDispatch(row);
  }

  // Traceability: implements REQ-ROLLING-WORKERS
  async attachWorkerDispatch(campaignId: string, id: string, generation: string, dispatchId: string,
    turnId: string): Promise<RollingWorkerDispatchAttached> {
    requireState(turnId.trim().length > 0,'worker turn identity is empty');
    return this.transaction<RollingWorkerDispatchAttached>(campaignId,async (poolClient,rollingCampaignRow) => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      requireState(rollingStoredAssignment.state === 'WORKING' && !rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,
        'worker is no longer active');
      this.currentLease(rollingStoredAssignment,this.graph(rollingCampaignRow,rollingCampaignRow.graph_digest));
      const row = (await poolClient.query<Record<string, unknown>>(
        'SELECT * FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation])).rows[0];
      requireState(row && row.dispatch_id === dispatchId,'worker dispatch identity differs');
      requireState(row.state === 'STARTED' || row.state === 'ATTACHED' && row.turn_id === turnId,'worker turn attachment is immutable');
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worker_dispatch_v1 SET state='ATTACHED',turn_id=$5 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4",
        [this.projectId,campaignId,id,generation,turnId]);
      return {id:dispatchId,threadId:stringColumn(row.thread_id,'worker thread'),instructions:stringColumn(row.instructions_text,'worker instructions'),state:'ATTACHED',turnId};
    });
  }

  async acknowledgeAction(campaignId: string, actionId: string, generation: string, state: 'STARTED' | 'COMPLETED', resultText: string | null = null): Promise<RollingActionAcknowledgment> {
    requireState(['STARTED', 'COMPLETED'].includes(state), 'invalid external action acknowledgment');
    return this.transaction(campaignId, async poolClient => {
      const row = readAction((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3', [this.projectId, campaignId, actionId])).rows[0]);
      requireState(row && row.generation === generation, 'invalid action lease generation');
      await this.assignment(poolClient, campaignId, row.assignmentId, generation);
      if (row.state === state) {
        requireState(row.resultText === resultText, 'acknowledgment differs from accepted result');
        return { id: actionId, state };
      }
      requireState(row.state === 'PENDING' && state === 'STARTED' || row.state === 'STARTED' && state === 'COMPLETED', 'invalid external action transition');
      requireState(state !== 'COMPLETED' || typeof resultText === 'string' && resultText.length > 0, 'completion requires external result');
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_action_v1 SET state=$2,result_text=$3 WHERE action_id=$1', [actionId, state, resultText]);
      return { id: actionId, state };
    });
  }
}
