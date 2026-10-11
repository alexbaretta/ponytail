// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { CampaignError, dataError, exactKeys, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import { PLAN_METADATA_MARKER, readManagedPlan, candidateRecordId, type CampaignPlanCandidate, type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from './campaign-plan-metadata.js';
import { scanPlanCandidates } from './campaign-plan-sources.js';
import { validatePlanContents } from './campaign-plan-contents.js';
import { validateCampaignReference } from './campaign-scope.js';
import { repositoryIdentity, validateCampaignRepositoryIdentity, readCampaignReportV1, type CampaignRepositoryIdentity } from './campaign-report.js';

export interface CampaignDiagnostic {
  readonly code: string; readonly message: string; readonly recordId: unknown; readonly path: string | null;
}
export interface CampaignInventoryActiveCampaign { readonly rootPlanId: string; readonly activePlanIds: readonly string[] }
export interface CampaignInventoryCampaign { readonly rootPlanId: string; readonly planIds: readonly string[] }
export interface CampaignInventoryPlan {
  readonly id: string; readonly rootPlanId: string; readonly parentPlanId: string | null;
  readonly dependsOn: readonly string[]; readonly lifecycle: string; readonly path: string;
}
export interface CampaignInventoryInvalidPlan {
  readonly id: unknown; readonly lifecycle: string | null; readonly path: string; readonly diagnostics: CampaignDiagnostic[];
}
interface CampaignInventoryRecords {
  readonly valid: boolean; readonly repository: CampaignRepositoryIdentity;
  readonly activeCampaigns: readonly CampaignInventoryActiveCampaign[]; readonly campaigns: readonly CampaignInventoryCampaign[];
  readonly plans: readonly CampaignInventoryPlan[]; readonly invalidPlans: readonly CampaignInventoryInvalidPlan[];
  readonly unmanagedPlans: readonly { readonly path: string }[]; readonly diagnostics: readonly CampaignDiagnostic[];
}
export interface CampaignInventoryV2 extends CampaignInventoryRecords {
  readonly schemaVersion: 2; readonly invocation: { readonly command: 'report' | 'validate' };
}
export interface CampaignInventoryV3 extends CampaignInventoryRecords {
  readonly schemaVersion: 3; readonly invocation: { readonly command: 'list' | 'report' | 'validate' };
}
interface CampaignInventoryEntry {
  readonly plan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3; readonly candidate: CampaignPlanCandidate;
}

function stringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}
function validateDiagnostic(value: unknown): asserts value is CampaignDiagnostic {
  exactKeys(value, ['code', 'message', 'recordId', 'path'], 'campaign diagnostic');
  if (typeof value.code !== 'string' || typeof value.message !== 'string' || !(typeof value.path === 'string' || value.path === null)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign diagnostic contains invalid values');
  }
}
function validateCampaignInventory(value: unknown, version: 2): asserts value is CampaignInventoryV2;
function validateCampaignInventory(value: unknown, version: 3): asserts value is CampaignInventoryV3;
function validateCampaignInventory(value: unknown, version: 2 | 3): void {
  exactKeys(value, ['schemaVersion', 'valid', 'invocation', 'repository', 'activeCampaigns', 'campaigns', 'plans', 'invalidPlans', 'unmanagedPlans', 'diagnostics'], 'campaign inventory');
  if (value.schemaVersion !== version || typeof value.valid !== 'boolean') dataError('CAMPAIGN_REPORT_SCHEMA', `invalid V${version} campaign inventory envelope`);
  exactKeys(value.invocation, ['command'], 'campaign inventory invocation');
  validateCampaignRepositoryIdentity(value.repository, 'campaign inventory repository');
  if (!(value.invocation.command === 'report' || value.invocation.command === 'validate' || version === 3 && value.invocation.command === 'list')
    || !Array.isArray(value.activeCampaigns) || !Array.isArray(value.campaigns) || !Array.isArray(value.plans)
    || !Array.isArray(value.invalidPlans) || !Array.isArray(value.unmanagedPlans) || !Array.isArray(value.diagnostics)) {
    dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign inventory contains invalid values');
  }
  const activeCampaigns: readonly unknown[] = value.activeCampaigns;
  const campaigns: readonly unknown[] = value.campaigns;
  const plans: readonly unknown[] = value.plans;
  const invalidPlans: readonly unknown[] = value.invalidPlans;
  const unmanagedPlans: readonly unknown[] = value.unmanagedPlans;
  const diagnostics: readonly unknown[] = value.diagnostics;
  for (const record of activeCampaigns) {
    exactKeys(record, ['rootPlanId', 'activePlanIds'], 'active campaign');
    if (typeof record.rootPlanId !== 'string' || !stringList(record.activePlanIds)) dataError('CAMPAIGN_REPORT_SCHEMA', 'active campaign contains invalid values');
  }
  for (const record of campaigns) {
    exactKeys(record, ['rootPlanId', 'planIds'], 'campaign');
    if (typeof record.rootPlanId !== 'string' || !stringList(record.planIds)) dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign contains invalid values');
  }
  for (const record of plans) {
    exactKeys(record, ['id', 'rootPlanId', 'parentPlanId', 'dependsOn', 'lifecycle', 'path'], 'campaign inventory plan');
    if (typeof record.id !== 'string' || typeof record.rootPlanId !== 'string' || !(typeof record.parentPlanId === 'string' || record.parentPlanId === null)
      || !stringList(record.dependsOn) || typeof record.lifecycle !== 'string' || typeof record.path !== 'string') {
      dataError('CAMPAIGN_REPORT_SCHEMA', 'campaign inventory plan contains invalid values');
    }
  }
  for (const record of invalidPlans) {
    exactKeys(record, ['id', 'lifecycle', 'path', 'diagnostics'], 'invalid campaign plan');
    if (!Array.isArray(record.diagnostics)) dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid plan diagnostics must be an array');
    if (!(typeof record.lifecycle === 'string' || record.lifecycle === null) || typeof record.path !== 'string') dataError('CAMPAIGN_REPORT_SCHEMA', 'invalid campaign plan contains invalid values');
    const recordDiagnostics: readonly unknown[] = record.diagnostics;
    for (const item of recordDiagnostics) validateDiagnostic(item);
  }
  for (const record of unmanagedPlans) {
    exactKeys(record, ['path'], 'unmanaged campaign plan');
    if (typeof record.path !== 'string') dataError('CAMPAIGN_REPORT_SCHEMA', 'unmanaged campaign plan contains invalid values');
  }
  for (const record of diagnostics) validateDiagnostic(record);
}
export function readCampaignReportV2(value: unknown): CampaignInventoryV2 { validateCampaignInventory(value, 2); return value; }
export function readCampaignReportV3(value: unknown): CampaignInventoryV3 { validateCampaignInventory(value, 3); return value; }
export const CampaignReportReaders = Object.freeze({ V1: readCampaignReportV1, V2: readCampaignReportV2, V3: readCampaignReportV3 });

export function campaignDiagnostic(error: unknown, fallbackPath: string | null = null): CampaignDiagnostic {
  return error instanceof CampaignError
    ? { code: error.code, message: error.message, recordId: error.recordId ?? null, path: error.relativePath ?? fallbackPath }
    : { code: 'CAMPAIGN_INTERNAL', message: error instanceof Error ? error.message : String(error), recordId: null, path: fallbackPath };
}

