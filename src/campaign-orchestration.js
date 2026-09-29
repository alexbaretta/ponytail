#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildRepositoryInventory, campaignGraph } = require('./campaign-census');

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
const ACTION_TYPES = ['CREATE_WORKER', 'REUSE_WORKER', 'REQUEST_REBASE', 'ARCHIVE_WORKTREE', 'ARCHIVE_SESSION'];
const WORKER_BINDINGS_FILE = 'campaign-worker-bindings.json';

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
  if (value.schemaVersion !== 1 || !ACTION_TYPES.includes(value.type)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has an unsupported type or version`);
  for (const key of ['id', 'assignmentId', 'idempotencyKey']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.payload must be an object`);
  return { ...value, payload: { ...value.payload } };
}

function readWorkerV1(value, label = 'worker') {
  exactKeys(value, ['sessionId', 'worktree', 'branch', 'revision', 'clean', 'activity', 'evidenceComplete', 'worktreeArchived', 'sessionArchived'], label);
  for (const key of ['sessionId', 'worktree', 'branch', 'revision']) optionalString(value[key], `${label}.${key}`);
  if (!['active', 'idle', 'completed', 'missing'].includes(value.activity)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.activity is invalid`);
  for (const key of ['clean', 'evidenceComplete', 'worktreeArchived', 'sessionArchived']) if (typeof value[key] !== 'boolean') fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be boolean`);
  return { ...value };
}

function readCompletedActionV1(value, label = 'completed action') {
  exactKeys(value, ['actionId', 'assignmentId', 'type', 'result'], label);
  for (const key of ['actionId', 'assignmentId']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label}.${key} must be a nonempty string`);
  if (!ACTION_TYPES.includes(value.type) || !value.result || typeof value.result !== 'object' || Array.isArray(value.result)) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `${label} has invalid type or result`);
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
  const active = assignments.filter((assignment) => assignment.state !== 'ARCHIVED');
  for (const [field, values] of [
    ['plan', active.map((assignment) => assignment.planId)],
    ['session', active.map((assignment) => assignment.sessionId).filter(Boolean)],
    ['worktree', active.map((assignment) => assignment.worktree).filter(Boolean)],
  ]) if (new Set(values).size !== values.length) fail('CAMPAIGN_ASSIGNMENT_CONFLICT', `more than one active assignment uses the same ${field}`);
  return {
    ...value,
    assignments,
    pendingAction: readActionV1(value.pendingAction, `${file}.pendingAction`),
    completedActions,
    workers,
  };
}

const CampaignLedgerReaders = Object.freeze({ V1: readLedgerV1 });
const CampaignWorkerBindingReaders = Object.freeze({ V1: readWorkerBindingsV1 });

function readStatusV1(value) {
  exactKeys(value, ['schemaVersion', 'campaignId', 'invocationWorktree', 'effectiveWorktree', 'coordinatorSessionId', 'integrationRevision', 'assignments', 'readyPlans', 'activeWorkers', 'idleWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'pendingAction', 'diagnostics'], 'campaign status');
  if (value.schemaVersion !== 1) fail('CAMPAIGN_ORCHESTRATION_VERSION', 'unsupported campaign status version');
  for (const key of ['campaignId', 'invocationWorktree', 'effectiveWorktree', 'integrationRevision']) if (typeof value[key] !== 'string' || !value[key]) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be a nonempty string`);
  optionalString(value.coordinatorSessionId, 'campaign status coordinatorSessionId');
  for (const key of ['assignments', 'readyPlans', 'activeWorkers', 'idleWorkers', 'rebaseRequired', 'readyToMerge', 'cleanupPending', 'diagnostics']) if (!Array.isArray(value[key])) fail('CAMPAIGN_ORCHESTRATION_SCHEMA', `campaign status ${key} must be an array`);
  readActionV1(value.pendingAction, 'campaign status pendingAction');
  return value;
}

const CampaignStatusReaders = Object.freeze({ V1: readStatusV1 });

function git(repositoryRoot, args, accepted = [0]) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
  if (result.error || !accepted.includes(result.status)) fail('CAMPAIGN_GIT', result.error?.message ?? result.stderr.trim() ?? `git ${args.join(' ')} failed`, 2);
  return result.stdout.trim();
}

