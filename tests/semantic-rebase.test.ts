// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Traceability: verifies REQ-FAST-SEMANTIC-REBASE
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test, {type TestContext} from 'node:test';
import {readSemanticRebaseAnalysisV1,readSemanticRebaseAnalysisV2,readSemanticRebaseSelectionV1,SemanticRebaseRunReaders,
 type SemanticRebaseAnalysisV2} from '../src/semantic-rebase.js';

interface Fixture {readonly root:string;readonly target:string;readonly cleanTarget:string;readonly source:string}
function command(root:string,program:string,args:readonly string[]):string {const result=spawnSync(program,args,{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout;}
function git(root:string,args:readonly string[]):string {return command(root,'git',args).trim();}
function write(root:string,relative:string,text:string):void {const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
function commit(root:string,message:string):string {git(root,['add','.']);git(root,['commit','-m',message]);return git(root,['rev-parse','HEAD']);}
function fixture(testContext:TestContext):Fixture {const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ponytail-semantic-rebase-')));testContext.after(()=>fs.rmSync(root,{recursive:true,force:true}));git(root,['init','-b','main']);git(root,['config','user.name','Fixture']);git(root,['config','user.email','fixture@example.test']);write(root,'shared.txt','base\n');write(root,'base.txt','base\n');write(root,'delete.txt','delete me\n');write(root,'rename-old.txt','rename me\n');commit(root,'base');git(root,['checkout','-b','clean-target']);write(root,'clean-target.txt','clean target\n');commit(root,'Clean target');const cleanTarget=git(root,['rev-parse','HEAD']);git(root,['checkout','-b','target','main']);write(root,'target-prelude.txt','prelude\n');commit(root,'Target prelude');write(root,'equivalent.txt','same\n');commit(root,'Equivalent change');write(root,'shared.txt','base\ntarget\n');commit(root,'Similar change');write(root,'target-only.txt','target only\n');commit(root,'Target only');const target=git(root,['rev-parse','HEAD']);git(root,['checkout','-b','source','main']);write(root,'equivalent.txt','same\n');commit(root,'Equivalent change');write(root,'source.txt','first\n');commit(root,'Build final source hunk');write(root,'source.txt','first\nsecond\n');commit(root,'Build final source hunk further');write(root,'source-only.txt','source only\n');commit(root,'Source only');git(root,['mv','rename-old.txt','rename-new.txt']);commit(root,'Rename source path');fs.rmSync(path.join(root,'delete.txt'));commit(root,'Delete source path');fs.writeFileSync(path.join(root,'binary.bin'),Buffer.from([0,1,2,3,255]));commit(root,'Add binary source');const source=git(root,['rev-parse','HEAD']);return {root,target,cleanTarget,source};}
function cli(root:string,args:readonly string[],expected=0):string {const executable=path.resolve('dist/src/semantic-rebase.js');const result=spawnSync(process.execPath,[executable,...args],{cwd:root,encoding:'utf8'});assert.equal(result.status,expected,result.stderr);return result.stdout;}
function analysis(root:string):SemanticRebaseAnalysisV2 {const gitDirectory=git(root,['rev-parse','--absolute-git-dir']);const value:unknown=JSON.parse(fs.readFileSync(path.join(gitDirectory,'ponytail-semantic-rebase','analysis.json'),'utf8'));return readSemanticRebaseAnalysisV2(value);}

test('aggregate review preserves complete source and target diffs above the default capture limit',testContext=>{
 const value=fixture(testContext);
 const payload=Array.from({length:20000},(_value,index)=>`${index}: ${'content '.repeat(16)}\n`).join('');
 assert.ok(Buffer.byteLength(payload)>2*1024*1024);
 git(value.root,['checkout','target']);write(value.root,'large-target.txt',payload);const target=commit(value.root,'Large target');
 git(value.root,['checkout','source']);write(value.root,'large-source.txt',payload);const source=commit(value.root,'Large source');
 const output=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'large-review.diff');
 cli(value.root,['diff','target','--output',output]);
 const frozen=analysis(value.root);
 const expected=payload.slice(0,-1).split('\n').map(line=>`+${line}\n`).join('');
 for(const changes of [frozen.sourceChanges,frozen.targetChanges]){
  const change=changes.find(item=>item.newPath.startsWith('large-'));
  assert.ok(change);assert.ok(change.patch.endsWith(expected));
 }
 const first=fs.readFileSync(output,'utf8');
 assert.ok(first.includes('large-source.txt'));assert.ok(first.includes('large-target.txt'));
 assert.ok(first.includes(expected));
 cli(value.root,['diff','target','--output',output]);
 assert.equal(fs.readFileSync(output,'utf8'),first);
 assert.equal(analysis(value.root).analysisDigest,frozen.analysisDigest);
 assert.equal(git(value.root,['rev-parse','HEAD']),source);
 assert.equal(git(value.root,['rev-parse','target']),target);
 assert.equal(git(value.root,['status','--porcelain']),'');
});

test('aggregate analysis freezes both final states and exposes stable IDs',testContext=>{const value=fixture(testContext);const first=cli(value.root,['diff','target']);const frozen=analysis(value.root);assert.equal(frozen.sourceTip,value.source);assert.equal(frozen.targetTip,value.target);assert.deepEqual(frozen.sourceChanges.map(change=>change.id),frozen.sourceChanges.map((_change,index)=>`S${String(index+1).padStart(4,'0')}`));assert.deepEqual(frozen.targetChanges.map(change=>change.id),frozen.targetChanges.map((_change,index)=>`T${String(index+1).padStart(4,'0')}`));assert.ok(frozen.sourceChanges.some(change=>change.oldPath==='rename-old.txt'&&change.newPath==='rename-new.txt'));assert.ok(frozen.sourceChanges.some(change=>change.oldPath==='delete.txt'&&change.newPath==='/dev/null'));assert.ok(frozen.sourceChanges.some(change=>change.newPath==='binary.bin'&&change.kind==='file'));assert.match(first,/TARGET FINAL CHANGES/);assert.match(first,/SOURCE FINAL CHANGES/);assert.match(first,/equivalent\.txt/);assert.match(first,/target-only\.txt/);assert.match(first,/source-only\.txt/);const second=cli(value.root,['diff','target']);assert.equal(second,first);});

test('selection parser binds source changes to one analysis and rejects malformed relations',testContext=>{const value=fixture(testContext);cli(value.root,['diff','target']);const frozen=analysis(value.root);const sourceId=frozen.sourceChanges[0]?.id;const targetId=frozen.targetChanges[0]?.id;assert.ok(sourceId);assert.ok(targetId);const selection=readSemanticRebaseSelectionV1(`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceId} ${targetId} | agent review\n`,frozen);assert.equal(selection.entries[0]?.reason,'agent review');assert.throws(()=>readSemanticRebaseSelectionV1(`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceId} T9999\n`,frozen),/unknown target change/);assert.throws(()=>readSemanticRebaseSelectionV1(`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceId} -\n${sourceId} -\n`,frozen),/duplicate source IDs/);});

test('header-only selection replays without planned stops',testContext=>{const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase','empty-selection.txt');fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n`);const output=cli(value.root,['run','clean-target','--conflicts',selectionPath]);assert.match(output,/semantic rebase complete/);assert.match(output,/reviewed -/);assert.equal(git(value.root,['symbolic-ref','--short','HEAD']),'source');assert.equal(git(value.root,['rev-parse','source']),git(value.root,['rev-parse','HEAD']));git(value.root,['merge-base','--is-ancestor','clean-target','HEAD']);});

test('selected multi-commit final hunk stops at each contributor while clean commits replay automatically',testContext=>{const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);assert.equal(frozen.targetTip,value.cleanTarget);const sourceChange=frozen.sourceChanges.find(change=>change.newPath==='source.txt');assert.ok(sourceChange);const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');const selectionPath=path.join(stateDirectory,'selection.txt');fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceChange.id} - | review constructed hunk\n`);let output=cli(value.root,['run','clean-target','--conflicts',selectionPath]);const runState:unknown=JSON.parse(fs.readFileSync(path.join(stateDirectory,'run.json'),'utf8'));assert.ok(typeof runState==='object'&&runState!==null&&'plannedCommits' in runState&&Array.isArray(runState.plannedCommits));assert.equal(runState.plannedCommits.length,2);const todo=fs.readFileSync(path.join(stateDirectory,'todo'),'utf8');assert.equal(todo.split('\n').filter(line=>line==='break').length,2);let plannedStops=0;while(/semantic rebase stop/.test(output)){assert.match(output,/planned yes/);plannedStops++;output=cli(value.root,['continue']);}assert.equal(plannedStops,2);assert.match(output,/semantic rebase complete/);assert.equal(git(value.root,['symbolic-ref','--short','HEAD']),'source');assert.equal(git(value.root,['rev-parse','source']),git(value.root,['rev-parse','HEAD']));git(value.root,['merge-base','--is-ancestor','clean-target','HEAD']);assert.equal(git(value.root,['status','--porcelain']),'');assert.equal(fs.existsSync(path.join(git(value.root,['rev-parse','--absolute-git-dir']),'rebase-merge')),false);});

test('broadened resolution remains stopped and abort restores the frozen source tip',testContext=>{const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);const sourceChange=frozen.sourceChanges.find(change=>change.newPath==='source.txt');assert.ok(sourceChange);const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');const selectionPath=path.join(stateDirectory,'selection.txt');fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceChange.id} - | broadened review fixture\n`);assert.match(cli(value.root,['run','clean-target','--conflicts',selectionPath]),/semantic rebase stop/);write(value.root,'base.txt','broadened\n');const residual=cli(value.root,['continue']);assert.match(residual,/residual review required/);assert.match(residual,/base\.txt/);assert.equal(fs.existsSync(path.join(git(value.root,['rev-parse','--absolute-git-dir']),'rebase-merge')),true);assert.match(cli(value.root,['abort']),/semantic rebase aborted/);assert.equal(git(value.root,['rev-parse','HEAD']),value.source);assert.equal(fs.readFileSync(path.join(value.root,'base.txt'),'utf8'),'base\n');assert.equal(git(value.root,['symbolic-ref','--short','HEAD']),'source');assert.equal(cli(value.root,['abort']),'semantic rebase inactive\n');});

test('run rejects a target ref that moved after frozen analysis',testContext=>{const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);const sourceChange=frozen.sourceChanges[0];assert.ok(sourceChange);const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');const selectionPath=path.join(stateDirectory,'selection.txt');fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${sourceChange.id} - | stale target fixture\n`);const tree=git(value.root,['rev-parse','clean-target^{tree}']);const advanced=spawnSync('git',['commit-tree',tree,'-p','clean-target','-m','Advance target'],{cwd:value.root,encoding:'utf8'});assert.equal(advanced.status,0,advanced.stderr);git(value.root,['branch','-f','clean-target',advanced.stdout.trim()]);const executable=path.resolve('dist/src/semantic-rebase.js');const result=spawnSync(process.execPath,[executable,'run','clean-target','--conflicts',selectionPath],{cwd:value.root,encoding:'utf8'});assert.equal(result.status,2);assert.match(result.stderr,/run target does not match frozen analysis|target changed after analysis/);assert.equal(git(value.root,['rev-parse','HEAD']),value.source);});


test('detached source replays without attaching or moving the original branch',testContext=>{
 const value=fixture(testContext);git(value.root,['checkout','--detach']);
 cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 assert.equal(frozen.schemaVersion,2);assert.equal(frozen.sourceBranch,null);
 const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');
 const selectionPath=path.join(stateDirectory,'selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n`);
 assert.match(cli(value.root,['run','clean-target','--conflicts',selectionPath]),/semantic rebase complete/);
 assert.equal(git(value.root,['rev-parse','--abbrev-ref','HEAD']),'HEAD');
 assert.equal(git(value.root,['rev-parse','source']),value.source);
 git(value.root,['merge-base','--is-ancestor','clean-target','HEAD']);
});

for(const finish of ['continue','abort'])test(`detached selected replay supports ${finish}`,testContext=>{
 const value=fixture(testContext);git(value.root,['checkout','--detach']);
 cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 const change=frozen.sourceChanges.find(item=>item.newPath==='source.txt');assert.ok(change);
 const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');
 const selectionPath=path.join(stateDirectory,'selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${change.id} - | detached selected unit\n`);
 let output=cli(value.root,['run','clean-target','--conflicts',selectionPath]);assert.match(output,/semantic rebase stop/);
 if(finish==='abort'){
  assert.match(cli(value.root,['abort']),/semantic rebase aborted/);
  assert.equal(git(value.root,['rev-parse','HEAD']),value.source);
 }else{
  let stops=0;while(/semantic rebase stop/.test(output)){assert.ok(stops++<3);output=cli(value.root,['continue']);}
  assert.equal(stops,2);assert.match(output,/semantic rebase complete/);
  git(value.root,['merge-base','--is-ancestor','clean-target','HEAD']);
 }
 assert.equal(git(value.root,['rev-parse','--abbrev-ref','HEAD']),'HEAD');
 assert.equal(git(value.root,['rev-parse','source']),value.source);
 assert.equal(fs.existsSync(path.join(git(value.root,['rev-parse','--absolute-git-dir']),'rebase-merge')),false);
});

for(const detached of [false,true])test(`source attachment change after review is rejected from detached=${detached}`,testContext=>{
 const value=fixture(testContext);if(detached)git(value.root,['checkout','--detach']);
 cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase','selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n`);
 git(value.root,detached?['checkout','source']:['checkout','--detach']);
 const result=spawnSync(process.execPath,[path.resolve('dist/src/semantic-rebase.js'),'run','clean-target','--conflicts',selectionPath],{cwd:value.root,encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/source branch changed after analysis/);
 assert.equal(git(value.root,['rev-parse','HEAD']),value.source);
});

test('retained V1 analysis and run state resume without changing their digest binding',testContext=>{
 const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 const {analysisDigest:ignoredDigest,...payload}=frozen;assert.ok(ignoredDigest);
 const oldPayload={...payload,schemaVersion:1};
 const oldAnalysis={...oldPayload,analysisDigest:crypto.createHash('sha256').update(JSON.stringify(oldPayload)).digest('hex')};
 assert.equal(readSemanticRebaseAnalysisV1(oldAnalysis).sourceBranch,'source');
 assert.throws(()=>readSemanticRebaseAnalysisV1({...oldAnalysis,sourceBranch:null}),/source branch/);
 assert.throws(()=>readSemanticRebaseAnalysisV2(oldAnalysis),/schemaVersion/);
 const stateDirectory=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase');
 fs.writeFileSync(path.join(stateDirectory,'analysis.json'),JSON.stringify(oldAnalysis));
 const change=frozen.sourceChanges.find(item=>item.newPath==='source.txt');assert.ok(change);
 const selectionPath=path.join(stateDirectory,'selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${oldAnalysis.analysisDigest}\n${change.id} - | retained analysis\n`);
 assert.match(cli(value.root,['run','clean-target','--conflicts',selectionPath]),/semantic rebase stop/);
 const currentRun:unknown=JSON.parse(fs.readFileSync(path.join(stateDirectory,'run.json'),'utf8'));
 const parsedRun=SemanticRebaseRunReaders.V2(currentRun);
 assert.equal(parsedRun.analysisDigest,oldAnalysis.analysisDigest);
 const oldRun={...parsedRun,schemaVersion:1};
 assert.throws(()=>SemanticRebaseRunReaders.V1({...oldRun,sourceBranch:null}),/source branch/);
 fs.writeFileSync(path.join(stateDirectory,'run.json'),JSON.stringify(oldRun));
 assert.match(cli(value.root,['status']),/semantic rebase stop/);
 assert.match(cli(value.root,['continue']),/semantic rebase stop/);
 const upgradedRun:unknown=JSON.parse(fs.readFileSync(path.join(stateDirectory,'run.json'),'utf8'));
 assert.equal(SemanticRebaseRunReaders.V2(upgradedRun).analysisDigest,oldAnalysis.analysisDigest);
 assert.match(cli(value.root,['abort']),/semantic rebase aborted/);
 assert.equal(git(value.root,['rev-parse','HEAD']),value.source);
});

for(const selected of [false,true])test(`textual conflict identifies the current sequencer commit selected=${selected}`,testContext=>{
 const value=fixture(testContext);
 git(value.root,['checkout','-b','conflict-target','clean-target']);
 write(value.root,'shared.txt','base\ntarget\n');commit(value.root,'Target conflict');
 git(value.root,['checkout','source']);
 const previous=git(value.root,['show','-s','--format=%s','HEAD']);
 write(value.root,'shared.txt','base\nsource\n');
 const conflictCommit=commit(value.root,selected?previous:'Conflicting source change');
 cli(value.root,['diff','conflict-target']);const frozen=analysis(value.root);
 const change=frozen.sourceChanges.find(item=>item.newPath==='shared.txt');assert.ok(change);
 const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase','selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${selected?`${change.id} - | conflicting selected change\n`:''}`);
 const stopped=cli(value.root,['run','conflict-target','--conflicts',selectionPath]);
 assert.ok(stopped.includes(`original-commit ${conflictCommit}`),stopped);
 assert.match(stopped,/allowed-paths shared\.txt/);
 write(value.root,'shared.txt','base\ntarget\nsource\n');git(value.root,['add','shared.txt']);
 let output=cli(value.root,['continue']);assert.doesNotMatch(output,/residual review/);
 if(selected){assert.match(output,/semantic rebase stop/);output=cli(value.root,['continue']);}
 assert.match(output,/semantic rebase complete/);
 assert.equal(fs.readFileSync(path.join(value.root,'shared.txt'),'utf8'),'base\ntarget\nsource\n');
 assert.equal(git(value.root,['rev-list','--count','conflict-target..HEAD']),'8');
 assert.equal(git(value.root,['status','--porcelain']),'');
});

test('review edits after an empty selected pick preserve the frozen target',testContext=>{
 const value=fixture(testContext);
 git(value.root,['checkout','-b','empty-target','main']);
 write(value.root,'shared.txt','base\none\n');commit(value.root,'Target first half');
 write(value.root,'shared.txt','base\none\ntwo\n');const target=commit(value.root,'Target second half');
 git(value.root,['checkout','-b','empty-source','main']);
 write(value.root,'shared.txt','base\none\ntwo\n');const source=commit(value.root,'Source combined change');
 cli(value.root,['diff','empty-target']);const frozen=analysis(value.root);
 const change=frozen.sourceChanges.find(item=>item.newPath==='shared.txt');assert.ok(change);
 const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'ponytail-semantic-rebase','selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${change.id} - | review equivalent combined change\n`);
 const stopped=cli(value.root,['run','empty-target','--conflicts',selectionPath]);
 assert.ok(stopped.includes(`original-commit ${source}`),stopped);
 assert.notEqual(git(value.root,['rev-parse','HEAD']),target);
 assert.equal(git(value.root,['rev-parse','HEAD^']),target);
 write(value.root,'shared.txt','base\none\ntwo\nreview\n');
 assert.match(cli(value.root,['continue']),/semantic rebase complete/);
 git(value.root,['merge-base','--is-ancestor',target,'HEAD']);
 assert.equal(git(value.root,['rev-list','--count',`${target}..HEAD`]),'1');
 assert.equal(fs.readFileSync(path.join(value.root,'shared.txt'),'utf8'),'base\none\ntwo\nreview\n');
});

for(const finish of ['continue','abort'] as const)test(`unrelated untracked bytes survive review, planned stops and ${finish}`,testContext=>{
 const value=fixture(testContext);const bytes=Buffer.from([0,255,13,10,42]);
 fs.writeFileSync(path.join(value.root,'clean.sh'),bytes);
 cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 const change=frozen.sourceChanges.find(item=>item.newPath==='source.txt');assert.ok(change);
 const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n${change.id} - | review source\n`);
 let output=cli(value.root,['run','clean-target','--conflicts',selectionPath]);assert.match(output,/semantic rebase stop/);
 if(finish==='abort'){cli(value.root,['abort']);assert.equal(git(value.root,['rev-parse','HEAD']),value.source);}
 else {while(/semantic rebase stop/.test(output))output=cli(value.root,['continue']);assert.match(output,/semantic rebase complete/);}
 assert.deepEqual(fs.readFileSync(path.join(value.root,'clean.sh')),bytes);
 assert.equal(git(value.root,['status','--porcelain']),'?? clean.sh');
});

for(const file of ['clean-target.txt','clean-target.txt/child','delete.txt'])test(`untracked collision is rejected before analysis: ${file}`,testContext=>{
 const value=fixture(testContext);write(value.root,file,'user-owned\n');
 const result=spawnSync(process.execPath,[path.resolve('dist/src/semantic-rebase.js'),'diff','clean-target'],{cwd:value.root,encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/untracked path may collide/);
 assert.equal(fs.readFileSync(path.join(value.root,file),'utf8'),'user-owned\n');assert.equal(git(value.root,['rev-parse','HEAD']),value.source);
});

test('untracked collisions appearing after review and tracked dirt both reject replay',testContext=>{
 const value=fixture(testContext);cli(value.root,['diff','clean-target']);const frozen=analysis(value.root);
 const selectionPath=path.join(git(value.root,['rev-parse','--absolute-git-dir']),'selection.txt');
 fs.writeFileSync(selectionPath,`ponytail-semantic-rebase-selection-v1 ${frozen.analysisDigest}\n`);
 write(value.root,'clean-target.txt','user-owned\n');
 const invoke=()=>spawnSync(process.execPath,[path.resolve('dist/src/semantic-rebase.js'),'run','clean-target','--conflicts',selectionPath],{cwd:value.root,encoding:'utf8'});
 const collision=invoke();assert.equal(collision.status,2);assert.match(collision.stderr,/untracked path may collide/);
 fs.unlinkSync(path.join(value.root,'clean-target.txt'));write(value.root,'base.txt','dirty\n');
 const dirty=invoke();assert.equal(dirty.status,2);assert.match(dirty.stderr,/clean tracked worktree/);
 assert.equal(git(value.root,['rev-parse','HEAD']),value.source);
});
