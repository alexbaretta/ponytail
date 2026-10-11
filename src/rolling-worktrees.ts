// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseRollingProjectConfig, type RollingProjectConfigV1 } from './rolling-campaign.js';

export interface RollingWorktreeLease { readonly number: number; readonly rootPath: string; readonly generation: string }
export interface RollingManagedDirectory {
  readonly directory: string;
  readonly mainRoot: string;
  readonly worktrees: readonly string[];
  readonly configuration: RollingProjectConfigV1;
}
export interface RollingMarkerIgnoreResult { readonly changed: boolean }
export interface RollingProvisionedWorktree {
  readonly number: number;
  readonly rootPath: string;
  readonly branch: string;
  readonly baseCommit: string;
}

function requireCheckout(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`rolling worktree: ${message}`);
}

function git(root: string, argv: readonly string[]): string {
  const result = spawnSync('git', ['-C', root, ...argv], { encoding: 'utf8' });
  requireCheckout(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || `git ${argv[0]} failed`);
  return result.stdout.trim();
}

function statIfPresent(file: string): fs.Stats | null {
  try { return fs.lstatSync(file); }
  catch (error) { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null; throw error; }
}

export function readRollingPhysicalDirectory(directory: string): string {
  const suffix: string[] = [];
  let ancestor = path.resolve(directory);
  while (!statIfPresent(ancestor)) {
    suffix.unshift(path.basename(ancestor));
    ancestor = path.dirname(ancestor);
  }
  requireCheckout(fs.statSync(ancestor).isDirectory(), 'managed directory ancestor is not a directory');
  return path.join(fs.realpathSync(ancestor), ...suffix);
}

function readConfiguration(root: string): RollingProjectConfigV1 {
  const file = path.join(root, '.agents/config/project/rolling-campaigns.json');
  requireCheckout(statIfPresent(file)?.isFile() && fs.realpathSync(file) === file,
    `missing regular project configuration in ${root}`);
  return parseRollingProjectConfig(fs.readFileSync(file, 'utf8'));
}

// Traceability: implements REQ-ROLLING-WORKERS
export function resolveRollingManagedDirectory(coordinatorRoot: string): RollingManagedDirectory {
  const root = fs.realpathSync(coordinatorRoot);
  requireCheckout(git(root, ['rev-parse', '--show-toplevel']) === root, 'coordinator must be a Git checkout root');
  const inventory = git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0')
    .filter(field => field.startsWith('worktree ')).map(field => fs.realpathSync(field.slice(9)));
  const mainRoot = inventory[0];
  requireCheckout(mainRoot !== undefined, 'repository has no main worktree');
  const configuration = readConfiguration(root);
  const directory = readRollingPhysicalDirectory(path.resolve(mainRoot, configuration.managedWorktrees.directory));
  for (const checkout of inventory) {
    const configured = readConfiguration(checkout);
    requireCheckout(readRollingPhysicalDirectory(path.resolve(mainRoot, configured.managedWorktrees.directory)) === directory,
      `managed directory differs in ${checkout}`);
  }
  const relative = path.relative(mainRoot, directory);
  requireCheckout(relative !== '', 'managed directory cannot be the main checkout itself');
  if (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)) {
    const ignored = spawnSync('git', ['-C', mainRoot, 'check-ignore', '--no-index', '-q', '--', `${relative}/__ponytail_pool__`]);
    requireCheckout(ignored.status === 0, 'managed directory inside the main checkout must be Git ignored before allocation');
  }
  return { directory, mainRoot, worktrees: inventory, configuration };
}

// Traceability: implements REQ-ROLLING-WORKERS
export function requireRollingSessionMarkerAbsent(worktreeRoot: string): void {
  requireCheckout(!statIfPresent(path.join(worktreeRoot, 'session_id.txt')), 'previous session marker is still present');
}

// Traceability: implements REQ-ROLLING-WORKERS
export function validateRollingSessionMarker(worktreeRoot: string, sessionId: string): void {
  const marker = path.join(worktreeRoot, 'session_id.txt');
  requireCheckout(fs.lstatSync(marker).isFile() && !fs.lstatSync(marker).isSymbolicLink()
    && fs.readFileSync(marker, 'utf8').trim() === sessionId, 'session marker differs');
  git(worktreeRoot, ['check-ignore', '--no-index', '--quiet', '--', 'session_id.txt']);
  requireCheckout(git(worktreeRoot, ['ls-files', '--', 'session_id.txt']).length === 0, 'session marker must be untracked');
}

