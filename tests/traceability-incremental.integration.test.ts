// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import test from 'node:test';
import {Pool} from 'pg';
import type {CampaignManagementConfigV1} from '../src/campaign-configuration.js';
import {databaseOptions} from '../src/project-index-database.js';

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('incremental CLI retains unchanged database rows, reconciles deletions, rolls back failure and supports full rebuild',async t=>{
 const repositoryRoot=path.resolve(__dirname,'../..');
 const pool=new Pool(databaseOptions(repositoryRoot));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'traceability-incremental-'));
 const projectId=crypto.randomUUID();
 const traceabilityMarker='Trace'+'ability';
 t.after(async()=>{try {
  await pool.query('DELETE FROM ponytail_index.generation_v1 WHERE worktree_id IN (SELECT worktree_id FROM ponytail_index.worktree_v1 JOIN ponytail_index.repository_v1 USING(repository_id) WHERE project_id=$1::uuid)',[projectId]);
  await pool.query('DELETE FROM ponytail_index.worktree_v1 WHERE repository_id IN (SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id=$1::uuid)',[projectId]);
  await pool.query('DELETE FROM ponytail_index.parse_result_v1 WHERE project_id=$1::uuid',[projectId]);
  await pool.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id=$1::uuid',[projectId]);
  await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1::uuid',[projectId]);
 } finally {await pool.end();fs.rmSync(root,{recursive:true,force:true});}});
 const git=(args:readonly string[]):string=>execFileSync('git',[...args],{cwd:root,encoding:'utf8'});
 git(['init','-q']);
 fs.mkdirSync(path.join(root,'.agents/config/project'),{recursive:true});fs.mkdirSync(path.join(root,'src'));fs.mkdirSync(path.join(root,'pm/plans'),{recursive:true});
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'ponytail-journal.json'),'utf8'));
 assert.ok(typeof journal==='object' && journal!==null && 'database' in journal);
 fs.writeFileSync(path.join(root,'ponytail-journal.json'),JSON.stringify({schemaVersion:1,projectId,projectName:`incremental-${projectId}`,database:journal.database}));
 fs.writeFileSync(path.join(root,'requirement.md'),'# Requirement\n\n**Identifier:** `REQ-VALUE`\n');
 for(const name of ['first','second']) fs.writeFileSync(path.join(root,`src/${name}.js`),'// '+ traceabilityMarker + ': implements REQ-VALUE\nconst value=1;\n');
 const configuration={schemaVersion:2,projectRoot:'../../..',requirements:[{id:'REQ-VALUE',sourcePath:'requirement.md'}],artifacts:[{class:'implementation',path:'src/first.js',locator:'text'},{class:'implementation',path:'src/second.js',locator:'text'}],generatedArtifacts:[],reverseViewPath:'reverse.md',index:{searchableFields:['entityId','entityKind','path','role','requirementId']}};
 const configurationPath=path.join(root,'.agents/config/project/traceability.json');
 fs.writeFileSync(configurationPath,JSON.stringify(configuration));
 const campaignManagementConfigV1:CampaignManagementConfigV1={schemaVersion:1,managementRoot:'pm',planRoot:'pm/plans',lifecycle:{directories:['open','in_progress','closed','deferred','rejected'],roles:{initial:'open',activeWork:'in_progress',successfulCompletion:'closed',deferred:'deferred',rejected:'rejected'}},legacyPlanLayout:'flat'};
 fs.writeFileSync(path.join(root,'.agents/config/project/management.json'),JSON.stringify(campaignManagementConfigV1));
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture']);
 const update=(args:readonly string[]=[]):void=>{const result=spawnSync(process.execPath,[path.join(repositoryRoot,'src/project-index.js'),'traceability','update-index','--json',...args],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);const value:unknown=JSON.parse(result.stdout);assert.ok(typeof value==='object' && value!==null);};
 const rows=async():Promise<readonly {path:string;generation_id:string;tuple:string}[]> => (await pool.query<{path:string;generation_id:string;tuple:string}>(`SELECT entity.path,entity.generation_id,entity.xmin::text || ':' || entity.ctid::text AS tuple FROM ponytail_index.entity_v1 entity JOIN ponytail_index.generation_v1 generation USING(generation_id) JOIN ponytail_index.worktree_v1 worktree USING(worktree_id) JOIN ponytail_index.repository_v1 repository USING(repository_id) WHERE repository.project_id=$1::uuid AND generation.corpus='traceability' ORDER BY entity.path`,[projectId])).rows;
 const storage=async():Promise<readonly {kind:string;id:string;tuple:string}[]> => (await pool.query<{kind:string;id:string;tuple:string}>(`WITH ids AS (SELECT generation_id FROM ponytail_index.generation_v1 JOIN ponytail_index.worktree_v1 USING(worktree_id) JOIN ponytail_index.repository_v1 USING(repository_id) WHERE project_id=$1::uuid)
 SELECT 'file' AS kind,path AS id,xmin::text || ':' || ctid::text AS tuple FROM ponytail_index.file_v1 WHERE generation_id IN (SELECT generation_id FROM ids)
 UNION ALL SELECT 'entity',entity_id,xmin::text || ':' || ctid::text FROM ponytail_index.entity_v1 WHERE generation_id IN (SELECT generation_id FROM ids)
 UNION ALL SELECT 'relationship',source_entity_id || target_entity_id || role,xmin::text || ':' || ctid::text FROM ponytail_index.relationship_v1 WHERE generation_id IN (SELECT generation_id FROM ids)
 UNION ALL SELECT 'search',entity_id,xmin::text || ':' || ctid::text FROM ponytail_index.search_document_v2 WHERE generation_id IN (SELECT generation_id FROM ids) ORDER BY kind,id`,[projectId])).rows;
 const validate=()=>spawnSync(process.execPath,[path.join(repositoryRoot,'src/project-index.js'),'traceability','validate','--json'],{cwd:root,encoding:'utf8'});
 const textRows=async():Promise<readonly {document_id:string;tuple:string}[]> => (await pool.query<{document_id:string;tuple:string}>(`SELECT DISTINCT document.document_id,document.xmin::text || ':' || document.ctid::text AS tuple FROM ponytail_index.text_document_v1 document JOIN ponytail_index.search_document_v2 search USING(document_id) JOIN ponytail_index.generation_v1 generation USING(generation_id) JOIN ponytail_index.worktree_v1 worktree USING(worktree_id) JOIN ponytail_index.repository_v1 repository USING(repository_id) WHERE repository.project_id=$1::uuid ORDER BY document.document_id`,[projectId])).rows;
 update();
 const incomplete=validate();assert.equal(incomplete.status,1,incomplete.stderr);
 const validationResult:unknown=JSON.parse(incomplete.stdout);
 assert.ok(typeof validationResult==='object' && validationResult!==null && 'rules' in validationResult && 'gaps' in validationResult);
 assert.equal(validationResult.rules,4);assert.ok(Array.isArray(validationResult.gaps));
 assert.equal(validationResult.gaps.length,3);
 assert.deepEqual(validationResult.gaps.map((gap:unknown)=>{assert.ok(typeof gap==='object' && gap!==null && 'targetKind' in gap);return gap.targetKind;}).sort(),['integration-test','uat','unit-test']);
 const initial=await rows();assert.ok(initial.length>=3);
 const initialStorage=await storage();
 update();assert.deepEqual(await rows(),initial,'no-op preserves physical row identity');assert.deepEqual(await storage(),initialStorage);
 fs.writeFileSync(path.join(root,'unrelated.txt'),'unchanged indexed inputs');git(['add','unrelated.txt']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','unrelated']);update();assert.deepEqual(await storage(),initialStorage,'HEAD-only updates preserve every graph and file row');
 fs.appendFileSync(path.join(root,'src/first.js'),'const extra=2;\n');update();assert.deepEqual(await rows(),initial,'annotation-neutral edit retains entities and search data');
 fs.writeFileSync(path.join(root,'src/first.js'),'const value=1;\n');update();const removed=await rows();assert.ok(!removed.some(row=>row.path==='src/first.js'));assert.deepEqual(removed.find(row=>row.path==='src/second.js'),initial.find(row=>row.path==='src/second.js'));
 fs.writeFileSync(path.join(root,'src/first.js'),'// '+traceabilityMarker + ': implements REQ-VALUE\nconst value=1;\n');update();assert.ok((await rows()).some(row=>row.path==='src/first.js'));
 const beforeFailure=await rows();fs.writeFileSync(path.join(root,'src/first.js'),'// '+traceabilityMarker + ': implements REQ-UNKNOWN\n');
 const failure=spawnSync(process.execPath,[path.join(repositoryRoot,'src/project-index.js'),'traceability','update-index','--json'],{cwd:root,encoding:'utf8'});assert.equal(failure.status,2);assert.deepEqual(await rows(),beforeFailure,'failed parse rolls back incremental generation');
 fs.writeFileSync(path.join(root,'src/first.js'),'// '+traceabilityMarker + ': implements REQ-VALUE\n');update();
 const beforeRebuild=await rows();const textBeforeRebuild=await textRows();update(['--rebuild']);assert.notEqual((await rows())[0]?.generation_id,beforeRebuild[0]?.generation_id);
 assert.deepEqual(await textRows(),textBeforeRebuild,'a new generation must reuse immutable shared text without physical updates');
 configuration.artifacts=configuration.artifacts.filter(artifact=>artifact.path!=='src/first.js');fs.writeFileSync(configurationPath,JSON.stringify(configuration));fs.unlinkSync(path.join(root,'src/first.js'));update();assert.ok(!(await rows()).some(row=>row.path==='src/first.js'));
 for(const artifactClass of ['unit-test','integration-test','uat']) {
  const artifactPath=`src/${artifactClass}.txt`;fs.writeFileSync(path.join(root,artifactPath),'// '+traceabilityMarker+': verifies REQ-VALUE\n');configuration.artifacts.push({class:artifactClass,path:artifactPath,locator:'text'});
 }
 fs.writeFileSync(configurationPath,JSON.stringify(configuration));update();
 const complete=validate();assert.equal(complete.status,0,complete.stderr);assert.match(complete.stdout,/"rules":4/);
});
