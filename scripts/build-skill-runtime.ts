#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';

// Portable skill runtime is compiler-generated; TypeScript remains authoritative.
const root = path.resolve(__dirname, '../..');
const relative = 'skills/plan-execution/scripts/obligations.js';
const compiled = fs.readFileSync(path.join(root, 'dist', relative), 'utf8');
const sourceHeader = fs.readFileSync(path.join(root, 'skills/plan-execution/scripts/obligations.ts'), 'utf8')
  .split('\n').slice(0, 3).join('\n');
const generated = `${sourceHeader}\n// Generated from skills/plan-execution/scripts/obligations.ts by npm run build.\n${compiled.replace(/^#![^\n]*\n/, '')}`;
const output = path.join(root, relative);
const argv = process.argv.slice(2);
if (argv.length === 0) {
  fs.writeFileSync(output, generated);
} else if (argv.length === 1 && argv[0] === '--check') {
  if (fs.readFileSync(output, 'utf8') !== generated) {
    process.stderr.write(`${relative} differs from its compiled TypeScript owner; run npm run build\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write('Usage: build-skill-runtime [--check]\n');
  process.exitCode = 2;
}
