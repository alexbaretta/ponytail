// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type TaskletMetadataV1, type TaskletMetadataV2, type TaskletMetadataV3, type TaskletMetadataV4,
 type FeatureTasklet, type TaskletFeature } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { type TaskletStatus } from '../skills/plan-execution/scripts/tasklet-statuses.js';
import { MAX_BATCH_TASKLETS, TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph,
 validateTaskletGraph, selectReadyTasklets } from '../skills/plan-execution/scripts/ready-tasklets.js';

interface TaskletFixture { readonly root: string; readonly sprint: string }
const tool = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/ready-tasklets.js');
function boundary(testContext: TestContext, value: unknown, headings = ''): TaskletFixture {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-tasklets-'));
 testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
 const sprint = path.join(root, 'S01.md');
 fs.writeFileSync(sprint, `# Sprint\n${headings}\n`);
 fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify(value));
 return { root, sprint };
}
function fixture(testContext: TestContext, taskletMetadata: TaskletMetadataV1 | TaskletMetadataV2 | TaskletMetadataV3 | TaskletMetadataV4,
 statuses: ReadonlyMap<string, TaskletStatus> = new Map(Object.keys(taskletMetadata.tasklets).map(id => [id, 'PENDING']))): TaskletFixture {
 const headings = [...statuses].map(([id, status]) => `### [${status === 'PENDING' ? ' ' : status}] Tasklet ${id}: Work ${id}`).join('\n');
 return boundary(testContext, taskletMetadata, headings);
}
function normal(feature: string, planned_paths: readonly string[], depends_on: readonly string[] = [], affinity: readonly string[] = []): FeatureTasklet {
 return { depends_on, affinity, risk: 'normal', feature, planned_paths };
}
function metadata(): TaskletMetadataV2 {
 return { schemaVersion: 2, sprint: 'S01', features: {
  'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' },
  'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T02' } }, tasklets: {
  'S01-F01-T01': { depends_on: [], affinity: ['core'], risk: 'high', risk_reason: 'Owns the core boundary.', feature: 'S01-F01', planned_paths: ['src/a.ts'] },
  'S01-F01-T02': normal('S01-F01', [], ['S01-F01-T01']),
  'S01-F02-T01': normal('S01-F02', ['src/b.ts']),
  'S01-F02-T02': normal('S01-F02', ['tests/b.test.ts'], ['S01-F02-T01']) } };
}
function withTasklet(taskletMetadataV2: TaskletMetadataV2, id: string, featureTasklet: FeatureTasklet): TaskletMetadataV2 {
 return { ...taskletMetadataV2, tasklets: { ...taskletMetadataV2.tasklets, [id]: featureTasklet } };
}
function withFeature(taskletMetadataV2: TaskletMetadataV2, id: string, taskletFeature: TaskletFeature): TaskletMetadataV2 {
 return { ...taskletMetadataV2, features: { ...taskletMetadataV2.features, [id]: taskletFeature } };
}
function select(taskletFixture: TaskletFixture, last: string | null = null): ReturnType<typeof selectReadyTasklets> {
 const graph = readTaskletGraph(taskletFixture.sprint);
 const statuses = parseTaskletStatuses(taskletFixture.sprint);
 return selectReadyTasklets(graph, statuses, validateTaskletGraph(graph, statuses), last);
}
function validate(taskletFixture: TaskletFixture): void {
 validateTaskletGraph(readTaskletGraph(taskletFixture.sprint), parseTaskletStatuses(taskletFixture.sprint));
}

// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('retains strict physical V1 parsing and scalar selection', testContext => {
 assert.deepEqual(Object.keys(TaskletMetadataReaders), ['V1', 'V2', 'V3', 'V4']);
 const taskletMetadataV1: TaskletMetadataV1 = { schemaVersion: 1, sprint: 'S01', tasklets: {
  'S01-F01-T01': { depends_on: [], affinity: ['core'], risk: 'normal' },
  'S01-F01-T02': { depends_on: [], affinity: [], risk: 'high', risk_reason: 'Historical risk.' } } };
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV1);
 const graph = readTaskletGraph(taskletFixture.sprint);
 assert.equal(graph.schemaVersion, 1);
 assert.equal('features' in graph, false);
 assert.deepEqual(select(taskletFixture), { next: 'S01-F01-T02', criteria: { risk: 'high', affinity_overlap: 0, unfinished_descendants: 0, remaining_depth: 0 } });
 const command = spawnSync(process.execPath, [tool, taskletFixture.sprint], { encoding: 'utf8' });
 assert.equal(command.status, 0, command.stderr);
 assert.equal(command.stdout, '{"next":"S01-F01-T02","criteria":{"risk":"high","affinity_overlap":0,"unfinished_descendants":0,"remaining_depth":0}}\n');
});

