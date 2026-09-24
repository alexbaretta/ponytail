#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  readSprints,
  selectExecutionReadySprints,
  selectPlanningReadySprints,
  validateDependencies,
  validatePathOwnership,
  validateV3PathOwnership,
} = require('../skills/plan-execution/scripts/ready-sprints.js');
const {
  parseTaskletStatuses,
  readTaskletGraph,
  validateTaskletGraph,
} = require('../skills/plan-execution/scripts/ready-tasklets.js');

const MANAGEMENT_CONFIG_PATH = '.agents/config/project/management.json';
const PLAN_METADATA_MARKER = 'ponytail-plan-campaign';
const PLAN_SCHEMA_VERSION = 1;
const REPORT_SCHEMA_VERSION = 1;
const LIFECYCLE_ROLES = ['initial', 'activeWork', 'successfulCompletion', 'deferred', 'rejected'];

class CampaignError extends Error {
  constructor(status, code, message, recordId = null, relativePath = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.recordId = recordId;
    this.relativePath = relativePath;
  }
}

function dataError(code, message, recordId = null, relativePath = null) {
  throw new CampaignError(1, code, message, recordId, relativePath);
}

function toolError(code, message, relativePath = null) {
  throw new CampaignError(2, code, message, null, relativePath);
}

function exactKeys(value, expected, label, fail = dataError) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('CAMPAIGN_SCHEMA', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('CAMPAIGN_SCHEMA', `${label} must contain exactly: ${wanted.join(', ')}`);
  }
}

function relativePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value) || value.includes('\\') || /[*?{}]/.test(value)) {
    dataError('CAMPAIGN_CONFIG_PATH', `${label} must be an exact relative path without glob syntax`);
  }
  if (value.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    dataError('CAMPAIGN_CONFIG_PATH', `${label} contains an invalid path segment`);
  }
  return value;
}

function readManagementConfigV1(value) {
  exactKeys(value, ['schemaVersion', 'managementRoot', 'planRoot', 'lifecycle', 'legacyPlanLayout'], 'management configuration');
  if (value.schemaVersion !== 1) dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${value.schemaVersion}`);
  const managementRoot = relativePath(value.managementRoot, 'managementRoot');
  const planRoot = relativePath(value.planRoot, 'planRoot');
  if (planRoot !== managementRoot && !planRoot.startsWith(`${managementRoot}/`)) {
    dataError('CAMPAIGN_CONFIG_PATH', 'planRoot must be within managementRoot');
  }
  exactKeys(value.lifecycle, ['directories', 'roles'], 'lifecycle configuration');
  if (!Array.isArray(value.lifecycle.directories)
    || value.lifecycle.directories.some((directory) => typeof directory !== 'string' || !/^[a-z][a-z0-9_]*$/.test(directory))
    || new Set(value.lifecycle.directories).size !== value.lifecycle.directories.length
    || value.lifecycle.directories.length === 0) {
    dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle.directories must contain unique status directory names');
  }
  exactKeys(value.lifecycle.roles, LIFECYCLE_ROLES, 'lifecycle roles');
  const roleDirectories = LIFECYCLE_ROLES.map((role) => value.lifecycle.roles[role]);
  if (roleDirectories.some((directory) => !value.lifecycle.directories.includes(directory))
    || new Set(roleDirectories).size !== roleDirectories.length) {
    dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle roles must map bijectively to configured directories');
  }
  if (!['flat', 'none'].includes(value.legacyPlanLayout)) {
    dataError('CAMPAIGN_CONFIG_LEGACY', 'legacyPlanLayout must be flat or none');
  }
  return {
    schemaVersion: 1,
    managementRoot,
    planRoot,
    lifecycle: {
      directories: [...value.lifecycle.directories],
      roles: { ...value.lifecycle.roles },
    },
    legacyPlanLayout: value.legacyPlanLayout,
  };
}

const CampaignManagementConfigReaders = Object.freeze({ V1: readManagementConfigV1 });

function parseJsonFile(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) dataError(code, `${filePath} is not valid JSON: ${error.message}`);
    toolError('CAMPAIGN_IO', `cannot read ${filePath}: ${error.message}`);
  }
}

function readManagementConfig(repositoryRoot) {
  const filePath = path.join(repositoryRoot, MANAGEMENT_CONFIG_PATH);
  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isSymbolicLink() || !fs.statSync(filePath).isFile()) {
    toolError('CAMPAIGN_CONFIG_MISSING', `missing or unsafe management configuration: ${MANAGEMENT_CONFIG_PATH}`, MANAGEMENT_CONFIG_PATH);
  }
  const value = parseJsonFile(filePath, 'CAMPAIGN_CONFIG_JSON');
  const reader = CampaignManagementConfigReaders[`V${value.schemaVersion}`];
  if (!reader) dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${value.schemaVersion}`, null, MANAGEMENT_CONFIG_PATH);
  return reader(value);
}

