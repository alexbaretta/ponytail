// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type TaskletMetadataV1 } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { type CampaignPlanMetadataV3 } from '../src/campaign-plan-metadata.js';

const tool = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/ready-tasklets.js');
function fixture(root: string): string {
  fs.mkdirSync(path.join(root, 'sprints'));
  const sprintFile = path.join(root, 'sprints', 'S01.md');
  const taskletMetadataV1: TaskletMetadataV1 = { schemaVersion: 1, sprint: 'S01', tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' } } };
  fs.writeFileSync(sprintFile, '### [ ] Tasklet S01-F01-T01: work\n');
  fs.writeFileSync(path.join(root, 'sprints', 'S01.tasklets.json'), JSON.stringify(taskletMetadataV1));
  return sprintFile;
}

test('generated portable launch path preserves scalar selection and exact completion output', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-tasklets-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sprintFile = fixture(root);
  const command = spawnSync(process.execPath, [tool, sprintFile], { encoding: 'utf8' });
  assert.equal(command.status, 0, command.stderr);
  assert.equal(command.stderr, '');
  assert.equal(command.stdout, '{"next":"S01-F01-T01","criteria":{"risk":"normal","affinity_overlap":0,"unfinished_descendants":0,"remaining_depth":0}}\n');
  assert.equal(fs.readFileSync(sprintFile, 'utf8'), '### [ ] Tasklet S01-F01-T01: work\n');
  fs.writeFileSync(sprintFile, '### [DONE] Tasklet S01-F01-T01: work\n');
  const completedCommand = spawnSync(process.execPath, [tool, sprintFile], { encoding: 'utf8' });
  assert.equal(completedCommand.status, 0, completedCommand.stderr);
  assert.equal(completedCommand.stdout, '{"next":null}\n');
});

test('adopted owning plans require their configured obligation document', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ready-tasklets-cli-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sprintFile = fixture(root);
  const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { schemaVersion: 3, id: 'plan', parent_plan_id: null,
    depends_on: [], obligation_document: 'obligations.json' };
  fs.writeFileSync(path.join(root, 'plan.md'), `<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV3)}\n-->\n`);
  const command = spawnSync(process.execPath, [tool, sprintFile], { encoding: 'utf8' });
  assert.equal(command.status, 1);
  assert.equal(command.stdout, '');
  assert.equal(command.stderr, 'adopted plan requires its configured --obligations document and --root\n');
  fs.writeFileSync(path.join(root, 'obligations.json'), '{}');
  fs.writeFileSync(path.join(root, 'other.json'), '{}');
  const mismatchedCommand = spawnSync(process.execPath, [tool, sprintFile, '--obligations', path.join(root, 'other.json'), '--root', root], { encoding: 'utf8' });
  assert.equal(mismatchedCommand.status, 1);
  assert.equal(mismatchedCommand.stdout, '');
  assert.equal(mismatchedCommand.stderr, 'obligation selector must use the configured adopted document\n');
});
