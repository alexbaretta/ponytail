// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import test,{type TestContext} from 'node:test';
import {CampaignAssessmentReaders,computeCampaignCompleteness,type CampaignAssessmentV2} from '../src/traceability-completeness.js';
import type {TraceabilityGraph} from '../skills/requirements-traceability/scripts/traceability-graph.js';
import type {TraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';

const graph: TraceabilityGraph = {
 entities:[{id:'REQ-A',kind:'requirement',path:'pm/requirements/a.md',line:1},{id:'OBL-A',kind:'obligation',path:'pm/requirements/a.md',line:2},
  {id:'ACC-A',kind:'acceptance',path:'pm/uat/a.md',line:1},{id:'TEST-A',kind:'unit-test',path:'test.js',line:1},{id:'work',kind:'implementation',path:'work.js',line:1}],
 relationships:[{source:'OBL-A',target:'REQ-A',role:'decomposes'},{source:'ACC-A',target:'OBL-A',role:'verifies'},
  {source:'TEST-A',target:'ACC-A',role:'verifies'},{source:'work',target:'OBL-A',role:'implements'}],
};
function assessment(): CampaignAssessmentV2 {
 return {schemaVersion:2,campaign:'demo',requirementIds:['REQ-A'],complete:{O:['REQ-A'],A:['OBL-A'],T:['ACC-A'],I:['OBL-A']},
  reviewReferences:['worker/review-1'],validationTags:['ponytail/validation/demo/pass-1']};
}

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-COUNTS
test('completeness derives unresolved IDs and never grants structural or unknown adequacy credit', () => {
 const complete: CampaignAssessmentV2 = assessment();
 assert.deepEqual(computeCampaignCompleteness(graph,complete,'commit','tag').vector,[0,0,0,0,0]);
 const unknown: CampaignAssessmentV2 = {...complete,complete:{O:[],A:[],T:[],I:[]},reviewReferences:[],validationTags:[]};
 assert.deepEqual(computeCampaignCompleteness(graph,unknown,'commit',null).unresolved,{O:['REQ-A'],A:['OBL-A'],T:['ACC-A'],I:['OBL-A']});
 const missingCode: TraceabilityGraph = {entities:graph.entities.filter(entity => entity.kind !== 'implementation'),relationships:graph.relationships.filter(edge => edge.source !== 'work')};
 assert.deepEqual(computeCampaignCompleteness(missingCode,complete,'commit','tag').vector,[0,0,0,1,1]);
 const noAcceptanceReview: CampaignAssessmentV2 = {...complete,complete:{...complete.complete,A:[]}};
 assert.deepEqual(computeCampaignCompleteness(graph,noAcceptanceReview,'commit','tag').vector,[0,0,1,0,1]);
 const wrongKind: CampaignAssessmentV2 = {...complete,complete:{...complete.complete,O:['OBL-A']}};
 assert.throws(() => computeCampaignCompleteness(graph,wrongKind,'commit','tag'),/wrong kind/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-ASSESSMENT
test('assessment reader rejects invented schema, duplicate scope and unsupported credit', () => {
 const complete: CampaignAssessmentV2 = assessment();
 assert.deepEqual(CampaignAssessmentReaders.V2(complete),complete);
 for (const malformed of [{...complete,schemaVersion:3},{...complete,extra:true},{...complete,requirementIds:['REQ-A','REQ-A']},
  {...complete,reviewReferences:[]},{...complete,validationTags:[]},{...complete,requirementIds:[]}]) assert.throws(() => CampaignAssessmentReaders.V2(malformed));
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
test('CLI computes actual Git-bound scope without a database and reads immutable targets despite dirty files while rejecting lightweight assessments', context => {
 const root = fixture(context);
 const unknown = command(root,['--campaign','demo','--requirement','REQ-A','--json']);
 assert.equal(unknown.status,0,unknown.stderr);
 assert.deepEqual(JSON.parse(unknown.stdout).vector,[0,1,1,1,1]);
 assert.equal(unknown.stderr,'');
 const concise = command(root,['--campaign','demo','--requirement','REQ-A']);
 assert.equal(concise.stdout,'Campaign completeness vector (F,O,A,T,I): (0,1,1,1,1)\n');
 assert.match(concise.stderr,/^Preparation\s+\[[ ]+\]\s+0%/);
 assert.match(concise.stderr,/Sources\s+\[/);
 const missing = command(root,[]);
 assert.notEqual(missing.status,0);
 assert.match(missing.stderr,/No campaign assessment tag targets HEAD/);
 assert.match(missing.stderr,/^Preparation\s+\[[ ]+\]\s+0%/);

 const complete: CampaignAssessmentV2 = assessment();
 const tag = 'ponytail/completeness/demo/run-1';
 git(root,['tag','-a',tag,'-m',JSON.stringify(complete)]);
 const result = command(root,['--json']);
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).vector,[0,0,0,0,0]);
 assert.equal(JSON.parse(result.stdout).commit,git(root,['rev-parse','HEAD']));
 const legacy = {...complete,schemaVersion:1,complete:{R:complete.complete.O,A:complete.complete.A,T:complete.complete.T,I:complete.complete.I}};
 git(root,['tag','-a','legacy-assessment','-m',JSON.stringify(legacy)]);
 const legacyResult = command(root,['--assessment-tag','legacy-assessment','--json']);
 assert.equal(legacyResult.status,0,legacyResult.stderr);
 assert.deepEqual(JSON.parse(legacyResult.stdout).unresolved,JSON.parse(result.stdout).unresolved);
 const displayed = command(root,['--assessment-tag','legacy-assessment','--verbose']);
 assert.match(displayed.stdout,/vector \(F,O,A,T,I\)/);
 assert.match(displayed.stdout,/O unresolved: none/);
 assert.notEqual(command(root,['--campaign','other','--assessment-tag',tag]).status,0);
 fs.writeFileSync(path.join(root,'work.js'),'changed');
 const dirty = command(root,['--assessment-tag',tag,'--json']);
 assert.equal(dirty.status,0,dirty.stderr);assert.deepEqual(JSON.parse(dirty.stdout),JSON.parse(result.stdout));
 assert.equal(fs.readFileSync(path.join(root,'work.js'),'utf8'),'changed');
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','change']);
 const historical = command(root,['--assessment-tag',tag,'--json']);
 assert.equal(historical.status,0,historical.stderr);assert.deepEqual(JSON.parse(historical.stdout),JSON.parse(result.stdout));
 assert.notEqual(command(root,[]).status,0);
 git(root,['tag','light']);
 const light = command(root,['--assessment-tag','light']);
 assert.notEqual(light.status,0);assert.match(light.stderr,/annotated tag/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-EVIDENCE
test('CLI requires existing annotated ancestor validation references and unambiguous assessment selection', context => {
 const root = fixture(context);
 const complete: CampaignAssessmentV2 = {...assessment(),validationTags:['missing']};
 git(root,['tag','-a','ponytail/completeness/demo/bad','-m',JSON.stringify(complete)]);
 assert.notEqual(command(root,['--assessment-tag','ponytail/completeness/demo/bad']).status,0);
 git(root,['tag','-a','ponytail/completeness/demo/another','-m',JSON.stringify(assessment())]);
 const ambiguous = command(root,[]);
 assert.notEqual(ambiguous.status,0);assert.match(ambiguous.stderr,/exactly one/);
 assert.match(ambiguous.stderr,/found 2:.*another.*bad/);
 assert.match(ambiguous.stderr,/reconcile the review claims/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-COMMIT-INPUTS
test('commit assessment ignores uncommitted inputs and preserves index-hidden edits', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'.gitignore'),'pm/uat/ignored.md\nbuild.log\n');
 git(root,['add','.gitignore']);git(root,['commit','--quiet','-m','ignore generated output']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 fs.writeFileSync(path.join(root,'build.log'),'ordinary ignored output');
 assert.equal(command(root,[]).status,0);
 fs.writeFileSync(path.join(root,'pm/uat/ignored.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 const ignored = command(root,[]);
 assert.equal(ignored.status,0,ignored.stderr);
 fs.unlinkSync(path.join(root,'pm/uat/ignored.md'));
 git(root,['update-index','--assume-unchanged','work.js']);
 fs.appendFileSync(path.join(root,'work.js'),'// hidden modification\n');
 const hidden = command(root,[]);
 assert.equal(hidden.status,0,hidden.stderr);
 assert.match(fs.readFileSync(path.join(root,'work.js'),'utf8'),/hidden modification/);
 assert.match(git(root,['ls-files','-v','work.js']),/^h /);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-HIDDEN-DELETION
test('a skip-worktree deletion cannot silently remove an unresolved acceptance', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'pm/uat/uncovered.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 git(root,['add','pm/uat/uncovered.md']);git(root,['commit','--quiet','-m','uncovered acceptance']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 const before = command(root,['--json']);
 assert.equal(before.status,0,before.stderr);assert.deepEqual(JSON.parse(before.stdout).vector,[0,0,0,1,1]);
 git(root,['update-index','--skip-worktree','pm/uat/uncovered.md']);
 fs.unlinkSync(path.join(root,'pm/uat/uncovered.md'));
 const after = command(root,['--json']);
 assert.equal(after.status,0,after.stderr);assert.deepEqual(JSON.parse(after.stdout),JSON.parse(before.stdout));
 assert.equal(fs.existsSync(path.join(root,'pm/uat/uncovered.md')),false);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-LARGE-INPUTS
test('commit binding accepts source bytes exceeding the former 64 MiB batch limit', context => {
 const root = fixture(context);
 fs.appendFileSync(path.join(root,'work.js'),'//' + '€'.repeat(22*1024*1024) + '\n');
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','large source']);
 const result = command(root,['--campaign','demo','--requirement','REQ-A','--json']);
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).vector,[0,1,1,1,1]);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-MIGRATION
test('legacy marker diagnostics retain progress while broken declared ownership rejects it', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'work.js'),'// Traceability: implements REQ-A\nfunction work() {}\n');
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','legacy source marker']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 const result = command(root,['--json']);
 assert.equal(result.status,0,result.stderr);
 const report: unknown = JSON.parse(result.stdout);
 assert.ok(typeof report === 'object' && report !== null && 'vector' in report && 'completionBlocked' in report && 'findings' in report);
 assert.deepEqual(report.vector,[2,0,0,1,1]);
 assert.equal(report.completionBlocked,true);
 assert.ok(Array.isArray(report.findings));assert.equal(report.findings.length,2);
 const text = command(root,['--verbose']);
 assert.match(text.stdout,/Annotation findings blocking completion: 2/);
 assert.match(text.stdout,/work.js:1 malformed-marker/);
 fs.appendFileSync(path.join(root,'pm/requirements/a.md'),'Traceability: decomposes broken\n');
 git(root,['add','.']);git(root,['commit','--quiet','-m','malformed canonical marker']);
 const legacy = command(root,['--campaign','demo','--requirement','REQ-A','--verbose']);
 assert.equal(legacy.status,0,legacy.stderr);
 assert.match(legacy.stdout,/pm\/requirements\/a.md:4 malformed-marker/);
 fs.appendFileSync(path.join(root,'pm/uat/a.md'),'## ACC-B\nTraceability: verifies broken\n');
 git(root,['add','.']);git(root,['commit','--quiet','-m','broken acceptance ownership']);
 const invalid = command(root,['--campaign','demo','--requirement','REQ-A']);
 assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/ACC-B has no valid outgoing/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-DIAGNOSTIC-GATE
test('findings lead the vector even when all coverage coordinates are zero', context => {
 const root = fixture(context);
 fs.appendFileSync(path.join(root,'work.js'),'// Traceability: implements REQ-A\n');
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','mixed markers']);
 git(root,['tag','-a','ponytail/completeness/demo/current','-m',JSON.stringify(assessment())]);
 const result = command(root,['--json']);
 assert.equal(result.status,0,result.stderr);
 const report: unknown = JSON.parse(result.stdout);
 assert.ok(typeof report === 'object' && report !== null && 'vector' in report && 'completionBlocked' in report);
 assert.deepEqual(report.vector,[1,0,0,0,0]);
 assert.equal(report.completionBlocked,true);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-IMMUTABLE
test('assessment uses committed configuration and deleted sources without touching drafts or the index', context => {
 const root = fixture(context);
 fs.writeFileSync(path.join(root,'pm/requirements/diagram.png'),Buffer.from([137,80,78,71,255]));
 git(root,['add','pm/requirements/diagram.png']);git(root,['commit','--quiet','-m','reference diagram']);
 const tag = 'ponytail/completeness/demo/immutable';
 git(root,['tag','-a',tag,'-m',JSON.stringify(assessment())]);
 const before = command(root,['--assessment-tag',tag,'--json']);
 assert.equal(before.status,0,before.stderr);
 fs.writeFileSync(path.join(root,'.agents/config/project/traceability.json'),'human draft, not JSON');
 fs.unlinkSync(path.join(root,'pm/requirements/a.md'));
 fs.writeFileSync(path.join(root,'pm/uat/new.md'),'uncommitted acceptance draft');
 git(root,['add','pm/uat/new.md']);
 const status = git(root,['status','--porcelain']);
 const index = fs.readFileSync(path.join(root,'.git/index'));
 const after = command(root,['--assessment-tag',tag,'--json']);
 assert.equal(after.status,0,after.stderr);
 assert.deepEqual(JSON.parse(after.stdout),JSON.parse(before.stdout));
 assert.equal(git(root,['status','--porcelain']),status);
 assert.deepEqual(fs.readFileSync(path.join(root,'.git/index')),index);
 assert.equal(fs.readFileSync(path.join(root,'.agents/config/project/traceability.json'),'utf8'),'human draft, not JSON');
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-COMMITTED-SYMLINK
test('assessment rejects a committed source symlink even when the working tree replaces it with valid content', context => {
 const root = fixture(context);
 const content = fs.readFileSync(path.join(root,'work.js'));
 fs.unlinkSync(path.join(root,'work.js'));
 fs.symlinkSync('test.js',path.join(root,'work.js'));
 git(root,['add','work.js']);git(root,['commit','--quiet','-m','symbolic source']);
 git(root,['tag','-a','ponytail/completeness/demo/link','-m',JSON.stringify(assessment())]);
 fs.unlinkSync(path.join(root,'work.js'));fs.writeFileSync(path.join(root,'work.js'),content);
 const result = command(root,[]);
 assert.notEqual(result.status,0);assert.match(result.stderr,/regular committed file/);
});

// Traceability: verifies ACC-CM-DESCENT from unit-test TEST-CM-COMPLETENESS-REPLACEMENT
test('replacing an assessment annotation revises the vector without duplicating tags or changing validation', context => {
 const root = fixture(context);
 const tag = 'ponytail/completeness/demo/review';
 const initial: CampaignAssessmentV2 = {...assessment(),complete:{O:[],A:[],T:[],I:[]},reviewReferences:[],validationTags:[]};
 git(root,['tag','-a',tag,'-m',JSON.stringify(initial)]);
 const target = git(root,['rev-parse',`${tag}^{commit}`]);
 const validation = git(root,['rev-parse','ponytail/validation/demo/pass-1']);
 const before = command(root,['--json']);
 assert.equal(before.status,0,before.stderr);
 assert.deepEqual(JSON.parse(before.stdout).vector,[0,1,1,1,1]);
 git(root,['tag','-f','-a',tag,'-m',JSON.stringify(assessment()),`${tag}^{commit}`]);
 const after = command(root,['--json']);
 assert.equal(after.status,0,after.stderr);
 assert.deepEqual(JSON.parse(after.stdout).vector,[0,0,0,0,0]);
 assert.equal(git(root,['tag','--points-at','HEAD','--list','ponytail/completeness/*']),tag);
 assert.equal(git(root,['rev-parse',`${tag}^{commit}`]),target);
 assert.equal(git(root,['rev-parse','ponytail/validation/demo/pass-1']),validation);
});
