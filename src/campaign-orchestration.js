#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
// Traceability: implements REQ-WORKER-WORKTREE-RETENTION

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildRepositoryInventory, campaignGraph } = require('./campaign-census');
const { runReclamation } = require('./worktree-reclamation');
const { recoverySource, recoverCheckout, recoverLegacyCheckout, upgradeCheckout } = require('./worker-worktrees');

const ASSIGNMENT_STATES = [
  'DISPATCH_PENDING',
  'ACTIVE',
  'WORK_COMPLETE',
  'REBASE_REQUIRED',
  'READY_TO_MERGE',
  'MERGED',
  'CLEANUP_PENDING',
  'ARCHIVED',
];
const ACTION_TYPES_V1 = ['CREATE_WORKER', 'REUSE_WORKER', 'REQUEST_REBASE', 'ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'];
const ACTION_TYPES_V2 = [...ACTION_TYPES_V1, 'RECOVER_WORKTREE'];
const ACTION_TYPES_V3 = ['CREATE_WORKER', 'REUSE_WORKER', 'REQUEST_REBASE', 'ARCHIVE_WORKTREE', 'ARCHIVE_SESSION', 'RECOVER_WORKTREE'];
const ACTION_TYPES_V4 = ACTION_TYPES_V3;
const ACTION_TYPES_V5 = [...ACTION_TYPES_V4, 'REVIEW_WORKER'];
const ACTION_TYPES_V6 = [...ACTION_TYPES_V5, 'PLAN_WORKER'];
const HOST_SESSION_STATES = ['working', 'waiting', 'completed', 'archived', 'missing', 'unknown'];
const HOST_OBSERVATION_MAX_AGE_MS = 5 * 60 * 1000;
const WORKER_BINDINGS_FILE = 'campaign-worker-bindings.json';
const CAMPAIGN_WORKER_LIMIT = 15;

class CampaignOrchestrationError extends Error {
  constructor(code, message, status = 1) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function fail(code, message, status = 1) {
  throw new CampaignOrchestrationError(code, message, status);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function optionalString(value, label) {
  if (value !== null && (typeof value !== 'string' || !value)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} must be null or a nonempty string`);
}

function readAssignmentV1(value, label = 'assignment') {
  exactKeys(value, ['id', 'planId', 'sessionId', 'worktree', 'branch', 'dispatchRevision', 'workerRevision', 'state', 'idempotencyKey', 'attachToken', 'worktreeArchived', 'sessionArchived'], label);
  for (const key of ['id', 'planId', 'dispatchRevision', 'idempotencyKey', 'attachToken']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  }
  for (const key of ['sessionId', 'worktree', 'branch', 'workerRevision']) optionalString(value[key], `${label}.${key}`);
  if (!ASSIGNMENT_STATES.includes(value.state)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.state is invalid`);
  if (typeof value.worktreeArchived !== 'boolean' || typeof value.sessionArchived !== 'boolean') fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} archive flags must be booleans`);
  return { ...value };
}

function readActionV1(value, label = 'action') {
  if (value === null) return null;
  exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
  if (value.schemaVersion !== 1 || !ACTION_TYPES_V1.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  return { ...value, payload: { ...value.payload } };
}

function readActionV2(value, label = 'action') {
  if (value === null) return null;
  exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
  if (value.schemaVersion !== 2 || !ACTION_TYPES_V2.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  return { ...value, payload: { ...value.payload } };
}

function readActionV3(value, label = 'action') {
  if (value === null) return null;
  exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
  if (value.schemaVersion !== 3 || !ACTION_TYPES_V3.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  if (value.type === 'RECOVER_WORKTREE') {
    exactKeys(value.payload, ['sessionId', 'previousWorktree', 'branch', 'revision'], `${label}.payload`);
    for (const key of Object.keys(value.payload)) if (typeof value.payload[key] !== 'string' || !value.payload[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.${key} must be a nonempty string`);
  }
  return { ...value, payload: { ...value.payload } };
}

