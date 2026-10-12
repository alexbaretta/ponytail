// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { parse } from 'lossless-json';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseObligationDocument, projectObligationScope, inputDigest, obligationInputPaths,
  type ObligationDocumentV1, type ObligationProjection } from '../skills/plan-execution/scripts/obligations.js';
import { parseObligationBindingHistory, type ObligationBindingHistoryV1, type ObligationEffectiveBinding, type ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';

export type RollingArgv = readonly [string, ...string[]];
export interface RollingMainline { readonly remote: string; readonly branch: string }
export interface RollingProjectConfigV1 {
  readonly schemaVersion: 1;
  readonly mainline: RollingMainline | null;
  readonly managedWorktrees: { readonly directory: string; readonly anchor: 'main' };
  readonly maxActiveWorkers: number | null;
  readonly publicationSize: number | null;
  readonly setupCommands: readonly RollingArgv[];
  readonly qa: { readonly focused: readonly RollingArgv[]; readonly publication: readonly RollingArgv[] };
}
export interface RollingProjectConfigV2 extends Omit<RollingProjectConfigV1,'schemaVersion'> {
  readonly schemaVersion: 2;
  readonly retirementCommands: readonly RollingArgv[] | null;
}
// Discriminator: schemaVersion
export type RollingPhysicalProjectConfig = RollingProjectConfigV1 | RollingProjectConfigV2;
export interface RollingCampaignRequest {
  readonly mainline: RollingMainline | null;
  readonly incrementRef: string;
  readonly maxActiveWorkers: number | null;
  readonly publicationSize: number | null;
}
export interface RollingResolvedConfiguration {
  readonly mainline: RollingMainline;
  readonly incrementRef: string;
  readonly maxActiveWorkers: number;
  readonly publicationSize: number;
}
export interface RollingAcceptanceReference { readonly id: string; readonly arcId: string; readonly stepId: string | null }
export interface RollingTestReference { readonly id: string; readonly path: string; readonly selection: readonly string[] }
export interface RollingBinding {
  readonly obligationId: string;
  readonly implementationIds: readonly string[];
  readonly sourcePaths: readonly string[];
  readonly acceptances: readonly RollingAcceptanceReference[];
  readonly unitTests: readonly RollingTestReference[];
  readonly integrationTests: readonly RollingTestReference[];
  readonly exclusiveResources: readonly string[];
}
export interface RollingBindingsV1 { readonly schemaVersion: 1; readonly bindings: readonly RollingBinding[] }
export interface RollingGraph {
  readonly coordinatorRoot: string;
  readonly head: string;
  readonly digest: string;
  readonly document: ObligationDocumentV1;
  readonly bindings: readonly RollingBinding[];
  readonly projection: ObligationProjection;
  readonly bindingHistory: ObligationBindingHistoryV1 | null;
  readonly effectiveBindings: ReadonlyMap<string, ObligationEffectiveBinding>;
  readonly projectConfiguration: RollingProjectConfigV2;
  readonly unavailableInputs: readonly string[];
}
export type RollingAssignmentState = 'RESERVED' | 'PROVISIONING' | 'ATTACHING' | 'WORKING' | 'REVIEW' | 'REWORK' | 'INTEGRATING' | 'RETIRING' | 'INACTIVE' | 'RELEASED';
export interface RollingOccupiedScope { readonly id: string; readonly plannedPaths: readonly string[]; readonly exclusiveResources: readonly string[] }
export interface RollingAssignment extends RollingOccupiedScope {
  readonly scopeId: string;
  readonly obligationId: string;
  readonly state: RollingAssignmentState;
  readonly blockers: readonly string[];
  readonly activityStopped: boolean;
  readonly lease?: ObligationLeaseV1 | null;
  readonly binding?: RollingBinding;
}
export interface RollingWorkerScope {
  readonly obligationId: string;
  readonly plannedPaths: readonly string[];
  readonly exclusiveResources: readonly string[];
  readonly binding: RollingBinding;
}
export interface RollingStartWorkerSelection extends RollingWorkerScope { readonly kind: 'start_worker'; readonly assignmentId: null }
export interface RollingResumeWorkerSelection extends RollingWorkerScope { readonly kind: 'resume_worker'; readonly assignmentId: string }
// Discriminator: kind
export type RollingWorkerSelection = RollingStartWorkerSelection | RollingResumeWorkerSelection;
export interface RollingUnavailableInputs { readonly reason: 'unavailable_inputs'; readonly paths: readonly string[] }
export interface RollingPrerequisiteBlock { readonly reason: 'prerequisites'; readonly obligationId: string; readonly prerequisites: readonly string[] }
export interface RollingMissingBinding { readonly reason: 'missing_binding'; readonly obligationId: string; readonly prerequisites: readonly string[] }
export interface RollingChangedScope { readonly reason: 'scope_changed'; readonly obligationId: string; readonly prerequisites: readonly string[] }
export interface RollingScopeConflict { readonly reason: 'conflict'; readonly obligationId: string; readonly assignmentIds: readonly string[] }
// Discriminator: reason
export type RollingSchedulingBlock = RollingUnavailableInputs | RollingPrerequisiteBlock | RollingMissingBinding | RollingChangedScope | RollingScopeConflict;
export interface RollingSchedulingResult {
  readonly digest: string;
  readonly activeCount: number;
  readonly availableCapacity: number;
  readonly selected: readonly RollingWorkerSelection[];
  readonly blocked: readonly RollingSchedulingBlock[];
}

function requireRollingCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`rolling campaign: ${message}`);
}
function isRollingRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function requireRollingRecord(value: unknown, keys: readonly string[], label: string): asserts value is Record<string, unknown> {
  requireRollingCondition(isRollingRecord(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label} must contain exactly ${keys.join(', ')}`);
}
function isRollingStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.length > 0);
}
export function isRollingArgv(value: unknown): value is RollingArgv {
  return Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0
    && value.every((argument: unknown) => typeof argument === 'string' && !argument.includes('\0'));
}
function isRollingMainline(value: unknown): value is RollingMainline {
  requireRollingRecord(value, ['remote', 'branch'], 'mainline');
  for (const key of ['remote', 'branch']) {
    const field = value[key];
    requireRollingCondition(typeof field === 'string' && field.trim() === field && field.length > 0 && !field.startsWith('-'), `invalid mainline ${key}`);
  }
  return true;
}
function isRollingPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function isRollingProjectConfigV1(value: unknown): value is RollingProjectConfigV1 {
  requireRollingRecord(value, ['schemaVersion', 'mainline', 'managedWorktrees', 'maxActiveWorkers', 'publicationSize', 'setupCommands', 'qa'], 'project configuration V1');
  requireRollingCondition(value.schemaVersion === 1, 'unsupported project configuration version');
  requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline), 'invalid mainline');
  requireRollingRecord(value.managedWorktrees, ['directory', 'anchor'], 'managed worktrees');
  requireRollingCondition(value.managedWorktrees.anchor === 'main', 'managed directory anchor must be main');
  requireRollingCondition(typeof value.managedWorktrees.directory === 'string' && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory && value.managedWorktrees.directory.length > 0, 'managed directory must be nonempty');
  for (const key of ['maxActiveWorkers', 'publicationSize']) requireRollingCondition(value[key] === null || isRollingPositiveInteger(value[key]), `${key} must be null or a positive safe integer`);
  requireRollingRecord(value.qa, ['focused', 'publication'], 'QA');
  const commandGroups: readonly (readonly [string, unknown])[] = [['setupCommands', value.setupCommands], ['focused QA', value.qa.focused], ['publication QA', value.qa.publication]];
  for (const [label, commands] of commandGroups) {
    requireRollingCondition(Array.isArray(commands), `${label} must be an array`);
    requireRollingCondition(commands.every(isRollingArgv), `${label} commands must be nonempty executable argument arrays`);
  }
  requireRollingCondition(Array.isArray(value.qa.publication) && value.qa.publication.length > 0, 'publication QA must be configured');
  return true;
}
// Traceability: implements REQ-ROLLING-CONFIGURATION
// Traceability: implements REQ-PONYTAIL-STATIC-LANGUAGE
export function readRollingProjectConfigV1(value: unknown): RollingProjectConfigV1 {
  requireRollingCondition(isRollingProjectConfigV1(value), 'invalid project configuration'); return value;
}
// Traceability: implements REQ-ROLLING-CONFIGURATION
// Traceability: implements REQ-ROLLING-CONFIGURATION
// Traceability: implements REQ-ROLLING-WORKERS
function isRollingProjectConfigV2(value: unknown): value is RollingProjectConfigV2 {
  requireRollingRecord(value,['schemaVersion','mainline','managedWorktrees','maxActiveWorkers','publicationSize','setupCommands','qa','retirementCommands'],'project configuration V2');
  requireRollingCondition(value.schemaVersion === 2,'unsupported project configuration version');
  requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline),'invalid mainline');
  requireRollingRecord(value.managedWorktrees,['directory','anchor'],'managed worktrees');
  requireRollingCondition(value.managedWorktrees.anchor === 'main','managed directory anchor must be main');
  requireRollingCondition(typeof value.managedWorktrees.directory === 'string' && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory && value.managedWorktrees.directory.length > 0,'managed directory must be nonempty');
  for (const key of ['maxActiveWorkers','publicationSize']) requireRollingCondition(value[key] === null || isRollingPositiveInteger(value[key]),`${key} must be null or a positive safe integer`);
  requireRollingRecord(value.qa,['focused','publication'],'QA');
  const commandGroups: readonly (readonly [string,unknown])[] = [['setupCommands',value.setupCommands],['focused QA',value.qa.focused],['publication QA',value.qa.publication]];
  for (const [label,commands] of commandGroups) {
    requireRollingCondition(Array.isArray(commands) && commands.every(isRollingArgv),`${label} commands must be nonempty executable argument arrays`);
  }
  requireRollingCondition(Array.isArray(value.qa.publication) && value.qa.publication.length > 0,'publication QA must be configured');
  requireRollingCondition(value.retirementCommands === null || Array.isArray(value.retirementCommands) && value.retirementCommands.every(isRollingArgv),'retirement commands must be null or executable argument arrays');
  return true;
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
export function readRollingProjectConfigV2(value: unknown): RollingProjectConfigV2 {
  requireRollingCondition(isRollingProjectConfigV2(value),'invalid project configuration');return value;
}

function readRollingPhysicalProjectConfig(value: unknown): RollingPhysicalProjectConfig {
  requireRollingCondition(isRollingRecord(value),'project configuration must be a record');
  switch (value.schemaVersion) {
    case 1: return readRollingProjectConfigV1(value);
    case 2: return readRollingProjectConfigV2(value);
    default: throw new Error('rolling campaign: unsupported project configuration version');
  }
}
function unreachableRollingProjectConfig(rollingPhysicalProjectConfig: never): never {
  throw new Error(`rolling campaign: unsupported project configuration ${JSON.stringify(rollingPhysicalProjectConfig)}`);
}
// Traceability: implements REQ-ROLLING-CONFIGURATION
export function normalizeRollingProjectConfig(rollingPhysicalProjectConfig: RollingPhysicalProjectConfig): RollingProjectConfigV2 {
  switch (rollingPhysicalProjectConfig.schemaVersion) {
    case 1: return {...rollingPhysicalProjectConfig,schemaVersion:2,retirementCommands:null};
    case 2: return rollingPhysicalProjectConfig;
  }
  return unreachableRollingProjectConfig(rollingPhysicalProjectConfig);
}

export function parseRollingProjectConfig(text: string): RollingProjectConfigV2 {
  return normalizeRollingProjectConfig(readRollingPhysicalProjectConfig(parse(text, null, token => {
    requireRollingCondition(/^(0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(Number(token)), `unsupported JSON number token: ${token}`);
    return Number(token);
  })));
}
export const RollingProjectConfigReaders = { V1: readRollingProjectConfigV1,V2:readRollingProjectConfigV2 };

function isRollingAcceptanceReference(value: unknown): value is RollingAcceptanceReference {
  requireRollingRecord(value, ['id', 'arcId', 'stepId'], 'acceptance reference');
  requireRollingCondition(typeof value.id === 'string' && value.id.length > 0 && typeof value.arcId === 'string' && value.arcId.length > 0
    && (value.stepId === null || typeof value.stepId === 'string' && value.stepId.length > 0), 'invalid acceptance reference');
  return true;
}
function isRollingTestReference(value: unknown): value is RollingTestReference {
  requireRollingRecord(value, ['id', 'path', 'selection'], 'test reference');
  requireRollingCondition(typeof value.id === 'string' && value.id.length > 0 && typeof value.path === 'string' && value.path.length > 0
    && isRollingStringArray(value.selection) && value.selection.length > 0, 'invalid test reference'); return true;
}
function isRollingBinding(value: unknown): value is RollingBinding {
  requireRollingRecord(value, ['obligationId', 'implementationIds', 'sourcePaths', 'acceptances', 'unitTests', 'integrationTests', 'exclusiveResources'], 'execution binding');
  requireRollingCondition(typeof value.obligationId === 'string' && /^OBL-[1-9][0-9]*$/.test(value.obligationId), 'duplicate or invalid binding obligation');
  for (const key of ['implementationIds', 'exclusiveResources']) {
    const strings = value[key];
    requireRollingCondition(isRollingStringArray(strings) && new Set(strings).size === strings.length, `invalid binding ${key}`);
  }
  requireRollingCondition(Array.isArray(value.acceptances) && value.acceptances.every(isRollingAcceptanceReference), 'acceptances must be an array');
  requireRollingCondition(Array.isArray(value.unitTests) && value.unitTests.every(isRollingTestReference), 'unitTests must be an array');
  requireRollingCondition(Array.isArray(value.integrationTests) && value.integrationTests.every(isRollingTestReference), 'integrationTests must be an array');
  requireRollingCondition(isRollingStringArray(value.sourcePaths) && new Set(value.sourcePaths).size === value.sourcePaths.length, 'invalid binding sourcePaths');
  for (const relative of [...value.sourcePaths, ...value.unitTests.map((item: RollingTestReference) => item.path), ...value.integrationTests.map((item: RollingTestReference) => item.path)]) {
    requireRollingCondition(!path.isAbsolute(relative) && relative.split('/').every(component => component && component !== '.' && component !== '..') && !relative.includes('\\'), 'binding path must be normalized and repository-relative');
  }
  return true;
}
function isRollingBindingsV1(value: unknown): value is RollingBindingsV1 {
  requireRollingRecord(value, ['schemaVersion', 'bindings'], 'execution bindings V1');
  requireRollingCondition(value.schemaVersion === 1 && Array.isArray(value.bindings), 'unsupported execution bindings');
  const ids = new Set<string>();
  for (const binding of value.bindings) {
    requireRollingCondition(isRollingBinding(binding), 'invalid execution binding');
    requireRollingCondition(!ids.has(binding.obligationId), 'duplicate or invalid binding obligation'); ids.add(binding.obligationId);
  }
  return true;
}
// Traceability: implements REQ-ROLLING-GRAPH
export function readRollingBindingsV1(value: unknown): RollingBindingsV1 {
  requireRollingCondition(isRollingBindingsV1(value), 'invalid execution bindings'); return value;
}
export const RollingBindingsReaders = { V1: readRollingBindingsV1 };

function readRollingCoordinatorRoot(coordinatorRoot: string): string {
  const root = fs.realpathSync(coordinatorRoot);
  const repository = spawnSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  requireRollingCondition(repository.status === 0 && fs.realpathSync(repository.stdout.trim()) === root,
    'coordinator root must identify the exact Git checkout');
  return root;
}

// Traceability: implements REQ-ROLLING-GRAPH
export function collectRollingGraph(coordinatorRoot: string, documentPath: string, bindingsPath: string, bindingHistoryPath?: string): RollingGraph {
  const root = readRollingCoordinatorRoot(coordinatorRoot);
  const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  requireRollingCondition(head.status === 0, 'coordinator must have a committed HEAD');
  const texts = [];
  for (const relative of [documentPath, bindingsPath, '.agents/config/project/rolling-campaigns.json', ...(bindingHistoryPath === undefined ? [] : [bindingHistoryPath])]) {
    requireRollingCondition(typeof relative === 'string' && !path.isAbsolute(relative)
      && relative.split('/').every(component => component && component !== '.' && component !== '..') && !relative.includes('\\'), 'graph input must be repository-relative');
    const file = path.join(root, relative);
    requireRollingCondition(fs.lstatSync(file).isFile() && fs.realpathSync(file) === file, 'graph input must be a regular file without symlink ancestors');
    texts.push(fs.readFileSync(file, 'utf8'));
  }
  const [documentText, bindingsText, configurationText, historyText] = texts;
  requireRollingCondition(documentText !== undefined && bindingsText !== undefined && configurationText !== undefined, 'graph input texts are missing');
  const document = parseObligationDocument(documentText);
  const bindings = readRollingBindingsV1(parse(bindingsText, null, token => {
    requireRollingCondition(token === '1', 'unsupported bindings number');
    return 1;
  }));
  const projectConfiguration = parseRollingProjectConfig(configurationText);
  const bindingHistory = historyText === undefined ? null : parseObligationBindingHistory(historyText);
  const obligationScopeProjection = projectObligationScope(document, root, bindingHistory === null ? undefined : bindingHistory);
  const projection = obligationScopeProjection.projection;
  const obligationIds = new Set(document.obligations.map(item => item.id));
  requireRollingCondition(bindings.bindings.every(binding => obligationIds.has(binding.obligationId)), 'binding references an unknown obligation');
  const obligationBaseline = document.baselines.at(-1);
  requireRollingCondition(obligationBaseline, 'graph has no current baseline');
  const inputs = new Set(obligationBaseline.requirements.map(item => item.path));
  const acceptedCertificateIds = new Set(projection.assessments.map(assessment => assessment.id));
  for (const certificate of document.certificates.filter(certificate => acceptedCertificateIds.has(certificate.id))) {
    for (const relative of obligationInputPaths(certificate.inputs)) inputs.add(relative);
  }
  const inputDigests = [...inputs].sort().map((relative): readonly [string, string | null] => {
    try { return [relative, inputDigest(root, relative)]; }
    catch { return [relative, null]; }
  });
  const digest = crypto.createHash('sha256').update(JSON.stringify([root, head.stdout.trim(), documentPath, bindingsPath, texts, inputDigests,
    ...(bindingHistoryPath === undefined ? [] : [bindingHistoryPath])])).digest('hex');
  const unavailableInputs = inputDigests.filter(([, digest]) => digest === null).map(([relative]) => relative);
  return { coordinatorRoot: root, head: head.stdout.trim(), digest, document,
    bindings: bindings.bindings, projection, bindingHistory, effectiveBindings: obligationScopeProjection.bindings, projectConfiguration, unavailableInputs };
}

// Traceability: implements REQ-ROLLING-SCHEDULING
export function selectRollingAssignments(rollingGraph: RollingGraph, assignments: readonly RollingAssignment[], maxActiveWorkers: number, expectedDigest: string): RollingSchedulingResult {
  requireRollingCondition(rollingGraph.digest === expectedDigest, 'stale coordinator graph');
  requireRollingCondition(Number.isSafeInteger(maxActiveWorkers) && maxActiveWorkers > 0, 'capacity must be a positive safe integer');
  requireRollingCondition(Array.isArray(rollingGraph.unavailableInputs), 'graph must assess input availability');
  const live = assignments.filter(assignment => assignment.state !== 'RELEASED');
  const states = new Set(['RESERVED', 'PROVISIONING', 'ATTACHING', 'WORKING', 'REVIEW', 'REWORK', 'INTEGRATING', 'RETIRING', 'INACTIVE']);
  const owners = new Set();
  for (const assignment of live) {
    requireRollingCondition(states.has(assignment.state) && typeof assignment.scopeId === 'string' && !owners.has(`${assignment.scopeId}:${assignment.obligationId}`), 'invalid or duplicate live obligation ownership');
    owners.add(`${assignment.scopeId}:${assignment.obligationId}`);
    requireRollingCondition(Array.isArray(assignment.plannedPaths) && Array.isArray(assignment.exclusiveResources)
      && Array.isArray(assignment.blockers), 'assignment must retain scope and blockers');
    requireRollingCondition(assignment.state !== 'INACTIVE' || assignment.activityStopped === true, 'inactive worker must acknowledge stopped activity');
  }
  const occupied: RollingOccupiedScope[] = live.filter(assignment => assignment.state !== 'INACTIVE');
  let capacity = Math.max(0, maxActiveWorkers - occupied.length);
  const satisfied = new Set(rollingGraph.projection.satisfiedIds);
  const unresolved = new Set(rollingGraph.projection.unresolvedIds);
  const bindings = new Map(rollingGraph.bindings.map(binding => [binding.obligationId, binding]));
  const categoryOrder = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2', 'gate'];
  const obligations = rollingGraph.document.obligations.filter(obligation => unresolved.has(obligation.id))
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || Number(a.id.slice(4)) - Number(b.id.slice(4)));
  const selected: RollingWorkerSelection[] = [];
  const blocked: RollingSchedulingBlock[] = [];
  if (rollingGraph.unavailableInputs.length > 0) return { digest: rollingGraph.digest,
    activeCount: occupied.length, availableCapacity: capacity, selected,
    blocked: [{ reason: 'unavailable_inputs', paths: rollingGraph.unavailableInputs }] };
  for (const resume of [true, false]) for (const obligation of obligations) {
    const assignment = live.find(item => item.scopeId === rollingGraph.document.scopeId && item.obligationId === obligation.id);
    if (resume ? assignment?.state !== 'INACTIVE' : assignment !== undefined) continue;
    const binding = bindings.get(obligation.id);
    const obligationEffectiveBinding = rollingGraph.effectiveBindings.get(obligation.id);
    requireRollingCondition(obligationEffectiveBinding, `missing effective binding: ${obligation.id}`);
    const prerequisites = [...obligationEffectiveBinding.dependsOn, ...(assignment?.blockers ?? [])].filter(id => !satisfied.has(id));
    if (prerequisites.length || !binding) {
      blocked.push({ obligationId: obligation.id, reason: binding ? 'prerequisites' : 'missing_binding', prerequisites });
      continue;
    }
    if (resume && assignment && (JSON.stringify(assignment.plannedPaths) !== JSON.stringify(obligationEffectiveBinding.execution.plannedPaths)
      || JSON.stringify(assignment.exclusiveResources) !== JSON.stringify(binding.exclusiveResources)
      || (assignment.lease ? !isDeepStrictEqual(assignment.lease.binding, obligationEffectiveBinding)
        || !isDeepStrictEqual(assignment.binding, binding) : obligationEffectiveBinding.revisionId !== null))) {
      blocked.push({ obligationId: obligation.id, reason: 'scope_changed', prerequisites: [] });
      continue;
    }
    const plannedPaths = resume && assignment ? assignment.plannedPaths : obligationEffectiveBinding.execution.plannedPaths;
    const exclusiveResources = resume && assignment ? assignment.exclusiveResources : binding.exclusiveResources;
    const conflicts = occupied.filter(other => (
      plannedPaths.some(left => other.plannedPaths.some(right => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)))
      || exclusiveResources.some(resource => other.exclusiveResources.includes(resource))));
    if (conflicts.length) { blocked.push({ obligationId: obligation.id, reason: 'conflict', assignmentIds: conflicts.map(item => item.id) }); continue; }
    if (capacity === 0) continue;
    if (resume && assignment) selected.push({ kind: 'resume_worker', obligationId: obligation.id,
      assignmentId: assignment.id, plannedPaths, exclusiveResources, binding });
    else selected.push({ kind: 'start_worker', obligationId: obligation.id,
      assignmentId: null, plannedPaths, exclusiveResources, binding });
    occupied.push({ id: assignment?.id ?? obligation.id, plannedPaths, exclusiveResources });
    capacity--;
  }
  return { digest: rollingGraph.digest, activeCount: live.filter(item => item.state !== 'INACTIVE').length,
    availableCapacity: capacity, selected, blocked };
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
// Traceability: implements REQ-ROLLING-CONFIGURATION
export function readRollingCampaignRequest(value:unknown):RollingCampaignRequest {
  requireRollingRecord(value,['mainline','incrementRef','maxActiveWorkers','publicationSize'],'campaign request');
  requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline),'invalid campaign mainline');
  requireRollingCondition(typeof value.incrementRef === 'string' && !value.incrementRef.startsWith('-') && spawnSync('git',['check-ref-format',`refs/heads/${value.incrementRef}`]).status === 0,'invalid campaign increment branch');
  requireRollingCondition(value.maxActiveWorkers === null || isRollingPositiveInteger(value.maxActiveWorkers),'invalid campaign capacity');
  requireRollingCondition(value.publicationSize === null || isRollingPositiveInteger(value.publicationSize),'invalid campaign publication size');
  return {mainline:value.mainline,incrementRef:value.incrementRef,maxActiveWorkers:value.maxActiveWorkers,publicationSize:value.publicationSize};
}
export function resolveRollingConfiguration(rollingPhysicalProjectConfig: RollingPhysicalProjectConfig, request: RollingCampaignRequest, gitDefaultBranch: string | null): RollingResolvedConfiguration {
  const rollingProjectConfigV2 = normalizeRollingProjectConfig(readRollingPhysicalProjectConfig(rollingPhysicalProjectConfig));
  readRollingCampaignRequest(request);
  const mainline = request.mainline ?? rollingProjectConfigV2.mainline
    ?? { remote: 'origin', branch: gitDefaultBranch };
  const maxActiveWorkers = request.maxActiveWorkers ?? rollingProjectConfigV2.maxActiveWorkers ?? 10;
  const publicationSize = request.publicationSize ?? rollingProjectConfigV2.publicationSize ?? 1;
  readRollingProjectConfigV2({ ...rollingProjectConfigV2, mainline, maxActiveWorkers, publicationSize });
  return readRollingResolvedConfiguration({ mainline: { ...mainline }, incrementRef: request.incrementRef, maxActiveWorkers, publicationSize });
}

function isRollingResolvedConfiguration(value: unknown): value is RollingResolvedConfiguration {
  requireRollingRecord(value, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'resolved campaign configuration');
  requireRollingRecord(value.mainline, ['remote', 'branch'], 'resolved mainline');
  requireRollingCondition(typeof value.mainline.remote === 'string' && value.mainline.remote.length > 0
    && value.mainline.remote.trim() === value.mainline.remote && !value.mainline.remote.startsWith('-'), 'invalid mainline remote');
  for (const key of ['maxActiveWorkers', 'publicationSize']) requireRollingCondition(isRollingPositiveInteger(value[key]), `invalid resolved ${key}`);
  const refs: readonly (readonly [string, unknown])[] = [['mainline branch', value.mainline.branch], ['increment branch', value.incrementRef]];
  for (const [label, ref] of refs) {
    requireRollingCondition(typeof ref === 'string' && ref.length > 0 && !ref.startsWith('-')
      && spawnSync('git', ['check-ref-format', `refs/heads/${ref}`]).status === 0, `invalid ${label}`);
  }
  requireRollingCondition(value.mainline.branch !== value.incrementRef, 'increment and mainline branches must differ');
  return true;
}

export function readRollingResolvedConfiguration(value: unknown): RollingResolvedConfiguration {
  requireRollingCondition(isRollingResolvedConfiguration(value), 'invalid resolved campaign configuration'); return value;
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
export function loadRollingConfiguration(coordinatorRoot: string, request: RollingCampaignRequest): RollingResolvedConfiguration {
  const root = readRollingCoordinatorRoot(coordinatorRoot);
  const configurationPath = path.join(root, '.agents/config/project/rolling-campaigns.json');
  requireRollingCondition(fs.lstatSync(configurationPath).isFile()
    && fs.realpathSync(configurationPath) === configurationPath,
  'project configuration must be a regular non-symlink file without symlink ancestors');
  const rollingProjectConfig = parseRollingProjectConfig(fs.readFileSync(configurationPath, 'utf8'));
  const gitDefault = spawnSync('git', ['-C', root, 'config', '--get', 'init.defaultBranch'], { encoding: 'utf8' });
  requireRollingCondition(gitDefault.status === 0 || gitDefault.status === 1, 'cannot read effective Git default branch');
  return resolveRollingConfiguration(rollingProjectConfig, request, gitDefault.status === 0 ? gitDefault.stdout.trim() : null);
}
