#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: implements REQ-WORKTREE-RECLAMATION

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CONFIG_PATH = '.agents/config/project/worktree-lifecycle.json';
const MAX_ADAPTER_OUTPUT_BYTES = 16 * 1024 * 1024;

class WorktreeReclamationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new WorktreeReclamationError(code, message);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} must contain exactly ${expected.join(', ')}`);
}

function nonemptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} must be a nonempty string`);
  return value;
}

function readConfigV1(value, file = CONFIG_PATH) {
  exactKeys(value, ['schemaVersion', 'adapterPath'], file);
  if (value.schemaVersion !== 1) fail('WORKTREE_RECLAMATION_VERSION', `${file}: unsupported schemaVersion`);
  const adapterPath = nonemptyString(value.adapterPath, `${file}.adapterPath`);
  if (path.isAbsolute(adapterPath) || adapterPath.includes('\\') || adapterPath.split('/').some((component) => component === '' || component === '.' || component === '..')) {
    fail('WORKTREE_RECLAMATION_CONFIG', `${file}.adapterPath must be a normalized project-relative path`);
  }
  return { schemaVersion: 1, adapterPath };
}

function readClaimV1(value, label = 'worktree claim') {
  exactKeys(value, ['claimId', 'generation', 'state', 'worktreePath', 'disposition', 'reason'], label);
  const claim = {
    claimId: nonemptyString(value.claimId, `${label}.claimId`),
    generation: nonemptyString(value.generation, `${label}.generation`),
    state: nonemptyString(value.state, `${label}.state`),
    worktreePath: nonemptyString(value.worktreePath, `${label}.worktreePath`),
    disposition: value.disposition,
    reason: nonemptyString(value.reason, `${label}.reason`),
  };
  if (!path.isAbsolute(claim.worktreePath) || path.resolve(claim.worktreePath) !== claim.worktreePath) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.worktreePath must be an absolute normalized path`);
  if (!['retain', 'reclaim'].includes(claim.disposition)) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.disposition must be retain or reclaim`);
  return claim;
}

