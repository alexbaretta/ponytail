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

function distributableFiles() {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-npm-cache-'));
  try {
    const result = spawnSync(
      'npm',
      ['pack', '--dry-run', '--json', '--ignore-scripts'],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, npm_config_cache: cache },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.length, 1);
    return report[0].files.map((file) => file.path);
  } finally {
    fs.rmSync(cache, { recursive: true, force: true });
  }
}

test('distribution contains the live-development harness only', () => {
  const files = distributableFiles();
  for (const required of [
    'LICENSE',
    'NOTICE',
    'README.md',
    'config/AGENTS.md',
    'cli/audit_pm.sh',
    'cli/bug_stats.sh',
    'cli/plan_pdf.sh',
    'cli/plan_stats.sh',
    'cli/project_journal.sh',
    'generated/registry.json',
    'registry.tsv',
    'scripts/install-to-codex.sh',
    'scripts/install-cli.sh',
    'scripts/setup-project-journal.sh',
    'scripts/project-journal.sql',
    'skills/build-impact/SKILL.md',
    'skills/build-impact/scripts/build-impact.js',
    'skills/ponytail/SKILL.md',
    'versioned-data-contracts.json',
    'ponytail-journal.json',
  ]) {
    assert.ok(files.includes(required), `missing ${required}`);
  }
  for (const prohibited of [
    /^AGENTS\.md$/,
    /^benchmarks\//,
    /^examples\//,
    /gemini/i,
    /git-write-escalation/,
    /ponytail-gain/,
    /skills\/ponytail-help/,
    /^tmp\//,
  ]) {
    assert.ok(files.every((file) => !prohibited.test(file)), `included ${prohibited}`);
  }
});
