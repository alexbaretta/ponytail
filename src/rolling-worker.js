// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-worker.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingWorkerRetirementReaders = exports.RollingWorkerResumptionReaders = exports.RollingWorkerStopReaders = exports.RollingWorkerCreationReaders = void 0;
exports.readRollingWorkerCreationV1 = readRollingWorkerCreationV1;
exports.parseRollingWorkerCreation = parseRollingWorkerCreation;
exports.identifyRollingWorkerCreation = identifyRollingWorkerCreation;
exports.initializeRollingWorker = initializeRollingWorker;
exports.observeRollingWorkerInitialization = observeRollingWorkerInitialization;
exports.provisionRollingWorker = provisionRollingWorker;
exports.attachRollingWorker = attachRollingWorker;
exports.recoverRollingWorkerCreation = recoverRollingWorkerCreation;
exports.buildRollingWorkerInstructions = buildRollingWorkerInstructions;
exports.dispatchRollingWorker = dispatchRollingWorker;
exports.collectRollingWorkerSubmission = collectRollingWorkerSubmission;
exports.readRollingWorkerStopV1 = readRollingWorkerStopV1;
exports.parseRollingWorkerStop = parseRollingWorkerStop;
exports.readRollingWorkerResumptionV1 = readRollingWorkerResumptionV1;
exports.parseRollingWorkerResumption = parseRollingWorkerResumption;
exports.readRollingWorkerRetirementV1 = readRollingWorkerRetirementV1;
exports.resumeRollingWorker = resumeRollingWorker;
exports.suspendRollingWorker = suspendRollingWorker;
exports.buildRollingRetirementInstructions = buildRollingRetirementInstructions;
exports.retireRollingWorker = retireRollingWorker;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const lossless_json_1 = require("lossless-json");
const node_child_process_1 = require("node:child_process");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_worker_submission_js_1 = require("./rolling-worker-submission.js");
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
async function recoverRollingWorkerCreation(rollingCampaignStore, rollingCodex, campaignId, actionId, generation) {
    const rollingWorkerCreationInspection = await rollingCampaignStore.inspectWorkerCreation(campaignId, actionId, generation);
    const rollingWorkerCreationRecoveryIdentity = { assignmentId: rollingWorkerCreationInspection.assignment.id,
        actionId, generation, rootPath: rollingWorkerCreationInspection.worktree.rootPath };
    const rollingWorkerCreationV1 = rollingWorkerCreationInspection.rollingWorkerCreationV1;
    if (rollingWorkerCreationV1 === null)
        return { ...rollingWorkerCreationRecoveryIdentity, state: 'unknown' };
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, rollingWorkerCreationV1.rootPath)) === JSON.stringify(rollingWorkerCreationV1), 'recovered native worker differs from original receipt');
    const rollingNativeTurn = rollingWorkerCreationInspection.action.state === 'COMPLETED' ? null
        : await rollingCodex.readInitializationTurn(rollingWorkerCreationV1.threadId);
    const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
    if (rollingNativeTurn?.status === 'inProgress' || rollingNativeThreadActivity.status === 'active')
        return { ...rollingWorkerCreationRecoveryIdentity, state: 'active', rollingWorkerCreationV1, turnId: rollingNativeTurn?.id ?? null };
    requireWorker(rollingNativeThreadActivity.status === 'idle' && (rollingNativeTurn === null || rollingNativeTurn.status === 'completed'), 'original initialization is not verified completed and idle; preserve its reservation');
    (0, rolling_worktrees_js_1.validateRollingSessionMarker)(rollingWorkerCreationV1.rootPath, rollingWorkerCreationV1.sessionId);
    const rollingSessionAttachment = await rollingCampaignStore.completeWorkerCreation(campaignId, actionId, generation, rollingWorkerCreationV1);
    return { ...rollingWorkerCreationRecoveryIdentity, state: 'attached', rollingSessionAttachment };
}
function buildRollingWorkerInstructions(rollingWorkerContext) {
    const { obligation, requirements, binding, lease } = rollingWorkerContext;
    requireWorker(obligation.id === lease.binding.obligationId && binding.obligationId === obligation.id, 'worker instructions differ from frozen obligation');
    requireWorker(obligation.requirementIds.every(id => requirements.some(item => item.id === id))
        && requirements.every(item => obligation.requirementIds.includes(item.id)), 'worker instructions lack exact requirement references');
    const rollingWorkerSubmissionV1 = {
        schemaVersion: 1, campaignId: lease.scopeId, assignmentId: rollingWorkerContext.assignmentId,
        generation: lease.generation, sessionId: rollingWorkerContext.rollingWorkerCreationV1.sessionId,
        graphDigest: lease.graphDigest, revision: '<actual final HEAD>', baseCommit: rollingWorkerContext.baseCommit, stopped: true,
        proof: lease.binding.execution.target === null ? [] : [{ operation: 'test', evidence: {
                    command: '<actual command string>', selection: lease.binding.execution.selection,
                    target: { ...lease.binding.execution.target, verification: '<relative verification file>' },
                    revision: '<actual final HEAD>', dirty: false, startedAt: '<actual ISO timestamp>', completedAt: '<actual ISO timestamp>',
                    outcome: 'pass', skips: 0, failures: 0,
                    inputs: { schemaVersion: 2, revision: '<actual final HEAD>', paths: ['<relative tracked source or test input>'] },
                    outputPath: '<relative output file>', finalization: 'pass'
                } }]
    };
    return 'Execute the assigned atomic obligation in this existing checkout and original session. Read the applicable project rules and skills before work. '
        + 'The coordinator graph is authoritative; the frozen lease below owns current prerequisites, permitted paths, operations, proof selection and target. '
        + 'The obligation owns the canonical condition and discharge criterion. Its historical execution field does not override this frozen lease. '
        + 'Use the exact requirement references, acceptance arc and step references, implementation IDs, source paths, unit and integration selections below. '
        + 'Establish only this obligation within the lease. For a no-edit obligation, return fresh inspection and proof without inventing a code change or Git rebase. Run configured focused QA and the referenced focused arcs; publication QA belongs to the coordinator publication gate. '
        + 'Preserve static typing and project build-impact rules. Report newly discovered prerequisites to the coordinator; do not silently change the authoritative graph. '
        + 'If blocked, stop activity and report the blocker while retaining the checkout. Delivery is proposed discharge, not acceptance. '
        + 'When submitting code changes, fetch the configured campaign branch and perform a full semantic rebase commit by commit, refresh affected evidence, retain the exact candidate SHA and base, and stop activity. '
        + 'For semantic replay after fetching the configured campaign branch, use GIT_SEQUENCE_EDITOR=\"sed -i.bak -e s/^pick/edit/\" git rebase --interactive --force-rebase FETCH_HEAD. Inspect each stopped commit before git rebase --continue. These exact commands receive one-use approval only for this active leased worker and its original instruction turn. '
        + 'If this checkout retains its owned in-progress rebase after a failed prior turn, inspect the stopped commit and continue that rebase before beginning a fresh replay; preserve its amendments and staged work. '
        + 'Git mutations in this linked checkout write shared repository metadata outside the checkout. Request sandbox escalation for each authorized Git mutation before its first execution (sandbox_permissions=require_escalated). Keep the lease and authorized command scope binding. '
        + 'Return the candidate and evidence to the coordinator for adversarial review; never publish to mainline yourself. '
        + (rollingWorkerContext.incrementRepair === null ? '' : `Substantive integration repair is required. Preserve and inspect the retained conflicting checkout and original replay identities before changing it. Resolve the recorded findings within the frozen paths, perform a fresh full semantic rebase against the campaign branch, and refresh all applicable focused QA. Submit the corrected candidate for fresh review by the original reviewer. Repair inspection and original conflict: ${JSON.stringify(rollingWorkerContext.incrementRepair)}\n`)
        + (rollingWorkerContext.rejectedReview === null ? '' : `Correct every finding from the original reviewer before resubmission. Rejected review: ${JSON.stringify(rollingWorkerContext.rejectedReview)}\n`)
        + 'For every successful obligation, including a no-edit inspection, the final message must be only strict JSON, without Markdown fences or surrounding prose. '
        + 'Use exactly the physical record keys shown in the outline, at every level. Do not add stoppedAt, timestamp, status, blocker, validation or any other field to a successful submission. Keep actual timestamps in evidence.startedAt and evidence.completedAt only. '
        + 'Replace every placeholder and provide nonempty actual proof in the following typed submission outline; placeholders are not evidence. '
        + 'Each proof entry contains operation and evidence. Evidence contains command, selection, target (identity, profile, verification), revision, dirty, startedAt, completedAt, outcome, skips, failures, inputs (schemaVersion: 2, revision, paths), outputPath and finalization. '
        + 'command is a string, not an argv array. finalization is the string "pass" for successful finalization, not an object. '
        + 'Use the frozen proof selection and target. inputs.revision must equal the tested final HEAD; paths lists the relevant tracked source and test inputs, relative to this checkout. Do not enumerate the repository or store file hashes. Git establishes whether these inputs changed. '
        + 'target.verification is a relative tracked verification-file path included in inputs.paths, not a prose claim. Retain command output at outputPath; it may be an ignored log and is not a source input. '
        + 'Retain actual command output and ISO timestamps; only passing, finalized, clean evidence with zero skips and failures is eligible. '
        + `Submission outline: ${JSON.stringify(rollingWorkerSubmissionV1)}\n`
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
async function collectRollingWorkerSubmission(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs = 60000) {
    const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId, assignmentId, generation);
    const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId, assignmentId, generation);
    requireWorker(rollingWorkerDispatch?.state === 'ATTACHED', 'submission requires its known original instruction turn');
    requireWorker(rollingWorkerDispatch.threadId === rollingWorkerCreationV1.threadId, 'instruction turn differs from original attached worker');
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, rollingWorkerCreationV1.rootPath)) === JSON.stringify(rollingWorkerCreationV1), 'submission actor differs from original attached worker');
    let rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerDispatch.threadId, rollingWorkerDispatch.turnId);
    if (rollingNativeTurn.status === 'inProgress')
        rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerDispatch.threadId, rollingWorkerDispatch.turnId, timeoutMs);
    requireWorker(rollingNativeTurn.status === 'completed', 'submission instruction turn did not complete');
    const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerDispatch.threadId);
    requireWorker(rollingNativeThreadActivity.status === 'idle', 'submission actor is not known idle; preserve active ownership');
    const finalText = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
    requireWorker(finalText, 'worker turn has no final submission');
    const rollingWorkerSubmissionV1 = (0, rolling_worker_submission_js_1.parseRollingWorkerSubmission)(finalText);
    return rollingCampaignStore.submit(campaignId, assignmentId, generation, rollingWorkerSubmissionV1);
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
function readRollingWorkerResumptionV1(value) {
    const record = stopFields(value, ['schemaVersion', 'rollingWorkerCreationV1', 'baseCommit']);
    requireWorker(record.schemaVersion === 1 && typeof record.baseCommit === 'string'
        && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(record.baseCommit), 'invalid resumption version or campaign base');
    return { schemaVersion: 1, rollingWorkerCreationV1: readRollingWorkerCreationV1(record.rollingWorkerCreationV1), baseCommit: record.baseCommit };
}
function parseRollingWorkerResumption(text) {
    return readRollingWorkerResumptionV1((0, lossless_json_1.parse)(text, null, token => { requireWorker(token === '1', 'invalid resumption numeric token'); return 1; }));
}
exports.RollingWorkerResumptionReaders = { V1: readRollingWorkerResumptionV1 };
function readRollingWorkerRetirementV1(value) {
    const record = stopFields(value, ['schemaVersion', 'campaignId', 'assignmentId', 'generation', 'resourceGeneration', 'number',
        'rootPath', 'coordinatorRoot', 'threadId', 'sessionId', 'integratedRevision']);
    requireWorker(record.schemaVersion === 1, 'invalid retirement version');
    requireWorker(typeof record.number === 'number' && Number.isSafeInteger(record.number) && record.number >= 101, 'invalid retirement checkout number');
    const assignmentId = identity(record.assignmentId), generation = identity(record.generation), resourceGeneration = identity(record.resourceGeneration);
    for (const id of [assignmentId, generation, resourceGeneration])
        requireWorker(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id), 'invalid retirement UUID');
    const rootPath = identity(record.rootPath), coordinatorRoot = identity(record.coordinatorRoot);
    for (const root of [rootPath, coordinatorRoot])
        requireWorker(node_path_1.default.isAbsolute(root) && node_path_1.default.normalize(root) === root, 'invalid retirement root');
    const integratedRevision = identity(record.integratedRevision);
    requireWorker(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(integratedRevision), 'invalid retirement integration revision');
    return { schemaVersion: 1, campaignId: identity(record.campaignId), assignmentId, generation, resourceGeneration, number: record.number,
        rootPath, coordinatorRoot, threadId: identity(record.threadId), sessionId: identity(record.sessionId), integratedRevision };
}
exports.RollingWorkerRetirementReaders = { V1: readRollingWorkerRetirementV1 };
async function resumeRollingWorker(rollingCampaignStore, rollingCodex, campaignId, actionId, generation) {
    const rollingWorkerResumptionV1 = await rollingCampaignStore.claimWorkerResumption(campaignId, actionId, generation);
    const rollingWorkerCreationV1 = rollingWorkerResumptionV1.rollingWorkerCreationV1;
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, rollingWorkerCreationV1.rootPath))
        === JSON.stringify(rollingWorkerCreationV1), 'resumed worker differs from original identity');
    const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
    requireWorker(rollingNativeThreadActivity.status === 'idle', 'resumed worker is not known idle; preserve reserved capacity');
    return rollingCampaignStore.completeWorkerResumption(campaignId, actionId, generation, rollingWorkerResumptionV1);
}
async function suspendRollingWorker(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, blockers, timeoutMs = 60000) {
    const rollingWorkerStopV1 = await observeRollingWorkerStop(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs);
    return rollingCampaignStore.suspendObservedWorker(campaignId, assignmentId, generation, rollingWorkerStopV1, blockers);
}
async function observeRollingWorkerStop(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs) {
    const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId, assignmentId, generation);
    const rollingWorkerDispatch = await rollingCampaignStore.workerDispatch(campaignId, assignmentId, generation);
    if (rollingWorkerDispatch !== null && rollingWorkerDispatch.state !== 'ATTACHED')
        throw new Error('rolling worker: unknown worker dispatch must be reconciled before stopping ownership');
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
    return rollingWorkerStopV1;
}
function buildRollingRetirementInstructions(rollingWorkerRetirementV1) {
    const checkedRollingWorkerRetirementV1 = readRollingWorkerRetirementV1(rollingWorkerRetirementV1);
    return 'Your Ponytail assignment has ended. Its generation is revoked. Do not edit files, run commands, send messages to other sessions or begin further work. Acknowledge this notification and finish the turn. The coordinator will archive this worker and no longer send or expect worker messages.\n'
        + `Retired assignment: ${checkedRollingWorkerRetirementV1.assignmentId}; generation: ${checkedRollingWorkerRetirementV1.generation}.`;
}
async function retireRollingWorker(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs = 60000) {
    let rollingWorkerRetirement = await rollingCampaignStore.workerRetirement(campaignId, assignmentId, generation);
    if (rollingWorkerRetirement === null) {
        const rollingWorkerStopV1 = await observeRollingWorkerStop(rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs);
        rollingWorkerRetirement = await rollingCampaignStore.prepareWorkerRetirement(campaignId, assignmentId, generation, rollingWorkerStopV1);
    }
    if (rollingWorkerRetirement.state === 'CLEANED')
        return rollingWorkerRetirement;
    const { rollingWorkerRetirementV1 } = rollingWorkerRetirement;
    if (rollingWorkerRetirement.state === 'PREPARED') {
        const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerRetirementV1.threadId);
        requireWorker(rollingNativeThreadActivity.status === 'idle', 'retiring worker is not known idle; preserve its reservation');
        rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId, assignmentId, generation, 'PREPARED', 'NOTIFYING');
        const rollingTurnStarted = await rollingCodex.startTurn(rollingWorkerRetirementV1.threadId, buildRollingRetirementInstructions(rollingWorkerRetirementV1));
        rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId, assignmentId, generation, 'NOTIFYING', 'NOTIFYING', rollingTurnStarted.turn.id);
    }
    if (rollingWorkerRetirement.state === 'NOTIFYING') {
        requireWorker(rollingWorkerRetirement.turnId !== null, 'retirement notification outcome is unknown; reconcile its original native turn before continuing');
        let rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerRetirementV1.threadId, rollingWorkerRetirement.turnId);
        if (rollingNativeTurn.status === 'inProgress')
            rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerRetirementV1.threadId, rollingWorkerRetirement.turnId, timeoutMs);
        requireWorker(rollingNativeTurn.status === 'completed', 'retirement notification has not completed; preserve its reservation');
        const rollingNativeThreadActivity = await rollingCodex.readThreadActivity(rollingWorkerRetirementV1.threadId);
        requireWorker(rollingNativeThreadActivity.status === 'idle', 'retirement notification worker is not known idle');
        rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId, assignmentId, generation, 'NOTIFYING', 'NOTIFIED');
    }
    if (rollingWorkerRetirement.state === 'NOTIFIED')
        rollingWorkerRetirement =
            await rollingCampaignStore.advanceWorkerRetirement(campaignId, assignmentId, generation, 'NOTIFIED', 'ARCHIVING');
    if (rollingWorkerRetirement.state === 'ARCHIVING') {
        if (!await rollingCodex.isThreadArchived(rollingWorkerRetirementV1.threadId, rollingWorkerRetirementV1.rootPath))
            await rollingCodex.archiveThread(rollingWorkerRetirementV1.threadId);
        rollingWorkerRetirement = await rollingCampaignStore.advanceWorkerRetirement(campaignId, assignmentId, generation, 'ARCHIVING', 'ARCHIVED');
    }
    return rollingCampaignStore.cleanupWorkerRetirement(campaignId, assignmentId, generation);
}
