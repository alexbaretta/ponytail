#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  BuildImpactError,
  parseProjectConfig,
  parseQueryResult,
  queryBuildImpact,
} = require('../skills/build-impact/scripts/build-impact');

const cli = path.join(__dirname, '..', 'skills', 'build-impact', 'scripts', 'build-impact.js');

function input(relativePath, kind = 'file') {
  return { kind, path: relativePath };
}

function target(name, tsconfig) {
  return {
    name,
    buildCommand: `build ${name}`,
    tsconfig,
    configurationInputs: ['tsconfig.base.json'],
    additionalInputs: [input(`apps/${name}/public`, 'directory')],
  };
}

function projectConfig(adapters, globalInputs = []) {
  return parseProjectConfig({
    version: 1,
    buildImpact: { version: 1, globalInputs, adapters },
  });
}

function writeFixtureFile(root, relativePath, contents = '') {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

function installFakeTypescript(root) {
  writeFixtureFile(root, 'node_modules/typescript/package.json', JSON.stringify({
    name: 'typescript',
    version: '0.0.0-fixture',
  }));
  writeFixtureFile(root, 'node_modules/typescript/bin/tsc', `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const configPath = args[args.indexOf('--project') + 1];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
for (const file of config.fixtureFiles || []) {
  process.stdout.write(path.resolve(path.dirname(configPath), file) + '\\n');
}
`);
}

function writeCustomAdapter(root, relativePath, source) {
  writeFixtureFile(root, relativePath, `#!/usr/bin/env node
const fs = require('node:fs');
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
${source}
`);
}

function withFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-build-impact-'));
  try {
    installFakeTypescript(root);
    writeFixtureFile(root, 'tsconfig.base.json', '{}');
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('configuration requires exact versioned adapter and target ownership', () => {
  assert.throws(
    () => parseProjectConfig({
      version: 1,
      buildImpact: {
        version: 1,
        adapters: [
          { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
          { type: 'custom', command: ['native-impact'], targets: [{ name: 'backend', buildCommand: 'native' }] },
        ],
      },
    }),
    /multiple owners: backend/,
  );
  assert.throws(
    () => parseProjectConfig({ version: 1, buildImpact: { version: 1, adapters: [], extra: true } }),
    /unknown field: extra/,
  );
  assert.throws(
    () => parseProjectConfig({ version: 2, buildImpact: { version: 1, adapters: [] } }),
    /version must be 1/,
  );
});

test('durable build-impact contracts have exact V1 reader owners', () => {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'versioned-data-contracts.json'),
    'utf8',
  ));
  const implementation = require('../skills/build-impact/scripts/build-impact');
  const families = new Map(manifest.families.map((family) => [family.id, family]));
  for (const id of [
    'build-impact-project-config',
    'build-impact-custom-request',
    'build-impact-custom-result',
    'build-impact-query-result',
  ]) {
    const family = families.get(id);
    assert.deepEqual(family.versions, ['V1']);
    assert.deepEqual(family.supportedReadVersions, ['V1']);
    assert.equal(family.currentVersion, 'V1');
    assert.ok(implementation[family.implementation.readerRegistryExport].V1);
  }
});

test('TypeScript adapter reports compiler and configured inputs only', () => withFixture((root) => {
  writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({
    fixtureFiles: ['src/index.ts', '../../packages/shared/src/value.ts'],
  }));
  writeFixtureFile(root, 'apps/backend/README.md');
  const config = projectConfig([
    { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
  ]);

  const source = queryBuildImpact(config, root, ['apps/backend/src/index.ts']);
  assert.deepEqual(source.affectedTargets.map(({ name }) => name), ['backend']);
  assert.equal(source.status, 'ok');

  const shared = queryBuildImpact(config, root, ['packages/shared/src/value.ts']);
  assert.deepEqual(shared.affectedTargets.map(({ name }) => name), ['backend']);

  const asset = queryBuildImpact(config, root, ['apps/backend/public/logo.svg']);
  assert.deepEqual(asset.affectedTargets.map(({ name }) => name), ['backend']);

  const baseConfig = queryBuildImpact(config, root, ['tsconfig.base.json']);
  assert.deepEqual(baseConfig.affectedTargets.map(({ name }) => name), ['backend']);

  const documentation = queryBuildImpact(config, root, ['apps/backend/README.md']);
  assert.deepEqual(documentation.affectedTargets, []);
  assert.deepEqual(documentation.indeterminateTargets, []);
}));

