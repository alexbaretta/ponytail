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
const PLAN_SCHEMA_VERSION = 2;
const REPORT_SCHEMA_VERSION = 1;
const INVENTORY_SCHEMA_VERSION = 2;
const LIFECYCLE_ROLES = ['initial', 'activeWork', 'successfulCompletion', 'deferred', 'rejected'];
const REPORT_TABLE_FLAGS = Object.freeze({
  '--summary-table': ['summaryTable', true],
  '--no-summary-table': ['summaryTable', false],
  '--plan-table': ['planTable', true],
  '--no-plan-table': ['planTable', false],
  '--sprint-table': ['sprintTable', true],
  '--no-sprint-table': ['sprintTable', false],
});

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
  if (metadata.schemaVersion !== 1) {
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
    schemaVersion: 1,
    id: metadata.id,
    parentPlanId: metadata.parent_plan_id,
    dependsOn: [],
    lifecycle,
    planFile,
    relativePlanFile,
    planDirectory: path.dirname(planFile),
    text,
  };
}

function readPlanMetadataV2(candidate) {
  const { metadata } = candidate;
  exactKeys(metadata, ['schemaVersion', 'id', 'parent_plan_id', 'depends_on'], 'plan campaign metadata');
  if (metadata.schemaVersion !== PLAN_SCHEMA_VERSION) {
    dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, candidate.relativePlanFile);
  }
  if (!Array.isArray(metadata.depends_on)
    || metadata.depends_on.some((id) => typeof id !== 'string' || !id || id === metadata.id)
    || new Set(metadata.depends_on).size !== metadata.depends_on.length) {
    dataError('CAMPAIGN_DEPENDENCY', 'depends_on must contain unique, nonempty plan IDs other than the current plan', metadata.id ?? null, candidate.relativePlanFile);
  }
  const plan = readPlanMetadataV1({
    ...candidate,
    metadata: {
      schemaVersion: 1,
      id: metadata.id,
      parent_plan_id: metadata.parent_plan_id,
    },
  });
  return { ...plan, schemaVersion: PLAN_SCHEMA_VERSION, dependsOn: [...metadata.depends_on].sort() };
}

const CampaignPlanMetadataReaders = Object.freeze({ V1: readPlanMetadataV1, V2: readPlanMetadataV2 });

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

function listPlanSourceFiles(repositoryRoot, config) {
  const planRoot = path.join(repositoryRoot, config.planRoot);
  const sources = [];
  for (const lifecycle of config.lifecycle.directories) {
    const directory = path.join(planRoot, lifecycle);
    if (!fs.existsSync(directory)) continue;
    for (const name of sortedDirectories(directory)) {
      const planFile = path.join(directory, name, 'plan.md');
      if (fs.existsSync(planFile) && fs.statSync(planFile).isFile() &&
          !fs.lstatSync(planFile).isSymbolicLink()) {
        sources.push({
          lifecycle,
          relativePlanFile: path.relative(repositoryRoot, planFile).split(path.sep).join('/'),
        });
      }
    }
  }
  if (config.legacyPlanLayout === 'flat') {
    const lifecycleDirectories = new Set(config.lifecycle.directories);
    for (const name of sortedDirectories(planRoot)) {
      if (lifecycleDirectories.has(name)) continue;
      const planFile = path.join(planRoot, name, 'plan.md');
      if (fs.existsSync(planFile) && fs.statSync(planFile).isFile() &&
          !fs.lstatSync(planFile).isSymbolicLink()) {
        sources.push({
          lifecycle: null,
          relativePlanFile: path.relative(repositoryRoot, planFile).split(path.sep).join('/'),
        });
      }
    }
  }
  return sources.sort((left, right) =>
    left.relativePlanFile.localeCompare(right.relativePlanFile));
}

function parsePlanSource(repositoryRoot, relativePlanFile, lifecycle, text) {
  const planFile = path.join(repositoryRoot, relativePlanFile);
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
  return readManagedPlan({
    planFile,
    relativePlanFile,
    lifecycle,
    text,
    blocks,
    metadata,
    parseError,
  });
}

