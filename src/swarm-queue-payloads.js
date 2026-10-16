// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-queue-payloads.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmQueueBlobReaders = exports.SwarmQueuePayloads = void 0;
exports.parseSwarmQueueInteger = parseSwarmQueueInteger;
exports.readSwarmQueueBlobV1 = readSwarmQueueBlobV1;
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_stream_1 = require("node:stream");
const chunkBytes = 256 * 1024;
function requirePayload(condition, message) { if (!condition)
    throw new Error(`swarm queue payload: ${message}`); }
function parseSwarmQueueInteger(source) {
    requirePayload(/^(0|[1-9][0-9]*)$/u.test(source), 'unsafe JSON integer token');
    const value = Number(source);
    requirePayload(Number.isSafeInteger(value), 'unsafe JSON integer');
    return value;
}
function readSwarmQueueBlobV1(value) {
    requirePayload(value !== null && typeof value === 'object' && !Array.isArray(value), 'invalid blob reference');
    requirePayload(Object.keys(value).length === 3 && 'id' in value && 'byteLength' in value && 'sha256' in value, 'invalid blob fields');
    requirePayload(typeof value.id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value.id), 'invalid blob identity');
    requirePayload(typeof value.byteLength === 'number' && Number.isSafeInteger(value.byteLength) && value.byteLength >= 0 && typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sha256), 'invalid blob size/digest');
    return { id: value.id, byteLength: value.byteLength, sha256: value.sha256 };
}
class SwarmQueueBlobWriter {
    poolClient;
    projectId;
    ownerRoot;
    campaignId;
    id;
    hash = node_crypto_1.default.createHash('sha256');
    buffers = [];
    bufferedBytes = 0;
    byteLength = 0;
    ordinal = 0;
    constructor(poolClient, projectId, ownerRoot, campaignId, id) {
        this.poolClient = poolClient;
        this.projectId = projectId;
        this.ownerRoot = ownerRoot;
        this.campaignId = campaignId;
        this.id = id;
    }
    async append(buffer) {
        this.hash.update(buffer);
        this.byteLength += buffer.length;
        requirePayload(Number.isSafeInteger(this.byteLength), 'artifact too large');
        for (let offset = 0; offset < buffer.length;) {
            const end = Math.min(buffer.length, offset + chunkBytes - this.bufferedBytes);
            const part = buffer.subarray(offset, end);
            this.buffers.push(part);
            this.bufferedBytes += part.length;
            offset = end;
            if (this.bufferedBytes === chunkBytes)
                await this.flush();
        }
    }
    async flush() { if (this.bufferedBytes === 0)
        return; await this.poolClient.query('INSERT INTO ponytail_index.swarm_queue_blob_chunk_v1(project_id,owner_root,campaign_id,blob_id,ordinal,bytes) VALUES($1,$2,$3,$4,$5,$6)', [this.projectId, this.ownerRoot, this.campaignId, this.id, this.ordinal++, Buffer.concat(this.buffers, this.bufferedBytes)]); this.buffers = []; this.bufferedBytes = 0; }
    async finish() { await this.flush(); const sha256 = this.hash.digest('hex'); await this.poolClient.query('UPDATE ponytail_index.swarm_queue_blob_v1 SET byte_length=$5,sha256=$6 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 AND id=$4', [this.projectId, this.ownerRoot, this.campaignId, this.id, this.byteLength, sha256]); return { id: this.id, byteLength: this.byteLength, sha256 }; }
}
class SwarmQueuePayloads {
    poolClient;
    projectId;
    ownerRoot;
    campaignId;
    constructor(poolClient, projectId, ownerRoot, campaignId) {
        this.poolClient = poolClient;
        this.projectId = projectId;
        this.ownerRoot = ownerRoot;
        this.campaignId = campaignId;
    }
    async writer() { const id = node_crypto_1.default.randomUUID(); await this.poolClient.query('INSERT INTO ponytail_index.swarm_queue_blob_v1(project_id,owner_root,campaign_id,id) VALUES($1,$2,$3,$4)', [this.projectId, this.ownerRoot, this.campaignId, id]); return new SwarmQueueBlobWriter(this.poolClient, this.projectId, this.ownerRoot, this.campaignId, id); }
    async file(file) { return this.stream(node_fs_1.default.createReadStream(file, { highWaterMark: chunkBytes })); }
    async stream(readable) { const swarmQueueBlobWriter = await this.writer(); for await (const value of readable) {
        requirePayload(Buffer.isBuffer(value), 'artifact stream must contain bytes');
        await swarmQueueBlobWriter.append(value);
    } return swarmQueueBlobWriter.finish(); }
    async read(id, offset, length) {
        requirePayload(Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(length) && length > 0 && length <= 65536, 'artifact reads require a nonnegative offset and 1..65536 bytes');
        const row = (await this.poolClient.query('SELECT id,byte_length,sha256 FROM ponytail_index.swarm_queue_blob_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 AND id=$4', [this.projectId, this.ownerRoot, this.campaignId, id])).rows[0];
        requirePayload(row !== undefined, 'artifact absent');
        const swarmQueueBlobV1 = readSwarmQueueBlobV1({ id: row.id, byteLength: typeof row.byte_length === 'string' ? Number(row.byte_length) : row.byte_length, sha256: row.sha256 });
        requirePayload(offset <= swarmQueueBlobV1.byteLength, 'artifact offset exceeds length');
        const end = Math.min(swarmQueueBlobV1.byteLength, offset + length);
        const rows = (await this.poolClient.query('SELECT ordinal,bytes FROM ponytail_index.swarm_queue_blob_chunk_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 AND blob_id=$4 AND ordinal BETWEEN $5 AND $6 ORDER BY ordinal', [this.projectId, this.ownerRoot, this.campaignId, id, Math.floor(offset / chunkBytes), Math.floor(Math.max(offset, end - 1) / chunkBytes)])).rows;
        let ordinal = Math.floor(offset / chunkBytes);
        const buffers = rows.map(row => { requirePayload(row.ordinal === ordinal++ && Buffer.isBuffer(row.bytes), 'artifact chunk missing'); return row.bytes; });
        const buffer = Buffer.concat(buffers).subarray(offset % chunkBytes, offset % chunkBytes + end - offset);
        requirePayload(buffer.length === end - offset, 'artifact chunk gap');
        return { blob: swarmQueueBlobV1, contentBase64: buffer.toString('base64'), nextOffset: end === swarmQueueBlobV1.byteLength ? null : end };
    }
    async migrate() {
        const poolClient = this.poolClient, projectId = this.projectId, ownerRoot = this.ownerRoot, campaignId = this.campaignId;
        async function* source() { for (let offset = 1;;) {
            const row = (await poolClient.query('SELECT substring(state_text FROM $4::integer FOR $5::integer) AS piece FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3', [projectId, ownerRoot, campaignId, offset, 1024 * 1024])).rows[0];
            requirePayload(row !== undefined && typeof row.piece === 'string', 'legacy queue missing');
            if (row.piece === '')
                break;
            offset += row.piece.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x').length;
            yield row.piece;
        } }
        const { parser } = await import('stream-json/parser.js');
        const sourceReadable = node_stream_1.Readable.from(source(), { objectMode: false, highWaterMark: 1024 * 1024 });
        const readable = sourceReadable.pipe(parser.asStream({ packKeys: true, streamKeys: false, packNumbers: true, streamNumbers: false, packStrings: false, streamStrings: true }));
        sourceReadable.on('error', cause => readable.destroy(cause));
        const frames = [];
        let result;
        let text = '';
        let base64 = '';
        let base64Ended = false;
        let swarmQueueBlobWriter = null;
        function nextPath() { const frame = frames.at(-1); if (frame === undefined)
            return []; if (frame.kind === 'array')
            return [...frame.path, frame.value.length]; requirePayload(frame.key !== null, 'missing object key'); return [...frame.path, frame.key]; }
        function assign(value) { const frame = frames.at(-1); if (frame === undefined) {
            requirePayload(result === undefined, 'duplicate root');
            result = value;
        }
        else if (frame.kind === 'array')
            frame.value.push(value);
        else {
            requirePayload(frame.key !== null && !Object.hasOwn(frame.value, frame.key), 'duplicate/missing object key');
            Object.defineProperty(frame.value, frame.key, { value, writable: true, enumerable: true, configurable: true });
            frame.key = null;
        } }
        try {
            for await (const value of readable) {
                const token = readToken(value);
                switch (token.name) {
                    case 'startObject': {
                        const path = nextPath();
                        const object = {};
                        assign(object);
                        frames.push({ kind: 'object', value: object, path, key: null });
                        break;
                    }
                    case 'startArray': {
                        const path = nextPath();
                        const array = [];
                        assign(array);
                        frames.push({ kind: 'array', value: array, path });
                        break;
                    }
                    case 'endObject':
                        requirePayload(frames.pop()?.kind === 'object', 'object mismatch');
                        break;
                    case 'endArray':
                        requirePayload(frames.pop()?.kind === 'array', 'array mismatch');
                        break;
                    case 'keyValue': {
                        const frame = frames.at(-1);
                        requirePayload(frame?.kind === 'object' && frame.key === null, 'key outside object');
                        frame.key = token.value;
                        break;
                    }
                    case 'startString': {
                        text = '';
                        base64 = '';
                        base64Ended = false;
                        const path = nextPath();
                        if (path.length === 5 && path[0] === 'requests' && path[2] === 'artifacts' && path[4] === 'contentBase64' || path[0] === 'tasks' && (path.length === 4 && path[2] === 'checkpoint' && (path[3] === 'indexPatchBase64' || path[3] === 'worktreePatchBase64') || path.length === 4 && path[2] === 'review' && path[3] === 'contentBase64' || path.length === 6 && path[2] === 'checkpoint' && path[3] === 'untracked' && path[5] === 'contentBase64'))
                            swarmQueueBlobWriter = await this.writer();
                        break;
                    }
                    case 'stringChunk':
                        if (swarmQueueBlobWriter === null) {
                            text += token.value;
                            requirePayload(text.length <= 8 * 1024 * 1024, 'metadata string exceeds 8 MiB; preserve legacy state');
                        }
                        else {
                            requirePayload(!base64Ended && /^[A-Za-z0-9+/=]*$/u.test(token.value), 'invalid legacy base64');
                            base64 += token.value;
                            const length = base64.length - base64.length % 4;
                            if (length > 0) {
                                const encoded = base64.slice(0, length);
                                const buffer = Buffer.from(encoded, 'base64');
                                requirePayload(buffer.toString('base64') === encoded, 'invalid legacy base64 encoding');
                                base64Ended = encoded.endsWith('=');
                                await swarmQueueBlobWriter.append(buffer);
                                base64 = base64.slice(length);
                                requirePayload(!base64Ended || base64.length === 0, 'base64 data after padding');
                            }
                        }
                        break;
                    case 'endString':
                        if (swarmQueueBlobWriter === null)
                            assign(text);
                        else {
                            requirePayload(base64.length === 0, 'truncated legacy base64');
                            const frame = frames.at(-1);
                            requirePayload(frame?.kind === 'object' && (frame.key === 'contentBase64' || frame.key === 'indexPatchBase64' || frame.key === 'worktreePatchBase64'), 'artifact field mismatch');
                            frame.key = frame.key === 'indexPatchBase64' ? 'indexPatch' : frame.key === 'worktreePatchBase64' ? 'worktreePatch' : 'blob';
                            assign(await swarmQueueBlobWriter.finish());
                            swarmQueueBlobWriter = null;
                        }
                        break;
                    case 'numberValue':
                        assign(parseSwarmQueueInteger(token.value));
                        break;
                    case 'trueValue':
                        assign(true);
                        break;
                    case 'falseValue':
                        assign(false);
                        break;
                    case 'nullValue':
                        assign(null);
                        break;
                    case 'startKey':
                    case 'endKey':
                    case 'startNumber':
                    case 'endNumber':
                    case 'stringValue':
                    case 'numberChunk':
                    case 'whitespace': throw new Error(`swarm queue payload: unexpected parser token ${token.name}`);
                }
            }
            requirePayload(frames.length === 0 && swarmQueueBlobWriter === null && result !== null && typeof result === 'object' && !Array.isArray(result), 'incomplete legacy queue');
            requirePayload('schemaVersion' in result && result.schemaVersion === 1, 'expected legacy state V1');
            Object.defineProperty(result, 'schemaVersion', { value: 2, writable: true, enumerable: true, configurable: true });
            return result;
        }
        finally {
            sourceReadable.destroy();
            readable.destroy();
        }
    }
}
exports.SwarmQueuePayloads = SwarmQueuePayloads;
function readToken(value) {
    requirePayload(value !== null && typeof value === 'object' && 'name' in value, 'invalid JSON token');
    switch (value.name) {
        case 'startObject':
        case 'endObject':
        case 'startArray':
        case 'endArray':
        case 'startString':
        case 'endString': return { name: value.name };
        case 'keyValue':
        case 'stringChunk':
        case 'numberValue':
            requirePayload('value' in value && typeof value.value === 'string', 'invalid token value');
            return { name: value.name, value: value.value };
        case 'trueValue': return { name: 'trueValue', value: true };
        case 'falseValue': return { name: 'falseValue', value: false };
        case 'nullValue': return { name: 'nullValue', value: null };
        default: throw new Error('swarm queue payload: unsupported parser token');
    }
}
exports.SwarmQueueBlobReaders = { V1: readSwarmQueueBlobV1 };
