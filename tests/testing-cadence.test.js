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

  assert.match(skill, /Run the configured final acceptance command once/);
  assert.match(skill, /Reuse a\npassing result while the relevant code and configuration remain unchanged/);
  assert.match(skill, /do\nnot rerun an identical command solely because a higher management level/);
  assert.doesNotMatch(skill, /Run the affected package's complete unit suite\./);
});

test('specialized skills leave broad gates to their owning milestones', () => {
  for (const name of ['api-service-boundaries', 'lossless-json-contracts', 'ux-testing']) {
    assert.match(readSkill(name), /broader gate|milestone gate/);
    assert.match(readSkill(name), /owning milestone/);
  }
});
