#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const test = require('node:test');
const { getPonytailInstructions } = require('../hooks/ponytail-instructions');

const modes = ['off', 'lite', 'full', 'ultra'];
const alwaysOnRules = [
  'Do not repeat yourself',
  'Do not create aliases',
  'Do not add fallback',
  'Preserve strong static types',
  'Add the smallest durable regression proof',
  'Do not duplicate the same behavioral',
  'run only the smallest',
  'Do not run a full unit-test command or a broad unit-test subset',
  'Run each applicable configured full unit-test command once',
  'never fall',
  'When the configured build-impact query reports affected targets',
  'no affected or indeterminate targets, skip the build',
  'Treat the project directory supplied for the task as a fixed operational',
  'boundary. Do not switch to another checkout or worktree',
  'worktree, and do not create a',
  'worktree. Modify a path outside the project directory only when the user',
  'literally and explicitly asks to modify that outside path',
  'outside path. Never infer that',
  'without it, refuse the outside modification',
  'Whenever returning control to the user, print the current local timestamp',
];

function withoutModeSelection(text) {
  return text
    .replace(/^PONYTAIL MODE ACTIVE — level: \w+\n\n/, '')
    .replace(/^\| \*\*\w+\*\* \|.*\|$/m, '| **selected** |');
}

test('every compaction level preserves all always-on rules', () => {
  for (const mode of modes) {
    const instructions = getPonytailInstructions(mode);
    for (const rule of alwaysOnRules) assert.match(instructions, new RegExp(rule));
  }
});

test('compaction level changes only its selected table row', () => {
  const bodies = modes.map((mode) => withoutModeSelection(getPonytailInstructions(mode)));
  for (const body of bodies.slice(1)) assert.equal(body, bodies[0]);
});

test('runtime policy comes from the canonical skill, not root AGENTS.md', () => {
  const instructions = getPonytailInstructions('full');
  assert.match(instructions, /## Always-On Rules/);
  assert.doesNotMatch(instructions, /## Repository Commands/);
});
