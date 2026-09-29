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

test('planning and issue policy records prospective traceability without claiming coverage', () => {
  const readSkill = name => fs.readFileSync(
    path.join(__dirname, '..', 'skills', name, 'SKILL.md'), 'utf8',
  );
  const traceability = readSkill('requirements-traceability');
  const planExecution = readSkill('plan-execution');
  const issueTracking = readSkill('issue-tracking');
  assert.match(traceability, /plans-implementation/);
  assert.match(traceability, /plans-verification/);
  assert.match(traceability, /introduces/);
  assert.match(traceability, /never satisfy\ncompleted implementation/);
  assert.match(traceability, /from tasklet S01-F02-T03/);
  assert.match(planExecution, /canonical\nprospective annotation beside the stable plan or tasklet record/);
  assert.match(planExecution, /do not claim completed\ncoverage/);
  assert.match(issueTracking, /canonical\nprospective annotations beside the stable issue record/);
  assert.match(issueTracking, /never satisfy completed coverage/);
});
