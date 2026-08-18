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
const planStats = path.join(root, 'cli', 'plan_stats.sh');
const planPdf = path.join(root, 'cli', 'plan_pdf.sh');
const bugStats = path.join(root, 'cli', 'bug_stats.sh');
const auditPm = path.join(root, 'cli', 'audit_pm.sh');
const installer = path.join(root, 'scripts', 'install-cli.sh');

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options });
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-cli-'));
  assert.equal(run('git', ['init', '-q'], { cwd: directory }).status, 0);
  return directory;
}

function write(directory, relativePath, contents = '') {
  const target = path.join(directory, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function cliEnvironment(home) {
  return { ...process.env, HOME: home, PATH: '/usr/bin:/bin' };
}

function commit(project, date, message = 'fixture') {
  const environment = {
    ...process.env,
    GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
    GIT_COMMITTER_DATE: `${date}T12:00:00Z`,
  };
  assert.equal(run('git', ['add', '.'], { cwd: project }).status, 0);
  const result = run(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', message],
    { cwd: project, env: environment },
  );
  assert.equal(result.status, 0, result.stderr);
}

test('CLI shell scripts are parse-safe', () => {
  for (const script of [planStats, planPdf, bugStats, auditPm, installer]) {
    assert.equal(run('bash', ['-n', script]).status, 0, script);
    const contents = fs.readFileSync(script, 'utf8');
    assert.match(contents, /^#!\/usr\/bin\/env bash\nset -euo pipefail\n/);
    assert.match(contents, /\nmain "\$@"\n$/);
  }
});

test('plan_pdf renders the manifest and optionally ordered sprints', () => {
  const project = fixture();
  const bin = path.join(project, 'bin');
  const pandoc = path.join(bin, 'pandoc');
  write(project, 'pm/plans/2026-08-17-example/plan.md', '# Plan\n');
  write(project, 'pm/plans/2026-08-17-example/sprints/S02.md', '# Two\n');
  write(project, 'pm/plans/2026-08-17-example/sprints/S01.md', '# One\n');
  write(project, 'bin/pandoc', `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${project}/pandoc-args"\nprintf 'PDF' > "\${@: -1}"\n`);
  fs.chmodSync(pandoc, 0o755);
  const env = { ...process.env, PATH: `${bin}:/usr/bin:/bin` };

  let result = run(planPdf, ['2026-08-17-example'], { cwd: project, env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'tmp/2026-08-17-example.pdf\n');
  assert.ok(fs.existsSync(path.join(project, 'tmp/2026-08-17-example.pdf')));
  assert.doesNotMatch(fs.readFileSync(path.join(project, 'pandoc-args'), 'utf8'), /S01\.md/);

  result = run(planPdf, ['--sprints', '2026-08-17-example', 'tmp/all.pdf'], {
    cwd: project,
    env,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    fs.readFileSync(path.join(project, 'pandoc-args'), 'utf8'),
    /plan\.md\n.*S01\.md\n.*S02\.md\n--output\ntmp\/all\.pdf/s,
  );
});

test('plan_pdf validates its plan, output, and renderer', () => {
  const project = fixture();
  write(project, 'pm/plans/2026-08-17-example/plan.md', '# Plan\n');
  assert.notEqual(run(planPdf, ['../example'], { cwd: project }).status, 0);
  assert.notEqual(run(planPdf, ['2026-08-17-example', 'tmp/plan.txt'], { cwd: project }).status, 0);
  const result = run(planPdf, ['2026-08-17-example'], {
    cwd: project,
    env: { ...process.env, PATH: '/usr/bin:/bin' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pandoc is required/);
});

test('audit_pm accepts the mandated PM structure', () => {
  const project = fixture();
  write(project, 'pm/plans/2026-08-17-example/plan.md', '# Plan\n');
  write(project, 'pm/plans/2026-08-17-example/sprints/S01.md', '# Sprint\n');
  write(project, 'pm/bugs/open/2026-08-17-example.md', '# Bug\n');

  const result = run(auditPm, [], { cwd: project });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, 'PM structure is compliant.\n');
});

test('audit_pm reports non-fixable structural deviations without mutation', () => {
  const project = fixture();
  write(project, 'pm/unexpected.md');
  write(project, 'pm/plans/2026-99-99-invalid/extra.md');
  write(project, 'pm/plans/2026-99-99-invalid/sprints/first.md');
  write(project, 'pm/bugs/triaged/bug.md');
  write(project, 'pm/bugs/open/2026-08-17-duplicate.md');
  write(project, 'pm/bugs/closed/2026-08-17-duplicate.md');

  const result = run(auditPm, [], { cwd: project });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unexpected entry under pm\//);
  assert.match(result.stdout, /invalid date prefix/);
  assert.match(result.stdout, /required plan manifest is missing/);
  assert.match(result.stdout, /expected a sprint file named SNN\.md/);
  assert.match(result.stdout, /unexpected entry under pm\/bugs/);
  assert.match(result.stdout, /same bug file exists in multiple lifecycle directories/);
  assert.ok(fs.existsSync(path.join(project, 'pm/plans/2026-99-99-invalid')));
});

test('audit_pm --fix date-prefixes tracked plans and bugs from oldest Git history', () => {
  const project = fixture();
  write(project, 'pm/plans/example/plan.md', '# Plan\n');
  write(project, 'pm/plans/example/sprints/S01.md', '# Sprint\n');
  write(project, 'pm/bugs/in_progress/example.md', '# Bug\n');
  commit(project, '2024-05-06', 'create PM records');
  fs.appendFileSync(path.join(project, 'pm/plans/example/plan.md'), 'updated\n');
  fs.appendFileSync(path.join(project, 'pm/bugs/in_progress/example.md'), 'updated\n');
  commit(project, '2025-07-08', 'update PM records');

  const result = run(auditPm, ['--fix'], { cwd: project });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /FIXED pm\/plans\/example -> pm\/plans\/2024-05-06-example/);
  assert.match(result.stdout, /FIXED pm\/bugs\/in_progress\/example\.md -> pm\/bugs\/in_progress\/2024-05-06-example\.md/);
  assert.ok(fs.existsSync(path.join(project, 'pm/plans/2024-05-06-example/plan.md')));
  assert.ok(fs.existsSync(path.join(project, 'pm/bugs/in_progress/2024-05-06-example.md')));
  assert.match(run('git', ['status', '--short'], { cwd: project }).stdout, /^R  pm\/plans\/example\/plan\.md -> pm\/plans\/2024-05-06-example\/plan\.md/m);
});

test('audit_pm --fix leaves untracked records and collisions unchanged', () => {
  const project = fixture();
  write(project, 'pm/plans/example/plan.md', '# Plan\n');
  write(project, 'pm/plans/example/sprints/S01.md', '# Sprint\n');
  write(project, 'pm/plans/2024-05-06-example/plan.md', '# Existing\n');
  write(project, 'pm/plans/2024-05-06-example/sprints/S01.md', '# Sprint\n');
  commit(project, '2024-05-06');
  write(project, 'pm/bugs/open/untracked.md', '# Bug\n');

  const result = run(auditPm, ['--fix'], { cwd: project });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /destination exists/);
  assert.match(result.stdout, /Git creation date unavailable/);
  assert.ok(fs.existsSync(path.join(project, 'pm/plans/example')));
  assert.ok(fs.existsSync(path.join(project, 'pm/bugs/open/untracked.md')));
});

test('audit_pm --dryrun previews fixes with or without --fix', () => {
  const project = fixture();
  write(project, 'pm/plans/example/plan.md', '# Plan\n');
  write(project, 'pm/plans/example/sprints/S01.md', '# Sprint\n');
  write(project, 'pm/bugs/open/example.md', '# Bug\n');
  commit(project, '2024-05-06');

  for (const args of [
    ['--dryrun'],
    ['--fix', '--dryrun'],
    ['--dryrun', '--fix'],
  ]) {
    const result = run(auditPm, args, { cwd: project });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WOULD FIX pm\/plans\/example -> pm\/plans\/2024-05-06-example/);
    assert.match(result.stdout, /WOULD FIX pm\/bugs\/open\/example\.md -> pm\/bugs\/open\/2024-05-06-example\.md/);
    assert.doesNotMatch(result.stdout, /^FIXED /m);
    assert.equal(run('git', ['status', '--short'], { cwd: project }).stdout, '');
    assert.ok(fs.existsSync(path.join(project, 'pm/plans/example')));
    assert.ok(fs.existsSync(path.join(project, 'pm/bugs/open/example.md')));
  }
});

test('plan_stats counts open and done task lines from the exact plan', () => {
  const project = fixture();
  write(project, 'pm/plans/2026-08-17-example/plan.md', '### [ ] First\n### [DONE] Second\n');
  write(project, 'pm/plans/2026-08-17-example/sprints/S01.md', '### [ ] Third\n');
  write(project, 'pm/plans/2026-08-17-other/plan.md', '### [DONE] Other\n');
  fs.mkdirSync(path.join(project, 'nested'));
  assert.equal(run('git', ['add', '.'], { cwd: project }).status, 0);

  const result = run(planStats, ['2026-08-17-example'], {
    cwd: path.join(project, 'nested'),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'open: 2\ndone: 1\n');
});

test('plan_stats rejects missing and non-basename plan names', () => {
  const project = fixture();
  assert.notEqual(run(planStats, ['missing'], { cwd: project }).status, 0);
  assert.notEqual(run(planStats, ['../other'], { cwd: project }).status, 0);
});

test('bug_stats counts lifecycle files on or after an inclusive date', () => {
  const project = fixture();
  write(project, 'pm/bugs/open/2026-01-01-first.md');
  write(project, 'pm/bugs/open/2026-02-01-second.md');
  write(project, 'pm/bugs/in_progress/2026-02-15-third.md');
  write(project, 'pm/bugs/closed/2025-12-31-fourth.md');
  write(project, 'pm/bugs/closed/not-a-bug.md');

  const compact = run(bugStats, ['20260201'], { cwd: project });
  assert.equal(compact.status, 0, compact.stderr);
  assert.equal(compact.stdout, 'open: 1\nin_progress: 1\nclosed: 0\n');

  const all = run(bugStats, [], { cwd: project });
  assert.equal(all.status, 0, all.stderr);
  assert.equal(all.stdout, 'open: 2\nin_progress: 1\nclosed: 1\n');
});

test('bug_stats validates its date argument', () => {
  const project = fixture();
  assert.notEqual(run(bugStats, ['2026/01/01'], { cwd: project }).status, 0);
  assert.notEqual(run(bugStats, ['2026-13-01'], { cwd: project }).status, 0);
  assert.notEqual(run(bugStats, ['2026-00-01'], { cwd: project }).status, 0);
});

test('CLI installer installs all tools and verifies owned updates', () => {
  const home = fixture();
  const options = { env: cliEnvironment(home), input: 'n\n' };
  let result = run(installer, [], options);
  assert.equal(result.status, 0, result.stderr);

  const bin = path.join(home, '.local', 'bin');
  for (const tool of ['audit_pm.sh', 'bug_stats.sh', 'plan_pdf.sh', 'plan_stats.sh']) {
    assert.ok(fs.statSync(path.join(bin, tool)).mode & 0o100);
  }
  assert.equal(run(installer, ['--check'], { env: cliEnvironment(home) }).status, 0);

  fs.writeFileSync(path.join(bin, 'plan_stats.sh'), 'owned drift\n');
  result = run(installer, ['plan_stats.sh'], options);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(bin, 'plan_stats.sh'), 'utf8'),
    fs.readFileSync(planStats, 'utf8'),
  );
});

test('CLI installer supports selection and refuses unowned collisions', () => {
  const selectedHome = fixture();
  let result = run(installer, ['plan_stats.sh'], {
    env: cliEnvironment(selectedHome),
    input: 'n\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(selectedHome, '.local/bin/plan_stats.sh')));
  assert.ok(!fs.existsSync(path.join(selectedHome, '.local/bin/bug_stats.sh')));

  const collisionHome = fixture();
  write(collisionHome, '.local/bin/plan_stats.sh', 'foreign\n');
  result = run(installer, ['plan_stats.sh'], {
    env: cliEnvironment(collisionHome),
    input: 'n\n',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to replace unowned CLI path/);

  fs.rmSync(path.join(collisionHome, '.local/bin/plan_stats.sh'));
  fs.symlinkSync(planStats, path.join(collisionHome, '.local/bin/plan_stats.sh'));
  result = run(installer, ['plan_stats.sh'], {
    env: cliEnvironment(collisionHome),
    input: 'n\n',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to replace CLI symlink/);
});

test('CLI installer prompts for or explicitly updates Bash PATH', () => {
  const promptedHome = fixture();
  let result = run(installer, [], {
    env: cliEnvironment(promptedHome),
    input: 'y\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(promptedHome, '.bashrc'), 'utf8'), /Added by Ponytail CLI installer/);

  const explicitHome = fixture();
  result = run(installer, ['--update-shell-path'], {
    env: cliEnvironment(explicitHome),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(explicitHome, '.bashrc'), 'utf8'), /Added by Ponytail CLI installer/);
});

test('CLI installer dry-run does not modify the target home', () => {
  const home = fixture();
  const result = run(installer, ['--dry-run'], { env: cliEnvironment(home) });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(home, '.local')));
});
