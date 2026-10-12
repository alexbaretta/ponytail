// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-operations.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingCampaignOperations = exports.RollingCampaignInitializationReaders = void 0;
exports.readRollingCampaignInitializationV1 = readRollingCampaignInitializationV1;
exports.parseRollingCampaignInitialization = parseRollingCampaignInitialization;
exports.readRollingReviewerLoss = readRollingReviewerLoss;
exports.projectRollingCoordinatorActions = projectRollingCoordinatorActions;
exports.withRollingCampaignOperations = withRollingCampaignOperations;
exports.executeRollingCommand = executeRollingCommand;
exports.runRollingOperationCli = runRollingOperationCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const node_child_process_1 = require("node:child_process");
const lossless_json_1 = require("lossless-json");
const project_index_database_js_1 = require("./project-index-database.js");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_campaign_store_js_1 = require("./rolling-campaign-store.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_codex_js_1 = require("./rolling-codex.js");
const rolling_worker_js_1 = require("./rolling-worker.js");
const rolling_review_js_1 = require("./rolling-review.js");
const rolling_publication_js_1 = require("./rolling-publication.js");
const rolling_cli_registry_js_1 = require("./rolling-cli-registry.js");
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function record(value) {
    if (!isRecord(value))
        throw new Error('rolling campaign: expected an object');
    return value;
}
function readRollingCampaignInitializationV1(value) {
    const initialization = record(value);
    if (initialization.schemaVersion !== 1 || JSON.stringify(Object.keys(initialization).sort()) !== JSON.stringify(['schemaVersion', 'coordinatorRoot', 'documentPath', 'bindingsPath', 'bindingHistory', 'configuration'].sort()))
        throw new Error('rolling campaign: invalid initialization V1 fields');
    if (typeof initialization.coordinatorRoot !== 'string' || !node_path_1.default.isAbsolute(initialization.coordinatorRoot))
        throw new Error('rolling campaign: initialization requires an absolute coordinator root');
    (0, obligations_js_1.relativePath)(initialization.documentPath);
    (0, obligations_js_1.relativePath)(initialization.bindingsPath);
    return { schemaVersion: 1, coordinatorRoot: initialization.coordinatorRoot, documentPath: initialization.documentPath, bindingsPath: initialization.bindingsPath,
        bindingHistory: initialization.bindingHistory === null ? null : (0, rolling_campaign_store_js_1.readRollingBindingHistoryConfiguration)(initialization.bindingHistory), configuration: (0, rolling_campaign_js_1.readRollingCampaignRequest)(initialization.configuration) };
}
exports.RollingCampaignInitializationReaders = { V1: readRollingCampaignInitializationV1 };
function readJson(text) {
    return (0, lossless_json_1.parse)(text, null, token => {
        const number = Number(token);
        if (!/^(0|-?[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(number))
            throw new Error('rolling campaign: JSON numbers must be exact safe integers');
        return number;
    });
}
function parseRollingCampaignInitialization(text) { return readRollingCampaignInitializationV1(readJson(text)); }
function stringField(input, name) {
    const value = input[name];
    if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || value.includes('\0'))
        throw new Error(`rolling campaign: ${name} must be a nonempty string`);
    return value;
}
function readRollingReviewerLoss(value) {
    if (value === undefined)
        return null;
    const rollingReviewerLossRecord = record(value);
    if (Object.keys(rollingReviewerLossRecord).length !== 2 || !Object.hasOwn(rollingReviewerLossRecord, 'reviewId')
        || !Object.hasOwn(rollingReviewerLossRecord, 'lossReference'))
        throw new Error('rolling campaign: invalid reviewer loss fields');
    return { reviewId: stringField(rollingReviewerLossRecord, 'reviewId'), lossReference: stringField(rollingReviewerLossRecord, 'lossReference') };
}
function stringArray(value) {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.length > 0))
        throw new Error('rolling campaign: expected a string array');
    return value;
}
class RollingLegacyInspectionError extends Error {
    exitCode;
    constructor(exitCode, message) {
        super(message);
        this.exitCode = exitCode;
    }
}
function readRollingCommandInput(command, value) {
    const input = record(value);
    const definition = rolling_cli_registry_js_1.rollingCommandDefinitions.find(item => item.name === command);
    if (!definition || Object.keys(input).some(key => !definition.fields.some(field => field.name === key)))
        throw new Error('rolling campaign: undeclared command arguments');
    for (const field of definition.fields)
        if (field.required && input[field.name] === undefined)
            throw new Error(`rolling campaign: required argument ${field.name} is missing`);
    return input;
}
function inspectRollingLegacy(root, value) {
    const input = readRollingCommandInput('legacy', value);
    const inspection = stringField(input, 'command');
    if (!['validate', 'report', 'list', 'status', 'reservation-audit'].includes(inspection))
        throw new Error('rolling campaign: legacy dispatch and mutation are retired; only explicit inspection is supported');
    const arguments_ = input.arguments === undefined ? [] : stringArray(input.arguments);
    const result = (0, node_child_process_1.spawnSync)(process.execPath, [node_path_1.default.join(__dirname, 'campaign-census.js'), inspection, ...arguments_], { cwd: root, encoding: 'utf8' });
    if (result.error || result.status !== 0)
        throw new RollingLegacyInspectionError(result.status ?? 1, result.error?.message || result.stderr.trim() || 'historical campaign inspection failed');
    return result.stdout;
}
function publicationCommand(rollingPublicationStatus) {
    switch (rollingPublicationStatus.state) {
        case 'FROZEN': return 'prepare-publication';
        case 'PREPARING': return rollingPublicationStatus.pendingRefreshId === null ? 'observe-preparation' : 'observe-refresh';
        case 'CONFLICT': return 'inspect-publication-conflict';
        case 'CANDIDATE':
        case 'QA_FAILED': return 'run-publication-qa';
        case 'QA_RUNNING': return 'observe-publication-qa';
        case 'QA_PASSED': return 'publish-mainline';
        case 'PUSHING':
        case 'UNCONFIRMED': return 'observe-mainline';
        case 'REBASE_REQUIRED':
        case 'PUSH_REJECTED': return 'refresh-mainline';
        case 'PUBLISHED': return 'synchronize-campaign';
    }
}
function projectRollingCoordinatorActions(rollingCoordinatorSnapshot) {
    if (rollingCoordinatorSnapshot.closure !== null)
        return { snapshot: rollingCoordinatorSnapshot, decisions: [] };
    if (rollingCoordinatorSnapshot.graphDigest !== rollingCoordinatorSnapshot.observedGraphDigest)
        return { snapshot: rollingCoordinatorSnapshot,
            decisions: [{ kind: 'reconcile', expectedDigest: rollingCoordinatorSnapshot.graphDigest, observedDigest: rollingCoordinatorSnapshot.observedGraphDigest }] };
    const decisions = [];
    for (const publication of rollingCoordinatorSnapshot.publications)
        decisions.push({ kind: 'publication', command: publicationCommand(publication), publication });
    for (const rollingStoredReview of rollingCoordinatorSnapshot.reviews)
        if (rollingStoredReview.outcome === null) {
            const rollingReviewDispatch = rollingCoordinatorSnapshot.reviewDispatches.find(rollingStoredReviewDispatch => rollingStoredReviewDispatch.reviewId === rollingStoredReview.request.id)?.dispatch;
            switch (rollingReviewDispatch?.state) {
                case undefined:
                    decisions.push({ kind: 'review', command: 'dispatch-review', review: rollingStoredReview });
                    break;
                case 'ATTACHED':
                    decisions.push({ kind: 'review', command: 'inspect-review', review: rollingStoredReview });
                    break;
                case 'STARTED':
                    decisions.push({ kind: 'blocked-review-dispatch', reason: 'instruction_turn_unknown', review: rollingStoredReview, dispatch: rollingReviewDispatch });
                    break;
                default: rollingReviewDispatch;
            }
        }
    for (const rollingStoredAssignment of rollingCoordinatorSnapshot.assignments) {
        if (rollingCoordinatorSnapshot.actions.some(rollingAction => rollingAction.assignmentId === rollingStoredAssignment.id && rollingAction.generation === rollingStoredAssignment.generation))
            continue;
        if (rollingStoredAssignment.state === 'INACTIVE' && rollingStoredAssignment.activityStopped && !rollingStoredAssignment.retired
            && rollingStoredAssignment.sessionId && rollingStoredAssignment.lease
            && rollingCoordinatorSnapshot.scheduling.blocked.some(block => block.reason === 'scope_changed' && block.obligationId === rollingStoredAssignment.obligationId)) {
            decisions.push({ kind: 'worker-rebinding', command: 'rebind-worker', assignment: rollingStoredAssignment });
            continue;
        }
        const rollingAssignmentRelease = rollingCoordinatorSnapshot.releasableAssignments.find(release => release.id === rollingStoredAssignment.id && release.generation === rollingStoredAssignment.generation);
        if (rollingAssignmentRelease && rollingStoredAssignment.state === 'RETIRING' && rollingStoredAssignment.retired && rollingStoredAssignment.activityStopped) {
            decisions.push({ kind: 'release', command: 'replenish', release: rollingAssignmentRelease, graphDigest: rollingCoordinatorSnapshot.graphDigest });
            continue;
        }
        const rollingStoredIncrement = rollingCoordinatorSnapshot.increments.find(increment => increment.claim.assignmentId === rollingStoredAssignment.id && increment.claim.generation === rollingStoredAssignment.generation);
        if (rollingStoredAssignment.state === 'INTEGRATING' && rollingStoredIncrement?.state === 'PUBLISHED') {
            if (rollingStoredIncrement.obligationSatisfied)
                decisions.push({ kind: 'assignment', command: 'retire-worker', assignment: rollingStoredAssignment });
            else
                decisions.push({ kind: 'acceptance', command: 'accept', assignment: rollingStoredAssignment, increment: rollingStoredIncrement });
            continue;
        }
        if (rollingStoredAssignment.state === 'WORKING' && !rollingStoredAssignment.retired && !rollingStoredAssignment.activityStopped && rollingStoredAssignment.sessionId !== null) {
            const rollingWorkerDispatch = rollingCoordinatorSnapshot.workerDispatches.find(rollingStoredWorkerDispatch => rollingStoredWorkerDispatch.assignmentId === rollingStoredAssignment.id && rollingStoredWorkerDispatch.generation === rollingStoredAssignment.generation)?.dispatch;
            switch (rollingWorkerDispatch?.state) {
                case undefined:
                    decisions.push({ kind: 'assignment', command: 'dispatch-worker', assignment: rollingStoredAssignment });
                    break;
                case 'ATTACHED':
                    decisions.push({ kind: 'assignment', command: 'collect-submission', assignment: rollingStoredAssignment });
                    break;
                case 'STARTED':
                    decisions.push({ kind: 'blocked-worker-dispatch', reason: 'instruction_turn_unknown', assignment: rollingStoredAssignment, dispatch: rollingWorkerDispatch });
                    break;
                default: rollingWorkerDispatch;
            }
        }
        else if (rollingStoredAssignment.state === 'REWORK')
            decisions.push({ kind: 'worker-suspension', command: 'suspend-worker', assignment: rollingStoredAssignment, blockers: [] });
        else if (['REVIEW', 'INTEGRATING', 'RETIRING'].includes(rollingStoredAssignment.state)
            && !rollingCoordinatorSnapshot.reviews.some(review => review.request.assignmentId === rollingStoredAssignment.id && review.outcome === null))
            decisions.push({ kind: 'assignment', command: rollingStoredAssignment.state === 'REVIEW' ? 'request-review' : rollingStoredAssignment.state === 'INTEGRATING' ? 'integrate' : 'retire-worker', assignment: rollingStoredAssignment });
    }
    for (const action of rollingCoordinatorSnapshot.actions)
        decisions.push({ kind: 'worker', command: action.kind === 'START_WORKER' ? action.state === 'PENDING' ? 'provision-worker' : 'recover-worker' : action.state === 'PENDING' ? 'resume-worker' : 'observe-resumption', action });
    if (rollingCoordinatorSnapshot.publicationReadiness.state === 'FROZEN')
        decisions.push({ kind: 'publication-freeze', command: 'freeze-publication', selection: rollingCoordinatorSnapshot.publicationReadiness, flush: rollingCoordinatorSnapshot.publicationReadiness.trigger === 'threshold' ? null : rollingCoordinatorSnapshot.publicationReadiness.trigger });
    if (rollingCoordinatorSnapshot.scheduling.selected.length > 0)
        decisions.push({ kind: 'replenish', graphDigest: rollingCoordinatorSnapshot.graphDigest });
    if (rollingCoordinatorSnapshot.obligationProjection.complete && rollingCoordinatorSnapshot.assignments.every(assignment => assignment.state === 'RELEASED')
        && rollingCoordinatorSnapshot.actions.length === 0 && rollingCoordinatorSnapshot.publications.length === 0
        && rollingCoordinatorSnapshot.publicationReadiness.state === 'WAITING' && rollingCoordinatorSnapshot.publicationReadiness.reason === 'empty')
        decisions.push({ kind: 'closure', command: 'close' });
    return { snapshot: rollingCoordinatorSnapshot, decisions };
}
class RollingCampaignOperations {
    rollingCampaignStore;
    root;
    constructor(rollingCampaignStore, root) {
        this.rollingCampaignStore = rollingCampaignStore;
        this.root = root;
    }
    async initialize(rollingCampaignInitializationV1) {
        readRollingCampaignInitializationV1(rollingCampaignInitializationV1);
        if (node_fs_1.default.realpathSync(rollingCampaignInitializationV1.coordinatorRoot) !== node_fs_1.default.realpathSync(this.root))
            throw new Error('rolling campaign: initialization root differs from the invoking project');
        const { coordinatorRoot, documentPath, bindingsPath, bindingHistory } = rollingCampaignInitializationV1;
        const rollingResolvedConfiguration = (0, rolling_campaign_js_1.loadRollingConfiguration)(coordinatorRoot, rollingCampaignInitializationV1.configuration);
        if ((0, rolling_integration_js_1.git)(coordinatorRoot, ['status', '--porcelain']).trim() !== '')
            throw new Error('rolling campaign: initialization requires a clean coordinator checkout');
        const mainlineRef = `refs/remotes/${rollingResolvedConfiguration.mainline.remote}/${rollingResolvedConfiguration.mainline.branch}`;
        (0, rolling_integration_js_1.git)(coordinatorRoot, ['fetch', '--no-tags', '--', rollingResolvedConfiguration.mainline.remote, `refs/heads/${rollingResolvedConfiguration.mainline.branch}:${mainlineRef}`]);
        const branch = (0, rolling_integration_js_1.gitResult)(coordinatorRoot, ['show-ref', '--verify', '--quiet', `refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
        if (branch.status === 1)
            (0, rolling_integration_js_1.git)(coordinatorRoot, ['branch', rollingResolvedConfiguration.incrementRef, mainlineRef]);
        else if (branch.status !== 0)
            throw new Error('rolling campaign: cannot inspect the campaign branch');
        (0, rolling_integration_js_1.git)(coordinatorRoot, ['switch', rollingResolvedConfiguration.incrementRef]);
        (0, rolling_integration_js_1.git)(coordinatorRoot, ['merge', '--ff-only', mainlineRef]);
        const revision = (0, rolling_integration_js_1.git)(coordinatorRoot, ['rev-parse', 'HEAD']).trim();
        const rollingIncrementPublication = { rootPath: coordinatorRoot, target: { remote: rollingResolvedConfiguration.mainline.remote, branch: rollingResolvedConfiguration.incrementRef }, revision };
        if (revision === (0, rolling_integration_js_1.git)(coordinatorRoot, ['rev-parse', mainlineRef]).trim()) {
            const remote = (0, rolling_integration_js_1.gitResult)(coordinatorRoot, ['ls-remote', '--exit-code', '--heads', '--', rollingResolvedConfiguration.mainline.remote, `refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
            if (remote.status === 2)
                (0, rolling_integration_js_1.gitResult)(coordinatorRoot, ['push', '--porcelain', '--', rollingResolvedConfiguration.mainline.remote, `${revision}:refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
            else if (remote.status !== 0)
                throw new Error('rolling campaign: initial branch observation failed; retain the checkout');
        }
        const rollingIncrementPublicationResult = revision === (0, rolling_integration_js_1.git)(coordinatorRoot, ['rev-parse', mainlineRef]).trim()
            ? (0, rolling_integration_js_1.publishRollingIncrement)(rollingIncrementPublication) : (0, rolling_integration_js_1.reconcileRollingIncrementPublication)(rollingIncrementPublication);
        if (rollingIncrementPublicationResult.state !== 'PUBLISHED')
            throw new Error(`rolling campaign: initial campaign base ${rollingIncrementPublicationResult.state}; preserve the checkout and observe the remote`);
        (0, rolling_integration_js_1.git)(coordinatorRoot, ['merge', '--ff-only', rollingIncrementPublicationResult.remoteRevision]);
        const rollingManagedDirectory = (0, rolling_worktrees_js_1.resolveRollingManagedDirectory)(coordinatorRoot);
        const rollingGraph = (0, rolling_campaign_js_1.collectRollingGraph)(coordinatorRoot, documentPath, bindingsPath, bindingHistory?.path);
        const rollingCampaignRegistration = {
            id: rollingGraph.document.scopeId, coordinatorRoot: rollingGraph.coordinatorRoot, documentPath, bindingsPath, graphDigest: rollingGraph.digest,
            managedDirectory: rollingManagedDirectory.directory, configuration: rollingResolvedConfiguration,
            ...(bindingHistory === null ? {} : { bindingHistory })
        };
        return this.rollingCampaignStore.registerCampaign(rollingCampaignRegistration);
    }
    reconcile(campaignId) { return this.rollingCampaignStore.reconcileCoordinator(campaignId); }
    status(campaignId) { return this.rollingCampaignStore.coordinatorSnapshot(campaignId); }
    async nextActions(campaignId) { return projectRollingCoordinatorActions(await this.status(campaignId)); }
    async native(signal, operation) {
        const rollingCodex = await rolling_codex_js_1.RollingCodex.connect({ cwd: this.root });
        let cancellation = null;
        const abort = () => { cancellation ??= rollingCodex.interruptOwnedTurns(); };
        signal?.addEventListener('abort', abort, { once: true });
        rollingCodex.on('serverRequest', request => rollingCodex.respondToServer(request.id, { decision: 'decline' }));
        try {
            if (signal?.aborted)
                throw new Error('rolling campaign: operation interrupted');
            return await operation(rollingCodex);
        }
        finally {
            try {
                if (cancellation !== null)
                    await cancellation;
                await rollingCodex.waitForObservedTurns(3600000);
                if (cancellation !== null)
                    await cancellation;
            }
            finally {
                signal?.removeEventListener('abort', abort);
                await rollingCodex.close();
            }
        }
    }
    async preparePublication(campaignId, batchId) {
        let rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
        if (rollingPublicationContext.candidate !== null)
            return rollingPublicationContext.candidate;
        if (rollingPublicationContext.preparation === null) {
            const rollingPublicationBatchClaimV1 = await this.rollingCampaignStore.beginMainlinePreparation(campaignId, batchId);
            await this.rollingCampaignStore.recordMainlinePreparation(campaignId, batchId, (0, rolling_publication_js_1.prepareRollingMainline)(rollingPublicationBatchClaimV1));
            rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
        }
        if (rollingPublicationContext.preparation === null)
            throw new Error('rolling campaign: publication preparation remains unresolved');
        const rollingMainlineCandidateV1 = (0, rolling_integration_js_1.git)(rollingPublicationContext.claim.rootPath, ['symbolic-ref', 'HEAD']).trim() === `refs/heads/${rollingPublicationContext.claim.incrementRef}`
            ? (0, rolling_publication_js_1.mergeRollingMainline)(rollingPublicationContext.claim, rollingPublicationContext.preparation)
            : (0, rolling_publication_js_1.observeRollingMainlineCandidate)(rollingPublicationContext.claim, rollingPublicationContext.preparation);
        return this.rollingCampaignStore.recordMainlineCandidate(campaignId, batchId, rollingMainlineCandidateV1);
    }
    async refreshPublication(campaignId, batchId, observe) {
        let rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
        if (observe && rollingPublicationContext.refreshResult !== null)
            return rollingPublicationContext.refreshResult;
        const rollingMainlineRefreshIntentV1 = observe ? rollingPublicationContext.refreshIntent : await this.rollingCampaignStore.beginMainlineRefresh(campaignId, batchId);
        if (rollingMainlineRefreshIntentV1 === null)
            throw new Error('rolling campaign: refresh has no original retained intent');
        rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
        if (rollingPublicationContext.refreshPreparation === null) {
            const rollingMainlineRefreshPreparationV1 = (0, rolling_publication_js_1.prepareRollingMainlineRefresh)(rollingPublicationContext.claim, rollingMainlineRefreshIntentV1);
            await this.rollingCampaignStore.recordMainlineRefreshPreparation(campaignId, batchId, rollingMainlineRefreshPreparationV1);
            rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
        }
        if (rollingPublicationContext.refreshPreparation === null)
            throw new Error('rolling campaign: original refresh preparation is unresolved');
        const rollingMainlineRefreshResultV1 = (0, rolling_integration_js_1.git)(rollingPublicationContext.claim.rootPath, ['rev-parse', 'HEAD']).trim() === rollingPublicationContext.refreshPreparation.previousCandidate.revision
            ? (0, rolling_publication_js_1.mergeRollingMainlineRefresh)(rollingPublicationContext.claim, rollingPublicationContext.refreshPreparation)
            : (0, rolling_publication_js_1.observeRollingMainlineRefresh)(rollingPublicationContext.claim, rollingPublicationContext.refreshPreparation);
        return this.rollingCampaignStore.recordMainlineRefresh(campaignId, batchId, rollingMainlineRefreshResultV1);
    }
    async execute(command, value, signal) {
        if (command === 'legacy')
            return { command, result: inspectRollingLegacy(this.root, value) };
        const input = readRollingCommandInput(command, value);
        const timeoutMs = 3600000;
        switch (command) {
            case 'init': return { command, result: await this.initialize(readRollingCampaignInitializationV1(input.request)) };
            case 'reconcile': return { command, result: await this.reconcile(stringField(input, 'campaign')) };
            case 'status': return { command, result: await this.status(stringField(input, 'campaign')) };
            case 'next-actions': return { command, result: await this.nextActions(stringField(input, 'campaign')) };
            case 'rebind-worker': {
                const campaignId = stringField(input, 'campaign');
                const rollingGraphReconciliation = await this.reconcile(campaignId);
                return { command, result: await this.rollingCampaignStore.rebindLease(campaignId, stringField(input, 'assignment'), stringField(input, 'generation'), rollingGraphReconciliation.graphDigest) };
            }
            case 'replenish': {
                const trigger = input.trigger ?? 'periodic';
                if (trigger !== 'event' && trigger !== 'periodic')
                    throw new Error('rolling campaign: trigger must be event or periodic');
                let rollingAssignmentRelease = null;
                if (input.release !== undefined) {
                    const release = record(input.release);
                    if (Object.keys(release).some(key => !['id', 'generation'].includes(key)))
                        throw new Error('rolling campaign: undeclared release fields');
                    rollingAssignmentRelease = { id: stringField(release, 'id'), generation: stringField(release, 'generation') };
                }
                return { command, result: await this.replenish(stringField(input, 'campaign'), trigger, rollingAssignmentRelease) };
            }
            case 'provision-worker': return { command, result: await this.native(signal, async (rollingCodex) => {
                    const campaignId = stringField(input, 'campaign'), actionId = stringField(input, 'action'), generation = stringField(input, 'generation');
                    const rollingWorkerInitialization = await (0, rolling_worker_js_1.provisionRollingWorker)(this.rollingCampaignStore, rollingCodex, campaignId, actionId, generation);
                    return (0, rolling_worker_js_1.attachRollingWorker)(this.rollingCampaignStore, rollingCodex, campaignId, actionId, generation, rollingWorkerInitialization, timeoutMs);
                }) };
            case 'recover-worker': return { command, result: await this.native(signal, rollingCodex => (0, rolling_worker_js_1.recoverRollingWorkerCreation)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'action'), stringField(input, 'generation'))) };
            case 'resume-worker':
            case 'observe-resumption': return { command, result: await this.native(signal, rollingCodex => (0, rolling_worker_js_1.resumeRollingWorker)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'action'), stringField(input, 'generation'))) };
            case 'dispatch-worker': return { command, result: await this.native(signal, async (rollingCodex) => {
                    const campaignId = stringField(input, 'campaign'), assignmentId = stringField(input, 'assignment'), generation = stringField(input, 'generation');
                    await (0, rolling_worker_js_1.dispatchRollingWorker)(this.rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation);
                    return (0, rolling_worker_js_1.collectRollingWorkerSubmission)(this.rollingCampaignStore, rollingCodex, campaignId, assignmentId, generation, timeoutMs);
                }) };
            case 'collect-submission': return { command, result: await this.native(signal, rollingCodex => (0, rolling_worker_js_1.collectRollingWorkerSubmission)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'assignment'), stringField(input, 'generation'), timeoutMs)) };
            case 'suspend-worker': return { command, result: await this.native(signal, rollingCodex => (0, rolling_worker_js_1.suspendRollingWorker)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'assignment'), stringField(input, 'generation'), stringArray(input.blockers), timeoutMs)) };
            case 'retire-worker': return { command, result: await this.native(signal, rollingCodex => (0, rolling_worker_js_1.retireRollingWorker)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'assignment'), stringField(input, 'generation'), timeoutMs)) };
            case 'request-review': return { command, result: await this.rollingCampaignStore.requestReview(stringField(input, 'campaign'), stringField(input, 'assignment'), stringField(input, 'generation'), stringField(input, 'revision'), stringField(input, 'reviewer'), readRollingReviewerLoss(input.loss)) };
            case 'dispatch-review': return { command, result: await this.native(signal, async (rollingCodex) => {
                    const campaignId = stringField(input, 'campaign'), reviewId = stringField(input, 'review');
                    const rollingReviewContext = await this.rollingCampaignStore.reviewContext(campaignId, reviewId);
                    const rollingNativeThread = await rollingCodex.resumeThread(stringField(input, 'thread'), rollingReviewContext.rootPath);
                    await (0, rolling_review_js_1.dispatchRollingReview)(this.rollingCampaignStore, rollingCodex, campaignId, reviewId, rollingNativeThread);
                    return (0, rolling_review_js_1.collectRollingReview)(this.rollingCampaignStore, rollingCodex, campaignId, reviewId, timeoutMs);
                }) };
            case 'inspect-review': return { command, result: await this.native(signal, rollingCodex => (0, rolling_review_js_1.collectRollingReview)(this.rollingCampaignStore, rollingCodex, stringField(input, 'campaign'), stringField(input, 'review'), timeoutMs)) };
            case 'integrate': return { command, result: await this.rollingCampaignStore.publishIncrement(stringField(input, 'campaign'), stringField(input, 'review')) };
            case 'accept': return { command, result: await this.rollingCampaignStore.acceptIncrementCertificates(stringField(input, 'campaign'), stringField(input, 'review'), stringField(input, 'candidate'), stringArray(input.bindings)) };
            case 'freeze-publication': {
                const campaignId = stringField(input, 'campaign');
                const rollingGraphReconciliation = await this.reconcile(campaignId);
                const flush = input.flush ?? null;
                if (flush !== null && flush !== 'explicit_flush' && flush !== 'completion' && flush !== 'quiescence')
                    throw new Error('rolling campaign: invalid publication flush trigger');
                return { command, result: await this.rollingCampaignStore.claimPublicationBatch(campaignId, rollingGraphReconciliation.graphDigest, flush) };
            }
            case 'prepare-publication':
            case 'observe-preparation': return { command, result: await this.preparePublication(stringField(input, 'campaign'), stringField(input, 'batch')) };
            case 'inspect-publication-conflict':
            case 'observe-publication-qa': return { command, result: await this.rollingCampaignStore.publicationContext(stringField(input, 'campaign'), stringField(input, 'batch')) };
            case 'run-publication-qa': {
                const campaignId = stringField(input, 'campaign'), batchId = stringField(input, 'batch');
                const rollingPublicationQaJobV1 = await this.rollingCampaignStore.beginPublicationQa(campaignId, batchId);
                const rollingPublicationContext = await this.rollingCampaignStore.publicationContext(campaignId, batchId);
                if (rollingPublicationContext.candidate === null)
                    throw new Error('rolling campaign: QA has no verified candidate');
                const rollingPublicationQaV1 = (0, rolling_publication_js_1.runRollingPublicationQa)(rollingPublicationContext.claim, rollingPublicationContext.candidate, rollingPublicationQaJobV1.id, rollingPublicationQaJobV1.configurationDigest, rollingPublicationQaJobV1.commands);
                return { command, result: await this.rollingCampaignStore.recordPublicationQa(campaignId, batchId, rollingPublicationQaV1) };
            }
            case 'publish-mainline': return { command, result: await this.rollingCampaignStore.publishMainline(stringField(input, 'campaign'), stringField(input, 'batch')) };
            case 'observe-mainline': return { command, result: await this.rollingCampaignStore.observeMainlinePublication(stringField(input, 'campaign'), stringField(input, 'batch')) };
            case 'refresh-mainline':
            case 'observe-refresh': return { command, result: await this.refreshPublication(stringField(input, 'campaign'), stringField(input, 'batch'), command === 'observe-refresh') };
            case 'synchronize-campaign': return { command, result: await this.rollingCampaignStore.synchronizePublishedCampaign(stringField(input, 'campaign'), stringField(input, 'batch')) };
            case 'close': return { command, result: await this.rollingCampaignStore.closeCampaign(stringField(input, 'campaign')) };
        }
    }
    async replenish(campaignId, trigger, rollingAssignmentRelease = null) {
        const rollingGraphReconciliation = await this.reconcile(campaignId);
        const initialRollingCoordinatorSnapshot = await this.status(campaignId);
        const allocations = [];
        for (let index = 0; index < initialRollingCoordinatorSnapshot.configuration.maxActiveWorkers; index++) {
            const rollingAllocationResult = await this.rollingCampaignStore.allocate(campaignId, rollingGraphReconciliation.graphDigest, index === 0 && rollingAssignmentRelease !== null ? rollingAssignmentRelease : undefined);
            if (rollingAllocationResult.assignment === null)
                break;
            allocations.push(rollingAllocationResult);
        }
        return { trigger, graphDigest: rollingGraphReconciliation.graphDigest, allocations, snapshot: await this.status(campaignId) };
    }
}
exports.RollingCampaignOperations = RollingCampaignOperations;
async function withRollingCampaignOperations(root, operation) {
    const journal = readJson(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'ponytail-journal.json'), 'utf8'));
    const project = record(journal);
    if (project.schemaVersion !== 1 || typeof project.projectId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(project.projectId))
        throw new Error('rolling campaign: invoking project journal has no valid V1 identity');
    const pool = new pg_1.Pool((0, project_index_database_js_1.databaseOptions)(root));
    try {
        return await operation(new RollingCampaignOperations(new rolling_campaign_store_js_1.RollingCampaignStore(pool, project.projectId), root));
    }
    finally {
        await pool.end();
    }
}
async function executeRollingCommand(root, command, value, signal) {
    if (command === 'legacy')
        return { command, result: inspectRollingLegacy(node_fs_1.default.realpathSync(root), value) };
    return withRollingCampaignOperations(root, rollingCampaignOperations => rollingCampaignOperations.execute(command, value, signal));
}
async function runRollingOperationCli(argv) {
    const [command, ...arguments_] = argv;
    if (command === undefined || command === '--help') {
        process.stdout.write((0, rolling_cli_registry_js_1.rollingCampaignHelp)());
        return;
    }
    if (!(0, rolling_cli_registry_js_1.isRollingCommandName)(command))
        throw new Error(`rolling campaign: unknown command ${command}`);
    if (arguments_.length === 1 && arguments_[0] === '--help') {
        process.stdout.write((0, rolling_cli_registry_js_1.rollingCampaignHelp)(command));
        return;
    }
    const definition = rolling_cli_registry_js_1.rollingCommandDefinitions.find(item => item.name === command);
    if (!definition)
        throw new Error('rolling campaign: missing command definition');
    const input = {};
    let jsonOutput = false;
    for (let index = 0; index < arguments_.length; index++) {
        const flag = arguments_[index];
        if (flag === '--json') {
            if (jsonOutput)
                throw new Error('rolling campaign: repeated --json');
            jsonOutput = true;
            continue;
        }
        const field = definition.fields.find(item => `--${item.name}` === flag);
        if (!field || Object.hasOwn(input, field.name))
            throw new Error(`rolling campaign: unknown or repeated argument ${flag}`);
        const value = arguments_[++index];
        if (value === undefined || value.startsWith('--'))
            throw new Error(`rolling campaign: missing value for ${flag}`);
        input[field.name] = field.kind === 'json' ? readJson(value.startsWith('@') ? node_fs_1.default.readFileSync(value.slice(1), 'utf8') : value) : value;
    }
    const abortController = new AbortController();
    const cancel = () => abortController.abort();
    process.once('SIGINT', cancel);
    try {
        const rollingOperationResponse = await executeRollingCommand(node_fs_1.default.realpathSync(process.cwd()), command, input, abortController.signal);
        process.stdout.write(JSON.stringify(rollingOperationResponse) + '\n');
    }
    finally {
        process.removeListener('SIGINT', cancel);
        if (abortController.signal.aborted)
            process.exitCode = 130;
    }
}
if (require.main === module)
    runRollingOperationCli(process.argv.slice(2)).catch((error) => {
        if (process.exitCode === 130)
            return;
        process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
        process.exitCode = error instanceof RollingLegacyInspectionError ? error.exitCode : 1;
    });
