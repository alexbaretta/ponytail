#!/usr/bin/env node
// Copyright (c) Ponytail contributors.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import versionedContracts from '../versioned-data-contracts.json';
import { SprintMetadataReaders } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { TaskletMetadataReaders } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { CampaignReportReaders } from '../src/campaign-inventory.js';

interface PhysicalReaderOwner {
  readonly module: string; readonly readerRegistryExport: string;
  readonly readers: typeof SprintMetadataReaders | typeof TaskletMetadataReaders | typeof CampaignReportReaders;
}


const root = path.join(__dirname, '../..');
const skill = fs.readFileSync(
  path.join(root, 'skills', 'plan-execution', 'SKILL.md'),
  'utf8',
);
test('serial policy preserves atomic batch and convergence boundaries', () => {
  assert.match(skill, /one type definition, class\s+envelope, method or function, controller endpoint[\s\S]*focused fixture, or validation gate/);
  assert.match(skill, /more than\s+1,000 new lines requires the executing agent to split it or record why/);
  assert.match(skill, /## Legacy Serial Plan Orchestration/);
  assert.match(skill, /one ready sprint, one selected\s+tasklet batch, one executing agent, one checkout, and one Git index/);
  assert.match(skill, /Finish the\s+batch's implementation, review, validation, lifecycle reconciliation, and\s+commit before selecting more work/);
  assert.match(skill, /Do not delegate plan drafting,\s+implementation, review, validation, Git ownership, or lifecycle updates/);
  assert.match(skill, /Each selector returns at most\s+one selection/);
  assert.match(skill, /Numeric sprint order is the deterministic tie-breaker/);
  assert.match(skill, /physical V1 and V2 sprint and tasklet readers remain immutable/i);
  assert.match(skill, /V3 remains the latest sprint write format; V4 is the latest tasklet/);
  assert.match(skill, /V3 tasklet metadata is the sole exact write-path owner/);
  assert.match(skill, /selects the highest-ranked root,\s+then extends that single batch with up to sixteen ordered descendants/);
  assert.match(skill, /Do not subdivide a valid selected\s+batch merely to produce smaller changes or commits/);
  assert.match(skill, /inspect its complete declaration, caller,\s+fixture, test, generated-consumer, and configuration surface/);
  assert.match(skill, /Add every\s+foreseeable in-scope correction to the sprint and tasklet graph together/);
  assert.match(skill, /runs final\s+input validation once/);
  assert.match(skill, /feature advances through its single\s+approval gate only after every implementation tasklet is reconciled/);
  const serialPlanPolicy = skill.slice(
    skill.indexOf('## Legacy Serial Plan Orchestration'),
    skill.indexOf('### Campaign Graphs'),
  );
  assert.doesNotMatch(serialPlanPolicy, /parallel|wave|packet|dispatch|subagent|secondary task|worktree|path-disjoint|runtime capacity|capable writer|orchestrator|handoff/i);
  assert.match(skill, /ordinary plan execution neither loads nor requires its dispatch protocol/);
  assert.doesNotMatch(skill, /ponytail campaign (?:advance|ready-actions|schedule-ready|observe)/);
});

test('campaign census policy preserves scoped reports and adds repository inventory', () => {
  assert.match(skill, /Legacy writers emit exactly `schemaVersion`, `id`,\s+`parent_plan_id`, and `depends_on`/);
  assert.match(skill, /Derive\s+children and reverse dependencies by inventorying these forward records/);
  assert.match(skill, /only the campaign containing the supplied plan/);
  assert.match(skill, /malformed or contradictory unrelated\s+campaigns do not affect the result/);
  assert.match(skill, /does not schedule parallel work, assign workers or worktrees/);
  assert.ok(skill.includes(`ponytail campaign legacy --command validate --arguments '["<plan-name-or-path>"]'`));
  assert.ok(skill.includes(`ponytail campaign legacy --command validate --arguments '["--all","--json"]'`));
  assert.match(skill, /no campaign block as unmanaged legacy data without inferred\s+membership regardless of its location/);
  assert.match(skill, /managed plan names an unmarked\s+plan as its direct parent or dependency/);
  assert.match(skill, /P is\s+stranded exactly when C lacks that reciprocal reference/);
  assert.match(skill, /bare name must resolve to exactly one plan across configured lifecycle\s+locations/);
  assert.match(skill, /before requesting plan approval[\s\S]*before the first implementation edit[\s\S]*before closing a campaign root/);
  assert.match(skill, /non-root plan may close when its own acceptance is complete/);
  assert.match(skill, /campaign root\s+with descendants may close only after every member is complete/);
  assert.match(skill, /parent metadata and the parent's reciprocal human-readable member reference in\s+the same project change-set/);
});

test('sandbox-blocked journaling requires explicit persistent-rule authorization', () => {
  assert.match(skill, /sandbox access blocks `project_journal\.sh`, especially its local\s+PostgreSQL Unix socket/);
  assert.match(skill, /user's literal explicit authorization\s+before adding a persistent allow `prefix_rule` for that exact\s+`project_journal\.sh` executable to `~\/\.codex\/rules\/default\.rules`/);
  assert.match(skill, /outside-project mutation and must not be inferred from plan approval/);
  assert.match(skill, /`project_journal\.sh run_command` is effectively\s+authorizing arbitrary wrapped shell commands outside the sandbox/);
});

test('orchestration metadata retains every immutable reader', () => {
  const expected = new Map<string, PhysicalReaderOwner>([
    ['parallel-sprint-metadata', { module: 'skills/plan-execution/scripts/sprint-metadata.ts', readerRegistryExport: 'SprintMetadataReaders', readers: SprintMetadataReaders }],
    ['parallel-tasklet-scheduling-metadata', { module: 'skills/plan-execution/scripts/tasklet-metadata.ts', readerRegistryExport: 'TaskletMetadataReaders', readers: TaskletMetadataReaders }],
    ['campaign-census-report', { module: 'src/campaign-inventory.ts', readerRegistryExport: 'CampaignReportReaders', readers: CampaignReportReaders }],
  ]);
  const families = versionedContracts.families.filter(({ id }) => expected.has(id));
  assert.equal(families.length, expected.size);
  for (const family of families) {
    const versions = family.id === 'parallel-tasklet-scheduling-metadata' ? ['V1', 'V2', 'V3', 'V4'] : ['V1', 'V2', 'V3'];
    assert.equal(family.currentVersion, versions.at(-1));
    assert.deepEqual(family.versions, versions);
    assert.deepEqual(family.supportedReadVersions, versions);
    assert.deepEqual(family.supportedDowngradeVersions, []);
    const physicalReaderOwner = expected.get(family.id);
    assert.ok(physicalReaderOwner);
    assert.equal(family.implementation.module, physicalReaderOwner.module);
    assert.equal(family.implementation.readerRegistryExport, physicalReaderOwner.readerRegistryExport);
    assert.deepEqual(Object.keys(physicalReaderOwner.readers), family.supportedReadVersions);
    for (const reader of Object.values(physicalReaderOwner.readers)) {
      assert.equal(typeof reader, 'function');
    }
  }
});
