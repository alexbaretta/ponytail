// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildRepositoryInventory, readCampaignReportV2, readCampaignReportV3, type CampaignInventoryV2, type CampaignInventoryV3 } from '../src/campaign-inventory.js';
import { CampaignError, type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';

function inventory(): CampaignInventoryV3 {
  return { schemaVersion: 3, valid: false, invocation: { command: 'report' },
    repository: { root: '.', worktree: '.', commit: 'revision', branch: null, detached: true, clean: true },
    activeCampaigns: [{ rootPlanId: 'plan', activePlanIds: ['plan'] }], campaigns: [{ rootPlanId: 'plan', planIds: ['plan'] }],
    plans: [{ id: 'plan', rootPlanId: 'plan', parentPlanId: null, dependsOn: [], lifecycle: 'active', path: 'pm/plan.md' }],
    invalidPlans: [{ id: 42, lifecycle: null, path: 'pm/invalid.md', diagnostics: [{ code: 'INVALID', message: 'invalid ID', recordId: 42, path: 'pm/invalid.md' }] }],
    unmanagedPlans: [{ path: 'pm/legacy.md' }], diagnostics: [] };
}
function invalid(value: unknown): void {
  assert.throws(() => readCampaignReportV3(value), error => error instanceof CampaignError && error.status === 1);
}

test('physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets', () => {
  const campaignInventoryV3: CampaignInventoryV3 = inventory();
  const campaignInventoryV2: CampaignInventoryV2 = { ...campaignInventoryV3, schemaVersion: 2, invocation: { command: 'report' } };
  assert.equal(readCampaignReportV3(campaignInventoryV3), campaignInventoryV3);
  assert.equal(readCampaignReportV2(campaignInventoryV2), campaignInventoryV2);
  const listCampaignInventoryV3: CampaignInventoryV3 = { ...campaignInventoryV3, invocation: { command: 'list' } };
  assert.equal(readCampaignReportV3(listCampaignInventoryV3), listCampaignInventoryV3);
  assert.throws(() => readCampaignReportV2({ ...listCampaignInventoryV3, schemaVersion: 2 }), CampaignError);
});

test('inventory readers check nested primitives, ID lists, repository values and diagnostics', () => {
  const campaignInventoryV3: CampaignInventoryV3 = inventory();
  invalid({ ...campaignInventoryV3, extra: true });
  invalid({ ...campaignInventoryV3, repository: { ...campaignInventoryV3.repository, clean: 1 } });
  invalid({ ...campaignInventoryV3, activeCampaigns: [{ rootPlanId: 'plan', activePlanIds: [1] }] });
  invalid({ ...campaignInventoryV3, campaigns: [{ rootPlanId: 1, planIds: [] }] });
  invalid({ ...campaignInventoryV3, plans: [{ id: 'plan', rootPlanId: 'plan', parentPlanId: null, dependsOn: [1], lifecycle: 'active', path: 'pm/plan.md' }] });
  invalid({ ...campaignInventoryV3, unmanagedPlans: [{ path: 1 }] });
  invalid({ ...campaignInventoryV3, invalidPlans: [{ id: 42, lifecycle: 'open', path: 'pm/invalid.md', diagnostics: null }] });
  invalid({ ...campaignInventoryV3, diagnostics: [{ code: 'INVALID', message: 1, recordId: 42, path: null }] });
});

test('typed inventory construction retains invalid metadata identity and unrelated unmanaged plans', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-inventory-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignManagementConfigV1: CampaignManagementConfigV1 = { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'flat',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
  fs.mkdirSync(path.join(root, 'pm/plans/open/bad'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/legacy'), { recursive: true });
  const malformedMetadata: unknown = { schemaVersion: 1, id: 42, parent_plan_id: null };
  fs.writeFileSync(path.join(root, 'pm/plans/open/bad/plan.md'), `<!-- ponytail-plan-campaign\n${JSON.stringify(malformedMetadata)}\n-->\n`);
  fs.writeFileSync(path.join(root, 'pm/plans/legacy/plan.md'), '# Legacy\n');
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  const campaignInventoryV3: CampaignInventoryV3 = buildRepositoryInventory(root, campaignManagementConfigV1, 'list');
  assert.equal(campaignInventoryV3.valid, false);
  assert.equal(campaignInventoryV3.invalidPlans[0]?.id, 42);
  assert.equal(campaignInventoryV3.invalidPlans[0]?.diagnostics[0]?.recordId, 42);
  assert.deepEqual(campaignInventoryV3.unmanagedPlans, [{ path: 'pm/plans/legacy/plan.md' }]);
  assert.equal(campaignInventoryV3.invocation.command, 'list');
});
