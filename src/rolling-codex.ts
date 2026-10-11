// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { parse, stringify } from 'lossless-json';
import { version } from '../package.json';

export interface RollingCodexOptions {
  readonly executable?: string;
  readonly argv?: readonly string[];
  readonly requestTimeoutMs?: number;
}

export interface RollingNativeThread {
  readonly thread: { readonly id: string; readonly sessionId: string };
  readonly cwd: string;
  readonly instructionSources: readonly string[];
  readonly model: string | null;
}

export interface RollingNativeThreadActivity {
  readonly threadId: string;
  readonly status: 'idle' | 'active' | 'notLoaded' | 'systemError';
}

export interface RollingNativeItem {
  readonly type: string;
  readonly text: string | null;
}

export interface RollingNativeTurn {
  readonly id: string;
  readonly status: string;
  readonly items: readonly RollingNativeItem[];
}

export interface RollingTurnStarted {
  readonly turn: { readonly id: string };
}

export interface RollingNativeNotification {
  readonly method: string;
  readonly params: unknown;
}

export interface RollingNativeServerRequest {
  readonly id: unknown;
  readonly method: string;
  readonly params: unknown;
}

interface RollingCodexEvents {
  diagnostic: [message: string];
  disconnected: [cause: unknown];
  lateResponse: [response: Readonly<Record<string, unknown>>];
  serverRequest: [request: RollingNativeServerRequest];
  notification: [notification: RollingNativeNotification];
}

interface RollingPendingRequest {
  readonly method: string;
  readonly resolve: (result: unknown) => void;
  readonly reject: (cause: unknown) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export class RollingUnknownOutcome extends Error {
  readonly code = 'UNKNOWN_OUTCOME';
  constructor(readonly requestId: string, readonly method: string, message: string, cause?: unknown) {
    super(message, { cause });
  }
}

export class RollingObservationTimeout extends Error {
  readonly code = 'OBSERVATION_TIMEOUT';
  constructor() { super('turn observation timed out; native activity is not known to be stopped'); }
}

export class RollingNativeResponseError extends Error {
  constructor(message: string, readonly nativeResult: unknown) { super(message); }
}

export class RollingNativeRpcError extends Error {
  constructor(readonly requestId: string, readonly rpcError: unknown, message: string) { super(message); }
}

function requireProtocol(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`rolling Codex: ${message}`);
}

function isNativeRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nativeRecord(value: unknown): Record<string, unknown> {
  requireProtocol(isNativeRecord(value), 'invalid protocol record');
  return value;
}

function nativeString(value: unknown, label: string): string {
  requireProtocol(typeof value === 'string' && value.length > 0, `invalid ${label}`);
  return value;
}

function checkoutRoot(cwd: string): void {
  requireProtocol(path.isAbsolute(cwd) && fs.statSync(cwd).isDirectory() && fs.realpathSync(cwd) === cwd,
    'cwd must be an existing physical absolute directory');
}

function threadIdentity(value: unknown, cwd: string, expectedId: string | null = null): RollingNativeThread {
  try {
    const result = nativeRecord(value);
    const thread = nativeRecord(result.thread);
    const id = nativeString(thread.id, 'thread identity');
    const sessionId = nativeString(thread.sessionId, 'session identity');
    requireProtocol(result.cwd === cwd && (expectedId === null || id === expectedId),
      'native response differs from designated checkout or thread');
    requireProtocol(Array.isArray(result.instructionSources), 'native response lacks instruction provenance');
    const instructionSources: string[] = result.instructionSources.map((item: unknown) => nativeString(item, 'instruction source'));
    requireProtocol(result.model === undefined || typeof result.model === 'string', 'invalid native model');
    return { thread: { id, sessionId }, cwd, instructionSources, model: result.model ?? null };
  } catch (cause) {
    throw new RollingNativeResponseError(cause instanceof Error ? cause.message : 'invalid native thread response', value);
  }
}

