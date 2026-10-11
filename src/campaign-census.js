#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CampaignError, dataError, toolError, CampaignManagementConfigReaders,
  readManagementConfigV1, readManagementConfig } = require('./campaign-configuration');
const { CampaignPlanMetadataReaders, metadataBlocks,
  readPlanMetadataV1, readPlanMetadataV2, parsePlanSource } = require('./campaign-plan-metadata');
const { listPlanSourceFiles, linkedPlanFiles } = require('./campaign-plan-sources');
const { campaignGraph } = require('./campaign-graph');
const { buildReport, readCampaignReportV1, humanReport } = require('./campaign-report');
const { humanInventory, buildRepositoryInventory, campaignDiagnostic, readCampaignReportV2, readCampaignReportV3, CampaignReportReaders } = require('./campaign-inventory');
const { discoverCampaign, resolveCampaignRoot, resolveCampaignScope } = require('./campaign-scope');

const CAMPAIGN_STATUSES = ['active', 'pending', 'closed', 'deferred', 'rejected'];
const REPORT_TABLE_FLAGS = Object.freeze({
  '--summary-table': ['summaryTable', true],
  '--no-summary-table': ['summaryTable', false],
  '--plan-table': ['planTable', true],
  '--no-plan-table': ['planTable', false],
  '--sprint-table': ['sprintTable', true],
  '--no-sprint-table': ['sprintTable', false],
});

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
