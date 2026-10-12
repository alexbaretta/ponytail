// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-publication.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectRollingPublicationBatch = selectRollingPublicationBatch;
function requirePublication(condition, message) {
    if (!condition)
        throw new Error(`rolling publication: ${message}`);
}
function selectRollingPublicationBatch(orderedRollingAcceptedIncrements, publicationSize, flush = null) {
    requirePublication(Number.isSafeInteger(publicationSize) && publicationSize > 0, 'publication size must be a positive safe integer');
    requirePublication(flush === null || flush === 'explicit_flush' || flush === 'completion' || flush === 'quiescence', 'unsupported publication trigger');
    const map = new Map();
    for (const rollingAcceptedIncrement of orderedRollingAcceptedIncrements) {
        requirePublication(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(rollingAcceptedIncrement.id)
            && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(rollingAcceptedIncrement.revision), 'invalid accepted increment identity');
        const previousRollingAcceptedIncrement = map.get(rollingAcceptedIncrement.id);
        requirePublication(!previousRollingAcceptedIncrement || previousRollingAcceptedIncrement.revision === rollingAcceptedIncrement.revision, 'accepted increment revision is immutable');
        if (!previousRollingAcceptedIncrement)
            map.set(rollingAcceptedIncrement.id, { id: rollingAcceptedIncrement.id, revision: rollingAcceptedIncrement.revision });
    }
    const uniqueRollingAcceptedIncrements = [...map.values()];
    if (uniqueRollingAcceptedIncrements.length === 0)
        return { state: 'WAITING', reason: 'empty', count: 0 };
    const trigger = uniqueRollingAcceptedIncrements.length >= publicationSize ? 'threshold' : flush;
    if (trigger === null)
        return { state: 'WAITING', reason: 'below_threshold', count: uniqueRollingAcceptedIncrements.length };
    const selectedRollingAcceptedIncrements = uniqueRollingAcceptedIncrements.slice(0, publicationSize);
    const finalRollingAcceptedIncrement = selectedRollingAcceptedIncrements.at(-1);
    requirePublication(finalRollingAcceptedIncrement, 'publication cannot freeze an empty batch');
    return { state: 'FROZEN', trigger,
        increments: selectedRollingAcceptedIncrements, campaignRevision: finalRollingAcceptedIncrement.revision };
}
