#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import { validateDependencies, validatePathOwnership, validateV3PathOwnership } from './sprint-graph.js';
import { readSprints, type SprintV1, type SprintV2, type SprintV3, type SprintExecutionStatus } from './sprint-metadata.js';
export { METADATA_MARKER, SprintMetadataReaders, parseSprintFile, readSprints } from './sprint-metadata.js';
export { validateDependencies, validatePathOwnership, validateV3PathOwnership } from './sprint-graph.js';
export const SCHEMA_VERSION = 3;
function fail(message: string): never { throw new Error(message); }
function dependencySprint(sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>, id: string): SprintV1 | SprintV2 | SprintV3 {
  const sprint = sprintById.get(id);
  if (sprint === undefined) fail(`unknown sprint dependency: ${id}`);
  return sprint;
}
// These predicates consume homogeneous arrays already established by readSprints.
function isV1Sprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[]): sprints is readonly SprintV1[] { return sprints[0]?.schemaVersion === 1; }
function isV2Sprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[]): sprints is readonly SprintV2[] { return sprints[0]?.schemaVersion === 2; }
function isV3Sprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[]): sprints is readonly SprintV3[] { return sprints[0]?.schemaVersion === 3; }

export function selectPlanningReadySprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'STUB'
    && candidate.planning.depends_on.every((id) => dependencySprint(sprintById, id).planning.status === 'APPROVED'));
  return sprint ? [sprint.id] : [];
}

export function selectPlanningReviewableSprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'READY_FOR_REVIEW'
    && candidate.execution === null
    && candidate.planning.depends_on.every((id) => dependencySprint(sprintById, id).planning.status === 'APPROVED'));
  return sprint ? [sprint.id] : [];
}

function selectExecutionReadySprintsV1(sprints: readonly SprintV1[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === 'PENDING'
    && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

export function validateCheckpointOrder(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[]): void {
  let unfinished: string | null = null;
  for (const sprint of sprints) {
    if (unfinished && sprint.execution && sprint.execution.status !== 'PENDING') fail(`sprint ${sprint.id} advanced before unfinished predecessor ${unfinished}`);
    if (!unfinished && sprint.execution?.status !== 'DONE') unfinished = sprint.id;
  }
}

export function validateDependencyExecutionOrder(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): void {
  for (const sprint of sprints) {
    if (!sprint.execution || sprint.execution.status === 'PENDING') continue;
    const unfinished = sprint.execution.depends_on.find((id) => dependencySprint(sprintById, id).execution?.status !== 'DONE');
    if (unfinished) fail(`sprint ${sprint.id} advanced before unfinished dependency ${unfinished}`);
  }
}

function selectExecutionReadySprintsV2(sprints: readonly SprintV2[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  validateCheckpointOrder(sprints);
  const sprint = sprints.find(({ execution }) => execution?.status !== 'DONE');
  if (!sprint || sprint.planning.status !== 'APPROVED' || sprint.execution?.status !== 'PENDING') return [];
  if (!sprint.execution.tasklets_reviewed) fail(`sprint ${sprint.id} tasklets must be reviewed before execution`);
  return sprint.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE') ? [sprint.id] : [];
}

function selectExecutionSprintsV3(sprints: readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>, status: SprintExecutionStatus): string[] {
  validateDependencyExecutionOrder(sprints, sprintById);
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === status
    && candidate.execution.tasklets_reviewed
    && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

export function selectExecutionReadySprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  if (isV1Sprints(sprints)) return selectExecutionReadySprintsV1(sprints, sprintById);
  if (isV2Sprints(sprints)) return selectExecutionReadySprintsV2(sprints, sprintById);
  return selectExecutionSprintsV3(sprints, sprintById, 'PENDING');
}
export function selectExecutionRunnableSprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  if (!isV3Sprints(sprints)) return selectExecutionReadySprints(sprints, sprintById);
  const status = sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'PENDING';
  return selectExecutionSprintsV3(sprints, sprintById, status);
}

export function selectExecutionReviewableSprints(sprints: readonly SprintV1[] | readonly SprintV2[] | readonly SprintV3[], sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3>): string[] {
  if (!isV3Sprints(sprints)) return [];
  validateDependencyExecutionOrder(sprints, sprintById);
  if (sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS')) return [];
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === 'PENDING'
    && !candidate.execution.tasklets_reviewed
    && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

export function main(argv: readonly string[] = process.argv.slice(2)): string[] {
  const operation = argv[0];
  const directoryInput = argv[1];
  if (argv.length !== 2 || (operation !== 'planning' && operation !== 'execution') || directoryInput === undefined) fail('usage: ready-sprints.js <planning|execution> <plan-directory>');
  const planDirectory = path.resolve(directoryInput);
  const sprints = readSprints(planDirectory);
  const sprintById: ReadonlyMap<string, SprintV1 | SprintV2 | SprintV3> = validateDependencies<SprintV1 | SprintV2 | SprintV3>(sprints);
  if (operation === 'execution' && isV1Sprints(sprints)) validatePathOwnership(sprints, sprintById);
  if (operation === 'execution' && isV3Sprints(sprints)) validateV3PathOwnership(sprints, sprintById);
  const result = operation === 'planning' ? selectPlanningReadySprints(sprints, sprintById) : selectExecutionReadySprints(sprints, sprintById);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
