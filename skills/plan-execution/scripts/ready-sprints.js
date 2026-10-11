#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const path = require('node:path');
const { validateDependencies, validatePathOwnership, validateV3PathOwnership } = require('./sprint-graph');

const { METADATA_MARKER, SprintMetadataReaders, parseSprintFile, readSprints } = require('./sprint-metadata');
const SCHEMA_VERSION = 3;
function fail(message) { throw new Error(message); }

function selectPlanningReadySprints(sprints, sprintById) {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'STUB'
    && candidate.planning.depends_on.every((id) => sprintById.get(id).planning.status === 'APPROVED'));
  return sprint ? [sprint.id] : [];
}

function selectPlanningReviewableSprints(sprints, sprintById) {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'READY_FOR_REVIEW'
    && candidate.execution === null
    && candidate.planning.depends_on.every((id) => sprintById.get(id).planning.status === 'APPROVED'));
  return sprint ? [sprint.id] : [];
}

function selectExecutionReadySprintsV1(sprints, sprintById) {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === 'PENDING'
    && candidate.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

function validateCheckpointOrder(sprints) {
  let unfinished = null;
  for (const sprint of sprints) {
    if (unfinished && sprint.execution && sprint.execution.status !== 'PENDING') fail(`sprint ${sprint.id} advanced before unfinished predecessor ${unfinished}`);
    if (!unfinished && sprint.execution?.status !== 'DONE') unfinished = sprint.id;
  }
}

function validateDependencyExecutionOrder(sprints, sprintById) {
  for (const sprint of sprints) {
    if (!sprint.execution || sprint.execution.status === 'PENDING') continue;
    const unfinished = sprint.execution.depends_on.find((id) => sprintById.get(id).execution?.status !== 'DONE');
    if (unfinished) fail(`sprint ${sprint.id} advanced before unfinished dependency ${unfinished}`);
  }
}

function selectExecutionReadySprintsV2(sprints, sprintById) {
  validateCheckpointOrder(sprints);
  const sprint = sprints.find(({ execution }) => execution?.status !== 'DONE');
  if (!sprint || sprint.planning.status !== 'APPROVED' || sprint.execution?.status !== 'PENDING') return [];
  if (!sprint.execution.tasklets_reviewed) fail(`sprint ${sprint.id} tasklets must be reviewed before execution`);
  return sprint.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE') ? [sprint.id] : [];
}

function selectExecutionSprintsV3(sprints, sprintById, status) {
  validateDependencyExecutionOrder(sprints, sprintById);
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === status
    && candidate.execution.tasklets_reviewed
    && candidate.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

function selectExecutionReadySprints(sprints, sprintById) {
  if (sprints[0]?.schemaVersion === 1) return selectExecutionReadySprintsV1(sprints, sprintById);
  if (sprints[0]?.schemaVersion === 2) return selectExecutionReadySprintsV2(sprints, sprintById);
  return selectExecutionSprintsV3(sprints, sprintById, 'PENDING');
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
function selectExecutionRunnableSprints(sprints, sprintById) {
  if (sprints[0]?.schemaVersion !== 3) return selectExecutionReadySprints(sprints, sprintById);
  const status = sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'PENDING';
  return selectExecutionSprintsV3(sprints, sprintById, status);
}

function selectExecutionReviewableSprints(sprints, sprintById) {
  if (sprints[0]?.schemaVersion !== 3) return [];
  validateDependencyExecutionOrder(sprints, sprintById);
  if (sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS')) return [];
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === 'PENDING'
    && !candidate.execution.tasklets_reviewed
    && candidate.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || !['planning', 'execution'].includes(argv[0])) fail('usage: ready-sprints.js <planning|execution> <plan-directory>');
  const planDirectory = path.resolve(argv[1]);
  const sprints = readSprints(planDirectory);
  const sprintById = validateDependencies(sprints);
  if (argv[0] === 'execution' && sprints[0].schemaVersion === 1) validatePathOwnership(sprints, sprintById);
  if (argv[0] === 'execution' && sprints[0].schemaVersion === 3) validateV3PathOwnership(sprints, sprintById);
  const result = argv[0] === 'planning' ? selectPlanningReadySprints(sprints, sprintById) : selectExecutionReadySprints(sprints, sprintById);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

module.exports = { METADATA_MARKER, SCHEMA_VERSION, SprintMetadataReaders, parseSprintFile, readSprints, validateDependencies, validatePathOwnership, validateV3PathOwnership, validateCheckpointOrder, validateDependencyExecutionOrder, selectPlanningReadySprints, selectPlanningReviewableSprints, selectExecutionReadySprints, selectExecutionRunnableSprints, selectExecutionReviewableSprints, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
