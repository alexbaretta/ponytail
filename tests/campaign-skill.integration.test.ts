// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

// Traceability: verifies ACC-CM-HOST-OWNERSHIP from integration-test TEST-CM-INSTALL
test('Codex installer publishes campaign management and removes retired owned skills',testContext=>{
 const root=path.resolve(__dirname,'../..');
 const temporaryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ponytail-swarm-skill-'));
 testContext.after(()=>fs.rmSync(temporaryRoot,{recursive:true,force:true}));
 const bin=path.join(temporaryRoot,'bin');fs.mkdirSync(bin);
 // Plugin installation is outside this test; exercise actual skill-copy operations.
 fs.symlinkSync('/usr/bin/true',path.join(bin,'codex'));
 fs.symlinkSync('/usr/bin/true',path.join(bin,'npm'));
 const codexHome=path.join(temporaryRoot,'codex');
 fs.mkdirSync(path.join(codexHome,'skills'),{recursive:true});
 const retired=['swarm','qa-swarm','parallel-plan-scheduler'];
 for(const name of retired) {
  fs.mkdirSync(path.join(codexHome,'skills',name));
  fs.writeFileSync(path.join(codexHome,'skills',name,'SKILL.md'),'old owned skill');
 }
 fs.mkdirSync(path.join(codexHome,'skills','personal'));
 fs.writeFileSync(path.join(codexHome,'skills','personal','SKILL.md'),'user skill');
 fs.writeFileSync(path.join(codexHome,'.ponytail-install.tsv'),retired.map(name=>`bundled\t${name}\t${root}/skills/${name}\n`).join(''));
 const result=spawnSync('bash',[path.join(root,'scripts/install-to-codex.sh'),'--codex-home',codexHome],
  {cwd:root,encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH ?? ''}`}});
 assert.equal(result.status,0,result.stderr);
 for(const name of retired) assert.equal(fs.existsSync(path.join(codexHome,'skills',name)),false);
 assert.equal(fs.readFileSync(path.join(codexHome,'skills/personal/SKILL.md'),'utf8'),'user skill');
 const source=path.join(root,'skills/campaign-management/SKILL.md');
 const installed=path.join(codexHome,'skills/campaign-management/SKILL.md');
 assert.equal(fs.readFileSync(installed,'utf8'),fs.readFileSync(source,'utf8'));
 assert.ok(!fs.lstatSync(path.dirname(installed)).isSymbolicLink());
 assert.notEqual(fs.statSync(installed).ino,fs.statSync(source).ino);
});
