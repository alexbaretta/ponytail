#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'lossless-json';
import { parseObligationBindingHistory, projectObligationBindings,
  type ObligationBindingHistoryV1, type ObligationEffectiveBinding } from './obligation-binding-history.js';

export type ObligationCoordinate = 'T1' | 'T2' | 'T3' | 'T4' | 'C1' | 'C2';
export type ObligationCategory = ObligationCoordinate | 'gate';
export type ObligationVector = readonly [number, number, number, number, number, number];
export type ObligationEvidenceOutcome = 'pass' | 'fail' | 'unavailable';
export type ObligationCheckpointKind = 'initial' | 'productive' | 'neutral' | 'disturbance' | 'rebaseline';

export interface ObligationInput { readonly path: string; readonly digest: string }
export interface ObligationRequirement extends ObligationInput { readonly id: string }
export interface ObligationTarget { readonly identity: string; readonly profile: string }
export interface ObligationEvidenceTarget extends ObligationTarget { readonly verification: string }
export interface ObligationExecution {
  readonly sprintId: string | null;
  readonly taskletIds: readonly string[];
  readonly plannedPaths: readonly string[];
  readonly operations: readonly string[];
  readonly selection: readonly string[];
  readonly target: ObligationTarget | null;
}
export interface Obligation {
  readonly id: string;
  readonly category: ObligationCategory;
  readonly requirementIds: readonly string[];
  readonly responsibilityId: string;
  readonly condition: string;
  readonly criterion: string;
  readonly dependsOn: readonly string[];
  readonly acceptanceGroups: readonly string[];
  readonly supersedes: string | null;
  readonly execution: ObligationExecution;
}
export interface ObligationAuthority { readonly references: readonly string[]; readonly assessors: readonly string[] }
export interface ObligationBaseline {
  readonly id: string;
  readonly predecessorId: string | null;
  readonly authority: ObligationAuthority;
  readonly requirements: readonly ObligationRequirement[];
  readonly obligationIds: readonly string[];
  readonly inventoryIds: readonly string[];
}
export interface ObligationDisposition {
  readonly responsibilityId: string;
  readonly reason: string;
  readonly authority: readonly string[];
}
export interface ObligationEvidence {
  readonly command: string;
  readonly selection: readonly string[];
  readonly target: ObligationEvidenceTarget;
  readonly revision: string;
  readonly dirty: boolean;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outcome: ObligationEvidenceOutcome;
  readonly skips: number;
  readonly failures: number;
  readonly inputs: readonly ObligationInput[];
  readonly outputPath: string;
  readonly finalization: ObligationEvidenceOutcome;
}
export interface ObligationCertificate {
  readonly id: string;
  readonly obligationIds: readonly string[];
  readonly inputs: readonly ObligationInput[];
  readonly artifacts: readonly string[];
  readonly assessor: string;
  readonly authority: readonly string[];
  readonly adequate: boolean;
  readonly reason: string;
  readonly disposition: ObligationDisposition | null;
  readonly evidence: readonly ObligationEvidence[];
  readonly inventoryIds: readonly string[];
}
export interface ObligationPreparation {
  readonly obligationId: string;
  readonly operations: readonly string[];
  readonly deliverable: string;
}
export interface ObligationCheckpoint {
  readonly id: string;
  readonly predecessorId: string | null;
  readonly baselineId: string;
  readonly kind: ObligationCheckpointKind;
  readonly selectedIds: readonly string[];
  readonly registeredIds: readonly string[];
  readonly certificateIds: readonly string[];
  readonly invalidatedIds: readonly string[];
  readonly before: ObligationVector;
  readonly after: ObligationVector;
  readonly preparation: ObligationPreparation | null;
  readonly reason: string;
  readonly assessor: string;
}
export interface ObligationDocumentV1 {
  readonly schemaVersion: 1;
  readonly scopeId: string;
  readonly baselines: readonly ObligationBaseline[];
  readonly obligations: readonly Obligation[];
  readonly certificates: readonly ObligationCertificate[];
  readonly checkpoints: readonly ObligationCheckpoint[];
}
export interface ObligationAssessment { readonly id: string; readonly valid: boolean; readonly reasons: readonly string[] }
export interface ObligationScopeProjection {
  readonly projection: ObligationProjection;
  readonly bindings: ReadonlyMap<string, ObligationEffectiveBinding>;
}
export interface ObligationProjection {
  readonly baselineId: string;
  readonly vector: ObligationVector;
  readonly satisfiedIds: readonly string[];
  readonly unresolvedIds: readonly string[];
  readonly gates: readonly string[];
  readonly assessments: readonly ObligationAssessment[];
  readonly complete: boolean;
}
export interface ObligationFreshness { readonly fresh: boolean; readonly reasons: readonly string[] }
export interface ObligationHistory { readonly baseline: ObligationBaseline; readonly accepted: ReadonlySet<string> }
export interface ObligationSelection {
  readonly category: ObligationCoordinate | null;
  readonly selectedId: string | null;
  readonly blockedIds: readonly string[];
  readonly projection: ObligationProjection;
}

const COORDINATES: readonly ObligationCoordinate[] = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'];

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[], label: string): asserts value is Record<string, unknown> {
  requireCondition(isRecord(value), `${label} must be an object`);
  requireCondition(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), `${label} must contain exactly ${keys.join(', ')}`);
}

function nonemptyString(value: unknown, label: string): asserts value is string {
  requireCondition(typeof value === 'string' && value.trim().length > 0, `${label} must be a nonempty string`);
}

