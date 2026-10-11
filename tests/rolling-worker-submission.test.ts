// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inputDigest, type ObligationEvidence } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import { readRollingWorkerSubmissionV1, parseRollingWorkerSubmission, validateRollingWorkerSubmission,
  RollingWorkerSubmissionReaders, type RollingWorkerSubmissionV1 } from '../src/rolling-worker-submission.js';

interface SubmissionFixture { readonly root: string; readonly lease: ObligationLeaseV1; readonly submission: RollingWorkerSubmissionV1 }
function fixture(): SubmissionFixture {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-submit-')));
  execFileSync('git', ['init', '-q', root]);
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, '.gitignore'), 'session_id.txt\nproof.txt\n');
  fs.writeFileSync(path.join(root, 'src/old.ts'), 'export const old = 1;\n');
  fs.writeFileSync(path.join(root, 'src/deleted.ts'), 'export const deleted = 1;\n');
  execFileSync('git', ['-C', root, 'add', '.']);
  function commit(message: string): void {
    execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', message]);
  }
  commit('base');
  const baseCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  fs.renameSync(path.join(root, 'src/old.ts'), path.join(root, 'src/current.ts'));
  fs.unlinkSync(path.join(root, 'src/deleted.ts'));
  execFileSync('git', ['-C', root, 'add', '.']);
  commit('candidate');
  const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(root, 'session_id.txt'), 'fixture-session\n');
  fs.writeFileSync(path.join(root, 'proof.txt'), 'isolated fixture proof, not a product QA result\n');
  const obligationLeaseV1: ObligationLeaseV1 = { schemaVersion: 1, scopeId: 'fixture', baselineId: 'BASELINE-1', graphDigest: 'a'.repeat(64),
    generation: 'generation', assessor: 'coordinator', authority: ['fixture authority'],
    binding: { obligationId: 'OBL-1', revisionId: 'BIND-1', dependsOn: [], execution: { sprintId: null, taskletIds: [], plannedPaths: ['src'],
      operations: ['edit', 'test'], selection: ['focused fixture'], target: { identity: 'fixture', profile: 'focused' } } } };
  const obligationEvidence: ObligationEvidence = { command: 'fixture focused test', selection: ['focused fixture'],
    target: { identity: 'fixture', profile: 'focused', verification: 'proof.txt' }, revision, dirty: false,
    startedAt: '2026-10-11T00:00:00Z', completedAt: '2026-10-11T00:00:01Z', outcome: 'pass', skips: 0, failures: 0,
    inputs: ['src/current.ts', 'proof.txt'].map(relative => ({ path: relative, digest: inputDigest(root, relative) })), outputPath: 'proof.txt', finalization: 'pass' };
  const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { schemaVersion: 1, campaignId: 'fixture', assignmentId: 'assignment',
    generation: 'generation', sessionId: 'fixture-session', graphDigest: obligationLeaseV1.graphDigest, revision, baseCommit,
    stopped: true, proof: [{ operation: 'test', evidence: obligationEvidence }] };
  return { root, lease: obligationLeaseV1, submission: rollingWorkerSubmissionV1 };
}

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-GRAPH
test('submission enforces actual renamed and deleted paths and clean finalized candidate proof', t => {
  const submissionFixture: SubmissionFixture = fixture();
  t.after(() => fs.rmSync(submissionFixture.root, { recursive: true, force: true }));
  assert.deepEqual(validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission),
    ['src/current.ts', 'src/deleted.ts', 'src/old.ts']);
  const narrowObligationLeaseV1: ObligationLeaseV1 = { ...submissionFixture.lease, binding: { ...submissionFixture.lease.binding,
    execution: { ...submissionFixture.lease.binding.execution, plannedPaths: ['src/current.ts'] } } };
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, narrowObligationLeaseV1, submissionFixture.submission), /outside frozen lease: src\/deleted.ts/);
  const firstRollingSubmissionProof = submissionFixture.submission.proof[0];
  assert.ok(firstRollingSubmissionProof);
  const invalidObligationEvidence: readonly ObligationEvidence[] = [
    { ...firstRollingSubmissionProof.evidence, dirty: true }, { ...firstRollingSubmissionProof.evidence, outcome: 'fail' },
    { ...firstRollingSubmissionProof.evidence, finalization: 'unavailable' }, { ...firstRollingSubmissionProof.evidence, skips: 1 },
    { ...firstRollingSubmissionProof.evidence, failures: 1 }, { ...firstRollingSubmissionProof.evidence, revision: submissionFixture.submission.baseCommit },
    { ...firstRollingSubmissionProof.evidence, selection: ['other'] },
    { ...firstRollingSubmissionProof.evidence, target: { ...firstRollingSubmissionProof.evidence.target, profile: 'other' } },
    { ...firstRollingSubmissionProof.evidence, inputs: firstRollingSubmissionProof.evidence.inputs.filter(input => input.path !== 'src/current.ts') },
    { ...firstRollingSubmissionProof.evidence, inputs: firstRollingSubmissionProof.evidence.inputs.filter(input => input.path !== 'proof.txt') }
  ];
  for (const obligationEvidence of invalidObligationEvidence) {
    const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...submissionFixture.submission, proof: [{ operation: 'test', evidence: obligationEvidence }] };
    assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, rollingWorkerSubmissionV1));
  }
  const staleRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...submissionFixture.submission, generation: 'stale' };
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, staleRollingWorkerSubmissionV1), /stale lease generation/);
  fs.writeFileSync(path.join(submissionFixture.root, 'proof.txt'), 'changed proof');
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /stale focused input/);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('submission rejects dirty checkout, another HEAD and a foreign or tracked marker', t => {
  const submissionFixture: SubmissionFixture = fixture();
  t.after(() => fs.rmSync(submissionFixture.root, { recursive: true, force: true }));
  const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...submissionFixture.submission, revision: submissionFixture.submission.baseCommit };
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, rollingWorkerSubmissionV1), /actual HEAD/);
  fs.writeFileSync(path.join(submissionFixture.root, 'foreign.txt'), 'dirty');
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /dirty/);
  fs.unlinkSync(path.join(submissionFixture.root, 'foreign.txt'));
  fs.writeFileSync(path.join(submissionFixture.root, 'session_id.txt'), 'foreign-session');
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /marker differs/);
  fs.writeFileSync(path.join(submissionFixture.root, 'session_id.txt'), 'fixture-session');
  fs.unlinkSync(path.join(submissionFixture.root, 'session_id.txt'));
  fs.symlinkSync('proof.txt', path.join(submissionFixture.root, 'session_id.txt'));
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /marker differs/);
  fs.unlinkSync(path.join(submissionFixture.root, 'session_id.txt'));
  fs.writeFileSync(path.join(submissionFixture.root, 'session_id.txt'), 'fixture-session');
  execFileSync('git', ['-C', submissionFixture.root, 'add', '-f', 'session_id.txt']);
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /marker must be untracked/);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('submission rejects a clean interactive rebase edit stop until the rebase completes', t => {
  const submissionFixture: SubmissionFixture = fixture();
  t.after(() => fs.rmSync(submissionFixture.root, { recursive: true, force: true }));
  const sequenceEditor = [process.execPath, path.resolve(__dirname, 'fixtures/rolling-rebase-editor.js')]
    .map(item => `'${item.replaceAll("'", "'\\''")}'`).join(' ');
  execFileSync('git', ['-C', submissionFixture.root, '-c', `sequence.editor=${sequenceEditor}`,
    'rebase', '-i', submissionFixture.submission.baseCommit]);
  assert.equal(execFileSync('git', ['-C', submissionFixture.root, 'status', '--porcelain=v1'], { encoding: 'utf8' }), '');
  assert.equal(execFileSync('git', ['-C', submissionFixture.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), submissionFixture.submission.revision);
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission), /rebase is unfinished/);
  execFileSync('git', ['-C', submissionFixture.root, 'rebase', '--continue']);
  assert.deepEqual(validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, submissionFixture.submission),
    ['src/current.ts', 'src/deleted.ts', 'src/old.ts']);
});

