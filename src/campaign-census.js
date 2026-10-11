#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CampaignError, dataError, toolError, exactKeys, CampaignManagementConfigReaders,
  readManagementConfigV1, readManagementConfig } = require('./campaign-configuration');
const { PLAN_METADATA_MARKER, CampaignPlanMetadataReaders, metadataBlocks,
  readPlanMetadataV1, readPlanMetadataV2, readManagedPlan, parsePlanSource } = require('./campaign-plan-metadata');
const { scanPlanCandidates, listPlanSourceFiles, linkedPlanFiles } = require('./campaign-plan-sources');
const { validatePlanContents } = require('./campaign-plan-contents');
const { campaignGraph } = require('./campaign-graph');
const { buildReport, readCampaignReportV1, repositoryIdentity } = require('./campaign-report');
const { discoverCampaign, resolveCampaignRoot, resolveCampaignScope, validateCampaignReference } = require('./campaign-scope');

const INVENTORY_SCHEMA_VERSION = 3;
const CAMPAIGN_STATUSES = ['active', 'pending', 'closed', 'deferred', 'rejected'];
const REPORT_TABLE_FLAGS = Object.freeze({
  '--summary-table': ['summaryTable', true],
  '--no-summary-table': ['summaryTable', false],
  '--plan-table': ['planTable', true],
  '--no-plan-table': ['planTable', false],
  '--sprint-table': ['sprintTable', true],
  '--no-sprint-table': ['sprintTable', false],
});

let CampaignReportReaders;

