// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {fixture} from './helpers/obligation-fixture.js';
import {acceptCheckpoint,inputDigest,projectObligations,projectObligationHistoricalAcceptance,type ObligationCertificate,type ObligationCheckpoint,type ObligationVector} from '../skills/plan-execution/scripts/obligations.js';
import {parsePlanSource} from '../src/campaign-plan-metadata.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type CampaignManagementConfigV1 } from '../src/campaign-configuration.js';
import { type CampaignPlanV1, type CampaignPlanMetadataV1 } from '../src/campaign-plan-metadata.js';
import { validatePlanContents, type CampaignPlanContents } from '../src/campaign-plan-contents.js';
import { type SprintMetadataV3 } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { type TaskletMetadataV3 } from '../skills/plan-execution/scripts/tasklet-metadata.js';

function configuration(): CampaignManagementConfigV1 {
  return { schemaVersion: 1, managementRoot: 'pm', planRoot: 'pm/plans', legacyPlanLayout: 'none',
    lifecycle: { directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' } } };
}
function plan(root: string): CampaignPlanV1 {
  const planDirectory = path.join(root, 'pm/plans/open/plan');
  fs.mkdirSync(path.join(planDirectory, 'sprints'), { recursive: true });
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'plan', parent_plan_id: null };
  const text = `Plan ID: plan\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n`;
  const planFile = path.join(planDirectory, 'plan.md');
  fs.writeFileSync(planFile, text);
  return { schemaVersion: 1, id: 'plan', parentPlanId: null, dependsOn: [], lifecycle: 'open', planDirectory, planFile,
    relativePlanFile: 'pm/plans/open/plan/plan.md', text };
}
function sprint(campaignPlanV1: CampaignPlanV1, sprintMetadataV3: SprintMetadataV3, headings = ''): void {
  fs.writeFileSync(path.join(campaignPlanV1.planDirectory, 'sprints/S01.md'), `# Sprint\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n${headings}`);
}

test('planning-only contents retain zero execution counts without requiring tasklet metadata', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-contents-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignPlanV1: CampaignPlanV1 = plan(root);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'STUB', depends_on: [], scope_roots: ['src'] }, execution: null };
  sprint(campaignPlanV1, sprintMetadataV3);
  const campaignPlanContents: CampaignPlanContents = validatePlanContents(campaignPlanV1, campaignManagementConfigV1, root);
  assert.deepEqual(campaignPlanContents, { sprints: [{ id: 'S01', planId: 'plan', planningStatus: 'STUB', executionStatus: null,
    taskletCounts: { PENDING: 0, DONE: 0, ERROR: 0 }, totalTasklets: 0 }], tasklets: [], taskletDependencies: [],
    runnableTasklets: null, reviewableSprint: null, planningSprint: { sprintId: 'S01', planningStatus: 'STUB' } });
});

test('execution contents retain normalized statuses, feature paths and exact ready tasklet scope', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-contents-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaignPlanV1: CampaignPlanV1 = plan(root);
  const campaignManagementConfigV1: CampaignManagementConfigV1 = configuration();
  const sprintMetadataV3: SprintMetadataV3 = { schemaVersion: 3, id: 'S01',
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution: { status: 'PENDING', depends_on: [], tasklets_reviewed: true } };
  sprint(campaignPlanV1, sprintMetadataV3, '### [DONE] Tasklet S01-F01-T01: implement\n### [ ] Tasklet S01-F01-T02: validate\n');
  const taskletMetadataV3: TaskletMetadataV3 = { schemaVersion: 3, sprint: 'S01', features: {
    'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' } }, tasklets: {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src/input.ts'] },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] } } };
  fs.writeFileSync(path.join(campaignPlanV1.planDirectory, 'sprints/S01.tasklets.json'), JSON.stringify(taskletMetadataV3));
  const campaignPlanContents: CampaignPlanContents = validatePlanContents(campaignPlanV1, campaignManagementConfigV1, root);
  assert.deepEqual(campaignPlanContents.runnableTasklets, { sprintId: 'S01', taskletIds: ['S01-F01-T02'] });
  assert.deepEqual(campaignPlanContents.sprints[0]?.taskletCounts, { PENDING: 1, DONE: 1, ERROR: 0 });
  assert.equal(campaignPlanContents.sprints[0]?.totalTasklets, 2);
  assert.deepEqual(campaignPlanContents.tasklets.map(item => [item.id, item.featureId, item.status, item.plannedPaths]), [
    ['S01-F01-T01', 'S01-F01', 'DONE', ['src/input.ts']], ['S01-F01-T02', 'S01-F01', 'PENDING', []] ]);
  assert.equal(campaignPlanContents.reviewableSprint, null);
});

