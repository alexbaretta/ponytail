// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { inputDigest, acceptCheckpoint } = require('../skills/plan-execution/scripts/obligations');
const { parsePlanSource, campaignGraph } = require('../src/campaign-census');
const { readTaskletGraph, parseTaskletStatuses, validateTaskletGraph, selectObligationTasklets } = require('../skills/plan-execution/scripts/ready-tasklets');
const { newLedger, readLedgerV9, withLedgerLock, ledgerPath } = require('../src/campaign-orchestration');

const { git, fixture } = require('./helpers/obligation-fixture');

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-ASSIGNMENT
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('adopted plan binds explicit scope and selects only subordinate tasklets within its paths', t => {
  const {root,documentPath,planPath,planText,sprintPath,document} = fixture(t);
  assert.equal(parsePlanSource(root,planPath,'in_progress',planText).obligationDocument,documentPath);
  const graph = readTaskletGraph(path.join(root,sprintPath));
  const statuses = parseTaskletStatuses(path.join(root,sprintPath));
  const selection = selectObligationTasklets(graph,statuses,validateTaskletGraph(graph,statuses),null,document,root,'pilot');
  assert.deepEqual(selection.taskletIds,['S01-F01-T01']);
  assert.deepEqual(selection.plannedPaths,['src.txt']);
  assert.equal(campaignGraph(root,'pilot').plans[0].runnableTasklets.sprintId,'S01');
  document.obligations[0].execution.plannedPaths=[];
  assert.throws(()=>selectObligationTasklets(graph,statuses,validateTaskletGraph(graph,statuses),null,document,root,'pilot'),/exceeds obligation paths/);
});

// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction', t => {
  const {root} = fixture(t);
  const ledger = newLedger(root,'pilot','coordinator');
  assert.equal(ledger.schemaVersion,9);
  assert.deepEqual(readLedgerV9(ledger).obligationAssignments,[]);
});

test('existing serialization cannot reap a live coordinator merely because its lock aged', t => {
  const {root,environment} = fixture(t);
  const lock = `${ledgerPath(root,'pilot',environment)}.lock`;
  fs.mkdirSync(path.dirname(lock),{recursive:true});
  fs.writeFileSync(lock,String(process.pid));
  const old = new Date(Date.now()-10000);
  fs.utimesSync(lock,old,old);
  assert.throws(()=>withLedgerLock(root,'pilot',environment,()=>{ throw new Error('LIVE_OWNER_ENTERED'); }),/CAMPAIGN_LEDGER_LOCK|timed out/);
  assert.equal(fs.readFileSync(lock,'utf8'),String(process.pid));
});

const { spawn } = require('node:child_process');
function child(script, args, root, environment) {
  return new Promise((resolve,reject)=>{
    const childProcess = spawn(process.execPath,[script,...args],{cwd:root,env:environment});
    let stdout='',stderr='';
    childProcess.stdout.on('data',chunk=>{stdout+=chunk;});
    childProcess.stderr.on('data',chunk=>{stderr+=chunk;});
    childProcess.on('error',reject);
    childProcess.on('close',status=>resolve({status,stdout,stderr}));
  });
}
// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-BASELINE
test('two independent coordinator processes cannot publish the same predecessor twice', async t => {
  const {root,documentPath,document,proofPath,environment} = fixture(t);
  const candidate=structuredClone(document);
  candidate.certificates.push({id:'CERT-1',obligationIds:['OBL-1'],inputs:['requirement.md',proofPath].map(relative=>({path:relative,digest:inputDigest(root,relative)})),artifacts:[proofPath],assessor:'coordinator',authority:['approved-CHNG'],adequate:true,reason:'All T1 responsibilities enumerated in inspected proof',disposition:null,evidence:[],inventoryIds:[]});
  candidate.checkpoints.push({...structuredClone(document.checkpoints[0]),id:'CP2',predecessorId:'CP1',kind:'productive',registeredIds:[],selectedIds:['OBL-1'],certificateIds:['CERT-1'],after:[0,1,1,1,1,1]});
  fs.writeFileSync(path.join(root,'candidate.json'),JSON.stringify(candidate));
  const script=path.join(__dirname,'../src/campaign-census.js');
  const results=await Promise.all([child(script,['obligation-accept','pilot','--candidate','candidate.json','--json'],root,environment),child(script,['obligation-accept','pilot','--candidate','candidate.json','--json'],root,environment)]);
  assert.deepEqual(results.map(result=>result.status).sort(),[0,1],JSON.stringify(results));
  const persisted=JSON.parse(fs.readFileSync(path.join(root,documentPath),'utf8'));
  assert.equal(persisted.checkpoints.length,2);
  assert.equal(persisted.checkpoints.at(-1).id,'CP2');
  const unauthorized=await child(script,['obligation-accept','pilot','--candidate','candidate.json'],root,{...environment,PONYTAIL_SESSION_ID:'worker'});
  assert.notEqual(unauthorized.status,0);
  assert.match(unauthorized.stderr,/coordinator/);
});