function readAdapterRequestV1(value, label = 'worktree lifecycle adapter request') {
  if (value?.operation === 'inventory') {
    exactKeys(value, ['schemaVersion', 'operation'], label);
    if (value.schemaVersion !== 1) fail('WORKTREE_RECLAMATION_VERSION', `${label}: unsupported schemaVersion`);
    return { schemaVersion: 1, operation: 'inventory' };
  }
  exactKeys(value, ['schemaVersion', 'operation', 'claim'], label);
  if (value.schemaVersion !== 1 || value.operation !== 'reclaim') fail('WORKTREE_RECLAMATION_VERSION', `${label}: unsupported operation or schemaVersion`);
  exactKeys(value.claim, ['claimId', 'generation', 'worktreePath'], `${label}.claim`);
  const claim = {
    claimId: nonemptyString(value.claim.claimId, `${label}.claim.claimId`),
    generation: nonemptyString(value.claim.generation, `${label}.claim.generation`),
    worktreePath: nonemptyString(value.claim.worktreePath, `${label}.claim.worktreePath`),
  };
  if (!path.isAbsolute(claim.worktreePath) || path.resolve(claim.worktreePath) !== claim.worktreePath) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.claim.worktreePath must be an absolute normalized path`);
  return { schemaVersion: 1, operation: 'reclaim', claim };
}

function readAdapterResultV1(value, label = 'worktree lifecycle adapter result') {
  if (value?.operation === 'inventory') {
    exactKeys(value, ['schemaVersion', 'operation', 'claims'], label);
    if (value.schemaVersion !== 1 || !Array.isArray(value.claims)) fail('WORKTREE_RECLAMATION_VERSION', `${label}: expected inventory V1`);
    const claims = value.claims.map((claim, index) => readClaimV1(claim, `${label}.claims[${index}]`));
    for (const [field, name] of [['claimId', 'claim ID'], ['worktreePath', 'worktree path']]) {
      if (new Set(claims.map((claim) => claim[field])).size !== claims.length) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} contains a duplicate ${name}`);
    }
    return { schemaVersion: 1, operation: 'inventory', claims: claims.sort((left, right) => left.claimId.localeCompare(right.claimId) || left.generation.localeCompare(right.generation)) };
  }
  exactKeys(value, ['schemaVersion', 'operation', 'claimId', 'generation', 'outcome', 'reason'], label);
  if (value.schemaVersion !== 1 || value.operation !== 'reclaim') fail('WORKTREE_RECLAMATION_VERSION', `${label}: expected reclaim V1`);
  if (!['reclaimed', 'retained', 'blocked'].includes(value.outcome)) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.outcome must be reclaimed, retained, or blocked`);
  return {
    schemaVersion: 1,
    operation: 'reclaim',
    claimId: nonemptyString(value.claimId, `${label}.claimId`),
    generation: nonemptyString(value.generation, `${label}.generation`),
    outcome: value.outcome,
    reason: nonemptyString(value.reason, `${label}.reason`),
  };
}

function readCommandResultV1(value, label = 'worktree reclamation result') {
  exactKeys(value, ['schemaVersion', 'projectRoot', 'dryRun', 'claims', 'results', 'summary'], label);
  if (value.schemaVersion !== 1 || typeof value.dryRun !== 'boolean' || !Array.isArray(value.claims) || !Array.isArray(value.results)) fail('WORKTREE_RECLAMATION_VERSION', `${label}: expected command result V1`);
  const claims = readAdapterResultV1({ schemaVersion: 1, operation: 'inventory', claims: value.claims }, label).claims;
  const results = value.results.map((result, index) => {
    const parsed = readAdapterResultV1({ ...result, schemaVersion: 1, operation: 'reclaim' }, `${label}.results[${index}]`);
    const { schemaVersion, operation, ...commandResult } = parsed;
    return commandResult;
  });
  if (new Set(results.map(({ claimId }) => claimId)).size !== results.length) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} contains a duplicate result claim ID`);
  exactKeys(value.summary, ['inventoried', 'reclaimable', 'reclaimed', 'retained', 'blocked'], `${label}.summary`);
  for (const [key, count] of Object.entries(value.summary)) if (!Number.isInteger(count) || count < 0) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.summary.${key} must be a nonnegative integer`);
  const reclaimableClaims = claims.filter(({ disposition }) => disposition === 'reclaim');
  const reclaimableById = new Map(reclaimableClaims.map((claim) => [claim.claimId, claim]));
  for (const result of results) {
    const claim = reclaimableById.get(result.claimId);
    if (!claim || claim.generation !== result.generation) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} result does not identify an inventoried reclaimable claim generation`);
  }
  if (value.dryRun && results.length !== 0) fail('WORKTREE_RECLAMATION_SCHEMA', `${label} dry-run must not contain mutation results`);
  const expectedSummary = {
    inventoried: claims.length,
    reclaimable: reclaimableClaims.length,
    reclaimed: results.filter(({ outcome }) => outcome === 'reclaimed').length,
    retained: claims.filter(({ disposition }) => disposition === 'retain').length + results.filter(({ outcome }) => outcome === 'retained').length,
    blocked: results.filter(({ outcome }) => outcome === 'blocked').length,
  };
  if (JSON.stringify(value.summary) !== JSON.stringify(expectedSummary)) fail('WORKTREE_RECLAMATION_SCHEMA', `${label}.summary does not match its claims and results`);
  return {
    schemaVersion: 1,
    projectRoot: nonemptyString(value.projectRoot, `${label}.projectRoot`),
    dryRun: value.dryRun,
    claims,
    results,
    summary: { ...value.summary },
  };
}

const WorktreeLifecycleConfigReaders = Object.freeze({ V1: readConfigV1 });
const WorktreeLifecycleAdapterRequestReaders = Object.freeze({ V1: readAdapterRequestV1 });
const WorktreeLifecycleAdapterResultReaders = Object.freeze({ V1: readAdapterResultV1 });
const WorktreeReclamationResultReaders = Object.freeze({ V1: readCommandResultV1 });

function git(projectRoot, args) {
  return spawnSync('git', ['-C', projectRoot, ...args], { encoding: 'utf8' });
}

function requireCommittedFile(projectRoot, relativePath, label) {
  const absolutePath = path.join(projectRoot, relativePath);
  const status = fs.lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!status?.isFile() || status.isSymbolicLink()) fail('WORKTREE_RECLAMATION_CONFIG', `${label} must be a regular non-symlink file: ${absolutePath}`);
  if (git(projectRoot, ['ls-files', '--error-unmatch', '--', relativePath]).status !== 0) fail('WORKTREE_RECLAMATION_CONFIG', `${label} must be tracked: ${absolutePath}`);
  if (git(projectRoot, ['diff', '--quiet', 'HEAD', '--', relativePath]).status !== 0) {
    fail('WORKTREE_RECLAMATION_CONFIG', `${label} must be committed before use: ${absolutePath}`);
  }
  return { absolutePath, status };
}

