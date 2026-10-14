// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-codex.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingCodex = exports.RollingNativeRpcError = exports.RollingNativeResponseError = exports.RollingObservationTimeout = exports.RollingUnknownOutcome = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_readline_1 = __importDefault(require("node:readline"));
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
const lossless_json_1 = require("lossless-json");
const package_json_1 = require("../package.json");
class RollingUnknownOutcome extends Error {
    requestId;
    method;
    code = 'UNKNOWN_OUTCOME';
    constructor(requestId, method, message, cause) {
        super(message, { cause });
        this.requestId = requestId;
        this.method = method;
    }
}
exports.RollingUnknownOutcome = RollingUnknownOutcome;
class RollingObservationTimeout extends Error {
    code = 'OBSERVATION_TIMEOUT';
    constructor() { super('turn observation timed out; native activity is not known to be stopped'); }
}
exports.RollingObservationTimeout = RollingObservationTimeout;
class RollingNativeResponseError extends Error {
    nativeResult;
    constructor(message, nativeResult) {
        super(message);
        this.nativeResult = nativeResult;
    }
}
exports.RollingNativeResponseError = RollingNativeResponseError;
class RollingNativeRpcError extends Error {
    requestId;
    rpcError;
    constructor(requestId, rpcError, message) {
        super(message);
        this.requestId = requestId;
        this.rpcError = rpcError;
    }
}
exports.RollingNativeRpcError = RollingNativeRpcError;
function requireProtocol(condition, message) {
    if (!condition)
        throw new Error(`rolling Codex: ${message}`);
}
function isNativeRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nativeRecord(value) {
    requireProtocol(isNativeRecord(value), 'invalid protocol record');
    return value;
}
function nativeString(value, label) {
    requireProtocol(typeof value === 'string' && value.length > 0, `invalid ${label}`);
    return value;
}
function checkoutRoot(cwd) {
    requireProtocol(node_path_1.default.isAbsolute(cwd) && node_fs_1.default.statSync(cwd).isDirectory() && node_fs_1.default.realpathSync(cwd) === cwd, 'cwd must be an existing physical absolute directory');
}
function threadIdentity(value, cwd, expectedId = null) {
    try {
        const result = nativeRecord(value);
        const thread = nativeRecord(result.thread);
        const id = nativeString(thread.id, 'thread identity');
        const sessionId = nativeString(thread.sessionId, 'session identity');
        requireProtocol(result.cwd === cwd && (expectedId === null || id === expectedId), 'native response differs from designated checkout or thread');
        requireProtocol(Array.isArray(result.instructionSources), 'native response lacks instruction provenance');
        const instructionSources = result.instructionSources.map((item) => nativeString(item, 'instruction source'));
        requireProtocol(result.model === undefined || typeof result.model === 'string', 'invalid native model');
        return { thread: { id, sessionId }, cwd, instructionSources, model: result.model ?? null };
    }
    catch (cause) {
        throw new RollingNativeResponseError(cause instanceof Error ? cause.message : 'invalid native thread response', value);
    }
}
function nativeThreadStatus(thread) {
    const status = nativeString(nativeRecord(thread.status).type, 'native thread activity');
    switch (status) {
        case 'active':
            return status;
        case 'idle': return status;
        case 'notLoaded':
        case 'systemError': return status;
        default: throw new Error('rolling Codex: unsupported native thread activity');
    }
}
function completedTurn(value) {
    const turn = nativeRecord(value);
    const id = nativeString(turn.id, 'completed turn identity');
    const status = nativeString(turn.status, 'completed turn status');
    requireProtocol(Array.isArray(turn.items), 'completed turn lacks items');
    const items = turn.items.map((value) => {
        const item = nativeRecord(value);
        const type = nativeString(item.type, 'item type');
        if (type === 'userMessage') {
            requireProtocol(Array.isArray(item.content), 'user message lacks input content');
            const content = item.content.map(nativeRecord);
            return { type, text: content.every(input => input.type === 'text')
                    ? content.map(input => nativeString(input.text, 'user input text')).join('') : null };
        }
        if (type === 'functionCallOutput' && item.namespace === 'codex_app' && item.name === 'send_message_to_thread') {
            return { type, text: nativeString(item.output, 'desktop delegation output') };
        }
        return { type, text: type === 'agentMessage' ? nativeString(item.text, 'agent message text') : null };
    });
    return { id, status, items };
}
class RollingCodex extends node_events_1.EventEmitter {
    requestTimeoutMs;
    sequence = 0;
    pending = new Map();
    completedTurns = new Map();
    activeTurns = new Map();
    ready = false;
    failure = null;
    childProcess;
    closed;
    lines;
    static async connect(rollingCodexOptions = {}) {
        const rollingCodex = new RollingCodex(rollingCodexOptions);
        try {
            await rollingCodex.initialize();
            return rollingCodex;
        }
        catch (cause) {
            await rollingCodex.close();
            throw cause;
        }
    }
    constructor({ executable = 'codex', argv = ['app-server', '--listen', 'stdio://'], requestTimeoutMs = 30000, cwd } = {}) {
        super();
        requireProtocol(Number.isSafeInteger(requestTimeoutMs) && requestTimeoutMs > 0, 'invalid request timeout');
        this.requestTimeoutMs = requestTimeoutMs;
        this.childProcess = (0, node_child_process_1.spawn)(executable, argv, { stdio: ['pipe', 'pipe', 'pipe'], cwd });
        this.closed = new Promise(resolve => this.childProcess.once('close', () => resolve()));
        this.childProcess.on('error', cause => this.disconnect(cause));
        this.childProcess.once('close', code => this.disconnect(new Error(`Codex App Server closed (${code})`)));
        this.childProcess.stdin.on('error', cause => this.disconnect(cause));
        this.childProcess.stderr.on('data', (chunk) => this.emit('diagnostic', chunk.toString()));
        this.lines = node_readline_1.default.createInterface({ input: this.childProcess.stdout });
        this.lines.on('line', line => {
            try {
                const message = (0, lossless_json_1.parse)(line);
                this.receive(message);
            }
            catch (cause) {
                this.disconnect(cause);
                this.childProcess.kill();
            }
        });
    }
    disconnect(cause) {
        if (this.failure)
            return;
        this.failure = { cause };
        for (const [id, rollingPendingRequest] of this.pending) {
            clearTimeout(rollingPendingRequest.timer);
            rollingPendingRequest.reject(new RollingUnknownOutcome(id, rollingPendingRequest.method, `Codex ${rollingPendingRequest.method} connection lost; outcome is unknown`, cause));
        }
        this.pending.clear();
        this.emit('disconnected', cause);
    }
    receive(value) {
        const message = nativeRecord(value);
        if (Object.hasOwn(message, 'id') && !Object.hasOwn(message, 'method')) {
            requireProtocol(typeof message.id === 'string', 'invalid response identity');
            const rollingPendingRequest = this.pending.get(message.id);
            if (!rollingPendingRequest) {
                this.emit('lateResponse', message);
                return;
            }
            requireProtocol(Object.hasOwn(message, 'result') || message.error, 'response lacks result or error');
            let rollingNativeRpcError = null;
            if (message.error) {
                const rpcError = nativeRecord(message.error);
                rollingNativeRpcError = new RollingNativeRpcError(message.id, message.error, `Codex ${rollingPendingRequest.method}: ${nativeString(rpcError.message, 'RPC error message')}`);
            }
            this.pending.delete(message.id);
            clearTimeout(rollingPendingRequest.timer);
            if (rollingNativeRpcError)
                rollingPendingRequest.reject(rollingNativeRpcError);
            else
                rollingPendingRequest.resolve(message.result);
            return;
        }
        const method = nativeString(message.method, 'protocol method');
        if (Object.hasOwn(message, 'id')) {
            this.emit('serverRequest', { id: message.id, method, params: message.params });
            return;
        }
        if (method === 'turn/started' || method === 'turn/completed') {
            const params = nativeRecord(message.params);
            const threadId = nativeString(params.threadId, 'turn thread identity');
            const turnId = nativeString(nativeRecord(params.turn).id, 'turn identity');
            if (method === 'turn/started') {
                if (this.activeTurns.has(threadId))
                    this.activeTurns.set(threadId, turnId);
            }
            else {
                this.completedTurns.set(threadId, completedTurn(params.turn));
                if (this.activeTurns.get(threadId) === turnId)
                    this.activeTurns.delete(threadId);
            }
        }
        this.emit('notification', { method, params: message.params });
    }
    send(message) {
        requireProtocol(!this.failure && !this.childProcess.stdin.destroyed, 'connection is closed');
        this.childProcess.stdin.write(`${(0, lossless_json_1.stringify)(message)}\n`);
    }
    request(method, params) {
        requireProtocol(this.ready || method === 'initialize', 'connection must be initialized');
        requireProtocol(!this.failure, 'connection is closed');
        const id = String(++this.sequence);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new RollingUnknownOutcome(id, method, `Codex ${method} response timed out; outcome is unknown`));
            }, this.requestTimeoutMs);
            this.pending.set(id, { method, resolve, reject, timer });
            try {
                this.send({ id, method, params });
            }
            catch (cause) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(cause);
            }
        });
    }
    async initialize() {
        requireProtocol(!this.ready, 'connection is already initialized');
        const result = await this.request('initialize', { clientInfo: { name: 'ponytail_rolling_campaign',
                title: 'Ponytail rolling campaigns', version: package_json_1.version }, capabilities: null });
        this.send({ method: 'initialized', params: {} });
        this.ready = true;
        return result;
    }
    async startThread(cwd, options = {}) {
        checkoutRoot(cwd);
        return threadIdentity(await this.request('thread/start', { ...options, cwd }), cwd);
    }
    async resumeThread(threadId, cwd) {
        checkoutRoot(cwd);
        return threadIdentity(await this.request('thread/resume', { threadId, cwd, excludeTurns: true }), cwd, threadId);
    }
    async readThreadIdentity(threadId, cwd) {
        checkoutRoot(cwd);
        const result = nativeRecord(await this.request('thread/read', { threadId, includeTurns: false }));
        const thread = nativeRecord(result.thread);
        requireProtocol(thread.id === threadId && thread.cwd === cwd, 'observed thread differs from designated actor or checkout');
        return { threadId, sessionId: nativeString(thread.sessionId, 'observed session identity'), rootPath: cwd };
    }
    async startTurn(threadId, prompt) {
        requireProtocol(threadId.length > 0 && prompt.length > 0, 'turn requires thread and prompt');
        requireProtocol(!this.activeTurns.has(threadId), 'thread already has an owned turn');
        this.activeTurns.set(threadId, null);
        try {
            const result = nativeRecord(await this.request('turn/start', { threadId, input: [{ type: 'text', text: prompt, text_elements: [] }] }));
            const turnId = nativeString(nativeRecord(result.turn).id, 'turn identity');
            if (this.completedTurns.get(threadId)?.id !== turnId)
                this.activeTurns.set(threadId, turnId);
            return { turn: { id: turnId } };
        }
        catch (cause) {
            if (cause instanceof RollingNativeRpcError && this.activeTurns.get(threadId) === null)
                this.activeTurns.delete(threadId);
            throw cause;
        }
    }
    interruptTurn(threadId, turnId) { return this.request('turn/interrupt', { threadId, turnId }); }
    async readTurn(threadId, turnId) {
        requireProtocol(threadId.length > 0 && turnId.length > 0, 'turn read requires thread and turn identities');
        let cursor = null;
        const cursors = new Set();
        do {
            const result = nativeRecord(await this.request('thread/turns/list', { threadId, cursor, limit: 50,
                sortDirection: 'desc', itemsView: 'full' }));
            requireProtocol(Array.isArray(result.data), 'turn history lacks data');
            for (const value of result.data) {
                const record = nativeRecord(value);
                if (record.id !== turnId)
                    continue;
                return this.observeNativeTurn(threadId, completedTurn(record));
            }
            requireProtocol(result.nextCursor === undefined || result.nextCursor === null || typeof result.nextCursor === 'string', 'invalid turn history cursor');
            cursor = result.nextCursor ?? null;
            if (cursor !== null) {
                requireProtocol(cursor.length > 0 && !cursors.has(cursor), 'turn history cursor did not advance');
                cursors.add(cursor);
            }
        } while (cursor !== null);
        throw new Error('rolling Codex: assigned turn is absent from native history');
    }
    async readLatestTurn(threadId) {
        const result = nativeRecord(await this.request('thread/turns/list', { threadId, cursor: null, limit: 1, sortDirection: 'desc', itemsView: 'full' }));
        requireProtocol(Array.isArray(result.data) && result.data.length === 1, 'original worker has no observed latest turn');
        return this.observeNativeTurn(threadId, completedTurn(result.data[0]));
    }
    observeNativeTurn(threadId, rollingNativeTurn) {
        if (rollingNativeTurn.status === 'inProgress') {
            const completedRollingNativeTurn = this.completedTurns.get(threadId);
            if (completedRollingNativeTurn?.id === rollingNativeTurn.id)
                return completedRollingNativeTurn;
            if (this.activeTurns.has(threadId))
                this.activeTurns.set(threadId, rollingNativeTurn.id);
        }
        else {
            requireProtocol(['completed', 'failed', 'interrupted'].includes(rollingNativeTurn.status), 'unsupported persisted turn status');
            this.completedTurns.set(threadId, rollingNativeTurn);
            if (this.activeTurns.get(threadId) === rollingNativeTurn.id)
                this.activeTurns.delete(threadId);
        }
        return rollingNativeTurn;
    }
    async readInitializationTurn(threadId) {
        requireProtocol(threadId.length > 0, 'initialization history requires its original thread');
        const result = nativeRecord(await this.request('thread/turns/list', { threadId, cursor: null, limit: 2, sortDirection: 'asc', itemsView: 'full' }));
        requireProtocol(Array.isArray(result.data) && result.data.length === 1
            && (result.nextCursor === null || result.nextCursor === undefined), 'initialization history is absent or ambiguous; preserve original ownership');
        return this.observeNativeTurn(threadId, completedTurn(result.data[0]));
    }
    async readThreadActivity(threadId) {
        const result = nativeRecord(await this.request('thread/read', { threadId, includeTurns: false }));
        const thread = nativeRecord(result.thread);
        requireProtocol(thread.id === threadId, 'native activity differs from requested thread');
        const status = nativeThreadStatus(thread);
        if (status === 'idle' && this.activeTurns.get(threadId) === null)
            this.activeTurns.delete(threadId);
        return { threadId, status };
    }
    async readThreadState(threadId, cwd) {
        checkoutRoot(cwd);
        const thread = nativeRecord(nativeRecord(await this.request('thread/read', { threadId, includeTurns: false })).thread);
        requireProtocol(thread.id === threadId && thread.cwd === cwd, 'observed thread differs from designated actor or checkout');
        requireProtocol(thread.name === null || typeof thread.name === 'string', 'native thread name is unavailable');
        return { threadId, sessionId: nativeString(thread.sessionId, 'observed session identity'), rootPath: cwd, name: thread.name, status: nativeThreadStatus(thread) };
    }
    async setThreadName(threadId, name) {
        requireProtocol(threadId.length > 0 && name.length > 0, 'thread naming requires exact thread and name');
        await this.request('thread/name/set', { threadId, name });
    }
    waitForTurn(threadId, turnId, timeoutMs = 60000) {
        const rollingNativeTurn = this.completedTurns.get(threadId);
        if (rollingNativeTurn?.id === turnId)
            return Promise.resolve(rollingNativeTurn);
        requireProtocol(!this.failure && Number.isSafeInteger(timeoutMs) && timeoutMs > 0, 'invalid observation or closed connection');
        return new Promise((resolve, reject) => {
            const cleanup = () => { clearTimeout(timer); this.off('notification', notification); this.off('disconnected', disconnected); };
            const notification = (rollingNativeNotification) => {
                if (rollingNativeNotification.method !== 'turn/completed')
                    return;
                const params = nativeRecord(rollingNativeNotification.params);
                const completed = this.completedTurns.get(threadId);
                if (params.threadId === threadId && completed?.id === turnId) {
                    cleanup();
                    resolve(completed);
                }
            };
            const disconnected = (cause) => { cleanup(); reject(cause); };
            const timer = setTimeout(() => { cleanup(); reject(new RollingObservationTimeout()); }, timeoutMs);
            this.on('notification', notification);
            this.on('disconnected', disconnected);
        });
    }
    respondToServer(id, result) { this.send({ id, result }); }
    async archiveThread(threadId) {
        const result = await this.request('thread/archive', { threadId });
        this.completedTurns.delete(threadId);
        return result;
    }
    async isThreadArchived(threadId, rootPath) {
        requireProtocol(threadId.length > 0 && node_path_1.default.isAbsolute(rootPath) && node_fs_1.default.realpathSync(rootPath) === rootPath, 'archive observation requires its original actor and physical checkout');
        let cursor = null;
        const cursors = new Set();
        for (;;) {
            const result = nativeRecord(await this.request('thread/list', { archived: true, cwd: rootPath, sourceKinds: ['cli', 'vscode', 'exec', 'appServer', 'subAgent', 'subAgentReview', 'subAgentCompact', 'subAgentThreadSpawn', 'subAgentOther', 'unknown'], cursor, limit: 100 }));
            requireProtocol(Array.isArray(result.data), 'archive inventory is not a page');
            for (const value of result.data) {
                const thread = nativeRecord(value);
                requireProtocol(nativeString(thread.cwd, 'archived checkout') === rootPath, 'archive inventory escaped the assigned checkout');
                if (nativeString(thread.id, 'archived actor') === threadId)
                    return true;
            }
            if (result.nextCursor === null)
                return false;
            cursor = nativeString(result.nextCursor, 'archive inventory cursor');
            requireProtocol(!cursors.has(cursor), 'archive inventory cursor repeated');
            cursors.add(cursor);
        }
    }
    async interruptOwnedTurns() {
        for (const [threadId, turnId] of [...this.activeTurns]) {
            requireProtocol(turnId !== null, 'active native turn identity is unknown; retain the original session');
            await this.interruptTurn(threadId, turnId);
            await this.waitForTurn(threadId, turnId);
        }
    }
    async waitForObservedTurns(timeoutMs) {
        for (const [threadId, turnId] of [...this.activeTurns]) {
            requireProtocol(turnId !== null, 'active native turn identity is unknown; retain the original session');
            await this.waitForTurn(threadId, turnId, timeoutMs);
        }
    }
    async close() {
        requireProtocol(this.failure || this.activeTurns.size === 0, `interrupt and observe terminal turns before closing the owned App Server; unresolved activity ${JSON.stringify([...this.activeTurns])}`);
        this.childProcess.stdin.end();
        this.childProcess.kill('SIGTERM');
        await this.closed;
        this.lines.close();
    }
}
exports.RollingCodex = RollingCodex;
