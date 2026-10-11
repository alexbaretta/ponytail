// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readRollingProjectConfigV1, parseRollingProjectConfig, resolveRollingConfiguration,
  readRollingBindingsV1, selectRollingAssignments, type RollingProjectConfigV1, type RollingCampaignRequest,
  type RollingBinding, type RollingBindingsV1, type RollingGraph, type RollingAssignment,
  type RollingResolvedConfiguration, type RollingSchedulingResult } from '../src/rolling-campaign.js';
import type { Obligation, ObligationCategory, ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';

function projectConfiguration(): RollingProjectConfigV1 {
  return { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [['npm', 'ci']],
    qa: { focused: [], publication: [['npm', 'test']] } };
}

// Traceability: verifies REQ-ROLLING-CONFIGURATION
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('project configuration preserves explicit targets, main-root paths and executable argv', () => {
  let rollingProjectConfigV1: RollingProjectConfigV1 = { ...projectConfiguration(),
    setupCommands: [['node', '--version', '$HOME; `literal`', '']] };
  assert.deepEqual(parseRollingProjectConfig(JSON.stringify(rollingProjectConfigV1)), rollingProjectConfigV1);
  rollingProjectConfigV1 = { ...rollingProjectConfigV1, mainline: null,
    managedWorktrees: { directory: '/Users/example/project/managed_worktrees', anchor: 'main' },
    maxActiveWorkers: 10, publicationSize: 1 };
  assert.equal(readRollingProjectConfigV1(rollingProjectConfigV1), rollingProjectConfigV1);
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('project configuration rejects ambiguous shape, invalid identity and missing publication QA', () => {
  const rollingProjectConfigV1: RollingProjectConfigV1 = projectConfiguration();
  const { mainline: omittedMainline, ...missingMainline } = rollingProjectConfigV1;
  assert.ok(omittedMainline);
  const invalidInputs: readonly unknown[] = [
    { ...rollingProjectConfigV1, extra: 'unapproved' },
    { ...rollingProjectConfigV1, schemaVersion: 2 }, missingMainline,
    { ...rollingProjectConfigV1, mainline: { remote: 'origin', branch: '-master' } },
    { ...rollingProjectConfigV1, mainline: { remote: '', branch: 'main' } },
    { ...rollingProjectConfigV1, mainline: { remote: 'origin', branch: 'main', extra: true } },
    { ...rollingProjectConfigV1, managedWorktrees: { directory: '../managed', anchor: 'cwd' } },
    { ...rollingProjectConfigV1, managedWorktrees: { directory: ' ', anchor: 'main' } },
    { ...rollingProjectConfigV1, setupCommands: ['npm ci'] },
    { ...rollingProjectConfigV1, qa: { focused: [], publication: [] } },
    { ...rollingProjectConfigV1, qa: { ...rollingProjectConfigV1.qa, focused: [['']] } },
    { ...rollingProjectConfigV1, qa: { ...rollingProjectConfigV1.qa, publication: [['node', '\0']] } }
  ];
  for (const invalidInput of invalidInputs) assert.throws(() => readRollingProjectConfigV1(invalidInput), /rolling campaign:/);
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('capacity and publication limits reject unsafe values before JSON conversion', () => {
  for (const key of ['maxActiveWorkers', 'publicationSize']) {
    for (const number of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '10']) {
      const invalidInput: unknown = { ...projectConfiguration(), [key]: number };
      assert.throws(() => readRollingProjectConfigV1(invalidInput), /positive safe integer/);
    }
    const rollingProjectConfigV1: RollingProjectConfigV1 = { ...projectConfiguration(), [key]: Number.MAX_SAFE_INTEGER };
    assert.deepEqual(parseRollingProjectConfig(JSON.stringify(rollingProjectConfigV1)), rollingProjectConfigV1);
    for (const token of ['9007199254740993', '9007199254740992', '1.1', '1e309', '-1']) {
      const text = JSON.stringify(projectConfiguration()).replace(`"${key}":null`, `"${key}":${token}`);
      assert.throws(() => parseRollingProjectConfig(text), /unsupported JSON number token/);
    }
  }
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('campaign resolution uses explicit, project, then Git defaults and retains its selected target', () => {
  let rollingProjectConfigV1: RollingProjectConfigV1 = { ...projectConfiguration(), maxActiveWorkers: 4, publicationSize: 3 };
  let rollingCampaignRequest: RollingCampaignRequest = { mainline: { remote: 'upstream', branch: 'release/stable' },
    incrementRef: 'campaign/example', maxActiveWorkers: 2, publicationSize: 5 };
  const rollingResolvedConfiguration: RollingResolvedConfiguration = resolveRollingConfiguration(rollingProjectConfigV1, rollingCampaignRequest, 'master');
  assert.deepEqual(rollingResolvedConfiguration, { ...rollingCampaignRequest, maxActiveWorkers: 2, publicationSize: 5 });
  assert.ok(rollingCampaignRequest.mainline);
  assert.ok(rollingProjectConfigV1.mainline);
  rollingCampaignRequest = { ...rollingCampaignRequest, mainline: { ...rollingCampaignRequest.mainline, branch: 'changed-request' } };
  rollingProjectConfigV1 = { ...rollingProjectConfigV1, mainline: { ...rollingProjectConfigV1.mainline, branch: 'changed-default' } };
  assert.equal(rollingResolvedConfiguration.mainline.branch, 'release/stable');
  rollingCampaignRequest = { ...rollingCampaignRequest, mainline: null, maxActiveWorkers: null, publicationSize: null };
  assert.deepEqual(resolveRollingConfiguration(rollingProjectConfigV1, rollingCampaignRequest, 'master'), {
    mainline: rollingProjectConfigV1.mainline, incrementRef: rollingCampaignRequest.incrementRef, maxActiveWorkers: 4, publicationSize: 3 });
  rollingProjectConfigV1 = { ...rollingProjectConfigV1, mainline: null, maxActiveWorkers: null, publicationSize: null };
  assert.deepEqual(resolveRollingConfiguration(rollingProjectConfigV1, rollingCampaignRequest, 'master'), {
    mainline: { remote: 'origin', branch: 'master' }, incrementRef: rollingCampaignRequest.incrementRef, maxActiveWorkers: 10, publicationSize: 1 });
});

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('campaign resolution rejects invalid targets, missing defaults and invalid overrides', () => {
  let rollingProjectConfigV1: RollingProjectConfigV1 = projectConfiguration();
  const rollingCampaignRequest: RollingCampaignRequest = { mainline: null, incrementRef: 'campaign/example', maxActiveWorkers: null, publicationSize: null };
  for (const branch of ['has space', '../master', 'release..next', 'main.lock', '-master']) {
    assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, {
      ...rollingCampaignRequest, mainline: { remote: 'origin', branch } }, 'master'), /invalid mainline/);
    assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, { ...rollingCampaignRequest, incrementRef: branch }, 'master'), /invalid increment/);
  }
  assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, { ...rollingCampaignRequest, incrementRef: 'main' }, 'master'), /must differ/);
  assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, { ...rollingCampaignRequest, maxActiveWorkers: 0 }, 'master'), /positive safe integer/);
  assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, { ...rollingCampaignRequest, publicationSize: 1.1 }, 'master'), /positive safe integer/);
  rollingProjectConfigV1 = { ...rollingProjectConfigV1, mainline: null };
  assert.throws(() => resolveRollingConfiguration(rollingProjectConfigV1, rollingCampaignRequest, null), /invalid mainline branch/);
});