function repositoryIdentity(repositoryRoot) {
  const branch = git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'], [0, 1]);
  return { branch: branch || null, revision: git(repositoryRoot, ['rev-parse', 'HEAD']) };
}

function coordinatorBinding(pluginData, repositoryRoot, campaignId) {
  if (!pluginData) return null;
  const file = path.join(pluginData, 'plan-input-coordinators.json');
  if (!fs.existsSync(file)) return null;
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_COORDINATOR_STATE', `${file}: ${error.message}`, 2); }
  const repositoryBindings = (value.bindings ?? []).filter((binding) => binding.repositoryRoot === repositoryRoot);
  if (repositoryBindings.length > 1) fail('CAMPAIGN_COORDINATOR_CONFLICT', `worktree ${repositoryRoot} has multiple coordinator bindings`);
  if (repositoryBindings[0] && repositoryBindings[0].campaignId !== campaignId) fail('CAMPAIGN_COORDINATOR_CONFLICT', `worktree is coordinated for campaign ${repositoryBindings[0].campaignId}, not ${campaignId}`);
  return repositoryBindings[0]?.sessionId ?? null;
}

function stateDirectory(environment = process.env) {
  return environment.PONYTAIL_CAMPAIGN_STATE_DIR
    || path.join(environment.HOME || os.homedir(), '.ponytail', 'campaigns');
}

function ledgerPath(repositoryRoot, campaignId, environment = process.env) {
  const scope = crypto.createHash('sha256').update(repositoryRoot).digest('hex');
  return path.join(stateDirectory(environment), scope, `${campaignId}.json`);
}

function workerBindingsPath(environment = process.env) {
  return path.join(stateDirectory(environment), WORKER_BINDINGS_FILE);
}

