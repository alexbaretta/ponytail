#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const test = require('node:test');
const { getPonytailInstructions } = require('../hooks/ponytail-instructions');

test('deprecated campaign scheduler owns observation and diagnostic priority', () => {
  // Traceability: verifies REQ-PONYTAIL-CLI-AGENT-HARNESS
  const policy = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'skills', 'parallel-plan-scheduler', 'SKILL.md'), 'utf8');
  assert.match(policy, /campaign\s+observe <campaign-root> --snapshot <json>/);
  assert.match(policy, /Blocking campaign diagnostics outrank new dispatch/);
  assert.match(policy, /worker follows the worker-owned recovery protocol without waiting for\n`advance` or `ready-actions` to initiate it/);
  assert.match(policy, /waiting for coordinator input from one that\n+   has finished/);
});

const modes = ['off', 'lite', 'full', 'ultra'];
const alwaysOnRules = [
  'Do not repeat yourself',
  'Do not create aliases',
  'semantic relatedness alone does not conform',
  'Do not add fallback',
  'Preserve strong static types',
  'Treat the existing cloud-resource topology as an architectural contract',
  'must not create, configure, provision, apply, or deploy it without the',
  'does not implicitly authorize',
  'present the existing-topology alternative',
  'Treat an input as QA-relevant when a configured product execution',
  'Pure prose, project-management records',
  'but still require applicable syntax, schema, link, generator',
  'At the tasklet or standalone-change',
  'run only the smallest focused unit, static, or contract proof',
  'feature gate, reuse unchanged tasklet evidence',
  'smallest sufficient independently',
  'executable integration workflow',
  'At the sprint gate, run every affected',
  'integration Arc against the reconciled sprint tree',
  'run each affected repository\'s applicable full unit-test',
  'every applicable integration',
  'Suite against the final tree',
  'Reuse passing',
  'evidence while its relevant inputs remain unchanged',
  'never fall back to a',
  'broader command',
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
  'AGENTS.local.md',
  'Never require the user to perform a test step that the agent can complete',
  'automated integration test must',
  'automate its complete Arc',
  'complete the interaction rather than block on manual user action',
];

test('portable policy loads only safe developer-private project instructions', () => {
  // Traceability: verifies REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS
  const instructions = getPonytailInstructions('full');
  assert.match(instructions, /root-level `AGENTS\.local\.md`/);
  assert.match(instructions, /regular non-symlink file/);
  assert.match(instructions, /untracked and ignored by Git/);
  assert.match(instructions, /must not weaken or contradict/);
  assert.match(instructions, /Never\s+store secrets/);
});

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
