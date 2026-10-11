// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { resolveRollingManagedDirectory, ensureRollingSessionIdIgnored, provisionRollingWorktree } = require('../src/rolling-worktrees');

// Traceability: verifies REQ-ROLLING-WORKERS
test('ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work', t => {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-checkouts-')));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'main');
  fs.mkdirSync(root);
  const git = (cwd, argv) => execFileSync('git', ['-C', cwd, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['config', 'user.email', 'fixture@example.test']);
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  const configPath = '.agents/config/project/rolling-campaigns.json';
  const configuration = { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: 'pool', anchor: 'main' }, maxActiveWorkers: 2, publicationSize: 1,
    setupCommands: [[process.execPath, '-e', "require('node:fs').writeFileSync('setup-proof.txt', process.cwd() + '\\n' + process.env.PONYTAIL_WORKTREE_NUMBER)"]],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(path.join(root, configPath), JSON.stringify(configuration));
  assert.throws(() => resolveRollingManagedDirectory(root), /must be Git ignored/);
  assert.equal(fs.existsSync(path.join(root, 'pool')), false);
  fs.writeFileSync(path.join(root, '.gitignore'), '/session_id.txt\n/setup-proof.txt\n/pool/\n');
  git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'fixture']);
  const base = git(root, ['rev-parse', 'HEAD']);
  const pool = resolveRollingManagedDirectory(root);
  assert.equal(pool.directory, path.join(root, 'pool'));
  const lease = { number: 101, rootPath: path.join(pool.directory, '101'), generation: crypto.randomUUID() };
  const provisioned = provisionRollingWorktree(root, lease, base);
  assert.equal(git(lease.rootPath, ['symbolic-ref', '--short', 'HEAD']), provisioned.branch);
  assert.equal(fs.readFileSync(path.join(lease.rootPath, 'setup-proof.txt'), 'utf8'), `${lease.rootPath}\n101`);
  assert.equal(git(root, ['status', '--porcelain']), '');
  assert.equal(resolveRollingManagedDirectory(lease.rootPath).directory, pool.directory);
  assert.deepEqual(provisionRollingWorktree(root, lease, base), provisioned);
  assert.deepEqual(ensureRollingSessionIdIgnored(lease.rootPath), { changed: false });
  fs.writeFileSync(path.join(lease.rootPath, 'session_id.txt'), 'fixture-session');
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /marker is still present/);
  fs.unlinkSync(path.join(lease.rootPath, 'session_id.txt'));
  const modifiedConfig = { ...configuration, managedWorktrees: { directory: '../other-pool', anchor: 'main' } };
  fs.writeFileSync(path.join(lease.rootPath, configPath), JSON.stringify(modifiedConfig));
  assert.throws(() => resolveRollingManagedDirectory(root), /directory differs/);
  fs.writeFileSync(path.join(lease.rootPath, configPath), JSON.stringify(configuration));
  fs.writeFileSync(path.join(lease.rootPath, 'owned.txt'), 'preserve uncommitted work');
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /uncommitted work/);
  assert.equal(fs.readFileSync(path.join(lease.rootPath, 'owned.txt'), 'utf8'), 'preserve uncommitted work');
  git(lease.rootPath, ['add', 'owned.txt']); git(lease.rootPath, ['commit', '-q', '-m', 'worker result']);
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /unintegrated commits/);
  git(root, ['merge', '--ff-only', provisioned.branch]);
  const integrated = git(root, ['rev-parse', 'HEAD']);
  const next = provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, integrated);
  assert.notEqual(next.branch, provisioned.branch);
  assert.equal(git(lease.rootPath, ['rev-parse', 'HEAD']), integrated);
  fs.writeFileSync(path.join(lease.rootPath, '.gitignore'), '/setup-proof.txt');
  assert.deepEqual(ensureRollingSessionIdIgnored(lease.rootPath), { changed: true });
  assert.equal(git(lease.rootPath, ['check-ignore', 'session_id.txt']), 'session_id.txt');
  assert.ok(fs.readFileSync(path.join(lease.rootPath, '.gitignore'), 'utf8').startsWith('/setup-proof.txt\n'));
  configuration.setupCommands = [[process.execPath, '-e', 'process.exit(7)']];
  fs.writeFileSync(path.join(root, configPath), JSON.stringify(configuration));
  git(root, ['add', configPath]); git(root, ['commit', '-q', '-m', 'fixture failing setup']);
  const failedLease = { number: 102, rootPath: path.join(pool.directory, '102'), generation: crypto.randomUUID() };
  assert.throws(() => provisionRollingWorktree(root, failedLease, git(root, ['rev-parse', 'HEAD'])), /setup failed in retained checkout/);
  assert.equal(fs.statSync(failedLease.rootPath).isDirectory(), true);
  assert.ok(resolveRollingManagedDirectory(root).worktrees.includes(failedLease.rootPath));
});
