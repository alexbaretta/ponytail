// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-plan-metadata.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignPlanMetadataReaders = exports.PLAN_METADATA_MARKER = void 0;
exports.metadataBlocks = metadataBlocks;
exports.parseCandidate = parseCandidate;
exports.readPlanMetadataV1 = readPlanMetadataV1;
exports.readPlanMetadataV2 = readPlanMetadataV2;
exports.readPlanMetadataV3 = readPlanMetadataV3;
exports.readManagedPlan = readManagedPlan;
exports.parsePlanSource = parsePlanSource;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
exports.PLAN_METADATA_MARKER = 'ponytail-plan-campaign';
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function candidateRecordId(campaignPlanCandidate) {
    return isRecord(campaignPlanCandidate.metadata) ? campaignPlanCandidate.metadata.id ?? null : null;
}
function metadataBlocks(text) {
    const marker = new RegExp(`^<!--\\s*${exports.PLAN_METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
    return [...text.matchAll(marker)].map(match => {
        const block = match[1];
        if (block === undefined)
            throw new Error('campaign metadata matcher lacks its required capture');
        return block;
    });
}
function parseCandidate(planFile, lifecycle, repositoryRoot) {
    const relativePlanFile = node_path_1.default.relative(repositoryRoot, planFile).split(node_path_1.default.sep).join('/');
    let text;
    try {
        text = node_fs_1.default.readFileSync(planFile, 'utf8');
    }
    catch (error) {
        return { planFile, relativePlanFile, lifecycle, text: null, blocks: [], metadata: null, parseError: error };
    }
    return candidateFromText(planFile, relativePlanFile, lifecycle, text);
}
function candidateFromText(planFile, relativePlanFile, lifecycle, text) {
    const blocks = metadataBlocks(text);
    let metadata = null;
    let parseError = null;
    if (blocks.length === 1) {
        try {
            const block = blocks[0];
            if (block === undefined)
                throw new Error('campaign metadata block is absent');
            metadata = JSON.parse(block);
        }
        catch (error) {
            parseError = error;
        }
    }
    return { planFile, relativePlanFile, lifecycle, text, blocks, metadata, parseError };
}
function readPlanMetadataV1(campaignPlanInput) {
    const { metadata, planFile, relativePlanFile, lifecycle, text } = campaignPlanInput;
    (0, campaign_configuration_js_1.exactKeys)(metadata, ['schemaVersion', 'id', 'parent_plan_id'], 'plan campaign metadata');
    if (metadata.schemaVersion !== 1)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, relativePlanFile);
    const directoryId = node_path_1.default.basename(node_path_1.default.dirname(planFile));
    if (typeof metadata.id !== 'string' || metadata.id !== directoryId) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_ID', `plan metadata id must be ${directoryId}`, metadata.id ?? null, relativePlanFile);
    }
    if (metadata.parent_plan_id !== null && (typeof metadata.parent_plan_id !== 'string' || !metadata.parent_plan_id || metadata.parent_plan_id === metadata.id)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PARENT', 'parent_plan_id must be null or a different nonempty plan ID', metadata.id, relativePlanFile);
    }
    if (typeof lifecycle !== 'string')
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_LEGACY_LAYOUT', 'managed plans must use a configured lifecycle directory', metadata.id, relativePlanFile);
    const escapedId = metadata.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (typeof text !== 'string' || !new RegExp(`(?:Plan ID:\\*\\*|Plan ID:)\\s*\`?${escapedId}\`?`).test(text)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_PROSE_ID', `manifest prose must declare Plan ID ${metadata.id}`, metadata.id, relativePlanFile);
    }
    return { schemaVersion: 1, id: metadata.id, parentPlanId: metadata.parent_plan_id, dependsOn: [], lifecycle,
        planFile, relativePlanFile, planDirectory: node_path_1.default.dirname(planFile), text };
}
function isDependencies(value, currentId) {
    return Array.isArray(value) && value.every((id) => typeof id === 'string' && id.length > 0 && id !== currentId) &&
        new Set(value).size === value.length;
}
function readPlanMetadataV2(campaignPlanInput) {
    const { metadata } = campaignPlanInput;
    (0, campaign_configuration_js_1.exactKeys)(metadata, ['schemaVersion', 'id', 'parent_plan_id', 'depends_on'], 'plan campaign metadata');
    if (metadata.schemaVersion !== 2)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, campaignPlanInput.relativePlanFile);
    if (!isDependencies(metadata.depends_on, metadata.id)) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_DEPENDENCY', 'depends_on must contain unique, nonempty plan IDs other than the current plan', metadata.id ?? null, campaignPlanInput.relativePlanFile);
    }
    const campaignPlanV1 = readPlanMetadataV1({ ...campaignPlanInput,
        metadata: { schemaVersion: 1, id: metadata.id, parent_plan_id: metadata.parent_plan_id } });
    const lines = campaignPlanV1.text.split(/\r?\n/);
    const dependenciesHeading = lines.indexOf('## Dependencies');
    if (dependenciesHeading !== -1) {
        let dispatchPrerequisite = false;
        for (const sourceLine of lines.slice(dependenciesHeading + 1)) {
            if (sourceLine.startsWith('## '))
                break;
            const line = sourceLine.trim();
            if (line.startsWith('- '))
                dispatchPrerequisite = line.startsWith('- Dispatch only after');
            if (!dispatchPrerequisite)
                continue;
            for (const match of sourceLine.matchAll(/\[[^\]]+\]\((\.\.?\/[^)]+\/plan\.md)\)/g)) {
                const reference = match[1];
                if (reference === undefined)
                    throw new Error('campaign dependency matcher lacks its required capture');
                const prerequisiteId = node_path_1.default.posix.basename(node_path_1.default.posix.dirname(reference));
                if (!metadata.depends_on.includes(prerequisiteId)) {
                    (0, campaign_configuration_js_1.dataError)('CAMPAIGN_DEPENDENCY', `dispatch prerequisite ${prerequisiteId} must appear in depends_on`, metadata.id, campaignPlanInput.relativePlanFile);
                }
            }
        }
    }
    return { ...campaignPlanV1, schemaVersion: 2, dependsOn: [...metadata.depends_on].sort() };
}
function readPlanMetadataV3(campaignPlanInput) {
    const { metadata } = campaignPlanInput;
    (0, campaign_configuration_js_1.exactKeys)(metadata, ['schemaVersion', 'id', 'parent_plan_id', 'depends_on', 'obligation_document'], 'plan campaign metadata V3');
    if (metadata.schemaVersion !== 3)
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_VERSION', 'expected plan campaign V3');
    const documentPath = metadata.obligation_document;
    if (typeof documentPath !== 'string' || !documentPath || documentPath.includes('\\') || documentPath.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_OBLIGATION_PATH', 'obligation_document must be repository-relative');
    }
    const campaignPlanV2 = readPlanMetadataV2({ ...campaignPlanInput,
        metadata: { schemaVersion: 2, id: metadata.id, parent_plan_id: metadata.parent_plan_id, depends_on: metadata.depends_on } });
    return { ...campaignPlanV2, schemaVersion: 3, obligationDocument: documentPath };
}
exports.CampaignPlanMetadataReaders = Object.freeze({ V1: readPlanMetadataV1, V2: readPlanMetadataV2, V3: readPlanMetadataV3 });
function readManagedPlan(campaignPlanCandidate) {
    if (node_fs_1.default.lstatSync(campaignPlanCandidate.planFile).isSymbolicLink()) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_FILE', 'managed plan manifest must not be a symbolic link', candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
    }
    if (campaignPlanCandidate.blocks.length !== 1) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_BLOCK', `${campaignPlanCandidate.relativePlanFile} must contain exactly one ${exports.PLAN_METADATA_MARKER} block`, candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
    }
    if (campaignPlanCandidate.parseError || !campaignPlanCandidate.metadata) {
        (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_JSON', `${campaignPlanCandidate.relativePlanFile} campaign metadata is not valid JSON`, null, campaignPlanCandidate.relativePlanFile);
    }
    const metadata = campaignPlanCandidate.metadata;
    const schemaVersion = isRecord(metadata) ? metadata.schemaVersion : undefined;
    switch (schemaVersion) {
        case 1: return exports.CampaignPlanMetadataReaders.V1(campaignPlanCandidate);
        case 2: return exports.CampaignPlanMetadataReaders.V2(campaignPlanCandidate);
        case 3: return exports.CampaignPlanMetadataReaders.V3(campaignPlanCandidate);
        default: (0, campaign_configuration_js_1.dataError)('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${schemaVersion}`, candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
    }
}
function parsePlanSource(repositoryRoot, relativePlanFile, lifecycle, text) {
    const planFile = node_path_1.default.join(repositoryRoot, relativePlanFile);
    return readManagedPlan(candidateFromText(planFile, relativePlanFile, lifecycle, text));
}
