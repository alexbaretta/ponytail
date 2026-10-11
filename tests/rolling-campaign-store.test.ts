// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readRollingAssignmentScopeV1, readRollingExecutionConfigV1,
  RollingAssignmentScopeReaders, RollingExecutionConfigReaders,
  type RollingAssignmentScopeV1, type RollingExecutionConfigV1 } from '../src/rolling-campaign-store.js';

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('stored execution contracts reject unresolved values, altered scopes and unsupported versions', () => {
  const rollingExecutionConfigV1: RollingExecutionConfigV1 = {
    schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1
  };
  assert.deepEqual(Object.keys(RollingExecutionConfigReaders), ['V1']);
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
  assert.deepEqual(Object.keys(RollingAssignmentScopeReaders), ['V1']);
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
