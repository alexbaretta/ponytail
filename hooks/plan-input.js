#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const fs = require('node:fs');
const path = require('node:path');
const { resolveCampaignRoot } = require('../src/campaign-census');
const { enqueue } = require('../src/plan-input');

let input = '';
let done = false;

function repositoryRoot(cwd) {
  let current = path.resolve(cwd);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    current = path.dirname(current);
  }
  throw new Error('plan input requires a Git worktree');
}

function write(value) {
  process.stdout.write(JSON.stringify(value));
}

function finish() {
  if (done) return;
  done = true;
  try {
    const data = JSON.parse(input.replace(/^\uFEFF/, ''));
    const repository = repositoryRoot(data.cwd || process.cwd());
    if (data.hook_event_name === 'UserPromptSubmit') {
      const match = /^\/ponytail-enqueue\s+(\S+)\s+--\s+([\s\S]+)$/.exec(data.prompt || '');
      if (!match) return;
      const { campaignId, submittedPlanId } = resolveCampaignRoot(repository, match[1]);
      const entry = enqueue(repository, campaignId, submittedPlanId, match[2], 'codex-composer', {
        sessionId: data.session_id,
        turnId: data.turn_id,
      });
      write({ decision: 'block', reason: `Recorded as plan input ${entry.id} for campaign ${campaignId}.` });
    }
  } catch (error) {
    process.stderr.write(`plan-input hook: ${error.message}\n`);
    process.exitCode = 1;
  }
}

process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(); }, 1000).unref();
