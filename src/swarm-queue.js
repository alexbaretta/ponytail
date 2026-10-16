// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-queue.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmQueueStore = exports.SwarmQueueStateReaders = exports.SwarmQueueCommandReaders = exports.SwarmQueueResultReaders = exports.SwarmQueueVerdictReaders = void 0;
exports.readSwarmQueueCommandV1 = readSwarmQueueCommandV1;
exports.parseSwarmQueueJson = parseSwarmQueueJson;
exports.readSwarmQueueStateV1 = readSwarmQueueStateV1;
exports.readSwarmQueueVerdictV1 = readSwarmQueueVerdictV1;
exports.readSwarmQueueResultV1 = readSwarmQueueResultV1;
exports.selectSwarmQueueTask = selectSwarmQueueTask;
exports.requireSwarmQueueLifecycleQuiescence = requireSwarmQueueLifecycleQuiescence;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_util_1 = require("node:util");
const lossless_json_1 = require("lossless-json");
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
const obligation_binding_history_js_1 = require("../skills/plan-execution/scripts/obligation-binding-history.js");
function requireQueue(condition, message) { if (!condition)
    throw new Error(`swarm queue: ${message}`); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function record(value, keys) {
    requireQueue(isRecord(value), 'expected record');
    requireQueue(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'unexpected record fields');
    return value;
}
function text(value) { requireQueue(typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\0\r\n]/u.test(value), 'expected exact nonempty text'); return value; }
function strings(value) { requireQueue(Array.isArray(value), 'expected string array'); const values = value.map(text); requireQueue(new Set(values).size === values.length, 'duplicate strings'); return values; }
function nullableText(value) { return value === null ? null : text(value); }
function integer(value) { requireQueue(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'invalid sequence'); return value; }
function relative(value) { const result = text(value); requireQueue(!node_path_1.default.isAbsolute(result) && node_path_1.default.posix.normalize(result) === result && !result.split('/').some(part => part === '..' || part === '.' || part === '.git') && !result.includes('\\'), 'expected safe repository-relative path'); return result; }
function actor(value) {
    requireQueue(value !== null && typeof value === 'object' && 'kind' in value, 'invalid actor');
    switch (value.kind) {
        case 'coordinator': {
            const input = record(value, ['kind', 'sessionId']);
            return { kind: 'coordinator', sessionId: text(input.sessionId) };
        }
        case 'worker': {
            const input = record(value, ['kind', 'sessionId', 'generation']);
            return { kind: 'worker', sessionId: text(input.sessionId), generation: text(input.generation) };
        }
        default: throw new Error('swarm queue: invalid actor kind');
    }
}
function taskInput(value) {
    const input = record(value, ['id', 'title', 'obligationIds', 'preferredWorker', 'context']);
    const obligationIds = strings(input.obligationIds);
    requireQueue(obligationIds.length > 0 && obligationIds.every(id => /^OBL-[1-9][0-9]*$/u.test(id)), 'task requires obligation IDs');
    return { id: text(input.id), title: text(input.title), obligationIds, preferredWorker: nullableText(input.preferredWorker), context: strings(input.context) };
}
function tasks(value) { requireQueue(Array.isArray(value), 'expected tasks'); return value.map(taskInput); }
function candidate(value) {
    if (value === null)
        return null;
    const input = record(value, ['base', 'revision', 'reviewer', 'verdictPath', 'proofPaths']);
    return { base: text(input.base), revision: text(input.revision), reviewer: text(input.reviewer), verdictPath: relative(input.verdictPath), proofPaths: strings(input.proofPaths).map(relative) };
}
function recordRoots(value) { const input = record(value, ['requirements', 'uat', 'issues', 'plans']); return { requirements: relative(input.requirements), uat: relative(input.uat), issues: relative(input.issues), plans: relative(input.plans) }; }
function discovery(value) {
    const input = record(value, ['id', 'kind', 'actor', 'updates', 'tasks']);
    requireQueue(Array.isArray(input.updates), 'expected document updates');
    requireQueue(input.kind === 'bug' || input.kind === 'work', 'invalid discovery kind');
    return { id: text(input.id), kind: input.kind, actor: actor(input.actor), tasks: tasks(input.tasks), updates: input.updates.map((value) => {
            const input = record(value, ['path', 'beforeContent', 'content']);
            requireQueue(typeof input.content === 'string', 'expected document content');
            requireQueue(input.beforeContent === null || typeof input.beforeContent === 'string', 'invalid prior document content');
            return { path: relative(input.path), beforeContent: input.beforeContent, content: input.content };
        }) };
}
function readSwarmQueueCommandV1(value) {
    requireQueue(value !== null && typeof value === 'object' && 'command' in value, 'expected queue command');
    const common = ['schemaVersion', 'campaignId', 'actor'];
    function fields(keys) { return record(value, [...common, 'command', ...keys]); }
    let input;
    requireQueue('schemaVersion' in value && value.schemaVersion === 1 && 'campaignId' in value && 'actor' in value, 'unsupported command version');
    const baseSwarmQueueCommandFields = { schemaVersion: 1, campaignId: text(value.campaignId), actor: actor(value.actor) };
    switch (value.command) {
        case 'init':
            input = fields(['documentPath', 'bindingsPath', 'authority', 'assessor', 'recordRoots']);
            return { ...baseSwarmQueueCommandFields, command: 'init', documentPath: relative(input.documentPath), bindingsPath: input.bindingsPath === null ? null : relative(input.bindingsPath), authority: strings(input.authority), assessor: text(input.assessor), recordRoots: recordRoots(input.recordRoots) };
        case 'refresh-base':
            input = fields(['taskId', 'generation', 'base']);
            return { ...baseSwarmQueueCommandFields, command: 'refresh-base', taskId: text(input.taskId), generation: text(input.generation), base: text(input.base) };
        case 'record-review':
            input = fields(['taskId', 'generation', 'reviewer', 'hostEvidencePath']);
            return { ...baseSwarmQueueCommandFields, command: 'record-review', taskId: text(input.taskId), generation: text(input.generation), reviewer: text(input.reviewer), hostEvidencePath: relative(input.hostEvidencePath) };
        case 'add':
            input = fields(['tasks']);
            return { ...baseSwarmQueueCommandFields, command: 'add', tasks: tasks(input.tasks) };
        case 'claim':
        case 'requests':
        case 'take':
        case 'status':
        case 'complete':
            fields([]);
            return { ...baseSwarmQueueCommandFields, command: value.command };
        case 'handoff':
            input = fields(['taskId', 'generation', 'requestId', 'kind', 'detail', 'evidencePaths', 'candidate']);
            requireQueue(input.kind === 'help' || input.kind === 'integration', 'invalid handoff kind');
            return { ...baseSwarmQueueCommandFields, command: 'handoff', taskId: text(input.taskId), generation: text(input.generation), requestId: text(input.requestId), kind: input.kind, detail: text(input.detail), evidencePaths: strings(input.evidencePaths).map(relative), candidate: candidate(input.candidate) };
        case 'resolve':
            input = fields(['requestId', 'response', 'outcome']);
            requireQueue(input.outcome === 'retry' || input.outcome === 'accepted' || input.outcome === 'answered', 'invalid resolution outcome');
            return { ...baseSwarmQueueCommandFields, command: 'resolve', requestId: text(input.requestId), response: text(input.response), outcome: input.outcome };
        case 'discover':
            input = fields(['discovery']);
            return { ...baseSwarmQueueCommandFields, command: 'discover', discovery: discovery(input.discovery) };
        case 'recover':
        case 'abort-discovery':
            input = fields(['discoveryId']);
            return { ...baseSwarmQueueCommandFields, command: value.command, discoveryId: text(input.discoveryId) };
        default: throw new Error('swarm queue: unsupported command');
    }
}
function parseSwarmQueueJson(source) { return (0, lossless_json_1.parse)(source, null, token => { requireQueue(/^(0|[1-9][0-9]*)$/u.test(token), 'unsafe JSON integer token'); const value = Number(token); requireQueue(Number.isSafeInteger(value), 'unsafe JSON integer'); return value; }); }
function claim(value) {
    if (value === null)
        return null;
    const input = record(value, ['generation', 'sessionId', 'workerGeneration', 'rootPath', 'base', 'leases']);
    requireQueue(Array.isArray(input.leases), 'expected frozen leases');
    return { generation: text(input.generation), sessionId: text(input.sessionId), workerGeneration: text(input.workerGeneration), rootPath: text(input.rootPath), base: text(input.base), leases: input.leases.map(obligation_binding_history_js_1.readObligationLeaseV1) };
}
function artifacts(value) { requireQueue(Array.isArray(value), 'expected artifacts'); return value.map((value) => { const input = record(value, ['path', 'contentBase64']); return { path: relative(input.path), contentBase64: typeof input.contentBase64 === 'string' ? input.contentBase64 : text(input.contentBase64) }; }); }
function review(value) { if (value === null)
    return null; const input = record(value, ['reviewer', 'base', 'revision', 'hostEvidencePath', 'contentBase64']); return { reviewer: text(input.reviewer), base: text(input.base), revision: text(input.revision), hostEvidencePath: relative(input.hostEvidencePath), contentBase64: text(input.contentBase64) }; }