// Traceability: implements REQ-ROLLING-WORKERS
export function ensureRollingSessionIdIgnored(worktreeRoot: string): RollingMarkerIgnoreResult {
  const tracked = spawnSync('git', ['-C', worktreeRoot, 'ls-files', '--error-unmatch', '--', 'session_id.txt'], { encoding: 'utf8' });
  requireCheckout(tracked.status === 1, 'session_id.txt is tracked or Git tracking could not be checked');
  const ignored = spawnSync('git', ['-C', worktreeRoot, 'check-ignore', '--no-index', '-q', '--', 'session_id.txt']);
  requireCheckout(ignored.status === 0 || ignored.status === 1, 'cannot check session marker ignore policy');
  if (ignored.status === 0) return { changed: false };
  const file = path.join(worktreeRoot, '.gitignore');
  const stat = statIfPresent(file);
  requireCheckout(stat === null || stat.isFile(), '.gitignore must be a regular non-symlink file');
  const previous = stat ? fs.readFileSync(file, 'utf8') : '';
  fs.writeFileSync(file, `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}/session_id.txt\n`);
  const repaired = spawnSync('git', ['-C', worktreeRoot, 'check-ignore', '--no-index', '-q', '--', 'session_id.txt']);
  requireCheckout(repaired.status === 0, 'setup did not establish marker ignore policy');
  return { changed: true };
}

// Traceability: implements REQ-ROLLING-WORKERS
export function provisionRollingWorktree(coordinatorRoot: string, lease: RollingWorktreeLease, baseCommit: string): RollingProvisionedWorktree {
  requireCheckout(Number.isSafeInteger(lease.number) && lease.number >= 101
    && typeof lease.generation === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lease.generation), 'invalid checkout lease');
  requireCheckout(typeof baseCommit === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(baseCommit), 'base must be a full commit identity');
  const pool = resolveRollingManagedDirectory(coordinatorRoot);
  const worktreeRoot = path.join(pool.directory, String(lease.number));
  requireCheckout(lease.rootPath === worktreeRoot, 'lease path differs from the physical managed directory');
  requireCheckout(git(coordinatorRoot, ['rev-parse', `${baseCommit}^{commit}`]) === baseCommit, 'base is not the identified commit');
  const branch = `ponytail/worker-${lease.number}/${lease.generation}`;
  const exists = statIfPresent(worktreeRoot);
  if (exists) {
    requireCheckout(exists.isDirectory() && fs.realpathSync(worktreeRoot) === worktreeRoot
      && pool.worktrees.includes(worktreeRoot), 'checkout path has unknown or conflicting registration');
    requireRollingSessionMarkerAbsent(worktreeRoot);
    requireCheckout(git(worktreeRoot, ['status', '--porcelain']).length === 0, 'checkout has uncommitted work; preserve it');
    const currentBranch = git(worktreeRoot, ['symbolic-ref', '--short', 'HEAD']);
    if (currentBranch === branch) {
      requireCheckout(git(worktreeRoot, ['rev-parse', 'HEAD']) === baseCommit, 'provisioned intent has changed commits; preserve it');
    } else {
      const integrated = spawnSync('git', ['-C', worktreeRoot, 'merge-base', '--is-ancestor', 'HEAD', baseCommit]);
      requireCheckout(integrated.status === 0, 'checkout has unintegrated commits; preserve them');
      git(worktreeRoot, ['checkout', '-b', branch, baseCommit]);
    }
  } else {
    requireCheckout(!pool.worktrees.includes(worktreeRoot), 'missing registered checkout requires recovery');
    fs.mkdirSync(pool.directory, { recursive: true });
    requireCheckout(fs.realpathSync(pool.directory) === pool.directory, 'managed directory physical identity changed');
    git(coordinatorRoot, ['worktree', 'add', '-b', branch, worktreeRoot, baseCommit]);
  }
  const env = { ...process.env, PONYTAIL_WORKTREE_NUMBER: String(lease.number),
    PONYTAIL_WORKTREE_ROOT: worktreeRoot, PONYTAIL_MAIN_WORKTREE_ROOT: pool.mainRoot };
  for (const argv of pool.configuration.setupCommands) {
    const result = spawnSync(argv[0], argv.slice(1), { cwd: worktreeRoot, env, encoding: 'utf8' });
    requireCheckout(!result.error && result.status === 0,
      `setup failed in retained checkout ${worktreeRoot}: ${result.error?.message || result.stderr.trim() || argv[0]}`);
  }
  requireCheckout(!statIfPresent(path.join(worktreeRoot, 'session_id.txt')), 'setup left a session marker before attachment');
  ensureRollingSessionIdIgnored(worktreeRoot);
  requireCheckout(resolveRollingManagedDirectory(worktreeRoot).directory === pool.directory, 'setup changed the physical pool configuration');
  return { number: lease.number, rootPath: worktreeRoot, branch, baseCommit };
}
