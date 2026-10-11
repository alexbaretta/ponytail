// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type SprintMetadataV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';

const tool = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/ready-sprints.js');
function source(sprintMetadataV3: SprintMetadataV3): string {
  return `# Sprint\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n`;
}

test('generated sprint CLI preserves planning, execution and completion JSON', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-sprints-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'sprints');
  fs.mkdirSync(directory);
  const file = path.join(directory, 'S01.md');
  const planningSprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'STUB', depends_on: [], scope_roots: ['src'] }, execution: null };
  fs.writeFileSync(file, source(planningSprintMetadataV3));
  const planningCommand = spawnSync(process.execPath, [tool, 'planning', root], { encoding: 'utf8' });
  assert.equal(planningCommand.status, 0, planningCommand.stderr);
  assert.equal(planningCommand.stdout, '["S01"]\n');
  assert.equal(fs.readFileSync(file, 'utf8'), source(planningSprintMetadataV3));
  const executionSprintMetadataV3: SprintMetadataV3 = { ...planningSprintMetadataV3,
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } };
  const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: 'S01', features: {
    'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } }, tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src/input.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } };
  fs.writeFileSync(file, source(executionSprintMetadataV3));
  fs.writeFileSync(path.join(directory, 'S01.tasklets.json'), JSON.stringify(taskletMetadataV3));
  const executionCommand = spawnSync(process.execPath, [tool, 'execution', root], { encoding: 'utf8' });
  assert.equal(executionCommand.status, 0, executionCommand.stderr);
  assert.equal(executionCommand.stdout, '["S01"]\n');
  assert.equal(fs.readFileSync(file, 'utf8'), source(executionSprintMetadataV3));
  assert.equal(fs.readFileSync(path.join(directory, 'S01.tasklets.json'), 'utf8'), JSON.stringify(taskletMetadataV3));
  const completedSprintMetadataV3: SprintMetadataV3 = { ...executionSprintMetadataV3,
    execution: { status: 'DONE', depends_on: [], tasklets_reviewed: true } };
  fs.writeFileSync(file, source(completedSprintMetadataV3));
  const completedCommand = spawnSync(process.execPath, [tool, 'execution', root], { encoding: 'utf8' });
  assert.equal(completedCommand.status, 0, completedCommand.stderr);
  assert.equal(completedCommand.stdout, '[]\n');
  assert.equal(fs.readFileSync(file, 'utf8'), source(completedSprintMetadataV3));
  assert.equal(fs.readFileSync(path.join(directory, 'S01.tasklets.json'), 'utf8'), JSON.stringify(taskletMetadataV3));
});

test('native sprint CLI preserves grammar error output and exit status', () => {
  const command = spawnSync(process.execPath, [tool, 'unknown'], { encoding: 'utf8' });
  assert.equal(command.status, 1);
  assert.equal(command.stdout, '');
  assert.equal(command.stderr, 'usage: ready-sprints.js <planning|execution> <plan-directory>\n');
});
