// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'lossless-json';
import { inputDigest, readObligationEvidence, type ObligationEvidence } from '../skills/plan-execution/scripts/obligations.js';
import { assertObligationLeaseOperation, type ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';

export interface RollingSubmissionProof {
  readonly operation: string;
  readonly evidence: ObligationEvidence;
}
export interface RollingWorkerSubmissionV1 {
  readonly schemaVersion: 1;
  readonly campaignId: string;
  readonly assignmentId: string;
  readonly generation: string;
  readonly sessionId: string;
  readonly graphDigest: string;
  readonly revision: string;
  readonly baseCommit: string;
  readonly stopped: true;
  readonly proof: readonly RollingSubmissionProof[];
}
function requireSubmission(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`rolling submission: ${message}`);
}
function record(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  requireSubmission(value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'invalid physical record keys');
}
function text(value: unknown): string {
  requireSubmission(typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0'), 'invalid identity');
  return value;
}
function commit(value: unknown): string {
  const revision = text(value);
  requireSubmission(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision), 'invalid exact Git commit');
  return revision;
}
function readRollingSubmissionProof(value: unknown): RollingSubmissionProof {
  record(value, ['operation', 'evidence']);
  return { operation: text(value.operation), evidence: readObligationEvidence(value.evidence) };
}
// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-GRAPH
export function readRollingWorkerSubmissionV1(value: unknown): RollingWorkerSubmissionV1 {
  record(value, ['schemaVersion', 'campaignId', 'assignmentId', 'generation', 'sessionId', 'graphDigest', 'revision', 'baseCommit', 'stopped', 'proof']);
  requireSubmission(value.schemaVersion === 1 && value.stopped === true && Array.isArray(value.proof) && value.proof.length > 0,
    'submission requires V1, stopped activity and focused proof');
  const graphDigest = text(value.graphDigest);
  requireSubmission(/^[a-f0-9]{64}$/u.test(graphDigest), 'invalid graph digest');
  return { schemaVersion: 1, campaignId: text(value.campaignId), assignmentId: text(value.assignmentId), generation: text(value.generation),
    sessionId: text(value.sessionId), graphDigest, revision: commit(value.revision), baseCommit: commit(value.baseCommit),
    stopped: true, proof: value.proof.map(readRollingSubmissionProof) };
}
export const RollingWorkerSubmissionReaders = { V1: readRollingWorkerSubmissionV1 };
export function parseRollingWorkerSubmission(text: string): RollingWorkerSubmissionV1 {
  return readRollingWorkerSubmissionV1(parse(text, null, token => {
    requireSubmission(/^(0|[1-9][0-9]*)$/u.test(token), 'numbers must be exact unsigned integers');
    const number = Number(token);
    requireSubmission(Number.isSafeInteger(number), 'number exceeds safe integer range');
    return number;
  }));
}
function git(root: string, argv: readonly string[]): string {
  const result = spawnSync('git', ['-C', root, ...argv], { encoding: 'utf8' });
  requireSubmission(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || `Git ${argv[0]} failed`);
  return result.stdout;
}
// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-GRAPH
export function validateRollingWorkerSubmission(root: string, obligationLeaseV1: ObligationLeaseV1,
  rollingWorkerSubmissionV1: RollingWorkerSubmissionV1): readonly string[] {
  readRollingWorkerSubmissionV1(rollingWorkerSubmissionV1);
  requireSubmission(fs.realpathSync(root) === root && git(root, ['rev-parse', '--show-toplevel']).trim() === root, 'submission checkout identity differs');
  requireSubmission(rollingWorkerSubmissionV1.campaignId === obligationLeaseV1.scopeId, 'submission scope differs from lease');
  const marker = path.join(root, 'session_id.txt');
  requireSubmission(fs.lstatSync(marker).isFile() && !fs.lstatSync(marker).isSymbolicLink()
    && fs.readFileSync(marker, 'utf8').trim() === rollingWorkerSubmissionV1.sessionId, 'session marker differs');
  git(root, ['check-ignore', '--no-index', '--quiet', '--', 'session_id.txt']);
  requireSubmission(git(root, ['ls-files', '--', 'session_id.txt']).length === 0, 'session marker must be untracked');
  requireSubmission(git(root, ['status', '--porcelain=v1', '--untracked-files=all']).length === 0, 'candidate checkout is dirty');
  requireSubmission(git(root, ['rev-parse', 'HEAD']).trim() === rollingWorkerSubmissionV1.revision, 'candidate is not actual HEAD');
  git(root, ['merge-base', '--is-ancestor', rollingWorkerSubmissionV1.baseCommit, rollingWorkerSubmissionV1.revision]);
  requireSubmission(git(root, ['rev-list', '--merges', `${rollingWorkerSubmissionV1.baseCommit}..${rollingWorkerSubmissionV1.revision}`]).length === 0,
    'candidate must be a linear rebased branch');
  const revisions = git(root, ['rev-list', `${rollingWorkerSubmissionV1.baseCommit}..${rollingWorkerSubmissionV1.revision}`]).trim().split('\n').filter(item => item.length > 0);
  const changedPaths = [...new Set(revisions.flatMap(revision => git(root, ['diff-tree', '--no-commit-id', '--no-renames', '--name-only', '-r', '-z', revision, '--'])
    .split('\0').filter(item => item.length > 0)))].sort();
  if (changedPaths.length > 0) assertObligationLeaseOperation(obligationLeaseV1, rollingWorkerSubmissionV1.generation,
    rollingWorkerSubmissionV1.graphDigest, 'edit', changedPaths);
  const obligationExecution = obligationLeaseV1.binding.execution;
  requireSubmission(obligationExecution.target && obligationExecution.selection.length > 0, 'frozen binding has no proof target or selection');
  const assessed = new Set<string>();
  for (const rollingSubmissionProof of rollingWorkerSubmissionV1.proof) {
    assertObligationLeaseOperation(obligationLeaseV1, rollingWorkerSubmissionV1.generation, rollingWorkerSubmissionV1.graphDigest, rollingSubmissionProof.operation);
    const obligationEvidence = rollingSubmissionProof.evidence;
    requireSubmission(obligationEvidence.outcome === 'pass' && obligationEvidence.finalization === 'pass'
      && obligationEvidence.skips === 0 && obligationEvidence.failures === 0 && !obligationEvidence.dirty,
    'focused proof is not clean, passing and finalized');
    requireSubmission(obligationEvidence.revision === rollingWorkerSubmissionV1.revision, 'proof belongs to another candidate');
    requireSubmission(obligationEvidence.target.identity === obligationExecution.target.identity
      && obligationEvidence.target.profile === obligationExecution.target.profile
      && JSON.stringify(obligationEvidence.selection) === JSON.stringify(obligationExecution.selection), 'proof differs from frozen target or selection');
    const inputs = new Map(obligationEvidence.inputs.map(input => [input.path, input.digest]));
    requireSubmission(inputs.has(obligationEvidence.outputPath) && inputs.has(obligationEvidence.target.verification), 'unassessed proof output or target verification');
    for (const input of obligationEvidence.inputs) {
      requireSubmission(inputDigest(root, input.path) === input.digest, `stale focused input: ${input.path}`);
      assessed.add(input.path);
    }
  }
  for (const changedPath of changedPaths) {
    // Deletions are established by the exact Git candidate, not invented hashes of absent files.
    if (fs.existsSync(path.join(root, changedPath))) requireSubmission(assessed.has(changedPath), `changed input lacks focused evidence: ${changedPath}`);
  }
  return changedPaths;
}
