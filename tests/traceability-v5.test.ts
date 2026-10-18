// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {databaseOptions} from '../src/project-index-database.js';
import {execFileSync,spawnSync} from 'node:child_process';
import test, {type TestContext} from 'node:test';
import {loadTraceabilityV5,projectTraceabilityV5File,normalizeTraceabilityV5Payloads,evaluateTraceabilityV5Coverage} from '../skills/requirements-traceability/scripts/traceability-v5.js';
import {readTraceabilityConfigurationV5,type TraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';

const repositoryRoot = path.resolve(__dirname,'../..');
const checker = path.join(repositoryRoot,'skills/requirements-traceability/scripts/check-traceability.js');
function write(root: string, file: string, text: string): void {
 fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
 fs.writeFileSync(path.join(root,file),text);
}
function fixture(testContext: TestContext): string {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'traceability-v5-'));
 testContext.after(() => fs.rmSync(root,{recursive:true,force:true}));
 execFileSync('git',['init','-q'],{cwd:root});
 const traceabilityConfigurationV5: TraceabilityConfigurationV5 = {
  schemaVersion:5,projectRoot:'.',requirementsRoot:'pm/requirements',uatRoot:'pm/uat',
  sources:[{kind:'implementation',include:['src/**/*.js'],locator:'text'},{kind:'unit-test',include:['test/**/*.js'],locator:'text'}],
  exclusions:[],generatedArtifacts:[],reverseViewPath:'pm/requirements/reverse.md',typescript:null,
 };
 write(root,'traceability.json',JSON.stringify(traceabilityConfigurationV5));
 write(root,'ponytail-journal.json',JSON.stringify({projectId:'8c434abd-7e89-44c6-92b7-372c145a5acc',projectName:'V5 fixture'}));
 write(root,'pm/requirements/a.md','## REQ-A\n## OBL-A\nTraceability: decomposes REQ-A from obligation OBL-A\n');
 write(root,'pm/uat/a.md','## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A\n');
 write(root,'src/a.js','// Traceability: implements OBL-A from implementation work\nfunction work() {}\n');
 write(root,'test/a.js','// Traceability: verifies ACC-A from unit-test TEST-A\ntest("work", () => {});\n');
 execFileSync('git',['add','.'],{cwd:root});
 execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture'],{cwd:root});
 return root;
}
function check(root: string, args: readonly string[] = []) {
 return spawnSync(process.execPath,[checker,'--config',path.join(root,'traceability.json'),...args],{cwd:root,encoding:'utf8'});
}
function payload(root: string) {
 const configurationPath = path.join(root,'traceability.json');
 const document: unknown = JSON.parse(fs.readFileSync(configurationPath,'utf8'));
 const loadedTraceabilityV5 = loadTraceabilityV5(document,configurationPath,root);
 return normalizeTraceabilityV5Payloads(['pm/requirements/a.md','pm/uat/a.md','src/a.js','test/a.js'].map(file =>
  projectTraceabilityV5File(loadedTraceabilityV5,file,fs.readFileSync(path.join(root,file),'utf8'))));
}

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-V5-PUBLIC
test('public V5 checker and portable index preserve the complete graph and exclude the reverse view', testContext => {
 const root = fixture(testContext);
 const generated = check(root,['--write']);
 assert.equal(generated.status,0,generated.stderr);
 const checked = check(root);
 assert.equal(checked.status,0,checked.stderr);
 assert.match(checked.stdout,/4 relationships/);
 const projected = payload(root);
 assert.deepEqual(projected.entities.map(entity => entity.entityId).sort(),['ACC-A','OBL-A','REQ-A','TEST-A','work']);
 assert.deepEqual(evaluateTraceabilityV5Coverage(projected),[]);
 // This subprocess exercises the public JavaScript adapter with its generated portable dependencies.
 const result = spawnSync(process.execPath,['-e',`
 const index = require(process.argv[1]);
 const projection = index.collectTraceabilityProjection(process.argv[2]);
 const payload = projection.normalizePayloads(projection.files.map(file => file.parse()));
 process.stdout.write(JSON.stringify(payload));
 `,path.join(repositoryRoot,'src/project-index.js'),path.join(root,'traceability.json')],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const indexed: unknown = JSON.parse(result.stdout);
 assert.deepEqual(indexed,projected);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-V5-SECOND-ACCEPTANCE
test('an untested second acceptance is a checker failure and an indexed gap', testContext => {
 const root = fixture(testContext);
 fs.appendFileSync(path.join(root,'pm/uat/a.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 const checked = check(root,['--write']);
 assert.equal(checked.status,1);
 assert.match(checked.stderr,/missing-test.*ACC-B/);
 assert.deepEqual(evaluateTraceabilityV5Coverage(payload(root)).map(gap => [gap.sourceEntityId,gap.targetKind]),[['ACC-B','unit-test|integration-test']]);
 fs.appendFileSync(path.join(root,'pm/requirements/a.md'),'## REQ-OTHER\n');
 assert.equal(evaluateTraceabilityV5Coverage(payload(root)).length,2);
 assert.deepEqual(evaluateTraceabilityV5Coverage(payload(root),['REQ-A']).map(gap => [gap.sourceEntityId,gap.targetKind]),[['ACC-B','unit-test|integration-test']]);
 assert.throws(() => evaluateTraceabilityV5Coverage(payload(root),['REQ-UNKNOWN']),/declared requirement/);
 assert.throws(() => evaluateTraceabilityV5Coverage(payload(root),[]),/must not be empty/);
 fs.appendFileSync(path.join(root,'pm/uat/a.md'),'## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A\n');
 assert.throws(() => payload(root),/multiple declarations/i);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-V5-EXCLUDED-CONFIG
test('excluded configuration remains a freshness input without becoming an indexed code unit', testContext => {
 const root = fixture(testContext);
 const configurationPath = path.join(root,'traceability.json');
 const document: unknown = JSON.parse(fs.readFileSync(configurationPath,'utf8'));
 const configuration = readTraceabilityConfigurationV5(document);
 write(root,'traceability.json',JSON.stringify({...configuration,
  sources:[{kind:'implementation',include:['src/**/*.js','*.json'],locator:'text'},configuration.sources[1]],
  exclusions:[{pattern:'*.json',reason:'Configuration is not product code'}],
 }));
 assert.equal(check(root,['--write']).status,0);
 const result = spawnSync(process.execPath,['-e',`
 const index = require(process.argv[1]);
 const projection = index.collectTraceabilityProjection(process.argv[2]);
 const file = projection.files.find(file => file.path === 'traceability.json');
 process.stdout.write(JSON.stringify(file.parse()));
 `,path.join(repositoryRoot,'src/project-index.js'),configurationPath],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const indexed: unknown = JSON.parse(result.stdout);
 assert.deepEqual(indexed,{schemaVersion:1,entities:[],relationships:[]});
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-V5-OUTPUT-BOUNDARY
test('public V5 refuses authored or symlink output and a foreign invoking repository', testContext => {
 const root = fixture(testContext);
 const authored = '# Authored source\n\n```html\n<!-- Generated by requirements-traceability V5. Do not edit. -->\n```\n';
 write(root,'pm/requirements/reverse.md',authored);
 assert.match(check(root,['--write']).stderr,/Refusing to replace authored/);
 assert.equal(fs.readFileSync(path.join(root,'pm/requirements/reverse.md'),'utf8'),authored);
 fs.unlinkSync(path.join(root,'pm/requirements/reverse.md'));
 fs.symlinkSync('a.md',path.join(root,'pm/requirements/reverse.md'));
 assert.match(check(root,['--write']).stderr,/symbolic links/);
 const other = fixture(testContext);
 const foreign = spawnSync(process.execPath,[checker,'--config',path.join(root,'traceability.json')],{cwd:other,encoding:'utf8'});
 assert.equal(foreign.status,1);
 assert.match(foreign.stderr,/does not match/);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-V5-FRESHNESS
test('public index freshness rejects a new ignored acceptance and V5 rejects rounded versions', testContext => {
 const root = fixture(testContext);
 const result = spawnSync(process.execPath,['-e',`
 const fs = require('node:fs');
 const index = require(process.argv[1]);
 const projection = index.collectTraceabilityProjection(process.argv[2]);
 fs.writeFileSync('.gitignore','pm/uat/new.md\\n');
 fs.writeFileSync('pm/uat/new.md','## ACC-NEW\\nTraceability: verifies OBL-A from acceptance ACC-NEW\\n');
 projection.assertCurrent();
 `,path.join(repositoryRoot,'src/project-index.js'),path.join(root,'traceability.json')],{cwd:root,encoding:'utf8'});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/changed|stale/i);
 const configurationPath = path.join(root,'traceability.json');
 fs.writeFileSync(configurationPath,fs.readFileSync(configurationPath,'utf8').replace('"schemaVersion":5','"schemaVersion":5.0000000000000001'));
 assert.match(check(root).stderr,/Unsupported V5 configuration number/);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from integration-test TEST-CM-V5-PERSISTED-GRAPH
test('persisted V5 index follows requirement ancestry and reports acceptance gaps', async testContext => {
 const root = fixture(testContext);
 const projectId = randomUUID();
 const journal: unknown = JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(typeof journal === 'object' && journal !== null && 'database' in journal);
 write(root,'ponytail-journal.json',JSON.stringify({schemaVersion:1,projectId,projectName:`v5-${projectId}`,database:journal.database}));
 const pool = new Pool(databaseOptions(repositoryRoot));
 testContext.after(async () => {
  try {
   await pool.query('DELETE FROM ponytail_index.generation_v1 WHERE worktree_id IN (SELECT worktree_id FROM ponytail_index.worktree_v1 JOIN ponytail_index.repository_v1 USING(repository_id) WHERE project_id=$1::uuid)',[projectId]);
   await pool.query('DELETE FROM ponytail_index.worktree_v1 WHERE repository_id IN (SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id=$1::uuid)',[projectId]);
   await pool.query('DELETE FROM ponytail_index.parse_result_v1 WHERE project_id=$1::uuid',[projectId]);
   await pool.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id=$1::uuid',[projectId]);
   await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1::uuid',[projectId]);
  } finally { await pool.end(); }
 });
 fs.appendFileSync(path.join(root,'pm/uat/a.md'),'## ACC-B\nTraceability: verifies OBL-A from acceptance ACC-B\n');
 const result = spawnSync(process.execPath,['-e',`
 const index = require(process.argv[1]);
 const options = {configurationPath: process.argv[2]};
 (async () => {
  await index.indexTraceability(options);
  const search = await index.searchTraceability('TEST-A',{kind:null,role:null,requirement:'REQ-A',path:null},options);
  const validation = await index.validateTraceability({kind:'repository',input:null},options);
  process.stdout.write(JSON.stringify({search,validation}));
 })().catch(error => { console.error(error); process.exitCode = 1; });
 `,path.join(repositoryRoot,'src/project-index.js'),path.join(root,'traceability.json')],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const output: unknown = JSON.parse(result.stdout);
 assert.ok(typeof output === 'object' && output !== null && 'search' in output && 'validation' in output);
 const search = output.search;
 assert.ok(typeof search === 'object' && search !== null && 'results' in search && Array.isArray(search.results));
 assert.equal(search.results.length,1);
 const found: unknown = search.results[0];
 assert.ok(typeof found === 'object' && found !== null && 'entityId' in found && 'requirementId' in found);
 assert.equal(found.entityId,'TEST-A');
 assert.equal(found.requirementId,null,'acceptance ID must not be mislabeled as a requirement');
 const validation = output.validation;
 assert.ok(typeof validation === 'object' && validation !== null && 'gaps' in validation && Array.isArray(validation.gaps));
 assert.equal(validation.gaps.length,1);
 const gap: unknown = validation.gaps[0];
 assert.ok(typeof gap === 'object' && gap !== null && 'sourceEntityId' in gap);
 assert.equal(gap.sourceEntityId,'ACC-B');
});
