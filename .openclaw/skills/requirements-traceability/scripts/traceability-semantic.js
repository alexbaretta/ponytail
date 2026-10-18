// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/requirements-traceability/scripts/traceability-semantic.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceabilityGraphResponseReaders = void 0;
exports.checkTraceabilityProjectTypescript = checkTraceabilityProjectTypescript;
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const lossless_json_1 = require("./lossless-json.js");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readTraceabilityGraphResponseV1(value) {
    if (!isRecord(value) || Object.keys(value).length !== 5 || !['schemaVersion', 'checkedUnitCount', 'checkedFileCount', 'success', 'report'].every(key => Object.hasOwn(value, key)) || value.schemaVersion !== 1
        || typeof value.checkedUnitCount !== 'number' || !Number.isSafeInteger(value.checkedUnitCount) || value.checkedUnitCount < 0
        || typeof value.checkedFileCount !== 'number' || !Number.isSafeInteger(value.checkedFileCount) || value.checkedFileCount < 0
        || typeof value.success !== 'boolean' || typeof value.report !== 'string' || !value.report.trim()) {
        throw new Error('Invalid V1 traceability graph response');
    }
    return { schemaVersion: 1, checkedUnitCount: value.checkedUnitCount, checkedFileCount: value.checkedFileCount, success: value.success, report: value.report };
}
exports.TraceabilityGraphResponseReaders = { V1: readTraceabilityGraphResponseV1 };
function checkTraceabilityProjectTypescript(configuration, project, root) {
    const diagnostics = [];
    const typedPaths = new Set();
    for (const source of project.sources) {
        if (source.kind === 'markdown')
            continue;
        if (configuration.sources.some(scope => scope.locator === 'typescript' && scope.include.some(pattern => node_path_1.default.posix.matchesGlob(source.path, pattern)))) {
            typedPaths.add(source.path);
        }
        else if (/\.(?:[cm]?ts|tsx)$/u.test(source.path)) {
            diagnostics.push({ ruleId: 'traceability-typescript-configuration', severity: 'error', filePath: source.path, message: 'TypeScript source requires a semantic locator' });
        }
    }
    if (!typedPaths.size)
        return diagnostics;
    if (configuration.typescript === null) {
        diagnostics.push({ ruleId: 'traceability-typescript-configuration', severity: 'error', message: 'TypeScript source requires a configured semantic checker' });
        return diagnostics;
    }
    const units = [];
    for (const entity of project.graph.entities) {
        if (typedPaths.has(entity.path) && (entity.kind === 'implementation' || entity.kind === 'unit-test' || entity.kind === 'integration-test')) {
            units.push({ id: entity.id, kind: entity.kind, path: entity.path, line: entity.line });
        }
    }
    const request = { schemaVersion: 1, projectPath: configuration.typescript.projectPath, units };
    const result = (0, node_child_process_1.spawnSync)(process.execPath, [node_path_1.default.resolve(root, configuration.typescript.cliPath), '--traceability-graph-stdin'], {
        cwd: root, encoding: 'utf8', input: JSON.stringify(request), maxBuffer: 16 * 1024 * 1024,
    });
    let message = null;
    if (result.error)
        message = result.error.message;
    else {
        try {
            const value = (0, lossless_json_1.parse)(result.stdout, null, token => {
                if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token)))
                    throw new Error(`Unsupported graph response number: ${token}`);
                return Number(token);
            });
            const response = exports.TraceabilityGraphResponseReaders.V1(value);
            if (response.checkedUnitCount !== units.length || response.checkedFileCount !== new Set(units.map(unit => unit.path)).size) {
                message = `TSTS graph response does not cover the requested units/files: ${response.report}`;
            }
            else if (result.status !== 0 || !response.success)
                message = `TSTS exited ${result.status}: ${response.report}`;
        }
        catch (error) {
            message = `Semantic checker did not return a valid V1 graph response: ${error instanceof Error ? error.message : String(error)}; ${(result.stderr || result.stdout).trim()}`;
        }
    }
    if (message !== null)
        diagnostics.push({ ruleId: 'traceability-typescript', severity: 'error', message });
    return diagnostics;
}
