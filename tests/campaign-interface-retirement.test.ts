// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {cliCommandRegistryV1,renderCliHelp} from '../src/cli-help.js';
import {rollingCommandDefinitions} from '../src/rolling-cli-registry.js';

// Traceability: verifies ACC-CM-HOST-OWNERSHIP from unit-test TEST-CM-RETIRED-COMMANDS
test('public command inventory exposes historical inspection without swarm or campaign orchestration',()=>{
 assert.equal(Object.hasOwn(cliCommandRegistryV1.chapters,'swarm'),false);
 assert.deepEqual(cliCommandRegistryV1.chapters.worktree?.commands,['reclaim']);
 assert.deepEqual(cliCommandRegistryV1.chapters.campaign?.commands,['legacy']);
 assert.deepEqual(rollingCommandDefinitions.filter(item=>item.cli).map(item=>item.name),['legacy']);
 assert.doesNotMatch(renderCliHelp([]),/ponytail swarm/);
 assert.doesNotMatch(renderCliHelp(['campaign']),/replenish|next-actions|init|reset/);
});

// Traceability: verifies ACC-CM-HOST-OWNERSHIP from integration-test TEST-CM-RETIRED-DISPATCH
test('retired commands fail before touching a project or creating runtime state',testContext=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'campaign-retired-'));
 testContext.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const entry=path.resolve(__dirname,'../../src/rolling-operations.js');
 for (const command of ['init','replenish','submit','integrate','accept','close','reset']) {
  const result=spawnSync(process.execPath,[entry,command],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,1,command);
  assert.match(result.stderr,/retired CLI command/,command);
  assert.deepEqual(fs.readdirSync(root),[],command);
 }
});
