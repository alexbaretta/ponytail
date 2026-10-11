// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readTaskletMetadataV3, type TaskletMetadataV3, type TaskletGraphV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { type TaskletStatus } from '../skills/plan-execution/scripts/tasklet-statuses.js';
import { effectiveDependencies, validateTaskletGraph, type TaskletGraphDerivation } from '../skills/plan-execution/scripts/tasklet-graph.js';

function metadata(): TaskletMetadataV3 {
  return { schemaVersion: 3, sprint: 'S01', features: {
    'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' },
    'S01-F02': { depends_on: ['S01-F01'], validation_tasklet: 'S01-F02-T02' } }, tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src/first.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] },
    'S01-F02-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F02', planned_paths: ['src/second.ts'] },
    'S01-F02-T02': { depends_on: ['S01-F02-T01'], affinity: [], risk: 'normal', feature: 'S01-F02', planned_paths: [] } } };
}

test('derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates', () => {
  const taskletMetadataV3: TaskletMetadataV3 = metadata();
  const taskletGraphV3: TaskletGraphV3 = readTaskletMetadataV3('S01', taskletMetadataV3, 'S01.tasklets.json');
  const statuses: ReadonlyMap<string, TaskletStatus> = new Map([
    ['S01-F01-T01', 'DONE'], ['S01-F01-T02', 'PENDING'], ['S01-F02-T01', 'PENDING'], ['S01-F02-T02', 'PENDING'] ]);
  const originalTasklets = JSON.stringify([...taskletGraphV3.tasklets]);
  const originalFeatures = JSON.stringify([...taskletGraphV3.features]);
  const originalStatuses = [...statuses];
  assert.deepEqual(effectiveDependencies(taskletGraphV3, 'S01-F02-T01'), ['S01-F01-T02']);
  assert.deepEqual(effectiveDependencies(taskletGraphV3, 'S01-F02-T02'), ['S01-F02-T01', 'S01-F01-T02']);
  const taskletGraphDerivation: TaskletGraphDerivation = validateTaskletGraph(taskletGraphV3, statuses);
  assert.deepEqual([...taskletGraphDerivation.reverse], [
    ['S01-F01-T01', ['S01-F01-T02']], ['S01-F01-T02', ['S01-F02-T01', 'S01-F02-T02']],
    ['S01-F02-T01', ['S01-F02-T02']], ['S01-F02-T02', []] ]);
  assert.deepEqual([...taskletGraphDerivation.descendants.get('S01-F01-T01') ?? []].sort(), ['S01-F01-T02', 'S01-F02-T01', 'S01-F02-T02']);
  assert.equal(taskletGraphDerivation.depth.get('S01-F01-T01'), 3);
  assert.equal(taskletGraphDerivation.unfinishedDescendants.get('S01-F01-T01'), 3);
  const completedStatuses: ReadonlyMap<string, TaskletStatus> = new Map([...statuses].map(([id]) => [id, 'DONE']));
  const completedTaskletGraphDerivation: TaskletGraphDerivation = validateTaskletGraph(taskletGraphV3, completedStatuses);
  assert.equal(completedTaskletGraphDerivation.unfinishedDescendants.get('S01-F01-T01'), 0);
  assert.deepEqual([...completedTaskletGraphDerivation.depth], [...taskletGraphDerivation.depth]);
  assert.deepEqual(taskletMetadataV3, metadata());
  assert.equal(JSON.stringify([...taskletGraphV3.tasklets]), originalTasklets);
  assert.equal(JSON.stringify([...taskletGraphV3.features]), originalFeatures);
  assert.deepEqual([...statuses], originalStatuses);
  const mismatchedStatuses: ReadonlyMap<string, TaskletStatus> = new Map([['S01-F01-T01', 'DONE']]);
  assert.throws(() => validateTaskletGraph(taskletGraphV3, mismatchedStatuses), /exactly the same tasklet IDs/);
  assert.equal(JSON.stringify([...taskletGraphV3.tasklets]), originalTasklets);
  assert.equal(JSON.stringify([...taskletGraphV3.features]), originalFeatures);
  assert.deepEqual([...mismatchedStatuses], [['S01-F01-T01', 'DONE']]);
});
