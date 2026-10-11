// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readTaskletMetadataV1, readTaskletMetadataV2, readTaskletMetadataV3,
  type TaskletMetadataV1, type TaskletMetadataV2, type TaskletMetadataV3,
  type TaskletGraphV1, type TaskletGraphV2, type TaskletGraphV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { type TaskletStatus } from '../skills/plan-execution/scripts/tasklet-statuses.js';
import { selectReadyTasklets, validateTaskletGraph, type TaskletGraphDerivation } from '../skills/plan-execution/scripts/tasklet-graph.js';

test('typed selection preserves versioned physical results and completion without mutating inputs', () => {
  const taskletMetadataV1: TaskletMetadataV1 = { schemaVersion: 1, sprint: 'S01', tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'high', risk_reason: 'owned boundary' } } };
  const taskletGraphV1: TaskletGraphV1 = readTaskletMetadataV1('S01', taskletMetadataV1, 'metadata');
  const taskletMetadataV2: TaskletMetadataV2 = { schemaVersion: 2, sprint: 'S01', features: {
    'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } }, tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'high', risk_reason: 'owned boundary', feature: 'S01-F01', planned_paths: ['src/input.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } };
  const taskletGraphV2: TaskletGraphV2 = readTaskletMetadataV2('S01', taskletMetadataV2, 'metadata');
  const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
  const taskletGraphV3: TaskletGraphV3 = readTaskletMetadataV3('S01', taskletMetadataV3, 'metadata');
  const graphs: readonly (TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3)[] = [taskletGraphV1, taskletGraphV2, taskletGraphV3];
  for (const graph of graphs) {
    const statuses: ReadonlyMap<string, TaskletStatus> = new Map([...graph.tasklets.keys()].map(id => [id, 'PENDING']));
    const taskletGraphDerivation: TaskletGraphDerivation = validateTaskletGraph(graph, statuses);
    const result = selectReadyTasklets(graph, statuses, taskletGraphDerivation);
    const expectedNext = graph.schemaVersion === 1 ? 'S01-F01-T01' : graph.schemaVersion === 2 ? ['S01-F01-T01']
      : [{ tasklets: ['S01-F01-T01'], planned_paths: ['src/input.ts'] }];
    assert.deepEqual(result.next, expectedNext);
    assert.deepEqual([...statuses.values()], [...graph.tasklets.keys()].map(() => 'PENDING'));
    const completedStatuses: ReadonlyMap<string, TaskletStatus> = new Map([...graph.tasklets.keys()].map(id => [id, 'DONE']));
    const completedTaskletGraphDerivation: TaskletGraphDerivation = validateTaskletGraph(graph, completedStatuses);
    assert.deepEqual(selectReadyTasklets(graph, completedStatuses, completedTaskletGraphDerivation), { next: null });
  }
});
