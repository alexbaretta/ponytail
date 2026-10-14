// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-store.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmStore = void 0;
exports.readSwarmWorkerAssignment = readSwarmWorkerAssignment;
exports.swarmWorkerName = swarmWorkerName;
exports.readWorker = readWorker;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_campaign_store_js_1 = require("./rolling-campaign-store.js");
function readSwarmWorkerAssignment(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value) || !('kind' in value) || !('id' in value) || !('summary' in value))
        throw new Error('swarm: invalid worker assignment');
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(['id', 'kind', 'summary']))
        throw new Error('swarm: invalid worker assignment fields');
    if (value.kind !== 'plan' && value.kind !== 'sprint' || typeof value.id !== 'string' || !value.id.trim() || value.id !== value.id.trim() || /[\0\r\n]/u.test(value.id)
        || typeof value.summary !== 'string' || !/^\S+ \S+ \S+$/u.test(value.summary))
        throw new Error('swarm: assignment requires an exact ID and three word summary');
    return { kind: value.kind, id: value.id, summary: value.summary };
}
function swarmWorkerName(swarmWorkerBinding) {
    return `${swarmWorkerBinding.completed ? 'DONE ' : ''}W${swarmWorkerBinding.workerNumber} ${swarmWorkerBinding.assignment.kind === 'plan' ? 'P' : 'S'}${swarmWorkerBinding.shortAssignmentNumber} ${swarmWorkerBinding.assignment.summary}`;
}
function stringColumn(value) {
    if (typeof value !== 'string' || !value.length)
        throw new Error('swarm: invalid owner database value');
    return value;
}
function positiveIntegerColumn(value) {
    const number = typeof value === 'string' && /^[1-9][0-9]*$/u.test(value) ? Number(value) : value;
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1)
        throw new Error('swarm: invalid database integer');
    return number;
}
function readWorker(row) {
    if (row.state !== 'BOUND' && row.state !== 'REMOVING' && row.state !== 'REMOVED' || typeof row.completed !== 'boolean')
        throw new Error('swarm: invalid worker database state');
    return { sessionId: stringColumn(row.session_id), threadId: stringColumn(row.thread_id), ownerRoot: stringColumn(row.owner_root), rootPath: stringColumn(row.root_path),
        worktreeNumber: positiveIntegerColumn(row.worktree_number), worktreeGeneration: stringColumn(row.worktree_generation), generation: stringColumn(row.generation),
        workerNumber: positiveIntegerColumn(row.worker_number), shortAssignmentNumber: positiveIntegerColumn(row.short_assignment_number),
        assignment: readSwarmWorkerAssignment({ kind: row.assignment_kind, id: row.assignment_id, summary: row.summary }), state: row.state, completed: row.completed };
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
    async workerBinding(ownerRoot, sessionId, generation) {
        const row = (await this.pool.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
   JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3 AND k.generation=$4`, [this.projectId, ownerRoot, sessionId, generation])).rows[0];
        if (row === undefined)
            throw new Error('swarm: worker binding changed or is absent');
        return readWorker(row);
    }
    async hasNativeOwner(poolClient, rootPath) {
        return Boolean((await poolClient.query(`SELECT 1 FROM ponytail_index.swarm_native_session_v1 n LEFT JOIN ponytail_index.swarm_worker_v1 k USING(session_id)
   WHERE n.project_id=$1 AND n.root_path=$2 AND (k.state IS NULL OR k.state<>'REMOVED')`, [this.projectId, rootPath])).rowCount);
    }
    async prepareWorkerRemoval(ownerRoot, sessionId, generation) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE', [this.projectId, ownerRoot])).rows[0];
            if (owner === undefined || owner.coordinator_session_id === null)
                throw new Error('swarm: bind a coordinator before removing a worker');
            physicalOwner(readBinding(owner).swarmUserWorktree);
            const row = (await poolClient.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
    JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3 AND k.generation=$4 FOR UPDATE`, [this.projectId, ownerRoot, sessionId, generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: worker binding changed or is absent');
            const swarmWorkerBinding = readWorker(row);
            if (swarmWorkerBinding.state === 'REMOVED')
                return swarmWorkerBinding;
            await poolClient.query("UPDATE ponytail_index.swarm_worker_v1 SET state='REMOVING' WHERE session_id=$1", [sessionId]);
            return { ...swarmWorkerBinding, state: 'REMOVING' };
        });
    }
    async detachWorker(swarmWorkerBinding) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const row = (await poolClient.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
    JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3 AND k.generation=$4 FOR UPDATE`, [this.projectId, swarmWorkerBinding.ownerRoot, swarmWorkerBinding.sessionId, swarmWorkerBinding.generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: worker binding changed or is absent');
            const currentSwarmWorkerBinding = readWorker(row);
            if (currentSwarmWorkerBinding.state === 'REMOVED')
                return;
            if (currentSwarmWorkerBinding.state !== 'REMOVING')
                throw new Error('swarm: prepare original worker removal first');
            const worktree = (await poolClient.query(`SELECT w.*,o.git_common_directory FROM ponytail_index.swarm_worktree_v1 s JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=s.project_id AND o.owner_root=s.owner_root
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4 FOR UPDATE`, [this.projectId, currentSwarmWorkerBinding.worktreeNumber, currentSwarmWorkerBinding.ownerRoot, currentSwarmWorkerBinding.worktreeGeneration])).rows[0];
            if (worktree === undefined || worktree.root_path !== currentSwarmWorkerBinding.rootPath || worktree.state !== 'ACTIVE')
                throw new Error('swarm: original worker checkout membership changed');
            if ((await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'", [this.projectId, currentSwarmWorkerBinding.worktreeNumber])).rowCount)
                throw new Error('swarm: campaign assignment must be fenced before worker ownership can be released');
            if (node_fs_1.default.realpathSync(currentSwarmWorkerBinding.rootPath) !== currentSwarmWorkerBinding.rootPath || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(currentSwarmWorkerBinding.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== worktree.git_common_directory)
                throw new Error('swarm: original checkout identity changed');
            (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(currentSwarmWorkerBinding.rootPath);
            const marker = node_path_1.default.join(currentSwarmWorkerBinding.rootPath, 'session_id.txt');
            if (node_fs_1.default.lstatSync(marker, { throwIfNoEntry: false }) !== undefined) {
                (0, rolling_worktrees_js_1.validateRollingSessionMarker)(currentSwarmWorkerBinding.rootPath, currentSwarmWorkerBinding.sessionId);
                node_fs_1.default.unlinkSync(marker);
            }
            await poolClient.query("UPDATE ponytail_index.swarm_worker_v1 SET state='REMOVED' WHERE session_id=$1", [currentSwarmWorkerBinding.sessionId]);
            await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, currentSwarmWorkerBinding.worktreeNumber]);
        });
    }
    async completeWorker(ownerRoot, sessionId, generation) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE', [this.projectId, ownerRoot])).rows[0];
            if (owner === undefined || owner.coordinator_session_id === null)
                throw new Error('swarm: bind a coordinator before completing a worker');
            physicalOwner(readBinding(owner).swarmUserWorktree);
            const row = (await poolClient.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
    JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3 AND k.generation=$4 FOR UPDATE`, [this.projectId, ownerRoot, sessionId, generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: worker binding changed or is absent');
            const swarmWorkerBinding = readWorker(row);
            if (swarmWorkerBinding.state !== 'BOUND')
                throw new Error('swarm: only a bound worker can be completed');
            await poolClient.query('UPDATE ponytail_index.swarm_worker_v1 SET completed=true WHERE session_id=$1', [sessionId]);
            return { ...swarmWorkerBinding, completed: true };
        });
    }
    async bindWorker(swarmWorktreeMembership, swarmSessionIdentity, swarmWorkerAssignment) {
        swarmWorkerAssignment = readSwarmWorkerAssignment(swarmWorkerAssignment);
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE', [this.projectId, swarmWorktreeMembership.ownerRoot])).rows[0];
            if (owner === undefined || owner.coordinator_session_id === null)
                throw new Error('swarm: bind a coordinator before admitting a worker');
            const swarmCoordinatorBinding = readBinding(owner);
            physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
            const existing = (await poolClient.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
    JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.session_id=$1 FOR UPDATE`, [swarmSessionIdentity.sessionId])).rows[0];
            if (existing !== undefined && (existing.project_id !== this.projectId || existing.owner_root !== swarmWorktreeMembership.ownerRoot || existing.root_path !== swarmWorktreeMembership.rootPath || Number(existing.worktree_number) !== swarmWorktreeMembership.number))
                throw new Error('swarm: original worker owner or checkout cannot change');
            if (swarmSessionIdentity.rootPath !== swarmWorktreeMembership.rootPath)
                throw new Error('swarm: observed original worker checkout differs from membership');
            const row = (await poolClient.query(`SELECT w.* FROM ponytail_index.swarm_worktree_v1 s JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4 FOR UPDATE`, [this.projectId, swarmWorktreeMembership.number, swarmWorktreeMembership.ownerRoot, swarmWorktreeMembership.generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: worker checkout membership changed or is absent');
            const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
            if (rollingStoredWorktree.rootPath !== swarmWorktreeMembership.rootPath || node_fs_1.default.realpathSync(rollingStoredWorktree.rootPath) !== rollingStoredWorktree.rootPath
                || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
                throw new Error('swarm: original worker checkout identity changed');
            if (node_fs_1.default.lstatSync(node_path_1.default.join(rollingStoredWorktree.rootPath, 'session_id.txt'), { throwIfNoEntry: false }) !== undefined)
                (0, rolling_worktrees_js_1.validateRollingSessionMarker)(rollingStoredWorktree.rootPath, swarmSessionIdentity.sessionId);
            if ((await poolClient.query("SELECT 1 FROM ponytail_index.swarm_worker_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'REMOVED' AND session_id<>$3", [this.projectId, swarmWorktreeMembership.number, swarmSessionIdentity.sessionId])).rowCount)
                throw new Error('swarm: checkout already has a bound worker');
            await this.recordNativeSession(poolClient, swarmSessionIdentity);
            if (existing !== undefined && existing.state !== 'REMOVED') {
                const swarmWorkerBinding = readWorker(existing);
                if (swarmWorkerBinding.state !== 'BOUND' || swarmWorkerBinding.worktreeGeneration !== swarmWorktreeMembership.generation || swarmWorkerBinding.assignment.kind !== swarmWorkerAssignment.kind
                    || swarmWorkerBinding.assignment.id !== swarmWorkerAssignment.id || swarmWorkerBinding.assignment.summary !== swarmWorkerAssignment.summary)
                    throw new Error('swarm: worker already has an assignment or incomplete removal');
                return swarmWorkerBinding;
            }
            if (rollingStoredWorktree.state !== 'RESERVED')
                throw new Error('swarm: checkout is not ready for worker admission');
            let assignment = (await poolClient.query('SELECT short_number FROM ponytail_index.swarm_assignment_v1 WHERE project_id=$1 AND owner_root=$2 AND kind=$3 AND assignment_id=$4', [this.projectId, swarmWorktreeMembership.ownerRoot, swarmWorkerAssignment.kind, swarmWorkerAssignment.id])).rows[0];
            if (assignment === undefined)
                assignment = (await poolClient.query(`INSERT INTO ponytail_index.swarm_assignment_v1(project_id,owner_root,kind,assignment_id,short_number)
    SELECT $1,$2,$3,$4,COALESCE(MAX(short_number),0)+1 FROM ponytail_index.swarm_assignment_v1 WHERE project_id=$1 AND owner_root=$2 AND kind=$3 RETURNING short_number`, [this.projectId, swarmWorktreeMembership.ownerRoot, swarmWorkerAssignment.kind, swarmWorkerAssignment.id])).rows[0];
            if (assignment === undefined)
                throw new Error('swarm: assignment mapping was not recorded');
            const sequence = (await poolClient.query('UPDATE ponytail_index.swarm_owner_v1 SET worker_sequence=worker_sequence+1 WHERE project_id=$1 AND owner_root=$2 RETURNING worker_sequence', [this.projectId, swarmWorktreeMembership.ownerRoot])).rows[0];
            if (sequence === undefined)
                throw new Error('swarm: worker number was not recorded');
            const generation = node_crypto_1.default.randomUUID();
            await poolClient.query(`INSERT INTO ponytail_index.swarm_worker_v1(session_id,project_id,owner_root,worktree_number,worktree_generation,generation,worker_number,assignment_kind,assignment_id,short_assignment_number,summary,state)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'BOUND') ON CONFLICT(session_id) DO UPDATE SET worktree_generation=EXCLUDED.worktree_generation,generation=EXCLUDED.generation,
    worker_number=EXCLUDED.worker_number,assignment_kind=EXCLUDED.assignment_kind,assignment_id=EXCLUDED.assignment_id,short_assignment_number=EXCLUDED.short_assignment_number,summary=EXCLUDED.summary,state='BOUND',completed=false`, [swarmSessionIdentity.sessionId, this.projectId, swarmWorktreeMembership.ownerRoot, swarmWorktreeMembership.number, swarmWorktreeMembership.generation, generation, positiveIntegerColumn(sequence.worker_sequence),
                swarmWorkerAssignment.kind, swarmWorkerAssignment.id, positiveIntegerColumn(assignment.short_number), swarmWorkerAssignment.summary]);
            await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2", [this.projectId, swarmWorktreeMembership.number]);
            const recorded = (await poolClient.query(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
    JOIN ponytail_index.swarm_native_session_v1 n USING(session_id) WHERE k.session_id=$1`, [swarmSessionIdentity.sessionId])).rows[0];
            if (recorded === undefined)
                throw new Error('swarm: worker binding was not recorded');
            return readWorker(recorded);
        });
    }
    async releaseWorktree(swarmWorktreeMembership) {
        return this.transaction(async (poolClient) => {
            await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [this.projectId]);
            const row = (await poolClient.query(`SELECT w.*,s.base_commit,o.git_common_directory FROM ponytail_index.swarm_worktree_v1 s
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
                || await this.hasNativeOwner(poolClient, rollingStoredWorktree.rootPath))
                throw new Error('swarm: checkout retains an assignment or native actor; establish cessation and remove worker ownership first');
            (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
            (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
            if (row.base_commit !== null)
                this.cleanupWorktree(swarmWorktreeMembership);
            const state = (0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim() ? 'QUARANTINED' : 'AVAILABLE';
            await poolClient.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number]);
            await poolClient.query('UPDATE ponytail_index.rolling_worktree_v1 SET state=$3 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number, state]);
        });
    }
    async reserveWorktree(ownerRoot, swarmWorktreeRequest) {
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
            if (swarmWorktreeRequest.kind === 'provision' && (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(swarmWorktreeRequest.baseCommit)
                || (0, rolling_integration_js_1.git)(ownerRoot, ['rev-parse', `${swarmWorktreeRequest.baseCommit}^{commit}`]).trim() !== swarmWorktreeRequest.baseCommit))
                throw new Error('swarm: setup requires an exact reachable base commit');
            if (pool === undefined) {
                if (swarmWorktreeRequest.kind === 'retained')
                    return null;
                await poolClient.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)', [this.projectId, rollingManagedDirectory.directory]);
            }
            if (pool !== undefined && pool.managed_directory !== rollingManagedDirectory.directory)
                throw new Error('swarm: configured physical directory differs from the registered pool');
            let row = (await poolClient.query(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w
    WHERE w.project_id=$1 AND w.state='AVAILABLE'
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_v1 s WHERE s.project_id=w.project_id AND s.number=w.number)
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.rolling_assignment_v1 a WHERE a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED')
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 d WHERE d.project_id=w.project_id AND d.number=w.number)
    ORDER BY w.number LIMIT 1 FOR UPDATE`, [this.projectId])).rows[0];
            let created = false;
            if (row === undefined) {
                if (swarmWorktreeRequest.kind === 'retained')
                    return null;
                const numbers = (await poolClient.query('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number', [this.projectId])).rows;
                let number = 101;
                for (const row of numbers) {
                    if (Number(row.number) !== number)
                        break;
                    number++;
                }
                if (!Number.isSafeInteger(number))
                    throw new Error('swarm: worktree numbers exhausted');
                const rootPath = node_path_1.default.join(rollingManagedDirectory.directory, String(number));
                if (node_fs_1.default.existsSync(rootPath) || rollingManagedDirectory.worktrees.includes(rootPath))
                    throw new Error('swarm: unrecorded checkout occupies the next pool number; preserve it for enrollment');
                row = (await poolClient.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *", [this.projectId, number, rootPath])).rows[0];
                created = true;
            }
            const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
            if (!created) {
                if (rollingStoredWorktree.rootPath !== node_path_1.default.join(rollingManagedDirectory.directory, String(rollingStoredWorktree.number))
                    || !rollingManagedDirectory.worktrees.includes(rollingStoredWorktree.rootPath)
                    || node_fs_1.default.realpathSync(rollingStoredWorktree.rootPath) !== rollingStoredWorktree.rootPath
                    || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
                    throw new Error('swarm: available checkout has inconsistent physical pool identity; preserve it for recovery');
                (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
                (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
                if (await this.hasNativeOwner(poolClient, rollingStoredWorktree.rootPath))
                    throw new Error('swarm: available checkout retains a native actor; establish cessation before reuse');
                if ((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim())
                    throw new Error('swarm: available checkout contains uncommitted work; preserve it');
            }
            const generation = node_crypto_1.default.randomUUID();
            await poolClient.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation,base_commit) VALUES($1,$2,$3,$4,$5)', [this.projectId, rollingStoredWorktree.number, ownerRoot, generation, swarmWorktreeRequest.kind === 'provision' ? swarmWorktreeRequest.baseCommit : null]);
            await poolClient.query('UPDATE ponytail_index.rolling_worktree_v1 SET state=$3 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number, swarmWorktreeRequest.kind === 'provision' ? 'PROVISIONING' : 'RESERVED']);
            return { number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, ownerRoot, generation };
        });
    }
    async provisionWorktree(swarmWorktreeMembership) {
        const poolClient = await this.pool.connect();
        try {
            await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))', [this.projectId]);
            const row = (await poolClient.query(`SELECT w.*,s.base_commit,o.owner_root,o.git_common_directory,o.coordinator_session_id FROM ponytail_index.swarm_worktree_v1 s
    JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=s.project_id AND o.owner_root=s.owner_root
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4`, [this.projectId, swarmWorktreeMembership.number, swarmWorktreeMembership.ownerRoot, swarmWorktreeMembership.generation])).rows[0];
            if (row === undefined)
                throw new Error('swarm: checkout membership changed or is absent; setup refused');
            const swarmCoordinatorBinding = readBinding(row);
            physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
            const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
            if (node_fs_1.default.existsSync(rollingStoredWorktree.rootPath) && node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
                throw new Error('swarm: setup checkout belongs to another repository; preserve it');
            if (rollingStoredWorktree.rootPath !== swarmWorktreeMembership.rootPath || row.base_commit === null)
                throw new Error('swarm: checkout has no matching setup intent');
            if (rollingStoredWorktree.state === 'RESERVED')
                return;
            if (rollingStoredWorktree.state !== 'PROVISIONING')
                throw new Error('swarm: conflicting checkout state; setup refused');
            if (node_fs_1.default.existsSync(rollingStoredWorktree.rootPath))
                (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
            (0, rolling_worktrees_js_1.provisionRollingWorktree)(swarmWorktreeMembership.ownerRoot, swarmWorktreeMembership, stringColumn(row.base_commit));
            await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, rollingStoredWorktree.number]);
        }
        finally {
            try {
                await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [this.projectId]);
            }
            finally {
                poolClient.release();
            }
        }
    }
    cleanupWorktree(swarmWorktreeMembership) {
        const rollingManagedDirectory = (0, rolling_worktrees_js_1.resolveRollingManagedDirectory)(swarmWorktreeMembership.ownerRoot);
        if (rollingManagedDirectory.configuration.retirementCommands === null)
            throw new Error('swarm: project retirement cleanup is unspecified; preserve ownership');
        if (rollingManagedDirectory.configuration.retirementCommands.length && !swarmWorktreeMembership.generation)
            throw new Error('swarm: original resource generation is unknown; preserve checkout for cleanup');
        for (const argv of rollingManagedDirectory.configuration.retirementCommands) {
            const result = (0, node_child_process_1.spawnSync)(argv[0], argv.slice(1), { cwd: swarmWorktreeMembership.rootPath, encoding: 'utf8', env: { ...process.env,
                    PONYTAIL_WORKTREE_ROOT: swarmWorktreeMembership.rootPath, PONYTAIL_MAIN_WORKTREE_ROOT: rollingManagedDirectory.mainRoot,
                    PONYTAIL_WORKTREE_NUMBER: String(swarmWorktreeMembership.number), PONYTAIL_WORKTREE_GENERATION: swarmWorktreeMembership.generation } });
            if (result.error || result.status !== 0)
                throw new Error('swarm: project resource cleanup failed; preserve ownership');
        }
    }
    async deleteWorktrees(ownerRoot, number) {
        const poolClient = await this.pool.connect();
        try {
            await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))', [this.projectId]);
            const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2', [this.projectId, ownerRoot])).rows[0];
            if (owner === undefined)
                throw new Error('swarm: enroll the user owner before deleting managed checkouts');
            const swarmCoordinatorBinding = readBinding(owner);
            physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
            const rollingManagedDirectory = (0, rolling_worktrees_js_1.resolveRollingManagedDirectory)(ownerRoot);
            const rows = (await poolClient.query(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w
    LEFT JOIN ponytail_index.swarm_worktree_deletion_v1 d USING(project_id,number)
    WHERE w.project_id=$1 AND ($2::bigint IS NULL OR w.number=$2) AND ($2::bigint IS NOT NULL OR d.state IS DISTINCT FROM 'COMPLETE') ORDER BY w.number`, [this.projectId, number])).rows;
            if (number !== null && !rows.length)
                throw new Error('swarm: selected managed checkout is not recorded');
            const results = [];
            for (const row of rows) {
                const rollingStoredWorktree = (0, rolling_campaign_store_js_1.readWorktree)(row);
                try {
                    if (rollingStoredWorktree.rootPath !== node_path_1.default.join(rollingManagedDirectory.directory, String(rollingStoredWorktree.number)))
                        throw new Error('swarm: checkout is outside the configured physical pool');
                    if ((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number])).rowCount
                        || (await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'", [this.projectId, rollingStoredWorktree.number])).rowCount
                        || await this.hasNativeOwner(poolClient, rollingStoredWorktree.rootPath)) {
                        results.push({ number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, outcome: 'protected', reason: 'checkout remains assigned or has a retained native actor' });
                        continue;
                    }
                    let deletion = (await poolClient.query('SELECT * FROM ponytail_index.swarm_worktree_deletion_v1 WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number])).rows[0];
                    if (deletion !== undefined && (deletion.owner_root !== ownerRoot || deletion.root_path !== rollingStoredWorktree.rootPath || deletion.git_common_directory !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory))
                        throw new Error('swarm: deletion belongs to another owner or repository');
                    let registered = (0, rolling_integration_js_1.git)(ownerRoot, ['worktree', 'list', '--porcelain', '-z']).split('\0').includes(`worktree ${rollingStoredWorktree.rootPath}`);
                    const exists = node_fs_1.default.lstatSync(rollingStoredWorktree.rootPath, { throwIfNoEntry: false }) !== undefined;
                    if (deletion?.state === 'COMPLETE') {
                        if (exists || registered)
                            throw new Error('swarm: a replacement checkout exists after recorded deletion; preserve it');
                        results.push({ number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, outcome: 'deleted' });
                        continue;
                    }
                    if (deletion === undefined && (!exists || !registered || !['AVAILABLE', 'QUARANTINED'].includes(rollingStoredWorktree.state)))
                        throw new Error('swarm: checkout is not safely unassigned or requires recovery');
                    if (deletion !== undefined && !['AVAILABLE', 'QUARANTINED'].includes(rollingStoredWorktree.state))
                        throw new Error('swarm: checkout has conflicting activity during deletion recovery');
                    if (deletion !== undefined && rollingStoredWorktree.state !== 'QUARANTINED')
                        await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='QUARANTINED' WHERE project_id=$1 AND number=$2", [this.projectId, rollingStoredWorktree.number]);
                    if (exists) {
                        if (!registered || node_fs_1.default.realpathSync(rollingStoredWorktree.rootPath) !== rollingStoredWorktree.rootPath
                            || node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
                            throw new Error('swarm: managed checkout identity changed');
                        (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
                        (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
                        if ((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim())
                            throw new Error('swarm: checkout contains uncommitted source; preserve it');
                        const revision = (0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', 'HEAD']).trim();
                        if (deletion !== undefined && deletion.revision !== revision)
                            throw new Error('swarm: source changed since deletion intent; preserve it');
                        if (deletion === undefined) {
                            const branch = (0, rolling_integration_js_1.gitResult)(rollingStoredWorktree.rootPath, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
                            if (branch.error || (branch.status !== 0 && branch.status !== 1))
                                throw new Error('swarm: cannot observe resource branch');
                            const generation = branch.status === 0 ? new RegExp(`^ponytail/worker-${rollingStoredWorktree.number}/([0-9a-f-]{36})$`, 'u').exec(branch.stdout.trim())?.[1] ?? null : null;
                            deletion = (await poolClient.query(`WITH deletion AS (
        INSERT INTO ponytail_index.swarm_worktree_deletion_v1(project_id,number,owner_root,root_path,git_common_directory,revision,resource_generation)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *)
        UPDATE ponytail_index.rolling_worktree_v1 w SET state='QUARANTINED' FROM deletion d
        WHERE w.project_id=d.project_id AND w.number=d.number RETURNING d.*`, [this.projectId, rollingStoredWorktree.number, ownerRoot, rollingStoredWorktree.rootPath, swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory, revision, generation])).rows[0];
                        }
                        if (deletion === undefined)
                            throw new Error('swarm: deletion intent was not recorded');
                        (0, rolling_integration_js_1.git)(ownerRoot, ['update-ref', `refs/ponytail/swarm/deleted/${rollingStoredWorktree.number}/${stringColumn(deletion.revision)}`, stringColumn(deletion.revision)]);
                        if (deletion.cleanup_complete !== true) {
                            this.cleanupWorktree({ number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, ownerRoot, generation: deletion.resource_generation === null ? '' : stringColumn(deletion.resource_generation) });
                            (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(rollingStoredWorktree.rootPath);
                            (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(rollingStoredWorktree.rootPath);
                            if ((0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['status', '--porcelain']).trim() || (0, rolling_integration_js_1.git)(rollingStoredWorktree.rootPath, ['rev-parse', 'HEAD']).trim() !== deletion.revision)
                                throw new Error('swarm: cleanup changed source; preserve checkout');
                            await poolClient.query('UPDATE ponytail_index.swarm_worktree_deletion_v1 SET cleanup_complete=true WHERE project_id=$1 AND number=$2', [this.projectId, rollingStoredWorktree.number]);
                        }
                        (0, rolling_integration_js_1.git)(ownerRoot, ['worktree', 'remove', '--', rollingStoredWorktree.rootPath]);
                    }
                    else {
                        if (deletion === undefined || deletion.cleanup_complete !== true)
                            throw new Error('swarm: missing checkout has no completed cleanup receipt');
                        if (registered)
                            (0, rolling_integration_js_1.git)(ownerRoot, ['worktree', 'remove', '--force', '--', rollingStoredWorktree.rootPath]);
                    }
                    registered = (0, rolling_integration_js_1.git)(ownerRoot, ['worktree', 'list', '--porcelain', '-z']).split('\0').includes(`worktree ${rollingStoredWorktree.rootPath}`);
                    if (node_fs_1.default.lstatSync(rollingStoredWorktree.rootPath, { throwIfNoEntry: false }) !== undefined || registered)
                        throw new Error('swarm: checkout removal is incomplete');
                    await poolClient.query("UPDATE ponytail_index.swarm_worktree_deletion_v1 SET state='COMPLETE' WHERE project_id=$1 AND number=$2", [this.projectId, rollingStoredWorktree.number]);
                    results.push({ number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, outcome: 'deleted' });
                }
                catch (cause) {
                    results.push({ number: rollingStoredWorktree.number, rootPath: rollingStoredWorktree.rootPath, outcome: 'retained', reason: cause instanceof Error ? cause.message : String(cause) });
                }
            }
            return results;
        }
        finally {
            try {
                await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [this.projectId]);
            }
            finally {
                poolClient.release();
            }
        }
    }
    async recordNativeSession(poolClient, swarmSessionIdentity) {
        const { sessionId, threadId, rootPath } = swarmSessionIdentity;
        for (const id of [sessionId, threadId])
            if (!id.trim() || id !== id.trim() || /[\0\r\n]/u.test(id))
                throw new Error('swarm: native IDs must be nonempty canonical strings');
        await poolClient.query(`INSERT INTO ponytail_index.swarm_native_session_v1(session_id,thread_id,project_id,root_path)
   VALUES($1,$2,$3,$4) ON CONFLICT(session_id) DO NOTHING`, [sessionId, threadId, this.projectId, rootPath]);
        const native = (await poolClient.query('SELECT * FROM ponytail_index.swarm_native_session_v1 WHERE session_id=$1 FOR UPDATE', [sessionId])).rows[0];
        if (native === undefined || native.thread_id !== threadId || native.project_id !== this.projectId || native.root_path !== rootPath)
            throw new Error('swarm: native session identity or original checkout changed');
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
    async bindCoordinator(ownerRoot, swarmSessionIdentity) {
        const { sessionId, threadId, rootPath } = swarmSessionIdentity;
        if (!sessionId.trim() || sessionId !== sessionId.trim())
            throw new Error('swarm: coordinator session ID must be nonempty without surrounding whitespace');
        if (!threadId.trim() || threadId !== threadId.trim() || rootPath !== ownerRoot)
            throw new Error('swarm: observed coordinator thread/checkout differs from owner');
        return this.transaction(async (poolClient) => {
            await this.recordNativeSession(poolClient, swarmSessionIdentity);
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
