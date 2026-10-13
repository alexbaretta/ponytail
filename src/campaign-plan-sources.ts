// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { dataError, toolError, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import { parseCandidate, type CampaignPlanCandidate, type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from './campaign-plan-metadata.js';

export interface CampaignPlanSource { readonly lifecycle: string | null; readonly relativePlanFile: string }
function isPlanFile(file: string): boolean {
  return fs.existsSync(file) && !fs.lstatSync(file).isSymbolicLink() && fs.statSync(file).isFile();
}

function sortedDirectories(directory: string): string[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    toolError('CAMPAIGN_IO', `cannot list ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function scanPlanCandidates(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1): CampaignPlanCandidate[] {
  const planRoot = path.join(repositoryRoot, campaignManagementConfigV1.planRoot);
  if (!fs.existsSync(planRoot) || !fs.statSync(planRoot).isDirectory()) {
    toolError('CAMPAIGN_PLAN_ROOT', `configured plan root does not exist: ${campaignManagementConfigV1.planRoot}`, campaignManagementConfigV1.planRoot);
  }
  if (fs.lstatSync(planRoot).isSymbolicLink()) {
    dataError('CAMPAIGN_CONFIG_PATH', `configured plan root must not be a symbolic link: ${campaignManagementConfigV1.planRoot}`, null, campaignManagementConfigV1.planRoot);
  }
  const canonicalPlanRoot = fs.realpathSync(planRoot);
  if (canonicalPlanRoot !== repositoryRoot && !canonicalPlanRoot.startsWith(`${repositoryRoot}${path.sep}`)) {
    dataError('CAMPAIGN_CONFIG_PATH', `configured plan root escapes the repository: ${campaignManagementConfigV1.planRoot}`, null, campaignManagementConfigV1.planRoot);
  }
  const candidates: CampaignPlanCandidate[] = [];
  for (const lifecycle of campaignManagementConfigV1.lifecycle.directories) {
    const lifecycleDirectory = path.join(planRoot, lifecycle);
    if (!fs.existsSync(lifecycleDirectory)) continue;
    if (fs.lstatSync(lifecycleDirectory).isSymbolicLink() || !fs.statSync(lifecycleDirectory).isDirectory()) {
      dataError('CAMPAIGN_CONFIG_PATH', `lifecycle location must be a regular directory: ${campaignManagementConfigV1.planRoot}/${lifecycle}`, null, `${campaignManagementConfigV1.planRoot}/${lifecycle}`);
    }
    for (const name of sortedDirectories(lifecycleDirectory)) {
      const planFile = path.join(lifecycleDirectory, name, 'plan.md');
      if (isPlanFile(planFile)) {
        candidates.push(parseCandidate(planFile, lifecycle, repositoryRoot));
      }
    }
  }
  if (campaignManagementConfigV1.legacyPlanLayout === 'flat') {
    const lifecycleDirectories = new Set(campaignManagementConfigV1.lifecycle.directories);
    for (const name of sortedDirectories(planRoot)) {
      if (lifecycleDirectories.has(name)) continue;
      const planFile = path.join(planRoot, name, 'plan.md');
      if (isPlanFile(planFile)) {
        candidates.push(parseCandidate(planFile, null, repositoryRoot));
      }
    }
  }
  return candidates.sort((left, right) => {
    const leftOrder = left.lifecycle === null ? campaignManagementConfigV1.lifecycle.directories.length : campaignManagementConfigV1.lifecycle.directories.indexOf(left.lifecycle);
    const rightOrder = right.lifecycle === null ? campaignManagementConfigV1.lifecycle.directories.length : campaignManagementConfigV1.lifecycle.directories.indexOf(right.lifecycle);
    return leftOrder - rightOrder || left.relativePlanFile.localeCompare(right.relativePlanFile);
  });
}

export function listPlanSourceFiles(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1, onDiscovery?:()=>void): CampaignPlanSource[] {
  const planRoot = path.join(repositoryRoot, campaignManagementConfigV1.planRoot);
  const sources: CampaignPlanSource[] = [];
  for (const lifecycle of campaignManagementConfigV1.lifecycle.directories) {
    const directory = path.join(planRoot, lifecycle);
    if (!fs.existsSync(directory)) continue;
    for (const name of sortedDirectories(directory)) {
      onDiscovery?.();
      const planFile = path.join(directory, name, 'plan.md');
      if (isPlanFile(planFile)) {
        sources.push({
          lifecycle,
          relativePlanFile: path.relative(repositoryRoot, planFile).split(path.sep).join('/'),
        });
      }
    }
  }
  if (campaignManagementConfigV1.legacyPlanLayout === 'flat') {
    const lifecycleDirectories = new Set(campaignManagementConfigV1.lifecycle.directories);
    for (const name of sortedDirectories(planRoot)) {
      if (lifecycleDirectories.has(name)) continue;
      onDiscovery?.();
      const planFile = path.join(planRoot, name, 'plan.md');
      if (isPlanFile(planFile)) {
        sources.push({
          lifecycle: null,
          relativePlanFile: path.relative(repositoryRoot, planFile).split(path.sep).join('/'),
        });
      }
    }
  }
  return sources.sort((left, right) =>
    left.relativePlanFile.localeCompare(right.relativePlanFile));
}

export function linkedPlanFiles(campaignPlan: CampaignPlanV1 | CampaignPlanV2 | CampaignPlanV3): string[] {
  const links = [...campaignPlan.text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)];
  return links.flatMap((match) => {
    const reference = match[1];
    if (reference === undefined) throw new Error('campaign plan link matcher lacks its required capture');
    const target = path.resolve(path.dirname(campaignPlan.planFile), reference);
    const file = path.basename(target) === 'plan.md' ? target : path.join(target, 'plan.md');
    return fs.existsSync(file) ? [fs.realpathSync(file)] : [];
  });
}
