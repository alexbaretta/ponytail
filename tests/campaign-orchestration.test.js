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
  scheduleReviewReadyPlans,
  schedulePlanningReadyPlans,
  ledgerPath,
  reconcileLedger,
  newLedger,
  parseArguments,
  readActionV1,
  readActionV2,
  readActionV4,
  readActionV5,
  readActionV6,
  readHostObservation,
  readLedger,
  readLedgerV1,
  readLedgerV2,
  readLedgerV3,
  readLedgerV4,
  readLedgerV5,
  readLedgerV6,
  readLedgerV7,
  readLedgerV8,
  readWorkerDeliveries,
  readWorkerBindings,
  readReadyActionsV1,
  readReadyActionsV2,
  readReadyActionsV4,
  readReadyActionsV5,
  readReadyActionsV6,
  readReadyActionsV7,
  readStatusV7,
  readStatusV8,
  readStatusV9,
  readStatusV10,
  readRunnablePlansV1,
  readRunnablePlansV2,
  CampaignRunnablePlansReaders,
  runnablePlanDiagnostics,
  recordExecutionBlocker,
  readyActions,
  reservationAudit,
  reconcile,
  recordActionResult,
  retryDispatch,
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

test('reservation audit distinguishes retained workers, provisioned sessions, and unresolved starts', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-reservation-audit') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  command(root, ['branch', 'worker']);
  const revision = command(root, ['rev-parse', 'HEAD']);
  const assignment = { id: 'created-assignment', planId: 'done', sessionId: 'created-session', worktree: root,
    branch: 'worker', dispatchRevision: revision, workerRevision: revision, state: 'ARCHIVED',
    idempotencyKey: 'created-key', attachToken: 'created-token', worktreeArchived: false, sessionArchived: false };
  ledger.assignments.push(assignment);
  ledger.workers.push({ sessionId: assignment.sessionId, worktree: root, branch: 'worker', revision,
    clean: true, activity: 'idle', evidenceComplete: true, worktreeArchived: false, sessionArchived: false });
  recordCreatedWorker(ledger, ledger.workers[0], assignment.id);
  const pending = (id, planId, state, bootstrap = null) => {
    ledger.assignments.push({ ...assignment, id: `${id}-assignment`, planId, sessionId: null, worktree: null,
      branch: null, workerRevision: null, state: 'DISPATCH_PENDING', idempotencyKey: id, attachToken: `${id}-token` });
    return readActionV4({ schemaVersion: 4, id, type: 'CREATE_WORKER', assignmentId: `${id}-assignment`,
      idempotencyKey: id, payload: { planId, dispatch: { ready: true, state, hostIdentity: state === 'STARTED' ? `client-new-thread:${id}` : null }, bootstrap } });
  };
  ledger.pendingActions.push(pending('unstarted', 'done', 'NOT_STARTED'));
  ledger.pendingActions.push(pending('started', 'done', 'STARTED'));
  ledger.pendingActions.push(pending('provisioned', 'ready', 'STARTED', { sessionId: 'provisioned-session', worktree: root }));
  ledger.dispatchRetries.push({ originalAction: pending('superseded', 'done', 'STARTED'), successorActionId: 'started', authorization: 'authorization', recordedAt: new Date().toISOString(), outcome: 'UNKNOWN_OUTCOME_SUPERSEDED' });
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['created-session', 'provisioned-session'], sessions: [
      { sessionId: 'created-session', state: 'waiting', worktree: root, managedWorktree: true },
      { sessionId: 'provisioned-session', state: 'working', worktree: root, managedWorktree: true },
    ] }, environment);
  const campaignGraph = graph([{ id: 'done', lifecycle: 'closed' }, { id: 'ready', lifecycle: 'open' }]);
  assert.deepEqual(parseArguments(['reservation-audit', 'campaign', '--json']), { operation: 'reservation-audit', input: 'campaign', json: true, actionId: undefined, result: undefined });
  const result = reservationAudit(campaignGraph, ledger, environment);
  assert.equal(result.reservationCount, 5);
  assert.deepEqual(result.reservations.map(item => [item.kind, item.creationState, item.canRelease]), [
    ['CREATED_SESSION', 'CREATED', false], ['PENDING_CREATION', 'NOT_STARTED', true],
    ['PENDING_CREATION', 'STARTED_OUTCOME_UNKNOWN', false], ['PENDING_CREATION', 'PROVISIONED', false],
    ['SUPERSEDED_CREATION', 'STARTED_OUTCOME_UNKNOWN', false],
  ]);
  assert.equal(result.reservations[0].hostState, 'waiting');
  assert.equal(result.reservations[0].unmergedCommits, false);
  assert.ok(result.reservations[0].objections.includes('RETAINED_CAMPAIGN_PAIR'));
  assert.equal(result.reservations[3].hostState, 'working');
  assert.ok(result.reservations[2].objections.includes('CREATION_OUTCOME_UNKNOWN'));
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    completeSessionIds: ['created-session', 'provisioned-session'], sessions: [
      { sessionId: 'created-session', state: 'waiting', worktree: root, managedWorktree: true },
      { sessionId: 'provisioned-session', state: 'working', worktree: root, managedWorktree: true },
    ] }, environment);
  assert.equal(reservationAudit(campaignGraph, ledger, environment).reservations[0].hostState, 'unknown');
  command(root, ['switch', 'worker']);
  fs.writeFileSync(path.join(root, 'worker.txt'), 'unmerged\n');
  command(root, ['add', 'worker.txt']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'worker']);
  command(root, ['switch', 'main']);
  assert.equal(reservationAudit(campaignGraph, ledger, environment).reservations[0].unmergedCommits, true);
});

