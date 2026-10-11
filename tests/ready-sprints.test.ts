// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type SprintV1, type SprintV2, type SprintV3, type SprintExecutionStatus, type SprintPlanningStatus } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { readSprints, parseSprintFile, validateDependencies, validatePathOwnership, validateCheckpointOrder,
 selectPlanningReadySprints, selectPlanningReviewableSprints, selectExecutionReadySprints,
 selectExecutionRunnableSprints, selectExecutionReviewableSprints } from '../skills/plan-execution/scripts/ready-sprints.js';

const tool = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/ready-sprints.js');
function sprint(id: string, status: SprintExecutionStatus = 'PENDING', depends_on: readonly string[] = [],
 tasklets_reviewed = true, planningStatus: SprintPlanningStatus = 'APPROVED'): SprintV3 {
 return { schemaVersion: 3, id, planning: { status: planningStatus, depends_on: [], scope_roots: ['src'] },
 execution: { status, depends_on, tasklets_reviewed }, filePath: `${id}.md` };
}
function checkpoint(id: string, status: SprintExecutionStatus = 'PENDING', depends_on: readonly string[] = [], tasklets_reviewed = true): SprintV2 {
 const sprintV3: SprintV3 = sprint(id, status, depends_on, tasklets_reviewed);
 return { ...sprintV3, schemaVersion: 2 };
}
function legacy(id: string, planned_paths: readonly string[] = [`src/${id}.ts`]): SprintV1 {
 return { schemaVersion: 1, id, planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
 execution: { status: 'PENDING', depends_on: [], planned_paths }, filePath: `${id}.md` };
}
function writePlan(testContext: TestContext, sprints: readonly (SprintV1 | SprintV2 | SprintV3)[],
 plannedPaths: ReadonlyMap<string, readonly string[]> = new Map()): string {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-sprints-'));
 testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
 const directory = path.join(root, 'sprints');
 fs.mkdirSync(directory);
 for (const sprint of sprints) {
  const text = JSON.stringify(sprint, (key, value: unknown) => key === 'filePath' ? undefined : value);
  fs.writeFileSync(path.join(directory, `${sprint.id}.md`), `<!-- ponytail-plan-sprint\n${text}\n-->\n`);
  if (sprint.schemaVersion === 3 && sprint.execution) {
   const feature = `${sprint.id}-F01`;
   const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: sprint.id,
    features: { [feature]: { depends_on: [], validation_tasklet: `${feature}-T01` } },
    tasklets: { [`${feature}-T01`]: { depends_on: [], affinity: [], risk: 'normal', feature,
     planned_paths: plannedPaths.get(sprint.id) ?? [`src/${sprint.id}.ts`] } } };
   fs.writeFileSync(path.join(directory, `${sprint.id}.tasklets.json`), JSON.stringify(taskletMetadataV3));
  }
 }
 return root;
}
function runnable(sprints: readonly SprintV3[]): string[] { return selectExecutionRunnableSprints(sprints, validateDependencies(sprints)); }
function reviewable(sprints: readonly SprintV3[]): string[] { return selectExecutionReviewableSprints(sprints, validateDependencies(sprints)); }

// Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION
test('V3 runnable selection resumes the started sprint without relaxing start or review gates', () => {
 const initial: readonly SprintV3[] = [sprint('S01'), sprint('S02', 'IN_PROGRESS')];
 assert.deepEqual(selectExecutionReadySprints(initial, validateDependencies(initial)), ['S01']);
 assert.deepEqual(runnable(initial), ['S02']);
 assert.deepEqual(runnable([sprint('S01'), sprint('S02', 'IN_PROGRESS', [], false)]), []);
 assert.deepEqual(runnable([sprint('S01'), sprint('S02', 'IN_PROGRESS', [], true, 'STUB')]), []);
 assert.throws(() => runnable([sprint('S01'), sprint('S02', 'IN_PROGRESS', ['S01'])]), /advanced before unfinished dependency S01/);
 const unblocked: readonly SprintV3[] = [sprint('S01', 'DONE'), sprint('S02', 'IN_PROGRESS', ['S01'])];
 assert.deepEqual(selectExecutionReadySprints(unblocked, validateDependencies(unblocked)), []);
 assert.deepEqual(runnable(unblocked), ['S02']);
 assert.deepEqual(runnable([sprint('S01', 'DONE'), sprint('S02', 'DONE', ['S01'])]), []);
});

