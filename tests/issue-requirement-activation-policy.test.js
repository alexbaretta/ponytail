#!/usr/bin/env node
// Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readSkill = name => fs.readFileSync(
  path.join(__dirname, '..', 'skills', name, 'SKILL.md'),
  'utf8',
);

test('issue intake uses configured type ownership without promoting requirements', () => {
  const issueTracking = readSkill('issue-tracking');
  const requirements = readSkill('requirements');

  assert.match(issueTracking, /collection is selected by\n+the issue type and host configuration/);
  assert.match(issueTracking, /At intake, link only approved requirements that already exist/);
  assert.match(issueTracking, /Do not create requirement\n+identifiers, UAT records, or prospective requirement annotations merely\n+because the issue was filed/);
  assert.match(requirements, /Issue intake alone creates no requirements, UAT, or completed-coverage\n+obligation/);
  assert.match(requirements, /behavior absent from the requirements remains issue-local/);
});

test('requirements activate only for standalone authorization or begun planned implementation', () => {
  const issueTracking = readSkill('issue-tracking');
  const requirements = readSkill('requirements');

  assert.match(requirements, /stakeholder authorizes implementation as a standalone development task/);
  assert.match(requirements, /issue has been added to an implementation plan or campaign and\n+   implementation of that plan or campaign begins/);
  assert.match(requirements, /Both conditions in the second gate are required/);
  assert.match(issueTracking, /Plan membership or approval without implementation beginning is not a\n+   gate/);
});