test('reservation audit CLI reports a scoped versioned inventory without mutating the ledger', () => {
  const root = campaignRepository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-reservation-cli') };
  const result = spawnSync(process.execPath, [campaignCli, 'reservation-audit', 'campaign', '--json'], { cwd: root, env: environment, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.reservationCount, 0);
  assert.equal(fs.existsSync(ledgerPath(root, 'campaign', environment)), false);
});

test('unfinished assignment continuation requires the original idle session and live checkout', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-continuation') };
  const worktree = path.join(temporaryDirectory('ponytail-continuation-worker'), 'worker');
  command(root, ['worktree', 'add', '-b', 'worker', worktree]);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const revision = ledger.integrationRevision;
  const assignment = { id: 'unfinished', planId: 'work', sessionId: 'original-session', worktree,
    branch: 'worker', dispatchRevision: revision, workerRevision: revision, state: 'MERGED',
    idempotencyKey: 'unfinished-key', attachToken: 'unfinished-token', worktreeArchived: false, sessionArchived: false };
  ledger.assignments.push(assignment);
  ledger.workers.push({ sessionId: assignment.sessionId, worktree, branch: 'worker', revision,
    clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false });
  recordCreatedWorker(ledger, ledger.workers[0], assignment.id);
  const campaignGraph = graph([{ id: 'work', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', runnableTasklets: null }]);
  const observe = (state) => writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['original-session'], sessions: [{ sessionId: 'original-session', state, worktree, managedWorktree: true }],
  }, environment);
  observe('waiting');
  const [ready] = reconcile(campaignGraph, ledger, root, environment).continuations;
  assert.deepEqual(ready, { assignmentId: 'unfinished', planId: 'work', sessionId: 'original-session',
    worktree, phase: 'PLAN_CONTINUATION', ready: true, objections: [] });
  recordExecutionBlocker(ledger, { schemaVersion: 1, assignmentId: assignment.id, actionId: null,
    phase: 'EXECUTION', state: 'BLOCKED', code: 'ENVIRONMENT_BLOCKED',
    summary: 'Provider prerequisite is absent.', requiredAction: 'Integrate the provider prerequisite.' },
  { ...environment, PONYTAIL_SESSION_ID: 'coordinator' });
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections, ['ENVIRONMENT_BLOCKED']);
  recordExecutionBlocker(ledger, { schemaVersion: 1, assignmentId: assignment.id, actionId: null,
    phase: 'EXECUTION', state: 'RESOLVED', code: 'ENVIRONMENT_BLOCKED',
    summary: 'Provider prerequisite integrated.', requiredAction: 'Resume the original worker.' },
  { ...environment, PONYTAIL_SESSION_ID: 'coordinator' });
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections, []);
  campaignGraph.plans[0].runnableTasklets = { sprintId: 'S01', taskletIds: ['S01-F01-T01'] };
  assert.equal(reconcile(campaignGraph, ledger, root, environment).continuations[0].phase, 'TASKLETS');
  campaignGraph.plans[0].runnableTasklets = null;
  campaignGraph.plans[0].reviewableSprint = { sprintId: 'S01', taskletIds: ['S01-F01-T01'] };
  assert.equal(reconcile(campaignGraph, ledger, root, environment).continuations[0].phase, 'TASKLET_REVIEW');
  campaignGraph.plans[0].reviewableSprint = null;
  observe('working');
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections, ['HOST_SESSION_WORKING']);
  observe('waiting');
  ledger.pendingActions.push(readActionV5({ schemaVersion: 5, id: 'recovery', type: 'RECOVER_WORKTREE',
    assignmentId: assignment.id, idempotencyKey: 'recovery-key', payload: { sessionId: assignment.sessionId,
      previousWorktree: worktree, branch: 'worker', revision } }));
  assert.ok(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections.includes('PENDING_ACTION'));
  ledger.pendingActions = [];
  ledger.assignments.push({ ...assignment, id: 'duplicate', idempotencyKey: 'duplicate-key', attachToken: 'duplicate-token' });
  assert.ok(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections.includes('CAMPAIGN_ASSIGNMENT_CONFLICT'));
  ledger.assignments.pop();
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(), completeSessionIds: ['original-session'],
    sessions: [{ sessionId: 'original-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  assert.ok(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections.includes('CAMPAIGN_HOST_OBSERVATION_STALE'));
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: [], sessions: [] }, environment);
  assert.ok(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections.includes('CAMPAIGN_HOST_OBSERVATION_INCOMPLETE'));
  observe('waiting');
  fs.rmSync(worktree, { recursive: true });
  assert.ok(reconcile(campaignGraph, ledger, root, environment).continuations[0].objections.includes('CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY'));
  campaignGraph.plans[0].lifecycle = 'closed';
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).continuations, []);
});

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
  const cleanup = readActionV5({ schemaVersion: 5, id: 'original-action', type: 'ARCHIVE_WORKTREE', assignmentId: assignment.id, idempotencyKey: 'cleanup-key', payload: { sessionId: assignment.sessionId, worktree } });
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

function recordCreatedWorker(ledger, worker, assignmentId = `created-${worker.sessionId}`) {
  ledger.completedActions.push({ actionId: `create-${worker.sessionId}`, assignmentId, type: 'CREATE_WORKER',
    result: { ok: true, sessionId: worker.sessionId, worktree: worker.worktree, branch: worker.branch, revision: worker.revision } });
}

function captureError(callback) {
  try { callback(); } catch (error) {
    assert.ok(error instanceof CampaignOrchestrationError);
    return error;
  }
  assert.fail('expected CampaignOrchestrationError');
}

