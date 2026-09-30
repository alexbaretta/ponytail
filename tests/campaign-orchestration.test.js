#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  CampaignOrchestrationError,
  advanceLedger,
  newLedger,
  parseArguments,
  readLedgerV1,
  reconcile,
  recordActionResult,
  withWorktreeLock,
} = require('../src/campaign-orchestration');
const campaignCli = path.join(__dirname, '..', 'src', 'campaign-census.js');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function command(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function repository() {
  const root = temporaryDirectory('ponytail-orchestration');
  command(root, ['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'base\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'base']);
  return root;
}

function write(root, relative, contents) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function managedPlan(root, lifecycle, id, parentPlanId = null) {
  const directory = `pm/plans/${lifecycle}/${id}`;
  write(root, `${directory}/plan.md`, `# ${id}\n\n- **Plan ID:** \`${id}\`\n\n<!-- ponytail-plan-campaign\n${JSON.stringify({ schemaVersion: 2, id, parent_plan_id: parentPlanId, depends_on: [] }, null, 2)}\n-->\n`);
  if (parentPlanId !== null) {
    const parentPath = path.join(root, `pm/plans/in_progress/${parentPlanId}/plan.md`);
    fs.writeFileSync(parentPath, fs.readFileSync(parentPath, 'utf8').replace(
      '<!-- ponytail-plan-campaign',
      `- **Member plan:** [${id}](../../${lifecycle}/${id}/plan.md)\n\n<!-- ponytail-plan-campaign`,
    ));
  }
  write(root, `${directory}/sprints/S01.md`, `# S01\n\n<!-- ponytail-plan-sprint\n${JSON.stringify({ schemaVersion: 3, id: 'S01', planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] }, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } }, null, 2)}\n-->\n\n### [ ] Tasklet S01-F01-T01: fixture\n`);
  write(root, `${directory}/sprints/S01.tasklets.json`, `${JSON.stringify({ schemaVersion: 3, sprint: 'S01', features: { 'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T01' } }, tasklets: { 'S01-F01-T01': { depends_on: [], affinity: ['fixture'], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } }, null, 2)}\n`);
}

function campaignRepository() {
  const root = repository();
  write(root, '.agents/config/project/management.json', `${JSON.stringify({
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'], roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } },
    legacyPlanLayout: 'flat',
  }, null, 2)}\n`);
  managedPlan(root, 'in_progress', 'campaign');
  managedPlan(root, 'open', 'ready', 'campaign');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'campaign']);
  return root;
}

function graph(plans) {
  return {
    campaignId: 'campaign',
    submittedPlanId: 'campaign',
    lifecycle: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    plans,
  };
}

function captureError(callback) {
  try { callback(); } catch (error) {
    assert.ok(error instanceof CampaignOrchestrationError);
    return error;
  }
  assert.fail('expected CampaignOrchestrationError');
}

test('ledger reader enforces active plan, session, and worktree uniqueness', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'first', planId: 'ready', sessionId: 'session', worktree: '/worker', branch: 'worker',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
    state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments = [assignment, { ...assignment, id: 'second', idempotencyKey: 'key-2', attachToken: 'token-2' }];
  assert.equal(captureError(() => readLedgerV1(ledger)).code, 'CAMPAIGN_ASSIGNMENT_CONFLICT');
});

test('reconciler derives dependency-ready plans and only truly idle workers', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.workers.push({
    sessionId: 'idle-session', worktree: '/idle', branch: 'idle', revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  const status = reconcile(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'done', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'done' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: ['done'], lifecycle: 'open', path: 'ready' },
    { id: 'blocked', parentPlanId: 'campaign', dependsOn: ['ready'], lifecycle: 'open', path: 'blocked' },
  ]), ledger);
  assert.deepEqual(status.readyPlans, ['ready']);
  assert.deepEqual(status.idleWorkers.map(({ sessionId }) => sessionId), ['idle-session']);
});

test('advance durably selects one ready plan and returns the same pending action on retry', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready-a', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'a' },
    { id: 'ready-b', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'b' },
  ]);
  const first = advanceLedger(campaignGraph, ledger);
  const retry = advanceLedger(campaignGraph, ledger);
  assert.equal(first.type, 'CREATE_WORKER');
  assert.equal(retry.id, first.id);
  assert.equal(ledger.assignments.length, 1);
  assert.equal(ledger.assignments[0].planId, 'ready-a');

  const result = { ok: true, sessionId: 'worker', worktree: '/worker', branch: 'worker', revision: ledger.integrationRevision };
  recordActionResult(ledger, first.id, result);
  assert.equal(ledger.assignments[0].state, 'ACTIVE');
  assert.equal(ledger.pendingAction, null);
  assert.equal(recordActionResult(ledger, first.id, result).id, ledger.assignments[0].id);
});

