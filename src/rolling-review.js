// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-review.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingReviewOutcomeReaders = exports.RollingReviewRequestReaders = void 0;
exports.readRollingReviewRequestV1 = readRollingReviewRequestV1;
exports.readRollingReviewOutcomeV1 = readRollingReviewOutcomeV1;
exports.parseRollingReviewRequest = parseRollingReviewRequest;
exports.parseRollingReviewOutcome = parseRollingReviewOutcome;
exports.validateRollingReviewOutcome = validateRollingReviewOutcome;
const lossless_json_1 = require("lossless-json");
function requireReview(condition, message) {
    if (!condition)
        throw new Error(`rolling review: ${message}`);
}
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function fields(value, names) {
    requireReview(isRecord(value), 'contract must be an object');
    requireReview(Object.keys(value).sort().join('\0') === [...names].sort().join('\0'), 'invalid contract fields');
    requireReview(value.schemaVersion === 1, 'unsupported physical version');
    return value;
}
function identity(value) {
    requireReview(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\0\r\n]/u.test(value), 'invalid identity');
    return value;
}
function revision(value) {
    requireReview(typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value), 'invalid commit revision');
    return value;
}
function strings(value) {
    requireReview(Array.isArray(value), 'findings must be an array');
    return value.map((item) => identity(item));
}
function json(text) {
    return (0, lossless_json_1.parse)(text, null, token => {
        requireReview(/^(0|[1-9][0-9]*)$/u.test(token), 'unsupported numeric token');
        const number = Number(token);
        requireReview(Number.isSafeInteger(number), 'numeric token exceeds safe range');
        return number;
    });
}
function readRollingReviewRequestV1(value) {
    const record = fields(value, ['schemaVersion', 'id', 'campaignId', 'assignmentId', 'generation', 'baseCommit', 'revision', 'reviewerSessionId']);
    return { schemaVersion: 1, id: identity(record.id), campaignId: identity(record.campaignId), assignmentId: identity(record.assignmentId),
        generation: identity(record.generation), baseCommit: revision(record.baseCommit), revision: revision(record.revision), reviewerSessionId: identity(record.reviewerSessionId) };
}
function readRollingReviewOutcomeV1(value) {
    const record = fields(value, ['schemaVersion', 'reviewId', 'revision', 'reviewerSessionId', 'completedAt', 'decision', 'findings']);
    const completedAt = identity(record.completedAt);
    requireReview(/^\d{4}-\d{2}-\d{2}T/u.test(completedAt) && Number.isFinite(Date.parse(completedAt)), 'invalid completion timestamp');
    const rollingReviewOutcomeIdentityV1 = { schemaVersion: 1, reviewId: identity(record.reviewId), revision: revision(record.revision),
        reviewerSessionId: identity(record.reviewerSessionId), completedAt };
    const findings = strings(record.findings);
    switch (record.decision) {
        case 'accepted': return { ...rollingReviewOutcomeIdentityV1, decision: 'accepted', findings };
        case 'rejected': {
            const first = findings[0];
            requireReview(first !== undefined, 'rejected review requires findings');
            return { ...rollingReviewOutcomeIdentityV1, decision: 'rejected', findings: [first, ...findings.slice(1)] };
        }
        default: throw new Error('rolling review: unsupported decision');
    }
}
exports.RollingReviewRequestReaders = { V1: readRollingReviewRequestV1 };
exports.RollingReviewOutcomeReaders = { V1: readRollingReviewOutcomeV1 };
function parseRollingReviewRequest(text) { return readRollingReviewRequestV1(json(text)); }
function parseRollingReviewOutcome(text) { return readRollingReviewOutcomeV1(json(text)); }
function validateRollingReviewOutcome(rollingReviewRequestV1, rollingReviewOutcomeV1) {
    requireReview(rollingReviewOutcomeV1.reviewId === rollingReviewRequestV1.id
        && rollingReviewOutcomeV1.revision === rollingReviewRequestV1.revision
        && rollingReviewOutcomeV1.reviewerSessionId === rollingReviewRequestV1.reviewerSessionId, 'outcome differs from assigned candidate or reviewer');
}
