// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/obligation-certificate-bindings.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObligationCertificateBindingReaders = void 0;
exports.readObligationCertificateBindingV1 = readObligationCertificateBindingV1;
exports.parseObligationCertificateBinding = parseObligationCertificateBinding;
exports.acceptBoundCheckpoint = acceptBoundCheckpoint;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const lossless_json_1 = require("./lossless-json.js");
const obligations_js_1 = require("./obligations.js");
const obligation_binding_history_js_1 = require("./obligation-binding-history.js");
function requireCertificateBinding(condition, message) {
    if (!condition)
        throw new Error(`certificate binding: ${message}`);
}
function record(value, keys) {
    requireCertificateBinding(value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value) {
    requireCertificateBinding(typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0'), 'invalid identity');
    return value;
}
function index(value) {
    requireCertificateBinding(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'invalid evidence index');
    return value;
}
function readObligationCertificateProofReference(value) {
    record(value, ['operation', 'certificateEvidenceIndex', 'submissionEvidenceIndex']);
    return { operation: text(value.operation), certificateEvidenceIndex: index(value.certificateEvidenceIndex), submissionEvidenceIndex: index(value.submissionEvidenceIndex) };
}
function readObligationCertificateBindingV1(value) {
    record(value, ['schemaVersion', 'certificateId', 'lease', 'revision', 'proof']);
    requireCertificateBinding(value.schemaVersion === 1 && Array.isArray(value.proof) && value.proof.length > 0, 'unsupported version or absent proof');
    const revision = text(value.revision);
    requireCertificateBinding(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision), 'invalid exact candidate revision');
    const obligationCertificateProofReferences = value.proof.map(readObligationCertificateProofReference);
    requireCertificateBinding(new Set(obligationCertificateProofReferences.map(item => item.certificateEvidenceIndex)).size === obligationCertificateProofReferences.length
        && new Set(obligationCertificateProofReferences.map(item => item.submissionEvidenceIndex)).size === obligationCertificateProofReferences.length, 'duplicate evidence references');
    return { schemaVersion: 1, certificateId: text(value.certificateId), lease: (0, obligation_binding_history_js_1.readObligationLeaseV1)(value.lease), revision, proof: obligationCertificateProofReferences };
}
exports.ObligationCertificateBindingReaders = { V1: readObligationCertificateBindingV1 };
function parseObligationCertificateBinding(text) {
    return readObligationCertificateBindingV1((0, lossless_json_1.parse)(text, null, token => {
        requireCertificateBinding(/^(0|[1-9][0-9]*)$/u.test(token), 'numbers must be exact unsigned integers');
        const value = Number(token);
        requireCertificateBinding(Number.isSafeInteger(value), 'number exceeds safe integer range');
        return value;
    }));
}
function acceptBoundCheckpoint(previousObligationDocumentV1, candidateObligationDocumentV1, root, obligationBindingHistoryV1, obligationCertificateBindingRequests) {
    const obligationScopeProjection = (0, obligations_js_1.projectObligationScope)(previousObligationDocumentV1, root, obligationBindingHistoryV1);
    const obligationBaseline = previousObligationDocumentV1.baselines.find(item => item.id === obligationScopeProjection.projection.baselineId);
    const obligationCheckpoint = candidateObligationDocumentV1.checkpoints.at(-1);
    requireCertificateBinding(obligationBaseline && obligationCheckpoint, 'missing accepted baseline or proposed checkpoint');
    requireCertificateBinding(new Set(obligationCertificateBindingRequests.map(item => item.path)).size === obligationCertificateBindingRequests.length, 'duplicate binding artifact paths');
    const certificateResponsibilitySet = new Set();
    const certificateEvidenceMap = new Map();
    for (const obligationCertificateBindingRequest of obligationCertificateBindingRequests) {
        const obligationCertificateBindingV1 = parseObligationCertificateBinding(node_fs_1.default.readFileSync(node_path_1.default.join(root, obligationCertificateBindingRequest.path), 'utf8'));
        const obligationCertificateSubmission = obligationCertificateBindingRequest.submission;
        requireCertificateBinding((0, node_util_1.isDeepStrictEqual)(obligationCertificateBindingV1.lease, obligationCertificateSubmission.lease)
            && obligationCertificateBindingV1.revision === obligationCertificateSubmission.revision, 'binding differs from retained submission');
        requireCertificateBinding(obligationCertificateSubmission.operations.length === obligationCertificateSubmission.evidence.length, 'incomplete retained proof context');
        const obligationLeaseV1 = obligationCertificateBindingV1.lease;
        requireCertificateBinding(previousObligationDocumentV1.baselines.some(item => item.id === obligationLeaseV1.baselineId)
            && (previousObligationDocumentV1.checkpoints.some(item => item.baselineId === obligationLeaseV1.baselineId)
                || previousObligationDocumentV1.checkpoints.length === 0 && previousObligationDocumentV1.baselines[0]?.id === obligationLeaseV1.baselineId), 'lease baseline has not been accepted');
        requireCertificateBinding(obligationLeaseV1.scopeId === previousObligationDocumentV1.scopeId
            && obligationBaseline.authority.assessors.includes(obligationLeaseV1.assessor)
            && obligationLeaseV1.authority.every(reference => obligationBaseline.authority.references.includes(reference)), 'foreign scope or unauthorized lease');
        requireCertificateBinding((0, node_util_1.isDeepStrictEqual)(obligationLeaseV1.binding, obligationScopeProjection.bindings.get(obligationLeaseV1.binding.obligationId)), 'lease differs from current binding');
        requireCertificateBinding(obligationLeaseV1.binding.dependsOn.every(id => obligationScopeProjection.projection.satisfiedIds.includes(id)), 'current prerequisites are unresolved');
        const obligationCertificate = candidateObligationDocumentV1.certificates.find(item => item.id === obligationCertificateBindingV1.certificateId);
        requireCertificateBinding(obligationCertificate && obligationCheckpoint.certificateIds.includes(obligationCertificate.id)
            && obligationCertificate.obligationIds.includes(obligationLeaseV1.binding.obligationId), 'binding does not cover a proposed certificate responsibility');
        const key = `${obligationCertificate.id}:${obligationLeaseV1.binding.obligationId}`;
        requireCertificateBinding(!certificateResponsibilitySet.has(key), 'duplicate certificate responsibility binding');
        certificateResponsibilitySet.add(key);
        requireCertificateBinding(obligationCertificate.artifacts.includes(obligationCertificateBindingRequest.path)
            && ((0, obligations_js_1.isObligationGitInputs)(obligationCertificate.inputs)
                ? true
                : obligationCertificate.inputs.some(input => input.path === obligationCertificateBindingRequest.path && input.digest === (0, obligations_js_1.inputDigest)(root, obligationCertificateBindingRequest.path))), 'binding artifact is not assessed on its actual bytes');
        const obligationExecution = obligationLeaseV1.binding.execution;
        requireCertificateBinding(obligationExecution.target && obligationExecution.selection.length > 0, 'binding has no proof target or selection');
        requireCertificateBinding(obligationCertificateBindingV1.proof.length === obligationCertificateSubmission.evidence.length, 'binding omits retained submission proof');
        const certificateEvidenceIndexSet = certificateEvidenceMap.get(obligationCertificate.id) ?? new Set();
        certificateEvidenceMap.set(obligationCertificate.id, certificateEvidenceIndexSet);
        for (const obligationCertificateProofReference of obligationCertificateBindingV1.proof) {
            const obligationEvidence = obligationCertificate.evidence[obligationCertificateProofReference.certificateEvidenceIndex];
            const submittedObligationEvidence = obligationCertificateSubmission.evidence[obligationCertificateProofReference.submissionEvidenceIndex];
            requireCertificateBinding(obligationEvidence && submittedObligationEvidence
                && (0, node_util_1.isDeepStrictEqual)(obligationEvidence, submittedObligationEvidence)
                && obligationCertificateSubmission.operations[obligationCertificateProofReference.submissionEvidenceIndex] === obligationCertificateProofReference.operation, 'certificate proof differs from retained submission');
            certificateEvidenceIndexSet.add(obligationCertificateProofReference.certificateEvidenceIndex);
            (0, obligation_binding_history_js_1.assertObligationLeaseOperation)(obligationLeaseV1, obligationCertificateSubmission.lease.generation, obligationCertificateSubmission.lease.graphDigest, obligationCertificateProofReference.operation);
            requireCertificateBinding(obligationEvidence.revision === obligationCertificateBindingV1.revision && !obligationEvidence.dirty
                && obligationEvidence.outcome === 'pass' && obligationEvidence.finalization === 'pass' && obligationEvidence.skips === 0 && obligationEvidence.failures === 0, 'bound proof is not passing clean finalized candidate evidence');
            requireCertificateBinding(obligationEvidence.target.identity === obligationExecution.target.identity
                && obligationEvidence.target.profile === obligationExecution.target.profile
                && (0, node_util_1.isDeepStrictEqual)(obligationEvidence.selection, obligationExecution.selection), 'proof differs from frozen target or selection');
        }
    }
    for (const certificateId of obligationCheckpoint.certificateIds) {
        const obligationCertificate = candidateObligationDocumentV1.certificates.find(item => item.id === certificateId);
        requireCertificateBinding(obligationCertificate, 'unknown proposed certificate');
        const certificateEvidenceIndexSet = certificateEvidenceMap.get(certificateId);
        requireCertificateBinding(certificateEvidenceIndexSet === undefined || obligationCertificate.evidence.every((_, index) => certificateEvidenceIndexSet.has(index)), 'certificate contains unmapped execution proof');
        for (const id of obligationCertificate.obligationIds) {
            const obligationEffectiveBinding = obligationScopeProjection.bindings.get(id);
            requireCertificateBinding(obligationEffectiveBinding, 'certificate obligation outside current scope');
            requireCertificateBinding(obligationEffectiveBinding.revisionId === null || certificateResponsibilitySet.has(`${certificateId}:${id}`), 'amended responsibility lacks a submission binding');
        }
    }
    return (0, obligations_js_1.acceptCheckpoint)(previousObligationDocumentV1, candidateObligationDocumentV1, root);
}
