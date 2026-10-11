// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import readline from 'node:readline';

interface FixtureThreadResult {
  readonly thread: { readonly id: string; readonly sessionId: string };
  readonly cwd: string;
  readonly instructionSources: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('fixture expected a protocol record');
  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('fixture expected a string');
  return value;
}

function send(value: unknown): void { process.stdout.write(`${JSON.stringify(value)}\n`); }

const lines = readline.createInterface({ input: process.stdin });
let initialized = false;
let turnCount = 0;
lines.on('line', line => {
  const parsed: unknown = JSON.parse(line);
  const message = record(parsed);
  if (message.method === 'initialized') { initialized = true; return; }
  if (!message.method) { send({ method: 'approval/answered', params: message.result }); return; }
  const method = text(message.method);
  const params = record(message.params);
  let result: unknown = {};
  if (method === 'initialize') result = { userAgent: 'fixture' };
  else if (!initialized) throw new Error('handshake missing');
  else if (method === 'thread/start' || method === 'thread/resume') {
    const cwd = text(params.cwd);
    const fixtureThreadResult: FixtureThreadResult = {
      thread: { id: 'thread-fixture', sessionId: 'session-fixture' }, cwd,
      instructionSources: [`${cwd}/AGENTS.md`]
    };
    result = fixtureThreadResult;
  } else if (method === 'turn/start') {
    const turnId = `turn-${++turnCount}`;
    if (!Array.isArray(params.input)) throw new Error('missing turn input');
    const prompt = text(record(params.input[0]).text);
    result = { turn: { id: turnId } };
    send({ method: 'turn/started', params: { threadId: params.threadId, turn: { id: turnId } } });
    if (prompt !== 'pending') send({ method: 'turn/completed', params: {
      threadId: params.threadId, turn: { id: turnId, status: prompt, items: [] }
    } });
  } else if (method === 'turn/interrupt') {
    send({ method: 'turn/completed', params: {
      threadId: params.threadId, turn: { id: params.turnId, status: 'interrupted', items: [] }
    } });
  } else if (method === 'approval') {
    send({ id: 'approval-id', method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-fixture' } });
  } else if (method === 'explode') {
    send({ id: message.id, error: { code: -32603, message: 'fixture failure' } }); return;
  } else if (method === 'unsafe-number') {
    process.stdout.write(`{"id":${JSON.stringify(text(message.id))},"result":{"value":9007199254740993}}\n`); return;
  } else if (method === 'late') {
    setTimeout(() => send({ id: message.id, result: {} }), 100); return;
  } else if (method === 'drop') {
    process.exit(0);
  } else if (method === 'malformed') {
    send({ id: message.id }); return;
  }
  send({ id: message.id, result });
});