test('V4 preserves V3 local selection and rejects malformed external edges', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
 const taskletMetadataV4: TaskletMetadataV4 = { ...taskletMetadataV3, schemaVersion: 4,
  external_depends_on: { 'S01-F01-T01': [{ plan_id: 'external-plan', tasklet_id: 'S05-F01-T02' }] } };
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV4);
 const graph = readTaskletGraph(taskletFixture.sprint);
 assert.equal(graph.schemaVersion, 4);
 if (graph.schemaVersion !== 4) throw new Error('missing V4 graph');
 assert.deepEqual(graph.externalDependsOn.get('S01-F01-T01'), [{ planId: 'external-plan', taskletId: 'S05-F01-T02' }]);
 const localTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV3);
 assert.deepEqual(select(taskletFixture), select(localTaskletFixture));
 const unknownOwner: unknown = { ...taskletMetadataV4, external_depends_on: { 'S01-F01-T99': [{ plan_id: 'external-plan', tasklet_id: 'S05-F01-T02' }] } };
 const unknownTaskletFixture: TaskletFixture = boundary(testContext, unknownOwner);
 assert.throws(() => readTaskletGraph(unknownTaskletFixture.sprint), /known tasklet/);
 const duplicate: unknown = { ...taskletMetadataV4, external_depends_on: { 'S01-F01-T01': [
  { plan_id: 'external-plan', tasklet_id: 'S05-F01-T02' }, { plan_id: 'external-plan', tasklet_id: 'S05-F01-T02' }] } };
 const duplicateTaskletFixture: TaskletFixture = boundary(testContext, duplicate);
 assert.throws(() => readTaskletGraph(duplicateTaskletFixture.sprint), /duplicate external dependency/);
});

test('requires strict V2 identity, keys, feature membership, risk reasons and paths', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
 const validTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2);
 const currentTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV3);
 assert.equal(readTaskletGraph(validTaskletFixture.sprint).schemaVersion, 2);
 assert.equal(readTaskletGraph(currentTaskletFixture.sprint).schemaVersion, 3);
 const malformedInputs: readonly unknown[] = [
  { ...taskletMetadataV2, schemaVersion: 5 },
  { ...taskletMetadataV2, tasklets: { ...taskletMetadataV2.tasklets, 'S01-F01-T01': { ...normal('S01-F01', ['src/a.ts']), description: 'extra' } } },
  { ...taskletMetadataV2, tasklets: { ...taskletMetadataV2.tasklets, 'S01-F01-T01': normal('S01-F02', ['src/a.ts']) } },
  { ...taskletMetadataV2, tasklets: { ...taskletMetadataV2.tasklets, 'S01-F01-T01': normal('S01-F01', ['src/*']) } },
  { ...taskletMetadataV2, tasklets: { ...taskletMetadataV2.tasklets, 'S01-F01-T01': { depends_on: [], affinity: [], risk: 'high', feature: 'S01-F01', planned_paths: ['src/a.ts'] } } }
 ];
 for (const malformedInput of malformedInputs) {
  const taskletFixture: TaskletFixture = boundary(testContext, malformedInput);
  assert.throws(() => readTaskletGraph(taskletFixture.sprint));
 }
});

