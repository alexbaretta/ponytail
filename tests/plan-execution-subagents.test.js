#!/usr/bin/env node
// Copyright (c) Ponytail contributors.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'),
  'utf8',
);

const sprint = fs.readFileSync(
  path.join(__dirname, '..', 'pm', 'plans', '2026-08-19-parallel-sprint-orchestration', 'sprints', 'S01.md'),
  'utf8',
);

const sprintMetadata = JSON.parse(sprint.match(/<!-- ponytail-plan-sprint\s*\n([\s\S]*?)\n-->/)[1]);
const taskletGraph = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'pm', 'plans', '2026-08-19-parallel-sprint-orchestration', 'sprints', 'S01.tasklets.json'),
  'utf8',
));

test('parallel sprint policy preserves atomic, delegated orchestration boundaries', () => {
  assert.match(skill, /one type definition, class\s+envelope, method or function, controller endpoint[\s\S]*focused fixture, or validation gate/);
  assert.match(skill, /more than\s+1,000 new lines requires the orchestrator to split it or record why/);
  assert.match(skill, /exact files and declarations;[\s\S]*data structures, types, inputs, and outputs;[\s\S]*chosen algorithm and control flow;[\s\S]*invariants, boundary behavior, and actionable errors;[\s\S]*focused tests and expected observations;[\s\S]*generated or configuration synchronization;[\s\S]*explicit exclusions/);
  assert.match(skill, /planning states are `STUB`, `PLANNING`, `READY_FOR_REVIEW`, `APPROVED`, and\s+`ERROR`/i);
  assert.match(skill, /execution states are `PENDING`, `IN_PROGRESS`, `READY_FOR_REVIEW`,\s+`DONE`, and `ERROR`/i);
  assert.match(skill, /Planning dependencies decide which sprint\s+architectures may start; execution dependencies decide which implementations\s+may start/);
  assert.match(skill, /"schemaVersion": 1/);
  assert.match(skill, /sprint metadata and sibling tasklet JSON each declare `"schemaVersion":\s+1`\. Their selectors reject an unsupported schema version/);
  assert.match(skill, /creates intent-level sprint stubs/);
  assert.match(skill, /separate instances of the strongest available planning\s+model/);
  assert.match(skill, /read-only and edit only its\s+assigned sprint Markdown and sibling tasklet metadata/);
  assert.match(skill, /reconciles every completed planning wave before approval or\s+implementation dispatch/);
  assert.match(skill, /Every long-lived plan uses this orchestration lifecycle/);
  assert.match(skill, /Before any sprint\s+planning or implementation edit/);
  assert.match(skill, /selector output, rather than an agent's subjective\s+classification/);
  assert.match(skill, /MUST run it before planning dispatch, after each\s+planning reconciliation, before implementation dispatch/);
  assert.match(skill, /MUST run that sprint's tasklet selector to validate the sibling\s+tasklet graph/);
  assert.match(skill, /A `STUB` or dependency-blocked sprint need not yet have a\s+tasklet graph/);
  assert.match(skill, /one-to-one Markdown\/JSON tasklet ID set and an acyclic graph/);
  assert.match(skill, /high risk, greatest overlap.*unfinished descendants,\s+longest remaining dependency path, then lowest tasklet ID/s);
  assert.match(skill, /fully `\[DONE\]` graph returns exactly\s+`\{"next":null\}`; criterion values appear only when a tasklet is selected/);
  assert.match(skill, /Every sprint returned by the applicable readiness selector MUST be assigned to\s+a separate subagent, up to safe available runtime capacity/);
  assert.match(skill, /root remains\s+the orchestrator and MUST NOT implement a returned sprint while a safe\s+subagent slot is available/);
  assert.match(skill, /least expensive available\s+model reasonably expected to implement the frozen tasklets/);
  assert.match(skill, /may retain a ready sprint only when no safe subagent slot is\s+available, the host lacks an isolated execution capability required by the\s+sprint, available subagents lack a required capability, or delegation would\s+violate an explicit authorization or safety boundary/);
  assert.match(skill, /Convenience, prior partial implementation, small task size,\s+elapsed time, generic coordination cost, quality preference, or agent\s+preference are not valid exceptions/);
  assert.match(skill, /If planning or implementation begins without the required selector run or\s+dispatch decision, stop new implementation edits/);
  assert.doesNotMatch(skill, /For a parallelized plan/);
  assert.doesNotMatch(skill, /normally one subagent per sprint/);
  assert.match(skill, /edits only its declared implementation paths\s+and sprint file/);
  assert.match(skill, /does not stage or\s+commit/);
  assert.match(skill, /orchestrator alone owns the plan manifest, shared Git index,\s+cross-sprint reconciliation, selective commits, full validation, and final\s+acceptance/);
});

test('sandbox-blocked journaling requires explicit persistent-rule authorization', () => {
  assert.match(skill, /sandbox access blocks `project_journal\.sh`, especially its local\s+PostgreSQL Unix socket/);
  assert.match(skill, /user's literal explicit authorization\s+before adding a persistent allow `prefix_rule` for that exact\s+`project_journal\.sh` executable to `~\/\.codex\/rules\/default\.rules`/);
  assert.match(skill, /outside-project mutation and must not be inferred from plan approval/);
  assert.match(skill, /`project_journal\.sh run_command` is effectively\s+authorizing arbitrary wrapped shell commands outside the sandbox/);
  assert.match(skill, /Do not claim\s+that this can override restrictive rules managed by an administrator/);
});

test('sprint metadata and tasklet graphs use schema version 1', () => {
  assert.equal(sprintMetadata.schemaVersion, 1);
  assert.equal(taskletGraph.schemaVersion, 1);
});