test('historical ledgers normalize recovery and cleanup actions and the current writer emits V8', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-ledger-version') };
  const { dispatchRetries, ...current } = newLedger(root, 'campaign', 'coordinator');
  const { pendingActions, ...ledger } = current;
  const legacy = readLedgerV1({ ...ledger, schemaVersion: 1, pendingAction: null });
  const file = ledgerPath(root, 'campaign', environment);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(legacy)}\n`);

  assert.equal(readLedger(root, 'campaign', environment).schemaVersion, 8);
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
  assert.equal(upgraded.schemaVersion, 8);
  assert.deepEqual(upgraded.pendingActions[0], readActionV6({ ...normalizedRecovery, schemaVersion: 6 }));
  withLedgerLock(root, 'campaign', environment, () => null);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion, 8);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pendingActions[0].schemaVersion, 6);
  assert.equal(pendingActions.length, 0);
});

test('historical cleanup actions gain the original session required for retirement', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-cleanup-action-version') };
  const { dispatchRetries, ...ledger } = newLedger(root, 'campaign', 'coordinator');
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
  assert.equal(upgraded.schemaVersion, 8);
  assert.deepEqual(upgraded.pendingActions[0].payload, { sessionId: assignment.sessionId, worktree: assignment.worktree });
  assert.equal(upgraded.pendingActions[0].schemaVersion, 6);
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
  assert.equal(readLedgerV8(ledger).assignments.length, 2);
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

test('V10 status exposes session, worktree, activity, assignment, action, and conflict views', () => {
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
  assert.equal(status.schemaVersion, 10);
  assert.deepEqual(readStatusV10(status), status);
  const { continuations, bootstrapContinuations, ...historicalStatus } = status;
  assert.deepEqual(readStatusV7({ ...historicalStatus, schemaVersion: 7, pendingActions: [] }).schemaVersion, 7);
  assert.throws(() => readStatusV7({ ...status, schemaVersion: 7 }), /exactly/);
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

test('campaign observe persists a normalized host snapshot and returns V10 status', () => {
  const root = campaignRepository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-observe-cli'), PONYTAIL_SESSION_ID: 'coordinator' };
  const snapshot = { schemaVersion: 1, campaignId: 'campaign', observedAt: '2026-09-30T12:00:00-07:00', completeSessionIds: [], sessions: [] };
  const result = spawnSync(process.execPath, [campaignCli, 'observe', 'campaign', '--snapshot', JSON.stringify(snapshot)], { cwd: root, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).schemaVersion, 10);
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
  recordCreatedWorker(ledger, ledger.workers[0]);
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

test('schedule-ready reuses every safe idle pair despite grandfathered excess reservations', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-grandfathered-capacity') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  for (let index = 0; index < 33; index += 1) {
    const sessionId = `retained-${index}`;
    const worker = { sessionId, worktree: `/absent/${sessionId}`, branch: sessionId,
      revision: ledger.integrationRevision, clean: false, activity: 'missing', evidenceComplete: false,
      worktreeArchived: false, sessionArchived: false };
    ledger.workers.push(worker);
    recordCreatedWorker(ledger, worker);
  }
  const idleSessions = ['idle-a', 'idle-b'];
  for (const sessionId of idleSessions) {
    const worktree = path.join(temporaryDirectory(`ponytail-${sessionId}`), 'worker');
    command(root, ['worktree', 'add', '-qb', sessionId, worktree]);
    const worker = { sessionId, worktree, branch: sessionId, revision: ledger.integrationRevision,
      clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false };
    ledger.workers.push(worker);
    recordCreatedWorker(ledger, worker);
  }
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: idleSessions,
    sessions: idleSessions.map(sessionId => ({ sessionId, state: 'waiting',
      worktree: ledger.workers.find(worker => worker.sessionId === sessionId).worktree, managedWorktree: true })) }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    ...['ready-a', 'ready-b', 'ready-c'].map(id => ({ id, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: id })),
  ]);
  const first = scheduleReadyPlans(campaignGraph, ledger, environment);
  assert.deepEqual(first.actions.map(({ type, payload }) => ({ type, sessionId: payload.sessionId, planId: payload.planId })), [
    { type: 'REUSE_WORKER', sessionId: 'idle-a', planId: 'ready-a' },
    { type: 'REUSE_WORKER', sessionId: 'idle-b', planId: 'ready-b' },
  ]);
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger, environment), first);
  assert.equal(ledger.pendingActions.filter(({ type }) => type === 'CREATE_WORKER').length, 0);
});

test('review-only scheduling reuses one original idle pair without making unreviewed tasklets executable', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-review-dispatch') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const sessionId = 'original-reviewer';
  const worktree = path.join(temporaryDirectory('ponytail-review-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', sessionId, worktree]);
  const worker = { sessionId, worktree, branch: sessionId, revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false };
  ledger.workers.push(worker);
  recordCreatedWorker(ledger, worker);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: [sessionId],
    sessions: [{ sessionId, state: 'waiting', worktree, managedWorktree: true }] }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'review', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'review',
      runnableTasklets: null, reviewableSprint: { sprintId: 'S01', taskletIds: ['S01-F01-T01'] } },
  ]);
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger, environment).actions, []);
  const first = scheduleReviewReadyPlans(campaignGraph, ledger, environment);
  assert.equal(first.actions.length, 1);
  assert.equal(first.actions[0].type, 'REVIEW_WORKER');
  assert.equal(first.actions[0].payload.planId, 'review');
  assert.equal(first.actions[0].payload.sprintId, 'S01');
  assert.equal(first.actions[0].payload.sessionId, sessionId);
  assert.equal(first.actions[0].payload.worktree, worktree);
  assert.deepEqual(scheduleReviewReadyPlans(campaignGraph, ledger, environment), first);
  assert.equal(ledger.assignments.length, 1);
  assert.equal(ledger.pendingActions.filter(({ type }) => type === 'CREATE_WORKER').length, 0);
});

test('initial planning uses an idle campaign pair while independent implementation retains its own pair', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-planning-dispatch') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  for (const sessionId of ['idle-a', 'idle-b']) {
    const worktree = path.join(temporaryDirectory(`ponytail-${sessionId}`), 'worker');
    command(root, ['worktree', 'add', '-qb', sessionId, worktree]);
    const worker = { sessionId, worktree, branch: sessionId, revision: ledger.integrationRevision,
      clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false };
    ledger.workers.push(worker);
    recordCreatedWorker(ledger, worker);
  }
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: ['idle-a', 'idle-b'],
    sessions: ledger.workers.map(({ sessionId, worktree }) => ({ sessionId, state: 'waiting', worktree, managedWorktree: true })) }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'implement', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'implement' },
    { id: 'plan', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'plan',
      runnableTasklets: null, planningSprint: { sprintId: 'S01', planningStatus: 'STUB' } },
  ]);
  const implementation = scheduleReadyPlans(campaignGraph, ledger, environment).actions;
  assert.equal(implementation.length, 1);
  assert.equal(implementation[0].type, 'REUSE_WORKER');
  const planning = schedulePlanningReadyPlans(campaignGraph, ledger, environment).actions;
  assert.equal(planning.length, 2);
  assert.equal(planning[1].type, 'PLAN_WORKER');
  assert.equal(planning[1].payload.planId, 'plan');
  assert.equal(planning[1].payload.sprintId, 'S01');
  assert.notEqual(planning[1].payload.sessionId, implementation[0].payload.sessionId);
  assert.deepEqual(schedulePlanningReadyPlans(campaignGraph, ledger, environment).actions, planning);
  const started = structuredClone(ledger);
  recordActionResult(started, planning[1].id, { ok: true, disposition: 'STARTED', hostIdentity: planning[1].payload.sessionId }, campaignGraph);
  campaignGraph.plans[2].planningSprint = null;
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(item => item.id), [implementation[0].id]);
  assert.equal(started.pendingActions.find(({ id }) => id === planning[1].id).payload.dispatch.state, 'STARTED');
  assert.deepEqual(readyActions(reconcile(campaignGraph, started, root, environment), campaignGraph).actions.map(item => item.id), [implementation[0].id]);
  recordActionResult(ledger, planning[1].id, { ok: false, disposition: 'NOT_STARTED' }, campaignGraph);
  assert.equal(ledger.assignments.find(({ planId }) => planId === 'plan').sessionId, null);
});

test('planning worker can refresh its pending attachment after a clean integrated fast-forward', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-planning-attach-refresh') };
  const worktreePath = path.join(temporaryDirectory('ponytail-planning-attach-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'planning-worker', worktreePath]);
  const worktree = fs.realpathSync(worktreePath);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'plan', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'plan', planningSprint: { sprintId: 'S01', planningStatus: 'STUB' } },
  ]);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['planning-session'], sessions: [{ sessionId: 'planning-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  const scheduled = withLedgerLock(root, 'campaign', environment, ledger => {
    ledger.coordinatorSessionId = 'coordinator';
    const worker = { sessionId: 'planning-session', worktree, branch: 'planning-worker', revision: ledger.integrationRevision,
      clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false };
    ledger.workers.push(worker);
    recordCreatedWorker(ledger, worker);
    return schedulePlanningReadyPlans(campaignGraph, ledger, environment).actions[0];
  });
  const first = bindWorker(environment, worktree, scheduled.payload.attachToken, 'planning-session');
  fs.writeFileSync(path.join(root, 'new-plan.txt'), 'integrated planning source');
  command(root, ['add', 'new-plan.txt']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'integrated plan source']);
  const integrated = command(root, ['rev-parse', 'HEAD']);
  command(worktree, ['merge', '--ff-only', integrated]);
  fs.writeFileSync(path.join(worktree, 'uncommitted.txt'), 'not an integrated checkpoint');
  assert.equal(captureError(() => bindWorker(environment, worktree, scheduled.payload.attachToken, 'planning-session')).code, 'CAMPAIGN_WORKER_BINDING_CONFLICT');
  fs.unlinkSync(path.join(worktree, 'uncommitted.txt'));
  const refreshed = bindWorker(environment, worktree, scheduled.payload.attachToken, 'planning-session');
  assert.equal(refreshed.assignmentId, first.assignmentId);
  assert.equal(refreshed.revision, integrated);
  assert.equal(readWorkerBindings(environment).bindings.filter(item => item.assignmentId === first.assignmentId).length, 1);
  const result = { ok: true, sessionId: refreshed.sessionId, worktree: refreshed.worktree, branch: refreshed.branch, revision: refreshed.revision };
  withLedgerLock(root, 'campaign', environment, ledger => {
    assert.doesNotThrow(() => validateActionResultBinding(ledger, scheduled.id, result, environment));
    recordActionResult(ledger, scheduled.id, result, campaignGraph);
  });
  assert.equal(readLedger(root, 'campaign', environment).assignments.find(item => item.id === scheduled.assignmentId).state, 'ACTIVE');
});

test('retry-dispatch persists one fenced successor across CLI restarts and retains unknown capacity', () => {
  const root = fs.realpathSync(campaignRepository());
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retry-state'), PONYTAIL_SESSION_ID: 'coordinator' };
  const invoke = (...arguments_) => spawnSync(process.execPath, [campaignCli, ...arguments_], { cwd: root, encoding: 'utf8', env: environment });
  const scheduled = invoke('schedule-ready', 'campaign', '--json');
  assert.equal(scheduled.status, 0, scheduled.stderr);
  const original = JSON.parse(scheduled.stdout).actions[0];
  const started = invoke('action-result', 'campaign', original.id, '--result', JSON.stringify({ ok: true, disposition: 'STARTED', hostIdentity: 'original-client' }));
  assert.equal(started.status, 0, started.stderr);
  const originalStarted = structuredClone(readLedger(root, 'campaign', environment).pendingActions[0]);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: [], sessions: [] }, environment);
  const first = invoke('retry-dispatch', 'campaign', original.id, '--authorization', 'human-message-2026-10-02', '--json');
  assert.equal(first.status, 0, first.stderr);
  const successor = JSON.parse(first.stdout).actions[0];
  assert.equal(successor.assignmentId, original.assignmentId);
  assert.notEqual(successor.id, original.id);
  assert.notEqual(successor.idempotencyKey, original.idempotencyKey);
  assert.notEqual(successor.payload.attachToken, original.payload.attachToken);
  const persisted = readLedger(root, 'campaign', environment);
  assert.deepEqual(persisted.dispatchRetries[0].originalAction, originalStarted);
  assert.equal(persisted.dispatchRetries[0].successorActionId, successor.id);
  assert.deepEqual(readLedgerV8(persisted), persisted);
  assert.equal(persisted.dispatchRetries[0].outcome, 'UNKNOWN_OUTCOME_SUPERSEDED');
  for (const edit of [{ originalAction: null }, { outcome: 'NOT_STARTED' }, { successorActionId: 'missing-successor' }, { authorization: '' }]) {
    assert.throws(() => readLedgerV7({ ...persisted, dispatchRetries: [{ ...persisted.dispatchRetries[0], ...edit }] }), CampaignOrchestrationError);
  }
  const replay = invoke('retry-dispatch', 'campaign', original.id, '--authorization', 'human-message-2026-10-02', '--json');
  assert.equal(replay.status, 0, replay.stderr);
  assert.deepEqual(JSON.parse(replay.stdout), JSON.parse(first.stdout));
  assert.deepEqual(readLedger(root, 'campaign', environment), persisted);
  const lateResult = invoke('action-result', 'campaign', original.id, '--result', JSON.stringify({ ok: true, disposition: 'STARTED', hostIdentity: 'original-client' }));
  assert.notEqual(lateResult.status, 0);
  assert.match(lateResult.stderr, /superseded/);
  const worker = path.join(temporaryDirectory('ponytail-retry-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'retry-worker', worker]);
  assert.equal(captureError(() => bindWorker(environment, worker, original.payload.attachToken, 'late-original')).code, 'CAMPAIGN_ATTACH_TOKEN');
  const binding = bindWorker(environment, worker, successor.payload.attachToken, 'successor-session');
  assert.equal(binding.assignmentId, original.assignmentId);
  const completion = invoke('action-result', 'campaign', successor.id, '--result', JSON.stringify({ ok: true, sessionId: binding.sessionId, worktree: binding.worktree, branch: binding.branch, revision: binding.revision }));
  assert.equal(completion.status, 0, completion.stderr);
  assert.equal(readLedger(root, 'campaign', environment).assignments[0].state, 'ACTIVE');

  const capacityRoot = repository();
  const capacity = newLedger(capacityRoot, 'campaign', 'coordinator');
  const capacityGraph = graph([{ id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    ...Array.from({ length: 17 }, (_, i) => ({ id: `p${i}`, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: `p${i}` }))]);
  scheduleReadyPlans(capacityGraph, capacity);
  recordActionResult(capacity, capacity.pendingActions[0].id, { ok: true, disposition: 'STARTED', hostIdentity: 'unknown-client' });
  const capacityEnvironment = { ...environment, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retry-capacity') };
  writeHostObservation(capacityRoot, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: [], sessions: [] }, capacityEnvironment);
  const before = structuredClone(capacity);
  assert.equal(captureError(() => retryDispatch(capacityGraph, capacity, capacity.pendingActions[0].id, 'human', capacityEnvironment, { bindings: [] })).code, 'CAMPAIGN_WORKER_CAPACITY_REACHED');
  assert.deepEqual(capacity, before);

  // A safe retained pair can be reused without releasing the unknown original.
  const idleWorktree = path.join(temporaryDirectory('ponytail-retry-idle'), 'worker');
  command(capacityRoot, ['worktree', 'add', '-qb', 'idle-retry', idleWorktree]);
  capacity.workers.push({ sessionId: 'idle-session', worktree: idleWorktree, branch: 'idle-retry', revision: capacity.integrationRevision, clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
  recordCreatedWorker(capacity, capacity.workers[0]);
  writeHostObservation(capacityRoot, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: ['idle-session'], sessions: [{ sessionId: 'idle-session', state: 'waiting', worktree: idleWorktree, managedWorktree: true }] }, capacityEnvironment);
  const reuseId = retryDispatch(capacityGraph, capacity, capacity.pendingActions[0].id, 'human', capacityEnvironment, { bindings: [] });
  const reuse = capacity.pendingActions.find(({ id }) => id === reuseId);
  assert.equal(reuse.type, 'REUSE_WORKER');
  assert.equal(reuse.payload.sessionId, 'idle-session');
  assert.equal(capacity.dispatchRetries.length, 1);

  // Free two *known unstarted* fixture reservations, retaining the unknown one.
  capacity.pendingActions.splice(0, 2);
  capacity.assignments = capacity.assignments.filter(assignment => capacity.pendingActions.some(item => item.assignmentId === assignment.id));
  const remaining = scheduleReadyPlans(capacityGraph, capacity, capacityEnvironment);
  assert.equal(capacity.pendingActions.filter(({ type }) => type === 'CREATE_WORKER').length, 13);
  assert.equal(remaining.actions.some(({ id }) => id === reuseId), true);
});

test('fenced retry reuses an original idle pair for review when implementation readiness became review-only', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retry-review'), PONYTAIL_SESSION_ID: 'coordinator' };
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'review', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'review' },
  ]);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const original = scheduleReadyPlans(campaignGraph, ledger).actions[0];
  recordActionResult(ledger, original.id, { ok: true, disposition: 'STARTED', hostIdentity: 'unknown-client' });
  const originalStarted = structuredClone(ledger.pendingActions[0]);
  campaignGraph.plans[1].runnableTasklets = null;
  campaignGraph.plans[1].reviewableSprint = { sprintId: 'S01', taskletIds: ['S01-F01-T01'] };
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: [], sessions: [] }, environment);
  const before = structuredClone(ledger);
  assert.equal(captureError(() => retryDispatch(campaignGraph, ledger, original.id, 'human-review-retry', environment, { bindings: [] })).code,
    'CAMPAIGN_WORKER_CAPACITY_REACHED');
  assert.deepEqual(ledger, before);
  const idleWorktree = path.join(temporaryDirectory('ponytail-retry-review-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'review-retry', idleWorktree]);
  ledger.workers.push({ sessionId: 'idle-session', worktree: idleWorktree, branch: 'review-retry', revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
  recordCreatedWorker(ledger, ledger.workers[0]);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['idle-session'], sessions: [{ sessionId: 'idle-session', state: 'waiting', worktree: idleWorktree, managedWorktree: true }] }, environment);
  const successorId = retryDispatch(campaignGraph, ledger, original.id, 'human-review-retry', environment, { bindings: [] });
  const successor = ledger.pendingActions.find(({ id }) => id === successorId);
  assert.equal(successor.type, 'REVIEW_WORKER');
  assert.equal(successor.assignmentId, original.assignmentId);
  assert.equal(successor.payload.sprintId, 'S01');
  assert.equal(successor.payload.sessionId, 'idle-session');
  assert.equal(successor.payload.worktree, idleWorktree);
  assert.notEqual(successor.payload.attachToken, original.payload.attachToken);
  assert.equal(ledger.dispatchRetries[0].originalAction.id, originalStarted.id);
  assert.equal(ledger.dispatchRetries[0].originalAction.payload.attachToken, originalStarted.payload.attachToken);
  assert.equal(ledger.dispatchRetries[0].originalAction.payload.dispatch.state, 'STARTED');
  assert.equal(ledger.dispatchRetries[0].originalAction.payload.dispatch.hostIdentity, 'unknown-client');
  assert.equal(ledger.dispatchRetries[0].successorActionId, successorId);
  assert.deepEqual(readLedgerV8(ledger), ledger);
  assert.equal(captureError(() => bindWorker(environment, idleWorktree, original.payload.attachToken, 'idle-session')).code, 'CAMPAIGN_ATTACH_TOKEN');
  assert.equal(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions[0].id, successorId);
  recordActionResult(ledger, successorId, { ok: true, disposition: 'STARTED', hostIdentity: 'review-client' }, campaignGraph);
  assert.equal(ledger.pendingActions.find(({ id }) => id === successorId).payload.dispatch.ready, true);
  assert.equal(retryDispatch(campaignGraph, ledger, original.id, 'human-review-retry', environment, { bindings: [] }), successorId);
});

test('retry-dispatch rejects unavailable authority, observation, readiness and owned identities', () => {
  for (const condition of ['coordinator', 'authorization', 'observation', 'readiness', 'bootstrap', 'binding', 'sessionId', 'worktree', 'branch', 'workerRevision', 'not-started']) {
    const root = repository();
    const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retry-refusal'), PONYTAIL_SESSION_ID: 'coordinator' };
    const ledger = newLedger(root, 'campaign', 'coordinator');
    const campaignGraph = graph([{ id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' }, { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' }]);
    const original = advanceLedger(campaignGraph, ledger);
    recordActionResult(ledger, original.id, { ok: true, disposition: 'STARTED', hostIdentity: 'client' });
    writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: condition === 'observation' ? '2020-01-01T00:00:00Z' : new Date().toISOString(), completeSessionIds: [], sessions: [] }, environment);
    const bindings = { bindings: condition === 'binding' ? [{ repositoryRoot: root, campaignId: 'campaign', assignmentId: original.assignmentId }] : [] };
    if (condition === 'coordinator') environment.PONYTAIL_SESSION_ID = 'other';
    if (condition === 'readiness') campaignGraph.plans[1].runnableTasklets = null;
    if (condition === 'bootstrap') original.payload.bootstrap = { sessionId: 'provisioned' };
    if (condition === 'not-started') original.payload.dispatch.state = 'NOT_STARTED';
    if (['sessionId', 'worktree', 'branch', 'workerRevision'].includes(condition)) ledger.assignments[0][condition] = 'owned';
    const before = structuredClone(ledger);
    assert.throws(() => retryDispatch(campaignGraph, ledger, original.id, condition === 'authorization' ? '' : 'human', environment, bindings), CampaignOrchestrationError, condition);
    assert.deepEqual(ledger, before, condition);
  }
});

test('retry revocation fences an attachment that resolved its capability before acquiring the binding lock', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-retry-race'), PONYTAIL_SESSION_ID: 'coordinator' };
  const campaignGraph = graph([{ id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' }, { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' }]);
  let original;
  withLedgerLock(root, 'campaign', environment, ledger => {
    original = advanceLedger(campaignGraph, ledger);
    recordActionResult(ledger, original.id, { ok: true, disposition: 'STARTED', hostIdentity: 'client' });
  });
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: [], sessions: [] }, environment);
  const worker = path.join(temporaryDirectory('ponytail-retry-race-worker'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'race-worker', worker]);
  const fsOpenSyncPropertyDescriptor = Object.getOwnPropertyDescriptor(fs, 'openSync');
  let interleaved = false;
  // Deterministically interleave the real durable retry at the lock boundary.
  fs.openSync = (file, ...arguments_) => {
    if (!interleaved && file === path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json.lock')) {
      interleaved = true;
      withLedgerLock(root, 'campaign', environment, ledger => retryDispatch(campaignGraph, ledger, original.id, 'human', environment, { bindings: [] }));
    }
    return fsOpenSyncPropertyDescriptor.value(file, ...arguments_);
  };
  try {
    assert.equal(captureError(() => bindWorker(environment, worker, original.payload.attachToken, 'late-worker')).code, 'CAMPAIGN_ATTACH_TOKEN');
  } finally { Object.defineProperty(fs, 'openSync', fsOpenSyncPropertyDescriptor); }
  assert.equal(interleaved, true);
  assert.deepEqual(readWorkerBindings(environment).bindings, []);
  assert.equal(readLedger(root, 'campaign', environment).dispatchRetries.length, 1);
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

  const rebase = readActionV5({ schemaVersion: 5, id: 'historical-rebase', type: 'REQUEST_REBASE',
    assignmentId: 'join-assignment', idempotencyKey: 'join-key:REQUEST_REBASE',
    payload: { sessionId: 'join-session', ontoRevision: ledger.integrationRevision } });
  ledger.pendingActions.push(rebase);
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
  const rebase = readActionV5({ schemaVersion: 5, id: 'historical-rebase', type: 'REQUEST_REBASE',
    assignmentId: 'join-assignment', idempotencyKey: 'join-key:REQUEST_REBASE',
    payload: { sessionId: 'join-session', ontoRevision: ledger.integrationRevision } });
  ledger.pendingActions.push(rebase);
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
  recordCreatedWorker(postponedLedger, postponedLedger.workers[0]);
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

test('never-started reservation releases after coordinator closure without claiming worker retirement', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'work' },
    { id: 'next', parentPlanId: 'campaign', dependsOn: ['work'], lifecycle: 'open', path: 'next' },
  ]);
  reconcileLedger(campaignGraph, ledger);
  const dispatch = advanceLedger(campaignGraph, ledger);
  const assignment = ledger.assignments.find(item => item.id === dispatch.assignmentId);
  const original = { ...assignment };
  campaignGraph.plans.find(plan => plan.id === 'work').lifecycle = 'closed';
  assert.equal(reconcile(campaignGraph, ledger).diagnostics[0].code, 'CAMPAIGN_ASSIGNMENT_LIFECYCLE');

  const result = { ok: false, disposition: 'NOT_STARTED' };
  recordActionResult(ledger, dispatch.id, result, campaignGraph);
  assert.deepEqual(assignment, { ...original, state: 'ARCHIVED' });
  assert.deepEqual(ledger.completedActions, [{ actionId: dispatch.id, assignmentId: assignment.id, type: 'CREATE_WORKER', result }]);
  assert.deepEqual(ledger.pendingActions, []);
  assert.deepEqual(reconcile(campaignGraph, ledger).diagnostics, []);
  const accepted = JSON.stringify(ledger);
  recordActionResult(ledger, dispatch.id, result, campaignGraph);
  assert.equal(JSON.stringify(ledger), accepted);
  assert.equal(advanceLedger(campaignGraph, ledger).payload.planId, 'next');
  assert.equal(ledger.assignments.filter(item => item.planId === 'work').length, 1);
});

test('closed reservation release refuses started or provisioned worker identities without mutation', () => {
  for (const identity of ['STARTED', 'bootstrap', 'sessionId', 'worktree', 'branch', 'workerRevision', 'ACTIVE']) {
    const root = repository();
    const ledger = newLedger(root, 'campaign', 'coordinator');
    const campaignGraph = graph([
      { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
      { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'work' },
    ]);
    const dispatch = advanceLedger(campaignGraph, ledger);
    const assignment = ledger.assignments[0];
    campaignGraph.plans[1].lifecycle = 'closed';
    if (identity === 'STARTED') dispatch.payload.dispatch = { ready: false, state: 'STARTED', hostIdentity: 'original-client' };
    else if (identity === 'bootstrap') dispatch.payload.bootstrap = { sessionId: 'original-session' };
    else if (identity === 'ACTIVE') assignment.state = 'ACTIVE';
    else assignment[identity] = 'original-identity';
    const before = JSON.stringify(ledger);
    assert.throws(() => recordActionResult(ledger, dispatch.id, { ok: false, disposition: 'NOT_STARTED' }, campaignGraph), CampaignOrchestrationError, identity);
    assert.equal(JSON.stringify(ledger), before, identity);
  }
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
    schemaVersion: 5, id: 'blocked-action', type: 'CREATE_WORKER', assignmentId: 'blocked-assignment',
    idempotencyKey: 'blocked-key', payload: { planId: 'blocked', dispatch: { ready: false, state: 'NOT_STARTED', hostIdentity: null } },
  };
  const started = {
    schemaVersion: 5, id: 'started-action', type: 'CREATE_WORKER', assignmentId: 'started-assignment',
    idempotencyKey: 'started-key', payload: { planId: 'ready', dispatch: { ready: true, state: 'STARTED', hostIdentity: 'client-1' } },
  };
  const rebase = {
    schemaVersion: 5, id: 'rebase-action', type: 'REQUEST_REBASE', assignmentId: 'rebase-assignment',
    idempotencyKey: 'rebase-key', payload: { sessionId: 'session', ontoRevision: ledger.integrationRevision },
  };
  const cleanup = {
    schemaVersion: 5, id: 'cleanup-action', type: 'ARCHIVE_WORKTREE', assignmentId: 'cleanup-assignment',
    idempotencyKey: 'cleanup-key', payload: { sessionId: 'cleanup-session', worktree: '/worker' },
  };
  const ready = {
    schemaVersion: 5, id: 'ready-action', type: 'CREATE_WORKER', assignmentId: 'ready-assignment',
    idempotencyKey: 'ready-key', payload: { planId: 'ready', dispatch: { ready: true, state: 'NOT_STARTED', hostIdentity: null } },
  };
  const status = {
    ...reconcile(campaignGraph, ledger),
    pendingActions: [blocked, started, rebase, cleanup, ready],
  };
  const before = JSON.stringify(status);
  const result = readyActions(status, campaignGraph);
  assert.deepEqual(result.actions, [rebase, ready].map(item => ({ ...item, schemaVersion: 6 })));
  assert.equal(JSON.stringify(status), before);
  assert.deepEqual(readReadyActionsV7(result), result);
  assert.equal(captureError(() => readyActions({ ...status, diagnostics: [{ message: 'conflict' }] }, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
});

test('ready actions expose only a fresh, idle original provisioned bootstrap as resume-only', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-bootstrap-resume'), PONYTAIL_SESSION_ID: 'coordinator' };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'work', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'work' },
  ]);
  const pending = advanceLedger(campaignGraph, ledger);
  const worktree = path.join(temporaryDirectory('ponytail-bootstrap-checkout'), 'worker');
  command(root, ['worktree', 'add', '--detach', worktree]);
  recordActionResult(ledger, pending.id, { ok: true, disposition: 'STARTED', hostIdentity: 'original-client' }, campaignGraph);
  recordActionResult(ledger, pending.id, { ok: true, disposition: 'PROVISIONED', sessionId: 'original-session', worktree }, campaignGraph);
  const observe = (state, observedAt = new Date().toISOString(), sessionWorktree = worktree) => writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt, completeSessionIds: ['original-session'],
    sessions: [{ sessionId: 'original-session', state, worktree: sessionWorktree, managedWorktree: true }],
  }, environment);
  observe('waiting');
  const ready = readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph);
  assert.equal(ready.actions.length, 1);
  assert.equal(ready.actions[0].id, pending.id);
  assert.equal(ready.actions[0].payload.resumeOnly, true);
  assert.equal(ready.actions[0].payload.bootstrap.sessionId, 'original-session');
  assert.equal(ledger.pendingActions[0].payload.resumeOnly, undefined);
  observe('working');
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions, []);
  observe('waiting', new Date(Date.now() - 6 * 60 * 1000).toISOString());
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions, []);
  observe('waiting', new Date().toISOString(), path.join(root, 'wrong-checkout'));
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions, []);
  observe('waiting');
  const blocker = { schemaVersion: 1, assignmentId: pending.assignmentId, actionId: pending.id,
    phase: 'ATTACH', state: 'BLOCKED', code: 'HOST_REVIEW_REJECTED', summary: 'Original adoption was rejected.',
    requiredAction: 'Resolve source prerequisite and refresh exact host evidence.' };
  recordExecutionBlocker(ledger, blocker, environment);
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions, []);
  recordExecutionBlocker(ledger, { ...blocker, state: 'RESOLVED', summary: 'Source prerequisite integrated.' }, environment);
  assert.equal(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions[0].id, pending.id);
});

test('advance reuses a clean idle worker before requesting a new worker', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.workers.push({
    sessionId: 'idle-session', worktree: '/idle', branch: 'idle', revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  recordCreatedWorker(ledger, ledger.workers[0]);
  const selected = advanceLedger(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]), ledger);
  assert.equal(selected.type, 'REUSE_WORKER');
  assert.equal(selected.payload.sessionId, 'idle-session');
});

test('reuse attachment rejects a different session in the reserved worktree', () => {
  const root = repository();
  const worktree = path.join(fs.realpathSync(temporaryDirectory('ponytail-reuse-identity')), 'worker');
  command(root, ['worktree', 'add', '-qb', 'reusable-worker', worktree]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-reuse-identity-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.workers.push({
    sessionId: 'original-session', worktree, branch: 'reusable-worker', revision: ledger.integrationRevision,
    clean: true, activity: 'idle', evidenceComplete: false, worktreeArchived: false, sessionArchived: false,
  });
  recordCreatedWorker(ledger, ledger.workers[0]);
  const selected = advanceLedger(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]), ledger);
  assert.equal(selected.type, 'REUSE_WORKER');
  const file = ledgerPath(root, 'campaign', environment);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(ledger)}\n`);
  assert.equal(captureError(() => bindWorker(environment, worktree, selected.payload.attachToken, 'other-session')).code, 'CAMPAIGN_WORKER_SCOPE');
  assert.equal(readWorkerBindings(environment).bindings.length, 0);
  assert.equal(bindWorker(environment, worktree, selected.payload.attachToken, 'original-session').sessionId, 'original-session');
});

