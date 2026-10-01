#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

// Traceability: verifies REQ-WORKER-WORKTREE-RETENTION
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { advanceLedger, newLedger, readLedger, withLedgerLock, withWorktreeLock } = require('../src/campaign-orchestration');

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
  assert.equal(advance(other).type, 'CREATE_WORKER');
  assert.equal(readLedger(other, 'campaign', environment).pendingActions.length, 1);
});
