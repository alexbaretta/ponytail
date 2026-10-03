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
const { advanceLedger, bindWorker, CampaignWorkerBootstrapReaders, ledgerPath, newLedger, readLedger, readWorkerBindings, reconcile, readyActions, recordActionResult, recoverWorker, replaceRecoveredWorkerBinding, upgradeWorker, validateActionResultBinding, withLedgerLock, withWorktreeLock, workerRecoveryBinding, workerRecoveryContext, writeHostObservation } = require('../src/campaign-orchestration');
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
    ...Array.from({ length: 16 }, (_, index) => ({ id: `work-${String(index).padStart(2, '0')}`, parentPlanId: campaignId, dependsOn: [], lifecycle: 'open', path: `work-${index}`, runnableTasklets: { sprintId: 'S01', taskletIds: ['S01-T01'] } })),
  ] };
}

test('fifteen creation reservations bound one campaign, not another campaign or top-level project', () => {
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
  assert.equal(advanceLedger(graph('successor'), successor, environment).type, 'CREATE_WORKER');
  assert.equal(successor.pendingActions.length, 1);
  const status = reconcile(graph('successor'), successor, root, environment);
  assert.equal(status.diagnostics.find(item => item.code === 'CAMPAIGN_WORKER_CAPACITY_REACHED'), undefined);
  assert.equal(readyActions(status, graph('successor')).actions.length, 1);
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

function upgradableWorker(userOwned = false) {
  const main = repository();
  const root = userOwned ? path.join(directory(), 'owning-project') : main;
  if (userOwned) git(main, ['worktree', 'add', '-b', 'owning-project', root]);
  const worktree = path.join(directory(), 'original-worker');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const pending = advanceLedger(graph(), ledger);
  recordActionResult(ledger, pending.id, { ok: true, disposition: 'STARTED', hostIdentity: 'original-client' }, graph());
  git(root, ['worktree', 'add', '--detach', worktree, ledger.integrationRevision]);
  recordActionResult(ledger, pending.id, { ok: true, disposition: 'PROVISIONED', sessionId: 'original-session', worktree }, graph());
  withLedgerLock(root, 'campaign', environment, saved => Object.assign(saved, ledger));
  fs.writeFileSync(path.join(root, 'adoption-repair.txt'), 'integrated canonical adoption repair\n');
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'adoption repair']);
  const revision = git(root, ['rev-parse', 'HEAD']);
  return { main, root, worktree, environment, ledger, pending, revision };
}

test('provisioned original worker upgrades integrated adoption tooling and retains exact-path recovery', () => {
  const { root, worktree, environment, ledger, pending, revision } = upgradableWorker();
  const upgraded = spawnSync(ponytail, ['worktree', 'upgrade', pending.payload.attachToken, '--revision', revision], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  assert.equal(upgraded.status, 0, upgraded.stderr);
  assert.equal(JSON.parse(upgraded.stdout).revision, revision);
  assert.equal(git(worktree, ['rev-parse', 'HEAD']), revision);
  git(root, ['worktree', 'remove', worktree]);
  assert.equal(recoverWorker(environment, pending.payload.attachToken).revision, revision);
  const saved = readLedger(root, 'campaign', environment);
  assert.equal(saved.assignments[0].dispatchRevision, ledger.integrationRevision);
  assert.equal(saved.pendingActions[0].id, pending.id);
  assert.equal(saved.pendingActions[0].payload.dispatch.hostIdentity, 'original-client');
  recordActionResult(saved, pending.id, { ok: true, disposition: 'PROVISIONED', sessionId: 'original-session', worktree }, graph());
  assert.equal(saved.pendingActions[0].payload.bootstrap.revision, revision);
  git(worktree, ['switch', '-c', 'original-worker']);
  const binding = bindWorker(environment, worktree, pending.payload.attachToken, 'original-session');
  assert.equal(binding.revision, revision);
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, revision), /before original attachment/);
  withLedgerLock(root, 'campaign', environment, completed => {
    const result = { ok: true, sessionId: binding.sessionId, worktree, branch: binding.branch, revision };
    validateActionResultBinding(completed, pending.id, result, environment);
    recordActionResult(completed, pending.id, result, graph());
  });
  assert.equal(readLedger(root, 'campaign', environment).assignments[0].state, 'ACTIVE');
  assert.deepEqual(readLedger(root, 'campaign', environment).pendingActions, []);
});

