// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'lossless-json';
import { acceptCheckpoint, inputDigest, projectObligationScope, isObligationGitInputs,
  type ObligationDocumentV1, type ObligationEvidence } from './obligations.js';
import { readObligationLeaseV1, assertObligationLeaseOperation,
  type ObligationLeaseV1, type ObligationBindingHistoryV1 } from './obligation-binding-history.js';

export interface ObligationCertificateProofReference {
  readonly operation: string;
  readonly certificateEvidenceIndex: number;
  readonly submissionEvidenceIndex: number;
}
export interface ObligationCertificateBindingV1 {
  readonly schemaVersion: 1;
  readonly certificateId: string;
  readonly lease: ObligationLeaseV1;
  readonly revision: string;
  readonly proof: readonly ObligationCertificateProofReference[];
}
// Host adapters derive this trusted context from the retained submission, not the proposed binding artifact.
export interface ObligationCertificateSubmission {
  readonly lease: ObligationLeaseV1;
  readonly revision: string;
  readonly operations: readonly string[];
  readonly evidence: readonly ObligationEvidence[];
}
export interface ObligationCertificateBindingRequest {
  readonly path: string;
  readonly submission: ObligationCertificateSubmission;
}
function requireCertificateBinding(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`certificate binding: ${message}`);
}
function record(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  requireCertificateBinding(value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value: unknown): string {
  requireCertificateBinding(typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0'), 'invalid identity');
  return value;
}
function index(value: unknown): number {
  requireCertificateBinding(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'invalid evidence index');
  return value;
}
function readObligationCertificateProofReference(value: unknown): ObligationCertificateProofReference {
  record(value, ['operation', 'certificateEvidenceIndex', 'submissionEvidenceIndex']);
  return { operation: text(value.operation), certificateEvidenceIndex: index(value.certificateEvidenceIndex), submissionEvidenceIndex: index(value.submissionEvidenceIndex) };
}
export function readObligationCertificateBindingV1(value: unknown): ObligationCertificateBindingV1 {
  record(value, ['schemaVersion', 'certificateId', 'lease', 'revision', 'proof']);
  requireCertificateBinding(value.schemaVersion === 1 && Array.isArray(value.proof) && value.proof.length > 0, 'unsupported version or absent proof');
  const revision = text(value.revision);
  requireCertificateBinding(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision), 'invalid exact candidate revision');
  const obligationCertificateProofReferences = value.proof.map(readObligationCertificateProofReference);
  requireCertificateBinding(new Set(obligationCertificateProofReferences.map(item => item.certificateEvidenceIndex)).size === obligationCertificateProofReferences.length
    && new Set(obligationCertificateProofReferences.map(item => item.submissionEvidenceIndex)).size === obligationCertificateProofReferences.length, 'duplicate evidence references');
  return { schemaVersion: 1, certificateId: text(value.certificateId), lease: readObligationLeaseV1(value.lease), revision, proof: obligationCertificateProofReferences };
}
export const ObligationCertificateBindingReaders = { V1: readObligationCertificateBindingV1 };
export function parseObligationCertificateBinding(text: string): ObligationCertificateBindingV1 {
  return readObligationCertificateBindingV1(parse(text, null, token => {
    requireCertificateBinding(/^(0|[1-9][0-9]*)$/u.test(token), 'numbers must be exact unsigned integers');
    const value = Number(token);
    requireCertificateBinding(Number.isSafeInteger(value), 'number exceeds safe integer range');
    return value;
  }));
}
export function acceptBoundCheckpoint(previousObligationDocumentV1: ObligationDocumentV1, candidateObligationDocumentV1: ObligationDocumentV1,
  root: string, obligationBindingHistoryV1: ObligationBindingHistoryV1,
  obligationCertificateBindingRequests: readonly ObligationCertificateBindingRequest[]): ObligationDocumentV1 {
  const obligationScopeProjection = projectObligationScope(previousObligationDocumentV1, root, obligationBindingHistoryV1);
  const obligationBaseline = previousObligationDocumentV1.baselines.find(item => item.id === obligationScopeProjection.projection.baselineId);
  const obligationCheckpoint = candidateObligationDocumentV1.checkpoints.at(-1);
  requireCertificateBinding(obligationBaseline && obligationCheckpoint, 'missing accepted baseline or proposed checkpoint');
  requireCertificateBinding(new Set(obligationCertificateBindingRequests.map(item => item.path)).size === obligationCertificateBindingRequests.length, 'duplicate binding artifact paths');
  const certificateResponsibilitySet = new Set<string>();
  const certificateEvidenceMap = new Map<string, Set<number>>();
  for (const obligationCertificateBindingRequest of obligationCertificateBindingRequests) {
    const obligationCertificateBindingV1 = parseObligationCertificateBinding(fs.readFileSync(path.join(root, obligationCertificateBindingRequest.path), 'utf8'));
    const obligationCertificateSubmission = obligationCertificateBindingRequest.submission;
    requireCertificateBinding(isDeepStrictEqual(obligationCertificateBindingV1.lease, obligationCertificateSubmission.lease)
      && obligationCertificateBindingV1.revision === obligationCertificateSubmission.revision, 'binding differs from retained submission');
    requireCertificateBinding(obligationCertificateSubmission.operations.length === obligationCertificateSubmission.evidence.length, 'incomplete retained proof context');
    const obligationLeaseV1 = obligationCertificateBindingV1.lease;
    requireCertificateBinding(previousObligationDocumentV1.baselines.some(item => item.id === obligationLeaseV1.baselineId)
      && (previousObligationDocumentV1.checkpoints.some(item => item.baselineId === obligationLeaseV1.baselineId)
        || previousObligationDocumentV1.checkpoints.length === 0 && previousObligationDocumentV1.baselines[0]?.id === obligationLeaseV1.baselineId),
    'lease baseline has not been accepted');
    requireCertificateBinding(obligationLeaseV1.scopeId === previousObligationDocumentV1.scopeId
      && obligationBaseline.authority.assessors.includes(obligationLeaseV1.assessor)
      && obligationLeaseV1.authority.every(reference => obligationBaseline.authority.references.includes(reference)), 'foreign scope or unauthorized lease');
    requireCertificateBinding(isDeepStrictEqual(obligationLeaseV1.binding, obligationScopeProjection.bindings.get(obligationLeaseV1.binding.obligationId)),
      'lease differs from current binding');
    requireCertificateBinding(obligationLeaseV1.binding.dependsOn.every(id => obligationScopeProjection.projection.satisfiedIds.includes(id)),
      'current prerequisites are unresolved');
    const obligationCertificate = candidateObligationDocumentV1.certificates.find(item => item.id === obligationCertificateBindingV1.certificateId);
    requireCertificateBinding(obligationCertificate && obligationCheckpoint.certificateIds.includes(obligationCertificate.id)
      && obligationCertificate.obligationIds.includes(obligationLeaseV1.binding.obligationId), 'binding does not cover a proposed certificate responsibility');
    const key = `${obligationCertificate.id}:${obligationLeaseV1.binding.obligationId}`;
    requireCertificateBinding(!certificateResponsibilitySet.has(key), 'duplicate certificate responsibility binding');
    certificateResponsibilitySet.add(key);
    requireCertificateBinding(obligationCertificate.artifacts.includes(obligationCertificateBindingRequest.path)
      && (isObligationGitInputs(obligationCertificate.inputs)
        ? true
        : obligationCertificate.inputs.some(input => input.path === obligationCertificateBindingRequest.path && input.digest === inputDigest(root, obligationCertificateBindingRequest.path))),
    'binding artifact is not assessed on its actual bytes');
    const obligationExecution = obligationLeaseV1.binding.execution;
    requireCertificateBinding(obligationExecution.target && obligationExecution.selection.length > 0, 'binding has no proof target or selection');
    requireCertificateBinding(obligationCertificateBindingV1.proof.length === obligationCertificateSubmission.evidence.length,
      'binding omits retained submission proof');
    const certificateEvidenceIndexSet = certificateEvidenceMap.get(obligationCertificate.id) ?? new Set<number>();
    certificateEvidenceMap.set(obligationCertificate.id, certificateEvidenceIndexSet);
    for (const obligationCertificateProofReference of obligationCertificateBindingV1.proof) {
      const obligationEvidence = obligationCertificate.evidence[obligationCertificateProofReference.certificateEvidenceIndex];
      const submittedObligationEvidence = obligationCertificateSubmission.evidence[obligationCertificateProofReference.submissionEvidenceIndex];
      requireCertificateBinding(obligationEvidence && submittedObligationEvidence
        && isDeepStrictEqual(obligationEvidence, submittedObligationEvidence)
        && obligationCertificateSubmission.operations[obligationCertificateProofReference.submissionEvidenceIndex] === obligationCertificateProofReference.operation,
      'certificate proof differs from retained submission');
      certificateEvidenceIndexSet.add(obligationCertificateProofReference.certificateEvidenceIndex);
      assertObligationLeaseOperation(obligationLeaseV1, obligationCertificateSubmission.lease.generation,
        obligationCertificateSubmission.lease.graphDigest, obligationCertificateProofReference.operation);
      requireCertificateBinding(obligationEvidence.revision === obligationCertificateBindingV1.revision && !obligationEvidence.dirty
        && obligationEvidence.outcome === 'pass' && obligationEvidence.finalization === 'pass' && obligationEvidence.skips === 0 && obligationEvidence.failures === 0,
      'bound proof is not passing clean finalized candidate evidence');
      requireCertificateBinding(obligationEvidence.target.identity === obligationExecution.target.identity
        && obligationEvidence.target.profile === obligationExecution.target.profile
        && isDeepStrictEqual(obligationEvidence.selection, obligationExecution.selection), 'proof differs from frozen target or selection');
    }
  }
  for (const certificateId of obligationCheckpoint.certificateIds) {
    const obligationCertificate = candidateObligationDocumentV1.certificates.find(item => item.id === certificateId);
    requireCertificateBinding(obligationCertificate, 'unknown proposed certificate');
    const certificateEvidenceIndexSet = certificateEvidenceMap.get(certificateId);
    requireCertificateBinding(certificateEvidenceIndexSet === undefined || obligationCertificate.evidence.every((_, index) => certificateEvidenceIndexSet.has(index)),
      'certificate contains unmapped execution proof');
    for (const id of obligationCertificate.obligationIds) {
      const obligationEffectiveBinding = obligationScopeProjection.bindings.get(id);
      requireCertificateBinding(obligationEffectiveBinding, 'certificate obligation outside current scope');
      requireCertificateBinding(obligationEffectiveBinding.revisionId === null || certificateResponsibilitySet.has(`${certificateId}:${id}`), 'amended responsibility lacks a submission binding');
    }
  }
  // This adds constraints. It never changes V1 parsing, historical replay, authority or adequacy.
  return acceptCheckpoint(previousObligationDocumentV1, candidateObligationDocumentV1, root);
}
