// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import test,{type TestContext} from 'node:test';
import {CampaignAssessmentReaders,computeCampaignCompleteness,type CampaignAssessmentV1} from '../src/traceability-completeness.js';
import type {TraceabilityGraph} from '../skills/requirements-traceability/scripts/traceability-graph.js';
import type {TraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';

const graph: TraceabilityGraph = {
 entities:[{id:'REQ-A',kind:'requirement',path:'pm/requirements/a.md',line:1},{id:'OBL-A',kind:'obligation',path:'pm/requirements/a.md',line:2},
  {id:'ACC-A',kind:'acceptance',path:'pm/uat/a.md',line:1},{id:'TEST-A',kind:'unit-test',path:'test.js',line:1},{id:'work',kind:'implementation',path:'work.js',line:1}],
 relationships:[{source:'OBL-A',target:'REQ-A',role:'decomposes'},{source:'ACC-A',target:'OBL-A',role:'verifies'},
  {source:'TEST-A',target:'ACC-A',role:'verifies'},{source:'work',target:'OBL-A',role:'implements'}],
};
function assessment(): CampaignAssessmentV1 {
 return {schemaVersion:1,campaign:'demo',requirementIds:['REQ-A'],complete:{R:['REQ-A'],A:['OBL-A'],T:['ACC-A'],I:['OBL-A']},
  reviewReferences:['worker/review-1'],validationTags:['ponytail/validation/demo/pass-1']};
}

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-COUNTS
test('completeness derives unresolved IDs and never grants structural or unknown adequacy credit', () => {
 const complete: CampaignAssessmentV1 = assessment();
 assert.deepEqual(computeCampaignCompleteness(graph,complete,'commit','tag').vector,[0,0,0,0]);
 const unknown: CampaignAssessmentV1 = {...complete,complete:{R:[],A:[],T:[],I:[]},reviewReferences:[],validationTags:[]};
 assert.deepEqual(computeCampaignCompleteness(graph,unknown,'commit',null).unresolved,{R:['REQ-A'],A:['OBL-A'],T:['ACC-A'],I:['OBL-A']});
 const missingCode: TraceabilityGraph = {entities:graph.entities.filter(entity => entity.kind !== 'implementation'),relationships:graph.relationships.filter(edge => edge.source !== 'work')};
 assert.deepEqual(computeCampaignCompleteness(missingCode,complete,'commit','tag').vector,[0,0,1,1]);
 const noAcceptanceReview: CampaignAssessmentV1 = {...complete,complete:{...complete.complete,A:[]}};
 assert.deepEqual(computeCampaignCompleteness(graph,noAcceptanceReview,'commit','tag').vector,[0,1,0,1]);
 const wrongKind: CampaignAssessmentV1 = {...complete,complete:{...complete.complete,R:['OBL-A']}};
 assert.throws(() => computeCampaignCompleteness(graph,wrongKind,'commit','tag'),/wrong kind/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-ASSESSMENT
test('assessment reader rejects invented schema, duplicate scope and unsupported credit', () => {
 const complete: CampaignAssessmentV1 = assessment();
 assert.deepEqual(CampaignAssessmentReaders.V1(complete),complete);
 for (const malformed of [{...complete,schemaVersion:2},{...complete,extra:true},{...complete,requirementIds:['REQ-A','REQ-A']},
  {...complete,reviewReferences:[]},{...complete,validationTags:[]},{...complete,requirementIds:[]}]) assert.throws(() => CampaignAssessmentReaders.V1(malformed));
});

function fixture(context: TestContext): string {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'ponytail-completeness-'));
 context.after(() => fs.rmSync(root,{recursive:true,force:true}));
 git(root,['init','--quiet']);
 const write = (file: string, text: string): void => { fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true}); fs.writeFileSync(path.join(root,file),text); };
 write('pm/requirements/a.md','## REQ-A\n## OBL-A\nTraceability: decomposes REQ-A from obligation OBL-A\n');
 write('pm/uat/a.md','## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A\n');
 write('work.js','// Traceability: implements OBL-A from implementation work\nfunction work() {}\n');
 write('test.js',"// Traceability: verifies ACC-A from unit-test TEST-A\ntest('work',()=>{});\n");
 const configuration: TraceabilityConfigurationV5 = {schemaVersion:5,projectRoot:'../../..',requirementsRoot:'pm/requirements',uatRoot:'pm/uat',
  sources:[{kind:'implementation',include:['work.js'],locator:'text'},{kind:'unit-test',include:['test.js'],locator:'text'}],
  exclusions:[],generatedArtifacts:[],reverseViewPath:'reverse.md',typescript:null};
 write('.agents/config/project/traceability.json',JSON.stringify(configuration));
 git(root,['add','.']);git(root,['commit','--quiet','-m','fixture']);
 git(root,['tag','-a','ponytail/validation/demo/pass-1','-m','Focused test command passed; review worker/review-1']);
 return root;
}
function git(root: string, args: readonly string[]): string {
 return execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.test',...args],{cwd:root,encoding:'utf8'}).trim();
}
function command(root: string, args: readonly string[]) {
 return spawnSync(process.execPath,[path.resolve(__dirname,'../../src/project-index.js'),'traceability','completeness',...args],{cwd:root,encoding:'utf8',env:{...process.env,PGHOST:'unreachable.invalid'}});
}

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-CLI
test('CLI computes actual Git-bound scope without a database and rejects stale, dirty and lightweight assessments', context => {
 const root = fixture(context);
 const unknown = command(root,['--campaign','demo','--requirement','REQ-A','--json']);
 assert.equal(unknown.status,0,unknown.stderr);
 assert.deepEqual(JSON.parse(unknown.stdout).vector,[1,1,1,1]);
 const complete: CampaignAssessmentV1 = assessment();
 const tag = 'ponytail/completeness/demo/run-1';
 git(root,['tag','-a',tag,'-m',JSON.stringify(complete)]);
 const result = command(root,['--json']);
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).vector,[0,0,0,0]);
 assert.equal(JSON.parse(result.stdout).commit,git(root,['rev-parse','HEAD']));
 assert.notEqual(command(root,['--campaign','other','--assessment-tag',tag]).status,0);
 fs.writeFileSync(path.join(root,'work.js'),'changed');
 const dirty = command(root,['--assessment-tag',tag]);
 assert.notEqual(dirty.status,0);assert.match(dirty.stderr,/clean worktree/);
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','change']);
 const stale = command(root,['--assessment-tag',tag]);
 assert.notEqual(stale.status,0);assert.match(stale.stderr,/stale/);
 git(root,['tag','light']);
 const light = command(root,['--assessment-tag','light']);
 assert.notEqual(light.status,0);assert.match(light.stderr,/annotated tag/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-EVIDENCE
test('CLI requires existing annotated ancestor validation references and unambiguous assessment selection', context => {
 const root = fixture(context);
 const complete: CampaignAssessmentV1 = {...assessment(),validationTags:['missing']};
 git(root,['tag','-a','ponytail/completeness/demo/bad','-m',JSON.stringify(complete)]);
 assert.notEqual(command(root,['--assessment-tag','ponytail/completeness/demo/bad']).status,0);
 git(root,['tag','-a','ponytail/completeness/demo/another','-m',JSON.stringify(assessment())]);
 const ambiguous = command(root,[]);
 assert.notEqual(ambiguous.status,0);assert.match(ambiguous.stderr,/exactly one/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-COMMIT-INPUTS
test('commit binding rejects ignored canonical input and index-hidden edits but permits ignored build output', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'.gitignore'),'pm/uat/ignored.md\nbuild.log\n');
 git(root,['add','.gitignore']);git(root,['commit','--quiet','-m','ignore generated output']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 fs.writeFileSync(path.join(root,'build.log'),'ordinary ignored output');
 assert.equal(command(root,[]).status,0);
 fs.writeFileSync(path.join(root,'pm/uat/ignored.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 const ignored = command(root,[]);
 assert.notEqual(ignored.status,0);assert.match(ignored.stderr,/missing from assessed commit/);
 fs.unlinkSync(path.join(root,'pm/uat/ignored.md'));
 git(root,['update-index','--assume-unchanged','work.js']);
 fs.appendFileSync(path.join(root,'work.js'),'// hidden modification\n');
 const hidden = command(root,[]);
 assert.notEqual(hidden.status,0);assert.match(hidden.stderr,/hidden inputs/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-HIDDEN-DELETION
test('a skip-worktree deletion cannot silently remove an unresolved acceptance', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'pm/uat/uncovered.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 git(root,['add','pm/uat/uncovered.md']);git(root,['commit','--quiet','-m','uncovered acceptance']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 const before = command(root,['--json']);
 assert.equal(before.status,0,before.stderr);assert.deepEqual(JSON.parse(before.stdout).vector,[0,0,1,1]);
 git(root,['update-index','--skip-worktree','pm/uat/uncovered.md']);
 fs.unlinkSync(path.join(root,'pm/uat/uncovered.md'));
 const after = command(root,[]);
 assert.notEqual(after.status,0);assert.match(after.stderr,/hidden inputs/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-LARGE-INPUTS
test('commit binding accepts source bytes exceeding the former 64 MiB batch limit', context => {
 const root = fixture(context);
 fs.appendFileSync(path.join(root,'work.js'),'//' + '€'.repeat(22*1024*1024) + '\n');
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','large source']);
 const result = command(root,['--campaign','demo','--requirement','REQ-A','--json']);
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).vector,[1,1,1,1]);
});
