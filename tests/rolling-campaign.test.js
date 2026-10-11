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

const { readRollingBindingsV1, selectRollingAssignments } = require('../src/rolling-campaign');

function executionBinding(id, resources = []) {
  return { obligationId: id, implementationIds: [], sourcePaths: [], acceptances: [],
    unitTests: [], integrationTests: [], exclusiveResources: resources };
}

function schedulingGraph() {
  const obligations = [
    { id: 'OBL-2', category: 'T2', dependsOn: ['OBL-1'], execution: { plannedPaths: ['src/dependent.js'] } },
    { id: 'OBL-3', category: 'T3', dependsOn: [], execution: { plannedPaths: ['src/shared'] } },
    { id: 'OBL-10', category: 'T3', dependsOn: [], execution: { plannedPaths: ['src/shared/value.js'] } },
    { id: 'OBL-11', category: 'T3', dependsOn: [], execution: { plannedPaths: ['src/free.js'] } },
  ];
  return { digest: 'current', unavailableInputs: [], document: { scopeId: 'campaign', obligations },
    projection: { satisfiedIds: [], unresolvedIds: obligations.map(item => item.id) },
    bindings: obligations.map(item => executionBinding(item.id)) };
}

// Traceability: verifies REQ-ROLLING-GRAPH
test('execution references retain acceptance Steps and reject unknown shapes and escaping files', () => {
  const binding = executionBinding('OBL-2');
  binding.acceptances = [{ id: 'ACC-RESET', arcId: 'ARC-RESET', stepId: 'STEP-SUBMIT' }];
  binding.unitTests = [{ id: 'UNIT-RESET', path: 'test/reset.js', selection: ['reset'] }];
  const value = { schemaVersion: 1, bindings: [binding] };
  assert.equal(readRollingBindingsV1(value), value);
  for (const corrupt of [
    item => { item.bindings.push(structuredClone(item.bindings[0])); },
    item => { item.bindings[0].sourcePaths = ['../foreign.js']; },
    item => { item.bindings[0].unitTests[0].selection = []; },
    item => { item.bindings[0].acceptances[0].stepId = ''; },
    item => { item.bindings[0].status = 'done'; },
  ]) {
    const candidate = structuredClone(value); corrupt(candidate);
    assert.throws(() => readRollingBindingsV1(candidate), /rolling campaign:/);
  }
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('maximal scheduling uses readiness, numeric ordering and path/resource compatibility', () => {
  const graph = schedulingGraph();
  let result = selectRollingAssignments(graph, [], 10, 'current');
  assert.deepEqual(result.selected.map(item => item.obligationId), ['OBL-3', 'OBL-11']);
  assert.equal(result.blocked.find(item => item.obligationId === 'OBL-2').reason, 'prerequisites');
  assert.equal(result.blocked.find(item => item.obligationId === 'OBL-10').reason, 'conflict');
  graph.projection.satisfiedIds = ['OBL-1'];
  graph.bindings[1].exclusiveResources = ['database'];
  graph.bindings[3].exclusiveResources = ['database'];
  result = selectRollingAssignments(graph, [], 10, 'current');
  assert.deepEqual(result.selected.map(item => item.obligationId), ['OBL-2', 'OBL-3']);
  assert.deepEqual(selectRollingAssignments(graph, [], 1, 'current').selected.map(item => item.obligationId), ['OBL-2']);
  assert.throws(() => selectRollingAssignments(graph, [], 10, 'old'), /stale coordinator graph/);
  graph.bindings = [];
  assert.equal(selectRollingAssignments(graph, [], 10, 'current').selected.length, 0);
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('suspended workers retain ownership and resume before new obligations without exceeding active capacity', () => {
  const graph = schedulingGraph();
  const inactive = { id: 'worker-original', scopeId: 'campaign', obligationId: 'OBL-11', state: 'INACTIVE',
    activityStopped: true, blockers: ['OBL-1'], plannedPaths: ['src/free.js'], exclusiveResources: [] };
  let result = selectRollingAssignments(graph, [inactive], 1, 'current');
  assert.deepEqual(result.selected.map(item => item.obligationId), ['OBL-3']);
  graph.projection.satisfiedIds = ['OBL-1'];
  result = selectRollingAssignments(graph, [inactive], 1, 'current');
  assert.deepEqual(result.selected.map(item => [item.kind, item.assignmentId]), [['resume_worker', 'worker-original']]);
  assert.equal(result.activeCount, 0);
  inactive.activityStopped = false;
  assert.throws(() => selectRollingAssignments(graph, [inactive], 1, 'current'), /acknowledge stopped activity/);
  inactive.state = 'WORKING';
  result = selectRollingAssignments(graph, [inactive], 1, 'current');
  assert.equal(result.activeCount, 1);
  assert.equal(result.selected.length, 0);
  assert.throws(() => selectRollingAssignments(graph, [inactive, { ...inactive, id: 'duplicate' }], 2, 'current'), /duplicate live/);
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('scope changes require reconciliation and foreign campaign owners still constrain shared writes', () => {
  const graph = schedulingGraph();
  const inactive = { id: 'retained', scopeId: 'campaign', obligationId: 'OBL-11', state: 'INACTIVE',
    activityStopped: true, blockers: [], plannedPaths: ['src/old.js'], exclusiveResources: [] };
  const result = selectRollingAssignments(graph, [inactive], 10, 'current');
  assert.equal(result.blocked.find(item => item.obligationId === 'OBL-11').reason, 'scope_changed');
  assert.equal(result.selected.some(item => item.obligationId === 'OBL-11'), false);
  const foreign = { id: 'foreign', scopeId: 'other-campaign', obligationId: 'OBL-3', state: 'WORKING',
    activityStopped: false, blockers: [], plannedPaths: ['src/shared'], exclusiveResources: [] };
  const shared = selectRollingAssignments(graph, [foreign], 3, 'current');
  assert.equal(shared.activeCount, 1);
  assert.equal(shared.blocked.find(item => item.obligationId === 'OBL-3').reason, 'conflict');
  assert.deepEqual(shared.selected.map(item => item.obligationId), ['OBL-11']);
});
