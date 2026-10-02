#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION
// Traceability: verifies REQ-WORKER-WORKTREE-RETENTION

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  CampaignOrchestrationError,
  advanceLedger,
  bindWorker,
  scheduleReadyPlans,
  ledgerPath,
  reconcileLedger,
  newLedger,
  parseArguments,
  readActionV1,
  readActionV2,
  readActionV4,
  readHostObservation,
  readLedger,
  readLedgerV1,
  readLedgerV2,
  readLedgerV3,
  readLedgerV4,
  readLedgerV5,
  readWorkerDeliveries,
  readWorkerBindings,
  readReadyActionsV1,
  readReadyActionsV2,
  readReadyActionsV4,
  readRunnablePlansV1,
  readRunnablePlansV2,
  CampaignRunnablePlansReaders,
  runnablePlanDiagnostics,
  recordExecutionBlocker,
  readyActions,
  reconcile,
  recordActionResult,
  retireWorktree,
  recordWorkerDelivery,
  replaceRecoveredWorkerBinding,
  validateActionResultBinding,
  writeWorkerDeliveries,
  writeHostObservation,
  withLedgerLock,
  withWorktreeLock,
} = require('../src/campaign-orchestration');
const campaignCli = path.join(__dirname, '..', 'src', 'campaign-census.js');

test('retirement fences the original archived session and reclaims only its authenticated worktree', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retirement-state') };
  const claimsPath = path.join(temporaryDirectory('ponytail-retirement-claims'), 'claims.json');
  write(root, '.agents/config/project/worktree-lifecycle.json', JSON.stringify({ schemaVersion: 1, adapterPath: 'adapter.js' }));
  write(root, 'adapter.js', `#!/usr/bin/env node
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const claimsPath = ${JSON.stringify(claimsPath)};
const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
if (request.operation === 'inventory') {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'inventory', claims }));
} else {
  const claim = claims.find(item => item.claimId === request.claim.claimId && item.generation === request.claim.generation && item.worktreePath === request.claim.worktreePath);
  if (!claim || claim.disposition !== 'reclaim') throw new Error('unsafe claim');
  const result = spawnSync('git', ['worktree', 'remove', claim.worktreePath], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  fs.writeFileSync(claimsPath, JSON.stringify(claims.filter(item => item !== claim)));
  process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: claim.claimId, generation: claim.generation, outcome: 'reclaimed', reason: 'canonical retirement complete' }));
}
`);
  fs.chmodSync(path.join(root, 'adapter.js'), 0o755);
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'lifecycle']);
  const worktree = path.join(fs.realpathSync(temporaryDirectory('ponytail-retirement-worker')), 'worker');
  const unrelatedWorktree = path.join(fs.realpathSync(temporaryDirectory('ponytail-retirement-unrelated')), 'worker');
  command(root, ['worktree', 'add', '--detach', worktree]);
  command(root, ['worktree', 'add', '--detach', unrelatedWorktree]);
  const claims = [worktree, unrelatedWorktree].map((worktreePath, index) => ({ claimId: `claim-${index}`, generation: `generation-${index}`, state: 'abandoned', worktreePath, disposition: 'reclaim', reason: 'archived owner' }));
  fs.writeFileSync(claimsPath, JSON.stringify(claims));
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = { id: 'assignment', planId: 'work', sessionId: 'original-session', worktree, branch: 'worker', dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'CLEANUP_PENDING', idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false };
  ledger.assignments.push(assignment);
  ledger.workers.push({ sessionId: assignment.sessionId, worktree, branch: assignment.branch, revision: assignment.workerRevision, clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false });
  const cleanup = readActionV4({ schemaVersion: 4, id: 'original-action', type: 'ARCHIVE_WORKTREE', assignmentId: assignment.id, idempotencyKey: 'cleanup-key', payload: { sessionId: assignment.sessionId, worktree } });
  ledger.pendingActions.push(cleanup);
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), JSON.stringify({ schemaVersion: 1, bindings: [{ repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator', attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree, branch: assignment.branch, revision: assignment.workerRevision, boundAt: new Date().toISOString() }] }));
  const campaignGraph = graph([{ id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' }, { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'work' }]);
  const observe = (state, observedAt = new Date().toISOString()) => writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt, completeSessionIds: [assignment.sessionId], sessions: [{ sessionId: assignment.sessionId, state, worktree, managedWorktree: true }] }, environment);
  observe('working');
  assert.equal(captureError(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment)).code, 'CAMPAIGN_RETIREMENT_UNSAFE');
  assert.equal(fs.existsSync(worktree), true);
  observe('archived', new Date(Date.now() - 6 * 60 * 1000).toISOString());
  assert.throws(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment));
  observe('archived');
  assert.doesNotThrow(() => readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph));
  const movedWorktree = `${worktree}-temporarily-moved`;
  fs.renameSync(worktree, movedWorktree);
  try {
    assert.equal(captureError(() => validateActionResultBinding(ledger, cleanup.id, { ok: true }, environment)).code, 'CAMPAIGN_ACTION_RESULT');
  } finally {
    fs.renameSync(movedWorktree, worktree);
  }
  fs.writeFileSync(path.join(worktree, 'uncommitted.txt'), 'keep');
  assert.equal(captureError(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment)).code, 'CAMPAIGN_RETIREMENT_UNSAFE');
  fs.unlinkSync(path.join(worktree, 'uncommitted.txt'));
  campaignGraph.plans[1].lifecycle = 'in_progress';
  assert.throws(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment));
  campaignGraph.plans[1].lifecycle = 'closed';
  fs.writeFileSync(claimsPath, JSON.stringify([{ ...claims[0], disposition: 'retain' }, claims[1]]));
  assert.throws(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment));
  assert.equal(ledger.pendingActions[0].id, cleanup.id);
  fs.writeFileSync(claimsPath, JSON.stringify(claims));
  retireWorktree(campaignGraph, ledger, cleanup.id, environment);
  assert.equal(fs.existsSync(worktree), false);
  assert.equal(command(root, ['worktree', 'list', '--porcelain']).includes(worktree), false);
  assert.equal(fs.existsSync(unrelatedWorktree), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(claimsPath, 'utf8')), [claims[1]]);
  assert.equal(command(root, ['branch', '--show-current']), 'main');
  assert.equal(command(root, ['rev-parse', 'HEAD']), assignment.workerRevision);
  assert.equal(assignment.sessionId, 'original-session');
  assert.equal(assignment.worktreeArchived, true);
  assert.equal(ledger.completedActions[0].actionId, cleanup.id);
  assert.doesNotThrow(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment));
  // Adapter completed, but the process stopped before persisting the action result.
  ledger.completedActions = [];
  ledger.pendingActions = [cleanup];
  assignment.worktreeArchived = false;
  ledger.workers[0].worktreeArchived = false;
  assert.doesNotThrow(() => retireWorktree(campaignGraph, ledger, cleanup.id, environment));
  assert.equal(ledger.completedActions[0].actionId, cleanup.id);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(assignment.state, 'ARCHIVED');
});

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
    plans: plans.map((plan) => ({ runnableTasklets: { sprintId: 'S01', taskletIds: ['S01-F01-T01'] }, ...plan })),
  };
}

function captureError(callback) {
  try { callback(); } catch (error) {
    assert.ok(error instanceof CampaignOrchestrationError);
    return error;
  }
  assert.fail('expected CampaignOrchestrationError');
}

test('historical ledgers normalize recovery and cleanup actions and the current writer emits V5', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-ledger-version') };
  const current = newLedger(root, 'campaign', 'coordinator');
  const { pendingActions, ...ledger } = current;
  const legacy = readLedgerV1({ ...ledger, schemaVersion: 1, pendingAction: null });
  const file = ledgerPath(root, 'campaign', environment);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(legacy)}\n`);

  assert.equal(readLedger(root, 'campaign', environment).schemaVersion, 5);
  assert.deepEqual(readLedger(root, 'campaign', environment).pendingActions, []);
  assert.equal(readLedgerV2({ ...current, schemaVersion: 2 }).schemaVersion, 2);
  assert.equal(readLedgerV3({ ...current, schemaVersion: 3 }).schemaVersion, 3);
  assert.equal(readLedgerV4({ ...current, schemaVersion: 4 }).schemaVersion, 4);
  const recovery = {
    schemaVersion: 2, id: 'recovery', type: 'RECOVER_WORKTREE', assignmentId: 'assignment',
    idempotencyKey: 'recovery-key', payload: { sessionId: 'session', worktree: '/worker', branch: 'worker', revision: current.integrationRevision },
  };
  assert.deepEqual(readActionV2(recovery), recovery);
  const normalizedRecovery = readLedgerV5({ ...current, schemaVersion: 5, pendingActions: [{
    ...recovery,
    schemaVersion: 4,
    payload: { sessionId: 'session', previousWorktree: '/worker', branch: 'worker', revision: current.integrationRevision },
  }] }).pendingActions[0];
  assert.deepEqual(readActionV4(normalizedRecovery), normalizedRecovery);
  assert.equal(captureError(() => readActionV1({ ...recovery, schemaVersion: 1 })).code, 'CAMPAIGN_ORCHESTRATION_SCHEMA');
  assert.equal(captureError(() => readLedgerV2({ ...current, schemaVersion: 2, pendingActions: [recovery] })).code, 'CAMPAIGN_ORCHESTRATION_SCHEMA');
  assert.equal(readLedgerV3({ ...current, schemaVersion: 3, pendingActions: [recovery] }).pendingActions[0].type, 'RECOVER_WORKTREE');
  assert.equal(captureError(() => readLedgerV4({ ...current, schemaVersion: 4, pendingActions: [normalizedRecovery] })).code, 'CAMPAIGN_ORCHESTRATION_SCHEMA');
  fs.writeFileSync(file, `${JSON.stringify({ ...current, schemaVersion: 3, pendingActions: [recovery] })}\n`);
  const upgraded = readLedger(root, 'campaign', environment);
  assert.equal(upgraded.schemaVersion, 5);
  assert.deepEqual(upgraded.pendingActions[0], normalizedRecovery);
  withLedgerLock(root, 'campaign', environment, () => null);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion, 5);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pendingActions[0].schemaVersion, 4);
  assert.equal(pendingActions.length, 0);
});

test('historical cleanup actions gain the original session required for retirement', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-cleanup-action-version') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'assignment', planId: 'work', sessionId: 'worker-session', worktree: '/worker', branch: 'worker',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'CLEANUP_PENDING',
    idempotencyKey: 'assignment-key', attachToken: 'attach-token', worktreeArchived: false, sessionArchived: false,
  };
  const historicalAction = {
    schemaVersion: 3, id: 'cleanup', type: 'ARCHIVE_WORKTREE', assignmentId: assignment.id,
    idempotencyKey: 'assignment:ARCHIVE_WORKTREE', payload: { worktree: assignment.worktree },
  };
  const file = ledgerPath(root, 'campaign', environment);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...ledger, schemaVersion: 4, assignments: [assignment], pendingActions: [historicalAction] })}\n`);

  const upgraded = readLedger(root, 'campaign', environment);
  assert.equal(upgraded.schemaVersion, 5);
  assert.deepEqual(upgraded.pendingActions[0].payload, { sessionId: assignment.sessionId, worktree: assignment.worktree });
  assert.equal(upgraded.pendingActions[0].schemaVersion, 4);
});

