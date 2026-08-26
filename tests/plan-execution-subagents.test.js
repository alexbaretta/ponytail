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

const versionedContracts = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'versioned-data-contracts.json'),
  'utf8',
));

test('checkpoint sprint policy preserves atomic, convergent orchestration boundaries', () => {
  assert.match(skill, /one type definition, class\s+envelope, method or function, controller endpoint[\s\S]*focused fixture, or validation gate/);
  assert.match(skill, /more than\s+1,000 new lines requires the orchestrator to split it or record why/);
  assert.match(skill, /exact files and declarations;[\s\S]*data structures, types, inputs, and outputs;[\s\S]*chosen algorithm and control flow;[\s\S]*invariants, boundary behavior, and actionable errors;[\s\S]*focused tests and expected observations;[\s\S]*generated or configuration synchronization;[\s\S]*explicit exclusions/);
  assert.match(skill, /planning states are `STUB`, `PLANNING`, `READY_FOR_REVIEW`, `APPROVED`, and\s+`ERROR`/i);
  assert.match(skill, /execution states are `PENDING`, `IN_PROGRESS`, `READY_FOR_REVIEW`,\s+`DONE`, and `ERROR`/i);
  assert.match(skill, /Sprints are sequential\s+execution checkpoints: at most one sprint may be active, and no later sprint\s+may advance until every earlier sprint is `DONE`/);
  assert.match(skill, /"schemaVersion": 2/);
  assert.match(skill, /physical V1 sprint and tasklet readers remain immutable/);
  assert.match(skill, /V2 is the latest write format/);
  assert.match(skill, /reject a plan containing mixed physical\s+sprint versions/);
  assert.match(skill, /V2 sprint execution contains exactly `status`,\s+`depends_on`, and `tasklets_reviewed` and owns no write paths/);
  assert.match(skill, /creates intent-level sprint stubs/);
  assert.match(skill, /inspect the\s+repository read-only and edit only its assigned sprint Markdown and sibling\s+tasklet metadata/);
  assert.match(skill, /reconciles each completed planning wave before approval/);
  assert.match(skill, /Every long-lived plan uses this orchestration lifecycle/);
  assert.match(skill, /Before any sprint\s+planning or implementation edit/);
  assert.match(skill, /selector output, rather than an agent's subjective\s+classification/);
  assert.match(skill, /Before implementation\s+of a sprint starts, the orchestrator reviews the entire sprint and rejects any\s+tasklet that is not atomic/);
  assert.match(skill, /overlaps another tasklet's path without transitive ordering/);
  assert.match(skill, /`execution\.tasklets_reviewed:\s+true`/);
  assert.match(skill, /Every non-validation tasklet owns at least one path/);
  assert.match(skill, /V2 tasklet metadata is the sole exact write-path owner/);
  assert.match(skill, /sole\s+`validation_tasklet` directly depends on every other tasklet in that feature/);
  assert.match(skill, /greedily selects the\s+deterministic maximal set whose exact planned paths are pairwise disjoint/);
  assert.match(skill, /rejects any pair of tasklets with an overlapping planned\s+path unless one transitively depends on the other through the effective hard\s+tasklet and feature-validation dependency graph/);
  assert.match(skill, /rule applies within and\s+across features; ordered overlap remains valid/);
  assert.match(skill, /returns at most the earliest\s+unfinished sprint/);
  assert.match(skill, /runs `ready-tasklets\.js`/);
  assert.match(skill, /Implementers edit only their frozen implementation\s+paths and return structured evidence/);
  assert.match(skill, /do not edit sprint Markdown,\s+tasklet metadata, the plan manifest, or shared Git state, and do not stage or\s+commit/);
  assert.match(skill, /orchestrator alone updates shared plan, sprint, and tasklet records; owns\s+the Git index/);
  assert.match(skill, /feature advances through its single\s+approval gate only after every implementation tasklet is reconciled and its\s+validation tasklet passes against the combined feature tree/);
  assert.match(skill, /sprint advances\s+to `READY_FOR_REVIEW` and then `DONE` only after every feature converges and\s+the sprint's distinct focused integration proof passes/);
  assert.doesNotMatch(skill, /## Parallel Sprint Orchestration/);
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

test('orchestration contract families expose every V1 and V2 reader', () => {
  const expected = new Map([
    ['parallel-sprint-metadata', 'skills/plan-execution/scripts/ready-sprints.js'],
    ['parallel-tasklet-scheduling-metadata', 'skills/plan-execution/scripts/ready-tasklets.js'],
  ]);
  const families = versionedContracts.families.filter(({ id }) => expected.has(id));
  assert.equal(families.length, expected.size);
  for (const family of families) {
    assert.equal(family.currentVersion, 'V2');
    assert.deepEqual(family.versions, ['V1', 'V2']);
    assert.deepEqual(family.supportedReadVersions, ['V1', 'V2']);
    assert.deepEqual(family.supportedDowngradeVersions, []);
    assert.equal(family.implementation.module, expected.get(family.id));
    const implementation = require(path.join(__dirname, '..', family.implementation.module));
    const readers = implementation[family.implementation.readerRegistryExport];
    assert.deepEqual(Object.keys(readers), family.supportedReadVersions);
    for (const version of family.supportedReadVersions) assert.equal(typeof readers[version], 'function');
  }
});
