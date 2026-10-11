// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseObligationDocument, readObligationDocumentV1,
  type ObligationBaseline, type ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';
import { acceptObligationBindingRevision, parseObligationBindingHistory, projectObligationBindings, readObligationBindingHistoryV1,
  freezeObligationLease, assertObligationLeaseOperation, readObligationLeaseV1, parseObligationLease, ObligationLeaseReaders,
  type ObligationLeaseRequest, type ObligationLeaseV1, type ObligationBindingHistoryV1, type ObligationBindingRevisionV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';

function leaseRequest(obligationDocumentV1: ObligationDocumentV1): ObligationLeaseRequest {
  const reference = obligationDocumentV1.baselines[0]?.authority.references[0];
  if (!reference) throw new Error('fixture authority missing');
  return { obligationId: 'OBL-83', graphDigest: 'a'.repeat(64), generation: 'generation-1', assessor: 'coordinator', authority: [reference] };
}

// Traceability: verifies REQ-ROLLING-GRAPH
test('frozen lease retains its revision, scope and proof binding across coordinator amendments', () => {
  const obligationDocumentV1 = document();
  const firstObligationBindingRevisionV1 = revision(obligationDocumentV1);
  const firstObligationBindingHistoryV1 = history(obligationDocumentV1, [firstObligationBindingRevisionV1]);
  const obligationLeaseRequest = leaseRequest(obligationDocumentV1);
  const obligationLeaseV1 = freezeObligationLease(obligationDocumentV1, firstObligationBindingHistoryV1, obligationLeaseRequest);
  const original = JSON.stringify(obligationLeaseV1);
  const nextObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...revision(obligationDocumentV1, 'BIND-2', 'OBL-83', 'BIND-1', ['OBL-84']),
    execution: { ...firstObligationBindingRevisionV1.execution, plannedPaths: ['tests/sprint-metadata.test.ts'], selection: ['new proof selection'] } };
  const nextObligationBindingHistoryV1 = history(obligationDocumentV1, [firstObligationBindingRevisionV1, nextObligationBindingRevisionV1]);
  const nextObligationLeaseV1 = freezeObligationLease(obligationDocumentV1, nextObligationBindingHistoryV1, { ...obligationLeaseRequest, generation: 'generation-2', graphDigest: 'b'.repeat(64) });
  assert.equal(obligationLeaseV1.binding.revisionId, 'BIND-1');
  assert.deepEqual(obligationLeaseV1.binding.execution, firstObligationBindingRevisionV1.execution);
  assert.deepEqual(obligationLeaseV1.binding.dependsOn, []);
  assert.equal(JSON.stringify(obligationLeaseV1), original);
  assert.equal(nextObligationLeaseV1.binding.revisionId, 'BIND-2');
  assert.deepEqual(nextObligationLeaseV1.binding.dependsOn, ['OBL-84']);
  assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', ['tests/ready-sprints.test.ts']);
  assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', ['tests/sprint-metadata.test.ts']), /outside frozen lease/);
  assertObligationLeaseOperation(nextObligationLeaseV1, 'generation-2', 'b'.repeat(64), 'edit', ['tests/sprint-metadata.test.ts']);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults', () => {
  const obligationDocumentV1 = document();
  const obligationLeaseRequest = leaseRequest(obligationDocumentV1);
  const obligationLeaseV1 = freezeObligationLease(obligationDocumentV1, history(obligationDocumentV1), obligationLeaseRequest);
  assert.equal(obligationLeaseV1.binding.revisionId, null);
  assert.equal(obligationLeaseV1.baselineId, 'BASELINE-1');
  assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', ['tests/ready-sprints.test.ts']), /operation outside/);
  const invalidObligationLeaseRequests: readonly ObligationLeaseRequest[] = [
    { ...obligationLeaseRequest, assessor: 'worker' }, { ...obligationLeaseRequest, authority: ['foreign'] },
    { ...obligationLeaseRequest, authority: [] }, { ...obligationLeaseRequest, obligationId: 'OBL-9999' }
  ];
  for (const invalidObligationLeaseRequest of invalidObligationLeaseRequests)
    assert.throws(() => freezeObligationLease(obligationDocumentV1, history(obligationDocumentV1), invalidObligationLeaseRequest));
  const obligationBaseline = obligationDocumentV1.baselines[0];
  assert.ok(obligationBaseline);
  const proposedObligationBaseline: ObligationBaseline = { ...obligationBaseline, id: 'BASELINE-2', predecessorId: obligationBaseline.id,
    authority: { references: ['proposed authority'], assessors: ['worker'] } };
  const proposedObligationDocumentV1: ObligationDocumentV1 = { ...obligationDocumentV1, baselines: [...obligationDocumentV1.baselines, proposedObligationBaseline] };
  assert.equal(freezeObligationLease(proposedObligationDocumentV1, history(proposedObligationDocumentV1), obligationLeaseRequest).baselineId, 'BASELINE-1');
  assert.throws(() => freezeObligationLease(proposedObligationDocumentV1, history(proposedObligationDocumentV1), {
    ...obligationLeaseRequest, assessor: 'worker', authority: ['proposed authority'] }), /unauthorized lease issuance/);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('lease use fences graph and generation, operations and exact changed paths', () => {
  const obligationDocumentV1 = document();
  const obligationLeaseV1 = freezeObligationLease(obligationDocumentV1, history(obligationDocumentV1, [revision(obligationDocumentV1)]), leaseRequest(obligationDocumentV1));
  assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-2', 'a'.repeat(64), 'test'), /stale lease generation/);
  assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'b'.repeat(64), 'test'), /frozen graph/);
  assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'publish'), /operation outside/);
  for (const paths of [[], ['../tests/ready-sprints.test.ts'], ['tests/ready-sprints.test.ts.backup'], ['tests/ready-sprints.test.ts', 'tests/ready-sprints.test.ts']])
    assert.throws(() => assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', paths));
  assertObligationLeaseOperation(obligationLeaseV1, 'generation-1', 'a'.repeat(64), 'test');
  const directoryObligationLeaseV1: ObligationLeaseV1 = { ...obligationLeaseV1,
    binding: { ...obligationLeaseV1.binding, execution: { ...obligationLeaseV1.binding.execution, plannedPaths: ['tests'] } } };
  assertObligationLeaseOperation(directoryObligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', ['tests/ready-sprints.test.ts']);
  assert.throws(() => assertObligationLeaseOperation(directoryObligationLeaseV1, 'generation-1', 'a'.repeat(64), 'edit', ['tests-other/test.ts']));
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission', () => {
  const obligationDocumentV1 = document();
  const obligationLeaseV1 = freezeObligationLease(obligationDocumentV1, history(obligationDocumentV1, [revision(obligationDocumentV1)]), leaseRequest(obligationDocumentV1));
  const input: unknown = JSON.parse(JSON.stringify(obligationLeaseV1));
  assert.deepEqual(readObligationLeaseV1(input), obligationLeaseV1);
  assert.deepEqual(parseObligationLease(JSON.stringify(obligationLeaseV1)), obligationLeaseV1);
  assert.throws(() => parseObligationLease(JSON.stringify(obligationLeaseV1).replace('"schemaVersion":1', '"schemaVersion":1.0')), /exact version integer/);
  assert.deepEqual(Object.keys(ObligationLeaseReaders), ['V1']);
  const invalidInputs: readonly unknown[] = [ { ...obligationLeaseV1, schemaVersion: 2 }, { ...obligationLeaseV1, extra: true },
    { ...obligationLeaseV1, graphDigest: 'invalid' }, { ...obligationLeaseV1, generation: '' }, { ...obligationLeaseV1, authority: [] },
    { ...obligationLeaseV1, binding: { ...obligationLeaseV1.binding, obligationId: 'invalid' } },
    { ...obligationLeaseV1, binding: { ...obligationLeaseV1.binding, dependsOn: ['OBL-83'] } },
    { ...obligationLeaseV1, binding: { ...obligationLeaseV1.binding, execution: { ...obligationLeaseV1.binding.execution, plannedPaths: [] } } }
  ];
  for (const invalidInput of invalidInputs) assert.throws(() => readObligationLeaseV1(invalidInput));
});

