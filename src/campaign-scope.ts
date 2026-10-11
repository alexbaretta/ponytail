// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { dataError, toolError, readManagementConfig, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import { readManagedPlan, type CampaignPlanCandidate, type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from './campaign-plan-metadata.js';
import { linkedPlanFiles, scanPlanCandidates } from './campaign-plan-sources.js';

export interface ResolvedInputPlan { readonly candidate: CampaignPlanCandidate; readonly invocationInput: string }
export interface CampaignAncestors {
  readonly root: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3;
  readonly selected: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3;
  readonly membersByPath: Map<string, CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3>;
}
export interface DiscoveredCampaign {
  readonly root: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3;
  readonly selected: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3;
  readonly plans: readonly (CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3)[];
  readonly invocationInput: string;
}
export interface CampaignRoot { readonly campaignId: string; readonly submittedPlanId: string }
export interface CampaignScope extends CampaignRoot { readonly plans: readonly { readonly id: string; readonly path: string }[] }
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function candidateMetadataField(campaignPlanCandidate: CampaignPlanCandidate, field: string): unknown {
  const metadata = campaignPlanCandidate.metadata;
  return isRecord(metadata) ? metadata[field] : undefined;
}
function obligationDocument(campaignPlan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3): string | undefined {
  return campaignPlan.schemaVersion === 3 ? campaignPlan.obligationDocument : undefined;
}

