// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readRollingAssignmentScopeV1, readRollingExecutionConfigV1, readRollingAssignmentScopeV2, readRollingExecutionConfigV2,
  RollingAssignmentScopeReaders, RollingExecutionConfigReaders,
  type RollingAssignmentScopeV1, type RollingExecutionConfigV1, type RollingAssignmentScopeV2, type RollingExecutionConfigV2 } from '../src/rolling-campaign-store.js';

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('stored execution contracts reject unresolved values, altered scopes and unsupported versions', () => {
  const rollingExecutionConfigV1: RollingExecutionConfigV1 = {
    schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1
  };
  assert.deepEqual(Object.keys(RollingExecutionConfigReaders), ['V1', 'V2']);
  const configurationInput: unknown = JSON.parse(JSON.stringify(rollingExecutionConfigV1));
  assert.deepEqual(readRollingExecutionConfigV1(configurationInput), rollingExecutionConfigV1);
  const invalidConfigurations: readonly unknown[] = [
    { ...rollingExecutionConfigV1, schemaVersion: 2 },
    { ...rollingExecutionConfigV1, maxActiveWorkers: null },
    { ...rollingExecutionConfigV1, publicationSize: 0 },
    { ...rollingExecutionConfigV1, extra: true },
    { ...rollingExecutionConfigV1, incrementRef: 'main' }
  ];
  for (const invalidConfiguration of invalidConfigurations) assert.throws(() => readRollingExecutionConfigV1(invalidConfiguration));
  const rollingAssignmentScopeV1: RollingAssignmentScopeV1 = {
    schemaVersion: 1, plannedPaths: ['src'], exclusiveResources: ['database'],
    binding: { obligationId: 'OBL-1', implementationIds: [], sourcePaths: [], acceptances: [],
      unitTests: [], integrationTests: [], exclusiveResources: ['database'] }
  };
  assert.deepEqual(Object.keys(RollingAssignmentScopeReaders), ['V1', 'V2']);
  const scopeInput: unknown = JSON.parse(JSON.stringify(rollingAssignmentScopeV1));
  assert.deepEqual(readRollingAssignmentScopeV1(scopeInput), rollingAssignmentScopeV1);
  const invalidScopes: readonly unknown[] = [
    { ...rollingAssignmentScopeV1, schemaVersion: 2 },
    { ...rollingAssignmentScopeV1, plannedPaths: ['../escape'] },
    { ...rollingAssignmentScopeV1, exclusiveResources: [] },
    { ...rollingAssignmentScopeV1, binding: { ...rollingAssignmentScopeV1.binding, obligationId: 'bad' } },
    { ...rollingAssignmentScopeV1, extra: true }
  ];
  for (const invalidScope of invalidScopes) assert.throws(() => readRollingAssignmentScopeV1(invalidScope));
});

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-GRAPH
test('stored V2 contracts retain explicit coordinator history and the complete frozen lease', () => {
  const rollingExecutionConfigV2: RollingExecutionConfigV2 = { schemaVersion: 2, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1,
    bindingHistory: { path: 'pm/plan/bindings.json', assessor: 'coordinator', authority: ['approved scope'] } };
  const rollingAssignmentScopeV2: RollingAssignmentScopeV2 = { schemaVersion: 2, exclusiveResources: ['database'],
    binding: { obligationId: 'OBL-1', implementationIds: [], sourcePaths: [], acceptances: [], unitTests: [], integrationTests: [], exclusiveResources: ['database'] },
    lease: { schemaVersion: 1, scopeId: 'campaign', baselineId: 'BASELINE-1', graphDigest: 'a'.repeat(64), generation: 'generation-1', assessor: 'coordinator', authority: ['approved scope'],
      binding: { obligationId: 'OBL-1', revisionId: 'BIND-1', dependsOn: [], execution: { sprintId: null, taskletIds: [], plannedPaths: ['src/current.ts'], operations: ['edit', 'test'],
        selection: ['focused proof'], target: { identity: 'local', profile: 'focused' } } } } };
  const configurationInput: unknown = JSON.parse(JSON.stringify(rollingExecutionConfigV2));
  const scopeInput: unknown = JSON.parse(JSON.stringify(rollingAssignmentScopeV2));
  assert.deepEqual(readRollingExecutionConfigV2(configurationInput), rollingExecutionConfigV2);
  assert.deepEqual(readRollingAssignmentScopeV2(scopeInput), rollingAssignmentScopeV2);
  const invalidConfigurations: readonly unknown[] = [{ ...rollingExecutionConfigV2, schemaVersion: 1 },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, path: '../foreign' } },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, authority: [] } },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, extra: true } }];
  for (const invalidConfiguration of invalidConfigurations) assert.throws(() => readRollingExecutionConfigV2(invalidConfiguration));
  const invalidScopes: readonly unknown[] = [{ ...rollingAssignmentScopeV2, schemaVersion: 1 }, { ...rollingAssignmentScopeV2, plannedPaths: ['expanded'] },
    { ...rollingAssignmentScopeV2, exclusiveResources: [] },
    { ...rollingAssignmentScopeV2, binding: { ...rollingAssignmentScopeV2.binding, obligationId: 'OBL-2' } }];
  for (const invalidScope of invalidScopes) assert.throws(() => readRollingAssignmentScopeV2(invalidScope));
});
