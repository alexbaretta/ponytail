// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeTraceabilityPayloads,TraceabilityEntity} from '../src/traceability-projection.js';
import {indexProgress} from '../src/index-progress.js';

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('cross-file plan references publish one entity and every distinct relationship',()=>{
 const traceabilityEntity:TraceabilityEntity={entityId:'trace:plan:delivery',entityKind:'plan',path:'plan.md',line:1,unitName:'delivery',annotation:null,description:null};
 const relationship={sourceEntityId:traceabilityEntity.entityId,targetEntityId:'REQ-A',role:'plans-implementation'};
 const result=normalizeTraceabilityPayloads([
  {entities:[traceabilityEntity],relationships:[relationship]},
  {entities:[{...traceabilityEntity,path:'sprints/S01.md'}],relationships:[relationship,{...relationship,targetEntityId:'REQ-B'}]},
 ]);
 assert.deepEqual(result.entities,[traceabilityEntity]);
 assert.deepEqual(result.relationships,[relationship,{...relationship,targetEntityId:'REQ-B'}]);
});

// Traceability: verifies REQ-TRACEABILITY-INDEX
for(const isTTY of [true,false]) test(`file indexing progress renders an ASCII bar; TTY=${isTTY}`,()=>{
 let output='';let milliseconds=0;
 const progress=indexProgress({isTTY,write(text){output+=text;}},()=>milliseconds);
 progress.prepare('traceability');
 assert.match(output,/traceability +(?:\||\.\.\.) discovering sources/);
 assert.ok(!output.includes('['),'unknown discovery is a status message, not an empty progress bar');
 progress.update(0,2,'traceability');
 assert.match(output,/0% 0\/2 files \| elapsed 0s \| ETA unknown/);
 progress.update(1,2,'traceability');milliseconds=1000;
 progress.update(2,2,'traceability');progress.update(1,1,'plans');progress.stop();
 assert.match(output,/traceability +\[={40}\] 100% 2\/2 files \| elapsed 1s \| ETA 0s/);
 assert.match(output,/plans +\[={40}\] 100% 1\/1 files/);
 const bars=output.split(/[\r\n]/u).filter(line=>line.includes('['));
 assert.equal(new Set(bars.map(line=>line.indexOf('['))).size,1);
 if(!isTTY) assert.doesNotMatch(output,/[\x00-\x09\x0b-\x1f\x7f]/u);
 else {
  assert.ok(output.includes('\r'));
  const countedLines=bars.filter(line=>line.startsWith('traceability') && line.includes('%'));
  assert.equal(new Set(countedLines.map(line=>line.length)).size,1,'shorter ETA clears the previous TTY text');
 }
});

// Traceability: verifies REQ-TRACEABILITY-INDEX
for(const isTTY of [true,false]) test(`unknown discovery stays live without claiming percentage; TTY=${isTTY}`,()=>{
 let output='';let milliseconds=0;
 const progress=indexProgress({isTTY,write(text){output+=text;}},()=>milliseconds);
 try {
  progress.prepare('plans');milliseconds=isTTY?200:5000;progress.prepare('plans');
  assert.doesNotMatch(output,/%|\[/);
  if(isTTY) {assert.match(output,/\| discovering/);assert.match(output,/\/ discovering/);}
  else {assert.equal(output.split('discovering sources').length-1,2);assert.doesNotMatch(output,/[\x00-\x09\x0b-\x1f\x7f]/u);}
 } finally {progress.stop();}
});

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('file elapsed time includes nested certificate assessment work',()=>{
 let output='';let milliseconds=0;
 const progress=indexProgress({write(text){output+=text;}},()=>milliseconds);
 progress.update(0,150,'plans');milliseconds=1000;
 progress.update(0,58,'plans','certificate assessments');milliseconds=22000;
 progress.update(58,58,'plans','certificate assessments');progress.update(150,150,'plans');progress.stop();
 assert.match(output,/150\/150 files \| elapsed 22s/);
 assert.match(output,/58\/58 certificate assessments \| elapsed 21s/);
});