test('reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies', () => {
 assert.deepEqual(reviewable([sprint('S01', 'DONE'), sprint('S02', 'PENDING', ['S01'], false), sprint('S03', 'PENDING', ['S02'], false)]), ['S02']);
 assert.deepEqual(runnable([sprint('S01', 'DONE'), sprint('S02', 'PENDING', ['S01'], false), sprint('S03', 'PENDING', ['S02'], false)]), []);
 assert.deepEqual(reviewable([sprint('S01', 'DONE'), sprint('S02', 'PENDING', ['S01']), sprint('S03', 'PENDING', ['S02'], false)]), []);
 assert.deepEqual(reviewable([sprint('S01', 'DONE'), sprint('S02', 'IN_PROGRESS', ['S01']), sprint('S03', 'PENDING', ['S02'], false)]), []);
 assert.deepEqual(reviewable([sprint('S01', 'DONE'), sprint('S02', 'DONE', ['S01']), sprint('S03', 'PENDING', ['S02'], false)]), ['S03']);
 assert.deepEqual(reviewable([sprint('S01', 'DONE'), sprint('S02', 'DONE', ['S01']), sprint('S03', 'PENDING', ['S02'], false, 'STUB')]), []);
});

test('selects one V1 sprint and retains unordered-path validation', () => {
 const sprints: readonly SprintV1[] = [legacy('S01'), legacy('S02')];
 assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies(sprints)), ['S01']);
 const overlapping: readonly SprintV1[] = [legacy('S01', ['src/shared.ts']), legacy('S02', ['src/shared.ts'])];
 assert.throws(() => validatePathOwnership(overlapping, validateDependencies(overlapping)), /unordered sprint path overlap/);
});

test('selects one dependency-ready planning sprint and gates detailed planning review', () => {
 const firstSprintV3: SprintV3 = { ...sprint('S01'), planning: { status: 'STUB', depends_on: [], scope_roots: ['x'] }, execution: null };
 const secondSprintV3: SprintV3 = { ...sprint('S02'), planning: { status: 'STUB', depends_on: ['S01'], scope_roots: ['y'] }, execution: null };
 const pending: readonly SprintV3[] = [firstSprintV3, secondSprintV3];
 assert.deepEqual(selectPlanningReadySprints(pending, validateDependencies(pending)), ['S01']);
 const firstReviewSprintV3: SprintV3 = { ...firstSprintV3, planning: { ...firstSprintV3.planning, status: 'READY_FOR_REVIEW' } };
 const secondReviewSprintV3: SprintV3 = { ...secondSprintV3, planning: { ...secondSprintV3.planning, status: 'READY_FOR_REVIEW' } };
 const review: readonly SprintV3[] = [firstReviewSprintV3, secondReviewSprintV3];
 assert.deepEqual(selectPlanningReadySprints(review, validateDependencies(review)), []);
 assert.deepEqual(selectPlanningReviewableSprints(review, validateDependencies(review)), ['S01']);
 const approvedSprintV3: SprintV3 = { ...firstReviewSprintV3, planning: { ...firstReviewSprintV3.planning, status: 'APPROVED' } };
 const unblocked: readonly SprintV3[] = [approvedSprintV3, secondReviewSprintV3];
 assert.deepEqual(selectPlanningReviewableSprints(unblocked, validateDependencies(unblocked)), ['S02']);
 const executedSprintV3: SprintV3 = { ...secondReviewSprintV3, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: false } };
 const executed: readonly SprintV3[] = [approvedSprintV3, executedSprintV3];
 assert.deepEqual(selectPlanningReviewableSprints(executed, validateDependencies(executed)), []);
});

test('V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors', testContext => {
 const fixtures: readonly SprintV2[] = [checkpoint('S03'), checkpoint('S01'), checkpoint('S02')];
 const sprints = readSprints(writePlan(testContext, fixtures));
 assert.deepEqual(sprints.map(sprint => sprint.id), ['S01', 'S02', 'S03']);
 assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies<SprintV1 | SprintV2 | SprintV3>(sprints)), ['S01']);
 const next: readonly SprintV2[] = [checkpoint('S01', 'DONE'), checkpoint('S02'), checkpoint('S03')];
 assert.deepEqual(selectExecutionReadySprints(next, validateDependencies(next)), ['S02']);
 const unreviewed: readonly SprintV2[] = [checkpoint('S01', 'DONE'), checkpoint('S02', 'PENDING', [], false)];
 assert.throws(() => selectExecutionReadySprints(unreviewed, validateDependencies(unreviewed)), /tasklets must be reviewed/);
 const blocked: readonly SprintV2[] = [checkpoint('S01', 'DONE'), checkpoint('S02', 'PENDING', ['S03']), checkpoint('S03')];
 assert.deepEqual(selectExecutionReadySprints(blocked, validateDependencies(blocked)), []);
 assert.throws(() => validateCheckpointOrder([checkpoint('S01'), checkpoint('S02', 'IN_PROGRESS')]), /advanced before unfinished predecessor/);
});

