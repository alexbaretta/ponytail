#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';

// Preserve established launch paths with compiler output from canonical TypeScript.
const root = path.resolve(__dirname, '../..');
const sources: readonly string[] = [
  'skills/plan-execution/scripts/obligations.ts',
  'src/rolling-campaign.ts',
  'src/rolling-worktrees.ts',
  'src/rolling-campaign-store.ts',
  'src/project-index-database.ts',
  'src/plan-input-queue.ts',
  'src/plan-input-command.ts',
  'src/plan-input.ts',
  'src/campaign-configuration.ts',
  'src/campaign-plan-metadata.ts',
  'src/campaign-plan-sources.ts',
  'src/campaign-scope.ts',
  'src/campaign-plan-contents.ts',
  'src/campaign-graph.ts',
  'src/campaign-dependencies.ts',
  'skills/plan-execution/scripts/tasklet-statuses.ts',
  'skills/plan-execution/scripts/tasklet-metadata.ts',
  'skills/plan-execution/scripts/tasklet-graph.ts',
  'skills/plan-execution/scripts/ready-tasklets.ts',
  'skills/plan-execution/scripts/sprint-metadata.ts',
  'skills/plan-execution/scripts/sprint-graph.ts',
  'skills/plan-execution/scripts/ready-sprints.ts'
];
const argv = process.argv.slice(2);
if (!(argv.length === 0 || argv.length === 1 && argv[0] === '--check')) {
  process.stderr.write('Usage: build-runtime [--check]\n');
  process.exitCode = 2;
} else {
  for (const source of sources) {
    const relative = source.replace(/\.ts$/, '.js');
    const compiled = fs.readFileSync(path.join(root, 'dist', relative), 'utf8');
    const sourceText = fs.readFileSync(path.join(root, source), 'utf8');
    const sourceHeader = sourceText.split('\n').slice(0, sourceText.startsWith('#!') ? 3 : 2).join('\n');
    const generated = `${sourceHeader}\n// Generated from ${source} by npm run build.\n${compiled.replace(/^#![^\n]*\n/, '')}`;
    const output = path.join(root, relative);
    if (argv.length === 0) fs.writeFileSync(output, generated);
    else if (fs.readFileSync(output, 'utf8') !== generated) {
      process.stderr.write(`${relative} differs from its compiled TypeScript owner; run npm run build\n`);
      process.exitCode = 1;
    }
  }
}
