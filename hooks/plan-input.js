#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Traceability: implements REQ-PLAN-INPUT-QUEUE

const fs = require('node:fs');
const path = require('node:path');
const { enqueue, entries } = require('../src/plan-input');

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

function pending(repository) {
  return entries(repository).filter((entry) => entry.status !== 'closed');
}

function isQueueTool(data) {
  return JSON.stringify(data.tool_input || {}).includes('plan-input');
}

function finish() {
  if (done) return;
  done = true;
  try {
    const data = JSON.parse(input.replace(/^\uFEFF/, ''));
    const repository = repositoryRoot(data.cwd || process.cwd());
    if (data.hook_event_name === 'UserPromptSubmit') {
      const match = /^\/ponytail-enqueue\s+([\s\S]+)$/.exec(data.prompt || '');
      if (!match) return;
      const entry = enqueue(repository, match[1], 'codex-composer', {
        sessionId: data.session_id,
        turnId: data.turn_id,
      });
      write({ decision: 'block', reason: `Recorded as plan input ${entry.id}.` });
      return;
    }
    const queued = pending(repository);
    if (queued.length === 0) return;
    const inProgress = queued.find((entry) => entry.status === 'in_progress');
    if (data.hook_event_name === 'PreToolUse') {
      if (inProgress || isQueueTool(data)) return;
      write({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Plan input ${queued[0].id} is pending. Run ponytail plan-input claim --json and ingest it completely before resuming plan work.`,
        },
      });
      return;
    }
    if (data.hook_event_name === 'Stop') {
      const entry = inProgress || queued[0];
      write({
        decision: 'block',
        reason: inProgress
          ? `Finish ingesting plan input ${entry.id}, acknowledge it with its PM record paths, then drain older open inputs before resuming the plan.`
          : `Claim and completely ingest plan input ${entry.id} before resuming the plan.`,
      });
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
