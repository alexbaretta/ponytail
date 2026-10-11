// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readTaskletMetadataV1, readTaskletMetadataV2, readTaskletMetadataV3, readTaskletMetadataV4, readTaskletGraph,
  type TaskletMetadataV1, type TaskletMetadataV2, type TaskletMetadataV3, type TaskletMetadataV4,
  type TaskletGraphV1, type TaskletGraphV2, type TaskletGraphV3, type TaskletGraphV4 } from '../skills/plan-execution/scripts/tasklet-metadata.js';

function metadata(): TaskletMetadataV2 {
  return { schemaVersion: 2, sprint: 'S01', features: { 'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } },
    tasklets: { 'S01-F01-T01': { depends_on: [], affinity: ['metadata'], risk: 'high', risk_reason: 'boundary change',
      feature: 'S01-F01', planned_paths: ['src/input.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } };
}

test('physical versions retain normalized maps, risk reasons and external dependency identities', () => {
  const taskletMetadataV1: TaskletMetadataV1 = { schemaVersion: 1, sprint: 'S01', tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' } } };
  const originalV1 = JSON.stringify(taskletMetadataV1);
  const taskletGraphV1: TaskletGraphV1 = readTaskletMetadataV1('S01', taskletMetadataV1, 'S01.tasklets.json');
  assert.equal(taskletGraphV1.schemaVersion, 1);
  assert.deepEqual([...taskletGraphV1.tasklets], Object.entries(taskletMetadataV1.tasklets));
  assert.equal(JSON.stringify(taskletMetadataV1), originalV1);
  const taskletMetadataV2: TaskletMetadataV2 = metadata();
  const originalV2 = JSON.stringify(taskletMetadataV2);
  const taskletGraphV2: TaskletGraphV2 = readTaskletMetadataV2('S01', taskletMetadataV2, 'S01.tasklets.json');
  const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
  const originalV3 = JSON.stringify(taskletMetadataV3);
  const taskletGraphV3: TaskletGraphV3 = readTaskletMetadataV3('S01', taskletMetadataV3, 'S01.tasklets.json');
  assert.deepEqual([...taskletGraphV2.tasklets], [...taskletGraphV3.tasklets]);
  assert.deepEqual([...taskletGraphV2.features], [...taskletGraphV3.features]);
  assert.equal(JSON.stringify(taskletMetadataV2), originalV2);
  assert.equal(JSON.stringify(taskletMetadataV3), originalV3);
  const taskletMetadataV4: TaskletMetadataV4 = { ...taskletMetadataV3, schemaVersion: 4,
    external_depends_on: { 'S01-F01-T01': [{ plan_id: 'parent', tasklet_id: 'S02-F01-T01' }] } };
  const originalV4 = JSON.stringify(taskletMetadataV4);
  const taskletGraphV4: TaskletGraphV4 = readTaskletMetadataV4('S01', taskletMetadataV4, 'S01.tasklets.json');
  assert.deepEqual([...taskletGraphV4.externalDependsOn], [['S01-F01-T01', [{ planId: 'parent', taskletId: 'S02-F01-T01' }]]]);
  assert.deepEqual([...taskletGraphV4.tasklets], [...taskletGraphV3.tasklets]);
  assert.equal(JSON.stringify(taskletMetadataV4), originalV4);
});

test('unknown metadata rejects invalid risk reasons, paths and external declarations', () => {
  const taskletMetadataV2: TaskletMetadataV2 = metadata();
  const missingReason: unknown = { ...taskletMetadataV2, tasklets: { 'S01-F01-T01': {
    depends_on: [], affinity: [], risk: 'high', feature: 'S01-F01', planned_paths: ['src/input.ts'] } } };
  const originalMissingReason = JSON.stringify(missingReason);
  assert.throws(() => readTaskletMetadataV2('S01', missingReason, 'metadata'), /must contain exactly/);
  assert.equal(JSON.stringify(missingReason), originalMissingReason);
  const invalidPaths: unknown = { ...taskletMetadataV2, tasklets: { 'S01-F01-T01': {
    depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['../escape'] } } };
  assert.throws(() => readTaskletMetadataV2('S01', invalidPaths, 'metadata'), /invalid path segment/);
  const duplicateExternal: unknown = { ...taskletMetadataV2, schemaVersion: 4, external_depends_on: {
    'S01-F01-T01': [{ plan_id: 'parent', tasklet_id: 'S02-F01-T01' }, { plan_id: 'parent', tasklet_id: 'S02-F01-T01' }] } };
  assert.throws(() => readTaskletMetadataV4('S01', duplicateExternal, 'metadata'), /duplicate external dependency/);
  const wrongExternalType: unknown = { ...taskletMetadataV2, schemaVersion: 4, external_depends_on: {
    'S01-F01-T01': [{ plan_id: 'parent', tasklet_id: 5 }] } };
  assert.throws(() => readTaskletMetadataV4('S01', wrongExternalType, 'metadata'), /invalid external dependency/);
});

test('file dispatch validates unknown JSON and each supported physical version', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tasklet-metadata-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sprintFile = path.join(root, 'S01.md');
  const graphFile = path.join(root, 'S01.tasklets.json');
  const taskletMetadataV2: TaskletMetadataV2 = metadata();
  const taskletMetadataV1: TaskletMetadataV1 = { schemaVersion: 1, sprint: 'S01', tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' } } };
  const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
  const taskletMetadataV4: TaskletMetadataV4 = { ...taskletMetadataV2, schemaVersion: 4, external_depends_on: {} };
  const versions: readonly (TaskletMetadataV1 | TaskletMetadataV2 | TaskletMetadataV3 | TaskletMetadataV4)[] =
    [taskletMetadataV1, taskletMetadataV2, taskletMetadataV3, taskletMetadataV4];
  for (const version of versions) {
    fs.writeFileSync(graphFile, JSON.stringify(version));
    assert.equal(readTaskletGraph(sprintFile).schemaVersion, version.schemaVersion);
    assert.equal(fs.readFileSync(graphFile, 'utf8'), JSON.stringify(version));
  }
  fs.writeFileSync(graphFile, 'null');
  assert.throws(() => readTaskletGraph(sprintFile), /unsupported schemaVersion/);
  assert.equal(fs.readFileSync(graphFile, 'utf8'), 'null');
  fs.writeFileSync(graphFile, '{');
  assert.throws(() => readTaskletGraph(sprintFile), /cannot parse tasklet metadata/);
  assert.equal(fs.readFileSync(graphFile, 'utf8'), '{');
  assert.throws(() => readTaskletGraph(path.join(root, 'S01')), /must end in .md/);
});
