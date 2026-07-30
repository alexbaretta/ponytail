#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { enabled, readRegistry } = require('./registry');

const root = path.join(__dirname, '..');
const homepage = 'https://github.com/alexbaretta/ponytail';
const copyright = `<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

`;
const entries = enabled(readRegistry(), 'skill')
  .filter((entry) => entry.hosts.includes('openclaw'));
const NAMES = entries.map((entry) => entry.name);
const DESCRIPTIONS = Object.fromEntries(entries.map((entry) => [entry.name, entry.reason]));

function sourceBody(name) {
  return fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/^\n?<!--[\s\S]*?-->\n?/, '')
    .replace(/^\n+/, '');
}

function render(name) {
  const description = DESCRIPTIONS[name];
  if (!description || description.length > 160 || description.includes('\n') || description.includes('"')) {
    throw new Error(`description for ${name} must be one line, no quotes, under 160 chars`);
  }
  return `---
name: ${name}
description: ${JSON.stringify(description)}
homepage: ${homepage}
license: MIT
---

${copyright}${sourceBody(name)}`;
}

function outPath(name) {
  return path.join(root, '.openclaw', 'skills', name, 'SKILL.md');
}

function copyResources(name) {
  const source = path.join(root, 'skills', name);
  const output = path.dirname(outPath(name));
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === 'SKILL.md' || entry.name === 'agents') continue;
    fs.cpSync(
      path.join(source, entry.name),
      path.join(output, entry.name),
      { recursive: true },
    );
  }
}

function build() {
  const outputRoot = path.join(root, '.openclaw', 'skills');
  for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !NAMES.includes(entry.name)) {
      throw new Error(`unregistered OpenClaw skill directory: ${entry.name}`);
    }
  }
  for (const name of NAMES) {
    const output = outPath(name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, render(name));
    copyResources(name);
    console.log('wrote', path.relative(root, output).replace(/\\/g, '/'));
  }
}

module.exports = { DESCRIPTIONS, NAMES, copyResources, outPath, render, sourceBody };

if (require.main === module) build();
