#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('root npm test delegates only to the core suite', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts.test, 'npm run test:core');
  assert.match(packageJson.scripts['test:core'], /npm test --prefix pi-extension/);
  assert.match(packageJson.scripts['test:core'], /npm test --prefix ponytail-mcp/);
  assert.doesNotMatch(packageJson.scripts['test:core'], /benchmark/);
  assert.equal(packageJson.scripts['test:benchmarks'], 'node --test benchmarks/*.test.js');
  for (const file of fs.readdirSync(path.join(root, 'tests'))) {
    assert.doesNotMatch(file, /behavior|correctness|benchmark/i);
  }
});

test('CI installs MCP dependencies before root npm test', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');

  assert.match(workflow, /npm install --prefix ponytail-mcp/);
  assert.ok(
    workflow.indexOf('npm install --prefix ponytail-mcp') < workflow.indexOf('npm test'),
    'MCP dependencies must be installed before the root test command runs',
  );
  assert.doesNotMatch(workflow, /setup-python|pip install|pandas|benchmark/i);
});
