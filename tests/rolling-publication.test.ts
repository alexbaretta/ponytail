// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {parseRollingPublicationQa,readRollingPublicationQaV1,type RollingPublicationQaV1,readRollingPublicationBatchClaimV1,selectRollingPublicationBatch,type RollingPublicationBatchClaimV1,type RollingAcceptedIncrement} from '../src/rolling-publication.js';

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

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots',()=> {
 const rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1 = {schemaVersion:1,id:'00000000-0000-0000-0000-000000000004',
  campaignId:'fixture',rootPath:'/fixture',incrementRef:'campaign/fixture',target:{remote:'origin',branch:'main'},
  graphDigest:'d'.repeat(64),configurationDigest:'e'.repeat(64),publicationSize:2,trigger:'threshold',
  increments:[firstRollingAcceptedIncrement,secondRollingAcceptedIncrement],campaignRevision:secondRollingAcceptedIncrement.revision};
 const serialized:unknown = JSON.parse(JSON.stringify(rollingPublicationBatchClaimV1));
 assert.deepEqual(readRollingPublicationBatchClaimV1(serialized),rollingPublicationBatchClaimV1);
 for (const value of [{...rollingPublicationBatchClaimV1,schemaVersion:2},{...rollingPublicationBatchClaimV1,extra:true},
  {...rollingPublicationBatchClaimV1,rootPath:'../fixture'},{...rollingPublicationBatchClaimV1,target:{remote:'origin',branch:'campaign/fixture'}},
  {...rollingPublicationBatchClaimV1,publicationSize:3},{...rollingPublicationBatchClaimV1,trigger:'unknown'},
  {...rollingPublicationBatchClaimV1,increments:[firstRollingAcceptedIncrement,firstRollingAcceptedIncrement]},
  {...rollingPublicationBatchClaimV1,campaignRevision:firstRollingAcceptedIncrement.revision},
  {...rollingPublicationBatchClaimV1,configurationDigest:'unknown'}, {...rollingPublicationBatchClaimV1,increments:[{...firstRollingAcceptedIncrement,extra:true},secondRollingAcceptedIncrement]}])
  assert.throws(()=>readRollingPublicationBatchClaimV1(value));
 assert.equal(readRollingPublicationBatchClaimV1({...rollingPublicationBatchClaimV1,publicationSize:4,trigger:'explicit_flush'}).increments.length,2);
});

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('full QA receipts retain complete command outcomes and lossless signed failure status',()=> {
 const rollingPublicationQaV1:RollingPublicationQaV1 = {schemaVersion:1,id:'00000000-0000-0000-0000-000000000004',
  batchId:'00000000-0000-0000-0000-000000000005',revision:'a'.repeat(40),configurationDigest:'b'.repeat(64),outcome:'FAIL',
  commands:[{argv:['configured-qa'],status:-1,output:'Command failed.'}]};
 assert.deepEqual(parseRollingPublicationQa(JSON.stringify(rollingPublicationQaV1)),rollingPublicationQaV1);
 assert.throws(()=>readRollingPublicationQaV1({...rollingPublicationQaV1,outcome:'PASS'}),/failed command/);
 assert.throws(()=>parseRollingPublicationQa(JSON.stringify(rollingPublicationQaV1).replace('"status":-1','"status":9007199254740993')),/safe integer/);
 assert.throws(()=>readRollingPublicationQaV1({...rollingPublicationQaV1,commands:[{argv:['configured-qa'],status:0}]}),/missing publication fields/);
});
