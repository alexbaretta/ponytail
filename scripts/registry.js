#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const registryPath = path.join(root, 'registry.tsv');

function parseRegistry(text) {
  const entries = [];
  const keys = new Set();

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length !== 6) throw new Error(`registry line ${index + 1} must have six fields`);
    const [kind, status, name, source, hostText, reason] = fields;
    if (!['skill', 'command'].includes(kind)) throw new Error(`invalid registry kind: ${kind}`);
    if (!['enabled', 'disabled'].includes(status)) throw new Error(`invalid registry status: ${status}`);
    const key = `${kind}:${name}`;
    if (keys.has(key)) throw new Error(`duplicate registry entry: ${key}`);
    keys.add(key);
    entries.push({ kind, status, name, source, hosts: hostText === '-' ? [] : hostText.split(','), reason });
  }

  return entries;
}

function readRegistry() {
  return parseRegistry(fs.readFileSync(registryPath, 'utf8'));
}

function enabled(entries, kind) {
  return entries.filter((entry) => entry.kind === kind && entry.status === 'enabled');
}

function validateProjectSkillNames(entries, names) {
  const bundled = new Set(enabled(entries, 'skill').map((entry) => entry.name));
  const seen = new Set();
  for (const name of names) {
    if (bundled.has(name)) throw new Error(`project skill collides with bundled skill: ${name}`);
    if (seen.has(name)) throw new Error(`project skill has multiple owners: ${name}`);
    seen.add(name);
  }
}

function validatePublishedNames(entries, kind, host, names) {
  const registered = new Set(
    enabled(entries, kind)
      .filter((entry) => entry.hosts.includes(host))
      .map((entry) => entry.name),
  );
  for (const name of names) {
    if (!registered.has(name)) throw new Error(`unregistered ${host} ${kind}: ${name}`);
  }
}

function validateRegistry(entries = readRegistry()) {
  for (const entry of entries) {
    if (/benchmark/i.test(`${entry.name} ${entry.source} ${entry.hosts.join(',')}`)) {
      throw new Error(`benchmark entry is prohibited: ${entry.name}`);
    }
    if (entry.status === 'enabled' && !fs.existsSync(path.join(root, entry.source))) {
      throw new Error(`enabled source is missing: ${entry.source}`);
    }
    if (entry.status === 'disabled' && entry.hosts.length > 0) {
      throw new Error(`disabled entry publishes hosts: ${entry.name}`);
    }
  }

  const skillDirectories = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  assertEqualNames(skillDirectories, enabled(entries, 'skill').map((entry) => entry.name), 'skill');

  const commandFiles = fs.readdirSync(path.join(root, 'commands'))
    .filter((name) => name.endsWith('.toml'))
    .map((name) => name.replace(/\.toml$/, ''))
    .sort();
  assertEqualNames(commandFiles, enabled(entries, 'command').map((entry) => entry.name), 'command');

  const projectSkillsPath = path.join(root, '.agents', 'skills');
  if (fs.existsSync(projectSkillsPath)) {
    validateProjectSkillNames(entries, fs.readdirSync(projectSkillsPath));
  }

  return entries;
}

function assertEqualNames(actual, expected, kind) {
  const expectedNames = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedNames)) {
    throw new Error(`${kind} sources must match the registry exactly`);
  }
}

module.exports = {
  enabled,
  parseRegistry,
  readRegistry,
  validateProjectSkillNames,
  validatePublishedNames,
  validateRegistry,
};

if (require.main === module) {
  const entries = validateRegistry();
  console.log(`Validated ${entries.length} registry entries.`);
}
