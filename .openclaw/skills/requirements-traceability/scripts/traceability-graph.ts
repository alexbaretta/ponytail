// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

export type TraceabilityGraphKind = 'requirement' | 'obligation' | 'acceptance' | 'unit-test' | 'integration-test' | 'implementation';
export interface TraceabilityGraphEntity {
 readonly id: string;
 readonly kind: TraceabilityGraphKind;
 readonly path: string;
 readonly line: number;
}
export interface TraceabilityGraphRelationship {
 readonly source: string;
 readonly target: string;
 readonly role: 'decomposes' | 'verifies' | 'implements';
}
export interface TraceabilityGraph {
 readonly entities: readonly TraceabilityGraphEntity[];
 readonly relationships: readonly TraceabilityGraphRelationship[];
}
export interface TraceabilityGraphFinding {
 readonly code: 'duplicate-id' | 'dangling-source' | 'dangling-target' | 'invalid-edge' | 'missing-parent' | 'missing-obligation' | 'missing-acceptance' | 'missing-test' | 'missing-implementation';
 readonly id: string;
 readonly path: string | null;
 readonly line: number | null;
 readonly message: string;
}

// Traceability: implements OBL-CM-GRAPH from implementation scopeTraceabilityGraph
// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation scopeTraceabilityGraph
export function scopeTraceabilityGraph(traceabilityGraph: TraceabilityGraph, requirementIds: readonly string[]): TraceabilityGraph {
 if (requirementIds.length === 0) throw new Error('Traceability requirement scope must not be empty');
 const selected = new Set(requirementIds);
 if (selected.size !== requirementIds.length) throw new Error('Traceability requirement scope contains duplicate IDs');
 const unresolved = validateTraceabilityGraph(traceabilityGraph).filter(finding =>
  finding.code === 'missing-parent' || !finding.code.startsWith('missing-'));
 if (unresolved.length) throw new Error(`Cannot scope an ambiguous graph: ${unresolved.map(finding => finding.message).join('; ')}`);
 const entities = new Map(traceabilityGraph.entities.map(entity => [entity.id,entity]));
 for (const id of selected) {
  if (entities.get(id)?.kind !== 'requirement') throw new Error(`Traceability scope does not identify a declared requirement: ${id}`);
 }
 const sourcesByTarget = new Map<string,string[]>();
 for (const relationship of traceabilityGraph.relationships) {
  const sources = sourcesByTarget.get(relationship.target) ?? [];
  sources.push(relationship.source);
  sourcesByTarget.set(relationship.target,sources);
 }
 const pending = [...selected];
 for (const target of pending) {
  for (const source of sourcesByTarget.get(target) ?? []) {
   if (!selected.has(source)) { selected.add(source); pending.push(source); }
  }
 }
 return {
  entities:traceabilityGraph.entities.filter(entity => selected.has(entity.id)),
  relationships:traceabilityGraph.relationships.filter(relationship => selected.has(relationship.source) && selected.has(relationship.target)),
 };
}

