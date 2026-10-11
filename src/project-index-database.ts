// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import type { PoolConfig } from 'pg';

export class ProjectIndexError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || typeof value === 'string') return value;
  throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', `database.${field} must be a string when supplied`);
}

export function databaseOptions(worktreePath: string): PoolConfig {
  const project: unknown = JSON.parse(fs.readFileSync(path.join(worktreePath, 'ponytail-journal.json'), 'utf8'));
  if (!isRecord(project) || !isRecord(project.database)) {
    throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', 'project journal must contain a database object');
  }
  const database = project.database;
  const name = optionalString(database.name, 'name');
  const host = optionalString(database.host, 'host');
  const user = optionalString(database.role, 'role');
  const passwordEnvironment = optionalString(database.passwordEnvironment, 'passwordEnvironment');
  const port = database.port;
  if (!(port === undefined || typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535)) {
    throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', 'database.port must be an integer between 1 and 65535 when supplied');
  }
  const password = passwordEnvironment === undefined ? undefined : process.env[passwordEnvironment];
  if (passwordEnvironment !== undefined && password === undefined) {
    throw new ProjectIndexError('PROJECT_INDEX_PASSWORD_MISSING', `password environment variable is missing: ${passwordEnvironment}`);
  }
  return { database: name, host, port, user, password };
}