test('bootstrap upgrade resumes every durable prefix without changing dispatch identity', () => {
  for (const prefix of ['before-switch', 'after-switch', 'missing-before-switch', 'missing-after-switch', 'unregistered-before-switch', 'unregistered-after-switch']) {
    const { root, worktree, environment, ledger, pending, revision } = upgradableWorker();
    withLedgerLock(root, 'campaign', environment, saved => { saved.pendingActions[0].payload.bootstrap.pendingRevision = revision; });
    if (prefix.endsWith('after-switch')) git(worktree, ['switch', '--detach', revision]);
    fs.writeFileSync(path.join(root, 'later.txt'), 'later integrated commit\n');
    git(root, ['add', '.']);
    git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'later integration']);
    if (prefix.startsWith('missing')) {
      // Model host deletion without removing the retained Git registration.
      fs.rmSync(worktree, { recursive: true });
    }
    if (prefix.startsWith('unregistered')) git(root, ['worktree', 'remove', worktree]);
    const preserved = readLedger(root, 'campaign', environment);
    assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, ledger.integrationRevision), /existing bootstrap upgrade target/);
    if (fs.existsSync(worktree)) {
      git(worktree, ['switch', '-c', `pending-${prefix}`]);
      assert.throws(() => bindWorker(environment, worktree, pending.payload.attachToken, 'original-session'), /completed bootstrap upgrade/);
      git(worktree, ['switch', '--detach']);
    }
    assert.deepEqual(readLedger(root, 'campaign', environment), preserved);
    const result = recoverWorker(environment, pending.payload.attachToken);
    assert.equal(result.revision, revision, prefix);
    const completed = readLedger(root, 'campaign', environment);
    assert.deepEqual(completed.assignments, preserved.assignments);
    assert.equal(completed.pendingActions[0].id, pending.id);
    assert.equal(completed.pendingActions[0].payload.bootstrap.dispatchRevision, ledger.integrationRevision);
    assert.equal(completed.pendingActions[0].payload.bootstrap.pendingRevision, null);
    assert.equal(completed.pendingActions[0].payload.bootstrap.revision, revision);
    const replay = upgradeWorker(environment, pending.payload.attachToken, revision);
    assert.equal(replay.restored, false);
    assert.deepEqual(readLedger(root, 'campaign', environment), completed);
  }
});

test('bootstrap upgrade uses its owning top-level integration rather than another project sharing Git objects', () => {
  const { main, root, worktree, environment, pending, revision } = upgradableWorker(true);
  fs.mkdirSync(path.join(main, '.agents', 'config', 'project'), { recursive: true });
  fs.writeFileSync(path.join(main, '.agents', 'config', 'project', 'management.json'), 'not a project configuration to import\n');
  git(main, ['add', '.']);
  git(main, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'different top-level project']);
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, git(main, ['rev-parse', 'HEAD'])), /exact owning project integration HEAD/);
  assert.equal(upgradeWorker(environment, pending.payload.attachToken, revision).revision, revision);
  assert.equal(git(worktree, ['rev-parse', 'HEAD']), git(root, ['rev-parse', 'HEAD']));
  assert.equal(fs.existsSync(path.join(worktree, '.agents', 'config', 'project', 'management.json')), false);
});

test('bootstrap upgrade rejects dirty content and unintegrated targets and authenticates the original host session', () => {
  const { root, worktree, environment, pending, revision } = upgradableWorker();
  const original = readLedger(root, 'campaign', environment);
  const command = `ponytail worktree upgrade ${pending.payload.attachToken} --revision ${revision}`;
  const invocation = { hook_event_name: 'PreToolUse', cwd: os.tmpdir(), session_id: 'original-session', tool_input: { command } };
  assert.ok(handle(invocation, environment).hookSpecificOutput.additionalContext.includes('original dispatch'));
  assert.equal(handle({ ...invocation, session_id: 'wrong-session' }, environment).hookSpecificOutput.permissionDecision, 'deny');
  for (const file of ['fixture.txt', 'untracked.txt']) {
    fs.writeFileSync(path.join(worktree, file), 'preserve me\n');
    assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, revision), /clean checkout/);
    assert.equal(fs.readFileSync(path.join(worktree, file), 'utf8'), 'preserve me\n');
    assert.deepEqual(readLedger(root, 'campaign', environment), original);
    if (file === 'fixture.txt') fs.writeFileSync(path.join(worktree, file), 'checkpoint\n');
    else fs.unlinkSync(path.join(worktree, file));
  }
  git(root, ['worktree', 'lock', worktree]);
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, revision), /locked/);
  git(root, ['worktree', 'unlock', worktree]);
  git(worktree, ['switch', '-c', 'not-detached']);
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, revision), /registration/);
  git(worktree, ['switch', '--detach']);
  git(root, ['switch', '-c', 'other-integration']);
  fs.writeFileSync(path.join(root, 'other.txt'), 'not integrated\n');
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'unintegrated']);
  const other = git(root, ['rev-parse', 'HEAD']);
  git(root, ['switch', 'main']);
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, other), /exact owning project integration HEAD/);
  assert.deepEqual(readLedger(root, 'campaign', environment), original);
});

