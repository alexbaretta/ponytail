#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');

const { parseTaskletStatuses } = require('./tasklet-statuses');
const { validateTaskletGraph, effectiveDependencies } = require('./tasklet-graph');
const { TaskletMetadataReaders, readTaskletGraph } = require('./tasklet-metadata');
const SCHEMA_VERSION = 4;
const MAX_BATCH_TASKLETS = 16;

function fail(message) { throw new Error(message); }

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
  if (graph.schemaVersion >= 3) return selectReadyTaskletBatch(graph, statuses, derived, lastTasklet);
  const ranked = rankedReadyTasklets(graph, statuses, derived, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const [id, criteria] = ranked[0];
  return { next: [id], criteria: { [id]: criteria } };
}

function selectReadyTaskletBatch(graph, statuses, derived, lastTasklet = null) {
  const ranked = rankedReadyTasklets(graph, statuses, derived, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const validationTasklets = new Set([...graph.features.values()].map(({ validation_tasklet: id }) => id));
  const [root, rootCriteria] = ranked[0];
  const batch = {
    tasklets: [root],
    planned_paths: [...graph.tasklets.get(root).planned_paths],
  };
  const criteria = { [root]: rootCriteria };
  const completed = new Set([...statuses].filter(([, status]) => status === 'DONE').map(([id]) => id));
  completed.add(root);
  while (batch.tasklets.length < MAX_BATCH_TASKLETS) {
    const next = [...graph.tasklets.keys()].filter((id) => {
      if (statuses.get(id) !== 'PENDING' || completed.has(id) || validationTasklets.has(id)) return false;
      const dependencies = effectiveDependencies(graph, id);
      return dependencies.some((dependency) => completed.has(dependency) && batch.tasklets.includes(dependency))
        && dependencies.every((dependency) => completed.has(dependency));
    }).sort((left, right) => left.localeCompare(right))[0];
    if (!next) break;
    batch.tasklets.push(next);
    completed.add(next);
    for (const candidate of graph.tasklets.get(next).planned_paths) {
      if (!batch.planned_paths.includes(candidate)) batch.planned_paths.push(candidate);
    }
    criteria[next] = {
      risk: graph.tasklets.get(next).risk,
      affinity_overlap: 0,
      unfinished_descendants: derived.unfinishedDescendants.get(next),
      remaining_depth: derived.depth.get(next),
    };
  }
  return { next: [batch], criteria };
}
function selectObligationTasklets(graph, statuses, derived, lastTasklet, obligationDocument, root, planId) {
  const { selectObligation } = require('./obligations');
  const selection = selectObligation(obligationDocument, root);
  const obligation = obligationDocument.obligations.find(obligation => obligation.id === selection.selectedId);
  if (typeof planId !== 'string' || !planId) fail('obligation selection requires its owning plan ID');
  if (!obligation || !obligation.acceptanceGroups.includes(planId) || obligation.execution.sprintId !== graph.sprint) return { ...selection, taskletIds: [], plannedPaths: [] };
  const allowed = new Set(obligation.execution.taskletIds);
  if (allowed.size === 0) return { ...selection, taskletIds: [], plannedPaths: [] };
  for (const id of allowed) {
    const tasklet = graph.tasklets.get(id);
    if (!tasklet) fail(`unknown obligation tasklet: ${id}`);
    if (graph.schemaVersion < 3 || tasklet.planned_paths.some(relative => !obligation.execution.plannedPaths.includes(relative))) fail(`tasklet exceeds obligation paths: ${id}`);
  }
  const scopedStatuses = new Map([...statuses].map(([id, status]) => [id, allowed.has(id) || status === 'DONE' ? status : 'ERROR']));
  const result = selectReadyTasklets(graph, scopedStatuses, derived, lastTasklet);
  const batch = result.next?.[0];
  return { ...selection, taskletIds: batch?.tasklets ?? [], plannedPaths: batch?.planned_paths ?? [] };
}

function main(argv = process.argv.slice(2)) {
  const flag = argv.indexOf('--obligations');
  const positional = flag === -1 ? argv : argv.slice(0, flag);
  if (positional.length < 1 || positional.length > 2 || flag !== -1 && (argv.length !== flag + 4 || argv[flag + 2] !== '--root')) fail('usage: ready-tasklets.js <sprint.md> [last-completed-tasklet-id] [--obligations <document> --root <repository-root>]');
  const sprintFile = path.resolve(positional[0]);
  const statuses = parseTaskletStatuses(sprintFile);
  const graph = readTaskletGraph(sprintFile);
  const derived = validateTaskletGraph(graph, statuses);
  const planFile = path.join(path.dirname(path.dirname(sprintFile)), 'plan.md');
  const blocks = fs.existsSync(planFile) ? [...fs.readFileSync(planFile, 'utf8').matchAll(/<!-- ponytail-plan-campaign\s*\n([\s\S]*?)\n-->/gu)] : [];
  if (blocks.length > 1) fail('owning plan contains multiple metadata blocks');
  const metadata = blocks.length ? JSON.parse(blocks[0][1]) : null;
  if (metadata && ![1, 2, 3].includes(metadata.schemaVersion)) fail('unsupported owning plan metadata version');
  if (metadata?.schemaVersion === 3 && flag === -1) fail('adopted plan requires its configured --obligations document and --root');
  let result;
  if (flag !== -1) {
    const root = fs.realpathSync(argv[flag + 3]);
    const documentPath = fs.realpathSync(argv[flag + 1]);
    if (metadata?.schemaVersion !== 3 || fs.realpathSync(path.resolve(root, metadata.obligation_document)) !== documentPath) fail('obligation selector must use the configured adopted document');
    const { inputDigest, parseObligationDocument } = require('./obligations');
    inputDigest(root, path.relative(root, documentPath).split(path.sep).join('/'));
    const obligationDocument = parseObligationDocument(fs.readFileSync(documentPath, 'utf8'));
    result = selectObligationTasklets(graph, statuses, derived, positional[1] ?? null, obligationDocument, root, metadata.id);
  } else result = selectReadyTasklets(graph, statuses, derived, positional[1] ?? null);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

module.exports = { SCHEMA_VERSION, MAX_BATCH_TASKLETS, TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph, validateTaskletGraph, effectiveDependencies, rankedReadyTasklets, selectNextTasklet, selectReadyTasklets, selectReadyTaskletBatch, selectObligationTasklets, main };

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
