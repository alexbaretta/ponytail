#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  expectedHermesManifest,
  expectedJson,
  jsonTargets,
  marketplaceTargets,
} = require('../scripts/build-manifests');

const root = path.join(__dirname, '..');

test('JSON manifests match canonical repeated metadata', () => {
  for (const relativePath of [...jsonTargets, ...marketplaceTargets]) {
    assert.equal(fs.readFileSync(path.join(root, relativePath), 'utf8'), expectedJson(relativePath));
  }
});

test('Hermes manifest is generated from package and registry metadata', () => {
  assert.equal(fs.readFileSync(path.join(root, 'plugin.yaml'), 'utf8'), expectedHermesManifest());
});
