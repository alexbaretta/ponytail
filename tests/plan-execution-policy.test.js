#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('plan execution serializes fast input before selector-based resumption', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  assert.match(policy, /Every campaign has exactly one campaign coordinator/);
  assert.match(policy, /plan-input coordinate <campaign-root>/);
  assert.match(policy, /before running a sprint or tasklet selector/);
  assert.match(policy, /Only that\ncoordinator may list, claim, complete/);
  assert.match(policy, /plan-input claim <campaign-root> --json/);
  assert.match(policy, /Do not claim or act on a newer entry while one is in progress/);
  assert.match(policy, /plan-input complete\n+   <campaign-root> <id> --record <pm-path>/);
  assert.match(policy, /rerun the canonical sprint and tasklet selectors/);
  assert.match(policy, /never resume from conversational memory/);
  assert.match(policy, /\/ponytail-enqueue <instruction>/);
  assert.match(policy, /plan-input release <campaign-root>/);
});
