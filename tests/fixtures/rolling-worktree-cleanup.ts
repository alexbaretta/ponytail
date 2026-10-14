// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const root = process.env.PONYTAIL_WORKTREE_ROOT;assert.ok(root);
assert.equal(process.cwd(),root);
assert.ok(process.env.PONYTAIL_ASSIGNMENT_ID);
assert.ok(process.env.PONYTAIL_WORKTREE_GENERATION);
assert.ok(process.env.PONYTAIL_ASSIGNMENT_GENERATION);
if (fs.existsSync(path.join(root,'session_id.txt'))) assert.equal(fs.readFileSync(path.join(root,'session_id.txt'),'utf8').trim(),process.env.PONYTAIL_SESSION_ID);
if (fs.existsSync(path.join(root,'cleanup-refuse.txt'))) throw new Error('fixture resource cleanup refused');
const resourcePath = path.join(root,'owned-resource.txt');
if (fs.existsSync(resourcePath)) {
 assert.equal(fs.readFileSync(resourcePath,'utf8'),process.env.PONYTAIL_WORKTREE_GENERATION);
 fs.unlinkSync(resourcePath);
}
if(fs.existsSync(path.join(root,'cleanup-change-marker.txt'))) fs.writeFileSync(path.join(root,'session_id.txt'),'foreign-worker\n');
