#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/ready-sprints.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_VERSION = exports.validateV3PathOwnership = exports.validatePathOwnership = exports.validateDependencies = exports.readSprints = exports.parseSprintFile = exports.SprintMetadataReaders = exports.METADATA_MARKER = void 0;
exports.isV1Sprints = isV1Sprints;
exports.isV3Sprints = isV3Sprints;
exports.selectPlanningReadySprints = selectPlanningReadySprints;
exports.selectPlanningReviewableSprints = selectPlanningReviewableSprints;
exports.validateCheckpointOrder = validateCheckpointOrder;
exports.validateDependencyExecutionOrder = validateDependencyExecutionOrder;
exports.selectExecutionReadySprints = selectExecutionReadySprints;
exports.selectExecutionRunnableSprints = selectExecutionRunnableSprints;
exports.selectExecutionReviewableSprints = selectExecutionReviewableSprints;
exports.main = main;
const node_path_1 = __importDefault(require("node:path"));
const sprint_graph_js_1 = require("./sprint-graph.js");
const sprint_metadata_js_1 = require("./sprint-metadata.js");
var sprint_metadata_js_2 = require("./sprint-metadata.js");
Object.defineProperty(exports, "METADATA_MARKER", { enumerable: true, get: function () { return sprint_metadata_js_2.METADATA_MARKER; } });
Object.defineProperty(exports, "SprintMetadataReaders", { enumerable: true, get: function () { return sprint_metadata_js_2.SprintMetadataReaders; } });
Object.defineProperty(exports, "parseSprintFile", { enumerable: true, get: function () { return sprint_metadata_js_2.parseSprintFile; } });
Object.defineProperty(exports, "readSprints", { enumerable: true, get: function () { return sprint_metadata_js_2.readSprints; } });
var sprint_graph_js_2 = require("./sprint-graph.js");
Object.defineProperty(exports, "validateDependencies", { enumerable: true, get: function () { return sprint_graph_js_2.validateDependencies; } });
Object.defineProperty(exports, "validatePathOwnership", { enumerable: true, get: function () { return sprint_graph_js_2.validatePathOwnership; } });
Object.defineProperty(exports, "validateV3PathOwnership", { enumerable: true, get: function () { return sprint_graph_js_2.validateV3PathOwnership; } });
exports.SCHEMA_VERSION = 3;
function fail(message) { throw new Error(message); }
function dependencySprint(sprintById, id) {
    const sprint = sprintById.get(id);
    if (sprint === undefined)
        fail(`unknown sprint dependency: ${id}`);
    return sprint;
}
function isV1Sprints(sprints) { return sprints[0]?.schemaVersion === 1; }
function isV2Sprints(sprints) { return sprints[0]?.schemaVersion === 2; }
function isV3Sprints(sprints) { return sprints[0]?.schemaVersion === 3; }
function selectPlanningReadySprints(sprints, sprintById) {
    const sprint = sprints.find((candidate) => candidate.planning.status === 'STUB'
        && candidate.planning.depends_on.every((id) => dependencySprint(sprintById, id).planning.status === 'APPROVED'));
    return sprint ? [sprint.id] : [];
}
function selectPlanningReviewableSprints(sprints, sprintById) {
    const sprint = sprints.find((candidate) => candidate.planning.status === 'READY_FOR_REVIEW'
        && candidate.execution === null
        && candidate.planning.depends_on.every((id) => dependencySprint(sprintById, id).planning.status === 'APPROVED'));
    return sprint ? [sprint.id] : [];
}
function selectExecutionReadySprintsV1(sprints, sprintById) {
    const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
        && candidate.execution?.status === 'PENDING'
        && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
    return sprint ? [sprint.id] : [];
}
function validateCheckpointOrder(sprints) {
    let unfinished = null;
    for (const sprint of sprints) {
        if (unfinished && sprint.execution && sprint.execution.status !== 'PENDING')
            fail(`sprint ${sprint.id} advanced before unfinished predecessor ${unfinished}`);
        if (!unfinished && sprint.execution?.status !== 'DONE')
            unfinished = sprint.id;
    }
}
function validateDependencyExecutionOrder(sprints, sprintById) {
    for (const sprint of sprints) {
        if (!sprint.execution || sprint.execution.status === 'PENDING')
            continue;
        const unfinished = sprint.execution.depends_on.find((id) => dependencySprint(sprintById, id).execution?.status !== 'DONE');
        if (unfinished)
            fail(`sprint ${sprint.id} advanced before unfinished dependency ${unfinished}`);
    }
}
function selectExecutionReadySprintsV2(sprints, sprintById) {
    validateCheckpointOrder(sprints);
    const sprint = sprints.find(({ execution }) => execution?.status !== 'DONE');
    if (!sprint || sprint.planning.status !== 'APPROVED' || sprint.execution?.status !== 'PENDING')
        return [];
    if (!sprint.execution.tasklets_reviewed)
        fail(`sprint ${sprint.id} tasklets must be reviewed before execution`);
    return sprint.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE') ? [sprint.id] : [];
}
function selectExecutionSprintsV3(sprints, sprintById, status) {
    validateDependencyExecutionOrder(sprints, sprintById);
    const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
        && candidate.execution?.status === status
        && candidate.execution.tasklets_reviewed
        && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
    return sprint ? [sprint.id] : [];
}
function selectExecutionReadySprints(sprints, sprintById) {
    if (isV1Sprints(sprints))
        return selectExecutionReadySprintsV1(sprints, sprintById);
    if (isV2Sprints(sprints))
        return selectExecutionReadySprintsV2(sprints, sprintById);
    return selectExecutionSprintsV3(sprints, sprintById, 'PENDING');
}
function selectExecutionRunnableSprints(sprints, sprintById) {
    if (!isV3Sprints(sprints))
        return selectExecutionReadySprints(sprints, sprintById);
    const status = sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'PENDING';
    return selectExecutionSprintsV3(sprints, sprintById, status);
}
function selectExecutionReviewableSprints(sprints, sprintById) {
    if (!isV3Sprints(sprints))
        return [];
    validateDependencyExecutionOrder(sprints, sprintById);
    if (sprints.some(({ execution }) => execution?.status === 'IN_PROGRESS'))
        return [];
    const sprint = sprints.find((candidate) => candidate.planning.status === 'APPROVED'
        && candidate.execution?.status === 'PENDING'
        && !candidate.execution.tasklets_reviewed
        && candidate.execution.depends_on.every((id) => dependencySprint(sprintById, id).execution?.status === 'DONE'));
    return sprint ? [sprint.id] : [];
}
function main(argv = process.argv.slice(2)) {
    const operation = argv[0];
    const directoryInput = argv[1];
    if (argv.length !== 2 || (operation !== 'planning' && operation !== 'execution') || directoryInput === undefined)
        fail('usage: ready-sprints.js <planning|execution> <plan-directory>');
    const planDirectory = node_path_1.default.resolve(directoryInput);
    const sprints = (0, sprint_metadata_js_1.readSprints)(planDirectory);
    const sprintById = (0, sprint_graph_js_1.validateDependencies)(sprints);
    if (operation === 'execution' && isV1Sprints(sprints))
        (0, sprint_graph_js_1.validatePathOwnership)(sprints, sprintById);
    if (operation === 'execution' && isV3Sprints(sprints))
        (0, sprint_graph_js_1.validateV3PathOwnership)(sprints, sprintById);
    const result = operation === 'planning' ? selectPlanningReadySprints(sprints, sprintById) : selectExecutionReadySprints(sprints, sprintById);
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
