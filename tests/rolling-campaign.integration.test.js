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

const { collectRollingGraph, selectRollingAssignments } = require('../src/rolling-campaign');

// Traceability: verifies REQ-ROLLING-GRAPH
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('coordinator files alone determine graph identity, dependency changes and allocation', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-graph-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const configuration = { schemaVersion: 1, mainline: null,
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(path.join(directory, 'rolling-campaigns.json'), JSON.stringify(configuration));
  const source = path.join(__dirname, '../pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json');
  const document = JSON.parse(fs.readFileSync(source, 'utf8'));
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '../pm/requirements/rolling-campaigns.md'), path.join(root, 'pm/requirements/rolling-campaigns.md'));
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(document));
  const bindings = { schemaVersion: 1, bindings: document.obligations.map(item => ({
    obligationId: item.id, implementationIds: [], sourcePaths: [], acceptances: [],
    unitTests: [], integrationTests: [], exclusiveResources: [],
  })) };
  fs.writeFileSync(path.join(root, 'bindings.json'), JSON.stringify(bindings));
  const before = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.equal(before.coordinatorRoot, root);
  assert.equal(selectRollingAssignments(before, [], 2, before.digest).selected.length, 2);
  fs.writeFileSync(path.join(root, 'worker-copy.json'), '{"not":"authoritative"}');
  assert.equal(collectRollingGraph(root, 'obligations.json', 'bindings.json').digest, before.digest);
  document.obligations[1].dependsOn = ['OBL-1'];
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(document));
  const after = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.notEqual(after.digest, before.digest);
  assert.throws(() => selectRollingAssignments(after, [], 2, before.digest), /stale coordinator graph/);
  assert.equal(selectRollingAssignments(after, [], 14, after.digest).blocked.find(item => item.obligationId === 'OBL-2').reason, 'prerequisites');
  fs.appendFileSync(path.join(root, 'pm/requirements/rolling-campaigns.md'), '\nchanged input\n');
  assert.notEqual(collectRollingGraph(root, 'obligations.json', 'bindings.json').digest, after.digest);
  fs.unlinkSync(path.join(root, 'pm/requirements/rolling-campaigns.md'));
  const unavailable = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.equal(selectRollingAssignments(unavailable, [], 14, unavailable.digest).selected.length, 0);
  assert.deepEqual(unavailable.unavailableInputs, ['pm/requirements/rolling-campaigns.md']);
  document.obligations[0].dependsOn = ['OBL-2'];
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(document));
  assert.throws(() => collectRollingGraph(root, 'obligations.json', 'bindings.json'), /cyclic/);
  assert.throws(() => collectRollingGraph(root, '../foreign.json', 'bindings.json'), /repository-relative/);
});
