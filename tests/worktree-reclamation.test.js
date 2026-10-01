#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: verifies REQ-WORKTREE-RECLAMATION

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  WorktreeReclamationError,
  humanResult,
  parseArguments,
  readAdapterRequestV1,
  readAdapterResultV1,
  readCommandResultV1,
  readConfigV1,
} = require('../src/worktree-reclamation');

function capture(callback) {
  assert.throws(callback, (error) => error instanceof WorktreeReclamationError);
}

function claim(claimId, worktreePath, disposition = 'retain') {
  return {
    claimId,
    generation: `generation-${claimId}`,
    state: 'active',
    worktreePath,
    disposition,
    reason: `${disposition} ${claimId}`,
  };
}

test('reads exact lifecycle configuration and adapter requests', () => {
  assert.deepEqual(readConfigV1({ schemaVersion: 1, adapterPath: 'scripts/adapter' }), { schemaVersion: 1, adapterPath: 'scripts/adapter' });
  capture(() => readConfigV1({ schemaVersion: 1, adapterPath: '../adapter' }));
  capture(() => readConfigV1({ schemaVersion: 1, adapterPath: 'scripts/adapter', command: [] }));
  assert.deepEqual(readAdapterRequestV1({ schemaVersion: 1, operation: 'inventory' }), { schemaVersion: 1, operation: 'inventory' });
  assert.deepEqual(readAdapterRequestV1({ schemaVersion: 1, operation: 'reclaim', claim: {
    claimId: 'slot', generation: 'generation', worktreePath: '/worktree',
  } }).claim, { claimId: 'slot', generation: 'generation', worktreePath: '/worktree' });
  capture(() => readAdapterRequestV1({ schemaVersion: 1, operation: 'reclaim', claim: { claimId: 'slot', generation: 'generation', worktreePath: 'relative' } }));
});

test('normalizes exact inventory and rejects ambiguous claims', () => {
  const inventory = readAdapterResultV1({
    schemaVersion: 1,
    operation: 'inventory',
    claims: [claim('b', '/worktree-b', 'reclaim'), claim('a', '/worktree-a')],
  });
  assert.deepEqual(inventory.claims.map(({ claimId }) => claimId), ['a', 'b']);
  capture(() => readAdapterResultV1({ schemaVersion: 1, operation: 'inventory', claims: [claim('a', '/one'), claim('a', '/two')] }));
  capture(() => readAdapterResultV1({ schemaVersion: 1, operation: 'inventory', claims: [claim('a', '/one'), claim('b', '/one')] }));
  capture(() => readAdapterResultV1({ schemaVersion: 1, operation: 'inventory', claims: [{ ...claim('a', '/one'), extra: true }] }));
});

test('reads and renders the exact command result', () => {
  const result = readCommandResultV1({
    schemaVersion: 1,
    projectRoot: '/project',
    dryRun: false,
    claims: [claim('slot', '/worktree', 'reclaim')],
    results: [{ claimId: 'slot', generation: 'generation-slot', outcome: 'reclaimed', reason: 'complete' }],
    summary: { inventoried: 1, reclaimable: 1, reclaimed: 1, retained: 0, blocked: 0 },
  });
  assert.match(humanResult(result), /^RECLAIMED\tslot\tgeneration-slot\tcomplete\nSUMMARY\t/);
  assert.deepEqual(parseArguments(['reclaim', '--json', '--dry-run']), { dryRun: true, json: true });
  capture(() => parseArguments(['reclaim', '--json', '--json']));
  capture(() => readCommandResultV1({ ...result, summary: { ...result.summary, failed: 0 } }));
  capture(() => readCommandResultV1({ ...result, summary: { ...result.summary, reclaimed: 0 } }));
  capture(() => readCommandResultV1({ ...result, results: [...result.results, ...result.results] }));
  capture(() => readCommandResultV1({ ...result, dryRun: true }));
});
