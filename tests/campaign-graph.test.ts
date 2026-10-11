// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { campaignGraph, type CampaignGraph } from '../src/campaign-graph.js';
import { type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import { type CampaignPlanMetadataV1 } from '../src/campaign-plan-metadata.js';
import { type SprintMetadataV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';

test('typed campaign graph retains a planning-only scope and explicit legacy obligation absence', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-graph-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'none',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'plan', parent_plan_id: null };
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'STUB', depends_on: [], scope_roots: ['src'] }, execution: null };
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/plan/sprints'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents/config/project/management.json'), JSON.stringify(campaignManagementConfigV1));
  fs.writeFileSync(path.join(root, 'pm/plans/open/plan/plan.md'), `Plan ID: plan\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n`);
  fs.writeFileSync(path.join(root, 'pm/plans/open/plan/sprints/S01.md'), `<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n`);
  const campaignGraphExpected: CampaignGraph = { campaignId: 'plan', submittedPlanId: 'plan', obligationDocument: null,
    externalPrerequisites: [], plans: [{ id: 'plan', parentPlanId: null, dependsOn: [], lifecycle: 'open', path: 'pm/plans/open/plan/plan.md',
      runnableTasklets: null, reviewableSprint: null, planningSprint: { sprintId: 'S01', planningStatus: 'STUB' } }],
    lifecycle: campaignManagementConfigV1.lifecycle.roles };
  assert.deepEqual(campaignGraph(root, 'plan'), campaignGraphExpected);
});
