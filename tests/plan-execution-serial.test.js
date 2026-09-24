#!/usr/bin/env node
// Copyright (c) Ponytail contributors.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const skill = fs.readFileSync(
  path.join(root, 'skills', 'plan-execution', 'SKILL.md'),
  'utf8',
);
const versionedContracts = JSON.parse(fs.readFileSync(
  path.join(root, 'versioned-data-contracts.json'),
  'utf8',
));

test('serial policy preserves atomic batch and convergence boundaries', () => {
  assert.match(skill, /one type definition, class\s+envelope, method or function, controller endpoint[\s\S]*focused fixture, or validation gate/);
  assert.match(skill, /more than\s+1,000 new lines requires the executing agent to split it or record why/);
  assert.match(skill, /## Serial Plan Orchestration/);
  assert.match(skill, /one ready sprint, one selected\s+tasklet batch, one executing agent, one checkout, and one Git index/);
  assert.match(skill, /Finish the\s+batch's implementation, review, validation, lifecycle reconciliation, and\s+commit before selecting more work/);
  assert.match(skill, /Do not delegate plan drafting,\s+implementation, review, validation, Git ownership, or lifecycle updates/);
  assert.match(skill, /Each selector returns at most\s+one selection/);
  assert.match(skill, /Numeric sprint order is the deterministic tie-breaker/);
  assert.match(skill, /physical V1 and V2 sprint and tasklet readers remain immutable/i);
  assert.match(skill, /V3 is the latest write format/);
  assert.match(skill, /V3 tasklet metadata is the sole exact write-path owner/);
  assert.match(skill, /selects the highest-ranked root,\s+then extends that single batch with up to sixteen ordered descendants/);
  assert.match(skill, /Do not subdivide a valid selected\s+batch merely to produce smaller changes or commits/);
  assert.match(skill, /inspect its complete declaration, caller,\s+fixture, test, generated-consumer, and configuration surface/);
  assert.match(skill, /Add every\s+foreseeable in-scope correction to the sprint and tasklet graph together/);
  assert.match(skill, /runs final\s+input validation once/);
  assert.match(skill, /feature advances through its single\s+approval gate only after every implementation tasklet is reconciled/);
  const serialPlanPolicy = skill.slice(
    skill.indexOf('## Serial Plan Orchestration'),
    skill.indexOf('### Campaign Orchestration'),
  );
  assert.doesNotMatch(serialPlanPolicy, /parallel|wave|packet|dispatch|subagent|secondary task|worktree|path-disjoint|runtime capacity|capable writer|orchestrator|handoff/i);
  assert.match(skill, /Use coordinated multi-agent execution only when the developer\s+requests it/);
  assert.match(skill, /Each worker rebases its completed branch onto the campaign's main feature\s+branch/);
  assert.match(skill, /coordinator verifies the rebased plan evidence and fast-forward\s+merges that branch/);
});

test('campaign census policy is scoped to one backlink-derived campaign', () => {
  assert.match(skill, /exactly `schemaVersion`, `id`, and `parent_plan_id`/);
  assert.match(skill, /Derive\s+children by inventorying these backlinks/);
  assert.match(skill, /only the campaign containing the supplied plan/);
  assert.match(skill, /malformed or contradictory unrelated\s+campaigns do not affect the result/);
  assert.match(skill, /does not schedule parallel work, assign workers or worktrees/);
  assert.match(skill, /ponytail campaign validate <plan-or-plan\.md>/);
  assert.match(skill, /before requesting plan approval[\s\S]*before the first implementation edit[\s\S]*before closing a campaign root/);
  assert.match(skill, /non-root plan may close when its own acceptance is complete/);
  assert.match(skill, /campaign root\s+with descendants may close only after every member is complete/);
  assert.match(skill, /backlink and corresponding human-readable parent link in the same project\s+change-set/);
});

test('sandbox-blocked journaling requires explicit persistent-rule authorization', () => {
  assert.match(skill, /sandbox access blocks `project_journal\.sh`, especially its local\s+PostgreSQL Unix socket/);
  assert.match(skill, /user's literal explicit authorization\s+before adding a persistent allow `prefix_rule` for that exact\s+`project_journal\.sh` executable to `~\/\.codex\/rules\/default\.rules`/);
  assert.match(skill, /outside-project mutation and must not be inferred from plan approval/);
  assert.match(skill, /`project_journal\.sh run_command` is effectively\s+authorizing arbitrary wrapped shell commands outside the sandbox/);
});

test('orchestration metadata retains every immutable reader', () => {
  const expected = new Map([
    ['parallel-sprint-metadata', 'skills/plan-execution/scripts/ready-sprints.js'],
    ['parallel-tasklet-scheduling-metadata', 'skills/plan-execution/scripts/ready-tasklets.js'],
  ]);
  const families = versionedContracts.families.filter(({ id }) => expected.has(id));
  assert.equal(families.length, expected.size);
  for (const family of families) {
    assert.equal(family.currentVersion, 'V3');
    assert.deepEqual(family.versions, ['V1', 'V2', 'V3']);
    assert.deepEqual(family.supportedReadVersions, ['V1', 'V2', 'V3']);
    assert.deepEqual(family.supportedDowngradeVersions, []);
    assert.equal(family.implementation.module, expected.get(family.id));
    const implementation = require(path.join(root, family.implementation.module));
    const readers = implementation[family.implementation.readerRegistryExport];
    assert.deepEqual(Object.keys(readers), family.supportedReadVersions);
    for (const version of family.supportedReadVersions) {
      assert.equal(typeof readers[version], 'function');
    }
  }
});
