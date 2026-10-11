// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claim, complete, enqueue, entries, readV1, readV2, type PlanInputV1, type PlanInputV2 } from '../src/plan-input-queue.js';

function repository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-'));
  fs.mkdirSync(path.join(root, 'pm', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'pm', 'requirements', 'index.md'), '# Requirements\n');
  return root;
}

// Traceability: verifies REQ-PLAN-INPUT-QUEUE
test('both producers share the exact durable V2 queue contract', t => {
  const root = repository();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cliPlanInputV2: PlanInputV2 = enqueue(root, 'campaign-a', 'root-a', 'first requirement', 'cli');
  const composerPlanInputV2: PlanInputV2 = enqueue(root, 'campaign-a', 'child-a', 'second requirement\nwith detail', 'codex-composer', { sessionId: 's', turnId: 't' });
  assert.deepEqual(entries(root, 'campaign-a').map(({ source, submittedPlanId, prompt }) => ({ source, submittedPlanId, prompt })), [
    { source: 'cli', submittedPlanId: 'root-a', prompt: 'first requirement' },
    { source: 'codex-composer', submittedPlanId: 'child-a', prompt: 'second requirement\nwith detail' },
  ]);
  const persistedInput: unknown = JSON.parse(fs.readFileSync(path.join(root, 'pm', 'plan-inputs', 'campaign-a', 'open', `${composerPlanInputV2.id}.json`), 'utf8'));
  assert.equal(readV2(persistedInput).turnId, 't');
  assert.equal(composerPlanInputV2.schemaVersion, 2);
  assert.notEqual(cliPlanInputV2.id, composerPlanInputV2.id);
});

// Traceability: verifies REQ-PLAN-INPUT-QUEUE
test('physical V1 remains exact but is retired from queue consumption', t => {
  const planInputV1: PlanInputV1 = { schemaVersion: 1, id: 'legacy', status: 'open', source: 'cli',
    prompt: 'legacy input', receivedAt: '2026-09-27T00:00:00.000Z', sessionId: null, turnId: null };
  const decodedPlanInputV1: PlanInputV1 = readV1(planInputV1);
  assert.deepEqual(decodedPlanInputV1, planInputV1);
  assert.notEqual(decodedPlanInputV1, planInputV1);
  const malformedInput: unknown = { ...planInputV1, campaignId: 'new-field' };
  assert.throws(() => readV1(malformedInput), /unknown field campaignId/);
  const root = repository();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'pm', 'plan-inputs', 'campaign-a', 'open');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'legacy.json'), JSON.stringify(planInputV1));
  assert.throws(() => entries(root, 'campaign-a'), /repository-scoped V1 plan input is retired/);
});

// Traceability: verifies REQ-PLAN-INPUT-QUEUE
test('one claim is a critical section and completion requires durable PM evidence', t => {
  const root = repository();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const firstPlanInputV2: PlanInputV2 = enqueue(root, 'campaign-a', 'root-a', 'first', 'cli');
  const secondPlanInputV2: PlanInputV2 = enqueue(root, 'campaign-a', 'root-a', 'second', 'cli');
  enqueue(root, 'campaign-b', 'root-b', 'independent', 'cli');
  assert.equal(claim(root, 'campaign-a')?.id, firstPlanInputV2.id);
  enqueue(root, 'campaign-a', 'root-a', 'third', 'cli');
  assert.equal(claim(root, 'campaign-a')?.id, firstPlanInputV2.id);
  assert.throws(() => complete(root, 'campaign-a', firstPlanInputV2.id, []), /at least one PM record/);
  assert.throws(() => complete(root, 'campaign-a', firstPlanInputV2.id, ['pm/requirements/missing.md']), /does not exist/);
  complete(root, 'campaign-a', firstPlanInputV2.id, ['pm/requirements/index.md']);
  assert.equal(claim(root, 'campaign-a')?.id, secondPlanInputV2.id);
  assert.equal(entries(root, 'campaign-b')[0]?.prompt, 'independent');
  assert.deepEqual(entries(root, 'campaign-a').map(({ status, prompt }) => ({ status, prompt })), [
    { status: 'closed', prompt: 'first' }, { status: 'in_progress', prompt: 'second' }, { status: 'open', prompt: 'third' },
  ]);
});
