// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

// Traceability: verifies REQ-PLAN-INPUT-QUEUE
// Traceability: verifies REQ-ROLLING-INTERFACES
test('plan-input hook delegates rolling flags/help and retains legacy authentication', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-hook-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  const hook = path.resolve(__dirname, '../../hooks/plan-input.js');
  const invoke = (cmd: string) => spawnSync(process.execPath, [hook], {
    cwd: root, encoding: 'utf8', env: { ...process.env, PLUGIN_DATA: path.join(root, 'plugin-data') },
    input: JSON.stringify({ hook_event_name: 'PreToolUse', cwd: root, session_id: 'unbound', tool_input: { cmd } }),
  });
  for (const cmd of [
    'ponytail campaign reconcile --campaign traceability',
    'ponytail campaign status --campaign traceability',
    'ponytail campaign reconcile --help',
    'ponytail campaign reconcile -h',
    'ponytail campaign suspend-worker --help',
    'ponytail campaign status --unknown',
  ]) {
    const result = invoke(cmd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '', cmd);
  }
  for (const cmd of [
    'ponytail campaign reconcile legacy-plan',
    'ponytail campaign advance legacy-plan',
    'ponytail campaign reconcile --campaign traceability; ponytail campaign advance legacy-plan',
  ]) {
    const result = invoke(cmd);
    assert.match(result.stdout, /"permissionDecision":"deny"/, cmd);
  }
});
