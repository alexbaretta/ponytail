// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import manifest from '../versioned-data-contracts.json';
import { readObligationDocumentV1, parseObligationDocument, inputDigest, freshCertificate, projectObligations,
 compareVectors, selectObligation, acceptCheckpoint, ObligationDocumentReaders, type ObligationDocumentV1,
 type Obligation, type ObligationCoordinate, type ObligationCertificate, type ObligationCheckpoint,
 type ObligationBaseline, type ObligationEvidence, type ObligationVector } from '../skills/plan-execution/scripts/obligations.js';

function document(requirementDigest = 'a'.repeat(64)): ObligationDocumentV1 {
 const categories: readonly ObligationCoordinate[] = ['T1','T2','T3','T4','C1','C2'];
 return { schemaVersion: 1, scopeId: 'pilot', baselines: [{ id: 'B1', predecessorId: null,
  authority: { references: ['approved-CHNG'], assessors: ['coordinator'] },
  requirements: [{ id: 'REQ-TEST', path: 'requirement.md', digest: requirementDigest }],
  obligationIds: ['OBL-1','OBL-2','OBL-3','OBL-4','OBL-5','OBL-6'], inventoryIds: ['OBL-1','OBL-2','OBL-3','OBL-4','OBL-5','OBL-6'] }],
  obligations: categories.map((category, index) => ({ id: `OBL-${index + 1}`, category, requirementIds: ['REQ-TEST'],
   responsibilityId: `${category}-inventory`, condition: `Inventory ${category} responsibilities`,
   criterion: 'Inspected sources, justified exclusions and complete enumeration', dependsOn: [], acceptanceGroups: ['pilot'], supersedes: null,
   execution: { sprintId: null, taskletIds: [], plannedPaths: [], operations: ['inspect'], selection: [], target: null } })), certificates: [], checkpoints: [] };
}
function baseline(obligationDocumentV1: ObligationDocumentV1): ObligationBaseline {
 const obligationBaseline = obligationDocumentV1.baselines.at(-1);
 assert.ok(obligationBaseline);
 return obligationBaseline;
}
function obligation(obligationDocumentV1: ObligationDocumentV1, id: string): Obligation {
 const result = obligationDocumentV1.obligations.find(item => item.id === id);
 assert.ok(result);
 return result;
}
function updateObligation(obligationDocumentV1: ObligationDocumentV1, id: string, change: (obligation: Obligation) => Obligation): ObligationDocumentV1 {
 return { ...obligationDocumentV1, obligations: obligationDocumentV1.obligations.map(item => item.id === id ? change(item) : item) };
}
function updateBaseline(obligationDocumentV1: ObligationDocumentV1, change: (obligationBaseline: ObligationBaseline) => ObligationBaseline): ObligationDocumentV1 {
 return { ...obligationDocumentV1, baselines: obligationDocumentV1.baselines.map(item => item.id === baseline(obligationDocumentV1).id ? change(item) : item) };
}
function updateCheckpoint(obligationDocumentV1: ObligationDocumentV1, change: (obligationCheckpoint: ObligationCheckpoint) => ObligationCheckpoint): ObligationDocumentV1 {
 assert.ok(obligationDocumentV1.checkpoints.length > 0);
 return { ...obligationDocumentV1, checkpoints: obligationDocumentV1.checkpoints.map((item, index) => index === obligationDocumentV1.checkpoints.length - 1 ? change(item) : item) };
}
interface ObligationAssessmentFixture { readonly root: string; readonly obligationDocumentV1: ObligationDocumentV1; readonly obligationCertificate: ObligationCertificate }
function assessedFixture(testContext: TestContext): ObligationAssessmentFixture {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-obligations-'));
 testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
 fs.writeFileSync(path.join(root, 'requirement.md'), 'approved behavior');
 fs.writeFileSync(path.join(root, 'proof.txt'), 'inspected complete inventory');
 const obligationDocumentV1: ObligationDocumentV1 = document(inputDigest(root, 'requirement.md'));
 const obligationCertificate: ObligationCertificate = { id: 'CERT-1', obligationIds: ['OBL-1'],
  inputs: ['requirement.md','proof.txt'].map(relative => ({ path: relative, digest: inputDigest(root, relative) })),
  artifacts: ['proof.txt'], assessor: 'coordinator', authority: ['approved-CHNG'], adequate: true,
  reason: 'Complete inspected category with justified exclusions', disposition: null, evidence: [], inventoryIds: [] };
 return { root, obligationDocumentV1, obligationCertificate };
}
function initialObservation(obligationDocumentV1: ObligationDocumentV1, root: string): ObligationDocumentV1 {
 const vector = projectObligations(obligationDocumentV1, root).vector;
 const obligationCheckpoint: ObligationCheckpoint = { id: 'CP1', predecessorId: null, baselineId: baseline(obligationDocumentV1).id, kind: 'initial',
  selectedIds: [], registeredIds: baseline(obligationDocumentV1).obligationIds, certificateIds: [], invalidatedIds: [], before: vector, after: vector,
  preparation: null, reason: 'Initial honest observation', assessor: 'coordinator' };
 return acceptCheckpoint(obligationDocumentV1, { ...obligationDocumentV1, checkpoints: [obligationCheckpoint] }, root);
}
function successor(obligationDocumentV1: ObligationDocumentV1): ObligationCheckpoint {
 const previous = obligationDocumentV1.checkpoints.at(-1);
 assert.ok(previous);
 return { id: `CP${obligationDocumentV1.checkpoints.length + 1}`, predecessorId: previous.id, baselineId: previous.baselineId,
  kind: 'productive', selectedIds: [], registeredIds: [], certificateIds: [], invalidatedIds: [], before: previous.after, after: previous.after,
  preparation: null, reason: 'Bounded current observation', assessor: 'coordinator' };
}
function dischargeCandidate(obligationDocumentV1: ObligationDocumentV1, obligationCertificate: ObligationCertificate,
 after: ObligationVector = [0,1,1,1,1,1], registeredIds: readonly string[] = []): ObligationDocumentV1 {
 return { ...obligationDocumentV1, certificates: [...obligationDocumentV1.certificates, obligationCertificate],
  checkpoints: [...obligationDocumentV1.checkpoints, { ...successor(obligationDocumentV1), selectedIds: obligationCertificate.obligationIds,
   certificateIds: [obligationCertificate.id], after, registeredIds }] };
}
function register(obligationDocumentV1: ObligationDocumentV1, extraObligation: Obligation): ObligationDocumentV1 {
 return { ...updateBaseline(obligationDocumentV1, item => ({ ...item, obligationIds: [...item.obligationIds, extraObligation.id] })),
  obligations: [...obligationDocumentV1.obligations, extraObligation] };
}

// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('V1 boundary rejects unknown fields, broken identities, references and cycles without mutation', () => {
 const obligationDocumentV1: ObligationDocumentV1 = document();
 const original = JSON.stringify(obligationDocumentV1);
 assert.equal(readObligationDocumentV1(obligationDocumentV1), obligationDocumentV1);
 const first = obligation(obligationDocumentV1, 'OBL-1');
 const invalids: readonly unknown[] = [
  { ...obligationDocumentV1, schemaVersion: 2 }, { ...obligationDocumentV1, status: 'DONE' },
  { ...obligationDocumentV1, obligations: [{ ...first, status: 'DONE' }, ...obligationDocumentV1.obligations.slice(1)] },
  updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, id: 'OBL-0' })),
  updateObligation(obligationDocumentV1, 'OBL-2', item => ({ ...item, id: 'OBL-1' })),
  updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, dependsOn: ['OBL-999'] })),
  updateObligation(updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, dependsOn: ['OBL-2'] })), 'OBL-2', item => ({ ...item, dependsOn: ['OBL-1'] })),
  updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, supersedes: 'OBL-2' })),
  updateBaseline(obligationDocumentV1, item => ({ ...item, inventoryIds: item.inventoryIds.slice(0,-1) })),
  updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, requirementIds: [] })),
  updateBaseline(obligationDocumentV1, item => ({ ...item, authority: { ...item.authority, assessors: [] } })),
  updateBaseline(obligationDocumentV1, item => ({ ...item, requirements: item.requirements.map(requirement => ({ ...requirement, path: '../outside.md' })) })),
  updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, execution: { ...item.execution, taskletIds: ['S01-F01-T01'] } })) ];
 for (const value of invalids) {
  const before = JSON.stringify(value);
  assert.throws(() => readObligationDocumentV1(value));
  assert.equal(JSON.stringify(value), before);
 }
 assert.equal(JSON.stringify(obligationDocumentV1), original);
});

