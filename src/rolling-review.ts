// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { parse } from 'lossless-json';
import { RollingCodex, type RollingNativeThread, type RollingTurnStarted, type RollingNativeTurn } from './rolling-codex.js';

export interface RollingReviewRequestV1 {
 readonly schemaVersion: 1;
 readonly id: string;
 readonly campaignId: string;
 readonly assignmentId: string;
 readonly generation: string;
 readonly baseCommit: string;
 readonly revision: string;
 readonly reviewerSessionId: string;
}
interface RollingReviewOutcomeIdentityV1 {
 readonly schemaVersion: 1;
 readonly reviewId: string;
 readonly revision: string;
 readonly reviewerSessionId: string;
 readonly completedAt: string;
}
export interface RollingReviewAcceptedV1 extends RollingReviewOutcomeIdentityV1 {
 readonly decision: 'accepted';
 readonly findings: readonly string[];
}
export interface RollingReviewRejectedV1 extends RollingReviewOutcomeIdentityV1 {
 readonly decision: 'rejected';
 readonly findings: readonly [string, ...string[]];
}
// Discriminator: decision
export type RollingReviewOutcomeV1 = RollingReviewAcceptedV1 | RollingReviewRejectedV1;
export interface RollingStoredReview { readonly request: RollingReviewRequestV1; readonly outcome: RollingReviewOutcomeV1 | null }
function requireReview(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(`rolling review: ${message}`);
}
function isRecord(value: unknown): value is Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function fields(value: unknown, names: readonly string[]): Record<string, unknown> {
 requireReview(isRecord(value), 'contract must be an object');
 requireReview(Object.keys(value).sort().join('\0') === [...names].sort().join('\0'), 'invalid contract fields');
 requireReview(value.schemaVersion === 1, 'unsupported physical version');
 return value;
}
function identity(value: unknown): string {
 requireReview(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\0\r\n]/u.test(value), 'invalid identity');
 return value;
}
function revision(value: unknown): string {
 requireReview(typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value), 'invalid commit revision');
 return value;
}
function strings(value: unknown): readonly string[] {
 requireReview(Array.isArray(value), 'findings must be an array');
 return value.map((item: unknown) => identity(item));
}
function json(text: string): unknown {
 return parse(text, null, token => {
  requireReview(/^(0|[1-9][0-9]*)$/u.test(token), 'unsupported numeric token');
  const number = Number(token);
  requireReview(Number.isSafeInteger(number), 'numeric token exceeds safe range');
  return number;
 });
}

