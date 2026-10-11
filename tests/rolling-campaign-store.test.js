// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { readRollingAssignmentScopeV1, readRollingExecutionConfigV1,
  RollingAssignmentScopeReaders, RollingExecutionConfigReaders } = require('../src/rolling-campaign-store');

// Traceability: verifies REQ-ROLLING-STATE
test('stored execution contracts reject unresolved values, altered scopes and unsupported versions', () => {
  const config = { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1 };
  assert.deepEqual(Object.keys(RollingExecutionConfigReaders), ['V1']);
  assert.deepEqual(readRollingExecutionConfigV1(JSON.parse(JSON.stringify(config))), config);
  for (const corrupt of [value => { value.schemaVersion = 2; }, value => { value.maxActiveWorkers = null; },
    value => { value.publicationSize = 0; }, value => { value.extra = true; }, value => { value.incrementRef = 'main'; }]) {
    const value = structuredClone(config); corrupt(value);
    assert.throws(() => readRollingExecutionConfigV1(value));
  }
  const scope = { schemaVersion: 1, plannedPaths: ['src'], exclusiveResources: ['database'],
    binding: { obligationId: 'OBL-1', implementationIds: [], sourcePaths: [], acceptances: [],
      unitTests: [], integrationTests: [], exclusiveResources: ['database'] } };
  assert.deepEqual(Object.keys(RollingAssignmentScopeReaders), ['V1']);
  assert.deepEqual(readRollingAssignmentScopeV1(JSON.parse(JSON.stringify(scope))), scope);
  for (const corrupt of [value => { value.schemaVersion = 2; }, value => { value.plannedPaths = ['../escape']; },
    value => { value.exclusiveResources = []; }, value => { value.binding.obligationId = 'bad'; }, value => { value.extra = true; }]) {
    const value = structuredClone(scope); corrupt(value);
    assert.throws(() => readRollingAssignmentScopeV1(value));
  }
});
