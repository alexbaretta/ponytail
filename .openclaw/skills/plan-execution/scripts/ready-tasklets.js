#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');

const TASKLET_STATUSES = new Set([' ', 'DONE', 'ERROR']);
const RISK_VALUES = new Set(['normal', 'high']);
const SCHEMA_VERSION = 3;
const MAX_PACKET_TASKLETS = 16;

function fail(message) { throw new Error(message); }

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label} must contain exactly: ${wanted.join(', ')}`);
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) fail(`${label} must be an array of nonempty strings`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  return value;
}

function relativePaths(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !candidate || candidate.includes('\\') || /[*?{}[\]]/.test(candidate)) fail(`${label} must contain relative paths without glob syntax`);
    if (candidate.split('/').some((segment) => !segment || segment === '.' || segment === '..')) fail(`${label} contains an invalid path segment`);
  }
  return value;
}

function parseTaskletStatuses(sprintFile, text = fs.readFileSync(sprintFile, 'utf8')) {
  const statuses = new Map();
  const heading = /^### \[( |DONE|ERROR)\] Tasklet (S\d+-F\d+-T\d+): .+$/;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('###') || !line.includes('Tasklet')) continue;
    const match = line.match(heading);
    if (!match) fail(`${sprintFile} contains a malformed tasklet heading: ${line}`);
    const id = match[2];
    if (statuses.has(id)) fail(`duplicate tasklet heading: ${id}`);
    if (!TASKLET_STATUSES.has(match[1])) fail(`invalid tasklet status: ${id}`);
    statuses.set(id, match[1] === ' ' ? 'PENDING' : match[1]);
  }
  if (statuses.size === 0) fail(`${sprintFile} contains no tasklet headings`);
  return statuses;
}

function taskletValue(id, value, expected, includePaths = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`tasklet ${id} must be an object`);
  exactKeys(value, value.risk === 'high' ? [...expected, 'risk_reason'] : expected, `tasklet ${id}`);
  if (!RISK_VALUES.has(value.risk)) fail(`tasklet ${id} has invalid risk`);
  if (value.risk === 'high' && (typeof value.risk_reason !== 'string' || value.risk_reason.trim() === '')) fail(`high-risk tasklet ${id} requires risk_reason`);
  return {
    depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`),
    affinity: uniqueStrings(value.affinity, `${id}.affinity`),
    risk: value.risk,
    ...(value.risk === 'high' ? { risk_reason: value.risk_reason } : {}),
    ...(includePaths ? { feature: value.feature, planned_paths: relativePaths(value.planned_paths, `${id}.planned_paths`) } : {}),
  };
}

function readTaskletMetadataV1(sprintId, metadata, graphFile) {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== 1) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  exactKeys(metadata.tasklets, Object.keys(metadata.tasklets), 'tasklets');
  const tasklets = new Map();
  for (const [id, value] of Object.entries(metadata.tasklets)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    tasklets.set(id, taskletValue(id, value, ['depends_on', 'affinity', 'risk']));
  }
  return { schemaVersion: 1, sprint: sprintId, tasklets, filePath: graphFile };
}

function readTaskletMetadataV2(sprintId, metadata, graphFile) {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'features', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== 2) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  exactKeys(metadata.features, Object.keys(metadata.features), 'features');
  exactKeys(metadata.tasklets, Object.keys(metadata.tasklets), 'tasklets');
  const features = new Map();
  for (const [id, value] of Object.entries(metadata.features)) {
    if (!/^S\d+-F\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid feature id: ${id}`);
    exactKeys(value, ['depends_on', 'validation_tasklet'], `feature ${id}`);
    if (typeof value.validation_tasklet !== 'string' || !value.validation_tasklet) fail(`feature ${id} validation_tasklet must be a nonempty string`);
    features.set(id, { depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`), validation_tasklet: value.validation_tasklet });
  }
  const tasklets = new Map();
  for (const [id, value] of Object.entries(metadata.tasklets)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    const tasklet = taskletValue(id, value, ['depends_on', 'affinity', 'risk', 'feature', 'planned_paths'], true);
    if (!features.has(tasklet.feature) || !id.startsWith(`${tasklet.feature}-T`)) fail(`tasklet ${id} has invalid feature membership: ${tasklet.feature}`);
    tasklets.set(id, tasklet);
  }
  return { schemaVersion: 2, sprint: sprintId, features, tasklets, filePath: graphFile };
}

