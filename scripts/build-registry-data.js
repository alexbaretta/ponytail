#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { readRegistry, validateRegistry } = require('./registry');

const root = path.join(__dirname, '..');
const outputPath = path.join(root, 'generated', 'registry.json');

function render() {
  validateRegistry();
  return JSON.stringify({
    $comment: 'Copyright (c) 2026 Alex Baretta. Licensed under the MIT License.',
    entries: readRegistry(),
  }, null, 2) + '\n';
}

function run(write) {
  const expected = render();
  if (write) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, expected);
  } else if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== expected) {
    console.error('generated/registry.json is stale');
    process.exit(1);
  }
  console.log(`${write ? 'Generated' : 'Validated'} generated/registry.json.`);
}

module.exports = { outputPath, render };

if (require.main === module) run(process.argv.includes('--write'));
