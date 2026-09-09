// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

test('installed TSTS validates registration and checks real TypeScript contracts', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-tsts-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const home = path.join(temporary, 'home'); fs.mkdirSync(home);
  const project = path.join(temporary, 'project'); fs.mkdirSync(project);
  const bin = path.join(home, 'bin');
  const env = { ...process.env, HOME: home };
  const run = (command, args) => spawnSync(command, args, { cwd: project, env, encoding: 'utf8', input: 'n\n' });
  let result = run(path.join(root, 'scripts/install-cli.sh'), ['--bin-dir', bin, 'ponytail', 'tsts']);
  assert.equal(result.status, 0, result.stderr);
  const executable = path.join(bin, 'tsts');
  assert.equal(fs.realpathSync(executable), path.join(root, 'cli/tsts'));
  assert.equal(run(executable, ['--help']).status, 2);
  assert.equal(run('git', ['init', '-q']).status, 0);
  assert.equal(run(executable, ['--help']).status, 3);
  assert.equal(run(path.join(bin, 'ponytail'), ['register']).status, 0);
  assert.equal(run('git', ['add', '.agents/config/ponytail.json', '.agents/config/codex-execpolicy.json']).status, 0);
  assert.equal(run('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'register project']).status, 0);
  assert.equal(run(executable, ['--help']).status, 0);
  fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, types: [] }, files: ['contract.ts'] }));
  fs.writeFileSync(path.join(project, 'contract.ts'), "export type Command = { kind: 'alpha'; value: string } | { kind: 'beta'; count: number };\n");
  result = run(executable, ['--project', 'tsconfig.json']);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /no violations/);
  fs.writeFileSync(path.join(project, 'contract.ts'), "export type Command = { kind: 'same'; value: string } | { kind: 'same'; count: number };\n");
  result = run(executable, ['--project', 'tsconfig.json']);
  assert.equal(result.status, 1, result.stderr + result.stdout);
  assert.match(result.stdout, /discriminator/);
});