function campaignDiagnostic(error, fallbackPath = null) {
  return {
    code: error.code ?? 'CAMPAIGN_INTERNAL',
    message: error.message,
    recordId: error.recordId ?? null,
    path: error.relativePath ?? fallbackPath,
  };
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
function buildRepositoryInventory(repositoryRoot, config, command = 'report') {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const candidates = scanPlanCandidates(canonicalRepositoryRoot, config);
  const unmanagedCandidates = [];
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
    if (candidate.blocks.length === 0) {
      unmanagedCandidates.push(candidate);
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
  const unmanagedById = new Map();
  for (const candidate of unmanagedCandidates) {
    const id = path.basename(path.dirname(candidate.planFile));
    const matches = unmanagedById.get(id) ?? [];
    matches.push(candidate);
    unmanagedById.set(id, matches);
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
    if (matches.length === 0) {
      for (const candidate of unmanagedById.get(referencedId) ?? []) {
        addInvalid(candidate, new CampaignError(
          1,
          'CAMPAIGN_PLAN_BLOCK',
          `${candidate.relativePlanFile} requires ${PLAN_METADATA_MARKER} metadata because managed plan ${entry.plan.id} references it`,
          referencedId,
          candidate.relativePlanFile,
        ));
      }
    }
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
          validateCampaignReference(entry.plan, parent.plan);
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
  const invalidPlans = [...invalidByPath.values()].sort((left, right) => left.path.localeCompare(right.path));
  for (const plan of invalidPlans) plan.diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
  const unmanagedPlans = unmanagedCandidates
    .filter((candidate) => !invalidByPath.has(candidate.relativePlanFile))
    .map((candidate) => ({ path: candidate.relativePlanFile }));
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
  return readCampaignReportV3(inventory);
}

function readCampaignReportV2(value) {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'activeCampaigns', 'campaigns', 'plans', 'invalidPlans', 'unmanagedPlans', 'diagnostics'], 'campaign inventory');
  if (value.schemaVersion !== 2 || typeof value.valid !== 'boolean') dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid V2 campaign inventory envelope');
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

function readCampaignReportV3(value) {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'activeCampaigns', 'campaigns', 'plans', 'invalidPlans', 'unmanagedPlans', 'diagnostics'], 'campaign inventory');
  if (value.schemaVersion !== INVENTORY_SCHEMA_VERSION || typeof value.valid !== 'boolean') dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid V3 campaign inventory envelope');
  exactKeys(value.invocation, ['command'], 'campaign inventory invocation');
  exactKeys(value.repository, ['root', 'worktree', 'commit', 'branch', 'detached', 'clean'], 'campaign inventory repository');
  if (!['list', 'report', 'validate'].includes(value.invocation.command)
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

CampaignReportReaders = Object.freeze({ V1: readCampaignReportV1, V2: readCampaignReportV2, V3: readCampaignReportV3 });

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

function campaignStatus(inventory, config, campaign) {
  if (inventory.activeCampaigns.some(({ rootPlanId }) => rootPlanId === campaign.rootPlanId)) return 'active';
  const root = inventory.plans.find(({ id }) => id === campaign.rootPlanId);
  const statuses = {
    [config.lifecycle.roles.initial]: 'pending',
    [config.lifecycle.roles.successfulCompletion]: 'closed',
    [config.lifecycle.roles.deferred]: 'deferred',
    [config.lifecycle.roles.rejected]: 'rejected',
  };
  return statuses[root.lifecycle];
}

function listCampaigns(repositoryRoot, config, status = 'active') {
  const inventory = buildRepositoryInventory(repositoryRoot, config, 'list');
  if (!inventory.valid) dataError('CAMPAIGN_INVENTORY_INVALID', 'repository campaign inventory is invalid');
  return inventory.campaigns
    .map((campaign) => ({ rootPlanId: campaign.rootPlanId, status: campaignStatus(inventory, config, campaign) }))
    .filter((campaign) => campaign.status === status);
}

function markdownFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...markdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files;
}

function pathWithin(filePath, directory) {
  const relative = path.relative(directory, filePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function movedPath(filePath, sourceDirectory, destinationDirectory) {
  return pathWithin(filePath, sourceDirectory)
    ? path.join(destinationDirectory, path.relative(sourceDirectory, filePath))
    : filePath;
}

function rewriteMovedLinks(text, sourceFile, destinationFile, sourceDirectory, destinationDirectory) {
  return text.replace(/\]\(([^)]+)\)/g, (match, destination) => {
    if (!destination || destination.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(destination) || path.isAbsolute(destination)) return match;
    const suffixIndex = destination.search(/[?#]/);
    const linkPath = suffixIndex === -1 ? destination : destination.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex);
    const target = path.resolve(path.dirname(sourceFile), linkPath);
    const movedTarget = movedPath(target, sourceDirectory, destinationDirectory);
    if (sourceFile === destinationFile && target === movedTarget) return match;
    let relative = path.relative(path.dirname(destinationFile), movedTarget).split(path.sep).join('/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `](${relative}${suffix})`;
  });
}

function activateCampaign(repositoryRoot, config, input) {
  const graph = campaignGraph(repositoryRoot, input);
  const rootPlan = graph.plans.find(({ id }) => id === graph.campaignId);
  const status = graph.plans.some(({ lifecycle }) => lifecycle === config.lifecycle.roles.activeWork)
    ? 'active'
    : ({
      [config.lifecycle.roles.initial]: 'pending',
      [config.lifecycle.roles.successfulCompletion]: 'closed',
      [config.lifecycle.roles.deferred]: 'deferred',
      [config.lifecycle.roles.rejected]: 'rejected',
    })[rootPlan.lifecycle];
  if (status === 'active') return { rootPlanId: graph.campaignId, activated: false };
  if (status !== 'pending') {
    dataError('CAMPAIGN_ACTIVATE_STATUS', `campaign ${graph.campaignId} is ${status}; only pending campaigns can be activated`, graph.campaignId, rootPlan.path);
  }

  const rootPlanFile = path.join(repositoryRoot, rootPlan.path);
  const sourceDirectory = path.dirname(rootPlanFile);
  const destinationDirectory = path.join(repositoryRoot, config.planRoot, config.lifecycle.roles.activeWork, graph.campaignId);
  if (fs.existsSync(destinationDirectory)) toolError('CAMPAIGN_ACTIVATE_DESTINATION', `campaign activation destination already exists: ${path.relative(repositoryRoot, destinationDirectory)}`);
  const files = markdownFiles(path.join(repositoryRoot, config.managementRoot));
  const changes = files.map((sourceFile) => {
    const destinationFile = movedPath(sourceFile, sourceDirectory, destinationDirectory);
    let text = fs.readFileSync(sourceFile, 'utf8');
    if (sourceFile === rootPlanFile) {
      const statusPattern = /^- \*\*Status:\*\* `[^`]+`$/gm;
      const matches = [...text.matchAll(statusPattern)];
      if (matches.length !== 1) dataError('CAMPAIGN_PLAN_STATUS', 'campaign root must contain exactly one canonical status field', graph.campaignId, rootPlan.path);
      text = text.replace(statusPattern, `- **Status:** \`${config.lifecycle.roles.activeWork}\``);
    }
    return {
      sourceFile,
      destinationFile,
      original: fs.readFileSync(sourceFile, 'utf8'),
      text: rewriteMovedLinks(text, sourceFile, destinationFile, sourceDirectory, destinationDirectory),
    };
  });

  fs.mkdirSync(path.dirname(destinationDirectory), { recursive: true });
  fs.renameSync(sourceDirectory, destinationDirectory);
  try {
    for (const change of changes) fs.writeFileSync(change.destinationFile, change.text);
    buildReport(repositoryRoot, config, graph.campaignId);
  } catch (error) {
    fs.renameSync(destinationDirectory, sourceDirectory);
    for (const change of changes) fs.writeFileSync(change.sourceFile, change.original);
    throw error;
  }
  return { rootPlanId: graph.campaignId, activated: true };
}

function repositoryRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) toolError('CAMPAIGN_REPOSITORY', 'current directory is not in a Git worktree');
  return fs.realpathSync(result.stdout.trim());
}

