// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {readRollingObligationFixtureSource} from './helpers/rolling-obligation-source.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { isObligationGitInputs, obligationInputPaths, inputDigest, parseObligationDocument, type ObligationDocumentV1, type ObligationBaseline,
  type ObligationCertificate, type ObligationCheckpoint, type ObligationEvidence } from '../skills/plan-execution/scripts/obligations.js';
import { freezeObligationLease, type ObligationLeaseV1, type ObligationBindingHistoryV1, type ObligationBindingRevisionV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import { acceptBoundCheckpoint, readObligationCertificateBindingV1, parseObligationCertificateBinding,
  ObligationCertificateBindingReaders, type ObligationCertificateBindingV1, type ObligationCertificateBindingRequest,
  type ObligationCertificateSubmission } from '../skills/plan-execution/scripts/obligation-certificate-bindings.js';

interface CertificateBindingFixture {
  readonly root: string;
  readonly previous: ObligationDocumentV1;
  readonly candidate: ObligationDocumentV1;
  readonly history: ObligationBindingHistoryV1;
  readonly binding: ObligationCertificateBindingV1;
  readonly request: ObligationCertificateBindingRequest;
}
function fixture(): CertificateBindingFixture {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bound-certificate-')));
  const repositoryRoot = path.resolve(__dirname, '../..');
  const sourceObligationDocumentV1 = readRollingObligationFixtureSource();
  const originalObligationBaseline = sourceObligationDocumentV1.baselines[0];
  assert.ok(originalObligationBaseline);
  for (const requirement of originalObligationBaseline.requirements) {
    fs.mkdirSync(path.dirname(path.join(root, requirement.path)), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, requirement.path), path.join(root, requirement.path));
  }
  const obligationBaseline: ObligationBaseline = { ...originalObligationBaseline,
    requirements: originalObligationBaseline.requirements.map(item => ({ ...item, digest: inputDigest(root, item.path) })) };
  const initialObligationCheckpoint: ObligationCheckpoint = { id: 'CP-initial', predecessorId: null, baselineId: obligationBaseline.id,
    kind: 'initial', selectedIds: [], registeredIds: obligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1], preparation: null, reason: 'Isolated fixture observation', assessor: 'coordinator' };
  const previousObligationDocumentV1: ObligationDocumentV1 = { schemaVersion: 1, scopeId: 'fixture', baselines: [obligationBaseline],
    obligations: sourceObligationDocumentV1.obligations.filter(item => obligationBaseline.obligationIds.includes(item.id)), certificates: [], checkpoints: [initialObligationCheckpoint] };
  const obligationBindingRevisionV1: ObligationBindingRevisionV1 = { id: 'BIND-1', obligationId: 'OBL-1', predecessorId: null,
    baselineId: obligationBaseline.id, assessor: 'coordinator', authority: obligationBaseline.authority.references, reason: 'Focused isolated proof', dependsOn: [],
    execution: { sprintId: null, taskletIds: [], plannedPaths: ['subject.ts'], operations: ['check'], selection: ['focused fixture'],
      target: { identity: 'fixture', profile: 'focused' } } };
  const obligationBindingHistoryV1: ObligationBindingHistoryV1 = { schemaVersion: 1, scopeId: 'fixture', revisions: [obligationBindingRevisionV1] };
  const obligationLeaseV1 = freezeObligationLease(previousObligationDocumentV1, obligationBindingHistoryV1,
    { obligationId: 'OBL-1', graphDigest: 'a'.repeat(64), generation: 'fixture-generation', assessor: 'coordinator', authority: obligationBaseline.authority.references });
  fs.writeFileSync(path.join(root, 'subject.ts'), 'export const subject: number = 1;\n');
  fs.writeFileSync(path.join(root, 'proof.txt'), 'synthetic unit fixture metadata; real execution is covered by the PostgreSQL/Git Arc\n');
  const obligationEvidence: ObligationEvidence = { command: 'fixture check', selection: ['focused fixture'], target: { identity: 'fixture', profile: 'focused', verification: 'proof.txt' },
    revision: 'b'.repeat(40), dirty: false, startedAt: '2026-10-11T00:00:00Z', completedAt: '2026-10-11T00:00:01Z', outcome: 'pass', skips: 0, failures: 0,
    inputs: ['subject.ts', 'proof.txt'].map(relative => ({ path: relative, digest: inputDigest(root, relative) })), outputPath: 'proof.txt', finalization: 'pass' };
  const obligationCertificateBindingV1: ObligationCertificateBindingV1 = { schemaVersion: 1, certificateId: 'CERT-fixture', lease: obligationLeaseV1,
    revision: obligationEvidence.revision, proof: [{ operation: 'check', certificateEvidenceIndex: 0, submissionEvidenceIndex: 0 }] };
  fs.writeFileSync(path.join(root, 'binding.json'), JSON.stringify(obligationCertificateBindingV1));
  const obligationCertificate: ObligationCertificate = { id: 'CERT-fixture', obligationIds: ['OBL-1'],
    inputs: [...new Set([...obligationBaseline.requirements.map(item => item.path), ...obligationInputPaths(obligationEvidence.inputs), 'binding.json'])]
      .map(relative => ({ path: relative, digest: inputDigest(root, relative) })), artifacts: ['binding.json'], assessor: 'coordinator', authority: obligationBaseline.authority.references,
    adequate: true, reason: 'Isolated acceptance contract fixture', disposition: null, evidence: [obligationEvidence], inventoryIds: [] };
  const productiveObligationCheckpoint: ObligationCheckpoint = { id: 'CP-accept', predecessorId: initialObligationCheckpoint.id, baselineId: obligationBaseline.id,
    kind: 'productive', selectedIds: ['OBL-1'], registeredIds: [], certificateIds: [obligationCertificate.id], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [0, 1, 1, 1, 1, 1], preparation: null, reason: 'Isolated accepted proof', assessor: 'coordinator' };
  const candidateObligationDocumentV1: ObligationDocumentV1 = { ...previousObligationDocumentV1, certificates: [obligationCertificate],
    checkpoints: [...previousObligationDocumentV1.checkpoints, productiveObligationCheckpoint] };
  const obligationCertificateSubmission: ObligationCertificateSubmission = { lease: obligationLeaseV1, revision: obligationEvidence.revision,
    operations: ['check'], evidence: [obligationEvidence] };
  const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { path: 'binding.json', submission: obligationCertificateSubmission };
  return { root, previous: previousObligationDocumentV1, candidate: candidateObligationDocumentV1, history: obligationBindingHistoryV1,
    binding: obligationCertificateBindingV1, request: obligationCertificateBindingRequest };
}
function candidateWithBinding(certificateBindingFixture: CertificateBindingFixture,
  obligationCertificateBindingV1: ObligationCertificateBindingV1): ObligationDocumentV1 {
  fs.writeFileSync(path.join(certificateBindingFixture.root, 'binding.json'), JSON.stringify(obligationCertificateBindingV1));
  return { ...certificateBindingFixture.candidate, certificates: certificateBindingFixture.candidate.certificates.map(item => ({ ...item,
    inputs: isObligationGitInputs(item.inputs) ? item.inputs : item.inputs.map(input => input.path === 'binding.json' ? { ...input, digest: inputDigest(certificateBindingFixture.root, input.path) } : input) })) };
}

