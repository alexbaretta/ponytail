// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { readRollingProjectConfigV1, parseRollingProjectConfig, resolveRollingConfiguration } = require('../src/rolling-campaign');

function projectConfiguration() {
  return { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [['npm', 'ci']],
    qa: { focused: [], publication: [['npm', 'test']] } };
}

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('project configuration preserves explicit targets, main-root paths and executable argv', () => {
  const configuration = projectConfiguration();
  configuration.setupCommands = [['node', '-e', 'process.stdout.write("$HOME; `literal`")', '']];
  assert.deepEqual(parseRollingProjectConfig(JSON.stringify(configuration)), configuration);
  configuration.mainline = null;
  configuration.managedWorktrees.directory = '/Users/example/project/managed_worktrees';
  configuration.maxActiveWorkers = 10;
  configuration.publicationSize = 1;
  assert.equal(readRollingProjectConfigV1(configuration), configuration);
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('project configuration rejects ambiguous shape, invalid identity and missing publication QA', () => {
  for (const corrupt of [
    value => { value.extra = 'unapproved'; },
    value => { value.schemaVersion = 2; },
    value => { delete value.mainline; },
    value => { value.mainline.branch = '-master'; },
    value => { value.mainline.remote = ''; },
    value => { value.mainline.extra = true; },
    value => { value.managedWorktrees.anchor = 'cwd'; },
    value => { value.managedWorktrees.directory = ' '; },
    value => { value.setupCommands = ['npm ci']; },
    value => { value.qa.publication = []; },
    value => { value.qa.focused = [['']]; },
    value => { value.qa.publication = [['node', '\0']]; },
  ]) {
    const configuration = projectConfiguration();
    corrupt(configuration);
    assert.throws(() => readRollingProjectConfigV1(configuration), /rolling campaign:/);
  }
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('capacity and publication limits reject unsafe values before JSON conversion', () => {
  for (const key of ['maxActiveWorkers', 'publicationSize']) {
    for (const number of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '10']) {
      const configuration = projectConfiguration();
      configuration[key] = number;
      assert.throws(() => readRollingProjectConfigV1(configuration), /positive safe integer/);
    }
    const configuration = projectConfiguration();
    configuration[key] = Number.MAX_SAFE_INTEGER;
    assert.deepEqual(parseRollingProjectConfig(JSON.stringify(configuration)), configuration);
    for (const token of ['9007199254740993', '9007199254740992', '1.1', '1e309', '-1']) {
      const text = JSON.stringify(projectConfiguration()).replace(`"${key}":null`, `"${key}":${token}`);
      assert.throws(() => parseRollingProjectConfig(text), /unsupported JSON number token/);
    }
  }
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('campaign resolution uses explicit, project, then Git defaults and retains its selected target', () => {
  const configuration = projectConfiguration();
  configuration.maxActiveWorkers = 4;
  configuration.publicationSize = 3;
  const request = { mainline: { remote: 'upstream', branch: 'release/stable' },
    incrementRef: 'campaign/example', maxActiveWorkers: 2, publicationSize: 5 };
  const resolved = resolveRollingConfiguration(configuration, request, 'master');
  assert.deepEqual(resolved, { ...request, maxActiveWorkers: 2, publicationSize: 5 });
  request.mainline.branch = 'changed-request';
  configuration.mainline.branch = 'changed-default';
  assert.equal(resolved.mainline.branch, 'release/stable');
  request.mainline = null;
  request.maxActiveWorkers = null;
  request.publicationSize = null;
  assert.deepEqual(resolveRollingConfiguration(configuration, request, 'master'), {
    mainline: configuration.mainline, incrementRef: request.incrementRef,
    maxActiveWorkers: 4, publicationSize: 3,
  });
  configuration.mainline = null;
  configuration.maxActiveWorkers = null;
  configuration.publicationSize = null;
  assert.deepEqual(resolveRollingConfiguration(configuration, request, 'master'), {
    mainline: { remote: 'origin', branch: 'master' }, incrementRef: request.incrementRef,
    maxActiveWorkers: 10, publicationSize: 1,
  });
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('campaign resolution rejects invalid targets, missing defaults and invalid overrides', () => {
  const configuration = projectConfiguration();
  const request = { mainline: null, incrementRef: 'campaign/example', maxActiveWorkers: null, publicationSize: null };
  for (const branch of ['has space', '../master', 'release..next', 'main.lock', '-master']) {
    assert.throws(() => resolveRollingConfiguration(configuration, {
      ...request, mainline: { remote: 'origin', branch },
    }, 'master'), /invalid mainline/);
    assert.throws(() => resolveRollingConfiguration(configuration, {
      ...request, incrementRef: branch,
    }, 'master'), /invalid increment/);
  }
  assert.throws(() => resolveRollingConfiguration(configuration, { ...request, incrementRef: 'main' }, 'master'), /must differ/);
  assert.throws(() => resolveRollingConfiguration(configuration, { ...request, maxActiveWorkers: 0 }, 'master'), /positive safe integer/);
  assert.throws(() => resolveRollingConfiguration(configuration, { ...request, publicationSize: 1.1 }, 'master'), /positive safe integer/);
  configuration.mainline = null;
  assert.throws(() => resolveRollingConfiguration(configuration, request, null), /invalid mainline branch/);
});
