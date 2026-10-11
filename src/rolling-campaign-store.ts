// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import crypto from 'node:crypto';
import {readRollingIncrementClaimV1,readRollingIncrementRebaseV1,verifyRollingIncrementRebase,prepareRollingIncrementRebase,readRollingIncrementPublicationV1,reconcileRollingIncrementPublication,publishRollingIncrement,verifyRollingIncrementLocalIntegration,fastForwardRollingIncrement,verifyRollingIncrementConflictInspection,type RollingIncrementConflictInspection,type RollingIncrementRepair,type RollingIncrementClaimV1,type RollingIncrementRebaseV1,type RollingFastRebaseResult,type RollingIncrementPublicationV1,type RollingIncrementPublicationResult,type RollingIncrementPushStarted} from './rolling-integration.js';
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
import { relativePath,parseObligationDocument,inputDigest,type ObligationDocumentV1, type Obligation } from '../skills/plan-execution/scripts/obligations.js';
import {acceptBoundCheckpoint,type ObligationCertificateBindingRequest,type ObligationCertificateSubmission} from '../skills/plan-execution/scripts/obligation-certificate-bindings.js';
import { readRollingWorkerResumptionV1, parseRollingWorkerResumption, type RollingWorkerResumptionV1, readRollingWorkerStopV1, parseRollingWorkerStop, type RollingWorkerStopV1, buildRollingWorkerInstructions, readRollingWorkerCreationV1, parseRollingWorkerCreation, type RollingWorkerCreationV1, type RollingWorkerContext } from './rolling-worker.js';
import { validateRollingSessionMarker } from './rolling-worktrees.js';
import { readRollingReviewRequestV1, readRollingReviewOutcomeV1, parseRollingReviewRequest, parseRollingReviewOutcome,
  readRollingReviewReplacementV1, parseRollingReviewReplacement, validateRollingReviewOutcome, type RollingReviewRequestV1, type RollingReviewOutcomeV1,
  type RollingReviewReplacementV1, type RollingReviewerLoss, type RollingStoredReview } from './rolling-review.js';
