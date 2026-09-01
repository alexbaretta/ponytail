#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');
const { readTaskletGraph } = require('./ready-tasklets.js');

const METADATA_MARKER = 'ponytail-plan-sprint';
const SCHEMA_VERSION = 3;
const PLANNING_STATUSES = new Set(['STUB', 'PLANNING', 'READY_FOR_REVIEW', 'APPROVED', 'ERROR']);
const EXECUTION_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE', 'ERROR']);

function fail(message) { throw new Error(message); }

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label} must contain exactly: ${wanted.join(', ')}`);
}

function strings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) fail(`${label} must be an array of nonempty strings`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  return value;
}

function relativePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[*?{}[\]]/.test(value)) fail(`${label} must be a relative path without glob syntax`);
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) fail(`${label} contains an invalid path segment`);
  return value;
}

function metadataBlock(filePath, text) {
  const marker = new RegExp(`^<!--\\s*${METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
  const blocks = [...text.matchAll(marker)];
  if (blocks.length !== 1) fail(`${filePath} must contain exactly one ${METADATA_MARKER} metadata block`);
  try { return JSON.parse(blocks[0][1]); } catch (error) { fail(`${filePath} metadata is not valid JSON: ${error.message}`); }
}

function commonMetadata(filePath, metadata, schemaVersion, executionKeys) {
  exactKeys(metadata, ['schemaVersion', 'id', 'planning', 'execution'], 'sprint metadata');
  if (metadata.schemaVersion !== schemaVersion) fail(`${filePath} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  const expectedId = path.basename(filePath, '.md');
  if (metadata.id !== expectedId) fail(`${filePath} metadata id must be ${expectedId}`);
  exactKeys(metadata.planning, ['status', 'depends_on', 'scope_roots'], 'planning metadata');
  if (!PLANNING_STATUSES.has(metadata.planning.status)) fail(`${filePath} has invalid planning status`);
  const planning = {
    status: metadata.planning.status,
    depends_on: strings(metadata.planning.depends_on, 'planning.depends_on'),
    scope_roots: strings(metadata.planning.scope_roots, 'planning.scope_roots').map((value) => relativePath(value, 'scope root')),
  };
  let execution = null;
  if (metadata.execution !== null) {
    exactKeys(metadata.execution, executionKeys, 'execution metadata');
    if (!EXECUTION_STATUSES.has(metadata.execution.status)) fail(`${filePath} has invalid execution status`);
    execution = {
      status: metadata.execution.status,
      depends_on: strings(metadata.execution.depends_on, 'execution.depends_on'),
    };
    if (executionKeys.includes('planned_paths')) execution.planned_paths = strings(metadata.execution.planned_paths, 'execution.planned_paths').map((value) => relativePath(value, 'planned path'));
  }
  return { schemaVersion, id: metadata.id, planning, execution, filePath };
}

function readSprintMetadataV1(filePath, metadata) {
  return commonMetadata(filePath, metadata, 1, ['status', 'depends_on', 'planned_paths']);
}

function readSprintMetadataV2(filePath, metadata) {
  const sprint = commonMetadata(filePath, metadata, 2, ['status', 'depends_on', 'tasklets_reviewed']);
  if (metadata.execution !== null) {
    if (typeof metadata.execution.tasklets_reviewed !== 'boolean') fail(`${filePath} execution.tasklets_reviewed must be Boolean`);
    sprint.execution.tasklets_reviewed = metadata.execution.tasklets_reviewed;
  }
  return sprint;
}

function readSprintMetadataV3(filePath, metadata) {
  const sprint = commonMetadata(filePath, metadata, 3, ['status', 'depends_on', 'tasklets_reviewed']);
  if (metadata.execution !== null) {
    if (typeof metadata.execution.tasklets_reviewed !== 'boolean') fail(`${filePath} execution.tasklets_reviewed must be Boolean`);
    sprint.execution.tasklets_reviewed = metadata.execution.tasklets_reviewed;
  }
  return sprint;
}

const SprintMetadataReaders = Object.freeze({ V1: readSprintMetadataV1, V2: readSprintMetadataV2, V3: readSprintMetadataV3 });

function parseSprintFile(filePath, text = fs.readFileSync(filePath, 'utf8')) {
  const metadata = metadataBlock(filePath, text);
  const reader = SprintMetadataReaders[`V${metadata.schemaVersion}`];
  if (!reader) fail(`${filePath} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  return reader(filePath, metadata);
}

function readSprints(planDirectory) {
  const sprintDirectory = path.join(planDirectory, 'sprints');
  if (!fs.existsSync(sprintDirectory) || !fs.statSync(sprintDirectory).isDirectory()) fail(`sprint directory does not exist: ${sprintDirectory}`);
  const files = fs.readdirSync(sprintDirectory).filter((name) => /^S\d+\.md$/.test(name) && fs.statSync(path.join(sprintDirectory, name)).isFile()).sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
  if (files.length === 0) fail(`no SNN.md sprint files found in ${sprintDirectory}`);
  const sprints = files.map((name) => parseSprintFile(path.join(sprintDirectory, name)));
  const ids = new Set();
  const ordinals = new Set();
  for (const sprint of sprints) {
    if (ids.has(sprint.id)) fail(`duplicate sprint id: ${sprint.id}`);
    ids.add(sprint.id);
    const ordinal = Number(sprint.id.slice(1));
    if (ordinals.has(ordinal)) fail(`duplicate numeric sprint order: ${ordinal}`);
    ordinals.add(ordinal);
  }
  if (new Set(sprints.map(({ schemaVersion }) => schemaVersion)).size !== 1) fail('plan must not mix physical sprint schema versions');
  return sprints;
}

function validateGraph(sprints, lifecycle) {
  const map = new Map(sprints.map((sprint) => [sprint.id, sprint]));
  const visiting = new Set();
  const visited = new Set();
  const walk = (id, trail) => {
    if (visiting.has(id)) {
      const start = trail.indexOf(id);
      fail(`${lifecycle} dependency cycle: ${[...trail.slice(start), id].join(' -> ')}`);
    }
    if (visited.has(id)) return;
    const sprint = map.get(id);
    if (!sprint) fail(`unknown ${lifecycle} dependency: ${id}`);
    visiting.add(id);
    const dependencies = sprint[lifecycle] ? sprint[lifecycle].depends_on : [];
    for (const dependency of dependencies) {
      if (dependency === id) fail(`${lifecycle} sprint ${id} cannot depend on itself`);
      walk(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const sprint of sprints) walk(sprint.id, []);
  return map;
}

function validateDependencies(sprints) {
  const map = validateGraph(sprints, 'planning');
  validateGraph(sprints, 'execution');
  return map;
}

function validatePathOwnership(sprints, sprintById) {
  const reachability = new Map();
  const reachable = (id) => {
    if (reachability.has(id)) return reachability.get(id);
    const result = new Set();
    const sprint = sprintById.get(id);
    if (sprint?.execution) for (const dependency of sprint.execution.depends_on) {
      result.add(dependency);
      for (const ancestor of reachable(dependency)) result.add(ancestor);
    }
    reachability.set(id, result);
    return result;
  };
  for (const sprint of sprints) reachable(sprint.id);
  for (let first = 0; first < sprints.length; first += 1) {
    const left = sprints[first];
    if (!left.execution) continue;
    for (let second = first + 1; second < sprints.length; second += 1) {
      const right = sprints[second];
      if (!right.execution || reachable(left.id).has(right.id) || reachable(right.id).has(left.id)) continue;
      const rightPaths = new Set(right.execution.planned_paths);
      const overlap = left.execution.planned_paths.find((candidate) => rightPaths.has(candidate));
      if (overlap) fail(`unordered sprint path overlap: ${left.id}, ${right.id}, ${overlap}`);
    }
  }
}

function readV3PlannedPaths(sprint) {
  const metadata = readTaskletGraph(sprint.filePath);
  if (metadata.schemaVersion !== 3) fail(`${metadata.filePath} must contain V3 tasklet metadata for ${sprint.id}`);
  const paths = [];
  for (const tasklet of metadata.tasklets.values()) paths.push(...tasklet.planned_paths);
  return [...new Set(paths)];
}

function validateV3PathOwnership(sprints, sprintById) {
  const reachability = new Map();
  const reachable = (id) => {
    if (reachability.has(id)) return reachability.get(id);
    const result = new Set();
    const sprint = sprintById.get(id);
    if (sprint?.execution) for (const dependency of sprint.execution.depends_on) {
      result.add(dependency);
      for (const ancestor of reachable(dependency)) result.add(ancestor);
    }
    reachability.set(id, result);
    return result;
  };
  const paths = new Map(sprints.filter(({ execution }) => execution).map((sprint) => [sprint.id, readV3PlannedPaths(sprint)]));
  for (let first = 0; first < sprints.length; first += 1) {
    const left = sprints[first];
    if (!left.execution) continue;
    for (let second = first + 1; second < sprints.length; second += 1) {
      const right = sprints[second];
      if (!right.execution || reachable(left.id).has(right.id) || reachable(right.id).has(left.id)) continue;
      const rightPaths = new Set(paths.get(right.id));
      const overlap = paths.get(left.id).find((candidate) => rightPaths.has(candidate));
      if (overlap) fail(`unordered sprint path overlap: ${left.id}, ${right.id}, ${overlap}`);
    }
  }
}

function selectPlanningReadySprints(sprints, sprintById) {
  const sprint = sprints.find((candidate) => candidate.planning.status === 'STUB'
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

function selectExecutionReadySprintsV3(sprints, sprintById) {
  validateDependencyExecutionOrder(sprints, sprintById);
  const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
    && candidate.execution?.status === 'PENDING'
    && candidate.execution.tasklets_reviewed
    && candidate.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE'));
  return sprint ? [sprint.id] : [];
}

function selectExecutionReadySprints(sprints, sprintById) {
  if (sprints[0]?.schemaVersion === 1) return selectExecutionReadySprintsV1(sprints, sprintById);
  if (sprints[0]?.schemaVersion === 2) return selectExecutionReadySprintsV2(sprints, sprintById);
  return selectExecutionReadySprintsV3(sprints, sprintById);
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

module.exports = { SCHEMA_VERSION, SprintMetadataReaders, parseSprintFile, readSprints, validateDependencies, validatePathOwnership, validateV3PathOwnership, validateCheckpointOrder, validateDependencyExecutionOrder, selectPlanningReadySprints, selectExecutionReadySprints, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
