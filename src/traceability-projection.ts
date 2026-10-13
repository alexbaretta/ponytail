// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

export interface TraceabilityEntity {
 readonly entityId:string; readonly entityKind:string; readonly path:string;
 readonly line:number|null; readonly unitName:string|null;
 readonly annotation:string|null; readonly description:string|null;
}
export interface TraceabilityRelationship {
 readonly sourceEntityId:string; readonly targetEntityId:string; readonly role:string;
}
export interface TraceabilityPayload {
 readonly entities:readonly TraceabilityEntity[];
 readonly relationships:readonly TraceabilityRelationship[];
}

// Traceability: implements REQ-TRACEABILITY-INDEX
export function normalizeTraceabilityPayloads(traceabilityPayloads:readonly TraceabilityPayload[]):TraceabilityPayload {
 const entities=new Map<string,TraceabilityEntity>();
 const relationships=new Map<string,TraceabilityRelationship>();
 // Files are sorted by path. Repeated references to the same declared identity
 // are one entity; preserve all distinct edges rather than inserting it twice.
 for(const traceabilityPayload of traceabilityPayloads) {
  for(const traceabilityEntity of traceabilityPayload.entities)
   if(!entities.has(traceabilityEntity.entityId)) entities.set(traceabilityEntity.entityId,traceabilityEntity);
  for(const traceabilityRelationship of traceabilityPayload.relationships)
   relationships.set(JSON.stringify([traceabilityRelationship.sourceEntityId,traceabilityRelationship.targetEntityId,traceabilityRelationship.role]),traceabilityRelationship);
 }
 return {entities:[...entities.values()],relationships:[...relationships.values()]};
}
