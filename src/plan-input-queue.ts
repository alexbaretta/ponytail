#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export type PlanInputSource = 'cli' | 'codex-composer';
export type PlanInputStatus = 'open' | 'in_progress' | 'closed';
interface PlanInputFields<Version extends 1 | 2> {
  readonly schemaVersion: Version;
  readonly id: string;
  readonly source: PlanInputSource;
  readonly prompt: string;
  readonly receivedAt: string;
  readonly sessionId: string | null;
  readonly turnId: string | null;
}
interface PlanInputOpen<Version extends 1 | 2> extends PlanInputFields<Version> { readonly status: 'open' }
interface PlanInputInProgress<Version extends 1 | 2> extends PlanInputFields<Version> {
  readonly status: 'in_progress'; readonly claimedAt: string;
}
interface PlanInputClosed<Version extends 1 | 2> extends PlanInputFields<Version> {
  readonly status: 'closed'; readonly claimedAt: string; readonly completedAt: string; readonly records: readonly string[];
}
interface PlanInputCampaign { readonly campaignId: string; readonly submittedPlanId: string }
export type PlanInputV1 = PlanInputOpen<1> | PlanInputInProgress<1> | PlanInputClosed<1>;
export type PlanInputV2 = (PlanInputOpen<2> | PlanInputInProgress<2> | PlanInputClosed<2>) & PlanInputCampaign;
export interface PlanInputMetadata { readonly sessionId?: string | null; readonly turnId?: string | null }
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function hasErrorCode(value: unknown, code: string): boolean {
  return value instanceof Error && 'code' in value && value.code === code;
}

export const PlanInputReaders = Object.freeze({ V1: readV1, V2: readV2 });
const SOURCES: ReadonlySet<unknown> = new Set(['cli', 'codex-composer']);
const STATUSES: readonly PlanInputStatus[] = ['open', 'in_progress', 'closed'];

export function fail(message: string): never {
  const error = new Error(message);
  error.name = 'PlanInputError';
  throw error;
}

export function readV1(value: unknown, file = 'plan input'): PlanInputV1 {
  if (!isRecord(value)) fail(`${file}: expected an object`);
  const allowed = value.status === 'open'
    ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
    : value.status === 'in_progress'
      ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
      : ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
  if (!isPlanInputV1(value, file, allowed)) fail(`${file}: invalid V1 input`);
  return { ...value };
}

export function readV2(value: unknown, file = 'plan input'): PlanInputV2 {
  if (!isRecord(value)) fail(`${file}: expected an object`);
  const allowed = value.status === 'open'
    ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
    : value.status === 'in_progress'
      ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
      : ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
  if (!isPlanInputV2(value, file, allowed)) fail(`${file}: invalid V2 input`);
  return { ...value };
}

function isPlanInputV1(value: Record<string, unknown>, file: string, allowed: readonly string[]): value is Record<string, unknown> & PlanInputV1 {
  readPhysical(value, file, 1, allowed, false); return true;
}
function isPlanInputV2(value: Record<string, unknown>, file: string, allowed: readonly string[]): value is Record<string, unknown> & PlanInputV2 {
  readPhysical(value, file, 2, allowed, true); return true;
}
function readPhysical(value: Record<string, unknown>, file: string, schemaVersion: 1 | 2, allowed: readonly string[], campaignScoped: boolean): void {
  if (value.schemaVersion !== schemaVersion) fail(`${file}: unsupported schemaVersion`);
  if (!(value.status === 'open' || value.status === 'in_progress' || value.status === 'closed')) fail(`${file}: invalid status`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${file}: unknown field ${key}`);
  const requiredStrings = ['id', 'prompt', 'receivedAt'];
  if (campaignScoped) requiredStrings.push('campaignId', 'submittedPlanId');
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || !value[key]) fail(`${file}: ${key} must be a nonempty string`);
  }
  if (!SOURCES.has(value.source)) fail(`${file}: invalid source`);
  for (const key of ['sessionId', 'turnId']) {
    if (value[key] !== null && typeof value[key] !== 'string') fail(`${file}: ${key} must be a string or null`);
  }
  if (value.status !== 'open' && (typeof value.claimedAt !== 'string' || !value.claimedAt)) fail(`${file}: claimedAt is required`);
  if (value.status === 'closed') {
    if (typeof value.completedAt !== 'string' || !value.completedAt) fail(`${file}: completedAt is required`);
    if (!Array.isArray(value.records) || value.records.length === 0 || value.records.some((item: unknown) => typeof item !== 'string')) {
      fail(`${file}: records must contain at least one path`);
    }
  }
}

export function queueRoot(repositoryRoot: string, campaignId: string): string {
  if (typeof campaignId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(campaignId)) fail('invalid campaign ID');
  return path.join(repositoryRoot, 'pm', 'plan-inputs', campaignId);
}

function lifecycleDirectory(repositoryRoot: string, campaignId: string, status: PlanInputStatus): string {
  return path.join(queueRoot(repositoryRoot, campaignId), status);
}

function readEntry(file: string): PlanInputV2 {
  let value: unknown;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file}: ${error instanceof Error ? error.message : String(error)}`); }
  if (!isRecord(value)) fail(`${file}: expected an object`);
  if (value.schemaVersion === 1) fail(`${file}: repository-scoped V1 plan input is retired and must be removed before use`);
  if (value.schemaVersion !== 2) fail(`${file}: unsupported schemaVersion`);
  return PlanInputReaders.V2(value, file);
}

