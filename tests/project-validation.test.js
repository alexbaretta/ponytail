// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { declaredDependencies } = require('../scripts/project-qa');
const cli = path.resolve(__dirname, '../cli/ponytail');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-validation-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = path.join(directory, 'home');
  fs.mkdirSync(home);
  return { directory, home };
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function run(home, root, ...args) {
  return spawnSync(cli, args, { cwd: root, env: { ...process.env, HOME: home }, encoding: 'utf8' });
}
function write(root, file, text) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
}
function configure(root, changes) {
  const file = '.agents/config/ponytail.json';
  const value = JSON.parse(fs.readFileSync(path.join(root, file)));
  Object.assign(value, changes);
  write(root, file, `${JSON.stringify(value, null, 2)}\n`);
  return value;
}
function commitConfiguration(root) {
  git(root, 'add', '.agents/config/ponytail.json');
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'update Ponytail configuration');
}
function repository(f, name) {
  const root = path.join(f.directory, name);
  fs.mkdirSync(root);
  git(root, 'init', '-q');
  const result = run(f.home, root, 'register');
  assert.equal(result.status, 0, result.stderr);
  git(root, 'add', '.');
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'initial');
  return fs.realpathSync(root);
}

test('every command distinguishes missing Git from absent registration', t => {
  const f = fixture(t);
  for (const args of [[], ['--help'], ['register'], ['bless'], ['blessed'], ['validate'], ['qa'], ['update']]) {
    const result = run(f.home, f.home, ...args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /no Git worktree/);
  }
  git(f.home, 'init', '-q');
  for (const command of ['bless', 'blessed', 'pre-commit', 'validate', 'qa', '--help', 'update-skills', 'setup']) {
    const result = run(f.home, f.home, command);
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stderr, /not registered/);
  }
});

