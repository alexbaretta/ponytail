// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { parse } from 'lossless-json';
import { RollingCodex, type RollingNativeThread, type RollingTurnStarted, type RollingNativeTurn } from './rolling-codex.js';
import type { RollingCampaignStore, RollingReviewDispatchAttached } from './rolling-campaign-store.js';

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
export interface RollingReviewReplacementV1 {
 readonly schemaVersion: 1;
 readonly reviewId: string;
 readonly replacementReviewId: string;
 readonly previousReviewerSessionId: string;
 readonly reviewerSessionId: string;
 readonly recordedAt: string;
 readonly lossReference: string;
}
export interface RollingReviewerLoss { readonly reviewId: string; readonly lossReference: string }
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
// Traceability: implements REQ-ROLLING-REVIEW
export function readRollingReviewReplacementV1(value: unknown): RollingReviewReplacementV1 {
 const record = fields(value, ['schemaVersion','reviewId','replacementReviewId','previousReviewerSessionId','reviewerSessionId','recordedAt','lossReference']);
 const rollingReviewReplacementV1: RollingReviewReplacementV1 = { schemaVersion: 1,
  reviewId: identity(record.reviewId), replacementReviewId: identity(record.replacementReviewId),
  previousReviewerSessionId: identity(record.previousReviewerSessionId), reviewerSessionId: identity(record.reviewerSessionId),
  recordedAt: identity(record.recordedAt), lossReference: identity(record.lossReference) };
 requireReview(rollingReviewReplacementV1.reviewId !== rollingReviewReplacementV1.replacementReviewId, 'replacement requires a fresh review identity');
 requireReview(rollingReviewReplacementV1.previousReviewerSessionId !== rollingReviewReplacementV1.reviewerSessionId, 'replacement requires a different reviewer');
 requireReview(/^\d{4}-\d{2}-\d{2}T/u.test(rollingReviewReplacementV1.recordedAt) && Number.isFinite(Date.parse(rollingReviewReplacementV1.recordedAt)), 'invalid replacement timestamp');
 return rollingReviewReplacementV1;
}
export const RollingReviewReplacementReaders = { V1: readRollingReviewReplacementV1 };
export function parseRollingReviewReplacement(text: string): RollingReviewReplacementV1 { return readRollingReviewReplacementV1(json(text)); }
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
 rollingNativeThread: RollingNativeThread, checkoutRoot: string, instructions: string): Promise<RollingReviewTurn> {
 requireReview(instructions.trim().length > 0, 'review requires authoritative scope instructions');
 const checkedRollingReviewRequestV1 = readRollingReviewRequestV1(rollingReviewRequestV1);
 requireReview(rollingNativeThread.cwd === checkoutRoot, 'native reviewer differs from designated checkout');
 requireReview(rollingNativeThread.thread.sessionId === checkedRollingReviewRequestV1.reviewerSessionId, 'native session differs from assigned reviewer');
 const rollingReviewRejectedV1: RollingReviewRejectedV1 = { schemaVersion: 1, reviewId: checkedRollingReviewRequestV1.id,
  revision: checkedRollingReviewRequestV1.revision, reviewerSessionId: checkedRollingReviewRequestV1.reviewerSessionId,
  completedAt: new Date().toISOString(), decision: 'rejected', findings: ['path/to/source.ts:1: Explain the defect and required correction in one line.'] };
 const prompt = `Perform an adversarial review of this exact candidate. Read the project rules and applicable skills first.
Review only: do not modify files, commits, branches or project state. Verify HEAD is ${checkedRollingReviewRequestV1.revision}; if it differs, report that the review cannot be completed.
Inspect the complete change from ${checkedRollingReviewRequestV1.baseCommit} to ${checkedRollingReviewRequestV1.revision}, its approved obligation, requirements, acceptances, tests and retained proof. Seek correctness, regression, traceability and contract failures.
Coordinator scope and retained evidence: ${instructions}
Return your final message as a single JSON object without Markdown. Use schemaVersion 1, reviewId ${JSON.stringify(checkedRollingReviewRequestV1.id)}, revision ${JSON.stringify(checkedRollingReviewRequestV1.revision)}, reviewerSessionId ${JSON.stringify(checkedRollingReviewRequestV1.reviewerSessionId)}, completedAt as the actual completion ISO timestamp, decision "accepted" or "rejected", and findings as an array of strings, never objects. Each finding string must be nonempty, trimmed, and a single line without NUL, CR or LF. Include the source path, line, defect and required correction in that string. Rejection requires at least one finding; acceptance may use an empty array. Never report acceptance without completing the review.
Output format example only, not an assessment: ${JSON.stringify(rollingReviewRejectedV1)}
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

// Traceability: implements REQ-ROLLING-REVIEW
export async function dispatchRollingReview(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, reviewId: string, rollingNativeThread: RollingNativeThread): Promise<RollingReviewDispatchAttached> {
 const rollingReviewContext = await rollingCampaignStore.reviewContext(campaignId, reviewId);
 requireReview(rollingReviewContext.review.outcome === null, 'review is already decided');
 const rollingReviewDispatchStarted = await rollingCampaignStore.claimReviewDispatch(campaignId, reviewId, rollingNativeThread.thread.id);
 const rollingReviewTurn = await startRollingReviewTurn(rollingCodex, rollingReviewContext.review.request, rollingNativeThread, rollingReviewContext.rootPath,
  JSON.stringify({ obligation: rollingReviewContext.obligation, binding: rollingReviewContext.binding, submission: rollingReviewContext.submission }));
 return rollingCampaignStore.attachReviewDispatch(campaignId, reviewId, rollingReviewDispatchStarted.id,
  rollingReviewTurn.thread.thread.sessionId, rollingReviewTurn.started.turn.id);
}

export async function collectRollingReview(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, reviewId: string, timeoutMs = 60000): Promise<RollingStoredReview> {
 const rollingReviewContext = await rollingCampaignStore.reviewContext(campaignId, reviewId);
 if (rollingReviewContext.review.outcome !== null) return rollingReviewContext.review;
 const rollingReviewDispatch = await rollingCampaignStore.reviewDispatch(campaignId, reviewId);
 requireReview(rollingReviewDispatch?.state === 'ATTACHED', 'review dispatch outcome is unknown; recover the original turn before collecting');
 const rollingNativeThread = await rollingCodex.resumeThread(rollingReviewDispatch.reviewerThreadId, rollingReviewContext.rootPath);
 requireReview(rollingNativeThread.thread.sessionId === rollingReviewContext.review.request.reviewerSessionId, 'native session differs from assigned reviewer');
 let rollingNativeTurn = await rollingCodex.readTurn(rollingNativeThread.thread.id, rollingReviewDispatch.turnId);
 if (rollingNativeTurn.status === 'inProgress') rollingNativeTurn = await rollingCodex.waitForTurn(rollingNativeThread.thread.id, rollingReviewDispatch.turnId, timeoutMs);
 const rollingReviewTurn: RollingReviewTurn = { request: rollingReviewContext.review.request, thread: rollingNativeThread,
  started: { turn: { id: rollingReviewDispatch.turnId } } };
 const rollingReviewOutcomeV1 = readRollingReviewTurn(rollingReviewTurn, rollingNativeTurn);
 return rollingCampaignStore.recordReviewOutcome(campaignId, reviewId, rollingNativeThread.thread.sessionId, rollingReviewOutcomeV1);
}

// Traceability: implements REQ-ROLLING-REVIEW
export async function startRollingReview(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, assignmentId: string, generation: string, revision: string,
 rollingReviewerLoss: RollingReviewerLoss | null = null, timeoutMs = 60000): Promise<RollingStoredReview> {
 const reviews = await rollingCampaignStore.reviews(campaignId, assignmentId);
 const previousRollingStoredReview = reviews.at(-1);
 const rollingReviewReplacementV1 = rollingReviewerLoss === null ? null
  : await rollingCampaignStore.reviewReplacement(campaignId, rollingReviewerLoss.reviewId);
 if (rollingReviewReplacementV1 !== null) {
  const rollingStoredReview = await rollingCampaignStore.requestReview(campaignId, assignmentId, generation, revision,
   rollingReviewReplacementV1.reviewerSessionId, rollingReviewerLoss);
  return collectRollingReview(rollingCampaignStore, rollingCodex, campaignId, rollingStoredReview.request.id, timeoutMs);
 }
 if (previousRollingStoredReview !== undefined && rollingReviewerLoss === null
  && previousRollingStoredReview.request.generation === generation && previousRollingStoredReview.request.revision === revision) {
  const rollingStoredReview = await rollingCampaignStore.requestReview(campaignId, assignmentId, generation, revision,
   previousRollingStoredReview.request.reviewerSessionId);
  return collectRollingReview(rollingCampaignStore, rollingCodex, campaignId, rollingStoredReview.request.id, timeoutMs);
 }
 const rollingWorkerCreationV1 = await rollingCampaignStore.workerIdentity(campaignId, assignmentId, generation);
 let rollingNativeThread: RollingNativeThread;
 if (previousRollingStoredReview !== undefined && rollingReviewerLoss === null) {
  const rollingReviewDispatch = await rollingCampaignStore.reviewDispatch(campaignId, previousRollingStoredReview.request.id);
  requireReview(rollingReviewDispatch?.state === 'ATTACHED', 'original reviewer thread is not attached; preserve the request and use dispatch-review or explicit observed loss');
  rollingNativeThread = await rollingCodex.resumeThread(rollingReviewDispatch.reviewerThreadId, rollingWorkerCreationV1.rootPath);
 } else {
  rollingNativeThread = await rollingCodex.startThread(rollingWorkerCreationV1.rootPath);
 }
 const rollingStoredReview = await rollingCampaignStore.requestReview(campaignId, assignmentId, generation, revision,
  rollingNativeThread.thread.sessionId, rollingReviewerLoss);
 await dispatchRollingReview(rollingCampaignStore, rollingCodex, campaignId, rollingStoredReview.request.id, rollingNativeThread);
 return collectRollingReview(rollingCampaignStore, rollingCodex, campaignId, rollingStoredReview.request.id, timeoutMs);
}