function metadataBlocks(text) {
  const marker = new RegExp(`^<!--\\s*${PLAN_METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
  return [...text.matchAll(marker)].map((match) => match[1]);
}

function parseCandidate(planFile, lifecycle, repositoryRoot) {
  const relativePlanFile = path.relative(repositoryRoot, planFile).split(path.sep).join('/');
  let text;
  try {
    text = fs.readFileSync(planFile, 'utf8');
  } catch (error) {
    return { planFile, relativePlanFile, lifecycle, text: null, blocks: [], metadata: null, parseError: error };
  }
  const blocks = metadataBlocks(text);
  let metadata = null;
  let parseError = null;
  if (blocks.length === 1) {
    try {
      metadata = JSON.parse(blocks[0]);
    } catch (error) {
      parseError = error;
    }
  }
  return { planFile, relativePlanFile, lifecycle, text, blocks, metadata, parseError };
}

function readPlanMetadataV1(candidate) {
  const { metadata, planFile, relativePlanFile, lifecycle, text } = candidate;
  exactKeys(metadata, ['schemaVersion', 'id', 'parent_plan_id'], 'plan campaign metadata');
  if (metadata.schemaVersion !== PLAN_SCHEMA_VERSION) {
    dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, relativePlanFile);
  }
  const directoryId = path.basename(path.dirname(planFile));
  if (typeof metadata.id !== 'string' || metadata.id !== directoryId) {
    dataError('CAMPAIGN_PLAN_ID', `plan metadata id must be ${directoryId}`, metadata.id ?? null, relativePlanFile);
  }
  if (metadata.parent_plan_id !== null
    && (typeof metadata.parent_plan_id !== 'string' || !metadata.parent_plan_id || metadata.parent_plan_id === metadata.id)) {
    dataError('CAMPAIGN_PARENT', 'parent_plan_id must be null or a different nonempty plan ID', metadata.id, relativePlanFile);
  }
  if (lifecycle === null) {
    dataError('CAMPAIGN_LEGACY_LAYOUT', 'managed plans must use a configured lifecycle directory', metadata.id, relativePlanFile);
  }
  const escapedId = metadata.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(?:Plan ID:\\*\\*|Plan ID:)\\s*\`?${escapedId}\`?`).test(text)) {
    dataError('CAMPAIGN_PLAN_PROSE_ID', `manifest prose must declare Plan ID ${metadata.id}`, metadata.id, relativePlanFile);
  }
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    id: metadata.id,
    parentPlanId: metadata.parent_plan_id,
    lifecycle,
    planFile,
    relativePlanFile,
    planDirectory: path.dirname(planFile),
    text,
  };
}

const CampaignPlanMetadataReaders = Object.freeze({ V1: readPlanMetadataV1 });