test('reconciliation reserves existing active plans without fabricating workers and is idempotent', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'parent', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'parent' },
    { id: 'child', parentPlanId: 'parent', dependsOn: [], lifecycle: 'in_progress', path: 'child' },
  ]);
  assert.equal(captureError(() => advanceLedger(campaignGraph, ledger)).code, 'CAMPAIGN_STATUS_BLOCKED');
  reconcileLedger(campaignGraph, ledger);
  assert.deepEqual(ledger.pendingActions, []);
  assert.equal(ledger.assignments.length, 2);
  for (const assignment of ledger.assignments) {
    assert.equal(assignment.state, 'DISPATCH_PENDING');
    for (const key of ['sessionId', 'worktree', 'branch', 'workerRevision']) assert.equal(assignment[key], null);
  }
  const retained = JSON.stringify(ledger);
  reconcileLedger(campaignGraph, ledger);
  assert.equal(JSON.stringify(ledger), retained);
  assert.equal(reconcile(campaignGraph, ledger).diagnostics.length, 0);
  const selected = advanceLedger(campaignGraph, ledger);
  assert.equal(selected.type, 'CREATE_WORKER');
  assert.equal(selected.payload.planId, 'child');
  assert.equal(advanceLedger(campaignGraph, ledger).id, selected.id);
});

test('reconciliation refuses unauthenticated and contradictory ledgers without partial adoption', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', null);
  const campaignGraph = graph([{ id: 'child', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'child' }]);
  assert.equal(captureError(() => reconcileLedger(campaignGraph, ledger)).code, 'CAMPAIGN_COORDINATOR_REQUIRED');
  ledger.coordinatorSessionId = 'coordinator';
  reconcileLedger(campaignGraph, ledger);
  ledger.assignments.push({ ...ledger.assignments[0], id: 'duplicate' });
  const retained = JSON.stringify(ledger);
  assert.equal(captureError(() => reconcileLedger(campaignGraph, ledger)).code, 'CAMPAIGN_STATUS_BLOCKED');
  assert.equal(JSON.stringify(ledger), retained);
});

test('reconciliation retains dependency waits and an existing pending action', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'blocked', parentPlanId: 'campaign', dependsOn: ['deferred'], lifecycle: 'in_progress', path: 'blocked' },
    { id: 'deferred', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'deferred', path: 'deferred' },
  ]);
  reconcileLedger(campaignGraph, ledger);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments.length, 1);
  campaignGraph.plans[2].lifecycle = 'closed';
  const pending = advanceLedger(campaignGraph, ledger);
  assert.equal(reconcileLedger(campaignGraph, ledger), null);
  assert.deepEqual(ledger.pendingActions.map(({ id }) => id), [pending.id]);
  assert.equal(ledger.assignments.length, 1);
  assert.equal(captureError(() => parseArguments(['reconcile'])).code, 'CAMPAIGN_ORCHESTRATION_USAGE');
});

test('campaign reconcile CLI reserves an active leaf once before normal dispatch', () => {
  const root = campaignRepository();
  managedPlan(root, 'in_progress', 'existing', 'campaign');
  const environment = { ...process.env, PONYTAIL_SESSION_ID: 'coordinator', PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-adoption-state') };
  const invoke = (operation) => {
    const result = spawnSync(process.execPath, [campaignCli, operation, 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const first = invoke('reconcile');
  assert.equal(first.assignments.length, 1);
  assert.equal(first.assignments[0].planId, 'existing');
  assert.equal(first.assignments[0].sessionId, null);
  assert.equal(first.diagnostics.length, 0);
  assert.equal(invoke('reconcile').assignments[0].id, first.assignments[0].id);
  assert.equal(invoke('advance').pendingActions[0].payload.planId, 'existing');
});

test('status reports active plan, session, and worktree conflicts while mutations fail closed', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'first', planId: 'ready', sessionId: 'session', worktree: '/worker', branch: 'worker',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
    state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments = [assignment, { ...assignment, id: 'second', idempotencyKey: 'key-2', attachToken: 'token-2' }];
  assert.equal(readLedgerV5(ledger).assignments.length, 2);
  const status = reconcile(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'ready' },
  ]), ledger);
  assert.deepEqual(status.diagnostics.filter(({ code }) => code === 'CAMPAIGN_ASSIGNMENT_CONFLICT').map(({ message }) => message), [
    'more than one active assignment uses plan ready',
    'more than one active assignment uses session session',
    'more than one active assignment uses worktree /worker',
  ]);
  assert.equal(captureError(() => advanceLedger(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'ready' },
  ]), ledger)).code, 'CAMPAIGN_STATUS_BLOCKED');
});

test('V6 status exposes session, worktree, activity, assignment, action, and conflict views', () => {
  const root = repository();
  const existingWorker = temporaryDirectory('ponytail-existing-worker');
  const missingWorker = path.join(temporaryDirectory('ponytail-missing-worker-parent'), 'missing');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-observation-state') };
  const observedAt = new Date().toISOString();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = (id, planId, sessionId, worktree) => ({
    id, planId, sessionId, worktree, branch: 'worker', dispatchRevision: ledger.integrationRevision,
    workerRevision: ledger.integrationRevision, state: 'ACTIVE', idempotencyKey: `${id}-key`, attachToken: `${id}-token`,
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.assignments.push(
    assignment('working-assignment', 'working-plan', 'working-session', root),
    assignment('missing-assignment', 'missing-plan', 'missing-session', existingWorker),
    assignment('waiting-assignment', 'working-plan', 'waiting-session', missingWorker),
  );
  ledger.workers.push(
    { sessionId: 'working-session', worktree: root, branch: 'worker', revision: ledger.integrationRevision, clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false },
    { sessionId: 'missing-session', worktree: existingWorker, branch: 'worker', revision: ledger.integrationRevision, clean: false, activity: 'missing', evidenceComplete: false, worktreeArchived: false, sessionArchived: false },
    { sessionId: 'waiting-session', worktree: missingWorker, branch: 'worker', revision: ledger.integrationRevision, clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false },
  );
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1,
    campaignId: 'campaign',
    observedAt,
    completeSessionIds: ['waiting-session', 'missing-session', 'working-session'],
    sessions: [
      { sessionId: 'working-session', state: 'working', worktree: root, managedWorktree: true },
      { sessionId: 'missing-session', state: 'missing', worktree: existingWorker, managedWorktree: true },
      { sessionId: 'waiting-session', state: 'waiting', worktree: missingWorker, managedWorktree: false },
    ],
  }, environment);
  const status = reconcile(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'working-plan', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'working' },
    { id: 'missing-plan', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'missing' },
    { id: 'unassigned-plan', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'unassigned' },
  ]), ledger, root, environment);
  assert.equal(status.schemaVersion, 6);
  assert.equal(status.observedAt, observedAt);
  assert.deepEqual(status.workingSessions.map(({ planId, sessionId }) => ({ planId, sessionId })), [{ planId: 'working-plan', sessionId: 'working-session' }]);
  assert.deepEqual(status.waitingSessions.map(({ sessionId }) => sessionId), ['waiting-session']);
  assert.deepEqual(status.idleSessions.map(({ sessionId }) => sessionId), ['waiting-session']);
  assert.deepEqual(status.inProgressPlans.find(({ planId }) => planId === 'unassigned-plan'), { planId: 'unassigned-plan', assignmentId: null, sessionId: null, worktree: null });
  assert.deepEqual(status.worktrees.map(({ sessionId }) => sessionId), ['missing-session', 'waiting-session', 'working-session']);
  const codes = new Set(status.diagnostics.map(({ code }) => code));
  for (const code of ['CAMPAIGN_ASSIGNMENT_CONFLICT', 'CAMPAIGN_PLAN_UNASSIGNED', 'CAMPAIGN_SESSION_IN_COORDINATOR_WORKTREE', 'CAMPAIGN_SESSION_MISSING', 'CAMPAIGN_WORKTREE_SESSION_MISSING', 'CAMPAIGN_WORKTREE_MISSING', 'CAMPAIGN_WORKTREE_NOT_MANAGED']) assert.equal(codes.has(code), true, code);
});

