// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { dataError, exactKeys } from './campaign-configuration.js';

export const PLAN_METADATA_MARKER = 'ponytail-plan-campaign';
export interface CampaignPlanMetadataV1 { readonly schemaVersion: 1; readonly id: string; readonly parent_plan_id: string | null }
export interface CampaignPlanMetadataV2 { readonly schemaVersion: 2; readonly id: string; readonly parent_plan_id: string | null; readonly depends_on: readonly string[] }
export interface CampaignPlanMetadataV3 { readonly schemaVersion: 3; readonly id: string; readonly parent_plan_id: string | null; readonly depends_on: readonly string[]; readonly obligation_document: string }
export interface CampaignPlanInput {
  readonly planFile: string;
  readonly relativePlanFile: string;
  readonly lifecycle: string | null;
  readonly text: string | null;
  readonly metadata: unknown;
}
export interface CampaignPlanCandidate extends CampaignPlanInput { readonly blocks: readonly string[]; readonly parseError: unknown }
interface CampaignPlanFields {
  readonly id: string;
  readonly parentPlanId: string | null;
  readonly dependsOn: readonly string[];
  readonly lifecycle: string;
  readonly planFile: string;
  readonly relativePlanFile: string;
  readonly planDirectory: string;
  readonly text: string;
}
export interface CampaignPlanV1 extends CampaignPlanFields { readonly schemaVersion: 1; readonly dependsOn: readonly [] }
export interface CampaignPlanV2 extends CampaignPlanFields { readonly schemaVersion: 2 }
export interface CampaignPlanV3 extends CampaignPlanFields { readonly schemaVersion: 3; readonly obligationDocument: string }