test('TypeScript adapter requires a pre-deletion query for unmatched missing paths', () =>
  withFixture((root) => {
    writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({
      fixtureFiles: ['src/deleted.ts'],
    }));
    writeFixtureFile(root, 'apps/backend/src/deleted.ts');
    const config = projectConfig([
      { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
    ]);

    const beforeDeletion = queryBuildImpact(config, root, ['apps/backend/src/deleted.ts']);
    assert.deepEqual(beforeDeletion.affectedTargets.map(({ name }) => name), ['backend']);

    fs.rmSync(path.join(root, 'apps/backend/src/deleted.ts'));
    writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({ fixtureFiles: [] }));
    const afterDeletion = queryBuildImpact(config, root, ['apps/backend/src/deleted.ts']);
    assert.equal(afterDeletion.status, 'indeterminate');
    assert.match(afterDeletion.indeterminateTargets[0].reason, /prior TypeScript inputs/);
  }));

test('global inputs affect every configured target', () => withFixture((root) => {
  writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({ fixtureFiles: [] }));
  writeCustomAdapter(root, 'scripts/native-impact.js', `
process.stdout.write(JSON.stringify({
  version: 1,
  status: 'ok',
  affectedTargets: [],
  indeterminateTargets: [],
  error: null
}));
`);
  const config = projectConfig([
    { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
    {
      type: 'custom',
      command: [process.execPath, 'scripts/native-impact.js'],
      targets: [{ name: 'native-addon', buildCommand: 'build native' }],
    },
  ], [input('pnpm-lock.yaml')]);

  const result = queryBuildImpact(config, root, ['pnpm-lock.yaml']);
  assert.deepEqual(result.affectedTargets.map(({ name }) => name), ['backend', 'native-addon']);
}));

test('dispatcher composes TypeScript and multiple custom adapters', () => withFixture((root) => {
  writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({
    fixtureFiles: ['src/index.ts'],
  }));
  writeFixtureFile(root, 'README.md');
  writeFixtureFile(root, 'native/addon.cc');
  writeCustomAdapter(root, 'scripts/cpp-impact.js', `
const changedFiles = request.changedFiles.filter((file) => file.startsWith('native/'));
process.stdout.write(JSON.stringify({
  version: 1,
  status: 'ok',
  affectedTargets: changedFiles.length === 0 ? [] : [{ name: 'native-addon', changedFiles }],
  indeterminateTargets: [],
  error: null
}));
`);
  writeCustomAdapter(root, 'scripts/docs-impact.js', `
process.stdout.write(JSON.stringify({
  version: 1,
  status: 'ok',
  affectedTargets: [],
  indeterminateTargets: [],
  error: null
}));
`);
  const config = projectConfig([
    { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
    {
      type: 'custom',
      command: [process.execPath, 'scripts/cpp-impact.js'],
      targets: [{ name: 'native-addon', buildCommand: 'build native' }],
    },
    {
      type: 'custom',
      command: [process.execPath, 'scripts/docs-impact.js'],
      targets: [{ name: 'docs-bundle', buildCommand: 'build docs' }],
    },
  ]);

  const result = queryBuildImpact(
    config,
    root,
    ['apps/backend/src/index.ts', 'native/addon.cc', 'README.md'],
  );
  assert.deepEqual(result.affectedTargets.map(({ name }) => name), ['backend', 'native-addon']);
  assert.deepEqual(result.indeterminateTargets, []);
}));

