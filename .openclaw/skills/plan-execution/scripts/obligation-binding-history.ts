// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'lossless-json';
import { readObligationDocumentV1, readObligationExecution,
  type ObligationBaseline, type ObligationDocumentV1, type ObligationExecution } from './obligations.js';

export interface ObligationBindingRevisionV1 {
  readonly id: string;
  readonly obligationId: string;
  readonly predecessorId: string | null;
  readonly baselineId: string;
  readonly assessor: string;
  readonly authority: readonly string[];
  readonly reason: string;
  readonly dependsOn: readonly string[];
  readonly execution: ObligationExecution;
}
export interface ObligationBindingHistoryV1 {
  readonly schemaVersion: 1;
  readonly scopeId: string;
  readonly revisions: readonly ObligationBindingRevisionV1[];
}
export interface ObligationEffectiveBinding {
  readonly obligationId: string;
  readonly revisionId: string | null;
  readonly dependsOn: readonly string[];
  readonly execution: ObligationExecution;
}

function requireBinding(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`obligation binding: ${message}`);
}
function exactRecord(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  requireBinding(value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value: unknown): string {
  requireBinding(typeof value === 'string' && value.trim().length > 0, 'expected nonempty string');
  return value;
}
function uniqueTexts(value: unknown, nonempty = false): readonly string[] {
  requireBinding(Array.isArray(value), 'expected string array');
  const strings = value.map(text);
  requireBinding(new Set(strings).size === strings.length && (!nonempty || strings.length > 0), 'expected unique string values');
  return strings;
}
function readObligationBindingRevisionV1(value: unknown): ObligationBindingRevisionV1 {
  exactRecord(value, ['id', 'obligationId', 'predecessorId', 'baselineId', 'assessor', 'authority', 'reason', 'dependsOn', 'execution']);
  const obligationExecution = readObligationExecution(value.execution);
  requireBinding(!obligationExecution.operations.includes('edit') || obligationExecution.plannedPaths.length > 0, 'edit permission requires exact planned paths');
  return { id: text(value.id), obligationId: text(value.obligationId), predecessorId: value.predecessorId === null ? null : text(value.predecessorId),
    baselineId: text(value.baselineId), assessor: text(value.assessor), authority: uniqueTexts(value.authority, true), reason: text(value.reason),
    dependsOn: uniqueTexts(value.dependsOn), execution: obligationExecution };
}
function isObligationBindingHistoryV1(value: unknown): value is ObligationBindingHistoryV1 {
  exactRecord(value, ['schemaVersion', 'scopeId', 'revisions']);
  requireBinding(value.schemaVersion === 1 && Array.isArray(value.revisions), 'unsupported history schemaVersion');
  text(value.scopeId);
  const revisions = value.revisions.map(readObligationBindingRevisionV1);
  requireBinding(new Set(revisions.map(revision => revision.id)).size === revisions.length, 'duplicate revision identity');
  return true;
}
export function readObligationBindingHistoryV1(value: unknown): ObligationBindingHistoryV1 {
  requireBinding(isObligationBindingHistoryV1(value), 'invalid history V1');
  return { schemaVersion: 1, scopeId: value.scopeId, revisions: value.revisions.map(readObligationBindingRevisionV1) };
}
export const ObligationBindingHistoryReaders = { V1: readObligationBindingHistoryV1 };

export function parseObligationBindingHistory(text: string): ObligationBindingHistoryV1 {
  return readObligationBindingHistoryV1(parse(text, null, token => {
    requireBinding(token === '1', 'history only permits its exact version integer');
    return 1;
  }));
}
function currentBaseline(obligationDocumentV1: ObligationDocumentV1): ObligationBaseline {
  const baselineId = obligationDocumentV1.checkpoints.at(-1)?.baselineId ?? obligationDocumentV1.baselines[0]?.id;
  const obligationBaseline = obligationDocumentV1.baselines.find(baseline => baseline.id === baselineId);
  requireBinding(obligationBaseline, 'missing accepted baseline');
  return obligationBaseline;
}
function validateGraph(obligationBaseline: ObligationBaseline, bindings: ReadonlyMap<string, ObligationEffectiveBinding>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const members = new Set(obligationBaseline.obligationIds);
  function visit(id: string): void {
    requireBinding(members.has(id), `prerequisite outside accepted baseline: ${id}`);
    requireBinding(!visiting.has(id), `cyclic prerequisite: ${id}`);
    if (visited.has(id)) return;
    const obligationEffectiveBinding = bindings.get(id);
    requireBinding(obligationEffectiveBinding, `unknown obligation: ${id}`);
    visiting.add(id);
    obligationEffectiveBinding.dependsOn.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  obligationBaseline.obligationIds.forEach(visit);
}
export function projectObligationBindings(obligationDocumentV1: ObligationDocumentV1, obligationBindingHistoryV1: ObligationBindingHistoryV1): ReadonlyMap<string, ObligationEffectiveBinding> {
  readObligationDocumentV1(obligationDocumentV1);
  const checkedObligationBindingHistoryV1 = readObligationBindingHistoryV1(obligationBindingHistoryV1);
  requireBinding(checkedObligationBindingHistoryV1.scopeId === obligationDocumentV1.scopeId, 'scope mismatch');
  const bindings = new Map<string, ObligationEffectiveBinding>(obligationDocumentV1.obligations.map(obligation => [obligation.id,
    { obligationId: obligation.id, revisionId: null, dependsOn: obligation.dependsOn, execution: obligation.execution }]));
  const acceptedBaselineIds = new Set(obligationDocumentV1.checkpoints.map(checkpoint => checkpoint.baselineId));
  if (acceptedBaselineIds.size === 0) acceptedBaselineIds.add(currentBaseline(obligationDocumentV1).id);
  for (const obligationBindingRevisionV1 of checkedObligationBindingHistoryV1.revisions) {
    const obligationBaseline = obligationDocumentV1.baselines.find(baseline => baseline.id === obligationBindingRevisionV1.baselineId);
    requireBinding(obligationBaseline && acceptedBaselineIds.has(obligationBaseline.id), 'revision baseline has not been accepted');
    requireBinding(obligationBaseline.authority.assessors.includes(obligationBindingRevisionV1.assessor)
      && obligationBindingRevisionV1.authority.every(reference => obligationBaseline.authority.references.includes(reference)), 'unauthorized revision');
    requireBinding(obligationBaseline.obligationIds.includes(obligationBindingRevisionV1.obligationId), 'revision obligation outside accepted baseline');
    const priorObligationEffectiveBinding = bindings.get(obligationBindingRevisionV1.obligationId);
    requireBinding(priorObligationEffectiveBinding && priorObligationEffectiveBinding.revisionId === obligationBindingRevisionV1.predecessorId, 'stale obligation predecessor');
    requireBinding(!isDeepStrictEqual(priorObligationEffectiveBinding.dependsOn, obligationBindingRevisionV1.dependsOn)
      || !isDeepStrictEqual(priorObligationEffectiveBinding.execution, obligationBindingRevisionV1.execution), 'revision does not change the binding');
    bindings.set(obligationBindingRevisionV1.obligationId, { obligationId: obligationBindingRevisionV1.obligationId, revisionId: obligationBindingRevisionV1.id,
      dependsOn: obligationBindingRevisionV1.dependsOn, execution: obligationBindingRevisionV1.execution });
    validateGraph(obligationBaseline, bindings);
  }
  const obligationBaseline = currentBaseline(obligationDocumentV1);
  validateGraph(obligationBaseline, bindings);
  return new Map(obligationBaseline.obligationIds.map(id => {
    const obligationEffectiveBinding = bindings.get(id);
    requireBinding(obligationEffectiveBinding, `unknown obligation: ${id}`);
    return [id, obligationEffectiveBinding];
  }));
}
export function acceptObligationBindingRevision(obligationDocumentV1: ObligationDocumentV1, previousObligationBindingHistoryV1: ObligationBindingHistoryV1,
  candidateObligationBindingHistoryV1: ObligationBindingHistoryV1, expectedPredecessorId: string | null): ObligationBindingHistoryV1 {
  projectObligationBindings(obligationDocumentV1, previousObligationBindingHistoryV1);
  const checkedObligationBindingHistoryV1 = readObligationBindingHistoryV1(candidateObligationBindingHistoryV1);
  requireBinding((previousObligationBindingHistoryV1.revisions.at(-1)?.id ?? null) === expectedPredecessorId, 'stale history predecessor');
  requireBinding(checkedObligationBindingHistoryV1.revisions.length === previousObligationBindingHistoryV1.revisions.length + 1
    && previousObligationBindingHistoryV1.revisions.every((revision, index) => isDeepStrictEqual(revision, checkedObligationBindingHistoryV1.revisions[index])), 'accepted history prefix is immutable; append exactly one revision');
  const obligationBindingRevisionV1 = checkedObligationBindingHistoryV1.revisions.at(-1);
  requireBinding(obligationBindingRevisionV1 && obligationBindingRevisionV1.baselineId === currentBaseline(obligationDocumentV1).id, 'new revision requires current accepted baseline');
  projectObligationBindings(obligationDocumentV1, checkedObligationBindingHistoryV1);
  return checkedObligationBindingHistoryV1;
}