function checkpoint(value) { if (value === null)
    return null; const input = record(value, ['revision', 'ref', 'indexPatchBase64', 'worktreePatchBase64', 'untracked']); requireQueue(typeof input.indexPatchBase64 === 'string' && typeof input.worktreePatchBase64 === 'string', 'invalid checkpoint patches'); return { revision: text(input.revision), ref: text(input.ref), indexPatchBase64: input.indexPatchBase64, worktreePatchBase64: input.worktreePatchBase64, untracked: artifacts(input.untracked) }; }
function readSwarmQueueStateV1(value) {
    const input = record(value, ['schemaVersion', 'campaignId', 'ownerRoot', 'documentPath', 'bindingsPath', 'authority', 'assessor', 'recordRoots', 'state', 'sequence', 'tasks', 'requests', 'pending', 'discoveries']);
    requireQueue(input.schemaVersion === 1 && (input.state === 'open' || input.state === 'complete') && Array.isArray(input.tasks) && Array.isArray(input.requests) && Array.isArray(input.discoveries), 'invalid state version/collections');
    return { schemaVersion: 1, campaignId: text(input.campaignId), ownerRoot: text(input.ownerRoot), documentPath: relative(input.documentPath), bindingsPath: input.bindingsPath === null ? null : relative(input.bindingsPath), authority: strings(input.authority), assessor: text(input.assessor), recordRoots: recordRoots(input.recordRoots), state: input.state, sequence: integer(input.sequence),
        tasks: input.tasks.map((value) => {
            const input = record(value, ['id', 'title', 'obligationIds', 'preferredWorker', 'context', 'sequence', 'claimSequence', 'state', 'claim', 'claimHistory', 'candidate', 'checkpoint', 'review']);
            requireQueue(input.state === 'ready' || input.state === 'working' || input.state === 'help' || input.state === 'integration' || input.state === 'done', 'invalid task state');
            requireQueue(Array.isArray(input.claimHistory), 'invalid claim history');
            const claimHistory = input.claimHistory.map(claim);
            requireQueue(claimHistory.every(valueSwarmQueueClaimV1 => valueSwarmQueueClaimV1 !== null), 'invalid historical claim');
            return { ...taskInput({ id: input.id, title: input.title, obligationIds: input.obligationIds, preferredWorker: input.preferredWorker, context: input.context }), sequence: integer(input.sequence), claimSequence: input.claimSequence === null ? null : integer(input.claimSequence), state: input.state, claim: claim(input.claim), claimHistory: claimHistory.filter((valueSwarmQueueClaimV1) => valueSwarmQueueClaimV1 !== null), candidate: candidate(input.candidate), checkpoint: checkpoint(input.checkpoint), review: review(input.review) };
        }),
        requests: input.requests.map((value) => {
            const input = record(value, ['id', 'sequence', 'taskId', 'claimGeneration', 'kind', 'detail', 'evidencePaths', 'artifacts', 'outcome', 'state', 'response']);
            requireQueue((input.kind === 'help' || input.kind === 'integration') && (input.state === 'open' || input.state === 'processing' || input.state === 'resolved'), 'invalid request state');
            requireQueue(input.outcome === null || input.outcome === 'retry' || input.outcome === 'accepted' || input.outcome === 'answered', 'invalid request outcome');
            return { id: text(input.id), sequence: integer(input.sequence), taskId: text(input.taskId), claimGeneration: text(input.claimGeneration), kind: input.kind, detail: text(input.detail), evidencePaths: strings(input.evidencePaths).map(relative), artifacts: artifacts(input.artifacts), outcome: input.outcome, state: input.state, response: nullableText(input.response) };
        }),
        pending: input.pending === null ? null : discovery(input.pending), discoveries: input.discoveries.map(discovery) };
}
function readSwarmQueueVerdictV1(value) {
    const input = record(value, ['schemaVersion', 'reviewer', 'base', 'revision', 'accepted']);
    requireQueue(input.schemaVersion === 1 && input.accepted === true, 'review is not an accepted V1 verdict');
    return { schemaVersion: 1, reviewer: text(input.reviewer), base: text(input.base), revision: text(input.revision), accepted: true };
}
function readSwarmQueueResultV1(value) {
    const input = record(value, ['schemaVersion', 'queue', 'task', 'request']);
    requireQueue(input.schemaVersion === 1, 'invalid queue result version');
    const swarmQueueStateV1 = readSwarmQueueStateV1(input.queue);
    let swarmQueueTaskV1 = null;
    let swarmQueueRequestV1 = null;
    if (input.task !== null) {
        requireQueue(isRecord(input.task), 'invalid selected task');
        const id = text(input.task.id);
        const selected = swarmQueueStateV1.tasks.find(task => task.id === id);
        requireQueue(selected !== undefined && (0, node_util_1.isDeepStrictEqual)(selected, input.task), 'selected task differs from state');
        swarmQueueTaskV1 = selected;
    }
    if (input.request !== null) {
        requireQueue(isRecord(input.request), 'invalid selected request');
        const id = text(input.request.id);
        const selected = swarmQueueStateV1.requests.find(request => request.id === id);
        requireQueue(selected !== undefined && (0, node_util_1.isDeepStrictEqual)(selected, input.request), 'selected request differs from state');
        swarmQueueRequestV1 = selected;
    }
    return { schemaVersion: 1, queue: swarmQueueStateV1, task: swarmQueueTaskV1, request: swarmQueueRequestV1 };
}
exports.SwarmQueueVerdictReaders = { V1: readSwarmQueueVerdictV1 };
exports.SwarmQueueResultReaders = { V1: readSwarmQueueResultV1 };
exports.SwarmQueueCommandReaders = { V1: readSwarmQueueCommandV1 };
exports.SwarmQueueStateReaders = { V1: readSwarmQueueStateV1 };
function digest(content) { return node_crypto_1.default.createHash('sha256').update(content).digest('hex'); }
function safeFile(root, relativePath) {
    const target = node_path_1.default.join(root, relative(relativePath));
    let current = root;
    for (const part of relativePath.split('/')) {
        current = node_path_1.default.join(current, part);
        const stat = node_fs_1.default.lstatSync(current, { throwIfNoEntry: false });
        requireQueue(stat === undefined || !stat.isSymbolicLink(), 'symlink in document/evidence path');
        if (current !== target)
            requireQueue(stat === undefined || stat.isDirectory(), 'document parent must be a directory');
    }
    requireQueue(!node_fs_1.default.existsSync(target) || node_fs_1.default.statSync(target).isFile(), 'expected regular document/evidence file');
    return target;
}
function readFile(root, relativePath) { return node_fs_1.default.readFileSync(safeFile(root, relativePath), 'utf8'); }
function canonical(swarmQueueStateV1) {
    const source = readFile(swarmQueueStateV1.ownerRoot, swarmQueueStateV1.documentPath);
    const obligationDocumentV1 = (0, obligations_js_1.parseObligationDocument)(source);
    requireQueue(obligationDocumentV1.scopeId === swarmQueueStateV1.campaignId, 'canonical obligation scope differs');
    const obligationBindingHistoryV1 = swarmQueueStateV1.bindingsPath === null ? { schemaVersion: 1, scopeId: obligationDocumentV1.scopeId, revisions: [] } : (0, obligation_binding_history_js_1.parseObligationBindingHistory)(readFile(swarmQueueStateV1.ownerRoot, swarmQueueStateV1.bindingsPath));
    return { document: obligationDocumentV1, history: obligationBindingHistoryV1, scope: (0, obligations_js_1.projectObligationScope)(obligationDocumentV1, swarmQueueStateV1.ownerRoot, obligationBindingHistoryV1), digest: digest(source + JSON.stringify(obligationBindingHistoryV1)) };
}
function inspectionTask(swarmQueueTaskV1) {
    return swarmQueueTaskV1.claim !== null && swarmQueueTaskV1.claim.leases.length > 0 && swarmQueueTaskV1.claim.leases.every(obligationLeaseV1 => obligationLeaseV1.binding.execution.operations.length === 1 && obligationLeaseV1.binding.execution.operations[0] === 'inspect' && obligationLeaseV1.binding.execution.selection.length === 0 && obligationLeaseV1.binding.execution.target === null);
}
function reconcileUnclaimed(swarmQueueStateV1, currentSwarmQueueCanonical) {
    return { ...swarmQueueStateV1, tasks: swarmQueueStateV1.tasks.map(swarmQueueTaskV1 => swarmQueueTaskV1.state === 'ready' && swarmQueueTaskV1.claim === null && swarmQueueTaskV1.obligationIds.every(id => currentSwarmQueueCanonical.scope.projection.satisfiedIds.includes(id)) ? { ...swarmQueueTaskV1, state: 'done' } : swarmQueueTaskV1) };
}
function overlaps(left, right) { return left === right || left.startsWith(right + '/') || right.startsWith(left + '/'); }
function taskPaths(swarmQueueTaskV1, swarmQueueCanonical, frozen = true) {
    return !frozen || swarmQueueTaskV1.claim === null ? swarmQueueTaskV1.obligationIds.flatMap(id => swarmQueueCanonical.scope.bindings.get(id)?.execution.plannedPaths ?? []) : [swarmQueueTaskV1.claim, ...swarmQueueTaskV1.claimHistory].flatMap(swarmQueueClaimV1 => swarmQueueClaimV1.leases.flatMap(leaseObligationLeaseV1 => leaseObligationLeaseV1.binding.execution.plannedPaths));
}
function selectSwarmQueueTask(swarmQueueStateV1, sessionId, swarmQueueCanonical) {
    const satisfied = new Set(swarmQueueCanonical.scope.projection.satisfiedIds);
    const reserved = swarmQueueStateV1.tasks.filter(swarmQueueTaskV1 => swarmQueueTaskV1.state !== 'done' && swarmQueueTaskV1.claim !== null);
    const previousSwarmQueueTaskV1 = swarmQueueStateV1.tasks.filter(swarmQueueTaskV1 => swarmQueueTaskV1.claim?.sessionId === sessionId).sort((leftSwarmQueueTaskV1, rightSwarmQueueTaskV1) => (rightSwarmQueueTaskV1.claimSequence ?? -1) - (leftSwarmQueueTaskV1.claimSequence ?? -1))[0];
    function affinity(swarmQueueTaskV1) { return previousSwarmQueueTaskV1 === undefined ? 0 : swarmQueueTaskV1.context.filter(value => previousSwarmQueueTaskV1.context.includes(value)).length; }
    const eligible = swarmQueueStateV1.tasks.filter(swarmQueueTaskV1 => swarmQueueTaskV1.state === 'ready' && (swarmQueueTaskV1.claim === null || swarmQueueTaskV1.claim.sessionId === sessionId) && swarmQueueTaskV1.obligationIds.some(id => !satisfied.has(id))
        && swarmQueueTaskV1.obligationIds.every(id => { const bindingObligationEffectiveBinding = swarmQueueCanonical.scope.bindings.get(id); return bindingObligationEffectiveBinding !== undefined && bindingObligationEffectiveBinding.dependsOn.every(dependency => satisfied.has(dependency) || swarmQueueTaskV1.obligationIds.includes(dependency)); })
        && reserved.every(ownerSwarmQueueTaskV1 => ownerSwarmQueueTaskV1.id === swarmQueueTaskV1.id || !ownerSwarmQueueTaskV1.obligationIds.some(id => swarmQueueTaskV1.obligationIds.includes(id)) && !taskPaths(ownerSwarmQueueTaskV1, swarmQueueCanonical).some(left => taskPaths(swarmQueueTaskV1, swarmQueueCanonical, false).some(right => overlaps(left, right)))));
    const preferred = eligible.filter(swarmQueueTaskV1 => swarmQueueTaskV1.preferredWorker === sessionId).sort((leftSwarmQueueTaskV1, rightSwarmQueueTaskV1) => leftSwarmQueueTaskV1.sequence - rightSwarmQueueTaskV1.sequence);
    return preferred[0] ?? eligible.sort((leftSwarmQueueTaskV1, rightSwarmQueueTaskV1) => affinity(rightSwarmQueueTaskV1) - affinity(leftSwarmQueueTaskV1) || leftSwarmQueueTaskV1.sequence - rightSwarmQueueTaskV1.sequence)[0] ?? null;
}
class SwarmQueueStore {
    pool;
    projectId;
    ownerRoot;
    constructor(pool, projectId, ownerRoot) {
        this.pool = pool;
        this.projectId = projectId;
        this.ownerRoot = ownerRoot;
    }
    async validateActor(poolClient, swarmQueueActorV1, invokingRoot, campaignId) {
        const owner = (await poolClient.query('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2', [this.projectId, this.ownerRoot])).rows[0];
        requireQueue(owner !== undefined, 'swarm owner is absent');
        requireQueue(node_fs_1.default.realpathSync(this.ownerRoot) === this.ownerRoot && (0, rolling_integration_js_1.git)(this.ownerRoot, ['rev-parse', '--show-toplevel']).trim() === this.ownerRoot
            && node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(this.ownerRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) === owner.git_common_directory, 'owner checkout identity changed');
        switch (swarmQueueActorV1.kind) {
            case 'coordinator':
                requireQueue(owner.coordinator_session_id === swarmQueueActorV1.sessionId && invokingRoot === this.ownerRoot, 'coordinator identity/cwd differs');
                return { rootPath: this.ownerRoot, workerGeneration: null };
            case 'worker': {
                const row = (await poolClient.query(`SELECT k.*,n.root_path,m.generation AS membership_generation,w.root_path AS checkout_root FROM ponytail_index.swarm_worker_v1 k
      JOIN ponytail_index.swarm_native_session_v1 n USING(session_id)
      JOIN ponytail_index.swarm_worktree_v1 m ON m.project_id=k.project_id AND m.number=k.worktree_number
      JOIN ponytail_index.rolling_worktree_v1 w ON w.project_id=k.project_id AND w.number=k.worktree_number
      WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3`, [this.projectId, this.ownerRoot, swarmQueueActorV1.sessionId])).rows[0];
                requireQueue(row !== undefined && row.state === 'BOUND' && row.completed === false && row.generation === swarmQueueActorV1.generation && row.membership_generation === row.worktree_generation
                    && row.assignment_kind === 'plan' && row.assignment_id === campaignId && row.root_path === invokingRoot && row.checkout_root === invokingRoot, 'worker identity/generation/cwd differs');
                requireQueue(node_fs_1.default.realpathSync(invokingRoot) === invokingRoot && node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(invokingRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) === owner.git_common_directory, 'worker repository changed');
                (0, rolling_worktrees_js_1.validateRollingSessionMarker)(invokingRoot, swarmQueueActorV1.sessionId);
                return { rootPath: invokingRoot, workerGeneration: swarmQueueActorV1.generation };
            }
        }
    }
    async save(poolClient, swarmQueueStateV1) { readSwarmQueueStateV1(swarmQueueStateV1); await poolClient.query('UPDATE ponytail_index.swarm_queue_v1 SET state_text=$4,closed=$5 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3', [this.projectId, this.ownerRoot, swarmQueueStateV1.campaignId, JSON.stringify(swarmQueueStateV1), swarmQueueStateV1.state === 'complete']); }
    async inspect(campaignId) { const row = (await this.pool.query('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3', [this.projectId, this.ownerRoot, campaignId])).rows[0]; requireQueue(row !== undefined && typeof row.state_text === 'string', 'queue campaign is absent'); return readSwarmQueueStateV1(parseSwarmQueueJson(row.state_text)); }
    coordinator(swarmQueueCommandV1) { requireQueue(swarmQueueCommandV1.actor.kind === 'coordinator', 'operation requires the bound coordinator'); }
    async noLegacyAssignments(poolClient) {
        const row = (await poolClient.query(`SELECT a.assignment_id FROM ponytail_index.rolling_assignment_v1 a JOIN ponytail_index.rolling_campaign_v1 c USING(project_id,campaign_id)
   WHERE a.project_id=$1 AND c.coordinator_root=$2 AND a.state<>'RELEASED' LIMIT 1`, [this.projectId, this.ownerRoot])).rows[0];
        requireQueue(row === undefined, 'quiesce/preserve and release legacy assignments before queue activation');
    }
    add(swarmQueueStateV1, inputs, swarmQueueCanonical = canonical(swarmQueueStateV1)) {
        const next = [...swarmQueueStateV1.tasks];
        let sequence = swarmQueueStateV1.sequence;
        for (const swarmQueueTaskInputV1 of inputs) {
            const existingSwarmQueueTaskV1 = next.find(swarmQueueTaskV1 => swarmQueueTaskV1.id === swarmQueueTaskInputV1.id);
            if (existingSwarmQueueTaskV1 !== undefined) {
                requireQueue((0, node_util_1.isDeepStrictEqual)(taskInput({ id: existingSwarmQueueTaskV1.id, title: existingSwarmQueueTaskV1.title, obligationIds: existingSwarmQueueTaskV1.obligationIds, preferredWorker: existingSwarmQueueTaskV1.preferredWorker, context: existingSwarmQueueTaskV1.context }), swarmQueueTaskInputV1), 'task ID already has different contents');
                continue;
            }
            requireQueue(swarmQueueTaskInputV1.obligationIds.every(id => swarmQueueCanonical.scope.bindings.has(id)), 'unknown or unaccepted canonical obligation');
            requireQueue(swarmQueueTaskInputV1.obligationIds.some(id => !swarmQueueCanonical.scope.projection.satisfiedIds.includes(id)), 'obligations already satisfied; do not queue discharged work');
            requireQueue(!next.some(swarmQueueTaskV1 => swarmQueueTaskV1.state !== 'done' && swarmQueueTaskV1.obligationIds.some(id => swarmQueueTaskInputV1.obligationIds.includes(id))), 'obligation already has queued work; use its existing task');
            next.push({ ...swarmQueueTaskInputV1, sequence: ++sequence, claimSequence: null, state: 'ready', claim: null, claimHistory: [], candidate: null, checkpoint: null, review: null });
        }
        return { ...swarmQueueStateV1, tasks: next, sequence };
    }
    validateDiscovery(swarmQueueStateV1, swarmQueueDiscoveryV1) {
        requireQueue(swarmQueueDiscoveryV1.updates.length > 0 && swarmQueueDiscoveryV1.tasks.length > 0 && new Set(swarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path)).size === swarmQueueDiscoveryV1.updates.length, 'discovery requires unique document updates and tasks');
        requireQueue(swarmQueueDiscoveryV1.updates.every((updateSwarmQueueDocumentUpdateV1, index) => swarmQueueDiscoveryV1.updates.every((otherSwarmQueueDocumentUpdateV1, otherIndex) => index === otherIndex || !overlaps(updateSwarmQueueDocumentUpdateV1.path, otherSwarmQueueDocumentUpdateV1.path))), 'document updates cannot contain ancestor/descendant file conflicts');
        const rootsSwarmQueueRecordRootsV1 = swarmQueueStateV1.recordRoots;
        requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.requirements + '/')) && swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.uat + '/')) && swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.plans + '/')), 'discovery must reconcile configured requirements, UAT and plan records');
        if (swarmQueueDiscoveryV1.kind === 'bug')
            requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.issues + '/')), 'bug discovery requires an issue record');
        requireQueue(swarmQueueDiscoveryV1.updates.every(updateSwarmQueueDocumentUpdateV1 => Object.values(rootsSwarmQueueRecordRootsV1).some(root => updateSwarmQueueDocumentUpdateV1.path.startsWith(root + '/')) || updateSwarmQueueDocumentUpdateV1.path === '.agents/config/project/traceability.json' || updateSwarmQueueDocumentUpdateV1.path === swarmQueueStateV1.bindingsPath), 'discovery update outside canonical PM/configuration scope');
        for (const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates) {
            const target = safeFile(swarmQueueStateV1.ownerRoot, updateSwarmQueueDocumentUpdateV1.path);
            requireQueue((node_fs_1.default.existsSync(target) ? node_fs_1.default.readFileSync(target, 'utf8') : null) === updateSwarmQueueDocumentUpdateV1.beforeContent, `stale document: ${updateSwarmQueueDocumentUpdateV1.path}`);
        }
        const beforeSwarmQueueCanonical = canonical(swarmQueueStateV1);
        const documentUpdateSwarmQueueDocumentUpdateV1 = swarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path === swarmQueueStateV1.documentPath);
        const proposed = new Map(swarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1 => [updateSwarmQueueDocumentUpdateV1.path, updateSwarmQueueDocumentUpdateV1.content]));
        const afterObligationDocumentV1 = documentUpdateSwarmQueueDocumentUpdateV1 === undefined ? beforeSwarmQueueCanonical.document : (0, obligations_js_1.acceptCheckpoint)(beforeSwarmQueueCanonical.document, (0, obligations_js_1.parseObligationDocument)(documentUpdateSwarmQueueDocumentUpdateV1.content), swarmQueueStateV1.ownerRoot, proposed);
        const historyUpdateSwarmQueueDocumentUpdateV1 = swarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path === swarmQueueStateV1.bindingsPath);
        const obligationBindingHistoryV1 = historyUpdateSwarmQueueDocumentUpdateV1 === undefined ? beforeSwarmQueueCanonical.history : (0, obligation_binding_history_js_1.parseObligationBindingHistory)(historyUpdateSwarmQueueDocumentUpdateV1.content);
        requireQueue(obligationBindingHistoryV1.scopeId === beforeSwarmQueueCanonical.history.scopeId && obligationBindingHistoryV1.revisions.length >= beforeSwarmQueueCanonical.history.revisions.length && beforeSwarmQueueCanonical.history.revisions.every((revisionObligationBindingRevisionV1, index) => (0, node_util_1.isDeepStrictEqual)(revisionObligationBindingRevisionV1, obligationBindingHistoryV1.revisions[index])), 'accepted binding history prefix is immutable');
        const projectionObligationScopeProjection = (0, obligations_js_1.projectObligationScope)(afterObligationDocumentV1, swarmQueueStateV1.ownerRoot, obligationBindingHistoryV1, undefined, proposed);
        requireQueue(swarmQueueStateV1.tasks.filter(swarmQueueTaskV1 => swarmQueueTaskV1.state === 'working').every(swarmQueueTaskV1 => swarmQueueTaskV1.claim?.leases.every(leaseObligationLeaseV1 => (0, node_util_1.isDeepStrictEqual)(leaseObligationLeaseV1.binding, projectionObligationScopeProjection.bindings.get(leaseObligationLeaseV1.binding.obligationId)))), 'discovery cannot alter an actively executing frozen binding');
        requireQueue(swarmQueueDiscoveryV1.tasks.every(swarmQueueTaskInputV1 => swarmQueueTaskInputV1.obligationIds.every(id => projectionObligationScopeProjection.bindings.has(id))), 'discovered obligations missing from accepted baseline');
        requireQueue(swarmQueueDiscoveryV1.tasks.every(swarmQueueTaskInputV1 => !swarmQueueStateV1.tasks.some(existingSwarmQueueTaskV1 => existingSwarmQueueTaskV1.state !== 'done' && existingSwarmQueueTaskV1.id !== swarmQueueTaskInputV1.id && existingSwarmQueueTaskV1.obligationIds.some(id => swarmQueueTaskInputV1.obligationIds.includes(id)))), 'discovered work duplicates an existing obligation');
        this.add(swarmQueueStateV1, swarmQueueDiscoveryV1.tasks, { document: afterObligationDocumentV1, history: obligationBindingHistoryV1, scope: projectionObligationScopeProjection, digest: digest(JSON.stringify(afterObligationDocumentV1) + JSON.stringify(obligationBindingHistoryV1)) });
        for (const swarmQueueTaskInputV1 of swarmQueueDiscoveryV1.tasks)
            for (const id of swarmQueueTaskInputV1.obligationIds) {
                const obligation = afterObligationDocumentV1.obligations.find(obligation => obligation.id === id);
                requireQueue(obligation !== undefined, 'missing discovered obligation');
                requireQueue(obligation.requirementIds.length > 0 && obligation.acceptanceGroups.length > 0, 'discovered work requires requirements and acceptance references');
                for (const requirementId of obligation.requirementIds) {
                    const requirementObligationRequirement = afterObligationDocumentV1.baselines.find(valueObligationBaseline => valueObligationBaseline.id === projectionObligationScopeProjection.projection.baselineId)?.requirements.find(valueObligationRequirement => valueObligationRequirement.id === requirementId);
                    requireQueue(requirementObligationRequirement !== undefined, 'requirement is absent from canonical baseline');
                    const content = proposed.get(requirementObligationRequirement.path) ?? readFile(swarmQueueStateV1.ownerRoot, requirementObligationRequirement.path);
                    requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path === requirementObligationRequirement.path), 'discovery must reconcile the actual canonical requirement source');
                    requireQueue(digest(content) === requirementObligationRequirement.digest, 'requirement digest differs from proposed canonical source');
                    requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.uat + '/') && updateSwarmQueueDocumentUpdateV1.content.includes(requirementId)), 'discovery UAT must reference every affected requirement');
                }
            }
        const traceabilityPath = '.agents/config/project/traceability.json';
        if (node_fs_1.default.existsSync(node_path_1.default.join(swarmQueueStateV1.ownerRoot, traceabilityPath)) || proposed.has(traceabilityPath)) {
            const traceability = parseSwarmQueueJson(proposed.get(traceabilityPath) ?? readFile(swarmQueueStateV1.ownerRoot, traceabilityPath));
            requireQueue(isRecord(traceability) && Array.isArray(traceability.requirements) && Array.isArray(traceability.artifacts), 'invalid configured traceability inventory');
            for (const swarmQueueTaskInputV1 of swarmQueueDiscoveryV1.tasks)
                for (const id of swarmQueueTaskInputV1.obligationIds) {
                    const obligation = afterObligationDocumentV1.obligations.find(value => value.id === id);
                    requireQueue(obligation?.requirementIds.every(requirementId => Array.isArray(traceability.requirements) && traceability.requirements.some((value) => isRecord(value) && value.id === requirementId)), 'affected requirement missing from traceability configuration');
                }
        }
    }
    publishDiscovery(swarmQueueStateV1, swarmQueueDiscoveryV1) {
        for (const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates) {
            const target = safeFile(swarmQueueStateV1.ownerRoot, updateSwarmQueueDocumentUpdateV1.path);
            const current = node_fs_1.default.existsSync(target) ? node_fs_1.default.readFileSync(target, 'utf8') : null;
            requireQueue(current === updateSwarmQueueDocumentUpdateV1.beforeContent || current === updateSwarmQueueDocumentUpdateV1.content, `discovery recovery conflict: ${updateSwarmQueueDocumentUpdateV1.path}; preserve external changes`);
        }
        for (const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates) {
            const target = safeFile(swarmQueueStateV1.ownerRoot, updateSwarmQueueDocumentUpdateV1.path);
            if (node_fs_1.default.existsSync(target) && digest(node_fs_1.default.readFileSync(target, 'utf8')) === digest(updateSwarmQueueDocumentUpdateV1.content))
                continue;
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(target), { recursive: true });
            const temporary = node_path_1.default.join(node_path_1.default.dirname(target), `.ponytail-${node_crypto_1.default.randomUUID()}`);
            try {
                const fd = node_fs_1.default.openSync(temporary, 'wx', node_fs_1.default.existsSync(target) ? node_fs_1.default.statSync(target).mode & 0o777 : 0o644);
                try {
                    node_fs_1.default.writeFileSync(fd, updateSwarmQueueDocumentUpdateV1.content, 'utf8');
                    node_fs_1.default.fsyncSync(fd);
                }
                finally {
                    node_fs_1.default.closeSync(fd);
                }
                node_fs_1.default.renameSync(temporary, target);
                const directory = node_fs_1.default.openSync(node_path_1.default.dirname(target), 'r');
                try {
                    node_fs_1.default.fsyncSync(directory);
                }
                finally {
                    node_fs_1.default.closeSync(directory);
                }
            }
            finally {
                if (node_fs_1.default.existsSync(temporary))
                    node_fs_1.default.unlinkSync(temporary);
            }
        }
    }
    async execute(inputSwarmQueueCommandV1, invokingRoot) {
        const swarmQueueCommandV1 = readSwarmQueueCommandV1(inputSwarmQueueCommandV1);
        const poolClient = await this.pool.connect();
        let transaction = false;
        try {
            await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))', [this.projectId]);
            await poolClient.query('BEGIN');
            transaction = true;
            const swarmQueueActorContext = await this.validateActor(poolClient, swarmQueueCommandV1.actor, invokingRoot, swarmQueueCommandV1.campaignId);
            let swarmQueueStateV1;
            const row = (await poolClient.query('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 FOR UPDATE', [this.projectId, this.ownerRoot, swarmQueueCommandV1.campaignId])).rows[0];
            if (row === undefined) {
                requireQueue(swarmQueueCommandV1.command === 'init', 'queue campaign is absent');
                this.coordinator(swarmQueueCommandV1);
                await this.noLegacyAssignments(poolClient);
                requireQueue(swarmQueueCommandV1.authority.length > 0, 'explicit campaign authority references required');
                swarmQueueStateV1 = { schemaVersion: 1, campaignId: swarmQueueCommandV1.campaignId, ownerRoot: this.ownerRoot, documentPath: swarmQueueCommandV1.documentPath, bindingsPath: swarmQueueCommandV1.bindingsPath, authority: swarmQueueCommandV1.authority, assessor: swarmQueueCommandV1.assessor, recordRoots: swarmQueueCommandV1.recordRoots, state: 'open', sequence: 0, tasks: [], requests: [], pending: null, discoveries: [] };
                const currentSwarmQueueCanonical = canonical(swarmQueueStateV1);
                const first = currentSwarmQueueCanonical.scope.bindings.keys().next().value;
                if (first !== undefined)
                    (0, obligation_binding_history_js_1.freezeObligationLease)(currentSwarmQueueCanonical.document, currentSwarmQueueCanonical.history, { obligationId: first, generation: node_crypto_1.default.randomUUID(), graphDigest: currentSwarmQueueCanonical.digest, assessor: swarmQueueStateV1.assessor, authority: swarmQueueStateV1.authority });
                await poolClient.query('INSERT INTO ponytail_index.swarm_queue_v1(project_id,owner_root,campaign_id,state_text,closed) VALUES($1,$2,$3,$4,false)', [this.projectId, this.ownerRoot, swarmQueueStateV1.campaignId, JSON.stringify(swarmQueueStateV1)]);
            }
            else {
                requireQueue(typeof row.state_text === 'string', 'invalid stored state');
                swarmQueueStateV1 = readSwarmQueueStateV1(parseSwarmQueueJson(row.state_text));
            }
            requireQueue(swarmQueueStateV1.ownerRoot === this.ownerRoot && swarmQueueStateV1.campaignId === swarmQueueCommandV1.campaignId, 'stored owner/campaign differs');
            requireQueue(swarmQueueStateV1.pending === null || swarmQueueCommandV1.command === 'recover' || swarmQueueCommandV1.command === 'abort-discovery' || swarmQueueCommandV1.command === 'discover' || swarmQueueCommandV1.command === 'status', 'finish pending discovery through recover before mutating queue');
            let resultTaskSwarmQueueTaskV1 = null;
            let resultRequestSwarmQueueRequestV1 = null;
            if (swarmQueueCommandV1.command !== 'status')
                requireQueue(swarmQueueStateV1.state === 'open' || swarmQueueCommandV1.command === 'complete', 'campaign is complete');
            switch (swarmQueueCommandV1.command) {
                case 'init':
                    this.coordinator(swarmQueueCommandV1);
                    requireQueue(swarmQueueStateV1.documentPath === swarmQueueCommandV1.documentPath && swarmQueueStateV1.bindingsPath === swarmQueueCommandV1.bindingsPath && (0, node_util_1.isDeepStrictEqual)(swarmQueueStateV1.authority, swarmQueueCommandV1.authority) && swarmQueueStateV1.assessor === swarmQueueCommandV1.assessor && (0, node_util_1.isDeepStrictEqual)(swarmQueueStateV1.recordRoots, swarmQueueCommandV1.recordRoots), 'campaign already initialized differently');
                    break;
                case 'status':
                case 'requests': break;
                case 'add':
                    swarmQueueStateV1 = this.add(swarmQueueStateV1, swarmQueueCommandV1.tasks);
                    break;
                case 'claim': {
                    requireQueue(swarmQueueCommandV1.actor.kind === 'worker' && swarmQueueActorContext.workerGeneration !== null, 'claim requires original bound worker');
                    (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(swarmQueueActorContext.rootPath);
                    await this.noLegacyAssignments(poolClient);
                    const existingSwarmQueueTaskV1 = swarmQueueStateV1.tasks.find(swarmQueueTaskV1 => swarmQueueTaskV1.state === 'working' && swarmQueueTaskV1.claim?.sessionId === swarmQueueCommandV1.actor.sessionId);
                    if (existingSwarmQueueTaskV1 !== undefined) {
                        requireQueue(existingSwarmQueueTaskV1.claim?.workerGeneration === swarmQueueActorContext.workerGeneration, 'worker generation changed');
                        resultTaskSwarmQueueTaskV1 = existingSwarmQueueTaskV1;
                        break;
                    }
                    const swarmQueueCanonical = canonical(swarmQueueStateV1);
                    swarmQueueStateV1 = reconcileUnclaimed(swarmQueueStateV1, swarmQueueCanonical);
                    const selectedSwarmQueueTaskV1 = selectSwarmQueueTask(swarmQueueStateV1, swarmQueueCommandV1.actor.sessionId, swarmQueueCanonical);
                    if (selectedSwarmQueueTaskV1 === null)
                        break;
                    const generation = node_crypto_1.default.randomUUID();
                    const leases = selectedSwarmQueueTaskV1.obligationIds.map(obligationId => (0, obligation_binding_history_js_1.freezeObligationLease)(swarmQueueCanonical.document, swarmQueueCanonical.history, { obligationId, generation, graphDigest: swarmQueueCanonical.digest, assessor: swarmQueueStateV1.assessor, authority: swarmQueueStateV1.authority }));
                    const swarmQueueClaimV1 = { generation, sessionId: swarmQueueCommandV1.actor.sessionId, workerGeneration: swarmQueueActorContext.workerGeneration, rootPath: swarmQueueActorContext.rootPath, base: (0, rolling_integration_js_1.git)(swarmQueueActorContext.rootPath, ['rev-parse', 'HEAD']).trim(), leases };
                    resultTaskSwarmQueueTaskV1 = { ...selectedSwarmQueueTaskV1, claimSequence: swarmQueueStateV1.sequence + 1, state: 'working', claim: swarmQueueClaimV1, claimHistory: selectedSwarmQueueTaskV1.claim === null ? selectedSwarmQueueTaskV1.claimHistory : [...selectedSwarmQueueTaskV1.claimHistory, selectedSwarmQueueTaskV1.claim], candidate: null, review: null };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, sequence: swarmQueueStateV1.sequence + 1, tasks: swarmQueueStateV1.tasks.map(swarmQueueTaskV1 => swarmQueueTaskV1.id === selectedSwarmQueueTaskV1.id ? resultTaskSwarmQueueTaskV1 ?? swarmQueueTaskV1 : swarmQueueTaskV1) };
                    break;
                }
                case 'refresh-base': {
                    requireQueue(swarmQueueCommandV1.actor.kind === 'worker', 'refresh requires original worker');
                    const swarmQueueTaskV1 = swarmQueueStateV1.tasks.find(swarmQueueTaskV1 => swarmQueueTaskV1.id === swarmQueueCommandV1.taskId);
                    requireQueue(swarmQueueTaskV1 !== undefined && swarmQueueTaskV1.state === 'working' && swarmQueueTaskV1.claim !== null && swarmQueueTaskV1.claim.sessionId === swarmQueueCommandV1.actor.sessionId && swarmQueueTaskV1.claim.workerGeneration === swarmQueueActorContext.workerGeneration && swarmQueueTaskV1.claim.generation === swarmQueueCommandV1.generation, 'stale or foreign working claim');
                    (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(swarmQueueActorContext.rootPath);
                    requireQueue(swarmQueueCommandV1.base === (0, rolling_integration_js_1.git)(this.ownerRoot, ['rev-parse', 'HEAD']).trim() && (0, rolling_integration_js_1.gitResult)(this.ownerRoot, ['merge-base', '--is-ancestor', swarmQueueTaskV1.claim.base, swarmQueueCommandV1.base]).status === 0, 'refresh base must be current descendant owner HEAD');
                    const currentSwarmQueueCanonical = canonical(swarmQueueStateV1);
                    requireQueue(swarmQueueTaskV1.claim.leases.every(leaseObligationLeaseV1 => (0, node_util_1.isDeepStrictEqual)(leaseObligationLeaseV1.binding, currentSwarmQueueCanonical.scope.bindings.get(leaseObligationLeaseV1.binding.obligationId))), 'binding changed; hand off and renew through canonical graph');
                    if (swarmQueueCommandV1.base === swarmQueueTaskV1.claim.base) {
                        resultTaskSwarmQueueTaskV1 = swarmQueueTaskV1;
                        break;
                    }
                    const generation = node_crypto_1.default.randomUUID();
                    const preservedSwarmQueueCheckpointV1 = this.preserveSource(swarmQueueActorContext.rootPath, swarmQueueStateV1, swarmQueueTaskV1);
                    resultTaskSwarmQueueTaskV1 = { ...swarmQueueTaskV1, claimHistory: [...swarmQueueTaskV1.claimHistory, swarmQueueTaskV1.claim], claim: { ...swarmQueueTaskV1.claim, generation, base: swarmQueueCommandV1.base, leases: swarmQueueTaskV1.claim.leases.map(leaseObligationLeaseV1 => ({ ...leaseObligationLeaseV1, generation })) }, checkpoint: preservedSwarmQueueCheckpointV1, candidate: null, review: null };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, tasks: swarmQueueStateV1.tasks.map(valueSwarmQueueTaskV1 => valueSwarmQueueTaskV1.id === swarmQueueTaskV1.id ? resultTaskSwarmQueueTaskV1 ?? valueSwarmQueueTaskV1 : valueSwarmQueueTaskV1) };
                    break;
                }
                case 'handoff': {
                    requireQueue(swarmQueueCommandV1.actor.kind === 'worker', 'handoff requires original worker');
                    const swarmQueueTaskV1 = swarmQueueStateV1.tasks.find(swarmQueueTaskV1 => swarmQueueTaskV1.id === swarmQueueCommandV1.taskId);
                    requireQueue(swarmQueueTaskV1 !== undefined && swarmQueueTaskV1.claim !== null && swarmQueueTaskV1.claim.sessionId === swarmQueueCommandV1.actor.sessionId && swarmQueueTaskV1.claim.workerGeneration === swarmQueueActorContext.workerGeneration && swarmQueueTaskV1.claim.generation === swarmQueueCommandV1.generation, 'stale or foreign task claim');
                    const existingSwarmQueueRequestV1 = swarmQueueStateV1.requests.find(requestSwarmQueueRequestV1 => requestSwarmQueueRequestV1.id === swarmQueueCommandV1.requestId);
                    if (existingSwarmQueueRequestV1 !== undefined) {
                        requireQueue(existingSwarmQueueRequestV1.taskId === swarmQueueTaskV1.id && existingSwarmQueueRequestV1.claimGeneration === swarmQueueCommandV1.generation && existingSwarmQueueRequestV1.kind === swarmQueueCommandV1.kind && existingSwarmQueueRequestV1.detail === swarmQueueCommandV1.detail && (0, node_util_1.isDeepStrictEqual)(existingSwarmQueueRequestV1.evidencePaths, swarmQueueCommandV1.evidencePaths) && (0, node_util_1.isDeepStrictEqual)(swarmQueueTaskV1.candidate, swarmQueueCommandV1.candidate), 'request ID already differs');
                        resultTaskSwarmQueueTaskV1 = swarmQueueTaskV1;
                        resultRequestSwarmQueueRequestV1 = existingSwarmQueueRequestV1;
                        break;
                    }
                    requireQueue(swarmQueueTaskV1.state === 'working', 'task is not working');
                    (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(swarmQueueActorContext.rootPath);
                    swarmQueueCommandV1.evidencePaths.forEach(relative => readFile(swarmQueueActorContext.rootPath, relative));
                    if (swarmQueueCommandV1.kind === 'integration') {
                        requireQueue(swarmQueueCommandV1.candidate === null || swarmQueueCommandV1.candidate.proofPaths.length > 0 || inspectionTask(swarmQueueTaskV1) && swarmQueueCommandV1.evidencePaths.length > 0, 'inspection delivery requires a retained assessment artifact');
                        requireQueue(swarmQueueCommandV1.candidate !== null, 'integration requires exact reviewed candidate');
                        this.preserveCandidate(swarmQueueActorContext.rootPath, swarmQueueStateV1, swarmQueueTaskV1, swarmQueueCommandV1.candidate);
                    }
                    else
                        requireQueue(swarmQueueCommandV1.candidate === null, 'help must preserve unfinished work, not claim reviewed completion');
                    const capturedPaths = [...new Set([...swarmQueueCommandV1.evidencePaths, ...(swarmQueueCommandV1.candidate === null ? [] : [swarmQueueCommandV1.candidate.verdictPath, ...swarmQueueCommandV1.candidate.proofPaths, ...swarmQueueCommandV1.candidate.proofPaths.map(relative => (0, obligations_js_1.readObligationEvidence)(parseSwarmQueueJson(readFile(swarmQueueActorContext.rootPath, relative))).outputPath)])])];
                    const captured = capturedPaths.map(relative => ({ path: relative, contentBase64: node_fs_1.default.readFileSync(safeFile(swarmQueueActorContext.rootPath, relative)).toString('base64') }));
                    const preservedSwarmQueueCheckpointV1 = this.preserveSource(swarmQueueActorContext.rootPath, swarmQueueStateV1, swarmQueueTaskV1);
                    const sequence = swarmQueueStateV1.sequence + 1;
                    resultRequestSwarmQueueRequestV1 = { id: swarmQueueCommandV1.requestId, sequence, taskId: swarmQueueTaskV1.id, claimGeneration: swarmQueueCommandV1.generation, kind: swarmQueueCommandV1.kind, detail: swarmQueueCommandV1.detail, evidencePaths: swarmQueueCommandV1.evidencePaths, artifacts: captured, outcome: null, state: 'open', response: null };
                    resultTaskSwarmQueueTaskV1 = { ...swarmQueueTaskV1, state: swarmQueueCommandV1.kind, candidate: swarmQueueCommandV1.candidate, checkpoint: preservedSwarmQueueCheckpointV1, review: null };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, sequence, tasks: swarmQueueStateV1.tasks.map(valueSwarmQueueTaskV1 => valueSwarmQueueTaskV1.id === swarmQueueTaskV1.id ? resultTaskSwarmQueueTaskV1 ?? valueSwarmQueueTaskV1 : valueSwarmQueueTaskV1), requests: [...swarmQueueStateV1.requests, resultRequestSwarmQueueRequestV1] };
                    break;
                }
                case 'record-review': {
                    this.coordinator(swarmQueueCommandV1);
                    const swarmQueueTaskV1 = swarmQueueStateV1.tasks.find(swarmQueueTaskV1 => swarmQueueTaskV1.id === swarmQueueCommandV1.taskId);
                    requireQueue(swarmQueueTaskV1 !== undefined && swarmQueueTaskV1.state === 'integration' && swarmQueueTaskV1.claim?.generation === swarmQueueCommandV1.generation && swarmQueueTaskV1.candidate !== null && swarmQueueTaskV1.candidate.reviewer === swarmQueueCommandV1.reviewer, 'review differs from exact submitted candidate');
                    const content = readFile(this.ownerRoot, swarmQueueCommandV1.hostEvidencePath);
                    const trustedSwarmQueueReviewV1 = { reviewer: swarmQueueCommandV1.reviewer, base: swarmQueueTaskV1.candidate.base, revision: swarmQueueTaskV1.candidate.revision, hostEvidencePath: swarmQueueCommandV1.hostEvidencePath, contentBase64: Buffer.from(content).toString('base64') };
                    requireQueue(swarmQueueTaskV1.review === null || (0, node_util_1.isDeepStrictEqual)(swarmQueueTaskV1.review, trustedSwarmQueueReviewV1), 'review already differs');
                    resultTaskSwarmQueueTaskV1 = { ...swarmQueueTaskV1, review: trustedSwarmQueueReviewV1 };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, tasks: swarmQueueStateV1.tasks.map(valueSwarmQueueTaskV1 => valueSwarmQueueTaskV1.id === swarmQueueTaskV1.id ? resultTaskSwarmQueueTaskV1 ?? valueSwarmQueueTaskV1 : valueSwarmQueueTaskV1) };
                    break;
                }
                case 'take': {
                    this.coordinator(swarmQueueCommandV1);
                    const requestSwarmQueueRequestV1 = swarmQueueStateV1.requests.filter(requestSwarmQueueRequestV1 => requestSwarmQueueRequestV1.state === 'open').sort((leftSwarmQueueRequestV1, rightSwarmQueueRequestV1) => leftSwarmQueueRequestV1.sequence - rightSwarmQueueRequestV1.sequence)[0];
                    if (requestSwarmQueueRequestV1 === undefined)
                        break;
                    resultRequestSwarmQueueRequestV1 = { ...requestSwarmQueueRequestV1, state: 'processing' };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, requests: swarmQueueStateV1.requests.map(valueSwarmQueueRequestV1 => valueSwarmQueueRequestV1.id === requestSwarmQueueRequestV1.id ? resultRequestSwarmQueueRequestV1 ?? valueSwarmQueueRequestV1 : valueSwarmQueueRequestV1) };
                    break;
                }
                case 'resolve': {
                    this.coordinator(swarmQueueCommandV1);
                    const requestSwarmQueueRequestV1 = swarmQueueStateV1.requests.find(requestSwarmQueueRequestV1 => requestSwarmQueueRequestV1.id === swarmQueueCommandV1.requestId);
                    requireQueue(requestSwarmQueueRequestV1 !== undefined, 'request absent');
                    if (requestSwarmQueueRequestV1.state === 'resolved') {
                        requireQueue(requestSwarmQueueRequestV1.response === swarmQueueCommandV1.response && requestSwarmQueueRequestV1.outcome === swarmQueueCommandV1.outcome, 'request already resolved differently');
                        resultRequestSwarmQueueRequestV1 = requestSwarmQueueRequestV1;
                        break;
                    }
                    requireQueue(requestSwarmQueueRequestV1.state === 'processing', 'take request in arrival order before resolution');
                    const swarmQueueTaskV1 = swarmQueueStateV1.tasks.find(swarmQueueTaskV1 => swarmQueueTaskV1.id === requestSwarmQueueRequestV1.taskId);
                    requireQueue(swarmQueueTaskV1 !== undefined && swarmQueueTaskV1.claim?.generation === requestSwarmQueueRequestV1.claimGeneration, 'request claim changed');
                    let nextTaskSwarmQueueTaskV1 = swarmQueueTaskV1;
                    if (swarmQueueCommandV1.outcome === 'accepted') {
                        requireQueue(requestSwarmQueueRequestV1.kind === 'integration' && swarmQueueTaskV1.candidate !== null && swarmQueueTaskV1.review !== null && swarmQueueTaskV1.review.base === swarmQueueTaskV1.candidate.base && swarmQueueTaskV1.review.revision === swarmQueueTaskV1.candidate.revision && swarmQueueTaskV1.review.reviewer === swarmQueueTaskV1.candidate.reviewer, 'acceptance requires exact host-collected independent review');
                        const swarmQueueCanonical = canonical(swarmQueueStateV1);
                        requireQueue(swarmQueueTaskV1.obligationIds.every(id => swarmQueueCanonical.scope.projection.satisfiedIds.includes(id)), 'canonical obligations not discharged');
                        requireQueue(swarmQueueTaskV1.obligationIds.every(id => swarmQueueCanonical.document.certificates.some(certificateObligationCertificate => swarmQueueCanonical.scope.projection.assessments.some(assessmentObligationAssessment => assessmentObligationAssessment.id === certificateObligationCertificate.id && assessmentObligationAssessment.valid) && certificateObligationCertificate.obligationIds.includes(id) && (certificateObligationCertificate.evidence.length > 0 ? certificateObligationCertificate.evidence.every(evidenceObligationEvidence => evidenceObligationEvidence.revision === swarmQueueTaskV1.candidate?.revision) : inspectionTask(swarmQueueTaskV1) && (0, obligations_js_1.isObligationGitInputs)(certificateObligationCertificate.inputs) && certificateObligationCertificate.inputs.revision === swarmQueueTaskV1.candidate?.revision && certificateObligationCertificate.artifacts.some(artifact => requestSwarmQueueRequestV1.artifacts.some(capturedSwarmQueueArtifactV1 => requestSwarmQueueRequestV1.evidencePaths.includes(capturedSwarmQueueArtifactV1.path) && digest(readFile(this.ownerRoot, artifact)) === digest(Buffer.from(capturedSwarmQueueArtifactV1.contentBase64, 'base64').toString('utf8'))))))), 'canonical acceptance is not bound to submitted candidate');
                        requireQueue(inspectionTask(swarmQueueTaskV1) || (0, rolling_integration_js_1.gitResult)(this.ownerRoot, ['merge-base', '--is-ancestor', swarmQueueTaskV1.candidate.revision, 'HEAD']).status === 0, 'candidate not integrated in owner');
                        nextTaskSwarmQueueTaskV1 = { ...swarmQueueTaskV1, state: 'done' };
                    }
                    else if (swarmQueueCommandV1.outcome === 'retry' || swarmQueueCommandV1.outcome === 'answered') {
                        nextTaskSwarmQueueTaskV1 = { ...swarmQueueTaskV1, state: 'ready', preferredWorker: swarmQueueTaskV1.claim?.sessionId ?? swarmQueueTaskV1.preferredWorker };
                    }
                    resultRequestSwarmQueueRequestV1 = { ...requestSwarmQueueRequestV1, state: 'resolved', response: swarmQueueCommandV1.response, outcome: swarmQueueCommandV1.outcome };
                    swarmQueueStateV1 = { ...swarmQueueStateV1, tasks: swarmQueueStateV1.tasks.map(valueSwarmQueueTaskV1 => valueSwarmQueueTaskV1.id === swarmQueueTaskV1.id ? nextTaskSwarmQueueTaskV1 : valueSwarmQueueTaskV1), requests: swarmQueueStateV1.requests.map(valueSwarmQueueRequestV1 => valueSwarmQueueRequestV1.id === requestSwarmQueueRequestV1.id ? resultRequestSwarmQueueRequestV1 ?? valueSwarmQueueRequestV1 : valueSwarmQueueRequestV1) };
                    break;
                }
                case 'discover':
                case 'recover': {
                    const discoveredSwarmQueueDiscoveryV1 = swarmQueueCommandV1.command === 'discover' ? swarmQueueCommandV1.discovery : swarmQueueStateV1.pending;
                    const existingSwarmQueueDiscoveryV1 = swarmQueueCommandV1.command === 'discover' ? swarmQueueStateV1.discoveries.find(valueSwarmQueueDiscoveryV1 => valueSwarmQueueDiscoveryV1.id === swarmQueueCommandV1.discovery.id) : swarmQueueStateV1.discoveries.find(valueSwarmQueueDiscoveryV1 => valueSwarmQueueDiscoveryV1.id === swarmQueueCommandV1.discoveryId);
                    if (existingSwarmQueueDiscoveryV1 !== undefined) {
                        if (swarmQueueCommandV1.command === 'discover')
                            requireQueue((0, node_util_1.isDeepStrictEqual)(existingSwarmQueueDiscoveryV1, swarmQueueCommandV1.discovery), 'discovery ID differs');
                        break;
                    }
                    requireQueue(discoveredSwarmQueueDiscoveryV1 !== null, 'pending discovery absent');
                    if (swarmQueueCommandV1.command === 'discover')
                        requireQueue((0, node_util_1.isDeepStrictEqual)(discoveredSwarmQueueDiscoveryV1.actor, swarmQueueCommandV1.actor), 'discovery actor differs');
                    else
                        requireQueue(discoveredSwarmQueueDiscoveryV1.id === swarmQueueCommandV1.discoveryId, 'pending discovery ID differs');
                    if (swarmQueueStateV1.pending === null) {
                        this.validateDiscovery(swarmQueueStateV1, discoveredSwarmQueueDiscoveryV1);
                        swarmQueueStateV1 = { ...swarmQueueStateV1, pending: discoveredSwarmQueueDiscoveryV1 };
                        await this.save(poolClient, swarmQueueStateV1);
                        await poolClient.query('COMMIT');
                        transaction = false;
                    }
                    else
                        requireQueue((0, node_util_1.isDeepStrictEqual)(swarmQueueStateV1.pending, discoveredSwarmQueueDiscoveryV1), 'another discovery is pending');
                    this.publishDiscovery(swarmQueueStateV1, discoveredSwarmQueueDiscoveryV1);
                    const documentUpdateSwarmQueueDocumentUpdateV1 = discoveredSwarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1 => updateSwarmQueueDocumentUpdateV1.path === swarmQueueStateV1.documentPath);
                    if (documentUpdateSwarmQueueDocumentUpdateV1 !== undefined) {
                        requireQueue(documentUpdateSwarmQueueDocumentUpdateV1.beforeContent !== null, 'canonical obligation document must exist');
                        (0, obligations_js_1.acceptCheckpoint)((0, obligations_js_1.parseObligationDocument)(documentUpdateSwarmQueueDocumentUpdateV1.beforeContent), (0, obligations_js_1.parseObligationDocument)(documentUpdateSwarmQueueDocumentUpdateV1.content), swarmQueueStateV1.ownerRoot);
                    }
                    if (!transaction) {
                        await poolClient.query('BEGIN');
                        transaction = true;
                    }
                    swarmQueueStateV1 = this.add({ ...swarmQueueStateV1, pending: null, discoveries: [...swarmQueueStateV1.discoveries, discoveredSwarmQueueDiscoveryV1] }, discoveredSwarmQueueDiscoveryV1.tasks);
                    break;
                }
                case 'abort-discovery': {
                    requireQueue(swarmQueueStateV1.pending !== null && swarmQueueStateV1.pending.id === swarmQueueCommandV1.discoveryId, 'pending discovery differs');
                    for (const updateSwarmQueueDocumentUpdateV1 of swarmQueueStateV1.pending.updates) {
                        const target = safeFile(swarmQueueStateV1.ownerRoot, updateSwarmQueueDocumentUpdateV1.path);
                        const current = node_fs_1.default.existsSync(target) ? node_fs_1.default.readFileSync(target, 'utf8') : null;
                        requireQueue(current === updateSwarmQueueDocumentUpdateV1.beforeContent || current === updateSwarmQueueDocumentUpdateV1.content, `recovery conflict: ${updateSwarmQueueDocumentUpdateV1.path}`);
                    }
                    for (const updateSwarmQueueDocumentUpdateV1 of [...swarmQueueStateV1.pending.updates].reverse()) {
                        if (updateSwarmQueueDocumentUpdateV1.beforeContent === null) {
                            const target = safeFile(swarmQueueStateV1.ownerRoot, updateSwarmQueueDocumentUpdateV1.path);
                            if (node_fs_1.default.existsSync(target))
                                node_fs_1.default.unlinkSync(target);
                        }
                        else
                            this.publishDiscovery(swarmQueueStateV1, { ...swarmQueueStateV1.pending, updates: [{ path: updateSwarmQueueDocumentUpdateV1.path, beforeContent: updateSwarmQueueDocumentUpdateV1.content, content: updateSwarmQueueDocumentUpdateV1.beforeContent }] });
                    }
                    swarmQueueStateV1 = { ...swarmQueueStateV1, pending: null };
                    break;
                }
                case 'complete':
                    this.coordinator(swarmQueueCommandV1);
                    swarmQueueStateV1 = reconcileUnclaimed(swarmQueueStateV1, canonical(swarmQueueStateV1));
                    requireQueue(swarmQueueStateV1.pending === null && swarmQueueStateV1.tasks.every(swarmQueueTaskV1 => swarmQueueTaskV1.state === 'done') && swarmQueueStateV1.requests.every(requestSwarmQueueRequestV1 => requestSwarmQueueRequestV1.state === 'resolved') && canonical(swarmQueueStateV1).scope.projection.complete, 'campaign still has outstanding discoveries/tasks/requests/obligations');
                    swarmQueueStateV1 = { ...swarmQueueStateV1, state: 'complete' };
                    break;
            }
            if (swarmQueueCommandV1.command !== 'status' && swarmQueueCommandV1.command !== 'requests')
                await this.save(poolClient, swarmQueueStateV1);
            await poolClient.query('COMMIT');
            transaction = false;
            return { schemaVersion: 1, queue: swarmQueueStateV1, task: resultTaskSwarmQueueTaskV1, request: resultRequestSwarmQueueRequestV1 };
        }
        catch (cause) {
            if (transaction)
                await poolClient.query('ROLLBACK');
            throw cause;
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
    preserveSource(root, swarmQueueStateV1, swarmQueueTaskV1) {
        const revision = (0, rolling_integration_js_1.git)(root, ['rev-parse', 'HEAD']).trim();
        const ref = `refs/ponytail/swarm-queue-source/${digest(swarmQueueStateV1.campaignId)}/${digest(swarmQueueTaskV1.id)}/${swarmQueueTaskV1.claim?.generation}`;
        (0, rolling_integration_js_1.git)(root, ['update-ref', ref, revision]);
        const untracked = (0, rolling_integration_js_1.git)(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).map(relative => ({ path: relative, contentBase64: node_fs_1.default.readFileSync(safeFile(root, relative)).toString('base64') }));
        return { revision, ref, indexPatchBase64: Buffer.from((0, rolling_integration_js_1.git)(root, ['diff', '--cached', '--binary', '--full-index'])).toString('base64'), worktreePatchBase64: Buffer.from((0, rolling_integration_js_1.git)(root, ['diff', '--binary', '--full-index'])).toString('base64'), untracked };
    }
    preserveCandidate(root, swarmQueueStateV1, swarmQueueTaskV1, swarmQueueCandidateV1) {
        requireQueue(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(swarmQueueCandidateV1.base) && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(swarmQueueCandidateV1.revision), 'candidate requires exact Git object IDs');
        requireQueue(swarmQueueCandidateV1.base === swarmQueueTaskV1.claim?.base, 'candidate must descend from its exact claim base');
        requireQueue((0, rolling_integration_js_1.git)(root, ['rev-parse', `${swarmQueueCandidateV1.revision}^{commit}`]).trim() === swarmQueueCandidateV1.revision && (0, rolling_integration_js_1.gitResult)(root, ['merge-base', '--is-ancestor', swarmQueueCandidateV1.base, swarmQueueCandidateV1.revision]).status === 0, 'candidate/base history differs');
        requireQueue(swarmQueueCandidateV1.reviewer !== swarmQueueTaskV1.claim?.sessionId && (swarmQueueCandidateV1.proofPaths.length > 0 || inspectionTask(swarmQueueTaskV1)), 'independent reviewer and proof required');
        const swarmQueueVerdictV1 = readSwarmQueueVerdictV1(parseSwarmQueueJson(readFile(root, swarmQueueCandidateV1.verdictPath)));
        requireQueue(swarmQueueVerdictV1.reviewer === swarmQueueCandidateV1.reviewer && swarmQueueVerdictV1.base === swarmQueueCandidateV1.base && swarmQueueVerdictV1.revision === swarmQueueCandidateV1.revision, 'review does not accept exact candidate');
        const proofs = swarmQueueCandidateV1.proofPaths.map(relative => (0, obligations_js_1.readObligationEvidence)(parseSwarmQueueJson(readFile(root, relative))));
        for (const proofObligationEvidence of proofs) {
            requireQueue(proofObligationEvidence.revision === swarmQueueCandidateV1.revision && proofObligationEvidence.outcome === 'pass' && proofObligationEvidence.finalization === 'pass' && !proofObligationEvidence.dirty && proofObligationEvidence.failures === 0 && proofObligationEvidence.skips === 0, 'proof is not finalized for exact candidate');
            requireQueue((0, obligations_js_1.isObligationGitInputs)(proofObligationEvidence.inputs) ? proofObligationEvidence.inputs.revision === swarmQueueCandidateV1.revision && (0, obligations_js_1.gitInputReasons)(root, proofObligationEvidence.inputs).length === 0 : proofObligationEvidence.inputs.every(valueObligationInput => (0, obligations_js_1.inputDigest)(root, valueObligationInput.path) === valueObligationInput.digest), 'stale candidate proof inputs');
            readFile(root, proofObligationEvidence.outputPath);
        }
        requireQueue(swarmQueueTaskV1.claim?.leases.every(leaseObligationLeaseV1 => leaseObligationLeaseV1.binding.execution.selection.every(selection => proofs.some(proofObligationEvidence => proofObligationEvidence.selection.includes(selection) && (leaseObligationLeaseV1.binding.execution.target === null || proofObligationEvidence.target.identity === leaseObligationLeaseV1.binding.execution.target.identity && proofObligationEvidence.target.profile === leaseObligationLeaseV1.binding.execution.target.profile)))), 'proof does not cover frozen selections/targets');
        if (inspectionTask(swarmQueueTaskV1))
            requireQueue(swarmQueueCandidateV1.base === swarmQueueCandidateV1.revision, 'inspection assessment cannot introduce source changes');
        const permitted = swarmQueueTaskV1.claim?.leases.filter(leaseObligationLeaseV1 => leaseObligationLeaseV1.binding.execution.operations.includes('edit')).flatMap(leaseObligationLeaseV1 => leaseObligationLeaseV1.binding.execution.plannedPaths) ?? [];
        const revisions = (0, rolling_integration_js_1.git)(root, ['rev-list', `${swarmQueueCandidateV1.base}..${swarmQueueCandidateV1.revision}`]).trim().split('\n').filter(Boolean);
        requireQueue((0, rolling_integration_js_1.git)(root, ['rev-list', '--merges', `${swarmQueueCandidateV1.base}..${swarmQueueCandidateV1.revision}`]).trim() === '', 'candidate requires a linear reviewed history');
        const changed = [...new Set(revisions.flatMap(revision => (0, rolling_integration_js_1.git)(root, ['diff-tree', '--no-commit-id', '--no-renames', '--name-only', '-r', '-z', revision, '--']).split('\0').filter(Boolean)))];
        requireQueue(changed.every(relative => permitted.some(scope => relative === scope || relative.startsWith(scope + '/'))), 'candidate includes paths outside its claim');
        const ref = `refs/ponytail/swarm-queue/${digest(swarmQueueStateV1.campaignId)}/${digest(swarmQueueTaskV1.id)}/${swarmQueueTaskV1.claim?.generation}`;
        (0, rolling_integration_js_1.git)(root, ['update-ref', ref, swarmQueueCandidateV1.revision]);
    }
}
exports.SwarmQueueStore = SwarmQueueStore;
async function requireSwarmQueueLifecycleQuiescence(poolClient, projectId, ownerRoot, sessionId) {
    const rows = (await poolClient.query('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND NOT closed', [projectId, ownerRoot])).rows;
    for (const row of rows) {
        requireQueue(typeof row.state_text === 'string', 'invalid queue state');
        const swarmQueueStateV1 = readSwarmQueueStateV1(parseSwarmQueueJson(row.state_text));
        requireQueue(sessionId !== null && swarmQueueStateV1.pending === null && !swarmQueueStateV1.tasks.some(swarmQueueTaskV1 => swarmQueueTaskV1.state !== 'done' && swarmQueueTaskV1.claim?.sessionId === sessionId), 'preserve and settle unfinished queue ownership before lifecycle removal');
    }
}
