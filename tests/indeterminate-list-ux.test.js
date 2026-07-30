#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'indeterminate-list-ux', 'SKILL.md'),
  'utf8',
);

test('indeterminate lists require bounded infinite scrolling', () => {
  assert.match(skill, /React infinite-scroll container/);
  assert.match(skill, /backend API that accepts a bounded `limit`/);
  assert.match(skill, /returns a cursor or equivalent page token/);
  assert.match(skill, /Infinite scrolling is the required interaction/);
  assert.match(skill, /Do not fetch the\nentire result set/);
});

test('indeterminate lists prohibit request fanout', () => {
  assert.match(skill, /total_requests = h \+ i \* P \+ k \* N/);
  assert.match(skill, /`i == 1`/);
  assert.match(skill, /`k == 0`/);
  assert.match(skill, /zero row-triggered backend requests/);
  assert.match(skill, /fails if any fixture row identifier appears in an unexpected request/);
});

test('indeterminate list guidance is project neutral', () => {
  assert.doesNotMatch(skill, /Anchorbase|IPG|GWEN|merchant|Omnisearch/);
});
