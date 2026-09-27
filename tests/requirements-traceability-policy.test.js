#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const skill = fs.readFileSync(
  path.join(root, 'skills/requirements-traceability/SKILL.md'),
  'utf8',
);

test('traceability has one canonical forward mapping and three roles', () => {
  assert.match(skill, /annotation beside the smallest stable owned implementation or\s+verification unit is the canonical relationship/u);
  assert.match(skill, /- `implements`:/u);
  assert.match(skill, /- `supports`:/u);
  assert.match(skill, /- `verifies`:/u);
  assert.match(skill, /Generated output has no relationship annotations/u);
});

test('traceability requires implementation, unit, integration, and UAT coverage', () => {
  assert.match(skill, /at least one implementation unit/u);
  assert.match(skill, /at least one unit-test unit/u);
  assert.match(skill, /one non-empty project-owned reason/u);
  assert.match(skill, /at least one executable integration-test unit/u);
  assert.match(skill, /at least one plain-English UAT Arc/u);
});

test('TSTS owns only semantic TypeScript traceability', () => {
  assert.match(skill, /TSTS owns only semantic TypeScript locators/u);
  assert.match(skill, /does not own Markdown, requirements, UAT/u);
  assert.match(skill, /generated reverse view exactly matches canonical annotations/u);
});
