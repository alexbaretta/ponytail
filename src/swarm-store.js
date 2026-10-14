// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-store.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_campaign_store_js_1 = require("./rolling-campaign-store.js");
function stringColumn(value) {
    if (typeof value !== 'string' || !value.length)
        throw new Error('swarm: invalid owner database value');
    return value;
}
function readBinding(row) {
    return { swarmUserWorktree: { rootPath: stringColumn(row.owner_root), gitCommonDirectory: stringColumn(row.git_common_directory) },
        sessionId: row.coordinator_session_id === null ? null : stringColumn(row.coordinator_session_id) };
}
function physicalOwner(swarmUserWorktree) {
    if (node_fs_1.default.realpathSync(swarmUserWorktree.rootPath) !== swarmUserWorktree.rootPath
        || (0, rolling_integration_js_1.git)(swarmUserWorktree.rootPath, ['rev-parse', '--show-toplevel']).trim() !== swarmUserWorktree.rootPath
        || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(swarmUserWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmUserWorktree.gitCommonDirectory)
        throw new Error('swarm: owner must be a canonical physical Git checkout');
}
class SwarmStore {
    pool;
    projectId;
    constructor(pool, projectId) {
        this.pool = pool;
        this.projectId = projectId;
    }
    async releaseWorktree(swarmWorktreeMembership) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const row = (await poolClient.query(`SELECT w.*,o.git_common_directory FROM ponytail_index.swarm_worktree_v1 s
    JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=s.project_id AND o.owner_root=s.owner_root
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4 FOR UPDATE`, [this.projectId, swarmWorktreeMembership.number, swarmWorktreeMembership.ownerRoot, swarmWorktreeMembership.generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: checkout membership changed or is absent; no ownership was released');
            const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
            if (rollingStoredWorktree.rootPath !== swarmWorktreeMembership.rootPath || rollingStoredWorktree.state !== 'RESERVED')
                throw new Error('swarm: checkout has conflicting identity or activity; preserve ownership');
            if (node_fs_1.default.realpathSync(rollingStoredWorktree.rootPath) !== rollingStoredWorktree.rootPath
                || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== row.git_common_directory)
                throw new Error('swarm: checkout repository identity changed; preserve ownership');
            if ((await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'", [this.projectId, rollingStoredWorktree.number])).rowCount
                || (await poolClient.query('SELECT 1 FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1 AND root_path=$2', [this.projectId, rollingStoredWorktree.rootPath])).rowCount)
                throw new Error('swarm: checkout retains an assignment or native actor; establish cessation and remove worker ownership first');
            (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
            (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
            const state = (0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim() ? 'QUARANTINED' : 'AVAILABLE';
            await poolClient.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number]);
            await poolClient.query('UPDATE ponytail_index.rolling_worktree_v1 SET state=$3 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number, state]);
        });
    }
    async claimExistingWorktree(ownerRoot) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            if ((await poolClient.query("SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1 AND state='PENDING'", [this.projectId])).rowCount)
                throw new Error('swarm: pending project reset must be resolved before checkout admission');
            const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE', [this.projectId, ownerRoot])).rows[0];
            if (owner === undefined)
                throw new Error('swarm: enroll the user owner before claiming a checkout');
            const swarmCoordinatorBinding = readBinding(owner);
            physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
            const rollingManagedDirectory = (0, rolling_worktrees_js_1.resolveRollingManagedDirectory)(ownerRoot);
            const pool = (await poolClient.query('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
            if (pool === undefined)
                return null;
            if (pool.managed_directory !== rollingManagedDirectory.directory)
                throw new Error('swarm: configured physical directory differs from the registered pool');
            const row = (await poolClient.query(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w
    WHERE w.project_id=$1 AND w.state='AVAILABLE'
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_v1 s WHERE s.project_id=w.project_id AND s.number=w.number)
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.rolling_assignment_v1 a WHERE a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED')
    ORDER BY w.number LIMIT 1 FOR UPDATE`, [this.projectId])).rows[0];
            if (row === undefined)
                return null;
            const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
            if (rollingStoredWorktree.rootPath !== node_path_1.default.join(rollingManagedDirectory.directory, String(rollingStoredWorktree.number))
                || !rollingManagedDirectory.worktrees.includes(rollingStoredWorktree.rootPath)
                || node_fs_1.default.realpathSync(rollingStoredWorktree.rootPath) !== rollingStoredWorktree.rootPath
                || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
                throw new Error('swarm: available checkout has inconsistent physical pool identity; preserve it for recovery');
            (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
            (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
            if ((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1 AND root_path=$2', [this.projectId, rollingStoredWorktree.rootPath])).rowCount)
                throw new Error('swarm: available checkout retains a native actor; establish cessation before reuse');
            if ((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim())
                throw new Error('swarm: available checkout contains uncommitted work; preserve it');
            const generation = node_crypto_1.default.randomUUID();
            await poolClient.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation) VALUES($1,$2,$3,$4)', [this.projectId, rollingStoredWorktree.number, ownerRoot, generation]);
            await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, rollingStoredWorktree.number]);
            return { number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, ownerRoot, generation };
        });
    }
    async transaction(operation) {
        const poolClient = await this.pool.connect();
        try {
            await poolClient.query('BEGIN');
            const result = await operation(poolClient);
            await poolClient.query('COMMIT');
            return result;
        }
        catch (cause) {
            await poolClient.query('ROLLBACK');
            throw cause;
        }
        finally {
            poolClient.release();
        }
    }
    async enrollOwner(swarmUserWorktree) {
        physicalOwner(swarmUserWorktree);
        const rollingManagedDirectory = (0, rolling_worktrees_js_1.resolveRollingManagedDirectory)(swarmUserWorktree.rootPath);
        const relative = node_path_1.default.relative(rollingManagedDirectory.directory, swarmUserWorktree.rootPath);
        if (relative === '' || relative !== '..' && !relative.startsWith(`..${node_path_1.default.sep}`) && !node_path_1.default.isAbsolute(relative))
            throw new Error('swarm: a managed checkout cannot enroll as a user owner');
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            if ((await poolClient.query('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND root_path=$2', [this.projectId, swarmUserWorktree.rootPath])).rowCount)
                throw new Error('swarm: a managed checkout cannot enroll as a user owner');
            await poolClient.query(`INSERT INTO ponytail_index.swarm_owner_v1(project_id,owner_root,git_common_directory)
    VALUES($1,$2,$3) ON CONFLICT(project_id,owner_root) DO NOTHING`, [this.projectId, swarmUserWorktree.rootPath, swarmUserWorktree.gitCommonDirectory]);
            const row = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE', [this.projectId, swarmUserWorktree.rootPath])).rows[0];
            if (row === undefined)
                throw new Error('swarm: owner enrollment is missing');
            const swarmCoordinatorBinding = readBinding(row);
            if (swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory !== swarmUserWorktree.gitCommonDirectory)
                throw new Error('swarm: enrolled owner repository identity changed');
            return swarmCoordinatorBinding;
        });
    }
    async bindCoordinator(ownerRoot, rollingNativeThreadIdentity) {
        const { sessionId, threadId, rootPath } = rollingNativeThreadIdentity;
        if (!sessionId.trim() || sessionId !== sessionId.trim())
            throw new Error('swarm: coordinator session ID must be nonempty without surrounding whitespace');
        if (!threadId.trim() || threadId !== threadId.trim() || rootPath !== ownerRoot)
            throw new Error('swarm: observed coordinator thread/checkout differs from owner');
        return this.transaction(async (poolClient) => {
            await poolClient.query(`INSERT INTO ponytail_index.swarm_native_session_v1(session_id,thread_id,project_id,root_path)
    VALUES($1,$2,$3,$4) ON CONFLICT(session_id) DO NOTHING`, [sessionId, threadId, this.projectId, rootPath]);
            const native = (await poolClient.query('SELECT * FROM ponytail_index.swarm_native_session_v1 WHERE session_id=$1 FOR UPDATE', [sessionId])).rows[0];
            if (native === undefined || native.thread_id !== threadId || native.project_id !== this.projectId || native.root_path !== rootPath)
                throw new Error('swarm: native session identity or original checkout changed');
            const row = (await poolClient.query(`UPDATE ponytail_index.swarm_owner_v1 SET coordinator_session_id=$3
    WHERE project_id=$1 AND owner_root=$2 AND (coordinator_session_id IS NULL OR coordinator_session_id=$3) RETURNING *`, [this.projectId, ownerRoot, sessionId])).rows[0];
            if (row === undefined)
                throw new Error('swarm: owner is not enrolled or has another coordinator; inspect its binding before recovery');
            const swarmCoordinatorBinding = readBinding(row);
            physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
            return swarmCoordinatorBinding;
        });
    }
    async unbindCoordinator(ownerRoot, sessionId) {
        return this.transaction(async (poolClient) => {
            const row = (await poolClient.query(`UPDATE ponytail_index.swarm_owner_v1 SET coordinator_session_id=NULL
    WHERE project_id=$1 AND owner_root=$2 AND coordinator_session_id=$3 RETURNING *`, [this.projectId, ownerRoot, sessionId])).rows[0];
            if (row === undefined)
                throw new Error('swarm: coordinator binding changed or is absent; no ownership was released');
            return readBinding(row);
        });
    }
    async coordinatorBinding(ownerRoot) {
        const row = (await this.pool.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2', [this.projectId, ownerRoot])).rows[0];
        return row === undefined ? null : readBinding(row);
    }
}
exports.SwarmStore = SwarmStore;
