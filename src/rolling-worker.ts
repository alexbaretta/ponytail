// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import fs from 'node:fs';
import { parse } from 'lossless-json';
import { RollingCodex, type RollingNativeThread, type RollingTurnStarted } from './rolling-codex.js';
import { validateRollingSessionMarker, requireRollingSessionMarkerAbsent, provisionRollingWorktree } from './rolling-worktrees.js';

import type { Obligation, ObligationRequirement } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationLeaseV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type { RollingBinding, RollingProjectConfigV1, RollingResolvedConfiguration } from './rolling-campaign.js';
import type { RollingCampaignStore, RollingSessionAttachment, RollingWorkerDispatchAttached } from './rolling-campaign-store.js';

export interface RollingWorkerCreationV1 {
 readonly schemaVersion: 1;
 readonly threadId: string;
 readonly sessionId: string;
 readonly rootPath: string;
}
export interface RollingWorkerInitialization {
 readonly rollingWorkerCreationV1: RollingWorkerCreationV1;
 readonly rollingTurnStarted: RollingTurnStarted;
}
function requireWorker(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(`rolling worker: ${message}`);
}
function identity(value: unknown): string {
 requireWorker(typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\0\r\n]/u.test(value), 'invalid creation identity');
 return value;
}
// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export function readRollingWorkerCreationV1(value: unknown): RollingWorkerCreationV1 {
 requireWorker(value !== null && typeof value === 'object' && !Array.isArray(value), 'creation must be a record');
 requireWorker('schemaVersion' in value && value.schemaVersion === 1 && 'threadId' in value && 'sessionId' in value && 'rootPath' in value,
  'invalid creation version or fields');
 requireWorker(Object.keys(value).sort().join(',') === 'rootPath,schemaVersion,sessionId,threadId', 'unknown creation fields');
 const rootPath = identity(value.rootPath);
 requireWorker(path.isAbsolute(rootPath) && path.normalize(rootPath) === rootPath, 'creation checkout must be an absolute canonical path');
 return {schemaVersion:1,threadId:identity(value.threadId),sessionId:identity(value.sessionId),rootPath};
}
export function parseRollingWorkerCreation(text: string): RollingWorkerCreationV1 {
 return readRollingWorkerCreationV1(parse(text, null, token => {
  requireWorker(token === '1', 'invalid creation numeric token'); return 1;
 }));
}
export const RollingWorkerCreationReaders = {V1:readRollingWorkerCreationV1};

// Traceability: implements REQ-ROLLING-WORKERS
export function identifyRollingWorkerCreation(rollingNativeThread: RollingNativeThread, rootPath: string): RollingWorkerCreationV1 {
 requireWorker(rollingNativeThread.cwd === rootPath && fs.realpathSync(rootPath) === rootPath, 'native checkout differs from reservation');
 return readRollingWorkerCreationV1({schemaVersion:1,threadId:rollingNativeThread.thread.id,sessionId:rollingNativeThread.thread.sessionId,rootPath});
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function initializeRollingWorker(rollingCodex: RollingCodex, rollingNativeThread: RollingNativeThread,
 rollingWorkerCreationV1: RollingWorkerCreationV1): Promise<RollingWorkerInitialization> {
 const checkedRollingWorkerCreationV1 = readRollingWorkerCreationV1(rollingWorkerCreationV1);
 requireWorker(JSON.stringify(identifyRollingWorkerCreation(rollingNativeThread, checkedRollingWorkerCreationV1.rootPath))
  === JSON.stringify(checkedRollingWorkerCreationV1), 'native identity differs from retained creation');
 requireRollingSessionMarkerAbsent(checkedRollingWorkerCreationV1.rootPath);
 const rollingTurnStarted = await rollingCodex.startTurn(checkedRollingWorkerCreationV1.threadId,
  'Initialize this Ponytail worker in its assigned checkout. Create only session_id.txt at the checkout root, containing the exact sessionId below followed by one newline. Use exclusive creation; preserve any existing file. Do not edit other files or start implementation. Finish the turn after writing the marker.\n'
  + `Worker attachment: ${JSON.stringify(checkedRollingWorkerCreationV1)}`);
 return {rollingWorkerCreationV1:checkedRollingWorkerCreationV1,rollingTurnStarted};
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function observeRollingWorkerInitialization(rollingCodex: RollingCodex,
 rollingWorkerInitialization: RollingWorkerInitialization, timeoutMs = 60000): Promise<RollingWorkerCreationV1> {
 const {rollingWorkerCreationV1, rollingTurnStarted} = rollingWorkerInitialization;
 const rollingNativeTurn = await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId, rollingTurnStarted.turn.id, timeoutMs);
 requireWorker(rollingNativeTurn.id === rollingTurnStarted.turn.id && rollingNativeTurn.status === 'completed', 'worker initialization did not complete');
 validateRollingSessionMarker(rollingWorkerCreationV1.rootPath, rollingWorkerCreationV1.sessionId);
 return rollingWorkerCreationV1;
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export async function provisionRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, actionId: string, generation: string): Promise<RollingWorkerInitialization> {
 const rollingWorkerReservation = await rollingCampaignStore.claimWorkerCreation(campaignId, actionId, generation);
 provisionRollingWorktree(rollingWorkerReservation.coordinatorRoot, {number:rollingWorkerReservation.number,
  rootPath:rollingWorkerReservation.rootPath,generation}, rollingWorkerReservation.baseCommit);
 const rollingNativeThread = await rollingCodex.startThread(rollingWorkerReservation.rootPath);
 const rollingWorkerCreationV1 = identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerReservation.rootPath);
 await rollingCampaignStore.recordWorkerCreation(campaignId,actionId,generation,rollingWorkerCreationV1);
 return initializeRollingWorker(rollingCodex,rollingNativeThread,rollingWorkerCreationV1);
}

