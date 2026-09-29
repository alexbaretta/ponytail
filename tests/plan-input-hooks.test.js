#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { entries } = require('../src/plan-input');
const {
  advanceLedger,
  readWorkerBindings,
  reconcile,
  withLedgerLock,
} = require('../src/campaign-orchestration');

const hook = path.join(__dirname, '..', 'hooks', 'plan-input.js');

function repository() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-hook-')));
  assert.equal(spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root }).status, 0);
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
  for (const id of ['root', 'child']) {
    const sprints = path.join(plans, id, 'sprints');
    fs.mkdirSync(sprints);
    fs.writeFileSync(path.join(sprints, 'S01.md'), `# S01\n\n<!-- ponytail-plan-sprint\n${JSON.stringify({ schemaVersion: 3, id: 'S01', planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] }, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } }, null, 2)}\n-->\n\n### [ ] Tasklet S01-F01-T01: fixture\n`);
    fs.writeFileSync(path.join(sprints, 'S01.tasklets.json'), `${JSON.stringify({ schemaVersion: 3, sprint: 'S01', features: { 'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T01' } }, tasklets: { 'S01-F01-T01': { depends_on: [], affinity: ['fixture'], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } }, null, 2)}\n`);
  }
  assert.equal(spawnSync('git', ['add', '.'], { cwd: root }).status, 0);
  const commit = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root, encoding: 'utf8' });
  assert.equal(commit.status, 0, commit.stderr);
  return root;
}

function run(root, event, pluginData = path.join(root, '.plugin-data')) {
  return spawnSync(process.execPath, [hook], {
    cwd: root,
    input: JSON.stringify({ cwd: root, session_id: 'session', turn_id: 'turn', ...event }),
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
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

// Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION
test('worker attach is one-time, status re-roots, and worker mutations fail closed', () => {
  const root = repository();
  const pluginData = path.join(root, '.plugin-data');
  assert.equal(tool(root, 'ponytail plan-input coordinate root').status, 0);
  const environment = { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData };
  const campaignGraph = {
    campaignId: 'root',
    submittedPlanId: 'root',
    lifecycle: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    plans: [
      { id: 'root', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
      { id: 'ready', parentPlanId: 'root', dependsOn: [], lifecycle: 'open', path: 'ready' },
    ],
  };
  let pending;
  withLedgerLock(root, 'root', environment, (ledger) => { pending = advanceLedger(campaignGraph, ledger); });
  const worker = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-worker-'));
  fs.rmdirSync(worker);
  const add = spawnSync('git', ['worktree', 'add', '-qb', 'worker', worker], { cwd: root, encoding: 'utf8' });
  assert.equal(add.status, 0, add.stderr);

  const attach = run(worker, { hook_event_name: 'PreToolUse', session_id: 'worker-session', tool_name: 'exec_command', tool_input: { cmd: `ponytail campaign attach ${pending.payload.attachToken}` } }, pluginData);
  assert.equal(attach.status, 0, attach.stderr);
  assert.match(JSON.parse(attach.stdout).hookSpecificOutput.additionalContext, /authenticated for campaign root/);
  assert.equal(readWorkerBindings(environment).bindings[0].repositoryRoot, root);
  const attachCli = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'campaign-census.js'), 'attach', pending.payload.attachToken], {
    cwd: worker,
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
    encoding: 'utf8',
  });
  assert.equal(attachCli.status, 0, attachCli.stderr);
  assert.match(attachCli.stdout, /Attached worker worker-session to campaign root/);
  const workerBinding = readWorkerBindings(environment).bindings[0];
  const actionResult = JSON.stringify({
    ok: true,
    sessionId: workerBinding.sessionId,
    worktree: workerBinding.worktree,
    branch: workerBinding.branch,
    revision: workerBinding.revision,
  });
  const actionPermission = run(root, { hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: `ponytail campaign action-result ${pending.id} --result '${actionResult}'` } }, pluginData);
  assert.match(JSON.parse(actionPermission.stdout).hookSpecificOutput.additionalContext, /Coordinator session authenticated/);
  const actionCli = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'campaign-census.js'), 'action-result', pending.id, '--result', actionResult], {
    cwd: root,
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
    encoding: 'utf8',
  });
  assert.equal(actionCli.status, 0, actionCli.stderr);
  assert.equal(JSON.parse(actionCli.stdout).pendingAction, null);
  assert.equal(JSON.parse(actionCli.stdout).assignments[0].state, 'ACTIVE');

  const status = run(worker, { hook_event_name: 'PreToolUse', session_id: 'worker-session', tool_name: 'exec_command', tool_input: { cmd: 'ponytail campaign status --json' } }, pluginData);
  assert.match(JSON.parse(status.stdout).hookSpecificOutput.additionalContext, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const statusCli = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'campaign-census.js'), 'status', 'root', '--json'], {
    cwd: worker,
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
    encoding: 'utf8',
  });
  assert.equal(statusCli.status, 0, statusCli.stderr);
  assert.equal(JSON.parse(statusCli.stdout).effectiveWorktree, root);
  assert.equal(JSON.parse(statusCli.stdout).invocationWorktree, fs.realpathSync(worker));
  const reportCli = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'campaign-census.js'), 'report', 'root', '--json'], {
    cwd: worker,
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
    encoding: 'utf8',
  });
  assert.equal(reportCli.status, 2);
  assert.match(reportCli.stderr, /CAMPAIGN_WORKER_READ_SCOPE.*use campaign status/);
  const mutation = run(worker, { hook_event_name: 'PreToolUse', session_id: 'worker-session', tool_name: 'exec_command', tool_input: { cmd: 'ponytail campaign advance --json' } }, pluginData);
  assert.equal(JSON.parse(mutation.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(JSON.parse(mutation.stdout).hookSpecificOutput.permissionDecisionReason, /run the mutation from its coordinator worktree/);
  const mutationCli = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'campaign-census.js'), 'advance', 'root', '--json'], {
    cwd: worker,
    env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_CAMPAIGN_STATE_DIR: pluginData },
    encoding: 'utf8',
  });
  assert.equal(mutationCli.status, 1);
  assert.match(mutationCli.stderr, /CAMPAIGN_WORKER_MUTATION/);

  const replay = run(worker, { hook_event_name: 'PreToolUse', session_id: 'different-worker', tool_name: 'exec_command', tool_input: { cmd: `ponytail campaign attach ${pending.payload.attachToken}` } }, pluginData);
  assert.equal(JSON.parse(replay.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(JSON.parse(replay.stdout).hookSpecificOutput.permissionDecisionReason, /unknown, stale, or already used/);
  assert.equal(reconcile(campaignGraph, require('../src/campaign-orchestration').readLedger(root, 'root', environment), worker).effectiveWorktree, root);
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
