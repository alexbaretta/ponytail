#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const fs = require('node:fs');
const path = require('node:path');
const { resolveCampaignRoot } = require('../src/campaign-census');
const { enqueue } = require('../src/plan-input');

const PlanInputCoordinatorBindingReaders = Object.freeze({ V1: readBindingsV1 });

function fail(message) {
  throw new Error(message);
}

function repositoryRoot(cwd) {
  let current = path.resolve(cwd);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    current = path.dirname(current);
  }
  fail('plan input requires a Git worktree');
}

function readBindingsV1(value, file = 'plan input coordinator bindings') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${file}: expected an object`);
  for (const key of Object.keys(value)) if (!['schemaVersion', 'bindings'].includes(key)) fail(`${file}: unknown field ${key}`);
  if (value.schemaVersion !== 1 || !Array.isArray(value.bindings)) fail(`${file}: expected binding schema V1`);
  const bindings = value.bindings.map((binding, index) => {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) fail(`${file}: binding ${index} must be an object`);
    const keys = ['repositoryRoot', 'campaignId', 'coordinatedPlanId', 'sessionId', 'boundAt'];
    for (const key of Object.keys(binding)) if (!keys.includes(key)) fail(`${file}: binding ${index} has unknown field ${key}`);
    for (const key of keys) if (typeof binding[key] !== 'string' || !binding[key]) fail(`${file}: binding ${index} ${key} must be a nonempty string`);
    return { ...binding };
  });
  return { schemaVersion: 1, bindings };
}

function stateFile(pluginData) {
  if (!pluginData) fail('PLUGIN_DATA is unavailable; the coordinator session cannot be bound');
  return path.join(pluginData, 'plan-input-coordinators.json');
}

function readBindings(pluginData) {
  const file = stateFile(pluginData);
  if (!fs.existsSync(file)) return { schemaVersion: 1, bindings: [] };
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file}: ${error.message}`); }
  const reader = PlanInputCoordinatorBindingReaders[`V${value.schemaVersion}`];
  if (!reader) fail(`${file}: unsupported schemaVersion`);
  return reader(value, file);
}

function withStateLock(pluginData, operation) {
  const file = stateFile(pluginData);
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, 'wx');
      try { return operation(file); }
      finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - fs.statSync(lock).mtimeMs > 5000) { fs.unlinkSync(lock); continue; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  fail('timed out waiting for the plan-input coordinator binding lock');
}

function writeBindings(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(readBindingsV1(value), null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, file);
}

function bindCoordinator(pluginData, repository, campaignId, coordinatedPlanId, sessionId) {
  if (!sessionId) fail('the hook did not provide a session ID');
  return withStateLock(pluginData, (file) => {
    const state = readBindings(pluginData);
    const campaign = state.bindings.find((binding) => binding.repositoryRoot === repository && binding.campaignId === campaignId);
    const session = state.bindings.find((binding) => binding.repositoryRoot === repository && binding.sessionId === sessionId);
    if (campaign && campaign.sessionId !== sessionId) fail(`campaign ${campaignId} is already coordinated by another session`);
    if (session && session.campaignId !== campaignId) fail(`this session already coordinates campaign ${session.campaignId}; release it first`);
    if (campaign) return campaign;
    const binding = { repositoryRoot: repository, campaignId, coordinatedPlanId, sessionId, boundAt: new Date().toISOString() };
    writeBindings(file, { ...state, bindings: [...state.bindings, binding] });
    return binding;
  });
}

function releaseCoordinator(pluginData, repository, campaignId, sessionId) {
  if (!sessionId) fail('the hook did not provide a session ID');
  return withStateLock(pluginData, (file) => {
    const state = readBindings(pluginData);
    const binding = state.bindings.find((item) => item.repositoryRoot === repository && item.campaignId === campaignId);
    if (!binding) fail(`campaign ${campaignId} has no coordinator binding`);
    if (binding.sessionId !== sessionId) fail(`campaign ${campaignId} is coordinated by another session`);
    writeBindings(file, { ...state, bindings: state.bindings.filter((item) => item !== binding) });
    return binding;
  });
}