test('stale host observations are diagnosed and block mutation', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-stale-observation-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({
    id: 'assignment', planId: 'ready', sessionId: 'session', worktree: root, branch: 'main',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'ACTIVE',
    idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'session', worktree: root, branch: 'main', revision: ledger.integrationRevision,
    clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: '2000-01-01T00:00:00.000Z', completeSessionIds: ['session'],
    sessions: [{ sessionId: 'session', state: 'working', worktree: root, managedWorktree: true }],
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'ready' },
  ]);
  assert.equal(reconcile(campaignGraph, ledger, root, environment).diagnostics.some(({ code }) => code === 'CAMPAIGN_HOST_OBSERVATION_STALE'), true);
  assert.equal(captureError(() => advanceLedger(campaignGraph, ledger, environment)).code, 'CAMPAIGN_STATUS_BLOCKED');
});

test('campaign observe persists a normalized host snapshot and returns V6 status', () => {
  const root = campaignRepository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-observe-cli'), PONYTAIL_SESSION_ID: 'coordinator' };
  const snapshot = { schemaVersion: 1, campaignId: 'campaign', observedAt: '2026-09-30T12:00:00-07:00', completeSessionIds: [], sessions: [] };
  const result = spawnSync(process.execPath, [campaignCli, 'observe', 'campaign', '--snapshot', JSON.stringify(snapshot)], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).schemaVersion, 6);
  assert.deepEqual(readHostObservation(fs.realpathSync(root), 'campaign', environment), snapshot);
  assert.deepEqual(parseArguments(['observe', 'campaign', '--snapshot', JSON.stringify(snapshot)]), {
    operation: 'observe', input: 'campaign', json: false, actionId: undefined, result: snapshot,
  });
});

