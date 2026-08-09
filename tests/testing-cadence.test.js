#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readSkill(name) {
  return fs.readFileSync(
    path.join(__dirname, '..', 'skills', name, 'SKILL.md'),
    'utf8',
  );
}

test('planned work reuses unchanged proof instead of rerunning nested gates', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /Run the applicable portions of configured final acceptance once/);
  assert.match(skill, /Run every applicable configured full unit-test command once/);
  assert.match(skill, /Reuse a passing result while the relevant\s+code and configuration remain unchanged/);
  assert.match(skill, /do not rerun an identical command\s+solely because a higher management level/);
  assert.doesNotMatch(skill, /Run the affected package's complete unit suite\./);
});

test('planned work uses focused unit tests until final acceptance', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /Run only explicit test files or named cases/);
  assert.match(skill, /Do not run a\n  whole package, workspace, language family/);
  assert.match(skill, /Do not run a full unit-test command/);
  assert.match(skill, /never fall back to a full command/);
  assert.match(skill, /Standalone bugs and direct bounded changes run only explicit selections/);
});

test('bug implementation requests authorize the complete workflow by default', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /A user request to implement a project-managed bug authorizes the complete bug\s+workflow, including selective commit after validation, unless the user\s+explicitly says not to commit\./);
  assert.match(skill, /When implementation was not directly requested, obtain explicit\s+user approval before changing behavior\./);
});

test('portable unit-test cadence names no project tool', () => {
  const portableSkills = [
    'ponytail',
    'plan-execution',
    'project-structure',
    'production-test-boundaries',
  ].map(readSkill).join('\n');

  assert.doesNotMatch(
    portableSkills,
    /\bnpm\b|\bpnpm\b|\bvitest\b|\bjest\b|\bctest\b|\bGWEN\b|\bIPG\b/i,
  );
});

test('host configuration supports named unit-test families', () => {
  const structure = readSkill('project-structure');
  const boundaries = readSkill('production-test-boundaries');

  assert.match(structure, /one named family per independently selected test/);
  assert.match(structure, /focused command form that accepts\nexplicit test files or named cases/);
  assert.match(structure, /A host may configure multiple families/);
  assert.match(structure, /There is no portable command default/);
  assert.match(structure, /Missing\nfocused selection is a configuration discrepancy/);
  assert.match(boundaries, /`Unit-test command families`/);
  assert.match(boundaries, /Unit-test\ncommand families default to `not configured`/);
});

test('planned work builds only targets reported by build impact', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /Run the configured build-impact query with the intended tasklet paths/);
  assert.match(skill, /When it reports no affected or indeterminate targets, skip the build/);
  assert.match(skill, /Requery build impact only for target inputs changed after their last/);
  assert.match(skill, /ordinary final command\s+that cannot skip an inapplicable build must be split/);
  assert.doesNotMatch(skill, /Build distributable output only when/);
});

test('specialized skills leave broad gates to their owning milestones', () => {
  for (const name of ['api-service-boundaries', 'lossless-json-contracts', 'ux-testing']) {
    assert.match(readSkill(name), /broader gate|milestone gate/);
    assert.match(readSkill(name), /owning milestone/);
  }
});