test('bootstrap upgrade preserves an ignored collision and resumes the recorded intent after its removal', () => {
  const { root, worktree, environment, pending } = upgradableWorker();
  fs.writeFileSync(path.join(root, 'ignored.txt'), 'integrated file\n');
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'integrated path']);
  const revision = git(root, ['rev-parse', 'HEAD']);
  const exclude = git(root, ['rev-parse', '--git-path', 'info/exclude']);
  fs.appendFileSync(path.isAbsolute(exclude) ? exclude : path.join(root, exclude), '\nignored.txt\n');
  fs.writeFileSync(path.join(worktree, 'ignored.txt'), 'preserved private data\n');
  assert.throws(() => upgradeWorker(environment, pending.payload.attachToken, revision), /overwritten/);
  assert.equal(fs.readFileSync(path.join(worktree, 'ignored.txt'), 'utf8'), 'preserved private data\n');
  assert.equal(readLedger(root, 'campaign', environment).pendingActions[0].payload.bootstrap.pendingRevision, revision);
  fs.renameSync(path.join(worktree, 'ignored.txt'), path.join(directory(), 'preserved.txt'));
  assert.equal(recoverWorker(environment, pending.payload.attachToken).revision, revision);
});

test('bootstrap V1 is immutable and normalizes without inventing upgrade intent', () => {
  const { root, worktree, environment, ledger, pending, revision } = upgradableWorker();
  const current = readLedger(root, 'campaign', environment).pendingActions[0].payload.bootstrap;
  assert.equal(current.schemaVersion, 2);
  const physical = { schemaVersion: 1, sessionId: current.sessionId, worktree: current.worktree, revision: current.dispatchRevision,
    mainWorktree: current.mainWorktree, mainGitDirectory: current.mainGitDirectory };
  assert.deepEqual(CampaignWorkerBootstrapReaders.V1(physical), physical);
  assert.throws(() => CampaignWorkerBootstrapReaders.V1({ ...physical, pendingRevision: null }), /exactly/);
  assert.throws(() => CampaignWorkerBootstrapReaders.V2({ ...current, pendingRevision: 3 }), /pendingRevision/);
  withLedgerLock(root, 'campaign', environment, saved => { saved.pendingActions[0].payload.bootstrap = physical; });
  const binding = workerRecoveryBinding(environment, pending.payload.attachToken, 'original-session');
  assert.equal(binding.dispatchRevision, ledger.integrationRevision);
  assert.equal(binding.pendingRevision, null);
  assert.equal(upgradeWorker(environment, pending.payload.attachToken, revision).revision, revision);
  assert.equal(git(worktree, ['rev-parse', 'HEAD']), revision);
});