const { reserveAssignment, recordWorkerDelivery, readWorkerDeliveries, readLedger, reconcile, readStatusV11, parseCampaignJson } = require('../src/campaign-orchestration');
// Traceability: verifies REQ-OBLIGATION-ASSIGNMENT
test('frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations', t => {
  const {root,environment,proofPath,documentPath} = fixture(t);
  const graph=campaignGraph(root,'pilot');
  const assignment=withLedgerLock(root,'pilot',environment,ledger=>{
    const assignment=reserveAssignment(ledger,'pilot',null,graph);
    assignment.worktree=root; assignment.sessionId='worker'; assignment.branch='main'; assignment.state='ACTIVE';
    return {...assignment,planPath:graph.plans[0].path};
  });
  const binding=readLedger(root,'pilot',environment).obligationAssignments[0];
  assert.deepEqual(binding.obligationIds,['OBL-1']);
  assert.deepEqual(binding.plannedPaths,['src.txt']);
  fs.writeFileSync(path.join(root,'src.txt'),'authorized worker edit');
  git(root,['add','src.txt']); git(root,['commit','-m','Scoped worker delivery']);
  const revision=git(root,['rev-parse','HEAD']);
  const result={schemaVersion:2,bindingId:binding.id,revision,evidencePaths:[proofPath],obligationIds:['OBL-1'],predecessorId:'CP1',changedPaths:['src.txt']};
  recordWorkerDelivery(root,'pilot',assignment,result,environment);
  assert.equal(readWorkerDeliveries(root,'pilot',environment).deliveries[0].obligation.predecessorId,'CP1');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,documentPath),'utf8')).checkpoints.length,1);
  assert.throws(()=>recordWorkerDelivery(root,'pilot',assignment,{...result,changedPaths:[]},environment),/actual permitted changes/);
  assert.throws(()=>recordWorkerDelivery(root,'pilot',assignment,{...result,obligationIds:['OBL-6']},environment),/frozen obligations/);
  fs.writeFileSync(path.join(root,'other.txt'),'outside frozen paths');
  git(root,['add','other.txt']); git(root,['commit','-m','Outside lease fixture']);
  assert.throws(()=>recordWorkerDelivery(root,'pilot',assignment,{...result,revision:git(root,['rev-parse','HEAD']),changedPaths:['other.txt','src.txt']},environment),/actual permitted changes/);
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('current campaign status projects canonical metrics and retains an explicit legacy null scope', t => {
  const {root,environment} = fixture(t);
  const ledger=newLedger(root,'pilot','coordinator');
  const graph=campaignGraph(root,'pilot');
  const status=reconcile(graph,ledger,root,environment);
  assert.equal(status.schemaVersion,11);
  assert.deepEqual(readStatusV11(status),status);
  assert.deepEqual(status.obligations.vector,[1,1,1,1,1,1]);
  assert.equal(status.obligations.selectedId,'OBL-1');
  assert.equal(reconcile({...graph,obligationDocument:null},ledger,root,environment).obligations,null);
});

test('campaign codec preserves historical numeric spelling and rejects imprecise values',()=>{
  assert.deepEqual(parseCampaignJson('{"schemaVersion":8.0}'),{schemaVersion:8});
  assert.deepEqual(parseCampaignJson('{"schemaVersion":8e0}'),{schemaVersion:8});
  assert.throws(()=>parseCampaignJson('{"schemaVersion":9007199254740993}'));
  assert.throws(()=>parseCampaignJson('{"schemaVersion":1.1}'));
});

const { collectPlanProjection, PlanIndexStorageReaders }=require('../src/project-index');
// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-FRESHNESS
test('configured discovery indexes canonical IDs and refreshes when relevant source inputs change',t=>{
  const {root,documentPath}=fixture(t);
  fs.writeFileSync(path.join(root,'ponytail-journal.json'),JSON.stringify({schemaVersion:1,projectId:'01a01279-2c49-79c2-95e8-7d55fdb36955',projectName:'fixture',database:{name:'fixture'}}));
  const before=collectPlanProjection(root);
  const document=before.files.find(file=>file.path===documentPath);
  const records=PlanIndexStorageReaders.variants.V1(document.parse()).records;
  assert.equal(records.filter(record=>record.recordKind==='obligation').length,6);
  assert.equal(records[0].recordId,'OBL-1');
  assert.equal(records[0].status,'UNRESOLVED');
  fs.writeFileSync(path.join(root,'requirement.md'),'changed approved-input snapshot');
  const after=collectPlanProjection(root);
  assert.notEqual(before.stateDigest,after.stateDigest);
  assert.notEqual(document.parserIdentity,after.files.find(file=>file.path===documentPath).parserIdentity);
});