// Historical coverage: verifies REQ-ROLLING-GRAPH
test('bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof', t => {
  const certificateBindingFixture: CertificateBindingFixture = fixture();
  t.after(() => fs.rmSync(certificateBindingFixture.root, { recursive: true, force: true }));
  const original = JSON.stringify(certificateBindingFixture.previous);
  assert.deepEqual(acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, [certificateBindingFixture.request]), certificateBindingFixture.candidate);
  assert.equal(JSON.stringify(certificateBindingFixture.previous), original);
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, []), /lacks a submission binding/);
  const legacyObligationBindingHistoryV1: ObligationBindingHistoryV1 = { schemaVersion: 1, scopeId: 'fixture', revisions: [] };
  assert.deepEqual(acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    legacyObligationBindingHistoryV1, []), certificateBindingFixture.candidate);
  const candidateObligationDocumentV1: ObligationDocumentV1 = { ...certificateBindingFixture.candidate,
    certificates: certificateBindingFixture.candidate.certificates.map(item => ({ ...item, adequate: false })) };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, candidateObligationDocumentV1, certificateBindingFixture.root,
    certificateBindingFixture.history, [certificateBindingFixture.request]), /adequate authorized assessment/);
  fs.appendFileSync(path.join(certificateBindingFixture.root, 'binding.json'), '\n');
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, [certificateBindingFixture.request]), /actual bytes/);
});

