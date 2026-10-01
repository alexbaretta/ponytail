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
const { recoverySource, recoverCheckout, recoverLegacyCheckout } = require('./worker-worktrees');

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
const HOST_SESSION_STATES = ['working', 'waiting', 'completed', 'archived', 'missing', 'unknown'];
const HOST_OBSERVATION_MAX_AGE_MS = 5 * 60 * 1000;
const WORKER_BINDINGS_FILE = 'campaign-worker-bindings.json';
const PROJECT_WORKER_LIMIT = 15;

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

function readActionV1OrV2(value, label = 'action') {
  return value?.schemaVersion === 2 ? readActionV2(value, label) : readActionV1(value, label);
}

function readCurrentAction(value, assignment, label = 'action') {
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
    pendingActions: physicalLedger.pendingActions.map((pendingAction, index) => readCurrentAction(
      pendingAction,
      physicalLedger.assignments.find(({ id }) => id === pendingAction.assignmentId),
      `${file}.pendingActions[${index}]`,
    )),
  }, file);
}

const CampaignLedgerReaders = Object.freeze({ V1: readLedgerV1, V2: readLedgerV2, V3: readLedgerV3, V4: readLedgerV4, V5: readLedgerV5 });
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

const CampaignReadyActionsReaders = Object.freeze({ V1: readReadyActionsV1, V2: readReadyActionsV2, V3: readReadyActionsV3, V4: readReadyActionsV4 });

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

const CampaignStatusReaders = Object.freeze({ V1: readStatusV1, V2: readStatusV2, V3: readStatusV3, V4: readStatusV4, V5: readStatusV5, V6: readStatusV6 });

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