function readManagedPlan(candidate) {
  if (fs.lstatSync(candidate.planFile).isSymbolicLink()) {
    dataError('CAMPAIGN_PLAN_FILE', 'managed plan manifest must not be a symbolic link', candidate.metadata?.id ?? null, candidate.relativePlanFile);
  }
  if (candidate.blocks.length !== 1) {
    dataError('CAMPAIGN_PLAN_BLOCK', `${candidate.relativePlanFile} must contain exactly one ${PLAN_METADATA_MARKER} block`, candidate.metadata?.id ?? null, candidate.relativePlanFile);
  }
  if (candidate.parseError || !candidate.metadata) {
    dataError('CAMPAIGN_PLAN_JSON', `${candidate.relativePlanFile} campaign metadata is not valid JSON`, null, candidate.relativePlanFile);
  }
  const reader = CampaignPlanMetadataReaders[`V${candidate.metadata.schemaVersion}`];
  if (!reader) dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${candidate.metadata.schemaVersion}`, candidate.metadata.id ?? null, candidate.relativePlanFile);
  return reader(candidate);
}

function sortedDirectories(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    toolError('CAMPAIGN_IO', `cannot list ${directory}: ${error.message}`);
  }
}

function scanPlanCandidates(repositoryRoot, config) {
  const planRoot = path.join(repositoryRoot, config.planRoot);
  if (!fs.existsSync(planRoot) || !fs.statSync(planRoot).isDirectory()) {
    toolError('CAMPAIGN_PLAN_ROOT', `configured plan root does not exist: ${config.planRoot}`, config.planRoot);
  }
  if (fs.lstatSync(planRoot).isSymbolicLink()) {
    dataError('CAMPAIGN_CONFIG_PATH', `configured plan root must not be a symbolic link: ${config.planRoot}`, null, config.planRoot);
  }
  const canonicalPlanRoot = fs.realpathSync(planRoot);
  if (canonicalPlanRoot !== repositoryRoot && !canonicalPlanRoot.startsWith(`${repositoryRoot}${path.sep}`)) {
    dataError('CAMPAIGN_CONFIG_PATH', `configured plan root escapes the repository: ${config.planRoot}`, null, config.planRoot);
  }
  const candidates = [];
  for (const lifecycle of config.lifecycle.directories) {
    const lifecycleDirectory = path.join(planRoot, lifecycle);
    if (!fs.existsSync(lifecycleDirectory)) continue;
    if (fs.lstatSync(lifecycleDirectory).isSymbolicLink() || !fs.statSync(lifecycleDirectory).isDirectory()) {
      dataError('CAMPAIGN_CONFIG_PATH', `lifecycle location must be a regular directory: ${config.planRoot}/${lifecycle}`, null, `${config.planRoot}/${lifecycle}`);
    }
    for (const name of sortedDirectories(lifecycleDirectory)) {
      const planFile = path.join(lifecycleDirectory, name, 'plan.md');
      if (fs.existsSync(planFile) && !fs.lstatSync(planFile).isSymbolicLink() && fs.statSync(planFile).isFile()) {
        candidates.push(parseCandidate(planFile, lifecycle, repositoryRoot));
      }
    }
  }
  if (config.legacyPlanLayout === 'flat') {
    const lifecycleDirectories = new Set(config.lifecycle.directories);
    for (const name of sortedDirectories(planRoot)) {
      if (lifecycleDirectories.has(name)) continue;
      const planFile = path.join(planRoot, name, 'plan.md');
      if (fs.existsSync(planFile) && !fs.lstatSync(planFile).isSymbolicLink() && fs.statSync(planFile).isFile()) {
        candidates.push(parseCandidate(planFile, null, repositoryRoot));
      }
    }
  }
  return candidates.sort((left, right) => {
    const leftOrder = left.lifecycle === null ? config.lifecycle.directories.length : config.lifecycle.directories.indexOf(left.lifecycle);
    const rightOrder = right.lifecycle === null ? config.lifecycle.directories.length : config.lifecycle.directories.indexOf(right.lifecycle);
    return leftOrder - rightOrder || left.relativePlanFile.localeCompare(right.relativePlanFile);
  });
}

function resolveInputPlan(input, repositoryRoot, config, candidates) {
  if (input && !['.', '..', 'plan.md'].includes(input) && !input.includes('/') && !input.includes('\\')) {
    const matches = candidates.filter((candidate) => path.basename(path.dirname(candidate.planFile)) === input);
    if (matches.length === 0) toolError('CAMPAIGN_INPUT', `plan name does not exist: ${input}`);
    if (matches.length > 1) dataError('CAMPAIGN_INPUT_AMBIGUOUS', `plan name exists in multiple lifecycle locations: ${input}`, input);
    return { candidate: matches[0], invocationInput: input };
  }
  let inputPath;
  try {
    inputPath = fs.realpathSync(path.resolve(input));
  } catch (error) {
    toolError('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
  }
  let planFile = inputPath;
  try {
    if (fs.statSync(inputPath).isDirectory()) planFile = path.join(inputPath, 'plan.md');
  } catch (error) {
    toolError('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
  }
  if (path.basename(planFile) !== 'plan.md' || !fs.existsSync(planFile) || fs.lstatSync(planFile).isSymbolicLink() || !fs.statSync(planFile).isFile()) {
    toolError('CAMPAIGN_INPUT', 'input must be a regular non-symlink plan directory or plan.md');
  }
  const relative = path.relative(repositoryRoot, planFile).split(path.sep).join('/');
  if (relative.startsWith('../') || path.isAbsolute(relative) || !relative.startsWith(`${config.planRoot}/`)) {
    toolError('CAMPAIGN_INPUT', `input is outside configured plan root: ${input}`);
  }
  const candidate = candidates.find((item) => item.planFile === planFile);
  if (!candidate) dataError('CAMPAIGN_INPUT_LAYOUT', 'input is not in a supported managed plan layout', null, relative);
  return {
    candidate,
    invocationInput: path.relative(repositoryRoot, inputPath).split(path.sep).join('/'),
  };
}

function validateParentLink(plan, parent) {
  const links = [...plan.text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)];
  const parentFile = fs.realpathSync(parent.planFile);
  const found = links.some((match) => {
    const target = path.resolve(path.dirname(plan.planFile), match[1]);
    const file = path.basename(target) === 'plan.md' ? target : path.join(target, 'plan.md');
    return fs.existsSync(file) && fs.realpathSync(file) === parentFile;
  });
  if (!found) dataError('CAMPAIGN_PARENT_LINK', `manifest must link to parent plan ${parent.id}`, plan.id, plan.relativePlanFile);
}

function discoverCampaign(repositoryRoot, config, input) {
  const candidates = scanPlanCandidates(repositoryRoot, config);
  const resolvedInputPlan = resolveInputPlan(input, repositoryRoot, config, candidates);
  const selected = readManagedPlan(resolvedInputPlan.candidate);
  const membersByPath = new Map([[selected.planFile, selected]]);
  let current = selected;
  const ancestorIds = new Set([current.id]);
  while (current.parentPlanId !== null) {
    const matches = candidates.filter((candidate) => candidate.metadata?.id === current.parentPlanId);
    if (matches.length === 0) dataError('CAMPAIGN_PARENT_MISSING', `missing parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    if (matches.length > 1) dataError('CAMPAIGN_PARENT_AMBIGUOUS', `ambiguous parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    const parent = readManagedPlan(matches[0]);
    if (ancestorIds.has(parent.id)) dataError('CAMPAIGN_PARENT_CYCLE', `parent cycle reaches ${parent.id}`, current.id, current.relativePlanFile);
    validateParentLink(current, parent);
    ancestorIds.add(parent.id);
    membersByPath.set(parent.planFile, parent);
    current = parent;
  }
  const root = current;
  const memberIds = new Map([...membersByPath.values()].map((plan) => [plan.id, plan.planFile]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      if (membersByPath.has(candidate.planFile) || !candidate.metadata || !memberIds.has(candidate.metadata.parent_plan_id)) continue;
      const child = readManagedPlan(candidate);
      const existingPath = memberIds.get(child.id);
      if (existingPath && existingPath !== child.planFile) {
        dataError('CAMPAIGN_PLAN_ID_DUPLICATE', `duplicate campaign member ID: ${child.id}`, child.id, child.relativePlanFile);
      }
      const parent = membersByPath.get(memberIds.get(child.parentPlanId));
      validateParentLink(child, parent);
      membersByPath.set(child.planFile, child);
      memberIds.set(child.id, child.planFile);
      changed = true;
    }
  }
  const plans = [...membersByPath.values()].sort((left, right) => (
    config.lifecycle.directories.indexOf(left.lifecycle) - config.lifecycle.directories.indexOf(right.lifecycle)
    || left.id.localeCompare(right.id)
  ));
  return { root, plans, invocationInput: resolvedInputPlan.invocationInput };
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function validatePlanContents(plan, config, repositoryRoot) {
  let sprints;
  let sprintById;
  try {
    sprints = readSprints(plan.planDirectory);
    sprintById = validateDependencies(sprints);
    if (sprints[0].schemaVersion === 1) validatePathOwnership(sprints, sprintById);
    if (sprints[0].schemaVersion === 3) validateV3PathOwnership(sprints, sprintById);
    selectPlanningReadySprints(sprints, sprintById);
    selectExecutionReadySprints(sprints, sprintById);
  } catch (error) {
    dataError('CAMPAIGN_SPRINT_INVALID', error.message, plan.id, plan.relativePlanFile);
  }
  const normalizedSprints = [];
  const normalizedTasklets = [];
  for (const sprint of sprints) {
    if (sprint.execution === null) {
      normalizedSprints.push({
        id: sprint.id,
        planId: plan.id,
        planningStatus: sprint.planning.status,
        executionStatus: null,
        taskletCounts: { PENDING: 0, DONE: 0, ERROR: 0 },
        totalTasklets: 0,
      });
      continue;
    }
    let graph;
    let statuses;
    try {
      statuses = parseTaskletStatuses(sprint.filePath);
      graph = readTaskletGraph(sprint.filePath);
      validateTaskletGraph(graph, statuses);
    } catch (error) {
      dataError('CAMPAIGN_TASKLET_INVALID', error.message, plan.id, path.relative(repositoryRoot, sprint.filePath).split(path.sep).join('/'));
    }
    const taskletCounts = { PENDING: 0, DONE: 0, ERROR: 0 };
    for (const [id, tasklet] of [...graph.tasklets].sort(([left], [right]) => left.localeCompare(right))) {
      const status = statuses.get(id);
      increment(taskletCounts, status);
      normalizedTasklets.push({
        id,
        planId: plan.id,
        sprintId: sprint.id,
        featureId: tasklet.feature ?? null,
        status,
        dependsOn: [...tasklet.depends_on].sort(),
        plannedPaths: [...(tasklet.planned_paths ?? [])].sort(),
      });
    }
    normalizedSprints.push({
      id: sprint.id,
      planId: plan.id,
      planningStatus: sprint.planning.status,
      executionStatus: sprint.execution?.status ?? null,
      taskletCounts,
      totalTasklets: statuses.size,
    });
  }
  if (plan.lifecycle === config.lifecycle.roles.successfulCompletion) {
    const unfinishedSprint = normalizedSprints.find((sprint) => sprint.executionStatus !== 'DONE');
    const unfinishedTasklet = normalizedTasklets.find((tasklet) => tasklet.status !== 'DONE');
    if (unfinishedSprint || unfinishedTasklet) {
      dataError('CAMPAIGN_PLAN_CLOSED_INCOMPLETE', 'completed plan contains unfinished sprint or tasklet state', plan.id, plan.relativePlanFile);
    }
  }
  return { sprints: normalizedSprints, tasklets: normalizedTasklets };
}

function git(repositoryRoot, gitArguments, allowFailure = false) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...gitArguments], { encoding: 'utf8' });
  if (result.error) toolError('CAMPAIGN_GIT', result.error.message);
  if (result.status !== 0 && !allowFailure) toolError('CAMPAIGN_GIT', result.stderr.trim() || `git ${gitArguments.join(' ')} failed`);
  return result;
}

function repositoryIdentity(repositoryRoot) {
  const commit = git(repositoryRoot, ['rev-parse', 'HEAD']).stdout.trim();
  const branchResult = git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'], true);
  const status = git(repositoryRoot, ['status', '--porcelain']).stdout;
  return {
    root: '.',
    worktree: '.',
    commit,
    branch: branchResult.status === 0 ? branchResult.stdout.trim() : null,
    detached: branchResult.status !== 0,
    clean: status.length === 0,
  };
}

function buildReport(repositoryRoot, config, input) {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(canonicalRepositoryRoot, config, input);
  const planRecords = [];
  const sprintRecords = [];
  const taskletRecords = [];
  const plansByLifecycle = Object.fromEntries(config.lifecycle.directories.map((directory) => [directory, 0]));
  const sprintsByPlanningStatus = {};
  const sprintsByExecutionStatus = {};
  const incompleteSprintsByPlanningStatus = {};
  const incompleteSprintsByExecutionStatus = {};
  const taskletsByStatus = { PENDING: 0, DONE: 0, ERROR: 0 };
  for (const plan of campaign.plans) {
    const contents = validatePlanContents(plan, config, canonicalRepositoryRoot);
    increment(plansByLifecycle, plan.lifecycle);
    for (const sprint of contents.sprints) {
      increment(sprintsByPlanningStatus, sprint.planningStatus);
      increment(sprintsByExecutionStatus, sprint.executionStatus ?? 'UNPLANNED');
      if (sprint.executionStatus !== 'DONE') {
        increment(incompleteSprintsByPlanningStatus, sprint.planningStatus);
        increment(incompleteSprintsByExecutionStatus, sprint.executionStatus ?? 'UNPLANNED');
      }
      sprintRecords.push(sprint);
    }
    for (const tasklet of contents.tasklets) {
      increment(taskletsByStatus, tasklet.status);
      taskletRecords.push(tasklet);
    }
    planRecords.push({
      id: plan.id,
      parentPlanId: plan.parentPlanId,
      lifecycle: plan.lifecycle,
      path: plan.relativePlanFile,
      sprintCount: contents.sprints.length,
      taskletCounts: contents.tasklets.reduce((counts, tasklet) => {
        increment(counts, tasklet.status);
        return counts;
      }, { PENDING: 0, DONE: 0, ERROR: 0 }),
      totalTasklets: contents.tasklets.length,
    });
  }
  if (campaign.plans.length > 1 && campaign.root.lifecycle === config.lifecycle.roles.successfulCompletion) {
    const incomplete = campaign.plans.find((plan) => plan.lifecycle !== config.lifecycle.roles.successfulCompletion);
    if (incomplete) dataError('CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${incomplete.id}`, campaign.root.id, campaign.root.relativePlanFile);
  }
  const totalTasklets = taskletRecords.length;
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    valid: true,
    invocation: {
      command: 'report',
      input: campaign.invocationInput,
    },
    repository: repositoryIdentity(canonicalRepositoryRoot),
    campaign: {
      rootPlanId: campaign.root.id,
      plans: planRecords,
      sprints: sprintRecords,
      tasklets: taskletRecords,
    },
    totals: {
      plans: planRecords.length,
      plansByLifecycle,
      sprints: sprintRecords.length,
      incompleteSprints: sprintRecords.filter((sprint) => sprint.executionStatus !== 'DONE').length,
      sprintsByPlanningStatus,
      sprintsByExecutionStatus,
      incompleteSprintsByPlanningStatus,
      incompleteSprintsByExecutionStatus,
      tasklets: totalTasklets,
      taskletsByStatus,
      doneTasklets: taskletsByStatus.DONE,
      taskletCompletionPercentage: totalTasklets === 0 ? null : (taskletsByStatus.DONE * 100) / totalTasklets,
    },
  };
  return readCampaignReportV1(report);
}

