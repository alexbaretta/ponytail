// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';

if (process.argv[2] === '--fail') process.exit(7);
const number = process.env.PONYTAIL_WORKTREE_NUMBER;
if (number === undefined) throw new Error('setup fixture lacks worktree number');
fs.writeFileSync('setup-proof.txt', `${process.cwd()}\n${number}`);