function stringValue(value: unknown, label: string): string { nonemptyString(value, label); return value; }
function nullableString(value: unknown, label: string): string | null { return value === null ? null : stringValue(value, label); }
function booleanValue(value: unknown, label: string): boolean {
  requireCondition(typeof value === 'boolean', `${label} must be boolean`); return value;
}
function integerValue(value: unknown, label: string): number {
  requireCondition(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, `${label} must be a safe nonnegative integer`); return value;
}
function arrayValue(value: unknown, label: string): readonly unknown[] {
  requireCondition(Array.isArray(value), `${label} must be an array`); return value;
}
function uniqueStrings(value: unknown, label: string, nonempty = false): readonly string[] {
  const strings = arrayValue(value, label).map(item => stringValue(item, label));
  requireCondition(new Set(strings).size === strings.length && (!nonempty || strings.length > 0), `${label} must contain unique${nonempty ? ', nonempty' : ''} values`);
  return strings;
}
export function relativePath(value: unknown): asserts value is string {
  nonemptyString(value, 'path');
  requireCondition(!value.includes('\\') && !value.split('/').some(segment => !segment || segment === '.' || segment === '..') && !/[:*?{}]/.test(value), `invalid repository-relative path: ${value}`);
}
function pathValue(value: unknown): string { relativePath(value); return value; }
function inputValue(value: unknown): ObligationInput {
  exactKeys(value, ['path', 'digest'], 'input');
  const digest = stringValue(value.digest, 'digest');
  requireCondition(/^[a-f0-9]{64}$/.test(digest), 'input requires SHA-256 digests');
  return { path: pathValue(value.path), digest };
}
function inputs(value: unknown, label: string): readonly ObligationInput[] {
  const obligationInputs = arrayValue(value, label).map(inputValue);
  requireCondition(obligationInputs.length > 0, `${label} requires a nonempty input manifest`);
  requireCondition(new Set(obligationInputs.map(item => item.path)).size === obligationInputs.length, `${label} must contain unique values`);
  return obligationInputs;
}
function isObligationVector(value: unknown): value is ObligationVector {
  return Array.isArray(value) && value.length === 6 && value.every((number: unknown) =>
    typeof number === 'number' && Number.isSafeInteger(number) && number >= 0);
}
function vector(value: unknown): ObligationVector {
  requireCondition(isObligationVector(value), 'vector must contain six safe nonnegative integers');
  return value;
}
function namedRecords(value: readonly { readonly id: string }[], label: string): void {
  requireCondition(new Set(value.map(record => record.id)).size === value.length, `${label} IDs must contain unique values`);
}
function references(value: readonly string[], ids: ReadonlySet<string>, label: string): void {
  requireCondition(value.every(id => ids.has(id)), `${label} contains an unknown reference`);
}
function categoryValue(value: unknown): ObligationCategory {
  switch (value) {
    case 'T1': case 'T2': case 'T3': case 'T4': case 'C1': case 'C2': case 'gate': return value;
    default: throw new Error('unknown obligation category');
  }
}
function outcomeValue(value: unknown): ObligationEvidenceOutcome {
  switch (value) { case 'pass': case 'fail': case 'unavailable': return value; default: throw new Error('invalid evidence outcome'); }
}
function checkpointKind(value: unknown): ObligationCheckpointKind {
  switch (value) { case 'initial': case 'productive': case 'neutral': case 'disturbance': case 'rebaseline': return value; default: throw new Error('unknown checkpoint kind'); }
}
function targetValue(value: unknown): ObligationTarget {
  exactKeys(value, ['identity', 'profile'], 'execution target');
  return { identity: stringValue(value.identity, 'target identity'), profile: stringValue(value.profile, 'target profile') };
}
export function readObligationExecution(value: unknown): ObligationExecution {
  exactKeys(value, ['sprintId', 'taskletIds', 'plannedPaths', 'operations', 'selection', 'target'], 'execution');
  const obligationExecution: ObligationExecution = { sprintId: nullableString(value.sprintId, 'execution sprintId'), taskletIds: uniqueStrings(value.taskletIds, 'taskletIds'),
    plannedPaths: uniqueStrings(value.plannedPaths, 'plannedPaths').map(pathValue), operations: uniqueStrings(value.operations, 'operations', true),
    selection: uniqueStrings(value.selection, 'execution selection'), target: value.target === null ? null : targetValue(value.target) };
  requireCondition(obligationExecution.sprintId === null || /^S[0-9]+$/.test(obligationExecution.sprintId), 'invalid execution sprintId');
  requireCondition(obligationExecution.taskletIds.every(id => /^S[0-9]+-F[0-9]+-T[0-9]+$/.test(id) && id.startsWith(`${obligationExecution.sprintId}-`)), 'tasklet binding requires its owning sprint');
  return obligationExecution;
}
function obligationValue(value: unknown): Obligation {
  exactKeys(value, ['id', 'category', 'requirementIds', 'responsibilityId', 'condition', 'criterion', 'dependsOn', 'acceptanceGroups', 'supersedes', 'execution'], 'obligation');
  return { id: stringValue(value.id, 'obligation ID'), category: categoryValue(value.category), requirementIds: uniqueStrings(value.requirementIds, 'requirementIds'),
    responsibilityId: stringValue(value.responsibilityId, 'responsibilityId'), condition: stringValue(value.condition, 'condition'),
    criterion: stringValue(value.criterion, 'criterion'), dependsOn: uniqueStrings(value.dependsOn, 'dependsOn'),
    acceptanceGroups: uniqueStrings(value.acceptanceGroups, 'acceptanceGroups', true), supersedes: nullableString(value.supersedes, 'supersedes'), execution: readObligationExecution(value.execution) };
}
function baselineValue(value: unknown): ObligationBaseline {
  exactKeys(value, ['id', 'predecessorId', 'authority', 'requirements', 'obligationIds', 'inventoryIds'], 'baseline');
  exactKeys(value.authority, ['references', 'assessors'], 'baseline authority');
  const requirements: ObligationRequirement[] = arrayValue(value.requirements, 'requirements').map(item => {
    exactKeys(item, ['id', 'path', 'digest'], 'requirement');
    return { id: stringValue(item.id, 'requirement ID'), ...inputValue({ path: item.path, digest: item.digest }) };
  });
  namedRecords(requirements, 'baseline requirements');
  return { id: stringValue(value.id, 'baseline ID'), predecessorId: nullableString(value.predecessorId, 'baseline predecessor'),
    authority: { references: uniqueStrings(value.authority.references, 'authority references', true), assessors: uniqueStrings(value.authority.assessors, 'authorized assessors', true) },
    requirements, obligationIds: uniqueStrings(value.obligationIds, 'baseline obligationIds'), inventoryIds: uniqueStrings(value.inventoryIds, 'baseline inventoryIds') };
}
function dispositionValue(value: unknown): ObligationDisposition {
  exactKeys(value, ['responsibilityId', 'reason', 'authority'], 'disposition');
  return { responsibilityId: stringValue(value.responsibilityId, 'disposition responsibilityId'), reason: stringValue(value.reason, 'disposition reason'), authority: uniqueStrings(value.authority, 'disposition authority', true) };
}
function timestampValue(value: unknown, label: string): string {
  const timestamp = stringValue(value, label);
  requireCondition(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) && Number.isFinite(Date.parse(timestamp)), `${label} must be an ISO timestamp with offset`); return timestamp;
}
export function readObligationEvidence(value: unknown): ObligationEvidence {
  exactKeys(value, ['command', 'selection', 'target', 'revision', 'dirty', 'startedAt', 'completedAt', 'outcome', 'skips', 'failures', 'inputs', 'outputPath', 'finalization'], 'execution evidence');
  exactKeys(value.target, ['identity', 'profile', 'verification'], 'evidence target');
  const startedAt = timestampValue(value.startedAt, 'startedAt');
  const completedAt = timestampValue(value.completedAt, 'completedAt');
  requireCondition(Date.parse(startedAt) <= Date.parse(completedAt), 'evidence completion precedes start');
  return { command: stringValue(value.command, 'command'), selection: uniqueStrings(value.selection, 'exact selection', true),
    target: { identity: stringValue(value.target.identity, 'target identity'), profile: stringValue(value.target.profile, 'target profile'), verification: pathValue(value.target.verification) },
    revision: stringValue(value.revision, 'revision'), dirty: booleanValue(value.dirty, 'dirty'), startedAt, completedAt,
    outcome: outcomeValue(value.outcome), skips: integerValue(value.skips, 'skips'), failures: integerValue(value.failures, 'failures'),
    inputs: inputs(value.inputs, 'evidence inputs'), outputPath: pathValue(value.outputPath), finalization: outcomeValue(value.finalization) };
}
function certificateValue(value: unknown): ObligationCertificate {
  exactKeys(value, ['id', 'obligationIds', 'inputs', 'artifacts', 'assessor', 'authority', 'adequate', 'reason', 'disposition', 'evidence', 'inventoryIds'], 'certificate');
  const obligationIds = uniqueStrings(value.obligationIds, 'certificate obligationIds', true);
  return { id: stringValue(value.id, 'certificate ID'), obligationIds, inputs: inputs(value.inputs, 'certificate inputs'),
    artifacts: uniqueStrings(value.artifacts, 'certificate artifacts', true).map(pathValue), assessor: stringValue(value.assessor, 'certificate assessor'),
    authority: uniqueStrings(value.authority, 'certificate authority', true), adequate: booleanValue(value.adequate, 'adequate'), reason: stringValue(value.reason, 'certificate rationale'),
    disposition: value.disposition === null ? null : dispositionValue(value.disposition), evidence: arrayValue(value.evidence, 'evidence').map(readObligationEvidence), inventoryIds: uniqueStrings(value.inventoryIds, 'certificate inventoryIds') };
}
function preparationValue(value: unknown): ObligationPreparation {
  exactKeys(value, ['obligationId', 'operations', 'deliverable'], 'preparation');
  return { obligationId: stringValue(value.obligationId, 'preparation obligationId'), operations: uniqueStrings(value.operations, 'bounded preparation operations', true), deliverable: stringValue(value.deliverable, 'preparation deliverable') };
}
function checkpointValue(value: unknown): ObligationCheckpoint {
  exactKeys(value, ['id', 'predecessorId', 'baselineId', 'kind', 'selectedIds', 'registeredIds', 'certificateIds', 'invalidatedIds', 'before', 'after', 'preparation', 'reason', 'assessor'], 'checkpoint');
  return { id: stringValue(value.id, 'checkpoint ID'), predecessorId: nullableString(value.predecessorId, 'checkpoint predecessor'), baselineId: stringValue(value.baselineId, 'checkpoint baseline'),
    kind: checkpointKind(value.kind), selectedIds: uniqueStrings(value.selectedIds, 'checkpoint selectedIds'), registeredIds: uniqueStrings(value.registeredIds, 'checkpoint registeredIds'), certificateIds: uniqueStrings(value.certificateIds, 'checkpoint certificateIds'), invalidatedIds: uniqueStrings(value.invalidatedIds, 'checkpoint invalidatedIds'),
    before: vector(value.before), after: vector(value.after), preparation: value.preparation === null ? null : preparationValue(value.preparation), reason: stringValue(value.reason, 'reason'), assessor: stringValue(value.assessor, 'assessor') };
}
function requireObligation(obligationDocument: ObligationDocumentV1, id: string): Obligation {
  const obligation = obligationDocument.obligations.find(item => item.id === id);
  requireCondition(obligation, `unknown obligation: ${id}`); return obligation;
}
function requireCertificate(obligationDocument: ObligationDocumentV1, id: string): ObligationCertificate {
  const obligationCertificate = obligationDocument.certificates.find(item => item.id === id);
  requireCondition(obligationCertificate, `unknown certificate: ${id}`); return obligationCertificate;
}
function isObligationDocumentV1(value: unknown): value is ObligationDocumentV1 {
  exactKeys(value, ['schemaVersion', 'scopeId', 'baselines', 'obligations', 'certificates', 'checkpoints'], 'obligation document V1');
  requireCondition(value.schemaVersion === 1, 'unsupported obligation document schemaVersion');
  const obligationDocument: ObligationDocumentV1 = {
    schemaVersion: 1, scopeId: stringValue(value.scopeId, 'scopeId'),
    baselines: arrayValue(value.baselines, 'baselines').map(baselineValue),
    obligations: arrayValue(value.obligations, 'obligations').map(obligationValue),
    certificates: arrayValue(value.certificates, 'certificates').map(certificateValue),
    checkpoints: arrayValue(value.checkpoints, 'checkpoints').map(checkpointValue)
  };
  namedRecords(obligationDocument.baselines, 'baselines');
  namedRecords(obligationDocument.obligations, 'obligations');
  namedRecords(obligationDocument.certificates, 'certificates');
  namedRecords(obligationDocument.checkpoints, 'checkpoints');
  requireCondition(obligationDocument.baselines.length > 0, 'a baseline is required');
  const obligationIds = new Set(obligationDocument.obligations.map(obligation => obligation.id));
  const certificateIds = new Set(obligationDocument.certificates.map(certificate => certificate.id));
  const baselineIds = new Set(obligationDocument.baselines.map(baseline => baseline.id));
  let previousNumber = 0;
  for (const obligation of obligationDocument.obligations) {
    requireCondition(/^OBL-[1-9][0-9]*$/.test(obligation.id), 'invalid obligation ID');
    const number = Number(obligation.id.slice(4));
    requireCondition(Number.isSafeInteger(number) && number > previousNumber, 'obligation IDs must be monotonically allocated safe integers');
    previousNumber = number;
    references(obligation.dependsOn, obligationIds, 'dependsOn');
    requireCondition(obligation.supersedes === null || (obligationIds.has(obligation.supersedes) && Number(obligation.supersedes.slice(4)) < number), 'supersedes must reference an earlier obligation');
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    requireCondition(!visiting.has(id), `cyclic obligation dependency: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    requireObligation(obligationDocument, id).dependsOn.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  obligationDocument.obligations.forEach(obligation => visit(obligation.id));
  let predecessorId: string | null = null;
  for (const baseline of obligationDocument.baselines) {
    requireCondition(baseline.predecessorId === predecessorId, 'baseline predecessor must preserve append-only order');
    predecessorId = baseline.id;
    references(baseline.obligationIds, obligationIds, 'baseline obligationIds');
    references(baseline.inventoryIds, new Set(baseline.obligationIds), 'baseline inventoryIds');
    requireCondition(COORDINATES.every(category => baseline.inventoryIds.some(id => requireObligation(obligationDocument, id).category === category)), 'each coordinate requires a declared inventory obligation');
    requireCondition(baseline.requirements.every(requirement => COORDINATES.every(category => baseline.inventoryIds.some(id => requireObligation(obligationDocument, id).category === category && requireObligation(obligationDocument, id).requirementIds.includes(requirement.id)))), 'each baseline requirement must be covered by inventories in every coordinate');
    for (const id of baseline.obligationIds) {
      references(requireObligation(obligationDocument, id).requirementIds, new Set(baseline.requirements.map(requirement => requirement.id)), `${id} requirementIds`);
      references(requireObligation(obligationDocument, id).dependsOn, new Set(baseline.obligationIds), `${id} baseline dependencies`);
    }
  }
  for (const certificate of obligationDocument.certificates) {
    references(certificate.obligationIds, obligationIds, 'certificate obligationIds');
    references(certificate.inventoryIds, obligationIds, 'certificate inventoryIds');
    const disposition = certificate.disposition;
    if (disposition !== null) {
      requireCondition(certificate.obligationIds.every(id => requireObligation(obligationDocument, id).category === 'T4' && requireObligation(obligationDocument, id).responsibilityId === disposition.responsibilityId), 'disposition must cover only its exact T4 responsibility');
    }
  }
  predecessorId = null;
  for (const checkpoint of obligationDocument.checkpoints) {
    requireCondition(checkpoint.predecessorId === predecessorId, 'checkpoint predecessor must preserve append-only order');
    predecessorId = checkpoint.id;
    requireCondition(baselineIds.has(checkpoint.baselineId), 'unknown checkpoint baseline');
    references(checkpoint.selectedIds, obligationIds, 'checkpoint selectedIds');
    references(checkpoint.registeredIds, obligationIds, 'checkpoint registeredIds');
    references(checkpoint.certificateIds, certificateIds, 'checkpoint certificateIds');
    references(checkpoint.invalidatedIds, certificateIds, 'checkpoint invalidatedIds');
    if (checkpoint.preparation !== null) requireCondition(obligationIds.has(checkpoint.preparation.obligationId), 'unknown preparation obligation');
  }
  const obligationHistory = replayHistory(obligationDocument);
  if (obligationDocument.checkpoints.length) {
    const currentBaseline = obligationDocument.baselines.at(-1);
    requireCondition(currentBaseline, 'a baseline is required');
    requireCondition(obligationHistory.baseline.id === currentBaseline.id, 'current baseline must have an accepted observation');
    requireCondition(isDeepStrictEqual(obligationHistory.baseline.obligationIds, currentBaseline.obligationIds), 'current observation contains unregistered obligation membership');
  }
  return true;
}

export function readObligationDocumentV1(value: unknown): ObligationDocumentV1 {
  requireCondition(isObligationDocumentV1(value), 'invalid obligation document');
  return value;
}

export function parseObligationDocument(text: string): ObligationDocumentV1 {
  return readObligationDocumentV1(parse(text, null, token => {
    const number = Number(token);
    requireCondition(/^(0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(number), `unsupported JSON number token: ${token}`);
    return number;
  }));
}

export const ObligationDocumentReaders = {
  V1: readObligationDocumentV1,
};
export function inputDigest(root: string, relative: string): string {
  relativePath(relative);
  const repositoryRoot = fs.realpathSync(root);
  const inputPath = fs.realpathSync(path.join(repositoryRoot, relative));
  const resolved = path.relative(repositoryRoot, inputPath);
  requireCondition(resolved !== '' && !resolved.startsWith(`..${path.sep}`) && resolved !== '..' && !path.isAbsolute(resolved), `input escapes repository: ${relative}`);
  requireCondition(fs.statSync(inputPath).isFile(), `input must be a regular file: ${relative}`);
  return crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
}
function certificateReasons(obligationDocument: ObligationDocumentV1, baseline: ObligationBaseline, certificate: ObligationCertificate): string[] {
  const reasons: string[] = [];
  if (!certificate.adequate) reasons.push('adequacy assessment is negative');
  if (!baseline.authority.assessors.includes(certificate.assessor) || !certificate.authority.every(reference => baseline.authority.references.includes(reference))) reasons.push('assessment lacks baseline authority');
  if (!certificate.obligationIds.every(id => baseline.obligationIds.includes(id))) reasons.push('certificate covers obligations outside baseline');
  const manifest = new Map(certificate.inputs.map(input => [input.path, input.digest]));
  const requiredPaths = [...certificate.artifacts];
  const requirementIds = new Set(obligationDocument.obligations.filter(obligation => certificate.obligationIds.includes(obligation.id)).flatMap(obligation => obligation.requirementIds));
  for (const requirement of baseline.requirements.filter(requirement => requirementIds.has(requirement.id))) {
    requiredPaths.push(requirement.path);
    if (manifest.get(requirement.path) !== requirement.digest) reasons.push(`baseline meaning not preserved: ${requirement.id}`);
  }
  if (certificate.disposition && !certificate.disposition.authority.every(reference => baseline.authority.references.includes(reference))) reasons.push('disposition lacks authority');
  const executionRequired = certificate.obligationIds.some(id => {
    const obligation = requireObligation(obligationDocument, id);
    return ['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id);
  });
  if (executionRequired && certificate.evidence.length === 0) reasons.push('execution proof is missing');
  for (const evidence of certificate.evidence) {
    if (evidence.outcome !== 'pass' || evidence.skips !== 0 || evidence.failures !== 0 || evidence.finalization !== 'pass') reasons.push('execution is failed, skipped, unavailable or not finalized');
    requiredPaths.push(evidence.outputPath, evidence.target.verification);
    for (const id of certificate.obligationIds) {
      const obligation = requireObligation(obligationDocument, id);
      if (['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id)) {
        const execution = obligation.execution;
        if (!execution.target || execution.target.identity !== evidence.target.identity || execution.target.profile !== evidence.target.profile || !execution.operations.includes(evidence.command) || JSON.stringify(execution.selection) !== JSON.stringify(evidence.selection) || execution.selection.length === 0) reasons.push(`wrong execution command, selection or target: ${id}`);
      }
    }
    for (const input of evidence.inputs) {
      requiredPaths.push(input.path);
      if (manifest.get(input.path) !== input.digest) reasons.push(`evidence manifest disagrees: ${input.path}`);
    }
  }
  for (const relative of requiredPaths) if (!manifest.has(relative)) reasons.push(`unassessed artifact or evidence input: ${relative}`);
  for (const id of certificate.obligationIds.filter(id => baseline.inventoryIds.includes(id))) {
    const category = requireObligation(obligationDocument, id).category;
    const inventoryIds = baseline.obligationIds.filter(member => requireObligation(obligationDocument, member).category === category && !baseline.inventoryIds.includes(member));
    if (inventoryIds.length !== certificate.inventoryIds.length || inventoryIds.some(member => !certificate.inventoryIds.includes(member))) reasons.push(`incomplete inventory assessment: ${id}`);
    if (certificate.disposition) reasons.push('inventory cannot be closed by unit disposition');
  }
  return reasons;
}

export function freshCertificate(obligationDocument: ObligationDocumentV1, baseline: ObligationBaseline, certificate: ObligationCertificate, root: string): ObligationFreshness {
  const reasons = certificateReasons(obligationDocument, baseline, certificate);
  for (const input of certificate.inputs) {
    try {
      if (inputDigest(root, input.path) !== input.digest) reasons.push(`changed input: ${input.path}`);
    } catch (error) {
      reasons.push(`unavailable input ${input.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { fresh: reasons.length === 0, reasons };
}

function prerequisites(obligation: Obligation, bindings: ReadonlyMap<string, ObligationEffectiveBinding> | undefined): readonly string[] {
  if (bindings === undefined) return obligation.dependsOn;
  const obligationEffectiveBinding = bindings.get(obligation.id);
  requireCondition(obligationEffectiveBinding, `missing effective binding: ${obligation.id}`);
  return obligationEffectiveBinding.dependsOn;
}
function projectBaseline(obligationDocument: ObligationDocumentV1, baseline: ObligationBaseline, accepted: ReadonlySet<string>, root: string | null,
  bindings?: ReadonlyMap<string, ObligationEffectiveBinding>): ObligationProjection {
  const satisfied = new Set<string>();
  const assessments: ObligationAssessment[] = [];
  for (const certificate of obligationDocument.certificates.filter(certificate => accepted.has(certificate.id))) {
    const reasons = root === null ? certificateReasons(obligationDocument, baseline, certificate)
      : freshCertificate(obligationDocument, baseline, certificate, root).reasons;
    assessments.push({ id: certificate.id, valid: reasons.length === 0, reasons });
    if (reasons.length === 0) certificate.obligationIds.forEach(id => satisfied.add(id));
  }
  const obligations = obligationDocument.obligations.filter(obligation => baseline.obligationIds.includes(obligation.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const obligation of obligations) {
      if (satisfied.has(obligation.id) && prerequisites(obligation, bindings).some(id => !satisfied.has(id))) {
        satisfied.delete(obligation.id);
        changed = true;
      }
    }
  }
  const unresolved = obligations.filter(obligation => !satisfied.has(obligation.id));
  const obligationVector = vector(COORDINATES.map(category => unresolved.filter(obligation => obligation.category === category).length));
  const gates = unresolved.filter(obligation => obligation.category === 'gate').map(obligation => obligation.id);
  return { baselineId: baseline.id, vector: obligationVector, satisfiedIds: obligations.filter(obligation => satisfied.has(obligation.id)).map(obligation => obligation.id),
    unresolvedIds: unresolved.map(obligation => obligation.id), gates, assessments,
    complete: obligationVector.every(count => count === 0) && gates.length === 0 };
}
export function projectObligations(obligationDocument: ObligationDocumentV1, root: string): ObligationProjection {
  return projectObligationScope(obligationDocument, root).projection;
}
export function projectObligationScope(obligationDocument: ObligationDocumentV1, root: string,
  obligationBindingHistoryV1?: ObligationBindingHistoryV1): ObligationScopeProjection {
  readObligationDocumentV1(obligationDocument);
  const replay = replayHistory(obligationDocument);
  const bindings = projectObligationBindings(obligationDocument, obligationBindingHistoryV1 === undefined
    ? { schemaVersion: 1, scopeId: obligationDocument.scopeId, revisions: [] } : obligationBindingHistoryV1);
  return { projection: projectBaseline(obligationDocument, replay.baseline, replay.accepted, root, bindings), bindings };
}
export function compareVectors(before: ObligationVector, after: ObligationVector): number {
  vector(before);
  vector(after);
  for (let index = 0; index < 6; index++) {
    const left = before[index];
    const right = after[index];
    requireCondition(left !== undefined && right !== undefined, 'vector must contain six safe nonnegative integers');
    if (left !== right) return Math.sign(right - left);
  }
  return 0;
}
export function selectObligation(obligationDocument: ObligationDocumentV1, root: string,
  obligationBindingHistoryV1?: ObligationBindingHistoryV1): ObligationSelection {
  const obligationScopeProjection = projectObligationScope(obligationDocument, root, obligationBindingHistoryV1);
  const projection = obligationScopeProjection.projection;
  const category = COORDINATES[projection.vector.findIndex(count => count > 0)];
  if (!category) return { category: null, selectedId: null, blockedIds: projection.gates, projection };
  const unresolved = obligationDocument.obligations.filter(obligation => projection.unresolvedIds.includes(obligation.id) && obligation.category === category);
  const eligible = unresolved.filter(obligation => prerequisites(obligation, obligationScopeProjection.bindings).every(id => projection.satisfiedIds.includes(id)));
  return { category, selectedId: eligible[0]?.id ?? null,
    blockedIds: unresolved.filter(obligation => !eligible.includes(obligation)).map(obligation => obligation.id), projection };
}

function checkpointTransition(obligationDocument: ObligationDocumentV1, checkpoint: ObligationCheckpoint, before: ObligationVector, after: ObligationVector, priorCheckpoints: readonly ObligationCheckpoint[]): void {
  requireCondition(compareVectors(checkpoint.before, before) === 0 && compareVectors(checkpoint.after, after) === 0, `checkpoint vectors disagree with derived state: ${checkpoint.id}`);
  const difference = compareVectors(before, after);
  if (checkpoint.kind === 'productive') {
    requireCondition(difference < 0, 'productive checkpoint requires strict lexicographic decrease');
    const category = COORDINATES[before.findIndex(count => count > 0)];
    requireCondition(checkpoint.selectedIds.length > 0 && checkpoint.selectedIds.every(id => requireObligation(obligationDocument, id).category === category), 'productive selection must remain in earliest coordinate');
    requireCondition(checkpoint.preparation === null, 'productive checkpoint cannot be preparation');
  } else if (checkpoint.kind === 'neutral') {
    requireCondition(difference === 0 && checkpoint.preparation !== null && checkpoint.registeredIds.length === 0 && checkpoint.invalidatedIds.length === 0 && checkpoint.certificateIds.every(id => requireCertificate(obligationDocument, id).obligationIds.every(member => requireObligation(obligationDocument, member).category === 'gate')), 'neutral checkpoint requires bounded preparation; only non-metric gates may be certified');
    const preparation = checkpoint.preparation;
    requireCondition(preparation, 'neutral checkpoint requires preparation');
    const obligation = requireObligation(obligationDocument, preparation.obligationId);
    requireCondition(checkpoint.selectedIds.includes(obligation.id) && checkpoint.preparation.operations.every(operation => obligation.execution.operations.includes(operation)), 'preparation exceeds selected execution binding');
    const sinceChange = priorCheckpoints.slice(priorCheckpoints.findLastIndex(previous => previous.kind !== 'neutral') + 1);
    requireCondition(!sinceChange.some(previous => isDeepStrictEqual(previous.preparation, checkpoint.preparation)), 'repeated completed preparation on unchanged state');
  } else {
    requireCondition(checkpoint.preparation === null, 'only neutral checkpoints permit preparation');
    if (checkpoint.kind === 'disturbance') requireCondition(difference >= 0 && (difference > 0 || checkpoint.invalidatedIds.length > 0 || checkpoint.registeredIds.length > 0), 'disturbance must record discovery or invalidation honestly');
  }
}

function replayHistory(obligationDocument: ObligationDocumentV1): ObligationHistory {
  const firstBaseline = obligationDocument.baselines[0];
  requireCondition(firstBaseline, 'a baseline is required');
  let baseline: ObligationBaseline = firstBaseline;
  let membership: string[] = [];
  const accepted = new Set<string>();
  const priorCheckpoints: ObligationCheckpoint[] = [];
  for (const checkpoint of obligationDocument.checkpoints) {
    requireCondition(baseline.authority.assessors.includes(checkpoint.assessor) || checkpoint.kind === 'rebaseline', 'checkpoint assessor lacks authority');
    const before = priorCheckpoints.at(-1)?.after ?? projectBaseline(obligationDocument, { ...baseline, obligationIds: checkpoint.registeredIds }, accepted, null).vector;
    if (checkpoint.kind === 'initial') {
      requireCondition(priorCheckpoints.length === 0 && checkpoint.baselineId === baseline.id && checkpoint.selectedIds.length === 0 && checkpoint.certificateIds.length === 0 && checkpoint.invalidatedIds.length === 0, 'initial checkpoint must only observe first baseline');
      membership = [...checkpoint.registeredIds];
      requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'initial observation must register complete known membership');
    } else if (checkpoint.kind === 'rebaseline') {
      const successor = obligationDocument.baselines.find(item => item.id === checkpoint.baselineId);
      requireCondition(successor, 'unknown checkpoint baseline');
      requireCondition(successor.predecessorId === baseline.id && successor.authority.assessors.includes(checkpoint.assessor), 'rebaseline requires authorized immediate successor');
      baseline = successor;
      membership = [...checkpoint.registeredIds];
      requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'rebaseline must register complete known membership');
    } else {
      requireCondition(priorCheckpoints.length > 0 && checkpoint.baselineId === baseline.id, 'ordinary checkpoint cannot change baseline');
      requireCondition(checkpoint.registeredIds.every(id => !membership.includes(id) && baseline.obligationIds.includes(id)), 'registered IDs must be new members of current baseline');
      membership.push(...checkpoint.registeredIds);
    }
    const effectiveBaseline = { ...baseline, obligationIds: membership };
    const beforeProjection = projectBaseline(obligationDocument, { ...baseline, obligationIds: membership.filter(id => !checkpoint.registeredIds.includes(id)) }, accepted, null);
    if (checkpoint.kind === 'productive' || checkpoint.kind === 'neutral') {
      const category = COORDINATES[before.findIndex(count => count > 0)];
      for (const id of checkpoint.selectedIds) {
        const obligation = requireObligation(obligationDocument, id);
        requireCondition(beforeProjection.unresolvedIds.includes(id) && (obligation.category === category || checkpoint.kind === 'neutral' && obligation.category === 'gate'), 'historical selection must be unresolved in earliest coordinate or a non-metric gate');
        if (checkpoint.kind === 'productive') requireCondition(obligation.dependsOn.every(dependency => beforeProjection.satisfiedIds.includes(dependency)), 'historical selection prerequisites are unresolved');
      }
    }
    for (const id of checkpoint.invalidatedIds) {
      requireCondition(accepted.has(id), 'invalidation must reference accepted certificate');
      accepted.delete(id);
    }
    for (const id of checkpoint.certificateIds) {
      requireCondition(!accepted.has(id), 'certificate must not be accepted twice');
      const certificate = requireCertificate(obligationDocument, id);
      requireCondition(certificate.assessor === checkpoint.assessor && certificateReasons(obligationDocument, effectiveBaseline, certificate).length === 0, `certificate lacks adequate authorized assessment: ${id}`);
      requireCondition(certificate.obligationIds.every(member => checkpoint.selectedIds.includes(member)), 'certificate cannot bypass selected responsibility');
      accepted.add(id);
    }
    const after = projectBaseline(obligationDocument, effectiveBaseline, accepted, null).vector;
    checkpointTransition(obligationDocument, checkpoint, before, after, priorCheckpoints);
    priorCheckpoints.push(checkpoint);
  }
  return { baseline: { ...baseline, obligationIds: priorCheckpoints.length ? membership : baseline.obligationIds }, accepted };
}

function appendOnly(previous: readonly unknown[], candidate: readonly unknown[], label: string): void {
  requireCondition(candidate.length >= previous.length && previous.every((item, index) => isDeepStrictEqual(item, candidate[index])), `${label} accepted prefix must be immutable`);
}
export function acceptCheckpoint(previous: ObligationDocumentV1, candidate: ObligationDocumentV1, root: string): ObligationDocumentV1 {
  readObligationDocumentV1(previous);
  readObligationDocumentV1(candidate);
  requireCondition(candidate.scopeId === previous.scopeId, 'scope identity is immutable');
  appendOnly(previous.obligations, candidate.obligations, 'obligations');
  appendOnly(previous.certificates, candidate.certificates, 'certificates');
  appendOnly(previous.checkpoints, candidate.checkpoints.slice(0, -1), 'checkpoints');
  requireCondition(candidate.checkpoints.length === previous.checkpoints.length + 1, 'accept exactly one checkpoint');
  const checkpoint = candidate.checkpoints.at(-1);
  requireCondition(checkpoint, 'accept exactly one checkpoint');
  requireCondition(candidate.baselines.length >= previous.baselines.length, 'baseline history must be retained');
  for (let index = 0; index < previous.baselines.length; index++) {
    const before = previous.baselines[index];
    requireCondition(before, 'baseline history must be retained');
    const after = candidate.baselines[index];
    requireCondition(after !== undefined, 'baseline history must be retained');
    appendOnly(before.obligationIds, after.obligationIds, 'baseline membership');
    requireCondition(isDeepStrictEqual({ ...before, obligationIds: [] }, { ...after, obligationIds: [] }), 'baseline meaning and authority require a new baseline');
  }
  const before = projectObligations(previous, root);
  const acceptedBefore = previous.checkpoints.at(-1)?.after ?? before.vector;
  if (compareVectors(before.vector, acceptedBefore) !== 0) requireCondition(checkpoint.kind === 'disturbance' || checkpoint.kind === 'rebaseline', 'changed inputs require disturbance before productive work');
  if (checkpoint.kind === 'productive' || checkpoint.kind === 'neutral') {
    const category = COORDINATES[before.vector.findIndex(count => count > 0)];
    for (const id of checkpoint.selectedIds) {
      const obligation = previous.obligations.find(obligation => obligation.id === id);
      requireCondition(obligation && (obligation.category === category || checkpoint.kind === 'neutral' && obligation.category === 'gate') && before.unresolvedIds.includes(id), 'selection must resolve current earliest obligation');
      if (checkpoint.kind === 'productive') requireCondition(obligation.dependsOn.every(dependency => before.satisfiedIds.includes(dependency)), 'selected obligation prerequisites are unresolved');
    }
  }
  const replay = replayHistory(candidate);
  for (const requirement of replay.baseline.requirements) requireCondition(inputDigest(root, requirement.path) === requirement.digest, `requirement meaning changed without activated baseline: ${requirement.id}`);
  for (const id of checkpoint.certificateIds) {
    const certificate = requireCertificate(candidate, id);
    const assessment = freshCertificate(candidate, replay.baseline, certificate, root);
    requireCondition(assessment.fresh, `cannot accept certificate ${id}: ${assessment.reasons.join('; ')}`);
  }
  const after = projectObligations(candidate, root);
  requireCondition(compareVectors(checkpoint.after, after.vector) === 0, 'checkpoint must expose all current stale evidence');
  const currentBaseline = candidate.baselines.at(-1);
  requireCondition(currentBaseline, 'a baseline is required');
  requireCondition(currentBaseline.id === checkpoint.baselineId, 'unaccepted baseline cannot be published');
  requireCondition(currentBaseline.obligationIds.length === replay.baseline.obligationIds.length, 'unregistered obligations cannot be hidden');
  return candidate;
}
export function main(argv: readonly string[]): number {
  const [operation, documentPath, root, ...extra] = argv;
  const [flag, bindingHistoryPath, ...trailing] = extra;
  if (!operation || !['validate', 'status', 'select'].includes(operation) || !documentPath || !root
    || extra.length > 0 && (flag !== '--binding-history' || !bindingHistoryPath || trailing.length > 0)) {
    process.stderr.write('Usage: obligations.js <validate|status|select> <document-path> <repository-root> [--binding-history <relative-path>]\n');
    return 2;
  }
  let text: string;
  let historyText: string | undefined;
  try {
    text = fs.readFileSync(documentPath, 'utf8');
    const repositoryRoot = fs.realpathSync(root);
    if (bindingHistoryPath !== undefined) {
      relativePath(bindingHistoryPath);
      const file = path.join(repositoryRoot, bindingHistoryPath);
      requireCondition(fs.lstatSync(file).isFile() && fs.realpathSync(file) === file, 'binding history must be a regular coordinator file without symlink ancestors');
      historyText = fs.readFileSync(file, 'utf8');
    }
  }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); return 2; }
  try {
    const obligationDocument = parseObligationDocument(text);
    const obligationBindingHistoryV1 = historyText === undefined ? undefined : parseObligationBindingHistory(historyText);
    const result = operation === 'select' ? selectObligation(obligationDocument, root, obligationBindingHistoryV1)
      : projectObligationScope(obligationDocument, root, obligationBindingHistoryV1).projection;
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