test('owned JSON boundary rejects lossy number tokens before normalization', () => {
 const text = JSON.stringify(document());
 assert.deepEqual(parseObligationDocument(text), document());
 for (const token of ['9007199254740992','9007199254740993','1.0','1e0','-1']) {
  assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', `"schemaVersion":${token}`)), /unsupported JSON number/);
 }
 assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', '"schemaVersion":9007199254740991')), /unsupported obligation document schemaVersion/);
});

// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('freshness requires scoped unchanged assessed inputs and adequate finalized proof', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const original = JSON.stringify({ obligationDocumentV1, obligationCertificate });
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), obligationCertificate, root).fresh, true);
 const rejected: readonly ObligationCertificate[] = [
  { ...obligationCertificate, adequate: false }, { ...obligationCertificate, assessor: 'worker' }, { ...obligationCertificate, authority: ['unapproved'] },
  { ...obligationCertificate, inputs: obligationCertificate.inputs.slice(0,-1) }, { ...obligationCertificate, inventoryIds: ['OBL-2'] } ];
 for (const candidate of rejected) assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), candidate, root).fresh, false);
 fs.writeFileSync(path.join(root, 'unrelated.txt'), 'not a proof input');
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), obligationCertificate, root).fresh, true);
 fs.writeFileSync(path.join(root, 'proof.txt'), 'changed assessment');
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), obligationCertificate, root).fresh, false);
 fs.unlinkSync(path.join(root, 'proof.txt'));
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), obligationCertificate, root).fresh, false);
 fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'));
 assert.throws(() => inputDigest(root, '../outside'), /relative path/);
 assert.throws(() => inputDigest(root, 'escape'), /escapes repository/);
 assert.equal(JSON.stringify({ obligationDocumentV1, obligationCertificate }), original);
});

// Traceability: verifies REQ-OBLIGATION-FRESHNESS
test('execution certificate rejects missing, failing, skipped and unfinalized evidence', testContext => {
 const obligationAssessmentFixture: ObligationAssessmentFixture = assessedFixture(testContext);
 const root = obligationAssessmentFixture.root;
 const unitObligation: Obligation = { ...obligation(obligationAssessmentFixture.obligationDocumentV1,'OBL-5'), id: 'OBL-7', responsibilityId: 'unit-selection',
  execution: { sprintId: null, taskletIds: [], plannedPaths: [], operations: ['node --test focused.test.js'], selection: ['focused-case'], target: { identity: 'local-repo', profile: 'unit' } } };
 const obligationDocumentV1: ObligationDocumentV1 = register(obligationAssessmentFixture.obligationDocumentV1, unitObligation);
 const missingObligationCertificate: ObligationCertificate = { ...obligationAssessmentFixture.obligationCertificate, obligationIds: ['OBL-7'] };
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), missingObligationCertificate, root).fresh, false);
 const obligationEvidence: ObligationEvidence = { command: 'node --test focused.test.js', selection: ['focused-case'],
  target: { identity: 'local-repo', profile: 'unit', verification: 'proof.txt' }, revision: 'source-revision', dirty: false,
  startedAt: '2026-10-10T10:00:00Z', completedAt: '2026-10-10T10:01:00Z', outcome: 'pass', skips: 0, failures: 0,
  inputs: missingObligationCertificate.inputs, outputPath: 'proof.txt', finalization: 'pass' };
 const obligationCertificate: ObligationCertificate = { ...missingObligationCertificate, evidence: [obligationEvidence] };
 assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), obligationCertificate, root).fresh, true);
 const rejected: readonly ObligationEvidence[] = [ { ...obligationEvidence, outcome: 'fail' }, { ...obligationEvidence, skips: 1 },
  { ...obligationEvidence, failures: 1 }, { ...obligationEvidence, finalization: 'unavailable' },
  { ...obligationEvidence, target: { ...obligationEvidence.target, identity: 'other-repo' } },
  { ...obligationEvidence, selection: ['wrong-case'] }, { ...obligationEvidence, command: 'empty-success' } ];
 for (const candidate of rejected) {
  const rejectedObligationCertificate: ObligationCertificate = { ...obligationCertificate, evidence: [candidate] };
  assert.equal(freshCertificate(obligationDocumentV1, baseline(obligationDocumentV1), rejectedObligationCertificate, root).fresh, false);
 }
 const certifiedObligationDocumentV1: ObligationDocumentV1 = { ...obligationDocumentV1, certificates: [obligationCertificate] };
 assert.equal(readObligationDocumentV1(certifiedObligationDocumentV1), certifiedObligationDocumentV1);
});

// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('projection uses accepted certificates, reopens changed inputs and preserves inventory gaps', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const unaccepted: ObligationDocumentV1 = { ...obligationDocumentV1, certificates: [obligationCertificate] };
 assert.deepEqual(projectObligations(unaccepted, root).vector, [1,1,1,1,1,1]);
 const accepted = dischargeCandidate(initialObservation(obligationDocumentV1, root), obligationCertificate);
 const original = JSON.stringify(accepted);
 assert.deepEqual(projectObligations(accepted, root).vector, [0,1,1,1,1,1]);
 fs.writeFileSync(path.join(root, 'proof.txt'), 'evidence invalidated by changed input');
 const reopened = projectObligations(accepted, root);
 assert.ok(reopened.unresolvedIds.includes('OBL-1'));
 assert.deepEqual(reopened.vector, [1,1,1,1,1,1]);
 assert.equal(reopened.complete, false);
 const disturbance: ObligationDocumentV1 = { ...accepted, checkpoints: [...accepted.checkpoints, { ...successor(accepted), kind: 'disturbance',
  invalidatedIds: ['CERT-1'], after: [1,1,1,1,1,1] }] };
 assert.deepEqual(projectObligations(disturbance, root).satisfiedIds, []);
 assert.equal(JSON.stringify(accepted), original);
});

// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('stale prerequisite reopens dependent satisfaction while its own certificate remains fresh', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 fs.writeFileSync(path.join(root, 'gate-proof.txt'), 'approved prerequisite evidence');
 const gateObligation: Obligation = { ...obligation(obligationDocumentV1, 'OBL-1'), id: 'OBL-7', category: 'gate', responsibilityId: 'prerequisite-gate' };
 const dependentDocument = updateObligation(register(obligationDocumentV1, gateObligation), 'OBL-1', item => ({ ...item, dependsOn: ['OBL-7'] }));
 const previous = initialObservation(dependentDocument, root);
 const gateCertificate: ObligationCertificate = { ...obligationCertificate, id: 'CERT-2', obligationIds: ['OBL-7'],
  inputs: ['requirement.md','gate-proof.txt'].map(relative => ({ path: relative, digest: inputDigest(root, relative) })), artifacts: ['gate-proof.txt'] };
 const gateCandidate: ObligationDocumentV1 = { ...previous, certificates: [gateCertificate], checkpoints: [...previous.checkpoints,
  { ...successor(previous), kind: 'neutral', selectedIds: ['OBL-7'], certificateIds: ['CERT-2'],
   preparation: { obligationId: 'OBL-7', operations: ['inspect'], deliverable: 'gate assessed' } }] };
 const acceptedGate = acceptCheckpoint(previous, gateCandidate, root);
 const accepted = acceptCheckpoint(acceptedGate, dischargeCandidate(acceptedGate, obligationCertificate), root);
 assert.ok(projectObligations(accepted, root).satisfiedIds.includes('OBL-1'));
 const original = JSON.stringify(accepted);
 fs.writeFileSync(path.join(root, 'gate-proof.txt'), 'changed prerequisite evidence');
 assert.equal(freshCertificate(accepted, baseline(accepted), obligationCertificate, root).fresh, true);
 const reopened = projectObligations(accepted, root);
 assert.ok(reopened.unresolvedIds.includes('OBL-7'));
 assert.ok(reopened.unresolvedIds.includes('OBL-1'));
 assert.deepEqual(reopened.vector, [1,1,1,1,1,1]);
 assert.equal(JSON.stringify(accepted), original);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('lexicographic vectors allow necessary downstream growth and reject invalid counts', () => {
 assert.equal(compareVectors([1,0,0,0,0,0],[0,1,2,2,2,1]), -1);
 assert.equal(compareVectors([0,0,0,0,0,1],[0,0,0,0,0,0]), -1);
 assert.equal(compareVectors([0,0,0,0,0,1],[1,0,0,0,0,1]), 1);
 assert.equal(compareVectors([1,0,0,0,0,0],[1,0,0,0,0,0]), 0);
 const invalids: readonly ObligationVector[] = [[NaN,0,0,0,0,0],[-1,0,0,0,0,0],[9007199254740992,0,0,0,0,0]];
 for (const invalid of invalids) assert.throws(() => compareVectors(invalid,[0,0,0,0,0,0]), /six safe/);
 const malformed: unknown = { ...document(), checkpoints: [{ id: 'CP1', predecessorId: null, baselineId: 'B1', kind: 'initial',
  selectedIds: [], registeredIds: baseline(document()).obligationIds, certificateIds: [], invalidatedIds: [], before: [1], after: [1,1,1,1,1,1],
  preparation: null, reason: 'Invalid boundary vector', assessor: 'coordinator' }] };
 assert.throws(() => readObligationDocumentV1(malformed), /six safe/);
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
test('selection cannot bypass blocked upstream work and uses numeric stable identity', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext);
 const blockedDocument = updateObligation(obligationDocumentV1, 'OBL-1', item => ({ ...item, dependsOn: ['OBL-6'] }));
 const original = JSON.stringify(blockedDocument);
 const blocked = selectObligation(blockedDocument, root);
 assert.equal(blocked.category, 'T1'); assert.equal(blocked.selectedId, null); assert.deepEqual(blocked.blockedIds, ['OBL-1']);
 assert.equal(JSON.stringify(blockedDocument), original);
 const extra: Obligation = { ...obligation(obligationDocumentV1, 'OBL-1'), id: 'OBL-10', responsibilityId: 'second-T1' };
 assert.equal(selectObligation(register(obligationDocumentV1, extra), root).selectedId, 'OBL-1');
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('acceptance rejects stale predecessor, changed meaning, authority and false productive claims', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const previous = initialObservation(obligationDocumentV1, root);
 const candidate = dischargeCandidate(previous, obligationCertificate);
 const originalPrevious = JSON.stringify(previous); const originalCandidate = JSON.stringify(candidate);
 assert.equal(acceptCheckpoint(previous, candidate, root), candidate);
 const rejected: readonly ObligationDocumentV1[] = [
  updateCheckpoint(candidate, item => ({ ...item, predecessorId: null })),
  updateObligation(candidate, 'OBL-1', item => ({ ...item, condition: 'weakened condition' })),
  updateBaseline(candidate, item => ({ ...item, authority: { ...item.authority, assessors: [...item.authority.assessors,'worker'] } })),
  updateCheckpoint(candidate, item => ({ ...item, assessor: 'worker' })),
  updateCheckpoint(candidate, item => ({ ...item, after: [1,1,1,1,1,1] })),
  updateCheckpoint(candidate, item => ({ ...item, kind: 'neutral' })),
  updateCheckpoint(candidate, item => ({ ...item, selectedIds: ['OBL-6'] })) ];
 for (const value of rejected) {
  const before = JSON.stringify(value); assert.throws(() => acceptCheckpoint(previous, value, root)); assert.equal(JSON.stringify(value), before);
 }
 assert.throws(() => acceptCheckpoint(candidate, candidate, root), /prefix|exactly one/);
 fs.writeFileSync(path.join(root, 'requirement.md'), 'unapproved change');
 assert.throws(() => acceptCheckpoint(previous, candidate, root), /meaning changed/);
 assert.equal(JSON.stringify(previous), originalPrevious); assert.equal(JSON.stringify(candidate), originalCandidate);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('accepted downstream discovery retains historical vectors and newly unresolved obligations', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const previous = initialObservation(obligationDocumentV1, root);
 const extra: Obligation = { ...obligation(obligationDocumentV1, 'OBL-2'), id: 'OBL-7', responsibilityId: 'new-integration-arc' };
 const candidate = register(dischargeCandidate(previous, obligationCertificate, [0,2,1,1,1,1], ['OBL-7']), extra);
 acceptCheckpoint(previous, candidate, root);
 assert.deepEqual(candidate.checkpoints[0]?.after, [1,1,1,1,1,1]);
 assert.deepEqual(projectObligations(candidate, root).vector, [0,2,1,1,1,1]);
 const hidden = updateCheckpoint(candidate, item => ({ ...item, registeredIds: [], after: [0,1,1,1,1,1] }));
 assert.throws(() => acceptCheckpoint(previous, hidden, root), /unregistered/);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('neutral preparation is bounded and repeated completed episodes are rejected', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext);
 const previous = initialObservation(obligationDocumentV1, root);
 const next: ObligationCheckpoint = { ...successor(previous), kind: 'neutral', selectedIds: ['OBL-1'],
  preparation: { obligationId: 'OBL-1', operations: ['inspect'], deliverable: 'inspected dependency report' } };
 const candidate: ObligationDocumentV1 = { ...previous, checkpoints: [...previous.checkpoints, next] };
 acceptCheckpoint(previous, candidate, root);
 const repeated: ObligationDocumentV1 = { ...candidate, checkpoints: [...candidate.checkpoints, { ...next, id: 'CP3', predecessorId: 'CP2' }] };
 assert.throws(() => acceptCheckpoint(candidate, repeated, root), /repeated completed preparation/);
 const exceeded = updateCheckpoint(candidate, item => ({ ...item, preparation: { obligationId: 'OBL-1', operations: ['inspect','unbounded-repair'], deliverable: 'inspected dependency report' } }));
 assert.throws(() => acceptCheckpoint(previous, exceeded, root), /exceeds/);
});

// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('stale proof forces honest disturbance before new productive acceptance', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const previous = initialObservation(obligationDocumentV1, root);
 const accepted = dischargeCandidate(previous, obligationCertificate);
 acceptCheckpoint(previous, accepted, root);
 fs.writeFileSync(path.join(root, 'proof.txt'), 'changed proof');
 const disturbance: ObligationDocumentV1 = { ...accepted, checkpoints: [...accepted.checkpoints, { ...successor(accepted), kind: 'disturbance', invalidatedIds: ['CERT-1'], after: [1,1,1,1,1,1] }] };
 assert.equal(acceptCheckpoint(accepted, disturbance, root), disturbance);
 assert.equal(selectObligation(disturbance, root).selectedId, 'OBL-1');
 const hidden = updateCheckpoint(disturbance, item => ({ ...item, invalidatedIds: [], after: [0,1,1,1,1,1] }));
 assert.throws(() => acceptCheckpoint(accepted, hidden, root), /disturbance|stale/);
});

// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-BASELINE
test('activated baseline retains unchanged IDs and old unresolved history without comparing scopes', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext);
 const previous = initialObservation(obligationDocumentV1, root);
 const obligationBaseline: ObligationBaseline = { ...baseline(previous), id: 'B2', predecessorId: 'B1', authority: { references: ['approved-CHNG','activated-amendment'], assessors: ['coordinator'] } };
 const candidate: ObligationDocumentV1 = { ...previous, baselines: [...previous.baselines, obligationBaseline], checkpoints: [...previous.checkpoints,
  { ...successor(previous), baselineId: 'B2', kind: 'rebaseline', registeredIds: obligationBaseline.obligationIds }] };
 acceptCheckpoint(previous, candidate, root); assert.deepEqual(candidate.obligations, previous.obligations); assert.equal(candidate.checkpoints[0]?.baselineId, 'B1');
 const erased: ObligationDocumentV1 = { ...candidate, baselines: candidate.baselines.slice(1) };
 assert.throws(() => acceptCheckpoint(previous, erased, root));
});

// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('portable CLI uses explicit scoped document and contains invalid data and IO failures', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext);
 const file = path.join(root, 'obligations.json'); const text = JSON.stringify(obligationDocumentV1); fs.writeFileSync(file, text);
 const script = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/obligations.js');
 const result = spawnSync(process.execPath, [script,'select',file,root], { encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, `${JSON.stringify(selectObligation(obligationDocumentV1,root))}\n`);
 assert.equal(fs.readFileSync(file, 'utf8'), text);
 const status = spawnSync(process.execPath, [script,'status',file,root], { encoding: 'utf8' });
 assert.equal(status.status, 0, status.stderr); assert.equal(status.stdout, `${JSON.stringify(projectObligations(obligationDocumentV1,root))}\n`);
 assert.equal(spawnSync(process.execPath, [script,'validate',file,root]).status, 0);
 fs.writeFileSync(file, '{"schemaVersion":1}');
 assert.equal(spawnSync(process.execPath, [script,'validate',file,root]).status, 1);
 assert.equal(fs.readFileSync(file, 'utf8'), '{"schemaVersion":1}');
 assert.equal(spawnSync(process.execPath, [script,'status',`${file}.missing`,root]).status, 2);
 assert.equal(spawnSync(process.execPath, [script,'status',file]).status, 2);
});