function readActionV4(value, label = 'action') {
  if (value === null) return null;
  exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
  if (value.schemaVersion !== 4 || !ACTION_TYPES_V4.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  if (value.type === 'RECOVER_WORKTREE') {
    exactKeys(value.payload, ['sessionId', 'previousWorktree', 'branch', 'revision'], `${label}.payload`);
    for (const key of Object.keys(value.payload)) if (typeof value.payload[key] !== 'string' || !value.payload[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.${key} must be a nonempty string`);
  }
  if (value.type === 'ARCHIVE_WORKTREE') {
    exactKeys(value.payload, ['sessionId', 'worktree'], `${label}.payload`);
    for (const key of Object.keys(value.payload)) if (typeof value.payload[key] !== 'string' || !value.payload[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.${key} must be a nonempty string`);
  }
  return { ...value, payload: { ...value.payload } };
}

function readActionV5(value, label = 'action') {
  if (value === null) return null;
  exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
  if (value.schemaVersion !== 5 || !ACTION_TYPES_V5.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  if (value.type === 'REVIEW_WORKER') {
    exactKeys(value.payload, ['planId', 'sprintId', 'attachToken', 'sessionId', 'worktree', 'dispatch'], `${label}.payload`);
    for (const key of ['planId', 'sprintId', 'attachToken', 'sessionId', 'worktree']) {
      if (typeof value.payload[key] !== 'string' || !value.payload[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.${key} must be a nonempty string`);
    }
    if (!path.isAbsolute(value.payload.worktree) || path.resolve(value.payload.worktree) !== value.payload.worktree) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.worktree must be a normalized absolute path`);
    exactKeys(value.payload.dispatch, ['ready', 'state', 'hostIdentity'], `${label}.payload.dispatch`);
    if (typeof value.payload.dispatch.ready !== 'boolean' || !['NOT_STARTED', 'STARTED'].includes(value.payload.dispatch.state)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.dispatch has invalid readiness or state`);
    optionalString(value.payload.dispatch.hostIdentity, `${label}.payload.dispatch.hostIdentity`);
    if ((value.payload.dispatch.state === 'NOT_STARTED') !== (value.payload.dispatch.hostIdentity === null)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.dispatch identity disagrees with state`);
  } else if (value.type === 'RECOVER_WORKTREE' || value.type === 'ARCHIVE_WORKTREE') {
    readActionV4({ ...value, schemaVersion: 4 }, label);
  }
  return { ...value, payload: { ...value.payload } };
}

function readActionV6(value, label = 'action') {
  if (value === null) return null;
  if (value.schemaVersion !== 6 || !ACTION_TYPES_V6.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${label} has an unsupported type or version`);
  if (value.type === 'PLAN_WORKER') {
    exactKeys(value, ['schemaVersion', 'id', 'type', 'assignmentId', 'idempotencyKey', 'payload'], label);
    for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
    exactKeys(value.payload, ['planId', 'sprintId', 'attachToken', 'sessionId', 'worktree', 'dispatch'], `${label}.payload`);
    for (const key of ['planId', 'sprintId', 'attachToken', 'sessionId', 'worktree']) if (typeof value.payload[key] !== 'string' || !value.payload[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.${key} must be a nonempty string`);
    if (!path.isAbsolute(value.payload.worktree) || path.resolve(value.payload.worktree) !== value.payload.worktree) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.worktree must be a normalized absolute path`);
    exactKeys(value.payload.dispatch, ['ready', 'state', 'hostIdentity'], `${label}.payload.dispatch`);
    if (typeof value.payload.dispatch.ready !== 'boolean' || !['NOT_STARTED', 'STARTED'].includes(value.payload.dispatch.state)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.dispatch has invalid readiness or state`);
    optionalString(value.payload.dispatch.hostIdentity, `${label}.payload.dispatch.hostIdentity`);
    if ((value.payload.dispatch.state === 'NOT_STARTED') !== (value.payload.dispatch.hostIdentity === null)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload.dispatch identity disagrees with state`);
    return { ...value, payload: { ...value.payload } };
  }
  readActionV5({ ...value, schemaVersion: 5 }, label);
  return { ...value, payload: { ...value.payload } };
}

function readActionV1OrV2(value, label = 'action') {
  return value?.schemaVersion === 2 ? readActionV2(value, label) : readActionV1(value, label);
}

function readActionAsV4(value, assignment, label = 'action') {
  if (value?.schemaVersion === 4) return readActionV4(value, label);
  const physicalAction = value?.schemaVersion === 3 ? readActionV3(value, label) : readActionV1OrV2(value, label);
  return readActionV4({
    ...physicalAction,
    schemaVersion: 4,
    payload: physicalAction.type === 'RECOVER_WORKTREE'
      ? { sessionId: physicalAction.payload.sessionId, previousWorktree: physicalAction.payload.worktree, branch: physicalAction.payload.branch, revision: physicalAction.payload.revision }
      : physicalAction.type === 'ARCHIVE_WORKTREE'
        ? { sessionId: assignment?.sessionId, worktree: physicalAction.payload.worktree }
        : physicalAction.payload,
  }, label);
}

function readCurrentAction(value, assignment, label = 'action') {
  if (value?.schemaVersion === 6) return readActionV6(value, label);
  const previous = value?.schemaVersion === 5 ? readActionV5(value, label) : readActionAsV4(value, assignment, label);
  return readActionV6({ ...previous, schemaVersion: 6 }, label);
}

function readWorkerV1(value, label = 'worker') {
  exactKeys(value, ['sessionId', 'worktree', 'branch', 'revision', 'clean', 'activity', 'evidenceComplete', 'worktreeArchived', 'sessionArchived'], label);
  for (const key of ['sessionId', 'worktree', 'branch', 'revision']) optionalString(value[key], `${label}.${key}`);
  if (!['active', 'idle', 'completed', 'missing'].includes(value.activity)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.activity is invalid`);
  for (const key of ['clean', 'evidenceComplete', 'worktreeArchived', 'sessionArchived']) if (typeof value[key] !== 'boolean') fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be boolean`);
  return { ...value };
}

function readHostObservationV1(value, file = 'campaign host observation') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'observedAt', 'completeSessionIds', 'sessions'], file);
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'observedAt']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  if (Number.isNaN(Date.parse(value.observedAt))) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.observedAt must be an ISO 8601 timestamp`);
  if (!Array.isArray(value.completeSessionIds) || !Array.isArray(value.sessions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.completeSessionIds and sessions must be arrays`);
  if (value.completeSessionIds.some((sessionId) => typeof sessionId !== 'string' || !sessionId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.completeSessionIds must contain nonempty strings`);
  if (new Set(value.completeSessionIds).size !== value.completeSessionIds.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.completeSessionIds must be unique`);
  const sessions = value.sessions.map((session, index) => {
    const label = `${file}.sessions[${index}]`;
    exactKeys(session, ['sessionId', 'state', 'worktree', 'managedWorktree'], label);
    if (typeof session.sessionId !== 'string' || !session.sessionId) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.sessionId must be a nonempty string`);
    if (!HOST_SESSION_STATES.includes(session.state)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.state is invalid`);
    optionalString(session.worktree, `${label}.worktree`);
    if (typeof session.managedWorktree !== 'boolean') fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.managedWorktree must be boolean`);
    if (!value.completeSessionIds.includes(session.sessionId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.sessionId is not declared complete`);
    return { ...session };
  });
  if (new Set(sessions.map(({ sessionId }) => sessionId)).size !== sessions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.sessions contains duplicate session IDs`);
  if (sessions.length !== value.completeSessionIds.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.sessions must contain exactly the complete session IDs`);
  return { ...value, completeSessionIds: [...value.completeSessionIds].sort(), sessions: sessions.sort((left, right) => left.sessionId.localeCompare(right.sessionId)) };
}

function readWorkerDeliveriesV1(value, file = 'campaign worker deliveries') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'deliveries'], file);
  if (value.schemaVersion !== 1 || typeof value.campaignId !== 'string' || !value.campaignId || !Array.isArray(value.deliveries)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}: expected worker delivery schema V1`);
  }
  const deliveries = value.deliveries.map((delivery, index) => {
    const label = `${file}.deliveries[${index}]`;
    exactKeys(delivery, ['assignmentId', 'revision', 'evidencePaths', 'recordedAt'], label);
    for (const key of ['assignmentId', 'revision', 'recordedAt']) if (typeof delivery[key] !== 'string' || !delivery[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
    if (Number.isNaN(Date.parse(delivery.recordedAt))) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.recordedAt must be an ISO 8601 timestamp`);
    if (!Array.isArray(delivery.evidencePaths) || delivery.evidencePaths.length === 0
      || delivery.evidencePaths.some((evidencePath) => typeof evidencePath !== 'string' || !evidencePath)) {
      fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.evidencePaths must contain nonempty strings`);
    }
    if (new Set(delivery.evidencePaths).size !== delivery.evidencePaths.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.evidencePaths must be unique`);
    return { ...delivery, evidencePaths: [...delivery.evidencePaths].sort() };
  });
  if (new Set(deliveries.map(({ assignmentId }) => assignmentId)).size !== deliveries.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate assignment deliveries`);
  return { schemaVersion: 1, campaignId: value.campaignId, deliveries: deliveries.sort((left, right) => left.assignmentId.localeCompare(right.assignmentId)) };
}

function readCompletedActionV1(value, label = 'completed action') {
  exactKeys(value, ['actionId', 'assignmentId', 'type', 'result'], label);
  for (const key of ['actionId', 'assignmentId']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!ACTION_TYPES_V1.includes(value.type) || !value.result || typeof value.result !== 'object' || Array.isArray(value.result)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has invalid type or result`);
  return { ...value, result: { ...value.result } };
}

function readCompletedActionV2(value, label = 'completed action') {
  exactKeys(value, ['actionId', 'assignmentId', 'type', 'result'], label);
  for (const key of ['actionId', 'assignmentId']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!ACTION_TYPES_V2.includes(value.type) || !value.result || typeof value.result !== 'object' || Array.isArray(value.result)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has invalid type or result`);
  return { ...value, result: { ...value.result } };
}

function readCompletedActionV3(value, label = 'completed action') {
  exactKeys(value, ['actionId', 'assignmentId', 'type', 'result'], label);
  for (const key of ['actionId', 'assignmentId']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!ACTION_TYPES_V6.includes(value.type) || !value.result || typeof value.result !== 'object' || Array.isArray(value.result)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has invalid type or result`);
  return { ...value, result: { ...value.result } };
}

function readWorkerBindingsV1(value, file = 'campaign worker bindings') {
  exactKeys(value, ['schemaVersion', 'bindings'], file);
  if (value.schemaVersion !== 1 || !Array.isArray(value.bindings)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}: expected worker binding schema V1`);
  const bindings = value.bindings.map((binding, index) => {
    const label = `${file}.bindings[${index}]`;
    exactKeys(binding, ['repositoryRoot', 'campaignId', 'assignmentId', 'coordinatorSessionId', 'attachTokenHash', 'sessionId', 'worktree', 'branch', 'revision', 'boundAt'], label);
    for (const key of Object.keys(binding)) if (typeof binding[key] !== 'string' || !binding[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
    return { ...binding };
  });
  for (const field of ['assignmentId', 'attachTokenHash', 'sessionId', 'worktree']) {
    const values = bindings.map((binding) => binding[field]);
    if (new Set(values).size !== values.length) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `${file} contains duplicate ${field} bindings`);
  }
  return { schemaVersion: 1, bindings };
}

function readWorkerBindingsV2(value, file = 'campaign worker bindings') {
  exactKeys(value, ['schemaVersion', 'bindings'], file);
  if (value.schemaVersion !== 2 || !Array.isArray(value.bindings)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}: expected worker binding schema V2`);
  const bindings = value.bindings.map((binding, index) => {
    const { mainWorktree, mainGitDirectory, ...legacy } = binding;
    exactKeys(binding, ['repositoryRoot', 'campaignId', 'assignmentId', 'coordinatorSessionId', 'attachTokenHash', 'sessionId', 'worktree', 'branch', 'revision', 'boundAt', 'mainWorktree', 'mainGitDirectory'], `${file}.bindings[${index}]`);
    optionalString(mainWorktree, 'mainWorktree');
    optionalString(mainGitDirectory, 'mainGitDirectory');
    if ((mainWorktree === null) !== (mainGitDirectory === null)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'worker recovery source fields must both be present or both unknown');
    readWorkerBindingsV1({ schemaVersion: 1, bindings: [legacy] }, file);
    return { ...binding };
  });
  readWorkerBindingsV1({ schemaVersion: 1, bindings: bindings.map(({ mainWorktree, mainGitDirectory, ...legacy }) => legacy) }, file);
  return { schemaVersion: 2, bindings };
}

function readLedgerV1(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingAction', 'completedActions', 'workers'], file);
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  if (!Array.isArray(value.assignments) || !Array.isArray(value.completedActions) || !Array.isArray(value.workers)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} assignments, completedActions, and workers must be arrays`);
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV1(actionResult, `${file}.completedActions[${index}]`));
  if (new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate completed action IDs`);
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  return {
    ...value,
    assignments,
    pendingAction: readActionV1(value.pendingAction, `${file}.pendingAction`),
    completedActions,
    workers,
  };
}

function readLedgerV2(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers'], file);
  if (value.schemaVersion !== 2) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  if (!Array.isArray(value.assignments) || !Array.isArray(value.pendingActions) || !Array.isArray(value.completedActions) || !Array.isArray(value.workers)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} assignments, pendingActions, completedActions, and workers must be arrays`);
  }
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV1(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV1(actionResult, `${file}.completedActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate pending action IDs`);
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending action for an assignment`);
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending rebase action`);
  if (new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate completed action IDs`);
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  return { ...value, assignments, pendingActions, completedActions, workers };
}

function readLedgerV3(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers'], file);
  if (value.schemaVersion !== 3) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  if (!Array.isArray(value.assignments) || !Array.isArray(value.pendingActions) || !Array.isArray(value.completedActions) || !Array.isArray(value.workers)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} assignments, pendingActions, completedActions, and workers must be arrays`);
  }
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV1OrV2(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV2(actionResult, `${file}.completedActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate pending action IDs`);
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending action for an assignment`);
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending rebase action`);
  if (new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate completed action IDs`);
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  return { ...value, assignments, pendingActions, completedActions, workers };
}

function readLedgerV4(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers'], file);
  if (value.schemaVersion !== 4) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  if (!Array.isArray(value.assignments) || !Array.isArray(value.pendingActions) || !Array.isArray(value.completedActions) || !Array.isArray(value.workers)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} assignments, pendingActions, completedActions, and workers must be arrays`);
  }
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV3(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV2(actionResult, `${file}.completedActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate pending action IDs`);
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending action for an assignment`);
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending rebase action`);
  if (new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate completed action IDs`);
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  return { ...value, assignments, pendingActions, completedActions, workers };
}

function readLedgerV5(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers'], file);
  if (value.schemaVersion !== 5) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  if (!Array.isArray(value.assignments) || !Array.isArray(value.pendingActions) || !Array.isArray(value.completedActions) || !Array.isArray(value.workers)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} assignments, pendingActions, completedActions, and workers must be arrays`);
  }
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV4(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV2(actionResult, `${file}.completedActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate pending action IDs`);
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending action for an assignment`);
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains more than one pending rebase action`);
  if (new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} contains duplicate completed action IDs`);
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  return { ...value, assignments, pendingActions, completedActions, workers };
}

function readCurrentLedger(value, file = 'campaign ledger') {
  if (value?.schemaVersion === 8) return readLedgerV8(value, file);
  const previous = value?.schemaVersion === 7 ? readLedgerV7(value, file)
    : value?.schemaVersion === 6 ? readLedgerV6(value, file)
      : readLedgerV6({ ...readHistoricalLedger(value, file), schemaVersion: 6, dispatchRetries: [] }, file);
  return readLedgerV8({ ...previous, schemaVersion: 8,
    pendingActions: previous.pendingActions.map((pendingAction, index) => readCurrentAction(
      pendingAction, previous.assignments.find(({ id }) => id === pendingAction.assignmentId), `${file}.pendingActions[${index}]`)),
  }, file);
}

function readHistoricalLedger(value, file) {
  if (value?.schemaVersion === 5) return readLedgerV5(value, file);
  let physicalLedger;
  if (value?.schemaVersion === 4) physicalLedger = readLedgerV4(value, file);
  else if (value?.schemaVersion === 3) physicalLedger = readLedgerV3(value, file);
  else if (value?.schemaVersion === 2) physicalLedger = readLedgerV2(value, file);
  else {
    const { pendingAction, ...legacyLedger } = readLedgerV1(value, file);
    physicalLedger = { ...legacyLedger, pendingActions: pendingAction ? [pendingAction] : [] };
  }
  return readLedgerV5({
    ...physicalLedger,
    schemaVersion: 5,
    pendingActions: physicalLedger.pendingActions.map((pendingAction, index) => readActionAsV4(
      pendingAction,
      physicalLedger.assignments.find(({ id }) => id === pendingAction.assignmentId),
      `${file}.pendingActions[${index}]`,
    )),
  }, file);
}

function readLedgerV6(value, file = 'campaign ledger') {
  const { dispatchRetries, ...physicalLedger } = value;
  if (value.schemaVersion !== 6 || !Array.isArray(dispatchRetries)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}: expected ledger V6 retry history`);
  const ledger = readLedgerV5({ ...physicalLedger, schemaVersion: 5 }, file);
  const originals = new Set();
  const successors = new Set();
  for (const retry of dispatchRetries) {
    exactKeys(retry, ['originalAction', 'successorActionId', 'authorization', 'recordedAt', 'outcome'], 'dispatch retry');
    const original = readActionV4(retry.originalAction);
    if (!original || retry.outcome !== 'UNKNOWN_OUTCOME_SUPERSEDED' || original.type !== 'CREATE_WORKER' || original.payload.dispatch?.state !== 'STARTED'
      || typeof original.payload.dispatch.hostIdentity !== 'string' || !original.payload.dispatch.hostIdentity
      || original.payload.bootstrap || !ledger.assignments.some(({ id }) => id === original.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry history requires an original unprovisioned started creation');
    for (const key of ['successorActionId', 'authorization', 'recordedAt']) {
      if (typeof retry[key] !== 'string' || !retry[key].trim()) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `dispatch retry ${key} must be nonempty`);
    }
    if (!Number.isFinite(Date.parse(retry.recordedAt)) || originals.has(original.id) || successors.has(retry.successorActionId)
      || original.id === retry.successorActionId || ledger.pendingActions.some(({ id }) => id === original.id)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid or duplicate dispatch retry identity');
    originals.add(original.id);
    successors.add(retry.successorActionId);
  }
  for (const retry of dispatchRetries) {
    if (!ledger.pendingActions.some(item => item.id === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !ledger.completedActions.some(item => item.actionId === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !dispatchRetries.some(item => item.originalAction.id === retry.successorActionId && item.originalAction.assignmentId === retry.originalAction.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry successor is missing or belongs to another assignment');
  }
  return { ...ledger, schemaVersion: 6, dispatchRetries };
}

function readLedgerV7(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers', 'dispatchRetries'], file);
  if (value.schemaVersion !== 7) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  for (const key of ['assignments', 'pendingActions', 'completedActions', 'workers', 'dispatchRetries']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be an array`);
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV5(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV2(actionResult, `${file}.completedActions[${index}]`));
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length
    || new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length
    || pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1
    || new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} has conflicting action identities`);
  const ledger = { ...value, assignments, pendingActions, completedActions, workers };
  const originals = new Set();
  const successors = new Set();
  for (const retry of value.dispatchRetries) {
    exactKeys(retry, ['originalAction', 'successorActionId', 'authorization', 'recordedAt', 'outcome'], 'dispatch retry');
    const original = retry.originalAction?.schemaVersion === 5 ? readActionV5(retry.originalAction) : readActionV4(retry.originalAction);
    if (!original || retry.outcome !== 'UNKNOWN_OUTCOME_SUPERSEDED' || original.type !== 'CREATE_WORKER' || original.payload.dispatch?.state !== 'STARTED'
      || typeof original.payload.dispatch.hostIdentity !== 'string' || !original.payload.dispatch.hostIdentity
      || original.payload.bootstrap || !assignments.some(({ id }) => id === original.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry history requires an original unprovisioned started creation');
    for (const key of ['successorActionId', 'authorization', 'recordedAt']) if (typeof retry[key] !== 'string' || !retry[key].trim()) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `dispatch retry ${key} must be nonempty`);
    if (!Number.isFinite(Date.parse(retry.recordedAt)) || originals.has(original.id) || successors.has(retry.successorActionId)
      || original.id === retry.successorActionId || pendingActions.some(({ id }) => id === original.id)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid or duplicate dispatch retry identity');
    originals.add(original.id);
    successors.add(retry.successorActionId);
  }
  for (const retry of value.dispatchRetries) {
    if (!pendingActions.some(item => item.id === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !completedActions.some(item => item.actionId === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !value.dispatchRetries.some(item => item.originalAction.id === retry.successorActionId && item.originalAction.assignmentId === retry.originalAction.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry successor is missing or belongs to another assignment');
  }
  return ledger;
}

function readLedgerV8(value, file = 'campaign ledger') {
  exactKeys(value, ['schemaVersion', 'campaignId', 'topLevelWorktree', 'coordinatorSessionId', 'integrationBranch', 'integrationRevision', 'assignments', 'pendingActions', 'completedActions', 'workers', 'dispatchRetries'], file);
  if (value.schemaVersion !== 8) fail('CAMPAIGN_ORCHESTRATION_VERSION', `${file}: unsupported schemaVersion`);
  for (const key of ['campaignId', 'topLevelWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, `${file}.coordinatorSessionId`);
  optionalString(value.integrationBranch, `${file}.integrationBranch`);
  for (const key of ['assignments', 'pendingActions', 'completedActions', 'workers', 'dispatchRetries']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file}.${key} must be an array`);
  const assignments = value.assignments.map((assignment, index) => readAssignmentV1(assignment, `${file}.assignments[${index}]`));
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV6(pendingAction, `${file}.pendingActions[${index}]`));
  const completedActions = value.completedActions.map((actionResult, index) => readCompletedActionV3(actionResult, `${file}.completedActions[${index}]`));
  const workers = value.workers.map((worker, index) => readWorkerV1(worker, `${file}.workers[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length
    || new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length
    || pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1
    || new Set(completedActions.map(({ actionId }) => actionId)).size !== completedActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${file} has conflicting action identities`);
  const originals = new Set();
  const successors = new Set();
  for (const retry of value.dispatchRetries) {
    exactKeys(retry, ['originalAction', 'successorActionId', 'authorization', 'recordedAt', 'outcome'], 'dispatch retry');
    const original = retry.originalAction?.schemaVersion === 6 ? readActionV6(retry.originalAction)
      : retry.originalAction?.schemaVersion === 5 ? readActionV5(retry.originalAction) : readActionV4(retry.originalAction);
    if (!original || retry.outcome !== 'UNKNOWN_OUTCOME_SUPERSEDED' || original.type !== 'CREATE_WORKER' || original.payload.dispatch?.state !== 'STARTED'
      || typeof original.payload.dispatch.hostIdentity !== 'string' || !original.payload.dispatch.hostIdentity
      || original.payload.bootstrap || !assignments.some(({ id }) => id === original.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry history requires an original unprovisioned started creation');
    for (const key of ['successorActionId', 'authorization', 'recordedAt']) if (typeof retry[key] !== 'string' || !retry[key].trim()) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `dispatch retry ${key} must be nonempty`);
    if (!Number.isFinite(Date.parse(retry.recordedAt)) || originals.has(original.id) || successors.has(retry.successorActionId)
      || original.id === retry.successorActionId || pendingActions.some(({ id }) => id === original.id)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid or duplicate dispatch retry identity');
    originals.add(original.id);
    successors.add(retry.successorActionId);
  }
  for (const retry of value.dispatchRetries) {
    if (!pendingActions.some(item => item.id === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !completedActions.some(item => item.actionId === retry.successorActionId && item.assignmentId === retry.originalAction.assignmentId)
      && !value.dispatchRetries.some(item => item.originalAction.id === retry.successorActionId && item.originalAction.assignmentId === retry.originalAction.assignmentId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'retry successor is missing or belongs to another assignment');
  }
  return { ...value, assignments, pendingActions, completedActions, workers };
}

const CampaignLedgerReaders = Object.freeze({ V1: readLedgerV1, V2: readLedgerV2, V3: readLedgerV3, V4: readLedgerV4, V5: readLedgerV5, V6: readLedgerV6, V7: readLedgerV7, V8: readLedgerV8 });
const CampaignHostObservationReaders = Object.freeze({ V1: readHostObservationV1 });
const CampaignWorkerBindingReaders = Object.freeze({ V1: readWorkerBindingsV1, V2: readWorkerBindingsV2 });
const CampaignWorkerDeliveryReaders = Object.freeze({ V1: readWorkerDeliveriesV1 });

function readReadyActionsV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'actions'], 'campaign ready actions');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign ready actions ${key} must be a nonempty string`);
  }
  if (!Array.isArray(value.actions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions actions must be an array');
  const actions = value.actions.map((pendingAction, index) => readActionV1(pendingAction, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains duplicate action IDs');
  if (new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one action for an assignment');
  if (actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one rebase action');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
      exactKeys(pendingAction.payload.dispatch, ['ready', 'state', 'hostIdentity'], 'campaign ready dispatch');
      if (pendingAction.payload.dispatch.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null) {
        fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
      }
    }
  }
  return { ...value, actions };
}

function readReadyActionsV2(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'actions'], 'campaign ready actions');
  if (value.schemaVersion !== 2) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign ready actions ${key} must be a nonempty string`);
  }
  if (!Array.isArray(value.actions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions actions must be an array');
  const actions = value.actions.map((pendingAction, index) => readActionV1OrV2(pendingAction, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains duplicate action IDs');
  if (new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one action for an assignment');
  if (actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one rebase action');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
      exactKeys(pendingAction.payload.dispatch, ['ready', 'state', 'hostIdentity'], 'campaign ready dispatch');
      if (pendingAction.payload.dispatch.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null) {
        fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
      }
    }
  }
  return { ...value, actions };
}

function readReadyActionsV3(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'actions'], 'campaign ready actions');
  if (value.schemaVersion !== 3) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign ready actions ${key} must be a nonempty string`);
  }
  if (!Array.isArray(value.actions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions actions must be an array');
  const actions = value.actions.map((pendingAction, index) => readActionV3(pendingAction, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains duplicate action IDs');
  if (new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one action for an assignment');
  if (actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one rebase action');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
      exactKeys(pendingAction.payload.dispatch, ['ready', 'state', 'hostIdentity'], 'campaign ready dispatch');
      if (pendingAction.payload.dispatch.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null) {
        fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
      }
    }
  }
  return { ...value, actions };
}

function readReadyActionsV4(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'actions'], 'campaign ready actions');
  if (value.schemaVersion !== 4) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign ready actions ${key} must be a nonempty string`);
  }
  if (!Array.isArray(value.actions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions actions must be an array');
  const actions = value.actions.map((pendingAction, index) => readActionV4(pendingAction, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains duplicate action IDs');
  if (new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one action for an assignment');
  if (actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains more than one rebase action');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
      exactKeys(pendingAction.payload.dispatch, ['ready', 'state', 'hostIdentity'], 'campaign ready dispatch');
      if (pendingAction.payload.dispatch.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null) {
        fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
      }
    }
  }
  return { ...value, actions };
}

function readReadyActionsV5(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'actions'], 'campaign ready actions');
  if (value.schemaVersion !== 5) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign ready actions ${key} must be a nonempty string`);
  if (!Array.isArray(value.actions)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions actions must be an array');
  const actions = value.actions.map((pendingAction, index) => readActionV5(pendingAction, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length
    || new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length
    || actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions has conflicting action identities');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER'].includes(pendingAction.type)) {
      exactKeys(pendingAction.payload.dispatch, ['ready', 'state', 'hostIdentity'], 'campaign ready dispatch');
      if (pendingAction.payload.dispatch.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
    }
  }
  return { ...value, actions };
}

const CampaignReadyActionsReaders = Object.freeze({ V1: readReadyActionsV1, V2: readReadyActionsV2, V3: readReadyActionsV3, V4: readReadyActionsV4, V5: readReadyActionsV5, V6: readReadyActionsV6 });

function readReadyActionsV6(value) {
  readReadyActionsV5({ ...value, schemaVersion: 5, actions: [] });
  if (value.schemaVersion !== 6) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign ready-actions version');
  const actions = value.actions.map((pendingAction, index) => readCurrentAction(pendingAction, null, `campaign ready actions actions[${index}]`));
  if (new Set(actions.map(({ id }) => id)).size !== actions.length
    || new Set(actions.map(({ assignmentId }) => assignmentId)).size !== actions.length
    || actions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions has conflicting action identities');
  for (const pendingAction of actions) {
    if (['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)
      && (pendingAction.payload.dispatch?.ready !== true || pendingAction.payload.dispatch.state !== 'NOT_STARTED'
        || pendingAction.payload.dispatch.hostIdentity !== null)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign ready actions contains a dispatch that is not ready to start');
  }
  return { ...value, actions };
}

function readStatusV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'assignments', 'readyPlans', 'activeWorkers', 'idleWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingAction', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, 'campaign status coordinatorSessionId');
  for (const key of ['assignments', 'readyPlans', 'activeWorkers', 'idleWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  readActionV1(value.pendingAction, 'campaign status pendingAction');
  return value;
}

function readStatusV2(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingAction', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 2) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  readActionV1(value.pendingAction, 'campaign status pendingAction');
  return value;
}

function readStatusV3(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 3) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV1(pendingAction, `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains duplicate pending action IDs');
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending action for an assignment');
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending rebase action');
  return value;
}

function readStatusV4(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 4) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV1OrV2(pendingAction, `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains duplicate pending action IDs');
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending action for an assignment');
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending rebase action');
  return value;
}

function readStatusV5(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 5) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV3(pendingAction, `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains duplicate pending action IDs');
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending action for an assignment');
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending rebase action');
  return value;
}

function readStatusV6(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 6) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV4(pendingAction, `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains duplicate pending action IDs');
  if (new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending action for an assignment');
  if (pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status contains more than one pending rebase action');
  return value;
}

function readStatusV7(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'observedAt', 'assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 7) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  for (const key of ['coordinatorSessionId', 'observedAt']) optionalString(value[key], `campaign status ${key}`);
  for (const key of ['assignments', 'sessionAssignments', 'workingSessions', 'idleSessions', 'waitingSessions', 'finishedSessions', 'worktrees', 'inProgressPlans', 'readyPlans', 'activeWorkers', 'idleWorkers', 'reusableWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingActions', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  const pendingActions = value.pendingActions.map((pendingAction, index) => readActionV5(pendingAction, `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length
    || new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length
    || pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status has conflicting action identities');
  return value;
}

function readStatusV8(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status must be an object');
  const { continuations, ...previous } = value;
  readStatusV7({ ...previous, schemaVersion: 7 });
  if (value.schemaVersion !== 8 || !Array.isArray(continuations)) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const continuation of value.continuations) {
    exactKeys(continuation, ['assignmentId', 'planId', 'sessionId', 'worktree', 'phase', 'ready', 'objections'], 'campaign continuation');
    for (const key of ['assignmentId', 'planId', 'sessionId', 'worktree']) if (typeof continuation[key] !== 'string' || !continuation[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign continuation ${key} must be a nonempty string`);
    if (!['TASKLETS', 'TASKLET_REVIEW', 'INTEGRATION', 'PLAN_CONTINUATION'].includes(continuation.phase)
      || typeof continuation.ready !== 'boolean' || !Array.isArray(continuation.objections)
      || continuation.objections.some(item => typeof item !== 'string' || !item)
      || continuation.ready !== (continuation.objections.length === 0)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign continuation has invalid readiness');
  }
  return value;
}

function readStatusV9(value) {
  readStatusV8({ ...value, schemaVersion: 8, pendingActions: [] });
  if (value.schemaVersion !== 9 || !Array.isArray(value.pendingActions)) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  const pendingActions = value.pendingActions.map((pendingAction, index) => readCurrentAction(pendingAction,
    value.assignments.find(({ id }) => id === pendingAction.assignmentId), `campaign status pendingActions[${index}]`));
  if (new Set(pendingActions.map(({ id }) => id)).size !== pendingActions.length
    || new Set(pendingActions.map(({ assignmentId }) => assignmentId)).size !== pendingActions.length
    || pendingActions.filter(({ type }) => type === 'REQUEST_REBASE').length > 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'campaign status has conflicting action identities');
  return { ...value, pendingActions };
}

const CampaignStatusReaders = Object.freeze({ V1: readStatusV1, V2: readStatusV2, V3: readStatusV3, V4: readStatusV4, V5: readStatusV5, V6: readStatusV6, V7: readStatusV7, V8: readStatusV8, V9: readStatusV9 });

function git(repositoryRoot, args, accepted = [0]) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
  if (result.error || !accepted.includes(result.status)) fail('CAMPAIGN_GIT', result.error?.message ?? result.stderr.trim() ?? `git ${args.join(' ')} failed`, 2);
  return result.stdout.trim();
}

function repositoryIdentity(repositoryRoot) {
  const branch = git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'], [0, 1]);
  return { branch: branch || null, revision: git(repositoryRoot, ['rev-parse', 'HEAD']) };
}

function repositoryCommonDirectory(repositoryRoot) {
  return fs.realpathSync(path.resolve(repositoryRoot, git(repositoryRoot, ['rev-parse', '--git-common-dir'])));
}

function coordinatorBinding(pluginData, repositoryRoot, campaignId) {
  if (!pluginData) return null;
  const file = path.join(pluginData, 'plan-input-coordinators.json');
  if (!fs.existsSync(file)) return null;
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_COORDINATOR_STATE', `${file}: ${error.message}`, 2); }
  const repositoryBindings = (value.bindings ?? []).filter((binding) => binding.repositoryRoot === repositoryRoot);
  const sessionIds = [...new Set(repositoryBindings.map(({ sessionId }) => sessionId))];
  if (sessionIds.length > 1) fail('CAMPAIGN_COORDINATOR_CONFLICT', `worktree ${repositoryRoot} has multiple coordinator sessions: ${sessionIds.join(', ')}`);
  const matches = repositoryBindings.filter((binding) => binding.campaignId === campaignId);
  if (matches.length > 1) fail('CAMPAIGN_COORDINATOR_CONFLICT', `campaign ${campaignId} has multiple coordinator bindings`);
  if (repositoryBindings.length > 0 && matches.length === 0) fail('CAMPAIGN_COORDINATOR_CONFLICT', `coordinator session is not bound to campaign ${campaignId}`);
  return matches[0]?.sessionId ?? null;
}

function stateDirectory(environment = process.env) {
  return environment.PONYTAIL_CAMPAIGN_STATE_DIR
    || path.join(environment.HOME || os.homedir(), '.ponytail', 'campaigns');
}

function ledgerPath(repositoryRoot, campaignId, environment = process.env) {
  const scope = crypto.createHash('sha256').update(repositoryRoot).digest('hex');
  return path.join(stateDirectory(environment), scope, `${campaignId}.json`);
}

function projectLedgers(ledger, environment) {
  if (!environment) return [ledger];
  const directory = path.dirname(ledgerPath(ledger.topLevelWorktree, ledger.campaignId, environment));
  const ledgers = [ledger];
  for (const file of fs.existsSync(directory) ? fs.readdirSync(directory).sort() : []) {
    if (!file.endsWith('.json') || file.endsWith('.host-observation.json') || file.endsWith('.worker-deliveries.json')
      || file === `${ledger.campaignId}.json`) continue;
    const value = readCurrentLedger(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')), file);
    if (value.topLevelWorktree !== ledger.topLevelWorktree) fail('CAMPAIGN_LEDGER_SCOPE', `ledger ${file} does not belong to this top-level project`);
    ledgers.push(value);
  }
  return ledgers;
}

function campaignCreatedSessionIds(ledger) {
  return new Set(ledger.completedActions.filter(item => item.type === 'CREATE_WORKER' && item.result.ok === true)
    .map(item => item.result.sessionId).filter(Boolean));
}

function campaignWorkerCount(ledger) {
  const sessions = new Set();
  let reservations = 0;
  const createdSessionIds = campaignCreatedSessionIds(ledger);
  for (const worker of ledger.workers) {
    if (createdSessionIds.has(worker.sessionId) && !worker.sessionArchived) sessions.add(worker.sessionId);
  }
  for (const assignment of ledger.assignments) {
    if (createdSessionIds.has(assignment.sessionId) && !assignment.sessionArchived) sessions.add(assignment.sessionId);
  }
  reservations += ledger.pendingActions.filter(({ type }) => type === 'CREATE_WORKER').length;
  reservations += ledger.dispatchRetries.length;
  return sessions.size + reservations;
}

function readReservationAuditV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'integrationRevision', 'observedAt', 'observationFresh', 'reservationCount', 'reservations'], 'reservation audit');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported reservation audit version');
  for (const key of ['campaignId', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `reservation audit ${key} is invalid`);
  optionalString(value.observedAt, 'reservation audit observedAt');
  if (typeof value.observationFresh !== 'boolean' || !Number.isInteger(value.reservationCount) || !Array.isArray(value.reservations)
    || value.reservationCount !== value.reservations.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'reservation audit count is invalid');
  for (const item of value.reservations) {
    exactKeys(item, ['kind', 'sessionId', 'actionId', 'assignmentId', 'planId', 'hostIdentity', 'creationState', 'hostState', 'worktree', 'worktreeExists', 'unmergedCommits', 'canRelease', 'objections'], 'reservation audit item');
    if (!['CREATED_SESSION', 'PENDING_CREATION', 'SUPERSEDED_CREATION'].includes(item.kind)
      || !['CREATED', 'PROVISIONED', 'STARTED_OUTCOME_UNKNOWN', 'NOT_STARTED'].includes(item.creationState)
      || ![...HOST_SESSION_STATES].includes(item.hostState)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'reservation audit item state is invalid');
    for (const key of ['sessionId', 'actionId', 'assignmentId', 'planId', 'hostIdentity', 'worktree']) optionalString(item[key], `reservation audit item ${key}`);
    if (typeof item.worktreeExists !== 'boolean' || ![true, false, null].includes(item.unmergedCommits)
      || typeof item.canRelease !== 'boolean' || !Array.isArray(item.objections)
      || item.objections.some(objection => typeof objection !== 'string' || !objection)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'reservation audit item evidence is invalid');
  }
  return value;
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
function reservationAudit(graph, ledger, environment = process.env) {
  const repositoryRoot = ledger.topLevelWorktree;
  const integrationRevision = git(repositoryRoot, ['rev-parse', 'HEAD']);
  const observation = readHostObservation(repositoryRoot, ledger.campaignId, environment);
  const observationFresh = Boolean(observation && Date.now() - Date.parse(observation.observedAt) <= HOST_OBSERVATION_MAX_AGE_MS);
  const hostSessions = new Map((observationFresh ? observation.sessions : []).map(session => [session.sessionId, session]));
  const deliveries = new Map(readWorkerDeliveries(repositoryRoot, ledger.campaignId, environment).deliveries.map(delivery => [delivery.assignmentId, delivery]));
  const assignmentsById = new Map(ledger.assignments.map(assignment => [assignment.id, assignment]));
  const createdSessionIds = campaignCreatedSessionIds(ledger);
  const reservations = [];
  for (const sessionId of [...createdSessionIds].sort()) {
    const assignments = ledger.assignments.filter(assignment => assignment.sessionId === sessionId);
    const worker = ledger.workers.find(item => item.sessionId === sessionId);
    if (!assignments.some(assignment => !assignment.sessionArchived) && worker?.sessionArchived !== false) continue;
    const current = assignments.find(assignment => assignment.state !== 'ARCHIVED') ?? assignments.at(-1);
    const worktree = current?.worktree ?? worker?.worktree ?? null;
    const host = hostSessions.get(sessionId);
    const hostState = host && observation.completeSessionIds.includes(sessionId) ? host.state : 'unknown';
    const revisions = new Set();
    let gitEvidenceComplete = true;
    for (const assignment of assignments) {
      if (assignment.workerRevision) revisions.add(assignment.workerRevision);
      const delivery = deliveries.get(assignment.id);
      if (delivery) revisions.add(delivery.revision);
      if (assignment.branch) {
        const branch = spawnSync('git', ['-C', repositoryRoot, 'rev-parse', '--verify', `refs/heads/${assignment.branch}^{commit}`], { encoding: 'utf8' });
        if (branch.status === 0) revisions.add(branch.stdout.trim());
        else gitEvidenceComplete = false;
      }
    }
    if (worker?.revision) revisions.add(worker.revision);
    let unmergedCommits = false;
    for (const revision of revisions) {
      const exists = spawnSync('git', ['-C', repositoryRoot, 'cat-file', '-e', `${revision}^{commit}`], { encoding: 'utf8' });
      if (exists.status !== 0) { gitEvidenceComplete = false; continue; }
      const merged = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', revision, integrationRevision], { encoding: 'utf8' });
      if (merged.status === 1) unmergedCommits = true;
      else if (merged.status !== 0) gitEvidenceComplete = false;
    }
    if (revisions.size === 0) gitEvidenceComplete = false;
    const objections = [];
    if (hostState === 'working') objections.push('HOST_SESSION_WORKING');
    if (hostState === 'unknown' || hostState === 'missing') objections.push('HOST_SESSION_NOT_PROVEN_INACTIVE');
    if (host && (!host.managedWorktree || host.worktree !== worktree)) objections.push('HOST_WORKTREE_IDENTITY_MISMATCH');
    if (unmergedCommits) objections.push('UNMERGED_COMMITS');
    if (!gitEvidenceComplete) objections.push('INCOMPLETE_GIT_EVIDENCE');
    if (assignments.some(assignment => assignment.state !== 'ARCHIVED')) objections.push('UNFINISHED_ASSIGNMENT');
    if (worktree && !fs.existsSync(worktree)) objections.push('MISSING_RETAINED_WORKTREE');
    if (worktree && fs.existsSync(worktree)) {
      const status = spawnSync('git', ['-C', worktree, 'status', '--porcelain'], { encoding: 'utf8' });
      if (status.status !== 0) objections.push('WORKTREE_STATUS_UNKNOWN');
      else if (status.stdout.trim()) objections.push('UNCOMMITTED_WORKTREE_CHANGES');
    }
    objections.push('RETAINED_CAMPAIGN_PAIR');
    reservations.push({ kind: 'CREATED_SESSION', sessionId, actionId: null, assignmentId: current?.id ?? null,
      planId: current?.planId ?? null, hostIdentity: null, creationState: 'CREATED', hostState,
      worktree, worktreeExists: Boolean(worktree && fs.existsSync(worktree)), unmergedCommits: unmergedCommits || (gitEvidenceComplete ? false : null),
      canRelease: false, objections });
  }
  for (const [action, kind] of [
    ...ledger.pendingActions.filter(item => item.type === 'CREATE_WORKER').map(item => [item, 'PENDING_CREATION']),
    ...ledger.dispatchRetries.map(item => [item.originalAction, 'SUPERSEDED_CREATION']),
  ]) {
    const assignment = assignmentsById.get(action.assignmentId);
    if (!assignment) fail('CAMPAIGN_RESERVATION_AUDIT', `creation action ${action.id} has no assignment`);
    const bootstrap = action.payload.bootstrap;
    const dispatch = action.payload.dispatch;
    const sessionId = bootstrap?.sessionId ?? null;
    const host = sessionId ? hostSessions.get(sessionId) : null;
    const hostState = host && observation.completeSessionIds.includes(sessionId) ? host.state : 'unknown';
    const creationState = bootstrap ? 'PROVISIONED' : dispatch?.state === 'STARTED' ? 'STARTED_OUTCOME_UNKNOWN' : 'NOT_STARTED';
    const canRelease = kind === 'PENDING_CREATION' && creationState === 'NOT_STARTED' && !planIsRunnable(graph, assignment.planId);
    const objections = [];
    if (creationState === 'STARTED_OUTCOME_UNKNOWN') objections.push('CREATION_OUTCOME_UNKNOWN');
    if (creationState === 'PROVISIONED') objections.push('PROVISIONED_SESSION');
    if (host && (!host.managedWorktree || host.worktree !== bootstrap?.worktree)) objections.push('HOST_WORKTREE_IDENTITY_MISMATCH');
    if (kind === 'SUPERSEDED_CREATION') objections.push('SUPERSEDED_ORIGINAL_OUTCOME_UNKNOWN');
    if (creationState === 'NOT_STARTED' && !canRelease) objections.push('PLAN_STILL_RUNNABLE');
    reservations.push({ kind, sessionId, actionId: action.id, assignmentId: action.assignmentId,
      planId: assignment?.planId ?? null, hostIdentity: dispatch?.hostIdentity ?? null, creationState, hostState,
      worktree: bootstrap?.worktree ?? null, worktreeExists: Boolean(bootstrap?.worktree && fs.existsSync(bootstrap.worktree)),
      unmergedCommits: creationState === 'NOT_STARTED' ? false : null, canRelease, objections });
  }
  if (reservations.length !== campaignWorkerCount(ledger)) fail('CAMPAIGN_RESERVATION_AUDIT', 'reservation audit does not match campaign capacity count');
  return readReservationAuditV1({ schemaVersion: 1, campaignId: ledger.campaignId, integrationRevision, observedAt: observation?.observedAt ?? null,
    observationFresh, reservationCount: reservations.length, reservations });
}

function hostObservationPath(repositoryRoot, campaignId, environment = process.env) {
  const scope = crypto.createHash('sha256').update(repositoryRoot).digest('hex');
  return path.join(stateDirectory(environment), scope, `${campaignId}.host-observation.json`);
}

function workerDeliveriesPath(repositoryRoot, campaignId, environment = process.env) {
  const scope = crypto.createHash('sha256').update(repositoryRoot).digest('hex');
  return path.join(stateDirectory(environment), scope, `${campaignId}.worker-deliveries.json`);
}

function readWorkerDeliveries(repositoryRoot, campaignId, environment = process.env) {
  const file = workerDeliveriesPath(repositoryRoot, campaignId, environment);
  if (!fs.existsSync(file)) return { schemaVersion: 1, campaignId, deliveries: [] };
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_WORKER_DELIVERY_IO', `${file}: ${error.message}`, 2); }
  const deliveries = readWorkerDeliveriesV1(value, file);
  if (deliveries.campaignId !== campaignId) fail('CAMPAIGN_WORKER_DELIVERY_SCOPE', `${file}: delivery scope does not match campaign ${campaignId}`);
  return deliveries;
}

function writeWorkerDeliveries(repositoryRoot, campaignId, deliveries, environment = process.env) {
  const file = workerDeliveriesPath(repositoryRoot, campaignId, environment);
  const value = readWorkerDeliveriesV1(deliveries, file);
  if (value.campaignId !== campaignId) fail('CAMPAIGN_WORKER_DELIVERY_SCOPE', `${file}: delivery scope does not match campaign ${campaignId}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, file);
  return value;
}

function recordWorkerDelivery(repositoryRoot, campaignId, assignment, result, environment = process.env) {
  exactKeys(result, ['revision', 'evidencePaths'], 'worker delivery result');
  if (typeof result.revision !== 'string' || !result.revision || !Array.isArray(result.evidencePaths) || result.evidencePaths.length === 0) {
    fail('CAMPAIGN_WORKER_DELIVERY', 'worker delivery requires revision and at least one evidence path');
  }
  const identity = repositoryIdentity(assignment.worktree);
  if (identity.revision !== result.revision || git(assignment.worktree, ['status', '--porcelain']).length !== 0) {
    fail('CAMPAIGN_WORKER_DELIVERY', 'worker delivery must identify the exact clean worktree revision');
  }
  const evidencePaths = [...new Set(result.evidencePaths)].sort();
  if (evidencePaths.length !== result.evidencePaths.length) fail('CAMPAIGN_WORKER_DELIVERY', 'worker delivery evidence paths must be unique');
  if (typeof assignment.planPath !== 'string' || !assignment.planPath) fail('CAMPAIGN_WORKER_DELIVERY', 'worker delivery requires the assigned plan path');
  const planDirectory = path.posix.dirname(assignment.planPath);
  for (const evidencePath of evidencePaths) {
    if (typeof evidencePath !== 'string' || !evidencePath || path.isAbsolute(evidencePath)
      || evidencePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
      fail('CAMPAIGN_WORKER_DELIVERY', `invalid worker delivery evidence path: ${evidencePath}`);
    }
    const relativeEvidencePath = path.posix.relative(planDirectory, evidencePath);
    if (relativeEvidencePath === '..' || relativeEvidencePath.startsWith('../') || path.posix.isAbsolute(relativeEvidencePath)) {
      fail('CAMPAIGN_WORKER_DELIVERY', `worker delivery evidence is outside assigned plan ${assignment.planPath}: ${evidencePath}`);
    }
    const treeEntry = git(assignment.worktree, ['ls-tree', result.revision, '--', evidencePath]);
    if (!/^100(?:644|755) blob [0-9a-f]+\t/.test(treeEntry)) {
      fail('CAMPAIGN_WORKER_DELIVERY', `worker delivery evidence is not committed at ${result.revision}: ${evidencePath}`);
    }
  }
  const value = readWorkerDeliveries(repositoryRoot, campaignId, environment);
  const existing = value.deliveries.find(({ assignmentId }) => assignmentId === assignment.id);
  if (existing && existing.revision === result.revision && JSON.stringify(existing.evidencePaths) === JSON.stringify(evidencePaths)) return existing;
  const delivery = { assignmentId: assignment.id, revision: result.revision, evidencePaths, recordedAt: new Date().toISOString() };
  value.deliveries = value.deliveries.filter(({ assignmentId }) => assignmentId !== assignment.id);
  value.deliveries.push(delivery);
  writeWorkerDeliveries(repositoryRoot, campaignId, value, environment);
  return delivery;
}

function readHostObservation(repositoryRoot, campaignId, environment = process.env) {
  const file = hostObservationPath(repositoryRoot, campaignId, environment);
  if (!fs.existsSync(file)) return null;
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_HOST_OBSERVATION_IO', `${file}: ${error.message}`, 2); }
  const observation = readHostObservationV1(value, file);
  if (observation.campaignId !== campaignId) fail('CAMPAIGN_HOST_OBSERVATION_SCOPE', `${file}: observation scope does not match campaign ${campaignId}`);
  return observation;
}

function writeHostObservation(repositoryRoot, campaignId, observation, environment = process.env) {
  const file = hostObservationPath(repositoryRoot, campaignId, environment);
  const value = readHostObservationV1(observation, file);
  if (value.campaignId !== campaignId) fail('CAMPAIGN_HOST_OBSERVATION_SCOPE', `${file}: observation scope does not match campaign ${campaignId}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, file);
  return value;
}

function workerBindingsPath(environment = process.env) {
  return path.join(stateDirectory(environment), WORKER_BINDINGS_FILE);
}

function readWorkerBindings(environment = process.env) {
  const file = workerBindingsPath(environment);
  if (!fs.existsSync(file)) return { schemaVersion: 2, bindings: [] };
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_WORKER_BINDING_IO', `${file}: ${error.message}`, 2); }
  if (value.schemaVersion === 2) return readWorkerBindingsV2(value, file);
  const legacy = readWorkerBindingsV1(value, file);
  return { schemaVersion: 2, bindings: legacy.bindings.map(binding => ({ ...binding, mainWorktree: null, mainGitDirectory: null })) };
}

function withWorkerBindingsLock(environment, operation) {
  const file = workerBindingsPath(environment);
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx', 0o600);
      try {
        const state = readWorkerBindings(environment);
        const result = operation(state);
        const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
        fs.writeFileSync(temporary, `${JSON.stringify(readWorkerBindingsV2(state, file), null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        fs.renameSync(temporary, file);
        return result;
      } finally {
        fs.closeSync(descriptor);
        fs.unlinkSync(lock);
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - fs.statSync(lock).mtimeMs > 5000) { fs.unlinkSync(lock); continue; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('CAMPAIGN_WORKER_BINDING_LOCK', 'timed out waiting for campaign worker binding lock', 2);
}

function ledgerFiles(environment = process.env) {
  const directory = stateDirectory(environment);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[a-f0-9]{64}$/.test(entry.name))
    .flatMap((entry) => fs.readdirSync(path.join(directory, entry.name), { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.json'))
      .map((file) => path.join(directory, entry.name, file.name)))
    .sort();
}

function attachmentForToken(environment, attachToken) {
  const matches = [];
  for (const file of ledgerFiles(environment)) {
    let ledger;
    try { ledger = readCurrentLedger(JSON.parse(fs.readFileSync(file, 'utf8')), file); } catch (error) { continue; }
    const assignment = ledger.assignments.find((item) => item.attachToken === attachToken && item.state === 'DISPATCH_PENDING');
    if (assignment && ledger.pendingActions.some((pendingAction) => pendingAction.assignmentId === assignment.id && ['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type))) {
      matches.push({ ledger, assignment });
    }
  }
  if (matches.length !== 1) fail('CAMPAIGN_ATTACH_TOKEN', matches.length === 0 ? 'attach token is unknown, stale, or already used (attachment capability unavailable)' : 'attach token capability is ambiguous');
  return matches[0];
}

function bindWorker(environment, invocationWorktree, attachToken, sessionId) {
  if (typeof attachToken !== 'string' || !attachToken || typeof sessionId !== 'string' || !sessionId) fail('CAMPAIGN_ATTACH_INPUT', 'attach requires a token and host session identity');
  const canonicalWorktree = fs.realpathSync(invocationWorktree);
  const { ledger, assignment } = attachmentForToken(environment, attachToken);
  const pendingAction = ledger.pendingActions.find(item => item.assignmentId === assignment.id);
  const bootstrapValue = pendingAction?.payload.bootstrap;
  const bootstrap = bootstrapValue && readCurrentWorkerBootstrap(bootstrapValue);
  if (bootstrap && (bootstrap.sessionId !== sessionId || bootstrap.worktree !== canonicalWorktree || bootstrap.pendingRevision !== null)) fail('CAMPAIGN_WORKER_SCOPE', 'attach must retain the original provisioned session and checkout with completed bootstrap upgrade');
  if (!fs.existsSync(ledger.topLevelWorktree)) fail('CAMPAIGN_WORKER_OWNER_MISSING', `owning worktree is unavailable: ${ledger.topLevelWorktree}`);
  if (canonicalWorktree === ledger.topLevelWorktree) fail('CAMPAIGN_WORKER_SCOPE', 'a coordinator worktree cannot attach as its own worker');
  const identity = repositoryIdentity(canonicalWorktree);
  if (bootstrap && identity.revision !== bootstrap.revision) fail('CAMPAIGN_WORKER_SCOPE', 'attach requires the completed bootstrap checkpoint');
  const source = recoverySource(ledger.topLevelWorktree);
  if (repositoryCommonDirectory(canonicalWorktree) !== source.mainGitDirectory) fail('CAMPAIGN_WORKER_SCOPE', 'worker does not belong to the owning project Git repository');
  if (!identity.branch) fail('CAMPAIGN_WORKER_SCOPE', 'worker worktree must have a branch');
  if (['REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction?.type) && assignment.sessionId !== sessionId) fail('CAMPAIGN_WORKER_SCOPE', `assignment is reserved for session ${assignment.sessionId}`);
  if (['REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction?.type) && !campaignCreatedSessionIds(ledger).has(sessionId)) fail('CAMPAIGN_WORKER_SCOPE', `session ${sessionId} was not created for campaign ${ledger.campaignId}`);
  if (assignment.worktree && assignment.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_SCOPE', `assignment is reserved for worker ${assignment.worktree}`);
  const attachTokenHash = crypto.createHash('sha256').update(attachToken).digest('hex');
  return withWorkerBindingsLock(environment, (state) => {
    // A retry can revoke the capability while this caller waits for the lock.
    attachmentForToken(environment, attachToken);
    const replay = state.bindings.find((binding) => binding.attachTokenHash === attachTokenHash);
    if (replay) {
      if (replay.sessionId !== sessionId || replay.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'attach token is already bound to another worker');
      if (pendingAction?.type === 'PLAN_WORKER') {
        const currentIdentity = repositoryIdentity(canonicalWorktree);
        if (currentIdentity.branch !== replay.branch) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'planning worker changed its authenticated branch');
        if (currentIdentity.revision !== replay.revision) {
          const integratedRevision = repositoryIdentity(ledger.topLevelWorktree).revision;
          if (git(canonicalWorktree, ['status', '--porcelain'])
            || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', replay.revision, currentIdentity.revision]).status !== 0
            || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', currentIdentity.revision, integratedRevision]).status !== 0) {
            fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'planning worker attachment can advance only on a clean branch to an integrated descendant');
          }
          replay.revision = currentIdentity.revision;
          replay.boundAt = new Date().toISOString();
        }
      }
      return replay;
    }
    const previous = state.bindings.find(binding => binding.sessionId === sessionId || binding.worktree === canonicalWorktree);
    if (previous) {
      const previousLedger = readLedger(previous.repositoryRoot, previous.campaignId, environment);
      const previousAssignment = previousLedger.assignments.find(({ id }) => id === previous.assignmentId);
      if (previous.repositoryRoot !== ledger.topLevelWorktree || previous.campaignId !== ledger.campaignId
        || previous.sessionId !== sessionId || previous.worktree !== canonicalWorktree
        || previousAssignment?.state !== 'ARCHIVED' || previousLedger.pendingActions.some(({ assignmentId }) => assignmentId === previous.assignmentId)) {
        fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'worker session or worktree is already bound');
      }
      state.bindings = state.bindings.filter(binding => binding !== previous);
    }
    const binding = {
      repositoryRoot: ledger.topLevelWorktree,
      campaignId: ledger.campaignId,
      assignmentId: assignment.id,
      coordinatorSessionId: ledger.coordinatorSessionId,
      attachTokenHash,
      sessionId,
      worktree: canonicalWorktree,
      branch: identity.branch,
      revision: identity.revision,
      boundAt: new Date().toISOString(),
      ...source,
    };
    state.bindings.push(binding);
    return binding;
  });
}

function removeWorkerBinding(environment, assignmentId) {
  return withWorkerBindingsLock(environment, (state) => {
    const binding = state.bindings.find((item) => item.assignmentId === assignmentId);
    if (!binding) return null;
    state.bindings = state.bindings.filter((item) => item !== binding);
    return binding;
  });
}

function replaceRecoveredWorkerBinding(environment, assignmentId, recoveredBinding) {
  return withWorkerBindingsLock(environment, (state) => {
    const bindingIndex = state.bindings.findIndex((item) => item.assignmentId === assignmentId);
    if (bindingIndex < 0) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${assignmentId} has no authenticated worker binding`);
    const binding = state.bindings[bindingIndex];
    if (binding.sessionId !== recoveredBinding.sessionId || binding.repositoryRoot !== recoveredBinding.repositoryRoot
      || binding.campaignId !== recoveredBinding.campaignId || binding.assignmentId !== recoveredBinding.assignmentId
      || binding.coordinatorSessionId !== recoveredBinding.coordinatorSessionId || binding.attachTokenHash !== recoveredBinding.attachTokenHash
      || binding.branch !== recoveredBinding.branch) {
      fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `assignment ${assignmentId} recovery changed immutable worker identity`);
    }
    if (state.bindings.some((item, index) => index !== bindingIndex && item.worktree === recoveredBinding.worktree)) {
      fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `recovered worktree ${recoveredBinding.worktree} is already bound`);
    }
    state.bindings[bindingIndex] = readWorkerBindingsV2({ schemaVersion: 2, bindings: [recoveredBinding] }).bindings[0];
    return state.bindings[bindingIndex];
  });
}

function workerRecoveryBinding(environment, token, sessionId = null) {
  if (typeof token !== 'string' || !token) fail('CAMPAIGN_WORKER_RECOVERY', 'worker recovery requires its attachment capability');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const binding = readWorkerBindings(environment).bindings.find(item => item.attachTokenHash === hash);
  if (!binding) {
    const { ledger, assignment } = attachmentForToken(environment, token);
    const pending = ledger.pendingActions.find(item => item.assignmentId === assignment.id && item.type === 'CREATE_WORKER');
    const bootstrap = pending?.payload.bootstrap && readCurrentWorkerBootstrap(pending.payload.bootstrap);
    if (!bootstrap || pending.payload.dispatch?.state !== 'STARTED' || bootstrap.dispatchRevision !== assignment.dispatchRevision
      || (sessionId !== null && bootstrap.sessionId !== sessionId)) fail('CAMPAIGN_WORKER_RECOVERY', 'recovery capability does not belong to this authenticated worker');
    return { ...bootstrap, repositoryRoot: ledger.topLevelWorktree, campaignId: ledger.campaignId, assignmentId: assignment.id,
      coordinatorSessionId: ledger.coordinatorSessionId, attachTokenHash: hash, branch: null };
  }
  if (!binding || (sessionId !== null && binding.sessionId !== sessionId)) fail('CAMPAIGN_WORKER_RECOVERY', 'recovery capability does not belong to this authenticated worker');
  return binding;
}

function readWorkerBootstrapV1(value) {
  exactKeys(value, ['schemaVersion', 'sessionId', 'worktree', 'revision', 'mainWorktree', 'mainGitDirectory'], 'worker bootstrap');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'unsupported worker bootstrap version');
  for (const key of ['sessionId', 'worktree', 'revision', 'mainWorktree', 'mainGitDirectory']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `worker bootstrap ${key} must be nonempty`);
  }
  for (const key of ['worktree', 'mainWorktree', 'mainGitDirectory']) {
    if (!path.isAbsolute(value[key]) || path.resolve(value[key]) !== value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `worker bootstrap ${key} must be an absolute normalized path`);
  }
  return value;
}

function readWorkerBootstrapV2(value) {
  exactKeys(value, ['schemaVersion', 'sessionId', 'worktree', 'revision', 'mainWorktree', 'mainGitDirectory', 'dispatchRevision', 'pendingRevision'], 'worker bootstrap V2');
  if (value.schemaVersion !== 2) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'unsupported worker bootstrap V2 version');
  for (const key of ['sessionId', 'worktree', 'revision', 'mainWorktree', 'mainGitDirectory', 'dispatchRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `worker bootstrap ${key} must be nonempty`);
  }
  optionalString(value.pendingRevision, 'worker bootstrap pendingRevision');
  for (const key of ['worktree', 'mainWorktree', 'mainGitDirectory']) {
    if (!path.isAbsolute(value[key]) || path.resolve(value[key]) !== value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `worker bootstrap ${key} must be an absolute normalized path`);
  }
  return { ...value };
}

function readCurrentWorkerBootstrap(value) {
  if (value?.schemaVersion === 2) return readWorkerBootstrapV2(value);
  const physical = readWorkerBootstrapV1(value);
  return readWorkerBootstrapV2({ ...physical, schemaVersion: 2, dispatchRevision: physical.revision, pendingRevision: null });
}

function upgradeWorker(environment, token, revision) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision)) fail('CAMPAIGN_WORKER_UPGRADE', 'bootstrap upgrade requires an exact 40-hex commit');
  const binding = workerRecoveryBinding(environment, token);
  if (binding.branch !== null) fail('CAMPAIGN_WORKER_UPGRADE', 'bootstrap upgrade is only available before original attachment');
  return withWorktreeLock(binding.repositoryRoot, environment, () => withLedgerLock(binding.repositoryRoot, binding.campaignId, environment, ledger => {
    const currentBinding = workerRecoveryBinding(environment, token, binding.sessionId);
    if (currentBinding.branch !== null) fail('CAMPAIGN_WORKER_UPGRADE', 'bootstrap upgrade is only available before original attachment');
    const pending = ledger.pendingActions.find(item => item.assignmentId === binding.assignmentId && item.type === 'CREATE_WORKER');
    const bootstrap = readCurrentWorkerBootstrap(pending.payload.bootstrap);
    if (bootstrap.pendingRevision !== null && bootstrap.pendingRevision !== revision) fail('CAMPAIGN_WORKER_UPGRADE', 'finish the existing bootstrap upgrade target before selecting another');
    if (repositoryCommonDirectory(binding.repositoryRoot) !== bootstrap.mainGitDirectory) fail('CAMPAIGN_WORKER_UPGRADE', 'owning project Git source changed');
    const integrationRevision = git(binding.repositoryRoot, ['rev-parse', 'HEAD']);
    if (bootstrap.pendingRevision === null && revision !== integrationRevision && revision !== bootstrap.revision) fail('CAMPAIGN_WORKER_UPGRADE', 'new bootstrap target must be the exact owning project integration HEAD');
    git(bootstrap.mainWorktree, ['merge-base', '--is-ancestor', bootstrap.dispatchRevision, bootstrap.revision]);
    git(bootstrap.mainWorktree, ['merge-base', '--is-ancestor', revision, integrationRevision]);
    const result = upgradeCheckout(currentBinding, revision, checkpoint => {
      bootstrap.pendingRevision = checkpoint;
      pending.payload.bootstrap = readWorkerBootstrapV2(bootstrap);
      // Persist the intent before Git moves. A failure retains it for the
      // same capability-owned recovery; the outer lock writes completion.
      writeLedger(ledgerPath(binding.repositoryRoot, binding.campaignId, environment), ledger);
    });
    bootstrap.revision = result.revision;
    bootstrap.pendingRevision = null;
    pending.payload.bootstrap = readWorkerBootstrapV2(bootstrap);
    return result;
  }));
}

function legacyRecoveryTarget(binding, assignment, ledger, environment) {
  const observation = readHostObservation(binding.repositoryRoot, binding.campaignId, environment);
  const hostSession = observation?.sessions.find(item => item.sessionId === binding.sessionId);
  const dispatches = ledger.completedActions.filter(item => item.assignmentId === assignment.id
    && ['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(item.type) && item.result.ok === true);
  const dispatch = dispatches[0];
  const recovery = ledger.completedActions.filter(item => item.assignmentId === assignment.id
    && item.type === 'RECOVER_WORKTREE' && item.result.ok === true
    && item.result.worktree === assignment.worktree).at(-1);
  const originalWorktree = dispatch?.result.worktree;
  if (!observation || !Number.isFinite(Date.parse(observation.observedAt))
    || Date.now() - Date.parse(observation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
    || !observation.completeSessionIds.includes(binding.sessionId)
    || !hostSession?.managedWorktree || !['working', 'waiting', 'completed'].includes(hostSession.state)
    || dispatches.length !== 1 || !originalWorktree || hostSession.worktree !== originalWorktree
    || dispatch.result.sessionId !== binding.sessionId || dispatch.result.branch !== binding.branch
    || originalWorktree === assignment.worktree || !recovery
    || recovery.result.sessionId !== binding.sessionId || recovery.result.branch !== binding.branch
    || binding.revision !== recovery.result.revision
    || ![originalWorktree, assignment.worktree].includes(binding.worktree)
    || ledger.pendingActions.some(item => item.assignmentId === assignment.id)
    || readWorkerBindings(environment).bindings.some(item => item.assignmentId !== assignment.id && item.worktree === originalWorktree)) {
    return null;
  }
  return originalWorktree;
}

function workerRecoveryContextDetails(environment, sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return null;
  const binding = readWorkerBindings(environment).bindings.find(item => item.sessionId === sessionId);
  if (!binding) {
    const bootstraps = [];
    for (const file of ledgerFiles(environment)) {
      if (file.endsWith('.host-observation.json') || file.endsWith('.worker-deliveries.json')) continue;
      let value;
      try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
      if (!Array.isArray(value?.pendingActions) || !value.pendingActions.some(item => item?.payload?.bootstrap?.sessionId === sessionId)) continue;
      const ledger = readCurrentLedger(value, file);
      for (const pending of ledger.pendingActions.filter(item => item.type === 'CREATE_WORKER' && item.payload.bootstrap?.sessionId === sessionId)) {
        const assignment = ledger.assignments.find(item => item.id === pending.assignmentId);
        if (!assignment) fail('CAMPAIGN_WORKER_RECOVERY', 'bootstrap assignment is unavailable');
        bootstraps.push({ assignment, binding: workerRecoveryBinding(environment, assignment.attachToken, sessionId) });
      }
    }
    if (bootstraps.length > 1) fail('CAMPAIGN_WORKER_RECOVERY', 'bootstrap worker ownership is ambiguous');
    if (bootstraps.length === 0) return null;
    const bootstrap = bootstraps[0];
    return { legacy: false, context: `Provisioned original worker ${sessionId}: owning project ${bootstrap.binding.repositoryRoot}; original checkout ${bootstrap.binding.worktree}; main worktree ${bootstrap.binding.mainWorktree}; original dispatch ${bootstrap.binding.dispatchRevision}; completed bootstrap checkpoint ${bootstrap.binding.revision}; pending upgrade ${bootstrap.binding.pendingRevision ?? '(none)'}. Your original creation is still pending attachment. If the checkout is missing or an upgrade is pending, run ponytail worktree recover ${bootstrap.assignment.attachToken} from an existing neutral cwd. If adoption needs an integrated tooling repair, use ponytail worktree upgrade ${bootstrap.assignment.attachToken} --revision <exact-owning-project-integration-commit>. Immediately run canonical project adoption before setup, establish the project-owned branch at the completed checkpoint, then ponytail campaign attach ${bootstrap.assignment.attachToken}. Preserve this session, original creation action, dispatch provenance, and capability; do not create a replacement. Recovery restores the original detached committed checkpoint and finishes its persisted upgrade only; preserve native snapshots.` };
  }
  const ledger = readLedger(binding.repositoryRoot, binding.campaignId, environment);
  const assignment = ledger.assignments.find(({ id }) => id === binding.assignmentId);
  if (!assignment) fail('CAMPAIGN_WORKER_RECOVERY', 'worker has no durable assignment recovery capability');
  workerRecoveryBinding(environment, assignment.attachToken, sessionId);
  const legacyOriginalWorktree = legacyRecoveryTarget(binding, assignment, ledger, environment);
  if (legacyOriginalWorktree) {
    return {
      legacy: true,
      context: `Retained worker ${sessionId}: owning top-level project ${binding.repositoryRoot}; the native Codex session is authenticated at original checkout ${legacyOriginalWorktree}, while a completed legacy recovery moved this assignment binding to ${binding.worktree}. Fresh complete host evidence and immutable dispatch/recovery history prove both paths. Use your existing attachment capability with ponytail worktree recover ${assignment.attachToken} from an existing neutral directory to reconcile the branch and binding to ${legacyOriginalWorktree}; Ponytail verifies both checkouts and the assignment revision before transfer. Then run canonical project adoption/setup and resume the same assignment. Preserve both checkouts, session, and delivery history.`,
    };
  }
  return {
    legacy: false,
    context: `Retained worker ${sessionId}: owning top-level project ${binding.repositoryRoot}; original checkout ${binding.worktree}; branch ${binding.branch}; main worktree ${binding.mainWorktree || '(legacy source enrolls on recovery)'}. If the checkout is missing, run ponytail worktree recover ${assignment.attachToken} from an existing neutral directory, then canonical project adoption/setup. Recover yourself without waiting for a coordinator action; never replace this session or overwrite local changes. Git reconstruction restores committed content only; preserve native snapshots for unsaved files.`,
  };
}

function workerRecoveryContext(environment, sessionId) {
  return workerRecoveryContextDetails(environment, sessionId)?.context ?? null;
}

function recoverWorker(environment, token) {
  let binding = workerRecoveryBinding(environment, token);
  if (binding.branch === null) {
    if (binding.pendingRevision !== null) return upgradeWorker(environment, token, binding.pendingRevision);
    return withWorktreeLock(binding.repositoryRoot, environment, () => withLedgerLock(binding.repositoryRoot, binding.campaignId, environment, () => (
      recoverCheckout(workerRecoveryBinding(environment, token, binding.sessionId))
    )));
  }
  // Legacy bindings explicitly enroll a source at their first capability-owned
  // recovery. Historical readers never invent provenance or mutate old records.
  if (!binding.mainWorktree) {
    const source = recoverySource(binding.repositoryRoot);
    binding = withWorkerBindingsLock(environment, state => {
      const current = state.bindings.find(item => item.attachTokenHash === binding.attachTokenHash);
      if (!current) fail('CAMPAIGN_WORKER_RECOVERY', 'worker binding changed during recovery');
      Object.assign(current, source);
      return current;
    });
  }
  const ledger = readLedger(binding.repositoryRoot, binding.campaignId, environment);
  const assignment = ledger.assignments.find(item => item.id === binding.assignmentId);
  if (!assignment || crypto.createHash('sha256').update(assignment.attachToken).digest('hex') !== binding.attachTokenHash) {
    fail('CAMPAIGN_WORKER_RECOVERY', 'durable assignment no longer authorizes this worker recovery');
  }
  const observation = readHostObservation(binding.repositoryRoot, binding.campaignId, environment);
  const hostSession = observation?.sessions.find(item => item.sessionId === binding.sessionId);
  if (hostSession?.worktree && hostSession.worktree !== assignment.worktree) {
    return withWorktreeLock(binding.repositoryRoot, environment, () => withLedgerLock(binding.repositoryRoot, binding.campaignId, environment, current => {
      const currentBinding = workerRecoveryBinding(environment, token, binding.sessionId);
      const currentAssignment = current.assignments.find(item => item.id === binding.assignmentId);
      const currentObservation = readHostObservation(binding.repositoryRoot, binding.campaignId, environment);
      const currentHostSession = currentObservation?.sessions.find(item => item.sessionId === binding.sessionId);
      if (currentAssignment?.worktree === currentBinding.worktree && currentHostSession?.worktree === currentBinding.worktree) {
        return recoverCheckout(currentBinding);
      }
      const originalWorktree = currentAssignment && legacyRecoveryTarget(currentBinding, currentAssignment, current, environment);
      if (!originalWorktree) {
        fail('CAMPAIGN_WORKER_RECOVERY', 'legacy recovery requires fresh native host evidence and the original authenticated dispatch/recovery history');
      }
      const result = recoverLegacyCheckout({ ...currentBinding, worktree: currentAssignment.worktree }, originalWorktree,
        currentBinding.revision, currentAssignment.workerRevision);
      replaceRecoveredWorkerBinding(environment, binding.assignmentId, { ...currentBinding, worktree: originalWorktree, revision: result.revision });
      currentAssignment.worktree = originalWorktree;
      const worker = workerFor(current.workers, currentAssignment);
      if (worker) { worker.worktree = originalWorktree; worker.revision = result.revision; }
      return result;
    }));
  }
  const pending = ledger.pendingActions.find(item => item.assignmentId === binding.assignmentId && item.type === 'RECOVER_WORKTREE');
  if (pending && (pending.payload.previousWorktree !== binding.worktree || pending.payload.branch !== binding.branch
    || git(binding.mainWorktree, ['rev-parse', '--verify', `refs/heads/${binding.branch}^{commit}`]) !== pending.payload.revision)) {
    fail('CAMPAIGN_WORKER_RECOVERY', 'preserved branch does not match the existing recovery action; no checkout was reconstructed');
  }
  const recovery = recoverCheckout(binding);
  if (pending) {
    withWorktreeLock(binding.repositoryRoot, environment, () => withLedgerLock(binding.repositoryRoot, binding.campaignId, environment, current => {
      workerRecoveryBinding(environment, token, binding.sessionId);
      const action = current.pendingActions.find(item => item.id === pending.id);
      const result = { ok: true, sessionId: binding.sessionId, worktree: binding.worktree, branch: binding.branch, revision: recovery.revision };
      if (action && (action.payload.previousWorktree !== recovery.worktree || action.payload.revision !== recovery.revision
        || git(recovery.worktree, ['status', '--porcelain']).length !== 0)) {
        fail('CAMPAIGN_WORKER_RECOVERY', 'original recovery action cannot be acknowledged from changed or dirty state');
      }
      // The authenticated worker restores the same path, not a new host
      // association. Record physical Git proof without inventing host evidence.
      recordActionResult(current, pending.id, result);
    }));
  }
  return recovery;
}

function resolveInvocationWorktree(invocationWorktree, environment = process.env, allowWorkerRead = true) {
  const canonicalInvocationWorktree = fs.realpathSync(invocationWorktree);
  const matches = readWorkerBindings(environment).bindings.filter((binding) => binding.worktree === canonicalInvocationWorktree);
  if (matches.length === 0) return { invocationWorktree: canonicalInvocationWorktree, effectiveWorktree: canonicalInvocationWorktree, workerBinding: null };
  if (matches.length !== 1) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `worktree ${canonicalInvocationWorktree} has multiple authenticated owners`);
  const workerBinding = matches[0];
  if (!allowWorkerRead) fail('CAMPAIGN_WORKER_MUTATION', `worker worktree belongs to campaign ${workerBinding.campaignId} in ${workerBinding.repositoryRoot}; run the mutation from its coordinator worktree`);
  if (!fs.existsSync(workerBinding.repositoryRoot)) fail('CAMPAIGN_WORKER_OWNER_MISSING', `owning worktree is unavailable: ${workerBinding.repositoryRoot}`);
  const ledger = readLedger(workerBinding.repositoryRoot, workerBinding.campaignId, environment);
  const assignment = ledger.assignments.find((item) => item.id === workerBinding.assignmentId);
  if (!assignment || assignment.state === 'ARCHIVED') fail('CAMPAIGN_WORKER_BINDING_STALE', 'worker ownership binding no longer has an active assignment');
  return { invocationWorktree: canonicalInvocationWorktree, effectiveWorktree: workerBinding.repositoryRoot, workerBinding };
}

function newLedger(repositoryRoot, campaignId, coordinatorSessionId) {
  const identity = repositoryIdentity(repositoryRoot);
  return readLedgerV8({
    schemaVersion: 8,
    campaignId,
    topLevelWorktree: repositoryRoot,
    coordinatorSessionId,
    integrationBranch: identity.branch,
    integrationRevision: identity.revision,
    assignments: [],
    pendingActions: [],
    completedActions: [],
    workers: [],
    dispatchRetries: [],
  });
}

function readLedger(repositoryRoot, campaignId, environment = process.env) {
  const file = ledgerPath(repositoryRoot, campaignId, environment);
  const boundSession = coordinatorBinding(environment.PLUGIN_DATA, repositoryRoot, campaignId);
  if (!fs.existsSync(file)) return newLedger(repositoryRoot, campaignId, environment.PONYTAIL_SESSION_ID || boundSession);
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_LEDGER_IO', `${file}: ${error.message}`, 2); }
  const ledger = readCurrentLedger(value, file);
  if (ledger.campaignId !== campaignId || ledger.topLevelWorktree !== repositoryRoot) fail('CAMPAIGN_LEDGER_SCOPE', `${file}: ledger scope does not match this campaign worktree`);
  if (boundSession && ledger.coordinatorSessionId && boundSession !== ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_CONFLICT', `ledger coordinator ${ledger.coordinatorSessionId} disagrees with bound coordinator ${boundSession}`);
  if (!ledger.coordinatorSessionId && boundSession) ledger.coordinatorSessionId = boundSession;
  return ledger;
}

function writeLedger(file, ledger) {
  const value = readLedgerV8(ledger, file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, file);
}

function withLedgerLock(repositoryRoot, campaignId, environment, operation) {
  const file = ledgerPath(repositoryRoot, campaignId, environment);
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx', 0o600);
      try {
        const ledger = readLedger(repositoryRoot, campaignId, environment);
        const result = operation(ledger);
        writeLedger(file, ledger);
        return result;
      } finally {
        fs.closeSync(descriptor);
        fs.unlinkSync(lock);
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - fs.statSync(lock).mtimeMs > 5000) { fs.unlinkSync(lock); continue; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('CAMPAIGN_LEDGER_LOCK', 'timed out waiting for campaign ledger lock', 2);
}

function withWorktreeLock(repositoryRoot, environment, operation) {
  const scope = crypto.createHash('sha256').update(repositoryRoot).digest('hex');
  const lock = path.join(stateDirectory(environment), scope, 'advance.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx', 0o600);
      try {
        fs.writeSync(descriptor, String(process.pid));
        return operation();
      }
      finally {
        fs.closeSync(descriptor);
        fs.unlinkSync(lock);
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = fs.readFileSync(lock, 'utf8'); }
      catch (readError) { if (readError.code === 'ENOENT') continue; throw readError; }
      if (/^[1-9][0-9]*$/.test(owner) && Number.isSafeInteger(Number(owner))) {
        try { process.kill(Number(owner), 0); }
        catch (ownerError) {
          if (ownerError.code === 'ESRCH') {
            // Serialize contenders reaping this dead owner so a second reaper
            // cannot unlink a fresh owner's lock after the first removes it.
            const reaper = `${lock}.${owner}.reap`;
            let descriptor;
            try {
              descriptor = fs.openSync(reaper, 'wx', 0o600);
              if (fs.readFileSync(lock, 'utf8') === owner) fs.unlinkSync(lock);
            } catch (readError) {
              if (!['ENOENT', 'EEXIST'].includes(readError.code)) throw readError;
            } finally {
              if (descriptor !== undefined) { fs.closeSync(descriptor); fs.unlinkSync(reaper); }
            }
            continue;
          }
          if (ownerError.code !== 'EPERM') throw ownerError;
        }
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('CAMPAIGN_WORKTREE_LOCK', `timed out waiting for campaign worktree lock: ${lock}`, 2);
}

function setLedgerCoordinator(repositoryRoot, campaignId, sessionId, environment = process.env) {
  return withLedgerLock(repositoryRoot, campaignId, environment, (ledger) => {
    if (ledger.coordinatorSessionId && ledger.coordinatorSessionId !== sessionId) fail('CAMPAIGN_COORDINATOR_CONFLICT', `campaign ${campaignId} ledger is owned by coordinator ${ledger.coordinatorSessionId}`);
    ledger.coordinatorSessionId = sessionId;
    return ledger;
  });
}

function releaseLedgerCoordinator(repositoryRoot, campaignId, sessionId, environment = process.env) {
  return withLedgerLock(repositoryRoot, campaignId, environment, (ledger) => {
    if (ledger.coordinatorSessionId !== sessionId) fail('CAMPAIGN_COORDINATOR_CONFLICT', `campaign ${campaignId} ledger is owned by another coordinator`);
    if (ledger.assignments.some((assignment) => assignment.state !== 'ARCHIVED')) fail('CAMPAIGN_COORDINATOR_ACTIVE', 'coordinator cannot be released while campaign assignments remain active');
    ledger.coordinatorSessionId = null;
    return ledger;
  });
}

function resolveGraph(repositoryRoot, input) {
  if (input !== undefined) return campaignGraph(repositoryRoot, input);
  const inventory = buildRepositoryInventory(repositoryRoot, require('./campaign-census').readManagementConfig(repositoryRoot));
  if (!inventory.valid) fail('CAMPAIGN_INVENTORY_INVALID', 'repository campaign inventory is invalid');
  if (inventory.activeCampaigns.length === 0) fail('CAMPAIGN_ACTIVE_REQUIRED', 'no active campaign found');
  if (inventory.activeCampaigns.length > 1) {
    fail('CAMPAIGN_ACTIVE_AMBIGUOUS', `select one active campaign: ${inventory.activeCampaigns.map(({ rootPlanId }) => rootPlanId).join(', ')}`);
  }
  return campaignGraph(repositoryRoot, inventory.activeCampaigns[0].rootPlanId);
}

function workerFor(workers, assignment) {
  return workers.find((worker) => (
    (assignment.sessionId && worker.sessionId === assignment.sessionId)
    || (assignment.worktree && worker.worktree === assignment.worktree)
  )) ?? null;
}

function recoverableWorkerRevision(ledger, assignment, hostObservation, hostSession, binding, delivery) {
  const deliveredRebase = ['REBASE_REQUIRED', 'MERGED'].includes(assignment.state) && Boolean(delivery);
  const pendingRecovery = ledger.pendingActions.find(({ assignmentId, type }) => assignmentId === assignment.id && type === 'RECOVER_WORKTREE');
  const workingRecovery = hostSession?.state === 'working' && pendingRecovery?.payload.sessionId === assignment.sessionId
    && pendingRecovery.payload.previousWorktree === assignment.worktree
    && pendingRecovery.payload.branch === assignment.branch;
  if (!((assignment.state === 'ACTIVE' && !delivery) || deliveredRebase)
    || assignment.worktreeExists || !hostObservation || !binding
    || Date.now() - Date.parse(hostObservation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
    || !hostObservation.completeSessionIds.includes(assignment.sessionId)
    || !(['waiting', 'completed'].includes(hostSession?.state) || workingRecovery) || !hostSession.managedWorktree
    || hostSession.worktree !== assignment.worktree || binding.repositoryRoot !== ledger.topLevelWorktree
    || binding.campaignId !== ledger.campaignId || binding.assignmentId !== assignment.id
    || binding.sessionId !== assignment.sessionId || binding.worktree !== assignment.worktree
    || binding.branch !== assignment.branch || !assignment.branch) return null;
  const result = spawnSync('git', ['-C', ledger.topLevelWorktree, 'rev-parse', '--verify', `refs/heads/${assignment.branch}^{commit}`], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const revision = result.stdout.trim();
  if (workingRecovery && pendingRecovery.payload.revision !== revision) return null;
  const workerRevision = workingRecovery
    ? ledger.assignments.find(({ id }) => id === assignment.id)?.workerRevision : assignment.workerRevision;
  if (deliveredRebase && (delivery.revision !== revision || workerRevision !== revision)) return null;
  return spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', assignment.dispatchRevision, revision]).status === 0
    ? revision : null;
}

function verifiedMissingDeliveryRevision(ledger, assignment, binding, delivery, hostObservation) {
  if (!binding || !delivery || !hostObservation || fs.existsSync(binding.worktree)
    || Date.now() - Date.parse(hostObservation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
    || !hostObservation.completeSessionIds.includes(assignment.sessionId)
    || binding.repositoryRoot !== ledger.topLevelWorktree || binding.campaignId !== ledger.campaignId
    || binding.assignmentId !== assignment.id || binding.sessionId !== assignment.sessionId
    || binding.worktree !== assignment.worktree || binding.branch !== assignment.branch
    || delivery.assignmentId !== assignment.id || !assignment.branch) return null;
  const hostSession = hostObservation.sessions.find(({ sessionId }) => sessionId === assignment.sessionId);
  if (!['waiting', 'completed'].includes(hostSession?.state) || !hostSession.managedWorktree
    || hostSession.worktree !== assignment.worktree) return null;
  const branchTip = spawnSync('git', ['-C', ledger.topLevelWorktree, 'rev-parse', '--verify', `refs/heads/${assignment.branch}^{commit}`], { encoding: 'utf8' });
  return branchTip.status === 0 && branchTip.stdout.trim() === delivery.revision ? delivery.revision : null;
}

function observedWorkers(graph, ledger, environment, hostObservation) {
  if (!environment) return ledger.workers;
  const plansById = new Map(graph.plans.map((plan) => [plan.id, plan]));
  const deliveries = new Map(readWorkerDeliveries(ledger.topLevelWorktree, ledger.campaignId, environment).deliveries.map((delivery) => [delivery.assignmentId, delivery]));
  const hostSessions = new Map((hostObservation?.sessions ?? []).map((session) => [session.sessionId, session]));
  const workers = ledger.workers.map((worker) => {
    const assignment = ledger.assignments.find((item) => workerFor([worker], item));
    const delivery = assignment ? deliveries.get(assignment.id) : null;
    return { ...worker, evidenceComplete: Boolean(delivery && delivery.revision === worker.revision) };
  });
  for (const binding of readWorkerBindings(environment).bindings.filter((item) => item.repositoryRoot === ledger.topLevelWorktree && item.campaignId === ledger.campaignId)) {
    const assignment = ledger.assignments.find((item) => item.id === binding.assignmentId && item.state !== 'ARCHIVED');
    if (!assignment) continue;
    const existing = workers.find((worker) => worker.sessionId === binding.sessionId || worker.worktree === binding.worktree);
    const plan = plansById.get(assignment.planId);
    const hostSession = hostSessions.get(binding.sessionId);
    const delivery = deliveries.get(assignment.id);
    let observation;
    if (!fs.existsSync(binding.worktree)) {
      const revision = verifiedMissingDeliveryRevision(ledger, assignment, binding, delivery, hostObservation);
      observation = { sessionId: binding.sessionId, worktree: binding.worktree, branch: binding.branch, revision: revision ?? binding.revision, clean: Boolean(revision), activity: revision ? 'completed' : 'missing', evidenceComplete: Boolean(revision), worktreeArchived: existing?.worktreeArchived ?? false, sessionArchived: existing?.sessionArchived ?? false };
    } else {
      const identity = repositoryIdentity(binding.worktree);
      const clean = git(binding.worktree, ['status', '--porcelain']).length === 0;
      const deliveredActive = ['waiting', 'working'].includes(hostSession?.state)
        && hostObservation && Date.now() - Date.parse(hostObservation.observedAt) <= HOST_OBSERVATION_MAX_AGE_MS
        && hostObservation.completeSessionIds.includes(binding.sessionId) && hostSession.managedWorktree
        && hostSession.worktree === binding.worktree && binding.branch === assignment.branch
        && identity.branch === binding.branch && clean && delivery?.revision === identity.revision;
      observation = {
        sessionId: binding.sessionId,
        worktree: binding.worktree,
        branch: identity.branch,
        revision: identity.revision,
        clean,
        activity: hostSession?.state === 'completed' || deliveredActive ? 'completed'
          : ['missing', 'archived', 'unknown'].includes(hostSession?.state) ? 'missing'
            : plan?.lifecycle === graph.lifecycle.successfulCompletion && !hostObservation ? 'completed' : 'active',
        evidenceComplete: deliveries.get(assignment.id)?.revision === identity.revision,
        worktreeArchived: existing?.worktreeArchived ?? false,
        sessionArchived: existing?.sessionArchived ?? false,
      };
    }
    if (existing) Object.assign(existing, observation);
    else workers.push(observation);
  }
  for (const worker of workers) {
    if (ledger.assignments.some(assignment => assignment.state !== 'ARCHIVED' && workerFor([worker], assignment))) continue;
    const hostSession = hostSessions.get(worker.sessionId);
    if (!fs.existsSync(worker.worktree)) { worker.clean = false; worker.activity = 'missing'; continue; }
    const identity = repositoryIdentity(worker.worktree);
    worker.branch = identity.branch;
    worker.revision = identity.revision;
    worker.clean = git(worker.worktree, ['status', '--porcelain']).length === 0;
    worker.activity = ['waiting', 'completed'].includes(hostSession?.state) && hostSession.worktree === worker.worktree
      && hostSession.managedWorktree ? 'idle' : 'active';
  }
  return workers;
}

function diagnosticRecord(code, message, assignment = {}, extra = {}) {
  return {
    code,
    message,
    planId: assignment.planId ?? null,
    assignmentId: assignment.id ?? null,
    sessionId: assignment.sessionId ?? null,
    worktree: assignment.worktree ?? null,
    ...extra,
  };
}

function lifecycleCompatible(assignmentState, lifecycle, graphLifecycle, activationPending = false) {
  if (activationPending && lifecycle === graphLifecycle.initial
    && ['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE', 'MERGED'].includes(assignmentState)) return true;
  if (assignmentState === 'DISPATCH_PENDING') return [graphLifecycle.initial, graphLifecycle.activeWork].includes(lifecycle);
  if (['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE'].includes(assignmentState)) return lifecycle === graphLifecycle.activeWork;
  if (assignmentState === 'MERGED') return [graphLifecycle.activeWork, graphLifecycle.successfulCompletion].includes(lifecycle);
  if (['CLEANUP_PENDING', 'ARCHIVED'].includes(assignmentState)) return lifecycle === graphLifecycle.successfulCompletion;
  return false;
}

function effectiveAssignmentState(assignment, plan, worker, integrationRevision, repositoryRoot, graphLifecycle, activationPending = false) {
  if (assignment.state === 'ARCHIVED') return 'ARCHIVED';
  if (['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE', 'MERGED'].includes(assignment.state)
    && (plan.lifecycle === graphLifecycle.activeWork || activationPending)
    && worker?.activity === 'completed' && worker.evidenceComplete) {
    if (!worker.clean || !worker.revision) return 'WORK_COMPLETE';
    const containsIntegration = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', integrationRevision, worker.revision]).status === 0;
    const alreadyIntegrated = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', worker.revision, integrationRevision]).status === 0;
    if (alreadyIntegrated) return 'MERGED';
    return containsIntegration ? 'READY_TO_MERGE' : 'REBASE_REQUIRED';
  }
  if (assignment.state === 'MERGED' && plan.lifecycle === graphLifecycle.activeWork
    && worker && worker.activity !== 'missing'
    && (!worker.clean || (worker.revision
      && spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', worker.revision, integrationRevision]).status !== 0))) return 'ACTIVE';
  if (assignment.state === 'MERGED' && plan.lifecycle === graphLifecycle.successfulCompletion) return 'CLEANUP_PENDING';
  if (assignment.state === 'CLEANUP_PENDING' && assignment.worktreeArchived && assignment.sessionArchived) return 'ARCHIVED';
  return assignment.state;
}

function reconcile(graph, ledger, invocationWorktree = ledger.topLevelWorktree, environment = null) {
  const plansById = new Map(graph.plans.map((plan) => [plan.id, plan]));
  const integrationRevision = git(ledger.topLevelWorktree, ['rev-parse', 'HEAD']);
  const hostObservation = environment ? readHostObservation(ledger.topLevelWorktree, graph.campaignId, environment) : null;
  const hostSessions = new Map((hostObservation?.sessions ?? []).map((session) => [session.sessionId, session]));
  const completeSessionIds = new Set(hostObservation?.completeSessionIds ?? []);
  const hostObservationStale = hostObservation
    ? Date.now() - Date.parse(hostObservation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
    : false;
  const workers = observedWorkers(graph, ledger, environment, hostObservation);
  const bindingsByAssignment = new Map((environment ? readWorkerBindings(environment).bindings : [])
    .filter(({ repositoryRoot, campaignId }) => repositoryRoot === ledger.topLevelWorktree && campaignId === ledger.campaignId)
    .map((binding) => [binding.assignmentId, binding]));
  const activationAssignments = new Set(ledger.assignments.filter(assignment => {
    if (plansById.get(assignment.planId)?.lifecycle !== graph.lifecycle.initial) return false;
    const binding = bindingsByAssignment.get(assignment.id);
    return binding && binding.sessionId === assignment.sessionId && binding.worktree === assignment.worktree
      && binding.branch === assignment.branch && binding.coordinatorSessionId === ledger.coordinatorSessionId
      && binding.attachTokenHash === crypto.createHash('sha256').update(assignment.attachToken).digest('hex')
      && ledger.completedActions.some(item => item.assignmentId === assignment.id
        && ['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(item.type) && item.result.ok === true
        && item.result.sessionId === assignment.sessionId && item.result.worktree === assignment.worktree
        && item.result.branch === assignment.branch);
  }).map(assignment => assignment.id));
  const assignments = ledger.assignments.map((assignment) => {
    const plan = plansById.get(assignment.planId);
    const worker = workerFor(workers, assignment);
    const hostSession = assignment.sessionId ? hostSessions.get(assignment.sessionId) : null;
    return {
      ...assignment,
      workerRevision: worker?.revision ?? assignment.workerRevision,
      state: plan ? effectiveAssignmentState(assignment, plan, worker, integrationRevision, ledger.topLevelWorktree, graph.lifecycle, activationAssignments.has(assignment.id)) : assignment.state,
      planLifecycle: plan?.lifecycle ?? null,
      hostState: hostSession?.state ?? (assignment.sessionId ? 'unknown' : null),
      managedWorktree: hostSession?.managedWorktree ?? null,
      worktreeExists: Boolean(assignment.worktree && fs.existsSync(assignment.worktree)),
    };
  }).sort((left, right) => left.planId.localeCompare(right.planId) || left.id.localeCompare(right.id));
  const deliveriesByAssignment = new Map((environment ? readWorkerDeliveries(ledger.topLevelWorktree, ledger.campaignId, environment).deliveries : [])
    .map((delivery) => [delivery.assignmentId, delivery]));
  const recoveryRevisions = new Map(assignments.map((assignment) => [assignment.id, recoverableWorkerRevision(
    ledger,
    assignment,
    hostObservation,
    assignment.sessionId ? hostSessions.get(assignment.sessionId) : null,
    bindingsByAssignment.get(assignment.id),
    deliveriesByAssignment.get(assignment.id),
  )]).filter(([, revision]) => revision));
  const assignedPlans = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.planId));
  const readyPlans = runnablePlans(graph).filter((plan) => (
    plan.lifecycle === graph.lifecycle.initial
    && !assignedPlans.has(plan.id)
  )).map((plan) => plan.id).sort();
  const occupiedSessions = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.sessionId).filter(Boolean));
  const occupiedWorktrees = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.worktree).filter(Boolean));
  const createdSessionIds = campaignCreatedSessionIds(ledger);
  const idleWorkers = workers.filter((worker) => worker.activity === 'idle' && worker.clean && !worker.worktreeArchived && !worker.sessionArchived
    && createdSessionIds.has(worker.sessionId)
    && (!environment || (hostObservation && !hostObservationStale && completeSessionIds.has(worker.sessionId)))
    && !occupiedSessions.has(worker.sessionId) && !occupiedWorktrees.has(worker.worktree)).sort((left, right) => (left.sessionId ?? '').localeCompare(right.sessionId ?? ''));
  const sessionAssignments = assignments.filter(({ sessionId }) => sessionId !== null).sort((left, right) => left.sessionId.localeCompare(right.sessionId) || left.id.localeCompare(right.id));
  const currentSessionAssignments = new Map();
  for (const assignment of sessionAssignments) {
    const current = currentSessionAssignments.get(assignment.sessionId);
    if (!current || (current.state === 'ARCHIVED' && assignment.state !== 'ARCHIVED')) currentSessionAssignments.set(assignment.sessionId, assignment);
  }
  const currentSessions = [...currentSessionAssignments.values()];
  const workingSessions = currentSessions.filter(({ hostState }) => hostState === 'working');
  const waitingSessions = currentSessions.filter(({ hostState }) => hostState === 'waiting');
  const finishedSessions = currentSessions.filter(({ hostState }) => hostState === 'completed');
  const idleSessions = currentSessions.filter(({ hostState }) => ['waiting', 'completed'].includes(hostState));
  const worktrees = sessionAssignments.filter(({ worktree }) => worktree !== null).sort((left, right) => left.worktree.localeCompare(right.worktree) || left.id.localeCompare(right.id));
  const inProgressPlans = graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.activeWork).map((plan) => {
    const assignment = assignments.find((item) => item.state !== 'ARCHIVED' && item.planId === plan.id);
    return { planId: plan.id, assignmentId: assignment?.id ?? null, sessionId: assignment?.sessionId ?? null, worktree: assignment?.worktree ?? null };
  }).sort((left, right) => left.planId.localeCompare(right.planId));
  const reusableWorkers = idleWorkers;
  const status = {
    schemaVersion: 9,
    campaignId: graph.campaignId,
    invocationWorktree,
    effectiveWorktree: ledger.topLevelWorktree,
    coordinatorSessionId: ledger.coordinatorSessionId,
    integrationRevision,
    observedAt: hostObservation?.observedAt ?? null,
    assignments,
    sessionAssignments,
    workingSessions,
    idleSessions,
    waitingSessions,
    finishedSessions,
    worktrees,
    inProgressPlans,
    readyPlans,
    activeWorkers: assignments.filter((assignment) => ['DISPATCH_PENDING', 'ACTIVE', 'WORK_COMPLETE'].includes(assignment.state)),
    idleWorkers,
    reusableWorkers,
    rebaseRequired: assignments.filter((assignment) => assignment.state === 'REBASE_REQUIRED'),
    readyToMerge: assignments.filter((assignment) => assignment.state === 'READY_TO_MERGE'),
    cleanupPending: assignments.filter((assignment) => assignment.state === 'CLEANUP_PENDING'),
    continuations: [],
    pendingActions: ledger.pendingActions,
    diagnostics: [],
  };
  const activeAssignments = assignments.filter(({ state }) => state !== 'ARCHIVED');
  for (const [field, label] of [['planId', 'plan'], ['sessionId', 'session'], ['worktree', 'worktree']]) {
    const groups = new Map();
    for (const assignment of activeAssignments) {
      const value = assignment[field];
      if (value === null) continue;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(assignment);
    }
    for (const [value, group] of groups) if (group.length > 1) status.diagnostics.push(diagnosticRecord(
      'CAMPAIGN_ASSIGNMENT_CONFLICT',
      `more than one active assignment uses ${label} ${value}`,
      group[0],
      { assignmentIds: group.map(({ id }) => id).sort() },
    ));
  }
  for (const plan of graph.plans) {
    if (plan.id !== graph.campaignId && plan.lifecycle === graph.lifecycle.activeWork
      && !activeAssignments.some(({ planId }) => planId === plan.id)) {
      status.diagnostics.push(diagnosticRecord('CAMPAIGN_PLAN_UNASSIGNED', `active plan ${plan.id} has no active assignment`, { planId: plan.id }));
    }
  }
  for (const assignment of assignments) {
    if (!plansById.has(assignment.planId)) status.diagnostics.push(diagnosticRecord('CAMPAIGN_ASSIGNMENT_PLAN_MISSING', `assignment ${assignment.id} references missing plan ${assignment.planId}`, assignment));
    else if (!lifecycleCompatible(assignment.state, assignment.planLifecycle, graph.lifecycle, activationAssignments.has(assignment.id))) status.diagnostics.push(diagnosticRecord('CAMPAIGN_ASSIGNMENT_LIFECYCLE', `assignment ${assignment.id} state ${assignment.state} is incompatible with plan lifecycle ${assignment.planLifecycle}`, assignment));
    const worker = workerFor(workers, assignment);
    if (assignment.state !== 'DISPATCH_PENDING' && assignment.state !== 'ARCHIVED' && !assignment.worktreeArchived
      && !(assignment.state === 'CLEANUP_PENDING' && assignment.hostState === 'archived')
      && !recoveryRevisions.has(assignment.id) && (!worker || worker.activity === 'missing')) {
      status.diagnostics.push(diagnosticRecord('CAMPAIGN_WORKER_MISSING', `assignment ${assignment.id} has no live worker observation`, assignment));
    }
    if (environment && assignment.state !== 'ARCHIVED' && assignment.sessionId) {
      const hostSession = hostSessions.get(assignment.sessionId);
      if (!hostObservation) status.diagnostics.push(diagnosticRecord('CAMPAIGN_HOST_OBSERVATION_MISSING', `assignment ${assignment.id} has no Codex host observation`, assignment));
      else if (hostObservationStale) status.diagnostics.push(diagnosticRecord('CAMPAIGN_HOST_OBSERVATION_STALE', `host observation for session ${assignment.sessionId} is older than five minutes`, assignment));
      else if (!completeSessionIds.has(assignment.sessionId)) status.diagnostics.push(diagnosticRecord('CAMPAIGN_HOST_OBSERVATION_INCOMPLETE', `host observation is incomplete for session ${assignment.sessionId}`, assignment));
      else if (!hostSession || hostSession.state === 'missing') {
        status.diagnostics.push(diagnosticRecord('CAMPAIGN_SESSION_MISSING', `session ${assignment.sessionId} is missing`, assignment));
        if (assignment.worktreeExists) status.diagnostics.push(diagnosticRecord('CAMPAIGN_WORKTREE_SESSION_MISSING', `worktree ${assignment.worktree} remains after session ${assignment.sessionId} went missing`, assignment));
      } else if (hostSession.state === 'archived' && assignment.state !== 'CLEANUP_PENDING') status.diagnostics.push(diagnosticRecord('CAMPAIGN_SESSION_ARCHIVED', `session ${assignment.sessionId} is archived while its assignment remains active`, assignment));
      else if (hostSession.state === 'unknown') status.diagnostics.push(diagnosticRecord('CAMPAIGN_SESSION_UNKNOWN', `session ${assignment.sessionId} could not be observed`, assignment));
      if (hostSession?.worktree && assignment.worktree && hostSession.worktree !== assignment.worktree) status.diagnostics.push(diagnosticRecord('CAMPAIGN_SESSION_WORKTREE_MISMATCH', `session ${assignment.sessionId} reports worktree ${hostSession.worktree} instead of ${assignment.worktree}`, assignment));
      if (hostSession?.worktree === ledger.topLevelWorktree) status.diagnostics.push(diagnosticRecord('CAMPAIGN_SESSION_IN_COORDINATOR_WORKTREE', `session ${assignment.sessionId} runs in the coordinator worktree`, assignment));
      if (hostSession && !hostSession.managedWorktree && !(assignment.state === 'CLEANUP_PENDING' && assignment.hostState === 'archived')) status.diagnostics.push(diagnosticRecord('CAMPAIGN_WORKTREE_NOT_MANAGED', `session ${assignment.sessionId} is not in a Codex-managed worktree`, assignment));
    }
    if (assignment.state !== 'ARCHIVED' && assignment.worktree && !assignment.worktreeArchived && !assignment.worktreeExists) {
      const delivered = ['READY_TO_MERGE', 'MERGED', 'CLEANUP_PENDING'].includes(assignment.state);
      const recoveryRevision = recoveryRevisions.get(assignment.id);
      status.diagnostics.push(diagnosticRecord(
        delivered ? 'CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY' : recoveryRevision ? 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED' : 'CAMPAIGN_WORKTREE_MISSING',
        delivered ? `worker worktree is missing after verified delivery: ${assignment.worktree}`
          : recoveryRevision ? `worker worktree must be recovered at ${recoveryRevision}: ${assignment.worktree}`
            : `worker worktree is missing: ${assignment.worktree}`,
        assignment,
        recoveryRevision ? { revision: recoveryRevision } : {},
      ));
    }
    if (['MERGED', 'CLEANUP_PENDING'].includes(assignment.state)
      && (!assignment.workerRevision
        || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', assignment.workerRevision, integrationRevision]).status !== 0)) {
      status.diagnostics.push(diagnosticRecord('CAMPAIGN_CLEANUP_UNINTEGRATED', `assignment ${assignment.id} worker revision is not integrated`, assignment));
    }
  }
  const reservedWorkers = campaignWorkerCount(ledger);
  if (reservedWorkers >= CAMPAIGN_WORKER_LIMIT && idleWorkers.length === 0 && readyPlans.length > 0) {
    status.diagnostics.push(diagnosticRecord('CAMPAIGN_WORKER_CAPACITY_REACHED',
      `campaign retains ${reservedWorkers} worker slots; wait for safe reuse at limit ${CAMPAIGN_WORKER_LIMIT}`,
      {}, { limit: CAMPAIGN_WORKER_LIMIT, reservedWorkers }));
  }
  status.diagnostics.sort((left, right) => left.code.localeCompare(right.code)
    || (left.planId ?? '').localeCompare(right.planId ?? '')
    || (left.assignmentId ?? '').localeCompare(right.assignmentId ?? ''));
  const unresolvedBlockers = environment ? unresolvedExecutionBlockers(ledger, environment) : [];
  status.continuations = assignments.filter((assignment) => assignment.sessionId && assignment.worktree
    && assignment.planLifecycle === graph.lifecycle.activeWork
    && ['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'MERGED'].includes(assignment.state)).map((assignment) => {
    const objections = status.diagnostics.filter((item) => item.assignmentId === assignment.id
      || item.assignmentIds?.includes(assignment.id)).map((item) => item.code);
    objections.push(...unresolvedBlockers.filter(({ report }) => report.assignmentId === assignment.id).map(({ report }) => report.code));
    if (assignment.hostState === 'working') objections.push('HOST_SESSION_WORKING');
    else if (!['waiting', 'completed'].includes(assignment.hostState)) objections.push('HOST_SESSION_NOT_IDLE');
    if (ledger.pendingActions.some((item) => item.assignmentId === assignment.id)) objections.push('PENDING_ACTION');
    const phase = ['WORK_COMPLETE', 'REBASE_REQUIRED'].includes(assignment.state) ? 'INTEGRATION'
      : planIsRunnable(graph, assignment.planId) ? 'TASKLETS'
        : planIsReviewable(graph, assignment.planId) ? 'TASKLET_REVIEW' : 'PLAN_CONTINUATION';
    return { assignmentId: assignment.id, planId: assignment.planId, sessionId: assignment.sessionId,
      worktree: assignment.worktree, phase, ready: objections.length === 0, objections: [...new Set(objections)].sort() };
  });
  return readStatusV9(status);
}

function action(type, assignment, payload = {}) {
  if (['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(type)) payload = { ...payload, dispatch: { ready: true, state: 'NOT_STARTED', hostIdentity: null } };
  return readActionV6({
    schemaVersion: 6,
    id: crypto.randomUUID(),
    type,
    assignmentId: assignment.id,
    idempotencyKey: `${assignment.id}:${type}`,
    payload,
  });
}

function dispatchRecord(pendingAction) {
  if (!pendingAction.payload.dispatch) pendingAction.payload.dispatch = { ready: true, state: 'NOT_STARTED', hostIdentity: null };
  return pendingAction.payload.dispatch;
}

function planIsEligible(graph, planId, selection) {
  const completedPlans = new Set(graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.successfulCompletion).map(({ id }) => id));
  const plan = graph.plans.find(({ id }) => id === planId);
  return Boolean(plan)
    && [graph.lifecycle.initial, graph.lifecycle.activeWork].includes(plan.lifecycle)
    && Boolean(plan[selection]?.taskletIds.length)
    && plan.dependsOn.every((id) => completedPlans.has(id))
    && !graph.plans.some(({ parentPlanId, id }) => parentPlanId === plan.id && !completedPlans.has(id));
}

function planIsRunnable(graph, planId) {
  return planIsEligible(graph, planId, 'runnableTasklets');
}

function planIsReviewable(graph, planId) {
  return planIsEligible(graph, planId, 'reviewableSprint');
}

function planIsPlannable(graph, planId) {
  const completedPlans = new Set(graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.successfulCompletion).map(({ id }) => id));
  const plan = graph.plans.find(({ id }) => id === planId);
  return Boolean(plan)
    && [graph.lifecycle.initial, graph.lifecycle.activeWork].includes(plan.lifecycle)
    && plan.planningSprint?.planningStatus === 'STUB'
    && plan.dependsOn.every((id) => completedPlans.has(id))
    && !graph.plans.some(({ parentPlanId, id }) => parentPlanId === plan.id && !completedPlans.has(id));
}

function runnablePlans(graph) {
  return graph.plans.filter(({ id }) => planIsRunnable(graph, id)).sort((left, right) => left.id.localeCompare(right.id));
}

function readRunnablePlansV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'plans'], 'runnable plans');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'unsupported runnable plans version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `runnable plans ${key} must be a nonempty string`);
  }
  if (!Array.isArray(value.plans)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'runnable plans must be an array');
  const planIds = new Set();
  for (const plan of value.plans) {
    exactKeys(plan, ['planId', 'path', 'lifecycle', 'sprintId', 'taskletIds'], 'runnable plan');
    for (const key of ['planId', 'path', 'lifecycle', 'sprintId']) {
      if (typeof plan[key] !== 'string' || !plan[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `runnable plan ${key} must be a nonempty string`);
    }
    if (path.posix.isAbsolute(plan.path) || plan.path.includes('\\') || plan.path.split('/').some((part) => !part || part === '.' || part === '..')) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'runnable plan path must be repository relative');
    if (planIds.has(plan.planId)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'duplicate runnable plan');
    planIds.add(plan.planId);
    if (!Array.isArray(plan.taskletIds) || plan.taskletIds.length === 0 || plan.taskletIds.some((id) => typeof id !== 'string' || !id)
      || new Set(plan.taskletIds).size !== plan.taskletIds.length) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'runnable tasklets must be nonempty and unique');
  }
  return value;
}

function readTaskletPrerequisitesV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'effectiveWorktree', 'integrationRevision', 'prerequisites'], 'tasklet prerequisites');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported tasklet prerequisites version');
  for (const key of ['campaignId', 'effectiveWorktree', 'integrationRevision']) {
    if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `tasklet prerequisites ${key} must be nonempty`);
  }
  if (!Array.isArray(value.prerequisites)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'tasklet prerequisites must be an array');
  const seen = new Set();
  for (const prerequisite of value.prerequisites) {
    exactKeys(prerequisite, ['planId', 'sprintId', 'taskletId', 'requiredPlanId', 'requiredTaskletId', 'status'], 'tasklet prerequisite');
    for (const key of ['planId', 'sprintId', 'taskletId', 'requiredPlanId', 'requiredTaskletId']) {
      if (typeof prerequisite[key] !== 'string' || !prerequisite[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `tasklet prerequisite ${key} must be nonempty`);
    }
    if (!['PENDING', 'DONE', 'ERROR'].includes(prerequisite.status)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid tasklet prerequisite status');
    const key = JSON.stringify([prerequisite.planId, prerequisite.sprintId, prerequisite.taskletId, prerequisite.requiredPlanId, prerequisite.requiredTaskletId]);
    if (seen.has(key)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'duplicate tasklet prerequisite');
    seen.add(key);
  }
  return value;
}

const CampaignTaskletPrerequisitesReaders = Object.freeze({ V1: readTaskletPrerequisitesV1 });

function readBlockerReportV1(value) {
  exactKeys(value, ['schemaVersion', 'assignmentId', 'actionId', 'phase', 'state', 'code', 'summary', 'requiredAction'], 'execution blocker report');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported execution blocker report version');
  for (const key of ['assignmentId', 'summary', 'requiredAction']) {
    if (typeof value[key] !== 'string' || !value[key].trim()) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `execution blocker ${key} must be nonempty`);
  }
  optionalString(value.actionId, 'execution blocker actionId');
  if (!['DISPATCH', 'RECOVERY', 'ATTACH', 'EXECUTION'].includes(value.phase)
    || !['BLOCKED', 'RESOLVED'].includes(value.state)
    || !['HOST_REVIEW_REJECTED', 'AUTHORIZATION_REQUIRED', 'MANUAL_ACTION_REQUIRED', 'ENVIRONMENT_BLOCKED'].includes(value.code)) {
    fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid execution blocker phase, state, or code');
  }
  return value;
}

function readExecutionBlockersV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'reports'], 'execution blockers');
  if (value.schemaVersion !== 1 || typeof value.campaignId !== 'string' || !value.campaignId || !Array.isArray(value.reports)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'expected execution blockers V1');
  for (const report of value.reports) {
    exactKeys(report, ['report', 'recordedAt'], 'recorded execution blocker');
    readBlockerReportV1(report.report);
    if (typeof report.recordedAt !== 'string' || !Number.isFinite(Date.parse(report.recordedAt))) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid blocker timestamp');
  }
  return value;
}

function executionBlockersPath(repositoryRoot, campaignId, environment) {
  return path.join(path.dirname(ledgerPath(repositoryRoot, campaignId, environment)), 'execution-blockers', `${campaignId}.json`);
}

function readExecutionBlockers(repositoryRoot, campaignId, environment) {
  const file = executionBlockersPath(repositoryRoot, campaignId, environment);
  const value = fs.existsSync(file) ? readExecutionBlockersV1(JSON.parse(fs.readFileSync(file, 'utf8')))
    : { schemaVersion: 1, campaignId, reports: [] };
  if (value.campaignId !== campaignId) fail('CAMPAIGN_LEDGER_SCOPE', 'execution blockers belong to another campaign');
  return value;
}

function unresolvedExecutionBlockers(ledger, environment) {
  const latest = new Map();
  for (const item of readExecutionBlockers(ledger.topLevelWorktree, ledger.campaignId, environment).reports) {
    latest.set(JSON.stringify([item.report.assignmentId, item.report.phase]), item);
  }
  return [...latest.values()].filter(({ report }) => report.state === 'BLOCKED'
    && (report.actionId === null || ledger.pendingActions.some(({ id }) => id === report.actionId)));
}

function recordExecutionBlocker(ledger, input, environment) {
  const report = readBlockerReportV1(input);
  const sessionId = environment.PONYTAIL_SESSION_ID ?? environment.CODEX_SESSION_ID;
  if (!ledger.coordinatorSessionId || sessionId !== ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'only the bound coordinator may report execution blockers');
  const assignment = ledger.assignments.find(({ id }) => id === report.assignmentId);
  if (!assignment || assignment.state === 'ARCHIVED') fail('CAMPAIGN_ACTION_ASSIGNMENT', 'blocker requires a current assignment');
  if (report.actionId !== null && !ledger.pendingActions.some(({ id, assignmentId }) => id === report.actionId && assignmentId === assignment.id)
    && !(report.state === 'RESOLVED' && ledger.completedActions.some(({ actionId, assignmentId }) => actionId === report.actionId && assignmentId === assignment.id))) fail('CAMPAIGN_ACTION_MISMATCH', 'blocker action must belong to this assignment and remain pending, or be completed when resolving its report');
  if (ledger.assignments.some(({ attachToken }) => report.summary.includes(attachToken) || report.requiredAction.includes(attachToken))) fail('CAMPAIGN_BLOCKER_SECRET', 'blocker reports must not contain attachment capabilities');
  const value = readExecutionBlockers(ledger.topLevelWorktree, ledger.campaignId, environment);
  const previous = value.reports.filter(({ report: item }) => item.assignmentId === report.assignmentId && item.phase === report.phase).at(-1);
  if (previous && JSON.stringify(previous.report) === JSON.stringify(report)) return value;
  value.reports.push({ report: { ...report }, recordedAt: new Date().toISOString() });
  const file = executionBlockersPath(ledger.topLevelWorktree, ledger.campaignId, environment);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(readExecutionBlockersV1(value), null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, file);
  return value;
}

function readRunnablePlansV2(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision', 'plans', 'parallelism'], 'runnable plans');
  if (value.schemaVersion !== 2) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported runnable plans version');
  const { parallelism, ...legacy } = value;
  readRunnablePlansV1({ ...legacy, schemaVersion: 1, plans: value.plans?.map(({ execution, ...plan }) => plan) });
  if (value.parallelism !== null) {
    exactKeys(value.parallelism, ['limit', 'reservedSlots', 'availableSlots', 'reusablePairs', 'theoreticalWorkers', 'observedWorkingWorkers', 'observedRunnableWorkers', 'shortfall'], 'parallelism');
    for (const key of ['limit', 'reservedSlots', 'availableSlots', 'reusablePairs', 'theoreticalWorkers']) {
      if (!Number.isInteger(value.parallelism[key]) || value.parallelism[key] < 0) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `invalid parallelism ${key}`);
    }
    for (const key of ['observedWorkingWorkers', 'observedRunnableWorkers', 'shortfall']) {
      if (value.parallelism[key] !== null && (!Number.isInteger(value.parallelism[key]) || value.parallelism[key] < 0)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `invalid parallelism ${key}`);
    }
  }
  for (const plan of value.plans) {
    if (plan.execution === null) continue;
    exactKeys(plan.execution, ['assignmentId', 'sessionId', 'worktree', 'actionId', 'dispatchState', 'hostState', 'anomalies'], 'runnable execution');
    for (const key of ['assignmentId', 'sessionId', 'worktree', 'actionId', 'dispatchState', 'hostState']) optionalString(plan.execution[key], `execution ${key}`);
    if (plan.execution.dispatchState !== null && !['STARTED', 'NOT_STARTED'].includes(plan.execution.dispatchState)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid execution dispatch state');
    if (plan.execution.hostState !== null && !HOST_SESSION_STATES.includes(plan.execution.hostState)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid execution host state');
    if (!Array.isArray(plan.execution.anomalies)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'execution anomalies must be an array');
    for (const anomaly of plan.execution.anomalies) {
      exactKeys(anomaly, ['code', 'message', 'requiredAction', 'source', 'recordedAt'], 'execution anomaly');
      for (const key of ['code', 'message', 'requiredAction']) if (typeof anomaly[key] !== 'string' || !anomaly[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `invalid anomaly ${key}`);
      if (!['OBSERVED', 'REPORTED'].includes(anomaly.source)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid anomaly source');
      optionalString(anomaly.recordedAt, 'anomaly recordedAt');
      if (anomaly.recordedAt !== null && !Number.isFinite(Date.parse(anomaly.recordedAt))) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', 'invalid anomaly timestamp');
    }
  }
  return value;
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
function runnablePlanDiagnostics(graph, ledger, invocationWorktree, environment) {
  prepareDispatches(graph, ledger);
  const status = reconcile(graph, ledger, invocationWorktree, environment);
  const observation = readHostObservation(ledger.topLevelWorktree, ledger.campaignId, environment);
  const fresh = Boolean(observation && Date.now() - Date.parse(observation.observedAt) <= HOST_OBSERVATION_MAX_AGE_MS);
  const unresolvedBlockers = unresolvedExecutionBlockers(ledger, environment);
  const plans = runnablePlans(graph).map(plan => {
    const assignment = status.assignments.find(item => item.planId === plan.id && item.state !== 'ARCHIVED');
    const pendingAction = ledger.pendingActions.find(item => item.assignmentId === assignment?.id);
    const sessionId = assignment?.sessionId ?? pendingAction?.payload.bootstrap?.sessionId ?? null;
    const worktree = assignment?.worktree ?? pendingAction?.payload.bootstrap?.worktree ?? null;
    const hostState = fresh && observation.completeSessionIds.includes(sessionId)
      ? observation.sessions.find(item => item.sessionId === sessionId)?.state ?? 'unknown' : null;
    const anomalies = status.diagnostics.filter(item => item.planId === plan.id || (assignment && item.assignmentId === assignment.id))
      .map(item => ({ code: item.code, message: item.message, requiredAction: 'Inspect the exact worker and canonical status diagnostic; repair its prerequisite before resuming the original action.', source: 'OBSERVED', recordedAt: observation?.observedAt ?? null }));
    if (worktree && !fs.existsSync(worktree) && !anomalies.some(item => item.code.includes('WORKTREE_MISSING') || item.code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED')) anomalies.push({ code: 'CAMPAIGN_WORKTREE_MISSING', message: `original worker checkout is missing: ${worktree}`, requiredAction: 'Work with this original worker to run canonical exact-path recovery and immediate adoption; obtain narrowly scoped human authority if required.', source: 'OBSERVED', recordedAt: null });
    if (sessionId && hostState === null && !anomalies.some(item => item.code.startsWith('CAMPAIGN_HOST_OBSERVATION'))) anomalies.push({ code: 'CAMPAIGN_HOST_OBSERVATION_UNAVAILABLE', message: 'Fresh complete host evidence is unavailable for the original session.', requiredAction: 'Inspect the exact native session and refresh campaign observation; do not infer that it is idle or missing.', source: 'OBSERVED', recordedAt: observation?.observedAt ?? null });
    for (const { report, recordedAt } of unresolvedBlockers) {
      if (report.assignmentId !== assignment?.id) continue;
      anomalies.push({ code: report.code, message: `${report.phase}: ${report.summary}`, requiredAction: report.requiredAction, source: 'REPORTED', recordedAt });
    }
    anomalies.sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
    return { planId: plan.id, path: plan.path, lifecycle: plan.lifecycle, ...plan.runnableTasklets,
      execution: { assignmentId: assignment?.id ?? null, sessionId, worktree, actionId: pendingAction?.id ?? null, dispatchState: pendingAction?.payload.dispatch?.state ?? null, hostState, anomalies } };
  });
  const createdSessionIds = campaignCreatedSessionIds(ledger);
  const sessionIds = new Set([...ledger.workers.filter(item => createdSessionIds.has(item.sessionId)).map(item => item.sessionId),
    ...ledger.assignments.filter(item => item.state !== 'ARCHIVED').map(item => item.sessionId),
    ...ledger.pendingActions.map(item => item.payload.bootstrap?.sessionId)].filter(Boolean));
  const complete = fresh && [...sessionIds].every(id => observation.completeSessionIds.includes(id)
    && !['unknown', 'missing'].includes(observation.sessions.find(item => item.sessionId === id)?.state));
  const reservedSlots = campaignWorkerCount(ledger);
  const availableSlots = Math.max(0, CAMPAIGN_WORKER_LIMIT - reservedSlots);
  const reservedPlans = plans.filter(({ execution }) => execution.sessionId || ledger.pendingActions.some(item => item.id === execution.actionId && item.type === 'CREATE_WORKER')).length;
  const theoreticalWorkers = Math.min(plans.length, reservedPlans + status.idleWorkers.length + availableSlots);
  const observedWorkingWorkers = complete ? observation.sessions.filter(item => sessionIds.has(item.sessionId) && item.state === 'working').length : null;
  const observedRunnableWorkers = complete ? plans.filter(({ execution }) => execution.hostState === 'working').length : null;
  return readRunnablePlansV2({ schemaVersion: 2, campaignId: graph.campaignId, invocationWorktree,
    effectiveWorktree: ledger.topLevelWorktree, integrationRevision: status.integrationRevision, plans,
    parallelism: { limit: CAMPAIGN_WORKER_LIMIT, reservedSlots, availableSlots, reusablePairs: status.idleWorkers.length, theoreticalWorkers,
      observedWorkingWorkers, observedRunnableWorkers, shortfall: observedRunnableWorkers === null ? null : Math.max(0, theoreticalWorkers - observedRunnableWorkers) } });
}

function blockingDiagnostics(status) {
  const recoverableStates = new Set(['READY_TO_MERGE', 'MERGED', 'CLEANUP_PENDING']);
  return status.diagnostics.filter((diagnostic) => (
    diagnostic.code !== 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'
      && diagnostic.code !== 'CAMPAIGN_WORKER_CAPACITY_REACHED'
      && (diagnostic.code !== 'CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY'
        || !recoverableStates.has(status.assignments.find(({ id }) => id === diagnostic.assignmentId)?.state))
  ));
}

function readyActions(status, graph) {
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length > 0) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  const actions = status.pendingActions.filter((pendingAction) => (
    (pendingAction.type === 'RECOVER_WORKTREE'
      ? recoveryIsRunnable(status, graph, pendingAction.assignmentId)
      : !['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER', 'ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'].includes(pendingAction.type))
      || (pendingAction.payload.dispatch?.ready === true
        && pendingAction.payload.dispatch.state === 'NOT_STARTED'
        && (pendingAction.type === 'PLAN_WORKER'
          ? planIsPlannable(graph, pendingAction.payload.planId)
            && graph.plans.find(({ id }) => id === pendingAction.payload.planId)?.planningSprint?.sprintId === pendingAction.payload.sprintId
          : pendingAction.type === 'REVIEW_WORKER'
          ? planIsReviewable(graph, pendingAction.payload.planId)
            && graph.plans.find(({ id }) => id === pendingAction.payload.planId)?.reviewableSprint?.sprintId === pendingAction.payload.sprintId
          : planIsRunnable(graph, pendingAction.payload.planId)))
  ));
  return readReadyActionsV6({
    schemaVersion: 6,
    campaignId: status.campaignId,
    invocationWorktree: status.invocationWorktree,
    effectiveWorktree: status.effectiveWorktree,
    integrationRevision: status.integrationRevision,
    actions,
  });
}

function recoveryIsRunnable(status, graph, assignmentId) {
  const assignment = status.assignments.find(({ id }) => id === assignmentId);
  return assignment?.state !== 'ACTIVE' || planIsRunnable(graph, assignment.planId);
}

function reusableCleanupAssignments(graph, ledger, status) {
  return ledger.assignments.filter((assignment) => {
    const current = status.assignments.find(({ id }) => id === assignment.id);
    const worker = workerFor(ledger.workers, assignment);
    return assignment.state === 'CLEANUP_PENDING'
      && !ledger.pendingActions.some(({ assignmentId }) => assignmentId === assignment.id)
      && !assignment.worktreeArchived && !assignment.sessionArchived
      && (status.idleSessions.some(({ id }) => id === assignment.id)
        || (status.observedAt === null && worker?.activity === 'completed'))
      && (current.managedWorktree || status.observedAt === null) && current.worktreeExists
      && worker?.clean;
  }).sort((left, right) => left.planId.localeCompare(right.planId) || left.id.localeCompare(right.id));
}

function reserveAssignment(ledger, planId, idle = null) {
  const assignment = readAssignmentV1({
    id: crypto.randomUUID(), planId,
    sessionId: idle?.sessionId ?? null, worktree: idle?.worktree ?? null,
    branch: idle?.branch ?? null, dispatchRevision: ledger.integrationRevision,
    workerRevision: idle?.revision ?? null, state: 'DISPATCH_PENDING',
    idempotencyKey: crypto.randomUUID(), attachToken: crypto.randomBytes(32).toString('base64url'),
    worktreeArchived: false, sessionArchived: false,
  });
  ledger.assignments.push(assignment);
  return assignment;
}

function reconcileLedger(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign reconciliation requires one authenticated coordinator binding');
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status).filter(({ code }) => code !== 'CAMPAIGN_PLAN_UNASSIGNED');
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  ledger.integrationRevision = status.integrationRevision;
  for (const diagnostic of status.diagnostics.filter(({ code }) => code === 'CAMPAIGN_PLAN_UNASSIGNED')) reserveAssignment(ledger, diagnostic.planId);
  return null;
}

function prepareDispatches(graph, ledger) {
  const createdSessionIds = campaignCreatedSessionIds(ledger);
  for (const pendingAction of ledger.pendingActions) {
    if (['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)) dispatchRecord(pendingAction).ready = (
      pendingAction.type === 'PLAN_WORKER' ? planIsPlannable(graph, pendingAction.payload.planId)
        && graph.plans.find(({ id }) => id === pendingAction.payload.planId)?.planningSprint?.sprintId === pendingAction.payload.sprintId
        : pendingAction.type === 'REVIEW_WORKER' ? planIsReviewable(graph, pendingAction.payload.planId)
        && graph.plans.find(({ id }) => id === pendingAction.payload.planId)?.reviewableSprint?.sprintId === pendingAction.payload.sprintId
        : planIsRunnable(graph, pendingAction.payload.planId))
      && (pendingAction.type === 'CREATE_WORKER' || createdSessionIds.has(pendingAction.payload.sessionId));
  }
}

function advanceLedger(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign advance requires one authenticated coordinator binding');
  const automaticCleanup = ledger.pendingActions.find(({ type }) => ['ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'].includes(type));
  if (automaticCleanup) {
    ledger.completedActions.push({ actionId: automaticCleanup.id, assignmentId: automaticCleanup.assignmentId,
      type: automaticCleanup.type, result: { ok: false, disposition: 'RETAINED' } });
    ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== automaticCleanup.id);
    return null;
  }
  prepareDispatches(graph, ledger);
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map((item) => item.message).join('; '));
  const integrationAction = ledger.pendingActions.find(({ type }) => type === 'REQUEST_REBASE');
  if (ledger.integrationRevision !== status.integrationRevision) {
    if (integrationAction) fail('CAMPAIGN_INTEGRATION_CHANGED', `integration revision changed while rebase action ${integrationAction.id} targets ${integrationAction.payload.ontoRevision}`);
    ledger.integrationRevision = status.integrationRevision;
    return null;
  }
  const merge = integrationAction ? null : ledger.assignments.find((item) => item.state === 'READY_TO_MERGE'
    && status.readyToMerge.some((current) => current.id === item.id));
  if (merge) {
    const current = status.readyToMerge.find((item) => item.id === merge.id);
    git(ledger.topLevelWorktree, ['merge', '--ff-only', current.workerRevision]);
    ledger.integrationRevision = git(ledger.topLevelWorktree, ['rev-parse', 'HEAD']);
    merge.workerRevision = current.workerRevision;
    merge.state = 'MERGED';
    return null;
  }
  const assignment = ledger.assignments.find((item) => status.assignments.some((current) => current.id === item.id && current.state !== item.state));
  if (assignment) {
    const reconciled = status.assignments.find((current) => current.id === assignment.id);
    assignment.state = reconciled.state;
    assignment.workerRevision = reconciled.workerRevision;
    return null;
  }
  const recoveryDiagnostic = status.diagnostics.find(({ code, assignmentId, revision }) => (
    (code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'
      || (code === 'CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY'
        && status.assignments.some(({ id, state, planLifecycle }) => id === assignmentId
          && state === 'MERGED' && planLifecycle === graph.lifecycle.activeWork)))
      && recoveryIsRunnable(status, graph, assignmentId)
      && !ledger.pendingActions.some((pendingAction) => pendingAction.assignmentId === assignmentId)
      && revision
  ));
  if (recoveryDiagnostic) {
    const recoveryAssignment = ledger.assignments.find(({ id }) => id === recoveryDiagnostic.assignmentId);
    const pendingAction = action('RECOVER_WORKTREE', recoveryAssignment, {
      sessionId: recoveryAssignment.sessionId,
      previousWorktree: recoveryAssignment.worktree,
      branch: recoveryAssignment.branch,
      revision: recoveryDiagnostic.revision,
    });
    ledger.pendingActions.push(pendingAction);
    return pendingAction;
  }
  const reuse = reusableCleanupAssignments(graph, ledger, status)[0];
  if (reuse) {
    reuse.state = 'ARCHIVED';
    const worker = workerFor(ledger.workers, reuse);
    worker.activity = 'idle';
    worker.evidenceComplete = false;
    return null;
  }
  const retired = ledger.assignments.find(item => item.state === 'CLEANUP_PENDING' && item.worktreeArchived
    && status.assignments.some(current => current.id === item.id && current.hostState === 'archived'));
  if (retired) {
    retired.sessionArchived = true;
    retired.state = 'ARCHIVED';
    const worker = workerFor(ledger.workers, retired);
    if (worker) worker.sessionArchived = true;
    if (environment) removeWorkerBinding(environment, retired.id);
    return null;
  }
  return scheduleWorker(graph, ledger, status)
    ?? ledger.pendingActions.find(item => !['REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(item.type) || campaignCreatedSessionIds(ledger).has(item.payload.sessionId))
    ?? null;
}

function scheduleWorker(graph, ledger, status) {
  const queued = ledger.assignments.filter((assignment) => {
    if (assignment.state !== 'DISPATCH_PENDING') return false;
    if (ledger.pendingActions.some(({ assignmentId }) => assignmentId === assignment.id)) return false;
    return planIsRunnable(graph, assignment.planId);
  }).sort((left, right) => left.planId.localeCompare(right.planId))[0];
  if (!queued && status.readyPlans.length === 0) return null;
  const planId = queued?.planId ?? status.readyPlans[0];
  const idle = status.idleWorkers[0] ?? null;
  if (!idle && campaignWorkerCount(ledger) >= CAMPAIGN_WORKER_LIMIT) return null;
  const assignmentRecord = queued ?? reserveAssignment(ledger, planId, idle);
  if (queued) {
    queued.dispatchRevision = ledger.integrationRevision;
    queued.sessionId = idle?.sessionId ?? null;
    queued.worktree = idle?.worktree ?? null;
    queued.branch = idle?.branch ?? null;
    queued.workerRevision = idle?.revision ?? null;
  }
  const type = idle ? 'REUSE_WORKER' : 'CREATE_WORKER';
  const pendingAction = action(type, assignmentRecord, { planId, attachToken: assignmentRecord.attachToken, sessionId: idle?.sessionId ?? null, worktree: idle?.worktree ?? null });
  ledger.pendingActions.push(pendingAction);
  return pendingAction;
}

function scheduleReadyPlans(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign scheduling requires one authenticated coordinator binding');
  prepareDispatches(graph, ledger);
  let status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  const integrationAction = ledger.pendingActions.find(({ type }) => type === 'REQUEST_REBASE');
  if (ledger.integrationRevision !== status.integrationRevision && integrationAction) fail('CAMPAIGN_INTEGRATION_CHANGED', `integration revision changed while rebase action ${integrationAction.id} targets ${integrationAction.payload.ontoRevision}`);
  ledger.integrationRevision = status.integrationRevision;
  while (scheduleWorker(graph, ledger, status)) status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  return readyActions(status, graph);
}

function scheduleReviewReadyPlans(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign review scheduling requires one authenticated coordinator binding');
  prepareDispatches(graph, ledger);
  let status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  if (ledger.integrationRevision !== status.integrationRevision) {
    if (ledger.pendingActions.some(({ type }) => type === 'REQUEST_REBASE')) fail('CAMPAIGN_INTEGRATION_CHANGED', 'integration revision changed while a rebase action is pending');
    ledger.integrationRevision = status.integrationRevision;
  }
  while (status.idleWorkers.length > 0) {
    const assignedPlans = new Set(ledger.assignments.filter(({ state }) => state !== 'ARCHIVED').map(({ planId }) => planId));
    const queued = ledger.assignments.filter(({ state, planId, id }) => state === 'DISPATCH_PENDING'
      && !ledger.pendingActions.some(({ assignmentId }) => assignmentId === id) && planIsReviewable(graph, planId))
      .sort((left, right) => left.planId.localeCompare(right.planId))[0];
    const plan = queued ? graph.plans.find(({ id }) => id === queued.planId)
      : graph.plans.filter(({ id }) => !assignedPlans.has(id) && planIsReviewable(graph, id))
        .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!plan) break;
    const idle = status.idleWorkers[0];
    const assignment = queued ?? reserveAssignment(ledger, plan.id, idle);
    if (queued) Object.assign(queued, { dispatchRevision: ledger.integrationRevision, sessionId: idle.sessionId,
      worktree: idle.worktree, branch: idle.branch, workerRevision: idle.revision });
    ledger.pendingActions.push(action('REVIEW_WORKER', assignment, { planId: plan.id,
      sprintId: plan.reviewableSprint.sprintId, attachToken: assignment.attachToken,
      sessionId: idle.sessionId, worktree: idle.worktree }));
    status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  }
  return readyActions(status, graph);
}

function schedulePlanningReadyPlans(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign planning scheduling requires one authenticated coordinator binding');
  prepareDispatches(graph, ledger);
  let status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  if (ledger.integrationRevision !== status.integrationRevision) {
    if (ledger.pendingActions.some(({ type }) => type === 'REQUEST_REBASE')) fail('CAMPAIGN_INTEGRATION_CHANGED', 'integration revision changed while a rebase action is pending');
    ledger.integrationRevision = status.integrationRevision;
  }
  while (status.idleWorkers.length > 0) {
    const assignedPlans = new Set(ledger.assignments.filter(({ state }) => state !== 'ARCHIVED').map(({ planId }) => planId));
    const queued = ledger.assignments.filter(({ state, planId, id }) => state === 'DISPATCH_PENDING'
      && !ledger.pendingActions.some(({ assignmentId }) => assignmentId === id) && planIsPlannable(graph, planId))
      .sort((left, right) => left.planId.localeCompare(right.planId))[0];
    const plan = queued ? graph.plans.find(({ id }) => id === queued.planId)
      : graph.plans.filter(({ id }) => !assignedPlans.has(id) && planIsPlannable(graph, id))
        .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!plan) break;
    const idle = status.idleWorkers[0];
    const assignment = queued ?? reserveAssignment(ledger, plan.id, idle);
    if (queued) Object.assign(queued, { dispatchRevision: ledger.integrationRevision, sessionId: idle.sessionId,
      worktree: idle.worktree, branch: idle.branch, workerRevision: idle.revision });
    ledger.pendingActions.push(action('PLAN_WORKER', assignment, { planId: plan.id,
      sprintId: plan.planningSprint.sprintId, attachToken: assignment.attachToken,
      sessionId: idle.sessionId, worktree: idle.worktree }));
    status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  }
  return readyActions(status, graph);
}

function recordActionResult(ledger, actionId, result, graph = null) {
  if (ledger.dispatchRetries.some(({ originalAction }) => originalAction.id === actionId)) fail('CAMPAIGN_DISPATCH_SUPERSEDED', `action ${actionId} has an unknown superseded outcome; use its recorded successor`);
  const completed = ledger.completedActions.find((item) => item.actionId === actionId);
  if (completed) {
    if (JSON.stringify(completed.result) !== JSON.stringify(result)) fail('CAMPAIGN_ACTION_MISMATCH', `completed action ${actionId} received a different result`);
    return ledger.assignments.find((item) => item.id === completed.assignmentId);
  }
  const pendingAction = ledger.pendingActions.find(({ id }) => id === actionId);
  if (!pendingAction) fail('CAMPAIGN_ACTION_MISMATCH', `pending action does not match ${actionId}`);
  const assignment = ledger.assignments.find((item) => item.id === pendingAction.assignmentId);
  if (!assignment) fail('CAMPAIGN_ACTION_ASSIGNMENT', `action ${actionId} references a missing assignment`);
  if (result?.disposition === 'PROVISIONED') {
    exactKeys(result, ['ok', 'disposition', 'sessionId', 'worktree'], 'provisioned action result');
    if (result.ok !== true || pendingAction.type !== 'CREATE_WORKER' || pendingAction.payload.dispatch?.state !== 'STARTED'
      || assignment.state !== 'DISPATCH_PENDING') fail('CAMPAIGN_ACTION_RESULT', 'PROVISIONED requires the original started creation pending attachment');
    const bootstrap = readWorkerBootstrapV2({ schemaVersion: 2, sessionId: result.sessionId, worktree: result.worktree,
      revision: assignment.dispatchRevision, dispatchRevision: assignment.dispatchRevision, pendingRevision: null, ...recoverySource(ledger.topLevelWorktree) });
    const previous = pendingAction.payload.bootstrap && readCurrentWorkerBootstrap(pendingAction.payload.bootstrap);
    if (previous && ['sessionId', 'worktree', 'dispatchRevision', 'mainWorktree', 'mainGitDirectory'].some(key => previous[key] !== bootstrap[key])) fail('CAMPAIGN_ACTION_MISMATCH', 'original provisioned worker identity changed');
    pendingAction.payload.bootstrap = previous ?? bootstrap;
    return assignment;
  }
  if (result?.disposition === 'STARTED') {
    exactKeys(result, ['ok', 'disposition', 'hostIdentity'], 'started action result');
    if (result.ok !== true || !['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)
      || typeof result.hostIdentity !== 'string' || !result.hostIdentity) fail('CAMPAIGN_ACTION_RESULT', 'STARTED requires a worker dispatch and nonempty hostIdentity');
    const dispatch = dispatchRecord(pendingAction);
    if (dispatch.state === 'STARTED' && dispatch.hostIdentity !== result.hostIdentity) fail('CAMPAIGN_ACTION_MISMATCH', `action ${actionId} started with a different host identity`);
    pendingAction.payload.dispatch = { ready: graph ? pendingAction.type === 'PLAN_WORKER'
      ? planIsPlannable(graph, assignment.planId)
        : pendingAction.type === 'REVIEW_WORKER' ? planIsReviewable(graph, assignment.planId)
          : planIsRunnable(graph, assignment.planId) : dispatch.ready,
    state: 'STARTED', hostIdentity: result.hostIdentity };
    return assignment;
  }
  if (result?.disposition === 'NOT_STARTED') {
    exactKeys(result, ['ok', 'disposition'], 'not-started action result');
    if (result.ok !== false || !['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)) fail('CAMPAIGN_ACTION_RESULT', 'NOT_STARTED applies only to worker dispatch');
    const dispatch = dispatchRecord(pendingAction);
    if (dispatch.state === 'STARTED') fail('CAMPAIGN_ACTION_STARTED', `action ${actionId} has already started as ${dispatch.hostIdentity}`);
    if (!graph || (pendingAction.type === 'PLAN_WORKER' ? planIsPlannable(graph, assignment.planId)
      : pendingAction.type === 'REVIEW_WORKER' ? planIsReviewable(graph, assignment.planId)
        : planIsRunnable(graph, assignment.planId))) fail('CAMPAIGN_ACTION_RESULT', `action ${actionId} cannot be postponed while its plan remains ready`);
    if (graph.plans.find(plan => plan.id === assignment.planId)?.lifecycle === graph.lifecycle.successfulCompletion) {
      if (pendingAction.type !== 'CREATE_WORKER' || pendingAction.payload.bootstrap
        || assignment.state !== 'DISPATCH_PENDING'
        || ['sessionId', 'worktree', 'branch', 'workerRevision'].some(key => assignment[key] !== null)) {
        fail('CAMPAIGN_ACTION_RESULT', `action ${actionId} cannot release a closed plan's provisioned worker`);
      }
      assignment.state = 'ARCHIVED';
    }
    if (['REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)) {
      assignment.sessionId = null;
      assignment.worktree = null;
      assignment.branch = null;
      assignment.workerRevision = null;
    }
    ledger.completedActions.push({ actionId, assignmentId: assignment.id, type: pendingAction.type, result: { ...result } });
    ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== actionId);
    return assignment;
  }
  if (!result || typeof result !== 'object' || Array.isArray(result) || result.ok !== true) fail('CAMPAIGN_ACTION_FAILED', `action ${actionId} did not report success`);
  if (['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)) {
    for (const key of ['sessionId', 'worktree', 'branch', 'revision']) if (typeof result[key] !== 'string' || !result[key]) fail('CAMPAIGN_ACTION_RESULT', `${pendingAction.type} result requires ${key}`);
    if (['REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type) && !campaignCreatedSessionIds(ledger).has(result.sessionId)) fail('CAMPAIGN_WORKER_SCOPE', 'reuse session was not created for this campaign');
    assignment.sessionId = result.sessionId;
    assignment.worktree = result.worktree;
    assignment.branch = result.branch;
    assignment.workerRevision = result.revision;
    assignment.state = 'ACTIVE';
    const worker = readWorkerV1({ sessionId: result.sessionId, worktree: result.worktree, branch: result.branch, revision: result.revision, clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
    ledger.workers = ledger.workers.filter((item) => item.sessionId !== worker.sessionId && item.worktree !== worker.worktree);
    ledger.workers.push(worker);
  } else if (pendingAction.type === 'REQUEST_REBASE') {
    if (typeof result.revision !== 'string' || !result.revision) fail('CAMPAIGN_ACTION_RESULT', 'REQUEST_REBASE result requires revision');
    assignment.workerRevision = result.revision;
    const worker = workerFor(ledger.workers, assignment);
    if (worker) { worker.revision = result.revision; worker.clean = true; }
    assignment.state = 'WORK_COMPLETE';
  } else if (pendingAction.type === 'RECOVER_WORKTREE') {
    exactKeys(result, ['ok', 'sessionId', 'worktree', 'branch', 'revision'], 'recovered worktree result');
    for (const key of ['sessionId', 'branch', 'revision']) {
      if (result[key] !== pendingAction.payload[key]) fail('CAMPAIGN_ACTION_RESULT', `RECOVER_WORKTREE result ${key} does not match its action`);
    }
    if (typeof result.worktree !== 'string' || !result.worktree) fail('CAMPAIGN_ACTION_RESULT', 'RECOVER_WORKTREE result requires worktree');
    assignment.worktree = result.worktree;
    assignment.workerRevision = result.revision;
    assignment.state = 'ACTIVE';
    const worker = readWorkerV1({ sessionId: result.sessionId, worktree: result.worktree, branch: result.branch, revision: result.revision, clean: true, activity: 'active', evidenceComplete: false, worktreeArchived: false, sessionArchived: false });
    ledger.workers = ledger.workers.filter((item) => item.sessionId !== worker.sessionId && item.worktree !== worker.worktree);
    ledger.workers.push(worker);
  } else if (pendingAction.type === 'ARCHIVE_WORKTREE') {
    assignment.worktreeArchived = true;
    const worker = workerFor(ledger.workers, assignment);
    if (worker) worker.worktreeArchived = true;
  } else {
    assignment.sessionArchived = true;
    assignment.state = 'ARCHIVED';
    const worker = workerFor(ledger.workers, assignment);
    if (worker) worker.sessionArchived = true;
  }
  ledger.completedActions.push({ actionId, assignmentId: assignment.id, type: pendingAction.type, result: { ...result } });
  ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== actionId);
  return assignment;
}

function validateActionResultBinding(ledger, actionId, result, environment) {
  const pendingAction = ledger.pendingActions.find(({ id }) => id === actionId);
  if (!pendingAction) return;
  if (result?.disposition === 'PROVISIONED') {
    exactKeys(result, ['ok', 'disposition', 'sessionId', 'worktree'], 'provisioned action result');
    const assignment = ledger.assignments.find(item => item.id === pendingAction.assignmentId);
    const observation = readHostObservation(ledger.topLevelWorktree, ledger.campaignId, environment);
    const session = observation?.sessions.find(item => item.sessionId === result.sessionId);
    if (result.ok !== true || pendingAction.type !== 'CREATE_WORKER' || pendingAction.payload.dispatch?.state !== 'STARTED'
      || assignment?.state !== 'DISPATCH_PENDING' || typeof result.sessionId !== 'string' || !result.sessionId
      || typeof result.worktree !== 'string' || !path.isAbsolute(result.worktree) || path.resolve(result.worktree) !== result.worktree
      || result.worktree === ledger.topLevelWorktree || result.worktree === recoverySource(ledger.topLevelWorktree).mainWorktree
      || !observation || !Number.isFinite(Date.parse(observation.observedAt)) || Date.now() - Date.parse(observation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
      || !observation.completeSessionIds.includes(result.sessionId) || !session?.managedWorktree
      || !['working', 'waiting', 'completed'].includes(session.state) || session.worktree !== result.worktree
      || readWorkerBindings(environment).bindings.some(item => item.assignmentId !== assignment.id && (item.sessionId === result.sessionId || item.worktree === result.worktree))
      || projectLedgers(ledger, environment).some(item => item.assignments.some(candidate => candidate.id !== assignment.id && candidate.state !== 'ARCHIVED'
        && (candidate.sessionId === result.sessionId || candidate.worktree === result.worktree))
        || item.pendingActions.some(candidate => candidate.assignmentId !== assignment.id && candidate.payload.bootstrap
          && (candidate.payload.bootstrap.sessionId === result.sessionId || candidate.payload.bootstrap.worktree === result.worktree)))) {
      fail('CAMPAIGN_WORKER_RECOVERY', 'fresh complete host evidence must identify the original unbound managed bootstrap');
    }
    if (pendingAction.payload.bootstrap && (pendingAction.payload.bootstrap.sessionId !== result.sessionId || pendingAction.payload.bootstrap.worktree !== result.worktree)) fail('CAMPAIGN_ACTION_MISMATCH', 'original provisioned worker identity changed');
    return;
  }
  if (['STARTED', 'NOT_STARTED'].includes(result?.disposition)) return;
  const binding = readWorkerBindings(environment).bindings.find((item) => item.assignmentId === pendingAction.assignmentId);
  if (pendingAction.type === 'ARCHIVE_WORKTREE') {
    if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no authenticated worker binding`);
    if (fs.lstatSync(binding.worktree, { throwIfNoEntry: false }) !== undefined || registeredWorktree(ledger.topLevelWorktree, binding.worktree)) fail('CAMPAIGN_ACTION_RESULT', `worker worktree still exists or is registered: ${binding.worktree}`);
    return;
  }
  if (pendingAction.type === 'REQUEST_REBASE') {
    if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no available authenticated worker`);
    if (!fs.existsSync(binding.worktree)) {
      const assignment = ledger.assignments.find(({ id }) => id === pendingAction.assignmentId);
      const delivery = readWorkerDeliveries(ledger.topLevelWorktree, ledger.campaignId, environment).deliveries.find(({ assignmentId }) => assignmentId === pendingAction.assignmentId);
      const observation = readHostObservation(ledger.topLevelWorktree, ledger.campaignId, environment);
      if (!assignment || typeof result?.revision !== 'string' || !result.revision
        || verifiedMissingDeliveryRevision(ledger, assignment, binding, delivery, observation) !== result.revision) {
        fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no available authenticated worker`);
      }
      if (spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', pendingAction.payload.ontoRevision, result.revision]).status !== 0) {
        fail('CAMPAIGN_ACTION_RESULT', 'rebase result does not contain the requested integration revision');
      }
      return;
    }
    const identity = repositoryIdentity(binding.worktree);
    if (result?.revision !== identity.revision || git(binding.worktree, ['status', '--porcelain']).length !== 0
      || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', pendingAction.payload.ontoRevision, identity.revision]).status !== 0) {
      fail('CAMPAIGN_ACTION_RESULT', 'rebase result is not a clean worker revision containing the requested integration revision');
    }
    return;
  }
  if (pendingAction.type === 'RECOVER_WORKTREE') {
    if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no authenticated worker binding`);
    exactKeys(result, ['ok', 'sessionId', 'worktree', 'branch', 'revision'], 'recovered worktree result');
    for (const key of ['sessionId', 'branch']) {
      if (result[key] !== binding[key] || result[key] !== pendingAction.payload[key]) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `recovered worker ${key} does not match the authenticated action`);
    }
    if (binding.worktree !== pendingAction.payload.previousWorktree && binding.worktree !== result.worktree) {
      fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'authenticated recovery binding does not name the previous or recovered worktree');
    }
    if (typeof result.worktree !== 'string' || !result.worktree || !fs.existsSync(result.worktree)) {
      fail('CAMPAIGN_WORKER_BINDING_MISSING', `recovered worktree is unavailable: ${result.worktree ?? '-'}`);
    }
    const canonicalWorktree = fs.realpathSync(result.worktree);
    const observation = readHostObservation(ledger.topLevelWorktree, ledger.campaignId, environment);
    const hostSession = observation?.sessions.find(({ sessionId }) => sessionId === result.sessionId);
    if (!observation || Date.now() - Date.parse(observation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS
      || !observation.completeSessionIds.includes(result.sessionId) || !hostSession
      || !['working', 'waiting', 'completed'].includes(hostSession.state)
      || !hostSession.managedWorktree || hostSession.worktree !== canonicalWorktree) {
      fail('CAMPAIGN_WORKER_BINDING_MISSING', 'fresh complete host evidence does not authenticate the recovered managed worktree');
    }
    const identity = repositoryIdentity(canonicalWorktree);
    if (result.ok !== true || result.worktree !== canonicalWorktree || result.revision !== pendingAction.payload.revision || identity.revision !== result.revision
      || identity.branch !== result.branch || git(canonicalWorktree, ['status', '--porcelain']).length !== 0
      || repositoryCommonDirectory(canonicalWorktree) !== repositoryCommonDirectory(ledger.topLevelWorktree)) {
      fail('CAMPAIGN_ACTION_RESULT', 'recovered worktree is not the exact clean authenticated repository, branch, and revision');
    }
    return {
      ...binding,
      worktree: canonicalWorktree,
      revision: result.revision,
      boundAt: new Date().toISOString(),
    };
  }
  if (!['CREATE_WORKER', 'REUSE_WORKER', 'REVIEW_WORKER', 'PLAN_WORKER'].includes(pendingAction.type)) return;
  if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has not completed its authenticated attach handshake`);
  for (const key of ['sessionId', 'worktree', 'branch', 'revision']) {
    if (result?.[key] !== binding[key]) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `action result ${key} does not match the authenticated worker binding`);
  }
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
function retryDispatch(graph, ledger, actionId, authorization, environment, bindings) {
  const sessionId = environment.PONYTAIL_SESSION_ID ?? environment.CODEX_SESSION_ID;
  if (!ledger.coordinatorSessionId || sessionId !== ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'retry requires the bound coordinator');
  if (typeof authorization !== 'string' || !authorization.trim()) fail('CAMPAIGN_RETRY_AUTHORIZATION', 'retry requires a non-secret direct human authorization reference');
  const previous = ledger.dispatchRetries.find(({ originalAction }) => originalAction.id === actionId);
  if (previous) {
    if (previous.authorization !== authorization) fail('CAMPAIGN_ACTION_MISMATCH', 'retry authorization differs from the recorded attempt');
    return previous.successorActionId;
  }
  const original = ledger.pendingActions.find(({ id }) => id === actionId);
  const assignment = ledger.assignments.find(({ id }) => id === original?.assignmentId);
  if (!original || original.type !== 'CREATE_WORKER' || original.payload.dispatch?.state !== 'STARTED'
    || original.payload.bootstrap || assignment?.state !== 'DISPATCH_PENDING' || original.payload.attachToken !== assignment.attachToken
    || ['sessionId', 'worktree', 'branch', 'workerRevision'].some(key => assignment[key] !== null)
    || bindings.bindings.some(binding => binding.repositoryRoot === ledger.topLevelWorktree && binding.campaignId === ledger.campaignId && binding.assignmentId === assignment.id)
    || readWorkerDeliveries(ledger.topLevelWorktree, ledger.campaignId, environment).deliveries.some(delivery => delivery.assignmentId === assignment.id)) fail('CAMPAIGN_RETRY_INELIGIBLE', 'only an original unprovisioned, unattached STARTED creation can be retried');
  if (authorization.includes(assignment.attachToken)) fail('CAMPAIGN_RETRY_AUTHORIZATION', 'authorization reference must not contain attachment capabilities');
  const runnable = planIsRunnable(graph, assignment.planId);
  const reviewOnly = !runnable && planIsReviewable(graph, assignment.planId);
  if (!runnable && !reviewOnly) fail('CAMPAIGN_DISPATCH_NOT_READY', 'retry plan has no immediately runnable tasklets or reviewable sprint');
  const observation = readHostObservation(ledger.topLevelWorktree, ledger.campaignId, environment);
  if (!observation || Date.now() - Date.parse(observation.observedAt) > HOST_OBSERVATION_MAX_AGE_MS) fail('CAMPAIGN_HOST_OBSERVATION_STALE', 'retry requires a fresh complete retained-session observation');
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(({ message }) => message).join('; '));
  if (ledger.workers.some(worker => campaignCreatedSessionIds(ledger).has(worker.sessionId) && !worker.sessionArchived
    && !observation.completeSessionIds.includes(worker.sessionId))) fail('CAMPAIGN_HOST_OBSERVATION_INCOMPLETE', 'retry observation must include every retained campaign worker');
  const idle = status.idleWorkers[0] ?? null;
  if (!idle && (reviewOnly || campaignWorkerCount(ledger) >= CAMPAIGN_WORKER_LIMIT)) fail('CAMPAIGN_WORKER_CAPACITY_REACHED', 'unresolved original retains its slot; no capacity or safe idle pair is available');
  if (ledger.integrationRevision !== status.integrationRevision) fail('CAMPAIGN_INTEGRATION_CHANGED', 'refresh scheduling at the current integration revision before retry');
  const token = crypto.randomBytes(32).toString('base64url');
  const successor = action(reviewOnly ? 'REVIEW_WORKER' : idle ? 'REUSE_WORKER' : 'CREATE_WORKER', assignment, {
    planId: assignment.planId, attachToken: token, sessionId: idle?.sessionId ?? null, worktree: idle?.worktree ?? null,
    ...(reviewOnly ? { sprintId: graph.plans.find(({ id }) => id === assignment.planId).reviewableSprint.sprintId } : {}),
  });
  successor.idempotencyKey = `${assignment.id}:retry:${successor.id}`;
  ledger.dispatchRetries.push({ originalAction: structuredClone(original), successorActionId: successor.id, authorization, recordedAt: new Date().toISOString(), outcome: 'UNKNOWN_OUTCOME_SUPERSEDED' });
  Object.assign(assignment, { attachToken: token, idempotencyKey: successor.idempotencyKey, dispatchRevision: ledger.integrationRevision,
    sessionId: idle?.sessionId ?? null, worktree: idle?.worktree ?? null, branch: idle?.branch ?? null, workerRevision: idle?.revision ?? null });
  ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== original.id);
  ledger.pendingActions.push(successor);
  return successor.id;
}

function registeredWorktree(repositoryRoot, worktree) {
  return git(repositoryRoot, ['worktree', 'list', '--porcelain', '-z']).split('\0').includes(`worktree ${worktree}`);
}

function retireWorktree(graph, ledger, actionId, environment = process.env) {
  const completedAction = ledger.completedActions.find((item) => item.actionId === actionId);
  if (completedAction) {
    if (completedAction.type !== 'ARCHIVE_WORKTREE') fail('CAMPAIGN_RETIREMENT_UNSAFE', 'action is not a worktree retirement');
    return recordActionResult(ledger, actionId, completedAction.result, graph);
  }
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map(item => item.message).join('; '));
  const pendingAction = ledger.pendingActions.find(({ id }) => id === actionId);
  const assignment = ledger.assignments.find(({ id }) => id === pendingAction?.assignmentId);
  const binding = readWorkerBindings(environment).bindings.find(({ assignmentId }) => assignmentId === assignment?.id);
  const current = status.assignments.find(({ id }) => id === assignment?.id);
  if (pendingAction?.type !== 'ARCHIVE_WORKTREE' || current?.state !== 'CLEANUP_PENDING'
    || current.hostState !== 'archived' || !binding
    || binding.repositoryRoot !== ledger.topLevelWorktree || binding.campaignId !== ledger.campaignId
    || binding.sessionId !== pendingAction.payload.sessionId || binding.worktree !== pendingAction.payload.worktree
    || assignment.sessionId !== binding.sessionId || assignment.worktree !== binding.worktree
    || binding.worktree === ledger.topLevelWorktree) {
    fail('CAMPAIGN_RETIREMENT_UNSAFE', 'retirement requires the exact cleanup action, authenticated worktree, closed integrated plan, and archived original session');
  }
  if (fs.lstatSync(binding.worktree, { throwIfNoEntry: false }) !== undefined) {
    const identity = repositoryIdentity(binding.worktree);
    if (fs.realpathSync(binding.worktree) !== binding.worktree
      || repositoryCommonDirectory(binding.worktree) !== repositoryCommonDirectory(ledger.topLevelWorktree)
      || !registeredWorktree(ledger.topLevelWorktree, binding.worktree)
      || identity.revision !== assignment.workerRevision
      || git(binding.worktree, ['status', '--porcelain']).length !== 0) {
      fail('CAMPAIGN_RETIREMENT_UNSAFE', 'worktree is not the exact clean registered integrated checkout');
    }
  }
  const result = runReclamation(ledger.topLevelWorktree, { worktreePath: binding.worktree });
  if (result.results.some(({ outcome }) => outcome !== 'reclaimed')) fail('CAMPAIGN_RETIREMENT_UNSAFE', 'project worktree retirement is incomplete; retry the same action');
  validateActionResultBinding(ledger, actionId, { ok: true }, environment);
  return recordActionResult(ledger, actionId, { ok: true }, graph);
}

function humanStatus(status) {
  const lines = [
    `Campaign: ${status.campaignId}`,
    `Coordinator: ${status.coordinatorSessionId ?? 'unbound'}`,
    `Worktree: ${status.effectiveWorktree}`,
    `Integration revision: ${status.integrationRevision}`,
    `Assignments: ${status.assignments.length}; ready plans: ${status.readyPlans.length}; idle workers: ${status.idleWorkers.length}`,
  ];
  for (const assignment of status.assignments) lines.push(`${assignment.state}\t${assignment.planId}\t${assignment.sessionId ?? '-'}\t${assignment.worktree ?? '-'}`);
  for (const planId of status.readyPlans) lines.push(`READY\t${planId}`);
  for (const pendingAction of status.pendingActions) lines.push(`ACTION\t${pendingAction.type}\t${pendingAction.id}`);
  for (const item of status.diagnostics) lines.push(`${['CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY', 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'].includes(item.code) ? 'INFO' : 'BLOCKED'}\t${item.code}\t${item.message}`);
  return `${lines.join('\n')}\n`;
}

function humanReadyActions(result) {
  const lines = [
    `Campaign: ${result.campaignId}`,
    `Worktree: ${result.effectiveWorktree}`,
    `Integration revision: ${result.integrationRevision}`,
  ];
  for (const pendingAction of result.actions) lines.push(`ACTION\t${pendingAction.type}\t${pendingAction.id}`);
  return `${lines.join('\n')}\n`;
}

function parseArguments(argv) {
  const operation = argv[0];
  let input;
  let json = false;
  let actionId;
  let result;
  if (['status', 'reservation-audit', 'runnable-plans', 'tasklet-prerequisites', 'schedule-ready', 'schedule-review-ready', 'schedule-planning-ready', 'ready-actions', 'advance', 'reconcile'].includes(operation)) {
    for (const argument of argv.slice(1)) {
      if (argument === '--json' && !json) json = true;
      else if (argument.startsWith('-') || input !== undefined) fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
      else input = argument;
    }
  } else if (operation === 'retire-worktree' && (argv.length === 3 || (argv.length === 4 && argv[3] === '--json'))) {
    input = argv[1];
    actionId = argv[2];
    json = argv.length === 4;
  } else if (operation === 'retry-dispatch' && (argv.length === 5 || (argv.length === 6 && argv[5] === '--json')) && argv[3] === '--authorization') {
    input = argv[1];
    actionId = argv[2];
    result = argv[4];
    json = argv.length === 6;
  } else if (operation === 'action-result' && argv.length === 5 && argv[3] === '--result') {
    input = argv[1];
    actionId = argv[2];
    try { result = JSON.parse(argv[4]); } catch (error) { fail('CAMPAIGN_ACTION_RESULT', `result is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'observe' && argv.length === 4 && argv[2] === '--snapshot') {
    input = argv[1];
    try { result = JSON.parse(argv[3]); } catch (error) { fail('CAMPAIGN_HOST_OBSERVATION', `snapshot is not valid JSON: ${error.message}`, 2); }
  } else if (['deliver', 'report-blocker'].includes(operation) && argv.length === 4 && argv[2] === '--result') {
    input = argv[1];
    try { result = JSON.parse(argv[3]); } catch (error) { fail('CAMPAIGN_WORKER_DELIVERY', `result is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'attach' && argv.length === 2) {
    result = argv[1];
  } else fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
  if (operation === 'reconcile' && input === undefined) fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
  return { operation, input, json, actionId, result };
}

function usage() {
  return 'usage: ponytail campaign status [<campaign>] [--json]\n       ponytail campaign reservation-audit [<campaign>] [--json]\n       ponytail campaign runnable-plans [<campaign>] [--json]\n       ponytail campaign tasklet-prerequisites [<campaign>] [--json]\n       ponytail campaign schedule-ready [<campaign>] [--json]\n       ponytail campaign schedule-review-ready [<campaign>] [--json]\n       ponytail campaign schedule-planning-ready [<campaign>] [--json]\n       ponytail campaign ready-actions [<campaign>] [--json]\n       ponytail campaign report-blocker <campaign> --result <json>\n       ponytail campaign observe <campaign> --snapshot <json>\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign reconcile <campaign> [--json]\n       ponytail campaign retry-dispatch <campaign> <original-action-id> --authorization <non-secret-reference> [--json]\n       ponytail campaign action-result <campaign> <action-id> --result <json>\n       ponytail campaign retire-worktree <campaign> <action-id> [--json]\n       ponytail campaign attach <token>\n       ponytail campaign deliver <campaign> --result <json>';
}

function run(argv = process.argv.slice(2), options = {}) {
  const request = parseArguments(argv);
  const invocationWorktree = fs.realpathSync(options.repositoryRoot ?? process.cwd());
  const environment = options.environment ?? process.env;
  if (request.operation === 'retry-dispatch') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, false);
    const graph = resolveGraph(resolution.effectiveWorktree, request.input);
    const successorActionId = withWorktreeLock(resolution.effectiveWorktree, environment, () => withWorkerBindingsLock(environment, bindings => (
      withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, ledger => retryDispatch(graph, ledger, request.actionId, request.result, environment, bindings))
    )));
    const status = reconcile(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), invocationWorktree, environment);
    const result = readyActions(status, graph);
    result.actions = result.actions.filter(({ id }) => id === successorActionId);
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanReadyActions(result));
    return result;
  }
  if (request.operation === 'attach') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, true);
    if (!resolution.workerBinding) fail('CAMPAIGN_ATTACH_REQUIRED', 'worker attach was not authenticated by the lifecycle hook');
    process.stdout.write(`Attached worker ${resolution.workerBinding.sessionId} to campaign ${resolution.workerBinding.campaignId}\n`);
    return resolution.workerBinding;
  }
  if (request.operation === 'deliver') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, true);
    if (!resolution.workerBinding) fail('CAMPAIGN_WORKER_DELIVERY', 'campaign deliver must run from an authenticated worker worktree');
    const graph = resolveGraph(resolution.effectiveWorktree, request.input);
    if (graph.campaignId !== resolution.workerBinding.campaignId) fail('CAMPAIGN_WORKER_DELIVERY_SCOPE', `worker belongs to campaign ${resolution.workerBinding.campaignId}`);
    const ledger = readLedger(resolution.effectiveWorktree, graph.campaignId, environment);
    const assignment = ledger.assignments.find(({ id }) => id === resolution.workerBinding.assignmentId);
    if (!assignment || assignment.state === 'ARCHIVED') fail('CAMPAIGN_WORKER_BINDING_STALE', 'worker assignment is unavailable');
    const workerGraph = campaignGraph(resolution.invocationWorktree, assignment.planId);
    if (workerGraph.campaignId !== graph.campaignId) fail('CAMPAIGN_WORKER_DELIVERY_SCOPE', 'assigned worker plan belongs to another campaign');
    const workerPlan = workerGraph.plans.find(({ id }) => id === assignment.planId);
    if (![workerGraph.lifecycle.activeWork, workerGraph.lifecycle.successfulCompletion].includes(workerPlan?.lifecycle)) {
      fail('CAMPAIGN_WORKER_DELIVERY', 'activate the assigned plan in the worker before delivering a milestone');
    }
    withWorktreeLock(resolution.effectiveWorktree, environment, () => recordWorkerDelivery(
      resolution.effectiveWorktree,
      graph.campaignId,
      { ...assignment, worktree: resolution.workerBinding.worktree, planPath: workerPlan.path },
      request.result,
      environment,
    ));
    const status = reconcile(graph, ledger, resolution.invocationWorktree, environment);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    return status;
  }
  if (request.operation === 'action-result') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, false);
    const graph = resolveGraph(resolution.effectiveWorktree, request.input);
    let completedAction;
    withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => {
      const recoveredBinding = validateActionResultBinding(ledger, request.actionId, request.result, environment);
      completedAction = ledger.pendingActions.find(({ id }) => id === request.actionId)
        ?? ledger.completedActions.find((item) => item.actionId === request.actionId);
      if (completedAction?.type === 'RECOVER_WORKTREE' && recoveredBinding) {
        replaceRecoveredWorkerBinding(environment, completedAction.assignmentId, recoveredBinding);
      }
      return recordActionResult(ledger, request.actionId, request.result, graph);
    });
    if (completedAction?.type === 'ARCHIVE_SESSION') removeWorkerBinding(environment, completedAction.assignmentId);
    const status = reconcile(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), resolution.invocationWorktree, environment);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    return status;
  }
  if (request.operation === 'observe') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, false);
    const graph = resolveGraph(resolution.effectiveWorktree, request.input);
    const ledger = readLedger(resolution.effectiveWorktree, graph.campaignId, environment);
    if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign observation requires one authenticated coordinator binding');
    withWorktreeLock(resolution.effectiveWorktree, environment, () => writeHostObservation(
      resolution.effectiveWorktree,
      graph.campaignId,
      request.result,
      environment,
    ));
    const status = reconcile(graph, ledger, resolution.invocationWorktree, environment);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    return status;
  }
  const resolution = resolveInvocationWorktree(invocationWorktree, environment, ['status', 'reservation-audit', 'runnable-plans', 'tasklet-prerequisites'].includes(request.operation));
  const graph = resolveGraph(resolution.effectiveWorktree, request.input ?? resolution.workerBinding?.campaignId);
  if (request.operation === 'tasklet-prerequisites') {
    const result = readTaskletPrerequisitesV1({ schemaVersion: 1, campaignId: graph.campaignId, effectiveWorktree: resolution.effectiveWorktree,
      integrationRevision: git(resolution.effectiveWorktree, ['rev-parse', 'HEAD']), prerequisites: graph.externalPrerequisites });
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : `${result.prerequisites.map(item => `${item.planId}\t${item.sprintId}\t${item.taskletId}\t${item.requiredPlanId}\t${item.requiredTaskletId}\t${item.status}`).join('\n')}${result.prerequisites.length ? '\n' : ''}`);
    return result;
  }
  if (request.operation === 'reservation-audit') {
    const result = reservationAudit(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), environment);
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : `${result.reservations.map(item => `${item.kind}\t${item.sessionId ?? item.hostIdentity ?? '-'}\t${item.creationState}\t${item.hostState}\t${item.unmergedCommits === null ? 'unknown' : item.unmergedCommits ? 'unmerged' : 'integrated'}\t${item.canRelease ? 'releasable' : item.objections.join(',')}`).join('\n')}${result.reservations.length ? '\n' : ''}`);
    return result;
  }
  if (request.operation === 'report-blocker') {
    withWorktreeLock(resolution.effectiveWorktree, environment, () => recordExecutionBlocker(readLedger(resolution.effectiveWorktree, graph.campaignId, environment), request.result, environment));
    const result = runnablePlanDiagnostics(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), resolution.invocationWorktree, environment);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  }
  if (request.operation === 'runnable-plans') {
    const result = runnablePlanDiagnostics(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), resolution.invocationWorktree, environment);
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : `${result.plans.map((plan) => `${plan.planId}\t${plan.sprintId}\t${plan.taskletIds.join(', ')}\t${plan.execution.anomalies.map(item => item.code).join(', ')}`).join('\n')}${result.plans.length ? '\n' : ''}`);
    return result;
  }
  if (request.operation === 'schedule-ready') {
    const result = withWorktreeLock(resolution.effectiveWorktree, environment, () => withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => scheduleReadyPlans(graph, ledger, environment)));
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanReadyActions(result));
    return result;
  }
  if (request.operation === 'schedule-review-ready') {
    const result = withWorktreeLock(resolution.effectiveWorktree, environment, () => withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => scheduleReviewReadyPlans(graph, ledger, environment)));
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanReadyActions(result));
    return result;
  }
  if (request.operation === 'schedule-planning-ready') {
    const result = withWorktreeLock(resolution.effectiveWorktree, environment, () => withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => schedulePlanningReadyPlans(graph, ledger, environment)));
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanReadyActions(result));
    return result;
  }
  let status;
  if (['advance', 'reconcile', 'retire-worktree'].includes(request.operation)) {
    withWorktreeLock(resolution.effectiveWorktree, environment, () => (
      withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => (
        request.operation === 'reconcile' ? reconcileLedger(graph, ledger, environment)
          : request.operation === 'retire-worktree' ? retireWorktree(graph, ledger, request.actionId, environment)
            : advanceLedger(graph, ledger, environment)
      ))
    ));
  }
  const ledger = readLedger(resolution.effectiveWorktree, graph.campaignId, environment);
  status = reconcile(graph, ledger, resolution.invocationWorktree, environment);
  if (request.operation === 'ready-actions') {
    const result = readyActions(status, graph);
    process.stdout.write(request.json ? `${JSON.stringify(result)}\n` : humanReadyActions(result));
    return result;
  }
  process.stdout.write(request.json ? `${JSON.stringify(status)}\n` : humanStatus(status));
  return status;
}

