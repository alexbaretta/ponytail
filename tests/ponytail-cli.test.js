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
const installer = path.join(root, 'scripts', 'install-cli.sh');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function project(policy = {}) {
  const projectRoot = temporaryDirectory('ponytail-project');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: projectRoot }).status, 0);
  fs.mkdirSync(path.join(projectRoot, '.agents/config'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.agents/config/codex-execpolicy.json'), `${JSON.stringify({
    schemaVersion: 1,
    safe: [],
    unsafe: [],
    ...policy,
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(projectRoot, '.agents/config/ponytail.json'), `${JSON.stringify({
    components: [],
    exceptions: [],
    manifests: [],
    name: path.basename(projectRoot),
    names: [],
    packages: [],
    repositoryUrls: [],
    schemaVersion: 1,
  }, null, 2)}\n`);
  assert.equal(spawnSync('git', ['add', '.'], { cwd: projectRoot }).status, 0);
  assert.equal(spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'initial'], { cwd: projectRoot }).status, 0);
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

test('register initializes and registers the enclosing Git root idempotently', () => {
  const home = temporaryDirectory('ponytail-home');
  const projectRoot = temporaryDirectory('ponytail-project');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: projectRoot }).status, 0);
  const nested = path.join(projectRoot, 'one/two');
  fs.mkdirSync(nested, { recursive: true });

  let result = run(home, 'register', [], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const proposalPath = path.join(fs.realpathSync(projectRoot), '.agents/config/codex-execpolicy.json');
  assert.equal(
    result.stdout,
    `initialized: ${proposalPath}\ninitialized: ${path.join(fs.realpathSync(projectRoot), ".agents/config/ponytail.json")}\nregistered: ${fs.realpathSync(projectRoot)}\n`,
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(proposalPath, 'utf8')), {
    schemaVersion: 1,
    safe: [],
    unsafe: [],
  });
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(projectRoot, '.agents/config/ponytail.json'), 'utf8')),
    {
      components: [],
      exceptions: [],
      manifests: [],
      name: path.basename(projectRoot),
      names: [],
      packages: [],
      repositoryUrls: [],
      schemaVersion: 1,
    },
  );
  assert.equal(fs.statSync(proposalPath).mode & 0o777, 0o644);
  const first = fs.readFileSync(configPath(home), 'utf8');
  assert.deepEqual(JSON.parse(first), {
    schemaVersion: 1,
    sourceRoot: fs.realpathSync(root),
    projects: [{
      blessedWorktree: fs.realpathSync(projectRoot),
      root: fs.realpathSync(projectRoot),
    }],
  });
  assert.equal(fs.statSync(configPath(home)).mode & 0o777, 0o600);
  const hookPath = path.join(projectRoot, '.git/hooks/pre-commit');
  assert.equal(fs.existsSync(hookPath), false);

  result = run(home, 'register', [], { cwd: projectRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `already registered: ${fs.realpathSync(projectRoot)}\n`);
  assert.equal(fs.readFileSync(configPath(home), 'utf8'), first);

  const unblessed = JSON.parse(first);
  unblessed.projects[0].blessedWorktree = null;
  fs.writeFileSync(configPath(home), `${JSON.stringify(unblessed, null, 2)}\n`);
  result = run(home, 'register', [], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `blessed worktree: ${fs.realpathSync(projectRoot)}\nalready registered: ${fs.realpathSync(projectRoot)}\n`);
  assert.equal(JSON.parse(fs.readFileSync(configPath(home))).projects[0].blessedWorktree, fs.realpathSync(projectRoot));
});

