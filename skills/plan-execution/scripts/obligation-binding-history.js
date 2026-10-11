// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/obligation-binding-history.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObligationLeaseReaders = exports.ObligationBindingHistoryReaders = void 0;
exports.readObligationBindingHistoryV1 = readObligationBindingHistoryV1;
exports.parseObligationBindingHistory = parseObligationBindingHistory;
exports.projectObligationBindings = projectObligationBindings;
exports.acceptObligationBindingRevision = acceptObligationBindingRevision;
exports.readObligationLeaseV1 = readObligationLeaseV1;
exports.parseObligationLease = parseObligationLease;
exports.freezeObligationLease = freezeObligationLease;
exports.assertObligationLeaseOperation = assertObligationLeaseOperation;
const node_util_1 = require("node:util");
const lossless_json_1 = require("lossless-json");
const obligations_js_1 = require("./obligations.js");
function requireBinding(condition, message) {
    if (!condition)
        throw new Error(`obligation binding: ${message}`);
}
function exactRecord(value, keys) {
    requireBinding(value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value) {
    requireBinding(typeof value === 'string' && value.trim().length > 0, 'expected nonempty string');
    return value;
}
function uniqueTexts(value, nonempty = false) {
    requireBinding(Array.isArray(value), 'expected string array');
    const strings = value.map(text);
    requireBinding(new Set(strings).size === strings.length && (!nonempty || strings.length > 0), 'expected unique string values');
    return strings;
}
function readObligationBindingRevisionV1(value) {
    exactRecord(value, ['id', 'obligationId', 'predecessorId', 'baselineId', 'assessor', 'authority', 'reason', 'dependsOn', 'execution']);
    const obligationExecution = (0, obligations_js_1.readObligationExecution)(value.execution);
    requireBinding(!obligationExecution.operations.includes('edit') || obligationExecution.plannedPaths.length > 0, 'edit permission requires exact planned paths');
    return { id: text(value.id), obligationId: text(value.obligationId), predecessorId: value.predecessorId === null ? null : text(value.predecessorId),
        baselineId: text(value.baselineId), assessor: text(value.assessor), authority: uniqueTexts(value.authority, true), reason: text(value.reason),
        dependsOn: uniqueTexts(value.dependsOn), execution: obligationExecution };
}
function isObligationBindingHistoryV1(value) {
    exactRecord(value, ['schemaVersion', 'scopeId', 'revisions']);
    requireBinding(value.schemaVersion === 1 && Array.isArray(value.revisions), 'unsupported history schemaVersion');
    text(value.scopeId);
    const revisions = value.revisions.map(readObligationBindingRevisionV1);
    requireBinding(new Set(revisions.map(revision => revision.id)).size === revisions.length, 'duplicate revision identity');
    return true;
}
function readObligationBindingHistoryV1(value) {
    requireBinding(isObligationBindingHistoryV1(value), 'invalid history V1');
    return { schemaVersion: 1, scopeId: value.scopeId, revisions: value.revisions.map(readObligationBindingRevisionV1) };
}
exports.ObligationBindingHistoryReaders = { V1: readObligationBindingHistoryV1 };
function parseVersionOneRecord(text, contract) {
    return (0, lossless_json_1.parse)(text, null, token => {
        requireBinding(token === '1', `${contract} only permits its exact version integer`);
        return 1;
    });
}
function parseObligationBindingHistory(text) {
    return readObligationBindingHistoryV1(parseVersionOneRecord(text, 'history'));
}
function currentBaseline(obligationDocumentV1) {
    const baselineId = obligationDocumentV1.checkpoints.at(-1)?.baselineId ?? obligationDocumentV1.baselines[0]?.id;
    const obligationBaseline = obligationDocumentV1.baselines.find(baseline => baseline.id === baselineId);
    requireBinding(obligationBaseline, 'missing accepted baseline');
    return obligationBaseline;
}
function validateGraph(obligationBaseline, bindings) {
    const visiting = new Set();
    const visited = new Set();
    const members = new Set(obligationBaseline.obligationIds);
    function visit(id) {
        requireBinding(members.has(id), `prerequisite outside accepted baseline: ${id}`);
        requireBinding(!visiting.has(id), `cyclic prerequisite: ${id}`);
        if (visited.has(id))
            return;
        const obligationEffectiveBinding = bindings.get(id);
        requireBinding(obligationEffectiveBinding, `unknown obligation: ${id}`);
        visiting.add(id);
        obligationEffectiveBinding.dependsOn.forEach(visit);
        visiting.delete(id);
        visited.add(id);
    }
    obligationBaseline.obligationIds.forEach(visit);
}
function projectObligationBindings(obligationDocumentV1, obligationBindingHistoryV1) {
    (0, obligations_js_1.readObligationDocumentV1)(obligationDocumentV1);
    const checkedObligationBindingHistoryV1 = readObligationBindingHistoryV1(obligationBindingHistoryV1);
    requireBinding(checkedObligationBindingHistoryV1.scopeId === obligationDocumentV1.scopeId, 'scope mismatch');
    const bindings = new Map(obligationDocumentV1.obligations.map(obligation => [obligation.id,
        { obligationId: obligation.id, revisionId: null, dependsOn: obligation.dependsOn, execution: obligation.execution }]));
    const acceptedBaselineIds = new Set(obligationDocumentV1.checkpoints.map(checkpoint => checkpoint.baselineId));
    if (acceptedBaselineIds.size === 0)
        acceptedBaselineIds.add(currentBaseline(obligationDocumentV1).id);
    for (const obligationBindingRevisionV1 of checkedObligationBindingHistoryV1.revisions) {
        const obligationBaseline = obligationDocumentV1.baselines.find(baseline => baseline.id === obligationBindingRevisionV1.baselineId);
        requireBinding(obligationBaseline && acceptedBaselineIds.has(obligationBaseline.id), 'revision baseline has not been accepted');
        requireBinding(obligationBaseline.authority.assessors.includes(obligationBindingRevisionV1.assessor)
            && obligationBindingRevisionV1.authority.every(reference => obligationBaseline.authority.references.includes(reference)), 'unauthorized revision');
        requireBinding(obligationBaseline.obligationIds.includes(obligationBindingRevisionV1.obligationId), 'revision obligation outside accepted baseline');
        const priorObligationEffectiveBinding = bindings.get(obligationBindingRevisionV1.obligationId);
        requireBinding(priorObligationEffectiveBinding && priorObligationEffectiveBinding.revisionId === obligationBindingRevisionV1.predecessorId, 'stale obligation predecessor');
        requireBinding(!(0, node_util_1.isDeepStrictEqual)(priorObligationEffectiveBinding.dependsOn, obligationBindingRevisionV1.dependsOn)
            || !(0, node_util_1.isDeepStrictEqual)(priorObligationEffectiveBinding.execution, obligationBindingRevisionV1.execution), 'revision does not change the binding');
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
function acceptObligationBindingRevision(obligationDocumentV1, previousObligationBindingHistoryV1, candidateObligationBindingHistoryV1, expectedPredecessorId) {
    projectObligationBindings(obligationDocumentV1, previousObligationBindingHistoryV1);
    const checkedObligationBindingHistoryV1 = readObligationBindingHistoryV1(candidateObligationBindingHistoryV1);
    requireBinding((previousObligationBindingHistoryV1.revisions.at(-1)?.id ?? null) === expectedPredecessorId, 'stale history predecessor');
    requireBinding(checkedObligationBindingHistoryV1.revisions.length === previousObligationBindingHistoryV1.revisions.length + 1
        && previousObligationBindingHistoryV1.revisions.every((revision, index) => (0, node_util_1.isDeepStrictEqual)(revision, checkedObligationBindingHistoryV1.revisions[index])), 'accepted history prefix is immutable; append exactly one revision');
    const obligationBindingRevisionV1 = checkedObligationBindingHistoryV1.revisions.at(-1);
    requireBinding(obligationBindingRevisionV1 && obligationBindingRevisionV1.baselineId === currentBaseline(obligationDocumentV1).id, 'new revision requires current accepted baseline');
    projectObligationBindings(obligationDocumentV1, checkedObligationBindingHistoryV1);
    return checkedObligationBindingHistoryV1;
}
function readObligationLeaseV1(value) {
    exactRecord(value, ['schemaVersion', 'scopeId', 'baselineId', 'graphDigest', 'generation', 'assessor', 'authority', 'binding']);
    requireBinding(value.schemaVersion === 1, 'unsupported lease schemaVersion');
    exactRecord(value.binding, ['obligationId', 'revisionId', 'dependsOn', 'execution']);
    const obligationEffectiveBinding = { obligationId: text(value.binding.obligationId),
        revisionId: value.binding.revisionId === null ? null : text(value.binding.revisionId),
        dependsOn: uniqueTexts(value.binding.dependsOn), execution: (0, obligations_js_1.readObligationExecution)(value.binding.execution) };
    requireBinding(/^OBL-[1-9][0-9]*$/u.test(obligationEffectiveBinding.obligationId)
        && obligationEffectiveBinding.dependsOn.every(id => /^OBL-[1-9][0-9]*$/u.test(id))
        && !obligationEffectiveBinding.dependsOn.includes(obligationEffectiveBinding.obligationId), 'invalid lease obligation references');
    requireBinding(!obligationEffectiveBinding.execution.operations.includes('edit') || obligationEffectiveBinding.execution.plannedPaths.length > 0, 'edit permission requires exact planned paths');
    const graphDigest = text(value.graphDigest);
    requireBinding(/^[a-f0-9]{64}$/u.test(graphDigest), 'invalid lease graph digest');
    return { schemaVersion: 1, scopeId: text(value.scopeId), baselineId: text(value.baselineId), graphDigest,
        generation: text(value.generation), assessor: text(value.assessor), authority: uniqueTexts(value.authority, true), binding: obligationEffectiveBinding };
}
exports.ObligationLeaseReaders = { V1: readObligationLeaseV1 };
function parseObligationLease(text) {
    return readObligationLeaseV1(parseVersionOneRecord(text, 'lease'));
}
function freezeObligationLease(obligationDocumentV1, obligationBindingHistoryV1, obligationLeaseRequest) {
    exactRecord(obligationLeaseRequest, ['obligationId', 'graphDigest', 'generation', 'assessor', 'authority']);
    const bindings = projectObligationBindings(obligationDocumentV1, obligationBindingHistoryV1);
    const obligationBaseline = currentBaseline(obligationDocumentV1);
    const authority = uniqueTexts(obligationLeaseRequest.authority, true);
    requireBinding(obligationBaseline.authority.assessors.includes(obligationLeaseRequest.assessor)
        && authority.every(reference => obligationBaseline.authority.references.includes(reference)), 'unauthorized lease issuance');
    const obligationEffectiveBinding = bindings.get(obligationLeaseRequest.obligationId);
    requireBinding(obligationEffectiveBinding, 'lease obligation outside accepted baseline');
    return readObligationLeaseV1({ schemaVersion: 1, scopeId: obligationDocumentV1.scopeId, baselineId: obligationBaseline.id,
        graphDigest: obligationLeaseRequest.graphDigest, generation: obligationLeaseRequest.generation,
        assessor: obligationLeaseRequest.assessor, authority, binding: obligationEffectiveBinding });
}
function assertObligationLeaseOperation(obligationLeaseV1, generation, graphDigest, operation, changedPaths = []) {
    const checkedObligationLeaseV1 = readObligationLeaseV1(obligationLeaseV1);
    requireBinding(checkedObligationLeaseV1.generation === generation, 'stale lease generation');
    requireBinding(checkedObligationLeaseV1.graphDigest === graphDigest, 'wrong frozen graph identity');
    const obligationExecution = checkedObligationLeaseV1.binding.execution;
    requireBinding(obligationExecution.operations.includes(operation), 'operation outside frozen lease');
    requireBinding(Array.isArray(changedPaths) && new Set(changedPaths).size === changedPaths.length, 'invalid changed paths');
    requireBinding(operation !== 'edit' || changedPaths.length > 0, 'edit must identify changed paths');
    requireBinding(changedPaths.length === 0 || obligationExecution.operations.includes('edit'), 'changes require frozen edit permission');
    for (const changedPath of changedPaths) {
        (0, obligations_js_1.relativePath)(changedPath);
        requireBinding(obligationExecution.plannedPaths.some(permitted => changedPath === permitted || changedPath.startsWith(`${permitted}/`)), `change outside frozen lease: ${changedPath}`);
    }
}
