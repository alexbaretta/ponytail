#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { resolveCampaignRoot } = require('./campaign-census');

const PlanInputReaders = Object.freeze({ V1: readV1, V2: readV2 });
const SOURCES = new Set(['cli', 'codex-composer']);
const STATUSES = ['open', 'in_progress', 'closed'];

function fail(message) {
  const error = new Error(message);
  error.name = 'PlanInputError';
  throw error;
}

function readV1(value, file = 'plan input') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${file}: expected an object`);
  const allowed = value.status === 'open'
    ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
    : value.status === 'in_progress'
      ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
      : ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
  return readPhysical(value, file, 1, allowed, false);
}

function readV2(value, file = 'plan input') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${file}: expected an object`);
  const allowed = value.status === 'open'
    ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
    : value.status === 'in_progress'
      ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
      : ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
  return readPhysical(value, file, 2, allowed, true);
}

function readPhysical(value, file, schemaVersion, allowed, campaignScoped) {
  if (value.schemaVersion !== schemaVersion) fail(`${file}: unsupported schemaVersion`);
  if (!STATUSES.includes(value.status)) fail(`${file}: invalid status`);
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
    if (!Array.isArray(value.records) || value.records.length === 0 || value.records.some((item) => typeof item !== 'string')) {
      fail(`${file}: records must contain at least one path`);
    }
  }
  return { ...value };
}

function queueRoot(repositoryRoot, campaignId) {
  if (typeof campaignId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(campaignId)) fail('invalid campaign ID');
  return path.join(repositoryRoot, 'pm', 'plan-inputs', campaignId);
}

function lifecycleDirectory(repositoryRoot, campaignId, status) {
  return path.join(queueRoot(repositoryRoot, campaignId), status);
}

function readEntry(file) {
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file}: ${error.message}`); }
  if (value.schemaVersion === 1) fail(`${file}: repository-scoped V1 plan input is retired and must be removed before use`);
  const reader = PlanInputReaders[`V${value.schemaVersion}`];
  if (!reader) fail(`${file}: unsupported schemaVersion`);
  return reader(value, file);
}

function entries(repositoryRoot, campaignId) {
  const result = [];
  for (const status of STATUSES) {
    const directory = lifecycleDirectory(repositoryRoot, campaignId, status);
    if (!fs.existsSync(directory)) continue;
    for (const name of fs.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
      const file = path.join(directory, name);
      const entry = readEntry(file);
      if (entry.status !== status) fail(`${file}: status does not match lifecycle directory`);
      result.push(entry);
    }
  }
  return result.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id));
}

function writeExclusive(file, entry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`, { flag: 'wx' });
}