test('advance reuses a clean idle worker before requesting a new worker', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.workers.push({
    sessionId: 'idle-session', worktree: '/idle', branch: 'idle', revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  const selected = advanceLedger(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]), ledger);
  assert.equal(selected.type, 'REUSE_WORKER');
  assert.equal(selected.payload.sessionId, 'idle-session');
});

test('completed work is classified by Git ancestry and fast-forward merged exactly once', () => {
  const root = repository();
  const base = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-qb', 'worker']);
  fs.appendFileSync(path.join(root, 'fixture.txt'), 'worker\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'worker']);
  const workerRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-q', 'main']);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.integrationRevision = base;
  ledger.assignments.push({
    id: 'assignment', planId: 'work', sessionId: 'worker-session', worktree: root, branch: 'worker',
    dispatchRevision: base, workerRevision, state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token',
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'worker-session', worktree: root, branch: 'worker', revision: workerRevision,
    clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
  });
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'work' },
  ]);
  assert.deepEqual(reconcile(campaignGraph, ledger).readyToMerge.map(({ planId }) => planId), ['work']);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(command(root, ['rev-parse', 'HEAD']), workerRevision);
  assert.equal(ledger.assignments[0].state, 'MERGED');
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments[0].state, 'CLEANUP_PENDING');
  const cleanup = advanceLedger(campaignGraph, ledger);
  assert.equal(cleanup.type, 'ARCHIVE_WORKTREE');
  assert.equal(advanceLedger(campaignGraph, ledger).id, cleanup.id);
  recordActionResult(ledger, cleanup.id, { ok: true });
  const archiveSession = advanceLedger(campaignGraph, ledger);
  assert.equal(archiveSession.type, 'ARCHIVE_SESSION');
  recordActionResult(ledger, archiveSession.id, { ok: true });
  assert.equal(ledger.assignments[0].state, 'ARCHIVED');
});

test('completed divergent work requires rebase and cannot merge', () => {
  const root = repository();
  const base = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-qb', 'worker']);
  fs.writeFileSync(path.join(root, 'worker.txt'), 'worker\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'worker']);
  const workerRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-q', 'main']);
  fs.writeFileSync(path.join(root, 'main.txt'), 'main\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'main']);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({
    id: 'assignment', planId: 'work', sessionId: 'worker-session', worktree: root, branch: 'worker',
    dispatchRevision: base, workerRevision, state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token',
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'worker-session', worktree: root, branch: 'worker', revision: workerRevision,
    clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
  });
  const status = reconcile(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'work' },
  ]), ledger);
  assert.deepEqual(status.rebaseRequired.map(({ planId }) => planId), ['work']);
  assert.deepEqual(status.readyToMerge, []);
});

test('campaign status and advance CLI expose stable JSON and do not duplicate dispatch', () => {
  const root = campaignRepository();
  const state = temporaryDirectory('ponytail-campaign-state');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: state, PONYTAIL_SESSION_ID: 'coordinator' };
  let result = spawnSync(process.execPath, [campaignCli, 'status', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).readyPlans, ['ready']);
  result = spawnSync(process.execPath, [campaignCli, 'advance', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  const first = JSON.parse(result.stdout);
  assert.equal(first.pendingAction.type, 'CREATE_WORKER');
  result = spawnSync(process.execPath, [campaignCli, 'advance', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).pendingAction.id, first.pendingAction.id);
});

test('implicit campaign selection reports every active candidate while explicit selection succeeds', () => {
  const root = campaignRepository();
  managedPlan(root, 'in_progress', 'second');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-campaign-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  let result = spawnSync(process.execPath, [campaignCli, 'status', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CAMPAIGN_ACTIVE_AMBIGUOUS.*campaign, second/);
  result = spawnSync(process.execPath, [campaignCli, 'status', 'second', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).campaignId, 'second');
});

test('action results require an explicit campaign and advance holds the worktree lock', () => {
  assert.deepEqual(parseArguments(['action-result', 'campaign', 'action', '--result', '{"ok":true}']), {
    operation: 'action-result', input: 'campaign', json: false, actionId: 'action', result: { ok: true },
  });
  assert.equal(captureError(() => parseArguments(['action-result', 'action', '--result', '{"ok":true}'])).code, 'CAMPAIGN_ORCHESTRATION_USAGE');

  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-worktree-lock') };
  withWorktreeLock(root, environment, () => {
    const locks = fs.readdirSync(environment.PONYTAIL_CAMPAIGN_STATE_DIR, { recursive: true }).filter((entry) => entry.endsWith('advance.lock'));
    assert.equal(locks.length, 1);
  });
  const remaining = fs.readdirSync(environment.PONYTAIL_CAMPAIGN_STATE_DIR, { recursive: true }).filter((entry) => entry.endsWith('advance.lock'));
  assert.deepEqual(remaining, []);
});
