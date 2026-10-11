// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli, type PlanInputEnqueueCommand, type PlanInputCoordinateCommand, type PlanInputReleaseCommand,
  type PlanInputListCommand, type PlanInputClaimCommand, type PlanInputCompleteCommand } from '../src/plan-input-command.js';

// Traceability: verifies REQ-PLAN-INPUT-QUEUE
test('CLI grammar preserves multiword prompts and validates lifecycle commands', () => {
  const planInputEnqueueCommand: PlanInputEnqueueCommand = { command: 'enqueue', plan: 'plan', prompt: 'a new bug' };
  const planInputCoordinateCommand: PlanInputCoordinateCommand = { command: 'coordinate', plan: 'plan' };
  const planInputReleaseCommand: PlanInputReleaseCommand = { command: 'release', plan: 'plan' };
  const planInputListCommand: PlanInputListCommand = { command: 'list', plan: 'plan', json: true };
  const textPlanInputListCommand: PlanInputListCommand = { ...planInputListCommand, json: false };
  const planInputClaimCommand: PlanInputClaimCommand = { command: 'claim', plan: 'plan', json: true };
  const textPlanInputClaimCommand: PlanInputClaimCommand = { ...planInputClaimCommand, json: false };
  const planInputCompleteCommand: PlanInputCompleteCommand = {
    command: 'complete', plan: 'plan', id: 'id', records: ['pm/requirements/index.md'] };
  assert.deepEqual(parseCli(['plan', '--', 'a', 'new', 'bug']), planInputEnqueueCommand);
  assert.deepEqual(parseCli(['coordinate', 'plan']), planInputCoordinateCommand);
  assert.deepEqual(parseCli(['release', 'plan']), planInputReleaseCommand);
  assert.deepEqual(parseCli(['list', 'plan', '--json']), planInputListCommand);
  assert.deepEqual(parseCli(['list', 'plan']), textPlanInputListCommand);
  assert.deepEqual(parseCli(['claim', 'plan', '--json']), planInputClaimCommand);
  assert.deepEqual(parseCli(['claim', 'plan']), textPlanInputClaimCommand);
  assert.deepEqual(parseCli(['complete', 'plan', 'id', '--record', 'pm/requirements/index.md']), planInputCompleteCommand);
  for (const argv of [[], ['complete', 'plan', 'id'], ['coordinate'], ['release', 'plan', 'extra'],
    ['list', 'plan', '--unknown'], ['claim', 'plan', '--json', 'extra'], ['complete', 'plan', 'id', '--record'],
    ['complete', 'plan', 'id', '--unknown', 'pm/path'], ['plan', 'prompt']]) {
    assert.throws(() => parseCli(argv), /usage/);
  }
});
