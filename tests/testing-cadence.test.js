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

test('plan and issue identities survive lifecycle moves', () => {
  const plan = readSkill('plan-execution');
  const issue = readSkill('issue-tracking');

  assert.match(plan, /`YYYY-MM-DD-<name>`/);
  assert.match(plan, /pm\/plans\/<status>\/<id>\/plan\.md/);
  assert.match(issue, /<status>\/YYYY-MM-DD-<type>-<short_description>\.md/);
  assert.match(issue, /Keep the date and ID stable during status changes/);
  assert.match(issue, /filename stem is the canonical issue ID/);

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

test('source-proven configuration drift is repaired without an approval stop', () => {
  const structure = readSkill('project-structure');

  assert.match(structure, /When that state is unambiguous and\s+the repair is narrow, local, reversible/);
  assert.match(structure, /continue approved work without requesting\s+user approval/);
  assert.match(structure, /An explicit diagnosis-only or report-only instruction prohibits repair/);
  assert.match(structure, /Do not stop for a source-proven mechanical synchronization\s+repair/);
  assert.doesNotMatch(structure, /session-scope persistent instruction/);
});

test('material configuration decisions still stop without halting other ready work', () => {
  const structure = readSkill('project-structure');
  const plan = readSkill('plan-execution');

  assert.match(structure, /authoritative sources conflict/);
  assert.match(structure, /authorization, security posture, infrastructure\s+topology/);
  assert.match(structure, /overwrite user-owned uncommitted work/);

  assert.match(plan, /Continue independent authorized work while a genuine blocker remains/);

});

test('specialized skills leave broad gates to their owning milestones', () => {
  for (const name of ['api-service-boundaries', 'lossless-json-contracts', 'ux-testing']) {
    assert.match(readSkill(name), /broader gate|milestone gate/);
    assert.match(readSkill(name), /owning milestone/);
  }
});