// Traceability: implements REQ-ROLLING-REVIEW
export function readRollingReviewRequestV1(value: unknown): RollingReviewRequestV1 {
 const record = fields(value, ['schemaVersion','id','campaignId','assignmentId','generation','baseCommit','revision','reviewerSessionId']);
 return { schemaVersion: 1, id: identity(record.id), campaignId: identity(record.campaignId), assignmentId: identity(record.assignmentId),
  generation: identity(record.generation), baseCommit: revision(record.baseCommit), revision: revision(record.revision), reviewerSessionId: identity(record.reviewerSessionId) };
}
export function readRollingReviewOutcomeV1(value: unknown): RollingReviewOutcomeV1 {
 const record = fields(value, ['schemaVersion','reviewId','revision','reviewerSessionId','completedAt','decision','findings']);
 const completedAt = identity(record.completedAt);
 requireReview(/^\d{4}-\d{2}-\d{2}T/u.test(completedAt) && Number.isFinite(Date.parse(completedAt)), 'invalid completion timestamp');
 const rollingReviewOutcomeIdentityV1: RollingReviewOutcomeIdentityV1 = { schemaVersion: 1, reviewId: identity(record.reviewId), revision: revision(record.revision),
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
export const RollingReviewRequestReaders = { V1: readRollingReviewRequestV1 };
export const RollingReviewOutcomeReaders = { V1: readRollingReviewOutcomeV1 };
export function parseRollingReviewRequest(text: string): RollingReviewRequestV1 { return readRollingReviewRequestV1(json(text)); }
export function parseRollingReviewOutcome(text: string): RollingReviewOutcomeV1 { return readRollingReviewOutcomeV1(json(text)); }
export function validateRollingReviewOutcome(rollingReviewRequestV1: RollingReviewRequestV1, rollingReviewOutcomeV1: RollingReviewOutcomeV1): void {
 requireReview(rollingReviewOutcomeV1.reviewId === rollingReviewRequestV1.id
  && rollingReviewOutcomeV1.revision === rollingReviewRequestV1.revision
  && rollingReviewOutcomeV1.reviewerSessionId === rollingReviewRequestV1.reviewerSessionId, 'outcome differs from assigned candidate or reviewer');
}

export interface RollingReviewTurn {
 readonly request: RollingReviewRequestV1;
 readonly thread: RollingNativeThread;
 readonly started: RollingTurnStarted;
}

// Traceability: implements REQ-ROLLING-REVIEW
export async function startRollingReviewTurn(rollingCodex: RollingCodex, rollingReviewRequestV1: RollingReviewRequestV1,
 reviewerThreadId: string, checkoutRoot: string): Promise<RollingReviewTurn> {
 const checkedRollingReviewRequestV1 = readRollingReviewRequestV1(rollingReviewRequestV1);
 const rollingNativeThread = await rollingCodex.resumeThread(reviewerThreadId, checkoutRoot);
 requireReview(rollingNativeThread.thread.sessionId === checkedRollingReviewRequestV1.reviewerSessionId, 'native session differs from assigned reviewer');
 const prompt = `Perform an adversarial review of this exact candidate. Read the project rules and applicable skills first.
Review only: do not modify files, commits, branches or project state. Verify HEAD is ${checkedRollingReviewRequestV1.revision}; if it differs, report that the review cannot be completed.
Inspect the complete change from ${checkedRollingReviewRequestV1.baseCommit} to ${checkedRollingReviewRequestV1.revision}, its approved obligation, requirements, acceptances, tests and retained proof. Seek correctness, regression, traceability and contract failures.
Return your final message as a single JSON object without Markdown. Use schemaVersion 1, reviewId ${JSON.stringify(checkedRollingReviewRequestV1.id)}, revision ${JSON.stringify(checkedRollingReviewRequestV1.revision)}, reviewerSessionId ${JSON.stringify(checkedRollingReviewRequestV1.reviewerSessionId)}, completedAt as the current ISO timestamp, decision "accepted" or "rejected", and findings as an array of concrete findings. Rejection requires at least one finding. Never report acceptance without completing the review.
Review request: ${JSON.stringify(checkedRollingReviewRequestV1)}`;
 const rollingTurnStarted = await rollingCodex.startTurn(rollingNativeThread.thread.id, prompt);
 return { request: checkedRollingReviewRequestV1, thread: rollingNativeThread, started: rollingTurnStarted };
}

export function readRollingReviewTurn(rollingReviewTurn: RollingReviewTurn, rollingNativeTurn: RollingNativeTurn): RollingReviewOutcomeV1 {
 requireReview(rollingReviewTurn.thread.thread.sessionId === rollingReviewTurn.request.reviewerSessionId, 'native session differs from assigned reviewer');
 requireReview(rollingNativeTurn.id === rollingReviewTurn.started.turn.id && rollingNativeTurn.status === 'completed', 'review turn is not the assigned completed turn');
 const message = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1);
 requireReview(message?.text !== undefined && message.text !== null, 'completed review lacks a final decision');
 const rollingReviewOutcomeV1 = parseRollingReviewOutcome(message.text);
 validateRollingReviewOutcome(rollingReviewTurn.request, rollingReviewOutcomeV1);
 return rollingReviewOutcomeV1;
}

export async function observeRollingReviewTurn(rollingCodex: RollingCodex, rollingReviewTurn: RollingReviewTurn,
 timeoutMs = 60000): Promise<RollingReviewOutcomeV1> {
 const rollingNativeTurn = await rollingCodex.waitForTurn(rollingReviewTurn.thread.thread.id, rollingReviewTurn.started.turn.id, timeoutMs);
 return readRollingReviewTurn(rollingReviewTurn, rollingNativeTurn);
}
