// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-worker.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingWorkerStopReaders = exports.RollingWorkerCreationReaders = void 0;
exports.readRollingWorkerCreationV1 = readRollingWorkerCreationV1;
exports.parseRollingWorkerCreation = parseRollingWorkerCreation;
exports.identifyRollingWorkerCreation = identifyRollingWorkerCreation;
exports.initializeRollingWorker = initializeRollingWorker;
exports.observeRollingWorkerInitialization = observeRollingWorkerInitialization;
exports.provisionRollingWorker = provisionRollingWorker;
exports.attachRollingWorker = attachRollingWorker;
exports.buildRollingWorkerInstructions = buildRollingWorkerInstructions;
exports.dispatchRollingWorker = dispatchRollingWorker;
exports.readRollingWorkerStopV1 = readRollingWorkerStopV1;
exports.parseRollingWorkerStop = parseRollingWorkerStop;
exports.suspendRollingWorker = suspendRollingWorker;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const lossless_json_1 = require("lossless-json");
const node_child_process_1 = require("node:child_process");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
function requireWorker(condition, message) {
    if (!condition)
        throw new Error(`rolling worker: ${message}`);
}
function identity(value) {
    requireWorker(typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\0\r\n]/u.test(value), 'invalid creation identity');
    return value;
}
function readRollingWorkerCreationV1(value) {
    requireWorker(value !== null && typeof value === 'object' && !Array.isArray(value), 'creation must be a record');
    requireWorker('schemaVersion' in value && value.schemaVersion === 1 && 'threadId' in value && 'sessionId' in value && 'rootPath' in value, 'invalid creation version or fields');
    requireWorker(Object.keys(value).sort().join(',') === 'rootPath,schemaVersion,sessionId,threadId', 'unknown creation fields');
    const rootPath = identity(value.rootPath);
    requireWorker(node_path_1.default.isAbsolute(rootPath) && node_path_1.default.normalize(rootPath) === rootPath, 'creation checkout must be an absolute canonical path');
    return { schemaVersion: 1, threadId: identity(value.threadId), sessionId: identity(value.sessionId), rootPath };
}
function parseRollingWorkerCreation(text) {
    return readRollingWorkerCreationV1((0, lossless_json_1.parse)(text, null, token => {
        requireWorker(token === '1', 'invalid creation numeric token');
        return 1;
    }));
}
exports.RollingWorkerCreationReaders = { V1: readRollingWorkerCreationV1 };
function identifyRollingWorkerCreation(rollingNativeThread, rootPath) {
    requireWorker(rollingNativeThread.cwd === rootPath && node_fs_1.default.realpathSync(rootPath) === rootPath, 'native checkout differs from reservation');
    return readRollingWorkerCreationV1({ schemaVersion: 1, threadId: rollingNativeThread.thread.id, sessionId: rollingNativeThread.thread.sessionId, rootPath });
}
async function initializeRollingWorker(rollingCodex, rollingNativeThread, rollingWorkerCreationV1) {
    const checkedRollingWorkerCreationV1 = readRollingWorkerCreationV1(rollingWorkerCreationV1);
    requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, checkedRollingWorkerCreationV1.rootPath))
        === JSON.stringify(checkedRollingWorkerCreationV1), 'native identity differs from retained creation');
    (0, rolling_worktrees_js_1.requireRollingSessionMarkerAbsent)(checkedRollingWorkerCreationV1.rootPath);
    const rollingTurnStarted = await rollingCodex.startTurn(checkedRollingWorkerCreationV1.threadId, 'Initialize this Ponytail worker in its assigned checkout. Create only session_id.txt at the checkout root, containing the exact sessionId below followed by one newline. Use exclusive creation; preserve any existing file. Do not edit other files or start implementation. Finish the turn after writing the marker.\n'
        + `Worker attachment: ${JSON.stringify(checkedRollingWorkerCreationV1)}`);
    return { rollingWorkerCreationV1: checkedRollingWorkerCreationV1, rollingTurnStarted };
}
async function observeRollingWorkerInitialization(rollingCodex, rollingWorkerInitialization, timeoutMs = 60000) {
    const { rollingWorkerCreationV1, rollingTurnStarted } = rollingWorkerInitialization;
    const rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId, rollingTurnStarted.turn.id, timeoutMs);
    requireWorker(rollingNativeTurn.id === rollingTurnStarted.turn.id && rollingNativeTurn.status === 'completed', 'worker initialization did not complete');
    (0, rolling_worktrees_js_1.validateRollingSessionMarker)(rollingWorkerCreationV1.rootPath, rollingWorkerCreationV1.sessionId);
    return rollingWorkerCreationV1;
}
async function provisionRollingWorker(rollingCampaignStore, rollingCodex, campaignId, actionId, generation) {
    const rollingWorkerReservation = await rollingCampaignStore.claimWorkerCreation(campaignId, actionId, generation);
    (0, rolling_worktrees_js_1.provisionRollingWorktree)(rollingWorkerReservation.coordinatorRoot, { number: rollingWorkerReservation.number,
        rootPath: rollingWorkerReservation.rootPath, generation }, rollingWorkerReservation.baseCommit);
    const rollingNativeThread = await rollingCodex.startThread(rollingWorkerReservation.rootPath);
    const rollingWorkerCreationV1 = identifyRollingWorkerCreation(rollingNativeThread, rollingWorkerReservation.rootPath);
    await rollingCampaignStore.recordWorkerCreation(campaignId, actionId, generation, rollingWorkerCreationV1);
    return initializeRollingWorker(rollingCodex, rollingNativeThread, rollingWorkerCreationV1);
}
async function attachRollingWorker(rollingCampaignStore, rollingCodex, campaignId, actionId, generation, rollingWorkerInitialization, timeoutMs = 60000) {
    const rollingWorkerCreationV1 = await observeRollingWorkerInitialization(rollingCodex, rollingWorkerInitialization, timeoutMs);
    return rollingCampaignStore.completeWorkerCreation(campaignId, actionId, generation, rollingWorkerCreationV1);
}
function buildRollingWorkerInstructions(rollingWorkerContext) {
    const { obligation, requirements, binding, lease } = rollingWorkerContext;
    requireWorker(obligation.id === lease.binding.obligationId && binding.obligationId === obligation.id, 'worker instructions differ from frozen obligation');
    requireWorker(obligation.requirementIds.every(id => requirements.some(item => item.id === id))
        && requirements.every(item => obligation.requirementIds.includes(item.id)), 'worker instructions lack exact requirement references');
    return 'Execute the assigned atomic obligation in this existing checkout and original session. Read the applicable project rules and skills before work. '
        + 'The coordinator graph is authoritative; the frozen lease below owns current prerequisites, permitted paths, operations, proof selection and target. '
        + 'The obligation owns the canonical condition and discharge criterion. Its historical execution field does not override this frozen lease. '
        + 'Use the exact requirement references, acceptance arc and step references, implementation IDs, source paths, unit and integration selections below. '
        + 'Establish only this obligation within the lease. For a no-edit obligation, return fresh inspection and proof without inventing a code change or Git rebase. Run configured focused QA and the referenced focused arcs; publication QA belongs to the coordinator publication gate. '
        + 'Preserve static typing and project build-impact rules. Report newly discovered prerequisites to the coordinator; do not silently change the authoritative graph. '
        + 'If blocked, stop activity and report the blocker while retaining the checkout. Delivery is proposed discharge, not acceptance. '
        + 'When submitting code changes, fetch the configured campaign branch and perform a full semantic rebase commit by commit, refresh affected evidence, retain the exact candidate SHA and base, and stop activity. '
        + 'Return the candidate and evidence to the coordinator for adversarial review; never publish to mainline yourself.\n'
        + `Worker responsibility: ${JSON.stringify(rollingWorkerContext)}`;
}
async function dispatchRollingWorker(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation) {
    const rollingWorkerContext = await rollingCampaignStore.workerContext(campaignId, assignmentId, generation);
    const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
    const rollingWorkerDispatchStarted = await rollingCampaignStore.claimWorkerDispatch(campaignId, assignmentId, generation, instructions);
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerDispatchStarted.threadId, rollingWorkerContext.rollingWorkerCreationV1.rootPath);
    requireWorker(rollingNativeThread.thread.sessionId === rollingWorkerContext.rollingWorkerCreationV1.sessionId, 'resumed worker differs from attached session');
    const rollingTurnStarted = await rollingCodex.startTurn(rollingNativeThread.thread.id, instructions);
    return rollingCampaignStore.attachWorkerDispatch(campaignId, assignmentId, generation, rollingWorkerDispatchStarted.id, rollingTurnStarted.turn.id);
}
function isStopRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function stopFields(value, names) {
    requireWorker(isStopRecord(value), 'stop observation must be a record');
    requireWorker(Object.keys(value).sort().join(',') === [...names].sort().join(','), 'invalid stop observation fields');
    return value;
}
function stoppedTurn(value) {
    const record = stopFields(value, ['id', 'status']);
    const id = identity(record.id);
    switch (record.status) {
        case 'completed':
        case 'failed':
        case 'interrupted': return { id, status: record.status };
        default: throw new Error('rolling worker: observed turn is not stopped');
    }
}
function readRollingWorkerStopV1(value) {
    const record = stopFields(value, ['schemaVersion', 'campaignId', 'assignmentId', 'generation', 'threadId', 'sessionId', 'observedAt', 'nativeStatus', 'turn', 'checkpoint']);
    requireWorker(record.schemaVersion === 1 && record.nativeStatus === 'idle', 'stop requires supported version and observed native idle state');
    const observedAt = identity(record.observedAt);
    requireWorker(/^\d{4}-\d{2}-\d{2}T/u.test(observedAt) && Number.isFinite(Date.parse(observedAt)), 'invalid activity observation timestamp');
    const checkpoint = stopFields(record.checkpoint, ['revision', 'gitStatus']);
    requireWorker(typeof checkpoint.revision === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(checkpoint.revision)
        && typeof checkpoint.gitStatus === 'string' && !checkpoint.gitStatus.includes('\0'), 'invalid retained checkout checkpoint');
    return { schemaVersion: 1, campaignId: identity(record.campaignId), assignmentId: identity(record.assignmentId), generation: identity(record.generation),
        threadId: identity(record.threadId), sessionId: identity(record.sessionId), observedAt, nativeStatus: 'idle',
        turn: record.turn === null ? null : stoppedTurn(record.turn), checkpoint: { revision: checkpoint.revision, gitStatus: checkpoint.gitStatus } };
}
function parseRollingWorkerStop(text) {
    return readRollingWorkerStopV1((0, lossless_json_1.parse)(text, null, token => { requireWorker(token === '1', 'invalid stop numeric token'); return 1; }));
}
exports.RollingWorkerStopReaders = { V1: readRollingWorkerStopV1 };
async function suspendRollingWorker(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, blockers, timeoutMs = 60000) {
    const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId, assignmentId, generation);
    const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId, assignmentId, generation);
    if (rollingWorkerDispatch !== null && rollingWorkerDispatch.state !== 'ATTACHED')
        throw new Error('rolling worker: unknown worker dispatch must be reconciled before suspension');
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireWorker(rollingNativeThread.thread.sessionId === rollingWorkerCreationV1.sessionId, 'native worker differs from attached session');
    let turn = null;
    if (rollingWorkerDispatch) {
        requireWorker(rollingWorkerDispatch.threadId === rollingNativeThread.thread.id, 'dispatch differs from original worker');
        let rollingNativeTurn = await rollingCodex.readTurn(rollingNativeThread.thread.id, rollingWorkerDispatch.turnId);
        if (rollingNativeTurn.status === 'inProgress') {
            await rollingCodex.interruptTurn(rollingNativeThread.thread.id, rollingWorkerDispatch.turnId);
            rollingNativeTurn = await rollingCodex.waitForTurn(rollingNativeThread.thread.id, rollingWorkerDispatch.turnId, timeoutMs);
        }
        turn = stoppedTurn({ id: rollingNativeTurn.id, status: rollingNativeTurn.status });
    }
    const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingNativeThread.thread.id);
    requireWorker(rollingNativeThreadActivity.status === 'idle', 'native worker is not known idle; preserve its active slot');
    function git(argv) {
        const result = (0, node_child_process_1.spawnSync)('git', ['-C', rollingWorkerCreationV1.rootPath, ...argv], { encoding: 'utf8' });
        requireWorker(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || 'cannot checkpoint retained checkout');
        return result.stdout;
    }
    requireWorker(git(['rev-parse', '--show-toplevel']).trim() === rollingWorkerCreationV1.rootPath, 'retained checkout identity differs');
    const rollingWorkerStopV1 = readRollingWorkerStopV1({ schemaVersion: 1, campaignId, assignmentId, generation,
        threadId: rollingNativeThread.thread.id, sessionId: rollingNativeThread.thread.sessionId, observedAt: new Date().toISOString(), nativeStatus: 'idle', turn,
        checkpoint: { revision: git(['rev-parse', 'HEAD']).trim(), gitStatus: git(['status', '--porcelain=v1', '--untracked-files=all']) } });
    return rollingCampaignStore.suspendObservedWorker(campaignId, assignmentId, generation, rollingWorkerStopV1, blockers);
}
