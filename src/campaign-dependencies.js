// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-dependencies.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCampaignDependencies = validateCampaignDependencies;
exports.validateExternalTaskletDependencies = validateExternalTaskletDependencies;
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const tasklet_statuses_js_1 = require("../skills/plan-execution/scripts/tasklet-statuses.js");
function validateCampaignDependencies(plans) {
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    for (const plan of plans) {
        for (const dependencyId of plan.dependsOn) {
            if (!plansById.has(dependencyId)) {
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_DEPENDENCY_MISSING', `dependency is not a member of campaign ${plans[0]?.id}: ${dependencyId}`, plan.id, plan.relativePlanFile);
            }
        }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (plan) => {
        if (visiting.has(plan.id))
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_DEPENDENCY_CYCLE', `dependency cycle reaches ${plan.id}`, plan.id, plan.relativePlanFile);
        if (visited.has(plan.id))
            return;
        visiting.add(plan.id);
        for (const dependencyId of plan.dependsOn) {
            const dependency = plansById.get(dependencyId);
            if (dependency === undefined)
                throw new Error('validated campaign dependency is absent');
            visit(dependency);
        }
        visiting.delete(plan.id);
        visited.add(plan.id);
    };
    for (const plan of plans)
        visit(plan);
}
function validateExternalTaskletDependencies(repositoryRoot, plans, contents) {
    const tasklets = new Map();
    for (const plan of plans) {
        const campaignDependencyContents = contents.get(plan.id);
        if (campaignDependencyContents === undefined)
            throw new Error(`campaign dependency contents are absent: ${plan.id}`);
        for (const tasklet of campaignDependencyContents.taskletDependencies) {
            tasklets.set(`${plan.id}\0${tasklet.id}`, { ...tasklet, planId: plan.id, path: plan.relativePlanFile });
        }
    }
    const blockedSprints = new Set();
    const prerequisites = [];
    const edges = new Map();
    const integratedSprints = new Map();
    const integratedStatus = (campaignDependencyTasklet) => {
        const sprintFile = node_path_1.default.posix.join(node_path_1.default.posix.dirname(campaignDependencyTasklet.path), 'sprints', `${campaignDependencyTasklet.sprintId}.md`);
        if (!integratedSprints.has(sprintFile)) {
            const result = (0, node_child_process_1.spawnSync)('git', ['-C', repositoryRoot, 'show', `HEAD:${sprintFile}`], { encoding: 'utf8' });
            integratedSprints.set(sprintFile, result.status === 0 ? (0, tasklet_statuses_js_1.parseTaskletStatuses)(sprintFile, result.stdout) : new Map());
        }
        const statuses = integratedSprints.get(sprintFile);
        if (statuses === undefined)
            throw new Error('integrated sprint status cache is absent');
        return campaignDependencyTasklet.status === 'DONE' && statuses.get(campaignDependencyTasklet.id) === 'DONE' ? 'DONE'
            : campaignDependencyTasklet.status === 'ERROR' ? 'ERROR' : 'PENDING';
    };
    for (const [key, tasklet] of tasklets) {
        const dependencies = tasklet.dependsOn.map((id) => `${tasklet.planId}\0${id}`);
        for (const external of tasklet.externalDependsOn) {
            const target = tasklets.get(`${external.planId}\0${external.taskletId}`);
            if (!target || external.planId === tasklet.planId) {
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_TASKLET_DEPENDENCY', `external tasklet prerequisite must name another campaign plan and an existing tasklet: ${external.planId}/${external.taskletId}`, tasklet.planId, tasklet.path);
            }
            const status = integratedStatus(target);
            if (tasklet.status === 'DONE' && status !== 'DONE') {
                (0, campaign_configuration_js_1.dataError)('CAMPAIGN_TASKLET_DEPENDENCY', `completed tasklet ${tasklet.id} has unfinished external prerequisite ${external.planId}/${external.taskletId}`, tasklet.planId, tasklet.path);
            }
            if (status !== 'DONE')
                blockedSprints.add(`${tasklet.planId}\0${tasklet.sprintId}`);
            prerequisites.push({ planId: tasklet.planId, sprintId: tasklet.sprintId, taskletId: tasklet.id,
                requiredPlanId: external.planId, requiredTaskletId: external.taskletId, status });
            dependencies.push(`${external.planId}\0${external.taskletId}`);
        }
        edges.set(key, dependencies);
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (key) => {
        if (visiting.has(key)) {
            const tasklet = tasklets.get(key);
            if (tasklet === undefined)
                throw new Error(`campaign dependency tasklet is absent: ${key}`);
            (0, campaign_configuration_js_1.dataError)('CAMPAIGN_TASKLET_DEPENDENCY_CYCLE', `cross-plan tasklet dependency cycle reaches ${tasklet.planId}/${tasklet.id}`, tasklet.planId, tasklet.path);
        }
        if (visited.has(key))
            return;
        visiting.add(key);
        const dependencies = edges.get(key);
        if (dependencies === undefined)
            throw new Error(`campaign dependency edges are absent: ${key}`);
        for (const dependency of dependencies)
            visit(dependency);
        visiting.delete(key);
        visited.add(key);
    };
    for (const key of tasklets.keys())
        visit(key);
    return { blockedSprints, prerequisites: prerequisites.sort((left, right) => JSON.stringify([left.planId, left.sprintId, left.taskletId, left.requiredPlanId, left.requiredTaskletId])
            .localeCompare(JSON.stringify([right.planId, right.sprintId, right.taskletId, right.requiredPlanId, right.requiredTaskletId]))) };
}
