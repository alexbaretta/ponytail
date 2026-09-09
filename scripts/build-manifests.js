#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { enabled, readRegistry } = require('./registry');

const root = path.join(__dirname, '..');
const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const repository = packageMetadata.repository.url
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');
const jsonTargets = [
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.devin-plugin/plugin.json',
  '.github/plugin/plugin.json',
  '.qoder-plugin/plugin.json',
];
const marketplaceTargets = [
  '.claude-plugin/marketplace.json',
  '.github/plugin/marketplace.json',
];

function synchronizeMetadata(document) {
  if ('name' in document) document.name = 'ponytail';
  if ('version' in document) document.version = packageMetadata.version;
  if ('description' in document) document.description = packageMetadata.description;
  if ('homepage' in document) document.homepage = packageMetadata.homepage;
  if ('repository' in document) document.repository = repository;
  return document;
}

function expectedJson(relativePath) {
  const document = synchronizeMetadata(
    JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')),
  );
  if (marketplaceTargets.includes(relativePath)) {
    for (const plugin of document.plugins || []) synchronizeMetadata(plugin);
  }
  return JSON.stringify(document, null, 2) + '\n';
}

function expectedHermesManifest() {
  const entries = readRegistry();
  const commands = enabled(entries, 'command')
    .filter((entry) => entry.hosts.includes('hermes'))
    .map((entry) => `  - ${entry.name}`)
    .join('\n');
  const skills = enabled(entries, 'skill')
    .filter((entry) => entry.hosts.includes('hermes'))
    .map((entry) => `  - ${entry.name}`)
    .join('\n');
  return `# Copyright (c) 2026 DietrichGebert.
# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.
name: ponytail
version: ${packageMetadata.version}
description: ${packageMetadata.description}
author: ${packageMetadata.author.name}
provides_hooks:
  - pre_llm_call
  - pre_gateway_dispatch
provides_commands:
${commands}
provides_skills:
${skills}
`;
}

function synchronizeFile(relativePath, expected, write) {
  const target = path.join(root, relativePath);
  if (write) fs.writeFileSync(target, expected);
  else if (fs.readFileSync(target, 'utf8') !== expected) throw new Error(`${relativePath} is stale`);
}

function run(write) {
  for (const relativePath of [...jsonTargets, ...marketplaceTargets]) {
    synchronizeFile(relativePath, expectedJson(relativePath), write);
  }
  const mcpPath = 'ponytail-mcp/package.json';
  const mcp = JSON.parse(fs.readFileSync(path.join(root, mcpPath), 'utf8'));
  mcp.version = packageMetadata.version;
  synchronizeFile(mcpPath, JSON.stringify(mcp, null, 2) + '\n', write);
  synchronizeFile('plugin.yaml', expectedHermesManifest(), write);
  console.log(`${write ? 'Generated' : 'Validated'} repeated manifest metadata.`);
}

module.exports = { expectedHermesManifest, expectedJson, jsonTargets, marketplaceTargets };

if (require.main === module) {
  try {
    run(process.argv.includes('--write'));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
