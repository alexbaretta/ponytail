// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import { dataError, toolError, type CampaignManagementConfigV1 } from './campaign-configuration.js';
import * as CampaignGraph from './campaign-graph.js';
import { buildReport } from './campaign-report.js';
import type { CampaignStatus } from './campaign-inventory.js';

export interface CampaignActivationResult {
  readonly rootPlanId: string; readonly activated: boolean;
}
interface CampaignActivationChange {
  readonly sourceFile: string; readonly destinationFile: string;
  readonly original: string; readonly text: string;
}

function markdownFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...markdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files;
}

function pathWithin(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function movedPath(filePath: string, sourceDirectory: string, destinationDirectory: string): string {
  return pathWithin(filePath, sourceDirectory)
    ? path.join(destinationDirectory, path.relative(sourceDirectory, filePath))
    : filePath;
}

function rewriteMovedLinks(text: string, sourceFile: string, destinationFile: string,
  sourceDirectory: string, destinationDirectory: string): string {
  return text.replace(/\]\(([^)]+)\)/g, (match: string, destination: string): string => {
    if (!destination || destination.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(destination) || path.isAbsolute(destination)) return match;
    const suffixIndex = destination.search(/[?#]/);
    const linkPath = suffixIndex === -1 ? destination : destination.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex);
    const target = path.resolve(path.dirname(sourceFile), linkPath);
    const movedTarget = movedPath(target, sourceDirectory, destinationDirectory);
    if (sourceFile === destinationFile && target === movedTarget) return match;
    let relative = path.relative(path.dirname(destinationFile), movedTarget).split(path.sep).join('/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `](${relative}${suffix})`;
  });
}

// Traceability: implements REQ-PONYTAIL-STATIC-LANGUAGE
export function activateCampaign(repositoryRoot: string, campaignManagementConfigV1: CampaignManagementConfigV1,
  input: string): CampaignActivationResult {
  const campaignGraph: CampaignGraph.CampaignGraph = CampaignGraph.campaignGraph(repositoryRoot, input);
  const rootCampaignGraphPlan: CampaignGraph.CampaignGraphPlan | undefined = campaignGraph.plans.find(({ id }) => id === campaignGraph.campaignId);
  if (!rootCampaignGraphPlan) throw new Error(`validated campaign root is absent: ${campaignGraph.campaignId}`);
  const lifecycleStatuses: Readonly<Record<string, CampaignStatus>> = {
    [campaignManagementConfigV1.lifecycle.roles.initial]: 'pending',
    [campaignManagementConfigV1.lifecycle.roles.successfulCompletion]: 'closed',
    [campaignManagementConfigV1.lifecycle.roles.deferred]: 'deferred',
    [campaignManagementConfigV1.lifecycle.roles.rejected]: 'rejected',
  };
  const campaignStatus: CampaignStatus | undefined = campaignGraph.plans.some(({ lifecycle }) => lifecycle === campaignManagementConfigV1.lifecycle.roles.activeWork)
    ? 'active' : lifecycleStatuses[rootCampaignGraphPlan.lifecycle];
  if (campaignStatus === 'active') return { rootPlanId: campaignGraph.campaignId, activated: false };
  if (campaignStatus !== 'pending') {
    dataError('CAMPAIGN_ACTIVATE_STATUS', `campaign ${campaignGraph.campaignId} is ${campaignStatus}; only pending campaigns can be activated`, campaignGraph.campaignId, rootCampaignGraphPlan.path);
  }

  const rootPlanFile = path.join(repositoryRoot, rootCampaignGraphPlan.path);
  const sourceDirectory = path.dirname(rootPlanFile);
  const destinationDirectory = path.join(repositoryRoot, campaignManagementConfigV1.planRoot, campaignManagementConfigV1.lifecycle.roles.activeWork, campaignGraph.campaignId);
  if (fs.existsSync(destinationDirectory)) toolError('CAMPAIGN_ACTIVATE_DESTINATION', `campaign activation destination already exists: ${path.relative(repositoryRoot, destinationDirectory)}`);
  const files = markdownFiles(path.join(repositoryRoot, campaignManagementConfigV1.managementRoot));
  const campaignActivationChanges: CampaignActivationChange[] = files.map((sourceFile): CampaignActivationChange => {
    const destinationFile = movedPath(sourceFile, sourceDirectory, destinationDirectory);
    let text = fs.readFileSync(sourceFile, 'utf8');
    if (sourceFile === rootPlanFile) {
      const statusPattern = /^- \*\*Status:\*\* `[^`]+`$/gm;
      const matches = [...text.matchAll(statusPattern)];
      if (matches.length !== 1) dataError('CAMPAIGN_PLAN_STATUS', 'campaign root must contain exactly one canonical status field', campaignGraph.campaignId, rootCampaignGraphPlan.path);
      text = text.replace(statusPattern, `- **Status:** \`${campaignManagementConfigV1.lifecycle.roles.activeWork}\``);
    }
    return { sourceFile, destinationFile, original: fs.readFileSync(sourceFile, 'utf8'),
      text: rewriteMovedLinks(text, sourceFile, destinationFile, sourceDirectory, destinationDirectory) };
  });

  fs.mkdirSync(path.dirname(destinationDirectory), { recursive: true });
  fs.renameSync(sourceDirectory, destinationDirectory);
  try {
    for (const campaignActivationChange of campaignActivationChanges) fs.writeFileSync(campaignActivationChange.destinationFile, campaignActivationChange.text);
    buildReport(repositoryRoot, campaignManagementConfigV1, campaignGraph.campaignId);
  } catch (error) {
    fs.renameSync(destinationDirectory, sourceDirectory);
    for (const campaignActivationChange of campaignActivationChanges) fs.writeFileSync(campaignActivationChange.sourceFile, campaignActivationChange.original);
    throw error;
  }
  return { rootPlanId: campaignGraph.campaignId, activated: true };
}
