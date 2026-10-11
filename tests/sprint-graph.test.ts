// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type SprintV1, type SprintV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { validateDependencies, validatePathOwnership, validateV3PathOwnership } from '../skills/plan-execution/scripts/sprint-graph.js';

function legacySprint(id: string, depends_on: readonly string[], planned_paths: readonly string[]): SprintV1 {
  return { schemaVersion: 1, id, planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on, planned_paths }, filePath: `${id}.md` };
}

test('both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs', () => {
  for (const lifecycle of ['planning', 'execution']) {
    const firstSprintV1: SprintV1 = legacySprint('S01', [], []);
    const secondSprintV1: SprintV1 = legacySprint('S02', [], []);
    function withDependencies(sprintV1: SprintV1, depends_on: readonly string[]): SprintV1 {
      return lifecycle === 'planning'
        ? { ...sprintV1, planning: { ...sprintV1.planning, depends_on } }
        : { ...sprintV1, execution: { status: 'PENDING', depends_on, planned_paths: [] } };
    }
    const valid: readonly SprintV1[] = [firstSprintV1, withDependencies(secondSprintV1, ['S01'])];
    const before = JSON.stringify(valid);
    const sprintById: ReadonlyMap<string, SprintV1> = validateDependencies(valid);
    assert.deepEqual([...sprintById.keys()], ['S01', 'S02']);
    assert.equal(sprintById.get('S01'), firstSprintV1);
    assert.equal(JSON.stringify(valid), before);
    const missing: readonly SprintV1[] = [withDependencies(firstSprintV1, ['S99'])];
    const self: readonly SprintV1[] = [withDependencies(firstSprintV1, ['S01'])];
    const cyclic: readonly SprintV1[] = [withDependencies(firstSprintV1, ['S02']), withDependencies(secondSprintV1, ['S01'])];
    for (const invalid of [missing, self, cyclic]) {
      const original = JSON.stringify(invalid);
      assert.throws(() => validateDependencies(invalid));
      assert.equal(JSON.stringify(invalid), original);
    }
  }
});

test('legacy path ownership recognizes transitive execution ordering and rejects unordered sharing', () => {
  const firstSprintV1: SprintV1 = legacySprint('S01', [], ['src/shared.ts']);
  const middleSprintV1: SprintV1 = legacySprint('S02', ['S01'], ['src/middle.ts']);
  const lastSprintV1: SprintV1 = legacySprint('S03', ['S02'], ['src/shared.ts']);
  const sprints: readonly SprintV1[] = [firstSprintV1, middleSprintV1, lastSprintV1];
  const sprintById: ReadonlyMap<string, SprintV1> = validateDependencies(sprints);
  validatePathOwnership(sprints, sprintById);
  const unorderedLastSprintV1: SprintV1 = legacySprint('S03', [], ['src/shared.ts']);
  const unorderedSprints: readonly SprintV1[] = [firstSprintV1, middleSprintV1, unorderedLastSprintV1];
  assert.throws(() => validatePathOwnership(unorderedSprints, validateDependencies(unorderedSprints)), /unordered sprint path overlap: S01, S03, src\/shared.ts/);
});

function taskletSprint(root: string, id: string, depends_on: readonly string[]): SprintV3 {
  const sprintV3: SprintV3 = { schemaVersion: 3, id, planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on, tasklets_reviewed: true }, filePath: path.join(root, `${id}.md`) };
  const feature = `${id}-F01`;
  const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: id,
    features: { [feature]: { depends_on: [], validation_tasklet: `${feature}-T02` } }, tasklets: {
      [`${feature}-T01`]: { depends_on: [], affinity: [], risk: 'normal', feature, planned_paths: ['src/shared.ts'] },
      [`${feature}-T02`]: { depends_on: [`${feature}-T01`], affinity: [], risk: 'normal', feature, planned_paths: [] } } };
  fs.writeFileSync(path.join(root, `${id}.tasklets.json`), JSON.stringify(taskletMetadataV3));
  return sprintV3;
}

test('V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-graph-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const firstSprintV3: SprintV3 = taskletSprint(root, 'S01', []);
  const secondSprintV3: SprintV3 = taskletSprint(root, 'S02', []);
  const unorderedSprints: readonly SprintV3[] = [firstSprintV3, secondSprintV3];
  assert.throws(() => validateV3PathOwnership(unorderedSprints, validateDependencies(unorderedSprints)), /unordered sprint path overlap/);
  const orderedSecondSprintV3: SprintV3 = { ...secondSprintV3, execution: { status: 'PENDING', depends_on: ['S01'], tasklets_reviewed: true } };
  const orderedSprints: readonly SprintV3[] = [firstSprintV3, orderedSecondSprintV3];
  validateV3PathOwnership(orderedSprints, validateDependencies(orderedSprints));
  const planningOnlySprintV3: SprintV3 = { ...secondSprintV3, id: 'S03', execution: null, filePath: path.join(root, 'S03.md') };
  const planningOnlySprints: readonly SprintV3[] = [planningOnlySprintV3];
  validateV3PathOwnership(planningOnlySprints, validateDependencies(planningOnlySprints));
  assert.equal(fs.existsSync(path.join(root, 'S03.tasklets.json')), false);
});