import { collectRollingGraph, selectRollingAssignments, resolveRollingConfiguration, readRollingResolvedConfiguration, readRollingBindingsV1,
  type RollingAssignment, type RollingAssignmentState, type RollingBinding, type RollingCampaignRequest,
  type RollingGraph, type RollingResolvedConfiguration, type RollingSchedulingBlock } from './rolling-campaign.js';

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
export type RollingExecutionConfig = RollingExecutionConfigV1 | RollingExecutionConfigV2;
export interface RollingAssignmentScopeV2 {
  readonly schemaVersion: 2;
  readonly lease: ObligationLeaseV1;
  readonly exclusiveResources: readonly string[];
  readonly binding: RollingBinding;
}
// Discriminator: schemaVersion
export type RollingAssignmentScope = RollingAssignmentScopeV1 | RollingAssignmentScopeV2;
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
}
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
export interface RollingAssignmentTransition { readonly id: string; readonly state: RollingAssignmentState }
export interface RollingLeaseRenewal { readonly id: string; readonly generation: string; readonly lease: ObligationLeaseV1 }
export interface RollingSessionAttachment { readonly id: string; readonly sessionId: string; readonly state: 'WORKING' }
export interface RollingAssignmentRelease { readonly id: string; readonly generation: string }
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
  readonly reason: 'capacity_reached' | 'no_ready_obligation' | null;
  readonly blocked?: readonly RollingSchedulingBlock[];
}
export interface RollingCampaignStatus { readonly graphDigest: string; readonly assignments: readonly RollingStoredAssignment[] }
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
interface RollingStoredWorktree extends RollingAllocatedWorktree {
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
function requireKeys(value: unknown, keys: readonly string[], schemaVersion: 1 | 2 = 1): asserts value is Record<string, unknown> {
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
export function readRollingExecutionConfigV2(value: unknown): RollingExecutionConfigV2 {
  requireKeys(value, ['schemaVersion', 'mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize', 'bindingHistory'], 2);
  requireState(isRecord(value.bindingHistory)
    && JSON.stringify(Object.keys(value.bindingHistory).sort()) === JSON.stringify(['assessor', 'authority', 'path']), 'invalid binding history configuration');
  relativePath(value.bindingHistory.path);
  const assessor = stringColumn(value.bindingHistory.assessor, 'binding assessor');
  requireState(isStringArray(value.bindingHistory.authority) && value.bindingHistory.authority.length > 0
    && new Set(value.bindingHistory.authority).size === value.bindingHistory.authority.length, 'invalid binding authority');
  const rollingResolvedConfiguration = readRollingResolvedConfiguration({ mainline: value.mainline, incrementRef: value.incrementRef,
    maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize });
  return { schemaVersion: 2, ...rollingResolvedConfiguration,
    bindingHistory: { path: value.bindingHistory.path, assessor, authority: [...value.bindingHistory.authority] } };
}
export const RollingAssignmentScopeReaders = { V1: readRollingAssignmentScopeV1, V2: readRollingAssignmentScopeV2 };
export const RollingExecutionConfigReaders = { V1: readRollingExecutionConfigV1, V2: readRollingExecutionConfigV2 };
function executionConfiguration(text: string): RollingExecutionConfig {
  const value = readStateText(text);
  requireState(isRecord(value), 'invalid execution configuration');
  switch (value.schemaVersion) {
    case 1: return readRollingExecutionConfigV1(value);
    case 2: return readRollingExecutionConfigV2(value);
    default: throw new Error('rolling campaign: unsupported stored execution configuration');
  }
}
function assignmentScope(text: string): RollingAssignmentScope {
  const value = readStateText(text);
  requireState(isRecord(value), 'invalid assignment scope');
  switch (value.schemaVersion) {
    case 1: return readRollingAssignmentScopeV1(value);
    case 2: return readRollingAssignmentScopeV2(value);
    default: throw new Error('rolling campaign: unsupported stored assignment scope');
  }
}

function stringColumn(value: unknown, label: string): string {
  requireState(typeof value === 'string' && value.length > 0, `invalid database ${label}`); return value;
}
function nullableStringColumn(value: unknown, label: string): string | null { return value === null ? null : stringColumn(value, label); }
function booleanColumn(value: unknown, label: string): boolean { requireState(typeof value === 'boolean', `invalid database ${label}`); return value; }
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
    graph_digest: stringColumn(value.graph_digest, 'graph digest'), configuration_text: stringColumn(value.configuration_text, 'configuration text') };
}
function readAssignment(value: unknown): RollingStoredAssignment {
  requireState(isRecord(value), 'assignment row is missing');
  const rollingAssignmentScope = assignmentScope(stringColumn(value.scope_text, 'scope text'));
  const obligationLeaseV1 = rollingAssignmentScope.schemaVersion === 2 ? rollingAssignmentScope.lease : null;
  requireState(obligationLeaseV1 === null || obligationLeaseV1.generation === value.generation
    && obligationLeaseV1.scopeId === value.campaign_id && obligationLeaseV1.binding.obligationId === value.obligation_id, 'stored lease identity differs from assignment');
  const blockers = readStateText(stringColumn(value.blockers_text, 'blockers text'));
  requireState(isStringArray(blockers) && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)), 'invalid stored blockers');
  return { id: stringColumn(value.assignment_id, 'assignment ID'), scopeId: stringColumn(value.campaign_id, 'campaign ID'), obligationId: stringColumn(value.obligation_id, 'obligation ID'),
    generation: stringColumn(value.generation, 'generation'), state: assignmentState(value.state), sessionId: nullableStringColumn(value.session_id, 'session ID'),
    activityStopped: booleanColumn(value.activity_stopped, 'activity stopped'), retired: booleanColumn(value.retired, 'retired'), worktreeNumber: worktreeNumber(value.worktree_number),
    plannedPaths: rollingAssignmentScope.schemaVersion === 1 ? rollingAssignmentScope.plannedPaths : rollingAssignmentScope.lease.binding.execution.plannedPaths,
    exclusiveResources: rollingAssignmentScope.exclusiveResources, binding: rollingAssignmentScope.binding, lease: obligationLeaseV1, blockers };
}
function readWorktree(value: unknown): RollingStoredWorktree {
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

  private async transaction<Result>(campaignId: string, operation: (poolClient: PoolClient, rollingCampaignRow: RollingCampaignRow, rollingPoolRow: RollingPoolRow) => Promise<Result>): Promise<Result> {
    const poolClient = await this.pool.connect();
    try {
      await poolClient.query<Record<string, unknown>>('BEGIN');
      const pool = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
      const rollingPoolRow = readPool(pool);
      const campaign = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2 FOR UPDATE', [this.projectId, campaignId])).rows[0];
      const rollingCampaignRow = readCampaign(campaign);
      const result = await operation(poolClient, rollingCampaignRow, rollingPoolRow);
      await poolClient.query<Record<string, unknown>>('COMMIT');
      return result;
    } catch (error) { await poolClient.query<Record<string, unknown>>('ROLLBACK'); throw error; }
    finally { poolClient.release(); }
  }

  async registerCampaign(request: RollingCampaignRegistration): Promise<RollingCampaignRegistrationResult> {
    const rollingGraph = collectRollingGraph(request.coordinatorRoot, request.documentPath, request.bindingsPath, request.bindingHistory?.path);
    requireState(rollingGraph.digest === request.graphDigest && rollingGraph.document.scopeId === request.id, 'stale or mismatched coordinator graph');
    const rollingResolvedConfiguration = resolveRollingConfiguration(rollingGraph.projectConfiguration, request.configuration, null);
    const rollingExecutionConfig: RollingExecutionConfig = request.bindingHistory === undefined
      ? readRollingExecutionConfigV1({ schemaVersion: 1, ...rollingResolvedConfiguration })
      : readRollingExecutionConfigV2({ schemaVersion: 2, ...rollingResolvedConfiguration, bindingHistory: request.bindingHistory });
    requireState(path.isAbsolute(request.managedDirectory), 'managed directory must be absolute');
    const poolClient = await this.pool.connect();
    try {
      await poolClient.query<Record<string, unknown>>('BEGIN');
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2) ON CONFLICT DO NOTHING', [this.projectId, request.managedDirectory]);
      const pool = (await poolClient.query<Record<string, unknown>>('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
      requireState(readPool(pool).managed_directory === request.managedDirectory, 'managed directory differs from project pool');
      await poolClient.query<Record<string, unknown>>('INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [this.projectId, request.id, rollingGraph.coordinatorRoot, request.documentPath, request.bindingsPath, rollingGraph.digest, JSON.stringify(rollingExecutionConfig)]);
      await poolClient.query<Record<string, unknown>>('COMMIT');
      return { id: request.id, graphDigest: rollingGraph.digest };
    } catch (error) { await poolClient.query<Record<string, unknown>>('ROLLBACK'); throw error; }
    finally { poolClient.release(); }
  }

  private collectGraph(rollingCampaignRow: RollingCampaignRow): RollingGraph {
    const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
    return collectRollingGraph(rollingCampaignRow.coordinator_root, rollingCampaignRow.document_path, rollingCampaignRow.bindings_path,
      rollingExecutionConfig.schemaVersion === 2 ? rollingExecutionConfig.bindingHistory.path : undefined);
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

  async suspend(campaignId: string, id: string, generation: string, stopped: boolean, blockers: readonly string[]): Promise<RollingAssignmentTransition> {
    requireState(stopped === true && Array.isArray(blockers) && blockers.length > 0
      && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)) && new Set(blockers).size === blockers.length,
    'suspension requires stopped acknowledgment and unique obligation blockers');
    return this.transaction<RollingAssignmentTransition>(campaignId, async poolClient => {
      const assignment = await this.assignment(poolClient, campaignId, id, generation);
      requireState(assignment.sessionId && !assignment.retired, 'only an attached non-retired session may become inactive');
      await this.cancelActions(poolClient, id);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='INACTIVE',activity_stopped=true,blockers_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id, JSON.stringify(blockers)]);
      return { id, state: 'INACTIVE' };
    });
  }

  async retire(campaignId: string, id: string, generation: string, stopped: boolean): Promise<RollingAssignmentTransition> {
    requireState(stopped === true, 'retirement requires stopped acknowledgment');
    return this.transaction<RollingAssignmentTransition>(campaignId, async poolClient => {
      await this.assignment(poolClient, campaignId, id, generation);
      await this.cancelActions(poolClient, id);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',activity_stopped=true,retired=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id]);
      return { id, state: 'RETIRING' };
    });
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
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET session_id=$2,state='WORKING' WHERE assignment_id=$1", [id, sessionId]);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2", [this.projectId, assignment.worktreeNumber]);
      return { id, sessionId, state: 'WORKING' };
    });
  }

  private scope(rollingGraph: RollingGraph, rollingExecutionConfig: RollingExecutionConfig, generation: string,
    obligationId: string, rollingBinding: RollingBinding, plannedPaths: readonly string[]): RollingAssignmentScope {
    if (rollingExecutionConfig.schemaVersion === 1) return readRollingAssignmentScopeV1({ schemaVersion: 1,
      plannedPaths, exclusiveResources: rollingBinding.exclusiveResources, binding: rollingBinding });
    requireState(rollingGraph.bindingHistory, 'binding-aware campaign has no coordinator history');
    const obligationLeaseV1 = freezeObligationLease(rollingGraph.document, rollingGraph.bindingHistory, {
      obligationId, graphDigest: rollingGraph.digest, generation,
      assessor: rollingExecutionConfig.bindingHistory.assessor, authority: rollingExecutionConfig.bindingHistory.authority });
    return readRollingAssignmentScopeV2({ schemaVersion: 2, lease: obligationLeaseV1,
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
      const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
      const base = spawnSync('git', ['-C', rollingCampaignRow.coordinator_root, 'rev-parse', `refs/heads/${rollingExecutionConfig.incrementRef}^{commit}`], { encoding: 'utf8' });
      requireState(!base.error && base.status === 0 && base.stdout.trim() === checkedRollingWorkerSubmissionV1.baseCommit,
        'submission base differs from current coordinator increment');
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
    return rows.map(row => {
      const text = nullableStringColumn(row.outcome_text, 'review outcome');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text, 'review request'));
      const rollingReviewOutcomeV1 = text === null ? null : parseRollingReviewOutcome(text);
      if (rollingReviewOutcomeV1) validateRollingReviewOutcome(rollingReviewRequestV1, rollingReviewOutcomeV1);
      return { request: rollingReviewRequestV1, outcome: rollingReviewOutcomeV1 };
    });
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
      const row = (await poolClient.query<Record<string, unknown>>('SELECT request_text,outcome_text,replacement_text FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND campaign_id=$2 AND review_id=$3', [this.projectId,campaignId,reviewId])).rows[0];
      requireState(row && row.replacement_text === null && row.outcome_text !== null,'increment requires an unreplaced decided review');
      const rollingReviewRequestV1 = parseRollingReviewRequest(stringColumn(row.request_text,'review request'));
      const rollingReviewOutcomeV1 = parseRollingReviewOutcome(stringColumn(row.outcome_text,'review outcome'));
      validateRollingReviewOutcome(rollingReviewRequestV1,rollingReviewOutcomeV1);
      requireState(rollingReviewOutcomeV1.decision === 'accepted','increment requires an accepted review');
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingReviewRequestV1.assignmentId,rollingReviewRequestV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING','assignment is not integrating');
      const rollingReviewCandidate = await this.validateReviewCandidate(poolClient,rollingCampaignRow,rollingReviewRequestV1);
      const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1({schemaVersion:1,id:crypto.randomUUID(),campaignId,reviewId,
        assignmentId:rollingReviewRequestV1.assignmentId,generation:rollingReviewRequestV1.generation,
        graphDigest:rollingCampaignRow.graph_digest,rootPath:rollingReviewCandidate.rootPath,coordinatorRoot:rollingCampaignRow.coordinator_root,
        target:{remote:rollingExecutionConfig.mainline.remote,branch:rollingExecutionConfig.incrementRef},
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
      const rollingIncrementClaimV1 = readRollingIncrementClaimV1(readStateText(stringColumn(row.claim_text,'increment claim')));
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,rollingIncrementClaimV1.assignmentId,rollingIncrementClaimV1.generation);
      requireState(rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired,'certificate assessment requires stopped retained integration ownership');
      const rollingGraph = this.collectGraph(rollingCampaignRow);
      const obligationLeaseV1 = this.currentLease(rollingStoredAssignment,rollingGraph);
      const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
      requireState(rollingExecutionConfig.schemaVersion === 2 && rollingGraph.bindingHistory,'certificate assessment requires adopted binding history');
      const rollingWorkerSubmissionV1 = parseRollingWorkerSubmission(stringColumn(row.proof_text,'integrated proof'));
      requireState(rollingWorkerSubmissionV1.revision === row.candidate_revision,'retained proof differs from published candidate');
      verifyRollingIncrementLocalIntegration(rollingCampaignRow.coordinator_root,rollingIncrementClaimV1.target.branch,rollingWorkerSubmissionV1.revision);
      const documentPath = rollingCampaignRow.document_path;
      relativePath(candidatePath);
      requireState(candidatePath !== documentPath,'candidate must be separate from the accepted document');
      inputDigest(rollingCampaignRow.coordinator_root,candidatePath);
      const candidateObligationDocumentV1 = parseObligationDocument(fs.readFileSync(path.join(rollingCampaignRow.coordinator_root,candidatePath),'utf8'));
      const obligationCheckpoint = candidateObligationDocumentV1.checkpoints.at(-1);
      requireState(obligationCheckpoint && obligationCheckpoint.assessor === rollingExecutionConfig.bindingHistory.assessor
        && obligationCheckpoint.selectedIds.length === 1 && obligationCheckpoint.selectedIds[0] === rollingStoredAssignment.obligationId,
        'assessment must identify the authorized coordinator and exact assigned obligation');
      requireState(obligationCheckpoint.certificateIds.length > 0,'assessment requires a discharge certificate');
      for (const certificateId of obligationCheckpoint.certificateIds) {
        const obligationCertificate = candidateObligationDocumentV1.certificates.find(certificate=>certificate.id === certificateId);
        requireState(obligationCertificate && obligationCertificate.obligationIds.length === 1
          && obligationCertificate.obligationIds[0] === rollingStoredAssignment.obligationId,'certificate exceeds assigned obligation');
        requireState(obligationCertificate.inputs.every(input=>input.path !== documentPath),'accepted document cannot certify its own bytes');
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
      const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
      requireState(rollingIncrementClaimV1.target.remote === rollingExecutionConfig.mainline.remote
        && rollingIncrementClaimV1.target.branch === rollingExecutionConfig.incrementRef,'push retry target changed');
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
    const id = stringColumn(row.dispatch_id, 'review dispatch');
    const reviewerThreadId = stringColumn(row.reviewer_thread_id, 'reviewer thread');
    if (row.state === 'STARTED') { requireState(row.turn_id === null, 'started review dispatch has a turn'); return { id, reviewerThreadId, state: 'STARTED' }; }
    requireState(row.state === 'ATTACHED', 'unsupported review dispatch state');
    return { id, reviewerThreadId, state: 'ATTACHED', turnId: stringColumn(row.turn_id, 'review turn') };
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
  async rebindLease(campaignId: string, id: string, generation: string, graphDigest: string): Promise<RollingLeaseRenewal> {
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
      const rollingAssignmentScope = this.scope(rollingGraph, executionConfiguration(rollingCampaignRow.configuration_text), nextGeneration,
        rollingStoredAssignment.obligationId, rollingBinding, rollingStoredAssignment.plannedPaths);
      requireState(rollingAssignmentScope.schemaVersion === 2, 'legacy assignments cannot adopt amended leases');
      await poolClient.query<Record<string, unknown>>('UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,scope_text=$3 WHERE assignment_id=$1',
        [id, nextGeneration, JSON.stringify(rollingAssignmentScope)]);
      return { id, generation: nextGeneration, lease: rollingAssignmentScope.lease };
    });
  }

  async allocate(campaignId: string, expectedDigest: string, release: RollingAssignmentRelease | null = null): Promise<RollingAllocationResult> {
    return this.transaction<RollingAllocationResult>(campaignId, async (poolClient, rollingCampaignRow, rollingPoolRow) => {
      const rollingGraph = this.graph(rollingCampaignRow, expectedDigest);
      if (release) {
        const row = await this.assignment(poolClient, campaignId, release.id, release.generation);
        requireState(row.state === 'RETIRING' && row.retired && row.activityStopped, 'checkout owner must retire before release');
        await this.cancelActions(poolClient, row.id);
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='RELEASED' WHERE assignment_id=$1", [row.id]);
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=$2", [this.projectId, row.worktreeNumber]);
      }
      const assignments = (await poolClient.query<Record<string, unknown>>("SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND state<>'RELEASED' ORDER BY created_at,assignment_id", [this.projectId])).rows.map(readAssignment);
      const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
      const rollingSchedulingResult = selectRollingAssignments(rollingGraph, assignments, rollingExecutionConfig.maxActiveWorkers, expectedDigest);
      const selected = rollingSchedulingResult.selected[0];
      if (!selected) return { assignment: null, reason: rollingSchedulingResult.activeCount >= rollingExecutionConfig.maxActiveWorkers ? 'capacity_reached' : 'no_ready_obligation', blocked: rollingSchedulingResult.blocked };
      const generation = crypto.randomUUID();
      const rollingAssignmentScope = this.scope(rollingGraph, rollingExecutionConfig, generation, selected.obligationId, selected.binding, selected.plannedPaths);
      let id = selected.assignmentId;
      let worktree: RollingStoredWorktree;
      if (id) {
        const assignment = assignments.find(item => item.id === id);
        requireState(assignment && assignment.sessionId, 'inactive assignment has no resumable session');
        worktree = readWorktree((await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, assignment.worktreeNumber])).rows[0]);
        await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,state='RESERVED',activity_stopped=false,blockers_text='[]',scope_text=$3 WHERE assignment_id=$1", [id, generation, JSON.stringify(rollingAssignmentScope)]);
      } else {
        const available = (await poolClient.query<Record<string, unknown>>("SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND state='AVAILABLE' ORDER BY number LIMIT 1", [this.projectId])).rows[0];
        if (available) worktree = readWorktree(available);
        else {
          const numbers = (await poolClient.query<Record<string, unknown>>('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number', [this.projectId])).rows;
          let number = 101;
          for (const row of numbers) { if (worktreeNumber(row.number) !== number) break; number++; }
          requireState(Number.isSafeInteger(number), 'worktree numbers exhausted');
          worktree = readWorktree((await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *", [this.projectId, number, path.join(rollingPoolRow.managed_directory, String(number))])).rows[0]);
        }
        id = crypto.randomUUID();
        await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,scope_text) VALUES($1,$2,$3,$4,$5,$6,'RESERVED',$7)",
          [this.projectId, campaignId, id, selected.obligationId, worktree.number, generation,
            JSON.stringify(rollingAssignmentScope)]);
      }
      if (worktree.state !== 'PROVISIONING') await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, worktree.number]);
      const actionId = crypto.randomUUID();
      await poolClient.query<Record<string, unknown>>("INSERT INTO ponytail_index.rolling_action_v1(project_id,campaign_id,action_id,assignment_id,kind,generation,state) VALUES($1,$2,$3,$4,$5,$6,'PENDING')",
        [this.projectId, campaignId, actionId, id, selected.kind === 'resume_worker' ? 'RESUME_WORKER' : 'START_WORKER', generation]);
      const row = (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1', [id])).rows[0];
      return { assignment: readAssignment(row), worktree: { number: worktree.number, rootPath: worktree.rootPath }, actionId, reason: null };
    });
  }

  async status(campaignId: string): Promise<RollingCampaignStatus> {
    return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => ({ graphDigest: rollingCampaignRow.graph_digest,
      assignments: (await poolClient.query<Record<string, unknown>>('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 ORDER BY created_at,assignment_id', [this.projectId, campaignId])).rows.map(readAssignment) }));
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
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET session_id=$2,state='WORKING' WHERE assignment_id=$1",
        [rollingStoredAssignment.id,checkedRollingWorkerCreationV1.sessionId]);
      await poolClient.query<Record<string, unknown>>("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2",
        [this.projectId,rollingStoredAssignment.worktreeNumber]);
      return {id:rollingStoredAssignment.id,sessionId:checkedRollingWorkerCreationV1.sessionId,state:'WORKING'};
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
    const rollingExecutionConfig = executionConfiguration(rollingCampaignRow.configuration_text);
    const result = spawnSync('git',['-C',rollingCampaignRow.coordinator_root,'rev-parse',`refs/heads/${rollingExecutionConfig.incrementRef}^{commit}`],{encoding:'utf8'});
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
    const checkedRollingWorkerStopV1 = readRollingWorkerStopV1(rollingWorkerStopV1);
    requireState(checkedRollingWorkerStopV1.campaignId === campaignId && checkedRollingWorkerStopV1.assignmentId === id
      && checkedRollingWorkerStopV1.generation === generation,'stop observation differs from assignment');
    requireState(blockers.every(item => /^OBL-[1-9][0-9]*$/u.test(item))
      && new Set(blockers).size === blockers.length,'suspension requires unique obligation blockers');
    return this.transaction<RollingAssignmentTransition>(campaignId,async poolClient => {
      const rollingStoredAssignment = await this.assignment(poolClient,campaignId,id,generation);
      requireState(rollingStoredAssignment.state === 'WORKING' || rollingStoredAssignment.state === 'INACTIVE' || rollingStoredAssignment.state === 'REWORK','worker is not eligible for suspension');
      const existing = await this.workerStopValue(poolClient,campaignId,id,generation);
      requireState(blockers.length > 0 || rollingStoredAssignment.state === 'REWORK'
        || rollingStoredAssignment.state === 'INACTIVE' && rollingStoredAssignment.blockers.length === 0 && existing !== null,
        'suspension requires obligation blockers unless returning rejected work');
      const rollingWorkerCreationV1 = await this.attachedWorkerIdentity(poolClient,campaignId,rollingStoredAssignment);
      requireState(checkedRollingWorkerStopV1.threadId === rollingWorkerCreationV1.threadId
        && checkedRollingWorkerStopV1.sessionId === rollingWorkerCreationV1.sessionId,'stop observation differs from attached native worker');
      const dispatch = (await poolClient.query<Record<string,unknown>>(
        'SELECT state,turn_id FROM ponytail_index.rolling_worker_dispatch_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3 AND generation=$4',
        [this.projectId,campaignId,id,generation])).rows[0];
      requireState(dispatch ? dispatch.state === 'ATTACHED' && dispatch.turn_id === checkedRollingWorkerStopV1.turn?.id
        : checkedRollingWorkerStopV1.turn === null,'stop observation differs from known worker turn');
      await this.cancelActions(poolClient,id);
      if (existing) requireState(isDeepStrictEqual(existing,{...checkedRollingWorkerStopV1,observedAt:existing.observedAt}),
        'stop observation checkpoint is immutable');
      else await poolClient.query<Record<string,unknown>>(
        'INSERT INTO ponytail_index.rolling_worker_stop_v1(project_id,campaign_id,assignment_id,generation,observation_text) VALUES($1,$2,$3,$4,$5)',
        [this.projectId,campaignId,id,generation,JSON.stringify(checkedRollingWorkerStopV1)]);
      await poolClient.query<Record<string,unknown>>("UPDATE ponytail_index.rolling_assignment_v1 SET state='INACTIVE',activity_stopped=true,blockers_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3",
        [this.projectId,campaignId,id,JSON.stringify(blockers)]);
      return {id,state:'INACTIVE'};
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
      binding:rollingStoredAssignment.binding,lease:obligationLeaseV1,configuration:executionConfiguration(rollingCampaignRow.configuration_text),
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
    const rollingWorkerDispatchIdentity: RollingWorkerDispatchIdentity = {id:stringColumn(row.dispatch_id,'worker dispatch'),
      threadId:stringColumn(row.thread_id,'worker thread'),instructions:stringColumn(row.instructions_text,'worker instructions')};
    if (row.state === 'STARTED') {requireState(row.turn_id === null,'started worker dispatch has a turn');return {...rollingWorkerDispatchIdentity,state:'STARTED'};}
    requireState(row.state === 'ATTACHED','invalid worker dispatch state');
    return {...rollingWorkerDispatchIdentity,state:'ATTACHED',turnId:stringColumn(row.turn_id,'worker turn')};
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