export function resolveInputPlan(input: string | undefined, repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1, candidates: readonly CampaignPlanCandidate[]): ResolvedInputPlan {
  if (input === undefined) {
    const activeCandidates = candidates.filter((candidate) => (
      candidate.lifecycle === campaignManagementConfigV1.lifecycle.roles.activeWork && candidate.blocks.length !== 0
    ));
    if (activeCandidates.length === 0) toolError('CAMPAIGN_ACTIVE_MISSING', 'no managed plan is in the configured active-work lifecycle');
    const rootsByPath = new Map<string, CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3>();
    for (const candidate of activeCandidates) {
      const { root } = readAncestors(candidates, candidate);
      rootsByPath.set(root.planFile, root);
    }
    if (rootsByPath.size !== 1) {
      const rootIds = [...rootsByPath.values()].map((plan) => plan.id).sort();
      toolError('CAMPAIGN_ACTIVE_AMBIGUOUS', `multiple campaigns contain active plans: ${rootIds.join(', ')}`);
    }
    const [root] = rootsByPath.values();
    if (root === undefined) throw new Error('active campaign root is absent');
    const candidate = candidates.find(item => item.planFile === root.planFile);
    if (candidate === undefined) throw new Error('active campaign candidate is absent');
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
    const matches = candidates.filter((candidate) => path.basename(path.dirname(candidate.planFile)) === planName);
    if (matches.length === 0) toolError('CAMPAIGN_INPUT', `plan name does not exist: ${planName}`);
    if (matches.length > 1) dataError('CAMPAIGN_INPUT_AMBIGUOUS', `plan name exists in multiple lifecycle locations: ${planName}`, planName);
    const candidate = matches[0];
    if (candidate === undefined) throw new Error('selected campaign candidate is absent');
    return { candidate, invocationInput: input };
  }
  let inputPath: string;
  try {
    inputPath = fs.realpathSync(path.resolve(input));
  } catch (error) {
    toolError('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
  }
  let planFile = inputPath;
  try {
    if (fs.statSync(inputPath).isDirectory()) planFile = path.join(inputPath, 'plan.md');
  } catch (error) {
    toolError('CAMPAIGN_INPUT', `plan input does not exist: ${input}`);
  }
  if (path.basename(planFile) !== 'plan.md' || !fs.existsSync(planFile) || fs.lstatSync(planFile).isSymbolicLink() || !fs.statSync(planFile).isFile()) {
    toolError('CAMPAIGN_INPUT', 'input must be a regular non-symlink plan directory or plan.md');
  }
  const relative = path.relative(repositoryRoot, planFile).split(path.sep).join('/');
  if (relative.startsWith('../') || path.isAbsolute(relative) || !relative.startsWith(`${campaignManagementConfigV1.planRoot}/`)) {
    toolError('CAMPAIGN_INPUT', `input is outside configured plan root: ${input}`);
  }
  const candidate = candidates.find((item) => item.planFile === planFile);
  if (!candidate) dataError('CAMPAIGN_INPUT_LAYOUT', 'input is not in a supported managed plan layout', null, relative);
  return {
    candidate,
    invocationInput: path.relative(repositoryRoot, inputPath).split(path.sep).join('/'),
  };
}

export function validateCampaignReference(plan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3, parent: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3): void {
  const planFile = fs.realpathSync(plan.planFile);
  const found = linkedPlanFiles(parent).includes(planFile);
  if (!found) dataError('CAMPAIGN_MEMBER_LINK', `campaign plan ${parent.id} must link to member plan ${plan.id}`, plan.id, plan.relativePlanFile);
}

export function readAncestors(candidates: readonly CampaignPlanCandidate[], candidate: CampaignPlanCandidate): CampaignAncestors {
  const selected = readManagedPlan(candidate);
  const membersByPath = new Map<string, CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3>([[selected.planFile, selected]]);
  let current = selected;
  const ancestorIds = new Set([current.id]);
  while (current.parentPlanId !== null) {
    const matches = candidates.filter((item) => candidateMetadataField(item, 'id') === current.parentPlanId);
    if (matches.length === 0) dataError('CAMPAIGN_PARENT_MISSING', `missing parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    if (matches.length > 1) dataError('CAMPAIGN_PARENT_AMBIGUOUS', `ambiguous parent plan: ${current.parentPlanId}`, current.id, current.relativePlanFile);
    const parentCandidate = matches[0];
    if (parentCandidate === undefined) throw new Error('campaign parent candidate is absent');
    const parent = readManagedPlan(parentCandidate);
    if (ancestorIds.has(parent.id)) dataError('CAMPAIGN_PARENT_CYCLE', `parent cycle reaches ${parent.id}`, current.id, current.relativePlanFile);
    validateCampaignReference(current, parent);
    ancestorIds.add(parent.id);
    membersByPath.set(parent.planFile, parent);
    current = parent;
  }
  return { root: current, selected, membersByPath };
}

export function discoverCampaign(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1, input: string | undefined): DiscoveredCampaign {
  const candidates = scanPlanCandidates(repositoryRoot, campaignManagementConfigV1);
  const resolvedInputPlan = resolveInputPlan(input, repositoryRoot, campaignManagementConfigV1, candidates);
  const { root, selected, membersByPath } = readAncestors(candidates, resolvedInputPlan.candidate);
  const memberIds = new Map([...membersByPath.values()].map((plan) => [plan.id, plan.planFile]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      const parentId = candidateMetadataField(candidate, 'parent_plan_id');
      if (membersByPath.has(candidate.planFile) || typeof parentId !== 'string' || !memberIds.has(parentId)) continue;
      const child = readManagedPlan(candidate);
      const existingPath = memberIds.get(child.id);
      if (existingPath && existingPath !== child.planFile) {
        dataError('CAMPAIGN_PLAN_ID_DUPLICATE', `duplicate campaign member ID: ${child.id}`, child.id, child.relativePlanFile);
      }
      const parentPath = child.parentPlanId === null ? undefined : memberIds.get(child.parentPlanId);
      const parent = parentPath === undefined ? undefined : membersByPath.get(parentPath);
      if (parent === undefined) throw new Error('campaign member parent is absent');
      validateCampaignReference(child, parent);
      membersByPath.set(child.planFile, child);
      memberIds.set(child.id, child.planFile);
      changed = true;
    }
  }
  const plans = [...membersByPath.values()].sort((left, right) => (
    campaignManagementConfigV1.lifecycle.directories.indexOf(left.lifecycle) - campaignManagementConfigV1.lifecycle.directories.indexOf(right.lifecycle)
    || left.id.localeCompare(right.id)
  ));
  if (plans.some(plan => obligationDocument(plan) !== obligationDocument(root))) dataError('CAMPAIGN_OBLIGATION_SCOPE', 'adopted campaign members must reference the root obligation document');
  return { root, selected, plans, invocationInput: resolvedInputPlan.invocationInput };
}

export function resolveCampaignRoot(repositoryRoot: string, input?: string): CampaignRoot {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(
    canonicalRepositoryRoot,
    readManagementConfig(canonicalRepositoryRoot),
    input,
  );
  return { campaignId: campaign.root.id, submittedPlanId: campaign.selected.id };
}

export function resolveCampaignScope(repositoryRoot: string, input?: string): CampaignScope {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaign = discoverCampaign(
    canonicalRepositoryRoot,
    readManagementConfig(canonicalRepositoryRoot),
    input,
  );
  return {
    campaignId: campaign.root.id,
    submittedPlanId: campaign.selected.id,
    plans: campaign.plans.map(plan => ({
      id: plan.id,
      path: plan.relativePlanFile,
    })),
  };
}