export function entries(repositoryRoot: string, campaignId: string): PlanInputV2[] {
  const result: PlanInputV2[] = [];
  for (const status of STATUSES) {
    const directory = lifecycleDirectory(repositoryRoot, campaignId, status);
    if (!fs.existsSync(directory)) continue;
    for (const name of fs.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
      const file = path.join(directory, name);
      const entry: PlanInputV2 = readEntry(file);
      if (entry.status !== status) fail(`${file}: status does not match lifecycle directory`);
      result.push(entry);
    }
  }
  return result.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id));
}

function writeExclusive(file: string, entry: PlanInputV2): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`, { flag: 'wx' });
}

function withEnqueueLock<Result>(repositoryRoot: string, campaignId: string, operation: () => Result): Result {
  const lock = path.join(queueRoot(repositoryRoot, campaignId), '.enqueue.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx');
      try { return operation(); }
      finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
    } catch (error) {
      if (!hasErrorCode(error, 'EEXIST')) throw error;
      const age = Date.now() - fs.statSync(lock).mtimeMs;
      if (age > 5000) { fs.unlinkSync(lock); continue; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('timed out waiting for the plan-input enqueue lock');
}

export function enqueue(repositoryRoot: string, campaignId: string, submittedPlanId: string, prompt: string, source: PlanInputSource, metadata: PlanInputMetadata = {}): PlanInputV2 {
  if (typeof prompt !== 'string' || !prompt.trim()) fail('instruction must be nonempty');
  if (!SOURCES.has(source)) fail('invalid plan-input source');
  return withEnqueueLock(repositoryRoot, campaignId, () => {
    const newest: PlanInputV2 | undefined = entries(repositoryRoot, campaignId).at(-1);
    const now = Date.now();
    const receivedAt = new Date(Math.max(now, newest ? Date.parse(newest.receivedAt) + 1 : now)).toISOString();
    const id = `${receivedAt.replace(/[-:.]/g, '')}-${crypto.randomUUID()}`;
    const entry: PlanInputV2 = readV2({
      schemaVersion: 2,
      id,
      campaignId,
      submittedPlanId,
      status: 'open',
      source,
      prompt,
      receivedAt,
      sessionId: metadata.sessionId || null,
      turnId: metadata.turnId || null,
    });
    writeExclusive(path.join(lifecycleDirectory(repositoryRoot, campaignId, 'open'), `${id}.json`), entry);
    return entry;
  });
}

export function claim(repositoryRoot: string, campaignId: string): PlanInputV2 | null {
  const current: PlanInputV2 | undefined = entries(repositoryRoot, campaignId).find((entry) => entry.status === 'in_progress');
  if (current) return current;
  for (const entry of entries(repositoryRoot, campaignId).filter((item) => item.status === 'open')) {
    const source = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'open'), `${entry.id}.json`);
    const destination = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${entry.id}.json`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    try { fs.renameSync(source, destination); }
    catch (error) {
      if (hasErrorCode(error, 'ENOENT')) continue;
      throw error;
    }
    const claimed: PlanInputV2 = readV2({ ...entry, status: 'in_progress', claimedAt: new Date().toISOString() });
    fs.writeFileSync(destination, `${JSON.stringify(claimed, null, 2)}\n`);
    return claimed;
  }
  return null;
}

export function complete(repositoryRoot: string, campaignId: string, id: string, records: readonly string[]): PlanInputV2 {
  const source = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${id}.json`);
  if (!fs.existsSync(source)) fail(`plan input is not in progress: ${id}`);
  const normalized = [...new Set(records)].map((record) => record.replaceAll('\\', '/'));
  if (normalized.length === 0) fail('at least one PM record is required');
  for (const record of normalized) {
    if (!record.startsWith('pm/') || record.includes('/../') || path.isAbsolute(record)) fail(`record must be a repository-relative pm/ path: ${record}`);
    if (!fs.existsSync(path.join(repositoryRoot, record))) fail(`record does not exist: ${record}`);
  }
  const entry: PlanInputV2 = readEntry(source);
  const closed: PlanInputV2 = readV2({ ...entry, status: 'closed', completedAt: new Date().toISOString(), records: normalized });
  const destination = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'closed'), `${id}.json`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(source, `${JSON.stringify(closed, null, 2)}\n`);
  fs.renameSync(source, destination);
  return closed;
}