function document(): ObligationDocumentV1 {
  const root = path.join(__dirname, '..', '..');
  const originalObligationDocumentV1 = parseObligationDocument(fs.readFileSync(path.join(root,
    'pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json'), 'utf8'));
  const obligationBaseline = originalObligationDocumentV1.baselines.at(-1);
  if (!obligationBaseline) throw new Error('fixture baseline missing');
  return readObligationDocumentV1({ ...originalObligationDocumentV1,
    baselines: [{ ...obligationBaseline, id: 'BASELINE-1', predecessorId: null }], certificates: [], checkpoints: [] });
}
function revision(obligationDocumentV1: ObligationDocumentV1, id = 'BIND-1', obligationId = 'OBL-83', predecessorId: string | null = null,
  dependsOn: readonly string[] = []): ObligationBindingRevisionV1 {
  const obligationBaseline = obligationDocumentV1.baselines[0];
  const reference = obligationBaseline?.authority.references[0];
  if (!obligationBaseline || !reference) throw new Error('fixture authority missing');
  return { id, obligationId, predecessorId, baselineId: obligationBaseline.id, assessor: 'coordinator', authority: [reference],
    reason: 'Bound an existing outcome to its typed regression migration', dependsOn,
    execution: { sprintId: null, taskletIds: [], plannedPaths: ['tests/ready-sprints.test.ts'], operations: ['edit', 'test', 'check', 'assess'],
      selection: ['typed sprint regression proof'], target: { identity: 'ponytail-local-checkout', profile: 'portable-operation-inventory' } } };
}
function history(obligationDocumentV1: ObligationDocumentV1, revisions: readonly ObligationBindingRevisionV1[] = []): ObligationBindingHistoryV1 {
  return { schemaVersion: 1, scopeId: obligationDocumentV1.scopeId, revisions };
}

