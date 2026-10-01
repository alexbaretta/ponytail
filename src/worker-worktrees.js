#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

// Traceability: implements REQ-WORKER-WORKTREE-RETENTION
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`worker recovery Git operation failed: git ${args.join(' ')}: ${result.error?.message || result.stderr.trim() || `exit ${result.status}`}`);
  return result.stdout;
}

function worktrees(root) {
  return git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0\0').filter(Boolean).map(record => {
    const fields = {};
    for (const line of record.split('\0').filter(Boolean)) {
      const separator = line.indexOf(' ');
      fields[separator < 0 ? line : line.slice(0, separator)] = separator < 0 ? true : line.slice(separator + 1);
    }
    return fields;
  });
}

function recoverySource(repositoryRoot) {
  const mainWorktree = fs.realpathSync(worktrees(repositoryRoot)[0].worktree);
  const mainGitDirectory = fs.realpathSync(git(mainWorktree, ['rev-parse', '--absolute-git-dir']).trim());
  return { mainWorktree, mainGitDirectory };
}

function commonDirectory(root) {
  return fs.realpathSync(path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).trim()));
}

function validateSource(binding) {
  const { mainWorktree, mainGitDirectory, worktree } = binding;
  if (!mainWorktree || !mainGitDirectory || fs.realpathSync(mainWorktree) !== mainWorktree
    || fs.realpathSync(git(mainWorktree, ['rev-parse', '--absolute-git-dir']).trim()) !== mainGitDirectory
    || worktree === mainWorktree || worktree === binding.repositoryRoot
    || !path.isAbsolute(worktree) || path.resolve(worktree) !== worktree) {
    throw new Error('worker recovery source or target identity changed; no checkout was reconstructed');
  }
}

function recoverCheckout(binding) {
  validateSource(binding);
  const { mainWorktree, mainGitDirectory, worktree, branch, revision } = binding;
  let ancestor = path.dirname(worktree);
  while (fs.lstatSync(ancestor, { throwIfNoEntry: false }) === undefined) ancestor = path.dirname(ancestor);
  if (!fs.lstatSync(ancestor).isDirectory() || fs.realpathSync(ancestor) !== ancestor) {
    throw new Error('worker recovery target ancestor is not the recorded canonical directory');
  }
  const checkpoint = git(mainWorktree, ['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]).trim();
  git(mainWorktree, ['merge-base', '--is-ancestor', revision, checkpoint]);
  const records = worktrees(mainWorktree);
  const record = records.find(item => item.worktree === worktree);
  if (records.some(item => item.worktree !== worktree && item.branch === `refs/heads/${branch}`)
    || record?.locked || (record && record.branch !== `refs/heads/${branch}`)) {
    throw new Error('worker recovery branch or registration is owned elsewhere, changed, or locked');
  }
  const existing = fs.lstatSync(worktree, { throwIfNoEntry: false });
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink() || fs.realpathSync(worktree) !== worktree
      || commonDirectory(worktree) !== mainGitDirectory
      || git(worktree, ['branch', '--show-current']).trim() !== branch || !record) {
      throw new Error('worker recovery target already exists with incompatible ownership');
    }
  } else {
    fs.mkdirSync(path.dirname(worktree), { recursive: true });
    if (fs.realpathSync(path.dirname(worktree)) !== path.dirname(worktree)) throw new Error('worker recovery target parent changed');
    // Git permits reclaiming this exact missing, unlocked registration with one
    // --force. Never prune other registrations or force a branch in use elsewhere.
    git(mainWorktree, ['worktree', 'add', ...(record ? ['--force'] : []), '--', worktree, branch]);
  }
  if (commonDirectory(worktree) !== mainGitDirectory
    || git(worktree, ['branch', '--show-current']).trim() !== branch
    || git(worktree, ['rev-parse', 'HEAD']).trim() !== checkpoint) {
    throw new Error('worker recovery postcondition failed; preserve the checkout for inspection');
  }
  return { schemaVersion: 1, sessionId: binding.sessionId, worktree, branch, revision: checkpoint,
    mainWorktree, restored: !existing, content: 'COMMITTED_STATE' };
}

