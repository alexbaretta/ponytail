#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const { resolveCampaignRoot } = require('./campaign-census');

const { PlanInputReaders, claim, complete, enqueue, entries, fail, queueRoot, readV1, readV2 } = require('./plan-input-queue');

function parseCli(argv) {
  if (argv.length === 0) fail('usage: ponytail plan-input <plan> -- <instruction> | coordinate <plan> | release <plan> | list <plan> [--json] | claim <plan> [--json] | complete <plan> <id> --record <pm-path>...');
  const command = argv[0];
  if (command === 'coordinate' || command === 'release') {
    if (argv.length !== 2) fail(`usage: ponytail plan-input ${command} <plan>`);
    return { command, plan: argv[1] };
  }
  if (command === 'list' || command === 'claim') {
    if (argv.length < 2 || argv.length > 3 || (argv[2] && argv[2] !== '--json')) fail(`usage: ponytail plan-input ${command} <plan> [--json]`);
    return { command, plan: argv[1], json: argv[2] === '--json' };
  }
  if (command === 'complete') {
    const plan = argv[1];
    const id = argv[2];
    const records = [];
    for (let index = 3; index < argv.length; index += 2) {
      if (argv[index] !== '--record' || !argv[index + 1]) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
      records.push(argv[index + 1]);
    }
    if (!plan || !id || records.length === 0) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
    return { command, plan, id, records };
  }
  const separator = argv.indexOf('--');
  if (separator !== 1 || argv.length < 3) fail('usage: ponytail plan-input <plan> -- <instruction>');
  return { command: 'enqueue', plan: argv[0], prompt: argv.slice(2).join(' ') };
}

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
