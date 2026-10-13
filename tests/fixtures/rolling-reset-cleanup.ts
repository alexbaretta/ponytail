// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.PONYTAIL_WORKTREE_ROOT;assert.ok(root);assert.equal(process.cwd(),root);
if(fs.existsSync(path.join(root,'reset-cleanup-refuse')))throw new Error('reset cleanup refused');
const resource=path.join(root,'reset-owned-resource');if(fs.existsSync(resource))fs.unlinkSync(resource);
