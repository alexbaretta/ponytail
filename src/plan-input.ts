#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

import { resolveCampaignRoot, type CampaignRoot } from './campaign-scope.js';
import { parseCli, type PlanInputCommand } from './plan-input-command.js';
export { parseCli } from './plan-input-command.js';

import { claim, complete, enqueue, entries, type PlanInputV2 } from './plan-input-queue.js';
export { PlanInputReaders, claim, complete, enqueue, entries, queueRoot, readV1, readV2 } from './plan-input-queue.js';

export function main(argv: readonly string[] = process.argv.slice(2), repositoryRoot = process.cwd()): 0 {
  const planInputCommand: PlanInputCommand = parseCli(argv);
  const campaignRoot: CampaignRoot = resolveCampaignRoot(repositoryRoot, planInputCommand.plan);
  const { campaignId, submittedPlanId } = campaignRoot;
  switch (planInputCommand.command) {
  case 'enqueue': {
    const planInputV2: PlanInputV2 = enqueue(repositoryRoot, campaignId, submittedPlanId, planInputCommand.prompt, 'cli');
    console.log(`Recorded as plan input ${planInputV2.id} for campaign ${campaignId}`);
    return 0;
  }
  case 'list': {
    const result = entries(repositoryRoot, campaignId).filter((entry) => entry.status !== 'closed');
    console.log(planInputCommand.json ? JSON.stringify(result) : result.map((entry) => `${entry.status}\t${entry.id}\t${entry.prompt}`).join('\n'));
    return 0;
  }
  case 'claim': {
    const planInputV2: PlanInputV2 | null = claim(repositoryRoot, campaignId);
    console.log(planInputCommand.json ? JSON.stringify(planInputV2) : planInputV2 ? `${planInputV2.id}\t${planInputV2.prompt}` : 'No pending plan input');
    return 0;
  }
  case 'coordinate': {
    console.log(`Validated coordinator campaign ${campaignId}`);
    return 0;
  }
  case 'release': {
    console.log(`Validated release for campaign ${campaignId}`);
    return 0;
  }
  case 'complete': {
  const planInputV2: PlanInputV2 = complete(repositoryRoot, campaignId, planInputCommand.id, planInputCommand.records);
  console.log(`Completed plan input ${planInputV2.id}`);
  return 0;
  }
  }
}

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
}
