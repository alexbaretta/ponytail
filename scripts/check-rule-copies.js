#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const copyright = `<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->`;
const targets = [
  ['.cursor/rules/ponytail.mdc', `---
description: Ponytail portable engineering policy.
globs:
alwaysApply: true
---`],
  ['.windsurf/rules/ponytail.md', ''],
  ['.clinerules/ponytail.md', ''],
  ['.agents/rules/ponytail.md', ''],
  ['.qoder/rules/ponytail.md', ''],
  ['.github/copilot-instructions.md', ''],
  ['.kiro/steering/ponytail.md', `---
title: Ponytail portable engineering policy
inclusion: always
---`],
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
    .replace(/\r\n/g, '\n');
}

function canonicalPolicy() {
  return read('skills/ponytail/SKILL.md')
    .replace(/^---\n[\s\S]*?\n---\n*/, '')
    .replace(/^<!--\n[\s\S]*?\n-->\n*/, '')
    .trim();
}

function render(frontmatter) {
  return [frontmatter, copyright, canonicalPolicy()]
    .filter(Boolean)
    .join('\n\n') + '\n';
}

let failed = false;
for (const [relativePath, frontmatter] of targets) {
  const expected = render(frontmatter);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, relativePath), expected);
  } else if (read(relativePath) !== expected) {
    console.error(`${relativePath} drifted from skills/ponytail/SKILL.md`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(process.argv.includes('--write')
  ? `Generated ${targets.length} rule copies from skills/ponytail/SKILL.md.`
  : `${targets.length} rule copies match skills/ponytail/SKILL.md.`);
