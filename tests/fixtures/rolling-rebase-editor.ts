// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';

// QA fixture: Git invokes this configured editor for the one-commit native Arc.
// It changes only the todo file supplied by Git and leaves an explicit edit stop.
const todoPath = process.argv[2];
if (!todoPath || process.argv.length !== 3) throw new Error('expected one Git todo file');
const todo = fs.readFileSync(todoPath,'utf8');
if (todo.split('\n').filter(line => line.startsWith('pick ')).length !== 1) {
 throw new Error('native fixture requires exactly one replayed commit');
}
fs.writeFileSync(todoPath,todo.replace(/^pick /mu,'edit '));
