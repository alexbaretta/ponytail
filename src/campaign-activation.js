// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-activation.ts by npm run build.
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateCampaign = activateCampaign;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const CampaignGraph = __importStar(require("./campaign-graph.js"));
const campaign_report_js_1 = require("./campaign-report.js");
function markdownFiles(directory) {
    const files = [];
    for (const entry of node_fs_1.default.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = node_path_1.default.join(directory, entry.name);
        if (entry.isSymbolicLink())
            continue;
        if (entry.isDirectory())
            files.push(...markdownFiles(entryPath));
        else if (entry.isFile() && entry.name.endsWith('.md'))
            files.push(entryPath);
    }
    return files;
}
function pathWithin(filePath, directory) {
    const relative = node_path_1.default.relative(directory, filePath);
    return relative === '' || (!relative.startsWith(`..${node_path_1.default.sep}`) && relative !== '..' && !node_path_1.default.isAbsolute(relative));
}
function movedPath(filePath, sourceDirectory, destinationDirectory) {
    return pathWithin(filePath, sourceDirectory)
        ? node_path_1.default.join(destinationDirectory, node_path_1.default.relative(sourceDirectory, filePath))
        : filePath;
}
function rewriteMovedLinks(text, sourceFile, destinationFile, sourceDirectory, destinationDirectory) {
    return text.replace(/\]\(([^)]+)\)/g, (match, destination) => {
        if (!destination || destination.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(destination) || node_path_1.default.isAbsolute(destination))
            return match;
        const suffixIndex = destination.search(/[?#]/);
        const linkPath = suffixIndex === -1 ? destination : destination.slice(0, suffixIndex);
        const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex);
        const target = node_path_1.default.resolve(node_path_1.default.dirname(sourceFile), linkPath);
        const movedTarget = movedPath(target, sourceDirectory, destinationDirectory);
        if (sourceFile === destinationFile && target === movedTarget)
            return match;
        let relative = node_path_1.default.relative(node_path_1.default.dirname(destinationFile), movedTarget).split(node_path_1.default.sep).join('/');
        if (!relative.startsWith('.'))
            relative = `./${relative}`;
        return `](${relative}${suffix})`;
    });
}
function activateCampaign(repositoryRoot, campaignManagementConfigV1, input) {
    const campaignGraph = CampaignGraph.campaignGraph(repositoryRoot, input);
    const rootCampaignGraphPlan = campaignGraph.plans.find(({ id }) => id === campaignGraph.campaignId);
    if (!rootCampaignGraphPlan)
        throw new Error(`validated campaign root is absent: ${campaignGraph.campaignId}`);
    const lifecycleStatuses = {
        [campaignManagementConfigV1.lifecycle.roles.initial]: 'pending',
        [campaignManagementConfigV1.lifecycle.roles.successfulCompletion]: 'closed',
        [campaignManagementConfigV1.lifecycle.roles.deferred]: 'deferred',
        [campaignManagementConfigV1.lifecycle.roles.rejected]: 'rejected',
    };
    const campaignStatus = campaignGraph.plans.some(({ lifecycle }) => lifecycle === campaignManagementConfigV1.lifecycle.roles.activeWork)
        ? 'active' : lifecycleStatuses[rootCampaignGraphPlan.lifecycle];
    if (campaignStatus === 'active')
        return { rootPlanId: campaignGraph.campaignId, activated: false };
    if (campaignStatus !== 'pending') {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_ACTIVATE_STATUS', `campaign ${campaignGraph.campaignId} is ${campaignStatus}; only pending campaigns can be activated`, campaignGraph.campaignId, rootCampaignGraphPlan.path);
    }
    const rootPlanFile = node_path_1.default.join(repositoryRoot, rootCampaignGraphPlan.path);
    const sourceDirectory = node_path_1.default.dirname(rootPlanFile);
    const destinationDirectory = node_path_1.default.join(repositoryRoot, campaignManagementConfigV1.planRoot, campaignManagementConfigV1.lifecycle.roles.activeWork, campaignGraph.campaignId);
    if (node_fs_1.default.existsSync(destinationDirectory))
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_ACTIVATE_DESTINATION', `campaign activation destination already exists: ${node_path_1.default.relative(repositoryRoot, destinationDirectory)}`);
    const files = markdownFiles(node_path_1.default.join(repositoryRoot, campaignManagementConfigV1.managementRoot));
    const campaignActivationChanges = files.map((sourceFile) => {
        const destinationFile = movedPath(sourceFile, sourceDirectory, destinationDirectory);
        let text = node_fs_1.default.readFileSync(sourceFile, 'utf8');
        if (sourceFile === rootPlanFile) {
            const statusPattern = /^- \*\*Status:\*\* `[^`]+`$/gm;
            const matches = [...text.matchAll(statusPattern)];
            if (matches.length !== 1)
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_STATUS', 'campaign root must contain exactly one canonical status field', campaignGraph.campaignId, rootCampaignGraphPlan.path);
            text = text.replace(statusPattern, `- **Status:** \`${campaignManagementConfigV1.lifecycle.roles.activeWork}\``);
        }
        return { sourceFile, destinationFile, original: node_fs_1.default.readFileSync(sourceFile, 'utf8'),
            text: rewriteMovedLinks(text, sourceFile, destinationFile, sourceDirectory, destinationDirectory) };
    });
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(destinationDirectory), { recursive: true });
    node_fs_1.default.renameSync(sourceDirectory, destinationDirectory);
    try {
        for (const campaignActivationChange of campaignActivationChanges)
            node_fs_1.default.writeFileSync(campaignActivationChange.destinationFile, campaignActivationChange.text);
        (0, campaign_report_js_1.buildReport)(repositoryRoot, campaignManagementConfigV1, campaignGraph.campaignId);
    }
    catch (error) {
        node_fs_1.default.renameSync(destinationDirectory, sourceDirectory);
        for (const campaignActivationChange of campaignActivationChanges)
            node_fs_1.default.writeFileSync(campaignActivationChange.sourceFile, campaignActivationChange.original);
        throw error;
    }
    return { rootPlanId: campaignGraph.campaignId, activated: true };
}
