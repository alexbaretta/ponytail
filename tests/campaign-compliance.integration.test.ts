// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {cliHelpCommands} from '../src/cli-help.js';
import {rollingCommandDefinitions} from '../src/rolling-cli-registry.js';

const root = path.resolve(__dirname,'../..');
const normalize = (text:string):string => text.replace(/^Traceability:.*$/gmu,'').replace(/\s+/gu,' ').trim();

// Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL
test('exported host resources contain the complete canonical rolling procedure and vocabulary',()=>{
 for (const name of ['glossary.md','rolling-campaigns.md']) {
  const canonical = fs.readFileSync(path.join(root,'skills/plan-execution/references',name),'utf8');
  const exported = fs.readFileSync(path.join(root,'.openclaw/skills/plan-execution/references',name),'utf8');
  assert.equal(normalize(exported),normalize(canonical),`export differs: ${name}`);
 }
 const exportedSkill = fs.readFileSync(path.join(root,'.openclaw/skills/plan-execution/SKILL.md'),'utf8');
 assert.match(exportedSkill,/references\/rolling-campaigns\.md/);
 assert.match(exportedSkill,/Legacy Serial Plan Orchestration/);
 assert.doesNotMatch(exportedSkill,/Every long-lived plan uses one execution path/);
});

// Traceability: verifies REQ-ROLLING-INTERFACES
for (const [obligationId,chapter] of [['OBL-117','search'],['OBL-118','plan'],['OBL-119','traceability'],
 ['OBL-120','plan-input'],['OBL-121','worktree'],['OBL-122','']] ) {
 test(`${obligationId}: real CLI help is explanatory and cannot perform command mutations`,t=>{
  const directory = fs.mkdtempSync(path.join(root,'tmp/help-compliance-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const cliHelpCommandList = cliHelpCommands.filter(command=>command.chapter === chapter);
  const selections = cliHelpCommandList.map(command=>[...(command.chapter ? [command.chapter] : []),command.name,'--help']);
  if (chapter) selections.unshift([chapter,'--help']);
  for (const selection of selections) {
   const spawnSyncReturns = spawnSync(path.join(root,'cli/ponytail'),selection,{cwd:directory,encoding:'utf8'});
   assert.equal(spawnSyncReturns.status,0,spawnSyncReturns.stderr);
   assert.match(spawnSyncReturns.stdout,/Usage:/);
   for (const command of cliHelpCommandList.filter(command=>selection.includes(command.name)))
    assert.ok(spawnSyncReturns.stdout.includes(command.behavior));
   assert.deepEqual(fs.readdirSync(directory),[],`help changed checkout: ${selection.join(' ')}`);
  }
 });
}

// Traceability: verifies REQ-ROLLING-INTERFACES
test('campaign and PM help remain available through the shared help routing',()=>{
 for (const command of rollingCommandDefinitions) {
  const spawnSyncReturns = spawnSync(path.join(root,'cli/ponytail'),['campaign',command.name,'--help'],{cwd:root,encoding:'utf8'});
  assert.equal(spawnSyncReturns.status,0,spawnSyncReturns.stderr);
  assert.match(spawnSyncReturns.stdout,/Preconditions:/);
  assert.match(spawnSyncReturns.stdout,/Mutations:/);
 }
 assert.equal(spawnSync(path.join(root,'cli/ponytail'),['pm','pdf','--help'],{cwd:root}).status,0);
});