// Traceability: implements OBL-CM-GRAPH from implementation validateTraceabilityGraph
// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation validateTraceabilityGraph
export function validateTraceabilityGraph(traceabilityGraph: TraceabilityGraph): readonly TraceabilityGraphFinding[] {
 const findings: TraceabilityGraphFinding[] = [];
 const entities = new Map<string, TraceabilityGraphEntity>();
 const duplicates = new Set<string>();
 const incoming = new Map<string, Set<TraceabilityGraphKind>>();
 const outgoing = new Set<string>();
 const report = (code: TraceabilityGraphFinding['code'], id: string, message: string): void => {
  const traceabilityGraphEntity = entities.get(id);
  findings.push({code, id, path: traceabilityGraphEntity?.path ?? null, line: traceabilityGraphEntity?.line ?? null, message});
 };
 const orderedEntities = [...traceabilityGraph.entities].sort((left, right) => {
  const leftKey = JSON.stringify([left.id, left.path, left.line, left.kind]);
  const rightKey = JSON.stringify([right.id, right.path, right.line, right.kind]);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
 });
 for (const traceabilityGraphEntity of orderedEntities) {
  if (entities.has(traceabilityGraphEntity.id)) duplicates.add(traceabilityGraphEntity.id);
  else entities.set(traceabilityGraphEntity.id, traceabilityGraphEntity);
 }
 for (const id of duplicates) report('duplicate-id', id, `Identity ${id} has multiple declarations`);

 for (const traceabilityGraphRelationship of traceabilityGraph.relationships) {
  const sourceTraceabilityGraphEntity = entities.get(traceabilityGraphRelationship.source);
  const targetTraceabilityGraphEntity = entities.get(traceabilityGraphRelationship.target);
  if (!sourceTraceabilityGraphEntity) report('dangling-source', traceabilityGraphRelationship.source, `Unknown source of relationship to ${traceabilityGraphRelationship.target}`);
  if (!targetTraceabilityGraphEntity) report('dangling-target', traceabilityGraphRelationship.source, `Unknown target ${traceabilityGraphRelationship.target}`);
  if (!sourceTraceabilityGraphEntity || !targetTraceabilityGraphEntity) continue;
  if (duplicates.has(sourceTraceabilityGraphEntity.id) || duplicates.has(targetTraceabilityGraphEntity.id)) continue;
  const {role} = traceabilityGraphRelationship;
  const sourceKind = sourceTraceabilityGraphEntity.kind;
  const targetKind = targetTraceabilityGraphEntity.kind;
  const valid = sourceKind === 'obligation' && role === 'decomposes' && targetKind === 'requirement'
   || sourceKind === 'acceptance' && role === 'verifies' && targetKind === 'obligation'
   || (sourceKind === 'unit-test' || sourceKind === 'integration-test') && role === 'verifies' && targetKind === 'acceptance'
   || sourceKind === 'implementation' && role === 'implements' && targetKind === 'obligation';
  if (!valid) {
   report('invalid-edge', sourceTraceabilityGraphEntity.id, `Invalid ${sourceKind} ${role} ${targetKind} relationship to ${targetTraceabilityGraphEntity.id}`);
   continue;
  }
  outgoing.add(sourceTraceabilityGraphEntity.id);
  const kinds = incoming.get(targetTraceabilityGraphEntity.id) ?? new Set<TraceabilityGraphKind>();
  kinds.add(sourceKind);
  incoming.set(targetTraceabilityGraphEntity.id, kinds);
 }

 for (const traceabilityGraphEntity of entities.values()) {
  const {id, kind} = traceabilityGraphEntity;
  if (duplicates.has(id)) continue;
  const kinds = incoming.get(id);
  if (kind !== 'requirement' && !outgoing.has(id)) report('missing-parent', id, `${kind} ${id} has no valid outgoing traceability relationship`);
  switch (kind) {
   case 'requirement':
    if (!kinds?.has('obligation')) report('missing-obligation', id, `Requirement ${id} has no declared obligation`);
    break;
   case 'obligation':
    if (!kinds?.has('acceptance')) report('missing-acceptance', id, `Obligation ${id} has no acceptance`);
    if (!kinds?.has('implementation')) report('missing-implementation', id, `Obligation ${id} has no implementation block`);
    break;
   case 'acceptance':
    if (!kinds?.has('unit-test') && !kinds?.has('integration-test')) report('missing-test', id, `Acceptance ${id} has no executable test`);
    break;
   case 'unit-test':
   case 'integration-test':
   case 'implementation':
    break;
  }
 }
 return findings.sort((left, right) => {
  const leftKey = JSON.stringify([left.path, left.line, left.id, left.code, left.message]);
  const rightKey = JSON.stringify([right.path, right.line, right.id, right.code, right.message]);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
 });
}
