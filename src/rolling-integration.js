// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-integration.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastRebaseRollingIncrement = fastRebaseRollingIncrement;
exports.continueFastRebaseRollingIncrement = continueFastRebaseRollingIncrement;
exports.reconcileRollingIncrementPublication = reconcileRollingIncrementPublication;
exports.publishRollingIncrement = publishRollingIncrement;
const node_fs_1 = __importDefault(require("node:fs"));
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
function fastRebaseRollingIncrement(rollingReviewedIncrement) {
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
    const rollingFastRebaseIdentity = { reviewedRevision: revision, reviewedBase: baseCommit, integrationBase };
    const spawnSyncReturns = gitResult(rootPath, ['rebase', '-i', '--no-autostash', '--no-autosquash', '--no-update-refs', '--onto', integrationBase, baseCommit], { ...process.env, GIT_SEQUENCE_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0' });
    return rebaseResult(rootPath, rollingFastRebaseIdentity, spawnSyncReturns);
}
function continueFastRebaseRollingIncrement(rootPath, rollingFastRebaseConflict, rollingIncrementConflictInspection) {
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
    const pushSpawnSyncReturns = gitResult(rootPath, ['push', '--', target.remote, `${revision}:refs/heads/${target.branch}`]);
    const reconciledRollingIncrementPublicationResult = reconcileRollingIncrementPublication(rollingIncrementPublication);
    if (reconciledRollingIncrementPublicationResult.state === 'REBASE_REQUIRED'
        && reconciledRollingIncrementPublicationResult.remoteRevision === rollingIncrementPublicationResult.remoteRevision) {
        return { state: 'UNCONFIRMED', revision, reason: pushSpawnSyncReturns.stderr.trim() || 'Push did not establish remote containment.' };
    }
    return reconciledRollingIncrementPublicationResult;
}