test('worker delivery accepts only an exact clean revision with committed evidence', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-worker-delivery') };
  write(root, 'pm/plans/in_progress/work/evidence/result.md', 'verified\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'evidence']);
  const revision = command(root, ['rev-parse', 'HEAD']);
  const assignment = { id: 'assignment', worktree: root, planPath: 'pm/plans/in_progress/work/plan.md' };
  const first = recordWorkerDelivery(root, 'campaign', assignment, { revision, evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'] }, environment);
  const replay = recordWorkerDelivery(root, 'campaign', assignment, { revision, evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'] }, environment);
  assert.deepEqual(replay, first);
  assert.deepEqual(readWorkerDeliveries(root, 'campaign', environment).deliveries, [first]);
  assert.equal(captureError(() => recordWorkerDelivery(root, 'campaign', assignment, { revision, evidencePaths: ['fixture.txt'] }, environment)).code, 'CAMPAIGN_WORKER_DELIVERY');
  assert.equal(captureError(() => recordWorkerDelivery(root, 'campaign', assignment, { revision: 'bad', evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'] }, environment)).code, 'CAMPAIGN_WORKER_DELIVERY');
  fs.appendFileSync(path.join(root, 'fixture.txt'), 'dirty\n');
  assert.equal(captureError(() => recordWorkerDelivery(root, 'campaign', assignment, { revision, evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'] }, environment)).code, 'CAMPAIGN_WORKER_DELIVERY');
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

test('runnable-plans joins satisfied plan dependencies with nonempty canonical tasklet readiness', () => {
  const root = campaignRepository();
  managedPlan(root, 'open', 'blocked', 'campaign');
  const blockedPath = 'pm/plans/open/blocked/plan.md';
  write(root, blockedPath, fs.readFileSync(path.join(root, blockedPath), 'utf8').replace('"depends_on": []', '"depends_on": ["ready"]'));
  managedPlan(root, 'open', 'unreviewed', 'campaign');
  const unreviewedPath = 'pm/plans/open/unreviewed/sprints/S01.md';
  write(root, unreviewedPath, fs.readFileSync(path.join(root, unreviewedPath), 'utf8').replace('"tasklets_reviewed": true', '"tasklets_reviewed": false'));
  managedPlan(root, 'open', 'done-tasklets', 'campaign');
  const donePath = 'pm/plans/open/done-tasklets/sprints/S01.md';
  write(root, donePath, fs.readFileSync(path.join(root, donePath), 'utf8').replace('### [ ]', '### [DONE]'));
  managedPlan(root, 'open', 'planning-only', 'campaign');
  const planningPath = 'pm/plans/open/planning-only/sprints/S01.md';
  write(root, planningPath, fs.readFileSync(path.join(root, planningPath), 'utf8').replace(/"execution": \{[^}]+\}/, '"execution": null'));
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-runnable-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  const before = command(root, ['rev-parse', 'HEAD']);
  const result = spawnSync(process.execPath, [campaignCli, 'runnable-plans', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  const report = readRunnablePlansV2(JSON.parse(result.stdout));
  assert.deepEqual(report.plans.map(({ execution, ...plan }) => plan), [{ planId: 'ready', path: 'pm/plans/open/ready/plan.md', lifecycle: 'open', sprintId: 'S01', taskletIds: ['S01-F01-T01'] }]);
  assert.equal(report.parallelism.theoreticalWorkers, 1);
  assert.equal(report.parallelism.observedWorkingWorkers, null);
  assert.equal(command(root, ['rev-parse', 'HEAD']), before);
  assert.equal(fs.existsSync(ledgerPath(fs.realpathSync(root), 'campaign', environment)), false);
  const status = spawnSync(process.execPath, [campaignCli, 'status', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout).readyPlans, report.plans.map(({ planId }) => planId));
  const schedule = spawnSync(process.execPath, [campaignCli, 'schedule-ready', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(schedule.status, 0, schedule.stderr);
  assert.deepEqual(JSON.parse(schedule.stdout).actions.map(({ payload }) => payload.planId), ['ready']);
  const action = JSON.parse(schedule.stdout).actions[0];
  const blocker = { schemaVersion: 1, assignmentId: action.assignmentId, actionId: action.id, phase: 'DISPATCH', state: 'BLOCKED', code: 'HOST_REVIEW_REJECTED', summary: 'Original native dispatch was rejected.', requiredAction: 'Request scoped human authorization; preserve this action.' };
  const recorded = spawnSync(process.execPath, [campaignCli, 'report-blocker', 'campaign', '--result', JSON.stringify(blocker)], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(recorded.status, 0, recorded.stderr);
  assert.equal(readRunnablePlansV2(JSON.parse(recorded.stdout)).plans[0].execution.anomalies.some(item => item.code === blocker.code), true);
  const restarted = spawnSync(process.execPath, [campaignCli, 'runnable-plans', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(restarted.status, 0, restarted.stderr);
  assert.equal(JSON.parse(restarted.stdout).plans[0].execution.actionId, action.id);
  assert.equal(JSON.parse(restarted.stdout).plans[0].execution.anomalies.some(item => item.code === blocker.code), true);
  const planPath = 'pm/plans/open/ready/plan.md';
  fs.renameSync(path.join(root, 'pm/plans/open/ready'), path.join(root, 'pm/plans/in_progress/ready'));
  const rootPath = 'pm/plans/in_progress/campaign/plan.md';
  write(root, rootPath, fs.readFileSync(path.join(root, rootPath), 'utf8').replace('../../open/ready/plan.md', '../ready/plan.md'));
  const activeSprintPath = 'pm/plans/in_progress/ready/sprints/S01.md';
  write(root, activeSprintPath, fs.readFileSync(path.join(root, activeSprintPath), 'utf8').replace('"status": "PENDING"', '"status": "IN_PROGRESS"'));
  const active = spawnSync(process.execPath, [campaignCli, 'runnable-plans', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(active.status, 0, active.stderr);
  assert.deepEqual(JSON.parse(active.stdout).plans.map(({ execution, ...plan }) => plan), [{ ...(({ execution, ...plan }) => plan)(report.plans[0]), path: planPath.replace('/open/', '/in_progress/'), lifecycle: 'in_progress' }]);
});

test('runnable execution diagnostics persist scoped host refusals without changing action identity', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-blocker-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]);
  const pending = advanceLedger(campaignGraph, ledger, environment);
  const report = { schemaVersion: 1, assignmentId: pending.assignmentId, actionId: pending.id, phase: 'DISPATCH', state: 'BLOCKED', code: 'HOST_REVIEW_REJECTED', summary: 'Native dispatch rejected before execution.', requiredAction: 'Request narrowly scoped human authorization for this original worker.' };
  const identities = JSON.stringify(ledger);
  assert.equal(recordExecutionBlocker(ledger, report, environment).reports.length, 1);
  assert.equal(recordExecutionBlocker(ledger, report, environment).reports.length, 1);
  const result = runnablePlanDiagnostics(campaignGraph, ledger, root, environment);
  assert.equal(result.plans[0].execution.actionId, pending.id);
  assert.equal(result.plans[0].execution.anomalies.find(item => item.code === report.code).requiredAction, report.requiredAction);
  assert.equal(result.parallelism.theoreticalWorkers, 1);
  assert.equal(result.parallelism.shortfall, null);
  assert.equal(JSON.stringify(ledger), identities);
  pending.payload.bootstrap = { schemaVersion: 1, sessionId: 'original-worker', worktree: path.join(root, 'missing-checkout'), revision: ledger.integrationRevision, mainWorktree: root, mainGitDirectory: path.join(root, '.git') };
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: ['original-worker'], sessions: [{ sessionId: 'original-worker', state: 'waiting', worktree: pending.payload.bootstrap.worktree, managedWorktree: true }] }, environment);
  const missing = runnablePlanDiagnostics(campaignGraph, ledger, root, environment);
  assert.equal(missing.plans[0].execution.sessionId, 'original-worker');
  assert.equal(missing.plans[0].execution.worktree, pending.payload.bootstrap.worktree);
  assert.equal(missing.plans[0].execution.anomalies.some(item => item.code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(missing.parallelism.observedRunnableWorkers, 0);
  assert.equal(missing.parallelism.shortfall, 1);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 360000).toISOString(), completeSessionIds: ['original-worker'], sessions: [{ sessionId: 'original-worker', state: 'working', worktree: pending.payload.bootstrap.worktree, managedWorktree: true }] }, environment);
  assert.equal(runnablePlanDiagnostics(campaignGraph, ledger, root, environment).parallelism.shortfall, null);
  assert.throws(() => recordExecutionBlocker(ledger, report, { ...environment, PONYTAIL_SESSION_ID: 'other' }), /bound coordinator/);
  assert.throws(() => recordExecutionBlocker(ledger, { ...report, assignmentId: 'other' }, environment), /current assignment/);
  assert.throws(() => recordExecutionBlocker(ledger, { ...report, summary: ledger.assignments[0].attachToken }, environment), /capabilities/);
  recordExecutionBlocker(ledger, { ...report, state: 'RESOLVED', summary: 'Human authority obtained; refresh host evidence before retry.' }, environment);
  assert.equal(runnablePlanDiagnostics(campaignGraph, ledger, root, environment).plans[0].execution.anomalies.some(item => item.code === report.code), false);
});

test('historical runnable summaries normalize unknown execution evidence without inventing counts', () => {
  const legacy = { schemaVersion: 1, campaignId: 'campaign', invocationWorktree: '/repo', effectiveWorktree: '/repo', integrationRevision: 'revision', plans: [{ planId: 'plan', path: 'pm/plan.md', lifecycle: 'open', sprintId: 'S01', taskletIds: ['T01'] }] };
  const result = CampaignRunnablePlansReaders.V1(legacy);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.parallelism, null);
  assert.equal(result.plans[0].execution, null);
  assert.throws(() => readRunnablePlansV2({ ...result, unexpected: true }), CampaignOrchestrationError);
});

test('tasklet exhaustion suppresses new, queued, and unstarted dispatch without changing started identity', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
    { id: 'empty', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'empty', runnableTasklets: null },
  ]);
  const pending = advanceLedger(campaignGraph, ledger);
  campaignGraph.plans.find(({ id }) => id === 'ready').runnableTasklets = null;
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger).actions, []);
  recordActionResult(ledger, pending.id, { ok: false, disposition: 'NOT_STARTED' }, campaignGraph);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments.length, 1);
  campaignGraph.plans.find(({ id }) => id === 'ready').runnableTasklets = { sprintId: 'S01', taskletIds: ['S01-T02'] };
  const resumed = scheduleReadyPlans(campaignGraph, ledger).actions[0];
  assert.equal(resumed.assignmentId, pending.assignmentId);
  assert.equal(resumed.payload.attachToken, pending.payload.attachToken);
  recordActionResult(ledger, resumed.id, { ok: true, disposition: 'STARTED', hostIdentity: 'pending-client' }, campaignGraph);
  campaignGraph.plans.find(({ id }) => id === 'ready').runnableTasklets = null;
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger).actions, []);
  assert.equal(ledger.pendingActions[0].id, resumed.id);
  assert.equal(ledger.pendingActions[0].payload.dispatch.hostIdentity, 'pending-client');
});

test('schedule-ready deterministically reserves every runnable plan once within project capacity', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    ...Array.from({ length: 17 }, (_, index) => ({ id: `plan-${String(index).padStart(2, '0')}`, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: `plan-${index}` })),
    { id: 'no-tasklets', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'empty', runnableTasklets: null },
  ]);
  const first = scheduleReadyPlans(campaignGraph, ledger);
  assert.equal(first.actions.length, 15);
  assert.deepEqual(first.actions.map(({ payload }) => payload.planId), Array.from({ length: 15 }, (_, index) => `plan-${String(index).padStart(2, '0')}`));
  const before = JSON.stringify(ledger);
  const retry = scheduleReadyPlans(campaignGraph, ledger);
  assert.deepEqual(retry, first);
  assert.equal(JSON.stringify(ledger), before);
  assert.equal(ledger.assignments.length, 15);
  assert.equal(reconcile(campaignGraph, ledger).diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKER_CAPACITY_REACHED'), true);
});

test('runnable-plan output rejects empty tasklet sets and unsupported or ambiguous records', () => {
  const valid = { schemaVersion: 1, campaignId: 'campaign', invocationWorktree: '/project', effectiveWorktree: '/project', integrationRevision: 'revision',
    plans: [{ planId: 'work', path: 'pm/plans/open/work/plan.md', lifecycle: 'open', sprintId: 'S01', taskletIds: ['S01-T01'] }] };
  assert.deepEqual(readRunnablePlansV1(valid), valid);
  for (const value of [{ ...valid, schemaVersion: 2 }, { ...valid, extra: true }, { ...valid, plans: [valid.plans[0], valid.plans[0]] },
    { ...valid, plans: [{ ...valid.plans[0], taskletIds: [] }] }, { ...valid, plans: [{ ...valid.plans[0], taskletIds: ['S01-T01', 'S01-T01'] }] }]) {
    assert.throws(() => readRunnablePlansV1(value), CampaignOrchestrationError);
  }
});

test('advance durably selects one ready plan and returns the same pending action on retry', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready-a', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'a' },
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
  assert.deepEqual(ledger.pendingActions, []);
  assert.equal(recordActionResult(ledger, first.id, result).id, ledger.assignments[0].id);
});

test('independent dispatch continues while the integration lane has one outstanding rebase', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({
    id: 'join-assignment', planId: 'joining', sessionId: 'join-session', worktree: root, branch: 'join',
    dispatchRevision: ledger.integrationRevision, workerRevision: 'join-revision', state: 'REBASE_REQUIRED',
    idempotencyKey: 'join-key', attachToken: 'join-token', worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'join-session', worktree: root, branch: 'join', revision: 'join-revision', clean: true,
    activity: 'active', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
  });
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'joining', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'joining' },
    { id: 'ready-a', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'a' },
    { id: 'ready-b', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'b' },
  ]);

  const rebase = advanceLedger(campaignGraph, ledger);
  const firstDispatch = advanceLedger(campaignGraph, ledger);
  const secondDispatch = advanceLedger(campaignGraph, ledger);

  assert.equal(rebase.type, 'REQUEST_REBASE');
  assert.equal(firstDispatch.type, 'CREATE_WORKER');
  assert.equal(firstDispatch.payload.planId, 'ready-a');
  assert.equal(secondDispatch.type, 'CREATE_WORKER');
  assert.equal(secondDispatch.payload.planId, 'ready-b');
  assert.equal(ledger.pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length, 1);
  assert.equal(ledger.pendingActions.length, 3);
  assert.equal(advanceLedger(campaignGraph, ledger).id, rebase.id);
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger).actions.map(({ id }) => id), [rebase.id, firstDispatch.id, secondDispatch.id]);
  assert.equal(ledger.pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length, 1);

  recordActionResult(ledger, firstDispatch.id, {
    ok: true, sessionId: 'worker-a', worktree: '/worker-a', branch: 'worker-a', revision: ledger.integrationRevision,
  });
  assert.deepEqual(ledger.pendingActions.map(({ id }) => id).sort(), [rebase.id, secondDispatch.id].sort());
});

test('an outstanding rebase pins the integration revision until its named result', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({
    id: 'join-assignment', planId: 'joining', sessionId: 'join-session', worktree: root, branch: 'join',
    dispatchRevision: ledger.integrationRevision, workerRevision: 'join-revision', state: 'REBASE_REQUIRED',
    idempotencyKey: 'join-key', attachToken: 'join-token', worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'join-session', worktree: root, branch: 'join', revision: 'join-revision', clean: true,
    activity: 'active', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
  });
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'joining', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'joining' },
  ]);
  const rebase = advanceLedger(campaignGraph, ledger);
  fs.appendFileSync(path.join(root, 'fixture.txt'), 'integration change\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'integration change']);

  assert.equal(captureError(() => advanceLedger(campaignGraph, ledger)).code, 'CAMPAIGN_INTEGRATION_CHANGED');
  assert.equal(ledger.pendingActions[0].id, rebase.id);
  assert.equal(ledger.pendingActions[0].payload.ontoRevision, ledger.integrationRevision);
});