function resolveInputPlan(input, repositoryRoot, config, candidates) {
  if (input === undefined) {
    const activeCandidates = candidates.filter((candidate) => (
      candidate.lifecycle === config.lifecycle.roles.activeWork && candidate.blocks.length !== 0
    ));
    if (activeCandidates.length === 0) toolError('CAMPAIGN_ACTIVE_MISSING', 'no managed plan is in the configured active-work lifecycle');
    const rootsByPath = new Map();
    for (const candidate of activeCandidates) {
      const { root } = readAncestors(candidates, candidate);
      rootsByPath.set(root.planFile, root);
    }
    if (rootsByPath.size !== 1) {
      const rootIds = [...rootsByPath.values()].map((plan) => plan.id).sort();
      toolError('CAMPAIGN_ACTIVE_AMBIGUOUS', `multiple campaigns contain active plans: ${rootIds.join(', ')}`);
    }
    const [root] = rootsByPath.values();
    return {
      candidate: candidates.find((candidate) => candidate.planFile === root.planFile),
      invocationInput: '',
    };
  }
  const parts = input && !input.includes('\\') ? input.split('/') : [];
  const planName = parts.length === 1 && !['.', '..', 'plan.md'].includes(input)
    ? input
    : parts.length === 2 && !['.', '..'].includes(parts[0]) && parts[1] === 'plan.md'
      ? parts[0]
      : null;
  if (planName !== null) {
    const matches = candidates.filter((candidate) => path.basename(path.dirname(candidate.planFile)) === planName);
    if (matches.length === 0) toolError('CAMPAIGN_INPUT', `plan name does not exist: ${planName}`);
    if (matches.length > 1) dataError('CAMPAIGN_INPUT_AMBIGUOUS', `plan name exists in multiple lifecycle locations: ${planName}`, planName);
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

function linkedPlanFiles(plan) {
  const links = [...plan.text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)];
  return links.flatMap((match) => {
    const target = path.resolve(path.dirname(plan.planFile), match[1]);
    const file = path.basename(target) === 'plan.md' ? target : path.join(target, 'plan.md');
    return fs.existsSync(file) ? [fs.realpathSync(file)] : [];
  });
}

function validateParentLink(plan, parent) {
  const parentFile = fs.realpathSync(parent.planFile);
  const found = linkedPlanFiles(plan).includes(parentFile);
  if (!found) dataError('CAMPAIGN_PARENT_LINK', `manifest must link to parent plan ${parent.id}`, plan.id, plan.relativePlanFile);
}

function readAncestors(candidates, candidate) {
  const selected = readManagedPlan(candidate);
  const membersByPath = new Map([[selected.planFile, selected]]);
  let current = selected;
  const ancestorIds = new Set([current.id]);
  while (current.parentPlanId !== null) {
    const matches = candidates.filter((item) => item.metadata?.id === current.parentPlanId);
    if (matches.length === 0) dataError('CAMPAIGN_PARENT_MISSING', `missing parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    if (matches.length > 1) dataError('CAMPAIGN_PARENT_AMBIGUOUS', `ambiguous parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    const parent = readManagedPlan(matches[0]);
    if (ancestorIds.has(parent.id)) dataError('CAMPAIGN_PARENT_CYCLE', `parent cycle reaches ${parent.id}`, current.id, current.relativePlanFile);
    validateParentLink(current, parent);
    ancestorIds.add(parent.id);
    membersByPath.set(parent.planFile, parent);
    current = parent;
  }
  return { root: current, selected, membersByPath };
}

function discoverCampaign(repositoryRoot, config, input) {
  const candidates = scanPlanCandidates(repositoryRoot, config);
  const resolvedInputPlan = resolveInputPlan(input, repositoryRoot, config, candidates);
  const { root, selected, membersByPath } = readAncestors(candidates, resolvedInputPlan.candidate);
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
  return { root, selected, plans, invocationInput: resolvedInputPlan.invocationInput };
}

function resolveCampaignRoot(repositoryRoot, input) {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(
    canonicalRepositoryRoot,
    readManagementConfig(canonicalRepositoryRoot),
    input,
  );
  return { campaignId: campaign.root.id, submittedPlanId: campaign.selected.id };
}

function resolveCampaignScope(repositoryRoot, input) {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(
    canonicalRepositoryRoot,
    readManagementConfig(canonicalRepositoryRoot),
    input,
  );
  return {
    campaignId: campaign.root.id,
    submittedPlanId: campaign.selected.id,
    plans: campaign.plans.map(plan => ({
      id: plan.id,
      path: plan.relativePlanFile,
    })),
  };
}

function validateCampaignDependencies(plans) {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  for (const plan of plans) {
    for (const dependencyId of plan.dependsOn) {
      if (!plansById.has(dependencyId)) {
        dataError('CAMPAIGN_DEPENDENCY_MISSING', `dependency is not a member of campaign ${plans[0].id}: ${dependencyId}`, plan.id, plan.relativePlanFile);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (plan) => {
    if (visiting.has(plan.id)) dataError('CAMPAIGN_DEPENDENCY_CYCLE', `dependency cycle reaches ${plan.id}`, plan.id, plan.relativePlanFile);
    if (visited.has(plan.id)) return;
    visiting.add(plan.id);
    for (const dependencyId of plan.dependsOn) visit(plansById.get(dependencyId));
    visiting.delete(plan.id);
    visited.add(plan.id);
  };
  for (const plan of plans) visit(plan);
}

function campaignGraph(repositoryRoot, input) {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const config = readManagementConfig(canonicalRepositoryRoot);
  const campaign = discoverCampaign(canonicalRepositoryRoot, config, input);
  validateCampaignDependencies(campaign.plans);
  for (const plan of campaign.plans) validatePlanContents(plan, config, canonicalRepositoryRoot);
  return {
    campaignId: campaign.root.id,
    submittedPlanId: campaign.selected.id,
    plans: campaign.plans.map((plan) => ({
      id: plan.id,
      parentPlanId: plan.parentPlanId,
      dependsOn: [...plan.dependsOn],
      lifecycle: plan.lifecycle,
      path: plan.relativePlanFile,
    })),
    lifecycle: { ...config.lifecycle.roles },
  };
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
  validateCampaignDependencies(campaign.plans);
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

let CampaignReportReaders;

function campaignDiagnostic(error, fallbackPath = null) {
  return {
    code: error.code ?? 'CAMPAIGN_INTERNAL',
    message: error.message,
    recordId: error.recordId ?? null,
    path: error.relativePath ?? fallbackPath,
  };
}

function buildRepositoryInventory(repositoryRoot, config, command = 'report') {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const candidates = scanPlanCandidates(canonicalRepositoryRoot, config);
  const unmanagedPlans = [];
  const parsedPlans = [];
  const invalidByPath = new Map();
  const diagnostics = [];
  const addInvalid = (candidate, error) => {
    const diagnostic = campaignDiagnostic(error, candidate.relativePlanFile);
    const existing = invalidByPath.get(candidate.relativePlanFile) ?? {
      id: candidate.metadata?.id ?? null,
      lifecycle: candidate.lifecycle,
      path: candidate.relativePlanFile,
      diagnostics: [],
    };
    if (!existing.diagnostics.some((item) => item.code === diagnostic.code && item.message === diagnostic.message)) {
      existing.diagnostics.push(diagnostic);
    }
    invalidByPath.set(candidate.relativePlanFile, existing);
  };
  for (const candidate of candidates) {
    if (candidate.lifecycle === null && candidate.blocks.length === 0) {
      unmanagedPlans.push({ path: candidate.relativePlanFile });
      continue;
    }
    try {
      const plan = readManagedPlan(candidate);
      validatePlanContents(plan, config, canonicalRepositoryRoot);
      parsedPlans.push({ candidate, plan });
    } catch (error) {
      if (!(error instanceof CampaignError) || error.status !== 1) throw error;
      addInvalid(candidate, error);
    }
  }

  const plansById = new Map();
  for (const entry of parsedPlans) {
    const entries = plansById.get(entry.plan.id) ?? [];
    entries.push(entry);
    plansById.set(entry.plan.id, entries);
  }
  for (const entries of plansById.values()) {
    if (entries.length < 2) continue;
    for (const entry of entries) {
      addInvalid(entry.candidate, new CampaignError(
        1,
        'CAMPAIGN_PLAN_ID_DUPLICATE',
        `duplicate campaign plan ID: ${entry.plan.id}`,
        entry.plan.id,
        entry.plan.relativePlanFile,
      ));
    }
  }

  const entryForReference = (entry, referencedId, relationship) => {
    const matches = plansById.get(referencedId) ?? [];
    if (matches.length !== 1 || invalidByPath.has(matches[0].plan.relativePlanFile)) {
      addInvalid(entry.candidate, new CampaignError(
        1,
        matches.length > 1 ? `CAMPAIGN_${relationship}_AMBIGUOUS` : `CAMPAIGN_${relationship}_MISSING`,
        `${relationship.toLowerCase()} plan is not uniquely valid: ${referencedId}`,
        entry.plan.id,
        entry.plan.relativePlanFile,
      ));
      return null;
    }
    return matches[0];
  };
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    if (entry.plan.parentPlanId !== null) {
      const parent = entryForReference(entry, entry.plan.parentPlanId, 'PARENT');
      if (parent) {
        try {
          validateParentLink(entry.plan, parent.plan);
        } catch (error) {
          addInvalid(entry.candidate, error);
        }
      }
    }
    for (const dependencyId of entry.plan.dependsOn) entryForReference(entry, dependencyId, 'DEPENDENCY');
  }

  function detectCycles(edgeName, code) {
    const visited = new Set();
    const visiting = [];
    const visit = (entry) => {
      if (visited.has(entry.plan.relativePlanFile) || invalidByPath.has(entry.plan.relativePlanFile)) return;
      const index = visiting.findIndex((item) => item.plan.relativePlanFile === entry.plan.relativePlanFile);
      if (index !== -1) {
        for (const member of visiting.slice(index)) {
          addInvalid(member.candidate, new CampaignError(1, code, `${edgeName} cycle reaches ${entry.plan.id}`, member.plan.id, member.plan.relativePlanFile));
        }
        return;
      }
      visiting.push(entry);
      const ids = edgeName === 'parent' ? [entry.plan.parentPlanId].filter(Boolean) : entry.plan.dependsOn;
      for (const id of ids) {
        const matches = plansById.get(id) ?? [];
        if (matches.length === 1) visit(matches[0]);
      }
      visiting.pop();
      visited.add(entry.plan.relativePlanFile);
    };
    for (const entry of parsedPlans) visit(entry);
  }
  detectCycles('parent', 'CAMPAIGN_PARENT_CYCLE');
  detectCycles('dependency', 'CAMPAIGN_DEPENDENCY_CYCLE');

  const rootFor = (entry) => {
    let current = entry;
    const seen = new Set();
    while (current.plan.parentPlanId !== null) {
      if (seen.has(current.plan.relativePlanFile)) return null;
      seen.add(current.plan.relativePlanFile);
      const matches = plansById.get(current.plan.parentPlanId) ?? [];
      if (matches.length !== 1 || invalidByPath.has(matches[0].plan.relativePlanFile)) return null;
      current = matches[0];
    }
    return current;
  };
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    const root = rootFor(entry);
    if (!root) continue;
    for (const dependencyId of entry.plan.dependsOn) {
      const dependency = (plansById.get(dependencyId) ?? [])[0];
      const dependencyRoot = dependency && rootFor(dependency);
      if (dependencyRoot && dependencyRoot.plan.id !== root.plan.id) {
        addInvalid(entry.candidate, new CampaignError(1, 'CAMPAIGN_DEPENDENCY_CAMPAIGN', `dependency ${dependencyId} belongs to campaign ${dependencyRoot.plan.id}`, entry.plan.id, entry.plan.relativePlanFile));
      }
    }
  }

  const validEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
  const campaignEntries = new Map();
  for (const entry of validEntries) {
    const root = rootFor(entry);
    if (!root) continue;
    const members = campaignEntries.get(root.plan.id) ?? [];
    members.push(entry);
    campaignEntries.set(root.plan.id, members);
  }
  for (const members of campaignEntries.values()) {
    const root = rootFor(members[0]);
    if (root.plan.lifecycle !== config.lifecycle.roles.successfulCompletion || members.length === 1) continue;
    for (const member of members) {
      if (member.plan.lifecycle !== config.lifecycle.roles.successfulCompletion) {
        addInvalid(root.candidate, new CampaignError(1, 'CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${member.plan.id}`, root.plan.id, root.plan.relativePlanFile));
        break;
      }
    }
  }
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    if (!rootFor(entry)) {
      addInvalid(entry.candidate, new CampaignError(1, 'CAMPAIGN_PARENT_INVALID', 'campaign root cannot be resolved through valid parent records', entry.plan.id, entry.plan.relativePlanFile));
    }
  }

  const finalEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
  const finalCampaignEntries = new Map();
  for (const entry of finalEntries) {
    const root = rootFor(entry);
    if (!root || invalidByPath.has(root.plan.relativePlanFile)) continue;
    const members = finalCampaignEntries.get(root.plan.id) ?? [];
    members.push(entry);
    finalCampaignEntries.set(root.plan.id, members);
  }
  const campaigns = [...finalCampaignEntries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([rootPlanId, entries]) => ({
    rootPlanId,
    planIds: entries.map((entry) => entry.plan.id).sort(),
  }));
  const plans = finalEntries.map(({ plan }) => {
    const root = rootFor({ plan });
    return {
      id: plan.id,
      rootPlanId: root.plan.id,
      parentPlanId: plan.parentPlanId,
      dependsOn: [...plan.dependsOn],
      lifecycle: plan.lifecycle,
      path: plan.relativePlanFile,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  const activeCampaigns = campaigns.flatMap((campaign) => {
    const activePlanIds = plans.filter((plan) => plan.rootPlanId === campaign.rootPlanId && plan.lifecycle === config.lifecycle.roles.activeWork).map((plan) => plan.id);
    return activePlanIds.length === 0 ? [] : [{ rootPlanId: campaign.rootPlanId, activePlanIds }];
  });
  if (activeCampaigns.length > 1) {
    diagnostics.push({
      code: 'CAMPAIGN_ACTIVE_AMBIGUOUS',
      message: `multiple campaigns contain active plans: ${activeCampaigns.map((campaign) => campaign.rootPlanId).join(', ')}`,
      recordId: null,
      path: null,
    });
  }
  const invalidPlans = [...invalidByPath.values()].sort((left, right) => left.path.localeCompare(right.path));
  for (const plan of invalidPlans) plan.diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
  const inventory = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    valid: invalidPlans.length === 0 && diagnostics.length === 0,
    invocation: { command },
    repository: repositoryIdentity(canonicalRepositoryRoot),
    activeCampaigns,
    campaigns,
    plans,
    invalidPlans,
    unmanagedPlans: unmanagedPlans.sort((left, right) => left.path.localeCompare(right.path)),
    diagnostics,
  };
  return readCampaignReportV2(inventory);
}

function readCampaignReportV2(value) {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'activeCampaigns', 'campaigns', 'plans', 'invalidPlans', 'unmanagedPlans', 'diagnostics'], 'campaign inventory');
  if (value.schemaVersion !== INVENTORY_SCHEMA_VERSION || typeof value.valid !== 'boolean') dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid V2 campaign inventory envelope');
  exactKeys(value.invocation, ['command'], 'campaign inventory invocation');
  exactKeys(value.repository, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], 'campaign inventory repository');
  if (!['report', 'validate'].includes(value.invocation.command)
    || ![value.activeCampaigns, value.campaigns, value.plans, value.invalidPlans, value.unmanagedPlans, value.diagnostics].every(Array.isArray)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign inventory contains invalid values');
  }
  for (const record of value.activeCampaigns) exactKeys(record, ['rootPlanId', 'activePlanIds'], 'active campaign');
  for (const record of value.campaigns) exactKeys(record, ['rootPlanId', 'planIds'], 'campaign');
  for (const record of value.plans) exactKeys(record, ['id', 'rootPlanId', 'parentPlanId', 'dependsOn', 'lifecycle', 'path'], 'campaign inventory plan');
  for (const record of value.invalidPlans) {
    exactKeys(record, ['id', 'lifecycle', 'path', 'diagnostics'], 'invalid campaign plan');
    if (!Array.isArray(record.diagnostics)) dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid plan diagnostics must be an array');
    for (const item of record.diagnostics) exactKeys(item, ['code', 'message', 'recordId', 'path'], 'campaign diagnostic');
  }
  for (const record of value.unmanagedPlans) exactKeys(record, ['path'], 'unmanaged campaign plan');
  for (const record of value.diagnostics) exactKeys(record, ['code', 'message', 'recordId', 'path'], 'campaign diagnostic');
  return value;
}

CampaignReportReaders = Object.freeze({ V1: readCampaignReportV1, V2: readCampaignReportV2 });

function percentage(value) {
  return value === null ? 'unavailable (no tasklets)' : `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function taskletCountRow(label, taskletCounts) {
  const total = taskletCounts.DONE + taskletCounts.PENDING + taskletCounts.ERROR;
  return [label, taskletCounts.DONE, taskletCounts.PENDING, taskletCounts.ERROR, total];
}

function formatTable(rows) {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => String(row[column]).length)));
  return rows.map((row) => row.map((value, column) => {
    const text = String(value);
    return typeof value === 'number' ? text.padStart(widths[column]) : text.padEnd(widths[column]);
  }).join('  ').trimEnd()).join('\n');
}

// Traceability: implements REQ-CAMPAIGN-CENSUS-CLI
function humanReport(report, worktree, tableOptions = {}) {
  const summaryTable = tableOptions.summaryTable ?? true;
  const planTable = tableOptions.planTable ?? false;
  const sprintTable = tableOptions.sprintTable ?? false;
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
  const taskletRows = [['Plan lifecycle', 'DONE', 'PENDING', 'ERROR', 'Total']];
  for (const [lifecycle, taskletCounts] of Object.entries(taskletsByPlanLifecycle)) {
    taskletRows.push(taskletCountRow(lifecycle, taskletCounts));
  }
  taskletRows.push(taskletCountRow('Campaign total', report.totals.taskletsByStatus));
  const planRows = [['Lifecycle', 'Plan', 'DONE', 'PENDING', 'ERROR', 'Total']];
  for (const plan of report.campaign.plans) {
    planRows.push([plan.lifecycle, plan.id, plan.taskletCounts.DONE, plan.taskletCounts.PENDING, plan.taskletCounts.ERROR, plan.totalTasklets]);
  }
  const lines = [
    `Campaign: ${report.campaign.rootPlanId}`,
    `Worktree: ${worktree}`,
    `Revision: ${report.repository.commit} (${report.repository.branch ?? 'detached'}, ${report.repository.clean ? 'clean' : 'dirty'})`,
    `Plans: ${report.totals.plans}; Sprints: ${report.totals.sprints} (${report.totals.incompleteSprints} incomplete)`,
  ];
  if (summaryTable) {
    lines.push(
      '',
      'Tasklet census',
      formatTable(taskletRows),
      `Campaign completion: ${percentage(report.totals.taskletCompletionPercentage)} by tasklet count`,
      'PENDING and ERROR are distinct formal tasklet states.',
    );
  }
  if (planTable) lines.push('', 'Plan census', formatTable(planRows));
  if (sprintTable) {
    lines.push('', 'Incomplete sprint census');
    if (incompleteSprints.length === 0) {
      lines.push('None');
    } else {
      const sprintRows = [['Plan/Sprint', 'Planning', 'Execution', 'DONE', 'PENDING', 'ERROR', 'Total']];
      for (const sprint of incompleteSprints) {
        sprintRows.push([`${sprint.planId}/${sprint.id}`, sprint.planningStatus, sprint.executionStatus ?? 'UNPLANNED', sprint.taskletCounts.DONE, sprint.taskletCounts.PENDING, sprint.taskletCounts.ERROR, sprint.totalTasklets]);
      }
      lines.push(formatTable(sprintRows));
    }
  }
  return `${lines.join('\n')}\n`;
}

function humanInventory(inventory, worktree) {
  const activeCampaigns = inventory.activeCampaigns.length === 0
    ? 'none'
    : inventory.activeCampaigns.map((campaign) => `${campaign.rootPlanId} (${campaign.activePlanIds.join(', ')})`).join('; ');
  const lines = [
    `Repository campaign inventory: ${inventory.valid ? 'valid' : 'invalid'}`,
    `Worktree: ${worktree}`,
    `Active campaigns: ${activeCampaigns}`,
    `Campaigns: ${inventory.campaigns.length}; managed plans: ${inventory.plans.length}; invalid plans: ${inventory.invalidPlans.length}; unmanaged legacy plans: ${inventory.unmanagedPlans.length}`,
  ];
  for (const plan of inventory.invalidPlans) {
    for (const item of plan.diagnostics) lines.push(`error ${item.code} ${plan.path}: ${item.message}`);
  }
  for (const item of inventory.diagnostics) lines.push(`error ${item.code}: ${item.message}`);
  if (inventory.unmanagedPlans.length > 0) {
    lines.push('Unmanaged legacy plans:', ...inventory.unmanagedPlans.map((plan) => `- ${plan.path}`));
  }
  return `${lines.join('\n')}\n`;
}

function repositoryRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) toolError('CAMPAIGN_REPOSITORY', 'current directory is not in a Git worktree');
  return fs.realpathSync(result.stdout.trim());
}

function usage() {
  return 'usage: ponytail campaign validate <plan-name-or-path>\n       ponytail campaign validate --all [--json]\n       ponytail campaign report [<plan-name-or-path>] [--json] [--[no-]summary-table] [--[no-]plan-table] [--[no-]sprint-table]\n       ponytail campaign status [<campaign>] [--json]\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign action-result <action-id> --result <json>';
}

function run(argv = process.argv.slice(2)) {
  const operation = argv[0];
  if (['status', 'advance', 'action-result'].includes(operation)) {
    return require('./campaign-orchestration').run(argv);
  }
  let input;
  let json = false;
  let all = false;
  let tableFlagSeen = false;
  const tableOptions = {};
  if (operation === 'validate') {
    for (const argument of argv.slice(1)) {
      if (argument === '--all' && !all && input === undefined) all = true;
      else if (argument === '--json' && !json && input === undefined) json = true;
      else if (argument.startsWith('-') || input !== undefined || all || json) toolError('CAMPAIGN_USAGE', usage());
      else input = argument;
    }
    if ((!all && input === undefined) || (json && !all)) toolError('CAMPAIGN_USAGE', usage());
  } else if (operation === 'report') {
    for (const argument of argv.slice(1)) {
      if (argument === '--json') {
        json = true;
      } else if (REPORT_TABLE_FLAGS[argument]) {
        const [name, enabled] = REPORT_TABLE_FLAGS[argument];
        tableOptions[name] = enabled;
        tableFlagSeen = true;
      } else if (argument.startsWith('-') || input !== undefined) {
        toolError('CAMPAIGN_USAGE', usage());
      } else {
        input = argument;
      }
    }
    if (json && tableFlagSeen) toolError('CAMPAIGN_USAGE', 'table options cannot be combined with --json');
  } else {
    toolError('CAMPAIGN_USAGE', usage());
  }
  const root = repositoryRoot();
  const config = readManagementConfig(root);
  if (all || (operation === 'report' && input === undefined)) {
    const inventory = buildRepositoryInventory(root, config, operation);
    if (json) process.stdout.write(`${JSON.stringify(inventory)}\n`);
    else process.stdout.write(humanInventory(inventory, root));
    if (!inventory.valid) process.exitCode = 1;
    return inventory;
  }
  const report = buildReport(root, config, input);
  if (operation === 'validate') {
    process.stdout.write(`valid: ${report.campaign.rootPlanId} (${report.totals.plans} plans, ${report.totals.sprints} sprints, ${report.totals.tasklets} tasklets)\n`);
  } else if (json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(humanReport(report, root, tableOptions));
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
  buildRepositoryInventory,
  buildReport,
  diagnostic,
  discoverCampaign,
  campaignGraph,
  humanReport,
  humanInventory,
  linkedPlanFiles,
  listPlanSourceFiles,
  metadataBlocks,
  parsePlanSource,
  readManagementConfigV1,
  readPlanMetadataV1,
  readPlanMetadataV2,
  readCampaignReportV1,
  readCampaignReportV2,
  readManagementConfig,
  resolveCampaignRoot,
  resolveCampaignScope,
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
