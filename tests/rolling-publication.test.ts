// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {selectRollingPublicationBatch,type RollingAcceptedIncrement} from '../src/rolling-publication.js';

const firstRollingAcceptedIncrement:RollingAcceptedIncrement = {id:'00000000-0000-0000-0000-000000000001',revision:'a'.repeat(40)};
const secondRollingAcceptedIncrement:RollingAcceptedIncrement = {id:'00000000-0000-0000-0000-000000000002',revision:'b'.repeat(40)};
const thirdRollingAcceptedIncrement:RollingAcceptedIncrement = {id:'00000000-0000-0000-0000-000000000003',revision:'c'.repeat(40)};

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('publication freezes exactly M distinct accepted increments without counting repeated acknowledgements',()=> {
 assert.deepEqual(selectRollingPublicationBatch([firstRollingAcceptedIncrement,firstRollingAcceptedIncrement],2),
  {state:'WAITING',reason:'below_threshold',count:1});
 const rollingPublicationSelection = selectRollingPublicationBatch([firstRollingAcceptedIncrement,firstRollingAcceptedIncrement,
  secondRollingAcceptedIncrement,thirdRollingAcceptedIncrement],2);
 assert.deepEqual(rollingPublicationSelection,{state:'FROZEN',trigger:'threshold',increments:[firstRollingAcceptedIncrement,secondRollingAcceptedIncrement],
  campaignRevision:secondRollingAcceptedIncrement.revision});
 assert.throws(()=>selectRollingPublicationBatch([firstRollingAcceptedIncrement,{...firstRollingAcceptedIncrement,revision:'d'.repeat(40)}],2),/immutable/);
 assert.throws(()=>selectRollingPublicationBatch([firstRollingAcceptedIncrement],0),/positive safe integer/);
 assert.throws(()=>selectRollingPublicationBatch([{...firstRollingAcceptedIncrement,revision:'unknown'}],1),/invalid accepted increment/);
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch',()=> {
 for (const trigger of ['explicit_flush','completion','quiescence'] as const) {
  assert.deepEqual(selectRollingPublicationBatch([],4,trigger),{state:'WAITING',reason:'empty',count:0});
  assert.deepEqual(selectRollingPublicationBatch([firstRollingAcceptedIncrement],4,trigger),
   {state:'FROZEN',trigger,increments:[firstRollingAcceptedIncrement],campaignRevision:firstRollingAcceptedIncrement.revision});
 }
 assert.deepEqual(selectRollingPublicationBatch([firstRollingAcceptedIncrement],1),
  {state:'FROZEN',trigger:'threshold',increments:[firstRollingAcceptedIncrement],campaignRevision:firstRollingAcceptedIncrement.revision});
});
