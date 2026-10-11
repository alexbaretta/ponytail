// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type TestContext } from 'node:test';
import { inputDigest, acceptCheckpoint, type ObligationDocumentV1, type ObligationBaseline,
 type ObligationCoordinate } from '../../skills/plan-execution/scripts/obligations.js';
import { type CampaignPlanMetadataV3 } from '../../src/campaign-plan-metadata.js';
import { type SprintMetadataV3 } from '../../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV4 } from '../../skills/plan-execution/scripts/tasklet-metadata.js';

export interface ObligationFixture {
 readonly root: string; readonly documentPath: string; readonly planPath: string;
 readonly planText: string; readonly sprintPath: string; readonly document: ObligationDocumentV1;
 readonly proofPath: string; readonly environment: NodeJS.ProcessEnv;
}
export function git(root: string, args: readonly string[]): string {
 const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr);
 return result.stdout.trim();
}
export function fixture(testContext: TestContext): ObligationFixture {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-obligation-consumer-')));
 testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
 const documentPath = 'pm/plans/in_progress/pilot/obligations.json';
 const planPath = 'pm/plans/in_progress/pilot/plan.md';
 const sprintPath = 'pm/plans/in_progress/pilot/sprints/S01.md';
 fs.mkdirSync(path.join(root, path.dirname(sprintPath)), { recursive: true });
 fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
 fs.writeFileSync(path.join(root, '.agents/config/project/management.json'),
  fs.readFileSync(path.join(process.cwd(), '.agents/config/project/management.json')));
 fs.writeFileSync(path.join(root, 'requirement.md'), 'approved observable behavior');
 fs.writeFileSync(path.join(root, 'src.txt'), 'implementation input');
 fs.writeFileSync(path.join(root, '.gitignore'), 'state/\ncandidate.json\n');
 const proofPath = 'pm/plans/in_progress/pilot/proof.txt';
 fs.writeFileSync(path.join(root, proofPath), 'inspected category with no omitted responsibilities');
 const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { schemaVersion: 3, id: 'pilot', parent_plan_id: null,
  depends_on: [], obligation_document: documentPath };
 const planText = `# Pilot\n\n- Plan ID: \`pilot\`\n- **Status:** \`in_progress\`\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV3)}\n-->\n`;
 fs.writeFileSync(path.join(root, planPath), planText);
 const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01', planning: {
  status: 'APPROVED', depends_on: [], scope_roots: ['src.txt'] }, execution: {
  status: 'IN_PROGRESS', depends_on: [], tasklets_reviewed: true } };
 fs.writeFileSync(path.join(root, sprintPath), `# Sprint\n\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n\n### [ ] Tasklet S01-F01-T01: Edit input\n\n### [ ] Tasklet S01-F01-T02: Validate feature\n`);
 const taskletMetadataV4: TaskletMetadataV4 = { schemaVersion: 4, sprint: 'S01', features: {
  'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } }, tasklets: {
  'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src.txt'] },
  'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } }, external_depends_on: {} };
 fs.writeFileSync(path.join(root, sprintPath.replace('.md', '.tasklets.json')), JSON.stringify(taskletMetadataV4));
 const obligationBaseline: ObligationBaseline = { id: 'B1', predecessorId: null,
  authority: { references: ['approved-CHNG'], assessors: ['coordinator'] }, requirements: [
  { id: 'REQ-PILOT', path: 'requirement.md', digest: inputDigest(root, 'requirement.md') } ],
  obligationIds: ['OBL-1','OBL-2','OBL-3','OBL-4','OBL-5','OBL-6'], inventoryIds: ['OBL-1','OBL-2','OBL-3','OBL-4','OBL-5','OBL-6'] };
 const categories: readonly ObligationCoordinate[] = ['T1','T2','T3','T4','C1','C2'];
 const obligationDocumentV1: ObligationDocumentV1 = { schemaVersion: 1, scopeId: 'pilot', baselines: [obligationBaseline],
  obligations: categories.map((category, index) => ({ id: `OBL-${index + 1}`, category, requirementIds: ['REQ-PILOT'],
   responsibilityId: `${category}-inventory`, condition: `Complete ${category} inventory`,
   criterion: 'Reviewed complete scope with justified exclusions', dependsOn: [], acceptanceGroups: ['pilot'], supersedes: null,
   execution: { sprintId: index === 0 ? 'S01' : null, taskletIds: index === 0 ? ['S01-F01-T01'] : [],
    plannedPaths: index === 0 ? ['src.txt'] : [], operations: ['inspect'], selection: [], target: null } })), certificates: [], checkpoints: [] };
 const candidateObligationDocumentV1: ObligationDocumentV1 = { ...obligationDocumentV1, checkpoints: [{
  id: 'CP1', predecessorId: null, baselineId: 'B1', kind: 'initial', selectedIds: [],
  registeredIds: obligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [], before: [1,1,1,1,1,1], after: [1,1,1,1,1,1],
  preparation: null, reason: 'Complete declared initial scope', assessor: 'coordinator' }] };
 const acceptedObligationDocumentV1 = acceptCheckpoint(obligationDocumentV1, candidateObligationDocumentV1, root);
 fs.writeFileSync(path.join(root, documentPath), JSON.stringify(acceptedObligationDocumentV1));
 git(root, ['init','-b','main']); git(root, ['config','user.email','fixture@example.test']);
 git(root, ['config','user.name','Fixture']); git(root, ['add','.']); git(root, ['commit','-m','Initial scoped fixture']);
 const environment: NodeJS.ProcessEnv = { ...process.env, PONYTAIL_SESSION_ID: 'coordinator', PONYTAIL_CAMPAIGN_STATE_DIR: path.join(root, 'state') };
 return { root, documentPath, planPath, planText, sprintPath, document: acceptedObligationDocumentV1, proofPath, environment };
}