test('one failed adapter preserves successful target results', () => withFixture((root) => {
  writeFixtureFile(root, 'apps/backend/tsconfig.json', JSON.stringify({
    fixtureFiles: ['src/index.ts'],
  }));
  writeCustomAdapter(root, 'scripts/failing-impact.js', 'process.exitCode = 7;');
  const config = projectConfig([
    { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
    {
      type: 'custom',
      command: [process.execPath, 'scripts/failing-impact.js'],
      targets: [{ name: 'native-addon', buildCommand: 'build native' }],
    },
  ]);

  const result = queryBuildImpact(config, root, ['apps/backend/src/index.ts']);
  assert.equal(result.status, 'indeterminate');
  assert.deepEqual(result.affectedTargets.map(({ name }) => name), ['backend']);
  assert.deepEqual(result.indeterminateTargets.map(({ name }) => name), ['native-addon']);
}));

test('custom adapters cannot report unowned targets', () => withFixture((root) => {
  writeCustomAdapter(root, 'scripts/unowned-impact.js', `
process.stdout.write(JSON.stringify({
  version: 1,
  status: 'ok',
  affectedTargets: [{ name: 'other', changedFiles: request.changedFiles }],
  indeterminateTargets: [],
  error: null
}));
`);
  const config = projectConfig([{
    type: 'custom',
    command: [process.execPath, 'scripts/unowned-impact.js'],
    targets: [{ name: 'native-addon', buildCommand: 'build native' }],
  }]);
  const result = queryBuildImpact(config, root, ['native/addon.cc']);
  assert.equal(result.status, 'indeterminate');
  assert.match(result.indeterminateTargets[0].reason, /unowned target: other/);
}));

test('custom adapters cannot expand the intended changed path set', () => withFixture((root) => {
  writeCustomAdapter(root, 'scripts/leaking-impact.js', `
process.stdout.write(JSON.stringify({
  version: 1,
  status: 'ok',
  affectedTargets: [{ name: 'native-addon', changedFiles: ['native/unmodified.cc'] }],
  indeterminateTargets: [],
  error: null
}));
`);
  const config = projectConfig([{
    type: 'custom',
    command: [process.execPath, 'scripts/leaking-impact.js'],
    targets: [{ name: 'native-addon', buildCommand: 'build native' }],
  }]);
  const result = queryBuildImpact(config, root, ['native/addon.cc']);
  assert.equal(result.status, 'indeterminate');
  assert.match(result.indeterminateTargets[0].reason, /unintended changed file/);
}));

test('CLI handles spaces and emits no compiler input inventory', () => withFixture((root) => {
  writeFixtureFile(root, 'apps/my app/tsconfig.json', JSON.stringify({
    fixtureFiles: ['src/index.ts', 'src/unmodified.ts'],
  }));
  const config = {
    version: 1,
    buildImpact: {
      version: 1,
      adapters: [{
        type: 'typescript',
        targets: [{
          ...target('my-app', 'apps/my app/tsconfig.json'),
          additionalInputs: [],
        }],
      }],
    },
  };
  writeFixtureFile(root, 'ponytail.json', JSON.stringify(config));
  const result = spawnSync(
    process.execPath,
    [cli, '--project', root, '--file', 'apps/my app/src/index.ts'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout);
  const response = parseQueryResult(JSON.parse(result.stdout));
  assert.deepEqual(response.affectedTargets[0].changedFiles, ['apps/my app/src/index.ts']);
  assert.doesNotMatch(result.stdout, /unmodified\.ts/);
}));

test('configuration and compiler failures are indeterminate', () => withFixture((root) => {
  writeFixtureFile(root, 'ponytail.json', '{');
  const invalidConfig = spawnSync(
    process.execPath,
    [cli, '--project', root, '--file', 'src/index.ts'],
    { encoding: 'utf8' },
  );
  assert.equal(invalidConfig.status, 2);
  assert.equal(parseQueryResult(JSON.parse(invalidConfig.stdout)).status, 'indeterminate');

  fs.rmSync(path.join(root, 'node_modules'), { recursive: true, force: true });
  const config = projectConfig([
    { type: 'typescript', targets: [target('backend', 'apps/backend/tsconfig.json')] },
  ]);
  const missingCompiler = queryBuildImpact(config, root, ['apps/backend/src/index.ts']);
  assert.equal(missingCompiler.status, 'indeterminate');
  assert.match(missingCompiler.indeterminateTargets[0].reason, /TypeScript is not installed/);
}));

test('changed paths cannot escape the project root', () => withFixture((root) => {
  const config = projectConfig([{
    type: 'custom',
    command: [process.execPath, 'missing.js'],
    targets: [{ name: 'native-addon', buildCommand: 'build native' }],
  }]);
  assert.throws(
    () => queryBuildImpact(config, root, ['../outside.cc']),
    BuildImpactError,
  );
}));
