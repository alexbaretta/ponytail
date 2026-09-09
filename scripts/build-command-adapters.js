#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { enabled, readRegistry } = require('./registry');

const root = path.join(__dirname, '..');

function parseCommand(source) {
  const command = {};
  for (const line of fs.readFileSync(path.join(root, source), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^(description|prompt) = (".*")$/);
    if (match) command[match[1]] = JSON.parse(match[2]);
  }
  if (!command.description || !command.prompt) throw new Error(`invalid command source: ${source}`);
  return command;
}

function renderOpenCode(entry) {
  const command = parseCommand(entry.source);
  const prompt = command.prompt.replaceAll('{{args}}', '$ARGUMENTS');
  return `---
description: ${JSON.stringify(command.description)}
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

${prompt}
`;
}

function commandEntries() {
  return enabled(readRegistry(), 'command').filter((entry) => entry.hosts.includes('opencode'));
}

function run(write) {
  let failed = false;
  for (const entry of commandEntries()) {
    const outputPath = path.join(root, '.opencode', 'command', `${entry.name}.md`);
    const expected = renderOpenCode(entry);
    if (write) {
      fs.writeFileSync(outputPath, expected);
    } else if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== expected) {
      console.error(`${path.relative(root, outputPath)} is stale`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`${write ? 'Generated' : 'Validated'} ${commandEntries().length} OpenCode commands.`);
}

module.exports = { commandEntries, parseCommand, renderOpenCode };

if (require.main === module) run(process.argv.includes('--write'));
