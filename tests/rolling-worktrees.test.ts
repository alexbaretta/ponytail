// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { readRollingPhysicalDirectory, provisionRollingWorktree } from '../src/rolling-worktrees.js';

// Traceability: verifies REQ-ROLLING-WORKERS
test('physical pool identity follows symlink ancestors before missing directories are created', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-path-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'real'));
  fs.symlinkSync(path.join(root, 'real'), path.join(root, 'alias'));
  assert.equal(readRollingPhysicalDirectory(path.join(root, 'alias/missing/pool')), path.join(root, 'real/missing/pool'));
  fs.writeFileSync(path.join(root, 'file'), 'not a directory');
  assert.throws(() => readRollingPhysicalDirectory(path.join(root, 'file/pool')), /ENOTDIR/);
  for (const number of [100, 101.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => provisionRollingWorktree(root, { number, generation: 'invalid', rootPath: root }, 'a'.repeat(40)), /invalid checkout lease/);
  }
});
