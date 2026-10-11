// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { databaseOptions, ProjectIndexError } from '../src/project-index-database.js';

test('project-local database options preserve pg defaults and password environment semantics', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'database-options-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'ponytail-journal.json');
  fs.writeFileSync(file, JSON.stringify({ database: { name: 'fixture' } }));
  assert.deepEqual(databaseOptions(root), { database: 'fixture', host: undefined, port: undefined, user: undefined, password: undefined });
  const environmentEntry = Object.entries(process.env).find((entry): entry is [string, string] => typeof entry[1] === 'string');
  assert.ok(environmentEntry);
  const [passwordEnvironment, password] = environmentEntry;
  fs.writeFileSync(file, JSON.stringify({ database: { name: 'fixture', host: 'localhost', port: 5432, role: 'fixture', passwordEnvironment } }));
  assert.deepEqual(databaseOptions(root), { database: 'fixture', host: 'localhost', port: 5432, user: 'fixture', password });
  const absentEnvironment = `PONYTAIL_FIXTURE_${crypto.randomUUID()}`;
  assert.equal(process.env[absentEnvironment], undefined);
  fs.writeFileSync(file, JSON.stringify({ database: { name: 'fixture', passwordEnvironment: absentEnvironment } }));
  assert.throws(() => databaseOptions(root), (error: unknown) => error instanceof ProjectIndexError &&
    error.code === 'PROJECT_INDEX_PASSWORD_MISSING' && error.message.includes(absentEnvironment));
});

test('database options reject malformed consumed configuration fields', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'database-options-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const invalidInputs: readonly unknown[] = [null, [], {}, { database: [] },
    { database: { name: 7 } }, { database: { host: false } }, { database: { role: [] } },
    { database: { passwordEnvironment: null } }, ...[0, -1, 65536, 1.5, '5432'].map(port => ({ database: { port } }))];
  for (const invalidInput of invalidInputs) {
    fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify(invalidInput));
    assert.throws(() => databaseOptions(root), (error: unknown) => error instanceof ProjectIndexError && error.code === 'PROJECT_INDEX_DATABASE_INVALID');
  }
});
