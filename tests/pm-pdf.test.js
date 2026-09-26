#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const sourceRoot = path.join(__dirname, '..');
const ponytail = path.join(sourceRoot, 'cli', 'ponytail');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function write(root, relative, text) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return target;
}

function fixture() {
  const root = temporaryDirectory('ponytail-pm-pdf');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  write(root, '.agents/config/codex-execpolicy.json', '{"schemaVersion":1,"safe":[],"unsafe":[]}\n');
  write(root, '.agents/config/ponytail.json', `${JSON.stringify({
    components: [],
    dependencies: [],
    exceptions: [],
    manifests: [],
    name: 'fixture',
    names: [],
    packages: [],
    repositoryUrls: [],
    schemaVersion: 2,
  })}\n`);
  write(root, '.agents/config/project/pm-pdf.json', `${JSON.stringify({
    schemaVersion: 1,
    outputDirectory: 'tmp/pm-pdf',
    collections: {
      requirements: {
        root: 'pm/requirements',
        title: 'Fixture Requirements',
        excludedDirectories: ['releases'],
        pandocVariables: ['geometry:landscape', 'fontsize:9pt'],
      },
      uat: {
        root: 'pm/uat',
        title: 'Fixture UAT',
        excludedDirectories: ['releases'],
        pandocVariables: [],
      },
    },
  }, null, 2)}\n`);
  write(root, 'pm/requirements/index.md', '# Index\n\n[Second](second.md#details)\n\n[First](first.md)\n');
  write(root, 'pm/requirements/first.md', '# First\n\nRun `scripts/tool.py` now.\n\n# First Appendix\n');
  write(root, 'pm/requirements/second.md', '# Second\n\n```md\n## Fake\n```\n\n## Details\n\n[Back](index.md)\n');
  write(root, 'pm/requirements/releases/evidence.md', '# Release evidence\n');
  write(root, 'pm/uat/index.md', '# UAT\n');
  assert.equal(spawnSync('git', ['add', '.'], { cwd: root }).status, 0);
  const commit = spawnSync(
    'git',
    ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'],
    { cwd: root },
  );
  assert.equal(commit.status, 0, commit.stderr?.toString());
  return fs.realpathSync(root);
}

function environment(root, home = temporaryDirectory('ponytail-home')) {
  const bin = path.join(root, 'bin');
  const stdin = path.join(root, 'pandoc-stdin');
  const args = path.join(root, 'pandoc-args');
  write(root, 'bin/pandoc', `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$PM_PDF_ARGS"
cat > "$PM_PDF_STDIN"
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == '--output' ]]; then
    mkdir -p "$(dirname "$2")"
    printf 'PDF' > "$2"
    break
  fi
  shift
done
`);
  write(root, 'bin/xelatex', '#!/usr/bin/env bash\nexit 0\n');
  fs.chmodSync(path.join(bin, 'pandoc'), 0o755);
  fs.chmodSync(path.join(bin, 'xelatex'), 0o755);
  write(home, '.ponytail/config.json', `${JSON.stringify({
    schemaVersion: 1,
    sourceRoot,
    projects: [{ root: fs.realpathSync(root), blessedWorktree: fs.realpathSync(root) }],
  })}\n`);
  return {
    env: {
      ...process.env,
      HOME: home,
      PATH: `${bin}:${process.env.PATH}`,
      PM_PDF_ARGS: args,
      PM_PDF_STDIN: stdin,
    },
    args,
    stdin,
  };
}

test('ponytail pm pdf renders configured collections in index order', () => {
  const root = fixture();
  const { env, args, stdin } = environment(root);
  const result = spawnSync(ponytail, ['pm', 'pdf', 'requirements'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${path.join(root, 'tmp/pm-pdf/requirements.pdf')}\n`);
  const source = fs.readFileSync(stdin, 'utf8');
  assert.ok(source.startsWith('\\clearpage\n'));
  assert.ok(source.indexOf('# Second') < source.indexOf('# First'));
  assert.match(source, /\\clearpage\n# Second \{#doc-second\}/);
  assert.match(source, /\\clearpage\n# First \{#doc-first\}/);
  assert.match(source, /\\clearpage\n# First Appendix \{#doc-first--first-appendix\}/);
  assert.match(source, /\[Second\]\(#doc-second--details\)/);
  assert.match(source, /\[Back\]\(#doc-index\)/);
  assert.doesNotMatch(source, /doc-second--fake/);
  assert.match(source, /\\path\{scripts\/tool\.py\}\\  now/);
  const pandocArguments = fs.readFileSync(args, 'utf8');
  assert.match(pandocArguments, /--metadata=title:Fixture Requirements/);
  assert.match(pandocArguments, /--variable=subtitle:Commit: \\texttt\{[0-9a-f]+\} \\par Branch: \\texttt\{/);
  assert.match(pandocArguments, /--variable=geometry:landscape/);
  assert.match(pandocArguments, /--variable=fontsize:9pt/);
  assert.ok(fs.existsSync(path.join(root, 'tmp/pm-pdf/requirements.pdf')));
});

test('ponytail pm pdf all renders every configured collection', () => {
  const root = fixture();
  const { env } = environment(root);
  const result = spawnSync(ponytail, ['pm', 'pdf', 'all', '--output-dir', 'tmp/editions'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    `${path.join(root, 'tmp/editions/requirements.pdf')}\n${path.join(root, 'tmp/editions/uat.pdf')}\n`,
  );
  assert.ok(fs.existsSync(path.join(root, 'tmp/editions/requirements.pdf')));
  assert.ok(fs.existsSync(path.join(root, 'tmp/editions/uat.pdf')));
});

test('ponytail pm pdf rejects unlisted pages and invalid configuration paths', () => {
  const root = fixture();
  const { env } = environment(root);
  write(root, 'pm/requirements/orphan.md', '# Orphan\n');
  let result = spawnSync(ponytail, ['pm', 'pdf', 'requirements'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Pages not linked/);

  fs.rmSync(path.join(root, 'pm/requirements/orphan.md'));
  const configPath = path.join(root, '.agents/config/project/pm-pdf.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.collections.requirements.root = '../outside';
  fs.writeFileSync(configPath, `${JSON.stringify(config)}\n`);
  result = spawnSync(ponytail, ['pm', 'pdf', 'requirements'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /repository-relative path/);
});

test('ponytail pm pdf reports missing render dependencies', () => {
  const root = fixture();
  const home = temporaryDirectory('ponytail-home');
  const { env } = environment(root, home);
  env.PATH = '/usr/bin:/bin';
  const result = spawnSync(ponytail, ['pm', 'pdf', 'requirements'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pandoc is required/);
});