test('contract manifest registers exactly the independently evolving V1 reader', () => {
 const family = manifest.families.find(item => item.id === 'plan-obligation-document'); assert.ok(family);
 assert.equal(family.implementation.readerRegistryExport, 'ObligationDocumentReaders');
 assert.deepEqual(Object.keys(ObligationDocumentReaders), family.supportedReadVersions); assert.equal(family.currentVersion, 'V1');
 assert.equal(ObligationDocumentReaders.V1(document()).schemaVersion, 1);
});

// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
// Traceability: verifies REQ-OBLIGATION-PRIORITY
test('zero requires all six assessed inventories and applicable non-metric authority gates', testContext => {
 const { root, obligationDocumentV1, obligationCertificate } = assessedFixture(testContext);
 const gate: Obligation = { ...obligation(obligationDocumentV1, 'OBL-1'), id: 'OBL-7', category: 'gate', responsibilityId: 'authority-gate' };
 let accepted = initialObservation(register(obligationDocumentV1, gate), root);
 const coordinates: readonly ObligationVector[] = [[0,1,1,1,1,1],[0,0,1,1,1,1],[0,0,0,1,1,1],[0,0,0,0,1,1],[0,0,0,0,0,1],[0,0,0,0,0,0]];
 for (const [index, vector] of coordinates.entries()) {
  const proof: ObligationCertificate = { ...obligationCertificate, id: `CERT-${index + 1}`, obligationIds: [`OBL-${index + 1}`] };
  accepted = acceptCheckpoint(accepted, dischargeCandidate(accepted, proof, vector), root);
 }
 const projection = projectObligations(accepted, root); assert.deepEqual(projection.vector, [0,0,0,0,0,0]); assert.equal(projection.complete, false);
 assert.deepEqual(selectObligation(accepted, root).blockedIds, ['OBL-7']);
 const gateCertificate: ObligationCertificate = { ...obligationCertificate, id: 'CERT-7', obligationIds: ['OBL-7'] };
 const candidate: ObligationDocumentV1 = { ...accepted, certificates: [...accepted.certificates, gateCertificate], checkpoints: [...accepted.checkpoints,
  { ...successor(accepted), kind: 'neutral', selectedIds: ['OBL-7'], certificateIds: ['CERT-7'], preparation: { obligationId: 'OBL-7', operations: ['inspect'], deliverable: 'authority gate assessed' } }] };
 acceptCheckpoint(accepted, candidate, root); assert.equal(projectObligations(candidate, root).complete, true);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('reordering JSON object keys cannot bypass the completed neutral preparation bound', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext); const previous = initialObservation(obligationDocumentV1, root);
 const next: ObligationCheckpoint = { ...successor(previous), kind: 'neutral', selectedIds: ['OBL-1'], preparation: { obligationId: 'OBL-1', operations: ['inspect'], deliverable: 'inspection complete' } };
 const candidate: ObligationDocumentV1 = { ...previous, checkpoints: [...previous.checkpoints, next] }; acceptCheckpoint(previous, candidate, root);
 const repeated: ObligationDocumentV1 = { ...candidate, checkpoints: [...candidate.checkpoints, { ...next, id: 'CP3', predecessorId: 'CP2', preparation: { deliverable: 'inspection complete', operations: ['inspect'], obligationId: 'OBL-1' } }] };
 assert.throws(() => acceptCheckpoint(candidate, repeated, root), /repeated completed preparation/);
});

// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('reader cannot hide declared membership from the accepted current observation', testContext => {
 const { root, obligationDocumentV1 } = assessedFixture(testContext); const accepted = initialObservation(obligationDocumentV1, root);
 const hidden = register(accepted, { ...obligation(accepted,'OBL-1'), id: 'OBL-7', responsibilityId: 'hidden responsibility' });
 assert.throws(() => readObligationDocumentV1(hidden), /unregistered/);
});
