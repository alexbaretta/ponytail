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
const { activateCampaign } = require('./campaign-activation');
const { parseCampaignInvocation } = require('./campaign-invocation');
const { buildReport, readCampaignReportV1, humanReport } = require('./campaign-report');
const { listCampaigns, humanInventory, buildRepositoryInventory, campaignDiagnostic, readCampaignReportV2, readCampaignReportV3, CampaignReportReaders } = require('./campaign-inventory');
const { discoverCampaign, resolveCampaignRoot, resolveCampaignScope } = require('./campaign-scope');

function repositoryRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) toolError('CAMPAIGN_REPOSITORY', 'current directory is not in a Git worktree');
  return fs.realpathSync(result.stdout.trim());
}


function run(argv = process.argv.slice(2)) {
  const operation = argv[0];
  if (operation?.startsWith('obligation-') || ['status', 'reservation-audit', 'runnable-plans', 'tasklet-prerequisites', 'schedule-ready', 'schedule-review-ready', 'schedule-planning-ready', 'ready-actions', 'observe', 'advance', 'reconcile', 'retire-worktree', 'retry-dispatch', 'action-result', 'report-blocker', 'attach', 'deliver'].includes(operation)) {
    return require('./campaign-orchestration').run(argv);
  }
  const campaignInvocation = parseCampaignInvocation(argv);
  const input = campaignInvocation.operation === 'activate' || campaignInvocation.operation === 'report'
    ? campaignInvocation.input : campaignInvocation.operation === 'validate' && campaignInvocation.selection.mode === 'plan'
      ? campaignInvocation.selection.input : undefined;
  const json = campaignInvocation.operation === 'report' ? campaignInvocation.json
    : campaignInvocation.operation === 'validate' && campaignInvocation.selection.mode === 'all' && campaignInvocation.selection.json;
  const all = campaignInvocation.operation === 'validate' && campaignInvocation.selection.mode === 'all';
  const tableOptions = campaignInvocation.operation === 'report' ? campaignInvocation.campaignReportTableOptions : {};
  const root = repositoryRoot();
  const resolution = require('./campaign-orchestration').resolveInvocationWorktree(root, process.env, operation !== 'activate');
  if (resolution.workerBinding) {
    toolError('CAMPAIGN_WORKER_READ_SCOPE', `campaign ${operation} must run in owning worktree ${resolution.effectiveWorktree}; use campaign status for an authenticated re-rooted worker view`);
  }
  const config = readManagementConfig(root);
  if (operation === 'list') {
    const campaigns = listCampaigns(root, config, campaignInvocation.campaignStatus);
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
