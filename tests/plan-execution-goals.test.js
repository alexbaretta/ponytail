// Copyright (c) Ponytail contributors.
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'parallel-plan-scheduler', 'SKILL.md'), 'utf8');

test('Codex campaign workers establish and retain native assignment Goals before work', () => {
  assert.match(skill, /every new or resumed worker must have an active native\s+Goal for its exact campaign assignment before it executes the action/);
  assert.match(skill, /call `get_goal` first/);
  assert.match(skill, /call\s+`create_goal` with an objective that names the exact campaign ID, plan ID,\s+and assignment ID/);
  assert.match(skill, /Call `get_goal`\s+again and report the active objective to the coordinator/);
  assert.match(skill, /Do not fall back to a\s+one-turn prompt when Goals are unavailable or cannot be verified/);
  assert.match(skill, /Mark it complete only after the\s+integrated plan is DONE with required evidence/);
});
