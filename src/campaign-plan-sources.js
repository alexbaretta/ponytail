// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-plan-sources.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPlanCandidates = scanPlanCandidates;
exports.listPlanSourceFiles = listPlanSourceFiles;
exports.linkedPlanFiles = linkedPlanFiles;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_plan_metadata_js_1 = require("./campaign-plan-metadata.js");
function isPlanFile(file) {
    return node_fs_1.default.existsSync(file) && !node_fs_1.default.lstatSync(file).isSymbolicLink() && node_fs_1.default.statSync(file).isFile();
}
function sortedDirectories(directory) {
    try {
        return node_fs_1.default.readdirSync(directory, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
    }
    catch (error) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_IO', `cannot list ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function scanPlanCandidates(repositoryRoot, campaignManagementConfigV1) {
    const planRoot = node_path_1.default.join(repositoryRoot, campaignManagementConfigV1.planRoot);
    if (!node_fs_1.default.existsSync(planRoot) || !node_fs_1.default.statSync(planRoot).isDirectory()) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_PLAN_ROOT', `configured plan root does not exist: ${campaignManagementConfigV1.planRoot}`, campaignManagementConfigV1.planRoot);
    }
    if (node_fs_1.default.lstatSync(planRoot).isSymbolicLink()) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_CONFIG_PATH', `configured plan root must not be a symbolic link: ${campaignManagementConfigV1.planRoot}`, null, campaignManagementConfigV1.planRoot);
    }
    const canonicalPlanRoot = node_fs_1.default.realpathSync(planRoot);
    if (canonicalPlanRoot !== repositoryRoot && !canonicalPlanRoot.startsWith(`${repositoryRoot}${node_path_1.default.sep}`)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_CONFIG_PATH', `configured plan root escapes the repository: ${campaignManagementConfigV1.planRoot}`, null, campaignManagementConfigV1.planRoot);
    }
    const candidates = [];
    for (const lifecycle of campaignManagementConfigV1.lifecycle.directories) {
        const lifecycleDirectory = node_path_1.default.join(planRoot, lifecycle);
        if (!node_fs_1.default.existsSync(lifecycleDirectory))
            continue;
        if (node_fs_1.default.lstatSync(lifecycleDirectory).isSymbolicLink() || !node_fs_1.default.statSync(lifecycleDirectory).isDirectory()) {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_CONFIG_PATH', `lifecycle location must be a regular directory: ${campaignManagementConfigV1.planRoot}/${lifecycle}`, null, `${campaignManagementConfigV1.planRoot}/${lifecycle}`);
        }
        for (const name of sortedDirectories(lifecycleDirectory)) {
            const planFile = node_path_1.default.join(lifecycleDirectory, name, 'plan.md');
            if (isPlanFile(planFile)) {
                candidates.push((0, campaign_plan_metadata_js_1.parseCandidate)(planFile, lifecycle, repositoryRoot));
            }
        }
    }
    if (campaignManagementConfigV1.legacyPlanLayout === 'flat') {
        const lifecycleDirectories = new Set(campaignManagementConfigV1.lifecycle.directories);
        for (const name of sortedDirectories(planRoot)) {
            if (lifecycleDirectories.has(name))
                continue;
            const planFile = node_path_1.default.join(planRoot, name, 'plan.md');
            if (isPlanFile(planFile)) {
                candidates.push((0, campaign_plan_metadata_js_1.parseCandidate)(planFile, null, repositoryRoot));
            }
        }
    }
    return candidates.sort((left, right) => {
        const leftOrder = left.lifecycle === null ? campaignManagementConfigV1.lifecycle.directories.length : campaignManagementConfigV1.lifecycle.directories.indexOf(left.lifecycle);
        const rightOrder = right.lifecycle === null ? campaignManagementConfigV1.lifecycle.directories.length : campaignManagementConfigV1.lifecycle.directories.indexOf(right.lifecycle);
        return leftOrder - rightOrder || left.relativePlanFile.localeCompare(right.relativePlanFile);
    });
}
function listPlanSourceFiles(repositoryRoot, campaignManagementConfigV1, onDiscovery) {
    const planRoot = node_path_1.default.join(repositoryRoot, campaignManagementConfigV1.planRoot);
    const sources = [];
    for (const lifecycle of campaignManagementConfigV1.lifecycle.directories) {
        const directory = node_path_1.default.join(planRoot, lifecycle);
        if (!node_fs_1.default.existsSync(directory))
            continue;
        for (const name of sortedDirectories(directory)) {
            onDiscovery?.();
            const planFile = node_path_1.default.join(directory, name, 'plan.md');
            if (isPlanFile(planFile)) {
                sources.push({
                    lifecycle,
                    relativePlanFile: node_path_1.default.relative(repositoryRoot, planFile).split(node_path_1.default.sep).join('/'),
                });
            }
        }
    }
    if (campaignManagementConfigV1.legacyPlanLayout === 'flat') {
        const lifecycleDirectories = new Set(campaignManagementConfigV1.lifecycle.directories);
        for (const name of sortedDirectories(planRoot)) {
            if (lifecycleDirectories.has(name))
                continue;
            onDiscovery?.();
            const planFile = node_path_1.default.join(planRoot, name, 'plan.md');
            if (isPlanFile(planFile)) {
                sources.push({
                    lifecycle: null,
                    relativePlanFile: node_path_1.default.relative(repositoryRoot, planFile).split(node_path_1.default.sep).join('/'),
                });
            }
        }
    }
    return sources.sort((left, right) => left.relativePlanFile.localeCompare(right.relativePlanFile));
}
function linkedPlanFiles(campaignPlan) {
    const links = [...campaignPlan.text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)];
    return links.flatMap((match) => {
        const reference = match[1];
        if (reference === undefined)
            throw new Error('campaign plan link matcher lacks its required capture');
        const target = node_path_1.default.resolve(node_path_1.default.dirname(campaignPlan.planFile), reference);
        const file = node_path_1.default.basename(target) === 'plan.md' ? target : node_path_1.default.join(target, 'plan.md');
        return node_fs_1.default.existsSync(file) ? [node_fs_1.default.realpathSync(file)] : [];
    });
}
