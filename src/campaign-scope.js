// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-scope.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInputPlan = resolveInputPlan;
exports.validateCampaignReference = validateCampaignReference;
exports.readAncestors = readAncestors;
exports.discoverCampaign = discoverCampaign;
exports.resolveCampaignRoot = resolveCampaignRoot;
exports.resolveCampaignScope = resolveCampaignScope;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_plan_metadata_js_1 = require("./campaign-plan-metadata.js");
const campaign_plan_sources_js_1 = require("./campaign-plan-sources.js");
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function candidateMetadataField(campaignPlanCandidate, field) {
    const metadata = campaignPlanCandidate.metadata;
    return isRecord(metadata) ? metadata[field] : undefined;
}
function obligationDocument(campaignPlan) {
    return campaignPlan.schemaVersion === 3 ? campaignPlan.obligationDocument : undefined;
}
function resolveInputPlan(input, repositoryRoot, campaignManagementConfigV1, candidates) {
    if (input === undefined) {
        const activeCandidates = candidates.filter((candidate) => (candidate.lifecycle === campaignManagementConfigV1.lifecycle.roles.activeWork && candidate.blocks.length !== 0));
        if (activeCandidates.length === 0)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_ACTIVE_MISSING', 'no managed plan is in the configured active-work lifecycle');
        const rootsByPath = new Map();
        for (const candidate of activeCandidates) {
            const { root } = readAncestors(candidates, candidate);
            rootsByPath.set(root.planFile, root);
        }
        if (rootsByPath.size !== 1) {
            const rootIds = [...rootsByPath.values()].map((plan) => plan.id).sort();
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_ACTIVE_AMBIGUOUS', `multiple campaigns contain active plans: ${rootIds.join(', ')}`);
        }
        const [root] = rootsByPath.values();
        if (root === undefined)
            throw new Error('active campaign root is absent');
        const candidate = candidates.find(item => item.planFile === root.planFile);
        if (candidate === undefined)
            throw new Error('active campaign candidate is absent');
        return {
            candidate,
            invocationInput: '',
        };
    }
    const parts = input && !input.includes('\\') ? input.split('/') : [];
    const planName = parts.length === 1 && !['.', '..', 'plan.md'].includes(input)
        ? input
        : parts.length === 2 && parts[0] !== undefined && !['.', '..'].includes(parts[0]) && parts[1] === 'plan.md'
            ? parts[0]
            : null;
    if (planName !== null) {
        const matches = candidates.filter((candidate) => node_path_1.default.basename(node_path_1.default.dirname(candidate.planFile)) === planName);
        if (matches.length === 0)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_INPUT', `plan name does not exist: ${planName}`);
        if (matches.length > 1)
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_INPUT_AMBIGUOUS', `plan name exists in multiple lifecycle locations: ${planName}`, planName);
        const candidate = matches[0];
        if (candidate === undefined)
            throw new Error('selected campaign candidate is absent');
        return { candidate, invocationInput: input };
    }
    let inputPath;
    try {
        inputPath = node_fs_1.default.realpathSync(node_path_1.default.resolve(input));
    }
    catch (error) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
    }
    let planFile = inputPath;
    try {
        if (node_fs_1.default.statSync(inputPath).isDirectory())
            planFile = node_path_1.default.join(inputPath, 'plan.md');
    }
    catch (error) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
    }
    if (node_path_1.default.basename(planFile) !== 'plan.md' || !node_fs_1.default.existsSync(planFile) || node_fs_1.default.lstatSync(planFile).isSymbolicLink() || !node_fs_1.default.statSync(planFile).isFile()) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_INPUT', 'input must be a regular non-symlink plan directory or plan.md');
    }
    const relative = node_path_1.default.relative(repositoryRoot, planFile).split(node_path_1.default.sep).join('/');
    if (relative.startsWith('../') || node_path_1.default.isAbsolute(relative) || !relative.startsWith(`${campaignManagementConfigV1.planRoot}/`)) {
        (0, campaign_configuration_js_1.toolError)('CAMPAIGN_INPUT', `input is outside configured plan root: ${input}`);
    }
    const candidate = candidates.find((item) => item.planFile === planFile);
    if (!candidate)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_INPUT_LAYOUT', 'input is not in a supported managed plan layout', null, relative);
    return {
        candidate,
        invocationInput: node_path_1.default.relative(repositoryRoot, inputPath).split(node_path_1.default.sep).join('/'),
    };
}
function validateCampaignReference(plan, parent) {
    const planFile = node_fs_1.default.realpathSync(plan.planFile);
    const found = (0, campaign_plan_sources_js_1.linkedPlanFiles)(parent).includes(planFile);
    if (!found)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_MEMBER_LINK', `campaign plan ${parent.id} must link to member plan ${plan.id}`, plan.id, plan.relativePlanFile);
}
function readAncestors(candidates, candidate) {
    const selected = (0, campaign_plan_metadata_js_1.readManagedPlan)(candidate);
    const membersByPath = new Map([[selected.planFile, selected]]);
    let current = selected;
    const ancestorIds = new Set([current.id]);
    while (current.parentPlanId !== null) {
        const matches = candidates.filter((item) => candidateMetadataField(item, 'id') === current.parentPlanId);
        if (matches.length === 0)
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PARENT_MISSING', `missing parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
        if (matches.length > 1)
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PARENT_AMBIGUOUS', `ambiguous parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
        const parentCandidate = matches[0];
        if (parentCandidate === undefined)
            throw new Error('campaign parent candidate is absent');
        const parent = (0, campaign_plan_metadata_js_1.readManagedPlan)(parentCandidate);
        if (ancestorIds.has(parent.id))
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PARENT_CYCLE', `parent cycle reaches ${parent.id}`, current.id, current.relativePlanFile);
        validateCampaignReference(current, parent);
        ancestorIds.add(parent.id);
        membersByPath.set(parent.planFile, parent);
        current = parent;
    }
    return { root: current, selected, membersByPath };
}
function discoverCampaign(repositoryRoot, campaignManagementConfigV1, input) {
    const candidates = (0, campaign_plan_sources_js_1.scanPlanCandidates)(repositoryRoot, campaignManagementConfigV1);
    const resolvedInputPlan = resolveInputPlan(input, repositoryRoot, campaignManagementConfigV1, candidates);
    const { root, selected, membersByPath } = readAncestors(candidates, resolvedInputPlan.candidate);
    const memberIds = new Map([...membersByPath.values()].map((plan) => [plan.id, plan.planFile]));
    let changed = true;
    while (changed) {
        changed = false;
        for (const candidate of candidates) {
            const parentId = candidateMetadataField(candidate, 'parent_plan_id');
            if (membersByPath.has(candidate.planFile) || typeof parentId !== 'string' || !memberIds.has(parentId))
                continue;
            const child = (0, campaign_plan_metadata_js_1.readManagedPlan)(candidate);
            const existingPath = memberIds.get(child.id);
            if (existingPath && existingPath !== child.planFile) {
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_ID_DUPLICATE', `duplicate campaign member ID: ${child.id}`, child.id, child.relativePlanFile);
            }
            const parentPath = child.parentPlanId === null ? undefined : memberIds.get(child.parentPlanId);
            const parent = parentPath === undefined ? undefined : membersByPath.get(parentPath);
            if (parent === undefined)
                throw new Error('campaign member parent is absent');
            validateCampaignReference(child, parent);
            membersByPath.set(child.planFile, child);
            memberIds.set(child.id, child.planFile);
            changed = true;
        }
    }
    const plans = [...membersByPath.values()].sort((left, right) => (campaignManagementConfigV1.lifecycle.directories.indexOf(left.lifecycle) - campaignManagementConfigV1.lifecycle.directories.indexOf(right.lifecycle)
        || left.id.localeCompare(right.id)));
    if (plans.some(plan => obligationDocument(plan) !== obligationDocument(root)))
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_OBLIGATION_SCOPE', 'adopted campaign members must reference the root obligation document');
    return { root, selected, plans, invocationInput: resolvedInputPlan.invocationInput };
}
function resolveCampaignRoot(repositoryRoot, input) {
    const canonicalRepositoryRoot = node_fs_1.default.realpathSync(repositoryRoot);
    const campaign = discoverCampaign(canonicalRepositoryRoot, (0, campaign_configuration_js_1.readManagementConfig)(canonicalRepositoryRoot), input);
    return { campaignId: campaign.root.id, submittedPlanId: campaign.selected.id };
}
function resolveCampaignScope(repositoryRoot, input) {
    const canonicalRepositoryRoot = node_fs_1.default.realpathSync(repositoryRoot);
    const campaign = discoverCampaign(canonicalRepositoryRoot, (0, campaign_configuration_js_1.readManagementConfig)(canonicalRepositoryRoot), input);
    return {
        campaignId: campaign.root.id,
        submittedPlanId: campaign.selected.id,
        plans: campaign.plans.map(plan => ({
            id: plan.id,
            path: plan.relativePlanFile,
        })),
    };
}
