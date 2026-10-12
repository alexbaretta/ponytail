#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/obligations.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObligationDocumentReaders = void 0;
exports.isObligationGitInputs = isObligationGitInputs;
exports.obligationInputPaths = obligationInputPaths;
exports.obligationInputCovers = obligationInputCovers;
exports.relativePath = relativePath;
exports.readObligationExecution = readObligationExecution;
exports.readObligationEvidence = readObligationEvidence;
exports.readObligationDocumentV1 = readObligationDocumentV1;
exports.parseObligationDocument = parseObligationDocument;
exports.inputDigest = inputDigest;
exports.gitInputReasons = gitInputReasons;
exports.createObligationGitInputs = createObligationGitInputs;
exports.freshCertificate = freshCertificate;
exports.projectObligations = projectObligations;
exports.projectObligationHistoricalAcceptance = projectObligationHistoricalAcceptance;
exports.projectObligationScope = projectObligationScope;
exports.compareVectors = compareVectors;
exports.selectObligation = selectObligation;
exports.acceptCheckpoint = acceptCheckpoint;
exports.main = main;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const lossless_json_1 = require("lossless-json");
const obligation_binding_history_js_1 = require("./obligation-binding-history.js");
function isObligationGitInputs(value) {
    return 'schemaVersion' in value && value.schemaVersion === 2;
}
function obligationInputPaths(value) {
    return isObligationGitInputs(value) ? value.paths : value.map(input => input.path);
}
function obligationInputCovers(value, relative) {
    return obligationInputPaths(value).some(scope => scope === relative || isObligationGitInputs(value) && relative.startsWith(`${scope}/`));
}
const COORDINATES = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'];
function requireCondition(condition, message) {
    if (!condition)
        throw new Error(message);
}
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(value, keys, label) {
    requireCondition(isRecord(value), `${label} must be an object`);
    requireCondition(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), `${label} must contain exactly ${keys.join(', ')}`);
}
function nonemptyString(value, label) {
    requireCondition(typeof value === 'string' && value.trim().length > 0, `${label} must be a nonempty string`);
}
function stringValue(value, label) { nonemptyString(value, label); return value; }
function nullableString(value, label) { return value === null ? null : stringValue(value, label); }
function booleanValue(value, label) {
    requireCondition(typeof value === 'boolean', `${label} must be boolean`);
    return value;
}
function integerValue(value, label) {
    requireCondition(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, `${label} must be a safe nonnegative integer`);
    return value;
}
function arrayValue(value, label) {
    requireCondition(Array.isArray(value), `${label} must be an array`);
    return value;
}
function uniqueStrings(value, label, nonempty = false) {
    const strings = arrayValue(value, label).map(item => stringValue(item, label));
    requireCondition(new Set(strings).size === strings.length && (!nonempty || strings.length > 0), `${label} must contain unique${nonempty ? ', nonempty' : ''} values`);
    return strings;
}
function relativePath(value) {
    nonemptyString(value, 'path');
    requireCondition(!value.includes('\\') && !value.split('/').some(segment => !segment || segment === '.' || segment === '..') && !/[:*?{}]/.test(value), `invalid repository-relative path: ${value}`);
}
function pathValue(value) { relativePath(value); return value; }
function inputValue(value) {
    exactKeys(value, ['path', 'digest'], 'input');
    const digest = stringValue(value.digest, 'digest');
    requireCondition(/^[a-f0-9]{64}$/.test(digest), 'input requires SHA-256 digests');
    return { path: pathValue(value.path), digest };
}
function inputs(value, label) {
    if (isRecord(value)) {
        exactKeys(value, ['schemaVersion', 'revision', 'paths'], label);
        requireCondition(value.schemaVersion === 2, 'unsupported Git inputs version');
        const revision = stringValue(value.revision, 'Git revision');
        requireCondition(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision), 'Git inputs require a full commit ID');
        return { schemaVersion: 2, revision, paths: uniqueStrings(value.paths, 'Git input paths', true).map(pathValue) };
    }
    const obligationInputs = arrayValue(value, label).map(inputValue);
    requireCondition(obligationInputs.length > 0, `${label} requires a nonempty input manifest`);
    requireCondition(new Set(obligationInputs.map(item => item.path)).size === obligationInputs.length, `${label} must contain unique values`);
    return obligationInputs;
}
function isObligationVector(value) {
    return Array.isArray(value) && value.length === 6 && value.every((number) => typeof number === 'number' && Number.isSafeInteger(number) && number >= 0);
}
function vector(value) {
    requireCondition(isObligationVector(value), 'vector must contain six safe nonnegative integers');
    return value;
}
function namedRecords(value, label) {
    requireCondition(new Set(value.map(record => record.id)).size === value.length, `${label} IDs must contain unique values`);
}
function references(value, ids, label) {
    requireCondition(value.every(id => ids.has(id)), `${label} contains an unknown reference`);
}
function categoryValue(value) {
    switch (value) {
        case 'T1':
        case 'T2':
        case 'T3':
        case 'T4':
        case 'C1':
        case 'C2':
        case 'gate': return value;
        default: throw new Error('unknown obligation category');
    }
}
function outcomeValue(value) {
    switch (value) {
        case 'pass':
        case 'fail':
        case 'unavailable': return value;
        default: throw new Error('invalid evidence outcome');
    }
}
function checkpointKind(value) {
    switch (value) {
        case 'initial':
        case 'productive':
        case 'neutral':
        case 'disturbance':
        case 'rebaseline': return value;
        default: throw new Error('unknown checkpoint kind');
    }
}
function targetValue(value) {
    exactKeys(value, ['identity', 'profile'], 'execution target');
    return { identity: stringValue(value.identity, 'target identity'), profile: stringValue(value.profile, 'target profile') };
}
function readObligationExecution(value) {
    exactKeys(value, ['sprintId', 'taskletIds', 'plannedPaths', 'operations', 'selection', 'target'], 'execution');
    const obligationExecution = { sprintId: nullableString(value.sprintId, 'execution sprintId'), taskletIds: uniqueStrings(value.taskletIds, 'taskletIds'),
        plannedPaths: uniqueStrings(value.plannedPaths, 'plannedPaths').map(pathValue), operations: uniqueStrings(value.operations, 'operations', true),
        selection: uniqueStrings(value.selection, 'execution selection'), target: value.target === null ? null : targetValue(value.target) };
    requireCondition(obligationExecution.sprintId === null || /^S[0-9]+$/.test(obligationExecution.sprintId), 'invalid execution sprintId');
    requireCondition(obligationExecution.taskletIds.every(id => /^S[0-9]+-F[0-9]+-T[0-9]+$/.test(id) && id.startsWith(`${obligationExecution.sprintId}-`)), 'tasklet binding requires its owning sprint');
    return obligationExecution;
}
function obligationValue(value) {
    exactKeys(value, ['id', 'category', 'requirementIds', 'responsibilityId', 'condition', 'criterion', 'dependsOn', 'acceptanceGroups', 'supersedes', 'execution'], 'obligation');
    return { id: stringValue(value.id, 'obligation ID'), category: categoryValue(value.category), requirementIds: uniqueStrings(value.requirementIds, 'requirementIds'),
        responsibilityId: stringValue(value.responsibilityId, 'responsibilityId'), condition: stringValue(value.condition, 'condition'),
        criterion: stringValue(value.criterion, 'criterion'), dependsOn: uniqueStrings(value.dependsOn, 'dependsOn'),
        acceptanceGroups: uniqueStrings(value.acceptanceGroups, 'acceptanceGroups', true), supersedes: nullableString(value.supersedes, 'supersedes'), execution: readObligationExecution(value.execution) };
}
function baselineValue(value) {
    exactKeys(value, ['id', 'predecessorId', 'authority', 'requirements', 'obligationIds', 'inventoryIds'], 'baseline');
    exactKeys(value.authority, ['references', 'assessors'], 'baseline authority');
    const requirements = arrayValue(value.requirements, 'requirements').map(item => {
        exactKeys(item, ['id', 'path', 'digest'], 'requirement');
        return { id: stringValue(item.id, 'requirement ID'), ...inputValue({ path: item.path, digest: item.digest }) };
    });
    namedRecords(requirements, 'baseline requirements');
    return { id: stringValue(value.id, 'baseline ID'), predecessorId: nullableString(value.predecessorId, 'baseline predecessor'),
        authority: { references: uniqueStrings(value.authority.references, 'authority references', true), assessors: uniqueStrings(value.authority.assessors, 'authorized assessors', true) },
        requirements, obligationIds: uniqueStrings(value.obligationIds, 'baseline obligationIds'), inventoryIds: uniqueStrings(value.inventoryIds, 'baseline inventoryIds') };
}
function dispositionValue(value) {
    exactKeys(value, ['responsibilityId', 'reason', 'authority'], 'disposition');
    return { responsibilityId: stringValue(value.responsibilityId, 'disposition responsibilityId'), reason: stringValue(value.reason, 'disposition reason'), authority: uniqueStrings(value.authority, 'disposition authority', true) };
}
function timestampValue(value, label) {
    const timestamp = stringValue(value, label);
    requireCondition(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) && Number.isFinite(Date.parse(timestamp)), `${label} must be an ISO timestamp with offset`);
    return timestamp;
}
function readObligationEvidence(value) {
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
function certificateValue(value) {
    exactKeys(value, ['id', 'obligationIds', 'inputs', 'artifacts', 'assessor', 'authority', 'adequate', 'reason', 'disposition', 'evidence', 'inventoryIds'], 'certificate');
    const obligationIds = uniqueStrings(value.obligationIds, 'certificate obligationIds', true);
    return { id: stringValue(value.id, 'certificate ID'), obligationIds, inputs: inputs(value.inputs, 'certificate inputs'),
        artifacts: uniqueStrings(value.artifacts, 'certificate artifacts', true).map(pathValue), assessor: stringValue(value.assessor, 'certificate assessor'),
        authority: uniqueStrings(value.authority, 'certificate authority', true), adequate: booleanValue(value.adequate, 'adequate'), reason: stringValue(value.reason, 'certificate rationale'),
        disposition: value.disposition === null ? null : dispositionValue(value.disposition), evidence: arrayValue(value.evidence, 'evidence').map(readObligationEvidence), inventoryIds: uniqueStrings(value.inventoryIds, 'certificate inventoryIds') };
}
function preparationValue(value) {
    exactKeys(value, ['obligationId', 'operations', 'deliverable'], 'preparation');
    return { obligationId: stringValue(value.obligationId, 'preparation obligationId'), operations: uniqueStrings(value.operations, 'bounded preparation operations', true), deliverable: stringValue(value.deliverable, 'preparation deliverable') };
}
function checkpointValue(value) {
    exactKeys(value, ['id', 'predecessorId', 'baselineId', 'kind', 'selectedIds', 'registeredIds', 'certificateIds', 'invalidatedIds', 'before', 'after', 'preparation', 'reason', 'assessor'], 'checkpoint');
    return { id: stringValue(value.id, 'checkpoint ID'), predecessorId: nullableString(value.predecessorId, 'checkpoint predecessor'), baselineId: stringValue(value.baselineId, 'checkpoint baseline'),
        kind: checkpointKind(value.kind), selectedIds: uniqueStrings(value.selectedIds, 'checkpoint selectedIds'), registeredIds: uniqueStrings(value.registeredIds, 'checkpoint registeredIds'), certificateIds: uniqueStrings(value.certificateIds, 'checkpoint certificateIds'), invalidatedIds: uniqueStrings(value.invalidatedIds, 'checkpoint invalidatedIds'),
        before: vector(value.before), after: vector(value.after), preparation: value.preparation === null ? null : preparationValue(value.preparation), reason: stringValue(value.reason, 'reason'), assessor: stringValue(value.assessor, 'assessor') };
}
function requireObligation(obligationDocument, id) {
    const obligation = obligationDocument.obligations.find(item => item.id === id);
    requireCondition(obligation, `unknown obligation: ${id}`);
    return obligation;
}
function requireCertificate(obligationDocument, id) {
    const obligationCertificate = obligationDocument.certificates.find(item => item.id === id);
    requireCondition(obligationCertificate, `unknown certificate: ${id}`);
    return obligationCertificate;
}
function isObligationDocumentV1(value) {
    exactKeys(value, ['schemaVersion', 'scopeId', 'baselines', 'obligations', 'certificates', 'checkpoints'], 'obligation document V1');
    requireCondition(value.schemaVersion === 1, 'unsupported obligation document schemaVersion');
    const obligationDocument = {
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
    const visiting = new Set();
    const visited = new Set();
    function visit(id) {
        requireCondition(!visiting.has(id), `cyclic obligation dependency: ${id}`);
        if (visited.has(id))
            return;
        visiting.add(id);
        requireObligation(obligationDocument, id).dependsOn.forEach(visit);
        visiting.delete(id);
        visited.add(id);
    }
    obligationDocument.obligations.forEach(obligation => visit(obligation.id));
    let predecessorId = null;
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
        if (checkpoint.preparation !== null)
            requireCondition(obligationIds.has(checkpoint.preparation.obligationId), 'unknown preparation obligation');
    }
    const obligationHistory = replayHistory(obligationDocument);
    if (obligationDocument.checkpoints.length) {
        const currentBaseline = obligationDocument.baselines.at(-1);
        requireCondition(currentBaseline, 'a baseline is required');
        requireCondition(obligationHistory.baseline.id === currentBaseline.id, 'current baseline must have an accepted observation');
        requireCondition((0, node_util_1.isDeepStrictEqual)(obligationHistory.baseline.obligationIds, currentBaseline.obligationIds), 'current observation contains unregistered obligation membership');
    }
    return true;
}
function readObligationDocumentV1(value) {
    requireCondition(isObligationDocumentV1(value), 'invalid obligation document');
    return value;
}
function parseObligationDocument(text) {
    return readObligationDocumentV1((0, lossless_json_1.parse)(text, null, token => {
        const number = Number(token);
        requireCondition(/^(0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(number), `unsupported JSON number token: ${token}`);
        return number;
    }));
}
exports.ObligationDocumentReaders = {
    V1: readObligationDocumentV1,
};
function inputDigest(root, relative) {
    relativePath(relative);
    const repositoryRoot = node_fs_1.default.realpathSync(root);
    const inputPath = node_fs_1.default.realpathSync(node_path_1.default.join(repositoryRoot, relative));
    const resolved = node_path_1.default.relative(repositoryRoot, inputPath);
    requireCondition(resolved !== '' && !resolved.startsWith(`..${node_path_1.default.sep}`) && resolved !== '..' && !node_path_1.default.isAbsolute(resolved), `input escapes repository: ${relative}`);
    requireCondition(node_fs_1.default.statSync(inputPath).isFile(), `input must be a regular file: ${relative}`);
    return node_crypto_1.default.createHash('sha256').update(node_fs_1.default.readFileSync(inputPath)).digest('hex');
}
function gitInputReasons(root, obligationGitInputs) {
    const reasons = [];
    const git = (args) => (0, node_child_process_1.spawnSync)('git', ['--literal-pathspecs', '-C', root, ...args], { encoding: 'utf8' });
    if (git(['cat-file', '-e', `${obligationGitInputs.revision}^{commit}`]).status !== 0)
        return ['unavailable Git verification revision'];
    for (const relative of obligationGitInputs.paths) {
        relativePath(relative);
        if (git(['cat-file', '-e', `${obligationGitInputs.revision}:${relative}`]).status !== 0)
            reasons.push(`input absent from verified Git revision: ${relative}`);
    }
    for (const args of [['diff', '--quiet', obligationGitInputs.revision, '--', ...obligationGitInputs.paths],
        ['diff', '--cached', '--quiet', obligationGitInputs.revision, '--', ...obligationGitInputs.paths]]) {
        const result = git(args);
        if (result.status === 1)
            reasons.push('changed Git inputs');
        else if (result.status !== 0)
            reasons.push('Git input comparison failed');
    }
    return reasons;
}
function createObligationGitInputs(root, paths) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', root, 'rev-parse', '--verify', 'HEAD^{commit}'], { encoding: 'utf8' });
    requireCondition(result.status === 0, 'Git inputs require a committed HEAD');
    const value = inputs({ schemaVersion: 2, revision: result.stdout.trim(), paths }, 'Git inputs');
    requireCondition(isObligationGitInputs(value), 'expected Git inputs');
    const reasons = gitInputReasons(root, value);
    requireCondition(reasons.length === 0, reasons.join('; '));
    return value;
}
function certificateReasons(obligationDocument, baseline, certificate) {
    const reasons = [];
    if (!certificate.adequate)
        reasons.push('adequacy assessment is negative');
    if (!baseline.authority.assessors.includes(certificate.assessor) || !certificate.authority.every(reference => baseline.authority.references.includes(reference)))
        reasons.push('assessment lacks baseline authority');
    if (!certificate.obligationIds.every(id => baseline.obligationIds.includes(id)))
        reasons.push('certificate covers obligations outside baseline');
    const gitInputs = isObligationGitInputs(certificate.inputs);
    const obligationInputs = certificate.inputs;
    const manifest = new Map(isObligationGitInputs(obligationInputs)
        ? obligationInputs.paths.map(relative => [relative, obligationInputs.revision])
        : obligationInputs.map(input => [input.path, input.digest]));
    const requiredPaths = gitInputs ? [] : [...certificate.artifacts];
    const requirementIds = new Set(obligationDocument.obligations.filter(obligation => certificate.obligationIds.includes(obligation.id)).flatMap(obligation => obligation.requirementIds));
    for (const requirement of baseline.requirements.filter(requirement => requirementIds.has(requirement.id))) {
        requiredPaths.push(requirement.path);
        if (!gitInputs && manifest.get(requirement.path) !== requirement.digest)
            reasons.push(`baseline meaning not preserved: ${requirement.id}`);
    }
    if (certificate.disposition && !certificate.disposition.authority.every(reference => baseline.authority.references.includes(reference)))
        reasons.push('disposition lacks authority');
    const executionRequired = certificate.obligationIds.some(id => {
        const obligation = requireObligation(obligationDocument, id);
        return ['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id);
    });
    if (executionRequired && certificate.evidence.length === 0)
        reasons.push('execution proof is missing');
    for (const evidence of certificate.evidence) {
        if (evidence.outcome !== 'pass' || evidence.skips !== 0 || evidence.failures !== 0 || evidence.finalization !== 'pass')
            reasons.push('execution is failed, skipped, unavailable or not finalized');
        requiredPaths.push(evidence.target.verification);
        if (!gitInputs)
            requiredPaths.push(evidence.outputPath);
        for (const id of certificate.obligationIds) {
            const obligation = requireObligation(obligationDocument, id);
            if (['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id)) {
                const execution = obligation.execution;
                if (!execution.target || execution.target.identity !== evidence.target.identity || execution.target.profile !== evidence.target.profile || !execution.operations.includes(evidence.command) || JSON.stringify(execution.selection) !== JSON.stringify(evidence.selection) || execution.selection.length === 0)
                    reasons.push(`wrong execution command, selection or target: ${id}`);
            }
        }
        if (isObligationGitInputs(evidence.inputs)) {
            if (!gitInputs || evidence.revision !== evidence.inputs.revision || evidence.dirty)
                reasons.push('Git proof must identify its clean tested revision');
            requiredPaths.push(...evidence.inputs.paths);
        }
        else {
            if (gitInputs)
                reasons.push('Git certificates require Git proof inputs');
            for (const input of evidence.inputs) {
                requiredPaths.push(input.path);
                if (manifest.get(input.path) !== input.digest)
                    reasons.push(`evidence manifest disagrees: ${input.path}`);
            }
        }
    }
    for (const relative of requiredPaths)
        if (!obligationInputCovers(certificate.inputs, relative))
            reasons.push(`unassessed artifact or evidence input: ${relative}`);
    for (const id of certificate.obligationIds.filter(id => baseline.inventoryIds.includes(id))) {
        const category = requireObligation(obligationDocument, id).category;
        const inventoryIds = baseline.obligationIds.filter(member => requireObligation(obligationDocument, member).category === category && !baseline.inventoryIds.includes(member));
        if (inventoryIds.length !== certificate.inventoryIds.length || inventoryIds.some(member => !certificate.inventoryIds.includes(member)))
            reasons.push(`incomplete inventory assessment: ${id}`);
        if (certificate.disposition)
            reasons.push('inventory cannot be closed by unit disposition');
    }
    return reasons;
}
function freshCertificate(obligationDocument, baseline, certificate, root) {
    const reasons = certificateReasons(obligationDocument, baseline, certificate);
    if (isObligationGitInputs(certificate.inputs)) {
        reasons.push(...gitInputReasons(root, certificate.inputs));
        for (const evidence of certificate.evidence)
            if (isObligationGitInputs(evidence.inputs))
                reasons.push(...gitInputReasons(root, evidence.inputs));
        for (const relative of [...certificate.artifacts, ...certificate.evidence.map(evidence => evidence.outputPath)])
            if (!node_fs_1.default.existsSync(node_path_1.default.join(root, relative)))
                reasons.push(`unavailable evidence: ${relative}`);
    }
    else
        for (const input of certificate.inputs) {
            try {
                if (inputDigest(root, input.path) !== input.digest)
                    reasons.push(`changed input: ${input.path}`);
            }
            catch (error) {
                reasons.push(`unavailable input ${input.path}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    return { fresh: reasons.length === 0, reasons };
}
function prerequisites(obligation, bindings) {
    if (bindings === undefined)
        return obligation.dependsOn;
    const obligationEffectiveBinding = bindings.get(obligation.id);
    requireCondition(obligationEffectiveBinding, `missing effective binding: ${obligation.id}`);
    return obligationEffectiveBinding.dependsOn;
}
function projectBaseline(obligationDocument, baseline, accepted, root, bindings) {
    const satisfied = new Set();
    const assessments = [];
    for (const certificate of obligationDocument.certificates.filter(certificate => accepted.has(certificate.id))) {
        const reasons = root === null ? certificateReasons(obligationDocument, baseline, certificate)
            : freshCertificate(obligationDocument, baseline, certificate, root).reasons;
        assessments.push({ id: certificate.id, valid: reasons.length === 0, reasons });
        if (reasons.length === 0)
            certificate.obligationIds.forEach(id => satisfied.add(id));
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
function projectObligations(obligationDocument, root) {
    return projectObligationScope(obligationDocument, root).projection;
}
function projectObligationHistoricalAcceptance(obligationDocument) {
    readObligationDocumentV1(obligationDocument);
    const replay = replayHistory(obligationDocument);
    return { baselineId: replay.baseline.id, checkpointId: obligationDocument.checkpoints.at(-1)?.id ?? null,
        complete: projectBaseline(obligationDocument, replay.baseline, replay.accepted, null).complete };
}
function projectObligationScope(obligationDocument, root, obligationBindingHistoryV1) {
    readObligationDocumentV1(obligationDocument);
    const replay = replayHistory(obligationDocument);
    const bindings = (0, obligation_binding_history_js_1.projectObligationBindings)(obligationDocument, obligationBindingHistoryV1 === undefined
        ? { schemaVersion: 1, scopeId: obligationDocument.scopeId, revisions: [] } : obligationBindingHistoryV1);
    return { projection: projectBaseline(obligationDocument, replay.baseline, replay.accepted, root, bindings), bindings };
}
function compareVectors(before, after) {
    vector(before);
    vector(after);
    for (let index = 0; index < 6; index++) {
        const left = before[index];
        const right = after[index];
        requireCondition(left !== undefined && right !== undefined, 'vector must contain six safe nonnegative integers');
        if (left !== right)
            return Math.sign(right - left);
    }
    return 0;
}
function selectObligation(obligationDocument, root, obligationBindingHistoryV1) {
    const obligationScopeProjection = projectObligationScope(obligationDocument, root, obligationBindingHistoryV1);
    const projection = obligationScopeProjection.projection;
    const category = COORDINATES[projection.vector.findIndex(count => count > 0)];
    if (!category)
        return { category: null, selectedId: null, blockedIds: projection.gates, projection };
    const unresolved = obligationDocument.obligations.filter(obligation => projection.unresolvedIds.includes(obligation.id) && obligation.category === category);
    const eligible = unresolved.filter(obligation => prerequisites(obligation, obligationScopeProjection.bindings).every(id => projection.satisfiedIds.includes(id)));
    return { category, selectedId: eligible[0]?.id ?? null,
        blockedIds: unresolved.filter(obligation => !eligible.includes(obligation)).map(obligation => obligation.id), projection };
}
function checkpointTransition(obligationDocument, checkpoint, before, after, priorCheckpoints) {
    requireCondition(compareVectors(checkpoint.before, before) === 0 && compareVectors(checkpoint.after, after) === 0, `checkpoint vectors disagree with derived state: ${checkpoint.id}`);
    const difference = compareVectors(before, after);
    if (checkpoint.kind === 'productive') {
        requireCondition(difference < 0, 'productive checkpoint requires strict lexicographic decrease');
        const category = COORDINATES[before.findIndex(count => count > 0)];
        requireCondition(checkpoint.selectedIds.length > 0 && checkpoint.selectedIds.every(id => requireObligation(obligationDocument, id).category === category), 'productive selection must remain in earliest coordinate');
        requireCondition(checkpoint.preparation === null, 'productive checkpoint cannot be preparation');
    }
    else if (checkpoint.kind === 'neutral') {
        requireCondition(difference === 0 && checkpoint.preparation !== null && checkpoint.registeredIds.length === 0 && checkpoint.invalidatedIds.length === 0 && checkpoint.certificateIds.every(id => requireCertificate(obligationDocument, id).obligationIds.every(member => requireObligation(obligationDocument, member).category === 'gate')), 'neutral checkpoint requires bounded preparation; only non-metric gates may be certified');
        const preparation = checkpoint.preparation;
        requireCondition(preparation, 'neutral checkpoint requires preparation');
        const obligation = requireObligation(obligationDocument, preparation.obligationId);
        requireCondition(checkpoint.selectedIds.includes(obligation.id) && checkpoint.preparation.operations.every(operation => obligation.execution.operations.includes(operation)), 'preparation exceeds selected execution binding');
        const sinceChange = priorCheckpoints.slice(priorCheckpoints.findLastIndex(previous => previous.kind !== 'neutral') + 1);
        requireCondition(!sinceChange.some(previous => (0, node_util_1.isDeepStrictEqual)(previous.preparation, checkpoint.preparation)), 'repeated completed preparation on unchanged state');
    }
    else {
        requireCondition(checkpoint.preparation === null, 'only neutral checkpoints permit preparation');
        if (checkpoint.kind === 'disturbance')
            requireCondition(difference >= 0 && (difference > 0 || checkpoint.invalidatedIds.length > 0 || checkpoint.registeredIds.length > 0), 'disturbance must record discovery or invalidation honestly');
    }
}
function replayHistory(obligationDocument) {
    const firstBaseline = obligationDocument.baselines[0];
    requireCondition(firstBaseline, 'a baseline is required');
    let baseline = firstBaseline;
    let membership = [];
    const accepted = new Set();
    const priorCheckpoints = [];
    for (const checkpoint of obligationDocument.checkpoints) {
        requireCondition(baseline.authority.assessors.includes(checkpoint.assessor) || checkpoint.kind === 'rebaseline', 'checkpoint assessor lacks authority');
        const before = priorCheckpoints.at(-1)?.after ?? projectBaseline(obligationDocument, { ...baseline, obligationIds: checkpoint.registeredIds }, accepted, null).vector;
        if (checkpoint.kind === 'initial') {
            requireCondition(priorCheckpoints.length === 0 && checkpoint.baselineId === baseline.id && checkpoint.selectedIds.length === 0 && checkpoint.certificateIds.length === 0 && checkpoint.invalidatedIds.length === 0, 'initial checkpoint must only observe first baseline');
            membership = [...checkpoint.registeredIds];
            requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'initial observation must register complete known membership');
        }
        else if (checkpoint.kind === 'rebaseline') {
            const successor = obligationDocument.baselines.find(item => item.id === checkpoint.baselineId);
            requireCondition(successor, 'unknown checkpoint baseline');
            requireCondition(successor.predecessorId === baseline.id && successor.authority.assessors.includes(checkpoint.assessor), 'rebaseline requires authorized immediate successor');
            baseline = successor;
            membership = [...checkpoint.registeredIds];
            requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'rebaseline must register complete known membership');
        }
        else {
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
                if (checkpoint.kind === 'productive')
                    requireCondition(obligation.dependsOn.every(dependency => beforeProjection.satisfiedIds.includes(dependency)), 'historical selection prerequisites are unresolved');
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
function appendOnly(previous, candidate, label) {
    requireCondition(candidate.length >= previous.length && previous.every((item, index) => (0, node_util_1.isDeepStrictEqual)(item, candidate[index])), `${label} accepted prefix must be immutable`);
}
function acceptCheckpoint(previous, candidate, root) {
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
        requireCondition((0, node_util_1.isDeepStrictEqual)({ ...before, obligationIds: [] }, { ...after, obligationIds: [] }), 'baseline meaning and authority require a new baseline');
    }
    const before = projectObligations(previous, root);
    const acceptedBefore = previous.checkpoints.at(-1)?.after ?? before.vector;
    if (compareVectors(before.vector, acceptedBefore) !== 0)
        requireCondition(checkpoint.kind === 'disturbance' || checkpoint.kind === 'rebaseline', 'changed inputs require disturbance before productive work');
    if (checkpoint.kind === 'productive' || checkpoint.kind === 'neutral') {
        const category = COORDINATES[before.vector.findIndex(count => count > 0)];
        for (const id of checkpoint.selectedIds) {
            const obligation = previous.obligations.find(obligation => obligation.id === id);
            requireCondition(obligation && (obligation.category === category || checkpoint.kind === 'neutral' && obligation.category === 'gate') && before.unresolvedIds.includes(id), 'selection must resolve current earliest obligation');
            if (checkpoint.kind === 'productive')
                requireCondition(obligation.dependsOn.every(dependency => before.satisfiedIds.includes(dependency)), 'selected obligation prerequisites are unresolved');
        }
    }
    const replay = replayHistory(candidate);
    for (const requirement of replay.baseline.requirements)
        requireCondition(inputDigest(root, requirement.path) === requirement.digest, `requirement meaning changed without activated baseline: ${requirement.id}`);
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
function main(argv) {
    const [operation, documentPath, root, ...extra] = argv;
    const [flag, bindingHistoryPath, ...trailing] = extra;
    if (!operation || !['validate', 'status', 'select'].includes(operation) || !documentPath || !root
        || extra.length > 0 && (flag !== '--binding-history' || !bindingHistoryPath || trailing.length > 0)) {
        process.stderr.write('Usage: obligations.js <validate|status|select> <document-path> <repository-root> [--binding-history <relative-path>]\n');
        return 2;
    }
    let text;
    let historyText;
    try {
        text = node_fs_1.default.readFileSync(documentPath, 'utf8');
        const repositoryRoot = node_fs_1.default.realpathSync(root);
        if (bindingHistoryPath !== undefined) {
            relativePath(bindingHistoryPath);
            const file = node_path_1.default.join(repositoryRoot, bindingHistoryPath);
            requireCondition(node_fs_1.default.lstatSync(file).isFile() && node_fs_1.default.realpathSync(file) === file, 'binding history must be a regular coordinator file without symlink ancestors');
            historyText = node_fs_1.default.readFileSync(file, 'utf8');
        }
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        return 2;
    }
    try {
        const obligationDocument = parseObligationDocument(text);
        const obligationBindingHistoryV1 = historyText === undefined ? undefined : (0, obligation_binding_history_js_1.parseObligationBindingHistory)(historyText);
        const result = operation === 'select' ? selectObligation(obligationDocument, root, obligationBindingHistoryV1)
            : projectObligationScope(obligationDocument, root, obligationBindingHistoryV1).projection;
        process.stdout.write(`${JSON.stringify(result)}\n`);
        return 0;
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
    }
}
if (require.main === module)
    process.exitCode = main(process.argv.slice(2));
