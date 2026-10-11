// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import crypto from 'node:crypto';
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
import { relativePath } from '../skills/plan-execution/scripts/obligations.js';
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