function loadConfiguration(projectRoot) {
  const { absolutePath: configPath } = requireCommittedFile(projectRoot, CONFIG_PATH, 'worktree lifecycle configuration');
  let value;
  try { value = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (error) { fail('WORKTREE_RECLAMATION_CONFIG', `${configPath}: ${error.message}`); }
  const config = readConfigV1(value, configPath);
  const relativeAdapterPath = path.posix.normalize(config.adapterPath);
  const { absolutePath: adapterPath, status } = requireCommittedFile(projectRoot, relativeAdapterPath, 'worktree lifecycle adapter');
  const relative = path.relative(projectRoot, adapterPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('WORKTREE_RECLAMATION_CONFIG', 'worktree lifecycle adapter must remain inside the invoking project');
  if ((status.mode & 0o111) === 0) fail('WORKTREE_RECLAMATION_CONFIG', `worktree lifecycle adapter must be executable: ${adapterPath}`);
  return { adapterPath, config };
}

function invokeAdapter(projectRoot, adapterPath, request) {
  const adapterRequest = readAdapterRequestV1(request);
  const result = spawnSync(adapterPath, [], {
    cwd: projectRoot,
    encoding: 'utf8',
    input: `${JSON.stringify(adapterRequest)}\n`,
    maxBuffer: MAX_ADAPTER_OUTPUT_BYTES,
  });
  if (result.error) fail('WORKTREE_RECLAMATION_ADAPTER', `worktree lifecycle adapter could not run: ${result.error.message}`);
  if (result.status !== 0) fail('WORKTREE_RECLAMATION_ADAPTER', result.stderr.trim() || `worktree lifecycle adapter exited ${result.status}`);
  if (result.stderr.length !== 0) fail('WORKTREE_RECLAMATION_ADAPTER', `worktree lifecycle adapter wrote to stderr: ${result.stderr.trim()}`);
  let value;
  try { value = JSON.parse(result.stdout); } catch (error) { fail('WORKTREE_RECLAMATION_ADAPTER', `worktree lifecycle adapter returned invalid JSON: ${error.message}`); }
  return readAdapterResultV1(value);
}

function inventory(projectRoot, adapterPath) {
  const result = invokeAdapter(projectRoot, adapterPath, { schemaVersion: 1, operation: 'inventory' });
  if (result.operation !== 'inventory') fail('WORKTREE_RECLAMATION_ADAPTER', 'worktree lifecycle adapter returned a reclaim result for inventory');
  return result.claims;
}

function lockPath(projectRoot) {
  const digest = crypto.createHash('sha256').update(projectRoot).digest('hex');
  return path.join(os.tmpdir(), `ponytail-worktree-reclamation-${digest}.lock`);
}

function acquireLock(projectRoot) {
  const file = lockPath(projectRoot);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(file, 'wx', 0o600);
      fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, projectRoot })}\n`);
      return { descriptor, file };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (readError) { fail('WORKTREE_RECLAMATION_LOCK', `${file}: ${readError.message}`); }
      if (!Number.isInteger(owner.pid) || owner.pid <= 0 || owner.projectRoot !== projectRoot) fail('WORKTREE_RECLAMATION_LOCK', `${file}: invalid reclamation lock`);
      try {
        process.kill(owner.pid, 0);
        fail('WORKTREE_RECLAMATION_LOCK', `worktree reclamation is already running for ${projectRoot} as process ${owner.pid}`);
      } catch (processError) {
        if (processError instanceof WorktreeReclamationError) throw processError;
        if (processError.code !== 'ESRCH') fail('WORKTREE_RECLAMATION_LOCK', `cannot inspect reclamation process ${owner.pid}: ${processError.message}`);
        fs.unlinkSync(file);
      }
    }
  }
  fail('WORKTREE_RECLAMATION_LOCK', `could not acquire worktree reclamation lock for ${projectRoot}`);
}

function releaseLock(lock) {
  fs.closeSync(lock.descriptor);
  fs.unlinkSync(lock.file);
}

function claimStillPresent(claims, expected) {
  return claims.find(({ claimId }) => claimId === expected.claimId);
}

function verifyResult(projectRoot, adapterPath, claim, result) {
  if (result.claimId !== claim.claimId || result.generation !== claim.generation) fail('WORKTREE_RECLAMATION_FENCE', `adapter result does not match claim ${claim.claimId} generation ${claim.generation}`);
  const claims = inventory(projectRoot, adapterPath);
  const current = claimStillPresent(claims, claim);
  if (result.outcome === 'reclaimed') {
    if (current) fail('WORKTREE_RECLAMATION_FENCE', `claim ${claim.claimId} still exists after reclaimed result`);
    if (fs.lstatSync(claim.worktreePath, { throwIfNoEntry: false }) !== undefined) fail('WORKTREE_RECLAMATION_POSTCONDITION', `worktree still exists after reclaimed result: ${claim.worktreePath}`);
    return;
  }
  if (!current || current.generation !== claim.generation || current.worktreePath !== claim.worktreePath) fail('WORKTREE_RECLAMATION_FENCE', `claim ${claim.claimId} changed while reporting ${result.outcome}`);
}

function runReclamation(projectRoot, options = {}) {
  const canonicalProjectRoot = fs.realpathSync(projectRoot);
  const dryRun = options.dryRun === true;
  const { adapterPath } = loadConfiguration(canonicalProjectRoot);
  const lock = acquireLock(canonicalProjectRoot);
  try {
    let claims = inventory(canonicalProjectRoot, adapterPath);
    if (options.worktreePath !== undefined) {
      claims = claims.filter(({ worktreePath }) => worktreePath === options.worktreePath);
      if (claims.length === 0 && fs.lstatSync(options.worktreePath, { throwIfNoEntry: false }) !== undefined) {
        fail('WORKTREE_RECLAMATION_FENCE', 'authenticated worktree has no project-owned claim');
      }
      if (claims.some(({ disposition }) => disposition !== 'reclaim')) {
        fail('WORKTREE_RECLAMATION_FENCE', 'project adapter has not authorized retirement of the authenticated worktree');
      }
    }
    const reclaimable = claims.filter(({ disposition }) => disposition === 'reclaim');
    const results = [];
    if (!dryRun) {
      for (const claim of reclaimable) {
        const adapterResult = invokeAdapter(canonicalProjectRoot, adapterPath, {
          schemaVersion: 1,
          operation: 'reclaim',
          claim: { claimId: claim.claimId, generation: claim.generation, worktreePath: claim.worktreePath },
        });
        if (adapterResult.operation !== 'reclaim') fail('WORKTREE_RECLAMATION_ADAPTER', `worktree lifecycle adapter returned inventory for claim ${claim.claimId}`);
        verifyResult(canonicalProjectRoot, adapterPath, claim, adapterResult);
        const { schemaVersion, operation, ...result } = adapterResult;
        results.push(result);
      }
    }
    const result = {
      schemaVersion: 1,
      projectRoot: canonicalProjectRoot,
      dryRun,
      claims,
      results,
      summary: {
        inventoried: claims.length,
        reclaimable: reclaimable.length,
        reclaimed: results.filter(({ outcome }) => outcome === 'reclaimed').length,
        retained: claims.filter(({ disposition }) => disposition === 'retain').length + results.filter(({ outcome }) => outcome === 'retained').length,
        blocked: results.filter(({ outcome }) => outcome === 'blocked').length,
      },
    };
    return readCommandResultV1(result);
  } finally {
    releaseLock(lock);
  }
}

function parseArguments(argv) {
  if (argv[0] !== 'reclaim') fail('WORKTREE_RECLAMATION_USAGE', 'usage: ponytail worktree reclaim [--dry-run] [--json]');
  let dryRun = false;
  let json = false;
  for (const argument of argv.slice(1)) {
    if (argument === '--dry-run' && !dryRun) dryRun = true;
    else if (argument === '--json' && !json) json = true;
    else fail('WORKTREE_RECLAMATION_USAGE', 'usage: ponytail worktree reclaim [--dry-run] [--json]');
  }
  return { dryRun, json };
}

function humanResult(result) {
  const lines = [];
  if (result.dryRun) {
    for (const claim of result.claims) lines.push(`${claim.disposition === 'reclaim' ? 'RECLAIM' : 'RETAIN'}\t${claim.claimId}\t${claim.generation}\t${claim.worktreePath}\t${claim.reason}`);
  } else {
    for (const item of result.results) lines.push(`${item.outcome.toUpperCase()}\t${item.claimId}\t${item.generation}\t${item.reason}`);
  }
  const summary = result.summary;
  lines.push(`SUMMARY\tinventoried=${summary.inventoried}\treclaimable=${summary.reclaimable}\treclaimed=${summary.reclaimed}\tretained=${summary.retained}\tblocked=${summary.blocked}`);
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2), options = {}) {
  const request = parseArguments(argv);
  const result = runReclamation(options.projectRoot ?? process.cwd(), request);
  process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanResult(result));
  return result.summary.blocked > 0 ? 1 : 0;
}

function diagnostic(error) {
  return `error ${error.code ?? 'WORKTREE_RECLAMATION_INTERNAL'}: ${error.message}`;
}

module.exports = {
  WorktreeLifecycleAdapterRequestReaders,
  WorktreeLifecycleAdapterResultReaders,
  WorktreeLifecycleConfigReaders,
  WorktreeReclamationError,
  WorktreeReclamationResultReaders,
  diagnostic,
  humanResult,
  main,
  parseArguments,
  readAdapterRequestV1,
  readAdapterResultV1,
  readCommandResultV1,
  readConfigV1,
  runReclamation,
};

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${diagnostic(error)}\n`);
    process.exitCode = 2;
  }
}
