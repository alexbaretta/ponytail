// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { dataError } from './campaign-configuration.js';
import { type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from './campaign-plan-metadata.js';
import { parseTaskletStatuses, type TaskletStatus } from '../skills/plan-execution/scripts/tasklet-statuses.js';

export interface ExternalTaskletDependency { readonly planId: string; readonly taskletId: string }
export interface CampaignTaskletDependency {
  readonly id: string;
  readonly sprintId: string;
  readonly status: TaskletStatus;
  readonly dependsOn: readonly string[];
  readonly externalDependsOn: readonly ExternalTaskletDependency[];
}
export interface CampaignDependencyContents { readonly taskletDependencies: readonly CampaignTaskletDependency[] }
interface CampaignDependencyTasklet extends CampaignTaskletDependency { readonly planId: string; readonly path: string }
export interface CampaignTaskletPrerequisite {
  readonly planId: string; readonly sprintId: string; readonly taskletId: string;
  readonly requiredPlanId: string; readonly requiredTaskletId: string; readonly status: TaskletStatus;
}
export interface CampaignDependencyResult { readonly blockedSprints: ReadonlySet<string>; readonly prerequisites: readonly CampaignTaskletPrerequisite[] }

export function validateCampaignDependencies(plans: readonly (CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3)[]): void {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  for (const plan of plans) {
    for (const dependencyId of plan.dependsOn) {
      if (!plansById.has(dependencyId)) {
        dataError('CAMPAIGN_DEPENDENCY_MISSING', `dependency is not a member of campaign ${plans[0]?.id}: ${dependencyId}`, plan.id, plan.relativePlanFile);
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (plan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3): void => {
    if (visiting.has(plan.id)) dataError('CAMPAIGN_DEPENDENCY_CYCLE', `dependency cycle reaches ${plan.id}`, plan.id, plan.relativePlanFile);
    if (visited.has(plan.id)) return;
    visiting.add(plan.id);
    for (const dependencyId of plan.dependsOn) {
      const dependency = plansById.get(dependencyId);
      if (dependency === undefined) throw new Error('validated campaign dependency is absent');
      visit(dependency);
    }
    visiting.delete(plan.id);
    visited.add(plan.id);
  };
  for (const plan of plans) visit(plan);
}

export function validateExternalTaskletDependencies(repositoryRoot: string, plans: readonly (CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3)[], contents: ReadonlyMap<string, CampaignDependencyContents>): CampaignDependencyResult {
  const tasklets = new Map<string, CampaignDependencyTasklet>();
  for (const plan of plans) {
    const campaignDependencyContents = contents.get(plan.id);
    if (campaignDependencyContents === undefined) throw new Error(`campaign dependency contents are absent: ${plan.id}`);
    for (const tasklet of campaignDependencyContents.taskletDependencies) {
      tasklets.set(`${plan.id}\0${tasklet.id}`, { ...tasklet, planId: plan.id, path: plan.relativePlanFile });
    }
  }
  const blockedSprints = new Set<string>();
  const prerequisites: CampaignTaskletPrerequisite[] = [];
  const edges = new Map<string, readonly string[]>();
  const integratedSprints = new Map<string, Map<string, TaskletStatus>>();
  const integratedStatus = (campaignDependencyTasklet: CampaignDependencyTasklet): TaskletStatus => {
    const sprintFile = path.posix.join(path.posix.dirname(campaignDependencyTasklet.path), 'sprints', `${campaignDependencyTasklet.sprintId}.md`);
    if (!integratedSprints.has(sprintFile)) {
      const result = spawnSync('git', ['-C', repositoryRoot, 'show', `HEAD:${sprintFile}`], { encoding: 'utf8' });
      integratedSprints.set(sprintFile, result.status === 0 ? parseTaskletStatuses(sprintFile, result.stdout) : new Map());
    }
    const statuses = integratedSprints.get(sprintFile);
    if (statuses === undefined) throw new Error('integrated sprint status cache is absent');
    return campaignDependencyTasklet.status === 'DONE' && statuses.get(campaignDependencyTasklet.id) === 'DONE' ? 'DONE'
      : campaignDependencyTasklet.status === 'ERROR' ? 'ERROR' : 'PENDING';
  };
  for (const [key, tasklet] of tasklets) {
    const dependencies = tasklet.dependsOn.map((id) => `${tasklet.planId}\0${id}`);
    for (const external of tasklet.externalDependsOn) {
      const target = tasklets.get(`${external.planId}\0${external.taskletId}`);
      if (!target || external.planId === tasklet.planId) {
        dataError('CAMPAIGN_TASKLET_DEPENDENCY', `external tasklet prerequisite must name another campaign plan and an existing tasklet: ${external.planId}/${external.taskletId}`, tasklet.planId, tasklet.path);
      }
      const status = integratedStatus(target);
      if (tasklet.status === 'DONE' && status !== 'DONE') {
        dataError('CAMPAIGN_TASKLET_DEPENDENCY', `completed tasklet ${tasklet.id} has unfinished external prerequisite ${external.planId}/${external.taskletId}`, tasklet.planId, tasklet.path);
      }
      if (status !== 'DONE') blockedSprints.add(`${tasklet.planId}\0${tasklet.sprintId}`);
      prerequisites.push({ planId: tasklet.planId, sprintId: tasklet.sprintId, taskletId: tasklet.id,
        requiredPlanId: external.planId, requiredTaskletId: external.taskletId, status });
      dependencies.push(`${external.planId}\0${external.taskletId}`);
    }
    edges.set(key, dependencies);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visiting.has(key)) {
      const tasklet = tasklets.get(key);
      if (tasklet === undefined) throw new Error(`campaign dependency tasklet is absent: ${key}`);
      dataError('CAMPAIGN_TASKLET_DEPENDENCY_CYCLE', `cross-plan tasklet dependency cycle reaches ${tasklet.planId}/${tasklet.id}`, tasklet.planId, tasklet.path);
    }
    if (visited.has(key)) return;
    visiting.add(key);
    const dependencies = edges.get(key);
    if (dependencies === undefined) throw new Error(`campaign dependency edges are absent: ${key}`);
    for (const dependency of dependencies) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  };
  for (const key of tasklets.keys()) visit(key);
  return { blockedSprints, prerequisites: prerequisites.sort((left, right) =>
    JSON.stringify([left.planId, left.sprintId, left.taskletId, left.requiredPlanId, left.requiredTaskletId])
      .localeCompare(JSON.stringify([right.planId, right.sprintId, right.taskletId, right.requiredPlanId, right.requiredTaskletId]))) };
}