function readCampaignReportV1(value) {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'campaign', 'totals'], 'campaign report');
  if (value.schemaVersion !== REPORT_SCHEMA_VERSION || value.valid !== true) dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid V1 campaign report envelope');
  exactKeys(value.invocation, ['command', 'input'], 'campaign report invocation');
  exactKeys(value.repository, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], 'campaign report repository');
  exactKeys(value.campaign, ['rootPlanId', 'plans', 'sprints', 'tasklets'], 'campaign report campaign');
  exactKeys(value.totals, ['plans', 'plansByLifecycle', 'sprints', 'incompleteSprints', 'sprintsByPlanningStatus', 'sprintsByExecutionStatus', 'incompleteSprintsByPlanningStatus', 'incompleteSprintsByExecutionStatus', 'tasklets', 'taskletsByStatus', 'doneTasklets', 'taskletCompletionPercentage'], 'campaign report totals');
  if (!Array.isArray(value.campaign.plans) || !Array.isArray(value.campaign.sprints) || !Array.isArray(value.campaign.tasklets)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report records must be arrays');
  }
  if (value.invocation.command !== 'report' || typeof value.invocation.input !== 'string'
    || value.repository.root !== '.' || value.repository.worktree !== '.'
    || typeof value.repository.commit !== 'string'
    || !(typeof value.repository.branch === 'string' || value.repository.branch === null)
    || typeof value.repository.detached !== 'boolean' || typeof value.repository.clean !== 'boolean'
    || typeof value.campaign.rootPlanId !== 'string') {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report envelope contains invalid values');
  }
  const counts = [value.totals.plans, value.totals.sprints, value.totals.incompleteSprints, value.totals.tasklets, value.totals.doneTasklets];
  if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)
    || !(value.totals.taskletCompletionPercentage === null
      || (typeof value.totals.taskletCompletionPercentage === 'number'
        && value.totals.taskletCompletionPercentage >= 0
        && value.totals.taskletCompletionPercentage <= 100))) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report totals contain invalid values');
  }
  for (const [label, record, keys] of [
    ...value.campaign.plans.map((record) => ['plan', record, ['id', 'parentPlanId', 'lifecycle', 'path', 'sprintCount', 'taskletCounts', 'totalTasklets']]),
    ...value.campaign.sprints.map((record) => ['sprint', record, ['id', 'planId', 'planningStatus', 'executionStatus', 'taskletCounts', 'totalTasklets']]),
    ...value.campaign.tasklets.map((record) => ['tasklet', record, ['id', 'planId', 'sprintId', 'featureId', 'status', 'dependsOn', 'plannedPaths']]),
  ]) exactKeys(record, keys, `campaign report ${label}`);
  const isCount = (count) => Number.isSafeInteger(count) && count >= 0;
  const validCountMap = (record) => record && typeof record === 'object' && !Array.isArray(record)
    && Object.values(record).every(isCount);
  const validTaskletCounts = (record) => validCountMap(record)
    && Object.keys(record).sort().join(',') === 'DONE,ERROR,PENDING';
  if (![value.totals.plansByLifecycle, value.totals.sprintsByPlanningStatus,
    value.totals.sprintsByExecutionStatus, value.totals.incompleteSprintsByPlanningStatus,
    value.totals.incompleteSprintsByExecutionStatus, value.totals.taskletsByStatus].every(validCountMap)
    || !validTaskletCounts(value.totals.taskletsByStatus)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report grouped totals contain invalid values');
  }
  for (const record of value.campaign.plans) {
    if (typeof record.id !== 'string' || !(typeof record.parentPlanId === 'string' || record.parentPlanId === null)
      || typeof record.lifecycle !== 'string' || typeof record.path !== 'string'
      || !isCount(record.sprintCount) || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report plan contains invalid values');
    }
  }
  for (const record of value.campaign.sprints) {
    if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.planningStatus !== 'string'
      || !(typeof record.executionStatus === 'string' || record.executionStatus === null)
      || !validTaskletCounts(record.taskletCounts) || !isCount(record.totalTasklets)) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report sprint contains invalid values');
    }
  }
  for (const record of value.campaign.tasklets) {
    if (typeof record.id !== 'string' || typeof record.planId !== 'string' || typeof record.sprintId !== 'string'
      || !(typeof record.featureId === 'string' || record.featureId === null)
      || !['PENDING', 'DONE', 'ERROR'].includes(record.status)
      || !Array.isArray(record.dependsOn) || record.dependsOn.some((id) => typeof id !== 'string')
      || !Array.isArray(record.plannedPaths) || record.plannedPaths.some((item) => typeof item !== 'string')) {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign report tasklet contains invalid values');
    }
  }
  return value;
}

