// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-inventory.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignReportReaders = void 0;
exports.readCampaignReportV2 = readCampaignReportV2;
exports.readCampaignReportV3 = readCampaignReportV3;
exports.campaignDiagnostic = campaignDiagnostic;
exports.buildRepositoryInventory = buildRepositoryInventory;
exports.humanInventory = humanInventory;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_plan_metadata_js_1 = require("./campaign-plan-metadata.js");
const campaign_plan_sources_js_1 = require("./campaign-plan-sources.js");
const campaign_plan_contents_js_1 = require("./campaign-plan-contents.js");
const campaign_scope_js_1 = require("./campaign-scope.js");
const campaign_report_js_1 = require("./campaign-report.js");
function stringList(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function validateDiagnostic(value) {
    (0, campaign_configuration_js_1.exactKeys)(value, ['code', 'message', 'recordId', 'path'], 'campaign diagnostic');
    if (typeof value.code !== 'string' || typeof value.message !== 'string' || !(typeof value.path === 'string' || value.path === null)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign diagnostic contains invalid values');
    }
}
function validateCampaignInventory(value, version) {
    (0, campaign_configuration_js_1.exactKeys)(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'activeCampaigns', 'campaigns', 'plans', 'invalidPlans', 'unmanagedPlans', 'diagnostics'], 'campaign inventory');
    if (value.schemaVersion !== version || typeof value.valid !== 'boolean')
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', `invalid V${version} campaign inventory envelope`);
    (0, campaign_configuration_js_1.exactKeys)(value.invocation, ['command'], 'campaign inventory invocation');
    (0, campaign_report_js_1.validateCampaignRepositoryIdentity)(value.repository, 'campaign inventory repository');
    if (!(value.invocation.command === 'report' || value.invocation.command === 'validate' || version === 3 && value.invocation.command === 'list')
        || !Array.isArray(value.activeCampaigns) || !Array.isArray(value.campaigns) || !Array.isArray(value.plans)
        || !Array.isArray(value.invalidPlans) || !Array.isArray(value.unmanagedPlans) || !Array.isArray(value.diagnostics)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign inventory contains invalid values');
    }
    const activeCampaigns = value.activeCampaigns;
    const campaigns = value.campaigns;
    const plans = value.plans;
    const invalidPlans = value.invalidPlans;
    const unmanagedPlans = value.unmanagedPlans;
    const diagnostics = value.diagnostics;
    for (const record of activeCampaigns) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['rootPlanId', 'activePlanIds'], 'active campaign');
        if (typeof record.rootPlanId !== 'string' || !stringList(record.activePlanIds))
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'active campaign contains invalid values');
    }
    for (const record of campaigns) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['rootPlanId', 'planIds'], 'campaign');
        if (typeof record.rootPlanId !== 'string' || !stringList(record.planIds))
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign contains invalid values');
    }
    for (const record of plans) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['id', 'rootPlanId', 'parentPlanId', 'dependsOn', 'lifecycle', 'path'], 'campaign inventory plan');
        if (typeof record.id !== 'string' || typeof record.rootPlanId !== 'string' || !(typeof record.parentPlanId === 'string' || record.parentPlanId === null)
            || !stringList(record.dependsOn) || typeof record.lifecycle !== 'string' || typeof record.path !== 'string') {
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'campaign inventory plan contains invalid values');
        }
    }
    for (const record of invalidPlans) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['id', 'lifecycle', 'path', 'diagnostics'], 'invalid campaign plan');
        if (!Array.isArray(record.diagnostics))
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'invalid plan diagnostics must be an array');
        if (!(typeof record.lifecycle === 'string' || record.lifecycle === null) || typeof record.path !== 'string')
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'invalid campaign plan contains invalid values');
        const recordDiagnostics = record.diagnostics;
        for (const item of recordDiagnostics)
            validateDiagnostic(item);
    }
    for (const record of unmanagedPlans) {
        (0, campaign_configuration_js_1.exactKeys)(record, ['path'], 'unmanaged campaign plan');
        if (typeof record.path !== 'string')
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_REPORT_SCHEMA', 'unmanaged campaign plan contains invalid values');
    }
    for (const record of diagnostics)
        validateDiagnostic(record);
}
function readCampaignReportV2(value) { validateCampaignInventory(value, 2); return value; }
function readCampaignReportV3(value) { validateCampaignInventory(value, 3); return value; }
exports.CampaignReportReaders = Object.freeze({ V1: campaign_report_js_1.readCampaignReportV1, V2: readCampaignReportV2, V3: readCampaignReportV3 });
function campaignDiagnostic(error, fallbackPath = null) {
    return error instanceof campaign_configuration_js_1.CampaignError
        ? { code: error.code, message: error.message, recordId: error.recordId ?? null, path: error.relativePath ?? fallbackPath }
        : { code: 'CAMPAIGN_INTERNAL', message: error instanceof Error ? error.message : String(error), recordId: null, path: fallbackPath };
}
function buildRepositoryInventory(repositoryRoot, campaignManagementConfigV1, command = 'report') {
    const canonicalRepositoryRoot = node_fs_1.default.realpathSync(repositoryRoot);
    const candidates = (0, campaign_plan_sources_js_1.scanPlanCandidates)(canonicalRepositoryRoot, campaignManagementConfigV1);
    const unmanagedCandidates = [];
    const parsedPlans = [];
    const invalidByPath = new Map();
    const diagnostics = [];
    const addInvalid = (campaignPlanCandidate, error) => {
        const campaignDiagnosticResult = campaignDiagnostic(error, campaignPlanCandidate.relativePlanFile);
        const existing = invalidByPath.get(campaignPlanCandidate.relativePlanFile) ?? {
            id: (0, campaign_plan_metadata_js_1.candidateRecordId)(campaignPlanCandidate),
            lifecycle: campaignPlanCandidate.lifecycle,
            path: campaignPlanCandidate.relativePlanFile,
            diagnostics: [],
        };
        if (!existing.diagnostics.some((item) => item.code === campaignDiagnosticResult.code && item.message === campaignDiagnosticResult.message)) {
            existing.diagnostics.push(campaignDiagnosticResult);
        }
        invalidByPath.set(campaignPlanCandidate.relativePlanFile, existing);
    };
    for (const candidate of candidates) {
        if (candidate.blocks.length === 0) {
            unmanagedCandidates.push(candidate);
            continue;
        }
        try {
            const plan = (0, campaign_plan_metadata_js_1.readManagedPlan)(candidate);
            (0, campaign_plan_contents_js_1.validatePlanContents)(plan, campaignManagementConfigV1, canonicalRepositoryRoot);
            parsedPlans.push({ candidate, plan });
        }
        catch (error) {
            if (!(error instanceof campaign_configuration_js_1.CampaignError) || error.status !== 1)
                throw error;
            addInvalid(candidate, error);
        }
    }
    const plansById = new Map();
    for (const entry of parsedPlans) {
        const entries = plansById.get(entry.plan.id) ?? [];
        entries.push(entry);
        plansById.set(entry.plan.id, entries);
    }
    const unmanagedById = new Map();
    for (const candidate of unmanagedCandidates) {
        const id = node_path_1.default.basename(node_path_1.default.dirname(candidate.planFile));
        const matches = unmanagedById.get(id) ?? [];
        matches.push(candidate);
        unmanagedById.set(id, matches);
    }
    for (const entries of plansById.values()) {
        if (entries.length < 2)
            continue;
        for (const entry of entries) {
            addInvalid(entry.candidate, new campaign_configuration_js_1.CampaignError(1, 'CAMPAIGN_PLAN_ID_DUPLICATE', `duplicate campaign plan ID: ${entry.plan.id}`, entry.plan.id, entry.plan.relativePlanFile));
        }
    }
    const entryForReference = (campaignInventoryEntry, referencedId, relationship) => {
        const matches = plansById.get(referencedId) ?? [];
        if (matches.length === 0) {
            for (const candidate of unmanagedById.get(referencedId) ?? []) {
                addInvalid(candidate, new campaign_configuration_js_1.CampaignError(1, 'CAMPAIGN_PLAN_BLOCK', `${candidate.relativePlanFile} requires ${campaign_plan_metadata_js_1.PLAN_METADATA_MARKER} metadata because managed plan ${campaignInventoryEntry.plan.id} references it`, referencedId, candidate.relativePlanFile));
            }
        }
        const match = matches[0];
        if (matches.length !== 1 || match === undefined || invalidByPath.has(match.plan.relativePlanFile)) {
            addInvalid(campaignInventoryEntry.candidate, new campaign_configuration_js_1.CampaignError(1, matches.length > 1 ? `CAMPAIGN_${relationship}_AMBIGUOUS` : `CAMPAIGN_${relationship}_MISSING`, `${relationship.toLowerCase()} plan is not uniquely valid: ${referencedId}`, campaignInventoryEntry.plan.id, campaignInventoryEntry.plan.relativePlanFile));
            return null;
        }
        return match;
    };
    for (const entry of parsedPlans) {
        if (invalidByPath.has(entry.plan.relativePlanFile))
            continue;
        if (entry.plan.parentPlanId !== null) {
            const parent = entryForReference(entry, entry.plan.parentPlanId, 'PARENT');
            if (parent) {
                try {
                    (0, campaign_scope_js_1.validateCampaignReference)(entry.plan, parent.plan);
                }
                catch (error) {
                    addInvalid(entry.candidate, error);
                }
            }
        }
        for (const dependencyId of entry.plan.dependsOn)
            entryForReference(entry, dependencyId, 'DEPENDENCY');
    }
    function detectCycles(edgeName, code) {
        const visited = new Set();
        const visiting = [];
        const visit = (entry) => {
            if (visited.has(entry.plan.relativePlanFile) || invalidByPath.has(entry.plan.relativePlanFile))
                return;
            const index = visiting.findIndex((item) => item.plan.relativePlanFile === entry.plan.relativePlanFile);
            if (index !== -1) {
                for (const member of visiting.slice(index)) {
                    addInvalid(member.candidate, new campaign_configuration_js_1.CampaignError(1, code, `${edgeName} cycle reaches ${entry.plan.id}`, member.plan.id, member.plan.relativePlanFile));
                }
                return;
            }
            visiting.push(entry);
            const ids = edgeName === 'parent' ? entry.plan.parentPlanId === null ? [] : [entry.plan.parentPlanId] : entry.plan.dependsOn;
            for (const id of ids) {
                const matches = plansById.get(id) ?? [];
                const match = matches[0];
                if (matches.length === 1 && match !== undefined)
                    visit(match);
            }
            visiting.pop();
            visited.add(entry.plan.relativePlanFile);
        };
        for (const entry of parsedPlans)
            visit(entry);
    }
    detectCycles('parent', 'CAMPAIGN_PARENT_CYCLE');
    detectCycles('dependency', 'CAMPAIGN_DEPENDENCY_CYCLE');
    const rootFor = (entry) => {
        let current = entry;
        const seen = new Set();
        while (current.plan.parentPlanId !== null) {
            if (seen.has(current.plan.relativePlanFile))
                return null;
            seen.add(current.plan.relativePlanFile);
            const matches = plansById.get(current.plan.parentPlanId) ?? [];
            const match = matches[0];
            if (matches.length !== 1 || match === undefined || invalidByPath.has(match.plan.relativePlanFile))
                return null;
            current = match;
        }
        return current;
    };
    for (const entry of parsedPlans) {
        if (invalidByPath.has(entry.plan.relativePlanFile))
            continue;
        const root = rootFor(entry);
        if (!root)
            continue;
        for (const dependencyId of entry.plan.dependsOn) {
            const dependency = (plansById.get(dependencyId) ?? [])[0];
            const dependencyRoot = dependency && rootFor(dependency);
            if (dependencyRoot && dependencyRoot.plan.id !== root.plan.id) {
                addInvalid(entry.candidate, new campaign_configuration_js_1.CampaignError(1, 'CAMPAIGN_DEPENDENCY_CAMPAIGN', `dependency ${dependencyId} belongs to campaign ${dependencyRoot.plan.id}`, entry.plan.id, entry.plan.relativePlanFile));
            }
        }
    }
    const validEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
    const campaignEntries = new Map();
    for (const entry of validEntries) {
        const root = rootFor(entry);
        if (!root)
            continue;
        const members = campaignEntries.get(root.plan.id) ?? [];
        members.push(entry);
        campaignEntries.set(root.plan.id, members);
    }
    for (const members of campaignEntries.values()) {
        const member = members[0];
        if (member === undefined)
            throw new Error('campaign inventory group lacks its first member');
        const root = rootFor(member);
        if (root === null)
            throw new Error('validated campaign inventory root is absent');
        if (root.plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion || members.length === 1)
            continue;
        for (const member of members) {
            if (member.plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion) {
                addInvalid(root.candidate, new campaign_configuration_js_1.CampaignError(1, 'CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${member.plan.id}`, root.plan.id, root.plan.relativePlanFile));
                break;
            }
        }
    }
    for (const entry of parsedPlans) {
        if (invalidByPath.has(entry.plan.relativePlanFile))
            continue;
        if (!rootFor(entry)) {
            addInvalid(entry.candidate, new campaign_configuration_js_1.CampaignError(1, 'CAMPAIGN_PARENT_INVALID', 'campaign root cannot be resolved through valid parent records', entry.plan.id, entry.plan.relativePlanFile));
        }
    }
    const finalEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
    const finalCampaignEntries = new Map();
    for (const entry of finalEntries) {
        const root = rootFor(entry);
        if (!root || invalidByPath.has(root.plan.relativePlanFile))
            continue;
        const members = finalCampaignEntries.get(root.plan.id) ?? [];
        members.push(entry);
        finalCampaignEntries.set(root.plan.id, members);
    }
    const campaigns = [...finalCampaignEntries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([rootPlanId, entries]) => ({
        rootPlanId,
        planIds: entries.map((entry) => entry.plan.id).sort(),
    }));
    const plans = finalEntries.map(entry => {
        const { plan } = entry;
        const root = rootFor(entry);
        if (root === null)
            throw new Error('final campaign inventory root is absent');
        return {
            id: plan.id,
            rootPlanId: root.plan.id,
            parentPlanId: plan.parentPlanId,
            dependsOn: [...plan.dependsOn],
            lifecycle: plan.lifecycle,
            path: plan.relativePlanFile,
        };
    }).sort((left, right) => left.path.localeCompare(right.path));
    const activeCampaigns = campaigns.flatMap((campaign) => {
        const activePlanIds = plans.filter((plan) => plan.rootPlanId === campaign.rootPlanId && plan.lifecycle === campaignManagementConfigV1.lifecycle.roles.activeWork).map((plan) => plan.id);
        return activePlanIds.length === 0 ? [] : [{ rootPlanId: campaign.rootPlanId, activePlanIds }];
    });
    const invalidPlans = [...invalidByPath.values()].sort((left, right) => left.path.localeCompare(right.path));
    for (const plan of invalidPlans)
        plan.diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
    const unmanagedPlans = unmanagedCandidates
        .filter((candidate) => !invalidByPath.has(candidate.relativePlanFile))
        .map((candidate) => ({ path: candidate.relativePlanFile }));
    const campaignInventoryV3 = {
        schemaVersion: 3,
        valid: invalidPlans.length === 0 && diagnostics.length === 0,
        invocation: { command },
        repository: (0, campaign_report_js_1.repositoryIdentity)(canonicalRepositoryRoot),
        activeCampaigns,
        campaigns,
        plans,
        invalidPlans,
        unmanagedPlans: unmanagedPlans.sort((left, right) => left.path.localeCompare(right.path)),
        diagnostics,
    };
    return readCampaignReportV3(campaignInventoryV3);
}
function humanInventory(campaignInventory, worktree) {
    const activeCampaigns = campaignInventory.activeCampaigns.length === 0
        ? 'none'
        : campaignInventory.activeCampaigns.map((campaign) => `${campaign.rootPlanId} (${campaign.activePlanIds.join(', ')})`).join('; ');
    const lines = [
        `Repository campaign inventory: ${campaignInventory.valid ? 'valid' : 'invalid'}`,
        `Worktree: ${worktree}`,
        `Active campaigns: ${activeCampaigns}`,
        `Campaigns: ${campaignInventory.campaigns.length}; managed plans: ${campaignInventory.plans.length}; invalid plans: ${campaignInventory.invalidPlans.length}; unmanaged legacy plans: ${campaignInventory.unmanagedPlans.length}`,
    ];
    for (const plan of campaignInventory.invalidPlans) {
        for (const item of plan.diagnostics)
            lines.push(`error ${item.code} ${plan.path}: ${item.message}`);
    }
    for (const item of campaignInventory.diagnostics)
        lines.push(`error ${item.code}: ${item.message}`);
    if (campaignInventory.unmanagedPlans.length > 0) {
        lines.push('Unmanaged legacy plans:', ...campaignInventory.unmanagedPlans.map((plan) => `- ${plan.path}`));
    }
    return `${lines.join('\n')}\n`;
}
