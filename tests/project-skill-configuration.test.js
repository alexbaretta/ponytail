#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const configuredSkills = new Map([
  ['api-service-boundaries', ['API architecture and ownership', 'Authorization owner']],
  ['cloud-cli-reauth', ['Cloud CLI\nreauthentication command']],
  ['lossless-json-contracts', ['Lossless JSON standard', 'Lossless JSON boundary inventory']],
  ['ponytail-debt', ['Technical-debt document']],
  ['production-test-boundaries', ['Production compilation and packaging inputs', 'Integration-environment setup']],
  ['test-credentials', ['Test-credentials policy']],
  ['typescript-unit-testing', ['TypeScript unit-test command', 'TypeScript unit-test indexes and discovery']],
  ['ux-testing', ['UX connection skill']],
  ['variant-neutrality', ['Variant-neutrality\nconfiguration']],
]);

test('project-configurable skills define their AGENTS.md keys and defaults', () => {
  for (const [skillName, configurationKeys] of configuredSkills) {
    const skill = fs.readFileSync(
      path.join(__dirname, '..', 'skills', skillName, 'SKILL.md'),
      'utf8',
    );
    assert.match(skill, /configures this skill in `AGENTS\.md`/);
    assert.match(skill, /default/i);
    for (const configurationKey of configurationKeys) {
      assert.match(skill, new RegExp(configurationKey));
    }
  }
});