function withEnqueueLock(repositoryRoot, campaignId, operation) {
  const lock = path.join(queueRoot(repositoryRoot, campaignId), '.enqueue.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx');
      try { return operation(); }
      finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const age = Date.now() - fs.statSync(lock).mtimeMs;
      if (age > 5000) { fs.unlinkSync(lock); continue; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('timed out waiting for the plan-input enqueue lock');
}

function enqueue(repositoryRoot, campaignId, submittedPlanId, prompt, source, metadata = {}) {
  if (typeof prompt !== 'string' || !prompt.trim()) fail('instruction must be nonempty');
  if (!SOURCES.has(source)) fail('invalid plan-input source');
  return withEnqueueLock(repositoryRoot, campaignId, () => {
    const newest = entries(repositoryRoot, campaignId).at(-1);
    const now = Date.now();
    const receivedAt = new Date(Math.max(now, newest ? Date.parse(newest.receivedAt) + 1 : now)).toISOString();
    const id = `${receivedAt.replace(/[-:.]/g, '')}-${crypto.randomUUID()}`;
    const entry = readV2({
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

function claim(repositoryRoot, campaignId) {
  const current = entries(repositoryRoot, campaignId).find((entry) => entry.status === 'in_progress');
  if (current) return current;
  for (const entry of entries(repositoryRoot, campaignId).filter((item) => item.status === 'open')) {
    const source = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'open'), `${entry.id}.json`);
    const destination = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${entry.id}.json`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    try { fs.renameSync(source, destination); }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const claimed = readV2({ ...entry, status: 'in_progress', claimedAt: new Date().toISOString() });
    fs.writeFileSync(destination, `${JSON.stringify(claimed, null, 2)}\n`);
    return claimed;
  }
  return null;
}

function complete(repositoryRoot, campaignId, id, records) {
  const source = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${id}.json`);
  if (!fs.existsSync(source)) fail(`plan input is not in progress: ${id}`);
  const normalized = [...new Set(records)].map((record) => record.replaceAll('\\', '/'));
  if (normalized.length === 0) fail('at least one PM record is required');
  for (const record of normalized) {
    if (!record.startsWith('pm/') || record.includes('/../') || path.isAbsolute(record)) fail(`record must be a repository-relative pm/ path: ${record}`);
    if (!fs.existsSync(path.join(repositoryRoot, record))) fail(`record does not exist: ${record}`);
  }
  const entry = readEntry(source);
  const closed = readV2({ ...entry, status: 'closed', completedAt: new Date().toISOString(), records: normalized });
  const destination = path.join(lifecycleDirectory(repositoryRoot, campaignId, 'closed'), `${id}.json`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(source, `${JSON.stringify(closed, null, 2)}\n`);
  fs.renameSync(source, destination);
  return closed;
}

function parseCli(argv) {
  if (argv.length === 0) fail('usage: ponytail plan-input <plan> -- <instruction> | coordinate <plan> | release <plan> | list <plan> [--json] | claim <plan> [--json] | complete <plan> <id> --record <pm-path>...');
  const command = argv[0];
  if (command === 'coordinate' || command === 'release') {
    if (argv.length !== 2) fail(`usage: ponytail plan-input ${command} <plan>`);
    return { command, plan: argv[1] };
  }
  if (command === 'list' || command === 'claim') {
    if (argv.length < 2 || argv.length > 3 || (argv[2] && argv[2] !== '--json')) fail(`usage: ponytail plan-input ${command} <plan> [--json]`);
    return { command, plan: argv[1], json: argv[2] === '--json' };
  }
  if (command === 'complete') {
    const plan = argv[1];
    const id = argv[2];
    const records = [];
    for (let index = 3; index < argv.length; index += 2) {
      if (argv[index] !== '--record' || !argv[index + 1]) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
      records.push(argv[index + 1]);
    }
    if (!plan || !id || records.length === 0) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
    return { command, plan, id, records };
  }
  const separator = argv.indexOf('--');
  if (separator !== 1 || argv.length < 3) fail('usage: ponytail plan-input <plan> -- <instruction>');
  return { command: 'enqueue', plan: argv[0], prompt: argv.slice(2).join(' ') };
}

function main(argv = process.argv.slice(2), repositoryRoot = process.cwd()) {
  const request = parseCli(argv);
  const { campaignId, submittedPlanId } = resolveCampaignRoot(repositoryRoot, request.plan);
  if (request.command === 'enqueue') {
    const entry = enqueue(repositoryRoot, campaignId, submittedPlanId, request.prompt, 'cli');
    console.log(`Recorded as plan input ${entry.id} for campaign ${campaignId}`);
    return 0;
  }
  if (request.command === 'list') {
    const result = entries(repositoryRoot, campaignId).filter((entry) => entry.status !== 'closed');
    console.log(request.json ? JSON.stringify(result) : result.map((entry) => `${entry.status}\t${entry.id}\t${entry.prompt}`).join('\n'));
    return 0;
  }
  if (request.command === 'claim') {
    const entry = claim(repositoryRoot, campaignId);
    if (!entry) return 1;
    console.log(request.json ? JSON.stringify(entry) : `${entry.id}\t${entry.prompt}`);
    return 0;
  }
  if (request.command === 'coordinate') {
    console.log(`Validated coordinator campaign ${campaignId}`);
    return 0;
  }
  if (request.command === 'release') {
    console.log(`Validated release for campaign ${campaignId}`);
    return 0;
  }
  const entry = complete(repositoryRoot, campaignId, request.id, request.records);
  console.log(`Completed plan input ${entry.id}`);
  return 0;
}

module.exports = { PlanInputReaders, claim, complete, enqueue, entries, main, parseCli, queueRoot, readV1, readV2 };

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
}