const CampaignReportReaders = Object.freeze({ V1: readCampaignReportV1 });

function percentage(value) {
  return value === null ? 'unavailable (no tasklets)' : `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function taskletCountLine(label, taskletCounts) {
  const total = taskletCounts.DONE + taskletCounts.PENDING + taskletCounts.ERROR;
  return `${label}\t${taskletCounts.DONE}\t${taskletCounts.PENDING}\t${taskletCounts.ERROR}\t${total}`;
}

function humanReport(report, worktree) {
  const taskletsByPlanLifecycle = Object.fromEntries(
    Object.keys(report.totals.plansByLifecycle)
      .map((lifecycle) => [lifecycle, { PENDING: 0, DONE: 0, ERROR: 0 }]),
  );
  for (const plan of report.campaign.plans) {
    for (const status of ['PENDING', 'DONE', 'ERROR']) {
      taskletsByPlanLifecycle[plan.lifecycle][status] += plan.taskletCounts[status];
    }
  }
  const incompleteSprints = report.campaign.sprints
    .filter((sprint) => sprint.executionStatus !== 'DONE');
  const lines = [
    `Campaign: ${report.campaign.rootPlanId}`,
    `Worktree: ${worktree}`,
    `Revision: ${report.repository.commit} (${report.repository.branch ?? 'detached'}, ${report.repository.clean ? 'clean' : 'dirty'})`,
    `Plans: ${report.totals.plans}; Sprints: ${report.totals.sprints} (${report.totals.incompleteSprints} incomplete)`,
    '',
    'Tasklet census',
    'Plan lifecycle\tDONE\tPENDING\tERROR\tTotal',
  ];
  for (const [lifecycle, taskletCounts] of Object.entries(taskletsByPlanLifecycle)) {
    lines.push(taskletCountLine(lifecycle, taskletCounts));
  }
  lines.push(
    taskletCountLine('Campaign total', report.totals.taskletsByStatus),
    `Campaign completion: ${percentage(report.totals.taskletCompletionPercentage)} by tasklet count`,
    'PENDING and ERROR are distinct formal tasklet states.',
    '',
    'Plan census',
    'Lifecycle\tPlan\tDONE\tPENDING\tERROR\tTotal',
  );
  for (const plan of report.campaign.plans) {
    lines.push(`${plan.lifecycle}\t${plan.id}\t${plan.taskletCounts.DONE}\t${plan.taskletCounts.PENDING}\t${plan.taskletCounts.ERROR}\t${plan.totalTasklets}`);
  }
  lines.push('', 'Incomplete sprint census');
  if (incompleteSprints.length === 0) {
    lines.push('None');
  } else {
    lines.push('Plan/Sprint\tPlanning\tExecution\tDONE\tPENDING\tERROR\tTotal');
    for (const sprint of incompleteSprints) {
      lines.push(`${sprint.planId}/${sprint.id}\t${sprint.planningStatus}\t${sprint.executionStatus ?? 'UNPLANNED'}\t${sprint.taskletCounts.DONE}\t${sprint.taskletCounts.PENDING}\t${sprint.taskletCounts.ERROR}\t${sprint.totalTasklets}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function repositoryRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) toolError('CAMPAIGN_REPOSITORY', 'current directory is not in a Git worktree');
  return fs.realpathSync(result.stdout.trim());
}

