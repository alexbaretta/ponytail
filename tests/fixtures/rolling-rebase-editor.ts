// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';

// QA fixture: Git invokes this editor for one-commit and two-commit native Arcs.
// It changes only the supplied todo file and stops at every replayed commit.
const todoPath = process.argv[2];
if (!todoPath || process.argv.length !== 3) throw new Error('expected one Git todo file');
const todo = fs.readFileSync(todoPath,'utf8');
const commits = todo.split('\n').filter(line => line.startsWith('pick ')).length;
if (commits !== 1 && commits !== 2) {
 throw new Error('native fixture requires one or two replayed commits');
}
fs.writeFileSync(todoPath,todo.replace(/^pick /gmu,'edit '));
