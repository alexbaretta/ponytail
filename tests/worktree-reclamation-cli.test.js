#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: verifies REQ-WORKTREE-RECLAMATION

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ponytail = path.join(root, 'cli', 'ponytail');

function command(cwd, executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', ...options });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function fixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-worktree-reclamation-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-worktree-reclamation-home-'));
  const environment = { ...process.env, HOME: home };
  command(project, 'git', ['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(project, 'README.md'), 'fixture\n');
  command(project, 'git', ['add', '.']);
  command(project, 'git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'initial']);
  command(project, ponytail, ['register'], { env: environment });

  const activePath = path.join(project, 'worktrees', 'active');
  const abandonedPath = path.join(project, 'worktrees', 'abandoned');
  const blockedPath = path.join(project, 'worktrees', 'blocked');
  const missingPath = path.join(project, 'worktrees', 'missing');
  const resourcePaths = Object.fromEntries(['active', 'abandoned', 'blocked', 'missing'].map((claimId) => [
    claimId,
    path.join(project, 'resources', `${claimId}.database`),
  ]));
  for (const worktreePath of [activePath, abandonedPath, blockedPath]) fs.mkdirSync(worktreePath, { recursive: true });
  for (const resourcePath of Object.values(resourcePaths)) {
    fs.mkdirSync(path.dirname(resourcePath), { recursive: true });
    fs.writeFileSync(resourcePath, 'project resource\n');
  }
  fs.mkdirSync(path.join(project, '.agents/config/project'), { recursive: true });
  fs.mkdirSync(path.join(project, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(project, 'claims.json'), `${JSON.stringify([
    { claimId: 'active', generation: 'generation-active', state: 'active', worktreePath: activePath, disposition: 'retain', reason: 'session is active' },
    { claimId: 'abandoned', generation: 'generation-abandoned', state: 'active', worktreePath: abandonedPath, disposition: 'reclaim', reason: 'owning session is authoritatively absent' },
    { claimId: 'blocked', generation: 'generation-blocked', state: 'retiring', worktreePath: blockedPath, disposition: 'reclaim', reason: 'retirement must resume' },
    { claimId: 'missing', generation: 'generation-missing', state: 'active', worktreePath: missingPath, disposition: 'reclaim', reason: 'worktree and owning session are authoritatively absent' },
  ], null, 2)}\n`);
  fs.writeFileSync(path.join(project, '.agents/config/project/worktree-lifecycle.json'), `${JSON.stringify({
    schemaVersion: 1,
    adapterPath: 'scripts/worktree-lifecycle-adapter.js',
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), `#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const claimsPath = path.join(process.cwd(), 'claims.json');
const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
fs.appendFileSync(path.join(process.cwd(), 'requests.jsonl'), JSON.stringify(request) + '\\n');
if (request.operation === 'inventory') {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'inventory', claims }) + '\\n');
} else {
  if (process.env.WORKTREE_RECLAMATION_TEST_MALFORM === 'true') {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: request.claim.claimId }) + '\\n');
    process.exit(0);
  }
  if (process.env.WORKTREE_RECLAMATION_TEST_DELAY === 'true') {
    fs.writeFileSync(path.join(process.cwd(), 'reclaim-started'), 'started\\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  const claim = claims.find((item) => item.claimId === request.claim.claimId && item.generation === request.claim.generation);
  if (!claim || claim.worktreePath !== request.claim.worktreePath) {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: request.claim.claimId, generation: request.claim.generation, outcome: 'blocked', reason: 'claim generation changed' }) + '\\n');
  } else if (claim.claimId === 'blocked') {
    fs.rmSync(path.join(process.cwd(), 'resources', claim.claimId + '.database'), { force: true });
    process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: claim.claimId, generation: claim.generation, outcome: 'blocked', reason: 'owned process did not stop' }) + '\\n');
  } else if (process.env.WORKTREE_RECLAMATION_TEST_REUSE === claim.claimId) {
    fs.writeFileSync(claimsPath, JSON.stringify(claims.map((item) => item === claim ? { ...item, generation: 'replacement-generation', disposition: 'retain', reason: 'new owner' } : item)) + '\\n');
    process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: claim.claimId, generation: claim.generation, outcome: 'reclaimed', reason: 'stale observation' }) + '\\n');
  } else {
    fs.rmSync(path.join(process.cwd(), 'resources', claim.claimId + '.database'), { force: true });
    fs.rmSync(claim.worktreePath, { recursive: true, force: true });
    fs.writeFileSync(claimsPath, JSON.stringify(claims.filter((item) => item !== claim)) + '\\n');
    process.stdout.write(JSON.stringify({ schemaVersion: 1, operation: 'reclaim', claimId: claim.claimId, generation: claim.generation, outcome: 'reclaimed', reason: 'exact resources retired' }) + '\\n');
  }
}
`);
  fs.chmodSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), 0o755);
  command(project, 'git', ['add', '.']);
  command(project, 'git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'configure lifecycle']);
  return { activePath, abandonedPath, blockedPath, environment, missingPath, project, resourcePaths };
}

function commitFixture(project, message) {
  command(project, 'git', ['add', '-A']);
  command(project, 'git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', message]);
}

test('reclaims only adapter-proven abandoned worktrees and project resources across independent sessions', () => {
  const { activePath, abandonedPath, blockedPath, environment, project, resourcePaths } = fixture();
  let result = spawnSync(ponytail, ['worktree', 'reclaim', '--dry-run', '--json'], { cwd: project, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
  const dryRun = JSON.parse(result.stdout);
  assert.equal(dryRun.schemaVersion, 1);
  assert.equal(dryRun.dryRun, true);
  assert.deepEqual(dryRun.claims.map(({ claimId }) => claimId), ['abandoned', 'active', 'blocked', 'missing']);
  assert.deepEqual(dryRun.summary, { inventoried: 4, reclaimable: 3, reclaimed: 0, retained: 1, blocked: 0 });
  assert.equal(fs.existsSync(abandonedPath), true);
  assert.equal(fs.existsSync(resourcePaths.abandoned), true);
  assert.equal(fs.existsSync(resourcePaths.missing), true);
  assert.equal(fs.existsSync(path.join(project, 'requests.jsonl')), true);
  assert.equal(fs.readFileSync(path.join(project, 'requests.jsonl'), 'utf8').trim().split('\n').length, 1);

  result = spawnSync(ponytail, ['worktree', 'reclaim', '--json'], { cwd: project, encoding: 'utf8', env: environment });
  assert.equal(result.status, 1, result.stderr);
  const reclaimed = JSON.parse(result.stdout);
  assert.deepEqual(reclaimed.results.map(({ claimId, outcome }) => ({ claimId, outcome })), [
    { claimId: 'abandoned', outcome: 'reclaimed' },
    { claimId: 'blocked', outcome: 'blocked' },
    { claimId: 'missing', outcome: 'reclaimed' },
  ]);
  assert.deepEqual(reclaimed.summary, { inventoried: 4, reclaimable: 3, reclaimed: 2, retained: 1, blocked: 1 });
  assert.equal(fs.existsSync(activePath), true);
  assert.equal(fs.existsSync(abandonedPath), false);
  assert.equal(fs.existsSync(blockedPath), true);
  assert.equal(fs.existsSync(resourcePaths.active), true);
  assert.equal(fs.existsSync(resourcePaths.abandoned), false);
  assert.equal(fs.existsSync(resourcePaths.blocked), false);
  assert.equal(fs.existsSync(resourcePaths.missing), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project, 'claims.json'), 'utf8')).map(({ claimId }) => claimId), ['active', 'blocked']);
  const requests = fs.readFileSync(path.join(project, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(requests.filter(({ operation }) => operation === 'reclaim').map(({ claim }) => claim), [
    { claimId: 'abandoned', generation: 'generation-abandoned', worktreePath: abandonedPath },
    { claimId: 'blocked', generation: 'generation-blocked', worktreePath: blockedPath },
    { claimId: 'missing', generation: 'generation-missing', worktreePath: path.join(project, 'worktrees', 'missing') },
  ]);
});

test('serializes independent maintenance sessions per project', async () => {
  const { environment, project } = fixture();
  const first = spawn(ponytail, ['worktree', 'reclaim', '--json'], {
    cwd: project,
    env: { ...environment, WORKTREE_RECLAMATION_TEST_DELAY: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let attempt = 0; attempt < 100 && !fs.existsSync(path.join(project, 'reclaim-started')); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(fs.existsSync(path.join(project, 'reclaim-started')), true);
  const second = spawnSync(ponytail, ['worktree', 'reclaim', '--json'], { cwd: project, encoding: 'utf8', env: environment });
  assert.equal(second.status, 2);
  assert.match(second.stderr, /WORKTREE_RECLAMATION_LOCK/);
  const exitCode = await new Promise((resolve) => first.once('close', resolve));
  assert.equal(exitCode, 1);
});

test('does not couple reclamation locks for distinct projects', async () => {
  const firstFixture = fixture();
  const secondFixture = fixture();
  const first = spawn(ponytail, ['worktree', 'reclaim', '--json'], {
    cwd: firstFixture.project,
    env: { ...firstFixture.environment, WORKTREE_RECLAMATION_TEST_DELAY: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let attempt = 0; attempt < 100 && !fs.existsSync(path.join(firstFixture.project, 'reclaim-started')); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(fs.existsSync(path.join(firstFixture.project, 'reclaim-started')), true);
  const second = spawnSync(ponytail, ['worktree', 'reclaim', '--json'], {
    cwd: secondFixture.project,
    encoding: 'utf8',
    env: secondFixture.environment,
  });
  assert.equal(second.status, 1, second.stderr);
  assert.doesNotMatch(second.stderr, /WORKTREE_RECLAMATION_LOCK/);
  const exitCode = await new Promise((resolve) => first.once('close', resolve));
  assert.equal(exitCode, 1);
});

test('rejects a reclaimed result when the claim ID is concurrently reused', () => {
  const { environment, project } = fixture();
  const result = spawnSync(ponytail, ['worktree', 'reclaim', '--json'], {
    cwd: project,
    encoding: 'utf8',
    env: { ...environment, WORKTREE_RECLAMATION_TEST_REUSE: 'abandoned' },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /WORKTREE_RECLAMATION_FENCE/);
  const claim = JSON.parse(fs.readFileSync(path.join(project, 'claims.json'), 'utf8')).find(({ claimId }) => claimId === 'abandoned');
  assert.equal(claim.generation, 'replacement-generation');
});

test('stops before later claims when reclaim output is malformed', () => {
  const { abandonedPath, blockedPath, environment, missingPath, project } = fixture();
  const result = spawnSync(ponytail, ['worktree', 'reclaim', '--json'], {
    cwd: project,
    encoding: 'utf8',
    env: { ...environment, WORKTREE_RECLAMATION_TEST_MALFORM: 'true' },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /WORKTREE_RECLAMATION_SCHEMA/);
  assert.equal(fs.existsSync(abandonedPath), true);
  assert.equal(fs.existsSync(blockedPath), true);
  assert.equal(fs.existsSync(missingPath), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project, 'claims.json'), 'utf8')).map(({ claimId }) => claimId), [
    'active', 'abandoned', 'blocked', 'missing',
  ]);
});

test('fails closed on every untrusted lifecycle adapter form', () => {
  const cases = [
    {
      name: 'untracked configuration',
      arrange(project) {
        command(project, 'git', ['rm', '--cached', '.agents/config/project/worktree-lifecycle.json']);
      },
      diagnostic: /must be tracked/,
      arguments: ['worktree', 'reclaim', '--dry-run', '--json'],
    },
    {
      name: 'modified adapter',
      arrange(project) {
        fs.appendFileSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), '\n// modified\n');
      },
      diagnostic: /must be committed/,
    },
    {
      name: 'symlinked adapter',
      arrange(project) {
        const adapter = path.join(project, 'scripts/worktree-lifecycle-adapter.js');
        fs.unlinkSync(adapter);
        fs.symlinkSync('/bin/true', adapter);
        commitFixture(project, 'symlink adapter');
      },
      diagnostic: /regular non-symlink file/,
    },
    {
      name: 'escaping adapter path',
      arrange(project) {
        fs.writeFileSync(path.join(project, '.agents/config/project/worktree-lifecycle.json'), '{"schemaVersion":1,"adapterPath":"../adapter"}\n');
        commitFixture(project, 'escape adapter');
      },
      diagnostic: /normalized project-relative path/,
    },
    {
      name: 'non-executable adapter',
      arrange(project) {
        fs.chmodSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), 0o644);
        commitFixture(project, 'disable adapter');
      },
      diagnostic: /must be executable/,
    },
    {
      name: 'failing adapter',
      arrange(project) {
        fs.writeFileSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), '#!/bin/sh\necho adapter-failed >&2\nexit 9\n');
        fs.chmodSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), 0o755);
        commitFixture(project, 'fail adapter');
      },
      diagnostic: /adapter-failed/,
    },
    {
      name: 'malformed adapter output',
      arrange(project) {
        fs.writeFileSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), '#!/bin/sh\nprintf not-json\n');
        fs.chmodSync(path.join(project, 'scripts/worktree-lifecycle-adapter.js'), 0o755);
        commitFixture(project, 'malform adapter');
      },
      diagnostic: /invalid JSON/,
    },
  ];

  for (const invalid of cases) {
    const { abandonedPath, environment, project } = fixture();
    invalid.arrange(project);
    const result = spawnSync(ponytail, invalid.arguments ?? ['worktree', 'reclaim', '--json'], {
      cwd: project,
      encoding: 'utf8',
      env: environment,
    });
    assert.equal(result.status, 2, `${invalid.name}: ${result.stderr}`);
    assert.match(result.stderr, invalid.diagnostic, invalid.name);
    assert.equal(fs.existsSync(abandonedPath), true, invalid.name);
  }
});
