// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test, {type TestContext} from 'node:test';
import {readTraceabilityConfigurationV5,discoverTraceabilityProject,type TraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';

function configuration(): TraceabilityConfigurationV5 {
 return {schemaVersion:5,projectRoot:'.',requirementsRoot:'pm/requirements',uatRoot:'pm/uat',
  sources:[{kind:'implementation',include:['src/**/*.js'],locator:'text'},{kind:'unit-test',include:['test/**/*.js'],locator:'text'}],
  exclusions:[],generatedArtifacts:[],reverseViewPath:'pm/traceability.md',typescript:null};
}
function write(root: string, file: string, text: string): void {
 fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
 fs.writeFileSync(path.join(root,file),text);
}
function project(testContext: TestContext): string {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'traceability-project-'));
 testContext.after(() => fs.rmSync(root,{recursive:true,force:true}));
 execFileSync('git',['init','--quiet'],{cwd:root});
 write(root,'pm/requirements/a.md','## REQ-A\n## OBL-A\nTraceability: decomposes REQ-A from obligation OBL-A');
 write(root,'pm/uat/a.md','## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A');
 write(root,'src/a.js','// Traceability: implements OBL-A from implementation doWork\nfunction doWork() {}');
 write(root,'test/a.js','// Traceability: verifies ACC-A from unit-test TEST-A\ntest("work", () => {});');
 return root;
}

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-UNCLAIMED
test('unclaimed supporting sources remain inventoried without satisfying implementation coverage', context => {
 const root = project(context);
 write(root,'src/a.js','export const enabled = true;');
 const result = discoverTraceabilityProject(configuration(),path.join(root,'traceability.json'),root);
 assert.ok(result.sources.some(source => source.path === 'src/a.js'));
 assert.deepEqual(result.discoveryFindings,[]);
 assert.ok(!result.graph.entities.some(entity => entity.kind === 'implementation'));
 assert.ok(result.graphFindings.some(finding => finding.code === 'missing-implementation' && finding.id === 'OBL-A'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-CONFIGURATION
test('V5 reader checks exact physical configuration without legacy fallback', () => {
 const traceabilityConfigurationV5 = configuration();
 assert.deepEqual(readTraceabilityConfigurationV5(traceabilityConfigurationV5),traceabilityConfigurationV5);
 for (const malformed of [
  {...traceabilityConfigurationV5,schemaVersion:4},
  {...traceabilityConfigurationV5,requirements:[]},
  {...traceabilityConfigurationV5,requirementsRoot:'../other'},
  {...traceabilityConfigurationV5,uatRoot:'pm/requirements/uat'},
  {...traceabilityConfigurationV5,exclusions:[{pattern:'src/**',reason:''}]},
  {...traceabilityConfigurationV5,sources:[{kind:'implementation',include:['src/**'],locator:'typescript'}]},
  {...traceabilityConfigurationV5,generatedArtifacts:[{path:'pm/uat/a.md',sourcePath:'src/a.js'}]},
  {...traceabilityConfigurationV5,generatedArtifacts:[{path:'dist/a.js',sourcePath:'dist/b.js'},{path:'dist/b.js',sourcePath:'src/a.js'}]},
 ]) assert.throws(() => readTraceabilityConfigurationV5(malformed));
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-PROJECT-NEW-ACCEPTANCE
test('project inventory finds new unreferenced acceptances without mutating Git', testContext => {
 const root = project(testContext);
 const traceabilityConfigurationV5 = configuration();
 const first = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'traceability.json'),root);
 assert.deepEqual(first.projectFindings,[]);
 assert.deepEqual(first.discoveryFindings,[]);
 assert.deepEqual(first.graphFindings,[]);
 write(root,'pm/uat/new.md','## ACC-NEW\nTraceability: verifies OBL-A from acceptance ACC-NEW');
 write(root,'.gitignore','pm/uat/new.md\n');
 const before = execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'});
 const second = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'traceability.json'),root);
 assert.ok(second.graphFindings.some(finding => finding.code === 'missing-test' && finding.id === 'ACC-NEW'));
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),before);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-CLASSIFICATION
test('ambiguous code classification fails and exclusions cannot hide PM declarations', testContext => {
 const root = project(testContext);
 const traceabilityConfigurationV5: TraceabilityConfigurationV5 = {...configuration(),sources:[...configuration().sources,{kind:'integration-test',include:['src/**'],locator:'text'}],exclusions:[{pattern:'pm/**',reason:'Cannot exclude canonical PM'}]};
 const result = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root);
 assert.ok(result.projectFindings.some(finding => finding.code === 'ambiguous-source'));
 assert.ok(result.graph.entities.some(entity => entity.id === 'ACC-A'));
 assert.ok(result.graphFindings.some(finding => finding.code === 'missing-implementation'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-MIGRATION-EXCLUSION
test('excluded migration output preserves bytes and grants no coverage while authored sources stay strict', testContext => {
 const root = project(testContext);
 const migrationPath = 'migrations/released/migration.sql';
 const migrationText = '-- Traceability: OLD-A, OLD-B\n-- Traceability: implements OBL-A from implementation migration\nCREATE TABLE example (id INTEGER);\n';
 write(root,migrationPath,migrationText);
 write(root,'src/a.js','export const enabled = true;');
 const traceabilityConfigurationV5: TraceabilityConfigurationV5 = {...configuration(),
  sources:[...configuration().sources,{kind:'implementation',include:['migrations/**/*.sql'],locator:'text'}],
  exclusions:[{pattern:'migrations/**/*.sql',reason:'Generated migration artifacts; authored schema and supplemental inputs own traceability; migration QA remains mandatory'}]};
 const result = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root);
 assert.deepEqual(result.discoveryFindings,[]);
 assert.deepEqual(result.projectFindings,[]);
 assert.ok(!result.sources.some(source => source.path === migrationPath));
 assert.ok(!result.graph.entities.some(entity => entity.kind === 'implementation'));
 assert.ok(result.graphFindings.some(finding => finding.code === 'missing-implementation' && finding.id === 'OBL-A'));
 assert.equal(fs.readFileSync(path.join(root,migrationPath),'utf8'),migrationText);
 write(root,'src/a.js','// Traceability: OLD-A');
 const malformed = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root);
 assert.ok(malformed.discoveryFindings.some(finding => finding.path === 'src/a.js' && finding.code === 'malformed-marker'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-GENERATED
test('generated mapping uses discovered source and rejects duplicate output annotations', testContext => {
 const root = project(testContext);
 write(root,'src/generated.js','export const generated = 1;');
 const traceabilityConfigurationV5: TraceabilityConfigurationV5 = {...configuration(),generatedArtifacts:[{path:'src/generated.js',sourcePath:'src/a.js'}]};
 const result = discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root);
 assert.deepEqual(result.projectFindings,[]);
 assert.deepEqual(result.discoveryFindings,[]);
 write(root,'src/generated.js','// Traceability: implements OBL-A from implementation doWork');
 assert.ok(discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root).projectFindings.some(finding => finding.code === 'generated-marker'));
 fs.unlinkSync(path.join(root,'src/a.js'));
 assert.ok(discoverTraceabilityProject(traceabilityConfigurationV5,path.join(root,'config.json'),root).projectFindings.some(finding => finding.code === 'unclassified-generated-source'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-IGNORED
test('ignored output is excluded but tracked source remains visible even when ignored', testContext => {
 const root = project(testContext);
 execFileSync('git',['add','.'],{cwd:root});
 write(root,'.gitignore','src/\n');
 write(root,'src/ignored.js','no annotation');
 const result = discoverTraceabilityProject(configuration(),path.join(root,'config.json'),root);
 assert.deepEqual(result.discoveryFindings,[]);
 assert.ok(result.sources.some(source => source.path === 'src/a.js'));
 assert.ok(!result.sources.some(source => source.path === 'src/ignored.js'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-PROJECT-BOUNDARY
test('inventory rejects a different invoking root and selected symbolic links', testContext => {
 const root = project(testContext);
 const otherRoot = project(testContext);
 assert.throws(() => discoverTraceabilityProject(configuration(),path.join(otherRoot,'config.json'),root),/does not match/);
 fs.symlinkSync(path.join(otherRoot,'src/a.js'),path.join(root,'src/link.js'));
 assert.throws(() => discoverTraceabilityProject(configuration(),path.join(root,'config.json'),root),/symbolic link/);
 fs.unlinkSync(path.join(root,'src/link.js'));
 fs.symlinkSync('missing.js',path.join(root,'src/link.js'));
 assert.throws(() => discoverTraceabilityProject(configuration(),path.join(root,'config.json'),root),/symbolic link/);
 fs.unlinkSync(path.join(root,'src/link.js'));
 fs.symlinkSync(path.join(otherRoot,'pm/uat'),path.join(root,'pm/uat/imported'));
 assert.throws(() => discoverTraceabilityProject(configuration(),path.join(root,'config.json'),root),/symbolic link/);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-PROJECT-EMPTY
test('empty and misplaced PM declarations cannot establish project completeness', testContext => {
 const root = project(testContext);
 write(root,'pm/uat/a.md','## REQ-MISPLACED');
 const result = discoverTraceabilityProject(configuration(),path.join(root,'config.json'),root);
 assert.ok(result.projectFindings.some(finding => finding.code === 'empty-scope'));
 assert.ok(result.projectFindings.some(finding => finding.code === 'misplaced-declaration'));
});