// Traceability: verifies REQ-ROLLING-GRAPH
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('binding amendment preserves obligation identities, historical content and earlier projected permissions', () => {
  const obligationDocumentV1 = document();
  const original = JSON.stringify(obligationDocumentV1);
  const previousObligationBindingHistoryV1 = history(obligationDocumentV1);
  const firstObligationBindingRevisionV1 = revision(obligationDocumentV1);
  const firstObligationBindingHistoryV1 = acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1,
    history(obligationDocumentV1, [firstObligationBindingRevisionV1]), null);
  const firstProjection = projectObligationBindings(obligationDocumentV1, firstObligationBindingHistoryV1);
  const frozen = firstProjection.get('OBL-83');
  assert.ok(frozen);
  assert.deepEqual(frozen.execution.operations, ['edit', 'test', 'check', 'assess']);
  assert.deepEqual([...firstProjection.keys()], obligationDocumentV1.baselines[0]?.obligationIds);
  const earlierHistory = JSON.stringify(firstObligationBindingHistoryV1);
  const secondObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...revision(obligationDocumentV1, 'BIND-2', 'OBL-83', 'BIND-1', ['OBL-84']),
    execution: { ...firstObligationBindingRevisionV1.execution, plannedPaths: ['tests/sprint-metadata.test.ts'] } };
  const secondObligationBindingHistoryV1 = acceptObligationBindingRevision(obligationDocumentV1, firstObligationBindingHistoryV1,
    history(obligationDocumentV1, [firstObligationBindingRevisionV1, secondObligationBindingRevisionV1]), 'BIND-1');
  const secondProjection = projectObligationBindings(obligationDocumentV1, secondObligationBindingHistoryV1);
  assert.equal(secondProjection.get('OBL-83')?.revisionId, 'BIND-2');
  assert.deepEqual(secondProjection.get('OBL-83')?.dependsOn, ['OBL-84']);
  assert.deepEqual(secondProjection.get('OBL-83')?.execution.plannedPaths, ['tests/sprint-metadata.test.ts']);
  assert.deepEqual(frozen.execution.plannedPaths, ['tests/ready-sprints.test.ts']);
  assert.equal(JSON.stringify(firstObligationBindingHistoryV1), earlierHistory);
  assert.equal(JSON.stringify(obligationDocumentV1), original);
  assert.equal(secondProjection.size, firstProjection.size);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('amendment fences both global and per-obligation predecessors and the immutable accepted prefix', () => {
  const obligationDocumentV1 = document();
  const firstObligationBindingRevisionV1 = revision(obligationDocumentV1);
  const previousObligationBindingHistoryV1 = history(obligationDocumentV1, [firstObligationBindingRevisionV1]);
  const nextObligationBindingRevisionV1 = revision(obligationDocumentV1, 'BIND-2', 'OBL-84');
  const candidateObligationBindingHistoryV1 = history(obligationDocumentV1, [firstObligationBindingRevisionV1, nextObligationBindingRevisionV1]);
  assert.throws(() => acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1, candidateObligationBindingHistoryV1, null), /stale history predecessor/);
  const rewrittenObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1, reason: 'rewritten accepted reason' };
  assert.throws(() => acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1,
    history(obligationDocumentV1, [rewrittenObligationBindingRevisionV1, nextObligationBindingRevisionV1]), 'BIND-1'), /prefix is immutable/);
  const staleObligationBindingRevisionV1 = revision(obligationDocumentV1, 'BIND-2', 'OBL-83', null, ['OBL-84']);
  assert.throws(() => acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1,
    history(obligationDocumentV1, [firstObligationBindingRevisionV1, staleObligationBindingRevisionV1]), 'BIND-1'), /stale obligation predecessor/);
  const thirdObligationBindingRevisionV1 = revision(obligationDocumentV1, 'BIND-3', 'OBL-85');
  assert.throws(() => acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1,
    history(obligationDocumentV1, [firstObligationBindingRevisionV1, nextObligationBindingRevisionV1, thirdObligationBindingRevisionV1]), 'BIND-1'), /append exactly one/);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles', () => {
  const obligationDocumentV1 = document();
  const obligationBindingRevisionV1 = revision(obligationDocumentV1);
  const invalidRevisions: readonly ObligationBindingRevisionV1[] = [
    { ...obligationBindingRevisionV1, assessor: 'worker' },
    { ...obligationBindingRevisionV1, authority: ['undeclared authority'] },
    { ...obligationBindingRevisionV1, obligationId: 'OBL-9999' },
    { ...obligationBindingRevisionV1, dependsOn: ['OBL-9999'] },
    { ...obligationBindingRevisionV1, dependsOn: ['OBL-83'] },
    { ...obligationBindingRevisionV1, baselineId: 'BASELINE-999' },
  ];
  for (const invalidObligationBindingRevisionV1 of invalidRevisions) assert.throws(() =>
    acceptObligationBindingRevision(obligationDocumentV1, history(obligationDocumentV1), history(obligationDocumentV1, [invalidObligationBindingRevisionV1]), null));
  assert.throws(() => projectObligationBindings(obligationDocumentV1, { ...history(obligationDocumentV1), scopeId: 'another project' }), /scope mismatch/);
  const firstObligationBindingRevisionV1 = revision(obligationDocumentV1, 'BIND-1', 'OBL-83', null, ['OBL-84']);
  const secondObligationBindingRevisionV1 = revision(obligationDocumentV1, 'BIND-2', 'OBL-84', null, ['OBL-83']);
  assert.throws(() => projectObligationBindings(obligationDocumentV1, history(obligationDocumentV1,
    [firstObligationBindingRevisionV1, secondObligationBindingRevisionV1])), /cyclic prerequisite/);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution', () => {
  const obligationDocumentV1 = document();
  const obligationBindingRevisionV1 = revision(obligationDocumentV1);
  const obligationBindingHistoryV1 = history(obligationDocumentV1, [obligationBindingRevisionV1]);
  assert.deepEqual(parseObligationBindingHistory(JSON.stringify(obligationBindingHistoryV1)), obligationBindingHistoryV1);
  const invalidExecutions: readonly unknown[] = [
    { ...obligationBindingRevisionV1.execution, plannedPaths: [] },
    { ...obligationBindingRevisionV1.execution, plannedPaths: ['../escape'] },
    { ...obligationBindingRevisionV1.execution, plannedPaths: ['tests/*.ts'] },
    { ...obligationBindingRevisionV1.execution, taskletIds: ['S02-F01-T01'], sprintId: 'S01' },
    { ...obligationBindingRevisionV1.execution, operations: [] },
    { ...obligationBindingRevisionV1.execution, target: { identity: 'fixture' } },
    { ...obligationBindingRevisionV1.execution, selection: ['proof', 'proof'] },
  ];
  for (const execution of invalidExecutions) assert.throws(() => readObligationBindingHistoryV1({
    ...obligationBindingHistoryV1, revisions: [{ ...obligationBindingRevisionV1, execution }] }));
  assert.throws(() => parseObligationBindingHistory(JSON.stringify(obligationBindingHistoryV1).replace('"schemaVersion":1', '"schemaVersion":1.0')), /exact version integer/);
  assert.throws(() => readObligationBindingHistoryV1({ ...obligationBindingHistoryV1, schemaVersion: 2 }), /unsupported history/);
  assert.throws(() => readObligationBindingHistoryV1({ ...obligationBindingHistoryV1, extra: true }), /physical record keys/);
  assert.throws(() => readObligationBindingHistoryV1({ ...obligationBindingHistoryV1, revisions: [obligationBindingRevisionV1, obligationBindingRevisionV1] }), /duplicate revision/);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth', () => {
  const obligationDocumentV1 = document();
  const defaultProjection = projectObligationBindings(obligationDocumentV1, history(obligationDocumentV1));
  assert.equal(defaultProjection.get('OBL-83')?.revisionId, null);
  assert.deepEqual(defaultProjection.get('OBL-83')?.execution.operations, ['inspect']);
  const firstObligationBindingRevisionV1 = revision(obligationDocumentV1);
  const firstObligationBindingHistoryV1 = history(obligationDocumentV1, [firstObligationBindingRevisionV1]);
  const prefixProjection = projectObligationBindings(obligationDocumentV1, firstObligationBindingHistoryV1);
  const secondObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1, id: 'BIND-2', predecessorId: 'BIND-1' };
  assert.throws(() => acceptObligationBindingRevision(obligationDocumentV1, firstObligationBindingHistoryV1,
    history(obligationDocumentV1, [firstObligationBindingRevisionV1, secondObligationBindingRevisionV1]), 'BIND-1'), /does not change/);
  assert.deepEqual(projectObligationBindings(obligationDocumentV1, history(obligationDocumentV1)), defaultProjection);
  assert.deepEqual(projectObligationBindings(obligationDocumentV1, firstObligationBindingHistoryV1), prefixProjection);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal', () => {
  const originalObligationDocumentV1 = document();
  const firstObligationBaseline = originalObligationDocumentV1.baselines[0];
  if (!firstObligationBaseline) throw new Error('fixture baseline missing');
  const proposedObligationBaseline = { ...firstObligationBaseline, id: 'BASELINE-2', predecessorId: firstObligationBaseline.id };
  const proposedObligationDocumentV1 = readObligationDocumentV1({ ...originalObligationDocumentV1,
    baselines: [firstObligationBaseline, proposedObligationBaseline] });
  const firstObligationBindingRevisionV1 = revision(originalObligationDocumentV1);
  const proposedObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1, baselineId: proposedObligationBaseline.id };
  assert.throws(() => projectObligationBindings(proposedObligationDocumentV1,
    history(originalObligationDocumentV1, [proposedObligationBindingRevisionV1])), /baseline has not been accepted/);
  const acceptedObligationDocumentV1 = readObligationDocumentV1({ ...proposedObligationDocumentV1, checkpoints: [
    { id: 'CP-1', predecessorId: null, baselineId: firstObligationBaseline.id, kind: 'initial', selectedIds: [],
      registeredIds: firstObligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [], before: [2, 2, 2, 2, 2, 2], after: [2, 2, 2, 2, 2, 2],
      preparation: null, reason: 'fixture starting scope', assessor: 'coordinator' },
    { id: 'CP-2', predecessorId: 'CP-1', baselineId: proposedObligationBaseline.id, kind: 'rebaseline', selectedIds: [],
      registeredIds: proposedObligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [], before: [2, 2, 2, 2, 2, 2], after: [2, 2, 2, 2, 2, 2],
      preparation: null, reason: 'fixture successor scope', assessor: 'coordinator' },
  ] });
  assert.throws(() => acceptObligationBindingRevision(acceptedObligationDocumentV1,
    history(acceptedObligationDocumentV1), history(acceptedObligationDocumentV1, [firstObligationBindingRevisionV1]), null), /current accepted baseline/);
  const acceptedObligationBindingHistoryV1 = acceptObligationBindingRevision(acceptedObligationDocumentV1,
    history(acceptedObligationDocumentV1), history(acceptedObligationDocumentV1, [proposedObligationBindingRevisionV1]), null);
  assert.equal(projectObligationBindings(acceptedObligationDocumentV1, acceptedObligationBindingHistoryV1).get('OBL-83')?.revisionId, 'BIND-1');
});
