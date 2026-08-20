#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');

const TASKLET_STATUSES = new Set([' ', 'DONE', 'ERROR']);
const RISK_VALUES = new Set(['normal', 'high']);
const SCHEMA_VERSION = 1;

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

function parseTaskletStatuses(sprintFile, text = fs.readFileSync(sprintFile, 'utf8')) {
  const statuses = new Map();
  const lines = text.split(/\r?\n/);
  const heading = /^### \[( |DONE|ERROR)\] Tasklet (S\d+-F\d+-T\d+): .+$/;
  for (const line of lines) {
    if (!line.startsWith('###')) continue;
    if (!line.includes('Tasklet')) continue;
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

function readTaskletGraph(sprintFile) {
  const graphFile = sprintFile.replace(/\.md$/, '.tasklets.json');
  if (graphFile === sprintFile) fail(`sprint file must end in .md: ${sprintFile}`);
  let metadata;
  try { metadata = JSON.parse(fs.readFileSync(graphFile, 'utf8')); } catch (error) { fail(`cannot parse tasklet metadata ${graphFile}: ${error.message}`); }
  exactKeys(metadata, ['schemaVersion', 'sprint', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== SCHEMA_VERSION) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  const sprintId = path.basename(sprintFile, '.md');
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  exactKeys(metadata.tasklets, Object.keys(metadata.tasklets), 'tasklets');
  const tasklets = new Map();
  for (const [id, value] of Object.entries(metadata.tasklets)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`tasklet ${id} must be an object`);
    const expected = value.risk === 'high' ? ['depends_on', 'affinity', 'risk', 'risk_reason'] : ['depends_on', 'affinity', 'risk'];
    exactKeys(value, expected, `tasklet ${id}`);
    if (!RISK_VALUES.has(value.risk)) fail(`tasklet ${id} has invalid risk`);
    if (value.risk === 'high' && (typeof value.risk_reason !== 'string' || value.risk_reason.trim() === '')) fail(`high-risk tasklet ${id} requires risk_reason`);
    tasklets.set(id, { depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`), affinity: uniqueStrings(value.affinity, `${id}.affinity`), risk: value.risk, ...(value.risk === 'high' ? { risk_reason: value.risk_reason } : {}) });
  }
  return { schemaVersion: SCHEMA_VERSION, sprint: sprintId, tasklets, filePath: graphFile };
}

function validateTaskletGraph(graph, statuses) {
  const ids = new Set(graph.tasklets.keys());
  if (ids.size !== statuses.size || [...ids].some((id) => !statuses.has(id))) fail('tasklet metadata and Markdown headings must contain exactly the same tasklet IDs');
  const visiting = new Set();
  const visited = new Set();
  const reverse = new Map([...ids].map((id) => [id, []]));
  const walk = (id, trail) => {
    if (visiting.has(id)) {
      const start = trail.indexOf(id);
      fail(`tasklet dependency cycle: ${[...trail.slice(start), id].join(' -> ')}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.tasklets.get(id).depends_on) {
      if (!ids.has(dependency)) fail(`unknown tasklet dependency: ${dependency}`);
      if (dependency === id) fail(`tasklet ${id} cannot depend on itself`);
      if (statuses.get(dependency) === 'ERROR') fail(`tasklet ${id} depends on [ERROR] tasklet ${dependency}`);
      reverse.get(dependency).push(id);
      walk(dependency, [...trail, id]);
    }
    if (statuses.get(id) === 'DONE' && graph.tasklets.get(id).depends_on.some((dependency) => statuses.get(dependency) !== 'DONE')) fail(`completed tasklet ${id} depends on unfinished tasklet`);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) walk(id, []);
  const descendants = new Map();
  const depth = new Map();
  const derive = (id) => {
    if (descendants.has(id)) return;
    const children = reverse.get(id);
    const all = new Set();
    let maxDepth = 0;
    for (const child of children) {
      derive(child);
      all.add(child);
      for (const descendant of descendants.get(child)) all.add(descendant);
      maxDepth = Math.max(maxDepth, 1 + depth.get(child));
    }
    descendants.set(id, all);
    depth.set(id, maxDepth);
  };
  for (const id of ids) derive(id);
  const unfinishedDescendants = new Map([...ids].map((id) => [id, [...descendants.get(id)].filter((descendant) => statuses.get(descendant) === 'PENDING').length]));
  return { reverse, descendants, depth, unfinishedDescendants };
}

function selectNextTasklet(graph, statuses, derived, lastTasklet = null) {
  if (lastTasklet !== null && (!statuses.has(lastTasklet) || statuses.get(lastTasklet) !== 'DONE')) fail(`last completed tasklet must be a known [DONE] tasklet: ${lastTasklet}`);
  const ready = [...graph.tasklets.keys()].filter((id) => statuses.get(id) === 'PENDING' && graph.tasklets.get(id).depends_on.every((dependency) => statuses.get(dependency) === 'DONE'));
  if (ready.length === 0) {
    if ([...statuses.values()].every((status) => status === 'DONE')) return { next: null };
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
  const id = ready[0];
  return { next: id, criteria: { risk: graph.tasklets.get(id).risk, affinity_overlap: overlap(id), unfinished_descendants: derived.unfinishedDescendants.get(id), remaining_depth: derived.depth.get(id) } };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length < 1 || argv.length > 2) fail('usage: next-tasklet.js <sprint.md> [last-completed-tasklet-id]');
  const sprintFile = path.resolve(argv[0]);
  const statuses = parseTaskletStatuses(sprintFile);
  const graph = readTaskletGraph(sprintFile);
  const derived = validateTaskletGraph(graph, statuses);
  const result = selectNextTasklet(graph, statuses, derived, argv[1] ?? null);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

const TaskletMetadataReaders = Object.freeze({ V1: readTaskletGraph });

module.exports = { SCHEMA_VERSION, TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph, validateTaskletGraph, selectNextTasklet, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
