// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import { readManagementConfig, type CampaignManagementConfigV1, type CampaignLifecycleRoles } from './campaign-configuration.js';
import { discoverCampaign, type DiscoveredCampaign } from './campaign-scope.js';
import { validateCampaignDependencies, validateExternalTaskletDependencies, type CampaignDependencyResult, type CampaignTaskletPrerequisite } from './campaign-dependencies.js';
import { validatePlanContents, type CampaignPlanContents, type CampaignSprintTasklets, type CampaignPlanningSprint } from './campaign-plan-contents.js';

export interface CampaignGraphPlan {
  readonly id: string; readonly parentPlanId: string | null; readonly dependsOn: readonly string[];
  readonly lifecycle: string; readonly path: string;
  readonly runnableTasklets: CampaignSprintTasklets | null; readonly reviewableSprint: CampaignSprintTasklets | null;
  readonly planningSprint: CampaignPlanningSprint | null;
}
export interface CampaignGraph {
  readonly campaignId: string; readonly submittedPlanId: string; readonly obligationDocument: string | null;
  readonly externalPrerequisites: readonly CampaignTaskletPrerequisite[]; readonly plans: readonly CampaignGraphPlan[];
  readonly lifecycle: CampaignLifecycleRoles;
}

export function campaignGraph(repositoryRoot: string, input?: string): CampaignGraph {
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = readManagementConfig(canonicalRepositoryRoot);
  const discoveredCampaign: DiscoveredCampaign = discoverCampaign(canonicalRepositoryRoot, campaignManagementConfigV1, input);
  validateCampaignDependencies(discoveredCampaign.plans);
  const contents = new Map<string, CampaignPlanContents>(discoveredCampaign.plans.map(plan => [plan.id, validatePlanContents(plan, campaignManagementConfigV1, canonicalRepositoryRoot)]));
  const campaignDependencyResult: CampaignDependencyResult = validateExternalTaskletDependencies(canonicalRepositoryRoot, discoveredCampaign.plans, contents);
  return {
    campaignId: discoveredCampaign.root.id,
    submittedPlanId: discoveredCampaign.selected.id,
    obligationDocument: discoveredCampaign.root.schemaVersion === 3 ? discoveredCampaign.root.obligationDocument : null,
    externalPrerequisites: campaignDependencyResult.prerequisites,
    plans: discoveredCampaign.plans.map(plan => {
      const campaignPlanContents = contents.get(plan.id);
      if (campaignPlanContents === undefined) throw new Error(`validated campaign contents are absent: ${plan.id}`);
      return {
        id: plan.id, parentPlanId: plan.parentPlanId, dependsOn: [...plan.dependsOn], lifecycle: plan.lifecycle, path: plan.relativePlanFile,
        runnableTasklets: campaignDependencyResult.blockedSprints.has(`${plan.id}\0${campaignPlanContents.runnableTasklets?.sprintId}`) ? null : campaignPlanContents.runnableTasklets,
        reviewableSprint: campaignDependencyResult.blockedSprints.has(`${plan.id}\0${campaignPlanContents.reviewableSprint?.sprintId}`) ? null : campaignPlanContents.reviewableSprint,
        planningSprint: campaignPlanContents.planningSprint,
      };
    }),
    lifecycle: { ...campaignManagementConfigV1.lifecycle.roles },
  };
}
