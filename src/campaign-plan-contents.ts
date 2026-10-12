// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { dataError, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import { type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from './campaign-plan-metadata.js';
import { type CampaignDependencyContents, type CampaignTaskletDependency } from './campaign-dependencies.js';
import { readSprints, type SprintV1, type SprintV2, type SprintV3, type SprintPlanningStatus, type SprintExecutionStatus } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { isV1Sprints, isV3Sprints, selectPlanningReadySprints, selectPlanningReviewableSprints,
  selectExecutionRunnableSprints, selectExecutionReviewableSprints } from '../skills/plan-execution/scripts/ready-sprints.js';
import { validateDependencies, validatePathOwnership, validateV3PathOwnership } from '../skills/plan-execution/scripts/sprint-graph.js';
import { parseTaskletStatuses, type TaskletStatus } from '../skills/plan-execution/scripts/tasklet-statuses.js';
import { readTaskletGraph, type TaskletGraphV1, type TaskletGraphV2, type TaskletGraphV3, type TaskletGraphV4 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { validateTaskletGraph, rankedReadyTasklets, effectiveDependencies } from '../skills/plan-execution/scripts/tasklet-graph.js';
import { selectObligationTasklets } from '../skills/plan-execution/scripts/ready-tasklets.js';
import { parseObligationDocument, inputDigest, projectObligationHistoricalAcceptance, type ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';

export interface CampaignTaskletCounts { PENDING: number; DONE: number; ERROR: number }
export interface CampaignSprintRecord {
  readonly id: string; readonly planId: string; readonly planningStatus: SprintPlanningStatus;
  readonly executionStatus: SprintExecutionStatus | null; readonly taskletCounts: CampaignTaskletCounts; readonly totalTasklets: number;
}
export interface CampaignTaskletRecord {
  readonly id: string; readonly planId: string; readonly sprintId: string; readonly featureId: string | null;
  readonly status: TaskletStatus; readonly dependsOn: readonly string[]; readonly plannedPaths: readonly string[];
}
export interface CampaignSprintTasklets { readonly sprintId: string; readonly taskletIds: readonly string[] }
export interface CampaignPlanningSprint { readonly sprintId: string; readonly planningStatus: 'STUB' }
export interface CampaignPlanContents extends CampaignDependencyContents {
  readonly sprints: readonly CampaignSprintRecord[]; readonly tasklets: readonly CampaignTaskletRecord[];
  readonly runnableTasklets: CampaignSprintTasklets | null; readonly reviewableSprint: CampaignSprintTasklets | null;
  readonly planningSprint: CampaignPlanningSprint | null;
}
interface CampaignSprintTaskletState {
  readonly graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4;
  readonly statuses: ReadonlyMap<string, TaskletStatus>;
}

export function validatePlanContents(campaignPlan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3, campaignManagementConfigV1: CampaignManagementConfigV1, repositoryRoot: string): CampaignPlanContents {
  let sprints: SprintV1[] | SprintV2[] | SprintV3[];
  let sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>;
  let executionReady: readonly string[];
  let reviewReady: readonly string[];
  let planningReady: readonly string[];
  let planningReviewReady: readonly string[];
  try {
    sprints = readSprints(campaignPlan.planDirectory);
    sprintById = validateDependencies<SprintV1 | SprintV2 | SprintV3>(sprints);
    if (isV1Sprints(sprints)) validatePathOwnership(sprints, sprintById);
    if (isV3Sprints(sprints)) validateV3PathOwnership(sprints, sprintById);
    planningReady = selectPlanningReadySprints(sprints, sprintById);
    planningReviewReady = selectPlanningReviewableSprints(sprints, sprintById);
    executionReady = selectExecutionRunnableSprints(sprints, sprintById);
    reviewReady = selectExecutionReviewableSprints(sprints, sprintById);
  } catch (error) {
    dataError('CAMPAIGN_SPRINT_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, campaignPlan.relativePlanFile);
  }
  const normalizedSprints: CampaignSprintRecord[] = [];
  const normalizedTasklets: CampaignTaskletRecord[] = [];
  const taskletDependencies: CampaignTaskletDependency[] = [];
  let runnableCampaignSprintTasklets: CampaignSprintTasklets | null = null;
  let reviewableCampaignSprintTasklets: CampaignSprintTasklets | null = null;
  const obligationDocumentPath = campaignPlan.schemaVersion === 3 ? campaignPlan.obligationDocument : null;
  let obligationDocumentV1: ObligationDocumentV1 | null = null;
  if (obligationDocumentPath) {
    try {
      inputDigest(repositoryRoot, obligationDocumentPath);
      obligationDocumentV1 = parseObligationDocument(fs.readFileSync(path.join(repositoryRoot, obligationDocumentPath), 'utf8'));
    } catch (error) { dataError('CAMPAIGN_OBLIGATION_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, obligationDocumentPath); }
  }
  const planningSprintId = planningReady[0];
  const campaignPlanningSprint: CampaignPlanningSprint | null = planningSprintId === undefined ? null : { sprintId: planningSprintId, planningStatus: 'STUB' };
  for (const sprint of sprints) {
    let campaignSprintTaskletState: CampaignSprintTaskletState | null = null;
    if (sprint.execution !== null || fs.existsSync(sprint.filePath.replace(/\.md$/, '.tasklets.json'))) {
      try {
        const statuses = parseTaskletStatuses(sprint.filePath, undefined, sprint.execution === null && sprint.planning.status === 'STUB');
        const graph = readTaskletGraph(sprint.filePath);
        const derived = validateTaskletGraph(graph, statuses);
        campaignSprintTaskletState = { graph, statuses };
        if (executionReady.includes(sprint.id)) {
          const taskletIds = obligationDocumentV1
            ? selectObligationTasklets(graph, statuses, derived, null, obligationDocumentV1, repositoryRoot, campaignPlan.id).taskletIds
            : rankedReadyTasklets(graph, statuses, derived, null).map(([id]) => id);
          if (taskletIds.length > 0) runnableCampaignSprintTasklets = { sprintId: sprint.id, taskletIds };
        }
        if ((reviewReady.includes(sprint.id) || planningReviewReady.includes(sprint.id)) && graph.tasklets.size > 0 && !reviewableCampaignSprintTasklets) {
          reviewableCampaignSprintTasklets = { sprintId: sprint.id, taskletIds: [...graph.tasklets.keys()].sort() };
        }
      } catch (error) {
        dataError('CAMPAIGN_TASKLET_INVALID', error instanceof Error ? error.message : String(error), campaignPlan.id, path.relative(repositoryRoot, sprint.filePath).split(path.sep).join('/'));
      }
    }
    const campaignTaskletCounts: CampaignTaskletCounts = { PENDING: 0, DONE: 0, ERROR: 0 };
    let totalTasklets = 0;
    if (sprint.execution !== null) {
      if (campaignSprintTaskletState === null) throw new Error(`execution sprint lacks tasklet state: ${sprint.id}`);
      totalTasklets = campaignSprintTaskletState.statuses.size;
    }
    if (campaignSprintTaskletState !== null) {
      const { graph, statuses } = campaignSprintTaskletState;
      for (const [id, tasklet] of [...graph.tasklets].sort(([left], [right]) => left.localeCompare(right))) {
        const status = statuses.get(id);
        if (status === undefined) throw new Error(`validated tasklet lacks a status: ${id}`);
        taskletDependencies.push({ id, sprintId: sprint.id, status: sprint.execution === null ? 'PENDING' : status,
          dependsOn: effectiveDependencies(graph, id), externalDependsOn: graph.schemaVersion === 4 ? graph.externalDependsOn.get(id) ?? [] : [] });
        if (sprint.execution === null) continue;
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
    if (obligationDocumentV1 && !projectObligationHistoricalAcceptance(obligationDocumentV1).complete) dataError('CAMPAIGN_OBLIGATION_INCOMPLETE', 'completed plan has unresolved obligations', campaignPlan.id, obligationDocumentPath);
    const unfinishedSprint = normalizedSprints.find((sprint) => sprint.executionStatus !== 'DONE');
    const unfinishedTasklet = normalizedTasklets.find((tasklet) => tasklet.status !== 'DONE');
    if (unfinishedSprint || unfinishedTasklet) {
      dataError('CAMPAIGN_PLAN_CLOSED_INCOMPLETE', 'completed plan contains unfinished sprint or tasklet state', campaignPlan.id, campaignPlan.relativePlanFile);
    }
  }
  return { sprints: normalizedSprints, tasklets: normalizedTasklets, taskletDependencies, runnableTasklets: runnableCampaignSprintTasklets, reviewableSprint: reviewableCampaignSprintTasklets, planningSprint: campaignPlanningSprint };
}
