// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { activateCampaign, type CampaignActivationResult } from '../src/campaign-activation.js';
import { CampaignError, type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import type { CampaignPlanMetadataV1 } from '../src/campaign-plan-metadata.js';
import type { SprintMetadataV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';

function configuration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'flat',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
}
function fixture(testContext: TestContext): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-activation-')));
  testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents/config/project/management.json'), JSON.stringify(campaignManagementConfigV1));
  const directory = path.join(root, 'pm/plans/open/campaign');
  fs.mkdirSync(path.join(directory, 'sprints'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/uat'), { recursive: true });
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'campaign', parent_plan_id: null };
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'STUB', depends_on: [], scope_roots: ['src'] }, execution: null };
  fs.writeFileSync(path.join(directory, 'plan.md'), `# Campaign\n\n- **Plan ID:** \`campaign\`\n- **Status:** \`open\`\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n\n[S01](sprints/S01.md)\n`);
  fs.writeFileSync(path.join(directory, 'sprints/S01.md'), `# S01\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n`);
  fs.writeFileSync(path.join(root, 'pm/uat/campaign.md'), '[campaign](../plans/open/campaign/plan.md?profile=local#accepted)\n');
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  return root;
}

// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('typed activation preserves moved links, suffixes, exclusions and active idempotence', testContext => {
  const root = fixture(testContext);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const source = path.join(root, 'pm/plans/open/campaign');
  const destination = path.join(root, 'pm/plans/in_progress/campaign');
  fs.writeFileSync(path.join(source, 'notes.md'), '[local](sprints/S01.md#step)\n[external](../../../uat/campaign.md?profile=local#proof)\n[anchor](#local)\n[url](https://example.test/arc?q=1#step)\n[absolute](/fixture/reference.md)\n');
  const excluded = path.join(root, 'excluded.md');
  fs.writeFileSync(excluded, '[excluded](plans/open/campaign/plan.md)\n');
  fs.symlinkSync(excluded, path.join(root, 'pm/symlink.md'));
  const campaignActivationResult: CampaignActivationResult = activateCampaign(root, campaignManagementConfigV1, 'campaign');
  assert.deepEqual(campaignActivationResult, { rootPlanId: 'campaign', activated: true });
  assert.equal(fs.existsSync(source), false);
  assert.match(fs.readFileSync(path.join(destination, 'plan.md'), 'utf8'), /- \*\*Status:\*\* `in_progress`/);
  assert.equal(fs.readFileSync(path.join(root, 'pm/uat/campaign.md'), 'utf8'), '[campaign](../plans/in_progress/campaign/plan.md?profile=local#accepted)\n');
  assert.equal(fs.readFileSync(path.join(destination, 'notes.md'), 'utf8'), '[local](./sprints/S01.md#step)\n[external](../../../uat/campaign.md?profile=local#proof)\n[anchor](#local)\n[url](https://example.test/arc?q=1#step)\n[absolute](/fixture/reference.md)\n');
  assert.equal(fs.readFileSync(excluded, 'utf8'), '[excluded](plans/open/campaign/plan.md)\n');
  assert.deepEqual(activateCampaign(root, campaignManagementConfigV1, 'campaign'), { rootPlanId: 'campaign', activated: false });
});

test('activation write failure restores the directory and every original Markdown byte', testContext => {
  const root = fixture(testContext);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const source = path.join(root, 'pm/plans/open/campaign');
  const destination = path.join(root, 'pm/plans/in_progress/campaign');
  const files = [path.join(source, 'plan.md'), path.join(source, 'sprints/S01.md'), path.join(root, 'pm/uat/campaign.md')];
  const originals = files.map(file => fs.readFileSync(file, 'utf8'));
  const originalWriteFileSync: typeof fs.writeFileSync = fs.writeFileSync;
  const failure = new Error('one filesystem write fails');
  let failed = false;
  const failingWriteFileSync: typeof fs.writeFileSync = (file, data, options): void => {
    if (!failed && file === path.join(root, 'pm/uat/campaign.md')) { failed = true; throw failure; }
    originalWriteFileSync(file, data, options);
  };
  testContext.mock.method(fs, 'writeFileSync', failingWriteFileSync);
  assert.throws(() => activateCampaign(root, campaignManagementConfigV1, 'campaign'), error => error === failure);
  assert.equal(failed, true);
  assert.equal(fs.existsSync(source), true);
  assert.equal(fs.existsSync(destination), false);
  assert.deepEqual(files.map(file => fs.readFileSync(file, 'utf8')), originals);
});

test('activation destination and status guards reject before changing source bytes', testContext => {
  const root = fixture(testContext);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const source = path.join(root, 'pm/plans/open/campaign');
  const destination = path.join(root, 'pm/plans/in_progress/campaign');
  const original = fs.readFileSync(path.join(source, 'plan.md'), 'utf8');
  fs.mkdirSync(destination, { recursive: true });
  assert.throws(() => activateCampaign(root, campaignManagementConfigV1, 'campaign'), error =>
    error instanceof CampaignError && error.code === 'CAMPAIGN_ACTIVATE_DESTINATION' && error.status === 2);
  assert.equal(fs.readFileSync(path.join(source, 'plan.md'), 'utf8'), original);
  fs.rmSync(destination, { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/deferred'), { recursive: true });
  fs.renameSync(source, path.join(root, 'pm/plans/deferred/campaign'));
  assert.throws(() => activateCampaign(root, campaignManagementConfigV1, 'campaign'), error =>
    error instanceof CampaignError && error.code === 'CAMPAIGN_ACTIVATE_STATUS' && error.status === 1);
  assert.equal(fs.readFileSync(path.join(root, 'pm/plans/deferred/campaign/plan.md'), 'utf8'), original);
});
