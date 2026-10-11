// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Traceability: verifies REQ-PLAN-INPUT-QUEUE
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { entries, main } from '../src/plan-input.js';
import { type CampaignPlanMetadataV1 } from '../src/campaign-plan-metadata.js';
import { type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';

function repository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-'));
  fs.mkdirSync(path.join(root, 'pm', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'pm', 'requirements', 'index.md'), '# Requirements\n');
  return root;
}

function campaignRepository(): string {
  const root = repository();
  fs.mkdirSync(path.join(root, '.agents', 'config', 'project'), { recursive: true });
  const campaignManagementConfigV1: CampaignManagementConfigV1 = {
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    },
    legacyPlanLayout: 'none',
  };
  fs.writeFileSync(path.join(root, '.agents', 'config', 'project', 'management.json'), JSON.stringify(campaignManagementConfigV1));
  const plans = path.join(root, 'pm', 'plans', 'in_progress');
  fs.mkdirSync(path.join(plans, 'root'), { recursive: true });
  fs.mkdirSync(path.join(plans, 'child'), { recursive: true });
  const rootCampaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'root', parent_plan_id: null };
  fs.writeFileSync(path.join(plans, 'root', 'plan.md'), `# Root\n\nPlan ID: root\nStatus: in_progress\n\n[Child](../child/plan.md)\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(rootCampaignPlanMetadataV1)}\n-->\n`);
  const childCampaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'child', parent_plan_id: 'root' };
  fs.writeFileSync(path.join(plans, 'child', 'plan.md'), `# Child\n\nPlan ID: child\nStatus: in_progress\n\n[Parent](../root/plan.md)\n<!-- ponytail-plan-campaign\n${JSON.stringify(childCampaignPlanMetadataV1)}\n-->\n`);
  return root;
}

test('coordinator lifecycle commands validate campaign membership', (context) => {
  const root = campaignRepository();
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lines: string[] = [];
  context.mock.method(console, 'log', (line: string) => lines.push(line));
  assert.equal(main(['coordinate', 'child'], root), 0);
  assert.equal(main(['release', 'child'], root), 0);
  assert.deepEqual(lines, ['Validated coordinator campaign root', 'Validated release for campaign root']);
});

test('CLI producer resolves a member plan to the campaign root', (context) => {
  const root = campaignRepository();
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lines: string[] = [];
  context.mock.method(console, 'log', (line: string) => lines.push(line));
  assert.equal(main(['child', '--', 'cli requirement'], root), 0);
  assert.match(lines[0] ?? '', /for campaign root$/);
  assert.deepEqual(entries(root, 'root').map(({ submittedPlanId, prompt }) => ({ submittedPlanId, prompt })), [
    { submittedPlanId: 'child', prompt: 'cli requirement' },
  ]);
});

test('empty campaign claim returns successful explicit JSON exhaustion', (context) => {
  const root = campaignRepository();
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lines: string[] = [];
  context.mock.method(console, 'log', (line: string) => lines.push(line));
  assert.equal(main(['claim', 'child', '--json'], root), 0);
  assert.equal(main(['claim', 'child'], root), 0);
  assert.deepEqual(lines, ['null', 'No pending plan input']);
  assert.deepEqual(entries(root, 'root'), []);
  const command = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'src', 'plan-input.js'), 'claim', 'child', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(command.status, 0, command.stderr);
  assert.equal(command.stdout, 'null\n');
});

test('CLI lists and claims pending inputs and omits completed inputs', context => {
  const root = campaignRepository();
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lines: string[] = [];
  context.mock.method(console, 'log', (line: string) => lines.push(line));
  main(['child', '--', 'new instruction'], root);
  const entry = entries(root, 'root')[0];
  assert.ok(entry);
  main(['list', 'child'], root);
  assert.equal(lines[1], `open\t${entry.id}\tnew instruction`);
  main(['claim', 'child'], root);
  assert.equal(lines[2], `${entry.id}\tnew instruction`);
  main(['complete', 'child', entry.id, '--record', 'pm/requirements/index.md'], root);
  assert.equal(lines[3], `Completed plan input ${entry.id}`);
  main(['list', 'child', '--json'], root);
  assert.equal(lines[4], '[]');
});

test('native CLI reports grammar errors without a stack trace', () => {
  const command = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'src', 'plan-input.js')], { encoding: 'utf8' });
  assert.equal(command.status, 1);
  assert.equal(command.stdout, '');
  assert.match(command.stderr, /^error: usage: ponytail plan-input /);
  assert.doesNotMatch(command.stderr, /\n\s+at /);
});
