#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/ready-tasklets.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_VERSION = exports.readTaskletGraph = exports.TaskletMetadataReaders = exports.MAX_BATCH_TASKLETS = exports.selectReadyTaskletBatch = exports.selectReadyTasklets = exports.selectNextTasklet = exports.rankedReadyTasklets = exports.effectiveDependencies = exports.validateTaskletGraph = exports.parseTaskletStatuses = void 0;
exports.selectObligationTasklets = selectObligationTasklets;
exports.main = main;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const tasklet_statuses_js_1 = require("./tasklet-statuses.js");
const tasklet_graph_js_1 = require("./tasklet-graph.js");
const tasklet_metadata_js_1 = require("./tasklet-metadata.js");
const obligations_js_1 = require("./obligations.js");
var tasklet_statuses_js_2 = require("./tasklet-statuses.js");
Object.defineProperty(exports, "parseTaskletStatuses", { enumerable: true, get: function () { return tasklet_statuses_js_2.parseTaskletStatuses; } });
var tasklet_graph_js_2 = require("./tasklet-graph.js");
Object.defineProperty(exports, "validateTaskletGraph", { enumerable: true, get: function () { return tasklet_graph_js_2.validateTaskletGraph; } });
Object.defineProperty(exports, "effectiveDependencies", { enumerable: true, get: function () { return tasklet_graph_js_2.effectiveDependencies; } });
Object.defineProperty(exports, "rankedReadyTasklets", { enumerable: true, get: function () { return tasklet_graph_js_2.rankedReadyTasklets; } });
Object.defineProperty(exports, "selectNextTasklet", { enumerable: true, get: function () { return tasklet_graph_js_2.selectNextTasklet; } });
Object.defineProperty(exports, "selectReadyTasklets", { enumerable: true, get: function () { return tasklet_graph_js_2.selectReadyTasklets; } });
Object.defineProperty(exports, "selectReadyTaskletBatch", { enumerable: true, get: function () { return tasklet_graph_js_2.selectReadyTaskletBatch; } });
Object.defineProperty(exports, "MAX_BATCH_TASKLETS", { enumerable: true, get: function () { return tasklet_graph_js_2.MAX_BATCH_TASKLETS; } });
var tasklet_metadata_js_2 = require("./tasklet-metadata.js");
Object.defineProperty(exports, "TaskletMetadataReaders", { enumerable: true, get: function () { return tasklet_metadata_js_2.TaskletMetadataReaders; } });
Object.defineProperty(exports, "readTaskletGraph", { enumerable: true, get: function () { return tasklet_metadata_js_2.readTaskletGraph; } });
exports.SCHEMA_VERSION = 4;
function fail(message) { throw new Error(message); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function selectObligationTasklets(graph, statuses, taskletGraphDerivation, lastTasklet, obligationDocumentV1, root, planId) {
    const obligationSelection = (0, obligations_js_1.selectObligation)(obligationDocumentV1, root);
    const obligation = obligationDocumentV1.obligations.find(item => item.id === obligationSelection.selectedId);
    if (typeof planId !== 'string' || !planId)
        fail('obligation selection requires its owning plan ID');
    if (!obligation || !obligation.acceptanceGroups.includes(planId) || obligation.execution.sprintId !== graph.sprint)
        return { ...obligationSelection, taskletIds: [], plannedPaths: [] };
    const allowed = new Set(obligation.execution.taskletIds);
    if (allowed.size === 0)
        return { ...obligationSelection, taskletIds: [], plannedPaths: [] };
    switch (graph.schemaVersion) {
        case 1:
        case 2: {
            const [id] = allowed;
            if (id === undefined)
                fail('obligation tasklet scope is empty');
            if (!graph.tasklets.has(id))
                fail(`unknown obligation tasklet: ${id}`);
            fail(`tasklet exceeds obligation paths: ${id}`);
        }
        case 3:
        case 4: {
            for (const id of allowed) {
                const tasklet = graph.tasklets.get(id);
                if (!tasklet)
                    fail(`unknown obligation tasklet: ${id}`);
                if (tasklet.planned_paths.some(relative => !obligation.execution.plannedPaths.includes(relative)))
                    fail(`tasklet exceeds obligation paths: ${id}`);
            }
            const scopedStatuses = new Map([...statuses].map(([id, status]) => [id, allowed.has(id) || status === 'DONE' ? status : 'ERROR']));
            const result = (0, tasklet_graph_js_1.selectReadyTaskletBatch)(graph, scopedStatuses, taskletGraphDerivation, lastTasklet);
            const batch = result.next?.[0];
            return { ...obligationSelection, taskletIds: batch?.tasklets ?? [], plannedPaths: batch?.planned_paths ?? [] };
        }
    }
}
function readOwningPlanMetadata(planFile) {
    const blocks = node_fs_1.default.existsSync(planFile) ? [...node_fs_1.default.readFileSync(planFile, 'utf8').matchAll(/<!-- ponytail-plan-campaign\s*\n([\s\S]*?)\n-->/gu)] : [];
    if (blocks.length > 1)
        fail('owning plan contains multiple metadata blocks');
    const first = blocks[0];
    if (first === undefined)
        return null;
    const text = first[1];
    if (text === undefined)
        fail('owning plan metadata matcher lacks its required capture');
    const metadata = JSON.parse(text);
    if (!metadata)
        return null;
    if (!isRecord(metadata) || (metadata.schemaVersion !== 1 && metadata.schemaVersion !== 2 && metadata.schemaVersion !== 3))
        fail('unsupported owning plan metadata version');
    return { schemaVersion: metadata.schemaVersion, id: metadata.id, obligation_document: metadata.obligation_document };
}
function main(argv = process.argv.slice(2)) {
    const flag = argv.indexOf('--obligations');
    const positional = flag === -1 ? argv : argv.slice(0, flag);
    if (positional.length < 1 || positional.length > 2 || flag !== -1 && (argv.length !== flag + 4 || argv[flag + 2] !== '--root'))
        fail('usage: ready-tasklets.js <sprint.md> [last-completed-tasklet-id] [--obligations <document> --root <repository-root>]');
    const sprintInput = positional[0];
    if (sprintInput === undefined)
        fail('sprint file argument is absent');
    const sprintFile = node_path_1.default.resolve(sprintInput);
    const statuses = (0, tasklet_statuses_js_1.parseTaskletStatuses)(sprintFile);
    const graph = (0, tasklet_metadata_js_1.readTaskletGraph)(sprintFile);
    const taskletGraphDerivation = (0, tasklet_graph_js_1.validateTaskletGraph)(graph, statuses);
    const planFile = node_path_1.default.join(node_path_1.default.dirname(node_path_1.default.dirname(sprintFile)), 'plan.md');
    const owningPlanMetadata = readOwningPlanMetadata(planFile);
    if (owningPlanMetadata?.schemaVersion === 3 && flag === -1)
        fail('adopted plan requires its configured --obligations document and --root');
    let result;
    if (flag !== -1) {
        const rootInput = argv[flag + 3];
        const documentInput = argv[flag + 1];
        if (rootInput === undefined || documentInput === undefined)
            fail('obligation document and repository root arguments are absent');
        const root = node_fs_1.default.realpathSync(rootInput);
        const documentPath = node_fs_1.default.realpathSync(documentInput);
        if (owningPlanMetadata?.schemaVersion !== 3 || typeof owningPlanMetadata.obligation_document !== 'string' || node_fs_1.default.realpathSync(node_path_1.default.resolve(root, owningPlanMetadata.obligation_document)) !== documentPath)
            fail('obligation selector must use the configured adopted document');
        (0, obligations_js_1.inputDigest)(root, node_path_1.default.relative(root, documentPath).split(node_path_1.default.sep).join('/'));
        const obligationDocumentV1 = (0, obligations_js_1.parseObligationDocument)(node_fs_1.default.readFileSync(documentPath, 'utf8'));
        result = selectObligationTasklets(graph, statuses, taskletGraphDerivation, positional[1] ?? null, obligationDocumentV1, root, owningPlanMetadata.id);
    }
    else
        result = (0, tasklet_graph_js_1.selectReadyTasklets)(graph, statuses, taskletGraphDerivation, positional[1] ?? null);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
}
if (require.main === module) {
    try {
        main();
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    }
}
