// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const test = require('node:test');
const { readObligationDocumentV1, parseObligationDocument } = require('../skills/plan-execution/scripts/obligations');

function obligationDocument() {
  return {
    schemaVersion: 1, scopeId: 'pilot',
    baselines: [{ id: 'B1', predecessorId: null,
      authority: { references: ['approved-CHNG'], assessors: ['coordinator'] },
      requirements: [{ id: 'REQ-TEST', path: 'requirement.md', digest: 'a'.repeat(64) }],
      obligationIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'],
      inventoryIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'] }],
    obligations: ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'].map((category, index) => ({
      id: `OBL-${index + 1}`, category, requirementIds: ['REQ-TEST'],
      responsibilityId: `${category}-inventory`, condition: `Inventory ${category} responsibilities`,
      criterion: 'Inspected sources, justified exclusions and complete enumeration',
      dependsOn: [], acceptanceGroups: ['pilot'], supersedes: null,
      execution: { sprintId: null, taskletIds: [], plannedPaths: [], operations: ['inspect'], selection: [], target: null },
    })), certificates: [], checkpoints: [],
  };
}

// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('V1 boundary rejects unknown fields, broken identities, references and cycles', () => {
  const document = obligationDocument();
  assert.equal(readObligationDocumentV1(document), document);
  const corruptions = [
    value => { value.schemaVersion = 2; },
    value => { value.status = 'DONE'; },
    value => { value.obligations[0].status = 'DONE'; },
    value => { value.obligations[0].id = 'OBL-0'; },
    value => { value.obligations[1].id = 'OBL-1'; },
    value => { value.obligations[0].dependsOn = ['OBL-999']; },
    value => { value.obligations[0].dependsOn = ['OBL-2']; value.obligations[1].dependsOn = ['OBL-1']; },
    value => { value.obligations[0].supersedes = 'OBL-2'; },
    value => { value.baselines[0].inventoryIds.pop(); },
    value => { value.obligations[0].requirementIds = []; },
    value => { value.baselines[0].authority.assessors = []; },
    value => { value.baselines[0].requirements[0].path = '../outside.md'; },
    value => { value.obligations[0].execution.taskletIds = ['S01-F01-T01']; },
  ];
  for (const corrupt of corruptions) {
    const value = structuredClone(document);
    corrupt(value);
    assert.throws(() => readObligationDocumentV1(value));
  }
});

test('owned JSON boundary rejects lossy number tokens before normalization', () => {
  const text = JSON.stringify(obligationDocument());
  assert.deepEqual(parseObligationDocument(text), obligationDocument());
  for (const token of ['9007199254740992', '9007199254740993', '1.0', '1e0', '-1']) {
    assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', `"schemaVersion":${token}`)), /unsupported JSON number/);
  }
  assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', '"schemaVersion":9007199254740991')), /unsupported obligation document schemaVersion/);
});

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { inputDigest, freshCertificate } = require('../skills/plan-execution/scripts/obligations');

function assessedFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-obligations-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'requirement.md'), 'approved behavior');
  fs.writeFileSync(path.join(root, 'proof.txt'), 'inspected complete inventory');
  const document = obligationDocument();
  document.baselines[0].requirements[0].digest = inputDigest(root, 'requirement.md');
  const certificate = {
    id: 'CERT-1', obligationIds: ['OBL-1'],
    inputs: ['requirement.md', 'proof.txt'].map(relative => ({ path: relative, digest: inputDigest(root, relative) })),
    artifacts: ['proof.txt'], assessor: 'coordinator', authority: ['approved-CHNG'],
    adequate: true, reason: 'Complete inspected category with justified exclusions',
    disposition: null, evidence: [], inventoryIds: [],
  };
  return { root, document, certificate };
}

// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('freshness requires scoped unchanged assessed inputs and adequate finalized proof', t => {
  const { root, document, certificate } = assessedFixture(t);
  const baseline = document.baselines[0];
  assert.equal(freshCertificate(document, baseline, certificate, root).fresh, true);
  for (const mutate of [
    value => { value.adequate = false; },
    value => { value.assessor = 'worker'; },
    value => { value.authority = ['unapproved']; },
    value => { value.inputs.pop(); },
    value => { value.inventoryIds = ['OBL-2']; },
  ]) {
    const candidate = structuredClone(certificate);
    mutate(candidate);
    assert.equal(freshCertificate(document, baseline, candidate, root).fresh, false);
  }
  fs.writeFileSync(path.join(root, 'unrelated.txt'), 'not a proof input');
  assert.equal(freshCertificate(document, baseline, certificate, root).fresh, true);
  fs.writeFileSync(path.join(root, 'proof.txt'), 'changed assessment');
  assert.equal(freshCertificate(document, baseline, certificate, root).fresh, false);
  fs.unlinkSync(path.join(root, 'proof.txt'));
  assert.equal(freshCertificate(document, baseline, certificate, root).fresh, false);
  fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'));
  assert.throws(() => inputDigest(root, '../outside'), /relative path/);
  assert.throws(() => inputDigest(root, 'escape'), /escapes repository/);
});

// Traceability: verifies REQ-OBLIGATION-FRESHNESS
test('execution certificate rejects missing, failing, skipped and unfinalized evidence', t => {
  const { root, document, certificate } = assessedFixture(t);
  document.obligations.push({ ...structuredClone(document.obligations[4]), id: 'OBL-7', responsibilityId: 'unit-selection', execution: { sprintId: null, taskletIds: [], plannedPaths: [], operations: ['node --test focused.test.js'], selection: ['focused-case'], target: { identity: 'local-repo', profile: 'unit' } } });
  document.baselines[0].obligationIds.push('OBL-7');
  certificate.obligationIds = ['OBL-7'];
  assert.equal(freshCertificate(document, document.baselines[0], certificate, root).fresh, false);
  certificate.evidence.push({ command: 'node --test focused.test.js', selection: ['focused-case'],
    target: { identity: 'local-repo', profile: 'unit', verification: 'proof.txt' },
    revision: 'source-revision', dirty: false, startedAt: '2026-10-10T10:00:00Z',
    completedAt: '2026-10-10T10:01:00Z', outcome: 'pass', skips: 0, failures: 0,
    inputs: structuredClone(certificate.inputs), outputPath: 'proof.txt', finalization: 'pass' });
  assert.equal(freshCertificate(document, document.baselines[0], certificate, root).fresh, true);
  for (const [field, rejected] of [['outcome', 'fail'], ['skips', 1], ['failures', 1], ['finalization', 'unavailable']]) {
    const candidate = structuredClone(certificate);
    candidate.evidence[0][field] = rejected;
    assert.equal(freshCertificate(document, document.baselines[0], candidate, root).fresh, false);
  }
  for (const mutate of [
    value => { value.evidence[0].target.identity = 'other-repo'; },
    value => { value.evidence[0].selection = ['wrong-case']; },
    value => { value.evidence[0].command = 'empty-success'; },
  ]) {
    const candidate = structuredClone(certificate);
    mutate(candidate);
    assert.equal(freshCertificate(document, document.baselines[0], candidate, root).fresh, false);
  }
  document.certificates.push(certificate);
  assert.equal(readObligationDocumentV1(document), document);
});

const { projectObligations, compareVectors, selectObligation } = require('../skills/plan-execution/scripts/obligations');
function checkpoint(fields = {}) {
  return { id: 'CP1', predecessorId: null, baselineId: 'B1', kind: 'initial',
    selectedIds: [], registeredIds: fields.kind && fields.kind !== 'initial' ? [] : ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'], certificateIds: [], invalidatedIds: [], before: [1, 1, 1, 1, 1, 1],
    after: [1, 1, 1, 1, 1, 1], preparation: null, reason: 'Initial honest observation', assessor: 'coordinator', ...fields };
}

// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('projection uses accepted certificates, reopens changed inputs and preserves inventory gaps', t => {
  const { root, document, certificate } = assessedFixture(t);
  document.certificates.push(certificate);
  assert.deepEqual(projectObligations(document, root).vector, [1, 1, 1, 1, 1, 1]);
  document.checkpoints.push(checkpoint());
  document.checkpoints.push(checkpoint({ id: 'CP2', predecessorId: 'CP1', kind: 'productive', selectedIds: ['OBL-1'], certificateIds: ['CERT-1'], after: [0, 1, 1, 1, 1, 1] }));
  assert.deepEqual(projectObligations(document, root).vector, [0, 1, 1, 1, 1, 1]);
  fs.writeFileSync(path.join(root, 'proof.txt'), 'evidence invalidated by changed input');
  const reopened = projectObligations(document, root);
  assert.ok(reopened.unresolvedIds.includes('OBL-1'));
  assert.deepEqual(reopened.vector, [1, 1, 1, 1, 1, 1]);
  assert.equal(reopened.complete, false);
  document.checkpoints.push(checkpoint({ id: 'CP3', predecessorId: 'CP2', kind: 'disturbance', invalidatedIds: ['CERT-1'], before: [0, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1] }));
  assert.deepEqual(projectObligations(document, root).satisfiedIds, []);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('lexicographic vectors allow necessary downstream growth and reject invalid counts', () => {
  assert.equal(compareVectors([1, 0, 0, 0, 0, 0], [0, 1, 2, 2, 2, 1]), -1);
  assert.equal(compareVectors([0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0]), -1);
  assert.equal(compareVectors([0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 1]), 1);
  assert.equal(compareVectors([1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0]), 0);
  for (const invalid of [[1], [NaN, 0, 0, 0, 0, 0], [-1, 0, 0, 0, 0, 0], [9007199254740992, 0, 0, 0, 0, 0]]) {
    assert.throws(() => compareVectors(invalid, [0, 0, 0, 0, 0, 0]), /six safe/);
  }
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
test('selection cannot bypass blocked upstream work and uses numeric stable identity', t => {
  const { root, document } = assessedFixture(t);
  document.obligations[0].dependsOn = ['OBL-6'];
  const blocked = selectObligation(document, root);
  assert.equal(blocked.category, 'T1');
  assert.equal(blocked.selectedId, null);
  assert.deepEqual(blocked.blockedIds, ['OBL-1']);
  document.obligations[0].dependsOn = [];
  document.obligations.push({ ...structuredClone(document.obligations[0]), id: 'OBL-10', responsibilityId: 'second-T1' });
  document.baselines[0].obligationIds.push('OBL-10');
  assert.equal(selectObligation(document, root).selectedId, 'OBL-1');
});

const { acceptCheckpoint } = require('../skills/plan-execution/scripts/obligations');
function initialObservation(document, root) {
  const candidate = structuredClone(document);
  const vector = projectObligations(document, root).vector;
  candidate.checkpoints.push(checkpoint({ registeredIds: [...document.baselines[0].obligationIds], before: vector, after: vector }));
  return acceptCheckpoint(document, candidate, root);
}
function dischargeCandidate(document, certificate, fields = {}) {
  const candidate = structuredClone(document);
  candidate.certificates.push(certificate);
  candidate.checkpoints.push(checkpoint({ id: `CP${document.checkpoints.length + 1}`,
    predecessorId: document.checkpoints.at(-1).id, kind: 'productive', selectedIds: certificate.obligationIds,
    certificateIds: [certificate.id], before: document.checkpoints.at(-1).after, after: [0, 1, 1, 1, 1, 1], ...fields }));
  return candidate;
}

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('acceptance rejects stale predecessor, changed meaning, authority and false productive claims', t => {
  const { root, document, certificate } = assessedFixture(t);
  const previous = initialObservation(document, root);
  const candidate = dischargeCandidate(previous, certificate);
  assert.equal(acceptCheckpoint(previous, candidate, root), candidate);
  const rejected = [
    value => { value.checkpoints.at(-1).predecessorId = null; },
    value => { value.obligations[0].condition = 'weakened condition'; },
    value => { value.baselines[0].authority.assessors.push('worker'); },
    value => { value.checkpoints.at(-1).assessor = 'worker'; },
    value => { value.checkpoints.at(-1).after = [1, 1, 1, 1, 1, 1]; },
    value => { value.checkpoints.at(-1).kind = 'neutral'; },
    value => { value.checkpoints.at(-1).selectedIds = ['OBL-6']; },
  ];
  for (const corrupt of rejected) {
    const value = structuredClone(candidate);
    corrupt(value);
    assert.throws(() => acceptCheckpoint(previous, value, root));
  }
  assert.throws(() => acceptCheckpoint(candidate, candidate, root), /prefix|exactly one/);
  fs.writeFileSync(path.join(root, 'requirement.md'), 'unapproved change');
  assert.throws(() => acceptCheckpoint(previous, candidate, root), /meaning changed/);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('accepted downstream discovery retains historical vectors and newly unresolved obligations', t => {
  const { root, document, certificate } = assessedFixture(t);
  const previous = initialObservation(document, root);
  const candidate = dischargeCandidate(previous, certificate, { registeredIds: ['OBL-7'], after: [0, 2, 1, 1, 1, 1] });
  candidate.obligations.push({ ...structuredClone(document.obligations[1]), id: 'OBL-7', responsibilityId: 'new-integration-arc' });
  candidate.baselines[0].obligationIds.push('OBL-7');
  acceptCheckpoint(previous, candidate, root);
  assert.deepEqual(candidate.checkpoints[0].after, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(projectObligations(candidate, root).vector, [0, 2, 1, 1, 1, 1]);
  const hidden = structuredClone(candidate);
  hidden.checkpoints.at(-1).registeredIds = [];
  hidden.checkpoints.at(-1).after = [0, 1, 1, 1, 1, 1];
  assert.throws(() => acceptCheckpoint(previous, hidden, root), /unregistered/);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('neutral preparation is bounded and repeated completed episodes are rejected', t => {
  const { root, document } = assessedFixture(t);
  const previous = initialObservation(document, root);
  const candidate = structuredClone(previous);
  candidate.checkpoints.push(checkpoint({ id: 'CP2', predecessorId: 'CP1', kind: 'neutral', selectedIds: ['OBL-1'],
    preparation: { obligationId: 'OBL-1', operations: ['inspect'], deliverable: 'inspected dependency report' } }));
  acceptCheckpoint(previous, candidate, root);
  const repeated = structuredClone(candidate);
  repeated.checkpoints.push({ ...structuredClone(candidate.checkpoints.at(-1)), id: 'CP3', predecessorId: 'CP2' });
  assert.throws(() => acceptCheckpoint(candidate, repeated, root), /repeated completed preparation/);
  const exceeded = structuredClone(candidate);
  exceeded.checkpoints.at(-1).preparation.operations.push('unbounded-repair');
  assert.throws(() => acceptCheckpoint(previous, exceeded, root), /exceeds/);
});

// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('stale proof forces honest disturbance before new productive acceptance', t => {
  const { root, document, certificate } = assessedFixture(t);
  const previous = initialObservation(document, root);
  const accepted = dischargeCandidate(previous, certificate);
  acceptCheckpoint(previous, accepted, root);
  fs.writeFileSync(path.join(root, 'proof.txt'), 'changed proof');
  const disturbance = structuredClone(accepted);
  disturbance.checkpoints.push(checkpoint({ id: 'CP3', predecessorId: 'CP2', kind: 'disturbance',
    invalidatedIds: ['CERT-1'], before: [0, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1] }));
  assert.equal(acceptCheckpoint(accepted, disturbance, root), disturbance);
  assert.equal(selectObligation(disturbance, root).selectedId, 'OBL-1');
  const hidden = structuredClone(disturbance);
  hidden.checkpoints.at(-1).invalidatedIds = [];
  hidden.checkpoints.at(-1).after = [0, 1, 1, 1, 1, 1];
  assert.throws(() => acceptCheckpoint(accepted, hidden, root), /disturbance|stale/);
});

// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-BASELINE
test('activated baseline retains unchanged IDs and old unresolved history without comparing scopes', t => {
  const { root, document } = assessedFixture(t);
  const previous = initialObservation(document, root);
  const candidate = structuredClone(previous);
  candidate.baselines.push({ ...structuredClone(candidate.baselines[0]), id: 'B2', predecessorId: 'B1',
    authority: { references: ['approved-CHNG', 'activated-amendment'], assessors: ['coordinator'] } });
  candidate.checkpoints.push(checkpoint({ id: 'CP2', predecessorId: 'CP1', baselineId: 'B2', kind: 'rebaseline',
    registeredIds: [...candidate.baselines[1].obligationIds] }));
  acceptCheckpoint(previous, candidate, root);
  assert.deepEqual(candidate.obligations, previous.obligations);
  assert.equal(candidate.checkpoints[0].baselineId, 'B1');
  const erased = structuredClone(candidate);
  erased.baselines.shift();
  assert.throws(() => acceptCheckpoint(previous, erased, root));
});

const { spawnSync } = require('node:child_process');
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('portable CLI uses explicit scoped document and contains invalid data and IO failures', t => {
  const { root, document } = assessedFixture(t);
  const file = path.join(root, 'obligations.json');
  fs.writeFileSync(file, JSON.stringify(document));
  const script = path.join(__dirname, '../skills/plan-execution/scripts/obligations.js');
  const result = spawnSync(process.execPath, [script, 'select', file, root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).selectedId, 'OBL-1');
  fs.writeFileSync(file, '{"schemaVersion":1}');
  assert.equal(spawnSync(process.execPath, [script, 'validate', file, root]).status, 1);
  assert.equal(spawnSync(process.execPath, [script, 'status', `${file}.missing`, root]).status, 2);
  assert.equal(spawnSync(process.execPath, [script, 'status', file]).status, 2);
});

test('contract manifest registers exactly the independently evolving V1 reader', () => {
  const manifest = require('../versioned-data-contracts.json');
  const family = manifest.families.find(family => family.id === 'plan-obligation-document');
  const { ObligationDocumentReaders } = require('../skills/plan-execution/scripts/obligations');
  assert.equal(family.implementation.readerRegistryExport, 'ObligationDocumentReaders');
  assert.deepEqual(Object.keys(ObligationDocumentReaders), family.supportedReadVersions);
  assert.equal(family.currentVersion, 'V1');
  assert.equal(ObligationDocumentReaders.V1(obligationDocument()).schemaVersion, 1);
});

// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
// Traceability: verifies REQ-OBLIGATION-PRIORITY
test('zero requires all six assessed inventories and applicable non-metric authority gates', t => {
  const { root, document, certificate } = assessedFixture(t);
  document.obligations.push({ ...structuredClone(document.obligations[0]), id: 'OBL-7', category: 'gate', responsibilityId: 'authority-gate' });
  document.baselines[0].obligationIds.push('OBL-7');
  let accepted = initialObservation(document, root);
  for (let index = 0; index < 6; index++) {
    const proof = { ...structuredClone(certificate), id: `CERT-${index + 1}`, obligationIds: [`OBL-${index + 1}`] };
    const vector = [...accepted.checkpoints.at(-1).after];
    vector[index] = 0;
    const candidate = dischargeCandidate(accepted, proof, { after: vector });
    accepted = acceptCheckpoint(accepted, candidate, root);
  }
  const projection = projectObligations(accepted, root);
  assert.deepEqual(projection.vector, [0, 0, 0, 0, 0, 0]);
  assert.equal(projection.complete, false);
  assert.deepEqual(selectObligation(accepted, root).blockedIds, ['OBL-7']);
  const candidate = structuredClone(accepted);
  candidate.certificates.push({ ...structuredClone(certificate), id: 'CERT-7', obligationIds: ['OBL-7'] });
  candidate.checkpoints.push(checkpoint({ id: 'CP8', predecessorId: 'CP7', kind: 'neutral', selectedIds: ['OBL-7'],
    certificateIds: ['CERT-7'], before: projection.vector, after: projection.vector,
    preparation: { obligationId: 'OBL-7', operations: ['inspect'], deliverable: 'authority gate assessed' } }));
  acceptCheckpoint(accepted, candidate, root);
  assert.equal(projectObligations(candidate, root).complete, true);
});

// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
test('reordering JSON object keys cannot bypass the completed neutral preparation bound', t => {
  const {root,document}=assessedFixture(t);
  const previous=initialObservation(document,root);
  const candidate=structuredClone(previous);
  candidate.checkpoints.push(checkpoint({id:'CP2',predecessorId:'CP1',kind:'neutral',selectedIds:['OBL-1'],preparation:{obligationId:'OBL-1',operations:['inspect'],deliverable:'inspection complete'}}));
  acceptCheckpoint(previous,candidate,root);
  const repeated=structuredClone(candidate);
  repeated.checkpoints.push({...structuredClone(candidate.checkpoints.at(-1)),id:'CP3',predecessorId:'CP2',preparation:{deliverable:'inspection complete',operations:['inspect'],obligationId:'OBL-1'}});
  assert.throws(()=>acceptCheckpoint(candidate,repeated,root),/repeated completed preparation/);
});

// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
test('reader cannot hide declared membership from the accepted current observation', t => {
  const {root,document}=assessedFixture(t);
  const accepted=initialObservation(document,root);
  accepted.obligations.push({...structuredClone(accepted.obligations[0]),id:'OBL-7',responsibilityId:'hidden responsibility'});
  accepted.baselines[0].obligationIds.push('OBL-7');
  assert.throws(()=>readObligationDocumentV1(accepted),/unregistered/);
});