test('a proven unstarted stale dispatch is postponed while a started dispatch retains its identity', () => {
  const root = repository();
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'blocked', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'blocked' },
    { id: 'other', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'other' },
    { id: 'prerequisite', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'prerequisite' },
  ]);
  const postponedLedger = newLedger(root, 'campaign', 'coordinator');
  const idleWorktree = temporaryDirectory('ponytail-idle-worker');
  postponedLedger.workers.push({
    sessionId: 'idle-session', worktree: idleWorktree, branch: 'idle', revision: postponedLedger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  const pending = advanceLedger(campaignGraph, postponedLedger);
  assert.equal(pending.type, 'REUSE_WORKER');
  assert.equal(pending.payload.planId, 'blocked');
  delete pending.payload.dispatch;
  campaignGraph.plans.find(({ id }) => id === 'blocked').dependsOn = ['prerequisite'];
  const unrelated = advanceLedger(campaignGraph, postponedLedger);
  assert.equal(pending.payload.dispatch.ready, false);
  assert.equal(unrelated.payload.planId, 'other');
  assert.equal(unrelated.type, 'CREATE_WORKER');
  assert.equal(unrelated.payload.sessionId, null);
  recordActionResult(postponedLedger, pending.id, { ok: false, disposition: 'NOT_STARTED' }, campaignGraph);
  assert.deepEqual(postponedLedger.pendingActions.map(({ id }) => id), [unrelated.id]);
  assert.equal(postponedLedger.assignments[0].state, 'DISPATCH_PENDING');
  assert.equal(postponedLedger.assignments[0].sessionId, null);
  const prerequisite = advanceLedger(campaignGraph, postponedLedger);
  assert.equal(prerequisite.payload.planId, 'prerequisite');
  assert.equal(prerequisite.type, 'REUSE_WORKER');
  assert.deepEqual(postponedLedger.pendingActions.map(({ id }) => id), [unrelated.id, prerequisite.id]);

  const startedGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'blocked', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'blocked' },
    { id: 'prerequisite', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'prerequisite' },
  ]);
  const startedLedger = newLedger(root, 'campaign', 'coordinator');
  const started = advanceLedger(startedGraph, startedLedger);
  recordActionResult(startedLedger, started.id, { ok: true, disposition: 'STARTED', hostIdentity: 'client-123' }, startedGraph);
  startedGraph.plans.find(({ id }) => id === 'blocked').dependsOn = ['prerequisite'];
  const ready = advanceLedger(startedGraph, startedLedger);
  assert.equal(ready.payload.planId, 'prerequisite');
  assert.deepEqual(startedLedger.pendingActions.find(({ id }) => id === started.id).payload.dispatch, { ready: false, state: 'STARTED', hostIdentity: 'client-123' });
  assert.equal(captureError(() => recordActionResult(startedLedger, started.id, { ok: false, disposition: 'NOT_STARTED' }, startedGraph)).code, 'CAMPAIGN_ACTION_STARTED');
});

test('ready actions exclude blocked and started dispatch without mutating durable state', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'blocked', parentPlanId: 'campaign', dependsOn: ['prerequisite'], lifecycle: 'open', path: 'blocked' },
    { id: 'prerequisite', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'prerequisite' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]);
  const blocked = {
    schemaVersion: 4, id: 'blocked-action', type: 'CREATE_WORKER', assignmentId: 'blocked-assignment',
    idempotencyKey: 'blocked-key', payload: { planId: 'blocked', dispatch: { ready: false, state: 'NOT_STARTED', hostIdentity: null } },
  };
  const started = {
    schemaVersion: 4, id: 'started-action', type: 'CREATE_WORKER', assignmentId: 'started-assignment',
    idempotencyKey: 'started-key', payload: { planId: 'ready', dispatch: { ready: true, state: 'STARTED', hostIdentity: 'client-1' } },
  };
  const rebase = {
    schemaVersion: 4, id: 'rebase-action', type: 'REQUEST_REBASE', assignmentId: 'rebase-assignment',
    idempotencyKey: 'rebase-key', payload: { sessionId: 'session', ontoRevision: ledger.integrationRevision },
  };
  const cleanup = {
    schemaVersion: 4, id: 'cleanup-action', type: 'ARCHIVE_WORKTREE', assignmentId: 'cleanup-assignment',
    idempotencyKey: 'cleanup-key', payload: { sessionId: 'cleanup-session', worktree: '/worker' },
  };
  const ready = {
    schemaVersion: 4, id: 'ready-action', type: 'CREATE_WORKER', assignmentId: 'ready-assignment',
    idempotencyKey: 'ready-key', payload: { planId: 'ready', dispatch: { ready: true, state: 'NOT_STARTED', hostIdentity: null } },
  };
  const status = {
    ...reconcile(campaignGraph, ledger),
    pendingActions: [blocked, started, rebase, cleanup, ready],
  };
  const before = JSON.stringify(status);
  const result = readyActions(status, campaignGraph);
  assert.deepEqual(result.actions, [rebase, ready]);
  assert.equal(JSON.stringify(status), before);
  assert.deepEqual(readReadyActionsV4(result), result);
  assert.equal(captureError(() => readyActions({ ...status, diagnostics: [{ message: 'conflict' }] }, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
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

for (const hostState of ['completed', 'waiting']) {
  test(`integrated ${hostState} workers become reusable when another plan is ready`, () => {
    const root = repository();
    const worker = path.join(temporaryDirectory('ponytail-reusable-parent'), 'worker');
    command(root, ['worktree', 'add', '-qb', 'reusable-worker', worker]);
    const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-reusable-state') };
    const ledger = newLedger(root, 'campaign', 'coordinator');
    ledger.assignments.push({
      id: 'completed-assignment', planId: 'completed', sessionId: 'reusable-session', worktree: worker, branch: 'reusable-worker',
      dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'CLEANUP_PENDING',
      idempotencyKey: 'completed-key', attachToken: 'completed-token', worktreeArchived: false, sessionArchived: false,
    });
    ledger.workers.push({
      sessionId: 'reusable-session', worktree: worker, branch: 'reusable-worker', revision: ledger.integrationRevision,
      clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
    });
    writeHostObservation(root, 'campaign', {
      schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: ['reusable-session'],
      sessions: [{ sessionId: 'reusable-session', state: hostState, worktree: worker, managedWorktree: true }],
    }, environment);
    const campaignGraph = graph([
      { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
      { id: 'completed', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'completed' },
      { id: 'ready', parentPlanId: 'campaign', dependsOn: ['completed'], lifecycle: 'open', path: 'ready' },
    ]);
    assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
    assert.equal(ledger.assignments[0].state, 'ARCHIVED');
    assert.equal(ledger.workers[0].activity, 'idle');
    const pending = advanceLedger(campaignGraph, ledger, environment);
    assert.equal(pending.type, 'REUSE_WORKER');
    assert.equal(pending.payload.sessionId, 'reusable-session');
    assert.equal(pending.payload.worktree, worker);
    assert.ok(fs.existsSync(worker));
  });
}

test('advance retains every completed pair even without ready dispatch', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-reuse-capacity-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const sessions = ['session-a', 'session-b'];
  const worktrees = sessions.map((sessionId) => {
    const worktree = path.join(temporaryDirectory(`ponytail-${sessionId}`), 'worker');
    command(root, ['worktree', 'add', '-qb', sessionId, worktree]);
    return worktree;
  });
  for (let index = 0; index < sessions.length; index += 1) {
    ledger.assignments.push({
      id: `assignment-${index}`, planId: `completed-${index}`, sessionId: sessions[index], worktree: worktrees[index], branch: sessions[index],
      dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'CLEANUP_PENDING',
      idempotencyKey: `key-${index}`, attachToken: `token-${index}`, worktreeArchived: false, sessionArchived: false,
    });
    ledger.workers.push({
      sessionId: sessions[index], worktree: worktrees[index], branch: sessions[index], revision: ledger.integrationRevision,
      clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false,
    });
  }
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: sessions,
    sessions: sessions.map((sessionId, index) => ({ sessionId, state: 'completed', worktree: worktrees[index], managedWorktree: true })),
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'completed-0', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'completed-0' },
    { id: 'completed-1', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: 'completed-1' },
  ]);

  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'ARCHIVED');
  assert.equal(ledger.assignments[1].state, 'ARCHIVED');
  assert.deepEqual(ledger.pendingActions, []);
  assert.ok(worktrees.every(worktree => fs.existsSync(worktree)));
  withLedgerLock(root, 'campaign', environment, saved => Object.assign(saved, ledger));
  const successor = newLedger(root, 'successor', 'coordinator');
  const successorGraph = graph([
    { id: 'successor', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'successor' },
    { id: 'next', parentPlanId: 'successor', dependsOn: [], lifecycle: 'open', path: 'next' },
  ]);
  successorGraph.campaignId = 'successor';
  writeHostObservation(root, 'successor', {
    schemaVersion: 1, campaignId: 'successor', observedAt: new Date().toISOString(), completeSessionIds: sessions,
    sessions: sessions.map((sessionId, index) => ({ sessionId, state: 'completed', worktree: worktrees[index], managedWorktree: true })),
  }, environment);
  assert.equal(advanceLedger(successorGraph, successor, environment).payload.sessionId, sessions[0]);
  // Persist the reservation so another campaign cannot reserve the same pair.
  withLedgerLock(root, 'successor', environment, saved => Object.assign(saved, successor));
  campaignGraph.plans.push({ id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready', runnableTasklets: { sprintId: 'S01', taskletIds: ['S01-F01-T01'] } });
  assert.equal(advanceLedger(campaignGraph, ledger, environment).payload.sessionId, sessions[1]);
});

test('historical automatic cleanup is superseded without deleting or fabricating success', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const cleanup = readActionV4({ schemaVersion: 4, id: 'old-cleanup', type: 'ARCHIVE_WORKTREE', assignmentId: 'old-assignment', idempotencyKey: 'old-key', payload: { sessionId: 'session', worktree: '/old-worker' } });
  ledger.pendingActions.push(cleanup);
  assert.equal(advanceLedger(graph([]), ledger), null);
  assert.deepEqual(ledger.pendingActions, []);
  assert.deepEqual(ledger.completedActions, [{ actionId: cleanup.id, assignmentId: cleanup.assignmentId, type: cleanup.type, result: { ok: false, disposition: 'RETAINED' } }]);
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
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
  ]);
  assert.deepEqual(reconcile(campaignGraph, ledger).readyToMerge.map(({ planId }) => planId), ['work']);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(command(root, ['rev-parse', 'HEAD']), workerRevision);
  assert.equal(ledger.assignments[0].state, 'MERGED');
  campaignGraph.plans.find(({ id }) => id === 'work').lifecycle = 'closed';
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(ledger.assignments[0].state, 'CLEANUP_PENDING');
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.deepEqual(ledger.pendingActions, []);
  assert.equal(ledger.assignments[0].state, 'ARCHIVED');
});