test('pre-commit composes with an existing shell hook idempotently', () => {
  const home = temporaryDirectory('ponytail-home');
  const projectRoot = project();
  assert.equal(spawnSync('git', ['config', 'core.hooksPath', '.husky/_'], { cwd: projectRoot }).status, 0);
  const hookPath = path.join(projectRoot, '.husky/_/pre-commit');
  const clientHook = '#!/usr/bin/env sh\n. "$(dirname "$0")/h"';
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, clientHook, { mode: 0o755 });
  assert.equal(run(home, 'register', [], { cwd: projectRoot }).status, 0);
  assert.equal(fs.readFileSync(hookPath, 'utf8'), clientHook);

  let result = run(home, 'pre-commit', [], { cwd: projectRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `pre-commit hook: ${fs.realpathSync(hookPath)}\n`);
  const installed = fs.readFileSync(hookPath, 'utf8');
  assert.match(installed, /ponytail pre-commit: begin/);
  assert.match(installed, /cli\/ponytail qa \|\| exit \$\?/);
  assert.match(installed, /\. "\$\(dirname "\$0"\)\/h"$/);
  assert.ok(installed.indexOf('ponytail pre-commit: begin') < installed.indexOf('. "$(dirname'));
  result = run(home, 'pre-commit', [], { cwd: projectRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(hookPath, 'utf8'), installed);
  const clientLog = path.join(projectRoot, 'client-hook.log');
  fs.writeFileSync(path.join(projectRoot, '.husky/_/h'), 'printf "client hook ran\\n" >> "$CLIENT_HOOK_LOG"\n');
  result = spawnSync(hookPath, [], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, CLIENT_HOOK_LOG: clientLog },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(clientLog, 'utf8'), 'client hook ran\n');
});

test('concurrent register calls retain both registrations', () => {
  const home = temporaryDirectory('ponytail-home');
  const first = project();
  const second = project();
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const command = [
    `(cd ${quote(first)} && ${quote(ponytail)} register) &`,
    `(cd ${quote(second)} && ${quote(ponytail)} register) &`,
    'wait',
  ].join(' ');
  const result = spawnSync('bash', ['-c', command], {
    encoding: 'utf8',
    env: environment(home),
  });

  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(fs.readFileSync(configPath(home), 'utf8'));
  assert.deepEqual(config.projects, [fs.realpathSync(first), fs.realpathSync(second)].sort().map(projectRoot => ({
    blessedWorktree: projectRoot,
    root: projectRoot,
  })));
});

test('register rejects a symlinked policy and malformed user configuration', () => {
  const home = temporaryDirectory('ponytail-home');
  const projectRoot = temporaryDirectory('ponytail-project');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: projectRoot }).status, 0);
  fs.mkdirSync(path.join(projectRoot, '.agents/config'), { recursive: true });
  fs.symlinkSync('/tmp/untrusted-policy', path.join(projectRoot, '.agents/config/codex-execpolicy.json'));
  let result = run(home, 'register', [], { cwd: projectRoot });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project policy must be a regular non-symlink file/);

  fs.mkdirSync(path.dirname(configPath(home)), { recursive: true });
  fs.writeFileSync(configPath(home), JSON.stringify({
    schemaVersion: 1,
    sourceRoot: fs.realpathSync(root),
    projects: [],
    unexpected: true,
  }));
  result = run(home, 'update-permissions');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid V1 Ponytail configuration/);
});

test('update-permissions consumes every registered project and is idempotent', () => {
  const home = temporaryDirectory('ponytail-home');
  const first = project({
    safe: [{ pattern: ['./scripts/first.sh'], justification: 'Run first project command' }],
  });
  const second = project({
    unsafe: [{ pattern: ['./scripts/second.sh'], decision: 'prompt', justification: 'Review second project command' }],
  });
  assert.equal(run(home, 'register', [], { cwd: first }).status, 0);
  assert.equal(run(home, 'register', [], { cwd: second }).status, 0);

  let result = run(home, 'update-permissions', [], { cwd: first, input: 'yes\n' });
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(home, '.ponytail/codex-execpolicy/state.json'), 'utf8'));
  assert.deepEqual(state.projects, [fs.realpathSync(first), fs.realpathSync(second)].sort());
  assert.ok(state.acceptedRules.some(({ pattern }) => pattern[0] === './scripts/first.sh'));
  assert.ok(state.acceptedRules.some(({ pattern }) => pattern[0] === './scripts/second.sh'));

  const config = JSON.parse(fs.readFileSync(configPath(home), 'utf8'));
  config.projects = config.projects.filter(project => project.root === fs.realpathSync(first));
  fs.writeFileSync(configPath(home), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  result = run(home, 'update-permissions', [], { cwd: first, input: 'yes\n' });
  assert.equal(result.status, 0, result.stderr);
  const reduced = JSON.parse(fs.readFileSync(path.join(home, '.ponytail/codex-execpolicy/state.json'), 'utf8'));
  assert.deepEqual(reduced.projects, [fs.realpathSync(first)]);
  assert.ok(reduced.acceptedRules.every(({ pattern }) => pattern[0] !== './scripts/second.sh'));

  result = run(home, 'update-permissions', [], { cwd: first });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Accept this shared policy change/);
});

