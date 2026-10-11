// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadRollingConfiguration } = require('../src/rolling-campaign');

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('configuration boundary uses the designated Git checkout and effective defaults', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-config-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'init.defaultBranch', 'release/stable']);
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'rolling-campaigns.json');
  const configuration = { schemaVersion: 1, mainline: null,
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(file, JSON.stringify(configuration));
  const request = { mainline: null, incrementRef: 'campaign/example', maxActiveWorkers: null, publicationSize: null };
  const resolved = loadRollingConfiguration(root, request);
  assert.deepEqual(resolved, { mainline: { remote: 'origin', branch: 'release/stable' },
    incrementRef: 'campaign/example', maxActiveWorkers: 10, publicationSize: 1 });
  configuration.mainline = { remote: 'upstream', branch: 'main' };
  configuration.publicationSize = 4;
  fs.writeFileSync(file, JSON.stringify(configuration));
  assert.equal(loadRollingConfiguration(root, request).mainline.remote, 'upstream');
  assert.equal(loadRollingConfiguration(root, request).publicationSize, 4);
  assert.equal(resolved.mainline.branch, 'release/stable');
  assert.throws(() => loadRollingConfiguration(directory, request), /exact Git checkout/);
  fs.unlinkSync(file);
  assert.throws(() => loadRollingConfiguration(root, request), /ENOENT/);
  const actual = path.join(root, 'actual.json');
  fs.writeFileSync(actual, JSON.stringify(configuration));
  fs.symlinkSync(actual, file);
  assert.throws(() => loadRollingConfiguration(root, request), /regular non-symlink/);
  fs.unlinkSync(file);
  fs.writeFileSync(file, JSON.stringify(configuration));
  const elsewhere = path.join(root, 'elsewhere');
  fs.renameSync(directory, elsewhere);
  fs.symlinkSync(elsewhere, directory);
  assert.throws(() => loadRollingConfiguration(root, request), /symlink ancestors/);
});