function diagnostic(error) {
  return `error ${error.code ?? 'CAMPAIGN_ORCHESTRATION_INTERNAL'}: ${error.message}`;
}

module.exports = {
  recoverWorker,
  workerRecoveryBinding,
  workerRecoveryContext,
  workerRecoveryContextDetails,
  CampaignActionReaders: Object.freeze({ V1: readActionV1, V2: readActionV2, V3: readActionV3, V4: readActionV4, V5: readActionV5, V6: readActionV6 }),
  CampaignHostObservationReaders,
  CampaignLedgerReaders,
  CampaignOrchestrationError,
  CampaignReadyActionsReaders,
  CampaignReservationAuditReaders: Object.freeze({ V1: readReservationAuditV1 }),
  CampaignRunnablePlansReaders: Object.freeze({ V1: value => {
    readRunnablePlansV1(value);
    return readRunnablePlansV2({ ...value, schemaVersion: 2, parallelism: null, plans: value.plans.map(plan => ({ ...plan, execution: null })) });
  }, V2: readRunnablePlansV2 }),
  CampaignBlockerReportReaders: Object.freeze({ V1: readBlockerReportV1 }),
  CampaignExecutionBlockersReaders: Object.freeze({ V1: readExecutionBlockersV1 }),
  CampaignStatusReaders,
  CampaignWorkerBindingReaders,
  CampaignWorkerDeliveryReaders,
  CampaignWorkerBootstrapReaders: Object.freeze({ V1: readWorkerBootstrapV1, V2: readWorkerBootstrapV2 }),
  advanceLedger,
  scheduleReadyPlans,
  scheduleReviewReadyPlans,
  schedulePlanningReadyPlans,
  readRunnablePlansV1,
  readRunnablePlansV2,
  CampaignTaskletPrerequisitesReaders,
  runnablePlanDiagnostics,
  recordExecutionBlocker,
  bindWorker,
  diagnostic,
  humanStatus,
  humanReadyActions,
  hostObservationPath,
  ledgerPath,
  newLedger,
  parseArguments,
  readActionV1,
  readActionV2,
  readActionV3,
  readActionV4,
  readActionV5,
  readActionV6,
  readAssignmentV1,
  readLedger,
  readLedgerV1,
  readLedgerV2,
  readLedgerV3,
  readLedgerV4,
  readLedgerV5,
  readLedgerV6,
  readLedgerV7,
  readLedgerV8,
  readReadyActionsV1,
  readReadyActionsV2,
  readReadyActionsV3,
  readReadyActionsV4,
  readReadyActionsV5,
  readReadyActionsV6,
  readHostObservation,
  readHostObservationV1,
  readWorkerBindings,
  readWorkerBindingsV1,
  readWorkerDeliveries,
  readWorkerDeliveriesV1,
  recordWorkerDelivery,
  replaceRecoveredWorkerBinding,
  removeWorkerBinding,
  releaseLedgerCoordinator,
  readStatusV1,
  readStatusV2,
  readStatusV3,
  readStatusV4,
  readStatusV5,
  readStatusV6,
  readStatusV7,
  readStatusV8,
  readStatusV9,
  readWorkerV1,
  reconcile,
  reconcileLedger,
  readyActions,
  reservationAudit,
  readReservationAuditV1,
  recordActionResult,
  retryDispatch,
  retireWorktree,
  upgradeWorker,
  resolveInvocationWorktree,
  setLedgerCoordinator,
  run,
  usage,
  validateActionResultBinding,
  withLedgerLock,
  withWorktreeLock,
  writeHostObservation,
  writeWorkerDeliveries,
};

if (require.main === module) {
  try { run(); }
  catch (error) { process.stderr.write(`${diagnostic(error)}\n`); process.exitCode = error.status ?? 2; }
}