// Historical coverage: verifies REQ-ROLLING-GRAPH
test('bound acceptance fences retained generation/revision, current binding and current prerequisites', t => {
  const certificateBindingFixture: CertificateBindingFixture = fixture();
  t.after(() => fs.rmSync(certificateBindingFixture.root, { recursive: true, force: true }));
  const forgedObligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
    submission: { ...certificateBindingFixture.request.submission, lease: { ...certificateBindingFixture.binding.lease, generation: 'foreign' } } };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, [forgedObligationCertificateBindingRequest]), /retained submission/);
  const invalidObligationLeases: readonly ObligationLeaseV1[] = [
    { ...certificateBindingFixture.binding.lease, scopeId: 'foreign' }, { ...certificateBindingFixture.binding.lease, assessor: 'worker' },
    { ...certificateBindingFixture.binding.lease, authority: ['foreign'] }, { ...certificateBindingFixture.binding.lease, baselineId: 'unknown' }
  ];
  for (const modifiedObligationLeaseV1 of invalidObligationLeases) {
    const modifiedObligationCertificateBindingV1: ObligationCertificateBindingV1 = { ...certificateBindingFixture.binding, lease: modifiedObligationLeaseV1 };
    const candidateObligationDocumentV1 = candidateWithBinding(certificateBindingFixture, modifiedObligationCertificateBindingV1);
    const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
      submission: { ...certificateBindingFixture.request.submission, lease: modifiedObligationLeaseV1 } };
    assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, candidateObligationDocumentV1, certificateBindingFixture.root,
      certificateBindingFixture.history, [obligationCertificateBindingRequest]), /foreign scope|unauthorized lease|baseline has not been accepted/);
  }
  fs.writeFileSync(path.join(certificateBindingFixture.root, 'binding.json'), JSON.stringify(certificateBindingFixture.binding));
  const firstObligationBindingRevisionV1 = certificateBindingFixture.history.revisions[0];
  assert.ok(firstObligationBindingRevisionV1);
  const changedObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1, id: 'BIND-2', predecessorId: 'BIND-1',
    reason: 'New prerequisite', dependsOn: ['OBL-2'] };
  const changedObligationBindingHistoryV1: ObligationBindingHistoryV1 = { ...certificateBindingFixture.history,
    revisions: [...certificateBindingFixture.history.revisions, changedObligationBindingRevisionV1] };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    changedObligationBindingHistoryV1, [certificateBindingFixture.request]), /current binding/);
  const obligationLeaseV1 = freezeObligationLease(certificateBindingFixture.previous, changedObligationBindingHistoryV1,
    { obligationId: 'OBL-1', graphDigest: 'a'.repeat(64), generation: 'next-generation', assessor: 'coordinator', authority: firstObligationBindingRevisionV1.authority });
  const obligationCertificateBindingV1: ObligationCertificateBindingV1 = { ...certificateBindingFixture.binding, lease: obligationLeaseV1 };
  fs.writeFileSync(path.join(certificateBindingFixture.root, 'binding.json'), JSON.stringify(obligationCertificateBindingV1));
  const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
    submission: { ...certificateBindingFixture.request.submission, lease: obligationLeaseV1 } };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    changedObligationBindingHistoryV1, [obligationCertificateBindingRequest]), /prerequisites are unresolved/);
});

