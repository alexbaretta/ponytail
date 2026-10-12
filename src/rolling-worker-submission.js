// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-worker-submission.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingWorkerSubmissionReaders = void 0;
exports.readRollingWorkerSubmissionV1 = readRollingWorkerSubmissionV1;
exports.parseRollingWorkerSubmission = parseRollingWorkerSubmission;
exports.validateRollingWorkerSubmission = validateRollingWorkerSubmission;
const node_fs_1 = __importDefault(require("node:fs"));
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const lossless_json_1 = require("lossless-json");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
const obligation_binding_history_js_1 = require("../skills/plan-execution/scripts/obligation-binding-history.js");
function requireSubmission(condition, message) {
    if (!condition)
        throw new Error(`rolling submission: ${message}`);
}
function record(value, keys) {
    requireSubmission(value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value) {
    requireSubmission(typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0'), 'invalid identity');
    return value;
}
function commit(value) {
    const revision = text(value);
    requireSubmission(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision), 'invalid exact Git commit');
    return revision;
}
function readRollingSubmissionProof(value) {
    record(value, ['operation', 'evidence']);
    return { operation: text(value.operation), evidence: (0, obligations_js_1.readObligationEvidence)(value.evidence) };
}
function readRollingWorkerSubmissionV1(value) {
    record(value, ['schemaVersion', 'campaignId', 'assignmentId', 'generation', 'sessionId', 'graphDigest', 'revision', 'baseCommit', 'stopped', 'proof']);
    requireSubmission(value.schemaVersion === 1 && value.stopped === true && Array.isArray(value.proof) && value.proof.length > 0, 'submission requires V1, stopped activity and focused proof');
    const graphDigest = text(value.graphDigest);
    requireSubmission(/^[a-f0-9]{64}$/u.test(graphDigest), 'invalid graph digest');
    return { schemaVersion: 1, campaignId: text(value.campaignId), assignmentId: text(value.assignmentId), generation: text(value.generation),
        sessionId: text(value.sessionId), graphDigest, revision: commit(value.revision), baseCommit: commit(value.baseCommit),
        stopped: true, proof: value.proof.map(readRollingSubmissionProof) };
}
exports.RollingWorkerSubmissionReaders = { V1: readRollingWorkerSubmissionV1 };
function parseRollingWorkerSubmission(text) {
    return readRollingWorkerSubmissionV1((0, lossless_json_1.parse)(text, null, token => {
        requireSubmission(/^(0|[1-9][0-9]*)$/u.test(token), 'numbers must be exact unsigned integers');
        const number = Number(token);
        requireSubmission(Number.isSafeInteger(number), 'number exceeds safe integer range');
        return number;
    }));
}
function git(root, argv) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', root, ...argv], { encoding: 'utf8' });
    requireSubmission(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || `Git ${argv[0]} failed`);
    return result.stdout;
}
function validateRollingWorkerSubmission(root, obligationLeaseV1, rollingWorkerSubmissionV1) {
    readRollingWorkerSubmissionV1(rollingWorkerSubmissionV1);
    requireSubmission(node_fs_1.default.realpathSync(root) === root && git(root, ['rev-parse', '--show-toplevel']).trim() === root, 'submission checkout identity differs');
    requireSubmission(rollingWorkerSubmissionV1.campaignId === obligationLeaseV1.scopeId, 'submission scope differs from lease');
    (0, rolling_worktrees_js_1.validateRollingSessionMarker)(root, rollingWorkerSubmissionV1.sessionId);
    for (const rebaseState of ['rebase-merge', 'rebase-apply']) {
        requireSubmission(!node_fs_1.default.existsSync(git(root, ['rev-parse', '--path-format=absolute', '--git-path', rebaseState]).trim()), 'candidate rebase is unfinished');
    }
    requireSubmission(git(root, ['status', '--porcelain=v1', '--untracked-files=all']).length === 0, 'candidate checkout is dirty');
    requireSubmission(git(root, ['rev-parse', 'HEAD']).trim() === rollingWorkerSubmissionV1.revision, 'candidate is not actual HEAD');
    git(root, ['merge-base', '--is-ancestor', rollingWorkerSubmissionV1.baseCommit, rollingWorkerSubmissionV1.revision]);
    requireSubmission(git(root, ['rev-list', '--merges', `${rollingWorkerSubmissionV1.baseCommit}..${rollingWorkerSubmissionV1.revision}`]).length === 0, 'candidate must be a linear rebased branch');
    const revisions = git(root, ['rev-list', `${rollingWorkerSubmissionV1.baseCommit}..${rollingWorkerSubmissionV1.revision}`]).trim().split('\n').filter(item => item.length > 0);
    const changedPaths = [...new Set(revisions.flatMap(revision => git(root, ['diff-tree', '--no-commit-id', '--no-renames', '--name-only', '-r', '-z', revision, '--'])
            .split('\0').filter(item => item.length > 0)))].sort();
    if (changedPaths.length > 0)
        (0, obligation_binding_history_js_1.assertObligationLeaseOperation)(obligationLeaseV1, rollingWorkerSubmissionV1.generation, rollingWorkerSubmissionV1.graphDigest, 'edit', changedPaths);
    const obligationExecution = obligationLeaseV1.binding.execution;
    requireSubmission(obligationExecution.target && obligationExecution.selection.length > 0, 'frozen binding has no proof target or selection');
    const assessed = new Set();
    for (const rollingSubmissionProof of rollingWorkerSubmissionV1.proof) {
        (0, obligation_binding_history_js_1.assertObligationLeaseOperation)(obligationLeaseV1, rollingWorkerSubmissionV1.generation, rollingWorkerSubmissionV1.graphDigest, rollingSubmissionProof.operation);
        const obligationEvidence = rollingSubmissionProof.evidence;
        requireSubmission(obligationEvidence.outcome === 'pass' && obligationEvidence.finalization === 'pass'
            && obligationEvidence.skips === 0 && obligationEvidence.failures === 0 && !obligationEvidence.dirty, 'focused proof is not clean, passing and finalized');
        requireSubmission(obligationEvidence.revision === rollingWorkerSubmissionV1.revision, 'proof belongs to another candidate');
        requireSubmission(obligationEvidence.target.identity === obligationExecution.target.identity
            && obligationEvidence.target.profile === obligationExecution.target.profile
            && JSON.stringify(obligationEvidence.selection) === JSON.stringify(obligationExecution.selection), 'proof differs from frozen target or selection');
        if ((0, obligations_js_1.isObligationGitInputs)(obligationEvidence.inputs)) {
            requireSubmission(obligationEvidence.inputs.revision === rollingWorkerSubmissionV1.revision, 'Git inputs belong to another candidate');
            requireSubmission((0, obligations_js_1.obligationInputCovers)(obligationEvidence.inputs, obligationEvidence.target.verification), 'unassessed target verification');
            requireSubmission((0, obligations_js_1.gitInputReasons)(root, obligationEvidence.inputs).length === 0, 'stale focused Git inputs');
            requireSubmission(node_fs_1.default.existsSync(node_path_1.default.join(root, obligationEvidence.outputPath)), 'missing focused proof output');
            for (const changedPath of changedPaths)
                if ((0, obligations_js_1.obligationInputCovers)(obligationEvidence.inputs, changedPath))
                    assessed.add(changedPath);
            continue;
        }
        const inputs = new Map(obligationEvidence.inputs.map(input => [input.path, input.digest]));
        requireSubmission(inputs.has(obligationEvidence.outputPath) && inputs.has(obligationEvidence.target.verification), 'unassessed proof output or target verification');
        for (const input of obligationEvidence.inputs) {
            requireSubmission((0, obligations_js_1.inputDigest)(root, input.path) === input.digest, `stale focused input: ${input.path}`);
            assessed.add(input.path);
        }
    }
    for (const changedPath of changedPaths) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(root, changedPath)))
            requireSubmission(assessed.has(changedPath), `changed input lacks focused evidence: ${changedPath}`);
    }
    return changedPaths;
}
