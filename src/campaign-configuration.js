// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-configuration.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignManagementConfigReaders = exports.CampaignError = void 0;
exports.dataError = dataError;
exports.toolError = toolError;
exports.exactKeys = exactKeys;
exports.readManagementConfigV1 = readManagementConfigV1;
exports.readManagementConfig = readManagementConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MANAGEMENT_CONFIG_PATH = '.agents/config/project/management.json';
const LIFECYCLE_ROLES = ['initial', 'activeWork', 'successfulCompletion', 'deferred', 'rejected'];
class CampaignError extends Error {
    status;
    code;
    recordId;
    relativePath;
    constructor(status, code, message, recordId = null, relativePath = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.recordId = recordId;
        this.relativePath = relativePath;
    }
}
exports.CampaignError = CampaignError;
function dataError(code, message, recordId = null, relativePath = null) {
    throw new CampaignError(1, code, message, recordId, relativePath);
}
function toolError(code, message, relativePath = null) {
    throw new CampaignError(2, code, message, null, relativePath);
}
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(value, expected, label, fail = dataError) {
    if (!isRecord(value))
        fail('CAMPAIGN_SCHEMA', `${label} must be an object`);
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        fail('CAMPAIGN_SCHEMA', `${label} must contain exactly: ${wanted.join(', ')}`);
    }
}
function relativePath(value, label) {
    if (typeof value !== 'string' || !value || value.includes('\0') || node_path_1.default.isAbsolute(value) || value.includes('\\') || /[*?{}]/.test(value)) {
        dataError('CAMPAIGN_CONFIG_PATH', `${label} must be an exact relative path without glob syntax`);
    }
    if (value.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
        dataError('CAMPAIGN_CONFIG_PATH', `${label} contains an invalid path segment`);
    }
    return value;
}
function isLifecycleDirectories(value) {
    return Array.isArray(value) && value.length > 0 &&
        value.every((directory) => typeof directory === 'string' && /^[a-z][a-z0-9_]*$/.test(directory)) &&
        new Set(value).size === value.length;
}
function isLifecycleRoles(value, directories) {
    const roleDirectories = LIFECYCLE_ROLES.map(role => value[role]);
    return roleDirectories.every(directory => typeof directory === 'string' && directories.includes(directory)) &&
        new Set(roleDirectories).size === roleDirectories.length;
}
function readManagementConfigV1(value) {
    exactKeys(value, ['schemaVersion', 'managementRoot', 'planRoot', 'lifecycle', 'legacyPlanLayout'], 'management configuration');
    if (value.schemaVersion !== 1)
        dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${value.schemaVersion}`);
    const managementRoot = relativePath(value.managementRoot, 'managementRoot');
    const planRoot = relativePath(value.planRoot, 'planRoot');
    if (planRoot !== managementRoot && !planRoot.startsWith(`${managementRoot}/`)) {
        dataError('CAMPAIGN_CONFIG_PATH', 'planRoot must be within managementRoot');
    }
    exactKeys(value.lifecycle, ['directories', 'roles'], 'lifecycle configuration');
    if (!isLifecycleDirectories(value.lifecycle.directories)) {
        dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle.directories must contain unique status directory names');
    }
    exactKeys(value.lifecycle.roles, LIFECYCLE_ROLES, 'lifecycle roles');
    if (!isLifecycleRoles(value.lifecycle.roles, value.lifecycle.directories)) {
        dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle roles must map bijectively to configured directories');
    }
    if (!(value.legacyPlanLayout === 'flat' || value.legacyPlanLayout === 'none')) {
        dataError('CAMPAIGN_CONFIG_LEGACY', 'legacyPlanLayout must be flat or none');
    }
    return { schemaVersion: 1, managementRoot, planRoot,
        lifecycle: { directories: [...value.lifecycle.directories], roles: { ...value.lifecycle.roles } },
        legacyPlanLayout: value.legacyPlanLayout };
}
exports.CampaignManagementConfigReaders = Object.freeze({ V1: readManagementConfigV1 });
function parseJsonFile(filePath, code) {
    try {
        const value = JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
        return value;
    }
    catch (error) {
        if (error instanceof SyntaxError)
            dataError(code, `${filePath} is not valid JSON: ${error.message}`);
        toolError('CAMPAIGN_IO', `cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function readManagementConfig(repositoryRoot) {
    const filePath = node_path_1.default.join(repositoryRoot, MANAGEMENT_CONFIG_PATH);
    if (!node_fs_1.default.existsSync(filePath) || node_fs_1.default.lstatSync(filePath).isSymbolicLink() || !node_fs_1.default.statSync(filePath).isFile()) {
        toolError('CAMPAIGN_CONFIG_MISSING', `missing or unsafe management configuration: ${MANAGEMENT_CONFIG_PATH}`, MANAGEMENT_CONFIG_PATH);
    }
    const value = parseJsonFile(filePath, 'CAMPAIGN_CONFIG_JSON');
    if (!isRecord(value) || value.schemaVersion !== 1) {
        dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${isRecord(value) ? value.schemaVersion : undefined}`, null, MANAGEMENT_CONFIG_PATH);
    }
    return exports.CampaignManagementConfigReaders.V1(value);
}
