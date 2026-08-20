#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');

const METADATA_MARKER = 'ponytail-plan-sprint';
const SCHEMA_VERSION = 1;
const PLANNING_STATUSES = new Set(['STUB', 'PLANNING', 'READY_FOR_REVIEW', 'APPROVED', 'ERROR']);
const EXECUTION_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE', 'ERROR']);

function fail(message) { throw new Error(message); }

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} must contain exactly: ${wanted.join(', ')}`);
  }
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

function parseSprintFile(filePath, text = fs.readFileSync(filePath, 'utf8')) {
  const marker = new RegExp(`^<!--\\s*${METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
  const blocks = [...text.matchAll(marker)];
  if (blocks.length !== 1) fail(`${filePath} must contain exactly one ${METADATA_MARKER} metadata block`);
  let metadata;
  try { metadata = JSON.parse(blocks[0][1]); } catch (error) { fail(`${filePath} metadata is not valid JSON: ${error.message}`); }
  exactKeys(metadata, ['schemaVersion', 'id', 'planning', 'execution'], 'sprint metadata');
  if (metadata.schemaVersion !== SCHEMA_VERSION) fail(`${filePath} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  const expectedId = path.basename(filePath, '.md');
  if (metadata.id !== expectedId) fail(`${filePath} metadata id must be ${expectedId}`);
  exactKeys(metadata.planning, ['status', 'depends_on', 'scope_roots'], 'planning metadata');
  if (!PLANNING_STATUSES.has(metadata.planning.status)) fail(`${filePath} has invalid planning status`);
  const planningDeps = strings(metadata.planning.depends_on, 'planning.depends_on');
  const roots = strings(metadata.planning.scope_roots, 'planning.scope_roots').map((value) => relativePath(value, 'scope root'));
  let execution = null;
  if (metadata.execution !== null) {
    exactKeys(metadata.execution, ['status', 'depends_on', 'planned_paths'], 'execution metadata');
    if (!EXECUTION_STATUSES.has(metadata.execution.status)) fail(`${filePath} has invalid execution status`);
    execution = {
      status: metadata.execution.status,
      depends_on: strings(metadata.execution.depends_on, 'execution.depends_on'),
      planned_paths: strings(metadata.execution.planned_paths, 'execution.planned_paths').map((value) => relativePath(value, 'planned path')),
    };
  }
  return { schemaVersion: SCHEMA_VERSION, id: metadata.id, planning: { status: metadata.planning.status, depends_on: planningDeps, scope_roots: roots }, execution, filePath };
}

function readSprints(planDirectory) {
  const sprintDirectory = path.join(planDirectory, 'sprints');
  if (!fs.existsSync(sprintDirectory) || !fs.statSync(sprintDirectory).isDirectory()) fail(`sprint directory does not exist: ${sprintDirectory}`);
  const files = fs.readdirSync(sprintDirectory).filter((name) => /^S\d+\.md$/.test(name) && fs.statSync(path.join(sprintDirectory, name)).isFile()).sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
  if (files.length === 0) fail(`no SNN.md sprint files found in ${sprintDirectory}`);
  const sprints = files.map((name) => parseSprintFile(path.join(sprintDirectory, name)));
  const ids = new Set();
  for (const sprint of sprints) {
    if (ids.has(sprint.id)) fail(`duplicate sprint id: ${sprint.id}`);
    ids.add(sprint.id);
  }
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

function selectPlanningReadySprints(sprints, sprintById) {
  return sprints.filter((sprint) => sprint.planning.status === 'STUB' && sprint.planning.depends_on.every((id) => sprintById.get(id).planning.status === 'APPROVED')).map((sprint) => sprint.id);
}

function selectExecutionReadySprints(sprints, sprintById) {
  return sprints.filter((sprint) => sprint.planning.status === 'APPROVED' && sprint.execution?.status === 'PENDING' && sprint.execution.depends_on.every((id) => sprintById.get(id).execution?.status === 'DONE')).map((sprint) => sprint.id);
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || !['planning', 'execution'].includes(argv[0])) fail('usage: ready-sprints.js <planning|execution> <plan-directory>');
  const planDirectory = path.resolve(argv[1]);
  const sprints = readSprints(planDirectory);
  const sprintById = validateDependencies(sprints);
  if (argv[0] === 'execution') validatePathOwnership(sprints, sprintById);
  const result = argv[0] === 'planning' ? selectPlanningReadySprints(sprints, sprintById) : selectExecutionReadySprints(sprints, sprintById);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

const SprintMetadataReaders = Object.freeze({ V1: parseSprintFile });

module.exports = { SCHEMA_VERSION, SprintMetadataReaders, parseSprintFile, readSprints, validateDependencies, validatePathOwnership, selectPlanningReadySprints, selectExecutionReadySprints, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
