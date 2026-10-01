#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

// Traceability: verifies REQ-WORKER-WORKTREE-RETENTION
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const test = require('node:test');
const { advanceLedger, bindWorker, ledgerPath, newLedger, readLedger, readWorkerBindings, reconcile, readyActions, recordActionResult, recoverWorker, replaceRecoveredWorkerBinding, withLedgerLock, withWorktreeLock, workerRecoveryBinding, workerRecoveryContext, writeHostObservation } = require('../src/campaign-orchestration');
const { handle } = require('../hooks/plan-input');
const ponytail = path.join(__dirname, '..', 'cli', 'ponytail');

function directory() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-worker-pool-')));
}

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function repository() {
  const root = directory();
  git(root, ['init', '-qb', 'main']);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'checkpoint\n');
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'initial']);
  return root;
}

function graph(campaignId = 'campaign') {
  return { campaignId, lifecycle: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed' }, plans: [
    { id: campaignId, parentPlanId: null, dependsOn: [], lifecycle: 'in_progress', path: 'root' },
    ...Array.from({ length: 16 }, (_, index) => ({ id: `work-${String(index).padStart(2, '0')}`, parentPlanId: campaignId, dependsOn: [], lifecycle: 'open', path: `work-${index}` })),
  ] };
}

test('fifteen creation reservations bound one top-level project, not its shared main worktree', () => {
  const root = repository();
  const other = path.join(directory(), 'other-project');
  git(root, ['worktree', 'add', '-qb', 'other-project', other]);
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  const advance = projectRoot => withWorktreeLock(projectRoot, environment, () => withLedgerLock(projectRoot, 'campaign', environment, ledger => {
    ledger.coordinatorSessionId = 'coordinator';
    return advanceLedger(graph(), ledger, environment);
  }));
  for (let index = 0; index < 15; index += 1) assert.equal(advance(root).type, 'CREATE_WORKER');
  advance(root);
  assert.equal(readLedger(root, 'campaign', environment).pendingActions.length, 15);
  const successor = newLedger(root, 'successor', 'coordinator');
  assert.equal(advanceLedger(graph('successor'), successor, environment), null);
  assert.deepEqual(successor.pendingActions, []);
  const status = reconcile(graph('successor'), successor, root, environment);
  assert.equal(status.diagnostics.find(item => item.code === 'CAMPAIGN_WORKER_CAPACITY_REACHED').limit, 15);
  assert.deepEqual(readyActions(status, graph('successor')).actions, []);
  assert.equal(advance(other).type, 'CREATE_WORKER');
  assert.equal(readLedger(other, 'campaign', environment).pendingActions.length, 1);
});

test('independent coordinator processes cannot both reserve the fifteenth slot', async () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  for (let index = 0; index < 14; index += 1) withLedgerLock(root, 'campaign', environment, ledger => {
    ledger.coordinatorSessionId = 'coordinator';
    advanceLedger(graph(), ledger, environment);
  });
  const program = `const core = require(${JSON.stringify(path.join(__dirname, '..', 'src/campaign-orchestration'))});
    core.withWorktreeLock(process.argv[1], process.env, () => core.withLedgerLock(process.argv[1], 'campaign', process.env,
      ledger => core.advanceLedger(${JSON.stringify(graph())}, ledger, process.env)));`;
  const advance = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', program, root], { env: environment });
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  await Promise.all([advance(), advance()]);
  assert.equal(readLedger(root, 'campaign', environment).pendingActions.length, 15);
});

test('an old but live project critical section cannot be stolen to overbook the pool', () => {
  const root = repository();
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  const lock = path.join(path.dirname(ledgerPath(root, 'campaign', environment)), 'advance.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, String(process.pid));
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(lock, old, old);
  assert.throws(() => withWorktreeLock(root, environment, () => assert.fail('live lock was stolen')), /timed out/);
  assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid));
});

