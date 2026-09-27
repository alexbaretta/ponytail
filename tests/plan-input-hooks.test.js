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
    env: { ...process.env, PLUGIN_DATA: path.join(root, '.plugin-data') },
    encoding: 'utf8',
  });
}

function tool(root, cmd, sessionId = 'session') {
  return run(root, { hook_event_name: 'PreToolUse', session_id: sessionId, tool_name: 'exec_command', tool_input: { cmd } });
}

test('coordinator binding lets composer enqueue derive the campaign', () => {
  const root = repository();
  const coordinate = tool(root, 'ponytail plan-input coordinate child');
  assert.equal(coordinate.status, 0, coordinate.stderr);
  assert.match(JSON.parse(coordinate.stdout).hookSpecificOutput.additionalContext, /session bound to campaign root/);

  const result = run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue preserve this requirement' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /for campaign root\.$/);
  assert.deepEqual(entries(root, 'root').map(({ source, submittedPlanId, prompt }) => ({ source, submittedPlanId, prompt })), [
    { source: 'codex-composer', submittedPlanId: 'child', prompt: 'preserve this requirement' },
  ]);
});

test('coordinator bindings are exclusive, releasable, and fail closed', () => {
  const root = repository();
  const unbound = run(root, { hook_event_name: 'UserPromptSubmit', session_id: 'other', prompt: '/ponytail-enqueue first' });
  assert.equal(JSON.parse(unbound.stdout).decision, 'block');
  assert.match(JSON.parse(unbound.stdout).reason, /not bound to a campaign/);
  assert.deepEqual(entries(root, 'root'), []);

  assert.equal(tool(root, 'ponytail plan-input coordinate child').status, 0);
  const conflict = tool(root, 'ponytail plan-input coordinate root', 'other');
  assert.equal(JSON.parse(conflict.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(JSON.parse(conflict.stdout).hookSpecificOutput.permissionDecisionReason, /already coordinated by another session/);

  const release = tool(root, 'ponytail plan-input release child');
  assert.match(JSON.parse(release.stdout).hookSpecificOutput.additionalContext, /session released campaign root/);
  assert.equal(tool(root, 'ponytail plan-input coordinate root', 'other').status, 0);
});

test('producer hook ignores unrelated boundaries and never consumes a queue', () => {
  const root = repository();
  tool(root, 'ponytail plan-input coordinate child');
  run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue first' });
  assert.equal(run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm test' } }).stdout, '');
  assert.equal(run(root, { hook_event_name: 'PreToolUse', tool_name: 'functions.exec', tool_input: { code: 'await tools.exec_command({cmd:"npm test"})' } }).stdout, '');
  assert.equal(run(root, { hook_event_name: 'Stop', stop_hook_active: false }).stdout, '');
  assert.equal(entries(root, 'root')[0].status, 'open');
});

test('code-mode coordinator command establishes the same binding', () => {
  const root = repository();
  const result = run(root, {
    hook_event_name: 'PreToolUse',
    tool_name: 'functions.exec',
    tool_input: { code: 'const r = await tools.exec_command({cmd:"ponytail plan-input coordinate child"}); text(r.output);' },
  });
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /campaign root/);
  const enqueue = run(root, { hook_event_name: 'UserPromptSubmit', prompt: '/ponytail-enqueue code mode' });
  assert.equal(JSON.parse(enqueue.stdout).decision, 'block');
});