test('verified worker delivery integrates before plan closure and cleanup waits for closure', () => {
  const root = repository();
  const state = temporaryDirectory('ponytail-delivery-state');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: state };
  const base = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-qb', 'worker-delivery']);
  fs.appendFileSync(path.join(root, 'fixture.txt'), 'delivered\n');
  write(root, 'pm/evidence.md', 'verified\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'delivery']);
  const workerRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-q', 'main']);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.integrationRevision = base;
  ledger.assignments.push({
    id: 'assignment', planId: 'work', sessionId: 'worker-session', worktree: root, branch: 'worker-delivery',
    dispatchRevision: base, workerRevision, state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token',
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({
    sessionId: 'worker-session', worktree: root, branch: 'worker-delivery', revision: workerRevision,
    clean: true, activity: 'completed', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  writeWorkerDeliveries(root, 'campaign', {
    schemaVersion: 1,
    campaignId: 'campaign',
    deliveries: [{ assignmentId: 'assignment', revision: workerRevision, evidencePaths: ['pm/evidence.md'], recordedAt: new Date().toISOString() }],
  }, environment);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: ['worker-session'],
    sessions: [{ sessionId: 'worker-session', state: 'completed', worktree: null, managedWorktree: true }],
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
  ]);
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).readyToMerge.map(({ planId }) => planId), ['work']);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'MERGED');
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'MERGED');
  campaignGraph.plans.find(({ id }) => id === 'work').lifecycle = 'closed';
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'CLEANUP_PENDING');
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'ARCHIVED');
});

test('an open merged plan accepts a second delivery from its original assignment', () => {
  const root = repository();
  const worker = path.join(temporaryDirectory('ponytail-second-delivery-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'worker-delivery', worker]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-second-delivery-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'assignment', planId: 'work', sessionId: 'worker-session', worktree: worker, branch: 'worker-delivery',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
    state: 'ACTIVE', idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments.push(assignment);
  ledger.workers.push({
    sessionId: assignment.sessionId, worktree: worker, branch: assignment.branch, revision: assignment.workerRevision,
    clean: true, activity: 'completed', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), `${JSON.stringify({
    schemaVersion: 1,
    bindings: [{
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: worker, branch: assignment.branch,
      revision: ledger.integrationRevision, boundAt: new Date().toISOString(),
    }],
  })}\n`);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
  ]);
  const evidencePath = 'pm/plans/in_progress/work/evidence/result.md';
  for (const iteration of [1, 2]) {
    write(worker, evidencePath, `accepted ${iteration}\n`);
    command(worker, ['add', '.']);
    command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', `delivery ${iteration}`]);
    const revision = command(worker, ['rev-parse', 'HEAD']);
    recordWorkerDelivery(root, 'campaign', { ...assignment, planPath: 'pm/plans/in_progress/work/plan.md' }, {
      revision, evidencePaths: [evidencePath],
    }, environment);
    writeHostObservation(root, 'campaign', {
      schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
      completeSessionIds: [assignment.sessionId],
      sessions: [{ sessionId: assignment.sessionId, state: 'completed', worktree: worker, managedWorktree: true }],
    }, environment);
    assert.equal(reconcile(campaignGraph, ledger, root, environment).assignments[0].state, 'READY_TO_MERGE');
    assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
    assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
    assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
    assert.equal(ledger.assignments[0].state, 'MERGED');
    assert.equal(command(root, ['rev-parse', 'HEAD']), revision);
    assert.equal(ledger.assignments.length, 1);
  }
});

test('worker delivery resolves a closed plan by stable identity before its lifecycle move is integrated', () => {
  const root = fs.realpathSync(campaignRepository());
  fs.renameSync(path.join(root, 'pm/plans/open/ready'), path.join(root, 'pm/plans/in_progress/ready'));
  const parentPath = 'pm/plans/in_progress/campaign/plan.md';
  write(root, parentPath, fs.readFileSync(path.join(root, parentPath), 'utf8').replace('../../open/ready/', '../../in_progress/ready/'));
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'active assignment']);
  const worker = path.join(fs.realpathSync(temporaryDirectory('ponytail-closure-delivery')), 'worker');
  command(root, ['worktree', 'add', '-qb', 'closure-worker', worker]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-closure-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  const assignment = {
    id: 'assignment', planId: 'ready', sessionId: 'worker-session', worktree: worker, branch: 'closure-worker',
    dispatchRevision: command(root, ['rev-parse', 'HEAD']), workerRevision: command(root, ['rev-parse', 'HEAD']),
    state: 'MERGED', idempotencyKey: 'key', attachToken: 'token', worktreeArchived: false, sessionArchived: false,
  };
  withLedgerLock(root, 'campaign', environment, (ledger) => { ledger.assignments.push(assignment); });
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), JSON.stringify({
    schemaVersion: 1, bindings: [{ repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id,
      coordinatorSessionId: 'coordinator', attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: worker,
      branch: assignment.branch, revision: assignment.workerRevision, boundAt: new Date().toISOString() }],
  }));
  fs.mkdirSync(path.join(worker, 'pm/plans/closed'));
  fs.renameSync(path.join(worker, 'pm/plans/in_progress/ready'), path.join(worker, 'pm/plans/closed/ready'));
  const sprintPath = 'pm/plans/closed/ready/sprints/S01.md';
  write(worker, sprintPath, fs.readFileSync(path.join(worker, sprintPath), 'utf8').replace('"status": "PENDING"', '"status": "DONE"').replace('### [ ]', '### [DONE]'));
  write(worker, parentPath, fs.readFileSync(path.join(worker, parentPath), 'utf8').replace('../../in_progress/ready/', '../../closed/ready/'));
  command(worker, ['add', '.']);
  command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'accepted plan closure']);
  const revision = command(worker, ['rev-parse', 'HEAD']);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId], sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }] }, environment);
  const deliver = (evidencePaths) => spawnSync(process.execPath, [campaignCli, 'deliver', 'campaign', '--result', JSON.stringify({ revision, evidencePaths })], { cwd: worker, encoding: 'utf8', env: environment });
  const outside = deliver([parentPath]);
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /outside assigned plan/);
  const result = deliver(['pm/plans/closed/ready/plan.md', sprintPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).assignments[0].state, 'READY_TO_MERGE');
  for (let i = 0; i < 2; i += 1) {
    const advance = spawnSync(process.execPath, [campaignCli, 'advance', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
    assert.equal(advance.status, 0, advance.stderr);
  }
  assert.equal(command(root, ['rev-parse', 'HEAD']), revision);
  assert.equal(readLedger(root, 'campaign', environment).assignments[0].state, 'MERGED');
  assert.equal(fs.existsSync(path.join(root, 'pm/plans/closed/ready/plan.md')), true);
  assert.equal(readWorkerDeliveries(root, 'campaign', environment).deliveries[0].revision, revision);
});

