// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-campaign-store.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingCampaignStore = exports.RollingExecutionConfigReaders = exports.RollingAssignmentScopeReaders = void 0;
exports.readRollingAssignmentScopeV1 = readRollingAssignmentScopeV1;
exports.readRollingExecutionConfigV1 = readRollingExecutionConfigV1;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
const lossless_json_1 = require("lossless-json");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
function requireState(condition, message) {
    if (!condition)
        throw new Error(`rolling campaign: ${message}`);
}
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function readStateText(text) {
    const value = (0, lossless_json_1.parse)(text, null, token => {
        requireState(/^(0|[1-9][0-9]*)$/.test(token), 'state numbers must be unsigned integers');
        const number = Number(token);
        requireState(Number.isSafeInteger(number), 'state number exceeds safe integer range');
        return number;
    });
    return value;
}
function requireKeys(value, keys) {
    requireState(isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), 'invalid stored contract fields');
    requireState(value.schemaVersion === 1, 'unsupported stored contract version');
}
function isStringArray(value) { return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0); }
function isRollingAssignmentScopeV1(value) {
    requireKeys(value, ['schemaVersion', 'plannedPaths', 'exclusiveResources', 'binding']);
    const rollingBindingsV1 = (0, rolling_campaign_js_1.readRollingBindingsV1)({ schemaVersion: 1, bindings: [value.binding] });
    const rollingBinding = rollingBindingsV1.bindings[0];
    requireState(rollingBinding, 'stored binding is missing');
    requireState(isStringArray(value.plannedPaths) && new Set(value.plannedPaths).size === value.plannedPaths.length, 'invalid stored plannedPaths');
    requireState(isStringArray(value.exclusiveResources) && new Set(value.exclusiveResources).size === value.exclusiveResources.length, 'invalid stored exclusiveResources');
    requireState(value.plannedPaths.every(item => !node_path_1.default.isAbsolute(item) && !item.includes('\\') && item.split('/').every(part => part !== '' && part !== '.' && part !== '..')), 'invalid stored planned path');
    requireState(JSON.stringify(value.exclusiveResources) === JSON.stringify(rollingBinding.exclusiveResources), 'stored scope and binding resources differ');
    return true;
}
function readRollingAssignmentScopeV1(value) {
    requireState(isRollingAssignmentScopeV1(value), 'invalid stored scope');
    return value;
}
function isRollingExecutionConfigV1(value) {
    requireKeys(value, ['schemaVersion', 'mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize']);
    (0, rolling_campaign_js_1.readRollingResolvedConfiguration)({ mainline: value.mainline, incrementRef: value.incrementRef,
        maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize });
    return true;
}
function readRollingExecutionConfigV1(value) {
    requireState(isRollingExecutionConfigV1(value), 'invalid stored execution configuration');
    return value;
}
exports.RollingAssignmentScopeReaders = { V1: readRollingAssignmentScopeV1 };
exports.RollingExecutionConfigReaders = { V1: readRollingExecutionConfigV1 };
function stringColumn(value, label) {
    requireState(typeof value === 'string' && value.length > 0, `invalid database ${label}`);
    return value;
}
function nullableStringColumn(value, label) { return value === null ? null : stringColumn(value, label); }
function booleanColumn(value, label) { requireState(typeof value === 'boolean', `invalid database ${label}`); return value; }
function worktreeNumber(value) {
    requireState(typeof value === 'number' || typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), 'invalid database worktree number');
    const number = Number(value);
    requireState(Number.isSafeInteger(number) && number >= 101, 'invalid database worktree number');
    return number;
}
function assignmentState(value) {
    switch (value) {
        case 'RESERVED':
        case 'PROVISIONING':
        case 'ATTACHING':
        case 'WORKING':
        case 'REVIEW':
        case 'REWORK':
        case 'INTEGRATING':
        case 'RETIRING':
        case 'INACTIVE':
        case 'RELEASED': return value;
        default: throw new Error('rolling campaign: invalid database assignment state');
    }
}
function readPool(value) {
    requireState(isRecord(value), 'project pool is not registered');
    return { managed_directory: stringColumn(value.managed_directory, 'managed directory') };
}
function readCampaign(value) {
    requireState(isRecord(value), 'campaign is not registered');
    return { campaign_id: stringColumn(value.campaign_id, 'campaign ID'), coordinator_root: stringColumn(value.coordinator_root, 'coordinator root'),
        document_path: stringColumn(value.document_path, 'document path'), bindings_path: stringColumn(value.bindings_path, 'bindings path'),
        graph_digest: stringColumn(value.graph_digest, 'graph digest'), configuration_text: stringColumn(value.configuration_text, 'configuration text') };
}
function readAssignment(value) {
    requireState(isRecord(value), 'assignment row is missing');
    const rollingAssignmentScopeV1 = readRollingAssignmentScopeV1(readStateText(stringColumn(value.scope_text, 'scope text')));
    const blockers = readStateText(stringColumn(value.blockers_text, 'blockers text'));
    requireState(isStringArray(blockers) && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)), 'invalid stored blockers');
    return { id: stringColumn(value.assignment_id, 'assignment ID'), scopeId: stringColumn(value.campaign_id, 'campaign ID'), obligationId: stringColumn(value.obligation_id, 'obligation ID'),
        generation: stringColumn(value.generation, 'generation'), state: assignmentState(value.state), sessionId: nullableStringColumn(value.session_id, 'session ID'),
        activityStopped: booleanColumn(value.activity_stopped, 'activity stopped'), retired: booleanColumn(value.retired, 'retired'), worktreeNumber: worktreeNumber(value.worktree_number),
        plannedPaths: rollingAssignmentScopeV1.plannedPaths, exclusiveResources: rollingAssignmentScopeV1.exclusiveResources, binding: rollingAssignmentScopeV1.binding, blockers };
}
function readWorktree(value) {
    requireState(isRecord(value), 'worktree row is missing');
    const state = value.state;
    requireState(state === 'AVAILABLE' || state === 'PROVISIONING' || state === 'RESERVED' || state === 'ACTIVE' || state === 'QUARANTINED', 'invalid database worktree state');
    return { number: worktreeNumber(value.number), rootPath: stringColumn(value.root_path, 'worktree root'), state };
}
function readAction(value) {
    requireState(isRecord(value), 'action row is missing');
    const state = value.state;
    const kind = value.kind;
    requireState(state === 'PENDING' || state === 'STARTED' || state === 'COMPLETED' || state === 'CANCELLED', 'invalid database action state');
    requireState(kind === 'START_WORKER' || kind === 'RESUME_WORKER', 'invalid database action kind');
    const resultText = value.result_text;
    requireState(resultText === null || typeof resultText === 'string', 'invalid database action result');
    return { id: stringColumn(value.action_id, 'action ID'), assignmentId: stringColumn(value.assignment_id, 'assignment ID'), generation: stringColumn(value.generation, 'generation'),
        state, kind, resultText };
}
class RollingCampaignStore {
    pool;
    projectId;
    constructor(pool, projectId) {
        this.pool = pool;
        this.projectId = projectId;
    }
    async transaction(campaignId, operation) {
        const poolClient = await this.pool.connect();
        try {
            await poolClient.query('BEGIN');
            const pool = (await poolClient.query('SELECT * FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
            const rollingPoolRow = readPool(pool);
            const campaign = (await poolClient.query('SELECT * FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2 FOR UPDATE', [this.projectId, campaignId])).rows[0];
            const rollingCampaignRow = readCampaign(campaign);
            const result = await operation(poolClient, rollingCampaignRow, rollingPoolRow);
            await poolClient.query('COMMIT');
            return result;
        }
        catch (error) {
            await poolClient.query('ROLLBACK');
            throw error;
        }
        finally {
            poolClient.release();
        }
    }
    async registerCampaign(request) {
        const rollingGraph = (0, rolling_campaign_js_1.collectRollingGraph)(request.coordinatorRoot, request.documentPath, request.bindingsPath);
        requireState(rollingGraph.digest === request.graphDigest && rollingGraph.document.scopeId === request.id, 'stale or mismatched coordinator graph');
        const rollingResolvedConfiguration = (0, rolling_campaign_js_1.resolveRollingConfiguration)(rollingGraph.projectConfiguration, request.configuration, null);
        requireState(node_path_1.default.isAbsolute(request.managedDirectory), 'managed directory must be absolute');
        const poolClient = await this.pool.connect();
        try {
            await poolClient.query('BEGIN');
            await poolClient.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2) ON CONFLICT DO NOTHING', [this.projectId, request.managedDirectory]);
            const pool = (await poolClient.query('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
            requireState(readPool(pool).managed_directory === request.managedDirectory, 'managed directory differs from project pool');
            await poolClient.query('INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text) VALUES($1,$2,$3,$4,$5,$6,$7)', [this.projectId, request.id, rollingGraph.coordinatorRoot, request.documentPath, request.bindingsPath, rollingGraph.digest, JSON.stringify(readRollingExecutionConfigV1({ schemaVersion: 1, ...rollingResolvedConfiguration }))]);
            await poolClient.query('COMMIT');
            return { id: request.id, graphDigest: rollingGraph.digest };
        }
        catch (error) {
            await poolClient.query('ROLLBACK');
            throw error;
        }
        finally {
            poolClient.release();
        }
    }
    graph(rollingCampaignRow, expectedDigest) {
        const rollingGraph = (0, rolling_campaign_js_1.collectRollingGraph)(rollingCampaignRow.coordinator_root, rollingCampaignRow.document_path, rollingCampaignRow.bindings_path);
        requireState(rollingGraph.digest === expectedDigest && rollingCampaignRow.graph_digest === expectedDigest, 'stale coordinator graph');
        requireState(rollingGraph.document.scopeId === rollingCampaignRow.campaign_id, 'campaign scope changed');
        return rollingGraph;
    }
    async reconcileGraph(campaignId, expectedDigest, nextDigest) {
        return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => {
            requireState(rollingCampaignRow.graph_digest === expectedDigest, 'stale accepted graph');
            const rollingGraph = (0, rolling_campaign_js_1.collectRollingGraph)(rollingCampaignRow.coordinator_root, rollingCampaignRow.document_path, rollingCampaignRow.bindings_path);
            requireState(rollingGraph.digest === nextDigest && rollingGraph.document.scopeId === campaignId, 'stale proposed graph');
            await poolClient.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2', [this.projectId, campaignId, nextDigest]);
            return { graphDigest: nextDigest };
        });
    }
    async assignment(poolClient, campaignId, id, generation) {
        const row = (await poolClient.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3', [this.projectId, campaignId, id])).rows[0];
        requireState(row && row.generation === generation && row.state !== 'RELEASED', 'invalid lease generation or released assignment');
        return readAssignment(row);
    }
    async cancelActions(poolClient, assignmentId) {
        await poolClient.query("UPDATE ponytail_index.rolling_action_v1 SET state='CANCELLED' WHERE project_id=$1 AND assignment_id=$2 AND state='PENDING'", [this.projectId, assignmentId]);
        const started = (await poolClient.query("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND state='STARTED'", [this.projectId, assignmentId])).rows;
        requireState(started.length === 0, 'external action outcome must be reconciled before stopping ownership');
    }
    async suspend(campaignId, id, generation, stopped, blockers) {
        requireState(stopped === true && Array.isArray(blockers) && blockers.length > 0
            && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)) && new Set(blockers).size === blockers.length, 'suspension requires stopped acknowledgment and unique obligation blockers');
        return this.transaction(campaignId, async (poolClient) => {
            const assignment = await this.assignment(poolClient, campaignId, id, generation);
            requireState(assignment.sessionId && !assignment.retired, 'only an attached non-retired session may become inactive');
            await this.cancelActions(poolClient, id);
            await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='INACTIVE',activity_stopped=true,blockers_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id, JSON.stringify(blockers)]);
            return { id, state: 'INACTIVE' };
        });
    }
    async retire(campaignId, id, generation, stopped) {
        requireState(stopped === true, 'retirement requires stopped acknowledgment');
        return this.transaction(campaignId, async (poolClient) => {
            await this.assignment(poolClient, campaignId, id, generation);
            await this.cancelActions(poolClient, id);
            await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',activity_stopped=true,retired=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id]);
            return { id, state: 'RETIRING' };
        });
    }
    async attachSession(campaignId, id, generation, sessionId) {
        requireState(typeof sessionId === 'string' && sessionId.length > 0
            && sessionId.trim() === sessionId && !sessionId.includes('\0'), 'invalid session identity');
        return this.transaction(campaignId, async (poolClient) => {
            const assignment = await this.assignment(poolClient, campaignId, id, generation);
            requireState(assignment.state === 'RESERVED' || assignment.state === 'WORKING', 'assignment cannot attach a session');
            requireState(assignment.sessionId === null || assignment.sessionId === sessionId, 'resumption must retain the original session');
            const completed = (await poolClient.query("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND generation=$3 AND state='COMPLETED'", [this.projectId, id, generation])).rows;
            requireState(completed.length === 1, 'session attachment requires completed external action');
            await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET session_id=$2,state='WORKING' WHERE assignment_id=$1", [id, sessionId]);
            await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2", [this.projectId, assignment.worktreeNumber]);
            return { id, sessionId, state: 'WORKING' };
        });
    }
    async allocate(campaignId, expectedDigest, release = null) {
        return this.transaction(campaignId, async (poolClient, rollingCampaignRow, rollingPoolRow) => {
            const rollingGraph = this.graph(rollingCampaignRow, expectedDigest);
            if (release) {
                const row = await this.assignment(poolClient, campaignId, release.id, release.generation);
                requireState(row.state === 'RETIRING' && row.retired && row.activityStopped, 'checkout owner must retire before release');
                await this.cancelActions(poolClient, row.id);
                await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RELEASED' WHERE assignment_id=$1", [row.id]);
                await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=$2", [this.projectId, row.worktreeNumber]);
            }
            const assignments = (await poolClient.query("SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND state<>'RELEASED' ORDER BY created_at,assignment_id", [this.projectId])).rows.map(readAssignment);
            const rollingExecutionConfigV1 = readRollingExecutionConfigV1(readStateText(rollingCampaignRow.configuration_text));
            const rollingSchedulingResult = (0, rolling_campaign_js_1.selectRollingAssignments)(rollingGraph, assignments, rollingExecutionConfigV1.maxActiveWorkers, expectedDigest);
            const selected = rollingSchedulingResult.selected[0];
            if (!selected)
                return { assignment: null, reason: rollingSchedulingResult.activeCount >= rollingExecutionConfigV1.maxActiveWorkers ? 'capacity_reached' : 'no_ready_obligation', blocked: rollingSchedulingResult.blocked };
            const generation = node_crypto_1.default.randomUUID();
            let id = selected.assignmentId;
            let worktree;
            if (id) {
                const assignment = assignments.find(item => item.id === id);
                requireState(assignment && assignment.sessionId, 'inactive assignment has no resumable session');
                worktree = readWorktree((await poolClient.query('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, assignment.worktreeNumber])).rows[0]);
                await poolClient.query("UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,state='RESERVED',activity_stopped=false,blockers_text='[]' WHERE assignment_id=$1", [id, generation]);
            }
            else {
                const available = (await poolClient.query("SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND state='AVAILABLE' ORDER BY number LIMIT 1", [this.projectId])).rows[0];
                if (available)
                    worktree = readWorktree(available);
                else {
                    const numbers = (await poolClient.query('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number', [this.projectId])).rows;
                    let number = 101;
                    for (const row of numbers) {
                        if (worktreeNumber(row.number) !== number)
                            break;
                        number++;
                    }
                    requireState(Number.isSafeInteger(number), 'worktree numbers exhausted');
                    worktree = readWorktree((await poolClient.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *", [this.projectId, number, node_path_1.default.join(rollingPoolRow.managed_directory, String(number))])).rows[0]);
                }
                id = node_crypto_1.default.randomUUID();
                await poolClient.query("INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,scope_text) VALUES($1,$2,$3,$4,$5,$6,'RESERVED',$7)", [this.projectId, campaignId, id, selected.obligationId, worktree.number, generation,
                    JSON.stringify(readRollingAssignmentScopeV1({ schemaVersion: 1, plannedPaths: selected.plannedPaths, exclusiveResources: selected.exclusiveResources, binding: selected.binding }))]);
            }
            if (worktree.state !== 'PROVISIONING')
                await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, worktree.number]);
            const actionId = node_crypto_1.default.randomUUID();
            await poolClient.query("INSERT INTO ponytail_index.rolling_action_v1(project_id,campaign_id,action_id,assignment_id,kind,generation,state) VALUES($1,$2,$3,$4,$5,$6,'PENDING')", [this.projectId, campaignId, actionId, id, selected.kind === 'resume_worker' ? 'RESUME_WORKER' : 'START_WORKER', generation]);
            const row = (await poolClient.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1', [id])).rows[0];
            return { assignment: readAssignment(row), worktree: { number: worktree.number, rootPath: worktree.rootPath }, actionId, reason: null };
        });
    }
    async status(campaignId) {
        return this.transaction(campaignId, async (poolClient, rollingCampaignRow) => ({ graphDigest: rollingCampaignRow.graph_digest,
            assignments: (await poolClient.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 ORDER BY created_at,assignment_id', [this.projectId, campaignId])).rows.map(readAssignment) }));
    }
    async nextActions(campaignId) {
        const rows = (await this.pool.query("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND state IN ('PENDING','STARTED') ORDER BY created_at,action_id", [this.projectId, campaignId])).rows;
        return rows.map(value => { const rollingActionRow = readAction(value); return { id: rollingActionRow.id, assignmentId: rollingActionRow.assignmentId, kind: rollingActionRow.kind, generation: rollingActionRow.generation, state: rollingActionRow.state }; });
    }
    async acknowledgeAction(campaignId, actionId, generation, state, resultText = null) {
        requireState(['STARTED', 'COMPLETED'].includes(state), 'invalid external action acknowledgment');
        return this.transaction(campaignId, async (poolClient) => {
            const row = readAction((await poolClient.query('SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3', [this.projectId, campaignId, actionId])).rows[0]);
            requireState(row && row.generation === generation, 'invalid action lease generation');
            await this.assignment(poolClient, campaignId, row.assignmentId, generation);
            if (row.state === state) {
                requireState(row.resultText === resultText, 'acknowledgment differs from accepted result');
                return { id: actionId, state };
            }
            requireState(row.state === 'PENDING' && state === 'STARTED' || row.state === 'STARTED' && state === 'COMPLETED', 'invalid external action transition');
            requireState(state !== 'COMPLETED' || typeof resultText === 'string' && resultText.length > 0, 'completion requires external result');
            await poolClient.query('UPDATE ponytail_index.rolling_action_v1 SET state=$2,result_text=$3 WHERE action_id=$1', [actionId, state, resultText]);
            return { id: actionId, state };
        });
    }
}
exports.RollingCampaignStore = RollingCampaignStore;
