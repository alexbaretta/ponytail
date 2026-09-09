#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const debtSurfaces = [
  'skills/ponytail-debt/SKILL.md',
  'commands/ponytail-debt.toml',
  '.opencode/command/ponytail-debt.md',
  '.openclaw/skills/ponytail-debt/SKILL.md',
];

test('debt surfaces use the project-neutral marker and canonical document', () => {
  for (const relativePath of debtSurfaces) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(content, /tech-debt:/);
    assert.doesNotMatch(content, /`ponytail:`|pony(?:tail)?: comments/);
  }

  const skill = fs.readFileSync(
    path.join(root, 'skills/ponytail-debt/SKILL.md'),
    'utf8',
  );
  assert.match(skill, /canonical technical-debt document/);
  assert.match(skill, /Do not\s+create a second debt ledger/);
});