test('blessing selects one clean tracked worktree and both command spellings report it', t => {
  const f = fixture(t);
  const main = repository(f, 'main');
  const worktree = path.join(f.directory, 'candidate');
  git(main, 'worktree', 'add', '-qb', 'candidate', worktree);

  for (const command of ['blessed', 'blessed-worktree']) {
    const result = run(f.home, worktree, command);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${main}\n`);
  }

  configure(worktree, { components: ['candidate-component'] });
  let result = run(f.home, worktree, 'bless');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be committed before blessing/);
  git(worktree, 'add', '.agents/config/ponytail.json');
  git(worktree, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'candidate config');
  result = run(f.home, worktree, 'bless-worktree');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `blessed worktree: ${fs.realpathSync(worktree)}\n`);
  assert.equal(run(f.home, main, 'blessed').stdout, `${fs.realpathSync(worktree)}\n`);
});

test('register resolves linked worktrees to the main checkout and validate checks local setup', t => {
  const f = fixture(t);
  const main = repository(f, 'main');
  const worktree = path.join(f.directory, 'dynamic');
  git(main, 'worktree', 'add', '-qb', 'dynamic', worktree);
  const freshHome = path.join(f.directory, 'fresh-home'); fs.mkdirSync(freshHome);
  let result = run(freshHome, worktree, 'register');
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(fs.readFileSync(path.join(freshHome, '.ponytail/config.json')));
  assert.deepEqual(config.projects, [{ blessedWorktree: fs.realpathSync(worktree), root: main }]);
  assert.equal(run(freshHome, worktree, 'validate').status, 0);
  fs.unlinkSync(path.join(worktree, '.agents/config/ponytail.json'));
  result = run(freshHome, worktree, 'validate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /metadata/);
});

test('project metadata V1 requires an explicit component list', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  const metadata = JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json')));
  assert.deepEqual(metadata.components, []);
  delete metadata.components;
  write(root, '.agents/config/ponytail.json', JSON.stringify(metadata));
  const result = run(f.home, root, 'validate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid V1 project metadata fields/);
});

test('validation requires both project configuration files to be tracked', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  git(root, 'rm', '--cached', '.agents/config/codex-execpolicy.json');
  const result = run(f.home, root, 'validate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /codex-execpolicy\.json/);
  assert.match(result.stderr, /must be tracked in Git/);
});

test('manual component registration is idempotent and unregistration is explicit', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  let result = run(f.home, root, 'register-component', 'worker-api');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'registered component: worker-api\n');
  result = run(f.home, root, 'register-component', 'worker-api');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'already registered component: worker-api\n');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'))).components,
    ['worker-api'],
  );
  result = run(f.home, root, 'unregister-component', 'worker-api');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'unregistered component: worker-api\n');
  result = run(f.home, root, 'unregister-component', 'worker-api');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /component is not registered/);
  assert.equal(run(f.home, root, 'register-component', ' padded ').status, 1);
  assert.equal(run(f.home, root, 'register-component', 'line\rbreak').status, 1);
  assert.equal(run(f.home, root, 'register-component', '@example/api').status, 0);
  assert.deepEqual(configure(root, {}).components, ['@example/api', 'api']);
  assert.equal(run(f.home, root, 'unregister-component', '@example/api').status, 0);
  assert.deepEqual(configure(root, {}).components, ['api']);
});

test('concurrent component registrations preserve both names', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
  const command = [
    `(cd ${quote(root)} && HOME=${quote(f.home)} ${quote(cli)} register-component alpha) &`,
    `(cd ${quote(root)} && HOME=${quote(f.home)} ${quote(cli)} register-component beta) &`,
    'wait',
  ].join(' ');
  const result = spawnSync('bash', ['-c', command], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'))).components,
    ['alpha', 'beta'],
  );
});

test('component detection registers every named tracked JavaScript package', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  write(root, 'package.json', JSON.stringify({ name: '@example/root' }));
  write(root, 'packages/zeta/package.json', JSON.stringify({ name: '@example/zeta' }));
  write(root, 'packages/alpha/package.json', JSON.stringify({ name: '@example/alpha' }));
  write(root, 'packages/unnamed/package.json', '{}');
  write(root, 'packages/untracked/package.json', JSON.stringify({ name: '@example/untracked' }));
  git(root, 'add', 'package.json', 'packages/zeta/package.json', 'packages/alpha/package.json', 'packages/unnamed/package.json');
  let result = run(f.home, root, 'detect-components');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '@example/alpha\n@example/root\n@example/zeta\n');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'))).components,
    ['@example/alpha', '@example/root', '@example/zeta', 'alpha', 'root', 'zeta'],
  );
  for (const language of ['typescript', 'javascript', 'auto']) {
    result = run(f.home, root, 'detect-components', '--language', language);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '@example/alpha\n@example/root\n@example/zeta\n');
  }
  result = run(f.home, root, 'detect-components', '--language', 'rust');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unsupported component detection language/);
});

test('component detection populates newly registered configuration before its first commit', t => {
  const f = fixture(t);
  const root = path.join(f.directory, 'current');
  fs.mkdirSync(root);
  git(root, 'init', '-q');
  write(root, 'package.json', JSON.stringify({ name: '@example/current' }));
  git(root, 'add', 'package.json');
  assert.equal(run(f.home, root, 'register').status, 0);

  const result = run(f.home, root, 'detect-components');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '@example/current\n');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'))).components,
    ['@example/current', 'current'],
  );
});

test('component detection parses every manifest before changing metadata', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  assert.equal(run(f.home, root, 'register-component', 'existing').status, 0);
  write(root, 'package.json', JSON.stringify({ name: '@example/root' }));
  write(root, 'packages/broken/package.json', '{');
  git(root, 'add', 'package.json', 'packages/broken/package.json');
  const before = fs.readFileSync(path.join(root, '.agents/config/ponytail.json'), 'utf8');
  const result = run(f.home, root, 'detect-components');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid package manifest/);
  assert.equal(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'), 'utf8'), before);
});

test('validate remains cheap while qa scans tracked working-tree text, not untracked files', t => {
  const f = fixture(t);
  const current = repository(f, 'current');
  repository(f, 'OtherProduct');
  write(current, 'untracked.txt', 'OtherProduct');
  assert.equal(run(f.home, current, 'qa').status, 0);
  git(current, 'add', 'untracked.txt');
  assert.equal(run(f.home, current, 'validate').status, 0);
  let result = run(f.home, current, 'qa', 'references');
  assert.equal(result.status, 4, result.stderr);
  assert.match(result.stdout, /untracked.txt:1: forbidden reference/);
  write(current, 'untracked.txt', 'OtherProductSuffix');
  assert.equal(run(f.home, current, 'qa').status, 0);
});

test('pre-commit runs reference QA and blocks findings', t => {
  const f = fixture(t);
  const current = repository(f, 'current');
  repository(f, 'OtherProduct');
  assert.equal(run(f.home, current, 'pre-commit').status, 0);
  write(current, 'reference.txt', 'OtherProduct');
  git(current, 'add', 'reference.txt');
  const before = git(current, 'rev-parse', 'HEAD');
  const result = spawnSync(
    'git',
    ['-C', current, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'forbidden reference'],
    { encoding: 'utf8', env: { ...process.env, HOME: f.home } },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /reference\.txt:1: forbidden reference/);
  assert.equal(git(current, 'rev-parse', 'HEAD'), before);
});

test('registration and validation leave pre-commit installation optional', t => {
  const f = fixture(t);
  const root = repository(f, 'current');
  const hookPath = path.join(root, '.git/hooks/pre-commit');
  assert.equal(fs.existsSync(hookPath), false);
  assert.equal(run(f.home, root, 'register').status, 0);
  const result = run(f.home, root, 'validate');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(hookPath), false);
});

test('exact local exceptions suppress intended matches without exempting other files', t => {
  const f = fixture(t);
  const current = repository(f, 'current'); repository(f, 'OtherProduct');
  write(current, 'example.txt', 'OtherProduct'); git(current, 'add', 'example.txt');
  configure(current, { exceptions: [{ project: 'OtherProduct', name: 'OtherProduct', path: 'example.txt', reason: 'Interoperability example' }] });
  let result = run(f.home, current, 'qa');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  write(current, 'another.txt', 'otherproduct'); git(current, 'add', 'another.txt');
  result = run(f.home, current, 'qa');
  assert.equal(result.status, 4, result.stderr);
  assert.match(result.stdout, /another.txt/);
  write(current, 'example.txt', 'No reference');
  assert.match(run(f.home, current, 'qa').stderr, /unused reference exception/);
});

test('direct npm dependencies grant directional permission by package identity', t => {
  const f = fixture(t);
  const current = repository(f, 'current'); const foreign = repository(f, 'OtherProduct');
  configure(foreign, { packages: [{ manager: 'npm', name: '@example/other' }] });
  commitConfiguration(foreign);
  configure(current, { manifests: [{ manager: 'pnpm', path: 'package.json' }] });
  write(current, 'package.json', JSON.stringify({ dependencies: { '@example/other': '^1.0.0' } }));
  write(current, 'example.txt', 'OtherProduct'); git(current, 'add', '.');
  let result = run(f.home, current, 'qa');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  write(current, 'package.json', '{}');
  assert.equal(run(f.home, current, 'qa').status, 4);
  write(current, 'package.json', '{');
  assert.equal(run(f.home, current, 'qa').status, 1);
});

test('reference QA treats foreign components as project identities', t => {
  const f = fixture(t);
  const current = repository(f, 'current');
  const foreign = repository(f, 'OtherProduct');
  configure(foreign, { components: ['foreign-worker'] });
  commitConfiguration(foreign);
  write(current, 'reference.txt', 'The foreign-worker owns this behavior.');
  git(current, 'add', 'reference.txt');
  const result = run(f.home, current, 'qa');
  assert.equal(result.status, 4, result.stderr + result.stdout);
  assert.match(result.stdout, /reference\.txt:1: forbidden reference to "OtherProduct": "foreign-worker"/);
});

test('reference QA always permits Ponytail and its components', t => {
  const f = fixture(t);
  const ponytail = fs.realpathSync(path.resolve(__dirname, '..'));
  assert.equal(run(f.home, ponytail, 'register').status, 0);
  const current = repository(f, 'current');
  write(current, 'reference.txt', 'Ponytail runs TSTS.');
  git(current, 'add', 'reference.txt');
  const result = run(f.home, current, 'qa');
  assert.equal(result.status, 0, result.stderr + result.stdout);
});

test('reference QA reads foreign identities only from the blessed worktree', t => {
  const f = fixture(t);
  const current = repository(f, 'current');
  const foreign = repository(f, 'OtherProduct');
  const candidate = path.join(f.directory, 'foreign-candidate');
  git(foreign, 'worktree', 'add', '-qb', 'foreign-candidate', candidate);
  configure(candidate, { components: ['candidate-only'] });
  git(candidate, 'add', '.agents/config/ponytail.json');
  git(candidate, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '--no-verify', '-qm', 'candidate identity');
  assert.equal(run(f.home, candidate, 'bless').status, 0);
  write(current, 'reference.txt', 'candidate-only');
  git(current, 'add', 'reference.txt');
  assert.equal(run(f.home, current, 'qa').status, 4);
  assert.equal(run(f.home, foreign, 'bless-worktree').status, 0);
  assert.equal(run(f.home, current, 'qa').status, 0);
});

test('register blesses an already registered repository when its blessing is absent', t => {
  const f = fixture(t);
  const current = repository(f, 'current');
  const foreign = repository(f, 'OtherProduct');
  const configPath = path.join(f.home, '.ponytail/config.json');
  const config = JSON.parse(fs.readFileSync(configPath));
  config.projects.find(project => project.root === foreign).blessedWorktree = null;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  let result = run(f.home, current, 'qa');
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`repository has no blessed worktree: ${foreign}`));
  assert.match(result.stderr, /run ponytail register from that repository or one of its worktrees/);

  result = run(f.home, foreign, 'register');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `blessed worktree: ${foreign}\nalready registered: ${foreign}\n`);
  assert.equal(run(f.home, current, 'qa').status, 0);
});

test('actual gitlinks permit references but a .gitmodules entry alone does not', t => {
  const f = fixture(t);
  const current = repository(f, 'current'); const foreign = repository(f, 'OtherProduct');
  configure(foreign, { repositoryUrls: [foreign] });
  commitConfiguration(foreign);
  write(current, 'example.txt', 'OtherProduct');
  write(current, '.gitmodules', `[submodule "dependency"]\npath = external/dependency\nurl = ${foreign}\n`);
  git(current, 'add', '.');
  assert.equal(run(f.home, current, 'qa').status, 4);
  git(current, 'update-index', '--add', '--cacheinfo', `160000,${git(foreign, 'rev-parse', 'HEAD')},external/dependency`);
  const result = run(f.home, current, 'qa');
  assert.equal(result.status, 0, result.stderr + result.stdout);
});

test('manifest readers identify direct dependencies across supported managers', t => {
  const f = fixture(t); const root = repository(f, 'current');
  const cases = [
    ['npm', 'package.json', '{"dependencies":{"alias":"npm:@example/real@^1"}}', ['npm:@example/real']],
    ['cargo', 'Cargo.toml', '[dependencies]\nrenamed = { package = "real-crate", version = "1" }\n', ['cargo:real-crate']],
    ['pip', 'pyproject.toml', '[project]\ndependencies = ["Example_Package>=1"]\n', ['pip:example-package']],
    ['pip', 'requirements.txt', 'example-package[extra]>=1; python_version > "3"\n', ['pip:example-package']],
    ['brew', 'Brewfile', 'tap "org/tools"\nbrew "org/tools/example"\n', ['brew:org/tools/example']],
    ['conda', 'environment.yml', 'dependencies:\n  - channel::example>=1\n  - pip:\n    - python-example==1\n', ['conda:example', 'pip:python-example']],
  ];
  for (const [manager, file, source, expected] of cases) {
    write(root, file, source); git(root, 'add', file);
    assert.deepEqual([...declaredDependencies(root, { manifests: [{ manager, path: file }] })], expected);
  }
});

test('malformed metadata and untracked dependency declarations fail explicitly', t => {
  const f = fixture(t); const root = repository(f, 'current');
  configure(root, { unexpected: true });
  assert.equal(run(f.home, root, 'validate').status, 1);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, '.agents/config/ponytail.json'))); delete metadata.unexpected;
  write(root, '.agents/config/ponytail.json', JSON.stringify(metadata));
  configure(root, { manifests: [{ manager: 'npm', path: 'package.json' }] });
  write(root, 'package.json', '{}');
  const result = run(f.home, root, 'qa');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tracked regular file/);
});

test('reference scope and diagnostic format ignore Git grep user preferences', t => {
  const f = fixture(t); const current = repository(f, 'current');
  repository(f, 'OtherProduct'); const helper = repository(f, 'helper');
  configure(helper, { repositoryUrls: [helper] });
  write(helper, 'foreign.txt', 'OtherProduct'); git(helper, 'add', '.');
  git(helper, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '--no-verify', '-qm', 'helper content');
  git(current, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', helper, 'external/helper');
  git(current, 'config', 'grep.recurseSubmodules', 'true');
  let result = run(f.home, current, 'qa');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  git(current, 'config', 'color.grep', 'always');
  git(current, 'config', 'grep.column', 'true');
  write(current, 'parent.txt', 'OtherProduct'); git(current, 'add', 'parent.txt');
  result = run(f.home, current, 'qa');
  assert.equal(result.status, 4, result.stderr + result.stdout);
  assert.match(result.stdout, /parent.txt:1: forbidden reference/);
});