// Historical coverage: verifies REQ-ROLLING-STATE
test('accepted plan history survives a status directory move',testContext=> {
 const obligationFixture = fixture(testContext);
 const {root} = obligationFixture;
 let obligationDocumentV1 = obligationFixture.document;
 const vectors:readonly ObligationVector[] = [[0,1,1,1,1,1],[0,0,1,1,1,1],[0,0,0,1,1,1],[0,0,0,0,1,1],[0,0,0,0,0,1],[0,0,0,0,0,0]];
 for (const [index,obligation] of obligationDocumentV1.obligations.entries()) {
  const predecessor = obligationDocumentV1.checkpoints.at(-1),after = vectors[index];assert.ok(predecessor && after);
  const obligationCertificate:ObligationCertificate = {id:`CERT-${index+1}`,obligationIds:[obligation.id],
   inputs:['requirement.md',obligationFixture.proofPath].map(relative=>({path:relative,digest:inputDigest(root,relative)})),
   artifacts:[obligationFixture.proofPath],assessor:'coordinator',authority:['approved-CHNG'],adequate:true,
   reason:'Inspected complete six-coordinate fixture inventory',disposition:null,inventoryIds:[],evidence:[]};
  const obligationCheckpoint:ObligationCheckpoint = {id:`CP${index+2}`,predecessorId:predecessor.id,baselineId:'B1',kind:'productive',
   selectedIds:[obligation.id],registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:predecessor.after,after,
   preparation:null,assessor:'coordinator',reason:'Accept the earliest unresolved fixture inventory'};
  obligationDocumentV1 = acceptCheckpoint(obligationDocumentV1,{...obligationDocumentV1,
   certificates:[...obligationDocumentV1.certificates,obligationCertificate],checkpoints:[...obligationDocumentV1.checkpoints,obligationCheckpoint]},root);
 }
 fs.writeFileSync(path.join(root,obligationFixture.documentPath),JSON.stringify(obligationDocumentV1));
 const sprintPath = path.join(root,obligationFixture.sprintPath);
 fs.writeFileSync(sprintPath,fs.readFileSync(sprintPath,'utf8').replace('"status":"IN_PROGRESS"','"status":"DONE"').replaceAll('### [ ]','### [DONE]'));
 assert.equal(projectObligations(obligationDocumentV1,root).complete,true);
 const campaignManagementConfigV1:CampaignManagementConfigV1 = {schemaVersion:1,managementRoot:'pm',planRoot:'pm/plans',legacyPlanLayout:'none',
  lifecycle:{directories:['open','in_progress','closed','deferred','rejected'],roles:{initial:'open',activeWork:'in_progress',successfulCompletion:'closed',deferred:'deferred',rejected:'rejected'}}};
 validatePlanContents(parsePlanSource(root,obligationFixture.planPath,'in_progress',obligationFixture.planText),campaignManagementConfigV1,root);
 fs.mkdirSync(path.join(root,'pm/plans/closed'));
 fs.renameSync(path.join(root,'pm/plans/in_progress/pilot'),path.join(root,'pm/plans/closed/pilot'));
 const planPath = 'pm/plans/closed/pilot/plan.md';
 const planText = obligationFixture.planText.replaceAll('pm/plans/in_progress/pilot','pm/plans/closed/pilot').replace('`in_progress`','`closed`');
 fs.writeFileSync(path.join(root,planPath),planText);
 assert.deepEqual(projectObligationHistoricalAcceptance(obligationDocumentV1),{baselineId:'B1',checkpointId:'CP7',complete:true});
 assert.equal(projectObligationHistoricalAcceptance(obligationFixture.document).complete,false);
 assert.equal(projectObligations(obligationDocumentV1,root).complete,false,'current-input proof no longer locates the moved artifact');
 assert.doesNotThrow(()=>validatePlanContents(parsePlanSource(root,planPath,'closed',planText),campaignManagementConfigV1,root));
 const invalidatedObligationCheckpoint:ObligationCheckpoint = {id:'CP-invalidated',predecessorId:'CP7',baselineId:'B1',kind:'disturbance',selectedIds:[],registeredIds:[],certificateIds:[],invalidatedIds:['CERT-1'],before:[0,0,0,0,0,0],after:[1,0,0,0,0,0],preparation:null,assessor:'coordinator',reason:'Revoke the inspected historical responsibility'};
 const invalidatedObligationDocumentV1 = {...obligationDocumentV1,checkpoints:[...obligationDocumentV1.checkpoints,invalidatedObligationCheckpoint]};
 assert.equal(projectObligationHistoricalAcceptance(invalidatedObligationDocumentV1).complete,false);
 fs.writeFileSync(path.join(root,'pm/plans/closed/pilot/obligations.json'),JSON.stringify(invalidatedObligationDocumentV1));
 assert.throws(()=>validatePlanContents(parsePlanSource(root,planPath,'closed',planText),campaignManagementConfigV1,root),/completed plan has unresolved obligations/);
});
