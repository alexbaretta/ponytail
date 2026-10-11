// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/sprint-metadata.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprintMetadataReaders = exports.METADATA_MARKER = void 0;
exports.readSprintMetadataV1 = readSprintMetadataV1;
exports.readSprintMetadataV2 = readSprintMetadataV2;
exports.readSprintMetadataV3 = readSprintMetadataV3;
exports.parseSprintFile = parseSprintFile;
exports.readSprints = readSprints;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.METADATA_MARKER = 'ponytail-plan-sprint';
function fail(message) { throw new Error(message); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, expected, label) {
    if (!isRecord(value))
        fail(`${label} must be an object`);
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index]))
        fail(`${label} must contain exactly: ${wanted.join(', ')}`);
}
function isStrings(value) { return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0); }
function strings(value, label) {
    if (!isStrings(value))
        fail(`${label} must be an array of nonempty strings`);
    if (new Set(value).size !== value.length)
        fail(`${label} must not contain duplicates`);
    return value;
}
function relativePath(value, label) {
    if (!value || value.includes('\\') || /[*?{}]/.test(value))
        fail(`${label} must be a relative path without glob syntax`);
    if (value.split('/').some(segment => !segment || segment === '.' || segment === '..'))
        fail(`${label} contains an invalid path segment`);
    return value;
}
function metadataBlock(filePath, text) {
    const marker = new RegExp(`^<!--\\s*${exports.METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
    const blocks = [...text.matchAll(marker)];
    if (blocks.length !== 1)
        fail(`${filePath} must contain exactly one ${exports.METADATA_MARKER} metadata block`);
    const block = blocks[0]?.[1];
    if (block === undefined)
        fail('sprint metadata matcher lacks its required capture');
    try {
        const value = JSON.parse(block);
        return value;
    }
    catch (error) {
        fail(`${filePath} metadata is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function isPlanningStatus(value) {
    return value === 'STUB' || value === 'PLANNING' || value === 'READY_FOR_REVIEW' || value === 'APPROVED' || value === 'ERROR';
}
function isExecutionStatus(value) {
    return value === 'PENDING' || value === 'IN_PROGRESS' || value === 'READY_FOR_REVIEW' || value === 'DONE' || value === 'ERROR';
}
function commonMetadata(filePath, metadata, schemaVersion) {
    exactKeys(metadata, ['schemaVersion', 'id', 'planning', 'execution'], 'sprint metadata');
    if (metadata.schemaVersion !== schemaVersion)
        fail(`${filePath} has unsupported schemaVersion: ${metadata.schemaVersion}`);
    const expectedId = node_path_1.default.basename(filePath, '.md');
    if (metadata.id !== expectedId)
        fail(`${filePath} metadata id must be ${expectedId}`);
    exactKeys(metadata.planning, ['status', 'depends_on', 'scope_roots'], 'planning metadata');
    if (!isPlanningStatus(metadata.planning.status))
        fail(`${filePath} has invalid planning status`);
    const sprintPlanning = { status: metadata.planning.status,
        depends_on: strings(metadata.planning.depends_on, 'planning.depends_on'),
        scope_roots: strings(metadata.planning.scope_roots, 'planning.scope_roots').map(value => relativePath(value, 'scope root')) };
    return { id: expectedId, planning: sprintPlanning, execution: metadata.execution, filePath };
}
function executionFields(filePath, execution) {
    if (!isExecutionStatus(execution.status))
        fail(`${filePath} has invalid execution status`);
    return { status: execution.status, depends_on: strings(execution.depends_on, 'execution.depends_on') };
}
function executionV1(filePath, value) {
    exactKeys(value, ['status', 'depends_on', 'planned_paths'], 'execution metadata');
    return { ...executionFields(filePath, value), planned_paths: strings(value.planned_paths, 'execution.planned_paths').map(candidate => relativePath(candidate, 'planned path')) };
}
function executionReviewed(filePath, value) {
    exactKeys(value, ['status', 'depends_on', 'tasklets_reviewed'], 'execution metadata');
    const sprintExecutionFields = executionFields(filePath, value);
    if (typeof value.tasklets_reviewed !== 'boolean')
        fail(`${filePath} execution.tasklets_reviewed must be Boolean`);
    return { ...sprintExecutionFields, tasklets_reviewed: value.tasklets_reviewed };
}
function readSprintMetadataV1(filePath, metadata) {
    const commonSprintInput = commonMetadata(filePath, metadata, 1);
    return { ...commonSprintInput, schemaVersion: 1, execution: commonSprintInput.execution === null ? null : executionV1(filePath, commonSprintInput.execution) };
}
function reviewedSprint(filePath, metadata, version) {
    const commonSprintInput = commonMetadata(filePath, metadata, version);
    return { ...commonSprintInput, execution: commonSprintInput.execution === null ? null : executionReviewed(filePath, commonSprintInput.execution) };
}
function readSprintMetadataV2(filePath, metadata) { return { schemaVersion: 2, ...reviewedSprint(filePath, metadata, 2) }; }
function readSprintMetadataV3(filePath, metadata) { return { schemaVersion: 3, ...reviewedSprint(filePath, metadata, 3) }; }
exports.SprintMetadataReaders = Object.freeze({ V1: readSprintMetadataV1, V2: readSprintMetadataV2, V3: readSprintMetadataV3 });
function parseSprintFile(filePath, text = node_fs_1.default.readFileSync(filePath, 'utf8')) {
    const metadata = metadataBlock(filePath, text);
    const version = isRecord(metadata) ? metadata.schemaVersion : undefined;
    switch (version) {
        case 1: return readSprintMetadataV1(filePath, metadata);
        case 2: return readSprintMetadataV2(filePath, metadata);
        case 3: return readSprintMetadataV3(filePath, metadata);
        default: fail(`${filePath} has unsupported schemaVersion: ${version}`);
    }
}
function readSprints(planDirectory) {
    const sprintDirectory = node_path_1.default.join(planDirectory, 'sprints');
    if (!node_fs_1.default.existsSync(sprintDirectory) || !node_fs_1.default.statSync(sprintDirectory).isDirectory())
        fail(`sprint directory does not exist: ${sprintDirectory}`);
    const files = node_fs_1.default.readdirSync(sprintDirectory).filter(name => /^S\d+\.md$/.test(name) && node_fs_1.default.statSync(node_path_1.default.join(sprintDirectory, name)).isFile())
        .sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
    if (files.length === 0)
        fail(`no SNN.md sprint files found in ${sprintDirectory}`);
    const sprints = files.map(name => parseSprintFile(node_path_1.default.join(sprintDirectory, name)));
    const ids = new Set();
    const ordinals = new Set();
    for (const sprint of sprints) {
        if (ids.has(sprint.id))
            fail(`duplicate sprint id: ${sprint.id}`);
        ids.add(sprint.id);
        const ordinal = Number(sprint.id.slice(1));
        if (ordinals.has(ordinal))
            fail(`duplicate numeric sprint order: ${ordinal}`);
        ordinals.add(ordinal);
    }
    if (sprints.every((sprint) => sprint.schemaVersion === 1))
        return sprints;
    if (sprints.every((sprint) => sprint.schemaVersion === 2))
        return sprints;
    if (sprints.every((sprint) => sprint.schemaVersion === 3))
        return sprints;
    fail('plan must not mix physical sprint schema versions');
}