test('schedule-ready does not enroll an unrelated idle host chat for reuse', () => {
  const root = repository();
  const worktree = path.join(fs.realpathSync(temporaryDirectory('ponytail-unrelated-chat')), 'worker');
  command(root, ['worktree', 'add', '-qb', 'unrelated-worker', worktree]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-unrelated-chat-state') };
  writeHostObservation(root, 'campaign', {
    schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: ['unrelated-session'],
    sessions: [{ sessionId: 'unrelated-session', state: 'waiting', worktree, managedWorktree: true }],
  }, environment);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const actions = scheduleReadyPlans(graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]), ledger, environment).actions;
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'CREATE_WORKER');
  assert.equal(actions[0].payload.sessionId, null);
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
    recordCreatedWorker(ledger, ledger.workers[0], 'completed-assignment');
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
    recordCreatedWorker(ledger, ledger.workers[index], `assignment-${index}`);
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
  const successorAction = advanceLedger(successorGraph, successor, environment);
  assert.equal(successorAction.type, 'CREATE_WORKER');
  assert.equal(successorAction.payload.sessionId, null);
  assert.deepEqual(successor.workers, []);
  withLedgerLock(root, 'successor', environment, saved => Object.assign(saved, successor));
  campaignGraph.plans.push({ id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready', runnableTasklets: { sprintId: 'S01', taskletIds: ['S01-F01-T01'] } });
  assert.equal(advanceLedger(campaignGraph, ledger, environment).payload.sessionId, sessions[0]);
});