test('authenticated dispatch stays valid while its worker activates an open plan and integrates activation', () => {
  const root = fs.realpathSync(campaignRepository());
  const worker = path.join(fs.realpathSync(temporaryDirectory('ponytail-activation-worker')), 'worker');
  command(root, ['worktree', 'add', '-qb', 'activation-worker', worker]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-activation-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.workers.push({ sessionId: 'activation-session', worktree: worker, branch: 'activation-worker',
    revision: ledger.integrationRevision, clean: true, activity: 'idle', evidenceComplete: false,
    worktreeArchived: false, sessionArchived: false });
  const observe = () => writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: ['activation-session'],
    sessions: [{ sessionId: 'activation-session', state: 'waiting', worktree: worker, managedWorktree: true }] }, environment);
  observe();
  let campaignGraph = require('../src/campaign-census').campaignGraph(root, 'campaign');
  const action = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(action.type, 'REUSE_WORKER');
  const assignment = ledger.assignments[0];
  withLedgerLock(root, 'campaign', environment, current => Object.assign(current, ledger));
  bindWorker(environment, worker, assignment.attachToken, 'activation-session');
  const result = { ok: true, sessionId: 'activation-session', worktree: worker,
    branch: 'activation-worker', revision: ledger.integrationRevision };
  validateActionResultBinding(ledger, action.id, result, environment);
  recordActionResult(ledger, action.id, result, campaignGraph);
  withLedgerLock(root, 'campaign', environment, current => Object.assign(current, ledger));
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).diagnostics, []);
  assert.doesNotThrow(() => readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph));
  const deliver = evidencePaths => spawnSync(process.execPath, [campaignCli, 'deliver', 'campaign', '--result',
    JSON.stringify({ revision: command(worker, ['rev-parse', 'HEAD']), evidencePaths })],
  { cwd: worker, encoding: 'utf8', env: environment });
  const premature = deliver(['pm/plans/open/ready/plan.md']);
  assert.equal(premature.status, 1);
  assert.match(premature.stderr, /activate the assigned plan/);
  const parentPath = 'pm/plans/in_progress/campaign/plan.md';
  fs.mkdirSync(path.join(worker, 'pm/plans/in_progress'), { recursive: true });
  fs.renameSync(path.join(worker, 'pm/plans/open/ready'), path.join(worker, 'pm/plans/in_progress/ready'));
  write(worker, parentPath, fs.readFileSync(path.join(worker, parentPath), 'utf8').replace('../../open/ready/', '../../in_progress/ready/'));
  command(worker, ['add', '.']);
  command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'activate assigned plan']);
  const delivered = deliver(['pm/plans/in_progress/ready/plan.md']);
  assert.equal(delivered.status, 0, delivered.stderr);
  assert.equal(JSON.parse(delivered.stdout).assignments[0].state, 'READY_TO_MERGE');
  for (let index = 0; index < 2; index += 1) {
    const advanced = spawnSync(process.execPath, [campaignCli, 'advance', 'campaign', '--json'],
      { cwd: root, encoding: 'utf8', env: environment });
    assert.equal(advanced.status, 0, advanced.stderr);
  }
  campaignGraph = require('../src/campaign-census').campaignGraph(root, 'campaign');
  assert.equal(campaignGraph.plans.find(plan => plan.id === 'ready').lifecycle, 'in_progress');
  assert.equal(readLedger(root, 'campaign', environment).assignments[0].state, 'MERGED');
  const unprovenLedger = newLedger(root, 'campaign', 'coordinator');
  unprovenLedger.assignments.push({ ...assignment, state: 'ACTIVE' });
  campaignGraph.plans.find(plan => plan.id === 'ready').lifecycle = 'open';
  assert.ok(reconcile(campaignGraph, unprovenLedger, root, environment).diagnostics.some(item => item.code === 'CAMPAIGN_ASSIGNMENT_LIFECYCLE'));
  for (const lifecycle of ['deferred', 'rejected']) {
    campaignGraph.plans.find(plan => plan.id === 'ready').lifecycle = lifecycle;
    assert.ok(reconcile(campaignGraph, ledger, root, environment).diagnostics.some(item => item.code === 'CAMPAIGN_ASSIGNMENT_LIFECYCLE'));
  }
});

test('waiting worker delivery remains integrable before and after its checkout disappears', () => {
  const root = repository();
  const worker = path.join(temporaryDirectory('ponytail-missing-delivered-worker-parent'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'delivered-worker', worker]);
  write(worker, 'pm/plans/in_progress/work/evidence/result.md', 'verified\n');
  command(worker, ['add', '.']);
  command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'delivered work']);
  const workerRevision = command(worker, ['rev-parse', 'HEAD']);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-missing-delivered-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'delivered-assignment', planId: 'work', sessionId: 'delivered-session', worktree: worker, branch: 'delivered-worker',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'ACTIVE', idempotencyKey: 'delivered-key',
    attachToken: 'delivered-token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments.push(assignment);
  recordWorkerDelivery(root, 'campaign', { ...assignment, planPath: 'pm/plans/in_progress/work/plan.md' }, {
    revision: workerRevision,
    evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'],
  }, environment);
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), `${JSON.stringify({
    schemaVersion: 1,
    bindings: [{
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: worker, branch: assignment.branch,
      revision: ledger.integrationRevision, boundAt: new Date().toISOString(),
    }],
  })}\n`);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['delivered-session'],
    sessions: [{ sessionId: 'delivered-session', state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
    { id: 'independent', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'independent' },
  ]);

  let status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.assignments[0].state, 'READY_TO_MERGE');
  command(root, ['worktree', 'remove', worker]);
  command(root, ['branch', '-f', 'delivered-worker', ledger.integrationRevision]);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(captureError(() => readyActions(status, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
  command(root, ['branch', '-f', 'delivered-worker', workerRevision]);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.assignments[0].state, 'READY_TO_MERGE');
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY'), true);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), false);
  const rebase = readActionV4({ schemaVersion: 4, id: 'delivered-rebase', type: 'REQUEST_REBASE', assignmentId: assignment.id,
    idempotencyKey: 'delivered-rebase-key', payload: { sessionId: assignment.sessionId, ontoRevision: ledger.integrationRevision } });
  ledger.pendingActions.push(rebase);
  const result = { ok: true, revision: workerRevision };
  command(root, ['branch', '-f', 'delivered-worker', ledger.integrationRevision]);
  assert.equal(captureError(() => validateActionResultBinding(ledger, rebase.id, result, environment)).code, 'CAMPAIGN_WORKER_BINDING_MISSING');
  command(root, ['branch', '-f', 'delivered-worker', workerRevision]);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  assert.equal(captureError(() => validateActionResultBinding(ledger, rebase.id, result, environment)).code, 'CAMPAIGN_WORKER_BINDING_MISSING');
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  assert.equal(reconcileLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments.length, 1);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
  assert.doesNotThrow(() => validateActionResultBinding(ledger, rebase.id, result, environment));
  recordActionResult(ledger, rebase.id, result);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'READY_TO_MERGE');
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(command(root, ['rev-parse', 'HEAD']), workerRevision);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.assignments[0].state, 'MERGED');
  const dispatch = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(dispatch.type, 'CREATE_WORKER');
  assert.equal(dispatch.payload.planId, 'independent');
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(({ id }) => id), [dispatch.id]);
});

test('missing undelivered checkout can be re-provisioned in the same session without an archived artifact', () => {
  const root = repository();
  const baseRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-qb', 'worker']);
  fs.writeFileSync(path.join(root, 'worker.txt'), 'preserved\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'preserved worker commit']);
  const workerRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-q', 'main']);
  const missingWorker = path.join(temporaryDirectory('ponytail-recover-worker-parent'), 'worker');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-recover-worker-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'recover-assignment', planId: 'work', sessionId: 'recover-session', worktree: missingWorker, branch: 'worker',
    dispatchRevision: baseRevision, workerRevision: baseRevision, state: 'ACTIVE', idempotencyKey: 'recover-key',
    attachToken: 'recover-token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments.push(assignment);
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), `${JSON.stringify({
    schemaVersion: 1,
    bindings: [{
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: missingWorker, branch: assignment.branch,
      revision: baseRevision, boundAt: new Date().toISOString(),
    }],
  })}\n`);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'completed', worktree: missingWorker, managedWorktree: true }],
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
  ]);

  let status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'), true);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), false);
  const workPlan = campaignGraph.plans.find(({ id }) => id === 'work');
  const runnableTasklets = workPlan.runnableTasklets;
  workPlan.runnableTasklets = null;
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.deepEqual(ledger.pendingActions, []);
  workPlan.runnableTasklets = runnableTasklets;
  const recovery = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(recovery.type, 'RECOVER_WORKTREE');
  assert.deepEqual(recovery.payload, {
    sessionId: assignment.sessionId, previousWorktree: missingWorker, branch: assignment.branch, revision: workerRevision,
  });
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(({ id }) => id), [recovery.id]);
  workPlan.runnableTasklets = null;
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions, []);
  workPlan.runnableTasklets = runnableTasklets;
  assert.equal(advanceLedger(campaignGraph, ledger, environment).id, recovery.id);
  assert.equal(ledger.assignments.length, 1);

  const recoveredWorker = path.join(fs.realpathSync(temporaryDirectory('ponytail-reprovisioned-worker-parent')), 'worker');
  const result = { ok: true, sessionId: assignment.sessionId, worktree: recoveredWorker, branch: assignment.branch, revision: workerRevision };
  assert.equal(captureError(() => validateActionResultBinding(ledger, recovery.id, result, environment)).code, 'CAMPAIGN_WORKER_BINDING_MISSING');
  command(root, ['worktree', 'add', '-q', recoveredWorker, 'worker']);
  assert.equal(captureError(() => validateActionResultBinding(ledger, recovery.id, result, environment)).code, 'CAMPAIGN_WORKER_BINDING_MISSING');
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'completed', worktree: recoveredWorker, managedWorktree: true }],
  }, environment);
  fs.writeFileSync(path.join(recoveredWorker, 'dirty.txt'), 'dirty\n');
  assert.equal(captureError(() => validateActionResultBinding(ledger, recovery.id, result, environment)).code, 'CAMPAIGN_ACTION_RESULT');
  fs.unlinkSync(path.join(recoveredWorker, 'dirty.txt'));
  const replacement = validateActionResultBinding(ledger, recovery.id, result, environment);
  replaceRecoveredWorkerBinding(environment, assignment.id, replacement);
  replaceRecoveredWorkerBinding(environment, assignment.id, validateActionResultBinding(ledger, recovery.id, result, environment));
  recordActionResult(ledger, recovery.id, result);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.length, 0);
  assert.equal(status.assignments[0].state, 'ACTIVE');
  assert.equal(status.assignments[0].worktree, recoveredWorker);
  assert.equal(status.assignments[0].workerRevision, workerRevision);
  assert.equal(readWorkerBindings(environment).bindings[0].worktree, recoveredWorker);
  assert.equal(readWorkerDeliveries(root, 'campaign', environment).deliveries.length, 0);
});

