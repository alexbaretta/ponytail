// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {renderCliHelp} from '../src/cli-help.js';

// Traceability: verifies REQ-ROLLING-INTERFACES
test('help wraps chapter, command, campaign and root pages at word boundaries with indentation',()=>{
 for(const width of [40,80,120]) for(const args of [[],['traceability'],['traceability','search'],['campaign'],['campaign','request-review']]) {
  const text=renderCliHelp(args,width);
  assert.ok(text.split('\n').every(line=>line.length<=width));
  assert.equal(text.replace(/\s+/gu,' ').trim(),renderCliHelp(args,10000).replace(/\s+/gu,' ').trim());
 }
 assert.match(renderCliHelp(['traceability'],80),/\n    .+/);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
test('invalid commands show the relevant help page before any project or database access',t=>{
 const root=path.resolve(__dirname,'../..');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cli-invalid-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 for(const [args,helpArgs] of [
  [['traceability','index'],['traceability']],
  [['traceability','typo'],['traceability']],
  [['campaign','typo'],['campaign']],
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

// Traceability: verifies REQ-ROLLING-INTERFACES
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
