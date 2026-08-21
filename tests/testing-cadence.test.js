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

test('plan and bug names sort chronologically by creation date', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /`YYYY-MM-DD-<plan-name>`/);
  assert.match(skill, /bugs\/open\/YYYY-MM-DD-<bug-name>\.md/);
  assert.match(skill, /Keep that date and\s+filename unchanged when its lifecycle changes/);
  assert.match(skill, /filename stem `YYYY-MM-DD-<bug-name>` is the canonical bug name/);
  assert.match(skill, /record that exact name in the bug file/);
});

test('long-lived plan execution journals actions without blocking work', () => {
  const skill = readSkill('plan-execution');

  assert.match(skill, /start the first intentional action/);
  assert.match(skill, /project_journal\.sh run_command/);
  assert.match(skill, /automatic post-command state is\s+`waiting_for_agent_action`/);
  assert.match(skill, /Before every handoff, invoke `project_journal\.sh over`/);
  assert.match(skill, /Journaling is non-blocking/);
  assert.match(skill, /report the failed operation and diagnostic in chat/);
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

test('source-proven configuration drift is repaired without an approval stop', () => {
  const structure = readSkill('project-structure');

  assert.match(structure, /When that state is unambiguous and\s+the repair is narrow, local, reversible/);
  assert.match(structure, /continue approved work without requesting\s+user approval/);
  assert.match(structure, /An explicit diagnosis-only or report-only instruction prohibits repair/);
  assert.match(structure, /Do not stop for a source-proven mechanical synchronization\s+repair/);
  assert.doesNotMatch(structure, /session-scope persistent instruction/);
});

test('material configuration decisions still stop without halting independent work', () => {
  const structure = readSkill('project-structure');
  const plan = readSkill('plan-execution');

  assert.match(structure, /authoritative sources conflict/);
  assert.match(structure, /authorization, security posture, infrastructure\s+topology/);
  assert.match(structure, /overwrite user-owned uncommitted work/);
  assert.match(plan, /plan maintenance, not scope growth and not an\s+approval gate/);
  assert.match(plan, /continue independent approved work unless the plan requires strict\s+serial execution/);
  assert.match(plan, /does not count as a whole-goal blocker while an\s+applicable skill authorizes its safe local repair/);
});

test('specialized skills leave broad gates to their owning milestones', () => {
  for (const name of ['api-service-boundaries', 'lossless-json-contracts', 'ux-testing']) {
    assert.match(readSkill(name), /broader gate|milestone gate/);
    assert.match(readSkill(name), /owning milestone/);
  }
});
