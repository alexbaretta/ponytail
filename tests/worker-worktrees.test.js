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
