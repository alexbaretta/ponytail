// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {renderCliHelp} from '../src/cli-help.js';

// Historical coverage: verifies REQ-ROLLING-INTERFACES
// Historical coverage: verifies REQ-SWARM-CLI
test('help wraps chapter, command, campaign and root pages at word boundaries with indentation',()=>{
 for(const width of [40,80,120]) for(const args of [[],['traceability'],['traceability','search'],['campaign'],['campaign','legacy'],['swarm'],['swarm','info'],['swarm','owner-enroll'],['swarm','coordinator-bind'],['swarm','coordinator-unbind'],['swarm','worktree-assign'],['swarm','worktree-setup'],['swarm','worktree-release'],['swarm','worktree-delete'],['swarm','worker-bind']]) {
  const text=renderCliHelp(args,width);
  assert.ok(text.split('\n').every(line=>line.length<=width));
  assert.equal(text.replace(/\s+/gu,' ').trim(),renderCliHelp(args,10000).replace(/\s+/gu,' ').trim());
 }
 assert.match(renderCliHelp(['traceability'],80),/\n    .+/);
});

// Historical coverage: verifies REQ-ROLLING-INTERFACES
// Historical coverage: verifies REQ-SWARM-CLI
test('invalid commands show the relevant help page before any project or database access',t=>{
 const root=path.resolve(__dirname,'../..');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cli-invalid-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 for(const [args,helpArgs] of [
  [['traceability','index'],['traceability']],
  [['traceability','typo'],['traceability']],
  [['campaign','typo'],['campaign']],
  [['swarm','typo'],['swarm']],
  [['swarm'],['swarm']],
  [['pm','typo'],['pm']],
  [['worktree','typo'],['worktree']],
  [['typo'],[]],
  [['traceability'],['traceability']],
 ] as const) {
  const result=spawnSync(path.join(root,'cli/ponytail'),args,{cwd:directory,encoding:'utf8'});
  assert.equal(result.status,2,result.stderr);
  const help=spawnSync(path.join(root,'cli/ponytail'),[...helpArgs,'-h'],{cwd:directory,encoding:'utf8'});
  assert.equal(help.status,0,help.stderr);
  assert.ok(result.stderr.endsWith(help.stdout),args.join(' '));
  assert.doesNotMatch(result.stderr,/not registered|no Git worktree|PROJECT_INDEX_USAGE/);
 }
 assert.deepEqual(fs.readdirSync(directory),[]);
});

// Historical coverage: verifies REQ-ROLLING-INTERFACES
test('invalid index arguments show full subcommand help through the index adapter',()=>{
 const root=path.resolve(__dirname,'../..');
 const result=spawnSync(process.execPath,[path.join(root,'src/project-index.js'),'traceability','update-index','--bad'],{cwd:os.tmpdir(),encoding:'utf8'});
 assert.equal(result.status,2,result.stderr);
 assert.ok(result.stderr.endsWith(renderCliHelp(['traceability','update-index'])));
 const invalidSearch=spawnSync(process.execPath,[path.join(root,'src/project-index.js'),'traceability','search','term','--bad'],{cwd:os.tmpdir(),encoding:'utf8'});
 assert.equal(invalidSearch.status,2,invalidSearch.stderr);
 assert.match(invalidSearch.stderr,/invalid search option: --bad/);
 assert.ok(invalidSearch.stderr.endsWith(renderCliHelp(['traceability','search'])));
});

// Traceability: verifies REQ-PONYTAIL-PROJECT-ISOLATION
test('launcher starts directly without shell heredoc transport and preserves symlink arguments',t=>{
 const root=path.resolve(__dirname,'../..');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cli-direct-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 // A shell transport must not run before the real interpreter starts.
 fs.writeFileSync(path.join(directory,'bash'),'#!/bin/sh\nexit 99\n',{mode:0o755});
 const launcher=path.join(directory,'ponytail');
 fs.symlinkSync(path.join(root,'cli/ponytail'),launcher);
 const result=spawnSync(launcher,['traceability','completeness','--help'],{
  cwd:directory,encoding:'utf8',timeout:10000,env:{...process.env,PATH:`${directory}:${process.env.PATH}`},
 });
 assert.equal(result.error,undefined);
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.stdout,renderCliHelp(['traceability','completeness']));
 const policyLauncher=path.join(directory,'condense_codex_rules.sh');
 fs.symlinkSync(path.join(root,'cli/condense_codex_rules.sh'),policyLauncher);
 const policy=spawnSync(policyLauncher,['--help'],{
  cwd:directory,encoding:'utf8',timeout:10000,env:{...process.env,PATH:`${directory}:${process.env.PATH}`},
 });
 assert.equal(policy.error,undefined);
 assert.equal(policy.status,0,policy.stderr);
 assert.match(policy.stdout,/--validate-project/);
});