// Traceability: verifies REQ-ROLLING-GRAPH
test('submission rejects merge history and reverted out-of-scope commits', t => {
  const submissionFixture: SubmissionFixture = fixture();
  t.after(() => fs.rmSync(submissionFixture.root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(submissionFixture.root, 'foreign.ts'), 'export const foreign: number = 1;\n');
  execFileSync('git', ['-C', submissionFixture.root, 'add', 'foreign.ts']);
  execFileSync('git', ['-C', submissionFixture.root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'foreign change']);
  fs.unlinkSync(path.join(submissionFixture.root, 'foreign.ts'));
  execFileSync('git', ['-C', submissionFixture.root, 'add', 'foreign.ts']);
  execFileSync('git', ['-C', submissionFixture.root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'undo foreign change']);
  const revision = execFileSync('git', ['-C', submissionFixture.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...submissionFixture.submission, revision };
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, rollingWorkerSubmissionV1), /outside frozen lease: foreign.ts/);
  execFileSync('git', ['-C', submissionFixture.root, 'checkout', '-q', '-b', 'other', submissionFixture.submission.baseCommit]);
  fs.writeFileSync(path.join(submissionFixture.root, 'other.ts'), 'export const other: number = 1;\n');
  execFileSync('git', ['-C', submissionFixture.root, 'add', 'other.ts']);
  execFileSync('git', ['-C', submissionFixture.root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'other branch']);
  execFileSync('git', ['-C', submissionFixture.root, 'checkout', '-q', '-']);
  execFileSync('git', ['-C', submissionFixture.root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'merge', '-q', '--no-ff', 'other', '-m', 'merge fixture']);
  const mergeRevision = execFileSync('git', ['-C', submissionFixture.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const mergedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...submissionFixture.submission, revision: mergeRevision };
  assert.throws(() => validateRollingWorkerSubmission(submissionFixture.root, submissionFixture.lease, mergedRollingWorkerSubmissionV1), /linear rebased branch/);
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims', t => {
  const submissionFixture: SubmissionFixture = fixture();
  t.after(() => fs.rmSync(submissionFixture.root, { recursive: true, force: true }));
  assert.deepEqual(parseRollingWorkerSubmission(JSON.stringify(submissionFixture.submission)), submissionFixture.submission);
  assert.deepEqual(Object.keys(RollingWorkerSubmissionReaders), ['V1']);
  const invalidInputs: readonly unknown[] = [ { ...submissionFixture.submission, schemaVersion: 2 },
    { ...submissionFixture.submission, stoppedAt: '2026-10-11T09:08:40-07:00' },
    { ...submissionFixture.submission, stopped: false }, { ...submissionFixture.submission, proof: [] },
    { ...submissionFixture.submission, revision: '--unsafe' }, { ...submissionFixture.submission, sessionId: '' },
    { ...submissionFixture.submission, graphDigest: 'wrong' } ];
  for (const input of invalidInputs) assert.throws(() => readRollingWorkerSubmissionV1(input));
  assert.throws(() => parseRollingWorkerSubmission(JSON.stringify(submissionFixture.submission).replace('"skips":0', '"skips":9007199254740993')), /safe integer/);
  assert.throws(() => parseRollingWorkerSubmission(JSON.stringify(submissionFixture.submission).replace('"schemaVersion":1', '"schemaVersion":1.0')), /exact unsigned/);
});
