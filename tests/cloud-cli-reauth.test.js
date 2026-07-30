#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'cloud-cli-reauth', 'SKILL.md'),
  'utf8',
);

test('cloud CLI recovery uses only the configured identity and command', () => {
  assert.match(skill, /host project's local\n\s+configuration/);
  assert.match(skill, /Retry the exact failed command/);
  assert.match(skill, /Do not replace the configured command with an ad hoc login command/);
  assert.match(skill, /Do not fall back across accounts, profiles, environments, providers/);
});

test('cloud CLI recovery distinguishes authentication from other failures', () => {
  assert.match(skill, /Use this workflow only for a confirmed authentication failure/);
  assert.match(skill, /missing permissions, disabled APIs, wrong projects, network\n\s+failures/);
  assert.match(skill, /required project-local contract is missing/);
});

test('cloud CLI recovery remains project and provider neutral', () => {
  assert.doesNotMatch(skill, /Anchorbase|GWEN|gcloud|Google Cloud|AWS|Azure/);
});
