#!/usr/bin/env node
// Copyright (c) 2026 DietrichGebert.
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// File-based adapters are generated from registry-owned canonical commands.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const { enabled, readRegistry } = require('../scripts/registry');
const { renderOpenCode } = require('../scripts/build-command-adapters');
const commands = enabled(readRegistry(), 'command');

test('registry contains the base command', () => {
  assert.ok(commands.some((entry) => entry.name === 'ponytail'));
});

test('every registered command ships a Claude commands/*.toml', () => {
  for (const entry of commands.filter((entry) => entry.hosts.includes('claude'))) {
    assert.ok(
      fs.existsSync(path.join(root, entry.source)),
      `missing ${entry.source}`,
    );
  }
});

test('every OpenCode command matches its generated adapter', () => {
  for (const entry of commands.filter((entry) => entry.hosts.includes('opencode'))) {
    assert.equal(
      fs.readFileSync(path.join(root, '.opencode', 'command', `${entry.name}.md`), 'utf8'),
      renderOpenCode(entry),
    );
  }
});