test('requires validation ownership, direct dependency coverage and implementation paths', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const missingDependencyTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F01-T02', normal('S01-F01', []));
 const emptyPathTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F01-T01', normal('S01-F01', []));
 const wrongOwnerTaskletMetadataV2: TaskletMetadataV2 = withFeature(taskletMetadataV2, 'S01-F01', { depends_on: [], validation_tasklet: 'S01-F02-T02' });
 const dependencyTaskletFixture: TaskletFixture = fixture(testContext, missingDependencyTaskletMetadataV2);
 const emptyTaskletFixture: TaskletFixture = fixture(testContext, emptyPathTaskletMetadataV2);
 const ownerTaskletFixture: TaskletFixture = fixture(testContext, wrongOwnerTaskletMetadataV2);
 assert.throws(() => validate(dependencyTaskletFixture), /directly depend on every other/);
 assert.throws(() => validate(emptyTaskletFixture), /non-validation.*requires planned_paths/);
 assert.throws(() => validate(ownerTaskletFixture), /invalid validation_tasklet/);
 const validTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2);
 assert.doesNotThrow(() => select(validTaskletFixture));
});

test('rejects tasklet and feature dependency errors, cycles and status identity mismatches', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const unknownTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F01-T01', normal('S01-F01', ['src/a.ts'], ['S01-F99-T01']));
 const cyclicTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F01-T01', normal('S01-F01', ['src/a.ts'], ['S01-F01-T02']));
 const cyclicFeatureTaskletMetadataV2: TaskletMetadataV2 = withFeature(withFeature(taskletMetadataV2, 'S01-F01',
  { depends_on: ['S01-F02'], validation_tasklet: 'S01-F01-T02' }), 'S01-F02', { depends_on: ['S01-F01'], validation_tasklet: 'S01-F02-T02' });
 const undeclaredTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F02-T01', normal('S01-F02', ['src/b.ts'], ['S01-F01-T01']));
 const cases: readonly (readonly [TaskletMetadataV2, RegExp])[] = [
  [unknownTaskletMetadataV2, /unknown tasklet dependency/], [cyclicTaskletMetadataV2, /tasklet dependency cycle/],
  [cyclicFeatureTaskletMetadataV2, /feature dependency cycle/], [undeclaredTaskletMetadataV2, /cross-feature dependency requires feature dependency/] ];
 for (const [value, pattern] of cases) {
  const taskletFixture: TaskletFixture = fixture(testContext, value);
  assert.throws(() => validate(taskletFixture), pattern);
 }
 const statuses: ReadonlyMap<string, TaskletStatus> = new Map([['S01-F01-T01', 'PENDING']]);
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2, statuses);
 assert.throws(() => validate(taskletFixture), /exactly the same/);
});

test('selects the highest-ranked V2 tasklet', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = { ...metadata(), features: {
  'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' },
  'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T02' },
  'S01-F03': { depends_on: [], validation_tasklet: 'S01-F03-T02' } }, tasklets: {
  'S01-F01-T01': { depends_on: [], affinity: [], risk: 'high', risk_reason: 'Ranks first.', feature: 'S01-F01', planned_paths: ['src/shared.ts'] },
  'S01-F01-T02': normal('S01-F01', [], ['S01-F01-T01', 'S01-F01-T03']),
  'S01-F01-T03': normal('S01-F01', ['src/same-feature-disjoint.ts']),
  'S01-F02-T01': normal('S01-F02', ['src/feature-b.ts']), 'S01-F02-T02': normal('S01-F02', [], ['S01-F02-T01']),
  'S01-F03-T01': normal('S01-F03', ['src/disjoint.ts']), 'S01-F03-T02': normal('S01-F03', [], ['S01-F03-T01']) } };
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2);
 assert.deepEqual(select(taskletFixture), { next: ['S01-F01-T01'], criteria: {
  'S01-F01-T01': { risk: 'high', affinity_overlap: 0, unfinished_descendants: 1, remaining_depth: 1 } } });
});

