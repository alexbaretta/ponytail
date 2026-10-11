// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { dataError, toolError, exactKeys, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import { discoverCampaign } from './campaign-scope.js';
import { validateCampaignDependencies } from './campaign-dependencies.js';
import { validatePlanContents, type CampaignTaskletCounts, type CampaignTaskletRecord } from './campaign-plan-contents.js';

export interface CampaignRepositoryIdentity {
  readonly root: '.'; readonly worktree: '.'; readonly commit: string;
  readonly branch: string | null; readonly detached: boolean; readonly clean: boolean;
}
export interface CampaignReportPlanRecord {
  readonly id: string; readonly parentPlanId: string | null; readonly lifecycle: string; readonly path: string;
  readonly sprintCount: number; readonly taskletCounts: CampaignTaskletCounts; readonly totalTasklets: number;
}
export interface CampaignReportSprintRecord {
  readonly id: string; readonly planId: string; readonly planningStatus: string; readonly executionStatus: string | null;
  readonly taskletCounts: CampaignTaskletCounts; readonly totalTasklets: number;
}
export interface CampaignReportTotals {
  readonly plans: number; readonly plansByLifecycle: Readonly<Record<string, number>>;
  readonly sprints: number; readonly incompleteSprints: number;
  readonly sprintsByPlanningStatus: Readonly<Record<string, number>>; readonly sprintsByExecutionStatus: Readonly<Record<string, number>>;
  readonly incompleteSprintsByPlanningStatus: Readonly<Record<string, number>>; readonly incompleteSprintsByExecutionStatus: Readonly<Record<string, number>>;
  readonly tasklets: number; readonly taskletsByStatus: CampaignTaskletCounts;
  readonly doneTasklets: number; readonly taskletCompletionPercentage: number | null;
}
export interface CampaignReportV1 {
  readonly schemaVersion: 1; readonly valid: true;
  readonly invocation: { readonly command: 'report'; readonly input: string };
  readonly repository: CampaignRepositoryIdentity;
  readonly campaign: { readonly rootPlanId: string; readonly plans: readonly CampaignReportPlanRecord[];
    readonly sprints: readonly CampaignReportSprintRecord[]; readonly tasklets: readonly CampaignTaskletRecord[] };
  readonly totals: CampaignReportTotals;
}
export function validateCampaignRepositoryIdentity(value: unknown, label = 'campaign report repository'): asserts value is CampaignRepositoryIdentity {
  exactKeys(value, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], label);
  if (value.root !== '.' || value.worktree !== '.' || typeof value.commit !== 'string'
    || !(typeof value.branch === 'string' || value.branch === null)
    || typeof value.detached !== 'boolean' || typeof value.clean !== 'boolean') {
    dataError('CAMPAIGN_REPORT_SCHEMA', `${label} contains invalid values`);
  }
}
function isCount(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function validCountMap(value: unknown): value is Record<string, number> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(isCount);
}
function validTaskletCounts(value: unknown): value is CampaignTaskletCounts {
  return validCountMap(value) && Object.keys(value).sort().join(',') === 'DONE,ERROR,PENDING';
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function git(repositoryRoot: string, gitArguments: readonly string[], allowFailure = false): SpawnSyncReturns<string> {
  const result = spawnSync('git', ['-C', repositoryRoot, ...gitArguments], { encoding: 'utf8' });
  if (result.error) toolError('CAMPAIGN_GIT', result.error.message);
  if (result.status !== 0 && !allowFailure) toolError('CAMPAIGN_GIT', result.stderr.trim() || `git ${gitArguments.join(' ')} failed`);
  return result;
}

export function repositoryIdentity(repositoryRoot: string): CampaignRepositoryIdentity {
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

export function buildReport(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1, input?: string): CampaignReportV1 {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(canonicalRepositoryRoot, campaignManagementConfigV1, input);
  validateCampaignDependencies(campaign.plans);
  const planRecords: CampaignReportPlanRecord[] = [];
  const sprintRecords: CampaignReportSprintRecord[] = [];
  const taskletRecords: CampaignTaskletRecord[] = [];
  const plansByLifecycle = Object.fromEntries(campaignManagementConfigV1.lifecycle.directories.map((directory) => [directory, 0]));
  const sprintsByPlanningStatus: Record<string, number> = {};
  const sprintsByExecutionStatus: Record<string, number> = {};
  const incompleteSprintsByPlanningStatus: Record<string, number> = {};
  const incompleteSprintsByExecutionStatus: Record<string, number> = {};
  const taskletsByStatus: CampaignTaskletCounts = { PENDING: 0, DONE: 0, ERROR: 0 };
  for (const plan of campaign.plans) {
    const contents = validatePlanContents(plan, campaignManagementConfigV1, canonicalRepositoryRoot);
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
      taskletCounts: contents.tasklets.reduce<CampaignTaskletCounts>((counts, tasklet) => {
        counts[tasklet.status] += 1;
        return counts;
      }, { PENDING: 0, DONE: 0, ERROR: 0 }),
      totalTasklets: contents.tasklets.length,
    });
  }
  if (campaign.plans.length > 1 && campaign.root.lifecycle === campaignManagementConfigV1.lifecycle.roles.successfulCompletion) {
    const incomplete = campaign.plans.find((plan) => plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion);
    if (incomplete) dataError('CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${incomplete.id}`, campaign.root.id, campaign.root.relativePlanFile);
  }
  const totalTasklets = taskletRecords.length;
  const campaignReportV1: CampaignReportV1 = {
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

function validateCampaignReportV1(value: unknown): asserts value is CampaignReportV1 {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'campaign', 'totals'], 'campaign report');
  if (value.schemaVersion !== 1 || value.valid !== true) dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid V1 campaign report envelope');
  exactKeys(value.invocation, ['command', 'input'], 'campaign report invocation');
  validateCampaignRepositoryIdentity(value.repository);
  exactKeys(value.campaign, ['rootPlanId', 'plans', 'sprints', 'tasklets'], 'campaign report campaign');
  exactKeys(value.totals, ['plans', 'plansByLifecycle', 'sprints', 'incompleteSprints', 'sprintsByPlanningStatus', 'sprintsByExecutionStatus', 'incompleteSprintsByPlanningStatus', 'incompleteSprintsByExecutionStatus', 'tasklets', 'taskletsByStatus', 'doneTasklets', 'taskletCompletionPercentage'], 'campaign report totals');
  if (!Array.isArray(value.campaign.plans) || !Array.isArray(value.campaign.sprints) || !Array.isArray(value.campaign.tasklets)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report records must be arrays');
  }
  if (value.invocation.command !== 'report' || typeof value.invocation.input !== 'string'
    || typeof value.campaign.rootPlanId !== 'string') {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report envelope contains invalid values');
  }
  const counts = [value.totals.plans, value.totals.sprints, value.totals.incompleteSprints, value.totals.tasklets, value.totals.doneTasklets];
  if (counts.some((count) => !isCount(count))
    || !(value.totals.taskletCompletionPercentage === null
      || (typeof value.totals.taskletCompletionPercentage === 'number'
        && value.totals.taskletCompletionPercentage >= 0
        && value.totals.taskletCompletionPercentage <= 100))) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report totals contain invalid values');
  }
  const plans: readonly unknown[] = value.campaign.plans;
  const sprints: readonly unknown[] = value.campaign.sprints;
  const tasklets: readonly unknown[] = value.campaign.tasklets;
  if (![value.totals.plansByLifecycle, value.totals.sprintsByPlanningStatus,
    value.totals.sprintsByExecutionStatus, value.totals.incompleteSprintsByPlanningStatus,
    value.totals.incompleteSprintsByExecutionStatus, value.totals.taskletsByStatus].every(validCountMap)
    || !validTaskletCounts(value.totals.taskletsByStatus)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report grouped totals contain invalid values');
  }
  for (const record of plans) {
    exactKeys(record, ['id', 'parentPlanId', 'lifecycle', 'path', 'sprintCount', 'taskletCounts', 'totalTasklets'], 'campaign report plan');
    if (typeof record.id !== 'string' || !(typeof record.parentPlanId === 'string' || record.parentPlanId === null)
      || typeof record.lifecycle !== 'string' || typeof record.path !== 'string'
      || !isCount(record.sprintCount) || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report plan contains invalid values');
    }
  }
  for (const record of sprints) {
    exactKeys(record, ['id', 'planId', 'planningStatus', 'executionStatus', 'taskletCounts', 'totalTasklets'], 'campaign report sprint');
    if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.planningStatus !== 'string'
      || !(typeof record.executionStatus === 'string' || record.executionStatus === null)
      || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report sprint contains invalid values');
    }
  }
  for (const record of tasklets) {
    exactKeys(record, ['id', 'planId', 'sprintId', 'featureId', 'status', 'dependsOn', 'plannedPaths'], 'campaign report tasklet');
    if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.sprintId !== 'string'
      || !(typeof record.featureId === 'string' || record.featureId === null)
      || !(record.status === 'PENDING' || record.status === 'DONE' || record.status === 'ERROR')
      || !Array.isArray(record.dependsOn) || record.dependsOn.some((id: unknown) => typeof id !== 'string')
      || !Array.isArray(record.plannedPaths) || record.plannedPaths.some((item: unknown) => typeof item !== 'string')) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report tasklet contains invalid values');
    }
  }
}

