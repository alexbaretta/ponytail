// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

export interface IndexPublicationClient {
 query(text:string,values:(string|null)[]):Promise<unknown>;
}
export interface IndexSearchDocument {
 readonly generationId:string;readonly entityId:string;readonly documentId:string;readonly content:string;
 readonly searchableEntityId:string|null;readonly entityKind:string|null;readonly path:string|null;
 readonly unitName:string|null;readonly annotation:string|null;readonly description:string|null;
 readonly role:string|null;readonly requirementId:string|null;
}

// The caller supplies documents in content-hash order and owns the transaction.
// Traceability: implements REQ-TRACEABILITY-INDEX
export async function publishIndexSearchDocuments(indexPublicationClient:IndexPublicationClient,
 indexSearchDocuments:Iterable<IndexSearchDocument>,onPublished?:(count:number)=>void):Promise<void> {
 let batch:IndexSearchDocument[]=[];
 let bytes=0;
 const searchValues=(document:IndexSearchDocument):(string|null)[]=>[document.generationId,document.entityId,document.documentId,
  document.searchableEntityId,document.entityKind,document.path,document.unitName,document.annotation,
  document.description,document.role,document.requirementId];
 const flush=async():Promise<void>=>{
  if(batch.length===0) return;
  await indexPublicationClient.query(`INSERT INTO ponytail_index.text_document_v1 (document_id,content)
   VALUES ${batch.map((_,index)=>`($${index*2+1},$${index*2+2})`).join(',')}
   ON CONFLICT (document_id) DO NOTHING`,batch.flatMap(document=>[document.documentId,document.content]));
  const values=batch.flatMap(searchValues);
  await indexPublicationClient.query(`INSERT INTO ponytail_index.search_document_v2 (
   generation_id,entity_id,document_id,searchable_entity_id,entity_kind,path,unit_name,annotation,description,role,requirement_id)
   VALUES ${batch.map((_,index)=>`(${Array.from({length:11},(_,column)=>`$${index*11+column+1}${column===0?'::uuid':''}`).join(',')})`).join(',')}
   ON CONFLICT (generation_id,entity_id) DO UPDATE SET document_id=EXCLUDED.document_id,
   searchable_entity_id=EXCLUDED.searchable_entity_id,entity_kind=EXCLUDED.entity_kind,path=EXCLUDED.path,
   unit_name=EXCLUDED.unit_name,annotation=EXCLUDED.annotation,description=EXCLUDED.description,
   role=EXCLUDED.role,requirement_id=EXCLUDED.requirement_id`,values);
  onPublished?.(batch.length);
  batch=[];bytes=0;
 };
 for(const indexSearchDocument of indexSearchDocuments) {
  const size=Buffer.byteLength(indexSearchDocument.documentId)+Buffer.byteLength(indexSearchDocument.content)
   +searchValues(indexSearchDocument).reduce<number>((sum,value)=>sum+(value===null?0:Buffer.byteLength(value)),0);
  if(bytes+size>1024*1024) await flush();
  batch.push(indexSearchDocument);
  bytes+=size;
  if(batch.length===256) await flush();
 }
 await flush();
}
