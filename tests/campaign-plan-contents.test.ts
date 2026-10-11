// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import { type CampaignPlanV1, type CampaignPlanMetadataV1 } from '../src/campaign-plan-metadata.js';
import { validatePlanContents, type CampaignPlanContents } from '../src/campaign-plan-contents.js';
import { type SprintMetadataV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';

function configuration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'none',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
}
function plan(root: string): CampaignPlanV1 {
  const planDirectory = path.join(root, 'pm/plans/open/plan');
  fs.mkdirSync(path.join(planDirectory, 'sprints'), { recursive: true });
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'plan', parent_plan_id: null };
  const text = `Plan ID: plan\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n`;
  const planFile = path.join(planDirectory, 'plan.md');
  fs.writeFileSync(planFile, text);
  return { schemaVersion: 1, id: 'plan', parentPlanId: null, dependsOn: [], lifecycle: 'open', planDirectory, planFile,
    relativePlanFile: 'pm/plans/open/plan/plan.md', text };
}
function sprint(campaignPlanV1: CampaignPlanV1, sprintMetadataV3: SprintMetadataV3, headings = ''): void {
  fs.writeFileSync(path.join(campaignPlanV1.planDirectory, 'sprints/S01.md'), `# Sprint\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n${headings}`);
}

test('planning-only contents retain zero execution counts without requiring tasklet metadata', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-contents-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignPlanV1: CampaignPlanV1 = plan(root);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'STUB', depends_on: [], scope_roots: ['src'] }, execution: null };
  sprint(campaignPlanV1, sprintMetadataV3);
  const campaignPlanContents: CampaignPlanContents = validatePlanContents(campaignPlanV1, campaignManagementConfigV1, root);
  assert.deepEqual(campaignPlanContents, { sprints: [{ id: 'S01', planId: 'plan', planningStatus: 'STUB', executionStatus: null,
    taskletCounts: { PENDING: 0, DONE: 0, ERROR: 0 }, totalTasklets: 0 }], tasklets: [], taskletDependencies: [],
    runnableTasklets: null, reviewableSprint: null, planningSprint: { sprintId: 'S01', planningStatus: 'STUB' } });
});

test('execution contents retain normalized statuses, feature paths and exact ready tasklet scope', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-contents-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignPlanV1: CampaignPlanV1 = plan(root);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } };
  sprint(campaignPlanV1, sprintMetadataV3, '### [DONE] Tasklet S01-F01-T01: implement\n### [ ] Tasklet S01-F01-T02: validate\n');
  const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: 'S01', features: {
    'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } }, tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src/input.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } };
  fs.writeFileSync(path.join(campaignPlanV1.planDirectory, 'sprints/S01.tasklets.json'), JSON.stringify(taskletMetadataV3));
  const campaignPlanContents: CampaignPlanContents = validatePlanContents(campaignPlanV1, campaignManagementConfigV1, root);
  assert.deepEqual(campaignPlanContents.runnableTasklets, { sprintId: 'S01', taskletIds: ['S01-F01-T02'] });
  assert.deepEqual(campaignPlanContents.sprints[0]?.taskletCounts, { PENDING: 1, DONE: 1, ERROR: 0 });
  assert.equal(campaignPlanContents.sprints[0]?.totalTasklets, 2);
  assert.deepEqual(campaignPlanContents.tasklets.map(item => [item.id, item.featureId, item.status, item.plannedPaths]), [
    ['S01-F01-T01', 'S01-F01', 'DONE', ['src/input.ts']], ['S01-F01-T02', 'S01-F01', 'PENDING', []] ]);
  assert.equal(campaignPlanContents.reviewableSprint, null);
});
