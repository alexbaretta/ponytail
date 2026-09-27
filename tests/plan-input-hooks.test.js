#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { claim, complete, entries } = require('../src/plan-input');

const hook = path.join(__dirname, '..', 'hooks', 'plan-input.js');

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-hook-'));
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, 'pm', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'pm', 'requirements', 'index.md'), '# Requirements\n');
  return root;
}

function run(root, event) {
  return spawnSync(process.execPath, [hook], {
    cwd: root,
    input: JSON.stringify({ cwd: root, session_id: 'session', turn_id: 'turn', ...event }),
    encoding: 'utf8',
  });
}

test('composer command durably enqueues then blocks ordinary prompt delivery', () => {
  const root = repository();
  const result = run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue preserve this requirement' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /^Recorded as plan input /);
  assert.deepEqual(entries(root).map(({ source, prompt }) => ({ source, prompt })), [
    { source: 'codex-composer', prompt: 'preserve this requirement' },
  ]);
});

test('safe-boundary hooks prioritize open work without preempting an ingestion claim', () => {
  const root = repository();
  run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue first' });
  run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue second' });
  let result = run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm test' } });
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
  result = run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'ponytail plan-input claim --json' } });
  assert.equal(result.stdout, '');
  const first = claim(root);
  result = run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm test' } });
  assert.equal(result.stdout, '', 'a newer entry must not interrupt the claimed entry');
  result = run(root, { hook_event_name: 'Stop', stop_hook_active: false });
  assert.match(JSON.parse(result.stdout).reason, new RegExp(first.id));
  complete(root, first.id, ['pm/requirements/index.md']);
  result = run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm test' } });
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});
