// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-graph.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignGraph = campaignGraph;
const node_fs_1 = __importDefault(require("node:fs"));
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaign_scope_js_1 = require("./campaign-scope.js");
const campaign_dependencies_js_1 = require("./campaign-dependencies.js");
const campaign_plan_contents_js_1 = require("./campaign-plan-contents.js");
function campaignGraph(repositoryRoot, input) {
    const canonicalRepositoryRoot = node_fs_1.default.realpathSync(repositoryRoot);
    const campaignManagementConfigV1 = (0, campaign_configuration_js_1.readManagementConfig)(canonicalRepositoryRoot);
    const discoveredCampaign = (0, campaign_scope_js_1.discoverCampaign)(canonicalRepositoryRoot, campaignManagementConfigV1, input);
    (0, campaign_dependencies_js_1.validateCampaignDependencies)(discoveredCampaign.plans);
    const contents = new Map(discoveredCampaign.plans.map(plan => [plan.id, (0, campaign_plan_contents_js_1.validatePlanContents)(plan, campaignManagementConfigV1, canonicalRepositoryRoot)]));
    const campaignDependencyResult = (0, campaign_dependencies_js_1.validateExternalTaskletDependencies)(canonicalRepositoryRoot, discoveredCampaign.plans, contents);
    return {
        campaignId: discoveredCampaign.root.id,
        submittedPlanId: discoveredCampaign.selected.id,
        obligationDocument: discoveredCampaign.root.schemaVersion === 3 ? discoveredCampaign.root.obligationDocument : null,
        externalPrerequisites: campaignDependencyResult.prerequisites,
        plans: discoveredCampaign.plans.map(plan => {
            const campaignPlanContents = contents.get(plan.id);
            if (campaignPlanContents === undefined)
                throw new Error(`validated campaign contents are absent: ${plan.id}`);
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
