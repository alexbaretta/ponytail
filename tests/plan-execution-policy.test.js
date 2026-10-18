#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Traceability: verifies REQ-REPAIR-PLAN-STARTING-GATE
test('starting policy admits only expressly owned reproduced failures and preserves final gates', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills/plan-execution/SKILL.md'), 'utf8');
  assert.match(policy, /reproduced pre-existing failure expressly owned\s+by the approved repair objective/u);
  assert.match(policy, /Before kickoff, record its exact failing\s+selection and evidence, governing requirement, unresolved obligation and bounded\s+repair scope/u);
  assert.match(policy, /does not admit unrelated, unplanned or newly\s+introduced failures/u);
  assert.match(policy, /failure remains unresolved and prevents final acceptance\s+until repaired/u);
  assert.match(policy, /never weaken assertions/u);
});


// Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION
test('standalone and planned issue execution share the implementation activation gate', () => {
  const readSkill = name => fs.readFileSync(
    path.join(__dirname, '..', 'skills', name, 'SKILL.md'), 'utf8',
  );
  const issueTracking = readSkill('issue-tracking');
  const requirements = readSkill('requirements');
  const userAcceptanceTesting = readSkill('user-acceptance-testing');

  assert.match(issueTracking, /stakeholder\n+   authorizes the issue as a standalone development task/);
  assert.match(requirements, /Both conditions in the second gate are required/);
  assert.match(userAcceptanceTesting, /merely planning an issue does not\n+incorporate a requirement and must not create UAT coverage/);
});