test('foreign campaign sessions do not consume the current campaign capacity', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-campaign-capacity-state') };
  const previous = newLedger(root, 'previous', 'coordinator');
  for (let index = 0; index < 15; index += 1) {
    const sessionId = `previous-session-${index}`;
    previous.workers.push({ sessionId, worktree: `/absent/previous-worker-${index}`, branch: sessionId,
      revision: previous.integrationRevision, clean: true, activity: 'idle', evidenceComplete: false,
      worktreeArchived: false, sessionArchived: false });
    previous.completedActions.push({ actionId: `create-${index}`, assignmentId: `previous-assignment-${index}`,
      type: 'CREATE_WORKER', result: { ok: true, sessionId, worktree: `/absent/previous-worker-${index}`,
        branch: sessionId, revision: previous.integrationRevision } });
  }
  withLedgerLock(root, 'previous', environment, saved => Object.assign(saved, previous));
  const current = newLedger(root, 'current', 'coordinator');
  const currentGraph = graph([
    { id: 'current', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'current' },
    { id: 'ready', parentPlanId: 'current', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]);
  currentGraph.campaignId = 'current';
  const action = advanceLedger(currentGraph, current, environment);
  assert.equal(action.type, 'CREATE_WORKER');
  assert.equal(action.payload.sessionId, null);
});