function readTaskletMetadataV3(sprintId, metadata, graphFile) {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'features', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== 3) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  exactKeys(metadata.features, Object.keys(metadata.features), 'features');
  exactKeys(metadata.tasklets, Object.keys(metadata.tasklets), 'tasklets');
  const features = new Map();
  for (const [id, value] of Object.entries(metadata.features)) {
    if (!/^S\d+-F\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid feature id: ${id}`);
    exactKeys(value, ['depends_on', 'validation_tasklet'], `feature ${id}`);
    if (typeof value.validation_tasklet !== 'string' || !value.validation_tasklet) fail(`feature ${id} validation_tasklet must be a nonempty string`);
    features.set(id, { depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`), validation_tasklet: value.validation_tasklet });
  }
  const tasklets = new Map();
  for (const [id, value] of Object.entries(metadata.tasklets)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    const tasklet = taskletValue(id, value, ['depends_on', 'affinity', 'risk', 'feature', 'planned_paths'], true);
    if (!features.has(tasklet.feature) || !id.startsWith(`${tasklet.feature}-T`)) fail(`tasklet ${id} has invalid feature membership: ${tasklet.feature}`);
    tasklets.set(id, tasklet);
  }
  return { schemaVersion: 3, sprint: sprintId, features, tasklets, filePath: graphFile };
}

const TaskletMetadataReaders = Object.freeze({ V1: readTaskletMetadataV1, V2: readTaskletMetadataV2, V3: readTaskletMetadataV3 });

function readTaskletGraph(sprintFile) {
  const graphFile = sprintFile.replace(/\.md$/, '.tasklets.json');
  if (graphFile === sprintFile) fail(`sprint file must end in .md: ${sprintFile}`);
  let metadata;
  try { metadata = JSON.parse(fs.readFileSync(graphFile, 'utf8')); } catch (error) { fail(`cannot parse tasklet metadata ${graphFile}: ${error.message}`); }
  const reader = TaskletMetadataReaders[`V${metadata.schemaVersion}`];
  if (!reader) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  return reader(path.basename(sprintFile, '.md'), metadata, graphFile);
}

