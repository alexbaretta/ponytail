// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignError, type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import { parseCandidate, readPlanMetadataV1, type CampaignPlanMetadataV1, type CampaignPlanV1 } from '../src/campaign-plan-metadata.js';
import { listPlanSourceFiles, scanPlanCandidates, linkedPlanFiles, type CampaignPlanSource } from '../src/campaign-plan-sources.js';

function configuration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'flat',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
}
function writePlan(root: string, relative: string, id: string, suffix = ''): string {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id, parent_plan_id: null };
  fs.writeFileSync(file, `Plan ID: ${id}\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n${suffix}`);
  return file;
}

test('source listing is lexical while parsed candidates follow configured lifecycle order', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-sources-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  writePlan(root, 'pm/plans/open/z/plan.md', 'z');
  writePlan(root, 'pm/plans/closed/a/plan.md', 'a');
  writePlan(root, 'pm/plans/legacy/plan.md', 'legacy');
  const campaignPlanSources: readonly CampaignPlanSource[] = listPlanSourceFiles(root, campaignManagementConfigV1);
  assert.deepEqual(campaignPlanSources.map(item => item.relativePlanFile), [
    'pm/plans/closed/a/plan.md', 'pm/plans/legacy/plan.md', 'pm/plans/open/z/plan.md' ]);
  assert.deepEqual(scanPlanCandidates(root, campaignManagementConfigV1).map(item => [item.lifecycle, item.relativePlanFile]), [
    ['open', 'pm/plans/open/z/plan.md'], ['closed', 'pm/plans/closed/a/plan.md'], [null, 'pm/plans/legacy/plan.md'] ]);
  const strictCampaignManagementConfigV1: CampaignManagementConfigV1 = { ...campaignManagementConfigV1, legacyPlanLayout: 'none' };
  assert.equal(listPlanSourceFiles(root, strictCampaignManagementConfigV1).length, 2);
  assert.equal(scanPlanCandidates(root, strictCampaignManagementConfigV1).length, 2);
  const original = path.join(root, 'pm/plans/open/z/plan.md');
  const symlink = path.join(root, 'pm/plans/open/symlink/plan.md');
  fs.mkdirSync(path.dirname(symlink), { recursive: true });
  fs.symlinkSync(original, symlink);
  assert.equal(listPlanSourceFiles(root, campaignManagementConfigV1).length, 3);
  assert.equal(scanPlanCandidates(root, campaignManagementConfigV1).length, 3);
});

test('candidate discovery rejects absent, symlinked and physically escaping roots and unsafe lifecycle directories', t => {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-sources-')));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'repository');
  fs.mkdirSync(root);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  assert.throws(() => scanPlanCandidates(root, campaignManagementConfigV1), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_PLAN_ROOT' && error.status === 2);
  const foreign = path.join(fixture, 'foreign');
  fs.mkdirSync(path.join(foreign, 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm'));
  fs.symlinkSync(path.join(foreign, 'plans'), path.join(root, 'pm/plans'));
  assert.throws(() => scanPlanCandidates(root, campaignManagementConfigV1), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_PATH');
  fs.unlinkSync(path.join(root, 'pm/plans'));
  fs.symlinkSync(foreign, path.join(root, 'pm/ancestor'));
  const escapingCampaignManagementConfigV1: CampaignManagementConfigV1 = { ...campaignManagementConfigV1, planRoot: 'pm/ancestor/plans' };
  assert.throws(() => scanPlanCandidates(root, escapingCampaignManagementConfigV1), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_PATH');
  fs.mkdirSync(path.join(root, 'pm/plans'));
  fs.symlinkSync(foreign, path.join(root, 'pm/plans/open'));
  assert.throws(() => scanPlanCandidates(root, campaignManagementConfigV1), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_PATH');
});

test('linked plans resolve existing directories, file fragments and physical paths while omitting missing links', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-links-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const child = writePlan(root, 'pm/plans/open/child/plan.md', 'child');
  fs.symlinkSync(path.dirname(child), path.join(root, 'pm/plans/open/alias'));
  const file = writePlan(root, 'pm/plans/open/parent/plan.md', 'parent',
    '\n[Child directory](../child)\n[Child file](../child/plan.md#section)\n[Physical alias](../alias)\n[Missing](../missing/plan.md)\n');
  const campaignPlanV1: CampaignPlanV1 = readPlanMetadataV1(parseCandidate(file, 'open', root));
  assert.deepEqual(linkedPlanFiles(campaignPlanV1), [child, child, child]);
});
