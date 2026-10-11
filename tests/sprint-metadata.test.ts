// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSprintFile, readSprints, readSprintMetadataV1, readSprintMetadataV2, readSprintMetadataV3,
  type SprintMetadataV1, type SprintMetadataV2, type SprintMetadataV3,
  type SprintV1, type SprintV2, type SprintV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';

function metadata(id = 'S01'): SprintMetadataV3 {
  return { schemaVersion: 3, id, planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: false } };
}
function source(sprintMetadata: SprintMetadataV1 | SprintMetadataV2 | SprintMetadataV3): string {
  return `# Sprint\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadata)}\n-->\n`;
}

test('physical sprint readers preserve planning, version-specific execution and null execution', () => {
  const sprintMetadataV1: SprintMetadataV1 = { schemaVersion: 1, id: 'S01',
    planning: { status: 'PLANNING', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], planned_paths: ['src/input.ts'] } };
  const sprintV1: SprintV1 = readSprintMetadataV1('S01.md', sprintMetadataV1);
  assert.deepEqual(sprintV1, { ...sprintMetadataV1, filePath: 'S01.md' });
  const sprintMetadataV3: SprintMetadataV3 = metadata();
  const sprintMetadataV2: SprintMetadataV2 = { ...sprintMetadataV3, schemaVersion: 2 };
  const sprintV2: SprintV2 = readSprintMetadataV2('S01.md', sprintMetadataV2);
  const sprintV3: SprintV3 = readSprintMetadataV3('S01.md', sprintMetadataV3);
  assert.deepEqual(sprintV2.execution, sprintV3.execution);
  assert.equal(sprintV3.execution?.tasklets_reviewed, false);
  const planningOnlySprintMetadataV3: SprintMetadataV3 = { ...sprintMetadataV3, execution: null };
  assert.equal(readSprintMetadataV3('S01.md', planningOnlySprintMetadataV3).execution, null);
  assert.deepEqual(parseSprintFile('S01.md', source(sprintMetadataV1)), sprintV1);
  assert.deepEqual(parseSprintFile('S01.md', source(sprintMetadataV2)), sprintV2);
  assert.deepEqual(parseSprintFile('S01.md', source(sprintMetadataV3)), sprintV3);
});

test('unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count', () => {
  const sprintMetadataV3: SprintMetadataV3 = metadata();
  const invalidReviewed: unknown = { ...sprintMetadataV3, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: 'false' } };
  assert.throws(() => readSprintMetadataV3('S01.md', invalidReviewed), /must be Boolean/);
  const invalidPath: unknown = { ...sprintMetadataV3, planning: { status: 'APPROVED', depends_on: [], scope_roots: ['../escape'] } };
  assert.throws(() => readSprintMetadataV3('S01.md', invalidPath), /invalid path segment/);
  assert.throws(() => readSprintMetadataV3('S02.md', sprintMetadataV3), /metadata id must be S02/);
  assert.throws(() => parseSprintFile('S01.md', source(sprintMetadataV3) + source(sprintMetadataV3)), /exactly one/);
  assert.throws(() => parseSprintFile('S01.md', '<!-- ponytail-plan-sprint\nnull\n-->\n'), /unsupported schemaVersion/);
});

test('discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-metadata-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'sprints');
  fs.mkdirSync(directory);
  const earlierSprintMetadataV3: SprintMetadataV3 = metadata('S2');
  const laterSprintMetadataV3: SprintMetadataV3 = metadata('S10');
  fs.writeFileSync(path.join(directory, 'S2.md'), source(earlierSprintMetadataV3));
  fs.writeFileSync(path.join(directory, 'S10.md'), source(laterSprintMetadataV3));
  assert.deepEqual(readSprints(root).map(sprint => sprint.id), ['S2', 'S10']);
  const duplicateSprintMetadataV3: SprintMetadataV3 = metadata('S02');
  fs.writeFileSync(path.join(directory, 'S02.md'), source(duplicateSprintMetadataV3));
  assert.throws(() => readSprints(root), /duplicate numeric sprint order/);
  fs.unlinkSync(path.join(directory, 'S02.md'));
  const laterSprintMetadataV2: SprintMetadataV2 = { ...laterSprintMetadataV3, schemaVersion: 2 };
  fs.writeFileSync(path.join(directory, 'S10.md'), source(laterSprintMetadataV2));
  assert.throws(() => readSprints(root), /must not mix physical sprint schema versions/);
});
