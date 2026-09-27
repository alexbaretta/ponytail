#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

// Traceability: verifies REQ-REQUIREMENTS-TRACEABILITY
test('configured checker validates structural and semantic locators together', () => {
  const result = spawnSync(
    process.execPath,
    [
      'skills/requirements-traceability/scripts/check-traceability.js',
      '--config',
      '.agents/config/project/traceability.json',
    ],
    { cwd: root, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no violations found/u);
});
