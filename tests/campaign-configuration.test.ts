// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignError, readManagementConfigV1, readManagementConfig, type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';

function managementConfiguration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } },
    legacyPlanLayout: 'flat' };
}
test('management configuration reader requires one exact safe V1 contract', () => {
  const campaignManagementConfigV1: CampaignManagementConfigV1 = managementConfiguration();
  const decodedCampaignManagementConfigV1: CampaignManagementConfigV1 = readManagementConfigV1(campaignManagementConfigV1);
  assert.deepEqual(decodedCampaignManagementConfigV1, campaignManagementConfigV1);
  assert.notEqual(decodedCampaignManagementConfigV1, campaignManagementConfigV1);
  assert.notEqual(decodedCampaignManagementConfigV1.lifecycle.roles, campaignManagementConfigV1.lifecycle.roles);
  const invalidInputs: readonly unknown[] = [
    { ...campaignManagementConfigV1, extra: true },
    { ...campaignManagementConfigV1, planRoot: '../plans' },
    { ...campaignManagementConfigV1, lifecycle: { ...campaignManagementConfigV1.lifecycle,
      roles: { ...campaignManagementConfigV1.lifecycle.roles, rejected: 'deferred' } } }
  ];
  const expectedCodes = ['CAMPAIGN_SCHEMA', 'CAMPAIGN_CONFIG_PATH', 'CAMPAIGN_CONFIG_LIFECYCLE'];
  invalidInputs.forEach((invalidInput, index) => assert.throws(() => readManagementConfigV1(invalidInput),
    (error: unknown) => error instanceof CampaignError && error.status === 1 && error.code === expectedCodes[index]));
});

test('project-local management files preserve configuration, unsafe-file and data-error distinctions', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-config-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'management.json');
  assert.throws(() => readManagementConfig(root), (error: unknown) => error instanceof CampaignError &&
    error.code === 'CAMPAIGN_CONFIG_MISSING' && error.status === 2 && error.relativePath === '.agents/config/project/management.json');
  const campaignManagementConfigV1: CampaignManagementConfigV1 = managementConfiguration();
  fs.writeFileSync(file, JSON.stringify(campaignManagementConfigV1));
  assert.deepEqual(readManagementConfig(root), campaignManagementConfigV1);
  fs.writeFileSync(file, '{');
  assert.throws(() => readManagementConfig(root), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_JSON' && error.status === 1);
  fs.writeFileSync(file, '{"schemaVersion":2}');
  assert.throws(() => readManagementConfig(root), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_VERSION' && error.relativePath === '.agents/config/project/management.json');
  fs.unlinkSync(file);
  const target = path.join(root, 'management.json');
  fs.writeFileSync(target, JSON.stringify(campaignManagementConfigV1));
  fs.symlinkSync(target, file);
  assert.throws(() => readManagementConfig(root), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_CONFIG_MISSING');
});
