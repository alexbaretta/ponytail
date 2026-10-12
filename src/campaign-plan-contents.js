// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-plan-contents.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlanContents = validatePlanContents;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const sprint_metadata_js_1 = require("../skills/plan-execution/scripts/sprint-metadata.js");
const ready_sprints_js_1 = require("../skills/plan-execution/scripts/ready-sprints.js");
const sprint_graph_js_1 = require("../skills/plan-execution/scripts/sprint-graph.js");
const tasklet_statuses_js_1 = require("../skills/plan-execution/scripts/tasklet-statuses.js");
const tasklet_metadata_js_1 = require("../skills/plan-execution/scripts/tasklet-metadata.js");
const tasklet_graph_js_1 = require("../skills/plan-execution/scripts/tasklet-graph.js");
const ready_tasklets_js_1 = require("../skills/plan-execution/scripts/ready-tasklets.js");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
function validatePlanContents(campaignPlan, campaignManagementConfigV1, repositoryRoot) {
    let sprints;
    let sprintById;
    let executionReady;
    let reviewReady;
    let planningReady;
    let planningReviewReady;
    try {
        sprints = (0, sprint_metadata_js_1.readSprints)(campaignPlan.planDirectory);
        sprintById = (0, sprint_graph_js_1.validateDependencies)(sprints);
        if ((0, ready_sprints_js_1.isV1Sprints)(sprints))
            (0, sprint_graph_js_1.validatePathOwnership)(sprints, sprintById);
        if ((0, ready_sprints_js_1.isV3Sprints)(sprints))
            (0, sprint_graph_js_1.validateV3PathOwnership)(sprints, sprintById);
        planningReady = (0, ready_sprints_js_1.selectPlanningReadySprints)(sprints, sprintById);
        planningReviewReady = (0, ready_sprints_js_1.selectPlanningReviewableSprints)(sprints, sprintById);
        executionReady = (0, ready_sprints_js_1.selectExecutionRunnableSprints)(sprints, sprintById);
        reviewReady = (0, ready_sprints_js_1.selectExecutionReviewableSprints)(sprints, sprintById);
    }
    catch (error) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_SPRINT_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, campaignPlan.relativePlanFile);
    }
    const normalizedSprints = [];
    const normalizedTasklets = [];
    const taskletDependencies = [];
    let runnableCampaignSprintTasklets = null;
    let reviewableCampaignSprintTasklets = null;
    const obligationDocumentPath = campaignPlan.schemaVersion === 3 ? campaignPlan.obligationDocument : null;
    let obligationDocumentV1 = null;
    if (obligationDocumentPath) {
        try {
            (0, obligations_js_1.inputDigest)(repositoryRoot, obligationDocumentPath);
            obligationDocumentV1 = (0, obligations_js_1.parseObligationDocument)(node_fs_1.default.readFileSync(node_path_1.default.join(repositoryRoot, obligationDocumentPath), 'utf8'));
        }
        catch (error) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_OBLIGATION_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, obligationDocumentPath);
        }
    }
    const planningSprintId = planningReady[0];
    const campaignPlanningSprint = planningSprintId === undefined ? null : { sprintId: planningSprintId, planningStatus: 'STUB' };
    for (const sprint of sprints) {
        let campaignSprintTaskletState = null;
        if (sprint.execution !== null || node_fs_1.default.existsSync(sprint.filePath.replace(/\.md$/, '.tasklets.json'))) {
            try {
                const statuses = (0, tasklet_statuses_js_1.parseTaskletStatuses)(sprint.filePath, undefined, sprint.execution === null && sprint.planning.status === 'STUB');
                const graph = (0, tasklet_metadata_js_1.readTaskletGraph)(sprint.filePath);
                const derived = (0, tasklet_graph_js_1.validateTaskletGraph)(graph, statuses);
                campaignSprintTaskletState = { graph, statuses };
                if (executionReady.includes(sprint.id)) {
                    const taskletIds = obligationDocumentV1
                        ? (0, ready_tasklets_js_1.selectObligationTasklets)(graph, statuses, derived, null, obligationDocumentV1, repositoryRoot, campaignPlan.id).taskletIds
                        : (0, tasklet_graph_js_1.rankedReadyTasklets)(graph, statuses, derived, null).map(([id]) => id);
                    if (taskletIds.length > 0)
                        runnableCampaignSprintTasklets = { sprintId: sprint.id, taskletIds };
                }
                if ((reviewReady.includes(sprint.id) || planningReviewReady.includes(sprint.id)) && graph.tasklets.size > 0 && !reviewableCampaignSprintTasklets) {
                    reviewableCampaignSprintTasklets = { sprintId: sprint.id, taskletIds: [...graph.tasklets.keys()].sort() };
                }
            }
            catch (error) {
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_TASKLET_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, node_path_1.default.relative(repositoryRoot, sprint.filePath).split(node_path_1.default.sep).join('/'));
            }
        }
        const campaignTaskletCounts = { PENDING: 0, DONE: 0, ERROR: 0 };
        let totalTasklets = 0;
        if (sprint.execution !== null) {
            if (campaignSprintTaskletState === null)
                throw new Error(`execution sprint lacks tasklet state: ${sprint.id}`);
            totalTasklets = campaignSprintTaskletState.statuses.size;
        }
        if (campaignSprintTaskletState !== null) {
            const { graph, statuses } = campaignSprintTaskletState;
            for (const [id, tasklet] of [...graph.tasklets].sort(([left], [right]) => left.localeCompare(right))) {
                const status = statuses.get(id);
                if (status === undefined)
                    throw new Error(`validated tasklet lacks a status: ${id}`);
                taskletDependencies.push({ id, sprintId: sprint.id, status: sprint.execution === null ? 'PENDING' : status,
                    dependsOn: (0, tasklet_graph_js_1.effectiveDependencies)(graph, id), externalDependsOn: graph.schemaVersion === 4 ? graph.externalDependsOn.get(id) ?? [] : [] });
                if (sprint.execution === null)
                    continue;
                campaignTaskletCounts[status] += 1;
                normalizedTasklets.push({
                    id,
                    planId: campaignPlan.id,
                    sprintId: sprint.id,
                    featureId: 'feature' in tasklet ? tasklet.feature : null,
                    status,
                    dependsOn: [...tasklet.depends_on].sort(),
                    plannedPaths: [...('planned_paths' in tasklet ? tasklet.planned_paths : [])].sort(),
                });
            }
        }
        normalizedSprints.push({
            id: sprint.id,
            planId: campaignPlan.id,
            planningStatus: sprint.planning.status,
            executionStatus: sprint.execution?.status ?? null,
            taskletCounts: campaignTaskletCounts,
            totalTasklets,
        });
    }
    if (campaignPlan.lifecycle === campaignManagementConfigV1.lifecycle.roles.successfulCompletion) {
        if (obligationDocumentV1 && !(0, obligations_js_1.projectObligationHistoricalAcceptance)(obligationDocumentV1).complete)
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_OBLIGATION_INCOMPLETE', 'completed plan has unresolved obligations', campaignPlan.id, obligationDocumentPath);
        const unfinishedSprint = normalizedSprints.find((sprint) => sprint.executionStatus !== 'DONE');
        const unfinishedTasklet = normalizedTasklets.find((tasklet) => tasklet.status !== 'DONE');
        if (unfinishedSprint || unfinishedTasklet) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_CLOSED_INCOMPLETE', 'completed plan contains unfinished sprint or tasklet state', campaignPlan.id, campaignPlan.relativePlanFile);
        }
    }
    return { sprints: normalizedSprints, tasklets: normalizedTasklets, taskletDependencies, runnableTasklets: runnableCampaignSprintTasklets, reviewableSprint: reviewableCampaignSprintTasklets, planningSprint: campaignPlanningSprint };
}
