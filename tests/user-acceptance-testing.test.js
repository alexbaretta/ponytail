#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const uat = fs.readFileSync(
  path.join(root, 'skills', 'user-acceptance-testing', 'SKILL.md'),
  'utf8',
);
const requirements = fs.readFileSync(
  path.join(root, 'skills', 'requirements', 'SKILL.md'),
  'utf8',
);
const projectStructure = fs.readFileSync(
  path.join(root, 'skills', 'project-structure', 'SKILL.md'),
  'utf8',
);

test('requirements preserve provenance and stakeholder conflict resolution', () => {
  assert.match(requirements, /Record provenance at the smallest independently authoritative requirement/);
  assert.match(requirements, /approved, proposed, or merely observed/);
  assert.match(requirements, /Current implementation alone proves only observed behavior/);
  assert.match(requirements, /require an authorized stakeholder resolution/);
});

test('UAT derives release evidence from approved requirements', () => {
  assert.match(uat, /UAT derives expected outcomes from approved requirements/);
  assert.match(uat, /one canonical plain-English Arc for one behavior/);
  assert.match(uat, /Candidate and observed requirements may support explicitly exploratory Arcs/);
  assert.match(uat, /Passing UAT means the recorded acceptance selection passed/);
  assert.match(uat, /does not by\nitself manufacture a developer, operator, or stakeholder approval/);
});

test('UAT defers every concrete operation to the host project', () => {
  assert.match(uat, /UAT operations skill must be project-local/);
  assert.match(uat, /Do not invent those operational details/);
  assert.match(uat, /actual commands, tools, environment names, credentials, setup and finalization/);
  assert.match(projectStructure, /UAT navigation owned by\n  `user-acceptance-testing`/);
});
