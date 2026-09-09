#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  parseRegistry,
  readRegistry,
  validateProjectSkillNames,
  validatePublishedNames,
  validateRegistry,
} = require('../scripts/registry');

test('canonical registry matches all live-development sources', () => {
  const entries = validateRegistry();
  assert.ok(entries.some((entry) => entry.name === 'git-write-escalation' && entry.status === 'disabled'));
  assert.ok(entries.every((entry) => !/benchmark/i.test(entry.name)));
});

test('registry rejects duplicate entries', () => {
  const line = 'skill\tenabled\texample\tskills/example\tcodex\treason';
  assert.throws(() => parseRegistry(`${line}\n${line}\n`), /duplicate registry entry/);
});

test('registry rejects bundled and multiply owned project skill names', () => {
  const entries = readRegistry();
  assert.throws(() => validateProjectSkillNames(entries, ['ponytail']), /collides/);
  assert.throws(() => validateProjectSkillNames(entries, ['local', 'local']), /multiple owners/);
});

test('published surfaces must be registered for their host', () => {
  const entries = readRegistry();
  assert.doesNotThrow(() => validatePublishedNames(entries, 'command', 'opencode', ['ponytail-help']));
  assert.throws(
    () => validatePublishedNames(entries, 'skill', 'openclaw', ['unregistered']),
    /unregistered openclaw skill/,
  );
});
