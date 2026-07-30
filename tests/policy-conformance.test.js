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
  'Add success and failure or edge-path unit coverage',
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
