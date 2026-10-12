// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-integration.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingIncrementPublicationReaders = exports.RollingIncrementRebaseReaders = exports.RollingIncrementClaimReaders = void 0;
exports.gitResult = gitResult;
exports.git = git;
exports.prepareRollingIncrementRebase = prepareRollingIncrementRebase;
exports.rebasePreparedRollingIncrement = rebasePreparedRollingIncrement;
exports.fastRebaseRollingIncrement = fastRebaseRollingIncrement;
exports.verifyRollingIncrementConflictInspection = verifyRollingIncrementConflictInspection;
exports.continueFastRebaseRollingIncrement = continueFastRebaseRollingIncrement;
exports.reconcileRollingIncrementPublication = reconcileRollingIncrementPublication;
exports.publishRollingIncrement = publishRollingIncrement;
exports.fastForwardRollingIncrement = fastForwardRollingIncrement;
exports.readRollingIncrementClaimV1 = readRollingIncrementClaimV1;
exports.readRollingIncrementRebaseV1 = readRollingIncrementRebaseV1;
exports.verifyRollingIncrementRebase = verifyRollingIncrementRebase;
exports.readRollingIncrementPublicationV1 = readRollingIncrementPublicationV1;
exports.verifyRollingIncrementLocalIntegration = verifyRollingIncrementLocalIntegration;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
function requireIntegration(condition, message) {
    if (!condition)
        throw new Error(`rolling integration: ${message}`);
}
function gitResult(rootPath, argv, processEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' }) {
    const spawnSyncReturns = (0, node_child_process_1.spawnSync)('git', ['-C', rootPath, ...argv], { encoding: 'utf8', env: processEnv });
    if (spawnSyncReturns.error)
        throw spawnSyncReturns.error;
    return spawnSyncReturns;
}
function git(rootPath, argv) {
    const spawnSyncReturns = gitResult(rootPath, argv);
    requireIntegration(spawnSyncReturns.status === 0, spawnSyncReturns.stderr.trim() || `git ${argv[0]} failed`);
    return spawnSyncReturns.stdout;
}
function commit(value) {
    requireIntegration(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value), 'invalid commit identity');
    return value;
}
function rebaseResult(rootPath, rollingFastRebaseIdentity, spawnSyncReturns) {
    if (spawnSyncReturns.status !== 0) {
        const conflictedPaths = git(rootPath, ['diff', '--name-only', '--diff-filter=U', '-z']).split('\0').filter(value => value.length > 0);
        requireIntegration(conflictedPaths.length > 0, spawnSyncReturns.stderr.trim() || 'interactive rebase failed without textual conflicts');
        return { ...rollingFastRebaseIdentity, state: 'TEXTUAL_CONFLICT',
            originalCommit: commit(git(rootPath, ['rev-parse', 'REBASE_HEAD']).trim()), conflictedPaths };
    }
    const revision = commit(git(rootPath, ['rev-parse', 'HEAD']).trim());
    git(rootPath, ['merge-base', '--is-ancestor', rollingFastRebaseIdentity.integrationBase, revision]);
    requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'rebased checkout is not clean');
    return { ...rollingFastRebaseIdentity, state: 'REBASED', revision,
        proofRefreshRequired: revision !== rollingFastRebaseIdentity.reviewedRevision
            || rollingFastRebaseIdentity.integrationBase !== rollingFastRebaseIdentity.reviewedBase };
}
function prepareRollingIncrementRebase(rollingReviewedIncrement) {
    const { rootPath, revision, baseCommit } = rollingReviewedIncrement;
    const rollingIncrementTarget = rollingReviewedIncrement.target;
    commit(revision);
    commit(baseCommit);
    requireIntegration(node_fs_1.default.realpathSync(git(rootPath, ['rev-parse', '--show-toplevel']).trim()) === node_fs_1.default.realpathSync(rootPath), 'designated checkout differs from Git root');
    git(rootPath, ['symbolic-ref', '--quiet', 'HEAD']);
    requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'integration requires the stopped clean reviewed checkout');
    requireIntegration(git(rootPath, ['rev-parse', 'HEAD']).trim() === revision, 'checkout differs from accepted review');
    git(rootPath, ['merge-base', '--is-ancestor', baseCommit, revision]);
    git(rootPath, ['check-ref-format', `refs/heads/${rollingIncrementTarget.branch}`]);
    requireIntegration(git(rootPath, ['remote']).trim().split('\n').includes(rollingIncrementTarget.remote), 'unknown campaign remote');
    const remoteRef = `refs/remotes/${rollingIncrementTarget.remote}/${rollingIncrementTarget.branch}`;
    git(rootPath, ['fetch', '--no-tags', '--', rollingIncrementTarget.remote, `refs/heads/${rollingIncrementTarget.branch}:${remoteRef}`]);
    const integrationBase = commit(git(rootPath, ['rev-parse', `${remoteRef}^{commit}`]).trim());
    git(rootPath, ['merge-base', '--is-ancestor', baseCommit, integrationBase]);
    return { reviewedRevision: revision, reviewedBase: baseCommit, integrationBase };
}
function rebasePreparedRollingIncrement(rootPath, rollingFastRebaseIdentity) {
    const { reviewedRevision, reviewedBase, integrationBase } = rollingFastRebaseIdentity;
    commit(reviewedRevision);
    commit(reviewedBase);
    commit(integrationBase);
    requireIntegration(git(rootPath, ['rev-parse', 'HEAD']).trim() === reviewedRevision, 'checkout changed after rebase preparation');
    requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'prepared rebase checkout is not clean');
    git(rootPath, ['symbolic-ref', '--quiet', 'HEAD']);
    git(rootPath, ['merge-base', '--is-ancestor', reviewedBase, integrationBase]);
    const spawnSyncReturns = gitResult(rootPath, ['rebase', '-i', '--no-autostash', '--no-autosquash', '--no-update-refs', '--onto', integrationBase, reviewedBase], { ...process.env, GIT_SEQUENCE_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0' });
    return rebaseResult(rootPath, { reviewedRevision, reviewedBase, integrationBase }, spawnSyncReturns);
}
function fastRebaseRollingIncrement(rollingReviewedIncrement) {
    const rollingFastRebaseIdentity = prepareRollingIncrementRebase(rollingReviewedIncrement);
    return rebasePreparedRollingIncrement(rollingReviewedIncrement.rootPath, rollingFastRebaseIdentity);
}
function verifyRollingIncrementConflictInspection(rootPath, rollingFastRebaseConflict, rollingIncrementConflictInspection) {
    requireIntegration(rollingIncrementConflictInspection.reference.trim().length > 0, 'textual conflict requires a recorded semantic inspection');
    requireIntegration(rollingIncrementConflictInspection.originalCommit === rollingFastRebaseConflict.originalCommit
        && git(rootPath, ['rev-parse', 'REBASE_HEAD']).trim() === rollingFastRebaseConflict.originalCommit, 'semantic inspection differs from the current conflicting commit');
    const rebaseMarkers = [
        ['orig-head', rollingFastRebaseConflict.reviewedRevision], ['onto', rollingFastRebaseConflict.integrationBase]
    ];
    for (const [name, expected] of rebaseMarkers) {
        const rebasePath = git(rootPath, ['rev-parse', '--path-format=absolute', '--git-path', `rebase-merge/${name}`]).trim();
        requireIntegration(node_fs_1.default.readFileSync(rebasePath, 'utf8').trim() === expected, 'retained rebase differs from inspected integration');
    }
    requireIntegration(git(rootPath, ['diff', '--name-only', '--diff-filter=U', '-z']).length === 0, 'textual conflicts remain unresolved');
}
function continueFastRebaseRollingIncrement(rootPath, rollingFastRebaseConflict, rollingIncrementConflictInspection) {
    verifyRollingIncrementConflictInspection(rootPath, rollingFastRebaseConflict, rollingIncrementConflictInspection);
    const spawnSyncReturns = gitResult(rootPath, ['rebase', '--continue'], { ...process.env, GIT_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0' });
    return rebaseResult(rootPath, { reviewedRevision: rollingFastRebaseConflict.reviewedRevision,
        reviewedBase: rollingFastRebaseConflict.reviewedBase, integrationBase: rollingFastRebaseConflict.integrationBase }, spawnSyncReturns);
}
function publicationRemoteRevision(rollingIncrementPublication) {
    const { rootPath, target } = rollingIncrementPublication;
    git(rootPath, ['check-ref-format', `refs/heads/${target.branch}`]);
    requireIntegration(git(rootPath, ['remote']).trim().split('\n').includes(target.remote), 'unknown campaign remote');
    const remoteRef = `refs/remotes/${target.remote}/${target.branch}`;
    const spawnSyncReturns = gitResult(rootPath, ['fetch', '--no-tags', '--', target.remote, `refs/heads/${target.branch}:${remoteRef}`]);
    if (spawnSyncReturns.status !== 0)
        return null;
    return commit(git(rootPath, ['rev-parse', `${remoteRef}^{commit}`]).trim());
}
function reconcileRollingIncrementPublication(rollingIncrementPublication) {
    const { rootPath, revision } = rollingIncrementPublication;
    commit(revision);
    git(rootPath, ['cat-file', '-e', `${revision}^{commit}`]);
    const remoteRevision = publicationRemoteRevision(rollingIncrementPublication);
    if (remoteRevision === null)
        return { state: 'UNCONFIRMED', revision, reason: 'Remote observation failed; publication remains unknown.' };
    const spawnSyncReturns = gitResult(rootPath, ['merge-base', '--is-ancestor', revision, remoteRevision]);
    if (spawnSyncReturns.status === 0)
        return { state: 'PUBLISHED', revision, remoteRevision };
    requireIntegration(spawnSyncReturns.status === 1, 'remote containment check failed');
    return { state: 'REBASE_REQUIRED', revision, remoteRevision };
}
function publishRollingIncrement(rollingIncrementPublication) {
    const { rootPath, target, revision } = rollingIncrementPublication;
    const rollingIncrementPublicationResult = reconcileRollingIncrementPublication(rollingIncrementPublication);
    if (rollingIncrementPublicationResult.state !== 'REBASE_REQUIRED')
        return rollingIncrementPublicationResult;
    requireIntegration(git(rootPath, ['rev-parse', 'HEAD']).trim() === revision, 'publication checkout differs from verified increment');
    requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'publication checkout is not clean');
    const spawnSyncReturns = gitResult(rootPath, ['merge-base', '--is-ancestor', rollingIncrementPublicationResult.remoteRevision, revision]);
    if (spawnSyncReturns.status === 1)
        return rollingIncrementPublicationResult;
    requireIntegration(spawnSyncReturns.status === 0, 'increment ancestry check failed');
    const pushSpawnSyncReturns = gitResult(rootPath, ['push', '--porcelain', '--', target.remote, `${revision}:refs/heads/${target.branch}`]);
    const reconciledRollingIncrementPublicationResult = reconcileRollingIncrementPublication(rollingIncrementPublication);
    if (reconciledRollingIncrementPublicationResult.state === 'REBASE_REQUIRED'
        && reconciledRollingIncrementPublicationResult.remoteRevision === rollingIncrementPublicationResult.remoteRevision) {
        if (pushSpawnSyncReturns.stdout.split('\n').some(line => line.startsWith('!\t'))) {
            return { state: 'PUSH_REJECTED', revision, remoteRevision: reconciledRollingIncrementPublicationResult.remoteRevision,
                reason: pushSpawnSyncReturns.stdout.trim() };
        }
        return { state: 'UNCONFIRMED', revision, reason: pushSpawnSyncReturns.stderr.trim() || 'Push did not establish remote containment.' };
    }
    return reconciledRollingIncrementPublicationResult;
}
function fastForwardRollingIncrement(rootPath, branch, revision) {
    commit(revision);
    git(rootPath, ['check-ref-format', `refs/heads/${branch}`]);
    requireIntegration(git(rootPath, ['symbolic-ref', '--quiet', 'HEAD']).trim() === `refs/heads/${branch}`, 'coordinator checkout must own the configured increment branch');
    requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'coordinator increment checkout is not clean');
    git(rootPath, ['merge', '--ff-only', '--no-autostash', revision]);
    requireIntegration(git(rootPath, ['rev-parse', 'HEAD']).trim() === revision, 'increment branch differs from candidate');
}
function readRollingIncrementClaimV1(value) {
    requireIntegration(value !== null && typeof value === 'object' && !Array.isArray(value), 'claim must be an object');
    requireIntegration(Object.keys(value).sort().join('\0') === ['schemaVersion', 'id', 'campaignId', 'reviewId', 'assignmentId', 'generation',
        'graphDigest', 'rootPath', 'coordinatorRoot', 'target', 'reviewedRevision', 'reviewedBase'].sort().join('\0'), 'invalid claim fields');
    requireIntegration('schemaVersion' in value && value.schemaVersion === 1, 'unsupported integration claim version');
    const claimIdentity = (field) => {
        requireIntegration(typeof field === 'string' && field.trim() === field && field.length > 0 && !/[\0\r\n]/u.test(field), 'invalid claim identity');
        return field;
    };
    requireIntegration('id' in value && 'campaignId' in value && 'reviewId' in value && 'assignmentId' in value
        && 'generation' in value && 'graphDigest' in value && 'rootPath' in value && 'coordinatorRoot' in value
        && 'target' in value && 'reviewedRevision' in value && 'reviewedBase' in value, 'missing claim fields');
    const target = value.target;
    requireIntegration(target !== null && typeof target === 'object' && !Array.isArray(target)
        && Object.keys(target).sort().join('\0') === 'branch\0remote' && 'branch' in target && 'remote' in target, 'invalid claim target');
    const rootPath = claimIdentity(value.rootPath);
    const coordinatorRoot = claimIdentity(value.coordinatorRoot);
    requireIntegration(node_path_1.default.isAbsolute(rootPath) && node_path_1.default.isAbsolute(coordinatorRoot), 'claim checkout paths must be absolute');
    const graphDigest = claimIdentity(value.graphDigest);
    requireIntegration(/^[a-f0-9]{64}$/u.test(graphDigest), 'invalid claim graph digest');
    const reviewedRevision = commit(claimIdentity(value.reviewedRevision));
    const reviewedBase = commit(claimIdentity(value.reviewedBase));
    return { schemaVersion: 1, id: claimIdentity(value.id), campaignId: claimIdentity(value.campaignId), reviewId: claimIdentity(value.reviewId),
        assignmentId: claimIdentity(value.assignmentId), generation: claimIdentity(value.generation), graphDigest, rootPath, coordinatorRoot,
        target: { branch: claimIdentity(target.branch), remote: claimIdentity(target.remote) }, reviewedRevision, reviewedBase };
}
exports.RollingIncrementClaimReaders = { V1: readRollingIncrementClaimV1 };
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function record(value, names) {
    requireIntegration(isRecord(value), 'rebase record must be an object');
    requireIntegration(Object.keys(value).sort().join('\0') === [...names].sort().join('\0'), 'invalid rebase record fields');
    return value;
}
function recordCommit(value) {
    requireIntegration(typeof value === 'string', 'commit identity must be a string');
    return commit(value);
}
function readRollingIncrementRebaseV1(value) {
    const rebaseRecord = record(value, ['schemaVersion', 'incrementId', 'reviewedRevision', 'reviewedBase', 'integrationBase', 'result']);
    requireIntegration(rebaseRecord.schemaVersion === 1, 'unsupported rebase record version');
    requireIntegration(typeof rebaseRecord.incrementId === 'string' && rebaseRecord.incrementId.trim().length > 0, 'invalid increment identity');
    const rollingFastRebaseIdentity = { reviewedRevision: recordCommit(rebaseRecord.reviewedRevision),
        reviewedBase: recordCommit(rebaseRecord.reviewedBase), integrationBase: recordCommit(rebaseRecord.integrationBase) };
    let result = null;
    if (rebaseRecord.result !== null) {
        requireIntegration(isRecord(rebaseRecord.result), 'invalid rebase result');
        switch (rebaseRecord.result.state) {
            case 'REBASED': {
                const resultRecord = record(rebaseRecord.result, ['state', 'reviewedRevision', 'reviewedBase', 'integrationBase', 'revision', 'proofRefreshRequired']);
                requireIntegration(typeof resultRecord.proofRefreshRequired === 'boolean', 'invalid proof refresh flag');
                const revision = recordCommit(resultRecord.revision);
                requireIntegration(resultRecord.proofRefreshRequired === (revision !== rollingFastRebaseIdentity.reviewedRevision
                    || rollingFastRebaseIdentity.integrationBase !== rollingFastRebaseIdentity.reviewedBase), 'proof refresh differs from actual candidate identity');
                result = { ...rollingFastRebaseIdentity, state: 'REBASED', revision, proofRefreshRequired: resultRecord.proofRefreshRequired };
                break;
            }
            case 'TEXTUAL_CONFLICT': {
                const resultRecord = record(rebaseRecord.result, ['state', 'reviewedRevision', 'reviewedBase', 'integrationBase', 'originalCommit', 'conflictedPaths']);
                requireIntegration(Array.isArray(resultRecord.conflictedPaths) && resultRecord.conflictedPaths.length > 0, 'missing textual conflict paths');
                const conflictedPaths = resultRecord.conflictedPaths.map((value) => {
                    requireIntegration(typeof value === 'string' && value.length > 0 && !value.includes('\0'), 'invalid conflict path');
                    return value;
                });
                result = { ...rollingFastRebaseIdentity, state: 'TEXTUAL_CONFLICT', originalCommit: recordCommit(resultRecord.originalCommit), conflictedPaths };
                break;
            }
            default: throw new Error('rolling integration: unsupported rebase result state');
        }
        requireIntegration(rebaseRecord.result.reviewedRevision === rollingFastRebaseIdentity.reviewedRevision
            && rebaseRecord.result.reviewedBase === rollingFastRebaseIdentity.reviewedBase && rebaseRecord.result.integrationBase === rollingFastRebaseIdentity.integrationBase, 'rebase result differs from recorded intent');
    }
    return { schemaVersion: 1, incrementId: rebaseRecord.incrementId, ...rollingFastRebaseIdentity, result };
}
exports.RollingIncrementRebaseReaders = { V1: readRollingIncrementRebaseV1 };
function verifyRollingIncrementRebase(rootPath, rollingFastRebaseResult) {
    if (rollingFastRebaseResult.state === 'REBASED') {
        git(rootPath, ['symbolic-ref', '--quiet', 'HEAD']);
        requireIntegration(git(rootPath, ['rev-parse', 'HEAD']).trim() === rollingFastRebaseResult.revision, 'rebase result differs from checkout');
        git(rootPath, ['merge-base', '--is-ancestor', rollingFastRebaseResult.integrationBase, rollingFastRebaseResult.revision]);
        requireIntegration(git(rootPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'rebased checkout is not clean');
    }
    else {
        requireIntegration(git(rootPath, ['rev-parse', 'REBASE_HEAD']).trim() === rollingFastRebaseResult.originalCommit, 'conflict result differs from checkout');
        const conflictedPaths = git(rootPath, ['diff', '--name-only', '--diff-filter=U', '-z']).split('\0').filter(value => value.length > 0);
        requireIntegration(JSON.stringify(conflictedPaths) === JSON.stringify(rollingFastRebaseResult.conflictedPaths), 'conflict paths differ from checkout');
    }
}
function readRollingIncrementPublicationV1(value) {
    const publicationRecord = record(value, ['schemaVersion', 'incrementId', 'result']);
    requireIntegration(publicationRecord.schemaVersion === 1, 'unsupported publication version');
    requireIntegration(typeof publicationRecord.incrementId === 'string' && publicationRecord.incrementId.trim().length > 0, 'invalid increment identity');
    requireIntegration(isRecord(publicationRecord.result), 'invalid publication result');
    let rollingIncrementPublicationResult;
    switch (publicationRecord.result.state) {
        case 'PUBLISHED':
        case 'REBASE_REQUIRED': {
            const resultRecord = record(publicationRecord.result, ['state', 'revision', 'remoteRevision']);
            rollingIncrementPublicationResult = { state: publicationRecord.result.state, revision: recordCommit(resultRecord.revision), remoteRevision: recordCommit(resultRecord.remoteRevision) };
            break;
        }
        case 'PUSH_REJECTED': {
            const resultRecord = record(publicationRecord.result, ['state', 'revision', 'remoteRevision', 'reason']);
            requireIntegration(typeof resultRecord.reason === 'string' && resultRecord.reason.trim().length > 0, 'missing push rejection reason');
            rollingIncrementPublicationResult = { state: 'PUSH_REJECTED', revision: recordCommit(resultRecord.revision), remoteRevision: recordCommit(resultRecord.remoteRevision), reason: resultRecord.reason };
            break;
        }
        case 'UNCONFIRMED': {
            const resultRecord = record(publicationRecord.result, ['state', 'revision', 'reason']);
            requireIntegration(typeof resultRecord.reason === 'string' && resultRecord.reason.trim().length > 0, 'missing unknown-outcome reason');
            rollingIncrementPublicationResult = { state: 'UNCONFIRMED', revision: recordCommit(resultRecord.revision), reason: resultRecord.reason };
            break;
        }
        default: throw new Error('rolling integration: unsupported publication state');
    }
    return { schemaVersion: 1, incrementId: publicationRecord.incrementId, result: rollingIncrementPublicationResult };
}
exports.RollingIncrementPublicationReaders = { V1: readRollingIncrementPublicationV1 };
function verifyRollingIncrementLocalIntegration(rootPath, branch, revision) {
    commit(revision);
    git(rootPath, ['check-ref-format', `refs/heads/${branch}`]);
    const spawnSyncReturns = gitResult(rootPath, ['merge-base', '--is-ancestor', revision, `refs/heads/${branch}`]);
    requireIntegration(spawnSyncReturns.status === 0, 'local increment branch lacks the published candidate');
}