function usage() {
  return 'usage: ponytail campaign validate <plan-name-or-path>\n       ponytail campaign validate --all [--json]\n       ponytail campaign report [<plan-name-or-path>] [--json] [--[no-]summary-table] [--[no-]plan-table] [--[no-]sprint-table]\n       ponytail campaign list [--active|--pending|--closed|--deferred|--rejected]\n       ponytail campaign activate <plan-name-or-path>\n       ponytail campaign status [<campaign>] [--json]\n       ponytail campaign reservation-audit [<campaign>] [--json]\n       ponytail campaign runnable-plans [<campaign>] [--json]\n       ponytail campaign tasklet-prerequisites [<campaign>] [--json]\n       ponytail campaign schedule-ready [<campaign>] [--json]\n       ponytail campaign schedule-review-ready [<campaign>] [--json]\n       ponytail campaign schedule-planning-ready [<campaign>] [--json]\n       ponytail campaign ready-actions [<campaign>] [--json]\n       ponytail campaign report-blocker <campaign> --result <json>\n       ponytail campaign observe <campaign> --snapshot <json>\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign reconcile <campaign> [--json]\n       ponytail campaign retry-dispatch <campaign> <original-action-id> --authorization <non-secret-reference> [--json]\n       ponytail campaign action-result <campaign> <action-id> --result <json>\n       ponytail campaign retire-worktree <campaign> <action-id> [--json]\n       ponytail campaign attach <token>\n       ponytail campaign deliver <campaign> --result <json>';
}

function run(argv = process.argv.slice(2)) {
  const operation = argv[0];
  if (operation?.startsWith('obligation-') || ['status', 'reservation-audit', 'runnable-plans', 'tasklet-prerequisites', 'schedule-ready', 'schedule-review-ready', 'schedule-planning-ready', 'ready-actions', 'observe', 'advance', 'reconcile', 'retire-worktree', 'retry-dispatch', 'action-result', 'report-blocker', 'attach', 'deliver'].includes(operation)) {
    return require('./campaign-orchestration').run(argv);
  }
  let input;
  let json = false;
  let all = false;
  let tableFlagSeen = false;
  const tableOptions = {};
  let campaignListStatus = 'active';
  if (operation === 'list') {
    if (argv.length > 2) toolError('CAMPAIGN_USAGE', usage());
    if (argv.length === 2) {
      if (!argv[1].startsWith('--') || !CAMPAIGN_STATUSES.includes(argv[1].slice(2))) toolError('CAMPAIGN_USAGE', usage());
      campaignListStatus = argv[1].slice(2);
    }
  } else if (operation === 'activate') {
    if (argv.length !== 2 || argv[1].startsWith('-')) toolError('CAMPAIGN_USAGE', usage());
    input = argv[1];
  } else if (operation === 'validate') {
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
  const resolution = require('./campaign-orchestration').resolveInvocationWorktree(root, process.env, operation !== 'activate');
  if (resolution.workerBinding) {
    toolError('CAMPAIGN_WORKER_READ_SCOPE', `campaign ${operation} must run in owning worktree ${resolution.effectiveWorktree}; use campaign status for an authenticated re-rooted worker view`);
  }
  const config = readManagementConfig(root);
  if (operation === 'list') {
    const campaigns = listCampaigns(root, config, campaignListStatus);
    if (campaigns.length > 0) process.stdout.write(`${campaigns.map(({ rootPlanId }) => rootPlanId).join('\n')}\n`);
    return campaigns;
  }
  if (operation === 'activate') {
    const result = activateCampaign(root, config, input);
    process.stdout.write(result.activated ? `Activated campaign ${result.rootPlanId}\n` : `Campaign ${result.rootPlanId} is already active\n`);
    return result;
  }
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
  activateCampaign,
  buildRepositoryInventory,
  buildReport,
  diagnostic,
  discoverCampaign,
  campaignGraph,
  humanReport,
  humanInventory,
  listCampaigns,
  linkedPlanFiles,
  listPlanSourceFiles,
  metadataBlocks,
  parsePlanSource,
  readManagementConfigV1,
  readPlanMetadataV1,
  readPlanMetadataV2,
  readCampaignReportV1,
  readCampaignReportV2,
  readCampaignReportV3,
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
    process.exitCode = Number.isInteger(error.status) ? error.status : 2;
  }
}