export function readCampaignReportV1(value: unknown): CampaignReportV1 {
  validateCampaignReportV1(value);
  return value;
}

export interface CampaignReportTableOptions {
  readonly summaryTable?: boolean; readonly planTable?: boolean; readonly sprintTable?: boolean;
}
type CampaignReportTable = [(string | number)[], ...(string | number)[][]];

function percentage(value: number | null): string {
  return value === null ? 'unavailable (no tasklets)' : `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function taskletCountRow(label: string, campaignTaskletCounts: CampaignTaskletCounts): (string | number)[] {
  const total = campaignTaskletCounts.DONE + campaignTaskletCounts.PENDING + campaignTaskletCounts.ERROR;
  return [label, campaignTaskletCounts.DONE, campaignTaskletCounts.PENDING, campaignTaskletCounts.ERROR, total];
}

function formatTable(campaignReportTable: CampaignReportTable): string {
  const widths = campaignReportTable[0].map((_, column) => Math.max(...campaignReportTable.map(row => String(row[column]).length)));
  return campaignReportTable.map(row => widths.map((width, column) => {
    const value = row[column];
    const text = String(value);
    return typeof value === 'number' ? text.padStart(width) : text.padEnd(width);
  }).join('  ').trimEnd()).join('\n');
}

// Traceability: implements REQ-CAMPAIGN-CENSUS-CLI
export function humanReport(campaignReportV1: CampaignReportV1, worktree: string, campaignReportTableOptions: CampaignReportTableOptions = {}): string {
  const summaryTable = campaignReportTableOptions.summaryTable ?? true;
  const planTable = campaignReportTableOptions.planTable ?? false;
  const sprintTable = campaignReportTableOptions.sprintTable ?? false;
  const taskletsByPlanLifecycle: Record<string, CampaignTaskletCounts> = Object.fromEntries(
    Object.keys(campaignReportV1.totals.plansByLifecycle)
      .map((lifecycle) => [lifecycle, { PENDING: 0, DONE: 0, ERROR: 0 }]),
  );
  for (const plan of campaignReportV1.campaign.plans) {
    const campaignTaskletCounts = taskletsByPlanLifecycle[plan.lifecycle];
    if (campaignTaskletCounts === undefined) throw new Error(`report lifecycle counts are absent: ${plan.lifecycle}`);
    campaignTaskletCounts.PENDING += plan.taskletCounts.PENDING;
    campaignTaskletCounts.DONE += plan.taskletCounts.DONE;
    campaignTaskletCounts.ERROR += plan.taskletCounts.ERROR;
  }
  const incompleteSprints = campaignReportV1.campaign.sprints
    .filter((sprint) => sprint.executionStatus !== 'DONE');
  const taskletCampaignReportTable: CampaignReportTable = [['Plan lifecycle', 'DONE', 'PENDING', 'ERROR', 'Total']];
  for (const [lifecycle, taskletCounts] of Object.entries(taskletsByPlanLifecycle)) {
    taskletCampaignReportTable.push(taskletCountRow(lifecycle, taskletCounts));
  }
  taskletCampaignReportTable.push(taskletCountRow('Campaign total', campaignReportV1.totals.taskletsByStatus));
  const planCampaignReportTable: CampaignReportTable = [['Lifecycle', 'Plan', 'DONE', 'PENDING', 'ERROR', 'Total']];
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
    lines.push(
      '',
      'Tasklet census',
      formatTable(taskletCampaignReportTable),
      `Campaign completion: ${percentage(campaignReportV1.totals.taskletCompletionPercentage)} by tasklet count`,
      'PENDING and ERROR are distinct formal tasklet states.',
    );
  }
  if (planTable) lines.push('', 'Plan census', formatTable(planCampaignReportTable));
  if (sprintTable) {
    lines.push('', 'Incomplete sprint census');
    if (incompleteSprints.length === 0) {
      lines.push('None');
    } else {
      const sprintCampaignReportTable: CampaignReportTable = [['Plan/Sprint', 'Planning', 'Execution', 'DONE', 'PENDING', 'ERROR', 'Total']];
      for (const sprint of incompleteSprints) {
        sprintCampaignReportTable.push([`${sprint.planId}/${sprint.id}`, sprint.planningStatus, sprint.executionStatus ?? 'UNPLANNED', sprint.taskletCounts.DONE, sprint.taskletCounts.PENDING, sprint.taskletCounts.ERROR, sprint.totalTasklets]);
      }
      lines.push(formatTable(sprintCampaignReportTable));
    }
  }
  return `${lines.join('\n')}\n`;
}