test('V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies', () => {
 const sprints: readonly SprintV3[] = [sprint('S01', 'DONE'), sprint('S02', 'PENDING', ['S01']), sprint('S03', 'PENDING', ['S01']), sprint('S04', 'PENDING', ['S02'], false)];
 assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies(sprints)), ['S02']);
 const advanced: readonly SprintV3[] = [sprint('S01'), sprint('S02', 'IN_PROGRESS', ['S01'])];
 assert.throws(() => selectExecutionReadySprints(advanced, validateDependencies(advanced)), /advanced before unfinished dependency/);
});

test('native CLI rejects unordered V3 paths and permits explicitly ordered sharing', testContext => {
 const paths: ReadonlyMap<string, readonly string[]> = new Map([['S01', ['src/shared.ts']], ['S02', ['src/shared.ts']]]);
 const unordered: readonly SprintV3[] = [sprint('S01'), sprint('S02')];
 const unorderedRoot = writePlan(testContext, unordered, paths);
 const rejected = spawnSync(process.execPath, [tool, 'execution', unorderedRoot], { encoding: 'utf8' });
 assert.equal(rejected.status, 1);
 assert.match(rejected.stderr, /unordered sprint path overlap/);
 const ordered: readonly SprintV3[] = [sprint('S01', 'DONE'), sprint('S02', 'PENDING', ['S01'])];
 const orderedRoot = writePlan(testContext, ordered, paths);
 const accepted = spawnSync(process.execPath, [tool, 'execution', orderedRoot], { encoding: 'utf8' });
 assert.equal(accepted.status, 0, accepted.stderr);
 assert.equal(accepted.stdout, '["S02"]\n');
});

test('native V2 CLI returns exact JSON and leaves inputs unchanged', testContext => {
 const fixtures: readonly SprintV2[] = [checkpoint('S01')];
 const root = writePlan(testContext, fixtures);
 const file = path.join(root, 'sprints', 'S01.md');
 const before = fs.readFileSync(file, 'utf8');
 const command = spawnSync(process.execPath, [tool, 'execution', root], { encoding: 'utf8' });
 assert.equal(command.status, 0, command.stderr);
 assert.equal(command.stdout, '["S01"]\n');
 assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('preserves literal bracket scope roots and rejects glob and escaping legacy paths', () => {
 for (const route of ['app/[id]', 'app/[...slug]', 'app/[[...slug]]']) {
  const sprintV1: SprintV1 = { ...legacy('S01', [`${route}/page.tsx`]), planning: { status: 'APPROVED', depends_on: [], scope_roots: [route] } };
  const text = JSON.stringify(sprintV1, (key, value: unknown) => key === 'filePath' ? undefined : value);
  const parsed = parseSprintFile('S01.md', `<!-- ponytail-plan-sprint\n${text}\n-->`);
  assert.equal(parsed.schemaVersion, 1);
  if (parsed.schemaVersion !== 1 || !parsed.execution) throw new Error('missing V1 execution');
  assert.deepEqual(parsed.planning.scope_roots, [route]);
  assert.deepEqual(parsed.execution.planned_paths, [`${route}/page.tsx`]);
 }
 for (const invalid of ['app/*', 'app/?', 'app/{a,b}', '../app', '/app']) {
  const malformed: unknown = { schemaVersion: 1, id: 'S01', planning: { status: 'APPROVED', depends_on: [], scope_roots: [invalid] },
   execution: { status: 'PENDING', depends_on: [], planned_paths: ['src/input.ts'] } };
  assert.throws(() => parseSprintFile('S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(malformed)}\n-->`), /glob syntax|invalid path segment/);
 }
});

test('physical dispatch rejects an unsupported future version and legacy execution globs', () => {
 const unsupported: unknown = { schemaVersion: 4, id: 'S01', planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
  execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } };
 assert.throws(() => parseSprintFile('S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(unsupported)}\n-->`), /unsupported schemaVersion/);
 const malformed: unknown = { schemaVersion: 1, id: 'S01', planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
  execution: { status: 'PENDING', depends_on: [], planned_paths: ['a/*'] } };
 assert.throws(() => parseSprintFile('S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(malformed)}\n-->`), /glob/);
});
