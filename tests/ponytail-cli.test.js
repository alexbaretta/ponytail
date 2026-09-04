#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ponytail = path.join(root, 'cli', 'ponytail');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function project(policy = {}) {
  const projectRoot = temporaryDirectory('ponytail-project');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: projectRoot }).status, 0);
  fs.mkdirSync(path.join(projectRoot, '.ponytail'));
  fs.writeFileSync(path.join(projectRoot, '.ponytail/codex-execpolicy.json'), `${JSON.stringify({
    schemaVersion: 1,
    safe: [],
    unsafe: [],
    ...policy,
  }, null, 2)}\n`);
  return projectRoot;
}

function environment(home, additions = {}) {
  return { ...process.env, HOME: home, PATH: '/usr/bin:/bin', ...additions };
}

function run(home, command, arguments = [], options = {}) {
  const { env: additions = {}, ...spawnOptions } = options;
  return spawnSync(ponytail, [command, ...arguments], {
    encoding: 'utf8',
    env: environment(home, additions),
    ...spawnOptions,
  });
}

function configPath(home) {
  return path.join(home, '.ponytail/config.json');
}

test('setup-project registers the enclosing Git root idempotently', () => {
  const home = temporaryDirectory('ponytail-home');
  const projectRoot = project();
  const nested = path.join(projectRoot, 'one/two');
  fs.mkdirSync(nested, { recursive: true });

  let result = run(home, 'setup-project', [], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `registered: ${fs.realpathSync(projectRoot)}\n`);
  const first = fs.readFileSync(configPath(home), 'utf8');
  assert.deepEqual(JSON.parse(first), {
    schemaVersion: 1,
    sourceRoot: fs.realpathSync(root),
    projects: [fs.realpathSync(projectRoot)],
  });
  assert.equal(fs.statSync(configPath(home)).mode & 0o777, 0o600);

  result = run(home, 'setup-project', [], { cwd: projectRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `already registered: ${fs.realpathSync(projectRoot)}\n`);
  assert.equal(fs.readFileSync(configPath(home), 'utf8'), first);
});

test('concurrent setup-project calls retain both registrations', () => {
  const home = temporaryDirectory('ponytail-home');
  const first = project();
  const second = project();
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const command = [
    `(cd ${quote(first)} && ${quote(ponytail)} setup-project) &`,
    `(cd ${quote(second)} && ${quote(ponytail)} setup-project) &`,
    'wait',
  ].join(' ');
  const result = spawnSync('bash', ['-c', command], {
    encoding: 'utf8',
    env: environment(home),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath(home), 'utf8')).projects, [
    fs.realpathSync(first),
    fs.realpathSync(second),
  ].sort());
});

test('setup-project requires a policy and rejects malformed user configuration', () => {
  const home = temporaryDirectory('ponytail-home');
  const projectRoot = temporaryDirectory('ponytail-project');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: projectRoot }).status, 0);
  let result = run(home, 'setup-project', [], { cwd: projectRoot });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project policy must be a regular non-symlink file/);

  fs.mkdirSync(path.dirname(configPath(home)), { recursive: true });
  fs.writeFileSync(configPath(home), JSON.stringify({
    schemaVersion: 1,
    sourceRoot: fs.realpathSync(root),
    projects: [],
    unexpected: true,
  }));
  result = run(home, 'install-permissions');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid V1 Ponytail configuration/);
});

test('install-permissions consumes every registered project and is idempotent', () => {
  const home = temporaryDirectory('ponytail-home');
  const first = project({
    safe: [{ pattern: ['./scripts/first.sh'], justification: 'Run first project command' }],
  });
  const second = project({
    unsafe: [{ pattern: ['./scripts/second.sh'], decision: 'prompt', justification: 'Review second project command' }],
  });
  assert.equal(run(home, 'setup-project', [], { cwd: first }).status, 0);
  assert.equal(run(home, 'setup-project', [], { cwd: second }).status, 0);

  let result = run(home, 'install-permissions', [], { input: 'yes\n' });
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(home, '.ponytail/codex-execpolicy/state.json'), 'utf8'));
  assert.deepEqual(state.projects, [fs.realpathSync(first), fs.realpathSync(second)].sort());
  assert.ok(state.acceptedRules.some(({ pattern }) => pattern[0] === './scripts/first.sh'));
  assert.ok(state.acceptedRules.some(({ pattern }) => pattern[0] === './scripts/second.sh'));

  const config = JSON.parse(fs.readFileSync(configPath(home), 'utf8'));
  config.projects = [fs.realpathSync(first)];
  fs.writeFileSync(configPath(home), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  result = run(home, 'install-permissions', [], { input: 'yes\n' });
  assert.equal(result.status, 0, result.stderr);
  const reduced = JSON.parse(fs.readFileSync(path.join(home, '.ponytail/codex-execpolicy/state.json'), 'utf8'));
  assert.deepEqual(reduced.projects, [fs.realpathSync(first)]);
  assert.ok(reduced.acceptedRules.every(({ pattern }) => pattern[0] !== './scripts/second.sh'));

  result = run(home, 'install-permissions');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Accept this shared policy change/);
});

test('installation subcommands install and run the unified CLI', () => {
  const home = temporaryDirectory('ponytail-home');
  const bin = path.join(home, 'bin');
  let result = run(home, 'install-cli', ['--bin-dir', bin], { input: 'n\n' });
  assert.equal(result.status, 0, result.stderr);
  const installed = path.join(bin, 'ponytail');
  assert.ok(fs.statSync(installed).mode & 0o100);
  assert.equal(spawnSync(installed, ['--help'], { encoding: 'utf8', env: environment(home) }).status, 0);

  const codexHome = path.join(home, '.codex-test');
  result = spawnSync(installed, ['install-to-codex', '--codex-home', codexHome], {
    encoding: 'utf8',
    env: environment(home),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(codexHome, 'skills/ponytail/SKILL.md')));
});