function attachedWorker() {
  const main = repository();
  const root = path.join(directory(), 'top-level-project');
  git(main, ['worktree', 'add', '-qb', 'top-level-project', root]);
  const home = directory();
  const environment = { ...process.env, HOME: home, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  const worktree = path.join(directory(), 'worker');
  git(root, ['worktree', 'add', '-qb', 'worker', worktree]);
  let action;
  withLedgerLock(root, 'campaign', environment, ledger => {
    ledger.coordinatorSessionId = 'coordinator';
    action = advanceLedger(graph(), ledger, environment);
  });
  const binding = bindWorker(environment, worktree, action.payload.attachToken, 'worker-session');
  assert.equal(binding.mainWorktree, main);
  assert.equal(binding.mainGitDirectory, path.join(main, '.git'));
  return { main, root, worktree, environment, binding, token: action.payload.attachToken };
}

test('legacy replacement recovery returns the branch to the proven native checkout without losing merged state', async context => {
  for (const condition of ['attached', 'interrupted', 'switched', 'rebased', 'dirty', 'unproven', 'ignored']) await context.test(condition, () => {
    const { main, root, worktree, environment, binding, token } = attachedWorker();
    withLedgerLock(root, 'campaign', environment, ledger => {
      recordActionResult(ledger, ledger.pendingActions[0].id, {
        ok: true, sessionId: binding.sessionId, worktree, branch: binding.branch, revision: binding.revision,
      });
    });
    const replacement = path.join(directory(), 'replacement');
    fs.appendFileSync(path.join(worktree, 'fixture.txt'), 'recovery checkpoint\n');
    git(worktree, ['add', '.']);
    git(worktree, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'recovery checkpoint']);
    const checkpoint = git(worktree, ['rev-parse', 'HEAD']);
    git(root, ['worktree', 'move', worktree, replacement]);
    git(root, ['worktree', 'add', '--detach', worktree, checkpoint]);
    fs.appendFileSync(path.join(replacement, 'fixture.txt'), 'merged delivery\n');
    if (condition === 'ignored') {
      fs.appendFileSync(path.join(main, '.git/info/exclude'), '\nblocked\n');
      fs.writeFileSync(path.join(replacement, 'blocked'), 'committed\n');
      git(replacement, ['add', '-f', 'blocked']);
    }
    git(replacement, ['add', '.']);
    git(replacement, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'delivery']);
    let revision = git(replacement, ['rev-parse', 'HEAD']);
    if (condition === 'rebased') {
      const tree = git(replacement, ['rev-parse', 'HEAD^{tree}']);
      const parent = git(replacement, ['rev-parse', `${checkpoint}^`]);
      revision = git(replacement, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit-tree', tree, '-p', parent, '-m', 'rebased delivery']);
      git(replacement, ['update-ref', `refs/heads/${binding.branch}`, revision]);
      assert.equal(spawnSync('git', ['-C', replacement, 'merge-base', '--is-ancestor', checkpoint, revision]).status, 1);
    }
    replaceRecoveredWorkerBinding(environment, binding.assignmentId, { ...binding, worktree: replacement, revision: checkpoint });
    withLedgerLock(root, 'campaign', environment, ledger => {
      ledger.completedActions.push({ actionId: 'old-recovery', assignmentId: binding.assignmentId, type: 'RECOVER_WORKTREE',
        result: { ok: true, sessionId: binding.sessionId, worktree: replacement, branch: binding.branch, revision: checkpoint } });
      Object.assign(ledger.assignments[0], { worktree: replacement, workerRevision: revision, state: 'MERGED' });
      ledger.workers[0].worktree = replacement;
      if (condition === 'unproven') ledger.completedActions.shift();
    });
    writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
      completeSessionIds: [binding.sessionId], sessions: [{ sessionId: binding.sessionId, state: 'working', worktree, managedWorktree: true }] }, environment);
    const recoveryContext = workerRecoveryContext(environment, binding.sessionId);
    if (condition === 'unproven') assert.equal(recoveryContext.includes(`reconcile the branch and binding to ${worktree}`), false);
    else assert.ok(recoveryContext.includes(`reconcile the branch and binding to ${worktree}`));
    const recoveryHook = handle({ hook_event_name: 'PreToolUse', cwd: os.tmpdir(), session_id: binding.sessionId,
      tool_input: { cmd: `ponytail worktree recover ${token}` } }, environment);
    assert.notEqual(recoveryHook?.hookSpecificOutput?.permissionDecision, 'deny');
    const recoveryHookContext = recoveryHook?.hookSpecificOutput?.additionalContext;
    if (condition === 'unproven') assert.equal(recoveryHookContext.includes(`reconcile the branch and binding to ${worktree}`), false);
    else assert.ok(recoveryHookContext.includes(`reconcile the branch and binding to ${worktree}`));
    const neutralDiagnosticHook = handle({ hook_event_name: 'PreToolUse', cwd: os.tmpdir(), session_id: binding.sessionId,
      tool_input: { cmd: 'command -v ponytail' } }, environment);
    if (condition === 'unproven') assert.equal(neutralDiagnosticHook, null);
    else assert.ok(neutralDiagnosticHook?.hookSpecificOutput?.additionalContext.includes(`reconcile the branch and binding to ${worktree}`));
    const wrongWorkerHook = handle({ hook_event_name: 'PreToolUse', cwd: os.tmpdir(), session_id: 'different-session',
      tool_input: { cmd: `ponytail worktree recover ${token}` } }, environment);
    assert.equal(wrongWorkerHook?.hookSpecificOutput?.permissionDecision, 'deny');
    const blockedCampaignMutation = handle({ hook_event_name: 'PreToolUse', cwd: root, session_id: binding.sessionId,
      tool_input: { cmd: 'ponytail campaign advance campaign' } }, environment);
    assert.equal(blockedCampaignMutation?.hookSpecificOutput?.permissionDecision, 'deny');
    if (['interrupted', 'switched'].includes(condition)) git(replacement, ['switch', '--detach']);
    if (condition === 'switched') git(worktree, ['switch', binding.branch]);
    if (condition === 'dirty') fs.appendFileSync(path.join(worktree, 'fixture.txt'), 'private edits\n');
    if (condition === 'ignored') fs.writeFileSync(path.join(worktree, 'blocked'), 'private ignored data\n');
    const before = readLedger(root, 'campaign', environment);
    if (['dirty', 'unproven', 'ignored'].includes(condition)) {
      assert.throws(() => recoverWorker(environment, token), /legacy|original|clean|overwritten/);
      assert.equal(readWorkerBindings(environment).bindings[0].worktree, replacement);
      assert.equal(git(replacement, ['branch', '--show-current']), binding.branch);
      assert.deepEqual(readLedger(root, 'campaign', environment), before);
      if (condition === 'ignored') assert.equal(fs.readFileSync(path.join(worktree, 'blocked'), 'utf8'), 'private ignored data\n');
      return;
    }
    const result = recoverWorker(environment, token);
    assert.equal(result.worktree, worktree);
    assert.equal(result.revision, revision);
    assert.equal(git(worktree, ['branch', '--show-current']), binding.branch);
    assert.equal(git(replacement, ['branch', '--show-current']), '');
    assert.equal(git(replacement, ['rev-parse', 'HEAD']), revision);
    const after = readLedger(root, 'campaign', environment);
    assert.equal(after.assignments[0].state, 'MERGED');
    assert.equal(after.assignments[0].workerRevision, revision);
    assert.deepEqual(after.completedActions, before.completedActions);
    assert.equal(readWorkerBindings(environment).bindings[0].worktree, worktree);
    assert.equal(recoverWorker(environment, token).worktree, worktree);
  });
});