test('one working campaign session leaves independent ready plans dispatchable', () => {
  const root = repository();
  const worktree = path.join(temporaryDirectory('ponytail-one-working'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'working', worktree]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-one-working-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({ id: 'working-assignment', planId: 'working', sessionId: 'working-session', worktree,
    branch: 'working', dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
    state: 'ACTIVE', idempotencyKey: 'working-key', attachToken: 'working-token',
    worktreeArchived: false, sessionArchived: false });
  for (const planId of ['completed-a', 'completed-b']) ledger.assignments.push({
    id: `${planId}-assignment`, planId, sessionId: 'working-session', worktree,
    branch: 'working', dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
    state: 'ARCHIVED', idempotencyKey: `${planId}-key`, attachToken: `${planId}-token`,
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({ sessionId: 'working-session', worktree, branch: 'working', revision: ledger.integrationRevision,
    clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
  recordCreatedWorker(ledger, ledger.workers[0], 'working-assignment');
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign',
    observedAt: new Date().toISOString(), completeSessionIds: ['working-session'],
    sessions: [{ sessionId: 'working-session', state: 'working', worktree, managedWorktree: true }] }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'working', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'working' },
    ...['completed-a', 'completed-b'].map(id => ({ id, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'closed', path: id })),
    ...['ready-a', 'ready-b', 'ready-c'].map(id => ({ id, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: id })),
  ]);
  const before = reconcile(campaignGraph, ledger, root, environment);
  assert.equal(before.sessionAssignments.length, 3);
  assert.deepEqual(before.workingSessions.map(item => item.sessionId), ['working-session']);
  assert.deepEqual(before.workingSessions.map(item => item.planId), ['working']);
  assert.deepEqual(before.readyPlans, ['ready-a', 'ready-b', 'ready-c']);
  const summary = runnablePlanDiagnostics(campaignGraph, ledger, root, environment);
  assert.equal(summary.parallelism.observedWorkingWorkers, 1);
  assert.equal(summary.parallelism.reservedSlots, 1);
  assert.equal(summary.parallelism.availableSlots, 14);
  const actions = scheduleReadyPlans(campaignGraph, ledger, environment).actions;
  assert.deepEqual(actions.map(item => item.type), ['CREATE_WORKER', 'CREATE_WORKER', 'CREATE_WORKER']);
  assert.deepEqual(actions.map(item => item.payload.planId), ['ready-a', 'ready-b', 'ready-c']);
  assert.equal(reconcile(campaignGraph, ledger, root, environment).workingSessions.length, 1);
});

test('a historical imported worker without current-campaign creation cannot be reused or counted', () => {
  const root = repository();
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const foreignWorker = { sessionId: 'foreign-session', worktree: '/foreign-worker', branch: 'foreign',
    revision: ledger.integrationRevision, clean: true, activity: 'idle', evidenceComplete: false,
    worktreeArchived: false, sessionArchived: false };
  ledger.workers.push(foreignWorker);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]);
  const status = reconcile(campaignGraph, ledger);
  assert.deepEqual(status.idleWorkers, []);
  assert.equal(advanceLedger(campaignGraph, ledger).type, 'CREATE_WORKER');
  assert.equal(ledger.pendingActions[0].payload.sessionId, null);
});