function executionBinding(id: string, resources: readonly string[] = []): RollingBinding {
  return { obligationId: id, implementationIds: [], sourcePaths: [], acceptances: [],
    unitTests: [], integrationTests: [], exclusiveResources: resources };
}
function schedulingObligation(id: string, category: ObligationCategory, plannedPaths: readonly string[] = [], dependsOn: readonly string[] = []): Obligation {
  return { id, category, requirementIds: ['REQ-FIXTURE'], responsibilityId: id, condition: 'Fixture responsibility', criterion: 'Fixture evidence',
    dependsOn, acceptanceGroups: ['fixture'], supersedes: null,
    execution: { sprintId: null, taskletIds: [], plannedPaths, operations: ['inspect'], selection: [], target: null } };
}
function schedulingGraph(): RollingGraph {
  const obligations: readonly Obligation[] = [
    schedulingObligation('OBL-1', 'T1'), schedulingObligation('OBL-2', 'T2', ['src/dependent.ts'], ['OBL-1']),
    schedulingObligation('OBL-3', 'T3', ['src/shared']), schedulingObligation('OBL-4', 'T4'),
    schedulingObligation('OBL-5', 'C1'), schedulingObligation('OBL-6', 'C2'),
    schedulingObligation('OBL-10', 'T3', ['src/shared/value.ts']), schedulingObligation('OBL-11', 'T3', ['src/free.ts'])
  ];
  const obligationDocumentV1: ObligationDocumentV1 = { schemaVersion: 1, scopeId: 'campaign', obligations,
    baselines: [{ id: 'B1', predecessorId: null, authority: { references: ['fixture'], assessors: ['coordinator'] },
      requirements: [{ id: 'REQ-FIXTURE', path: 'requirement.md', digest: 'a'.repeat(64) }],
      obligationIds: obligations.map(item => item.id), inventoryIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'] }], certificates: [], checkpoints: [] };
  return { coordinatorRoot: '/fixture', head: 'a'.repeat(40), digest: 'current', unavailableInputs: [], document: obligationDocumentV1,
    projection: { baselineId: 'B1', vector: [1, 1, 3, 1, 1, 1], satisfiedIds: [], unresolvedIds: obligations.map(item => item.id), gates: [], assessments: [], complete: false },
    projectConfiguration: projectConfiguration(), bindings: ['OBL-2', 'OBL-3', 'OBL-10', 'OBL-11'].map(id => executionBinding(id)) };
}

// Traceability: verifies REQ-ROLLING-GRAPH
test('execution references retain acceptance Steps and reject unknown shapes and escaping files', () => {
  const rollingBinding: RollingBinding = { ...executionBinding('OBL-2'),
    acceptances: [{ id: 'ACC-RESET', arcId: 'ARC-RESET', stepId: 'STEP-SUBMIT' }],
    unitTests: [{ id: 'UNIT-RESET', path: 'test/reset.ts', selection: ['reset'] }] };
  const rollingBindingsV1: RollingBindingsV1 = { schemaVersion: 1, bindings: [rollingBinding] };
  assert.equal(readRollingBindingsV1(rollingBindingsV1), rollingBindingsV1);
  const invalidInputs: readonly unknown[] = [
    { ...rollingBindingsV1, bindings: [rollingBinding, structuredClone(rollingBinding)] },
    { ...rollingBindingsV1, bindings: [{ ...rollingBinding, sourcePaths: ['../foreign.ts'] }] },
    { ...rollingBindingsV1, bindings: [{ ...rollingBinding, unitTests: [{ id: 'UNIT-RESET', path: 'test/reset.ts', selection: [] }] }] },
    { ...rollingBindingsV1, bindings: [{ ...rollingBinding, acceptances: [{ id: 'ACC-RESET', arcId: 'ARC-RESET', stepId: '' }] }] },
    { ...rollingBindingsV1, bindings: [{ ...rollingBinding, status: 'done' }] }
  ];
  for (const invalidInput of invalidInputs) assert.throws(() => readRollingBindingsV1(invalidInput), /rolling campaign:/);
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('maximal scheduling uses readiness, numeric ordering and path/resource compatibility', () => {
  let rollingGraph: RollingGraph = schedulingGraph();
  let rollingSchedulingResult: RollingSchedulingResult = selectRollingAssignments(rollingGraph, [], 10, 'current');
  assert.deepEqual(rollingSchedulingResult.selected.map(item => item.obligationId), ['OBL-3', 'OBL-11']);
  assert.equal(rollingSchedulingResult.blocked.find(item => 'obligationId' in item && item.obligationId === 'OBL-2')?.reason, 'prerequisites');
  assert.equal(rollingSchedulingResult.blocked.find(item => 'obligationId' in item && item.obligationId === 'OBL-10')?.reason, 'conflict');
  rollingGraph = { ...rollingGraph, projection: { ...rollingGraph.projection, satisfiedIds: ['OBL-1'] },
    bindings: rollingGraph.bindings.map(item => item.obligationId === 'OBL-3' || item.obligationId === 'OBL-11' ? { ...item, exclusiveResources: ['database'] } : item) };
  rollingSchedulingResult = selectRollingAssignments(rollingGraph, [], 10, 'current');
  assert.deepEqual(rollingSchedulingResult.selected.map(item => item.obligationId), ['OBL-2', 'OBL-3']);
  assert.deepEqual(selectRollingAssignments(rollingGraph, [], 1, 'current').selected.map(item => item.obligationId), ['OBL-2']);
  assert.throws(() => selectRollingAssignments(rollingGraph, [], 10, 'old'), /stale coordinator graph/);
  rollingGraph = { ...rollingGraph, bindings: [] };
  assert.equal(selectRollingAssignments(rollingGraph, [], 10, 'current').selected.length, 0);
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('suspended workers retain ownership and resume before new obligations without exceeding active capacity', () => {
  let rollingGraph: RollingGraph = schedulingGraph();
  let inactiveRollingAssignment: RollingAssignment = { id: 'worker-original', scopeId: 'campaign', obligationId: 'OBL-11', state: 'INACTIVE',
    activityStopped: true, blockers: ['OBL-1'], plannedPaths: ['src/free.ts'], exclusiveResources: [] };
  let rollingSchedulingResult: RollingSchedulingResult = selectRollingAssignments(rollingGraph, [inactiveRollingAssignment], 1, 'current');
  assert.deepEqual(rollingSchedulingResult.selected.map(item => item.obligationId), ['OBL-3']);
  rollingGraph = { ...rollingGraph, projection: { ...rollingGraph.projection, satisfiedIds: ['OBL-1'] } };
  rollingSchedulingResult = selectRollingAssignments(rollingGraph, [inactiveRollingAssignment], 1, 'current');
  assert.deepEqual(rollingSchedulingResult.selected.map(item => [item.kind, item.assignmentId]), [['resume_worker', 'worker-original']]);
  assert.equal(rollingSchedulingResult.activeCount, 0);
  inactiveRollingAssignment = { ...inactiveRollingAssignment, activityStopped: false };
  assert.throws(() => selectRollingAssignments(rollingGraph, [inactiveRollingAssignment], 1, 'current'), /acknowledge stopped activity/);
  inactiveRollingAssignment = { ...inactiveRollingAssignment, state: 'WORKING' };
  rollingSchedulingResult = selectRollingAssignments(rollingGraph, [inactiveRollingAssignment], 1, 'current');
  assert.equal(rollingSchedulingResult.activeCount, 1);
  assert.equal(rollingSchedulingResult.selected.length, 0);
  assert.throws(() => selectRollingAssignments(rollingGraph, [inactiveRollingAssignment, { ...inactiveRollingAssignment, id: 'duplicate' }], 2, 'current'), /duplicate live/);
});

// Traceability: verifies REQ-ROLLING-SCHEDULING
test('scope changes require reconciliation and foreign campaign owners still constrain shared writes', () => {
  const rollingGraph: RollingGraph = schedulingGraph();
  const inactiveRollingAssignment: RollingAssignment = { id: 'retained', scopeId: 'campaign', obligationId: 'OBL-11', state: 'INACTIVE',
    activityStopped: true, blockers: [], plannedPaths: ['src/old.ts'], exclusiveResources: [] };
  const rollingSchedulingResult: RollingSchedulingResult = selectRollingAssignments(rollingGraph, [inactiveRollingAssignment], 10, 'current');
  assert.equal(rollingSchedulingResult.blocked.find(item => 'obligationId' in item && item.obligationId === 'OBL-11')?.reason, 'scope_changed');
  assert.equal(rollingSchedulingResult.selected.some(item => item.obligationId === 'OBL-11'), false);
  const foreignRollingAssignment: RollingAssignment = { id: 'foreign', scopeId: 'other-campaign', obligationId: 'OBL-3', state: 'WORKING',
    activityStopped: false, blockers: [], plannedPaths: ['src/shared'], exclusiveResources: [] };
  const sharedRollingSchedulingResult: RollingSchedulingResult = selectRollingAssignments(rollingGraph, [foreignRollingAssignment], 3, 'current');
  assert.equal(sharedRollingSchedulingResult.activeCount, 1);
  assert.equal(sharedRollingSchedulingResult.blocked.find(item => 'obligationId' in item && item.obligationId === 'OBL-3')?.reason, 'conflict');
  assert.deepEqual(sharedRollingSchedulingResult.selected.map(item => item.obligationId), ['OBL-11']);
});