function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function candidateRecordId(campaignPlanCandidate: CampaignPlanCandidate): unknown {
  return isRecord(campaignPlanCandidate.metadata) ? campaignPlanCandidate.metadata.id ?? null : null;
}
export function metadataBlocks(text: string): string[] {
  const marker = new RegExp(`^<!--\\s*${PLAN_METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
  return [...text.matchAll(marker)].map(match => {
    const block = match[1];
    if (block === undefined) throw new Error('campaign metadata matcher lacks its required capture');
    return block;
  });
}
export function parseCandidate(planFile: string, lifecycle: string | null, repositoryRoot: string): CampaignPlanCandidate {
  const relativePlanFile = path.relative(repositoryRoot, planFile).split(path.sep).join('/');
  let text: string;
  try { text = fs.readFileSync(planFile, 'utf8'); }
  catch (error) { return { planFile, relativePlanFile, lifecycle, text: null, blocks: [], metadata: null, parseError: error }; }
  return candidateFromText(planFile, relativePlanFile, lifecycle, text);
}
function candidateFromText(planFile: string, relativePlanFile: string, lifecycle: string | null, text: string): CampaignPlanCandidate {
  const blocks = metadataBlocks(text);
  let metadata: unknown = null;
  let parseError: unknown = null;
  if (blocks.length === 1) {
    try {
      const block = blocks[0];
      if (block === undefined) throw new Error('campaign metadata block is absent');
      metadata = JSON.parse(block);
    } catch (error) { parseError = error; }
  }
  return { planFile, relativePlanFile, lifecycle, text, blocks, metadata, parseError };
}
export function readPlanMetadataV1(campaignPlanInput: CampaignPlanInput): CampaignPlanV1 {
  const { metadata, planFile, relativePlanFile, lifecycle, text } = campaignPlanInput;
  exactKeys(metadata, ['schemaVersion', 'id', 'parent_plan_id'], 'plan campaign metadata');
  if (metadata.schemaVersion !== 1) dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, relativePlanFile);
  const directoryId = path.basename(path.dirname(planFile));
  if (typeof metadata.id !== 'string' || metadata.id !== directoryId) {
    dataError('CAMPAIGN_PLAN_ID', `plan metadata id must be ${directoryId}`, metadata.id ?? null, relativePlanFile);
  }
  if (metadata.parent_plan_id !== null && (typeof metadata.parent_plan_id !== 'string' || !metadata.parent_plan_id || metadata.parent_plan_id === metadata.id)) {
    dataError('CAMPAIGN_PARENT', 'parent_plan_id must be null or a different nonempty plan ID', metadata.id, relativePlanFile);
  }
  if (typeof lifecycle !== 'string') dataError('CAMPAIGN_LEGACY_LAYOUT', 'managed plans must use a configured lifecycle directory', metadata.id, relativePlanFile);
  const escapedId = metadata.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (typeof text !== 'string' || !new RegExp(`(?:Plan ID:\\*\\*|Plan ID:)\\s*\`?${escapedId}\`?`).test(text)) {
    dataError('CAMPAIGN_PLAN_PROSE_ID', `manifest prose must declare Plan ID ${metadata.id}`, metadata.id, relativePlanFile);
  }
  return { schemaVersion: 1, id: metadata.id, parentPlanId: metadata.parent_plan_id, dependsOn: [], lifecycle,
    planFile, relativePlanFile, planDirectory: path.dirname(planFile), text };
}
function isDependencies(value: unknown, currentId: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((id: unknown) => typeof id === 'string' && id.length > 0 && id !== currentId) &&
    new Set<unknown>(value).size === value.length;
}
export function readPlanMetadataV2(campaignPlanInput: CampaignPlanInput): CampaignPlanV2 {
  const { metadata } = campaignPlanInput;
  exactKeys(metadata, ['schemaVersion', 'id', 'parent_plan_id', 'depends_on'], 'plan campaign metadata');
  if (metadata.schemaVersion !== 2) dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${metadata.schemaVersion}`, null, campaignPlanInput.relativePlanFile);
  if (!isDependencies(metadata.depends_on, metadata.id)) {
    dataError('CAMPAIGN_DEPENDENCY', 'depends_on must contain unique, nonempty plan IDs other than the current plan', metadata.id ?? null, campaignPlanInput.relativePlanFile);
  }
  const campaignPlanV1: CampaignPlanV1 = readPlanMetadataV1({ ...campaignPlanInput,
    metadata: { schemaVersion: 1, id: metadata.id, parent_plan_id: metadata.parent_plan_id } });
  const lines = campaignPlanV1.text.split(/\r?\n/);
  const dependenciesHeading = lines.indexOf('## Dependencies');
  if (dependenciesHeading !== -1) {
    let dispatchPrerequisite = false;
    for (const sourceLine of lines.slice(dependenciesHeading + 1)) {
      if (sourceLine.startsWith('## ')) break;
      const line = sourceLine.trim();
      if (line.startsWith('- ')) dispatchPrerequisite = line.startsWith('- Dispatch only after');
      if (!dispatchPrerequisite) continue;
      for (const match of sourceLine.matchAll(/\[[^\]]+\]\((\.\.?\/[^)]+\/plan\.md)\)/g)) {
        const reference = match[1];
        if (reference === undefined) throw new Error('campaign dependency matcher lacks its required capture');
        const prerequisiteId = path.posix.basename(path.posix.dirname(reference));
        if (!metadata.depends_on.includes(prerequisiteId)) {
          dataError('CAMPAIGN_DEPENDENCY', `dispatch prerequisite ${prerequisiteId} must appear in depends_on`, metadata.id, campaignPlanInput.relativePlanFile);
        }
      }
    }
  }
  return { ...campaignPlanV1, schemaVersion: 2, dependsOn: [...metadata.depends_on].sort() };
}
// Traceability: implements REQ-OBLIGATION-COMPATIBILITY
export function readPlanMetadataV3(campaignPlanInput: CampaignPlanInput): CampaignPlanV3 {
  const { metadata } = campaignPlanInput;
  exactKeys(metadata, ['schemaVersion', 'id', 'parent_plan_id', 'depends_on', 'obligation_document'], 'plan campaign metadata V3');
  if (metadata.schemaVersion !== 3) dataError('CAMPAIGN_PLAN_VERSION', 'expected plan campaign V3');
  const documentPath = metadata.obligation_document;
  if (typeof documentPath !== 'string' || !documentPath || documentPath.includes('\\') || documentPath.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    dataError('CAMPAIGN_OBLIGATION_PATH', 'obligation_document must be repository-relative');
  }
  const campaignPlanV2: CampaignPlanV2 = readPlanMetadataV2({ ...campaignPlanInput,
    metadata: { schemaVersion: 2, id: metadata.id, parent_plan_id: metadata.parent_plan_id, depends_on: metadata.depends_on } });
  return { ...campaignPlanV2, schemaVersion: 3, obligationDocument: documentPath };
}
export const CampaignPlanMetadataReaders = Object.freeze({ V1: readPlanMetadataV1, V2: readPlanMetadataV2, V3: readPlanMetadataV3 });

export function readManagedPlan(campaignPlanCandidate: CampaignPlanCandidate): CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3 {
  if (fs.lstatSync(campaignPlanCandidate.planFile).isSymbolicLink()) {
    dataError('CAMPAIGN_PLAN_FILE', 'managed plan manifest must not be a symbolic link', candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
  }
  if (campaignPlanCandidate.blocks.length !== 1) {
    dataError('CAMPAIGN_PLAN_BLOCK', `${campaignPlanCandidate.relativePlanFile} must contain exactly one ${PLAN_METADATA_MARKER} block`, candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
  }
  if (campaignPlanCandidate.parseError || !campaignPlanCandidate.metadata) {
    dataError('CAMPAIGN_PLAN_JSON', `${campaignPlanCandidate.relativePlanFile} campaign metadata is not valid JSON`, null, campaignPlanCandidate.relativePlanFile);
  }
  const metadata = campaignPlanCandidate.metadata;
  const schemaVersion = isRecord(metadata) ? metadata.schemaVersion : undefined;
  switch (schemaVersion) {
    case 1: return CampaignPlanMetadataReaders.V1(campaignPlanCandidate);
    case 2: return CampaignPlanMetadataReaders.V2(campaignPlanCandidate);
    case 3: return CampaignPlanMetadataReaders.V3(campaignPlanCandidate);
    default: dataError('CAMPAIGN_PLAN_VERSION', `unsupported plan campaign version: ${schemaVersion}`, candidateRecordId(campaignPlanCandidate), campaignPlanCandidate.relativePlanFile);
  }
}
export function parsePlanSource(repositoryRoot: string, relativePlanFile: string, lifecycle: string | null, text: string): CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3 {
  const planFile = path.join(repositoryRoot, relativePlanFile);
  return readManagedPlan(candidateFromText(planFile, relativePlanFile, lifecycle, text));
}
