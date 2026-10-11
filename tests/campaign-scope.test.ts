// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignError, type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import { type CampaignPlanMetadataV3 } from '../src/campaign-plan-metadata.js';
import { discoverCampaign, resolveCampaignRoot, resolveCampaignScope, type CampaignRoot, type CampaignScope } from '../src/campaign-scope.js';

function configuration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'none',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
}
function write(root: string, relative: string, text: string): void {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
function writePlan(root: string, lifecycle: string, campaignPlanMetadataV3: CampaignPlanMetadataV3, links = ''): void {
  write(root, `pm/plans/${lifecycle}/${campaignPlanMetadataV3.id}/plan.md`,
    `Plan ID: ${campaignPlanMetadataV3.id}\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV3)}\n-->\n${links}`);
}
function metadata(id: string, parent_plan_id: string | null): CampaignPlanMetadataV3 {
  return { schemaVersion: 3, id, parent_plan_id, depends_on: [], obligation_document: 'pm/obligations.json' };
}
function hasCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof CampaignError && error.code === code;
}

test('active selection and explicit child selection resolve the same complete campaign scope', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-scope-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  write(root, '.agents/config/project/management.json', JSON.stringify(campaignManagementConfigV1));
  writePlan(root, 'open', metadata('parent', null), '[child](../../in_progress/child/plan.md)');
  writePlan(root, 'in_progress', metadata('child', 'parent'), '[grandchild](../../closed/grandchild/plan.md)');
  writePlan(root, 'closed', metadata('grandchild', 'child'));
  const campaignRoot: CampaignRoot = resolveCampaignRoot(root);
  assert.deepEqual(campaignRoot, { campaignId: 'parent', submittedPlanId: 'parent' });
  const campaignScope: CampaignScope = resolveCampaignScope(root, 'child/plan.md');
  assert.deepEqual(campaignScope, { campaignId: 'parent', submittedPlanId: 'child', plans: [
    { id: 'parent', path: 'pm/plans/open/parent/plan.md' },
    { id: 'child', path: 'pm/plans/in_progress/child/plan.md' },
    { id: 'grandchild', path: 'pm/plans/closed/grandchild/plan.md' } ] });
  assert.equal(discoverCampaign(root, campaignManagementConfigV1, path.join(root, 'pm/plans/closed/grandchild')).selected.id, 'grandchild');
});

test('selection preserves missing and ambiguous active campaign and plan-name diagnostics', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-scope-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  writePlan(root, 'open', metadata('a', null));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, undefined), hasCode('CAMPAIGN_ACTIVE_MISSING'));
  writePlan(root, 'in_progress', metadata('a', null));
  writePlan(root, 'in_progress', metadata('b', null));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, undefined), hasCode('CAMPAIGN_ACTIVE_AMBIGUOUS'));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'a'), hasCode('CAMPAIGN_INPUT_AMBIGUOUS'));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'missing'), hasCode('CAMPAIGN_INPUT'));
});

test('ancestry enforces parent existence, links, cycles and shared obligation scope', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-scope-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  writePlan(root, 'in_progress', metadata('child', 'parent'));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'child'), hasCode('CAMPAIGN_PARENT_MISSING'));
  writePlan(root, 'open', metadata('parent', null));
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'child'), hasCode('CAMPAIGN_MEMBER_LINK'));
  writePlan(root, 'open', metadata('parent', 'child'), '[child](../../in_progress/child/plan.md)');
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'child'), hasCode('CAMPAIGN_PARENT_CYCLE'));
  writePlan(root, 'open', metadata('parent', null), '[child](../../in_progress/child/plan.md)');
  const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { ...metadata('child', 'parent'), obligation_document: 'pm/other.json' };
  writePlan(root, 'in_progress', campaignPlanMetadataV3);
  assert.throws(() => discoverCampaign(root, campaignManagementConfigV1, 'child'), hasCode('CAMPAIGN_OBLIGATION_SCOPE'));
});
