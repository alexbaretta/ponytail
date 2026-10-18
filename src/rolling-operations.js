// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-operations.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRollingCommand = executeRollingCommand;
exports.runRollingOperationCli = runRollingOperationCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const rolling_cli_registry_js_1 = require("./rolling-cli-registry.js");
class RollingLegacyInspectionError extends Error {
    exitCode;
    constructor(exitCode, message) {
        super(message);
        this.exitCode = exitCode;
    }
}
function readJson(text) { return JSON.parse(text); }
async function executeRollingCommand(root, command, value, signal) {
    if (command !== 'legacy')
        throw new Error(`campaign: retired operation ${command}; use native host tools and Git`);
    if (!node_path_1.default.isAbsolute(root))
        throw new Error('campaign: absolute invoking root required');
    if (value === null || typeof value !== 'object' || Array.isArray(value) || !('command' in value)
        || Object.keys(value).some(key => key !== 'command' && key !== 'arguments'))
        throw new Error('campaign: expected historical inspection command and optional arguments');
    const inspection = value.command;
    if (typeof inspection !== 'string' || !['validate', 'report', 'list', 'status', 'reservation-audit'].includes(inspection))
        throw new Error('campaign: only read-only historical inspection is supported');
    const arguments_ = 'arguments' in value ? value.arguments : [];
    if (!Array.isArray(arguments_) || !arguments_.every((item) => typeof item === 'string' && item.length > 0))
        throw new Error('campaign: arguments must be a string array');
    signal?.throwIfAborted();
    const result = (0, node_child_process_1.spawnSync)(process.execPath, [node_path_1.default.join(__dirname, 'campaign-census.js'), inspection, ...arguments_], { cwd: root, encoding: 'utf8' });
    if (result.error || result.status !== 0)
        throw new RollingLegacyInspectionError(result.status ?? 1, result.error?.message || result.stderr.trim() || 'historical campaign inspection failed');
    return { command: 'legacy', result: result.stdout };
}
async function runRollingOperationCli(argv) {
    const [command, ...arguments_] = argv;
    if (command === undefined || command === '--help') {
        process.stdout.write((0, rolling_cli_registry_js_1.rollingCampaignHelp)());
        return;
    }
    if (!(0, rolling_cli_registry_js_1.isRollingCommandName)(command))
        throw new Error(`rolling campaign: unknown command ${command}`);
    const definition = rolling_cli_registry_js_1.rollingCommandDefinitions.find(item => item.name === command);
    if (!definition?.cli)
        throw new Error(`rolling campaign: unknown or retired CLI command ${command}; session operations belong to the coordinator host tools`);
    if (arguments_.length === 1 && arguments_[0] === '--help') {
        process.stdout.write((0, rolling_cli_registry_js_1.rollingCampaignHelp)(command));
        return;
    }
    const input = {};
    let jsonOutput = false;
    for (let index = 0; index < arguments_.length; index++) {
        const flag = arguments_[index];
        if (flag === '--json') {
            if (jsonOutput)
                throw new Error('rolling campaign: repeated --json');
            jsonOutput = true;
            continue;
        }
        const field = definition.fields.find(item => `--${item.name}` === flag);
        if (!field || Object.hasOwn(input, field.name))
            throw new Error(`rolling campaign: unknown or repeated argument ${flag}`);
        const value = arguments_[++index];
        if (value === undefined || value.startsWith('--'))
            throw new Error(`rolling campaign: missing value for ${flag}`);
        input[field.name] = field.kind === 'json' ? readJson(value.startsWith('@') ? node_fs_1.default.readFileSync(value.slice(1), 'utf8') : value) : value;
    }
    const abortController = new AbortController();
    const cancel = () => abortController.abort();
    process.once('SIGINT', cancel);
    try {
        const rollingOperationResponse = await executeRollingCommand(node_fs_1.default.realpathSync(process.cwd()), command, input, abortController.signal);
        process.stdout.write(JSON.stringify(rollingOperationResponse) + '\n');
    }
    finally {
        process.removeListener('SIGINT', cancel);
        if (abortController.signal.aborted)
            process.exitCode = 130;
    }
}
if (require.main === module)
    runRollingOperationCli(process.argv.slice(2)).catch((error) => {
        if (process.exitCode === 130)
            return;
        process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
        process.exitCode = error instanceof RollingLegacyInspectionError ? error.exitCode : 1;
    });