function bindingForSession(pluginData, repository, sessionId) {
  if (!sessionId) fail('the hook did not provide a session ID');
  const binding = readBindings(pluginData).bindings.find((item) => item.repositoryRoot === repository && item.sessionId === sessionId);
  if (!binding) fail('this Codex session is not bound to a campaign; run ponytail plan-input coordinate <plan> first');
  return binding;
}

function commandStrings(toolInput) {
  const commands = [];
  if (!toolInput || typeof toolInput !== 'object') return commands;
  for (const key of ['cmd', 'command']) if (typeof toolInput[key] === 'string') commands.push(toolInput[key]);
  if (typeof toolInput.code === 'string') {
    for (const match of toolInput.code.matchAll(/(?:cmd|command)\s*:\s*(["'`])([^\n"'`]+)\1/g)) commands.push(match[2]);
  }
  return commands;
}

function coordinatorCommand(toolInput) {
  for (const command of commandStrings(toolInput)) {
    const match = /(?:^|(?:&&|\|\||;)\s*)ponytail plan-input (coordinate|release) ([A-Za-z0-9][A-Za-z0-9._\/-]*)(?=\s*(?:$|&&|\|\||;))/.exec(command);
    if (match) return { operation: match[1], plan: match[2] };
  }
  return null;
}

function preToolOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext } };
}

function deniedPreToolOutput(reason) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function handle(data, environment = process.env) {
  const repository = repositoryRoot(data.cwd || process.cwd());
  if (data.hook_event_name === 'PreToolUse') {
    const command = coordinatorCommand(data.tool_input);
    if (!command) return null;
    try {
      const { campaignId, submittedPlanId } = resolveCampaignRoot(repository, command.plan);
      if (command.operation === 'coordinate') {
        bindCoordinator(environment.PLUGIN_DATA, repository, campaignId, submittedPlanId, data.session_id);
        return preToolOutput(`Coordinator session bound to campaign ${campaignId}.`);
      }
      releaseCoordinator(environment.PLUGIN_DATA, repository, campaignId, data.session_id);
      return preToolOutput(`Coordinator session released campaign ${campaignId}.`);
    } catch (error) {
      return deniedPreToolOutput(error.message);
    }
  }
  if (data.hook_event_name !== 'UserPromptSubmit') return null;
  const match = /^\/ponytail-enqueue\s+([\s\S]+)$/.exec(data.prompt || '');
  if (!match) return null;
  try {
    const binding = bindingForSession(environment.PLUGIN_DATA, repository, data.session_id);
    const entry = enqueue(repository, binding.campaignId, binding.coordinatedPlanId, match[1], 'codex-composer', {
      sessionId: data.session_id,
      turnId: data.turn_id,
    });
    return { decision: 'block', reason: `Recorded as plan input ${entry.id} for campaign ${binding.campaignId}.` };
  } catch (error) {
    return { decision: 'block', reason: `Plan input was not recorded: ${error.message}` };
  }
}

function run() {
  let input = '';
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    try {
      const output = handle(JSON.parse(input.replace(/^\uFEFF/, '')));
      if (output) process.stdout.write(JSON.stringify(output));
    } catch (error) {
      process.stderr.write(`plan-input hook: ${error.message}\n`);
      process.exitCode = 1;
    }
  }
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', finish);
  process.stdin.on('error', () => { finish(); process.exit(0); });
  setTimeout(() => { finish(); process.exit(); }, 1000).unref();
}

module.exports = { PlanInputCoordinatorBindingReaders, bindCoordinator, bindingForSession, coordinatorCommand, handle, readBindingsV1, releaseCoordinator };

if (require.main === module) run();