function readWorkerBindings(environment = process.env) {
  const file = workerBindingsPath(environment);
  if (!fs.existsSync(file)) return { schemaVersion: 1, bindings: [] };
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail('CAMPAIGN_WORKER_BINDING_IO', `${file}: ${error.message}`, 2); }
  return readWorkerBindingsV1(value, file);
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
        fs.writeFileSync(temporary, `${JSON.stringify(readWorkerBindingsV1(state, file), null, 2)}\n`, { flag: 'wx', mode: 0o600 });
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
    try { ledger = readLedgerV1(JSON.parse(fs.readFileSync(file, 'utf8')), file); } catch (error) { continue; }
    const assignment = ledger.assignments.find((item) => item.attachToken === attachToken && item.state === 'DISPATCH_PENDING');
    if (assignment && ledger.pendingAction?.assignmentId === assignment.id && ['CREATE_WORKER', 'REUSE_WORKER'].includes(ledger.pendingAction.type)) {
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
  if (!identity.branch) fail('CAMPAIGN_WORKER_SCOPE', 'worker worktree must have a branch');
  if (assignment.worktree && assignment.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_SCOPE', `assignment is reserved for worker ${assignment.worktree}`);
  const attachTokenHash = crypto.createHash('sha256').update(attachToken).digest('hex');
  return withWorkerBindingsLock(environment, (state) => {
    const replay = state.bindings.find((binding) => binding.attachTokenHash === attachTokenHash);
    if (replay) {
      if (replay.sessionId !== sessionId || replay.worktree !== canonicalWorktree) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'attach token is already bound to another worker');
      return replay;
    }
    if (state.bindings.some((binding) => binding.sessionId === sessionId || binding.worktree === canonicalWorktree)) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', 'worker session or worktree is already bound');
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
  return readLedgerV1({
    schemaVersion: 1,
    campaignId,
    topLevelWorktree: repositoryRoot,
    coordinatorSessionId,
    integrationBranch: identity.branch,
    integrationRevision: identity.revision,
    assignments: [],
    pendingAction: null,
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
  const ledger = readLedgerV1(value, file);
  if (ledger.campaignId !== campaignId || ledger.topLevelWorktree !== repositoryRoot) fail('CAMPAIGN_LEDGER_SCOPE', `${file}: ledger scope does not match this campaign worktree`);
  if (boundSession && ledger.coordinatorSessionId && boundSession !== ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_CONFLICT', `ledger coordinator ${ledger.coordinatorSessionId} disagrees with bound coordinator ${boundSession}`);
  if (!ledger.coordinatorSessionId && boundSession) ledger.coordinatorSessionId = boundSession;
  return ledger;
}

function writeLedger(file, ledger) {
  const value = readLedgerV1(ledger, file);
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
  if (inventory.activeCampaigns.length !== 1) fail('CAMPAIGN_ACTIVE_REQUIRED', `expected exactly one active campaign, found ${inventory.activeCampaigns.length}`);
  return campaignGraph(repositoryRoot, inventory.activeCampaigns[0].rootPlanId);
}

function workerFor(workers, assignment) {
  return workers.find((worker) => (
    (assignment.sessionId && worker.sessionId === assignment.sessionId)
    || (assignment.worktree && worker.worktree === assignment.worktree)
  )) ?? null;
}

function observedWorkers(graph, ledger, environment) {
  if (!environment) return ledger.workers;
  const plansById = new Map(graph.plans.map((plan) => [plan.id, plan]));
  const workers = ledger.workers.map((worker) => ({ ...worker }));
  for (const binding of readWorkerBindings(environment).bindings.filter((item) => item.repositoryRoot === ledger.topLevelWorktree && item.campaignId === ledger.campaignId)) {
    const assignment = ledger.assignments.find((item) => item.id === binding.assignmentId && item.state !== 'ARCHIVED');
    if (!assignment) continue;
    const existing = workers.find((worker) => worker.sessionId === binding.sessionId || worker.worktree === binding.worktree);
    const plan = plansById.get(assignment.planId);
    let observation;
    if (!fs.existsSync(binding.worktree)) {
      observation = { sessionId: binding.sessionId, worktree: binding.worktree, branch: binding.branch, revision: binding.revision, clean: false, activity: 'missing', evidenceComplete: false, worktreeArchived: existing?.worktreeArchived ?? false, sessionArchived: existing?.sessionArchived ?? false };
    } else {
      const identity = repositoryIdentity(binding.worktree);
      observation = {
        sessionId: binding.sessionId,
        worktree: binding.worktree,
        branch: identity.branch,
        revision: identity.revision,
        clean: git(binding.worktree, ['status', '--porcelain']).length === 0,
        activity: plan?.lifecycle === graph.lifecycle.successfulCompletion ? 'completed' : 'active',
        evidenceComplete: plan?.lifecycle === graph.lifecycle.successfulCompletion,
        worktreeArchived: existing?.worktreeArchived ?? false,
        sessionArchived: existing?.sessionArchived ?? false,
      };
    }
    if (existing) Object.assign(existing, observation);
    else workers.push(observation);
  }
  return workers;
}

function effectiveAssignmentState(assignment, plan, worker, integrationRevision, repositoryRoot) {
  if (assignment.state === 'ARCHIVED') return 'ARCHIVED';
  if (assignment.state === 'DISPATCH_PENDING' && worker && worker.activity !== 'missing') return 'ACTIVE';
  if (['ACTIVE', 'WORK_COMPLETE', 'REBASE_REQUIRED', 'READY_TO_MERGE'].includes(assignment.state)
    && plan.lifecycle === 'closed' && worker?.evidenceComplete) {
    if (!worker.clean || !worker.revision) return 'WORK_COMPLETE';
    const containsIntegration = spawnSync('git', ['-C', repositoryRoot, 'merge-base', '--is-ancestor', integrationRevision, worker.revision]).status === 0;
    return containsIntegration ? 'READY_TO_MERGE' : 'REBASE_REQUIRED';
  }
  if (assignment.state === 'MERGED') return 'CLEANUP_PENDING';
  if (assignment.state === 'CLEANUP_PENDING' && assignment.worktreeArchived && assignment.sessionArchived) return 'ARCHIVED';
  return assignment.state;
}

function reconcile(graph, ledger, invocationWorktree = ledger.topLevelWorktree, environment = null) {
  const plansById = new Map(graph.plans.map((plan) => [plan.id, plan]));
  const integrationRevision = git(ledger.topLevelWorktree, ['rev-parse', 'HEAD']);
  const workers = observedWorkers(graph, ledger, environment);
  const assignments = ledger.assignments.map((assignment) => {
    const plan = plansById.get(assignment.planId);
    const worker = workerFor(workers, assignment);
    return {
      ...assignment,
      workerRevision: worker?.revision ?? assignment.workerRevision,
      state: plan ? effectiveAssignmentState(assignment, plan, worker, integrationRevision, ledger.topLevelWorktree) : assignment.state,
    };
  }).sort((left, right) => left.planId.localeCompare(right.planId));
  const assignedPlans = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.planId));
  const completePlans = new Set(graph.plans.filter((plan) => plan.lifecycle === graph.lifecycle.successfulCompletion).map((plan) => plan.id));
  const readyPlans = graph.plans.filter((plan) => (
    plan.lifecycle === graph.lifecycle.initial
    && !assignedPlans.has(plan.id)
    && plan.dependsOn.every((id) => completePlans.has(id))
  )).map((plan) => plan.id).sort();
  const occupiedSessions = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.sessionId).filter(Boolean));
  const occupiedWorktrees = new Set(assignments.filter((assignment) => assignment.state !== 'ARCHIVED').map((assignment) => assignment.worktree).filter(Boolean));
  const idleWorkers = workers.filter((worker) => worker.activity === 'idle' && worker.clean && !worker.worktreeArchived && !worker.sessionArchived
    && !occupiedSessions.has(worker.sessionId) && !occupiedWorktrees.has(worker.worktree)).sort((left, right) => (left.sessionId ?? '').localeCompare(right.sessionId ?? ''));
  const status = {
    schemaVersion: 1,
    campaignId: graph.campaignId,
    invocationWorktree,
    effectiveWorktree: ledger.topLevelWorktree,
    coordinatorSessionId: ledger.coordinatorSessionId,
    integrationRevision,
    assignments,
    readyPlans,
    activeWorkers: assignments.filter((assignment) => ['DISPATCH_PENDING', 'ACTIVE', 'WORK_COMPLETE'].includes(assignment.state)),
    idleWorkers,
    rebaseRequired: assignments.filter((assignment) => assignment.state === 'REBASE_REQUIRED'),
    readyToMerge: assignments.filter((assignment) => assignment.state === 'READY_TO_MERGE'),
    cleanupPending: assignments.filter((assignment) => ['MERGED', 'CLEANUP_PENDING'].includes(assignment.state)),
    pendingAction: ledger.pendingAction,
    diagnostics: [],
  };
  for (const assignment of assignments) {
    if (!plansById.has(assignment.planId)) status.diagnostics.push({ code: 'CAMPAIGN_ASSIGNMENT_PLAN_MISSING', message: `assignment ${assignment.id} references missing plan ${assignment.planId}` });
    const worker = workerFor(workers, assignment);
    if (assignment.state !== 'DISPATCH_PENDING' && assignment.state !== 'ARCHIVED' && !assignment.worktreeArchived && (!worker || worker.activity === 'missing')) {
      status.diagnostics.push({ code: 'CAMPAIGN_WORKER_MISSING', message: `assignment ${assignment.id} has no live worker observation` });
    }
    if (['MERGED', 'CLEANUP_PENDING'].includes(assignment.state)
      && (!assignment.workerRevision
        || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', assignment.workerRevision, integrationRevision]).status !== 0)) {
      status.diagnostics.push({ code: 'CAMPAIGN_CLEANUP_UNINTEGRATED', message: `assignment ${assignment.id} worker revision is not integrated` });
    }
  }
  return readStatusV1(status);
}

function action(type, assignment, payload = {}) {
  return readActionV1({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    type,
    assignmentId: assignment.id,
    idempotencyKey: `${assignment.id}:${type}`,
    payload,
  });
}

function advanceLedger(graph, ledger, environment = null) {
  if (!ledger.coordinatorSessionId) fail('CAMPAIGN_COORDINATOR_REQUIRED', 'campaign advance requires one authenticated coordinator binding');
  if (ledger.pendingAction) return ledger.pendingAction;
  const status = reconcile(graph, ledger, ledger.topLevelWorktree, environment);
  if (status.diagnostics.length) fail('CAMPAIGN_STATUS_BLOCKED', status.diagnostics.map((item) => item.message).join('; '));
  if (ledger.integrationRevision !== status.integrationRevision) {
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
  const merge = ledger.assignments.find((item) => item.state === 'READY_TO_MERGE');
  if (merge) {
    git(ledger.topLevelWorktree, ['merge', '--ff-only', merge.workerRevision]);
    ledger.integrationRevision = git(ledger.topLevelWorktree, ['rev-parse', 'HEAD']);
    merge.state = 'MERGED';
    return null;
  }
  const cleanup = ledger.assignments.find((item) => ['MERGED', 'CLEANUP_PENDING'].includes(item.state));
  if (cleanup) {
    cleanup.state = 'CLEANUP_PENDING';
    const type = cleanup.worktreeArchived ? 'ARCHIVE_SESSION' : 'ARCHIVE_WORKTREE';
    ledger.pendingAction = action(type, cleanup, type === 'ARCHIVE_WORKTREE' ? { worktree: cleanup.worktree } : { sessionId: cleanup.sessionId });
    return ledger.pendingAction;
  }
  const rebase = ledger.assignments.find((item) => item.state === 'REBASE_REQUIRED');
  if (rebase) {
    ledger.pendingAction = action('REQUEST_REBASE', rebase, { sessionId: rebase.sessionId, ontoRevision: ledger.integrationRevision });
    return ledger.pendingAction;
  }
  if (status.readyPlans.length === 0) return null;
  const planId = status.readyPlans[0];
  const idle = status.idleWorkers[0] ?? null;
  const assignmentRecord = readAssignmentV1({
    id: crypto.randomUUID(),
    planId,
    sessionId: idle?.sessionId ?? null,
    worktree: idle?.worktree ?? null,
    branch: idle?.branch ?? null,
    dispatchRevision: ledger.integrationRevision,
    workerRevision: idle?.revision ?? null,
    state: 'DISPATCH_PENDING',
    idempotencyKey: crypto.randomUUID(),
    attachToken: crypto.randomBytes(32).toString('base64url'),
    worktreeArchived: false,
    sessionArchived: false,
  });
  ledger.assignments.push(assignmentRecord);
  const type = idle ? 'REUSE_WORKER' : 'CREATE_WORKER';
  ledger.pendingAction = action(type, assignmentRecord, { planId, attachToken: assignmentRecord.attachToken, sessionId: idle?.sessionId ?? null, worktree: idle?.worktree ?? null });
  return ledger.pendingAction;
}

function recordActionResult(ledger, actionId, result) {
  const completed = ledger.completedActions.find((item) => item.actionId === actionId);
  if (completed) {
    if (JSON.stringify(completed.result) !== JSON.stringify(result)) fail('CAMPAIGN_ACTION_MISMATCH', `completed action ${actionId} received a different result`);
    return ledger.assignments.find((item) => item.id === completed.assignmentId);
  }
  const pendingAction = ledger.pendingAction;
  if (!pendingAction || pendingAction.id !== actionId) fail('CAMPAIGN_ACTION_MISMATCH', `pending action does not match ${actionId}`);
  if (!result || typeof result !== 'object' || Array.isArray(result) || result.ok !== true) fail('CAMPAIGN_ACTION_FAILED', `action ${actionId} did not report success`);
  const assignment = ledger.assignments.find((item) => item.id === pendingAction.assignmentId);
  if (!assignment) fail('CAMPAIGN_ACTION_ASSIGNMENT', `action ${actionId} references a missing assignment`);
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
  ledger.pendingAction = null;
  return assignment;
}

function validateActionResultBinding(ledger, result, environment) {
  const pendingAction = ledger.pendingAction;
  if (!pendingAction) return;
  const binding = readWorkerBindings(environment).bindings.find((item) => item.assignmentId === pendingAction.assignmentId);
  if (pendingAction.type === 'ARCHIVE_WORKTREE') {
    if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no authenticated worker binding`);
    if (fs.existsSync(binding.worktree)) fail('CAMPAIGN_ACTION_RESULT', `worker worktree still exists: ${binding.worktree}`);
    return;
  }
  if (pendingAction.type === 'REQUEST_REBASE') {
    if (!binding || !fs.existsSync(binding.worktree)) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${pendingAction.assignmentId} has no available authenticated worker`);
    const identity = repositoryIdentity(binding.worktree);
    if (result?.revision !== identity.revision || git(binding.worktree, ['status', '--porcelain']).length !== 0
      || spawnSync('git', ['-C', ledger.topLevelWorktree, 'merge-base', '--is-ancestor', ledger.integrationRevision, identity.revision]).status !== 0) {
      fail('CAMPAIGN_ACTION_RESULT', 'rebase result is not a clean worker revision containing the integration revision');
    }
    return;
  }
  if (!['CREATE_WORKER', 'REUSE_WORKER'].includes(pendingAction.type)) return;
  if (!binding) fail('CAMPAIGN_WORKER_BINDING_MISSING', `assignment ${ledger.pendingAction.assignmentId} has not completed its authenticated attach handshake`);
  for (const key of ['sessionId', 'worktree', 'branch', 'revision']) {
    if (result?.[key] !== binding[key]) fail('CAMPAIGN_WORKER_BINDING_CONFLICT', `action result ${key} does not match the authenticated worker binding`);
  }
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
  if (status.pendingAction) lines.push(`ACTION\t${status.pendingAction.type}\t${status.pendingAction.id}`);
  for (const item of status.diagnostics) lines.push(`BLOCKED\t${item.code}\t${item.message}`);
  return `${lines.join('\n')}\n`;
}

function parseArguments(argv) {
  const operation = argv[0];
  let input;
  let json = false;
  let actionId;
  let result;
  if (operation === 'status' || operation === 'advance') {
    for (const argument of argv.slice(1)) {
      if (argument === '--json' && !json) json = true;
      else if (argument.startsWith('-') || input !== undefined) fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
      else input = argument;
    }
  } else if (operation === 'action-result' && argv.length === 4 && argv[2] === '--result') {
    actionId = argv[1];
    try { result = JSON.parse(argv[3]); } catch (error) { fail('CAMPAIGN_ACTION_RESULT', `result is not valid JSON: ${error.message}`, 2); }
  } else if (operation === 'attach' && argv.length === 2) {
    result = argv[1];
  } else fail('CAMPAIGN_ORCHESTRATION_USAGE', usage(), 2);
  return { operation, input, json, actionId, result };
}

function usage() {
  return 'usage: ponytail campaign status [<campaign>] [--json]\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign action-result <action-id> --result <json>\n       ponytail campaign attach <token>';
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
  if (request.operation === 'action-result') {
    const resolution = resolveInvocationWorktree(invocationWorktree, environment, false);
    const graph = resolveGraph(resolution.effectiveWorktree);
    let completedAction;
    withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => {
      validateActionResultBinding(ledger, request.result, environment);
      completedAction = ledger.pendingAction ?? ledger.completedActions.find((item) => item.actionId === request.actionId);
      return recordActionResult(ledger, request.actionId, request.result);
    });
    if (completedAction?.type === 'ARCHIVE_SESSION') removeWorkerBinding(environment, completedAction.assignmentId);
    const status = reconcile(graph, readLedger(resolution.effectiveWorktree, graph.campaignId, environment), resolution.invocationWorktree, environment);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    return status;
  }
  const resolution = resolveInvocationWorktree(invocationWorktree, environment, request.operation === 'status');
  const graph = resolveGraph(resolution.effectiveWorktree, request.input ?? resolution.workerBinding?.campaignId);
  let status;
  if (request.operation === 'advance') {
    withLedgerLock(resolution.effectiveWorktree, graph.campaignId, environment, (ledger) => advanceLedger(graph, ledger, environment));
  }
  const ledger = readLedger(resolution.effectiveWorktree, graph.campaignId, environment);
  status = reconcile(graph, ledger, resolution.invocationWorktree, environment);
  process.stdout.write(request.json ? `${JSON.stringify(status)}\n` : humanStatus(status));
  return status;
}

function diagnostic(error) {
  return `error ${error.code ?? 'CAMPAIGN_ORCHESTRATION_INTERNAL'}: ${error.message}`;
}

module.exports = {
  CampaignActionReaders: Object.freeze({ V1: readActionV1 }),
  CampaignLedgerReaders,
  CampaignOrchestrationError,
  CampaignStatusReaders,
  CampaignWorkerBindingReaders,
  advanceLedger,
  bindWorker,
  diagnostic,
  humanStatus,
  ledgerPath,
  newLedger,
  parseArguments,
  readActionV1,
  readAssignmentV1,
  readLedger,
  readLedgerV1,
  readWorkerBindings,
  readWorkerBindingsV1,
  removeWorkerBinding,
  releaseLedgerCoordinator,
  readStatusV1,
  readWorkerV1,
  reconcile,
  recordActionResult,
  resolveInvocationWorktree,
  setLedgerCoordinator,
  run,
  usage,
  withLedgerLock,
};

if (require.main === module) {
  try { run(); }
  catch (error) { process.stderr.write(`${diagnostic(error)}\n`); process.exitCode = error.status ?? 2; }
}
