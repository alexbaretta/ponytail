// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

// Traceability: verifies REQ-SWARM-SKILL
test('Codex installer publishes the registered swarm skill as an independent copy',testContext=>{
 const root=path.resolve(__dirname,'../..');
 const temporaryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ponytail-swarm-skill-'));
 testContext.after(()=>fs.rmSync(temporaryRoot,{recursive:true,force:true}));
 const bin=path.join(temporaryRoot,'bin');fs.mkdirSync(bin);
 // Plugin installation is outside this test; exercise actual skill-copy operations.
 fs.symlinkSync('/usr/bin/true',path.join(bin,'codex'));
 fs.symlinkSync('/usr/bin/true',path.join(bin,'npm'));
 const codexHome=path.join(temporaryRoot,'codex');
 const result=spawnSync('bash',[path.join(root,'scripts/install-to-codex.sh'),'--codex-home',codexHome],
  {cwd:root,encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH ?? ''}`}});
 assert.equal(result.status,0,result.stderr);
 const source=path.join(root,'skills/swarm/SKILL.md');
 const installed=path.join(codexHome,'skills/swarm/SKILL.md');
 assert.equal(fs.readFileSync(installed,'utf8'),fs.readFileSync(source,'utf8'));
 assert.ok(!fs.lstatSync(path.dirname(installed)).isSymbolicLink());
 assert.notEqual(fs.statSync(installed).ino,fs.statSync(source).ino);
});