test('rejects unordered overlap within and across features but permits ordered overlap', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const acrossTaskletMetadataV2: TaskletMetadataV2 = withTasklet(taskletMetadataV2, 'S01-F02-T01', normal('S01-F02', ['src/a.ts']));
 const acrossTaskletFixture: TaskletFixture = fixture(testContext, acrossTaskletMetadataV2);
 assert.throws(() => validate(acrossTaskletFixture), /unordered tasklet path overlap.*S01-F01-T01.*S01-F02-T01.*src\/a\.ts/);
 const withinTaskletMetadataV2: TaskletMetadataV2 = withTasklet(withTasklet(taskletMetadataV2, 'S01-F01-T03', normal('S01-F01', ['src/a.ts'])),
  'S01-F01-T02', normal('S01-F01', [], ['S01-F01-T01', 'S01-F01-T03']));
 const withinTaskletFixture: TaskletFixture = fixture(testContext, withinTaskletMetadataV2);
 assert.throws(() => validate(withinTaskletFixture), /unordered tasklet path overlap.*S01-F01-T01.*S01-F01-T03.*src\/a\.ts/);
 const orderedTaskletMetadataV2: TaskletMetadataV2 = withTasklet(withFeature(taskletMetadataV2, 'S01-F02',
  { depends_on: ['S01-F01'], validation_tasklet: 'S01-F02-T02' }), 'S01-F02-T01', normal('S01-F02', ['src/a.ts']));
 const orderedTaskletFixture: TaskletFixture = fixture(testContext, orderedTaskletMetadataV2);
 assert.doesNotThrow(() => select(orderedTaskletFixture));
});

test('blocks tasklets until dependency-feature validation is complete', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = withFeature(metadata(), 'S01-F02', { depends_on: ['S01-F01'], validation_tasklet: 'S01-F02-T02' });
 const pendingTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2);
 assert.deepEqual(select(pendingTaskletFixture).next, ['S01-F01-T01']);
 const implementationStatuses: ReadonlyMap<string, TaskletStatus> = new Map([
  ['S01-F01-T01', 'DONE'], ['S01-F01-T02', 'PENDING'], ['S01-F02-T01', 'PENDING'], ['S01-F02-T02', 'PENDING'] ]);
 const implementationTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2, implementationStatuses);
 assert.deepEqual(select(implementationTaskletFixture).next, ['S01-F01-T02']);
 const featureStatuses: ReadonlyMap<string, TaskletStatus> = new Map([
  ['S01-F01-T01', 'DONE'], ['S01-F01-T02', 'DONE'], ['S01-F02-T01', 'PENDING'], ['S01-F02-T02', 'PENDING'] ]);
 const featureTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2, featureStatuses);
 assert.deepEqual(select(featureTaskletFixture).next, ['S01-F02-T01']);
});

test('uses prior affinity and graph criteria deterministically', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = withTasklet(withTasklet(metadata(), 'S01-F01-T01', normal('S01-F01', ['src/a.ts'], [], ['core'])),
  'S01-F02-T01', normal('S01-F02', ['src/b.ts'], [], ['core']));
 const statuses: ReadonlyMap<string, TaskletStatus> = new Map([
  ['S01-F01-T01', 'DONE'], ['S01-F01-T02', 'PENDING'], ['S01-F02-T01', 'PENDING'], ['S01-F02-T02', 'PENDING'] ]);
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2, statuses);
 assert.deepEqual(select(taskletFixture, 'S01-F01-T01'), { next: ['S01-F02-T01'], criteria: {
  'S01-F02-T01': { risk: 'normal', affinity_overlap: 1, unfinished_descendants: 1, remaining_depth: 1 } } });
});

test('returns exact completion JSON and leaves all input bytes unchanged', testContext => {
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const statuses: ReadonlyMap<string, TaskletStatus> = new Map(Object.keys(taskletMetadataV2.tasklets).map(id => [id, 'DONE']));
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2, statuses);
 const graphFile = path.join(taskletFixture.root, 'S01.tasklets.json');
 const before = fs.readFileSync(taskletFixture.sprint, 'utf8');
 const graphBefore = fs.readFileSync(graphFile, 'utf8');
 assert.deepEqual(select(taskletFixture), { next: null });
 const command = spawnSync(process.execPath, [tool, taskletFixture.sprint], { encoding: 'utf8' });
 assert.equal(command.status, 0, command.stderr);
 assert.equal(command.stdout, '{"next":null}\n');
 assert.equal(fs.readFileSync(taskletFixture.sprint, 'utf8'), before);
 assert.equal(fs.readFileSync(graphFile, 'utf8'), graphBefore);
});