// Historical coverage: verifies REQ-ROLLING-GRAPH
test('physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities', t => {
  const certificateBindingFixture: CertificateBindingFixture = fixture();
  t.after(() => fs.rmSync(certificateBindingFixture.root, { recursive: true, force: true }));
  assert.deepEqual(parseObligationCertificateBinding(JSON.stringify(certificateBindingFixture.binding)), certificateBindingFixture.binding);
  assert.deepEqual(Object.keys(ObligationCertificateBindingReaders), ['V1']);
  const invalidInputs: readonly unknown[] = [{ ...certificateBindingFixture.binding, schemaVersion: 2 }, { ...certificateBindingFixture.binding, extra: true },
    { ...certificateBindingFixture.binding, revision: 'HEAD' }, { ...certificateBindingFixture.binding, proof: [] },
    { ...certificateBindingFixture.binding, proof: [...certificateBindingFixture.binding.proof, ...certificateBindingFixture.binding.proof] },
    { ...certificateBindingFixture.binding, proof: [{ operation: 'check', certificateEvidenceIndex: -1, submissionEvidenceIndex: 0 }] }];
  for (const input of invalidInputs) assert.throws(() => readObligationCertificateBindingV1(input));
  assert.throws(() => parseObligationCertificateBinding(JSON.stringify(certificateBindingFixture.binding).replace('"schemaVersion":1', '"schemaVersion":1.0')), /exact unsigned/);
  assert.throws(() => parseObligationCertificateBinding(JSON.stringify(certificateBindingFixture.binding).replace('"certificateEvidenceIndex":0', '"certificateEvidenceIndex":9007199254740993')), /safe integer/);
});

// Historical coverage: verifies REQ-ROLLING-GRAPH
test('bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity', t => {
  const certificateBindingFixture: CertificateBindingFixture = fixture();
  t.after(() => fs.rmSync(certificateBindingFixture.root, { recursive: true, force: true }));
  const originalObligationEvidence = certificateBindingFixture.request.submission.evidence[0];
  assert.ok(originalObligationEvidence);
  const invalidEvidence: readonly ObligationEvidence[] = [
    { ...originalObligationEvidence, dirty: true }, { ...originalObligationEvidence, revision: 'f'.repeat(40) },
    { ...originalObligationEvidence, outcome: 'fail' }, { ...originalObligationEvidence, finalization: 'unavailable' },
    { ...originalObligationEvidence, skips: 1 }, { ...originalObligationEvidence, failures: 1 },
    { ...originalObligationEvidence, selection: ['other selection'] },
    { ...originalObligationEvidence, target: { ...originalObligationEvidence.target, profile: 'other profile' } }
  ];
  for (const modifiedObligationEvidence of invalidEvidence) {
    const candidateObligationDocumentV1: ObligationDocumentV1 = { ...certificateBindingFixture.candidate,
      certificates: certificateBindingFixture.candidate.certificates.map(item => ({ ...item, evidence: [modifiedObligationEvidence] })) };
    const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
      submission: { ...certificateBindingFixture.request.submission, evidence: [modifiedObligationEvidence] } };
    assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, candidateObligationDocumentV1, certificateBindingFixture.root,
      certificateBindingFixture.history, [obligationCertificateBindingRequest]), /bound proof|frozen target/);
  }
  const unsupportedObligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
    submission: { ...certificateBindingFixture.request.submission, operations: ['publish'] } };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, [unsupportedObligationCertificateBindingRequest]), /proof differs from retained submission/);
  const missingObligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...certificateBindingFixture.request,
    submission: { ...certificateBindingFixture.request.submission, evidence: [], operations: [] } };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, certificateBindingFixture.candidate, certificateBindingFixture.root,
    certificateBindingFixture.history, [missingObligationCertificateBindingRequest]), /omits retained submission proof/);
  const extraProofObligationDocumentV1: ObligationDocumentV1 = { ...certificateBindingFixture.candidate,
    certificates: certificateBindingFixture.candidate.certificates.map(item => ({ ...item, evidence: [...item.evidence, originalObligationEvidence] })) };
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, extraProofObligationDocumentV1, certificateBindingFixture.root,
    certificateBindingFixture.history, [certificateBindingFixture.request]), /unmapped execution proof/);
  const disallowedObligationCertificateBindingV1: ObligationCertificateBindingV1 = { ...certificateBindingFixture.binding,
    proof: [{ operation: 'publish', certificateEvidenceIndex: 0, submissionEvidenceIndex: 0 }] };
  const candidateObligationDocumentV1 = candidateWithBinding(certificateBindingFixture, disallowedObligationCertificateBindingV1);
  assert.throws(() => acceptBoundCheckpoint(certificateBindingFixture.previous, candidateObligationDocumentV1, certificateBindingFixture.root,
    certificateBindingFixture.history, [unsupportedObligationCertificateBindingRequest]), /operation outside frozen lease/);
});
