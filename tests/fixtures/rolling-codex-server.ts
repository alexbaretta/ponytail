// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { parseRollingWorkerCreation } from '../../src/rolling-worker.js';
import { parseRollingReviewRequest, type RollingReviewOutcomeV1 } from '../../src/rolling-review.js';
import type { RollingNativeTurn } from '../../src/rolling-codex.js';

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
const turns = new Map<string, RollingNativeTurn>();
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
    if (method === 'thread/resume' && turnCount === 0) {
      send({ id: message.id, error: { code: -32600, message: 'no rollout found before the first turn' } }); return;
    }
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
    turns.set(turnId, { id: turnId, status: prompt === 'pending' ? 'inProgress' : prompt, items: [] });
    result = { turn: { id: turnId } };
    send({ method: 'turn/started', params: { threadId: params.threadId, turn: { id: turnId } } });
    if (prompt.startsWith('Initialize this Ponytail worker')) {
      const marker = 'Worker attachment: ';
      const rollingWorkerCreationV1 = parseRollingWorkerCreation(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
      fs.writeFileSync(path.join(rollingWorkerCreationV1.rootPath, 'session_id.txt'), `${rollingWorkerCreationV1.sessionId}\n`, {flag:'wx'});
      const rollingNativeTurn: RollingNativeTurn = {id:turnId,status:'completed',items:[]};
      turns.set(turnId,rollingNativeTurn);
      send({method:'turn/completed',params:{threadId:params.threadId,turn:rollingNativeTurn}});
    } else if (prompt.startsWith('Perform an adversarial review')) {
      const marker = 'Review request: ';
      const rollingReviewRequestV1 = parseRollingReviewRequest(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
      const rollingReviewOutcomeV1: RollingReviewOutcomeV1 = { schemaVersion: 1, reviewId: rollingReviewRequestV1.id,
        revision: rollingReviewRequestV1.revision, reviewerSessionId: rollingReviewRequestV1.reviewerSessionId,
        completedAt: '2026-10-11T10:00:00Z', decision: 'accepted', findings: [] };
      const rollingNativeTurn: RollingNativeTurn = { id: turnId, status: 'completed',
        items: [{ type: 'agentMessage', text: 'Review in progress.' }, { type: 'agentMessage', text: JSON.stringify(rollingReviewOutcomeV1) }] };
      turns.set(turnId, rollingNativeTurn);
      send({ method: 'turn/completed', params: { threadId: params.threadId, turn: rollingNativeTurn } });
    } else if (prompt !== 'pending') send({ method: 'turn/completed', params: {
      threadId: params.threadId, turn: { id: turnId, status: prompt, items: [] }
    } });
  } else if (method === 'turn/interrupt') {
    const turnId = text(params.turnId);
    turns.set(turnId, { id: turnId, status: 'interrupted', items: [] });
    send({ method: 'turn/completed', params: {
      threadId: params.threadId, turn: { id: params.turnId, status: 'interrupted', items: [] }
    } });
  } else if (method === 'thread/turns/list') {
    const history = [...turns.values()].reverse();
    const offset = params.cursor === null ? 0 : Number(text(params.cursor));
    result = { data: history.slice(offset, offset + 1), nextCursor: offset + 1 < history.length ? String(offset + 1) : null };
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
