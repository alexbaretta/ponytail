// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import test,{type TestContext} from 'node:test';
import {discoverTraceabilityProject,type TraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';
import {checkTraceabilityProjectTypescript} from '../skills/requirements-traceability/scripts/traceability-semantic.js';
import type {TraceabilityGraphRequestV1,TraceabilityGraphResponseV1} from '../tsts/src/traceability-graph.js' with {'resolution-mode':'import'};

const repository = path.resolve(__dirname,'../..');
const cli = path.join(repository,'tsts/dist/src/cli.js');
function fixture(testContext: TestContext): string {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'traceability-semantic-'));
 testContext.after(() => fs.rmSync(root,{recursive:true,force:true}));
 execFileSync('git',['init','--quiet'],{cwd:root});
 fs.mkdirSync(path.join(root,'pm/requirements'),{recursive:true});
 fs.mkdirSync(path.join(root,'pm/uat'),{recursive:true});
 fs.writeFileSync(path.join(root,'pm/requirements/a.md'),'## REQ-A\n## OBL-A\nTraceability: decomposes REQ-A from obligation OBL-A');
 fs.writeFileSync(path.join(root,'pm/uat/a.md'),'## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A');
 fs.writeFileSync(path.join(root,'implementation.ts'),'// Traceability: implements OBL-A from implementation work\nexport function work() {}');
 fs.writeFileSync(path.join(root,'test.ts'),"import {test} from 'node:test';\n// Traceability: verifies ACC-A from unit-test TEST-A\ntest('work',()=>{});");
 fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{noEmit:true,strict:true,skipLibCheck:true,types:['node'],typeRoots:[path.join(repository,'node_modules/@types')]},files:['implementation.ts','test.ts']}));
 fs.writeFileSync(path.join(root,'tsts.js'),`import(${JSON.stringify(pathToFileURL(cli).href)}).then(async module => {process.exitCode = await module.runTstsCli(process.argv.slice(2));});\n`);
 return root;
}
function configuration(): TraceabilityConfigurationV5 {
 return {schemaVersion:5,projectRoot:'.',requirementsRoot:'pm/requirements',uatRoot:'pm/uat',
  sources:[{kind:'implementation',include:['implementation.ts'],locator:'typescript'},{kind:'unit-test',include:['test.ts'],locator:'typescript'}],
  exclusions:[],generatedArtifacts:[],reverseViewPath:'reverse.md',typescript:{cliPath:'tsts.js',projectPath:'tsconfig.json'}};
}

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-BRIDGE
test('canonical inventory reaches the real semantic CLI without repository writes', testContext => {
 const root = fixture(testContext);
 const config = configuration();
 const project = discoverTraceabilityProject(config,path.join(root,'config.json'),root);
 assert.deepEqual(project.graphFindings,[]);
 execFileSync('git',['add','.'],{cwd:root});
 const before = execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'});
 assert.deepEqual(checkTraceabilityProjectTypescript(config,project,root),[]);
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'}),before);
 fs.writeFileSync(path.join(root,'test.ts'),"function test(_name:string,_body:()=>void){}\n// Traceability: verifies ACC-A from unit-test TEST-A\ntest('work',()=>{});");
 const changedProject = discoverTraceabilityProject(config,path.join(root,'config.json'),root);
 assert.deepEqual(changedProject.graphFindings,[]);
 assert.ok(checkTraceabilityProjectTypescript(config,changedProject,root).some(finding => finding.message.includes('executable test call')));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-STDIN
test('stdin contract rejects malformed versions, unknown keys and escaping locators', testContext => {
 const root = fixture(testContext);
 const request: TraceabilityGraphRequestV1 = {schemaVersion:1,projectPath:'tsconfig.json',units:[{id:'work',kind:'implementation',path:'implementation.ts',line:1}]};
 const run = (input: string) => spawnSync(process.execPath,[cli,'--traceability-graph-stdin'],{cwd:root,input,encoding:'utf8'});
 assert.equal(run(JSON.stringify(request)).status,0);
 for (const malformed of [
  '{', JSON.stringify({...request,schemaVersion:2}), JSON.stringify({...request,projectRoot:'/outside'}),
  JSON.stringify({...request,projectPath:'../outside.json'}), JSON.stringify({...request,units:[{id:'work',kind:'implementation',path:'../outside.ts',line:1}]}),
  JSON.stringify({...request,units:[{id:'work',kind:'implementation',path:'implementation.ts',line:0}]}),
  JSON.stringify(request).replace('"line":1','"line":1.00000000000000001'),
  JSON.stringify(request).replace('"line":1','"line":9007199254740993'),
 ]) {
  const result = run(malformed);
  assert.equal(result.status,1);
  assert.match(result.stderr,/traceability-graph-input/);
 }
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-FAILURE
test('missing semantic executable and text-classified TypeScript remain failures', testContext => {
 const root = fixture(testContext);
 const config = configuration();
 const project = discoverTraceabilityProject(config,path.join(root,'config.json'),root);
 const missing: TraceabilityConfigurationV5 = {...config,typescript:{cliPath:'missing.js',projectPath:'tsconfig.json'}};
 assert.ok(checkTraceabilityProjectTypescript(missing,project,root).length > 0);
 const untyped: TraceabilityConfigurationV5 = {...config,sources:config.sources.map(source => ({...source,locator:'text'})),typescript:null};
 assert.equal(checkTraceabilityProjectTypescript(untyped,project,root).length,2);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-OLD-CLI
test('successful old or incompatible CLIs cannot silently skip graph validation', testContext => {
 const root = fixture(testContext);
 const config = configuration();
 const project = discoverTraceabilityProject(config,path.join(root,'config.json'),root);
 for (const output of ['', 'TSTS checked 2 files: no violations found.', '{"schemaVersion":2}', '{"schemaVersion":1}',
  '{"schemaVersion":1,"checkedUnitCount":2.00000000000000001,"checkedFileCount":2,"success":true,"report":"ok"}',
  '{"schemaVersion":1,"checkedUnitCount":9007199254740993,"checkedFileCount":2,"success":true,"report":"ok"}',
 ]) {
  fs.writeFileSync(path.join(root,'tsts.js'),`process.stdout.write(${JSON.stringify(output)});`);
  assert.ok(checkTraceabilityProjectTypescript(config,project,root).some(finding => finding.message.includes('valid V1 graph response')));
 }
 const response: TraceabilityGraphResponseV1 = {schemaVersion:1,checkedUnitCount:0,checkedFileCount:0,success:true,report:'No units checked'};
 fs.writeFileSync(path.join(root,'tsts.js'),`process.stdout.write(${JSON.stringify(JSON.stringify(response))});`);
 assert.ok(checkTraceabilityProjectTypescript(config,project,root).some(finding => finding.message.includes('does not cover')));
});
