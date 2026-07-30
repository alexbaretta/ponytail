#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'ux-testing', 'SKILL.md'),
  'utf8',
);

test('UX interaction comes from explicit host configuration', () => {
  assert.match(skill, /host configures this skill in `AGENTS\.md` with `UX connection skill`/);
  assert.match(skill, /There is no\ngeneric default/);
  assert.match(skill, /Load and follow the configured UX connection skill/);
  assert.match(skill, /Do not silently substitute a\ndifferent interaction channel/);
});

test('UX validation covers the real path at complementary layers', () => {
  assert.match(skill, /real user path/);
  assert.match(skill, /focused unit tests for the causal mechanism/);
  assert.match(skill, /integration\n\s+steps for the user-visible workflow/);
  assert.match(skill, /Do not add a testing mode/);
  assert.match(skill, /Do not use mocks, fake provider responses/);
});

test('UX testing guidance is project and transport neutral', () => {
  assert.doesNotMatch(
    skill,
    /Anchorbase|GWEN|Samba|PILLAR|command socket|command-socket|Electron|Playwright|Chrome|Safari/,
  );
});