test('provisioned original worker recovers before adoption and attachment without replacing its started creation', () => {
  const root = repository();
  const worktree = path.join(directory(), 'original-worker');
  const environment = { ...process.env, PONYTAIL_CAMPAIGN_STATE_DIR: directory() };
  const ledger = newLedger(root, 'campaign', 'coordinator');
  const pending = advanceLedger(graph(), ledger);
  recordActionResult(ledger, pending.id, { ok: true, disposition: 'STARTED', hostIdentity: 'original-client' }, graph());
  git(root, ['worktree', 'add', '--detach', worktree, ledger.integrationRevision]);
  git(root, ['worktree', 'remove', worktree]);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['original-session'], sessions: [{ sessionId: 'original-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  const result = { ok: true, disposition: 'PROVISIONED', sessionId: 'original-session', worktree };
  for (const invalid of [{ ...result, sessionId: 'unobserved' }, { ...result, worktree: root }, { ...result, worktree: `${worktree}-other` }]) {
    assert.throws(() => validateActionResultBinding(ledger, pending.id, invalid, environment), /host evidence/);
  }
  const unchanged = JSON.stringify(ledger);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    completeSessionIds: ['original-session'], sessions: [{ sessionId: 'original-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  assert.throws(() => validateActionResultBinding(ledger, pending.id, result, environment), /host evidence/);
  assert.equal(JSON.stringify(ledger), unchanged);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date().toISOString(),
    completeSessionIds: ['original-session'], sessions: [{ sessionId: 'original-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  validateActionResultBinding(ledger, pending.id, result, environment);
  recordActionResult(ledger, pending.id, result, graph());
  const provisioned = JSON.stringify(ledger);
  recordActionResult(ledger, pending.id, result, graph());
  assert.equal(JSON.stringify(ledger), provisioned);
  withLedgerLock(root, 'campaign', environment, saved => Object.assign(saved, ledger));
  const before = readLedger(root, 'campaign', environment);
  assert.equal(before.assignments[0].sessionId, null);
  assert.equal(before.pendingActions[0].payload.dispatch.hostIdentity, 'original-client');
  assert.throws(() => workerRecoveryBinding(environment, pending.payload.attachToken, 'other-session'), /authenticated worker/);
  writeHostObservation(root, 'campaign', { schemaVersion: 1, campaignId: 'campaign', observedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    completeSessionIds: ['original-session'], sessions: [{ sessionId: 'original-session', state: 'waiting', worktree, managedWorktree: true }] }, environment);
  const context = workerRecoveryContext(environment, 'original-session');
  assert.ok(context.includes(root));
  assert.ok(context.includes('before setup'));
  const prompt = handle({ hook_event_name: 'UserPromptSubmit', cwd: worktree, session_id: 'original-session', prompt: 'Resume.' }, environment);
  assert.ok(prompt.hookSpecificOutput.additionalContext.includes(`ponytail worktree recover ${pending.payload.attachToken}`));
  const recovery = spawnSync(ponytail, ['worktree', 'recover', pending.payload.attachToken], { cwd: os.tmpdir(), env: environment, encoding: 'utf8' });
  assert.equal(recovery.status, 0, recovery.stderr);
  const recovered = JSON.parse(recovery.stdout);
  assert.equal(recovered.schemaVersion, 2);
  assert.equal(recovered.worktree, worktree);
  assert.equal(recovered.branch, null);
  assert.equal(git(worktree, ['branch', '--show-current']), '');
  assert.equal(git(worktree, ['rev-parse', 'HEAD']), ledger.integrationRevision);
  assert.deepEqual(readLedger(root, 'campaign', environment), before);
  assert.equal(readWorkerBindings(environment).bindings.length, 0);
  fs.writeFileSync(path.join(worktree, 'fixture.txt'), 'retained local edits\n');
  assert.equal(recoverWorker(environment, pending.payload.attachToken).restored, false);
  assert.equal(fs.readFileSync(path.join(worktree, 'fixture.txt'), 'utf8'), 'retained local edits\n');
  git(worktree, ['add', 'fixture.txt']);
  git(worktree, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'local changes']);
  assert.throws(() => recoverWorker(environment, pending.payload.attachToken), /registration/);
  git(worktree, ['switch', '--detach', ledger.integrationRevision]);
  git(worktree, ['switch', '-c', 'original-worker']);
  const binding = bindWorker(environment, worktree, pending.payload.attachToken, 'original-session');
  const attached = { ok: true, sessionId: binding.sessionId, worktree: binding.worktree, branch: binding.branch, revision: binding.revision };
  withLedgerLock(root, 'campaign', environment, saved => {
    validateActionResultBinding(saved, pending.id, attached, environment);
    recordActionResult(saved, pending.id, attached, graph());
  });
  assert.equal(readLedger(root, 'campaign', environment).assignments[0].state, 'ACTIVE');
  assert.deepEqual(readLedger(root, 'campaign', environment).pendingActions, []);
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
    recordActionResult(ledger, ledger.pendingActions[0].id, {
      ok: true, sessionId: binding.sessionId, worktree, branch: binding.branch, revision: binding.revision,
    });
    Object.assign(ledger.assignments[0], { sessionId: binding.sessionId, worktree, branch: binding.branch, workerRevision: binding.revision, state: 'ARCHIVED' });
    ledger.workers[0].activity = 'idle';
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
    ledger.pendingActions = [{ schemaVersion: 5, id: 'original-recovery', type: 'RECOVER_WORKTREE', assignmentId: binding.assignmentId,
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
