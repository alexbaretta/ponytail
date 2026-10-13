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
 progress.update(1,2,'traceability');milliseconds=1000;
 progress.update(2,2,'traceability');progress.update(1,1,'plans');progress.stop();
 assert.match(output,/traceability \[={40}\] 100% 2\/2 files \| ETA 0s/);
 assert.match(output,/plans \[={40}\] 100% 1\/1 files/);
 if(!isTTY) assert.doesNotMatch(output,/[\x00-\x09\x0b-\x1f\x7f]/u);
 else assert.ok(output.includes('\r'));
});
