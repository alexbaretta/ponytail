// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { cleanupRollingWorktree,resolveRollingManagedDirectory, ensureRollingSessionIdIgnored, provisionRollingWorktree, type RollingWorktreeRetirement,type RollingWorktreeLease } from '../src/rolling-worktrees.js';
import type { RollingProjectConfigV1,RollingProjectConfigV2 } from '../src/rolling-campaign.js';

// Traceability: verifies REQ-ROLLING-WORKERS
test('ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work', t => {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-checkouts-')));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'main');
  fs.mkdirSync(root);
  const git = (cwd: string, argv: readonly string[]): string => execFileSync('git', ['-C', cwd, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['config', 'user.email', 'fixture@example.test']);
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  const configPath = '.agents/config/project/rolling-campaigns.json';
  let configuration: RollingProjectConfigV1 = { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: 'pool', anchor: 'main' }, maxActiveWorkers: 2, publicationSize: 1,
    setupCommands: [[process.execPath, path.join(__dirname, 'fixtures/rolling-worktree-setup.js')]],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(path.join(root, configPath), JSON.stringify(configuration));
  assert.throws(() => resolveRollingManagedDirectory(root), /must be Git ignored/);
  assert.equal(fs.existsSync(path.join(root, 'pool')), false);
  fs.writeFileSync(path.join(root, '.gitignore'), '/session_id.txt\n/setup-proof.txt\n/pool/\n');
  git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'fixture']);
  const base = git(root, ['rev-parse', 'HEAD']);
  const pool = resolveRollingManagedDirectory(root);
  assert.equal(pool.directory, path.join(root, 'pool'));
  const lease: RollingWorktreeLease = { number: 101, rootPath: path.join(pool.directory, '101'), generation: crypto.randomUUID() };
  const provisioned = provisionRollingWorktree(root, lease, base);
  assert.equal(git(lease.rootPath, ['symbolic-ref', '--short', 'HEAD']), provisioned.branch);
  assert.equal(fs.readFileSync(path.join(lease.rootPath, 'setup-proof.txt'), 'utf8'), `${lease.rootPath}\n101`);
  assert.equal(git(root, ['status', '--porcelain']), '');
  assert.equal(resolveRollingManagedDirectory(lease.rootPath).directory, pool.directory);
  assert.deepEqual(provisionRollingWorktree(root, lease, base), provisioned);
  assert.deepEqual(ensureRollingSessionIdIgnored(lease.rootPath), { changed: false });
  fs.writeFileSync(path.join(lease.rootPath, 'session_id.txt'), 'fixture-session');
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /marker is still present/);
  fs.unlinkSync(path.join(lease.rootPath, 'session_id.txt'));
  const modifiedConfig: RollingProjectConfigV1 = { ...configuration, managedWorktrees: { directory: '../other-pool', anchor: 'main' } };
  fs.writeFileSync(path.join(lease.rootPath, configPath), JSON.stringify(modifiedConfig));
  assert.throws(() => resolveRollingManagedDirectory(root), /directory differs/);
  fs.writeFileSync(path.join(lease.rootPath, configPath), JSON.stringify(configuration));
  fs.writeFileSync(path.join(lease.rootPath, 'owned.txt'), 'preserve uncommitted work');
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /uncommitted work/);
  assert.equal(fs.readFileSync(path.join(lease.rootPath, 'owned.txt'), 'utf8'), 'preserve uncommitted work');
  git(lease.rootPath, ['add', 'owned.txt']); git(lease.rootPath, ['commit', '-q', '-m', 'worker result']);
  assert.throws(() => provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, base), /unintegrated commits/);
  git(root, ['merge', '--ff-only', provisioned.branch]);
  const integrated = git(root, ['rev-parse', 'HEAD']);
  const next = provisionRollingWorktree(root, { ...lease, generation: crypto.randomUUID() }, integrated);
  assert.notEqual(next.branch, provisioned.branch);
  assert.equal(git(lease.rootPath, ['rev-parse', 'HEAD']), integrated);
  fs.writeFileSync(path.join(lease.rootPath, '.gitignore'), '/setup-proof.txt');
  assert.deepEqual(ensureRollingSessionIdIgnored(lease.rootPath), { changed: true });
  assert.equal(git(lease.rootPath, ['check-ignore', 'session_id.txt']), 'session_id.txt');
  assert.ok(fs.readFileSync(path.join(lease.rootPath, '.gitignore'), 'utf8').startsWith('/setup-proof.txt\n'));
  configuration = { ...configuration, setupCommands: [[process.execPath, path.join(__dirname, 'fixtures/rolling-worktree-setup.js'), '--fail']] };
  fs.writeFileSync(path.join(root, configPath), JSON.stringify(configuration));
  git(root, ['add', configPath]); git(root, ['commit', '-q', '-m', 'fixture failing setup']);
  const failedLease: RollingWorktreeLease = { number: 102, rootPath: path.join(pool.directory, '102'), generation: crypto.randomUUID() };
  assert.throws(() => provisionRollingWorktree(root, failedLease, git(root, ['rev-parse', 'HEAD'])), /setup failed in retained checkout/);
  assert.equal(fs.statSync(failedLease.rootPath).isDirectory(), true);
  assert.ok(resolveRollingManagedDirectory(root).worktrees.includes(failedLease.rootPath));
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup',t=> {
 const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-cleanup-')));
 t.after(()=>fs.rmSync(fixture,{recursive:true,force:true}));
 const root = path.join(fixture,'main');fs.mkdirSync(root);
 function git(cwd:string,argv:readonly string[]):string {return execFileSync('git',['-C',cwd,...argv],{encoding:'utf8'}).trim();}
 git(root,['init','-q']);git(root,['config','user.name','Fixture']);git(root,['config','user.email','fixture@example.test']);
 fs.mkdirSync(path.join(root,'.agents/config/project'),{recursive:true});
 const rollingProjectConfigV2: RollingProjectConfigV2 = {schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:'pool',anchor:'main'},
  maxActiveWorkers:1,publicationSize:1,setupCommands:[],qa:{focused:[],publication:[['node','--test']]},
  retirementCommands:[[process.execPath,path.join(__dirname,'fixtures/rolling-worktree-cleanup.js')]]};
 fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV2));
 fs.writeFileSync(path.join(root,'.gitignore'),'/pool/\n/session_id.txt\n/owned-resource.txt\n/cleanup-refuse.txt\n/build-cache.txt\n');
 git(root,['add','.']);git(root,['commit','-q','-m','cleanup fixture']);
 const base = git(root,['rev-parse','HEAD']);
 const rollingWorktreeLease: RollingWorktreeLease = {number:101,rootPath:path.join(root,'pool/101'),generation:crypto.randomUUID()};
 provisionRollingWorktree(root,rollingWorktreeLease,base);
 const rollingWorktreeRetirement: RollingWorktreeRetirement = {...rollingWorktreeLease,generation:crypto.randomUUID(),assignmentId:crypto.randomUUID(),sessionId:'original-session',
  resourceGeneration:rollingWorktreeLease.generation,integratedRevision:base};
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt'),'other-session');
 assert.throws(()=>cleanupRollingWorktree(root,rollingWorktreeRetirement),/session marker differs/);
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt'),rollingWorktreeRetirement.sessionId);
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'user.txt'),'preserve user work');
 assert.throws(()=>cleanupRollingWorktree(root,rollingWorktreeRetirement),/uncommitted work/);
 assert.equal(fs.readFileSync(path.join(rollingWorktreeLease.rootPath,'user.txt'),'utf8'),'preserve user work');
 fs.unlinkSync(path.join(rollingWorktreeLease.rootPath,'user.txt'));
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'owned-resource.txt'),rollingWorktreeRetirement.resourceGeneration);
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'build-cache.txt'),'reusable cached build');
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'cleanup-refuse.txt'),'refuse cleanup');
 assert.throws(()=>cleanupRollingWorktree(root,rollingWorktreeRetirement),/cleanup failed/);
 assert.ok(fs.existsSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt')));
 assert.ok(fs.existsSync(path.join(rollingWorktreeLease.rootPath,'owned-resource.txt')));
 fs.unlinkSync(path.join(rollingWorktreeLease.rootPath,'cleanup-refuse.txt'));
 cleanupRollingWorktree(root,rollingWorktreeRetirement);
 assert.equal(fs.existsSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt')),false);
 assert.equal(fs.existsSync(path.join(rollingWorktreeLease.rootPath,'owned-resource.txt')),false);
 assert.equal(fs.readFileSync(path.join(rollingWorktreeLease.rootPath,'build-cache.txt'),'utf8'),'reusable cached build');
 cleanupRollingWorktree(root,rollingWorktreeRetirement);
 assert.ok(resolveRollingManagedDirectory(root).worktrees.includes(rollingWorktreeLease.rootPath));
 assert.equal(git(rollingWorktreeLease.rootPath,['rev-parse','HEAD']),base);
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt'),rollingWorktreeRetirement.sessionId);
 fs.writeFileSync(path.join(rollingWorktreeLease.rootPath,'retained.ts'),'export const value = 1;\n');
 git(rollingWorktreeLease.rootPath,['add','retained.ts']);git(rollingWorktreeLease.rootPath,['commit','-q','-m','Unintegrated result']);
 assert.throws(()=>cleanupRollingWorktree(root,rollingWorktreeRetirement),/unintegrated commits/);
 assert.ok(fs.existsSync(path.join(rollingWorktreeLease.rootPath,'session_id.txt')));
});

