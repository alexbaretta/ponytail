#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Traceability: verifies REQ-FAST-SEMANTIC-REBASE
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(path.join(__dirname, '../skills/semantic-rebase/SKILL.md'), 'utf8');

test('semantic rebase policy owns aggregate review and prohibits runtime product validation', () => {
  assert.match(skill, /ponytail rebase diff <target>/);
  assert.match(skill, /one deterministic\nstream/);
  assert.match(skill, /performs no language, symbol, domain, dependency, or\nsemantic-conflict inference/);
  assert.match(skill, /never run unit tests, integration tests, builds, product\nQA/);
  assert.doesNotMatch(skill, /stop after every replayed commit/);
  assert.doesNotMatch(skill, /Run the smallest focused proof needed for the current commit/);
});
