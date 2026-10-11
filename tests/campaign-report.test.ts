// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readCampaignReportV1, humanReport, type CampaignReportV1, type CampaignReportTableOptions } from '../src/campaign-report.js';
import { CampaignError } from '../src/campaign-configuration.js';

function report(): CampaignReportV1 {
  return { schemaVersion: 1, valid: true, invocation: { command: 'report', input: 'plan' },
    repository: { root: '.', worktree: '.', commit: 'revision', branch: null, detached: true, clean: true },
    campaign: { rootPlanId: 'plan', plans: [{ id: 'plan', parentPlanId: null, lifecycle: 'legacy', path: 'pm/plans/plan/plan.md',
      sprintCount: 1, taskletCounts: { PENDING: 1, DONE: 0, ERROR: 0 }, totalTasklets: 1 }],
    sprints: [{ id: 'S01', planId: 'plan', planningStatus: 'historical planning', executionStatus: 'historical execution',
      taskletCounts: { PENDING: 1, DONE: 0, ERROR: 0 }, totalTasklets: 1 }],
    tasklets: [{ id: 'S01-F01-T01', planId: 'plan', sprintId: 'S01', featureId: null, status: 'PENDING', dependsOn: [], plannedPaths: [] }] },
    totals: { plans: 1, plansByLifecycle: { legacy: 1 }, sprints: 1, incompleteSprints: 1,
      sprintsByPlanningStatus: { 'historical planning': 1 }, sprintsByExecutionStatus: { 'historical execution': 1 },
      incompleteSprintsByPlanningStatus: { 'historical planning': 1 }, incompleteSprintsByExecutionStatus: { 'historical execution': 1 },
      tasklets: 1, taskletsByStatus: { PENDING: 1, DONE: 0, ERROR: 0 }, doneTasklets: 0, taskletCompletionPercentage: 0 } };
}
function schemaError(value: unknown): void {
  assert.throws(() => readCampaignReportV1(value), error => error instanceof CampaignError && error.status === 1);
}

test('V1 report reader preserves input identity and historical sprint status strings', () => {
  const campaignReportV1: CampaignReportV1 = report();
  assert.equal(readCampaignReportV1(campaignReportV1), campaignReportV1);
});

test('V1 report reader validates count maps and nested unknown records', () => {
  const campaignReportV1: CampaignReportV1 = report();
  schemaError({ ...campaignReportV1, extra: true });
  for (const count of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
    schemaError({ ...campaignReportV1, totals: { ...campaignReportV1.totals, plans: count } });
    schemaError({ ...campaignReportV1, totals: { ...campaignReportV1.totals, plansByLifecycle: { legacy: count } } });
  }
  schemaError({ ...campaignReportV1, totals: { ...campaignReportV1.totals, taskletsByStatus: { PENDING: 1, DONE: 0 } } });
  schemaError({ ...campaignReportV1, campaign: { ...campaignReportV1.campaign, tasklets: [{ id: 'invalid' }] } });
  const tasklet = campaignReportV1.campaign.tasklets[0];
  assert.ok(tasklet);
  schemaError({ ...campaignReportV1, campaign: { ...campaignReportV1.campaign, tasklets: [{ ...tasklet, status: 'UNKNOWN' }] } });
  schemaError({ ...campaignReportV1, campaign: { ...campaignReportV1.campaign, tasklets: [{ ...tasklet, dependsOn: [1] }] } });
});

test('V1 report reader retains the explicit null percentage for empty execution', () => {
  const campaignReportV1: CampaignReportV1 = { ...report(), campaign: { rootPlanId: 'plan', plans: [], sprints: [], tasklets: [] },
    totals: { plans: 0, plansByLifecycle: {}, sprints: 0, incompleteSprints: 0, sprintsByPlanningStatus: {}, sprintsByExecutionStatus: {},
      incompleteSprintsByPlanningStatus: {}, incompleteSprintsByExecutionStatus: {}, tasklets: 0,
      taskletsByStatus: { PENDING: 0, DONE: 0, ERROR: 0 }, doneTasklets: 0, taskletCompletionPercentage: null } };
  assert.equal(readCampaignReportV1(campaignReportV1).totals.taskletCompletionPercentage, null);
});

test('typed presentation retains exact header output and independently selected tables', () => {
  const campaignReportV1: CampaignReportV1 = report();
  const campaignReportTableOptions: CampaignReportTableOptions = { summaryTable: false };
  assert.equal(humanReport(campaignReportV1, 'checkout', campaignReportTableOptions),
    'Campaign: plan\nWorktree: checkout\nRevision: revision (detached, clean)\nPlans: 1; Sprints: 1 (1 incomplete)\n');
  const tables = humanReport(campaignReportV1, 'checkout', { summaryTable: false, planTable: true, sprintTable: true });
  assert.doesNotMatch(tables, /Tasklet census/);
  assert.match(tables, /Plan census\nLifecycle  Plan  DONE  PENDING  ERROR  Total/);
  assert.match(tables, /Incomplete sprint census\n/);
  assert.match(tables, /historical planning\s+historical execution/);
});
