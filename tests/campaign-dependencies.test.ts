// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CampaignError } from '../src/campaign-configuration.js';
import { type CampaignPlanV2 } from '../src/campaign-plan-metadata.js';
import { validateCampaignDependencies, validateExternalTaskletDependencies, type CampaignDependencyContents,
  type CampaignTaskletDependency, type CampaignDependencyResult } from '../src/campaign-dependencies.js';

function plan(id: string, dependsOn: readonly string[] = []): CampaignPlanV2 {
  return { schemaVersion: 2, id, dependsOn, parentPlanId: null, lifecycle: 'open',
    planFile: `/repository/pm/plans/open/${id}/plan.md`, relativePlanFile: `pm/plans/open/${id}/plan.md`,
    planDirectory: `/repository/pm/plans/open/${id}`, text: `Plan ID: ${id}` };
}
function tasklet(id: string): CampaignTaskletDependency {
  return { id, sprintId: 'S01', status: 'PENDING', dependsOn: [], externalDependsOn: [] };
}
function hasCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof CampaignError && error.code === code;
}
function git(root: string, args: readonly string[]): void {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('plan dependency validation accepts DAGs and rejects missing members and cycles', () => {
  validateCampaignDependencies([]);
  validateCampaignDependencies([plan('a'), plan('b', ['a']), plan('c', ['a', 'b'])]);
  assert.throws(() => validateCampaignDependencies([plan('a', ['missing'])]), hasCode('CAMPAIGN_DEPENDENCY_MISSING'));
  assert.throws(() => validateCampaignDependencies([plan('a', ['b']), plan('b', ['a'])]), hasCode('CAMPAIGN_DEPENDENCY_CYCLE'));
});

test('cross-plan gates require DONE in both current contents and committed HEAD', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-dependencies-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Ponytail test']);
  git(root, ['config', 'user.email', 'ponytail-test@example.invalid']);
  const file = path.join(root, 'pm/plans/open/a/sprints/S01.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '### [ ] Tasklet S01-F01-T01: prerequisite\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'pending prerequisite']);
  fs.writeFileSync(file, '### [DONE] Tasklet S01-F01-T01: prerequisite\n');
  const prerequisiteCampaignTaskletDependency: CampaignTaskletDependency = { ...tasklet('S01-F01-T01'), status: 'DONE' };
  const dependentCampaignTaskletDependency: CampaignTaskletDependency = { ...tasklet('S01-F01-T02'),
    externalDependsOn: [{ planId: 'a', taskletId: 'S01-F01-T01' }] };
  const contents: ReadonlyMap<string, CampaignDependencyContents> = new Map([
    ['a', { taskletDependencies: [prerequisiteCampaignTaskletDependency] }],
    ['b', { taskletDependencies: [dependentCampaignTaskletDependency] }] ]);
  const blockedCampaignDependencyResult: CampaignDependencyResult = validateExternalTaskletDependencies(root, [plan('a'), plan('b')], contents);
  assert.deepEqual([...blockedCampaignDependencyResult.blockedSprints], ['b\0S01']);
  assert.equal(blockedCampaignDependencyResult.prerequisites[0]?.status, 'PENDING');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'complete prerequisite']);
  const unblockedCampaignDependencyResult: CampaignDependencyResult = validateExternalTaskletDependencies(root, [plan('a'), plan('b')], contents);
  assert.equal(unblockedCampaignDependencyResult.blockedSprints.size, 0);
  assert.equal(unblockedCampaignDependencyResult.prerequisites[0]?.status, 'DONE');
});

test('cross-plan validation rejects missing targets, completed dependents and cycles', () => {
  const pendingCampaignTaskletDependency: CampaignTaskletDependency = tasklet('S01-F01-T01');
  const dependentCampaignTaskletDependency: CampaignTaskletDependency = { ...tasklet('S01-F01-T02'),
    externalDependsOn: [{ planId: 'a', taskletId: 'S01-F01-T01' }] };
  const missingContents: ReadonlyMap<string, CampaignDependencyContents> = new Map([
    ['a', { taskletDependencies: [] }], ['b', { taskletDependencies: [dependentCampaignTaskletDependency] }] ]);
  assert.throws(() => validateExternalTaskletDependencies('/missing', [plan('a'), plan('b')], missingContents), hasCode('CAMPAIGN_TASKLET_DEPENDENCY'));
  const doneContents: ReadonlyMap<string, CampaignDependencyContents> = new Map([
    ['a', { taskletDependencies: [pendingCampaignTaskletDependency] }],
    ['b', { taskletDependencies: [{ ...dependentCampaignTaskletDependency, status: 'DONE' }] }] ]);
  assert.throws(() => validateExternalTaskletDependencies('/missing', [plan('a'), plan('b')], doneContents), hasCode('CAMPAIGN_TASKLET_DEPENDENCY'));
  const cycleContents: ReadonlyMap<string, CampaignDependencyContents> = new Map([
    ['a', { taskletDependencies: [{ ...pendingCampaignTaskletDependency, externalDependsOn: [{ planId: 'b', taskletId: 'S01-F01-T02' }] }] }],
    ['b', { taskletDependencies: [dependentCampaignTaskletDependency] }] ]);
  assert.throws(() => validateExternalTaskletDependencies('/missing', [plan('a'), plan('b')], cycleContents), hasCode('CAMPAIGN_TASKLET_DEPENDENCY_CYCLE'));
});