test('delivered waiting worker with a missing checkout recovers before rebase and preserves delivery', () => {
  const root = repository();
  const worker = path.join(temporaryDirectory('ponytail-missing-rebase-worker-parent'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'rebase-worker', worker]);
  write(worker, 'pm/plans/in_progress/work/evidence/result.md', 'verified\n');
  command(worker, ['add', '.']);
  command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'delivered work']);
  const workerRevision = command(worker, ['rev-parse', 'HEAD']);
  write(root, 'integration.txt', 'new integration\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'advance integration']);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-missing-rebase-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'rebase-assignment', planId: 'work', sessionId: 'rebase-session', worktree: worker, branch: 'rebase-worker',
    dispatchRevision: command(root, ['merge-base', 'HEAD', workerRevision]), workerRevision,
    state: 'REBASE_REQUIRED', idempotencyKey: 'rebase-key', attachToken: 'rebase-token',
    worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments.push(assignment);
  recordWorkerDelivery(root, 'campaign', { ...assignment, planPath: 'pm/plans/in_progress/work/plan.md' }, {
    revision: workerRevision, evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'],
  }, environment);
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), `${JSON.stringify({
    schemaVersion: 1, bindings: [{
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: worker, branch: assignment.branch,
      revision: assignment.dispatchRevision, boundAt: new Date().toISOString(),
    }],
  })}\n`);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  command(root, ['worktree', 'remove', worker]);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
    { id: 'independent', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'independent' },
  ]);

  command(root, ['branch', '-f', assignment.branch, 'HEAD']);
  let status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(captureError(() => readyActions(status, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
  command(root, ['branch', '-f', assignment.branch, workerRevision]);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(captureError(() => readyActions(status, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.assignments[0].state, 'REBASE_REQUIRED');
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'), true);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), false);
  assert.doesNotThrow(() => readyActions(status, campaignGraph));
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'working', worktree: worker, managedWorktree: true }],
  }, environment);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(captureError(() => readyActions(status, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'waiting', worktree: worker, managedWorktree: true }],
  }, environment);
  const recovery = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(recovery.type, 'RECOVER_WORKTREE');
  assert.equal(recovery.payload.revision, workerRevision);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'working', worktree: worker, managedWorktree: true }],
  }, environment);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'), true);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKER_MISSING'), false);
  assert.doesNotThrow(() => readyActions(status, campaignGraph));
  command(root, ['branch', '-f', assignment.branch, 'HEAD']);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(captureError(() => readyActions(status, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
  command(root, ['branch', '-f', assignment.branch, workerRevision]);
  const independentDispatch = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(independentDispatch.type, 'CREATE_WORKER');
  assert.equal(independentDispatch.payload.planId, 'independent');
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(({ id }) => id), [recovery.id, independentDispatch.id]);

  const recoveredWorker = path.join(fs.realpathSync(temporaryDirectory('ponytail-recovered-rebase-worker-parent')), 'worker');
  command(root, ['worktree', 'add', '-q', recoveredWorker, 'rebase-worker']);
  const result = { ok: true, sessionId: assignment.sessionId, worktree: recoveredWorker, branch: assignment.branch, revision: workerRevision };
  assert.equal(captureError(() => validateActionResultBinding(ledger, recovery.id, result, environment)).code, 'CAMPAIGN_WORKER_BINDING_MISSING');
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'completed', worktree: recoveredWorker, managedWorktree: true }],
  }, environment);
  assert.equal(captureError(() => validateActionResultBinding(ledger, recovery.id, { ...result, revision: command(root, ['rev-parse', 'HEAD']) }, environment)).code, 'CAMPAIGN_ACTION_RESULT');
  const replacement = validateActionResultBinding(ledger, recovery.id, result, environment);
  replaceRecoveredWorkerBinding(environment, assignment.id, replacement);
  recordActionResult(ledger, recovery.id, result);
  assert.deepEqual(recordActionResult(ledger, recovery.id, result), ledger.assignments[0]);
  assert.equal(readWorkerDeliveries(root, 'campaign', environment).deliveries[0].revision, workerRevision);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.assignments.find(({ id }) => id === assignment.id).state, 'REBASE_REQUIRED');
  assert.equal(status.readyToMerge.length, 0);
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  const rebase = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(rebase.type, 'REQUEST_REBASE');
  assert.equal(rebase.assignmentId, assignment.id);
  command(recoveredWorker, ['rebase', 'main']);
  const rebasedRevision = command(recoveredWorker, ['rev-parse', 'HEAD']);
  validateActionResultBinding(ledger, rebase.id, { ok: true, revision: rebasedRevision }, environment);
  recordActionResult(ledger, rebase.id, { ok: true, revision: rebasedRevision });
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.readyToMerge.length, 0);
  assert.equal(readWorkerDeliveries(root, 'campaign', environment).deliveries[0].revision, workerRevision);
  recordWorkerDelivery(root, 'campaign', { ...ledger.assignments[0], planPath: 'pm/plans/in_progress/work/plan.md' }, {
    revision: rebasedRevision, evidencePaths: ['pm/plans/in_progress/work/evidence/result.md'],
  }, environment);
  status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.readyToMerge[0].id, assignment.id);
});

test('missing worker checkout without verified delivery remains blocking', () => {
  const root = repository();
  const missingWorker = path.join(temporaryDirectory('ponytail-unverified-missing-worker-parent'), 'worker');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-unverified-missing-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignment = {
    id: 'unverified-assignment', planId: 'work', sessionId: 'unverified-session', worktree: missingWorker, branch: 'worker',
    dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision, state: 'ACTIVE', idempotencyKey: 'unverified-key',
    attachToken: 'unverified-token', worktreeArchived: false, sessionArchived: false,
  };
  ledger.assignments.push(assignment);
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), `${JSON.stringify({
    schemaVersion: 1,
    bindings: [{
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: 'hash', sessionId: assignment.sessionId, worktree: missingWorker, branch: assignment.branch,
      revision: ledger.integrationRevision, boundAt: new Date().toISOString(),
    }],
  })}\n`);
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [assignment.sessionId],
    sessions: [{ sessionId: assignment.sessionId, state: 'completed', worktree: missingWorker, managedWorktree: true }],
  }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
  ]);

  const status = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING'), true);
  assert.equal(status.diagnostics.some(({ code }) => code === 'CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY'), false);
  assert.equal(captureError(() => advanceLedger(campaignGraph, ledger, environment)).code, 'CAMPAIGN_STATUS_BLOCKED');
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
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
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
  assert.equal(first.pendingActions[0].type, 'CREATE_WORKER');
  const ledgerFile = ledgerPath(fs.realpathSync(root), 'campaign', environment);
  const ledgerBefore = fs.readFileSync(ledgerFile, 'utf8');
  const revisionBefore = command(root, ['rev-parse', 'HEAD']);
  result = spawnSync(process.execPath, [campaignCli, 'ready-actions', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  const ready = JSON.parse(result.stdout);
  assert.equal(ready.schemaVersion, 4);
  assert.deepEqual(ready.actions, first.pendingActions);
  assert.equal(fs.readFileSync(ledgerFile, 'utf8'), ledgerBefore);
  assert.equal(command(root, ['rev-parse', 'HEAD']), revisionBefore);
  result = spawnSync(process.execPath, [campaignCli, 'advance', 'campaign', '--json'], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).pendingActions[0].id, first.pendingActions[0].id);
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
  assert.deepEqual(parseArguments(['retire-worktree', 'campaign', 'action', '--json']), {
    operation: 'retire-worktree', input: 'campaign', json: true, actionId: 'action', result: undefined,
  });
  assert.equal(captureError(() => parseArguments(['retire-worktree', 'action'])).code, 'CAMPAIGN_ORCHESTRATION_USAGE');
  assert.deepEqual(parseArguments(['ready-actions', 'campaign', '--json']), {
    operation: 'ready-actions', input: 'campaign', json: true, actionId: undefined, result: undefined,
  });
  assert.deepEqual(parseArguments(['action-result', 'campaign', 'action', '--result', '{"ok":true}']), {
    operation: 'action-result', input: 'campaign', json: false, actionId: 'action', result: { ok: true },
  });
  assert.equal(captureError(() => parseArguments(['action-result', 'action', '--result', '{"ok":true}'])).code, 'CAMPAIGN_ORCHESTRATION_USAGE');
  assert.deepEqual(parseArguments(['deliver', 'campaign', '--result', '{"revision":"abc","evidencePaths":["pm/evidence.md"]}']), {
    operation: 'deliver', input: 'campaign', json: false, actionId: undefined,
    result: { revision: 'abc', evidencePaths: ['pm/evidence.md'] },
  });

  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-worktree-lock') };
  withWorktreeLock(root, environment, () => {
    const locks = fs.readdirSync(environment.PONYTAIL_CAMPAIGN_STATE_DIR, { recursive: true }).filter((entry) => entry.endsWith('advance.lock'));
    assert.equal(locks.length, 1);
  });
  const remaining = fs.readdirSync(environment.PONYTAIL_CAMPAIGN_STATE_DIR, { recursive: true }).filter((entry) => entry.endsWith('advance.lock'));
  assert.deepEqual(remaining, []);
});
