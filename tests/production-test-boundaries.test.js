#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'production-test-boundaries', 'SKILL.md'),
  'utf8',
);

const relatedSkills = [
  'plan-execution',
  'project-structure',
  'ux-testing',
].map((name) => fs.readFileSync(
  path.join(__dirname, '..', 'skills', name, 'SKILL.md'),
  'utf8',
));

test('test mechanisms stay outside production artifacts', () => {
  assert.match(skill, /Keep test modes, test-only environment variables/);
  assert.match(skill, /Production code\n\s+must not import them/);
  assert.match(skill, /Production behavior has one path regardless of who invokes it/);
});

test('integration tests prove the real isolated product path', () => {
  assert.match(skill, /complete executable product stack without mocks, fakes/);
  assert.match(skill, /same migrations and owned custom SQL/);
  assert.match(skill, /real sandbox accounts or services/);
  assert.match(skill, /not integration evidence/);
});

test('integration terminology has one canonical hierarchy', () => {
  assert.match(skill, /\*\*Suite\*\*: a named set of related Arcs/);
  assert.match(skill, /\*\*Arc\*\*: a named ordered sequence of one or more Steps/);
  assert.match(skill, /\*\*Step\*\*: the smallest independently reported executable integration-test/);
  for (const relatedSkill of relatedSkills) {
    assert.match(relatedSkill, /canonical Suite,\nArc, and Step definitions from `production-test-boundaries`/);
  }
});

test('integration failure policy stops one Arc and continues the run', () => {
  assert.match(skill, /Steps execute in their declared Arc order/);
  assert.match(skill, /When a Step fails, stop that Arc's\nordinary Steps after running required harness finalization/);
  assert.match(skill, /attempt every remaining selected Arc/);
  assert.match(skill, /return a nonzero final status when any selected Arc failed/);
});

test('production test boundary guidance is project neutral', () => {
  assert.doesNotMatch(skill, /Anchorbase|IPG|GWEN|Mantis|Samba/);
});
