#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'variant-neutrality', 'SKILL.md'),
  'utf8',
);

test('variant-specific facts come only from project configuration', () => {
  assert.match(skill, /host project's configured variant-neutrality owner/);
  assert.match(skill, /exact discriminant fields and values or canonical registries/);
  assert.match(skill, /neutral and variant-specific source ownership paths/);
  assert.match(skill, /Do not assume a companion project-local skill/);
  assert.match(skill, /configuration-discrepancy policy instead of\ninventing them/);
});

test('shared contracts isolate variant-specific structure', () => {
  assert.match(skill, /Shared root contracts and shared operational contracts must be neutral/);
  assert.match(skill, /subtree whose type is rooted by that variant's configured discriminant/);
  assert.match(skill, /generic map,\noptional field cluster, alias, or neutral-looking wrapper is not a substitute/);
});

test('shared operations dispatch exhaustively without fallback', () => {
  assert.match(skill, /exhaustive `switch`, `match`, or equivalent/);
  assert.match(skill, /mechanical iteration over the complete canonical registry/);
  assert.match(skill, /must not directly select a singleton variant/);
  assert.match(skill, /without a\n\s+fallback branch/);
});

test('variant neutrality guidance is project neutral', () => {
  assert.doesNotMatch(
    skill,
    /Anchorbase|IPG|IPW|GWEN|Dealertrack|Valor|CardPointe|Clover|PAAPI|FSAPI|BSClient|qa-ipx/,
  );
});
