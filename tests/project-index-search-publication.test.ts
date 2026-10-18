// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {publishIndexSearchDocuments,type IndexPublicationClient,type IndexSearchDocument} from '../src/project-index-search-publication.js';

function document(index:number):IndexSearchDocument {
 const content=`entity ${index}`;
 return {generationId:'019c0000-0000-7000-8000-000000000001',entityId:`entity-${index}`,
  documentId:crypto.createHash('sha256').update(content).digest('hex'),content,searchableEntityId:`entity-${index}`,
  entityKind:'requirement',path:`requirements/${index}.md`,unitName:null,annotation:null,
  description:content,role:null,requirementId:null};
}

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('search publication bounds SQL batches and publishes every row only after both writes',async()=>{
 let queries=0;let written=0;let published=0;let yielded=0;
 const indexPublicationClient:IndexPublicationClient={async query(_text,values){
  queries++;assert.ok(values.length<=256*11,'bounded parameters');
  assert.ok(yielded-written<=256,'do not consume the entire input before flushing');
  if(queries%2===0) written+=values.length/11;
 }};
 const records:readonly IndexSearchDocument[]=Array.from({length:513},(_,index)=>document(index)).sort((left,right)=>left.documentId.localeCompare(right.documentId));
 function* documents():Iterable<IndexSearchDocument>{for(const record of records){yielded++;yield record;}}
 await publishIndexSearchDocuments(indexPublicationClient,documents(),count=>{
  published+=count;assert.equal(published,written,'progress follows successful text and search writes');
 });
 assert.equal(written,513);assert.equal(published,513);
 assert.ok(queries<=6,'hundreds of rows must not require per-row SQL round trips');
});

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('search batches bound parameter bytes while allowing a single larger document',async()=>{
 const records:readonly IndexSearchDocument[]=[300000,300000,2*1024*1024].map((length,index)=>{
  const content='x'.repeat(length);
  const indexSearchDocument:IndexSearchDocument={...document(index),content,description:content,
   documentId:crypto.createHash('sha256').update(content).digest('hex')};
  return indexSearchDocument;
 }).sort((left,right)=>left.documentId.localeCompare(right.documentId));
 let published=0;
 const indexPublicationClient:IndexPublicationClient={async query(text,values){
  const width=text.includes('text_document_v1')?2:11;
  const bytes=values.reduce<number>((sum,value)=>sum+(value===null?0:Buffer.byteLength(value)),0);
  assert.ok(bytes<=1024*1024 || values.length===width,'large rows must not accumulate in a batch');
 }};
 await publishIndexSearchDocuments(indexPublicationClient,records,count=>{published+=count;});
 assert.equal(published,3);
});

// Traceability: verifies REQ-TRACEABILITY-INDEX
test('failed search SQL does not report its batch published',async()=>{
 let queries=0;let published=0;
 const indexPublicationClient:IndexPublicationClient={async query(){if(++queries===2) throw new Error('database failure');}};
 await assert.rejects(publishIndexSearchDocuments(indexPublicationClient,[document(0)],count=>{published+=count;}),/database failure/);
 assert.equal(published,0);
});