// Traceability: verifies REQ-PONYTAIL-GLOSSARY
test('generated skill rendering preserves vocabulary and never copies canonical relationship annotations',()=>{
  const {render}=require('../scripts/build-openclaw-skills');
  for (const name of ['plan-execution','ponytail','requirements','requirements-traceability','issue-tracking']) {
    const {findRelationships}=require('../skills/requirements-traceability/scripts/check-traceability');
    const ids=new Set(require('../.agents/config/project/traceability.json').requirements.map(requirement=>requirement.id));
    assert.deepEqual(findRelationships(render(name),{class:'implementation',locator:'text',path:name}).filter(relationship=>ids.has(relationship.requirementId)),[]);
    assert.match(fs.readFileSync(path.join(__dirname,'../skills',name,'SKILL.md'),'utf8'),/^Traceability:/mu);
  }
  assert.match(render('plan-execution'),/references\/glossary\.md/);
  assert.ok(render('requirements-traceability').includes(['Traceability:', 'implements', 'REQ-STABLE-ID', 'from endpoint GET-orders'].join(' ')));
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved',t=>{
  const {root,sprintPath,documentPath}=fixture(t);
  const script=path.join(__dirname,'../skills/plan-execution/scripts/ready-tasklets.js');
  assert.notEqual(spawnSync(process.execPath,[script,path.join(root,sprintPath)]).status,0);
  const invoke=()=>spawnSync(process.execPath,[script,path.join(root,sprintPath),'--obligations',path.join(root,documentPath),'--root',root],{encoding:'utf8'});
  const result=invoke();
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).selectedId,'OBL-1');
  assert.deepEqual(JSON.parse(result.stdout).taskletIds,['S01-F01-T01']);
  fs.writeFileSync(path.join(root,sprintPath),fs.readFileSync(path.join(root,sprintPath),'utf8').replaceAll('### [ ]','### [DONE]'));
  const finished=JSON.parse(invoke().stdout);
  assert.equal(finished.projection.complete,false);
  assert.equal(finished.selectedId,'OBL-1');
  assert.deepEqual(finished.taskletIds,[]);
});

const { renewObligationAssignment, writeHostObservation, publishObligationCheckpoint }=require('../src/campaign-orchestration');
// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-ASSIGNMENT
test('retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history',t=>{
  const {root,environment,document,proofPath}=fixture(t);
  const graph=campaignGraph(root,'pilot');
  const assignment=withLedgerLock(root,'pilot',environment,ledger=>{
    const assignment=reserveAssignment(ledger,'pilot',null,graph);
    assignment.worktree=root;assignment.sessionId='worker';assignment.branch='main';assignment.state='ACTIVE';
    return assignment;
  });
  const oldBinding=readLedger(root,'pilot',environment).obligationAssignments[0];
  const candidate=structuredClone(document);
  candidate.certificates.push({id:'CERT-1',obligationIds:['OBL-1'],inputs:['requirement.md',proofPath].map(relative=>({path:relative,digest:inputDigest(root,relative)})),artifacts:[proofPath],assessor:'coordinator',authority:['approved-CHNG'],adequate:true,reason:'Complete inspected inventory',disposition:null,evidence:[],inventoryIds:[]});
  candidate.checkpoints.push({...structuredClone(document.checkpoints[0]),id:'CP2',predecessorId:'CP1',kind:'productive',registeredIds:[],selectedIds:['OBL-1'],certificateIds:['CERT-1'],after:[0,1,1,1,1,1]});
  fs.writeFileSync(path.join(root,'candidate.json'),JSON.stringify(candidate));
  publishObligationCheckpoint(graph,root,'candidate.json',environment);
  git(root,['add','pm/plans/in_progress/pilot/obligations.json']);git(root,['commit','-m','Accept inspected responsibility']);
  writeHostObservation(root,'pilot',{schemaVersion:1,campaignId:'pilot',observedAt:new Date().toISOString(),completeSessionIds:['worker'],sessions:[{sessionId:'worker',state:'waiting',worktree:root,managedWorktree:true}]},environment);
  const renewed=withLedgerLock(root,'pilot',environment,ledger=>renewObligationAssignment(campaignGraph(root,'pilot'),ledger,assignment.id,environment));
  assert.equal(renewed.predecessorBindingId,oldBinding.id);
  assert.equal(renewed.predecessorId,'CP2');
  assert.deepEqual(renewed.obligationIds,['OBL-2']);
  assert.deepEqual(renewed.taskletIds,[]);
  const bindings=readLedger(root,'pilot',environment).obligationAssignments;
  assert.equal(bindings.length,2);
  assert.deepEqual(bindings[0],oldBinding);
  assert.throws(()=>withLedgerLock(root,'pilot',environment,ledger=>renewObligationAssignment(campaignGraph(root,'pilot'),ledger,assignment.id,environment)),/no renewal/);
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('no-edit assessment remains selectable while subordinate edit tasks are pending', t => {
  const { root, sprintPath, document } = fixture(t);
  document.obligations[0].execution.taskletIds = [];
  document.obligations[0].execution.plannedPaths = [];
  const graph = readTaskletGraph(path.join(root, sprintPath));
  const statuses = parseTaskletStatuses(path.join(root, sprintPath));
  const selection = selectObligationTasklets(graph, statuses, validateTaskletGraph(graph, statuses), null, document, root, 'pilot');
  assert.equal(selection.selectedId, 'OBL-1');
  assert.deepEqual(selection.taskletIds, []);
  assert.deepEqual(selection.plannedPaths, []);
});