test('original worker recovers its exact checkout from a neutral cwd without coordinator action', () => {
  const fixture = attachedWorker();
  const { root, worktree, environment, token } = fixture;
  const mainRevision = git(root, ['rev-parse', 'HEAD']);
  fs.appendFileSync(path.join(worktree, 'fixture.txt'), 'delivery\n');
  git(worktree, ['add', '.']);
  git(worktree, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'worker']);
  const workerRevision = git(worktree, ['rev-parse', 'HEAD']);
  fs.rmSync(worktree, { recursive: true });
  const prompt = handle({ hook_event_name: 'UserPromptSubmit', cwd: worktree, session_id: 'worker-session', prompt: 'Resume the original assignment.' }, environment);
  assert.ok(prompt.hookSpecificOutput.additionalContext.includes(fixture.main));
  assert.ok(prompt.hookSpecificOutput.additionalContext.includes(`ponytail worktree recover ${token}`));
  assert.equal(handle({ hook_event_name: 'PreToolUse', cwd: worktree, session_id: 'worker-session', tool_input: { cmd: 'pwd' } }, environment), null);
  assert.equal(handle({ hook_event_name: 'UserPromptSubmit', cwd: worktree, session_id: 'worker-session', prompt: '/ponytail-enqueue change scope' }, environment).decision, 'block');
  const hook = handle({ hook_event_name: 'PreToolUse', cwd: worktree, session_id: 'worker-session', tool_input: { cmd: `ponytail worktree recover ${token}` } }, environment);
  assert.notEqual(hook?.hookSpecificOutput?.permissionDecision, 'deny');
  const recover = () => spawnSync(ponytail, ['worktree', 'recover', token], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  const result = recover();
  assert.equal(result.status, 0, result.stderr);
  const recovery = JSON.parse(result.stdout);
  assert.equal(recovery.sessionId, fixture.binding.sessionId);
  assert.equal(recovery.worktree, worktree);
  assert.equal(recovery.revision, workerRevision);
  assert.equal(git(root, ['rev-parse', 'HEAD']), mainRevision);
  assert.equal(git(worktree, ['branch', '--show-current']), 'worker');
  fs.appendFileSync(path.join(worktree, 'fixture.txt'), 'unsaved\n');
  assert.equal(recover().status, 0);
  assert.match(fs.readFileSync(path.join(worktree, 'fixture.txt'), 'utf8'), /unsaved/);
  assert.equal(readWorkerBindings(environment).bindings[0].sessionId, 'worker-session');
});

