#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'typescript-unit-testing', 'SKILL.md'),
  'utf8',
);

test('TypeScript test metadata is owned by project configuration', () => {
  assert.match(skill, /inspect the host project's local\nconfiguration/);
  assert.match(skill, /When configured, consult the declared indexes/);
  assert.match(skill, /When these features are not declared by project configuration/);
  assert.match(skill, /do not assume a\ncounterpart skill, conventional path, generated index, metadata schema/);
  assert.match(skill, /Do not invent project-local indexing or auditing infrastructure/);
});

test('valid and invalid test values preserve their real contracts', () => {
  assert.match(skill, /const fixture: PayloadV1/);
  assert.match(skill, /`satisfies ProductionType`/);
  assert.match(skill, /Declare deliberately malformed, unsupported, or untyped legacy input as\n`unknown`/);
  assert.match(skill, /Do not cast invalid data to the type whose rejection the test proves/);
});

test('behavioral doubles use exact production boundary types', () => {
  assert.match(skill, /Instantiate every owned internal dependency/);
  assert.match(skill, /Declare every double with the exact exported production type/);
  assert.match(skill, /Production source, builds, and shipped bundles must never import a double/);
});

test('TypeScript unit testing guidance is project neutral', () => {
  assert.doesNotMatch(skill, /Anchorbase|IPG|GWEN|unit-tested-symbols\.md|mocked-boundaries\.md/);
});