test('V3 returns one complete ordered batch', testContext => {
 const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: 'S01', features: {
  'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T03' }, 'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T03' },
  'S01-F03': { depends_on: ['S01-F01', 'S01-F02'], validation_tasklet: 'S01-F03-T02' } }, tasklets: {
  'S01-F01-T01': normal('S01-F01', ['src/a.ts']), 'S01-F01-T02': normal('S01-F01', ['src/a-helper.ts'], ['S01-F01-T01']),
  'S01-F01-T03': normal('S01-F01', ['tests/a.test.ts'], ['S01-F01-T01', 'S01-F01-T02']),
  'S01-F02-T01': normal('S01-F02', ['src/b.ts']), 'S01-F02-T02': normal('S01-F02', ['src/b-helper.ts'], ['S01-F02-T01']),
  'S01-F02-T03': normal('S01-F02', ['tests/b.test.ts'], ['S01-F02-T01', 'S01-F02-T02']),
  'S01-F03-T01': normal('S01-F03', ['src/converged.ts']), 'S01-F03-T02': normal('S01-F03', [], ['S01-F03-T01']) } };
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV3);
 const result = select(taskletFixture);
 assert.deepEqual(result.next, [{ tasklets: ['S01-F01-T01', 'S01-F01-T02'], planned_paths: ['src/a.ts', 'src/a-helper.ts'] }]);
 assert.ok(result.next !== null);
 assert.equal('S01-F03-T01' in result.criteria, false);
 assert.equal('S01-F01-T03' in result.criteria, false);
 assert.equal('S01-F02-T01' in result.criteria, false);
});

test('V3 bounds a batch while V2 selects one tasklet', testContext => {
 const tasklets: Record<string, FeatureTasklet> = {};
 for (let index = 1; index <= MAX_BATCH_TASKLETS + 2; index++) {
  const id = `S01-F01-T${String(index).padStart(2, '0')}`;
  tasklets[id] = normal('S01-F01', [`src/${index}.ts`], index === 1 ? [] : [`S01-F01-T${String(index - 1).padStart(2, '0')}`]);
 }
 const validation = `S01-F01-T${String(MAX_BATCH_TASKLETS + 2).padStart(2, '0')}`;
 tasklets[validation] = normal('S01-F01', [`src/${MAX_BATCH_TASKLETS + 2}.ts`], Object.keys(tasklets).filter(id => id !== validation));
 const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: 'S01', features: {
  'S01-F01': { depends_on: [], validation_tasklet: validation } }, tasklets };
 const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV3);
 assert.deepEqual(select(taskletFixture).next, [{ tasklets: Array.from({ length: MAX_BATCH_TASKLETS }, (_, index) => `S01-F01-T${String(index + 1).padStart(2, '0')}`),
  planned_paths: Array.from({ length: MAX_BATCH_TASKLETS }, (_, index) => `src/${index + 1}.ts`) }]);
 const taskletMetadataV2: TaskletMetadataV2 = metadata();
 const legacyTaskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV2);
 assert.deepEqual(select(legacyTaskletFixture).next, ['S01-F01-T01']);
});

test('preserves bracket route paths as exact leases and rejects invalid paths', testContext => {
 for (const route of ['app/[id]/page.tsx', 'app/[...slug]/page.tsx', 'app/[[...slug]]/page.tsx']) {
  const taskletMetadataV2: TaskletMetadataV2 = withTasklet(metadata(), 'S01-F01-T01', normal('S01-F01', [route]));
  const taskletMetadataV3: TaskletMetadataV3 = { ...taskletMetadataV2, schemaVersion: 3 };
  const taskletFixture: TaskletFixture = fixture(testContext, taskletMetadataV3);
  assert.deepEqual(select(taskletFixture).next, [{ tasklets: ['S01-F01-T01'], planned_paths: [route] }]);
 }
 for (const invalid of ['app/*/page.tsx', 'app/?/page.tsx', 'app/{a,b}/page.tsx', '../app/page.tsx', '/app/page.tsx']) {
  const malformed: unknown = { ...metadata(), schemaVersion: 3, tasklets: { 'S01-F01-T01': normal('S01-F01', [invalid]) } };
  const taskletFixture: TaskletFixture = boundary(testContext, malformed);
  assert.throws(() => readTaskletGraph(taskletFixture.sprint), /glob syntax|invalid path segment/);
 }
});
