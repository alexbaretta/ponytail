// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-report.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoryIdentity = repositoryIdentity;
exports.buildReport = buildReport;
exports.readCampaignReportV1 = readCampaignReportV1;
const node_fs_1 = __importDefault(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_scope_js_1 = require("./campaign-scope.js");
const campaign_dependencies_js_1 = require("./campaign-dependencies.js");
const campaign_plan_contents_js_1 = require("./campaign-plan-contents.js");
function isCount(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function validCountMap(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(isCount);
}
function validTaskletCounts(value) {
    return validCountMap(value) && Object.keys(value).sort().join(',') === 'DONE,ERROR,PENDING';
}
function increment(record, key) {
    record[key] = (record[key] ?? 0) + 1;
}
function git(repositoryRoot, gitArguments, allowFailure = false) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', repositoryRoot, ...gitArguments], { encoding: 'utf8' });
    if (result.error)
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_GIT', result.error.message);
    if (result.status !== 0 && !allowFailure)
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_GIT', result.stderr.trim() || `git ${gitArguments.join(' ')} failed`);
    return result;
}
function repositoryIdentity(repositoryRoot) {
    const commit = git(repositoryRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const branchResult = git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'], true);
    const status = git(repositoryRoot, ['status', '--porcelain']).stdout;
    return {
        root: '.',
        worktree: '.',
        commit,
        branch: branchResult.status === 0 ? branchResult.stdout.trim() : null,
        detached: branchResult.status !== 0,
        clean: status.length === 0,
    };
}
function buildReport(repositoryRoot, campaignManagementConfigV1, input) {
    const canonicalRepositoryRoot = node_fs_1.default.realpathSync(repositoryRoot);
    const campaign = (0, campaign_scope_js_1.discoverCampaign)(canonicalRepositoryRoot, campaignManagementConfigV1, input);
    (0, campaign_dependencies_js_1.validateCampaignDependencies)(campaign.plans);
    const planRecords = [];
    const sprintRecords = [];
    const taskletRecords = [];
    const plansByLifecycle = Object.fromEntries(campaignManagementConfigV1.lifecycle.directories.map((directory) => [directory, 0]));
    const sprintsByPlanningStatus = {};
    const sprintsByExecutionStatus = {};
    const incompleteSprintsByPlanningStatus = {};
    const incompleteSprintsByExecutionStatus = {};
    const taskletsByStatus = { PENDING: 0, DONE: 0, ERROR: 0 };
    for (const plan of campaign.plans) {
        const contents = (0, campaign_plan_contents_js_1.validatePlanContents)(plan, campaignManagementConfigV1, canonicalRepositoryRoot);
        increment(plansByLifecycle, plan.lifecycle);
        for (const sprint of contents.sprints) {
            increment(sprintsByPlanningStatus, sprint.planningStatus);
            increment(sprintsByExecutionStatus, sprint.executionStatus ?? 'UNPLANNED');
            if (sprint.executionStatus !== 'DONE') {
                increment(incompleteSprintsByPlanningStatus, sprint.planningStatus);
                increment(incompleteSprintsByExecutionStatus, sprint.executionStatus ?? 'UNPLANNED');
            }
            sprintRecords.push(sprint);
        }
        for (const tasklet of contents.tasklets) {
            taskletsByStatus[tasklet.status] += 1;
            taskletRecords.push(tasklet);
        }
        planRecords.push({
            id: plan.id,
            parentPlanId: plan.parentPlanId,
            lifecycle: plan.lifecycle,
            path: plan.relativePlanFile,
            sprintCount: contents.sprints.length,
            taskletCounts: contents.tasklets.reduce((counts, tasklet) => {
                counts[tasklet.status] += 1;
                return counts;
            }, { PENDING: 0, DONE: 0, ERROR: 0 }),
            totalTasklets: contents.tasklets.length,
        });
    }
    if (campaign.plans.length > 1 && campaign.root.lifecycle === campaignManagementConfigV1.lifecycle.roles.successfulCompletion) {
        const incomplete = campaign.plans.find((plan) => plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion);
        if (incomplete)
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${incomplete.id}`, campaign.root.id, campaign.root.relativePlanFile);
    }
    const totalTasklets = taskletRecords.length;
    const campaignReportV1 = {
        schemaVersion: 1,
        valid: true,
        invocation: {
            command: 'report',
            input: campaign.invocationInput,
        },
        repository: repositoryIdentity(canonicalRepositoryRoot),
        campaign: {
            rootPlanId: campaign.root.id,
            plans: planRecords,
            sprints: sprintRecords,
            tasklets: taskletRecords,
        },
        totals: {
            plans: planRecords.length,
            plansByLifecycle,
            sprints: sprintRecords.length,
            incompleteSprints: sprintRecords.filter((sprint) => sprint.executionStatus !== 'DONE').length,
            sprintsByPlanningStatus,
            sprintsByExecutionStatus,
            incompleteSprintsByPlanningStatus,
            incompleteSprintsByExecutionStatus,
            tasklets: totalTasklets,
            taskletsByStatus,
            doneTasklets: taskletsByStatus.DONE,
            taskletCompletionPercentage: totalTasklets === 0 ? null : (taskletsByStatus.DONE * 100) / totalTasklets,
        },
    };
    return readCampaignReportV1(campaignReportV1);
}
function validateCampaignReportV1(value) {
    (0, campaign_configuration_js_1.exactKeys)(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'campaign', 'totals'], 'campaign report');
    if (value.schemaVersion !== 1 || value.valid !== true)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'invalid V1 campaign report envelope');
    (0, campaign_configuration_js_1.exactKeys)(value.invocation, ['command', 'input'], 'campaign report invocation');
    (0, campaign_configuration_js_1.exactKeys)(value.repository, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], 'campaign report repository');
    (0, campaign_configuration_js_1.exactKeys)(value.campaign, ['rootPlanId', 'plans', 'sprints', 'tasklets'], 'campaign report campaign');
    (0, campaign_configuration_js_1.exactKeys)(value.totals, ['plans', 'plansByLifecycle', 'sprints', 'incompleteSprints', 'sprintsByPlanningStatus', 'sprintsByExecutionStatus', 'incompleteSprintsByPlanningStatus', 'incompleteSprintsByExecutionStatus', 'tasklets', 'taskletsByStatus', 'doneTasklets', 'taskletCompletionPercentage'], 'campaign report totals');
    if (!Array.isArray(value.campaign.plans) || !Array.isArray(value.campaign.sprints) || !Array.isArray(value.campaign.tasklets)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report records must be arrays');
    }
    if (value.invocation.command !== 'report' || typeof value.invocation.input !== 'string'
        || value.repository.root !== '.' || value.repository.worktree !== '.'
        || typeof value.repository.commit !== 'string'
        || !(typeof value.repository.branch === 'string' || value.repository.branch === null)
        || typeof value.repository.detached !== 'boolean' || typeof value.repository.clean !== 'boolean'
        || typeof value.campaign.rootPlanId !== 'string') {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report envelope contains invalid values');
    }
    const counts = [value.totals.plans, value.totals.sprints, value.totals.incompleteSprints, value.totals.tasklets, value.totals.doneTasklets];
    if (counts.some((count) => !isCount(count))
        || !(value.totals.taskletCompletionPercentage === null
            || (typeof value.totals.taskletCompletionPercentage === 'number'
                && value.totals.taskletCompletionPercentage >= 0
                && value.totals.taskletCompletionPercentage <= 100))) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report totals contain invalid values');
    }
    const plans = value.campaign.plans;
    const sprints = value.campaign.sprints;
    const tasklets = value.campaign.tasklets;
    if (![value.totals.plansByLifecycle, value.totals.sprintsByPlanningStatus,
        value.totals.sprintsByExecutionStatus, value.totals.incompleteSprintsByPlanningStatus,
        value.totals.incompleteSprintsByExecutionStatus, value.totals.taskletsByStatus].every(validCountMap)
        || !validTaskletCounts(value.totals.taskletsByStatus)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report grouped totals contain invalid values');
    }
    for (const record of plans) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['id', 'parentPlanId', 'lifecycle', 'path', 'sprintCount', 'taskletCounts', 'totalTasklets'], 'campaign report plan');
        if (typeof record.id !== 'string' || !(typeof record.parentPlanId === 'string' || record.parentPlanId === null)
            || typeof record.lifecycle !== 'string' || typeof record.path !== 'string'
            || !isCount(record.sprintCount) || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report plan contains invalid values');
        }
    }
    for (const record of sprints) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['id', 'planId', 'planningStatus', 'executionStatus', 'taskletCounts', 'totalTasklets'], 'campaign report sprint');
        if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.planningStatus !== 'string'
            || !(typeof record.executionStatus === 'string' || record.executionStatus === null)
            || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report sprint contains invalid values');
        }
    }
    for (const record of tasklets) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['id', 'planId', 'sprintId', 'featureId', 'status', 'dependsOn', 'plannedPaths'], 'campaign report tasklet');
        if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.sprintId !== 'string'
            || !(typeof record.featureId === 'string' || record.featureId === null)
            || !(record.status === 'PENDING' || record.status === 'DONE' || record.status === 'ERROR')
            || !Array.isArray(record.dependsOn) || record.dependsOn.some((id) => typeof id !== 'string')
            || !Array.isArray(record.plannedPaths) || record.plannedPaths.some((item) => typeof item !== 'string')) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report tasklet contains invalid values');
        }
    }
}
function readCampaignReportV1(value) {
    validateCampaignReportV1(value);
    return value;
}
