#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { entries } = require('../src/plan-input');

const hook = path.join(__dirname, '..', 'hooks', 'plan-input.js');

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-hook-'));
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, '.agents', 'config', 'project'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents', 'config', 'project', 'management.json'), JSON.stringify({
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    },
    legacyPlanLayout: 'none',
  }));
  const plans = path.join(root, 'pm', 'plans', 'in_progress');
  fs.mkdirSync(path.join(plans, 'root'), { recursive: true });
  fs.mkdirSync(path.join(plans, 'child'), { recursive: true });
  fs.writeFileSync(path.join(plans, 'root', 'plan.md'), '# Root\n\nPlan ID: root\nStatus: in_progress\n\n<!-- ponytail-plan-campaign\n{"schemaVersion":1,"id":"root","parent_plan_id":null}\n-->\n');
  fs.writeFileSync(path.join(plans, 'child', 'plan.md'), '# Child\n\nPlan ID: child\nStatus: in_progress\n\n[Parent](../root/plan.md)\n<!-- ponytail-plan-campaign\n{"schemaVersion":1,"id":"child","parent_plan_id":"root"}\n-->\n');
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
  const result = run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue child -- preserve this requirement' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /for campaign root\.$/);
  assert.deepEqual(entries(root, 'root').map(({ source, submittedPlanId, prompt }) => ({ source, submittedPlanId, prompt })), [
    { source: 'codex-composer', submittedPlanId: 'child', prompt: 'preserve this requirement' },
  ]);
});

test('producer hook never consumes or blocks on a campaign queue', () => {
  const root = repository();
  run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue child -- first' });
  assert.equal(run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm test' } }).stdout, '');
  assert.equal(run(root, { hook_event_name: 'Stop', stop_hook_active: false }).stdout, '');
  assert.equal(entries(root, 'root')[0].status, 'open');
});
