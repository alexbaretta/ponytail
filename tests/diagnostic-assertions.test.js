#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'diagnostic-assertions', 'SKILL.md'),
  'utf8',
);

test('diagnostic observations cannot become product failures', () => {
  assert.match(skill, /execution remains valid after it fails/);
  assert.match(skill, /must not throw, terminate a workflow, display an error dialog/);
  assert.match(skill, /warning-level diagnostic channel/);
});

test('hard assertions require an invalid continuation path and proof', () => {
  assert.match(skill, /continuing would be invalid/);
  assert.match(skill, /why execution cannot safely continue/);
  assert.match(skill, /success-path and failure-path tests/);
});

test('diagnostic assertion guidance is project neutral', () => {
  assert.doesNotMatch(skill, /Anchorbase|IPG|GWEN|Mantis|Samba/);
});
