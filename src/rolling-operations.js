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
exports.projectRollingCoordinatorActions = projectRollingCoordinatorActions;
exports.withRollingCampaignOperations = withRollingCampaignOperations;
exports.runRollingOperationCli = runRollingOperationCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const lossless_json_1 = require("lossless-json");
const project_index_database_js_1 = require("./project-index-database.js");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_campaign_store_js_1 = require("./rolling-campaign-store.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
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
        if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(number))
            throw new Error('rolling campaign: JSON numbers must be exact nonnegative safe integers');
        return number;
    });
}
function parseRollingCampaignInitialization(text) { return readRollingCampaignInitializationV1(readJson(text)); }
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
    if (rollingCoordinatorSnapshot.graphDigest !== rollingCoordinatorSnapshot.observedGraphDigest)
        return { snapshot: rollingCoordinatorSnapshot,
            decisions: [{ kind: 'reconcile', expectedDigest: rollingCoordinatorSnapshot.graphDigest, observedDigest: rollingCoordinatorSnapshot.observedGraphDigest }] };
    const decisions = [];
    for (const publication of rollingCoordinatorSnapshot.publications)
        decisions.push({ kind: 'publication', command: publicationCommand(publication), publication });
    for (const review of rollingCoordinatorSnapshot.reviews)
        if (review.outcome === null)
            decisions.push({ kind: 'review', command: 'inspect-review', review });
    for (const assignment of rollingCoordinatorSnapshot.assignments)
        if (['REVIEW', 'REWORK', 'INTEGRATING', 'RETIRING'].includes(assignment.state)
            && !rollingCoordinatorSnapshot.reviews.some(review => review.request.assignmentId === assignment.id && review.outcome === null))
            decisions.push({ kind: 'assignment', command: assignment.state === 'REVIEW' ? 'request-review' : assignment.state === 'REWORK' ? 'dispatch-worker' : assignment.state === 'INTEGRATING' ? 'integrate' : 'retire-worker', assignment });
    for (const action of rollingCoordinatorSnapshot.actions)
        decisions.push({ kind: 'worker', command: action.kind === 'START_WORKER' ? action.state === 'PENDING' ? 'provision-worker' : 'recover-worker' : action.state === 'PENDING' ? 'resume-worker' : 'observe-resumption', action });
    if (rollingCoordinatorSnapshot.scheduling.selected.length > 0)
        decisions.push({ kind: 'replenish', graphDigest: rollingCoordinatorSnapshot.graphDigest });
    return { snapshot: rollingCoordinatorSnapshot, decisions };
}
class RollingCampaignOperations {
    rollingCampaignStore;
    constructor(rollingCampaignStore) {
        this.rollingCampaignStore = rollingCampaignStore;
    }
    async initialize(rollingCampaignInitializationV1) {
        readRollingCampaignInitializationV1(rollingCampaignInitializationV1);
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
        return await operation(new RollingCampaignOperations(new rolling_campaign_store_js_1.RollingCampaignStore(pool, project.projectId)));
    }
    finally {
        await pool.end();
    }
}
async function runRollingOperationCli(argv) {
    const [command, argument] = argv;
    if (command === undefined || command === '--help') {
        process.stdout.write('Usage: rolling-operations <init request.json|reconcile campaign|status campaign|next-actions campaign|replenish campaign>\n');
        return;
    }
    if (argv.length !== 2 || argument === undefined || argument.trim() === '')
        throw new Error('rolling campaign: command requires exactly one request path or campaign ID');
    const root = node_fs_1.default.realpathSync(process.cwd());
    const result = await withRollingCampaignOperations(root, async (rollingCampaignOperations) => {
        switch (command) {
            case 'init': {
                const rollingCampaignInitializationV1 = parseRollingCampaignInitialization(node_fs_1.default.readFileSync(argument, 'utf8'));
                if (node_fs_1.default.realpathSync(rollingCampaignInitializationV1.coordinatorRoot) !== root)
                    throw new Error('rolling campaign: initialization root differs from the invoking project');
                return rollingCampaignOperations.initialize(rollingCampaignInitializationV1);
            }
            case 'reconcile': return rollingCampaignOperations.reconcile(argument);
            case 'status': return rollingCampaignOperations.status(argument);
            case 'next-actions': return rollingCampaignOperations.nextActions(argument);
            case 'replenish': return rollingCampaignOperations.replenish(argument, 'periodic');
            default: throw new Error(`rolling campaign: unknown operation ${command}`);
        }
    });
    process.stdout.write(JSON.stringify(result) + '\n');
}
if (require.main === module)
    runRollingOperationCli(process.argv.slice(2)).catch((error) => {
        process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
        process.exitCode = 1;
    });