test('recovery hook authenticates the exact worker before consulting its absent cwd', () => {
  const { worktree, environment, token } = attachedWorker();
  fs.rmSync(worktree, { recursive: true });
  for (const sessionId of ['other-session', undefined]) {
    const output = handle({ hook_event_name: 'PreToolUse', cwd: worktree, session_id: sessionId, tool_input: { cmd: `ponytail worktree recover ${token}` } }, environment);
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(fs.existsSync(worktree), false);
  }
  const result = spawnSync(ponytail, ['worktree', 'recover', 'wrong-token'], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /capability/);
  assert.equal(fs.existsSync(worktree), false);
});

test('recovery refuses a symlink, occupied branch, locked registration, or unavailable source', async context => {
  for (const condition of ['symlink', 'occupied', 'locked', 'source', 'branch']) {
    await context.test(condition, () => {
      const { main, root, worktree, environment, token } = attachedWorker();
      let other;
      if (condition === 'occupied') {
        git(root, ['worktree', 'remove', worktree]);
        other = path.join(directory(), 'other');
        git(root, ['worktree', 'add', other, 'worker']);
      } else {
        if (condition === 'locked') git(root, ['worktree', 'lock', worktree]);
        fs.rmSync(worktree, { recursive: true });
      }
      if (condition === 'symlink') {
        other = directory();
        fs.writeFileSync(path.join(other, 'keep'), 'private');
        fs.symlinkSync(other, worktree);
      }
      if (condition === 'source') fs.renameSync(main, `${main}-moved`);
      if (condition === 'branch') git(root, ['update-ref', '-d', 'refs/heads/worker']);
      const result = spawnSync(ponytail, ['worktree', 'recover', token], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
      assert.equal(result.status, 1, result.stderr);
      if (condition === 'symlink') assert.equal(fs.readFileSync(path.join(other, 'keep'), 'utf8'), 'private');
      else assert.equal(fs.existsSync(worktree), false);
      if (condition === 'occupied') assert.equal(git(other, ['branch', '--show-current']), 'worker');
    });
  }
});

test('legacy bindings explicitly enroll recovery provenance without changing the V1 reader', () => {
  const { main, worktree, environment, token } = attachedWorker();
  const file = path.join(environment.PONYTAIL_CAMPAIGN_STATE_DIR, 'campaign-worker-bindings.json');
  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, bindings: current.bindings.map(({ mainWorktree, mainGitDirectory, ...binding }) => binding) }));
  assert.equal(readWorkerBindings(environment).bindings[0].mainWorktree, null);
  fs.rmSync(worktree, { recursive: true });
  const result = spawnSync(ponytail, ['worktree', 'recover', token], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readWorkerBindings(environment).bindings[0].mainWorktree, main);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion, 2);
});