function projectWorkerCount(ledgers) {
  const pairs = new Set();
  let reservations = 0;
  for (const ledger of ledgers) {
    for (const worker of ledger.workers) {
      if (!worker.worktreeArchived || fs.existsSync(worker.worktree)) pairs.add(worker.worktree);
    }
    for (const assignment of ledger.assignments) {
      if (assignment.worktree && (!assignment.worktreeArchived || fs.existsSync(assignment.worktree))) pairs.add(assignment.worktree);
    }
    reservations += ledger.pendingActions.filter(({ type }) => type === 'CREATE_WORKER').length;
  }
  return pairs.size + reservations;
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
    if (assignment && ledger.pendingActions.some((pendingAction) => pendingAction.assignmentId === assignment.id && ['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type))) {
      matches.push({ ledger, assignment });
    }
  }
  if (matches.length !== 1) fail('CAMPAIGN_ATTACH_TOKEN', matches.length === 0 ? 'attach token is unknown, stale, or already used' : 'attach token is ambiguous');
  return matches[0];
}

function bindWorker(environment, invocationWorktree, attachToken, sessionId) {
  if (typeof attachToken !== 'string' || !attachToken || typeof sessionId !== 'string' || !sessionId) fail('CAMPAIGN_ATTACH_INPUT', 'attach requires a token and host session identity');
  const canonicalWorktree = fs.realpathSync(invocationWorktree);
  const { ledger, assignment } = attachmentForToken(environment, attachToken);
  if (!fs.existsSync(ledger.topLevelWorktree)) fail('CAMPAIGN_WORKER_OWNER_MISSING', `owning worktree is unavailable: ${ledger.topLevelWorktree}`);
  if (canonicalWorktree === ledger.topLevelWorktree) fail('CAMPAIGN_WORKER_SCOPE', 'a coordinator worktree cannot attach as its own worker');
  const identity = repositoryIdentity(canonicalWorktree);
  const source = recoverySource(ledger.topLevelWorktree);
  if (repositoryCommonDirectory(canonicalWorktree) !== source.mainGitDirectory) fail('CAMPAIGN_WORKER_SCOPE', 'worker does not belong to the owning project Git repository');
  if (!identity.branch) fail('CAMPAIGN_WORKER_SCOPE', 'worker worktree must have a branch');
  if (assignment.worktree && assignment.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_SCOPE', `assignment is reserved for worker ${assignment.worktree}`);
  const attachTokenHash = crypto.createHash('sha256').update(attachToken).digest('hex');
  return withWorkerBindingsLock(environment, (state) => {
    const replay = state.bindings.find((binding) => binding.attachTokenHash === attachTokenHash);
    if (replay) {
      if (replay.sessionId !== sessionId || replay.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'attach token is already bound to another worker');
      return replay;
    }
    const previous = state.bindings.find(binding => binding.sessionId === sessionId || binding.worktree === canonicalWorktree);
    if (previous) {
      const previousLedger = readLedger(previous.repositoryRoot, previous.campaignId, environment);
      const previousAssignment = previousLedger.assignments.find(({ id }) => id === previous.assignmentId);
      if (previous.repositoryRoot !== ledger.topLevelWorktree || previous.sessionId !== sessionId || previous.worktree !== canonicalWorktree
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
  if (!binding || (sessionId !== null && binding.sessionId !== sessionId)) fail('CAMPAIGN_WORKER_RECOVERY', 'recovery capability does not belong to this authenticated worker');
  return binding;
}

function legacyRecoveryTarget(binding, assignment, ledger, environment) {
  const observation = readHostObservation(binding.repositoryRoot, binding.campaignId, environment);
  const hostSession = observation?.sessions.find(item => item.sessionId === binding.sessionId);
  const dispatches = ledger.completedActions.filter(item => item.assignmentId === assignment.id
    && ['CREATE_WORKER', 'REUSE_WORKER'].includes(item.type) && item.result.ok === true);
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
  if (!binding) return null;
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
  return readLedgerV5({
    schemaVersion: 5,
    campaignId,
    topLevelWorktree: repositoryRoot,
    coordinatorSessionId,
    integrationBranch: identity.branch,
    integrationRevision: identity.revision,
    assignments: [],
    pendingActions: [],
    completedActions: [],
    workers: [],
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
  const value = readLedgerV5(ledger, file);
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
  const deliveredRebase = assignment.state === 'REBASE_REQUIRED' && Boolean(delivery);
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
      const deliveredWaiting = hostSession?.state === 'waiting' && hostSession.managedWorktree
        && hostSession.worktree === binding.worktree && binding.branch === assignment.branch
        && identity.branch === binding.branch && delivery?.revision === identity.revision;
      observation = {
        sessionId: binding.sessionId,
        worktree: binding.worktree,
        branch: identity.branch,
        revision: identity.revision,
        clean: git(binding.worktree, ['status', '--porcelain']).length === 0,
        activity: hostSession?.state === 'completed' || deliveredWaiting ? 'completed'
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

function lifecycleCompatible(assignmentState, lifecycle, graphLifecycle) {
  if (assignmentState === 'DISPATCH_PENDING') return [graphLifecycle.initial, graphLifecycle.activeWork].includes(lifecycle);
  if (['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE'].includes(assignmentState)) return lifecycle === graphLifecycle.activeWork;
  if (assignmentState === 'MERGED') return [graphLifecycle.activeWork, graphLifecycle.successfulCompletion].includes(lifecycle);
  if (['CLEANUP_PENDING', 'ARCHIVED'].includes(assignmentState)) return lifecycle === graphLifecycle.successfulCompletion;
  return false;
}

function effectiveAssignmentState(assignment, plan, worker, integrationRevision, repositoryRoot, graphLifecycle) {
  if (assignment.state === 'ARCHIVED') return 'ARCHIVED';
  if (['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE', 'MERGED'].includes(assignment.state)
    && plan.lifecycle === graphLifecycle.activeWork && worker?.activity === 'completed' && worker.evidenceComplete) {
    if (!worker.clean || !worker.revision) return 'WORK_COMPLETE';
    const containsIntegration = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', integrationRevision, worker.revision]).status === 0;
    const alreadyIntegrated = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', worker.revision, integrationRevision]).status === 0;
    if (alreadyIntegrated) return 'MERGED';
    return containsIntegration ? 'READY_TO_MERGE' : 'REBASE_REQUIRED';
  }
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
  const assignments = ledger.assignments.map((assignment) => {
    const plan = plansById.get(assignment.planId);
    const worker = workerFor(workers, assignment);
    const hostSession = assignment.sessionId ? hostSessions.get(assignment.sessionId) : null;
    return {
      ...assignment,
      workerRevision: worker?.revision ?? assignment.workerRevision,
      state: plan ? effectiveAssignmentState(assignment, plan, worker, integrationRevision, ledger.topLevelWorktree, graph.lifecycle) : assignment.state,
      planLifecycle: plan?.lifecycle ?? null,
      hostState: hostSession?.state ?? (assignment.sessionId ? 'unknown' : null),
      managedWorktree: hostSession?.managedWorktree ?? null,
      worktreeExists: Boolean(assignment.worktree && fs.existsSync(assignment.worktree)),
    };
  }).sort((left, right) => left.planId.localeCompare(right.planId) || left.id.localeCompare(right.id));
  const bindingsByAssignment = new Map((environment ? readWorkerBindings(environment).bindings : [])
    .filter(({ repositoryRoot, campaignId }) => repositoryRoot === ledger.topLevelWorktree && campaignId === ledger.campaignId)
    .map((binding) => [binding.assignmentId, binding]));
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
  const completePlans = new Set(graph.plans.filter((plan) => plan.lifecycle === graph.lifecycle.successfulCompletion).map((plan) => plan.id));
  const readyPlans = graph.plans.filter((plan) => (
    plan.lifecycle === graph.lifecycle.initial
    && !assignedPlans.has(plan.id)
    && plan.dependsOn.every((id) => completePlans.has(id))
    && !graph.plans.some(({ parentPlanId, id }) => parentPlanId === plan.id && !completePlans.has(id))
  )).map((plan) => plan.id).sort();
  const occupiedSessions = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.sessionId).filter(Boolean));
  const occupiedWorktrees = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.worktree).filter(Boolean));
  for (const other of projectLedgers(ledger, environment).slice(1)) {
    for (const assignment of other.assignments.filter(item => item.state !== 'ARCHIVED')) {
      occupiedSessions.add(assignment.sessionId);
      occupiedWorktrees.add(assignment.worktree);
    }
  }
  const idleWorkers = workers.filter((worker) => worker.activity === 'idle' && worker.clean && !worker.worktreeArchived && !worker.sessionArchived
    && (!environment || (hostObservation && !hostObservationStale && completeSessionIds.has(worker.sessionId)))
    && !occupiedSessions.has(worker.sessionId) && !occupiedWorktrees.has(worker.worktree)).sort((left, right) => (left.sessionId ?? '').localeCompare(right.sessionId ?? ''));
  const sessionAssignments = assignments.filter(({ sessionId }) => sessionId !== null).sort((left, right) => left.sessionId.localeCompare(right.sessionId) || left.id.localeCompare(right.id));
  const workingSessions = sessionAssignments.filter(({ hostState }) => hostState === 'working');
  const waitingSessions = sessionAssignments.filter(({ hostState }) => hostState === 'waiting');
  const finishedSessions = sessionAssignments.filter(({ hostState }) => hostState === 'completed');
  const idleSessions = sessionAssignments.filter(({ hostState }) => ['waiting', 'completed'].includes(hostState));
  const worktrees = sessionAssignments.filter(({ worktree }) => worktree !== null).sort((left, right) => left.worktree.localeCompare(right.worktree) || left.id.localeCompare(right.id));
  const inProgressPlans = graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.activeWork).map((plan) => {
    const assignment = assignments.find((item) => item.state !== 'ARCHIVED' && item.planId === plan.id);
    return { planId: plan.id, assignmentId: assignment?.id ?? null, sessionId: assignment?.sessionId ?? null, worktree: assignment?.worktree ?? null };
  }).sort((left, right) => left.planId.localeCompare(right.planId));
  const reusableWorkers = idleWorkers;
  const status = {
    schemaVersion: 6,
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
    else if (!lifecycleCompatible(assignment.state, assignment.planLifecycle, graph.lifecycle)) status.diagnostics.push(diagnosticRecord('CAMPAIGN_ASSIGNMENT_LIFECYCLE', `assignment ${assignment.id} state ${assignment.state} is incompatible with plan lifecycle ${assignment.planLifecycle}`, assignment));
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
  const reservedWorkers = projectWorkerCount(projectLedgers(ledger, environment));
  if (reservedWorkers >= PROJECT_WORKER_LIMIT && idleWorkers.length === 0 && readyPlans.length > 0) {
    status.diagnostics.push(diagnosticRecord('CAMPAIGN_WORKER_CAPACITY_REACHED',
      `top-level project retains ${reservedWorkers} worker slots; wait for safe reuse at limit ${PROJECT_WORKER_LIMIT}`,
      {}, { limit: PROJECT_WORKER_LIMIT, reservedWorkers }));
  }
  status.diagnostics.sort((left, right) => left.code.localeCompare(right.code)
    || (left.planId ?? '').localeCompare(right.planId ?? '')
    || (left.assignmentId ?? '').localeCompare(right.assignmentId ?? ''));
  return readStatusV6(status);
}

function action(type, assignment, payload = {}) {
  if (['CREATE_WORKER', 'REUSE_WORKER'].includes(type)) payload = { ...payload, dispatch: { ready: true, state: 'NOT_STARTED', hostIdentity: null } };
  return readActionV4({
    schemaVersion: 4,
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

function dispatchPrerequisitesSatisfied(graph, planId) {
  const completedPlans = new Set(graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.successfulCompletion).map(({ id }) => id));
  const plan = graph.plans.find(({ id }) => id === planId);
  return Boolean(plan)
    && plan.dependsOn.every((id) => completedPlans.has(id))
    && !graph.plans.some(({ parentPlanId, id }) => parentPlanId === plan.id && !completedPlans.has(id));
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
    (!['CREATE_WORKER', 'REUSE_WORKER', 'ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'].includes(pendingAction.type))
      || (pendingAction.payload.dispatch?.ready === true
        && pendingAction.payload.dispatch.state === 'NOT_STARTED'
        && dispatchPrerequisitesSatisfied(graph, pendingAction.payload.planId))
  ));
  return readReadyActionsV4({
    schemaVersion: 4,
    campaignId: status.campaignId,
    invocationWorktree: status.invocationWorktree,
    effectiveWorktree: status.effectiveWorktree,
    integrationRevision: status.integrationRevision,
    actions,
  });
}

function reusableCleanupAssignments(graph, ledger, status) {
  return ledger.assignments.filter((assignment) => {
    const current = status.assignments.find(({ id }) => id === assignment.id);
    const worker = workerFor(ledger.workers, assignment);
    return assignment.state === 'CLEANUP_PENDING'
      && !ledger.pendingActions.some(({ assignmentId }) => assignmentId === assignment.id)
      && !assignment.worktreeArchived && !assignment.sessionArchived
      && (current?.hostState === 'completed' || (status.observedAt === null && worker?.activity === 'completed'))
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

function advanceLedger(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign advance requires one authenticated coordinator binding');
  const automaticCleanup = ledger.pendingActions.find(({ type }) => ['ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'].includes(type));
  if (automaticCleanup) {
    ledger.completedActions.push({ actionId: automaticCleanup.id, assignmentId: automaticCleanup.assignmentId,
      type: automaticCleanup.type, result: { ok: false, disposition: 'RETAINED' } });
    ledger.pendingActions = ledger.pendingActions.filter(({ id }) => id !== automaticCleanup.id);
    return null;
  }
  const ledgers = projectLedgers(ledger, environment);
  for (const other of ledgers.slice(1)) {
    for (const worker of other.workers) {
      if (worker.activity !== 'idle' || worker.worktreeArchived || worker.sessionArchived
        || ledger.workers.some(item => item.sessionId === worker.sessionId || item.worktree === worker.worktree)) continue;
      if (ledgers.some(item => item.assignments.some(assignment => assignment.state !== 'ARCHIVED' && workerFor([worker], assignment)))) continue;
      ledger.workers.push({ ...worker, evidenceComplete: false });
    }
  }
  for (const pendingAction of ledger.pendingActions) {
    if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
      dispatchRecord(pendingAction).ready = dispatchPrerequisitesSatisfied(graph, pendingAction.payload.planId);
    }
  }
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  const conflicts = blockingDiagnostics(status);
  if (conflicts.length) fail('CAMPAIGN_STATUS_BLOCKED', conflicts.map((item) => item.message).join('; '));
  const integrationAction = ledger.pendingActions.find(({ type }) => type === 'REQUEST_REBASE');
  if (ledger.integrationRevision !== status.integrationRevision) {
    if (integrationAction) fail('CAMPAIGN_INTEGRATION_CHANGED', `integration revision changed while rebase action ${integrationAction.id} targets ${integrationAction.payload.ontoRevision}`);
    ledger.integrationRevision = status.integrationRevision;
    return null;
  }
  const assignment = ledger.assignments.find((item) => status.assignments.some((current) => current.id === item.id && current.state !== item.state));
  if (assignment) {
    const reconciled = status.assignments.find((current) => current.id === assignment.id);
    assignment.state = reconciled.state;
    assignment.workerRevision = reconciled.workerRevision;
    return null;
  }
  const recoveryDiagnostic = status.diagnostics.find(({ code, assignmentId }) => (
    code === 'CAMPAIGN_WORKTREE_RECOVERY_REQUIRED'
      && !ledger.pendingActions.some((pendingAction) => pendingAction.assignmentId === assignmentId)
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
  const merge = integrationAction ? null : ledger.assignments.find((item) => item.state === 'READY_TO_MERGE');
  if (merge) {
    git(ledger.topLevelWorktree, ['merge', '--ff-only', merge.workerRevision]);
    ledger.integrationRevision = git(ledger.topLevelWorktree, ['rev-parse', 'HEAD']);
    merge.state = 'MERGED';
    return null;
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
  const rebase = integrationAction ? null : ledger.assignments.find((item) => item.state === 'REBASE_REQUIRED'
    && status.assignments.find(({ id }) => id === item.id)?.worktreeExists
    && !ledger.pendingActions.some(({ assignmentId }) => assignmentId === item.id));
  if (rebase) {
    const pendingAction = action('REQUEST_REBASE', rebase, { sessionId: rebase.sessionId, ontoRevision: ledger.integrationRevision });
    ledger.pendingActions.push(pendingAction);
    return pendingAction;
  }
  const completedPlans = new Set(graph.plans.filter(({ lifecycle }) => lifecycle === graph.lifecycle.successfulCompletion).map(({ id }) => id));
  const queued = ledger.assignments.find((assignment) => {
    if (assignment.state !== 'DISPATCH_PENDING') return false;
    if (ledger.pendingActions.some(({ assignmentId }) => assignmentId === assignment.id)) return false;
    const plan = graph.plans.find(({ id }) => id === assignment.planId);
    return plan.dependsOn.every((id) => completedPlans.has(id))
      && !graph.plans.some(({ parentPlanId, id }) => parentPlanId === plan.id && !completedPlans.has(id));
  });
  if (!queued && status.readyPlans.length === 0) return ledger.pendingActions[0] ?? null;
  const planId = queued?.planId ?? status.readyPlans[0];
  const idle = status.idleWorkers[0] ?? null;
  if (!idle && projectWorkerCount(ledgers) >= PROJECT_WORKER_LIMIT) return ledger.pendingActions[0] ?? null;
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

function recordActionResult(ledger, actionId, result, graph = null) {
  const completed = ledger.completedActions.find((item) => item.actionId === actionId);
  if (completed) {
    if (JSON.stringify(completed.result) !== JSON.stringify(result)) fail('CAMPAIGN_ACTION_MISMATCH', `completed action ${actionId} received a different result`);
    return ledger.assignments.find((item) => item.id === completed.assignmentId);
  }
  const pendingAction = ledger.pendingActions.find(({ id }) => id === actionId);
  if (!pendingAction) fail('CAMPAIGN_ACTION_MISMATCH', `pending action does not match ${actionId}`);
  const assignment = ledger.assignments.find((item) => item.id === pendingAction.assignmentId);
  if (!assignment) fail('CAMPAIGN_ACTION_ASSIGNMENT', `action ${actionId} references a missing assignment`);
  if (result?.disposition === 'STARTED') {
    exactKeys(result, ['ok', 'disposition', 'hostIdentity'], 'started action result');
    if (result.ok !== true || !['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)
      || typeof result.hostIdentity !== 'string' || !result.hostIdentity) fail('CAMPAIGN_ACTION_RESULT', 'STARTED requires a worker dispatch and nonempty hostIdentity');
    const dispatch = dispatchRecord(pendingAction);
    if (dispatch.state === 'STARTED' && dispatch.hostIdentity !== result.hostIdentity) fail('CAMPAIGN_ACTION_MISMATCH', `action ${actionId} started with a different host identity`);
    pendingAction.payload.dispatch = { ready: graph ? dispatchPrerequisitesSatisfied(graph, assignment.planId) : dispatch.ready, state: 'STARTED', hostIdentity: result.hostIdentity };
    return assignment;
  }
  if (result?.disposition === 'NOT_STARTED') {
    exactKeys(result, ['ok', 'disposition'], 'not-started action result');
    if (result.ok !== false || !['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) fail('CAMPAIGN_ACTION_RESULT', 'NOT_STARTED applies only to worker dispatch');
    const dispatch = dispatchRecord(pendingAction);
    if (dispatch.state === 'STARTED') fail('CAMPAIGN_ACTION_STARTED', `action ${actionId} has already started as ${dispatch.hostIdentity}`);
    if (!graph || dispatchPrerequisitesSatisfied(graph, assignment.planId)) fail('CAMPAIGN_ACTION_RESULT', `action ${actionId} cannot be postponed while its plan remains ready`);
    if (pendingAction.type === 'REUSE_WORKER') {
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
  if (['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) {
    for (const key of ['sessionId', 'worktree', 'branch', 'revision']) if (typeof result[key] !== 'string' || !result[key]) fail('CAMPAIGN_ACTION_RESULT', `${pendingAction.type} result requires ${key}`);
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
  if (!['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) return;
  if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has not completed its authenticated attach handshake`);
  for (const key of ['sessionId', 'worktree', 'branch', 'revision']) {
    if (result?.[key] !== binding[key]) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `action result ${key} does not match the authenticated worker binding`);
  }
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
  if (operation === 'status' || operation === 'ready-actions' || operation === 'advance' || operation === 'reconcile') {
    for (const argument of argv.slice(1)) {
      if (argument === '--json' && !json) json = true;
      else if (argument.startsWith('-') || input !== undefined) fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
      else input = argument;
    }
  } else if (operation === 'retire-worktree' && (argv.length === 3 || (argv.length === 4 && argv[3] === '--json'))) {
    input = argv[1];
    actionId = argv[2];
    json = argv.length === 4;
  } else if (operation === 'action-result' && argv.length === 5 && argv[3] === '--result') {
    input = argv[1];
    actionId = argv[2];
    try { result = JSON.parse(argv[4]); } catch (error) { fail('CAMPAIGN_ACTION_RESULT', `result is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'observe' && argv.length === 4 && argv[2] === '--snapshot') {
    input = argv[1];
    try { result = JSON.parse(argv[3]); } catch (error) { fail('CAMPAIGN_HOST_OBSERVATION', `snapshot is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'deliver' && argv.length === 4 && argv[2] === '--result') {
    input = argv[1];
    try { result = JSON.parse(argv[3]); } catch (error) { fail('CAMPAIGN_WORKER_DELIVERY', `result is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'attach' && argv.length === 2) {
    result = argv[1];
  } else fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
  if (operation === 'reconcile' && input === undefined) fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
  return { operation, input, json, actionId, result };
}

function usage() {
  return 'usage: ponytail campaign status [<campaign>] [--json]\n       ponytail campaign ready-actions [<campaign>] [--json]\n       ponytail campaign observe <campaign> --snapshot <json>\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign reconcile <campaign> [--json]\n       ponytail campaign action-result <campaign> <action-id> --result <json>\n       ponytail campaign retire-worktree <campaign> <action-id> [--json]\n       ponytail campaign attach <token>\n       ponytail campaign deliver <campaign> --result <json>';
}

function run(argv = process.argv.slice(2), options = {}) {
  const request = parseArguments(argv);
  const invocationWorktree = fs.realpathSync(options.repositoryRoot ?? process.cwd());
  const environment = options.environment ?? process.env;
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
    withWorktreeLock(resolution.effectiveWorktree, environment, () => recordWorkerDelivery(
      resolution.effectiveWorktree,
      graph.campaignId,
      { ...assignment, worktree: resolution.workerBinding.worktree, planPath: workerGraph.plans.find(({ id }) => id === assignment.planId)?.path },
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
  const resolution = resolveInvocationWorktree(invocationWorktree, environment, request.operation === 'status');
  const graph = resolveGraph(resolution.effectiveWorktree, request.input ?? resolution.workerBinding?.campaignId);
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
  CampaignActionReaders: Object.freeze({ V1: readActionV1, V2: readActionV2, V3: readActionV3, V4: readActionV4 }),
  CampaignHostObservationReaders,
  CampaignLedgerReaders,
  CampaignOrchestrationError,
  CampaignReadyActionsReaders,
  CampaignStatusReaders,
  CampaignWorkerBindingReaders,
  CampaignWorkerDeliveryReaders,
  advanceLedger,
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
  readAssignmentV1,
  readLedger,
  readLedgerV1,
  readLedgerV2,
  readLedgerV3,
  readLedgerV4,
  readLedgerV5,
  readReadyActionsV1,
  readReadyActionsV2,
  readReadyActionsV3,
  readReadyActionsV4,
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
  readWorkerV1,
  reconcile,
  reconcileLedger,
  readyActions,
  recordActionResult,
  retireWorktree,
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