// Traceability: verifies REQ-ROLLING-WORKERS
test('rolling adoption leaves unconfigured historical worktrees untouched and validates every participant', t => {
 const fixture=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-adoption-')));
 t.after(()=>fs.rmSync(fixture,{recursive:true,force:true}));
 const main=path.join(fixture,'main');fs.mkdirSync(main);
 const git=(cwd:string,argv:readonly string[]):string=>execFileSync('git',['-C',cwd,...argv],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(main,['init','-q']);git(main,['config','user.name','Fixture']);git(main,['config','user.email','fixture@example.test']);
 fs.writeFileSync(path.join(main,'README.md'),'historical base');git(main,['add','.']);git(main,['commit','-qm','historical base']);
 const coordinator=path.join(fixture,'coordinator');git(main,['worktree','add','-qb','campaign',coordinator]);
 const legacy=path.join(fixture,'legacy');git(main,['worktree','add','-qb','legacy',legacy]);
 const configuration:RollingProjectConfigV2={schemaVersion:2,mainline:{remote:'origin',branch:'main'},managedWorktrees:{directory:path.join(fixture,'pool'),anchor:'main'},maxActiveWorkers:10,publicationSize:1,setupCommands:[],retirementCommands:[],qa:{focused:[],publication:[['node','--test']]}};
 const configurationPath='.agents/config/project/rolling-campaigns.json';
 fs.mkdirSync(path.join(coordinator,path.dirname(configurationPath)),{recursive:true});fs.writeFileSync(path.join(coordinator,configurationPath),JSON.stringify(configuration));
 assert.equal(resolveRollingManagedDirectory(coordinator).directory,configuration.managedWorktrees.directory);
 assert.equal(fs.existsSync(path.join(main,configurationPath)),false);assert.equal(fs.existsSync(path.join(legacy,configurationPath)),false);
 fs.mkdirSync(path.join(legacy,path.dirname(configurationPath)),{recursive:true});
 const conflictingConfiguration:RollingProjectConfigV2={...configuration,managedWorktrees:{directory:path.join(fixture,'other-pool'),anchor:'main'}};
 fs.writeFileSync(path.join(legacy,configurationPath),JSON.stringify(conflictingConfiguration));assert.throws(()=>resolveRollingManagedDirectory(coordinator),/directory differs/);
 fs.unlinkSync(path.join(legacy,configurationPath));
 const worker=path.join(configuration.managedWorktrees.directory,'101');git(main,['worktree','add','-qb','worker',worker]);
 assert.throws(()=>resolveRollingManagedDirectory(coordinator),/missing regular project configuration/);
 fs.mkdirSync(path.join(worker,path.dirname(configurationPath)),{recursive:true});fs.writeFileSync(path.join(worker,configurationPath),JSON.stringify(configuration));
 assert.equal(resolveRollingManagedDirectory(worker).directory,configuration.managedWorktrees.directory);
 git(main,['worktree','remove',legacy]);git(main,['worktree','add','-qb','stale',legacy]);fs.rmSync(legacy,{recursive:true,force:true});
 assert.equal(resolveRollingManagedDirectory(coordinator).directory,configuration.managedWorktrees.directory,'an absent unowned historical checkout is not a rolling participant');
});
