// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/traceability-projection.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTraceabilityPayloads = normalizeTraceabilityPayloads;
function normalizeTraceabilityPayloads(traceabilityPayloads) {
    const entities = new Map();
    const relationships = new Map();
    for (const traceabilityPayload of traceabilityPayloads) {
        for (const traceabilityEntity of traceabilityPayload.entities)
            if (!entities.has(traceabilityEntity.entityId))
                entities.set(traceabilityEntity.entityId, traceabilityEntity);
        for (const traceabilityRelationship of traceabilityPayload.relationships)
            relationships.set(JSON.stringify([traceabilityRelationship.sourceEntityId, traceabilityRelationship.targetEntityId, traceabilityRelationship.role]), traceabilityRelationship);
    }
    return { entities: [...entities.values()], relationships: [...relationships.values()] };
}
