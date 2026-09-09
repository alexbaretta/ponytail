#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('license and attribution retain both contributors', () => {
  for (const relativePath of ['LICENSE', 'NOTICE']) {
    const contents = read(relativePath);
    assert.match(contents, /Dietrich(?:Gebert| Gebert)/);
    assert.match(contents, /Alex Baretta/);
  }
});

test('modified canonical policy and runtime sources carry combined notices', () => {
  for (const relativePath of [
    'skills/ponytail/SKILL.md',
    'hooks/ponytail-instructions.js',
    '.opencode/plugins/ponytail.mjs',
    'pi-extension/index.js',
    '__init__.py',
  ]) {
    const contents = read(relativePath);
    assert.match(contents, /DietrichGebert/);
    assert.match(contents, /Alex Baretta/);
  }
});