// Traceability: implements REQ-ROLLING-WORKERS
// Traceability: implements REQ-ROLLING-STATE
export async function attachRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, actionId: string, generation: string, rollingWorkerInitialization: RollingWorkerInitialization,
 timeoutMs = 60000): Promise<RollingSessionAttachment> {
 const rollingWorkerCreationV1 = await observeRollingWorkerInitialization(rollingCodex,rollingWorkerInitialization,timeoutMs);
 return rollingCampaignStore.completeWorkerCreation(campaignId,actionId,generation,rollingWorkerCreationV1);
}

export interface RollingWorkerContext {
 readonly rollingWorkerCreationV1: RollingWorkerCreationV1;
 readonly obligation: Obligation;
 readonly requirements: readonly ObligationRequirement[];
 readonly binding: RollingBinding;
 readonly lease: ObligationLeaseV1;
 readonly configuration: RollingResolvedConfiguration;
 readonly qa: RollingProjectConfigV1['qa'];
}

// Traceability: implements REQ-ROLLING-WORKERS
export function buildRollingWorkerInstructions(rollingWorkerContext: RollingWorkerContext): string {
 const {obligation,requirements,binding,lease} = rollingWorkerContext;
 requireWorker(obligation.id === lease.binding.obligationId && binding.obligationId === obligation.id,
  'worker instructions differ from frozen obligation');
 requireWorker(obligation.requirementIds.every(id => requirements.some(item => item.id === id))
  && requirements.every(item => obligation.requirementIds.includes(item.id)), 'worker instructions lack exact requirement references');
 return 'Execute the assigned atomic obligation in this existing checkout and original session. Read the applicable project rules and skills before work. '
  + 'The coordinator graph is authoritative; the frozen lease below owns current prerequisites, permitted paths, operations, proof selection and target. '
  + 'The obligation owns the canonical condition and discharge criterion. Its historical execution field does not override this frozen lease. '
  + 'Use the exact requirement references, acceptance arc and step references, implementation IDs, source paths, unit and integration selections below. '
  + 'Establish only this obligation within the lease. For a no-edit obligation, return fresh inspection and proof without inventing a code change or Git rebase. Run configured focused QA and the referenced focused arcs; publication QA belongs to the coordinator publication gate. '
  + 'Preserve static typing and project build-impact rules. Report newly discovered prerequisites to the coordinator; do not silently change the authoritative graph. '
  + 'If blocked, stop activity and report the blocker while retaining the checkout. Delivery is proposed discharge, not acceptance. '
  + 'When submitting code changes, fetch the configured campaign branch and perform a full semantic rebase commit by commit, refresh affected evidence, retain the exact candidate SHA and base, and stop activity. '
  + 'Return the candidate and evidence to the coordinator for adversarial review; never publish to mainline yourself.\n'
  + `Worker responsibility: ${JSON.stringify(rollingWorkerContext)}`;
}

// Traceability: implements REQ-ROLLING-WORKERS
export async function dispatchRollingWorker(rollingCampaignStore: RollingCampaignStore, rollingCodex: RollingCodex,
 campaignId: string, assignmentId: string, generation: string): Promise<RollingWorkerDispatchAttached> {
 const rollingWorkerContext = await rollingCampaignStore.workerContext(campaignId,assignmentId,generation);
 const instructions = buildRollingWorkerInstructions(rollingWorkerContext);
 const rollingWorkerDispatchStarted = await rollingCampaignStore.claimWorkerDispatch(campaignId,assignmentId,generation,instructions);
 const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerDispatchStarted.threadId,rollingWorkerContext.rollingWorkerCreationV1.rootPath);
 requireWorker(rollingNativeThread.thread.sessionId === rollingWorkerContext.rollingWorkerCreationV1.sessionId, 'resumed worker differs from attached session');
 const rollingTurnStarted = await rollingCodex.startTurn(rollingNativeThread.thread.id,instructions);
 return rollingCampaignStore.attachWorkerDispatch(campaignId,assignmentId,generation,rollingWorkerDispatchStarted.id,rollingTurnStarted.turn.id);
}
