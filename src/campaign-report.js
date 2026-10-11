// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-report.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCampaignRepositoryIdentity = validateCampaignRepositoryIdentity;
exports.repositoryIdentity = repositoryIdentity;
exports.buildReport = buildReport;
exports.readCampaignReportV1 = readCampaignReportV1;
exports.humanReport = humanReport;
const node_fs_1 = __importDefault(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_scope_js_1 = require("./campaign-scope.js");
const campaign_dependencies_js_1 = require("./campaign-dependencies.js");
const campaign_plan_contents_js_1 = require("./campaign-plan-contents.js");
function validateCampaignRepositoryIdentity(value, label = 'campaign report repository') {
    (0, campaign_configuration_js_1.exactKeys)(value, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], label);
    if (value.root !== '.' || value.worktree !== '.' || typeof value.commit !== 'string'
        || !(typeof value.branch === 'string' || value.branch === null)
        || typeof value.detached !== 'boolean' || typeof value.clean !== 'boolean') {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', `${label} contains invalid values`);
    }
}
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
    validateCampaignRepositoryIdentity(value.repository);
    (0, campaign_configuration_js_1.exactKeys)(value.campaign, ['rootPlanId', 'plans', 'sprints', 'tasklets'], 'campaign report campaign');
    (0, campaign_configuration_js_1.exactKeys)(value.totals, ['plans', 'plansByLifecycle', 'sprints', 'incompleteSprints', 'sprintsByPlanningStatus', 'sprintsByExecutionStatus', 'incompleteSprintsByPlanningStatus', 'incompleteSprintsByExecutionStatus', 'tasklets', 'taskletsByStatus', 'doneTasklets', 'taskletCompletionPercentage'], 'campaign report totals');
    if (!Array.isArray(value.campaign.plans) || !Array.isArray(value.campaign.sprints) || !Array.isArray(value.campaign.tasklets)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign report records must be arrays');
    }
    if (value.invocation.command !== 'report' || typeof value.invocation.input !== 'string'
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
function percentage(value) {
    return value === null ? 'unavailable (no tasklets)' : `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}
function taskletCountRow(label, campaignTaskletCounts) {
    const total = campaignTaskletCounts.DONE + campaignTaskletCounts.PENDING + campaignTaskletCounts.ERROR;
    return [label, campaignTaskletCounts.DONE, campaignTaskletCounts.PENDING, campaignTaskletCounts.ERROR, total];
}
function formatTable(campaignReportTable) {
    const widths = campaignReportTable[0].map((_, column) => Math.max(...campaignReportTable.map(row => String(row[column]).length)));
    return campaignReportTable.map(row => widths.map((width, column) => {
        const value = row[column];
        const text = String(value);
        return typeof value === 'number' ? text.padStart(width) : text.padEnd(width);
    }).join('  ').trimEnd()).join('\n');
}
function humanReport(campaignReportV1, worktree, campaignReportTableOptions = {}) {
    const summaryTable = campaignReportTableOptions.summaryTable ?? true;
    const planTable = campaignReportTableOptions.planTable ?? false;
    const sprintTable = campaignReportTableOptions.sprintTable ?? false;
    const taskletsByPlanLifecycle = Object.fromEntries(Object.keys(campaignReportV1.totals.plansByLifecycle)
        .map((lifecycle) => [lifecycle, { PENDING: 0, DONE: 0, ERROR: 0 }]));
    for (const plan of campaignReportV1.campaign.plans) {
        const campaignTaskletCounts = taskletsByPlanLifecycle[plan.lifecycle];
        if (campaignTaskletCounts === undefined)
            throw new Error(`report lifecycle counts are absent: ${plan.lifecycle}`);
        campaignTaskletCounts.PENDING += plan.taskletCounts.PENDING;
        campaignTaskletCounts.DONE += plan.taskletCounts.DONE;
        campaignTaskletCounts.ERROR += plan.taskletCounts.ERROR;
    }
    const incompleteSprints = campaignReportV1.campaign.sprints
        .filter((sprint) => sprint.executionStatus !== 'DONE');
    const taskletCampaignReportTable = [['Plan lifecycle', 'DONE', 'PENDING', 'ERROR', 'Total']];
    for (const [lifecycle, taskletCounts] of Object.entries(taskletsByPlanLifecycle)) {
        taskletCampaignReportTable.push(taskletCountRow(lifecycle, taskletCounts));
    }
    taskletCampaignReportTable.push(taskletCountRow('Campaign total', campaignReportV1.totals.taskletsByStatus));
    const planCampaignReportTable = [['Lifecycle', 'Plan', 'DONE', 'PENDING', 'ERROR', 'Total']];
    for (const plan of campaignReportV1.campaign.plans) {
        planCampaignReportTable.push([plan.lifecycle, plan.id, plan.taskletCounts.DONE, plan.taskletCounts.PENDING, plan.taskletCounts.ERROR, plan.totalTasklets]);
    }
    const lines = [
        `Campaign: ${campaignReportV1.campaign.rootPlanId}`,
        `Worktree: ${worktree}`,
        `Revision: ${campaignReportV1.repository.commit} (${campaignReportV1.repository.branch ?? 'detached'}, ${campaignReportV1.repository.clean ? 'clean' : 'dirty'})`,
        `Plans: ${campaignReportV1.totals.plans}; Sprints: ${campaignReportV1.totals.sprints} (${campaignReportV1.totals.incompleteSprints} incomplete)`,
    ];
    if (summaryTable) {
        lines.push('', 'Tasklet census', formatTable(taskletCampaignReportTable), `Campaign completion: ${percentage(campaignReportV1.totals.taskletCompletionPercentage)} by tasklet count`, 'PENDING and ERROR are distinct formal tasklet states.');
    }
    if (planTable)
        lines.push('', 'Plan census', formatTable(planCampaignReportTable));
    if (sprintTable) {
        lines.push('', 'Incomplete sprint census');
        if (incompleteSprints.length === 0) {
            lines.push('None');
        }
        else {
            const sprintCampaignReportTable = [['Plan/Sprint', 'Planning', 'Execution', 'DONE', 'PENDING', 'ERROR', 'Total']];
            for (const sprint of incompleteSprints) {
                sprintCampaignReportTable.push([`${sprint.planId}/${sprint.id}`, sprint.planningStatus, sprint.executionStatus ?? 'UNPLANNED', sprint.taskletCounts.DONE, sprint.taskletCounts.PENDING, sprint.taskletCounts.ERROR, sprint.totalTasklets]);
            }
            lines.push(formatTable(sprintCampaignReportTable));
        }
    }
    return `${lines.join('\n')}\n`;
}