function recoverLegacyCheckout(binding, originalWorktree, originalRevision, sourceRevision) {
  validateSource(binding);
  const { mainWorktree, mainGitDirectory, worktree, branch } = binding;
  if (originalWorktree === worktree || originalWorktree === mainWorktree || originalWorktree === binding.repositoryRoot) {
    throw new Error('legacy recovery target is not a distinct original worker checkout');
  }
  const checkpoint = git(mainWorktree, ['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]).trim();
  if (checkpoint !== sourceRevision) throw new Error('legacy recovery branch no longer matches the assignment revision');
  const records = worktrees(mainWorktree);
  for (const target of [worktree, originalWorktree]) {
    const record = records.find(item => item.worktree === target);
    const entry = fs.lstatSync(target, { throwIfNoEntry: false });
    if (!entry?.isDirectory() || entry.isSymbolicLink() || fs.realpathSync(target) !== target
      || commonDirectory(target) !== mainGitDirectory || !record || record.locked
      || git(target, ['status', '--porcelain']).trim()) {
      throw new Error('legacy recovery requires both proven checkouts to be canonical, clean, registered, and unlocked');
    }
    const currentBranch = git(target, ['branch', '--show-current']).trim();
    const currentRevision = git(target, ['rev-parse', 'HEAD']).trim();
    if ((currentBranch && currentBranch !== branch)
      || (target === worktree && currentRevision !== checkpoint)
      || (target === originalWorktree && currentRevision !== (currentBranch ? checkpoint : originalRevision))) {
      throw new Error('legacy recovery checkout no longer matches its preserved branch and original checkpoint');
    }
  }
  if (records.some(item => item.worktree !== worktree && item.worktree !== originalWorktree && item.branch === `refs/heads/${branch}`)) {
    throw new Error('legacy recovery branch is owned by another checkout');
  }
  const detached = Boolean(git(worktree, ['branch', '--show-current']).trim());
  if (detached) git(worktree, ['switch', '--no-overwrite-ignore', '--detach']);
  try {
    if (!git(originalWorktree, ['branch', '--show-current']).trim()) git(originalWorktree, ['switch', '--no-overwrite-ignore', branch]);
  } catch (error) {
    if (detached) git(worktree, ['switch', '--no-overwrite-ignore', branch]);
    throw error;
  }
  if (commonDirectory(originalWorktree) !== mainGitDirectory
    || git(originalWorktree, ['branch', '--show-current']).trim() !== branch
    || git(originalWorktree, ['rev-parse', 'HEAD']).trim() !== checkpoint
    || git(worktree, ['branch', '--show-current']).trim()
    || git(worktree, ['rev-parse', 'HEAD']).trim() !== checkpoint) {
    throw new Error('legacy recovery transfer postcondition failed; preserve both checkouts for inspection');
  }
  return { schemaVersion: 1, sessionId: binding.sessionId, worktree: originalWorktree, branch,
    revision: checkpoint, mainWorktree, restored: false, content: 'COMMITTED_STATE' };
}

function readWorkerRecoveryV1(value) {
  const keys = ['schemaVersion', 'sessionId', 'worktree', 'branch', 'revision', 'mainWorktree', 'restored', 'content'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))
    || value.schemaVersion !== 1 || value.content !== 'COMMITTED_STATE' || typeof value.restored !== 'boolean'
    || ['sessionId', 'worktree', 'branch', 'revision', 'mainWorktree'].some(key => typeof value[key] !== 'string' || !value[key])) {
    throw new Error('invalid worker recovery V1 result');
  }
  return { ...value };
}

const WorkerRecoveryReaders = Object.freeze({ V1: readWorkerRecoveryV1 });
module.exports = { recoverySource, recoverCheckout, recoverLegacyCheckout, WorkerRecoveryReaders };

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('usage: ponytail worktree recover <attachment-token>');
    const { recoverWorker } = require('./campaign-orchestration');
    process.stdout.write(`${JSON.stringify(readWorkerRecoveryV1(recoverWorker(process.env, process.argv[2])))}\n`);
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
