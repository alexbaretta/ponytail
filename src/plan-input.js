#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const { resolveCampaignRoot } = require('./campaign-census');
const { parseCli } = require('./plan-input-command');

const { PlanInputReaders, claim, complete, enqueue, entries, queueRoot, readV1, readV2 } = require('./plan-input-queue');

function main(argv = process.argv.slice(2), repositoryRoot = process.cwd()) {
  const request = parseCli(argv);
  const { campaignId, submittedPlanId } = resolveCampaignRoot(repositoryRoot, request.plan);
  if (request.command === 'enqueue') {
    const entry = enqueue(repositoryRoot, campaignId, submittedPlanId, request.prompt, 'cli');
    console.log(`Recorded as plan input ${entry.id} for campaign ${campaignId}`);
    return 0;
  }
  if (request.command === 'list') {
    const result = entries(repositoryRoot, campaignId).filter((entry) => entry.status !== 'closed');
    console.log(request.json ? JSON.stringify(result) : result.map((entry) => `${entry.status}\t${entry.id}\t${entry.prompt}`).join('\n'));
    return 0;
  }
  if (request.command === 'claim') {
    const entry = claim(repositoryRoot, campaignId);
    console.log(request.json ? JSON.stringify(entry) : entry ? `${entry.id}\t${entry.prompt}` : 'No pending plan input');
    return 0;
  }
  if (request.command === 'coordinate') {
    console.log(`Validated coordinator campaign ${campaignId}`);
    return 0;
  }
  if (request.command === 'release') {
    console.log(`Validated release for campaign ${campaignId}`);
    return 0;
  }
  const entry = complete(repositoryRoot, campaignId, request.id, request.records);
  console.log(`Completed plan input ${entry.id}`);
  return 0;
}

module.exports = { PlanInputReaders, claim, complete, enqueue, entries, main, parseCli, queueRoot, readV1, readV2 };

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
}
