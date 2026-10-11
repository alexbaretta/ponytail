#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */

const fs = require('node:fs');
const path = require('node:path');

const { parseTaskletStatuses } = require('./tasklet-statuses');
const { validateTaskletGraph, effectiveDependencies, rankedReadyTasklets, selectNextTasklet, selectReadyTasklets, selectReadyTaskletBatch, MAX_BATCH_TASKLETS } = require('./tasklet-graph');
const { TaskletMetadataReaders, readTaskletGraph } = require('./tasklet-metadata');
const SCHEMA_VERSION = 4;

function fail(message) { throw new Error(message); }

// Traceability: implements REQ-OBLIGATION-PRIORITY
// Traceability: implements REQ-OBLIGATION-ASSIGNMENT
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
