// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {rollingCommandDefinitions,rollingCampaignHelp} from '../src/rolling-cli-registry.js';

// Traceability: verifies REQ-ROLLING-INTERFACES
test('every registered command exposes its complete contract through the shipped CLI',()=> {
 const chapter = spawnSync(process.execPath,[path.join(process.cwd(),'src/rolling-operations.js'),'--help'],{encoding:'utf8'});
 assert.equal(chapter.status,0,chapter.stderr);
 assert.equal(chapter.stdout,rollingCampaignHelp());
 for (const rollingCommandDefinition of rollingCommandDefinitions.filter(command=>command.cli)) {
  const command = spawnSync(process.execPath,[path.join(process.cwd(),'src/rolling-operations.js'),rollingCommandDefinition.name,'--help'],{encoding:'utf8'});
  assert.equal(command.status,0,command.stderr);
  assert.equal(command.stdout,rollingCampaignHelp(rollingCommandDefinition.name));
  for (const field of rollingCommandDefinition.fields) assert.ok(command.stdout.includes(`--${field.name}`));
  assert.ok(command.stdout.includes(rollingCommandDefinition.preconditions));
  assert.ok(command.stdout.includes(rollingCommandDefinition.mutations));
  assert.ok(command.stdout.includes(rollingCommandDefinition.result));
 }
});

// Traceability: verifies REQ-ROLLING-INTERFACES
test('retired campaign commands and malformed options fail before opening project state',()=> {
 for (const arguments_ of [['schedule-ready'],['rebind-worker'],['status','--wrong','pilot'],['status','--campaign','pilot','--campaign','other'],['status','--campaign'],['status','--json','--json']]) {
  const result = spawnSync(process.execPath,[path.join(process.cwd(),'src/rolling-operations.js'),...arguments_],{cwd:'/tmp',encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/unknown|repeated|missing/);
  assert.doesNotMatch(result.stderr,/ponytail-journal/);
 }
});

// Traceability: verifies REQ-SWARM-CLI
test('session API operations are absent from CLI help and refused before project access',()=>{
 for(const rollingCommandDefinition of rollingCommandDefinitions.filter(command=>!command.cli)) {
  assert.ok(!rollingCampaignHelp().includes(`  ${rollingCommandDefinition.name} `));
  const result=spawnSync(process.execPath,[path.join(process.cwd(),'src/rolling-operations.js'),rollingCommandDefinition.name,'--help'],{cwd:'/tmp',encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/retired CLI command/);assert.doesNotMatch(result.stderr,/ponytail-journal|not a git repository/);
 }
});
