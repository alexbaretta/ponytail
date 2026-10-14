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
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
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
    async bindCoordinator(ownerRoot, sessionId) {
        if (!sessionId.trim() || sessionId !== sessionId.trim())
            throw new Error('swarm: coordinator session ID must be nonempty without surrounding whitespace');
        return this.transaction(async (poolClient) => {
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
