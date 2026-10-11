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

test('physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation', () => {
  const sprintMetadataV1: SprintMetadataV1 = { schemaVersion: 1, id: 'S01',
    planning: { status: 'APPROVED', depends_on: ['S00'], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: ['S00'], planned_paths: ['src/input.ts'] } };
  const original = JSON.stringify(sprintMetadataV1);
  const sprintV1: SprintV1 = readSprintMetadataV1('S01.md', sprintMetadataV1);
  assert.deepEqual(sprintV1, { ...sprintMetadataV1, filePath: 'S01.md' });
  assert.equal(JSON.stringify(sprintMetadataV1), original);
  const planningOnlySprintMetadataV1: SprintMetadataV1 = { ...sprintMetadataV1, execution: null };
  const planningOnlySprintV1: SprintV1 = readSprintMetadataV1('S01.md', planningOnlySprintMetadataV1);
  assert.deepEqual(planningOnlySprintV1, { ...planningOnlySprintMetadataV1, filePath: 'S01.md' });
  assert.deepEqual(parseSprintFile('S01.md', source(planningOnlySprintMetadataV1)), planningOnlySprintV1);
  const malformedInputs: readonly unknown[] = [
    { ...sprintMetadataV1, schemaVersion: 2 },
    { ...sprintMetadataV1, extra: true },
    { ...sprintMetadataV1, id: 'S02' },
    { ...sprintMetadataV1, planning: { ...sprintMetadataV1.planning, status: 'UNKNOWN' } },
    { ...sprintMetadataV1, planning: { ...sprintMetadataV1.planning, depends_on: ['S00', 'S00'] } },
    { ...sprintMetadataV1, execution: { status: 'UNKNOWN', depends_on: [], planned_paths: [] } },
    { ...sprintMetadataV1, execution: { status: 'PENDING', depends_on: [], planned_paths: ['../escape'] } },
    { ...sprintMetadataV1, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } }
  ];
  for (const malformedInput of malformedInputs) {
    const before = JSON.stringify(malformedInput);
    assert.throws(() => readSprintMetadataV1('S01.md', malformedInput));
    assert.equal(JSON.stringify(malformedInput), before);
  }
});

test('physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs', () => {
  const sprintMetadataV2: SprintMetadataV2 = { schemaVersion: 2, id: 'S01',
    planning: { status: 'APPROVED', depends_on: ['S00'], scope_roots: ['src'] },
    execution: { status: 'DONE', depends_on: ['S00'], tasklets_reviewed: true } };
  const original = JSON.stringify(sprintMetadataV2);
  const sprintV2: SprintV2 = readSprintMetadataV2('S01.md', sprintMetadataV2);
  assert.deepEqual(sprintV2, { ...sprintMetadataV2, filePath: 'S01.md' });
  assert.equal(JSON.stringify(sprintMetadataV2), original);
  const planningOnlySprintMetadataV2: SprintMetadataV2 = { ...sprintMetadataV2, execution: null };
  const planningOnlySprintV2: SprintV2 = readSprintMetadataV2('S01.md', planningOnlySprintMetadataV2);
  assert.deepEqual(planningOnlySprintV2, { ...planningOnlySprintMetadataV2, filePath: 'S01.md' });
  assert.deepEqual(parseSprintFile('S01.md', source(planningOnlySprintMetadataV2)), planningOnlySprintV2);
  assert.deepEqual(parseSprintFile('S01.md', source(sprintMetadataV2)), sprintV2);
  const malformedInputs: readonly unknown[] = [
    { ...sprintMetadataV2, schemaVersion: 3 },
    { ...sprintMetadataV2, extra: true },
    { ...sprintMetadataV2, id: 'S02' },
    { ...sprintMetadataV2, planning: { ...sprintMetadataV2.planning, status: 'UNKNOWN' } },
    { ...sprintMetadataV2, execution: { status: 'DONE', depends_on: ['S00'], tasklets_reviewed: 'true' } },
    { ...sprintMetadataV2, execution: { status: 'UNKNOWN', depends_on: [], tasklets_reviewed: true } },
    { ...sprintMetadataV2, execution: { status: 'DONE', depends_on: ['S00', 'S00'], tasklets_reviewed: true } },
    { ...sprintMetadataV2, execution: { status: 'DONE', depends_on: [], planned_paths: ['src/input.ts'] } }
  ];
  for (const malformedInput of malformedInputs) {
    const before = JSON.stringify(malformedInput);
    assert.throws(() => readSprintMetadataV2('S01.md', malformedInput));
    assert.equal(JSON.stringify(malformedInput), before);
  }
});

test('physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged', () => {
  const sprintMetadataV3: SprintMetadataV3 = metadata();
  const original = JSON.stringify(sprintMetadataV3);
  const sprintV3: SprintV3 = readSprintMetadataV3('S01.md', sprintMetadataV3);
  assert.deepEqual(sprintV3, { ...sprintMetadataV3, filePath: 'S01.md' });
  assert.equal(JSON.stringify(sprintMetadataV3), original);
  const planningOnlySprintMetadataV3: SprintMetadataV3 = { ...sprintMetadataV3, execution: null };
  assert.deepEqual(parseSprintFile('S01.md', source(planningOnlySprintMetadataV3)),
    { ...planningOnlySprintMetadataV3, filePath: 'S01.md' });
  const malformedInputs: readonly unknown[] = [
    { ...sprintMetadataV3, schemaVersion: 2 },
    { ...sprintMetadataV3, extra: true },
    { ...sprintMetadataV3, execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: 'false' } },
    { ...sprintMetadataV3, execution: { status: 'PENDING', depends_on: [], planned_paths: ['src/input.ts'] } }
  ];
  for (const malformedInput of malformedInputs) {
    const before = JSON.stringify(malformedInput);
    assert.throws(() => readSprintMetadataV3('S01.md', malformedInput));
    assert.equal(JSON.stringify(malformedInput), before);
  }
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

test('discovery preserves homogeneous physical collections and files and rejects absent or empty collections', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => readSprints(root), /sprint directory does not exist/);
  const directory = path.join(root, 'sprints');
  fs.mkdirSync(directory);
  assert.throws(() => readSprints(root), /no SNN.md sprint files/);
  fs.writeFileSync(path.join(directory, 'notes.md'), '# Inert prose');
  fs.mkdirSync(path.join(directory, 'S99.md'));
  const sprintMetadataV1: SprintMetadataV1 = { schemaVersion: 1, id: 'S2',
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], planned_paths: ['src/input.ts'] } };
  const sprintMetadataV2: SprintMetadataV2 = { schemaVersion: 2, id: 'S2',
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } };
  const sprintMetadataV3: SprintMetadataV3 = metadata('S2');
  for (const sprintMetadata of [sprintMetadataV1, sprintMetadataV2, sprintMetadataV3]) {
    const text = source(sprintMetadata);
    const file = path.join(directory, 'S2.md');
    fs.writeFileSync(file, text);
    assert.deepEqual(readSprints(root), [{ ...sprintMetadata, filePath: file }]);
    assert.equal(fs.readFileSync(file, 'utf8'), text);
    assert.equal(fs.readFileSync(path.join(directory, 'notes.md'), 'utf8'), '# Inert prose');
    assert.ok(fs.statSync(path.join(directory, 'S99.md')).isDirectory());
  }
});