// Traceability: implements REQ-CAMPAIGN-ORCHESTRATION
export function buildRepositoryInventory(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1, command: 'list' | 'report' | 'validate' = 'report'): CampaignInventoryV3 {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const candidates = scanPlanCandidates(canonicalRepositoryRoot, campaignManagementConfigV1);
  const unmanagedCandidates: CampaignPlanCandidate[] = [];
  const parsedPlans: CampaignInventoryEntry[] = [];
  const invalidByPath = new Map<string, CampaignInventoryInvalidPlan>();
  const diagnostics: CampaignDiagnostic[] = [];
  const addInvalid = (campaignPlanCandidate: CampaignPlanCandidate, error: unknown): void => {
    const campaignDiagnosticResult: CampaignDiagnostic = campaignDiagnostic(error, campaignPlanCandidate.relativePlanFile);
    const existing = invalidByPath.get(campaignPlanCandidate.relativePlanFile) ?? {
      id: candidateRecordId(campaignPlanCandidate),
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
      const plan = readManagedPlan(candidate);
      validatePlanContents(plan, campaignManagementConfigV1, canonicalRepositoryRoot);
      parsedPlans.push({ candidate, plan });
    } catch (error) {
      if (!(error instanceof CampaignError) || error.status !== 1) throw error;
      addInvalid(candidate, error);
    }
  }

  const plansById = new Map<string, CampaignInventoryEntry[]>();
  for (const entry of parsedPlans) {
    const entries = plansById.get(entry.plan.id) ?? [];
    entries.push(entry);
    plansById.set(entry.plan.id, entries);
  }
  const unmanagedById = new Map<string, CampaignPlanCandidate[]>();
  for (const candidate of unmanagedCandidates) {
    const id = path.basename(path.dirname(candidate.planFile));
    const matches = unmanagedById.get(id) ?? [];
    matches.push(candidate);
    unmanagedById.set(id, matches);
  }
  for (const entries of plansById.values()) {
    if (entries.length < 2) continue;
    for (const entry of entries) {
      addInvalid(entry.candidate, new CampaignError(
        1,
        'CAMPAIGN_PLAN_ID_DUPLICATE',
        `duplicate campaign plan ID: ${entry.plan.id}`,
        entry.plan.id,
        entry.plan.relativePlanFile,
      ));
    }
  }

  const entryForReference = (campaignInventoryEntry: CampaignInventoryEntry, referencedId: string, relationship: 'PARENT' | 'DEPENDENCY'): CampaignInventoryEntry | null => {
    const matches = plansById.get(referencedId) ?? [];
    if (matches.length === 0) {
      for (const candidate of unmanagedById.get(referencedId) ?? []) {
        addInvalid(candidate, new CampaignError(
          1,
          'CAMPAIGN_PLAN_BLOCK',
          `${candidate.relativePlanFile} requires ${PLAN_METADATA_MARKER} metadata because managed plan ${campaignInventoryEntry.plan.id} references it`,
          referencedId,
          candidate.relativePlanFile,
        ));
      }
    }
    const match = matches[0];
    if (matches.length !== 1 || match === undefined || invalidByPath.has(match.plan.relativePlanFile)) {
      addInvalid(campaignInventoryEntry.candidate, new CampaignError(
        1,
        matches.length > 1 ? `CAMPAIGN_${relationship}_AMBIGUOUS` : `CAMPAIGN_${relationship}_MISSING`,
        `${relationship.toLowerCase()} plan is not uniquely valid: ${referencedId}`,
        campaignInventoryEntry.plan.id,
        campaignInventoryEntry.plan.relativePlanFile,
      ));
      return null;
    }
    return match;
  };
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    if (entry.plan.parentPlanId !== null) {
      const parent = entryForReference(entry, entry.plan.parentPlanId, 'PARENT');
      if (parent) {
        try {
          validateCampaignReference(entry.plan, parent.plan);
        } catch (error) {
          addInvalid(entry.candidate, error);
        }
      }
    }
    for (const dependencyId of entry.plan.dependsOn) entryForReference(entry, dependencyId, 'DEPENDENCY');
  }

  function detectCycles(edgeName: 'parent' | 'dependency', code: string): void {
    const visited = new Set<string>();
    const visiting: CampaignInventoryEntry[] = [];
    const visit = (entry: CampaignInventoryEntry): void => {
      if (visited.has(entry.plan.relativePlanFile) || invalidByPath.has(entry.plan.relativePlanFile)) return;
      const index = visiting.findIndex((item) => item.plan.relativePlanFile === entry.plan.relativePlanFile);
      if (index !== -1) {
        for (const member of visiting.slice(index)) {
          addInvalid(member.candidate, new CampaignError(1, code, `${edgeName} cycle reaches ${entry.plan.id}`, member.plan.id, member.plan.relativePlanFile));
        }
        return;
      }
      visiting.push(entry);
      const ids = edgeName === 'parent' ? entry.plan.parentPlanId === null ? [] : [entry.plan.parentPlanId] : entry.plan.dependsOn;
      for (const id of ids) {
        const matches = plansById.get(id) ?? [];
        const match = matches[0];
        if (matches.length === 1 && match !== undefined) visit(match);
      }
      visiting.pop();
      visited.add(entry.plan.relativePlanFile);
    };
    for (const entry of parsedPlans) visit(entry);
  }
  detectCycles('parent', 'CAMPAIGN_PARENT_CYCLE');
  detectCycles('dependency', 'CAMPAIGN_DEPENDENCY_CYCLE');

  const rootFor = (entry: CampaignInventoryEntry): CampaignInventoryEntry | null => {
    let current = entry;
    const seen = new Set<string>();
    while (current.plan.parentPlanId !== null) {
      if (seen.has(current.plan.relativePlanFile)) return null;
      seen.add(current.plan.relativePlanFile);
      const matches = plansById.get(current.plan.parentPlanId) ?? [];
      const match = matches[0];
      if (matches.length !== 1 || match === undefined || invalidByPath.has(match.plan.relativePlanFile)) return null;
      current = match;
    }
    return current;
  };
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    const root = rootFor(entry);
    if (!root) continue;
    for (const dependencyId of entry.plan.dependsOn) {
      const dependency = (plansById.get(dependencyId) ?? [])[0];
      const dependencyRoot = dependency && rootFor(dependency);
      if (dependencyRoot && dependencyRoot.plan.id !== root.plan.id) {
        addInvalid(entry.candidate, new CampaignError(1, 'CAMPAIGN_DEPENDENCY_CAMPAIGN', `dependency ${dependencyId} belongs to campaign ${dependencyRoot.plan.id}`, entry.plan.id, entry.plan.relativePlanFile));
      }
    }
  }

  const validEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
  const campaignEntries = new Map<string, CampaignInventoryEntry[]>();
  for (const entry of validEntries) {
    const root = rootFor(entry);
    if (!root) continue;
    const members = campaignEntries.get(root.plan.id) ?? [];
    members.push(entry);
    campaignEntries.set(root.plan.id, members);
  }
  for (const members of campaignEntries.values()) {
    const member = members[0];
    if (member === undefined) throw new Error('campaign inventory group lacks its first member');
    const root = rootFor(member);
    if (root === null) throw new Error('validated campaign inventory root is absent');
    if (root.plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion || members.length === 1) continue;
    for (const member of members) {
      if (member.plan.lifecycle !== campaignManagementConfigV1.lifecycle.roles.successfulCompletion) {
        addInvalid(root.candidate, new CampaignError(1, 'CAMPAIGN_ROOT_CLOSED_INCOMPLETE', `completed campaign root has incomplete member ${member.plan.id}`, root.plan.id, root.plan.relativePlanFile));
        break;
      }
    }
  }
  for (const entry of parsedPlans) {
    if (invalidByPath.has(entry.plan.relativePlanFile)) continue;
    if (!rootFor(entry)) {
      addInvalid(entry.candidate, new CampaignError(1, 'CAMPAIGN_PARENT_INVALID', 'campaign root cannot be resolved through valid parent records', entry.plan.id, entry.plan.relativePlanFile));
    }
  }

  const finalEntries = parsedPlans.filter((entry) => !invalidByPath.has(entry.plan.relativePlanFile));
  const finalCampaignEntries = new Map<string, CampaignInventoryEntry[]>();
  for (const entry of finalEntries) {
    const root = rootFor(entry);
    if (!root || invalidByPath.has(root.plan.relativePlanFile)) continue;
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
    if (root === null) throw new Error('final campaign inventory root is absent');
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
  for (const plan of invalidPlans) plan.diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
  const unmanagedPlans = unmanagedCandidates
    .filter((candidate) => !invalidByPath.has(candidate.relativePlanFile))
    .map((candidate) => ({ path: candidate.relativePlanFile }));
  const campaignInventoryV3: CampaignInventoryV3 = {
    schemaVersion: 3,
    valid: invalidPlans.length === 0 && diagnostics.length === 0,
    invocation: { command },
    repository: repositoryIdentity(canonicalRepositoryRoot),
    activeCampaigns,
    campaigns,
    plans,
    invalidPlans,
    unmanagedPlans: unmanagedPlans.sort((left, right) => left.path.localeCompare(right.path)),
    diagnostics,
  };
  return readCampaignReportV3(campaignInventoryV3);
}