function usage() {
  return 'usage: ponytail campaign validate <plan-name-or-path>\n       ponytail campaign report <plan-name-or-path> [--json]';
}

function run(argv = process.argv.slice(2)) {
  const operation = argv[0];
  let input;
  let json = false;
  if (operation === 'validate' && argv.length === 2) {
    input = argv[1];
  } else if (operation === 'report' && (argv.length === 2 || (argv.length === 3 && argv[2] === '--json'))) {
    input = argv[1];
    json = argv[2] === '--json';
  } else {
    toolError('CAMPAIGN_USAGE', usage());
  }
  const root = repositoryRoot();
  const config = readManagementConfig(root);
  const report = buildReport(root, config, input);
  if (operation === 'validate') {
    process.stdout.write(`valid: ${report.campaign.rootPlanId} (${report.totals.plans} plans, ${report.totals.sprints} sprints, ${report.totals.tasklets} tasklets)\n`);
  } else if (json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(humanReport(report, root));
  }
  return report;
}

function diagnostic(error) {
  const parts = [`error ${error.code ?? 'CAMPAIGN_INTERNAL'}`];
  if (error.recordId) parts.push(`[${error.recordId}]`);
  if (error.relativePath) parts.push(error.relativePath);
  return `${parts.join(' ')}: ${error.message}`;
}

module.exports = {
  CampaignError,
  CampaignManagementConfigReaders,
  CampaignPlanMetadataReaders,
  CampaignReportReaders,
  buildReport,
  diagnostic,
  discoverCampaign,
  humanReport,
  readManagementConfigV1,
  readPlanMetadataV1,
  readCampaignReportV1,
  run,
};

if (require.main === module) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${diagnostic(error)}\n`);
    process.exitCode = error instanceof CampaignError ? error.status : 2;
  }
}
