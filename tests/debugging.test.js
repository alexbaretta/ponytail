#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const debugging = fs.readFileSync(
  path.join(root, 'skills', 'debugging', 'SKILL.md'),
  'utf8',
);
const planExecution = fs.readFileSync(
  path.join(root, 'skills', 'plan-execution', 'SKILL.md'),
  'utf8',
);
const uxTesting = fs.readFileSync(
  path.join(root, 'skills', 'ux-testing', 'SKILL.md'),
  'utf8',
);

test('debugging applies beyond user-facing and planned bugs', () => {
  assert.match(debugging, /failed test/);
  assert.match(debugging, /performance regression/);
  assert.match(debugging, /build failure/);
  assert.match(debugging, /integration failure/);
});

test('debugging requires differential diagnosis before repair', () => {
  assert.match(debugging, /Capture one bounded failure dossier/);
  assert.match(debugging, /Classify the owning layer before editing/);
  assert.match(debugging, /Build a differential diagnosis/);
  assert.match(debugging, /Select one hypothesis/);
  assert.match(debugging, /smallest discriminating probe/);
  assert.match(debugging, /If the prediction fails, discard\s+or revise the hypothesis/);
  assert.match(debugging, /A root cause is confirmed when evidence identifies the owning mechanism/);
});

test('debugging prevents expensive and repeated guess-and-check runs', () => {
  assert.match(debugging, /Before an expensive rerun, record the hypothesis/);
  assert.match(debugging, /Resume from\nthe failed boundary/);
  assert.match(debugging, /Do not use them as\nthe primary interactive debugger/);
  assert.match(debugging, /Establish correctness before measuring performance/);
  assert.match(debugging, /cluster failures by causal mechanism/i);
  assert.match(debugging, /After three failed corrective attempts/);
  assert.match(debugging, /reassess the model, ownership boundary, or architecture/);
});

test('debugging defines safe stateful restart and outcome metrics', () => {
  assert.match(debugging, /Every resumable unit needs an explicit restart contract/);
  assert.match(debugging, /Reuse deterministic operation, request, and idempotency identities/);
  assert.match(debugging, /checkpoint is incomplete, inconsistent, or owns a busy or poisoned resource/);
  assert.match(debugging, /Measure debugging progress through resolved causal classes/);
  assert.match(debugging, /their quantity is not evidence that the failing behavior improved/);
});

test('specialized workflows delegate diagnosis to debugging', () => {
  assert.match(planExecution, /Apply `debugging` to establish the\nroot cause/);
  assert.match(uxTesting, /apply `debugging` to distinguish the visible symptom/);
  assert.match(uxTesting, /supporting evidence/);
});
