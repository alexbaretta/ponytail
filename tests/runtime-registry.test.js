#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { outputPath, render } = require('../scripts/build-registry-data');

test('generated runtime registry matches its canonical source', () => {
  assert.equal(fs.readFileSync(outputPath, 'utf8'), render());
});

test('Hermes registers skills from generated registry data', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '__init__.py'), 'utf8');
  assert.match(source, /generated.*registry\.json/);
  assert.doesNotMatch(source, /SKILLS_DIR\.iterdir/);
});

test('Pi registers auxiliary commands from generated registry data', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'pi-extension', 'index.js'), 'utf8');
  assert.match(source, /generated\/registry\.json/);
  assert.doesNotMatch(source, /registerCommand\("ponytail-(?:audit|debt|review)"/);
});