test('a historical foreign reuse reservation is not executable', () => {
  const root = repository();
  const worktree = path.join(temporaryDirectory('ponytail-foreign-reuse'), 'worker');
  command(root, ['worktree', 'add', '-qb', 'foreign', worktree]);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'open', path: 'ready' },
  ]);
  const pending = advanceLedger(campaignGraph, ledger);
  pending.type = 'REUSE_WORKER';
  pending.payload.sessionId = 'foreign-session';
  pending.payload.worktree = worktree;
  Object.assign(ledger.assignments[0], { sessionId: 'foreign-session', worktree, branch: 'foreign' });
  assert.deepEqual(scheduleReadyPlans(campaignGraph, ledger).actions, []);
  assert.equal(pending.payload.dispatch.ready, false);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
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

test('ready fast-forward join outranks unrelated assignment-state reconciliation', () => {
  const root = repository();
  const base = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-qb', 'ready-worker']);
  write(root, 'delivery.txt', 'verified delivery\n');
  command(root, ['add', '.']);
  command(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'delivery']);
  const deliveredRevision = command(root, ['rev-parse', 'HEAD']);
  command(root, ['checkout', '-q', 'main']);
  const bookkeepingWorktree = path.join(root, 'bookkeeping-worktree');
  fs.mkdirSync(bookkeepingWorktree);
  const ledger = newLedger(root, 'campaign', 'coordinator');
  ledger.assignments.push({
    id: 'bookkeeping', planId: 'other', sessionId: 'other-session', worktree: bookkeepingWorktree,
    branch: 'other-worker', dispatchRevision: base, workerRevision: base, state: 'MERGED',
    idempotencyKey: 'other-key', attachToken: 'other-token', worktreeArchived: false, sessionArchived: false,
  }, {
    id: 'ready', planId: 'ready', sessionId: 'ready-session', worktree: root,
    branch: 'ready-worker', dispatchRevision: base, workerRevision: deliveredRevision, state: 'READY_TO_MERGE',
    idempotencyKey: 'ready-key', attachToken: 'ready-token', worktreeArchived: false, sessionArchived: false,
  });
  ledger.workers.push({ sessionId: 'other-session', worktree: bookkeepingWorktree, branch: 'other-worker',
    revision: base, clean: false, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false },
  { sessionId: 'ready-session', worktree: root, branch: 'ready-worker', revision: deliveredRevision,
    clean: true, activity: 'completed', evidenceComplete: true, worktreeArchived: false, sessionArchived: false });
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    { id: 'other', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'other' },
    { id: 'ready', parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: 'ready' },
  ]);
  assert.equal(reconcile(campaignGraph, ledger).assignments.find(({ id }) => id === 'bookkeeping').state, 'ACTIVE');
  assert.deepEqual(reconcile(campaignGraph, ledger).readyToMerge.map(({ id }) => id), ['ready']);
  assert.equal(advanceLedger(campaignGraph, ledger), null);
  assert.equal(command(root, ['rev-parse', 'HEAD']), deliveredRevision);
  assert.equal(ledger.assignments[1].state, 'MERGED');
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
    if (iteration === 2) {
      writeHostObservation(root, 'campaign', {
        schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
        completeSessionIds: [assignment.sessionId],
        sessions: [{ sessionId: assignment.sessionId, state: 'working', worktree: worker, managedWorktree: true }],
      }, environment);
      assert.equal(reconcile(campaignGraph, ledger, root, environment).assignments[0].state, 'ACTIVE');
    }
    command(worker, ['add', '.']);
    command(worker, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', `delivery ${iteration}`]);
    const revision = command(worker, ['rev-parse', 'HEAD']);
    if (iteration === 2) {
      const status = reconcile(campaignGraph, ledger, root, environment);
      assert.equal(status.assignments[0].state, 'ACTIVE');
      assert.doesNotThrow(() => readyActions(status, campaignGraph));
      campaignGraph.plans[1].lifecycle = 'closed';
      const closedStatus = reconcile(campaignGraph, ledger, root, environment);
      assert.ok(closedStatus.diagnostics.some(({ code }) => code === 'CAMPAIGN_CLEANUP_UNINTEGRATED'));
      assert.equal(captureError(() => readyActions(closedStatus, campaignGraph)).code, 'CAMPAIGN_STATUS_BLOCKED');
      campaignGraph.plans[1].lifecycle = 'in_progress';
      assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
      assert.equal(assignment.state, 'ACTIVE');
      assert.equal(ledger.assignments.length, 1);
      assert.equal(command(root, ['rev-parse', 'HEAD']), ledger.integrationRevision);
    }
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
  recordCreatedWorker(ledger, ledger.workers[0]);
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

test('working workers retry optimistic deliveries after a competing fast-forward join', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: temporaryDirectory('ponytail-optimistic-join-state') };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const assignments = ['a', 'b'].map((id) => {
    const worktree = path.join(temporaryDirectory(`ponytail-optimistic-${id}`), 'worker');
    command(root, ['worktree', 'add', '-qb', `worker-${id}`, worktree]);
    const evidencePath = `pm/plans/in_progress/${id}/evidence/result.md`;
    write(worktree, evidencePath, `worker ${id}\n`);
    command(worktree, ['add', '.']);
    command(worktree, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', `worker ${id}`]);
    const revision = command(worktree, ['rev-parse', 'HEAD']);
    const assignment = { id, planId: id, sessionId: `session-${id}`, worktree, branch: `worker-${id}`,
      dispatchRevision: ledger.integrationRevision, workerRevision: ledger.integrationRevision,
      state: 'ACTIVE', idempotencyKey: `key-${id}`, attachToken: `token-${id}`,
      worktreeArchived: false, sessionArchived: false };
    ledger.assignments.push(assignment);
    recordWorkerDelivery(root, 'campaign', { ...assignment, planPath: `pm/plans/in_progress/${id}/plan.md` },
      { revision, evidencePaths: [evidencePath] }, environment);
    return assignment;
  });
  fs.writeFileSync(path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json'), JSON.stringify({
    schemaVersion: 1, bindings: assignments.map((assignment) => ({
      repositoryRoot: root, campaignId: 'campaign', assignmentId: assignment.id, coordinatorSessionId: 'coordinator',
      attachTokenHash: `hash-${assignment.id}`, sessionId: assignment.sessionId, worktree: assignment.worktree,
      branch: assignment.branch, revision: assignment.dispatchRevision, boundAt: new Date().toISOString(),
    })),
  }));
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: assignments.map(({ sessionId }) => sessionId),
    sessions: assignments.map(({ sessionId, worktree }) => ({ sessionId, state: 'working', worktree, managedWorktree: true })) }, environment);
  const campaignGraph = graph([
    { id: 'campaign', parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    ...assignments.map(({ planId }) => ({ id: planId, parentPlanId: 'campaign', dependsOn: [], lifecycle: 'in_progress', path: planId })),
  ]);
  write(assignments[0].worktree, 'uncommitted.txt', 'not delivered\n');
  assert.equal(reconcile(campaignGraph, ledger, root, environment).assignments[0].state, 'ACTIVE');
  fs.unlinkSync(path.join(assignments[0].worktree, 'uncommitted.txt'));
  assert.deepEqual(reconcile(campaignGraph, ledger, root, environment).readyToMerge.map(({ id }) => id), ['a', 'b']);
  advanceLedger(campaignGraph, ledger, environment);
  advanceLedger(campaignGraph, ledger, environment);
  advanceLedger(campaignGraph, ledger, environment);
  const firstRevision = command(root, ['rev-parse', 'HEAD']);
  assert.equal(firstRevision, command(assignments[0].worktree, ['rev-parse', 'HEAD']));
  assert.equal(reconcile(campaignGraph, ledger, root, environment).rebaseRequired[0].id, 'b');
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.pendingActions.some(({ type }) => type === 'REQUEST_REBASE'), false);
  command(assignments[1].worktree, ['rebase', firstRevision]);
  const rebasedRevision = command(assignments[1].worktree, ['rev-parse', 'HEAD']);
  recordWorkerDelivery(root, 'campaign', { ...assignments[1], planPath: 'pm/plans/in_progress/b/plan.md' },
    { revision: rebasedRevision, evidencePaths: ['pm/plans/in_progress/b/evidence/result.md'] }, environment);
  assert.equal(reconcile(campaignGraph, ledger, root, environment).readyToMerge[0].id, 'b');
  advanceLedger(campaignGraph, ledger, environment);
  advanceLedger(campaignGraph, ledger, environment);
  assert.equal(command(root, ['rev-parse', 'HEAD']), rebasedRevision);
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
  const rebase = readActionV5({ schemaVersion: 5, id: 'delivered-rebase', type: 'REQUEST_REBASE', assignmentId: assignment.id,
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
  const recovery = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(recovery.type, 'RECOVER_WORKTREE');
  assert.deepEqual(recovery.payload, {
    sessionId: assignment.sessionId, previousWorktree: worker, branch: assignment.branch, revision: workerRevision,
  });
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(({ id }) => id), [recovery.id]);
  const dispatch = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(dispatch.type, 'CREATE_WORKER');
  assert.equal(dispatch.payload.planId, 'independent');
  assert.deepEqual(readyActions(reconcile(campaignGraph, ledger, root, environment), campaignGraph).actions.map(({ id }) => id), [recovery.id, dispatch.id]);
  ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== recovery.id);
  campaignGraph.plans.find(({ id }) => id === 'work').lifecycle = 'closed';
  assert.equal(advanceLedger(campaignGraph, ledger, environment), null);
  assert.equal(ledger.assignments[0].state, 'CLEANUP_PENDING');
  assert.equal(ledger.pendingActions.some(({ type }) => type === 'RECOVER_WORKTREE'), false);
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
  const dispatch = advanceLedger(campaignGraph, ledger, environment);
  assert.equal(dispatch.type, 'CREATE_WORKER');
  assert.equal(ledger.pendingActions.some(({ type }) => type === 'REQUEST_REBASE'), false);
  command(recoveredWorker, ['rebase', 'main']);
  const rebasedRevision = command(recoveredWorker, ['rev-parse', 'HEAD']);
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
  assert.equal(ready.schemaVersion, 7);
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
