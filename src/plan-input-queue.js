#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/plan-input-queue.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanInputReaders = void 0;
exports.fail = fail;
exports.readV1 = readV1;
exports.readV2 = readV2;
exports.queueRoot = queueRoot;
exports.entries = entries;
exports.enqueue = enqueue;
exports.claim = claim;
exports.complete = complete;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function hasErrorCode(value, code) {
    return value instanceof Error && 'code' in value && value.code === code;
}
exports.PlanInputReaders = Object.freeze({ V1: readV1, V2: readV2 });
const SOURCES = new Set(['cli', 'codex-composer']);
const STATUSES = ['open', 'in_progress', 'closed'];
function fail(message) {
    const error = new Error(message);
    error.name = 'PlanInputError';
    throw error;
}
function readV1(value, file = 'plan input') {
    if (!isRecord(value))
        fail(`${file}: expected an object`);
    const allowed = value.status === 'open'
        ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
        : value.status === 'in_progress'
            ? ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
            : ['schemaVersion', 'id', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
    if (!isPlanInputV1(value, file, allowed))
        fail(`${file}: invalid V1 input`);
    return { ...value };
}
function readV2(value, file = 'plan input') {
    if (!isRecord(value))
        fail(`${file}: expected an object`);
    const allowed = value.status === 'open'
        ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId']
        : value.status === 'in_progress'
            ? ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt']
            : ['schemaVersion', 'id', 'campaignId', 'submittedPlanId', 'status', 'source', 'prompt', 'receivedAt', 'sessionId', 'turnId', 'claimedAt', 'completedAt', 'records'];
    if (!isPlanInputV2(value, file, allowed))
        fail(`${file}: invalid V2 input`);
    return { ...value };
}
function isPlanInputV1(value, file, allowed) {
    readPhysical(value, file, 1, allowed, false);
    return true;
}
function isPlanInputV2(value, file, allowed) {
    readPhysical(value, file, 2, allowed, true);
    return true;
}
function readPhysical(value, file, schemaVersion, allowed, campaignScoped) {
    if (value.schemaVersion !== schemaVersion)
        fail(`${file}: unsupported schemaVersion`);
    if (!(value.status === 'open' || value.status === 'in_progress' || value.status === 'closed'))
        fail(`${file}: invalid status`);
    for (const key of Object.keys(value))
        if (!allowed.includes(key))
            fail(`${file}: unknown field ${key}`);
    const requiredStrings = ['id', 'prompt', 'receivedAt'];
    if (campaignScoped)
        requiredStrings.push('campaignId', 'submittedPlanId');
    for (const key of requiredStrings) {
        if (typeof value[key] !== 'string' || !value[key])
            fail(`${file}: ${key} must be a nonempty string`);
    }
    if (!SOURCES.has(value.source))
        fail(`${file}: invalid source`);
    for (const key of ['sessionId', 'turnId']) {
        if (value[key] !== null && typeof value[key] !== 'string')
            fail(`${file}: ${key} must be a string or null`);
    }
    if (value.status !== 'open' && (typeof value.claimedAt !== 'string' || !value.claimedAt))
        fail(`${file}: claimedAt is required`);
    if (value.status === 'closed') {
        if (typeof value.completedAt !== 'string' || !value.completedAt)
            fail(`${file}: completedAt is required`);
        if (!Array.isArray(value.records) || value.records.length === 0 || value.records.some((item) => typeof item !== 'string')) {
            fail(`${file}: records must contain at least one path`);
        }
    }
}
function queueRoot(repositoryRoot, campaignId) {
    if (typeof campaignId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(campaignId))
        fail('invalid campaign ID');
    return node_path_1.default.join(repositoryRoot, 'pm', 'plan-inputs', campaignId);
}
function lifecycleDirectory(repositoryRoot, campaignId, status) {
    return node_path_1.default.join(queueRoot(repositoryRoot, campaignId), status);
}
function readEntry(file) {
    let value;
    try {
        value = JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
    }
    catch (error) {
        fail(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!isRecord(value))
        fail(`${file}: expected an object`);
    if (value.schemaVersion === 1)
        fail(`${file}: repository-scoped V1 plan input is retired and must be removed before use`);
    if (value.schemaVersion !== 2)
        fail(`${file}: unsupported schemaVersion`);
    return exports.PlanInputReaders.V2(value, file);
}
function entries(repositoryRoot, campaignId) {
    const result = [];
    for (const status of STATUSES) {
        const directory = lifecycleDirectory(repositoryRoot, campaignId, status);
        if (!node_fs_1.default.existsSync(directory))
            continue;
        for (const name of node_fs_1.default.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
            const file = node_path_1.default.join(directory, name);
            const entry = readEntry(file);
            if (entry.status !== status)
                fail(`${file}: status does not match lifecycle directory`);
            result.push(entry);
        }
    }
    return result.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id));
}
function writeExclusive(file, entry) {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
    node_fs_1.default.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`, { flag: 'wx' });
}
function withEnqueueLock(repositoryRoot, campaignId, operation) {
    const lock = node_path_1.default.join(queueRoot(repositoryRoot, campaignId), '.enqueue.lock');
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(lock), { recursive: true });
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
            const descriptor = node_fs_1.default.openSync(lock, 'wx');
            try {
                return operation();
            }
            finally {
                node_fs_1.default.closeSync(descriptor);
                node_fs_1.default.unlinkSync(lock);
            }
        }
        catch (error) {
            if (!hasErrorCode(error, 'EEXIST'))
                throw error;
            const age = Date.now() - node_fs_1.default.statSync(lock).mtimeMs;
            if (age > 5000) {
                node_fs_1.default.unlinkSync(lock);
                continue;
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
    }
    fail('timed out waiting for the plan-input enqueue lock');
}
function enqueue(repositoryRoot, campaignId, submittedPlanId, prompt, source, metadata = {}) {
    if (typeof prompt !== 'string' || !prompt.trim())
        fail('instruction must be nonempty');
    if (!SOURCES.has(source))
        fail('invalid plan-input source');
    return withEnqueueLock(repositoryRoot, campaignId, () => {
        const newest = entries(repositoryRoot, campaignId).at(-1);
        const now = Date.now();
        const receivedAt = new Date(Math.max(now, newest ? Date.parse(newest.receivedAt) + 1 : now)).toISOString();
        const id = `${receivedAt.replace(/[-:.]/g, '')}-${node_crypto_1.default.randomUUID()}`;
        const entry = readV2({
            schemaVersion: 2,
            id,
            campaignId,
            submittedPlanId,
            status: 'open',
            source,
            prompt,
            receivedAt,
            sessionId: metadata.sessionId || null,
            turnId: metadata.turnId || null,
        });
        writeExclusive(node_path_1.default.join(lifecycleDirectory(repositoryRoot, campaignId, 'open'), `${id}.json`), entry);
        return entry;
    });
}
function claim(repositoryRoot, campaignId) {
    const current = entries(repositoryRoot, campaignId).find((entry) => entry.status === 'in_progress');
    if (current)
        return current;
    for (const entry of entries(repositoryRoot, campaignId).filter((item) => item.status === 'open')) {
        const source = node_path_1.default.join(lifecycleDirectory(repositoryRoot, campaignId, 'open'), `${entry.id}.json`);
        const destination = node_path_1.default.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${entry.id}.json`);
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(destination), { recursive: true });
        try {
            node_fs_1.default.renameSync(source, destination);
        }
        catch (error) {
            if (hasErrorCode(error, 'ENOENT'))
                continue;
            throw error;
        }
        const claimed = readV2({ ...entry, status: 'in_progress', claimedAt: new Date().toISOString() });
        node_fs_1.default.writeFileSync(destination, `${JSON.stringify(claimed, null, 2)}\n`);
        return claimed;
    }
    return null;
}
function complete(repositoryRoot, campaignId, id, records) {
    const source = node_path_1.default.join(lifecycleDirectory(repositoryRoot, campaignId, 'in_progress'), `${id}.json`);
    if (!node_fs_1.default.existsSync(source))
        fail(`plan input is not in progress: ${id}`);
    const normalized = [...new Set(records)].map((record) => record.replaceAll('\\', '/'));
    if (normalized.length === 0)
        fail('at least one PM record is required');
    for (const record of normalized) {
        if (!record.startsWith('pm/') || record.includes('/../') || node_path_1.default.isAbsolute(record))
            fail(`record must be a repository-relative pm/ path: ${record}`);
        if (!node_fs_1.default.existsSync(node_path_1.default.join(repositoryRoot, record)))
            fail(`record does not exist: ${record}`);
    }
    const entry = readEntry(source);
    const closed = readV2({ ...entry, status: 'closed', completedAt: new Date().toISOString(), records: normalized });
    const destination = node_path_1.default.join(lifecycleDirectory(repositoryRoot, campaignId, 'closed'), `${id}.json`);
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(destination), { recursive: true });
    node_fs_1.default.writeFileSync(source, `${JSON.stringify(closed, null, 2)}\n`);
    node_fs_1.default.renameSync(source, destination);
    return closed;
}