function completedTurn(value: unknown): RollingNativeTurn {
  const turn = nativeRecord(value);
  const id = nativeString(turn.id, 'completed turn identity');
  const status = nativeString(turn.status, 'completed turn status');
  requireProtocol(Array.isArray(turn.items), 'completed turn lacks items');
  const items: RollingNativeItem[] = turn.items.map((value: unknown) => {
    const item = nativeRecord(value);
    const type = nativeString(item.type, 'item type');
    return { type, text: type === 'agentMessage' ? nativeString(item.text, 'agent message text') : null };
  });
  return { id, status, items };
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-PONYTAIL-STATIC-LANGUAGE
export class RollingCodex extends EventEmitter<RollingCodexEvents> {
  requestTimeoutMs: number;
  private sequence = 0;
  private readonly pending = new Map<string, RollingPendingRequest>();
  private readonly completedTurns = new Map<string, RollingNativeTurn>();
  private readonly activeTurns = new Map<string, string | null>();
  private ready = false;
  private failure: { readonly cause: unknown } | null = null;
  private readonly childProcess: ChildProcessWithoutNullStreams;
  private readonly closed: Promise<void>;
  private readonly lines: readline.Interface;

  static async connect(rollingCodexOptions: RollingCodexOptions = {}): Promise<RollingCodex> {
    const rollingCodex = new RollingCodex(rollingCodexOptions);
    try { await rollingCodex.initialize(); return rollingCodex; }
    catch (cause) { await rollingCodex.close(); throw cause; }
  }

  constructor({ executable = 'codex', argv = ['app-server', '--listen', 'stdio://'], requestTimeoutMs = 30000 }: RollingCodexOptions = {}) {
    super();
    requireProtocol(Number.isSafeInteger(requestTimeoutMs) && requestTimeoutMs > 0, 'invalid request timeout');
    this.requestTimeoutMs = requestTimeoutMs;
    this.childProcess = spawn(executable, argv, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.closed = new Promise(resolve => this.childProcess.once('close', () => resolve()));
    this.childProcess.on('error', cause => this.disconnect(cause));
    this.childProcess.once('close', code => this.disconnect(new Error(`Codex App Server closed (${code})`)));
    this.childProcess.stdin.on('error', cause => this.disconnect(cause));
    this.childProcess.stderr.on('data', (chunk: Buffer) => this.emit('diagnostic', chunk.toString()));
    this.lines = readline.createInterface({ input: this.childProcess.stdout });
    this.lines.on('line', line => {
      try { const message: unknown = parse(line); this.receive(message); }
      catch (cause) { this.disconnect(cause); this.childProcess.kill(); }
    });
  }

  private disconnect(cause: unknown): void {
    if (this.failure) return;
    this.failure = { cause };
    for (const [id, rollingPendingRequest] of this.pending) {
      clearTimeout(rollingPendingRequest.timer);
      rollingPendingRequest.reject(new RollingUnknownOutcome(id, rollingPendingRequest.method,
        `Codex ${rollingPendingRequest.method} connection lost; outcome is unknown`, cause));
    }
    this.pending.clear();
    this.emit('disconnected', cause);
  }

  private receive(value: unknown): void {
    const message = nativeRecord(value);
    if (Object.hasOwn(message, 'id') && !Object.hasOwn(message, 'method')) {
      requireProtocol(typeof message.id === 'string', 'invalid response identity');
      const rollingPendingRequest = this.pending.get(message.id);
      if (!rollingPendingRequest) { this.emit('lateResponse', message); return; }
      requireProtocol(Object.hasOwn(message, 'result') || message.error, 'response lacks result or error');
      let rollingNativeRpcError: RollingNativeRpcError | null = null;
      if (message.error) {
        const rpcError = nativeRecord(message.error);
        rollingNativeRpcError = new RollingNativeRpcError(message.id, message.error,
          `Codex ${rollingPendingRequest.method}: ${nativeString(rpcError.message, 'RPC error message')}`);
      }
      this.pending.delete(message.id);
      clearTimeout(rollingPendingRequest.timer);
      if (rollingNativeRpcError) rollingPendingRequest.reject(rollingNativeRpcError);
      else rollingPendingRequest.resolve(message.result);
      return;
    }
    const method = nativeString(message.method, 'protocol method');
    if (Object.hasOwn(message, 'id')) {
      this.emit('serverRequest', { id: message.id, method, params: message.params }); return;
    }
    if (method === 'turn/started' || method === 'turn/completed') {
      const params = nativeRecord(message.params);
      const threadId = nativeString(params.threadId, 'turn thread identity');
      const turnId = nativeString(nativeRecord(params.turn).id, 'turn identity');
      if (method === 'turn/started') this.activeTurns.set(threadId, turnId);
      else {
        this.completedTurns.set(threadId, completedTurn(params.turn));
        if (this.activeTurns.get(threadId) === turnId) this.activeTurns.delete(threadId);
      }
    }
    this.emit('notification', { method, params: message.params });
  }

  private send(message: unknown): void {
    requireProtocol(!this.failure && !this.childProcess.stdin.destroyed, 'connection is closed');
    this.childProcess.stdin.write(`${stringify(message)}\n`);
  }

  request(method: string, params: unknown): Promise<unknown> {
    requireProtocol(this.ready || method === 'initialize', 'connection must be initialized');
    requireProtocol(!this.failure, 'connection is closed');
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RollingUnknownOutcome(id, method, `Codex ${method} response timed out; outcome is unknown`));
      }, this.requestTimeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      try { this.send({ id, method, params }); }
      catch (cause) { clearTimeout(timer); this.pending.delete(id); reject(cause); }
    });
  }

  async initialize(): Promise<unknown> {
    requireProtocol(!this.ready, 'connection is already initialized');
    const result = await this.request('initialize', { clientInfo: { name: 'ponytail_rolling_campaign',
      title: 'Ponytail rolling campaigns', version }, capabilities: null });
    this.send({ method: 'initialized', params: {} });
    this.ready = true;
    return result;
  }

  async startThread(cwd: string, options: Readonly<Record<string, unknown>> = {}): Promise<RollingNativeThread> {
    checkoutRoot(cwd);
    return threadIdentity(await this.request('thread/start', { ...options, cwd }), cwd);
  }

  async resumeThread(threadId: string, cwd: string): Promise<RollingNativeThread> {
    checkoutRoot(cwd);
    return threadIdentity(await this.request('thread/resume', { threadId, cwd, excludeTurns: true }), cwd, threadId);
  }

  async startTurn(threadId: string, prompt: string): Promise<RollingTurnStarted> {
    requireProtocol(threadId.length > 0 && prompt.length > 0, 'turn requires thread and prompt');
    const result = nativeRecord(await this.request('turn/start', { threadId, input: [{ type: 'text', text: prompt, text_elements: [] }] }));
    const turnId = nativeString(nativeRecord(result.turn).id, 'turn identity');
    if (this.completedTurns.get(threadId)?.id !== turnId) this.activeTurns.set(threadId, turnId);
    return { turn: { id: turnId } };
  }

  interruptTurn(threadId: string, turnId: string): Promise<unknown> { return this.request('turn/interrupt', { threadId, turnId }); }

  async readTurn(threadId: string, turnId: string): Promise<RollingNativeTurn> {
    requireProtocol(threadId.length > 0 && turnId.length > 0, 'turn read requires thread and turn identities');
    let cursor: string | null = null;
    const cursors = new Set<string>();
    do {
      const result = nativeRecord(await this.request('thread/turns/list', { threadId, cursor, limit: 50,
        sortDirection: 'desc', itemsView: 'full' }));
      requireProtocol(Array.isArray(result.data), 'turn history lacks data');
      for (const value of result.data) {
        const record = nativeRecord(value);
        if (record.id !== turnId) continue;
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

  private observeNativeTurn(threadId:string,rollingNativeTurn:RollingNativeTurn):RollingNativeTurn {
    if (rollingNativeTurn.status === 'inProgress') {
      const completedRollingNativeTurn = this.completedTurns.get(threadId);
      if (completedRollingNativeTurn?.id === rollingNativeTurn.id) return completedRollingNativeTurn;
      this.activeTurns.set(threadId,rollingNativeTurn.id);
    }
    else {
      requireProtocol(['completed','failed','interrupted'].includes(rollingNativeTurn.status),'unsupported persisted turn status');
      this.completedTurns.set(threadId,rollingNativeTurn);
      if (this.activeTurns.get(threadId) === rollingNativeTurn.id) this.activeTurns.delete(threadId);
    }
    return rollingNativeTurn;
  }

  async readInitializationTurn(threadId:string):Promise<RollingNativeTurn> {
    requireProtocol(threadId.length > 0,'initialization history requires its original thread');
    const result = nativeRecord(await this.request('thread/turns/list',{threadId,cursor:null,limit:2,sortDirection:'asc',itemsView:'full'}));
    requireProtocol(Array.isArray(result.data) && result.data.length === 1
      && (result.nextCursor === null || result.nextCursor === undefined),'initialization history is absent or ambiguous; preserve original ownership');
    return this.observeNativeTurn(threadId,completedTurn(result.data[0]));
  }

  async readThreadActivity(threadId: string): Promise<RollingNativeThreadActivity> {
    const result = nativeRecord(await this.request('thread/read', {threadId,includeTurns:false}));
    const thread = nativeRecord(result.thread);
    requireProtocol(thread.id === threadId,'native activity differs from requested thread');
    const status = nativeString(nativeRecord(thread.status).type,'native thread activity');
    switch (status) {
      case 'active':
        if (!this.activeTurns.has(threadId)) this.activeTurns.set(threadId,null);
        return {threadId,status};
      case 'idle':
        if (this.activeTurns.get(threadId) === null) this.activeTurns.delete(threadId);
        return {threadId,status};
      case 'notLoaded': case 'systemError': return {threadId,status};
      default: throw new Error('rolling Codex: unsupported native thread activity');
    }
  }

  waitForTurn(threadId: string, turnId: string, timeoutMs = 60000): Promise<RollingNativeTurn> {
    const rollingNativeTurn = this.completedTurns.get(threadId);
    if (rollingNativeTurn?.id === turnId) return Promise.resolve(rollingNativeTurn);
    requireProtocol(!this.failure && Number.isSafeInteger(timeoutMs) && timeoutMs > 0, 'invalid observation or closed connection');
    return new Promise((resolve, reject) => {
      const cleanup = (): void => { clearTimeout(timer); this.off('notification', notification); this.off('disconnected', disconnected); };
      const notification = (rollingNativeNotification: RollingNativeNotification): void => {
        if (rollingNativeNotification.method !== 'turn/completed') return;
        const params = nativeRecord(rollingNativeNotification.params);
        const completed = this.completedTurns.get(threadId);
        if (params.threadId === threadId && completed?.id === turnId) { cleanup(); resolve(completed); }
      };
      const disconnected = (cause: unknown): void => { cleanup(); reject(cause); };
      const timer = setTimeout(() => { cleanup(); reject(new RollingObservationTimeout()); }, timeoutMs);
      this.on('notification', notification); this.on('disconnected', disconnected);
    });
  }

  respondToServer(id: unknown, result: unknown): void { this.send({ id, result }); }

  async archiveThread(threadId: string): Promise<unknown> {
    const result = await this.request('thread/archive', { threadId });
    this.completedTurns.delete(threadId);
    return result;
  }

  async close(): Promise<void> {
    requireProtocol(this.failure || this.activeTurns.size === 0, `interrupt and observe terminal turns before closing the owned App Server; unresolved activity ${JSON.stringify([...this.activeTurns])}`);
    this.childProcess.stdin.end();
    this.childProcess.kill('SIGTERM');
    await this.closed;
    this.lines.close();
  }
}
