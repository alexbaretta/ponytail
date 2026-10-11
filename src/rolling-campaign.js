// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

const { parse } = require('lossless-json');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseObligationDocument, projectObligations, inputDigest } = require('../skills/plan-execution/scripts/obligations');

function requireRollingCondition(condition, message) {
  if (!condition) throw new Error(`rolling campaign: ${message}`);
}

function requireRollingRecord(value, keys, label) {
  requireRollingCondition(value !== null && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  `${label} must contain exactly ${keys.join(', ')}`);
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function readRollingProjectConfigV1(value) {
  requireRollingRecord(value, ['schemaVersion', 'mainline', 'managedWorktrees',
    'maxActiveWorkers', 'publicationSize', 'setupCommands', 'qa'], 'project configuration V1');
  requireRollingCondition(value.schemaVersion === 1, 'unsupported project configuration version');
  if (value.mainline !== null) {
    requireRollingRecord(value.mainline, ['remote', 'branch'], 'mainline');
    for (const key of ['remote', 'branch']) {
      requireRollingCondition(typeof value.mainline[key] === 'string'
        && value.mainline[key].trim() === value.mainline[key] && value.mainline[key].length > 0
        && !value.mainline[key].startsWith('-'), `invalid mainline ${key}`);
    }
  }
  requireRollingRecord(value.managedWorktrees, ['directory', 'anchor'], 'managed worktrees');
  requireRollingCondition(value.managedWorktrees.anchor === 'main', 'managed directory anchor must be main');
  requireRollingCondition(typeof value.managedWorktrees.directory === 'string'
    && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory
    && value.managedWorktrees.directory.length > 0, 'managed directory must be nonempty');
  for (const key of ['maxActiveWorkers', 'publicationSize']) {
    requireRollingCondition(value[key] === null || Number.isSafeInteger(value[key]) && value[key] > 0,
      `${key} must be null or a positive safe integer`);
  }
  requireRollingRecord(value.qa, ['focused', 'publication'], 'QA');
  for (const [label, commands] of [['setupCommands', value.setupCommands],
    ['focused QA', value.qa.focused], ['publication QA', value.qa.publication]]) {
    requireRollingCondition(Array.isArray(commands), `${label} must be an array`);
    for (const argv of commands) {
      requireRollingCondition(Array.isArray(argv) && argv.length > 0
        && argv.every(argument => typeof argument === 'string' && !argument.includes('\0'))
        && argv[0].length > 0, `${label} commands must be nonempty executable argument arrays`);
    }
  }
  requireRollingCondition(value.qa.publication.length > 0, 'publication QA must be configured');
  return value;
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function parseRollingProjectConfig(text) {
  return readRollingProjectConfigV1(parse(text, null, token => {
    requireRollingCondition(/^(0|[1-9][0-9]*)$/.test(token)
      && Number.isSafeInteger(Number(token)), `unsupported JSON number token: ${token}`);
    return Number(token);
  }));
}

const RollingProjectConfigReaders = { V1: readRollingProjectConfigV1 };

// Traceability: implements REQ-ROLLING-GRAPH
function readRollingBindingsV1(value) {
  requireRollingRecord(value, ['schemaVersion', 'bindings'], 'execution bindings V1');
  requireRollingCondition(value.schemaVersion === 1 && Array.isArray(value.bindings), 'unsupported execution bindings');
  const ids = new Set();
  for (const binding of value.bindings) {
    requireRollingRecord(binding, ['obligationId', 'implementationIds', 'sourcePaths', 'acceptances',
      'unitTests', 'integrationTests', 'exclusiveResources'], 'execution binding');
    requireRollingCondition(/^OBL-[1-9][0-9]*$/.test(binding.obligationId) && !ids.has(binding.obligationId), 'duplicate or invalid binding obligation');
    ids.add(binding.obligationId);
    for (const key of ['implementationIds', 'sourcePaths', 'exclusiveResources']) {
      requireRollingCondition(Array.isArray(binding[key]) && binding[key].every(item => typeof item === 'string' && item.length > 0)
        && new Set(binding[key]).size === binding[key].length, `invalid binding ${key}`);
    }
    requireRollingCondition(Array.isArray(binding.acceptances), 'acceptances must be an array');
    for (const acceptance of binding.acceptances) {
      requireRollingRecord(acceptance, ['id', 'arcId', 'stepId'], 'acceptance reference');
      requireRollingCondition(['id', 'arcId'].every(key => typeof acceptance[key] === 'string' && acceptance[key].length > 0)
        && (acceptance.stepId === null || typeof acceptance.stepId === 'string' && acceptance.stepId.length > 0), 'invalid acceptance reference');
    }
    for (const key of ['unitTests', 'integrationTests']) {
      requireRollingCondition(Array.isArray(binding[key]), `${key} must be an array`);
      for (const selection of binding[key]) {
        requireRollingRecord(selection, ['id', 'path', 'selection'], 'test reference');
        requireRollingCondition(['id', 'path'].every(field => typeof selection[field] === 'string' && selection[field].length > 0)
          && Array.isArray(selection.selection) && selection.selection.length > 0
          && selection.selection.every(item => typeof item === 'string' && item.length > 0), 'invalid test reference');
      }
    }
    for (const relative of [...binding.sourcePaths, ...binding.unitTests.map(item => item.path), ...binding.integrationTests.map(item => item.path)]) {
      requireRollingCondition(!path.isAbsolute(relative) && relative.split('/').every(component => component && component !== '.' && component !== '..')
        && !relative.includes('\\'), 'binding path must be normalized and repository-relative');
    }
  }
  return value;
}

const RollingBindingsReaders = { V1: readRollingBindingsV1 };

function readRollingCoordinatorRoot(coordinatorRoot) {
  const root = fs.realpathSync(coordinatorRoot);
  const repository = spawnSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  requireRollingCondition(repository.status === 0 && fs.realpathSync(repository.stdout.trim()) === root,
    'coordinator root must identify the exact Git checkout');
  return root;
}

// Traceability: implements REQ-ROLLING-GRAPH
function collectRollingGraph(coordinatorRoot, documentPath, bindingsPath) {
  const root = readRollingCoordinatorRoot(coordinatorRoot);
  const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  requireRollingCondition(head.status === 0, 'coordinator must have a committed HEAD');
  const texts = [];
  for (const relative of [documentPath, bindingsPath, '.agents/config/project/rolling-campaigns.json']) {
    requireRollingCondition(typeof relative === 'string' && !path.isAbsolute(relative)
      && relative.split('/').every(component => component && component !== '.' && component !== '..') && !relative.includes('\\'), 'graph input must be repository-relative');
    const file = path.join(root, relative);
    requireRollingCondition(fs.lstatSync(file).isFile() && fs.realpathSync(file) === file, 'graph input must be a regular file without symlink ancestors');
    texts.push(fs.readFileSync(file, 'utf8'));
  }
  const document = parseObligationDocument(texts[0]);
  const bindings = readRollingBindingsV1(parse(texts[1], null, token => {
    requireRollingCondition(token === '1', 'unsupported bindings number');
    return 1;
  }));
  const projectConfiguration = parseRollingProjectConfig(texts[2]);
  const projection = projectObligations(document, root);
  const obligationIds = new Set(document.obligations.map(item => item.id));
  requireRollingCondition(bindings.bindings.every(binding => obligationIds.has(binding.obligationId)), 'binding references an unknown obligation');
  const inputs = new Set(document.baselines.at(-1).requirements.map(item => item.path));
  for (const certificate of document.certificates) for (const input of certificate.inputs) inputs.add(input.path);
  const inputDigests = [...inputs].sort().map(relative => {
    try { return [relative, inputDigest(root, relative)]; }
    catch { return [relative, null]; }
  });
  const digest = crypto.createHash('sha256').update(JSON.stringify([root, head.stdout.trim(), documentPath, bindingsPath, texts, inputDigests])).digest('hex');
  const unavailableInputs = inputDigests.filter(([, digest]) => digest === null).map(([relative]) => relative);
  return { coordinatorRoot: root, head: head.stdout.trim(), digest, document,
    bindings: bindings.bindings, projection, projectConfiguration, unavailableInputs };
}

// Traceability: implements REQ-ROLLING-SCHEDULING
function selectRollingAssignments(graph, assignments, maxActiveWorkers, expectedDigest) {
  requireRollingCondition(graph.digest === expectedDigest, 'stale coordinator graph');
  requireRollingCondition(Number.isSafeInteger(maxActiveWorkers) && maxActiveWorkers > 0, 'capacity must be a positive safe integer');
  requireRollingCondition(Array.isArray(graph.unavailableInputs), 'graph must assess input availability');
  const live = assignments.filter(assignment => assignment.state !== 'RELEASED');
  const states = new Set(['RESERVED', 'PROVISIONING', 'ATTACHING', 'WORKING', 'REVIEW', 'REWORK', 'INTEGRATING', 'RETIRING', 'INACTIVE']);
  const owners = new Set();
  for (const assignment of live) {
    requireRollingCondition(states.has(assignment.state) && typeof assignment.scopeId === 'string' && !owners.has(`${assignment.scopeId}:${assignment.obligationId}`), 'invalid or duplicate live obligation ownership');
    owners.add(`${assignment.scopeId}:${assignment.obligationId}`);
    requireRollingCondition(Array.isArray(assignment.plannedPaths) && Array.isArray(assignment.exclusiveResources)
      && Array.isArray(assignment.blockers), 'assignment must retain scope and blockers');
    requireRollingCondition(assignment.state !== 'INACTIVE' || assignment.activityStopped === true, 'inactive worker must acknowledge stopped activity');
  }
  const occupied = live.filter(assignment => assignment.state !== 'INACTIVE');
  let capacity = Math.max(0, maxActiveWorkers - occupied.length);
  const satisfied = new Set(graph.projection.satisfiedIds);
  const unresolved = new Set(graph.projection.unresolvedIds);
  const bindings = new Map(graph.bindings.map(binding => [binding.obligationId, binding]));
  const categoryOrder = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2', 'gate'];
  const obligations = graph.document.obligations.filter(obligation => unresolved.has(obligation.id))
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || Number(a.id.slice(4)) - Number(b.id.slice(4)));
  const selected = [];
  const blocked = [];
  if (graph.unavailableInputs.length > 0) return { digest: graph.digest,
    activeCount: occupied.length, availableCapacity: capacity, selected,
    blocked: [{ reason: 'unavailable_inputs', paths: graph.unavailableInputs }] };
  for (const resume of [true, false]) for (const obligation of obligations) {
    const assignment = live.find(item => item.scopeId === graph.document.scopeId && item.obligationId === obligation.id);
    if (resume ? assignment?.state !== 'INACTIVE' : assignment !== undefined) continue;
    const binding = bindings.get(obligation.id);
    const prerequisites = [...obligation.dependsOn, ...(assignment?.blockers ?? [])].filter(id => !satisfied.has(id));
    if (prerequisites.length || !binding) {
      blocked.push({ obligationId: obligation.id, reason: binding ? 'prerequisites' : 'missing_binding', prerequisites });
      continue;
    }
    if (resume && (JSON.stringify(assignment.plannedPaths) !== JSON.stringify(obligation.execution.plannedPaths)
      || JSON.stringify(assignment.exclusiveResources) !== JSON.stringify(binding.exclusiveResources))) {
      blocked.push({ obligationId: obligation.id, reason: 'scope_changed', prerequisites: [] });
      continue;
    }
    const plannedPaths = resume ? assignment.plannedPaths : obligation.execution.plannedPaths;
    const exclusiveResources = resume ? assignment.exclusiveResources : binding.exclusiveResources;
    const conflicts = occupied.filter(other => (
      plannedPaths.some(left => other.plannedPaths.some(right => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)))
      || exclusiveResources.some(resource => other.exclusiveResources.includes(resource))));
    if (conflicts.length) { blocked.push({ obligationId: obligation.id, reason: 'conflict', assignmentIds: conflicts.map(item => item.id) }); continue; }
    if (capacity === 0) continue;
    selected.push({ kind: resume ? 'resume_worker' : 'start_worker', obligationId: obligation.id,
      assignmentId: assignment?.id ?? null, plannedPaths, exclusiveResources, binding });
    occupied.push({ id: assignment?.id ?? obligation.id, obligationId: obligation.id, plannedPaths, exclusiveResources });
    capacity--;
  }
  return { digest: graph.digest, activeCount: live.filter(item => item.state !== 'INACTIVE').length,
    availableCapacity: capacity, selected, blocked };
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function resolveRollingConfiguration(rollingProjectConfig, request, gitDefaultBranch) {
  readRollingProjectConfigV1(rollingProjectConfig);
  requireRollingRecord(request, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'campaign request');
  const mainline = request.mainline ?? rollingProjectConfig.mainline
    ?? { remote: 'origin', branch: gitDefaultBranch };
  const maxActiveWorkers = request.maxActiveWorkers ?? rollingProjectConfig.maxActiveWorkers ?? 10;
  const publicationSize = request.publicationSize ?? rollingProjectConfig.publicationSize ?? 1;
  readRollingProjectConfigV1({ ...rollingProjectConfig, mainline, maxActiveWorkers, publicationSize });
  return readRollingResolvedConfiguration({ mainline: { ...mainline }, incrementRef: request.incrementRef, maxActiveWorkers, publicationSize });
}

function readRollingResolvedConfiguration(value) {
  requireRollingRecord(value, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'resolved campaign configuration');
  requireRollingRecord(value.mainline, ['remote', 'branch'], 'resolved mainline');
  requireRollingCondition(typeof value.mainline.remote === 'string' && value.mainline.remote.length > 0
    && value.mainline.remote.trim() === value.mainline.remote && !value.mainline.remote.startsWith('-'), 'invalid mainline remote');
  for (const key of ['maxActiveWorkers', 'publicationSize']) requireRollingCondition(Number.isSafeInteger(value[key]) && value[key] > 0, `invalid resolved ${key}`);
  for (const [label, ref] of [['mainline branch', value.mainline.branch], ['increment branch', value.incrementRef]]) {
    requireRollingCondition(typeof ref === 'string' && ref.length > 0 && !ref.startsWith('-')
      && spawnSync('git', ['check-ref-format', `refs/heads/${ref}`]).status === 0, `invalid ${label}`);
  }
  requireRollingCondition(value.mainline.branch !== value.incrementRef, 'increment and mainline branches must differ');
  return value;
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function loadRollingConfiguration(coordinatorRoot, request) {
  const root = readRollingCoordinatorRoot(coordinatorRoot);
  const configurationPath = path.join(root, '.agents/config/project/rolling-campaigns.json');
  requireRollingCondition(fs.lstatSync(configurationPath).isFile()
    && fs.realpathSync(configurationPath) === configurationPath,
  'project configuration must be a regular non-symlink file without symlink ancestors');
  const rollingProjectConfig = parseRollingProjectConfig(fs.readFileSync(configurationPath, 'utf8'));
  const gitDefault = spawnSync('git', ['-C', root, 'config', '--get', 'init.defaultBranch'], { encoding: 'utf8' });
  requireRollingCondition(gitDefault.status === 0 || gitDefault.status === 1, 'cannot read effective Git default branch');
  return resolveRollingConfiguration(rollingProjectConfig, request, gitDefault.status === 0 ? gitDefault.stdout.trim() : null);
}

module.exports = { readRollingProjectConfigV1, parseRollingProjectConfig,
  RollingProjectConfigReaders, resolveRollingConfiguration, readRollingResolvedConfiguration, loadRollingConfiguration,
  readRollingBindingsV1, RollingBindingsReaders, collectRollingGraph, selectRollingAssignments };