test('update-permissions reads policy from each blessed worktree', () => {
  const home = temporaryDirectory('ponytail-home');
  const main = project();
  assert.equal(run(home, 'register', [], { cwd: main }).status, 0);
  const candidate = path.join(temporaryDirectory('ponytail-worktrees'), 'candidate');
  assert.equal(spawnSync('git', ['-C', main, 'worktree', 'add', '-qb', 'candidate', candidate]).status, 0);
  fs.writeFileSync(path.join(candidate, '.agents/config/codex-execpolicy.json'), `${JSON.stringify({
    schemaVersion: 1,
    safe: [{ pattern: ['./scripts/candidate.sh'], justification: 'Run the candidate command' }],
    unsafe: [],
  }, null, 2)}\n`);
  assert.equal(spawnSync('git', ['-C', candidate, 'add', '.agents/config/codex-execpolicy.json']).status, 0);
  assert.equal(spawnSync('git', ['-C', candidate, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'candidate policy']).status, 0);
  assert.equal(run(home, 'bless', [], { cwd: candidate }).status, 0);

  const result = run(home, 'update-permissions', [], { cwd: main, input: 'yes\n' });
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(home, '.ponytail/codex-execpolicy/state.json')));
  assert.deepEqual(state.projects, [fs.realpathSync(candidate)]);
  assert.ok(state.acceptedRules.some(({ pattern }) => pattern[0] === './scripts/candidate.sh'));
});

test('CLI installer links the checkout and the installed command updates skills', () => {
  const home = temporaryDirectory('ponytail-home');
  const bin = path.join(home, 'bin');
  let result = spawnSync(installer, ['--bin-dir', bin], {
    encoding: 'utf8',
    env: environment(home),
    input: 'n\n',
  });
  assert.equal(result.status, 0, result.stderr);
  const registeredProject = project();
  assert.equal(run(home, 'register', [], { cwd: registeredProject }).status, 0);
  const installed = path.join(bin, 'ponytail');
  assert.equal(fs.realpathSync(installed), fs.realpathSync(ponytail));
  assert.equal(spawnSync(installed, ['--help'], { encoding: 'utf8', env: environment(home), cwd: registeredProject }).status, 0);

  const codexHome = path.join(home, '.codex-test');
  result = spawnSync(installed, ['update-skills', '--codex-home', codexHome], {
    encoding: 'utf8',
    env: environment(home),
    cwd: registeredProject,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(codexHome, 'skills/ponytail/SKILL.md')));
});

test('update refreshes Codex skills and permissions without installing the CLI', () => {
  const home = temporaryDirectory('ponytail-home');
  const codexHome = path.join(home, '.codex-test');
  const registeredProject = project();
  assert.equal(run(home, 'register', [], { cwd: registeredProject }).status, 0);
  const result = run(home, 'update', [], {
    cwd: registeredProject,
    env: { CODEX_HOME: codexHome },
    input: 'yes\n',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(codexHome, 'skills/ponytail/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.codex/rules/ponytail.rules')));
  assert.ok(fs.existsSync(path.join(home, '.ponytail/codex-execpolicy/state.json')));
  assert.ok(!fs.existsSync(path.join(home, '.local/bin/ponytail')));
});
