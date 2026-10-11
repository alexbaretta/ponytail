#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { parseTaskletStatuses, type TaskletStatus } from './tasklet-statuses.js';
import { validateTaskletGraph, selectReadyTasklets, selectReadyTaskletBatch, type TaskletGraphDerivation } from './tasklet-graph.js';
import { readTaskletGraph, type TaskletGraphV1, type TaskletGraphV2, type TaskletGraphV3, type TaskletGraphV4 } from './tasklet-metadata.js';
import { selectObligation, inputDigest, parseObligationDocument, type ObligationDocumentV1, type ObligationSelection } from './obligations.js';
export { parseTaskletStatuses } from './tasklet-statuses.js';
export { validateTaskletGraph, effectiveDependencies, rankedReadyTasklets, selectNextTasklet, selectReadyTasklets, selectReadyTaskletBatch, MAX_BATCH_TASKLETS } from './tasklet-graph.js';
export { TaskletMetadataReaders, readTaskletGraph } from './tasklet-metadata.js';
export const SCHEMA_VERSION = 4;
export interface ObligationTaskletSelection extends ObligationSelection { readonly taskletIds: readonly string[]; readonly plannedPaths: readonly string[] }
interface OwningPlanMetadata { readonly schemaVersion: 1 | 2 | 3; readonly id: unknown; readonly obligation_document: unknown }
function fail(message: string): never { throw new Error(message); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function selectObligationTasklets(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4,
  statuses: ReadonlyMap<string, TaskletStatus>, taskletGraphDerivation: TaskletGraphDerivation, lastTasklet: string | null,
  obligationDocumentV1: ObligationDocumentV1, root: string, planId: unknown): ObligationTaskletSelection {
  const obligationSelection: ObligationSelection = selectObligation(obligationDocumentV1, root);
  const obligation = obligationDocumentV1.obligations.find(item => item.id === obligationSelection.selectedId);
  if (typeof planId !== 'string' || !planId) fail('obligation selection requires its owning plan ID');
  if (!obligation || !obligation.acceptanceGroups.includes(planId) || obligation.execution.sprintId !== graph.sprint) return { ...obligationSelection, taskletIds: [], plannedPaths: [] };
  const allowed = new Set(obligation.execution.taskletIds);
  if (allowed.size === 0) return { ...obligationSelection, taskletIds: [], plannedPaths: [] };
  switch (graph.schemaVersion) {
    case 1:
    case 2: {
      const [id] = allowed;
      if (id === undefined) fail('obligation tasklet scope is empty');
      if (!graph.tasklets.has(id)) fail(`unknown obligation tasklet: ${id}`);
      fail(`tasklet exceeds obligation paths: ${id}`);
    }
    case 3:
    case 4: {
      for (const id of allowed) {
        const tasklet = graph.tasklets.get(id);
        if (!tasklet) fail(`unknown obligation tasklet: ${id}`);
        if (tasklet.planned_paths.some(relative => !obligation.execution.plannedPaths.includes(relative))) fail(`tasklet exceeds obligation paths: ${id}`);
      }
      const scopedStatuses = new Map<string, TaskletStatus>([...statuses].map(([id, status]) => [id, allowed.has(id) || status === 'DONE' ? status : 'ERROR']));
      const result = selectReadyTaskletBatch(graph, scopedStatuses, taskletGraphDerivation, lastTasklet);
      const batch = result.next?.[0];
      return { ...obligationSelection, taskletIds: batch?.tasklets ?? [], plannedPaths: batch?.planned_paths ?? [] };
    }
  }
}
function readOwningPlanMetadata(planFile: string): OwningPlanMetadata | null {
  const blocks = fs.existsSync(planFile) ? [...fs.readFileSync(planFile, 'utf8').matchAll(/<!-- ponytail-plan-campaign\s*\n([\s\S]*?)\n-->/gu)] : [];
  if (blocks.length > 1) fail('owning plan contains multiple metadata blocks');
  const first = blocks[0];
  if (first === undefined) return null;
  const text = first[1];
  if (text === undefined) fail('owning plan metadata matcher lacks its required capture');
  const metadata: unknown = JSON.parse(text);
  if (!metadata) return null;
  if (!isRecord(metadata) || (metadata.schemaVersion !== 1 && metadata.schemaVersion !== 2 && metadata.schemaVersion !== 3)) fail('unsupported owning plan metadata version');
  return { schemaVersion: metadata.schemaVersion, id: metadata.id, obligation_document: metadata.obligation_document };
}
export function main(argv: readonly string[] = process.argv.slice(2)): ReturnType<typeof selectReadyTasklets> | ObligationTaskletSelection {
  const flag = argv.indexOf('--obligations');
  const positional = flag === -1 ? argv : argv.slice(0, flag);
  if (positional.length < 1 || positional.length > 2 || flag !== -1 && (argv.length !== flag + 4 || argv[flag + 2] !== '--root')) fail('usage: ready-tasklets.js <sprint.md> [last-completed-tasklet-id] [--obligations <document> --root <repository-root>]');
  const sprintInput = positional[0];
  if (sprintInput === undefined) fail('sprint file argument is absent');
  const sprintFile = path.resolve(sprintInput);
  const statuses = parseTaskletStatuses(sprintFile);
  const graph = readTaskletGraph(sprintFile);
  const taskletGraphDerivation: TaskletGraphDerivation = validateTaskletGraph(graph, statuses);
  const planFile = path.join(path.dirname(path.dirname(sprintFile)), 'plan.md');
  const owningPlanMetadata: OwningPlanMetadata | null = readOwningPlanMetadata(planFile);
  if (owningPlanMetadata?.schemaVersion === 3 && flag === -1) fail('adopted plan requires its configured --obligations document and --root');
  let result: ReturnType<typeof selectReadyTasklets> | ObligationTaskletSelection;
  if (flag !== -1) {
    const rootInput = argv[flag + 3];
    const documentInput = argv[flag + 1];
    if (rootInput === undefined || documentInput === undefined) fail('obligation document and repository root arguments are absent');
    const root = fs.realpathSync(rootInput);
    const documentPath = fs.realpathSync(documentInput);
    if (owningPlanMetadata?.schemaVersion !== 3 || typeof owningPlanMetadata.obligation_document !== 'string' || fs.realpathSync(path.resolve(root, owningPlanMetadata.obligation_document)) !== documentPath) fail('obligation selector must use the configured adopted document');
    inputDigest(root, path.relative(root, documentPath).split(path.sep).join('/'));
    const obligationDocumentV1: ObligationDocumentV1 = parseObligationDocument(fs.readFileSync(documentPath, 'utf8'));
    result = selectObligationTasklets(graph, statuses, taskletGraphDerivation, positional[1] ?? null, obligationDocumentV1, root, owningPlanMetadata.id);
  } else result = selectReadyTasklets(graph, statuses, taskletGraphDerivation, positional[1] ?? null);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}
if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