test('retained pair reattachment rotates its capability without replacing session or checkout', () => {
  const { root, worktree, environment, binding, token } = attachedWorker();
  const campaignGraph = graph();
  campaignGraph.plans.find(plan => plan.id === 'work-00').lifecycle = 'closed';
  withLedgerLock(root, 'campaign', environment, ledger => {
    Object.assign(ledger.assignments[0], { sessionId: binding.sessionId, worktree, branch: binding.branch, workerRevision: binding.revision, state: 'ARCHIVED' });
    ledger.pendingActions = [];
    ledger.workers.push({ sessionId: binding.sessionId, worktree, branch: binding.branch, revision: binding.revision, activity: 'idle', clean: true, evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
  });
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(), completeSessionIds: [binding.sessionId], sessions: [{ sessionId: binding.sessionId, state: 'completed', worktree, managedWorktree: true }] }, environment);
  const action = withLedgerLock(root, 'campaign', environment, ledger => advanceLedger(campaignGraph, ledger, environment));
  assert.equal(action.type, 'REUSE_WORKER');
  const replacement = bindWorker(environment, worktree, action.payload.attachToken, binding.sessionId);
  assert.equal(replacement.sessionId, binding.sessionId);
  assert.equal(replacement.worktree, worktree);
  assert.notEqual(replacement.assignmentId, binding.assignmentId);
  assert.equal(readWorkerBindings(environment).bindings.length, 1);
  assert.throws(() => workerRecoveryBinding(environment, token), /capability/);
  assert.equal(workerRecoveryBinding(environment, action.payload.attachToken).sessionId, binding.sessionId);
});

test('recovery rebuilds a removed slot directory with or without a surviving Git registration', async context => {
  for (const registered of [true, false]) await context.test(`registered=${registered}`, () => {
    const { root, worktree, environment, token } = attachedWorker();
    if (!registered) git(root, ['worktree', 'remove', worktree]);
    fs.rmSync(path.dirname(worktree), { recursive: true });
    const result = spawnSync(ponytail, ['worktree', 'recover', token], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(worktree, ['branch', '--show-current']), 'worker');
  });
});

test('worker-owned recovery acknowledges the original pending action without a new coordinator observation', () => {
  const { root, worktree, environment, binding, token } = attachedWorker();
  withLedgerLock(root, 'campaign', environment, ledger => {
    const assignment = ledger.assignments.find(item => item.id === binding.assignmentId);
    Object.assign(assignment, { sessionId: binding.sessionId, worktree, branch: binding.branch, workerRevision: binding.revision, state: 'ACTIVE' });
    ledger.pendingActions = [{ schemaVersion: 4, id: 'original-recovery', type: 'RECOVER_WORKTREE', assignmentId: binding.assignmentId,
      idempotencyKey: 'original-recovery-key', payload: { sessionId: binding.sessionId, previousWorktree: worktree, branch: binding.branch, revision: binding.revision } }];
  });
  fs.rmSync(worktree, { recursive: true });
  const result = spawnSync(ponytail, ['worktree', 'recover', token], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const ledger = readLedger(root, 'campaign', environment);
  assert.deepEqual(ledger.pendingActions, []);
  assert.equal(ledger.completedActions[0].actionId, 'original-recovery');
  assert.equal(ledger.completedActions[0].result.ok, true);
  assert.equal(ledger.assignments[0].id, binding.assignmentId);
  assert.equal(ledger.assignments[0].sessionId, binding.sessionId);
});