function validateFeatureGraph(graph) {
  if (graph.schemaVersion === 1) return;
  const visiting = new Set();
  const visited = new Set();
  const walk = (id, trail) => {
    if (visiting.has(id)) fail(`feature dependency cycle: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`);
    if (visited.has(id)) return;
    const feature = graph.features.get(id);
    if (!feature) fail(`unknown feature dependency: ${id}`);
    visiting.add(id);
    for (const dependency of feature.depends_on) {
      if (dependency === id) fail(`feature ${id} cannot depend on itself`);
      walk(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.features.keys()) walk(id, []);
  for (const [featureId, feature] of graph.features) {
    const validation = graph.tasklets.get(feature.validation_tasklet);
    if (!validation || validation.feature !== featureId) fail(`feature ${featureId} has invalid validation_tasklet`);
    const members = [...graph.tasklets].filter(([, tasklet]) => tasklet.feature === featureId).map(([id]) => id);
    const missing = members.filter((id) => id !== feature.validation_tasklet && !validation.depends_on.includes(id));
    if (missing.length) fail(`validation tasklet ${feature.validation_tasklet} must directly depend on every other feature tasklet: ${missing.join(', ')}`);
    for (const id of members) {
      if (id !== feature.validation_tasklet && graph.tasklets.get(id).planned_paths.length === 0) fail(`non-validation tasklet ${id} requires planned_paths`);
      for (const dependency of graph.tasklets.get(id).depends_on) {
        const dependencyFeature = graph.tasklets.get(dependency)?.feature;
        if (dependencyFeature && dependencyFeature !== featureId && !feature.depends_on.includes(dependencyFeature)) {
          fail(`tasklet ${id} cross-feature dependency requires feature dependency: ${dependencyFeature}`);
        }
      }
    }
  }
}

function effectiveDependencies(graph, id) {
  const tasklet = graph.tasklets.get(id);
  if (graph.schemaVersion === 1) return tasklet.depends_on;
  return [...new Set([
    ...tasklet.depends_on,
    ...graph.features.get(tasklet.feature).depends_on.map((feature) => graph.features.get(feature)?.validation_tasklet ?? feature),
  ])];
}

function validateTaskletGraph(graph, statuses) {
  const ids = new Set(graph.tasklets.keys());
  if (ids.size !== statuses.size || [...ids].some((id) => !statuses.has(id))) fail('tasklet metadata and Markdown headings must contain exactly the same tasklet IDs');
  validateFeatureGraph(graph);
  const visiting = new Set();
  const visited = new Set();
  const reverse = new Map([...ids].map((id) => [id, []]));
  const walk = (id, trail) => {
    if (visiting.has(id)) fail(`tasklet dependency cycle: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of effectiveDependencies(graph, id)) {
      if (!ids.has(dependency)) fail(`unknown tasklet dependency: ${dependency}`);
      if (dependency === id) fail(`tasklet ${id} cannot depend on itself`);
      if (statuses.get(dependency) === 'ERROR') fail(`tasklet ${id} depends on [ERROR] tasklet ${dependency}`);
      reverse.get(dependency).push(id);
      walk(dependency, [...trail, id]);
    }
    if (statuses.get(id) === 'DONE' && effectiveDependencies(graph, id).some((dependency) => statuses.get(dependency) !== 'DONE')) fail(`completed tasklet ${id} depends on unfinished tasklet`);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) walk(id, []);
  const descendants = new Map();
  const depth = new Map();
  const derive = (id) => {
    if (descendants.has(id)) return;
    const all = new Set();
    let maxDepth = 0;
    for (const child of reverse.get(id)) {
      derive(child);
      all.add(child);
      for (const descendant of descendants.get(child)) all.add(descendant);
      maxDepth = Math.max(maxDepth, 1 + depth.get(child));
    }
    descendants.set(id, all);
    depth.set(id, maxDepth);
  };
  for (const id of ids) derive(id);
  if (graph.schemaVersion >= 2) {
    const taskletIds = [...ids];
    for (let first = 0; first < taskletIds.length; first += 1) {
      const left = taskletIds[first];
      const leftPaths = new Set(graph.tasklets.get(left).planned_paths);
      for (let second = first + 1; second < taskletIds.length; second += 1) {
        const right = taskletIds[second];
        const overlap = graph.tasklets.get(right).planned_paths.find((candidate) => leftPaths.has(candidate));
        if (overlap && !descendants.get(left).has(right) && !descendants.get(right).has(left)) {
          fail(`unordered tasklet path overlap: ${left}, ${right}, ${overlap}`);
        }
      }
    }
  }
  const unfinishedDescendants = new Map([...ids].map((id) => [id, [...descendants.get(id)].filter((descendant) => statuses.get(descendant) === 'PENDING').length]));
  return { reverse, descendants, depth, unfinishedDescendants };
}

function rankedReadyTasklets(graph, statuses, derived, lastTasklet) {
  if (lastTasklet !== null && (!statuses.has(lastTasklet) || statuses.get(lastTasklet) !== 'DONE')) fail(`last completed tasklet must be a known [DONE] tasklet: ${lastTasklet}`);
  const ready = [...graph.tasklets.keys()].filter((id) => statuses.get(id) === 'PENDING' && effectiveDependencies(graph, id).every((dependency) => statuses.get(dependency) === 'DONE'));
  if (ready.length === 0) {
    if ([...statuses.values()].every((status) => status === 'DONE')) return [];
    fail('unfinished tasklet graph has no ready tasklet');
  }
  const overlap = (id) => {
    if (lastTasklet === null) return 0;
    const prior = new Set(graph.tasklets.get(lastTasklet).affinity);
    return graph.tasklets.get(id).affinity.filter((tag) => prior.has(tag)).length;
  };
  ready.sort((left, right) => {
    const a = graph.tasklets.get(left); const b = graph.tasklets.get(right);
    return Number(b.risk === 'high') - Number(a.risk === 'high') || overlap(right) - overlap(left) || derived.unfinishedDescendants.get(right) - derived.unfinishedDescendants.get(left) || derived.depth.get(right) - derived.depth.get(left) || left.localeCompare(right);
  });
  return ready.map((id) => [id, { risk: graph.tasklets.get(id).risk, affinity_overlap: overlap(id), unfinished_descendants: derived.unfinishedDescendants.get(id), remaining_depth: derived.depth.get(id) }]);
}

function selectNextTasklet(graph, statuses, derived, lastTasklet = null) {
  const ranked = rankedReadyTasklets(graph, statuses, derived, lastTasklet);
  if (ranked.length === 0) return { next: null };
  return { next: ranked[0][0], criteria: ranked[0][1] };
}

function selectReadyTasklets(graph, statuses, derived, lastTasklet = null) {
  if (graph.schemaVersion === 1) return selectNextTasklet(graph, statuses, derived, lastTasklet);
  if (graph.schemaVersion === 3) return selectReadyTaskletPackets(graph, statuses, derived, lastTasklet);
  const ranked = rankedReadyTasklets(graph, statuses, derived, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const usedPaths = new Set();
  const selected = [];
  const criteria = {};
  for (const [id, values] of ranked) {
    const paths = graph.tasklets.get(id).planned_paths;
    if (paths.some((candidate) => usedPaths.has(candidate))) continue;
    selected.push(id);
    criteria[id] = values;
    for (const candidate of paths) usedPaths.add(candidate);
  }
  return { next: selected, criteria };
}

function selectReadyTaskletPackets(graph, statuses, derived, lastTasklet = null) {
  const ranked = rankedReadyTasklets(graph, statuses, derived, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const validationTasklets = new Set([...graph.features.values()].map(({ validation_tasklet: id }) => id));
  const criteria = Object.fromEntries(ranked);
  const usedPaths = new Set();
  const packets = [];
  for (const [id] of ranked) {
    const paths = graph.tasklets.get(id).planned_paths;
    if (paths.some((candidate) => usedPaths.has(candidate))) continue;
    packets.push({ tasklets: [id], planned_paths: [...paths] });
    for (const candidate of paths) usedPaths.add(candidate);
  }
  for (const packet of packets) {
    const completed = new Set([...statuses].filter(([, status]) => status === 'DONE').map(([id]) => id));
    completed.add(packet.tasklets[0]);
    while (packet.tasklets.length < MAX_PACKET_TASKLETS) {
      const candidates = [...graph.tasklets.keys()].filter((id) => {
        if (statuses.get(id) !== 'PENDING' || completed.has(id) || validationTasklets.has(id)) return false;
        const dependencies = effectiveDependencies(graph, id);
        return dependencies.some((dependency) => completed.has(dependency) && packet.tasklets.includes(dependency))
          && dependencies.every((dependency) => completed.has(dependency));
      }).sort((left, right) => left.localeCompare(right));
      const next = candidates.find((id) => graph.tasklets.get(id).planned_paths.every((candidate) => !usedPaths.has(candidate) || packet.planned_paths.includes(candidate)));
      if (!next) break;
      packet.tasklets.push(next);
      completed.add(next);
      for (const candidate of graph.tasklets.get(next).planned_paths) {
        if (!packet.planned_paths.includes(candidate)) packet.planned_paths.push(candidate);
        usedPaths.add(candidate);
      }
      criteria[next] = {
        risk: graph.tasklets.get(next).risk,
        affinity_overlap: 0,
        unfinished_descendants: derived.unfinishedDescendants.get(next),
        remaining_depth: derived.depth.get(next),
      };
    }
  }
  return { next: packets, criteria };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length < 1 || argv.length > 2) fail('usage: ready-tasklets.js <sprint.md> [last-completed-tasklet-id]');
  const sprintFile = path.resolve(argv[0]);
  const statuses = parseTaskletStatuses(sprintFile);
  const graph = readTaskletGraph(sprintFile);
  const result = selectReadyTasklets(graph, statuses, validateTaskletGraph(graph, statuses), argv[1] ?? null);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

module.exports = { SCHEMA_VERSION, MAX_PACKET_TASKLETS, TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph, validateTaskletGraph, selectNextTasklet, selectReadyTasklets, selectReadyTaskletPackets, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
