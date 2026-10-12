// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {readRollingObligationFixtureSource} from './helpers/rolling-obligation-source.js';
import assert from 'node:assert/strict';
import {readRollingIncrementClaimV1,rebasePreparedRollingIncrement,continueFastRebaseRollingIncrement,publishRollingIncrement,fastForwardRollingIncrement} from '../src/rolling-integration.js';
import test, { type TestContext } from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync,spawnSync } from 'node:child_process';
import { Pool } from 'pg';
import { stringify } from 'lossless-json';
import {prepareRollingMainlineRefresh,mergeRollingMainlineRefresh,observeRollingMainlineRefresh,prepareRollingMainline,mergeRollingMainline,observeRollingMainlineCandidate,runRollingPublicationQa} from '../src/rolling-publication.js';
import { databaseOptions } from '../src/project-index-database.js';
import { collectRollingGraph, parseRollingProjectConfig,type RollingPhysicalProjectConfig, type RollingProjectConfigV1, type RollingBindingsV1, type RollingBinding, type RollingGraph } from '../src/rolling-campaign.js';
import { RollingCampaignStore, type RollingCampaignRegistration, type RollingAllocationResult, type RollingWorkerDispatchAttached, type RollingReviewDispatchAttached, type RollingSessionAttachment, type RollingStoredAssignment, type RollingExecutionConfigV1, type RollingAssignmentScopeV1, type RollingExecutionConfigV2, type RollingAssignmentScopeV2, type RollingCampaignStatus } from '../src/rolling-campaign-store.js';
import { isObligationGitInputs, obligationInputPaths, createObligationGitInputs, inputDigest, parseObligationDocument, type ObligationDocumentV1, type ObligationBaseline, type Obligation, type ObligationCertificate, type ObligationCheckpoint } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationBindingHistoryV1, ObligationBindingRevisionV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type { ObligationEvidence } from '../skills/plan-execution/scripts/obligations.js';
import { parseRollingWorkerSubmission, type RollingWorkerSubmissionV1, type RollingSubmissionProof } from '../src/rolling-worker-submission.js';
import { readRollingReviewRequestV1,readRollingReviewOutcomeV1,dispatchRollingReview, collectRollingReview, type RollingReviewOutcomeV1 } from '../src/rolling-review.js';
import { retireRollingWorker, provisionRollingWorker, attachRollingWorker, suspendRollingWorker, collectRollingWorkerSubmission, recoverRollingWorkerCreation, observeRollingWorkerInitialization, resumeRollingWorker, parseRollingWorkerResumption, dispatchRollingWorker, buildRollingWorkerInstructions, type RollingWorkerInitialization } from '../src/rolling-worker.js';
import { RollingCodex, RollingObservationTimeout, type RollingNativeTurn, type RollingNativeThread, type RollingNativeServerRequest } from '../src/rolling-codex.js';
import {RollingCampaignOperations} from '../src/rolling-operations.js';
import { acceptBoundCheckpoint, type ObligationCertificateBindingV1, type ObligationCertificateSubmission,
  type ObligationCertificateBindingRequest } from '../skills/plan-execution/scripts/obligation-certificate-bindings.js';

const nativeCodeFixtureCommands: readonly string[] = [
 'git add -- fixture.ts fixture.test.ts',
 "git commit -m 'Set fixture value and unit expectation to 2'",
 'git fetch origin campaign/worker-fixture',
 'git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1',
 'git rebase -i origin/campaign/worker-fixture',
 'git rebase -i origin/campaign/worker-fixture > tmp/semantic-rebase.txt 2>&1',
 'git rebase --continue','git rebase --continue >> tmp/semantic-rebase.txt 2>&1'
];

function permitNativeCodeFixtureApproval(rollingNativeServerRequest: RollingNativeServerRequest,
  root: string, threadId: string, turnId: string): boolean {
  const params = rollingNativeServerRequest.params;
  return rollingNativeServerRequest.method === 'item/commandExecution/requestApproval'
    && params !== null && typeof params === 'object' && !Array.isArray(params)
    && 'cwd' in params && params.cwd === root
    && 'threadId' in params && params.threadId === threadId
    && 'turnId' in params && params.turnId === turnId
    && 'command' in params && nativeCodeFixtureCommands.some(command =>
      params.command === `/opt/homebrew/bin/bash -lc '${command.replaceAll("'", "'\\''")}'`);
}

test('native code fixture approvals permit exact shell-wrapped commands only for the assigned checkout and turn', () => {
  const rollingNativeServerRequest: RollingNativeServerRequest = { id: 'approval', method: 'item/commandExecution/requestApproval',
    params: { cwd: '/fixture/101', threadId: 'thread', turnId: 'turn',
      command: "/opt/homebrew/bin/bash -lc 'git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1'" } };
  assert.equal(permitNativeCodeFixtureApproval(rollingNativeServerRequest, '/fixture/101', 'thread', 'turn'), true);
  for (const mismatch of [
    { root: '/fixture/102', threadId: 'thread', turnId: 'turn' },
    { root: '/fixture/101', threadId: 'foreign', turnId: 'turn' },
    { root: '/fixture/101', threadId: 'thread', turnId: 'foreign' }
  ]) assert.equal(permitNativeCodeFixtureApproval(rollingNativeServerRequest, mismatch.root, mismatch.threadId, mismatch.turnId), false);
  const invalidRequests: readonly RollingNativeServerRequest[] = [
    { ...rollingNativeServerRequest, method: 'item/fileChange/requestApproval' },
    { ...rollingNativeServerRequest, params: null },
    { ...rollingNativeServerRequest, params: { cwd: '/fixture/101', threadId: 'thread', turnId: 'turn', command: 'git fetch origin campaign/worker-fixture' } },
    { ...rollingNativeServerRequest, params: { cwd: '/fixture/101', threadId: 'thread', turnId: 'turn', command: "/opt/homebrew/bin/bash -lc 'git fetch origin campaign/worker-fixture; git reset --hard'" } }
  ];
  for (const rollingNativeServerRequest of invalidRequests) {
    assert.equal(permitNativeCodeFixtureApproval(rollingNativeServerRequest, '/fixture/101', 'thread', 'turn'), false);
  }
});

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-SCHEDULING
export interface ReviewScenario { readonly decision: RollingReviewOutcomeV1['decision']; readonly mode: 'manual' | 'protocol' | 'native'; readonly replaceLostReviewer?: boolean; readonly automaticPublication?: boolean; readonly conflictContinuation?: boolean; readonly conflictRepair?: boolean; readonly integratedCertificates?: boolean; readonly publicationBatch?:'threshold' | 'partial'; readonly publicationFlush?:'completion' | 'quiescence' }
function declineReviewApprovals(rollingCodex: RollingCodex): void {
  rollingCodex.on('serverRequest', message => rollingCodex.respondToServer(message.id, { decision: 'decline' }));
}
function prepareCoordinatorIncrementCheckout(root: string,branch: string): void {
  const untrackedPaths = execFileSync('git',['-C',root,'ls-files','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(relative=>relative.length > 0);
  // Exclude only this disposable fixture's management records. Production
  // publication requires a clean configured checkout without this fixture step.
  fs.appendFileSync(path.join(root,'.git/info/exclude'),untrackedPaths.map(relative=>`/${relative}`).join('\n')+'\n');
  execFileSync('git',['-C',root,'switch','-q',branch]);
}

export async function runRollingReviewScenario(t: TestContext, reviewScenario: ReviewScenario, mainlinePublication:'normal' | 'lost_ack' | 'race' | 'unavailable' | 'rejected' | null = null): Promise<void> {
  assert.ok(!(reviewScenario.automaticPublication && (reviewScenario.publicationBatch || reviewScenario.publicationFlush || reviewScenario.integratedCertificates)),
    'the short automatic-increment Arc cannot stand in for later publication or certificate phases');
  const reviewDecision = reviewScenario.decision;
  let integratedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 | null = null;
  const repositoryRoot = path.resolve(__dirname, '../..');
  const pool: Pool = new Pool(databaseOptions(repositoryRoot));
  const projectId = crypto.randomUUID();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-store-')));
  let liveRollingCodex: RollingCodex | null = null;
  let liveReviewerThreadId: string | null = null;
  let liveRollingNativeThread: RollingNativeThread | null = null;
  let liveReviewId: string | null = null;
  t.after(async () => {
    try {
      if (liveRollingCodex && liveReviewerThreadId) {
        if (liveReviewId) {
          const dispatch = await rollingCampaignStore.reviewDispatch('bound-fixture', liveReviewId);
          assert.ok(dispatch?.state !== 'STARTED', 'unknown native dispatch retains its checkout for reconciliation');
          if (dispatch?.state === 'ATTACHED') {
            const turn = await liveRollingCodex.readTurn(liveReviewerThreadId, dispatch.turnId);
            if (turn.status === 'inProgress') {
              await liveRollingCodex.interruptTurn(liveReviewerThreadId, dispatch.turnId);
              await liveRollingCodex.waitForTurn(liveReviewerThreadId, dispatch.turnId);
            }
          }
        }
        await liveRollingCodex.archiveThread(liveReviewerThreadId);
        await liveRollingCodex.close();
        liveRollingCodex = null;
      }
      await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1', [projectId]);
    } finally { await pool.end(); if (liveRollingCodex === null) fs.rmSync(root, { recursive: true, force: true }); }
  });
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  const rollingProjectConfigV1: RollingProjectConfigV1 = {
    schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: 'managed', anchor: 'main' }, maxActiveWorkers: 1,
    publicationSize: reviewScenario.publicationBatch === 'threshold' ? 1 : reviewScenario.publicationBatch || reviewScenario.publicationFlush ? 2 : 1, setupCommands: [], qa: { focused: [], publication: reviewScenario.publicationBatch ? [['env','-u','NODE_TEST_CONTEXT',process.execPath,'--test','fixture/full.test.ts']] : [['node', '--test']] },
  };
  fs.writeFileSync(path.join(root, '.agents/config/project/rolling-campaigns.json'), JSON.stringify(rollingProjectConfigV1));
  let obligationDocumentV1: ObligationDocumentV1 = readRollingObligationFixtureSource();
  // This isolated Arc uses the original rolling baseline, not migration responsibilities.
  const sourceObligationBaseline: ObligationBaseline | undefined = obligationDocumentV1.baselines[0];
  assert.ok(sourceObligationBaseline);
  // The isolated fixture uses the original scope with today's copied requirement
  // inputs. Its new baseline must not certify those bytes under historical hashes.
  const fixtureObligationBaseline: ObligationBaseline = { ...sourceObligationBaseline,
    requirements: sourceObligationBaseline.requirements.map(requirement => ({ ...requirement,
      digest: inputDigest(repositoryRoot, requirement.path) })) };
  obligationDocumentV1 = { ...obligationDocumentV1, baselines: [fixtureObligationBaseline],
    obligations: obligationDocumentV1.obligations.filter(item => fixtureObligationBaseline.obligationIds.includes(item.id)),
    certificates: [], checkpoints: [], scopeId: 'fixture' };
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  fs.copyFileSync(path.join(repositoryRoot, 'pm/requirements/rolling-campaigns.md'), path.join(root, 'pm/requirements/rolling-campaigns.md'));
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  let rollingBindingsV1: RollingBindingsV1 = { schemaVersion: 1,
    bindings: obligationDocumentV1.obligations.slice(1, 3).map(item => ({ obligationId: item.id,
      implementationIds: [], sourcePaths: [], acceptances: [], unitTests: [], integrationTests: [], exclusiveResources: [] })) };
  fs.writeFileSync(path.join(root, 'bindings.json'), JSON.stringify(rollingBindingsV1));
  const graphRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)', [projectId, `rolling-${projectId}`]);
  const rollingCampaignStore: RollingCampaignStore = new RollingCampaignStore(pool, projectId);
  const rollingCampaignRegistration: RollingCampaignRegistration = { id: 'fixture', coordinatorRoot: root, documentPath: 'obligations.json',
    bindingsPath: 'bindings.json', graphDigest: graphRollingGraph.digest, managedDirectory: path.join(root, 'managed'),
    configuration: { mainline: { remote: 'origin', branch: 'main' }, incrementRef: 'campaign/fixture', maxActiveWorkers: 1, publicationSize: reviewScenario.publicationBatch === 'threshold' ? 1 : reviewScenario.publicationBatch || reviewScenario.publicationFlush ? 2 : 1 } };
  await rollingCampaignStore.registerCampaign(rollingCampaignRegistration);
  const allocations: readonly RollingAllocationResult[] = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.allocate('fixture', graphRollingGraph.digest)));
  const allocated: readonly RollingAllocationResult[] = allocations.filter(item => item.assignment);
  assert.equal(allocated.length, 1);
  const firstAllocation: RollingAllocationResult | undefined = allocated[0];
  assert.ok(firstAllocation?.assignment);
  assert.ok(firstAllocation.worktree);
  assert.ok(firstAllocation.actionId);
  assert.equal(firstAllocation.worktree.number, 101);
  assert.equal(allocations.filter(item => item.reason === 'capacity_reached').length, 3);
  const firstRollingStoredAssignment: RollingStoredAssignment = firstAllocation.assignment;
  const physicalCampaignRow=(await pool.query<Record<string,unknown>>('SELECT configuration_text FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2',[projectId,'fixture'])).rows[0];assert.ok(physicalCampaignRow && typeof physicalCampaignRow.configuration_text === 'string');
  const physicalConfiguration:unknown=JSON.parse(physicalCampaignRow.configuration_text);assert.ok(physicalConfiguration !== null && typeof physicalConfiguration === 'object' && 'schemaVersion' in physicalConfiguration);assert.equal(physicalConfiguration.schemaVersion,3);
  const physicalAssignmentRow=(await pool.query<Record<string,unknown>>('SELECT scope_text FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND assignment_id=$2',[projectId,firstRollingStoredAssignment.id])).rows[0];assert.ok(physicalAssignmentRow && typeof physicalAssignmentRow.scope_text === 'string');
  const physicalScope:unknown=JSON.parse(physicalAssignmentRow.scope_text);assert.ok(physicalScope !== null && typeof physicalScope === 'object' && 'schemaVersion' in physicalScope);assert.equal(physicalScope.schemaVersion,3);
  const rollingCoordinatorSnapshot=await rollingCampaignStore.coordinatorSnapshot('fixture');
  const rollingExecutionConfigV1:RollingExecutionConfigV1={schemaVersion:1,mainline:rollingCoordinatorSnapshot.configuration.mainline,incrementRef:rollingCoordinatorSnapshot.configuration.incrementRef,maxActiveWorkers:rollingCoordinatorSnapshot.configuration.maxActiveWorkers,publicationSize:rollingCoordinatorSnapshot.configuration.publicationSize};
  const rollingAssignmentScopeV1:RollingAssignmentScopeV1={schemaVersion:1,plannedPaths:firstRollingStoredAssignment.plannedPaths,exclusiveResources:firstRollingStoredAssignment.exclusiveResources,binding:firstRollingStoredAssignment.binding};
  const configurationBytes=JSON.stringify(rollingExecutionConfigV1),scopeBytes=JSON.stringify(rollingAssignmentScopeV1);
  await pool.query('UPDATE ponytail_index.rolling_campaign_v1 SET configuration_text=$3 WHERE project_id=$1 AND campaign_id=$2',[projectId,'fixture',configurationBytes]);
  await pool.query('UPDATE ponytail_index.rolling_assignment_v1 SET scope_text=$3 WHERE project_id=$1 AND assignment_id=$2',[projectId,firstRollingStoredAssignment.id,scopeBytes]);
  assert.deepEqual((await rollingCampaignStore.coordinatorSnapshot('fixture')).configuration,rollingCoordinatorSnapshot.configuration);
  assert.deepEqual((await rollingCampaignStore.status('fixture')).assignments[0],firstRollingStoredAssignment);
  const preservedCampaignRow=(await pool.query<Record<string,unknown>>('SELECT configuration_text FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2',[projectId,'fixture'])).rows[0];
  const preservedAssignmentRow=(await pool.query<Record<string,unknown>>('SELECT scope_text FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND assignment_id=$2',[projectId,firstRollingStoredAssignment.id])).rows[0];
  assert.equal(preservedCampaignRow?.configuration_text,configurationBytes);assert.equal(preservedAssignmentRow?.scope_text,scopeBytes);

  await rollingCampaignStore.acknowledgeAction('fixture', firstAllocation.actionId, firstRollingStoredAssignment.generation, 'STARTED');
  await assert.rejects(rollingCampaignStore.retire('fixture', firstRollingStoredAssignment.id, firstRollingStoredAssignment.generation, true), /outcome must be reconciled/);
  assert.equal((await rollingCampaignStore.nextActions('fixture'))[0]?.state, 'STARTED');
  await rollingCampaignStore.acknowledgeAction('fixture', firstAllocation.actionId, firstRollingStoredAssignment.generation, 'COMPLETED', 'fixture external acknowledgment');
  await rollingCampaignStore.acknowledgeAction('fixture', firstAllocation.actionId, firstRollingStoredAssignment.generation, 'COMPLETED', 'fixture external acknowledgment');
  await assert.rejects(rollingCampaignStore.acknowledgeAction('fixture', firstAllocation.actionId, firstRollingStoredAssignment.generation, 'COMPLETED', 'different'), /differs/);
  await rollingCampaignStore.attachSession('fixture', firstRollingStoredAssignment.id, firstRollingStoredAssignment.generation, 'fixture-session');
  await assert.rejects(rollingCampaignStore.suspend('fixture', firstRollingStoredAssignment.id, 'wrong-generation', true, ['OBL-1']), /lease generation/);
  await rollingCampaignStore.suspend('fixture', firstRollingStoredAssignment.id, firstRollingStoredAssignment.generation, true, ['OBL-1']);
  const secondRollingAllocationResult: RollingAllocationResult = await rollingCampaignStore.allocate('fixture', graphRollingGraph.digest);
  assert.ok(secondRollingAllocationResult.worktree);
  assert.ok(secondRollingAllocationResult.assignment);
  assert.equal(secondRollingAllocationResult.worktree.number, 102);
  assert.notEqual(secondRollingAllocationResult.assignment.id, firstRollingStoredAssignment.id);
  await assert.rejects(rollingCampaignStore.allocate('fixture', 'stale'), /stale/);
  await rollingCampaignStore.retire('fixture', secondRollingAllocationResult.assignment.id, secondRollingAllocationResult.assignment.generation, true);
  const bindingsFile = path.join(root, 'bindings.json');
  rollingBindingsV1 = { ...rollingBindingsV1, bindings: rollingBindingsV1.bindings.slice(0, 1) };
  fs.writeFileSync(bindingsFile, JSON.stringify(rollingBindingsV1));
  const reconciledRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await rollingCampaignStore.reconcileGraph('fixture', graphRollingGraph.digest, reconciledRollingGraph.digest);
  const resumedRollingAllocationResult: RollingAllocationResult = await rollingCampaignStore.allocate('fixture', reconciledRollingGraph.digest, { id: secondRollingAllocationResult.assignment.id, generation: secondRollingAllocationResult.assignment.generation });
  assert.equal(resumedRollingAllocationResult.reason, 'no_ready_obligation');
  const rollingCampaignStatus: RollingCampaignStatus = await rollingCampaignStore.status('fixture');
  assert.equal(rollingCampaignStatus.assignments.find(item => item.id === secondRollingAllocationResult.assignment?.id)?.state, 'RELEASED');
  assert.equal(rollingCampaignStatus.assignments.find(item => item.id === firstRollingStoredAssignment.id)?.state, 'INACTIVE');
  assert.ok((await rollingCampaignStore.nextActions('fixture')).every(action => action.assignmentId === firstRollingStoredAssignment.id || action.state !== 'PENDING'));
  await assert.rejects(rollingCampaignStore.retire('fixture', secondRollingAllocationResult.assignment.id, secondRollingAllocationResult.assignment.generation, true), /released assignment/);
  const firstRollingBinding: RollingBinding | undefined = rollingBindingsV1.bindings[0];
  const thirdObligation: Obligation | undefined = obligationDocumentV1.obligations[2];
  assert.ok(firstRollingBinding);
  assert.ok(thirdObligation);
  rollingBindingsV1 = { ...rollingBindingsV1, bindings: [...rollingBindingsV1.bindings, { ...firstRollingBinding, obligationId: thirdObligation.id }] };
  fs.writeFileSync(bindingsFile, JSON.stringify(rollingBindingsV1));
  const restoredRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await rollingCampaignStore.reconcileGraph('fixture', reconciledRollingGraph.digest, restoredRollingGraph.digest);
  const reusedRollingAllocationResult: RollingAllocationResult = await rollingCampaignStore.allocate('fixture', restoredRollingGraph.digest);
  assert.ok(reusedRollingAllocationResult.worktree);
  assert.ok(reusedRollingAllocationResult.assignment);
  assert.equal(reusedRollingAllocationResult.worktree.number, 102);
  assert.notEqual(reusedRollingAllocationResult.assignment.id, secondRollingAllocationResult.assignment.id);
  await rollingCampaignStore.retire('fixture', reusedRollingAllocationResult.assignment.id, reusedRollingAllocationResult.assignment.generation, true);
  const obligationCertificate: ObligationCertificate = { id: 'CERT-fixture', obligationIds: ['OBL-1'],
    inputs: [{ path: 'pm/requirements/rolling-campaigns.md', digest: inputDigest(root, 'pm/requirements/rolling-campaigns.md') }],
    artifacts: ['pm/requirements/rolling-campaigns.md'], assessor: 'coordinator', authority: fixtureObligationBaseline.authority.references,
    adequate: true, reason: 'Fixture inventory assessment', disposition: null, evidence: [], inventoryIds: [] };
  obligationDocumentV1 = { ...obligationDocumentV1, certificates: [...obligationDocumentV1.certificates, obligationCertificate] };
  const initialObligationCheckpoint: ObligationCheckpoint = { id: 'CP-fixture-initial', predecessorId: null, baselineId: fixtureObligationBaseline.id, kind: 'initial',
    selectedIds: [], registeredIds: fixtureObligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1], preparation: null, reason: 'Fixture initial observation', assessor: 'coordinator' };
  obligationDocumentV1 = { ...obligationDocumentV1, checkpoints: [...obligationDocumentV1.checkpoints, initialObligationCheckpoint] };
  const productiveObligationCheckpoint: ObligationCheckpoint = { id: 'CP-fixture-discharge', predecessorId: 'CP-fixture-initial', baselineId: fixtureObligationBaseline.id, kind: 'productive',
    selectedIds: ['OBL-1'], registeredIds: [], certificateIds: ['CERT-fixture'], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [0, 1, 1, 1, 1, 1], preparation: null, reason: 'Fixture dependency discharged', assessor: 'coordinator' };
  obligationDocumentV1 = { ...obligationDocumentV1, checkpoints: [...obligationDocumentV1.checkpoints, productiveObligationCheckpoint] };
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  const unblockedRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.ok(unblockedRollingGraph.projection.satisfiedIds.includes('OBL-1'));
  await rollingCampaignStore.reconcileGraph('fixture', restoredRollingGraph.digest, unblockedRollingGraph.digest);
  const reactivatedRollingAllocationResult: RollingAllocationResult = await rollingCampaignStore.allocate('fixture', unblockedRollingGraph.digest, { id: reusedRollingAllocationResult.assignment.id, generation: reusedRollingAllocationResult.assignment.generation });
  assert.ok(reactivatedRollingAllocationResult.assignment);
  assert.ok(reactivatedRollingAllocationResult.worktree);
  assert.ok(reactivatedRollingAllocationResult.actionId);
  assert.equal(reactivatedRollingAllocationResult.assignment.id, firstRollingStoredAssignment.id);
  assert.equal(reactivatedRollingAllocationResult.worktree.number, 101);
  assert.equal(reactivatedRollingAllocationResult.assignment.sessionId, 'fixture-session');
  assert.notEqual(reactivatedRollingAllocationResult.assignment.generation, firstRollingStoredAssignment.generation);
  assert.equal((await rollingCampaignStore.nextActions('fixture'))[0]?.kind, 'RESUME_WORKER');
  await assert.rejects(rollingCampaignStore.retire('fixture', firstRollingStoredAssignment.id, firstRollingStoredAssignment.generation, true), /lease generation/);
  await rollingCampaignStore.acknowledgeAction('fixture', reactivatedRollingAllocationResult.actionId, reactivatedRollingAllocationResult.assignment.generation, 'STARTED');
  await rollingCampaignStore.acknowledgeAction('fixture', reactivatedRollingAllocationResult.actionId, reactivatedRollingAllocationResult.assignment.generation, 'COMPLETED', 'fixture resume acknowledgment');
  await assert.rejects(rollingCampaignStore.attachSession('fixture', firstRollingStoredAssignment.id, reactivatedRollingAllocationResult.assignment.generation, 'other-session'), /original session/);
  await rollingCampaignStore.attachSession('fixture', firstRollingStoredAssignment.id, reactivatedRollingAllocationResult.assignment.generation, 'fixture-session');
  assert.equal((await rollingCampaignStore.status('fixture')).assignments.find(item => item.id === firstRollingStoredAssignment.id)?.lease, null);

  // Traceability: verifies REQ-ROLLING-GRAPH
  // Explicit leased execution shares the pool with the retained unleased owner.
  const boundObligationDocumentV1: ObligationDocumentV1 = { ...obligationDocumentV1, scopeId: 'bound-fixture',
    obligations: reviewScenario.mode === 'native' ? obligationDocumentV1.obligations.map(item => item.id === firstRollingBinding.obligationId
      ? { ...item, condition: reviewScenario.integratedCertificates ? 'The bound TypeScript fixture remains syntactically valid with source proof for the exact integrated revision.' : 'The exported value in fixture/current.ts must remain exactly 1.',
        criterion: 'Inspect the exact candidate diff and establish that the exported value remains 1.' } : item) : obligationDocumentV1.obligations };
  fs.writeFileSync(path.join(root, 'bound-obligations.json'), JSON.stringify(boundObligationDocumentV1));
  const boundRollingBindingsV1: RollingBindingsV1 = { schemaVersion: 1, bindings: [firstRollingBinding] };
  fs.writeFileSync(path.join(root, 'bound-bindings.json'), JSON.stringify(boundRollingBindingsV1));
  const firstObligationBindingRevisionV1: ObligationBindingRevisionV1 = { id: 'BIND-1', obligationId: firstRollingBinding.obligationId,
    predecessorId: null, baselineId: fixtureObligationBaseline.id, assessor: 'coordinator', authority: fixtureObligationBaseline.authority.references,
    reason: 'Bound fixture implementation', dependsOn: [], execution: { sprintId: null, taskletIds: [], plannedPaths: ['fixture/current.ts'],
      operations: ['edit', 'test'], selection: ['focused fixture proof'], target: { identity: 'local', profile: 'fixture' } } };
  const firstObligationBindingHistoryV1: ObligationBindingHistoryV1 = { schemaVersion: 1, scopeId: 'bound-fixture', revisions: [firstObligationBindingRevisionV1] };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(firstObligationBindingHistoryV1));
  const boundRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  const boundRollingCampaignRegistration: RollingCampaignRegistration = { ...rollingCampaignRegistration, id: 'bound-fixture',
    documentPath: 'bound-obligations.json', bindingsPath: 'bound-bindings.json', graphDigest: boundRollingGraph.digest,
    configuration: { ...rollingCampaignRegistration.configuration, incrementRef: 'campaign/bound-fixture', maxActiveWorkers: 4 },
    bindingHistory: { path: 'history.json', assessor: 'coordinator', authority: fixtureObligationBaseline.authority.references } };
  await rollingCampaignStore.registerCampaign(boundRollingCampaignRegistration);
  const boundAllocations: readonly RollingAllocationResult[] = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.allocate('bound-fixture', boundRollingGraph.digest)));
  assert.equal(boundAllocations.filter(item => item.assignment !== null).length, 1);
  const boundRollingAllocationResult = boundAllocations.find(item => item.assignment !== null);
  assert.ok(boundRollingAllocationResult?.assignment?.lease && boundRollingAllocationResult.actionId && boundRollingAllocationResult.worktree);
  const boundRollingStoredAssignment = boundRollingAllocationResult.assignment;
  assert.equal(boundRollingStoredAssignment.lease?.binding.revisionId, 'BIND-1');
  const boundScopeRow=(await pool.query<Record<string,unknown>>('SELECT scope_text FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND assignment_id=$2',[projectId,boundRollingStoredAssignment.id])).rows[0];assert.ok(boundScopeRow && typeof boundScopeRow.scope_text === 'string');
  const boundPhysicalScope:unknown=JSON.parse(boundScopeRow.scope_text);assert.ok(boundPhysicalScope !== null && typeof boundPhysicalScope === 'object' && 'schemaVersion' in boundPhysicalScope);assert.equal(boundPhysicalScope.schemaVersion,3);

  assert.equal(boundRollingStoredAssignment.lease?.graphDigest, boundRollingGraph.digest);
  assert.deepEqual(boundRollingStoredAssignment.plannedPaths, ['fixture/current.ts']);
  const frozen = JSON.stringify(boundRollingStoredAssignment.lease);
  assert.ok(boundRollingStoredAssignment.lease);
  const boundRollingCoordinatorSnapshot=await rollingCampaignStore.coordinatorSnapshot('bound-fixture');
  assert.ok(boundRollingCoordinatorSnapshot.configuration.bindingHistory);
  const rollingExecutionConfigV2:RollingExecutionConfigV2={schemaVersion:2,mainline:boundRollingCoordinatorSnapshot.configuration.mainline,incrementRef:boundRollingCoordinatorSnapshot.configuration.incrementRef,maxActiveWorkers:boundRollingCoordinatorSnapshot.configuration.maxActiveWorkers,publicationSize:boundRollingCoordinatorSnapshot.configuration.publicationSize,bindingHistory:boundRollingCoordinatorSnapshot.configuration.bindingHistory};
  const rollingAssignmentScopeV2:RollingAssignmentScopeV2={schemaVersion:2,lease:boundRollingStoredAssignment.lease,binding:boundRollingStoredAssignment.binding,exclusiveResources:boundRollingStoredAssignment.exclusiveResources};
  const boundConfigurationBytes=JSON.stringify(rollingExecutionConfigV2),boundScopeBytes=JSON.stringify(rollingAssignmentScopeV2);
  const currentBoundCampaignRow=(await pool.query<Record<string,unknown>>('SELECT configuration_text FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2',[projectId,'bound-fixture'])).rows[0];assert.ok(currentBoundCampaignRow && typeof currentBoundCampaignRow.configuration_text === 'string');
  const currentBoundPhysicalConfiguration:unknown=JSON.parse(currentBoundCampaignRow.configuration_text);assert.ok(currentBoundPhysicalConfiguration !== null && typeof currentBoundPhysicalConfiguration === 'object' && 'schemaVersion' in currentBoundPhysicalConfiguration);assert.equal(currentBoundPhysicalConfiguration.schemaVersion,3);
  await pool.query('UPDATE ponytail_index.rolling_campaign_v1 SET configuration_text=$3 WHERE project_id=$1 AND campaign_id=$2',[projectId,'bound-fixture',boundConfigurationBytes]);
  await pool.query('UPDATE ponytail_index.rolling_assignment_v1 SET scope_text=$3 WHERE project_id=$1 AND assignment_id=$2',[projectId,boundRollingStoredAssignment.id,boundScopeBytes]);
  assert.deepEqual((await rollingCampaignStore.coordinatorSnapshot('bound-fixture')).configuration,boundRollingCoordinatorSnapshot.configuration);
  assert.deepEqual((await rollingCampaignStore.status('bound-fixture')).assignments[0],boundRollingStoredAssignment);
  const preservedBoundCampaignRow=(await pool.query<Record<string,unknown>>('SELECT configuration_text FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2',[projectId,'bound-fixture'])).rows[0];
  const preservedBoundAssignmentRow=(await pool.query<Record<string,unknown>>('SELECT scope_text FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND assignment_id=$2',[projectId,boundRollingStoredAssignment.id])).rows[0];
  assert.equal(preservedBoundCampaignRow?.configuration_text,boundConfigurationBytes);assert.equal(preservedBoundAssignmentRow?.scope_text,boundScopeBytes);

  await rollingCampaignStore.acknowledgeAction('bound-fixture', boundRollingAllocationResult.actionId, boundRollingStoredAssignment.generation, 'STARTED');
  await assert.rejects(rollingCampaignStore.retire('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, true), /outcome must be reconciled/);
  await rollingCampaignStore.acknowledgeAction('bound-fixture', boundRollingAllocationResult.actionId, boundRollingStoredAssignment.generation, 'COMPLETED', 'bound start acknowledgment');
  await rollingCampaignStore.attachSession('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, 'bound-session');
  await rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, boundRollingGraph.digest, 'edit', ['fixture/current.ts']);
  await assert.rejects(rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, boundRollingGraph.digest, 'edit', ['fixture/foreign.ts']), /outside frozen lease/);
  const nextObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1, id: 'BIND-2', predecessorId: 'BIND-1',
    reason: 'Revised operations with identical paths', execution: { ...firstObligationBindingRevisionV1.execution, operations: ['test'] } };
  const nextObligationBindingHistoryV1: ObligationBindingHistoryV1 = { ...firstObligationBindingHistoryV1,
    revisions: [...firstObligationBindingHistoryV1.revisions, nextObligationBindingRevisionV1] };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(nextObligationBindingHistoryV1));
  const nextRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  await assert.rejects(rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, boundRollingGraph.digest, 'test'), /stale coordinator graph/);
  await rollingCampaignStore.reconcileGraph('bound-fixture', boundRollingGraph.digest, nextRollingGraph.digest);
  assert.equal(JSON.stringify((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.lease), frozen);
  await assert.rejects(rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, nextRollingGraph.digest, 'test'), /frozen binding differs/);
  const rollingCampaignOperations = new RollingCampaignOperations(rollingCampaignStore,root);
  await assert.rejects(rollingCampaignOperations.execute('rebind-worker',{campaign:'bound-fixture',assignment:boundRollingStoredAssignment.id,generation:boundRollingStoredAssignment.generation}), /stopped retained owner/);
  await assert.rejects(rollingCampaignStore.suspend('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, false, ['OBL-1']), /stopped acknowledgment/);
  await rollingCampaignStore.suspend('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, true, ['OBL-1']);
  const blockedRollingAllocationResult = await rollingCampaignStore.allocate('bound-fixture', nextRollingGraph.digest);
  assert.equal(blockedRollingAllocationResult.assignment, null);
  assert.ok(blockedRollingAllocationResult.blocked?.some(item => item.reason === 'scope_changed'));
  assert.ok((await rollingCampaignOperations.nextActions('bound-fixture')).decisions.some(decision=>decision.kind === 'worker-rebinding' && decision.assignment.id === boundRollingStoredAssignment.id));
  const rollingOperationResponse = await rollingCampaignOperations.execute('rebind-worker',{campaign:'bound-fixture',assignment:boundRollingStoredAssignment.id,generation:boundRollingStoredAssignment.generation});
  assert.equal(rollingOperationResponse.command,'rebind-worker');
  const rollingLeaseRenewal = rollingOperationResponse.result;
  assert.notEqual(rollingLeaseRenewal.generation, boundRollingStoredAssignment.generation);
  assert.equal(rollingLeaseRenewal.lease.binding.revisionId, 'BIND-2');
  await assert.rejects(rollingCampaignOperations.execute('rebind-worker',{campaign:'bound-fixture',assignment:boundRollingStoredAssignment.id,generation:boundRollingStoredAssignment.generation}), /lease generation/);
  const resumedBoundRollingAllocationResult = await rollingCampaignStore.allocate('bound-fixture', nextRollingGraph.digest);
  assert.ok(resumedBoundRollingAllocationResult.assignment?.lease && resumedBoundRollingAllocationResult.actionId && resumedBoundRollingAllocationResult.worktree);
  assert.equal(resumedBoundRollingAllocationResult.assignment.id, boundRollingStoredAssignment.id);
  assert.equal(resumedBoundRollingAllocationResult.assignment.sessionId, 'bound-session');
  assert.equal(resumedBoundRollingAllocationResult.worktree.number, boundRollingAllocationResult.worktree.number);
  assert.notEqual(resumedBoundRollingAllocationResult.assignment.generation, rollingLeaseRenewal.generation);
  assert.equal(resumedBoundRollingAllocationResult.assignment.lease.generation, resumedBoundRollingAllocationResult.assignment.generation);
  await rollingCampaignStore.acknowledgeAction('bound-fixture', resumedBoundRollingAllocationResult.actionId, resumedBoundRollingAllocationResult.assignment.generation, 'STARTED');
  await rollingCampaignStore.acknowledgeAction('bound-fixture', resumedBoundRollingAllocationResult.actionId, resumedBoundRollingAllocationResult.assignment.generation, 'COMPLETED', 'bound resume acknowledgment');
  await assert.rejects(rollingCampaignStore.attachSession('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, 'new-session'), /original session/);
  await rollingCampaignStore.attachSession('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, 'bound-session');
  await rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, nextRollingGraph.digest, 'test');
  await assert.rejects(rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, nextRollingGraph.digest, 'edit', ['fixture/current.ts']), /operation outside/);
  for (const malformed of ['{"schemaVersion":4}', '{"schemaVersion":"2"}', '{"schemaVersion":null}', '{}']) {
    await assert.rejects(pool.query('UPDATE ponytail_index.rolling_campaign_v1 SET configuration_text=$3 WHERE project_id=$1 AND campaign_id=$2',
      [projectId, 'bound-fixture', malformed]), /configuration_text_check/);
    await assert.rejects(pool.query('UPDATE ponytail_index.rolling_assignment_v1 SET scope_text=$3 WHERE project_id=$1 AND assignment_id=$2',
      [projectId, boundRollingStoredAssignment.id, malformed]), /scope_text_check/);
  }
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.lease?.binding.revisionId, 'BIND-2');
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'unrelated graph input']);
  const unrelatedRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  await rollingCampaignStore.reconcileGraph('bound-fixture', nextRollingGraph.digest, unrelatedRollingGraph.digest);
  await rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, nextRollingGraph.digest, 'test');
  await assert.rejects(rollingCampaignStore.assertOperation('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, unrelatedRollingGraph.digest, 'test'), /wrong frozen graph identity/);

  // A real reserved Git worktree supplies a candidate; external session acknowledgments above remain synthetic.
  fs.writeFileSync(path.join(root, '.gitignore'), 'session_id.txt\nproof.txt\nmanaged/\n');
  fs.mkdirSync(path.join(root, 'fixture'), { recursive: true });
  fs.writeFileSync(path.join(root, 'fixture/current.ts'), 'export const value: number = 1;\n');
  if (reviewScenario.publicationBatch) {
    fs.writeFileSync(path.join(root,'fixture/full.test.ts'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {value} from './current.ts';\ntest('full fixture unit',()=>assert.equal(value,1));\n");
    execFileSync('git',['-C',root,'add','fixture/full.test.ts']);
  }
  execFileSync('git', ['-C', root, 'add', '-f', '--', '.gitignore', 'fixture/current.ts', ...fixtureObligationBaseline.requirements.map(requirement=>requirement.path)]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'submission fixture base']);
  const baseCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  execFileSync('git', ['-C', root, 'update-ref', 'refs/heads/campaign/bound-fixture', baseCommit]);
  const submissionObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...nextObligationBindingRevisionV1, id: 'BIND-3', predecessorId: 'BIND-2',
    reason: 'Permit bounded submission fixture changes and focused syntax check', execution: { ...nextObligationBindingRevisionV1.execution, operations: ['edit', 'test', 'check'] } };
  const submissionObligationBindingHistoryV1: ObligationBindingHistoryV1 = { ...nextObligationBindingHistoryV1,
    revisions: [...nextObligationBindingHistoryV1.revisions, submissionObligationBindingRevisionV1] };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(submissionObligationBindingHistoryV1));
  const submissionRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  await rollingCampaignStore.reconcileGraph('bound-fixture', unrelatedRollingGraph.digest, submissionRollingGraph.digest);
  await rollingCampaignStore.suspend('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, true, ['OBL-1']);
  await rollingCampaignStore.rebindLease('bound-fixture', boundRollingStoredAssignment.id, resumedBoundRollingAllocationResult.assignment.generation, submissionRollingGraph.digest);
  const submissionRollingAllocationResult = await rollingCampaignStore.allocate('bound-fixture', submissionRollingGraph.digest);
  assert.ok(submissionRollingAllocationResult.assignment?.lease && submissionRollingAllocationResult.worktree && submissionRollingAllocationResult.actionId);
  const submissionRollingStoredAssignment = submissionRollingAllocationResult.assignment;
  await rollingCampaignStore.acknowledgeAction('bound-fixture', submissionRollingAllocationResult.actionId, submissionRollingStoredAssignment.generation, 'STARTED');
  await rollingCampaignStore.acknowledgeAction('bound-fixture', submissionRollingAllocationResult.actionId, submissionRollingStoredAssignment.generation, 'COMPLETED', 'fixture worker attached for submission');
  await rollingCampaignStore.attachSession('bound-fixture', submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, 'bound-session');
  const workerRoot = submissionRollingAllocationResult.worktree.rootPath;
  execFileSync('git', ['-C', root, 'worktree', 'add', '-q', '-b', 'fixture-worker', workerRoot, baseCommit]);
  fs.writeFileSync(path.join(workerRoot, 'session_id.txt'), 'bound-session\n');
  // Publication success uses an approved value; the older reviewer Arc deliberately supplies value 2.
  fs.writeFileSync(path.join(workerRoot, 'fixture/current.ts'), reviewScenario.publicationBatch
    ? 'export const value: number = 1; // approved publication candidate\n' : 'export const value: number = 2;\n');
  execFileSync('git', ['-C', workerRoot, 'add', '--', 'fixture/current.ts']);
  execFileSync('git', ['-C', workerRoot, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'bounded submission fixture']);
  const revision = execFileSync('git', ['-C', workerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const checkOutput = execFileSync(process.execPath, ['--check', path.join(workerRoot, 'fixture/current.ts')], { encoding: 'utf8' });
  fs.writeFileSync(path.join(workerRoot, 'proof.txt'), `${checkOutput}Node syntax check exited 0\n`);
  const submissionObligationEvidence: ObligationEvidence = { command: 'node --check fixture/current.ts', selection: ['focused fixture proof'],
    target: { identity: 'local', profile: 'fixture', verification: 'fixture/current.ts' }, revision, dirty: false,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outcome: 'pass', skips: 0, failures: 0,
    inputs: createObligationGitInputs(workerRoot, ['fixture/current.ts']), outputPath: 'proof.txt', finalization: 'pass' };
  const rollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { schemaVersion: 1, campaignId: 'bound-fixture', assignmentId: submissionRollingStoredAssignment.id,
    generation: submissionRollingStoredAssignment.generation, sessionId: 'bound-session', graphDigest: submissionRollingGraph.digest,
    revision, baseCommit, stopped: true, proof: [{ operation: 'check', evidence: submissionObligationEvidence }] };
  await assert.rejects(rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id, 'stale-generation', rollingWorkerSubmissionV1), /requested assignment/);
  const foreignRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...rollingWorkerSubmissionV1, sessionId: 'foreign-session' };
  await assert.rejects(rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, foreignRollingWorkerSubmissionV1), /attached session/);
  const concealedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...rollingWorkerSubmissionV1, baseCommit: revision };
  await assert.rejects(rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, concealedRollingWorkerSubmissionV1), /current coordinator increment/);
  fs.writeFileSync(path.join(workerRoot, 'unexpected.ts'), 'export const unexpected: number = 1;\n');
  await assert.rejects(rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, rollingWorkerSubmissionV1), /dirty/);
  fs.unlinkSync(path.join(workerRoot, 'unexpected.ts'));
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, 'WORKING');
  assert.deepEqual(await rollingCampaignStore.submissions('bound-fixture', submissionRollingStoredAssignment.id), []);
  const receipts = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id,
    submissionRollingStoredAssignment.generation, rollingWorkerSubmissionV1)));
  assert.ok(receipts.every(item => item.state === 'REVIEW' && item.revision === revision));
  const storedSubmissions = await rollingCampaignStore.submissions('bound-fixture', submissionRollingStoredAssignment.id);
  assert.equal(storedSubmissions.length, 1);
  assert.deepEqual(storedSubmissions[0]?.submission, rollingWorkerSubmissionV1);
  assert.deepEqual(storedSubmissions[0]?.lease, submissionRollingStoredAssignment.lease);
  const submittedRollingCampaignStatus = await rollingCampaignStore.status('bound-fixture');
  assert.equal(submittedRollingCampaignStatus.assignments[0]?.state, 'REVIEW');
  assert.equal(submittedRollingCampaignStatus.assignments[0]?.activityStopped, true);
  assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
  const differentRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = { ...rollingWorkerSubmissionV1,
    proof: [{ operation: 'check', evidence: { ...submissionObligationEvidence, command: 'different command' } }] };
  await assert.rejects(rollingCampaignStore.submit('bound-fixture', submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, differentRollingWorkerSubmissionV1), /immutable result/);
  const foreignRollingCampaignStore: RollingCampaignStore = new RollingCampaignStore(pool, crypto.randomUUID());
  assert.deepEqual(await foreignRollingCampaignStore.submissions('bound-fixture', submissionRollingStoredAssignment.id), []);

  // Traceability: verifies REQ-ROLLING-REVIEW
  // Only the explicit live acceptance profile starts a real model.
  let reviewerSessionId = reviewScenario.mode === 'protocol' ? 'session-fixture' : 'reviewer-session';
  if (reviewScenario.mode === 'native') {
    liveRollingCodex = await RollingCodex.connect();
    declineReviewApprovals(liveRollingCodex);
    liveRollingCodex.on('diagnostic', message => t.diagnostic(message.trim()));
    const rollingNativeThread = await liveRollingCodex.startThread(workerRoot);
    liveRollingNativeThread = rollingNativeThread;
    liveReviewerThreadId = rollingNativeThread.thread.id;
    reviewerSessionId = rollingNativeThread.thread.sessionId;
  }
  await assert.rejects(rollingCampaignStore.requestReview('bound-fixture', submissionRollingStoredAssignment.id,
    submissionRollingStoredAssignment.generation, revision, rollingWorkerSubmissionV1.sessionId), /own submission/);
  await assert.rejects(rollingCampaignStore.requestReview('bound-fixture', submissionRollingStoredAssignment.id,
    submissionRollingStoredAssignment.generation, 'f'.repeat(40), 'reviewer-session'), /no validated worker submission/);
  const reviewRequests = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.requestReview('bound-fixture',
    submissionRollingStoredAssignment.id, submissionRollingStoredAssignment.generation, revision, reviewerSessionId)));
  let rollingStoredReview = reviewRequests[0];
  assert.ok(rollingStoredReview);
  for (const review of reviewRequests) assert.deepEqual(review,rollingStoredReview);
  assert.equal(rollingStoredReview.outcome,null);
  assert.ok((await rollingCampaignStore.coordinatorSnapshot('bound-fixture')).reviews.some(review=>review.request.id === rollingStoredReview?.request.id && review.outcome === null));
  assert.equal((await rollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id)).length, 1);
  assert.equal(rollingStoredReview.request.baseCommit, rollingWorkerSubmissionV1.baseCommit);
  if (reviewScenario.replaceLostReviewer) {
    const originalRollingStoredReview = rollingStoredReview;
    const originalReviewerSessionId = reviewerSessionId;
    const lostReviewerThreadId = reviewScenario.mode === 'native' ? liveReviewerThreadId : 'lost-reviewer-thread';
    assert.ok(lostReviewerThreadId);
    const originalRollingReviewDispatchStarted = await rollingCampaignStore.claimReviewDispatch('bound-fixture',originalRollingStoredReview.request.id,lostReviewerThreadId);
    reviewerSessionId = 'replacement-reviewer-session';
    if (reviewScenario.mode === 'native') {
      assert.ok(liveRollingCodex && liveReviewerThreadId);
      await liveRollingCodex.archiveThread(liveReviewerThreadId);
      liveRollingNativeThread = await liveRollingCodex.startThread(workerRoot);
      liveReviewerThreadId = liveRollingNativeThread.thread.id;
      reviewerSessionId = liveRollingNativeThread.thread.sessionId;
    }
    const rollingReviewerLoss = { reviewId:originalRollingStoredReview.request.id, lossReference:`coordinator-observed loss of ${originalReviewerSessionId}; original actor removed from review scope` };
    const replacing = () => rollingCampaignStore.requestReview('bound-fixture',submissionRollingStoredAssignment.id,submissionRollingStoredAssignment.generation,revision,reviewerSessionId,rollingReviewerLoss);
    await assert.rejects(rollingCampaignStore.requestReview('bound-fixture',submissionRollingStoredAssignment.id,submissionRollingStoredAssignment.generation,revision,reviewerSessionId,{ ...rollingReviewerLoss,lossReference:'' }), /invalid identity/);
    assert.equal(await rollingCampaignStore.reviewReplacement('bound-fixture',originalRollingStoredReview.request.id),null);
    const replacements = await Promise.all([replacing(),replacing()]);
    rollingStoredReview = replacements[0];assert.ok(rollingStoredReview);
    assert.deepEqual(replacements[1],rollingStoredReview);
    assert.notEqual(rollingStoredReview.request.id,originalRollingStoredReview.request.id);
    assert.equal(rollingStoredReview.request.revision,originalRollingStoredReview.request.revision);
    assert.equal(rollingStoredReview.outcome,null);
    await assert.rejects(rollingCampaignStore.requestReview('bound-fixture',submissionRollingStoredAssignment.id,submissionRollingStoredAssignment.generation,revision,'other-reviewer',rollingReviewerLoss), /replacement retry/);
    await assert.rejects(rollingCampaignStore.reviewContext('bound-fixture',originalRollingStoredReview.request.id), /replaced/);
    await assert.rejects(rollingCampaignStore.claimReviewDispatch('bound-fixture',originalRollingStoredReview.request.id,'lost-reviewer-thread'), /replaced/);
    await assert.rejects(rollingCampaignStore.attachReviewDispatch('bound-fixture',originalRollingStoredReview.request.id,originalRollingReviewDispatchStarted.id,originalReviewerSessionId,'late-turn'), /replaced/);
    await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture',originalRollingStoredReview.request.id,originalReviewerSessionId,{ schemaVersion:1,
      reviewId:originalRollingStoredReview.request.id,revision,reviewerSessionId:originalReviewerSessionId,completedAt:new Date().toISOString(),decision:'accepted',findings:[] }), /replaced/);
    const restartedRollingCampaignStore = new RollingCampaignStore(pool,projectId);
    assert.deepEqual((await restartedRollingCampaignStore.reviews('bound-fixture',submissionRollingStoredAssignment.id)).find(review => review.request.id === originalRollingStoredReview.request.id),originalRollingStoredReview);
    const replacement = await restartedRollingCampaignStore.reviewReplacement('bound-fixture',originalRollingStoredReview.request.id);
    assert.equal(replacement?.replacementReviewId,rollingStoredReview.request.id);
    assert.equal(replacement?.previousReviewerSessionId,originalReviewerSessionId);
    assert.equal(replacement?.reviewerSessionId,reviewerSessionId);
    assert.equal(replacement?.lossReference,rollingReviewerLoss.lossReference);
    t.diagnostic(`Lost review ${originalRollingStoredReview.request.id} retained unchanged; recorded replacement ${rollingStoredReview.request.id}; old dispatch and decisions fenced after restart; fresh review pending.`);
  }
  const rollingReviewContext = await rollingCampaignStore.reviewContext('bound-fixture', rollingStoredReview.request.id);
  assert.equal(rollingReviewContext.rootPath, workerRoot);
  assert.equal(rollingReviewContext.obligation.id, firstRollingBinding.obligationId);
  assert.deepEqual(rollingReviewContext.binding, submissionRollingStoredAssignment.binding);
  assert.deepEqual(rollingReviewContext.submission, storedSubmissions[0]);
  if (reviewScenario.mode !== 'manual') {
    let rollingCodex: RollingCodex;
    let reviewerThreadId: string;
    if (reviewScenario.mode === 'native') {
      assert.ok(liveRollingCodex && liveReviewerThreadId);
      rollingCodex = liveRollingCodex;
      reviewerThreadId = liveReviewerThreadId;
    } else {
      rollingCodex = new RollingCodex({ executable: process.execPath, argv: [path.join(__dirname, 'fixtures/rolling-codex-server.js')] });
      reviewerThreadId = 'thread-fixture';
    }
    try {
      if (reviewScenario.mode === 'protocol') await rollingCodex.initialize();
      const rollingNativeThread = reviewScenario.mode === 'native' ? liveRollingNativeThread : await rollingCodex.startThread(workerRoot);
      assert.ok(rollingNativeThread);
      liveReviewId = reviewScenario.mode === 'native' ? rollingStoredReview.request.id : null;
      const rollingReviewDispatchAttached = await dispatchRollingReview(rollingCampaignStore, rollingCodex, 'bound-fixture', rollingStoredReview.request.id, rollingNativeThread);
      await assert.rejects(dispatchRollingReview(rollingCampaignStore, rollingCodex, 'bound-fixture', rollingStoredReview.request.id, rollingNativeThread), /already claimed/);
      assert.equal(rollingReviewDispatchAttached.state, 'ATTACHED');
      let collectingRollingCodex: RollingCodex = rollingCodex;
      if (reviewScenario.mode === 'native') {
        const rollingNativeTurn = await rollingCodex.waitForTurn(reviewerThreadId, rollingReviewDispatchAttached.turnId);
        t.diagnostic(`native review=${rollingStoredReview.request.id}; thread=${reviewerThreadId}; session=${reviewerSessionId}; candidate=${revision}; terminal=${rollingNativeTurn.status}; final=${rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text}`);
        await rollingCodex.close();
        liveRollingCodex = await RollingCodex.connect();
        declineReviewApprovals(liveRollingCodex);
        collectingRollingCodex = liveRollingCodex;
      }
      const restartedRollingCampaignStore: RollingCampaignStore = new RollingCampaignStore(pool, projectId);
      const result = await collectRollingReview(restartedRollingCampaignStore, collectingRollingCodex, 'bound-fixture', rollingStoredReview.request.id);
      assert.equal(result.outcome?.decision, reviewDecision);
      assert.equal(result.outcome?.revision, revision);
      assert.equal(result.outcome?.reviewerSessionId, reviewerSessionId);
      assert.deepEqual(await collectRollingReview(restartedRollingCampaignStore, collectingRollingCodex, 'bound-fixture', rollingStoredReview.request.id), result);
      assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
      if (reviewScenario.mode === 'native') {
        assert.ok(result.outcome?.findings.some(item => /current\.ts|value/iu.test(item) && /\b1\b/u.test(item) && /\b2\b/u.test(item)), 'live reviewer must identify the deliberate change from 1 to 2');
        assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
        t.diagnostic(`native review=${rollingStoredReview.request.id}; thread=${reviewerThreadId}; session=${reviewerSessionId}; candidate=${revision}; decision=${result.outcome?.decision}; findings=${JSON.stringify(result.outcome?.findings)}; recovered after App Server restart`);
        return;
      }
    } finally { if (reviewScenario.mode === 'protocol') await rollingCodex.close(); }
  } else {
  assert.equal(await rollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), null);
  const dispatchClaims = await Promise.allSettled(Array.from({ length: 4 }, () => rollingCampaignStore.claimReviewDispatch('bound-fixture', rollingStoredReview.request.id, 'reviewer-thread')));
  const claimed = dispatchClaims.find(item => item.status === 'fulfilled');
  assert.ok(claimed?.status === 'fulfilled');
  assert.equal(dispatchClaims.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(dispatchClaims.filter(item => item.status === 'rejected').length, 3);
  const restartedRollingCampaignStore: RollingCampaignStore = new RollingCampaignStore(pool, projectId);
  assert.deepEqual(await restartedRollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), claimed.value);
  await assert.rejects(restartedRollingCampaignStore.claimReviewDispatch('bound-fixture', rollingStoredReview.request.id, 'reviewer-thread'), /already claimed/);
  const unusedRollingCodex: RollingCodex = new RollingCodex({ executable: process.execPath, argv: [path.join(__dirname, 'fixtures/rolling-codex-server.js')] });
  try {
    await assert.rejects(collectRollingReview(restartedRollingCampaignStore, unusedRollingCodex, 'bound-fixture', rollingStoredReview.request.id), /outcome is unknown/);
  } finally { await unusedRollingCodex.close(); }
  await assert.rejects(rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, 'wrong-dispatch', 'reviewer-session', 'review-turn'), /dispatch identity/);
  await assert.rejects(rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, claimed.value.id, 'other-reviewer', 'review-turn'), /native session differs/);
  const attachments = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, claimed.value.id, reviewerSessionId, 'review-turn')));
  assert.ok(attachments.every(item => item.state === 'ATTACHED' && item.turnId === 'review-turn'));
  await assert.rejects(rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, claimed.value.id, reviewerSessionId, 'different-turn'), /retry differs/);
  assert.deepEqual(await restartedRollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), attachments[0]);
  assert.equal(await foreignRollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), null);
  await assert.rejects(rollingCampaignStore.requestReview('bound-fixture', submissionRollingStoredAssignment.id,
    submissionRollingStoredAssignment.generation, revision, 'other-reviewer'), /retry differs/);
  const rollingReviewOutcomeV1: RollingReviewOutcomeV1 = reviewDecision === 'accepted'
    ? { schemaVersion: 1, reviewId: rollingStoredReview.request.id, revision,
      reviewerSessionId, completedAt: new Date().toISOString(), decision: 'accepted', findings: [] }
    : { schemaVersion: 1, reviewId: rollingStoredReview.request.id, revision,
      reviewerSessionId, completedAt: new Date().toISOString(), decision: 'rejected', findings: ['Required correction.'] };
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, 'other-reviewer', rollingReviewOutcomeV1), /only the assigned/);
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, reviewerSessionId,
    { ...rollingReviewOutcomeV1, revision: 'f'.repeat(40) }), /differs from assigned/);
  fs.writeFileSync(path.join(workerRoot, 'unexpected.ts'), 'dirty during review');
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, reviewerSessionId, rollingReviewOutcomeV1), /dirty/);
  fs.unlinkSync(path.join(workerRoot, 'unexpected.ts'));
  await assert.rejects(rollingCampaignStore.claimIncrement('bound-fixture',rollingStoredReview.request.id),/decided review/);
  const decisions = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.recordReviewOutcome('bound-fixture',
    rollingStoredReview.request.id, reviewerSessionId, rollingReviewOutcomeV1)));
  assert.ok(decisions.every(item => JSON.stringify(item.outcome) === JSON.stringify(rollingReviewOutcomeV1)));
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
  const reviewedRollingCoordinatorSnapshot = await rollingCampaignStore.coordinatorSnapshot('bound-fixture');
  assert.equal(reviewedRollingCoordinatorSnapshot.assignments.find(assignment=>assignment.id === submissionRollingStoredAssignment.id)?.state,reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
  assert.deepEqual(reviewedRollingCoordinatorSnapshot.reviews.find(review=>review.request.id === rollingStoredReview?.request.id)?.outcome,rollingReviewOutcomeV1);
  if (reviewDecision === 'accepted') {
    const claims = await Promise.all(Array.from({length:4},()=>rollingCampaignStore.claimIncrement('bound-fixture',rollingStoredReview.request.id)));
    const rollingIncrementClaimV1 = claims[0];assert.ok(rollingIncrementClaimV1);
    assert.ok(claims.every(claim=>JSON.stringify(claim) === JSON.stringify(rollingIncrementClaimV1)));
    assert.equal(rollingIncrementClaimV1.reviewedRevision,revision);
    assert.equal(rollingIncrementClaimV1.target.branch,'campaign/bound-fixture');
    assert.deepEqual(await restartedRollingCampaignStore.claimIncrement('bound-fixture',rollingStoredReview.request.id),rollingIncrementClaimV1);
    fs.writeFileSync(path.join(workerRoot,'integration-in-progress.txt'),'Retained integration work');
    assert.deepEqual(await restartedRollingCampaignStore.claimIncrement('bound-fixture',rollingStoredReview.request.id),rollingIncrementClaimV1);
    fs.unlinkSync(path.join(workerRoot,'integration-in-progress.txt'));
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,1);
    const remoteRoot = path.join(root,'managed','increment-remote.git');
    execFileSync('git',['clone','--bare','-q',root,remoteRoot]);
    execFileSync('git',['-C',remoteRoot,'update-ref','refs/heads/campaign/bound-fixture',baseCommit]);
    execFileSync('git',['-C',root,'remote','add','origin',remoteRoot]);
    if (reviewScenario.conflictContinuation || reviewScenario.conflictRepair) {
      const upstreamRoot = path.join(root,'managed','upstream-conflict');
      execFileSync('git',['clone','-q','--branch','campaign/bound-fixture',remoteRoot,upstreamRoot]);
      fs.writeFileSync(path.join(upstreamRoot,'fixture/current.ts'),'export const value: number = 1; // upstream context\n');
      execFileSync('git',['-C',upstreamRoot,'add','fixture/current.ts']);
      execFileSync('git',['-C',upstreamRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','Upstream context']);
      execFileSync('git',['-C',upstreamRoot,'push','-q','origin','HEAD:refs/heads/campaign/bound-fixture']);
    }
    const attempts = await Promise.allSettled(Array.from({length:4},()=>rollingCampaignStore.beginIncrementRebase('bound-fixture',rollingStoredReview.request.id)));
    assert.equal(attempts.filter(attempt=>attempt.status === 'fulfilled').length,1);
    assert.equal(attempts.filter(attempt=>attempt.status === 'rejected').length,3);
    const fulfilledAttempt = attempts.find(attempt=>attempt.status === 'fulfilled');assert.ok(fulfilledAttempt?.status === 'fulfilled');
    const rollingIncrementRebaseV1 = fulfilledAttempt.value;
    assert.equal(rollingIncrementRebaseV1.result,null);
    assert.deepEqual(await restartedRollingCampaignStore.incrementRebase('bound-fixture',rollingStoredReview.request.id),rollingIncrementRebaseV1);
    const rollingFastRebaseResult = rebasePreparedRollingIncrement(workerRoot,rollingIncrementRebaseV1);
    const recordedRollingIncrementRebaseV1 = await restartedRollingCampaignStore.recordIncrementRebase('bound-fixture',rollingStoredReview.request.id,rollingFastRebaseResult);
    assert.deepEqual(recordedRollingIncrementRebaseV1.result,rollingFastRebaseResult);
    assert.deepEqual(await rollingCampaignStore.recordIncrementRebase('bound-fixture',rollingStoredReview.request.id,rollingFastRebaseResult),recordedRollingIncrementRebaseV1);
    assert.deepEqual(await rollingCampaignStore.incrementRebase('bound-fixture',rollingStoredReview.request.id),recordedRollingIncrementRebaseV1);
    await assert.rejects(rollingCampaignStore.recordIncrementRebase('bound-fixture',rollingStoredReview.request.id,{...rollingFastRebaseResult,integrationBase:'f'.repeat(40)}),/differs from recorded intent/);
    if (reviewScenario.conflictContinuation || reviewScenario.conflictRepair) {
      assert.ok(rollingFastRebaseResult.state === 'TEXTUAL_CONFLICT');
      const rollingIncrementConflictInspection = {originalCommit:rollingFastRebaseResult.originalCommit,reference:'fixture inspection: retain reviewed value and upstream context'};
      if (reviewScenario.conflictRepair) {
        await assert.rejects(rollingCampaignStore.requestIncrementRepair('bound-fixture',rollingStoredReview.request.id,''),/inspection reference/);
        const repairResults = await Promise.all(Array.from({length:4},()=>rollingCampaignStore.requestIncrementRepair('bound-fixture',rollingStoredReview.request.id,'Substantive conflicting contract; return to original worker and reviewer')));
        assert.ok(repairResults.every(result=>JSON.stringify(result) === JSON.stringify(repairResults[0])));
        assert.deepEqual(await restartedRollingCampaignStore.requestIncrementRepair('bound-fixture',rollingStoredReview.request.id,repairResults[0]?.reference ?? ''),repairResults[0]);
        assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state,'REWORK');
        await assert.rejects(rollingCampaignStore.requestIncrementRepair('bound-fixture',rollingStoredReview.request.id,'different repair'),/retry differs/);
        await assert.rejects(rollingCampaignStore.beginIncrementContinuation('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection),/integrating ownership/);
        assert.deepEqual(await rollingCampaignStore.incrementRebase('bound-fixture',rollingStoredReview.request.id),recordedRollingIncrementRebaseV1);
        assert.equal((await rollingCampaignStore.reviews('bound-fixture',submissionRollingStoredAssignment.id))[0]?.outcome?.decision,'accepted');
        assert.equal(execFileSync('git',['-C',workerRoot,'rev-parse','REBASE_HEAD'],{encoding:'utf8'}).trim(),rollingFastRebaseResult.originalCommit);
        assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,0);
        return;
      }
      await assert.rejects(rollingCampaignStore.beginIncrementContinuation('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection),/unresolved/);
      fs.writeFileSync(path.join(workerRoot,'fixture/current.ts'),'export const value: number = 2; // upstream context\n');
      execFileSync('git',['-C',workerRoot,'add','fixture/current.ts']);
      await assert.rejects(rollingCampaignStore.beginIncrementContinuation('bound-fixture',rollingStoredReview.request.id,{...rollingIncrementConflictInspection,reference:''}),/semantic inspection/);
      const continuations = await Promise.allSettled(Array.from({length:4},()=>rollingCampaignStore.beginIncrementContinuation('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection)));
      assert.equal(continuations.filter(item=>item.status === 'fulfilled').length,1);
      assert.equal(continuations.filter(item=>item.status === 'rejected').length,3);
      assert.deepEqual(await restartedRollingCampaignStore.incrementConflictInspection('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection.originalCommit),rollingIncrementConflictInspection);
      assert.equal(await foreignRollingCampaignStore.incrementConflictInspection('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection.originalCommit),null);
      const continuedRollingFastRebaseResult = continueFastRebaseRollingIncrement(workerRoot,rollingFastRebaseResult,rollingIncrementConflictInspection);
      assert.ok(continuedRollingFastRebaseResult.state === 'REBASED');
      await assert.rejects(restartedRollingCampaignStore.recordIncrementContinuation('bound-fixture',rollingStoredReview.request.id,{...rollingIncrementConflictInspection,reference:'different inspection'},continuedRollingFastRebaseResult),/recorded inspection intent/);
      const continuationResults = await Promise.all(Array.from({length:4},()=>restartedRollingCampaignStore.recordIncrementContinuation('bound-fixture',rollingStoredReview.request.id,rollingIncrementConflictInspection,continuedRollingFastRebaseResult)));
      assert.ok(continuationResults.every(result=>JSON.stringify(result.result) === JSON.stringify(continuedRollingFastRebaseResult)));
      assert.deepEqual((await rollingCampaignStore.incrementRebase('bound-fixture',rollingStoredReview.request.id))?.result,continuedRollingFastRebaseResult);
      const history = (await pool.query<Record<string,unknown>>('SELECT conflict_text,result_text,inspection_reference FROM ponytail_index.rolling_increment_continuation_v1 WHERE project_id=$1',[projectId])).rows;
      assert.equal(history.length,1);
      assert.equal(history[0]?.conflict_text,JSON.stringify(recordedRollingIncrementRebaseV1));
      assert.equal(history[0]?.result_text,JSON.stringify(continuationResults[0]));
      assert.equal(history[0]?.inspection_reference,rollingIncrementConflictInspection.reference);
      assert.equal(fs.readFileSync(path.join(workerRoot,'fixture/current.ts'),'utf8'),'export const value: number = 2; // upstream context\n');
      await assert.rejects(rollingCampaignStore.beginIncrementPush('bound-fixture',rollingStoredReview.request.id),/fresh QA/);
      await assert.rejects(rollingCampaignStore.recordIncrementProof('bound-fixture',rollingStoredReview.request.id,rollingWorkerSubmissionV1),/another integration candidate/);
      return;
    }
    assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1',[projectId])).rows[0]?.state,'REBASED');
    await assert.rejects(rollingCampaignStore.beginIncrementPush('bound-fixture',rollingStoredReview.request.id),/fresh QA/);
    await assert.rejects(rollingCampaignStore.recordIncrementProof('bound-fixture',rollingStoredReview.request.id,{...rollingWorkerSubmissionV1,revision:'f'.repeat(40)}),/another integration candidate/);
    assert.deepEqual(await rollingCampaignStore.recordIncrementProof('bound-fixture',rollingStoredReview.request.id,rollingWorkerSubmissionV1),rollingWorkerSubmissionV1);
    const refreshedProofStartedAt = new Date().toISOString();
    execFileSync(process.execPath,['--check',path.join(workerRoot,'fixture/current.ts')]);
    const refreshedProofCompletedAt = new Date().toISOString();
    const refreshedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = {...rollingWorkerSubmissionV1,proof:rollingWorkerSubmissionV1.proof.map((proof): RollingSubmissionProof => ({...proof,
      evidence:{...proof.evidence,startedAt:refreshedProofStartedAt,completedAt:refreshedProofCompletedAt}}))};
    assert.deepEqual(await rollingCampaignStore.recordIncrementProof('bound-fixture',rollingStoredReview.request.id,refreshedRollingWorkerSubmissionV1),refreshedRollingWorkerSubmissionV1);
    integratedRollingWorkerSubmissionV1 = refreshedRollingWorkerSubmissionV1;
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_proof_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,2);

    const priorSourceText = fs.readFileSync(path.join(workerRoot,'fixture/current.ts'),'utf8');
    fs.appendFileSync(path.join(workerRoot,'fixture/current.ts'),'// stale tested source');
    await assert.rejects(rollingCampaignStore.beginIncrementPush('bound-fixture',rollingStoredReview.request.id),/candidate checkout is dirty/);
    fs.writeFileSync(path.join(workerRoot,'fixture/current.ts'),priorSourceText);
    if (reviewScenario.automaticPublication) {
      prepareCoordinatorIncrementCheckout(root,'campaign/bound-fixture');
      const publications = await Promise.allSettled(Array.from({length:4},()=>rollingCampaignStore.publishIncrement('bound-fixture',rollingStoredReview.request.id)));
      assert.equal(publications.filter(publication=>publication.status === 'fulfilled').length,1);
      assert.equal(publications.filter(publication=>publication.status === 'rejected').length,3);
      const fulfilledPublication = publications.find(publication=>publication.status === 'fulfilled');assert.ok(fulfilledPublication?.status === 'fulfilled');
      assert.equal(fulfilledPublication.value.result.state,'PUBLISHED');
      assert.equal(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),revision);
      assert.equal(execFileSync('git',['-C',remoteRoot,'rev-parse','refs/heads/campaign/bound-fixture'],{encoding:'utf8'}).trim(),revision);
      assert.deepEqual(await restartedRollingCampaignStore.observeIncrementPublication('bound-fixture',rollingStoredReview.request.id),fulfilledPublication.value);
      assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,1);
      return;
    }
    const pushes = await Promise.allSettled(Array.from({length:4},()=>rollingCampaignStore.beginIncrementPush('bound-fixture',rollingStoredReview.request.id)));
    assert.equal(pushes.filter(push=>push.status === 'fulfilled').length,1);
    assert.equal(pushes.filter(push=>push.status === 'rejected').length,3);
    await assert.rejects(rollingCampaignStore.recordIncrementPublication('bound-fixture',rollingStoredReview.request.id,
      {state:'PUBLISHED',revision,remoteRevision:revision}),/local increment branch lacks/);
    const unknownRollingIncrementPublicationV1 = await rollingCampaignStore.recordIncrementPublication('bound-fixture',rollingStoredReview.request.id,
      {state:'UNCONFIRMED',revision,reason:'Fixture lost the push response; observe the remote before retrying.'});
    assert.equal(unknownRollingIncrementPublicationV1.result.state,'UNCONFIRMED');
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,0);
    prepareCoordinatorIncrementCheckout(root,'campaign/bound-fixture');
    fastForwardRollingIncrement(root,'campaign/bound-fixture',revision);
    const rejectionHook = path.join(remoteRoot,'hooks/pre-receive');
    fs.writeFileSync(rejectionHook,'#!/bin/sh\necho "fixture policy rejection" >&2\nexit 1\n',{mode:0o755});
    const rejectedRollingIncrementPublicationResult = publishRollingIncrement({rootPath:workerRoot,target:rollingIncrementClaimV1.target,revision});
    assert.equal(rejectedRollingIncrementPublicationResult.state,'PUSH_REJECTED');
    await rollingCampaignStore.recordIncrementPublication('bound-fixture',rollingStoredReview.request.id,rejectedRollingIncrementPublicationResult);
    const configurationPath = path.join(root,'.agents/config/project/rolling-campaigns.json');
    const priorConfigurationText = fs.readFileSync(configurationPath,'utf8');
    fs.writeFileSync(configurationPath,JSON.stringify({...rollingProjectConfigV1,qa:{...rollingProjectConfigV1.qa,focused:[['node','--check','new-required-selection.ts']]}}));
    await assert.rejects(restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id),/configured focused QA is missing/);
    fs.writeFileSync(configurationPath,priorConfigurationText);
    fs.appendFileSync(path.join(workerRoot,'fixture/current.ts'),'// stale source after push rejection');
    await assert.rejects(restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id),/candidate checkout is dirty/);
    fs.writeFileSync(path.join(workerRoot,'fixture/current.ts'),priorSourceText);
    const unavailableRemoteRoot = `${remoteRoot}.unavailable`;
    fs.renameSync(remoteRoot,unavailableRemoteRoot);
    assert.equal((await restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id)).result.state,'UNCONFIRMED');
    fs.renameSync(unavailableRemoteRoot,remoteRoot);
    const upstreamRevision = execFileSync('git',['-C',remoteRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit-tree',`${baseCommit}^{tree}`,'-p',baseCommit,'-m','Independent upstream probe'],{encoding:'utf8'}).trim();
    execFileSync('git',['-C',remoteRoot,'update-ref','refs/heads/campaign/bound-fixture',upstreamRevision,baseCommit]);
    assert.equal((await restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id)).result.state,'REBASE_REQUIRED');
    assert.equal(execFileSync('git',['-C',workerRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),revision);
    assert.equal(execFileSync('git',['-C',remoteRoot,'rev-parse','refs/heads/campaign/bound-fixture'],{encoding:'utf8'}).trim(),upstreamRevision);
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,0);
    // Undo only this disposable fixture's probe; preserve its commit separately.
    execFileSync('git',['-C',remoteRoot,'update-ref','refs/heads/upstream-probe',upstreamRevision]);
    execFileSync('git',['-C',remoteRoot,'update-ref','refs/heads/campaign/bound-fixture',baseCommit,upstreamRevision]);
    execFileSync('git',['-C',root,'update-ref','refs/remotes/origin/campaign/bound-fixture',baseCommit,upstreamRevision]);
    fs.rmSync(rejectionHook);
    const retriedRollingIncrementPublicationV1 = await restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id);
    const rollingIncrementPublicationResult = retriedRollingIncrementPublicationV1.result;
    assert.ok(rollingIncrementPublicationResult.state === 'PUBLISHED',JSON.stringify(rollingIncrementPublicationResult));
    fs.writeFileSync(rejectionHook,'#!/bin/sh\nexit 1\n',{mode:0o755});
    assert.deepEqual(await restartedRollingCampaignStore.retryIncrementPush('bound-fixture',rollingStoredReview.request.id),retriedRollingIncrementPublicationV1);
    const deliveredRollingIncrementPublicationV1 = await restartedRollingCampaignStore.observeIncrementPublication('bound-fixture',rollingStoredReview.request.id);
    assert.deepEqual(deliveredRollingIncrementPublicationV1.result,rollingIncrementPublicationResult);
    const deliveries = await Promise.all(Array.from({length:4},()=>rollingCampaignStore.recordIncrementPublication('bound-fixture',rollingStoredReview.request.id,rollingIncrementPublicationResult)));
    assert.ok(deliveries.every(delivery=>JSON.stringify(delivery) === JSON.stringify(deliveredRollingIncrementPublicationV1)));
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,1);
    fs.rmSync(rejectionHook);


  if (reviewScenario.publicationBatch) {
    const currentRollingGraph = collectRollingGraph(root,'bound-obligations.json','bound-bindings.json','history.json');
    const currentDigest = (await rollingCampaignStore.status('bound-fixture')).graphDigest;
    if (currentDigest !== currentRollingGraph.digest) await rollingCampaignStore.reconcileGraph('bound-fixture',currentDigest,currentRollingGraph.digest);
    if (reviewScenario.publicationBatch === 'partial') assert.deepEqual(await rollingCampaignStore.claimPublicationBatch('bound-fixture',currentRollingGraph.digest),{state:'WAITING',reason:'below_threshold',count:1});
    await assert.rejects(rollingCampaignStore.claimPublicationBatch('bound-fixture',currentRollingGraph.digest,'completion'),/bound delivery obligations/);
    const claims = await Promise.all(Array.from({length:4},()=>rollingCampaignStore.claimPublicationBatch('bound-fixture',currentRollingGraph.digest,reviewScenario.publicationBatch === 'partial' ? 'explicit_flush' : null)));
    const firstClaim = claims[0];assert.ok(firstClaim && firstClaim.state === 'CLAIMED');
    assert.equal(firstClaim.claim.trigger,reviewScenario.publicationBatch === 'partial' ? 'explicit_flush' : 'threshold');assert.equal(firstClaim.claim.publicationSize,reviewScenario.publicationBatch === 'partial' ? 2 : 1);
    assert.equal(firstClaim.claim.increments.length,1);
    assert.ok(claims.every(item=>item.state === 'CLAIMED' && item.claim.id === firstClaim.claim.id));
    assert.deepEqual(await new RollingCampaignStore(pool,projectId).claimPublicationBatch('bound-fixture',currentRollingGraph.digest),firstClaim);
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_publication_member_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,1);
    assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,1);
    if (reviewScenario.publicationBatch === 'threshold') return;
    await assert.rejects(rollingCampaignStore.claimIncrement('bound-fixture',crypto.randomUUID()),/publication owns the coordinator checkout/);
    await assert.rejects(rollingCampaignStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),/full publication QA/);
    execFileSync('git',['-C',remoteRoot,'update-ref','refs/heads/main',baseCommit]);
    const rollingPublicationBatchClaimV1 = await rollingCampaignStore.beginMainlinePreparation('bound-fixture',firstClaim.claim.id);
    const rollingMainlinePreparationV1 = prepareRollingMainline(rollingPublicationBatchClaimV1);
    await rollingCampaignStore.recordMainlinePreparation('bound-fixture',firstClaim.claim.id,rollingMainlinePreparationV1);
    const rollingMainlineCandidateV1 = mergeRollingMainline(rollingPublicationBatchClaimV1,rollingMainlinePreparationV1);
    const restartedPublicationStore = new RollingCampaignStore(pool,projectId);
    const recoveredRollingMainlineCandidateV1 = observeRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlinePreparationV1);
    assert.deepEqual(recoveredRollingMainlineCandidateV1,rollingMainlineCandidateV1);
    await restartedPublicationStore.recordMainlineCandidate('bound-fixture',firstClaim.claim.id,recoveredRollingMainlineCandidateV1);
    await restartedPublicationStore.recordMainlineCandidate('bound-fixture',firstClaim.claim.id,rollingMainlineCandidateV1);
    assert.equal((await restartedPublicationStore.coordinatorSnapshot('bound-fixture')).publications[0]?.state,'CANDIDATE');
    const configurationPath = path.join(root,'.agents/config/project/rolling-campaigns.json');
    const passingConfiguration = parseRollingProjectConfig(fs.readFileSync(configurationPath,'utf8'));
    fs.writeFileSync(configurationPath,JSON.stringify({...passingConfiguration,qa:{...passingConfiguration.qa,publication:[['false']]}}));
    const failedRollingPublicationQaJobV1 = await restartedPublicationStore.beginPublicationQa('bound-fixture',firstClaim.claim.id);
    await assert.rejects(restartedPublicationStore.beginPublicationQa('bound-fixture',firstClaim.claim.id),/original QA attempt/);
    const failedRollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,failedRollingPublicationQaJobV1.id,failedRollingPublicationQaJobV1.configurationDigest,failedRollingPublicationQaJobV1.commands);
    assert.equal(failedRollingPublicationQaV1.outcome,'FAIL');
    await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,failedRollingPublicationQaV1);
    await assert.rejects(restartedPublicationStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),/full publication QA/);
    fs.writeFileSync(configurationPath,JSON.stringify(passingConfiguration));
    const passingRollingPublicationQaJobV1 = await restartedPublicationStore.beginPublicationQa('bound-fixture',firstClaim.claim.id);
    assert.notEqual(passingRollingPublicationQaJobV1.id,failedRollingPublicationQaJobV1.id);
    assert.deepEqual(await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,failedRollingPublicationQaV1),failedRollingPublicationQaV1);
    assert.equal((await pool.query<Record<string,unknown>>('SELECT state FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1',[projectId])).rows[0]?.state,'QA_RUNNING');
    const passingRollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1,passingRollingPublicationQaJobV1.id,passingRollingPublicationQaJobV1.configurationDigest,passingRollingPublicationQaJobV1.commands);
    assert.equal(passingRollingPublicationQaV1.outcome,'PASS',JSON.stringify(passingRollingPublicationQaV1));
    assert.ok(passingRollingPublicationQaV1.commands[0]?.output.includes('full fixture unit'));
    await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,passingRollingPublicationQaV1);
    await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,passingRollingPublicationQaV1);
    fs.writeFileSync(configurationPath,JSON.stringify({...passingConfiguration,qa:{...passingConfiguration.qa,publication:[['false']]}}));
    await assert.rejects(restartedPublicationStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),/stale|all required/);
    fs.writeFileSync(configurationPath,JSON.stringify(passingConfiguration));
    if (mainlinePublication === 'race' || mainlinePublication === 'unavailable' || mainlinePublication === 'rejected') {
      if (mainlinePublication === 'race') {
      const racingRoot = path.join(root,'managed','racing-mainline');
      execFileSync('git',['clone','-q',remoteRoot,racingRoot]);
      execFileSync('git',['-C',racingRoot,'switch','main']);
      fs.writeFileSync(path.join(racingRoot,'racing-mainline.txt'),'Preserve this newly published mainline input.\n');
      execFileSync('git',['-C',racingRoot,'add','racing-mainline.txt']);
      execFileSync('git',['-C',racingRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','racing mainline change']);
      execFileSync('git',['-C',racingRoot,'push','origin','main']);
      assert.equal((await restartedPublicationStore.publishMainline('bound-fixture',firstClaim.claim.id)).result.state,'REBASE_REQUIRED');
      } else if (mainlinePublication === 'unavailable') {
        const unavailableRemoteRoot = `${remoteRoot}.unavailable`;
        fs.renameSync(remoteRoot,unavailableRemoteRoot);
        try {
          assert.equal((await restartedPublicationStore.publishMainline('bound-fixture',firstClaim.claim.id)).result.state,'UNCONFIRMED');
          assert.equal((await new RollingCampaignStore(pool,projectId).observeMainlinePublication('bound-fixture',firstClaim.claim.id)).result.state,'UNCONFIRMED');
          await assert.rejects(restartedPublicationStore.beginMainlineRefresh('bound-fixture',firstClaim.claim.id),/observe the original push outcome/);
        } finally { fs.renameSync(unavailableRemoteRoot,remoteRoot); }
        assert.equal((await restartedPublicationStore.observeMainlinePublication('bound-fixture',firstClaim.claim.id)).result.state,'REBASE_REQUIRED');
      } else {
        fs.writeFileSync(rejectionHook,'#!/bin/sh\nexit 1\n',{mode:0o755});
        try { assert.equal((await restartedPublicationStore.publishMainline('bound-fixture',firstClaim.claim.id)).result.state,'PUSH_REJECTED'); }
        finally { fs.rmSync(rejectionHook); }
      }
      const rollingMainlineRefreshIntentV1 = await restartedPublicationStore.beginMainlineRefresh('bound-fixture',firstClaim.claim.id);
      assert.deepEqual(await restartedPublicationStore.beginMainlineRefresh('bound-fixture',firstClaim.claim.id),rollingMainlineRefreshIntentV1);
      const rollingMainlineRefreshPreparationV1 = prepareRollingMainlineRefresh(rollingPublicationBatchClaimV1,rollingMainlineRefreshIntentV1);
      await restartedPublicationStore.recordMainlineRefreshPreparation('bound-fixture',firstClaim.claim.id,rollingMainlineRefreshPreparationV1);
      const rollingMainlineRefreshResultV1 = mergeRollingMainlineRefresh(rollingPublicationBatchClaimV1,rollingMainlineRefreshPreparationV1);
      const recoveredRollingMainlineRefreshResultV1 = observeRollingMainlineRefresh(rollingPublicationBatchClaimV1,rollingMainlineRefreshPreparationV1);
      assert.deepEqual(recoveredRollingMainlineRefreshResultV1,rollingMainlineRefreshResultV1);
      if (mainlinePublication === 'race') assert.notEqual(rollingMainlineRefreshResultV1.candidate.revision,rollingMainlineCandidateV1.revision);
      else assert.equal(rollingMainlineRefreshResultV1.candidate.revision,rollingMainlineCandidateV1.revision);
      await new RollingCampaignStore(pool,projectId).recordMainlineRefresh('bound-fixture',firstClaim.claim.id,recoveredRollingMainlineRefreshResultV1);
      await assert.rejects(restartedPublicationStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),/full publication QA/);
      assert.deepEqual(await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,passingRollingPublicationQaV1),passingRollingPublicationQaV1);
      await assert.rejects(restartedPublicationStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),/full publication QA/);
      const refreshedRollingPublicationQaJobV1 = await restartedPublicationStore.beginPublicationQa('bound-fixture',firstClaim.claim.id);
      const refreshedRollingPublicationQaV1 = runRollingPublicationQa(rollingPublicationBatchClaimV1,rollingMainlineRefreshResultV1.candidate,
        refreshedRollingPublicationQaJobV1.id,refreshedRollingPublicationQaJobV1.configurationDigest,refreshedRollingPublicationQaJobV1.commands);
      assert.equal(refreshedRollingPublicationQaV1.outcome,'PASS');
      await restartedPublicationStore.recordPublicationQa('bound-fixture',firstClaim.claim.id,refreshedRollingPublicationQaV1);
      assert.equal((await restartedPublicationStore.publishMainline('bound-fixture',firstClaim.claim.id)).result.state,'PUBLISHED');
      if (mainlinePublication === 'race') assert.ok(fs.existsSync(path.join(root,'racing-mainline.txt')));
    } else if (mainlinePublication === 'normal') {
      assert.equal((await restartedPublicationStore.publishMainline('bound-fixture',firstClaim.claim.id)).result.state,'PUBLISHED');
    } else {
      assert.deepEqual(await restartedPublicationStore.beginMainlinePush('bound-fixture',firstClaim.claim.id),rollingMainlineCandidateV1);
      assert.equal(execFileSync('git',['-C',remoteRoot,'rev-parse','refs/heads/main'],{encoding:'utf8'}).trim(),baseCommit,'the QA gate records intent; it does not push');
      if (mainlinePublication === 'lost_ack') {
        const rollingIncrementPublicationResult = publishRollingIncrement({rootPath:root,target:rollingPublicationBatchClaimV1.target,revision:rollingMainlineCandidateV1.revision});
        assert.equal(rollingIncrementPublicationResult.state,'PUBLISHED');
        assert.equal(await restartedPublicationStore.mainlinePublication('bound-fixture',firstClaim.claim.id),null);
        const recoveredRollingMainlinePublicationV1 = await new RollingCampaignStore(pool,projectId).observeMainlinePublication('bound-fixture',firstClaim.claim.id);
        assert.equal(recoveredRollingMainlinePublicationV1.result.state,'PUBLISHED');
        assert.deepEqual(await restartedPublicationStore.observeMainlinePublication('bound-fixture',firstClaim.claim.id),recoveredRollingMainlinePublicationV1);
      }
    }
    if (mainlinePublication !== null) {
      await assert.rejects(restartedPublicationStore.claimIncrement('bound-fixture',crypto.randomUUID()),/publication owns the coordinator checkout/);
      const synchronizedRollingIncrementPublicationResult = await new RollingCampaignStore(pool,projectId).synchronizePublishedCampaign('bound-fixture',firstClaim.claim.id);
      assert.equal(synchronizedRollingIncrementPublicationResult.state,'PUBLISHED');
      assert.deepEqual((await restartedPublicationStore.coordinatorSnapshot('bound-fixture')).publications,[]);
      assert.deepEqual(await restartedPublicationStore.synchronizePublishedCampaign('bound-fixture',firstClaim.claim.id),synchronizedRollingIncrementPublicationResult);
      assert.equal(execFileSync('git',['-C',root,'symbolic-ref','--short','HEAD'],{encoding:'utf8'}).trim(),'campaign/bound-fixture');
      assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_mainline_publication_v1 WHERE project_id=$1',[projectId])).rows[0]?.count,mainlinePublication === 'unavailable' ? 4 : mainlinePublication === 'race' || mainlinePublication === 'rejected' ? 2 : 1);
      fs.writeFileSync(path.join(root,'later-campaign-work.txt'),'Preserve later work when a completed synchronization receipt is requested.\n');
      execFileSync('git',['-C',root,'add','later-campaign-work.txt']);
      execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','later campaign work']);
      const laterRevision = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      assert.deepEqual(await restartedPublicationStore.synchronizePublishedCampaign('bound-fixture',firstClaim.claim.id),synchronizedRollingIncrementPublicationResult);
      assert.equal(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),laterRevision);

    }


  }
  } else await assert.rejects(rollingCampaignStore.claimIncrement('bound-fixture',rollingStoredReview.request.id),/accepted review/);
  const changedRollingReviewOutcomeV1: RollingReviewOutcomeV1 = reviewDecision === 'accepted'
    ? { ...rollingReviewOutcomeV1, decision: 'rejected', findings: ['Changed verdict.'] }
    : { ...rollingReviewOutcomeV1, decision: 'accepted', findings: [] };
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, reviewerSessionId, changedRollingReviewOutcomeV1), /immutable decision/);
  assert.deepEqual((await rollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id)).find(review => review.request.id === rollingStoredReview.request.id)?.outcome, rollingReviewOutcomeV1);
  assert.deepEqual(await foreignRollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id), []);
  assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
  }

  // Traceability: verifies REQ-ROLLING-GRAPH
  // This fixture reconciles Git and certificate inputs; it does not replace adversarial review or production publication.
  const rollingStoredSubmission = storedSubmissions[0];
  assert.ok(rollingStoredSubmission);
  execFileSync('git', ['-C', root, 'merge', '-q', '--ff-only', revision]);
  fs.copyFileSync(path.join(workerRoot, 'proof.txt'), path.join(root, 'proof.txt'));
  const certificateRollingWorkerSubmissionV1 = reviewScenario.integratedCertificates ? integratedRollingWorkerSubmissionV1 : rollingStoredSubmission.submission;
  assert.ok(certificateRollingWorkerSubmissionV1);
  const obligationCertificateSubmission: ObligationCertificateSubmission = { lease: rollingStoredSubmission.lease,
    revision: certificateRollingWorkerSubmissionV1.revision, operations: certificateRollingWorkerSubmissionV1.proof.map(item => item.operation),
    evidence: certificateRollingWorkerSubmissionV1.proof.map(item => item.evidence) };
  const obligationCertificateBindingV1: ObligationCertificateBindingV1 = { schemaVersion: 1, certificateId: 'CERT-bound-candidate',
    lease: rollingStoredSubmission.lease, revision: rollingStoredSubmission.submission.revision,
    proof: [{ operation: 'check', certificateEvidenceIndex: 0, submissionEvidenceIndex: 0 }] };
  fs.writeFileSync(path.join(root, 'certificate-binding.json'), JSON.stringify(obligationCertificateBindingV1));
  const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { path: 'certificate-binding.json', submission: obligationCertificateSubmission };
  const boundObligationCertificate: ObligationCertificate = { id: obligationCertificateBindingV1.certificateId,
    obligationIds: [firstRollingBinding.obligationId], inputs: createObligationGitInputs(root, [...new Set([...fixtureObligationBaseline.requirements.map(item => item.path),
      ...obligationInputPaths(submissionObligationEvidence.inputs)])]),
    artifacts: ['certificate-binding.json'], assessor: 'coordinator', authority: fixtureObligationBaseline.authority.references,
    adequate: true, reason: 'Isolated stored-submission acceptance contract proof', disposition: null,
    evidence: obligationCertificateSubmission.evidence, inventoryIds: [] };
  const boundObligationCheckpoint: ObligationCheckpoint = { id: 'CP-bound-acceptance', predecessorId: productiveObligationCheckpoint.id,
    baselineId: fixtureObligationBaseline.id, kind: 'productive', selectedIds: boundObligationCertificate.obligationIds,
    registeredIds: [], certificateIds: [boundObligationCertificate.id], invalidatedIds: [], before: [0, 1, 1, 1, 1, 1], after: [0, 0, 1, 1, 1, 1],
    preparation: null, reason: 'Isolated proof accepted on reconciled inputs', assessor: 'coordinator' };
  const candidateBoundObligationDocumentV1: ObligationDocumentV1 = { ...boundObligationDocumentV1,
    certificates: [...boundObligationDocumentV1.certificates, boundObligationCertificate],
    checkpoints: [...boundObligationDocumentV1.checkpoints, boundObligationCheckpoint] };
  const forgedObligationCertificateBindingRequest: ObligationCertificateBindingRequest = { ...obligationCertificateBindingRequest,
    submission: { ...obligationCertificateSubmission, revision: 'f'.repeat(40) } };
  assert.throws(() => acceptBoundCheckpoint(boundObligationDocumentV1, candidateBoundObligationDocumentV1, root,
    submissionObligationBindingHistoryV1, [forgedObligationCertificateBindingRequest]), /retained submission/);
  if (reviewScenario.integratedCertificates) {
    const candidatePath = 'candidate-certificate.json';
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify(candidateBoundObligationDocumentV1));
    const previousDocumentText = fs.readFileSync(path.join(root,'bound-obligations.json'),'utf8');
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',crypto.randomUUID(),candidatePath,['certificate-binding.json']),/published reviewed increment/);
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,'bound-obligations.json',['certificate-binding.json']),/separate from the accepted document/);
    const legacyObligationCertificate: ObligationCertificate = {...boundObligationCertificate,
      inputs:[...new Set([...obligationInputPaths(boundObligationCertificate.inputs),'proof.txt','certificate-binding.json'])]
        .map(relative=>({path:relative,digest:inputDigest(root,relative)})),
      evidence:boundObligationCertificate.evidence.map(evidence=>({...evidence,
        inputs:[...new Set([...obligationInputPaths(evidence.inputs),evidence.outputPath])]
          .map(relative=>({path:relative,digest:inputDigest(root,relative)}))}))};
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify({...candidateBoundObligationDocumentV1,
      certificates:[...boundObligationDocumentV1.certificates,legacyObligationCertificate]}));
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/hash manifests are historical only/);
    assert.ok(isObligationGitInputs(boundObligationCertificate.inputs));
    const selfAssessingObligationCertificate: ObligationCertificate = {...boundObligationCertificate,
      inputs:{...boundObligationCertificate.inputs,paths:[...boundObligationCertificate.inputs.paths,'bound-obligations.json']}};
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify({...candidateBoundObligationDocumentV1,
      certificates:[...boundObligationDocumentV1.certificates,selfAssessingObligationCertificate]}));
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/cannot certify its own bytes/);
    const forgedCandidate = {...candidateBoundObligationDocumentV1,checkpoints:[...boundObligationDocumentV1.checkpoints,{...boundObligationCheckpoint,assessor:'worker'}]};
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify(forgedCandidate));
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/assessor.*authority/);
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify(candidateBoundObligationDocumentV1));
    const sourceText = fs.readFileSync(path.join(root,'fixture/current.ts'),'utf8');
    fs.appendFileSync(path.join(root,'fixture/current.ts'),'// stale integrated input\n');
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/changed.*inputs/);
    fs.writeFileSync(path.join(root,'fixture/current.ts'),sourceText);
    assert.equal(fs.readFileSync(path.join(root,'bound-obligations.json'),'utf8'),previousDocumentText);
    const assignedObligation = candidateBoundObligationDocumentV1.obligations.find(obligation=>obligation.id === firstRollingBinding.obligationId);
    assert.ok(assignedObligation);
    const scopeAmendmentCandidate = {...candidateBoundObligationDocumentV1,obligations:[...candidateBoundObligationDocumentV1.obligations,
      {...assignedObligation,id:'OBL-999',responsibilityId:'unapproved-candidate-catalog-entry'}]};
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify(scopeAmendmentCandidate));
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/cannot amend approved scope/);
    assert.equal(fs.readFileSync(path.join(root,'bound-obligations.json'),'utf8'),previousDocumentText);
    fs.writeFileSync(path.join(root,candidatePath),JSON.stringify(candidateBoundObligationDocumentV1));
    // Model another accepted integration owning the same coordinator lane.
    const busyReviewId = crypto.randomUUID();
    const busyRollingReviewRequestV1 = readRollingReviewRequestV1({...rollingStoredReview.request,id:busyReviewId});
    const decidedRollingStoredReview = (await rollingCampaignStore.reviews('bound-fixture',submissionRollingStoredAssignment.id)).find(review=>review.request.id === rollingStoredReview.request.id);
    assert.ok(decidedRollingStoredReview?.outcome);
    const busyRollingReviewOutcomeV1 = readRollingReviewOutcomeV1({...decidedRollingStoredReview.outcome,reviewId:busyReviewId});
    const incrementRow = (await pool.query<Record<string,unknown>>('SELECT claim_text FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND review_id=$2',[projectId,rollingStoredReview.request.id])).rows[0];
    assert.ok(incrementRow && typeof incrementRow.claim_text === 'string');
    const storedClaim: unknown = JSON.parse(incrementRow.claim_text);
    const rollingIncrementClaimV1 = readRollingIncrementClaimV1(storedClaim);
    const busyRollingIncrementClaimV1 = readRollingIncrementClaimV1({...rollingIncrementClaimV1,id:crypto.randomUUID(),reviewId:busyReviewId});
    await pool.query('INSERT INTO ponytail_index.rolling_review_v1(project_id,campaign_id,review_id,assignment_id,generation,revision,request_text,outcome_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [projectId,'bound-fixture',busyReviewId,busyRollingReviewRequestV1.assignmentId,busyRollingReviewRequestV1.generation,busyRollingReviewRequestV1.revision,JSON.stringify(busyRollingReviewRequestV1),JSON.stringify(busyRollingReviewOutcomeV1)]);
    await pool.query('INSERT INTO ponytail_index.rolling_increment_v1(project_id,campaign_id,review_id,increment_id,claim_text,state) VALUES($1,$2,$3,$4,$5,\'PUSHING\')',
      [projectId,'bound-fixture',busyReviewId,busyRollingIncrementClaimV1.id,JSON.stringify(busyRollingIncrementClaimV1)]);
    await assert.rejects(rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),/integration lane is occupied/);
    assert.equal(fs.readFileSync(path.join(root,'bound-obligations.json'),'utf8'),previousDocumentText);
    await pool.query('DELETE FROM ponytail_index.rolling_review_v1 WHERE project_id=$1 AND review_id=$2',[projectId,busyReviewId]);
    const previousGraphDigest = (await rollingCampaignStore.status('bound-fixture')).graphDigest;
    const acceptedDocuments = await Promise.all(Array.from({length:4},()=>rollingCampaignStore.acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json'])));
    for (const acceptedObligationDocumentV1 of acceptedDocuments) assert.deepEqual(acceptedObligationDocumentV1,candidateBoundObligationDocumentV1);
    // Model a lost database update after the canonical file checkpoint landed.
    await pool.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2',[projectId,'bound-fixture',previousGraphDigest]);
    assert.equal((await rollingCampaignStore.status('bound-fixture')).graphDigest,previousGraphDigest);
    assert.deepEqual(await new RollingCampaignStore(pool,projectId).acceptIncrementCertificates('bound-fixture',rollingStoredReview.request.id,candidatePath,['certificate-binding.json']),candidateBoundObligationDocumentV1);
    const acceptedRollingGraph = collectRollingGraph(root,'bound-obligations.json','bound-bindings.json','history.json');
    assert.ok(acceptedRollingGraph.projection.satisfiedIds.includes(firstRollingBinding.obligationId));
    assert.equal((await rollingCampaignStore.status('bound-fixture')).graphDigest,acceptedRollingGraph.digest);
    assert.equal(acceptedRollingGraph.document.checkpoints.filter(checkpoint=>checkpoint.id === boundObligationCheckpoint.id).length,1);
    if (reviewScenario.publicationFlush) {
      if (reviewScenario.publicationFlush === 'quiescence') {
        // Controlled host acknowledgements stop the fixture's retained workers;
        // the native cessation boundary is exercised by its separate live Arc.
        await rollingCampaignStore.suspend('fixture',reactivatedRollingAllocationResult.assignment.id,reactivatedRollingAllocationResult.assignment.generation,true,['OBL-1']);
        await rollingCampaignStore.suspend('bound-fixture',submissionRollingStoredAssignment.id,submissionRollingStoredAssignment.generation,true,['OBL-1']);
      }
      const rollingPublicationBatchClaimResult = await rollingCampaignStore.claimPublicationBatch('bound-fixture',acceptedRollingGraph.digest,reviewScenario.publicationFlush);
      assert.ok(rollingPublicationBatchClaimResult.state === 'CLAIMED');
      assert.equal(rollingPublicationBatchClaimResult.claim.trigger,reviewScenario.publicationFlush);
      assert.equal(rollingPublicationBatchClaimResult.claim.increments.length,1);
      assert.equal(rollingPublicationBatchClaimResult.claim.publicationSize,2);
    }
    return;
  }
  const acceptedBoundObligationDocumentV1 = acceptBoundCheckpoint(boundObligationDocumentV1, candidateBoundObligationDocumentV1, root,
    submissionObligationBindingHistoryV1, [obligationCertificateBindingRequest]);
  assert.deepEqual(acceptedBoundObligationDocumentV1.obligations, boundObligationDocumentV1.obligations);
  fs.writeFileSync(path.join(root, 'bound-obligations.json'), JSON.stringify(acceptedBoundObligationDocumentV1));
  const acceptedBoundRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  assert.ok(acceptedBoundRollingGraph.projection.satisfiedIds.includes(firstRollingBinding.obligationId));
  await rollingCampaignStore.reconcileGraph('bound-fixture', (await rollingCampaignStore.status('bound-fixture')).graphDigest, acceptedBoundRollingGraph.digest);
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
  fs.writeFileSync(path.join(root, 'fixture/current.ts'), 'export const value: number = 3;\n');
  assert.throws(() => acceptBoundCheckpoint(boundObligationDocumentV1, candidateBoundObligationDocumentV1, root,
    submissionObligationBindingHistoryV1, [obligationCertificateBindingRequest]), /changed Git inputs/);
  assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
}
const reviewScenarios: readonly ReviewScenario[] = [{ decision: 'accepted', mode: 'manual' }, { decision: 'rejected', mode: 'manual' }, { decision: 'accepted', mode: 'protocol' }];
// Traceability: verifies REQ-ROLLING-REVIEW
test('real PostgreSQL records lost reviewer replacement and fences the old actor while retaining fresh review after restart',
  t => runRollingReviewScenario(t,{decision:'accepted',mode:'manual',replaceLostReviewer:true}));
// Traceability: verifies REQ-ROLLING-PUBLICATION
for (const reviewScenario of reviewScenarios) {
  test(`real PostgreSQL serializes allocation, retains ownership and persists ${reviewScenario.mode === 'protocol' ? 'native application' : reviewScenario.decision} review`,
    t => runRollingReviewScenario(t, reviewScenario));
}

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
async function connectRollingWorkerCodex(t: TestContext): Promise<RollingCodex> {
  // Node's test-runner metadata belongs to this harness, not the native worker.
  const rollingCodex = await RollingCodex.connect({executable:'env',argv:['-u','NODE_TEST_CONTEXT','codex','app-server','--listen','stdio://']});
  rollingCodex.on('notification', notification => {
    if (!['turn/started','turn/completed','thread/status/changed'].includes(notification.method)) return;
    const params = notification.params;
    if (params === null || typeof params !== 'object' || Array.isArray(params)) return;
    const threadId = 'threadId' in params ? params.threadId : null;
    const turn = 'turn' in params ? params.turn : null;
    const status = 'status' in params ? params.status : null;
    t.diagnostic(`native lifecycle ${notification.method}; thread=${typeof threadId === 'string' ? threadId : 'unknown'}; turn=${JSON.stringify(turn === null || typeof turn !== 'object' ? null : {id:'id' in turn ? turn.id : null,status:'status' in turn ? turn.status : null})}; activity=${JSON.stringify(status)}`);
  });
  return rollingCodex;
}

async function observeRollingWorkerTurn(t: TestContext, rollingCodex: RollingCodex, threadId: string,
  turnId: string): Promise<RollingNativeTurn> {
  for (;;) {
    try {return await rollingCodex.waitForTurn(threadId,turnId);}
    catch (cause) {
      if (!(cause instanceof RollingObservationTimeout)) throw cause;
      const rollingNativeTurn = await rollingCodex.readTurn(threadId,turnId);
      if (rollingNativeTurn.status !== 'inProgress') return rollingNativeTurn;
      t.diagnostic(`worker turn remains active: thread=${threadId}; turn=${turnId}; continue observing the same handle`);
    }
  }
}

export async function runRollingWorkerScenario(t: TestContext, mode: 'protocol' | 'native', operation: 'attachment' | 'instructions' | 'suspension' | 'resumption' | 'recovery' | 'collection' | 'code' | 'inspection', rework = false, integrationRepair = false, retirement = false): Promise<void> {
  assert.ok(!integrationRepair || mode === 'protocol' && operation === 'collection');
  assert.ok(!rework || mode === 'native' && operation === 'code', 'correction Arc requires the real native code worker');
  const repositoryRoot = path.resolve(__dirname, '../..');
  const pool = new Pool(databaseOptions(repositoryRoot));
  const projectId = crypto.randomUUID();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-worker-store-')));
  const rollingCampaignStore = new RollingCampaignStore(pool, projectId);
  let rollingCodex = mode === 'native' ? await connectRollingWorkerCodex(t)
    : new RollingCodex({executable:process.execPath,argv:[path.join(__dirname,'fixtures/rolling-codex-server.js')]});
  let rollingWorkerInitialization: RollingWorkerInitialization | null = null;
  let provisioningStarted = false;
  let instructionDispatchStarted = false;
  let rollingWorkerDispatchAttached: RollingWorkerDispatchAttached | null = null;
  let instructionGeneration:string | null = null;
  let reworkReviewerThread:RollingNativeThread | null = null;
  let reworkReviewDispatch:RollingReviewDispatchAttached | null = null;
  let reworkReviewDispatchStarted = false;
  let cleanupSafe = false;
  t.after(async () => {
    try {
      if (reworkReviewerThread !== null) {
        if (reworkReviewDispatchStarted) {
          assert.ok(reworkReviewDispatch, 'unknown review dispatch retains its worker checkout and database reservation');
          const reviewTurn = await rollingCodex.readTurn(reworkReviewerThread.thread.id,reworkReviewDispatch.turnId);
          if (reviewTurn.status === 'inProgress') {
            await rollingCodex.interruptTurn(reworkReviewerThread.thread.id,reworkReviewDispatch.turnId);
            await rollingCodex.waitForTurn(reworkReviewerThread.thread.id,reworkReviewDispatch.turnId);
          }
        }
        await rollingCodex.archiveThread(reworkReviewerThread.thread.id);
      }
      if (mode === 'native' && provisioningStarted) {
        assert.ok(rollingWorkerInitialization, 'unknown worker creation retains its checkout and database reservation');
        const {rollingWorkerCreationV1,rollingTurnStarted} = rollingWorkerInitialization;
        if (instructionDispatchStarted) {
          assert.ok(rollingWorkerDispatchAttached,'unknown instruction dispatch retains its checkout and worker');
          const instructionTurn = await rollingCodex.readTurn(rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
          if (instructionTurn.status === 'inProgress') {
            await rollingCodex.interruptTurn(rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
            await rollingCodex.waitForTurn(rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
          }
        }
        const rollingNativeTurn = await rollingCodex.readTurn(rollingWorkerCreationV1.threadId,rollingTurnStarted.turn.id);
        if (rollingNativeTurn.status === 'inProgress') {
          await rollingCodex.interruptTurn(rollingWorkerCreationV1.threadId,rollingTurnStarted.turn.id);
          await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId,rollingTurnStarted.turn.id);
        }
        await rollingCodex.archiveThread(rollingWorkerCreationV1.threadId);
      }
      await rollingCodex.close();
      await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1',[projectId]);
      cleanupSafe = true;
    } finally {await pool.end();if (cleanupSafe) fs.rmSync(root,{recursive:true,force:true});}
  });
  execFileSync('git',['init','-q',root]);
  fs.mkdirSync(path.join(root,'.agents/config/project'),{recursive:true});
  const rollingProjectConfigV1: RollingProjectConfigV1 = {schemaVersion:1,mainline:{remote:'origin',branch:'main'},
    managedWorktrees:{directory:'managed',anchor:'main'},maxActiveWorkers:1,publicationSize:1,setupCommands:[],qa:{focused:integrationRepair ? [[process.execPath,'--test','--test-reporter=tap','fixture.test.ts']] : operation === 'code' ? [['npm','run','build'],['node','--test','--test-reporter=tap','fixture.test.ts']] : operation !== 'attachment' ? [['node','--test','fixture.test.ts']] : [],publication:[['node','--test']]}};
  const rollingPhysicalProjectConfig:RollingPhysicalProjectConfig = retirement
    ? {...rollingProjectConfigV1,schemaVersion:2,retirementCommands:[[process.execPath,path.join(__dirname,'fixtures/rolling-worktree-cleanup.js')]]}
    : rollingProjectConfigV1;
  fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingPhysicalProjectConfig));
  fs.writeFileSync(path.join(root,'.gitignore'),`/managed/\n/session_id.txt\n/origin.git/\n${operation !== 'attachment' ? '/tmp/\n/upstream/\n/node_modules\n' : ''}`);
  if (operation === 'code') {
    fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'rolling-native-code-fixture',private:true,type:'module',
      scripts:{build:'node node_modules/typescript/bin/tsc --project tsconfig.json'}}));
    fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{module:'NodeNext',moduleResolution:'NodeNext',target:'ES2022',
      strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,noEmit:true,allowImportingTsExtensions:true,types:['node']},
      include:['fixture.ts','fixture.test.ts']}));
    fs.writeFileSync(path.join(root,'ponytail.json'),JSON.stringify({version:2,buildImpact:{version:2,globalInputs:[],adapters:[{type:'typescript',
      targets:[{name:'fixture',buildCommand:'npm run build',tsconfig:'tsconfig.json',configurationInputs:[],additionalInputs:[]}]}]}}));
  }
  const sourceObligationDocumentV1 = readRollingObligationFixtureSource();
  const originalObligationBaseline = sourceObligationDocumentV1.baselines[0];assert.ok(originalObligationBaseline);
  let fixtureRequirementText = operation === 'code'
    ? `# Worker code fixture\n\nChange the exported fixture value to 2 and update the unit expectation. Preserve the integration invariant. Commit only fixture.ts and fixture.test.ts. Then freshly fetch origin campaign/worker-fixture and perform an interactive semantic rebase, stopping after ${rework ? 'each of its two replayed commits' : 'its single replayed commit'} to inspect the patch in the new base and run focused QA before continuing. The project already configures a checked sequence editor to mark ${rework ? 'every commit' : 'the commit'} for an edit stop: use ordinary git rebase -i with that editor, without an editor override or terminal interaction. Retain the original pre-rebase commit SHA in ignored tmp/original-commit.txt and actual rebase output plus the semantic inspection in ignored tmp/semantic-rebase.txt. Use ignored tmp/focused.txt for the actual final focused test output, with --test-reporter=tap. Return only strict submission JSON with fresh Git-based evidence identifying the tested commit and relevant tracked source paths. Retain the ignored rebase and test outputs for inspection; do not hash them or put ignored logs in source inputs.\n`
    : '# Worker responsibility fixture\n\nInspect the fixture value and retain the assigned requirement, acceptance, Arc/step, implementation, unit/integration, lease, path and QA references in ignored tmp/responsibility.txt. Preserve tracked source files. Retain actual focused QA output in ignored tmp/focused.txt and its verification in ignored tmp/verification.json.\n';
  if (integrationRepair) fixtureRequirementText = 'Establish fixture value 2, preserve independently published upstream context, and prove focused unit and integration behavior. Substantive integration repairs require fresh semantic inspection, rebase, focused QA and the original reviewer.\n';
  if (operation === 'code') fixtureRequirementText += 'For Git mutations, invoke separate commands exactly from this reviewed list, without bundling them with other commands or editor overrides. Other inspection and proof commands remain ordinary local operations.\n'
    + nativeCodeFixtureCommands.map(command => `- ${command}`).join('\n') + '\n';
  const obligationBaseline: ObligationBaseline = {...originalObligationBaseline,
    requirements:originalObligationBaseline.requirements.map(item => ({...item,digest:operation !== 'attachment'
      ? crypto.createHash('sha256').update(fixtureRequirementText).digest('hex') : inputDigest(repositoryRoot,item.path)}))};
  const obligationDocumentV1: ObligationDocumentV1 = {...sourceObligationDocumentV1,scopeId:'worker-fixture',baselines:[obligationBaseline],
    obligations:sourceObligationDocumentV1.obligations.filter(item => obligationBaseline.obligationIds.includes(item.id)).map((item,index) =>
      operation !== 'attachment' && index === 1 ? {...item,
        condition:operation === 'inspection' ? 'Inspect fixture.ts and establish that its exported value remains 1. Run configured focused fixture QA and retain its actual output under ignored tmp/inspection-qa.log. Do not change tracked implementation files or create a commit.' : operation === 'code' || integrationRepair ? fixtureRequirementText : 'Inspect fixture.ts and establish that its exported value remains 1. Run the configured focused fixture QA. In ignored tmp/responsibility.txt identify every assigned requirement ID, acceptance ID, Arc/step IDs, implementation ID, unit/integration IDs and selections, permitted paths, lease generation and target. Retain actual focused QA output in ignored tmp/focused.txt and its verification in ignored tmp/verification.json. Do not modify tracked files.',
        criterion:operation === 'code' ? 'Native code implementation, focused QA, fresh commit-by-commit semantic rebase and exact stopped submission in REVIEW.' : 'Read-only fixture inspection and passing focused QA with the exact worker responsibility references in the final report.'} : item),
    certificates:[],checkpoints:[]};
  fs.mkdirSync(path.join(root,'pm/requirements'),{recursive:true});
  if (operation !== 'attachment') {
    fs.writeFileSync(path.join(root,'pm/requirements/rolling-campaigns.md'),fixtureRequirementText);
    fs.writeFileSync(path.join(root,'fixture.ts'),'export const value: number = 1;\n');
    fs.writeFileSync(path.join(root,'fixture.test.ts'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { value } from './fixture.ts';\ntest('fixture unit', () => assert.equal(value, 1));\ntest('fixture integration', () => assert.equal(Number.isSafeInteger(value), true));\n");
  } else fs.copyFileSync(path.join(repositoryRoot,'pm/requirements/rolling-campaigns.md'),path.join(root,'pm/requirements/rolling-campaigns.md'));
  fs.writeFileSync(path.join(root,'obligations.json'),JSON.stringify(obligationDocumentV1));
  const obligation = obligationDocumentV1.obligations[1];assert.ok(obligation);
  const rollingBinding: RollingBinding = {obligationId:obligation.id,
    implementationIds:operation !== 'attachment' ? ['IMPL-FIXTURE'] : [],sourcePaths:operation !== 'attachment' ? ['fixture.ts'] : [],
    acceptances:operation !== 'attachment' ? [{id:'ACCEPT-FIXTURE',arcId:'ARC-FIXTURE',stepId:'STEP-FIXTURE'}] : [],
    unitTests:operation !== 'attachment' ? [{id:'UNIT-FIXTURE',path:'fixture.test.ts',selection:['fixture unit']}] : [],
    integrationTests:operation !== 'attachment' ? [{id:'INTEGRATION-FIXTURE',path:'fixture.test.ts',selection:['fixture integration']}] : [],exclusiveResources:[]};
  const nextObligation = obligationDocumentV1.obligations[2];assert.ok(nextObligation);
  const nextRollingBinding:RollingBinding = {obligationId:nextObligation.id,implementationIds:[],sourcePaths:[],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]};
  const rollingBindingsV1: RollingBindingsV1 = {schemaVersion:1,bindings:(operation === 'suspension' || operation === 'resumption') ? [rollingBinding,nextRollingBinding] : [rollingBinding]};
  fs.writeFileSync(path.join(root,'bindings.json'),JSON.stringify(rollingBindingsV1));
  const obligationBindingRevisionV1: ObligationBindingRevisionV1 = {id:'BIND-1',obligationId:obligation.id,predecessorId:null,
    baselineId:obligationBaseline.id,assessor:'coordinator',authority:obligationBaseline.authority.references,reason:'Isolated worker attachment',dependsOn:[],
    execution:{sprintId:null,taskletIds:[],plannedPaths:operation !== 'attachment' ? ['fixture.ts','fixture.test.ts','pm/requirements/rolling-campaigns.md',...(operation === 'inspection' ? ['tmp/inspection-qa.log'] : operation !== 'code' ? ['tmp/responsibility.txt','tmp/focused.txt','tmp/verification.json'] : [])] : ['fixture.ts'],
      operations:operation === 'code' ? ['inspect','edit','build','test'] : integrationRepair ? ['inspect','edit','test'] : operation !== 'attachment' ? ['inspect','test'] : ['edit','test'],selection:operation !== 'attachment' ? ['fixture unit','fixture integration'] : ['fixture'],target:{identity:'local',profile:'fixture'}}};
  const nextObligationBindingRevisionV1:ObligationBindingRevisionV1 = {...obligationBindingRevisionV1,id:'BIND-2',obligationId:nextObligation.id,
    reason:'Independent next fixture obligation',execution:{...obligationBindingRevisionV1.execution,plannedPaths:['next.ts']}};
  const obligationBindingHistoryV1: ObligationBindingHistoryV1 = {schemaVersion:1,scopeId:'worker-fixture',
    revisions:(operation === 'suspension' || operation === 'resumption') ? [obligationBindingRevisionV1,nextObligationBindingRevisionV1] : [obligationBindingRevisionV1]};
  fs.writeFileSync(path.join(root,'history.json'),JSON.stringify(obligationBindingHistoryV1));
  execFileSync('git',['-C',root,'add','.']);
  execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','worker base']);
  execFileSync('git',['-C',root,'branch','campaign/worker-fixture']);
  if (operation === 'code') {
    const editorCommand = [process.execPath,path.join(__dirname,'fixtures/rolling-rebase-editor.js')]
      .map(item => `'${item.replaceAll("'","'\\''")}'`).join(' ');
    execFileSync('git',['-C',root,'config','sequence.editor',editorCommand]);
  }
  if (operation !== 'attachment' && mode === 'native' || integrationRepair) {
    const origin = path.join(root,'origin.git');
    execFileSync('git',['clone','--bare','-q',root,origin]);
    execFileSync('git',['-C',root,'remote','add','origin',origin]);
  }
  const rollingGraph = collectRollingGraph(root,'obligations.json','bindings.json','history.json');
  await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)',[projectId,`worker-${projectId}`]);
  await rollingCampaignStore.registerCampaign({id:'worker-fixture',coordinatorRoot:root,documentPath:'obligations.json',bindingsPath:'bindings.json',
    graphDigest:rollingGraph.digest,managedDirectory:path.join(root,'managed'),configuration:{mainline:{remote:'origin',branch:'main'},
      incrementRef:'campaign/worker-fixture',maxActiveWorkers:1,publicationSize:1},
    bindingHistory:{path:'history.json',assessor:'coordinator',authority:obligationBaseline.authority.references}});
  const rollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',rollingGraph.digest);
  assert.ok(rollingAllocationResult.assignment && rollingAllocationResult.actionId && rollingAllocationResult.worktree);
  const generation = rollingAllocationResult.assignment.generation;
  if (mode === 'protocol') await rollingCodex.initialize();
  else {
    rollingCodex.on('serverRequest',message => {
      const params = message.params;
      const permitted = operation === 'code' && rollingWorkerInitialization !== null && rollingWorkerDispatchAttached !== null
        && rollingAllocationResult.worktree !== undefined
        && permitNativeCodeFixtureApproval(message, rollingAllocationResult.worktree.rootPath,
          rollingWorkerInitialization.rollingWorkerCreationV1.threadId, rollingWorkerDispatchAttached.turnId);
      if (operation === 'code') t.diagnostic(`native QA approval method=${message.method}; decision=${permitted ? 'accept exact fixture command' : 'decline'}; request=${JSON.stringify(params)}`);
      rollingCodex.respondToServer(message.id,{decision:permitted ? 'accept' : 'decline'});
    });
    rollingCodex.on('diagnostic',message => t.diagnostic(message.trim()));
  }
  provisioningStarted = true;
  rollingWorkerInitialization = await provisionRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation);
  if (operation === 'code') {
    // Declared compilation inputs must physically belong to the fixture checkout.
    // Keep the compiler and its Node type dependencies inside its ignored tree.
    for (const dependency of ['typescript','@types/node','undici-types']) {
      fs.cpSync(path.join(repositoryRoot,'node_modules',dependency),path.join(rollingAllocationResult.worktree.rootPath,'node_modules',dependency),
        {recursive:true,dereference:true});
    }
    t.diagnostic(`native fixture identity thread=${rollingWorkerInitialization.rollingWorkerCreationV1.threadId}; root=${rollingAllocationResult.worktree.rootPath}`);
  }
  await assert.rejects(rollingCampaignStore.claimWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation),/already claimed/);
  await assert.rejects(rollingCampaignStore.recordWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    {...rollingWorkerInitialization.rollingWorkerCreationV1,sessionId:'foreign'}),/immutable/);
  await assert.rejects(rollingCampaignStore.completeWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    {...rollingWorkerInitialization.rollingWorkerCreationV1,sessionId:'foreign'}),/receipt differs/);
  let rollingSessionAttachment:RollingSessionAttachment;
  if (operation === 'recovery') {
    const rollingWorkerCreationV1 = rollingWorkerInitialization.rollingWorkerCreationV1;
    await pool.query('UPDATE ponytail_index.rolling_action_v1 SET result_text=NULL WHERE project_id=$1 AND action_id=$2',[projectId,rollingAllocationResult.actionId]);
    const restartedRollingCampaignStore = new RollingCampaignStore(pool,projectId);
    const unknownRollingWorkerCreationRecovery = await recoverRollingWorkerCreation(restartedRollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation);
    assert.equal(unknownRollingWorkerCreationRecovery.state,'unknown');
    assert.equal(unknownRollingWorkerCreationRecovery.rootPath,rollingAllocationResult.worktree.rootPath);
    assert.equal((await restartedRollingCampaignStore.nextActions('worker-fixture'))[0]?.state,'STARTED');
    assert.equal((await restartedRollingCampaignStore.allocate('worker-fixture',rollingGraph.digest)).reason,'capacity_reached');
    await assert.rejects(restartedRollingCampaignStore.claimWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation),/already claimed/);
    await assert.rejects(restartedRollingCampaignStore.retire('worker-fixture',rollingAllocationResult.assignment.id,generation,true),/external action outcome/);
    // Restore the original externally observed receipt; no new native session
    // is created to stand in for an unknown outcome.
    await restartedRollingCampaignStore.recordWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,rollingWorkerCreationV1);
    await observeRollingWorkerInitialization(rollingCodex,rollingWorkerInitialization);
    if (mode === 'protocol') {
      await rollingCodex.request('fixture-activity',{active:true});
      assert.equal((await recoverRollingWorkerCreation(restartedRollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation)).state,'active');
      assert.equal((await restartedRollingCampaignStore.status('worker-fixture')).assignments[0]?.state,'RESERVED');
      await assert.rejects(rollingCodex.close(),/observe terminal turns/);
      await rollingCodex.request('fixture-activity',{active:false});
    } else {
      await rollingCodex.close();
      rollingCodex = await connectRollingWorkerCodex(t);
      rollingCodex.on('serverRequest',message => rollingCodex.respondToServer(message.id,{decision:'decline'}));
    }
    // The product operation receives only durable action selectors. It reads
    // the initialization from native history after the coordinator restart.
    const rollingWorkerCreationRecovery = await recoverRollingWorkerCreation(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation);
    assert.equal(rollingWorkerCreationRecovery.state,'attached');assert.ok(rollingWorkerCreationRecovery.state === 'attached');
    rollingSessionAttachment = rollingWorkerCreationRecovery.rollingSessionAttachment;
    assert.deepEqual(await recoverRollingWorkerCreation(restartedRollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation),rollingWorkerCreationRecovery);
    assert.equal((await rollingCodex.readInitializationTurn(rollingWorkerCreationV1.threadId)).id,rollingWorkerInitialization.rollingTurnStarted.turn.id);
    t.diagnostic(`worker recovery thread=${rollingWorkerCreationV1.threadId}; session=${rollingWorkerCreationV1.sessionId}; initialization=${rollingWorkerInitialization.rollingTurnStarted.turn.id}; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation`);
  } else rollingSessionAttachment = await attachRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation,rollingWorkerInitialization);
  assert.equal(rollingSessionAttachment.sessionId,rollingWorkerInitialization.rollingWorkerCreationV1.sessionId);
  assert.equal(rollingSessionAttachment.state,'WORKING');
  assert.equal((await rollingCampaignStore.status('worker-fixture')).assignments[0]?.sessionId,rollingWorkerInitialization.rollingWorkerCreationV1.sessionId);
  assert.deepEqual(await rollingCampaignStore.nextActions('worker-fixture'),[]);
  assert.deepEqual(await rollingCampaignStore.completeWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    rollingWorkerInitialization.rollingWorkerCreationV1),rollingSessionAttachment);
  assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'status','--porcelain'],{encoding:'utf8'}),'');
  if (rework) {
    const rootPath = rollingAllocationResult.worktree.rootPath;
    // Harness preparation deliberately seeds a defective candidate. The original
    // native worker owns correction; neither verdict nor its correction is faked.
    fs.mkdirSync(path.join(rootPath,'tmp'),{recursive:true});
    fs.writeFileSync(path.join(rootPath,'fixture.ts'),'export const value: number = 3;\n');
    fs.writeFileSync(path.join(rootPath,'fixture.test.ts'),fs.readFileSync(path.join(rootPath,'fixture.test.ts'),'utf8').replace('assert.equal(value, 1)','assert.equal(value, 3)'));
    execFileSync('git',['-C',rootPath,'add','--','fixture.ts','fixture.test.ts']);
    execFileSync('git',['-C',rootPath,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','Seed incorrect candidate for native review']);
    const rejectedRevision = execFileSync('git',['-C',rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const initialRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,generation);
    const target = initialRollingWorkerContext.lease.binding.execution.target;assert.ok(target);
    const startedAt = new Date().toISOString();
    const output = execFileSync(process.execPath,['--test','--test-reporter=tap','fixture.test.ts'],{cwd:rootPath,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:undefined}});
    const completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(rootPath,'tmp/seed-focused.txt'),output);
    const seedObligationEvidence:ObligationEvidence = {command:`${process.execPath} --test --test-reporter=tap fixture.test.ts`,
      selection:initialRollingWorkerContext.lease.binding.execution.selection,target:{...target,verification:'tmp/seed-focused.txt'},
      revision:rejectedRevision,dirty:false,startedAt,completedAt,outcome:'pass',skips:0,failures:0,finalization:'pass',
      inputs:['fixture.ts','fixture.test.ts','tmp/seed-focused.txt'].map(path=>({path,digest:inputDigest(rootPath,path)})),outputPath:'tmp/seed-focused.txt'};
    const seedRollingWorkerSubmissionV1:RollingWorkerSubmissionV1 = {schemaVersion:1,campaignId:'worker-fixture',assignmentId:rollingAllocationResult.assignment.id,
      generation,sessionId:rollingSessionAttachment.sessionId,graphDigest:initialRollingWorkerContext.lease.graphDigest,revision:rejectedRevision,
      baseCommit:initialRollingWorkerContext.baseCommit,stopped:true,proof:[{operation:'test',evidence:seedObligationEvidence}]};
    await rollingCampaignStore.submit('worker-fixture',rollingAllocationResult.assignment.id,generation,seedRollingWorkerSubmissionV1);
    reworkReviewerThread = await rollingCodex.startThread(rootPath);
    const rejectedRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',rollingAllocationResult.assignment.id,generation,
      rejectedRevision,reworkReviewerThread.thread.sessionId);
    reworkReviewDispatchStarted = true;
    reworkReviewDispatch = await dispatchRollingReview(rollingCampaignStore,rollingCodex,'worker-fixture',rejectedRollingStoredReview.request.id,reworkReviewerThread);
    await observeRollingWorkerTurn(t,rollingCodex,reworkReviewerThread.thread.id,reworkReviewDispatch.turnId);
    const rejectedResult = await collectRollingReview(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rejectedRollingStoredReview.request.id);
    assert.equal(rejectedResult.outcome?.decision,'rejected');
    t.diagnostic(`native rejected review: ${JSON.stringify(rejectedResult)}`);
    await suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,[]);
    const upstream = path.join(root,'upstream');
    execFileSync('git',['clone','-q',path.join(root,'origin.git'),upstream]);
    execFileSync('git',['-C',upstream,'checkout','-q','campaign/worker-fixture']);
    fs.writeFileSync(path.join(upstream,'upstream.txt'),'Preserve this independently published campaign increment.\n');
    execFileSync('git',['-C',upstream,'add','upstream.txt']);
    execFileSync('git',['-C',upstream,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','Independent increment before correction']);
    execFileSync('git',['-C',upstream,'push','-q','origin','campaign/worker-fixture']);
    execFileSync('git',['-C',root,'fetch','-q','origin','campaign/worker-fixture:campaign/worker-fixture']);
    const correctedRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',rollingGraph.digest);
    assert.ok(correctedRollingAllocationResult.assignment && correctedRollingAllocationResult.actionId && correctedRollingAllocationResult.worktree);
    const correctedRollingStoredAssignment = correctedRollingAllocationResult.assignment;
    assert.equal(correctedRollingStoredAssignment.id,rollingAllocationResult.assignment.id);
    assert.equal(correctedRollingStoredAssignment.sessionId,rollingSessionAttachment.sessionId);
    assert.equal(correctedRollingAllocationResult.worktree.rootPath,rootPath);
    assert.notEqual(correctedRollingStoredAssignment.generation,generation);
    await resumeRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',correctedRollingAllocationResult.actionId,correctedRollingStoredAssignment.generation);
    const correctedRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',correctedRollingStoredAssignment.id,correctedRollingStoredAssignment.generation);
    assert.deepEqual(correctedRollingWorkerContext.rejectedReview,rejectedResult.outcome);
    instructionDispatchStarted = true;instructionGeneration = correctedRollingStoredAssignment.generation;
    rollingWorkerDispatchAttached = await dispatchRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',correctedRollingStoredAssignment.id,correctedRollingStoredAssignment.generation);
    const correctiveTurn = await observeRollingWorkerTurn(t,rollingCodex,rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
    assert.equal(correctiveTurn.status,'completed');
    t.diagnostic(`native corrective worker response: ${correctiveTurn.items.filter(item=>item.type==='agentMessage').at(-1)?.text}`);
    const correctedReceipt = await collectRollingWorkerSubmission(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',correctedRollingStoredAssignment.id,correctedRollingStoredAssignment.generation);
    assert.notEqual(correctedReceipt.revision,rejectedRevision);
    assert.equal(fs.readFileSync(path.join(rootPath,'fixture.ts'),'utf8'),'export const value: number = 2;\n');
    assert.equal(fs.readFileSync(path.join(rootPath,'upstream.txt'),'utf8'),'Preserve this independently published campaign increment.\n');
    assert.equal(execFileSync('git',['-C',rootPath,'rev-list','--count',`${correctedRollingWorkerContext.baseCommit}..${correctedReceipt.revision}`],{encoding:'utf8'}).trim(),'2');
    const originalRevision = fs.readFileSync(path.join(rootPath,'tmp/original-commit.txt'),'utf8').trim();
    assert.notEqual(originalRevision,correctedReceipt.revision);
    assert.equal(execFileSync('git',['-C',rootPath,'diff',initialRollingWorkerContext.baseCommit,originalRevision],{encoding:'utf8'}),
      execFileSync('git',['-C',rootPath,'diff',correctedRollingWorkerContext.baseCommit,correctedReceipt.revision],{encoding:'utf8'}));
    const semanticReview = fs.readFileSync(path.join(rootPath,'tmp/semantic-rebase.txt'),'utf8');assert.ok(semanticReview.length>0);
    const correctedOutput = execFileSync(process.execPath,['--test','--test-reporter=tap','fixture.test.ts'],{cwd:rootPath,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:undefined}});
    assert.match(correctedOutput,/# pass 2\n/u);assert.match(correctedOutput,/# fail 0\n/u);
    const correctedRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',correctedRollingStoredAssignment.id,
      correctedRollingStoredAssignment.generation,correctedReceipt.revision,reworkReviewerThread.thread.sessionId);
    const resumedReviewerThread = await rollingCodex.resumeThread(reworkReviewerThread.thread.id,rootPath);
    assert.equal(resumedReviewerThread.thread.sessionId,reworkReviewerThread.thread.sessionId);
    reworkReviewDispatchStarted = true;reworkReviewDispatch = null;
    reworkReviewDispatch = await dispatchRollingReview(rollingCampaignStore,rollingCodex,'worker-fixture',correctedRollingStoredReview.request.id,resumedReviewerThread);
    await observeRollingWorkerTurn(t,rollingCodex,resumedReviewerThread.thread.id,reworkReviewDispatch.turnId);
    const correctedResult = await collectRollingReview(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',correctedRollingStoredReview.request.id);
    t.diagnostic(`native corrected review: ${JSON.stringify(correctedResult)}`);
    assert.equal(correctedResult.outcome?.decision,'accepted');
    const retainedReviews = await new RollingCampaignStore(pool,projectId).reviews('worker-fixture',correctedRollingStoredAssignment.id);
    assert.equal(retainedReviews.length,2);assert.deepEqual(retainedReviews.map(review=>review.outcome?.decision),['rejected','accepted']);
    assert.ok(retainedReviews.every(review=>review.request.reviewerSessionId===correctedRollingStoredReview.request.reviewerSessionId));
    t.diagnostic(`native corrective semantic rebase: ${semanticReview}`);
    t.diagnostic(`native accepted review: ${JSON.stringify(correctedResult)}`);
    t.diagnostic(`native correction Arc worker=${rollingSessionAttachment.sessionId}; original reviewer=${reworkReviewerThread.thread.sessionId}; rejected=${rejectedRevision}; corrected=${correctedReceipt.revision}; fresh base=${correctedRollingWorkerContext.baseCommit}; two commits replayed; focused QA=2; both verdicts retained after store restart`);
    return;
  }
  if (operation !== 'attachment') {
    if (operation === 'code') {
      assert.equal(mode,'native','code/rebase Arc requires the installed native worker');
      const upstream = path.join(root,'upstream');
      execFileSync('git',['clone','-q',path.join(root,'origin.git'),upstream]);
      execFileSync('git',['-C',upstream,'checkout','-q','campaign/worker-fixture']);
      fs.writeFileSync(path.join(upstream,'upstream.txt'),'Preserve this independently published campaign increment.\n');
      execFileSync('git',['-C',upstream,'add','upstream.txt']);
      execFileSync('git',['-C',upstream,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','independent campaign increment']);
      execFileSync('git',['-C',upstream,'push','-q','origin','campaign/worker-fixture']);
      execFileSync('git',['-C',root,'fetch','-q','origin','campaign/worker-fixture:campaign/worker-fixture']);
      assert.equal(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),rollingGraph.head);
    }
    const rollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.equal(rollingWorkerContext.obligation.id,obligation.id);
    assert.deepEqual(rollingWorkerContext.lease,rollingAllocationResult.assignment.lease);
    assert.deepEqual(rollingWorkerContext.qa,rollingProjectConfigV1.qa);
    instructionDispatchStarted = true;
    instructionGeneration = generation;
    rollingWorkerDispatchAttached = await dispatchRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.equal(rollingWorkerDispatchAttached.threadId,rollingWorkerInitialization.rollingWorkerCreationV1.threadId);
    const rollingNativeTurn = await observeRollingWorkerTurn(t,rollingCodex,rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
    assert.equal(rollingNativeTurn.status,'completed');
    if (operation === 'code') t.diagnostic(`native worker final response: ${rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text}`);
    assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'status','--porcelain'],{encoding:'utf8'}),'');
    if (operation === 'code') {
      const rootPath = rollingAllocationResult.worktree.rootPath;
      const rollingSubmissionReceipt = await collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation);
      const revision = execFileSync('git',['-C',rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      const originalRevision = fs.readFileSync(path.join(rootPath,'tmp/original-commit.txt'),'utf8').trim();
      assert.match(originalRevision,/^[a-f0-9]{40}$/u);assert.notEqual(originalRevision,revision);
      assert.notEqual(rollingWorkerContext.baseCommit,rollingGraph.head);
      execFileSync('git',['-C',rootPath,'merge-base','--is-ancestor',rollingWorkerContext.baseCommit,revision]);
      assert.equal(fs.readFileSync(path.join(rootPath,'fixture.ts'),'utf8'),'export const value: number = 2;\n');
      assert.equal(fs.readFileSync(path.join(rootPath,'upstream.txt'),'utf8'),'Preserve this independently published campaign increment.\n');
      const output = execFileSync(process.execPath,['--test','--test-reporter=tap','fixture.test.ts'],{cwd:rootPath,encoding:'utf8',env:{...process.env,NODE_TEST_CONTEXT:undefined}});
      assert.ok(output.includes('# pass 2') && output.includes('# fail 0'),output);
      const semanticReview = fs.readFileSync(path.join(rootPath,'tmp/semantic-rebase.txt'),'utf8');
      assert.ok(semanticReview.length > 0);
      assert.equal(execFileSync('git',['-C',rootPath,'rev-parse',`${originalRevision}^`],{encoding:'utf8'}).trim(),rollingGraph.head);
      assert.equal(execFileSync('git',['-C',rootPath,'rev-parse',`${revision}^`],{encoding:'utf8'}).trim(),rollingWorkerContext.baseCommit);
      assert.equal(execFileSync('git',['-C',rootPath,'diff',`${originalRevision}^`,originalRevision],{encoding:'utf8'}),
        execFileSync('git',['-C',rootPath,'diff',`${revision}^`,revision],{encoding:'utf8'}));
      t.diagnostic(`native semantic rebase record: ${semanticReview}`);
      assert.equal(rollingSubmissionReceipt.state,'REVIEW');assert.equal(rollingSubmissionReceipt.revision,revision);
      assert.deepEqual(await collectRollingWorkerSubmission(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),rollingSubmissionReceipt);
      t.diagnostic(`native code submission session=${rollingSessionAttachment.sessionId}; turn=${rollingWorkerDispatchAttached.turnId}; original=${originalRevision}; fresh base=${rollingWorkerContext.baseCommit}; rebased=${revision}; focused QA=2; REVIEW persisted after restart`);
      return;
    }
    if (operation === 'inspection') {
      assert.equal(mode,'native','inspection handoff requires the actual native worker');
      const rollingSubmissionReceipt=await collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation);
      assert.equal(rollingSubmissionReceipt.state,'REVIEW');assert.equal(rollingSubmissionReceipt.revision,rollingWorkerContext.baseCommit);
      const retainedRollingStoredSubmissions=await new RollingCampaignStore(pool,projectId).submissions('worker-fixture',rollingAllocationResult.assignment.id);
      const retainedRollingStoredSubmission=retainedRollingStoredSubmissions.find(item=>item.submission.generation === generation);assert.ok(retainedRollingStoredSubmission);
      assert.equal(retainedRollingStoredSubmission.submission.revision,rollingWorkerContext.baseCommit);
      assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'diff',rollingWorkerContext.baseCommit,'HEAD'],{encoding:'utf8'}),'');
      assert.ok(fs.readFileSync(path.join(rollingAllocationResult.worktree.rootPath,'tmp/inspection-qa.log'),'utf8').length > 0);
      assert.deepEqual(await collectRollingWorkerSubmission(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),rollingSubmissionReceipt);
      t.diagnostic(`native no-edit submission session=${rollingSessionAttachment.sessionId}; turn=${rollingWorkerDispatchAttached.turnId}; revision=${rollingSubmissionReceipt.revision}; original candidate unchanged; REVIEW persisted after restart`);
      return;
    }
    assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),rollingGraph.head);
    const finalText = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
    assert.ok(finalText);
    if (mode === 'protocol') assert.equal(finalText,`Worker instructions digest: ${crypto.createHash('sha256').update(buildRollingWorkerInstructions(rollingWorkerContext)).digest('hex')}`);
    else {
      const rollingWorkerSubmissionV1=parseRollingWorkerSubmission(finalText);
      assert.equal(rollingWorkerSubmissionV1.revision,rollingGraph.head);
      assert.equal(rollingWorkerSubmissionV1.generation,generation);
      assert.equal(rollingWorkerSubmissionV1.sessionId,rollingSessionAttachment.sessionId);
      assert.ok(rollingWorkerSubmissionV1.proof.length > 0);
      const responsibilityReport=fs.readFileSync(path.join(rollingAllocationResult.worktree.rootPath,'tmp/responsibility.txt'),'utf8');
      for (const expected of [...obligation.requirementIds,'IMPL-FIXTURE','ACCEPT-FIXTURE','ARC-FIXTURE','STEP-FIXTURE','UNIT-FIXTURE',
        'INTEGRATION-FIXTURE','fixture unit','fixture integration',...rollingWorkerContext.lease.binding.execution.plannedPaths,generation]) assert.ok(responsibilityReport.includes(expected),responsibilityReport);
      const target = rollingWorkerContext.lease.binding.execution.target;assert.ok(target);
      assert.ok(responsibilityReport.includes(target.identity) && responsibilityReport.includes(target.profile),responsibilityReport);
      t.diagnostic(`worker instruction turn=${rollingWorkerDispatchAttached.turnId}; thread=${rollingWorkerDispatchAttached.threadId}; final=${finalText}`);
    }
    assert.deepEqual(await new RollingCampaignStore(pool,projectId).workerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation),rollingWorkerDispatchAttached);
    // Simulate a lost turn-attachment receipt: native activity is known to this
    // fixture but its durable dispatch remains STARTED and cannot be abandoned.
    await pool.query("UPDATE ponytail_index.rolling_worker_dispatch_v1 SET state='STARTED',turn_id=NULL WHERE project_id=$1 AND dispatch_id=$2",
      [projectId,rollingWorkerDispatchAttached.id]);
    await assert.rejects(rollingCampaignStore.retire('worker-fixture',rollingAllocationResult.assignment.id,generation,true),/worker dispatch outcome must be reconciled/);
    await rollingCampaignStore.attachWorkerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation,
      rollingWorkerDispatchAttached.id,rollingWorkerDispatchAttached.turnId);

    await assert.rejects(dispatchRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),/already claimed/);
    await assert.rejects(rollingCampaignStore.claimWorkerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation,'foreign instructions'),/coordinator scope/);
    await assert.rejects(rollingCampaignStore.attachWorkerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation,rollingWorkerDispatchAttached.id,'foreign-turn'),/immutable/);
    const foreignRollingCampaignStore = new RollingCampaignStore(pool,crypto.randomUUID());
    assert.equal(await foreignRollingCampaignStore.workerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation),null);
  }
  if (operation === 'collection') {
    assert.equal(mode,'protocol','controlled response mutation is component evidence only');
    assert.ok(rollingWorkerDispatchAttached);
    const rollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,generation);
    const rootPath = rollingAllocationResult.worktree.rootPath;
    if (integrationRepair) {
      fs.writeFileSync(path.join(rootPath,'fixture.ts'),'export const value: number = 2;\n');
      fs.writeFileSync(path.join(rootPath,'fixture.test.ts'),fs.readFileSync(path.join(rootPath,'fixture.test.ts'),'utf8').replace('assert.equal(value, 1)','assert.equal(value, 2)'));
      execFileSync('git',['-C',rootPath,'add','fixture.ts','fixture.test.ts']);
      execFileSync('git',['-C',rootPath,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','Reviewed fixture implementation']);
    }
    const startedAt = new Date().toISOString();
    const processEnv:NodeJS.ProcessEnv = {...process.env,NODE_TEST_CONTEXT:undefined};
    const output = execFileSync(process.execPath,['--test','--test-reporter=tap','fixture.test.ts'],{cwd:rootPath,encoding:'utf8',env:processEnv});
    for (const expected of ['# pass 2','# fail 0','# skipped 0','# cancelled 0']) assert.ok(output.includes(expected),output);
    const completedAt = new Date().toISOString();
    fs.mkdirSync(path.join(rootPath,'tmp'),{recursive:true});
    fs.writeFileSync(path.join(rootPath,'tmp/focused.txt'),output);
    const revision = execFileSync('git',['-C',rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const target = rollingWorkerContext.lease.binding.execution.target;assert.ok(target);
    const obligationEvidence:ObligationEvidence = {command:integrationRepair ? `${process.execPath} --test --test-reporter=tap fixture.test.ts` : `${process.execPath} --test fixture.test.ts`,selection:rollingWorkerContext.lease.binding.execution.selection,
      target:{...target,verification:'tmp/focused.txt'},revision,dirty:false,startedAt,completedAt,outcome:'pass',skips:0,failures:0,finalization:'pass',
      inputs:['fixture.ts','fixture.test.ts','tmp/focused.txt'].map(relative => ({path:relative,digest:inputDigest(rootPath,relative)})),outputPath:'tmp/focused.txt'};
    const rollingWorkerSubmissionV1:RollingWorkerSubmissionV1 = {schemaVersion:1,campaignId:'worker-fixture',assignmentId:rollingAllocationResult.assignment.id,
      generation,sessionId:rollingSessionAttachment.sessionId,graphDigest:rollingWorkerContext.lease.graphDigest,revision,baseCommit:rollingWorkerContext.baseCommit,
      stopped:true,proof:[{operation:'test',evidence:obligationEvidence}]};
    const text = JSON.stringify(rollingWorkerSubmissionV1);
    await rollingCodex.request('fixture-turn',{turnId:rollingWorkerDispatchAttached.turnId,status:'completed',text});
    await rollingCodex.request('fixture-activity',{active:true});
    await assert.rejects(collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),/not known idle/);
    assert.equal((await rollingCampaignStore.status('worker-fixture')).assignments[0]?.state,'WORKING');
    await rollingCodex.request('fixture-activity',{active:false});
    for (const status of ['failed','interrupted']) {
      await rollingCodex.request('fixture-turn',{turnId:rollingWorkerDispatchAttached.turnId,status,text});
      await assert.rejects(collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),/did not complete/);
    }
    await rollingCodex.request('fixture-turn',{turnId:rollingWorkerDispatchAttached.turnId,status:'completed',text:'not a JSON submission'});
    await assert.rejects(collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation));
    await rollingCodex.request('fixture-turn',{turnId:rollingWorkerDispatchAttached.turnId,status:'completed',text:JSON.stringify({...rollingWorkerSubmissionV1,sessionId:'foreign'})});
    await assert.rejects(collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),/attached session/);
    await rollingCodex.request('fixture-turn',{turnId:rollingWorkerDispatchAttached.turnId,status:'completed',text});
    await assert.rejects(suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,[]),/obligation blockers/);
    const rollingSubmissionReceipt = await collectRollingWorkerSubmission(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.equal(rollingSubmissionReceipt.revision,revision);assert.equal(rollingSubmissionReceipt.state,'REVIEW');
    assert.deepEqual(await collectRollingWorkerSubmission(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation),rollingSubmissionReceipt);
    const rollingStoredSubmission = (await rollingCampaignStore.submissions('worker-fixture',rollingAllocationResult.assignment.id))[0];assert.ok(rollingStoredSubmission);
    assert.deepEqual(rollingStoredSubmission.submission,rollingWorkerSubmissionV1);
    assert.equal((await rollingCampaignStore.status('worker-fixture')).assignments[0]?.activityStopped,true);
    assert.equal(execFileSync('git',['-C',rootPath,'status','--porcelain'],{encoding:'utf8'}),'');
    t.diagnostic(`component submission revision=${revision}; exact original turn=${rollingWorkerDispatchAttached.turnId}; session=${rollingSessionAttachment.sessionId}; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified`);
    if (integrationRepair) {
      const acceptedRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',rollingAllocationResult.assignment.id,generation,revision,'original-reviewer');
      const acceptedRollingReviewOutcomeV1: RollingReviewOutcomeV1 = {schemaVersion:1,reviewId:acceptedRollingStoredReview.request.id,revision,
        reviewerSessionId:'original-reviewer',completedAt:new Date().toISOString(),decision:'accepted',findings:[]};
      await rollingCampaignStore.recordReviewOutcome('worker-fixture',acceptedRollingStoredReview.request.id,'original-reviewer',acceptedRollingReviewOutcomeV1);
      await rollingCampaignStore.claimIncrement('worker-fixture',acceptedRollingStoredReview.request.id);
      const upstreamRoot = path.join(root,'upstream');
      execFileSync('git',['clone','-q','--branch','campaign/worker-fixture',path.join(root,'origin.git'),upstreamRoot]);
      fs.writeFileSync(path.join(upstreamRoot,'fixture.ts'),'export const value: number = 1; // upstream context\n');
      execFileSync('git',['-C',upstreamRoot,'add','fixture.ts']);
      execFileSync('git',['-C',upstreamRoot,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','Independent upstream context']);
      const upstreamRevision = execFileSync('git',['-C',upstreamRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      execFileSync('git',['-C',upstreamRoot,'push','-q','origin','HEAD:refs/heads/campaign/worker-fixture']);
      const conflictIntent = await rollingCampaignStore.beginIncrementRebase('worker-fixture',acceptedRollingStoredReview.request.id);
      const conflictResult = rebasePreparedRollingIncrement(rootPath,conflictIntent);assert.ok(conflictResult.state === 'TEXTUAL_CONFLICT');
      await rollingCampaignStore.recordIncrementRebase('worker-fixture',acceptedRollingStoredReview.request.id,conflictResult);
      const rollingIncrementRepair = await rollingCampaignStore.requestIncrementRepair('worker-fixture',acceptedRollingStoredReview.request.id,'Inspect upstream context and preserve approved fixture value');
      await suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,[]);
      const stop = await rollingCampaignStore.workerStop('worker-fixture',rollingAllocationResult.assignment.id,generation);
      assert.ok(stop?.checkpoint.gitStatus.includes('fixture.ts'));
      execFileSync('git',['-C',root,'update-ref','refs/heads/campaign/worker-fixture',upstreamRevision,rollingWorkerContext.baseCommit]);
      prepareCoordinatorIncrementCheckout(root,'campaign/worker-fixture');
      const repairRollingGraph = collectRollingGraph(root,'obligations.json','bindings.json','history.json');
      await rollingCampaignStore.reconcileGraph('worker-fixture',rollingGraph.digest,repairRollingGraph.digest);
      const repairAllocation = await rollingCampaignStore.allocate('worker-fixture',repairRollingGraph.digest);
      assert.ok(repairAllocation.assignment && repairAllocation.actionId);
      assert.equal(repairAllocation.assignment.id,rollingAllocationResult.assignment.id);
      assert.equal(repairAllocation.assignment.sessionId,rollingSessionAttachment.sessionId);
      assert.equal(repairAllocation.assignment.worktreeNumber,rollingAllocationResult.assignment.worktreeNumber);
      await resumeRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',repairAllocation.actionId,repairAllocation.assignment.generation);
      const repairRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',repairAllocation.assignment.id,repairAllocation.assignment.generation);
      assert.deepEqual(repairRollingWorkerContext.incrementRepair,rollingIncrementRepair);
      assert.equal(repairRollingWorkerContext.rejectedReview,null);
      assert.equal(repairRollingWorkerContext.baseCommit,upstreamRevision);
      assert.ok(buildRollingWorkerInstructions(repairRollingWorkerContext).includes(JSON.stringify(repairRollingWorkerContext.incrementRepair)));
      // Controlled component worker: inspect the only replayed commit explicitly.
      // Native semantic-rebase proof remains owned by the native worker Arc.
      execFileSync('git',['-C',rootPath,'rebase','--abort']);
      const replay = spawnSync('git',['-C',rootPath,'rebase','-i','--onto',upstreamRevision,rollingWorkerContext.baseCommit],
        {encoding:'utf8',env:{...process.env,GIT_SEQUENCE_EDITOR:'true',GIT_EDITOR:'true'}});
      assert.equal(replay.status,1);
      const inspectedCommit = execFileSync('git',['-C',rootPath,'show','REBASE_HEAD','--','fixture.ts','fixture.test.ts'],{encoding:'utf8'});
      assert.ok(inspectedCommit.includes('value: number = 2'));
      fs.writeFileSync(path.join(rootPath,'fixture.ts'),'export const value: number = 2; // upstream context\n');
      execFileSync('git',['-C',rootPath,'add','fixture.ts']);
      execFileSync('git',['-C',rootPath,'rebase','--continue'],{env:{...process.env,GIT_EDITOR:'true'}});
      const repairedRevision = execFileSync('git',['-C',rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      const repairStartedAt = new Date().toISOString();
      const repairOutput = execFileSync(process.execPath,['--test','--test-reporter=tap','fixture.test.ts'],{cwd:rootPath,encoding:'utf8',env:processEnv});
      const repairCompletedAt = new Date().toISOString();
      assert.match(repairOutput,/# pass 2\n/u);assert.match(repairOutput,/# fail 0\n/u);
      fs.writeFileSync(path.join(rootPath,'tmp/focused.txt'),repairOutput);
      const repairedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = {...rollingWorkerSubmissionV1,generation:repairAllocation.assignment.generation,
        graphDigest:repairRollingWorkerContext.lease.graphDigest,revision:repairedRevision,baseCommit:upstreamRevision,
        proof:[{operation:'test',evidence:{...obligationEvidence,revision:repairedRevision,startedAt:repairStartedAt,completedAt:repairCompletedAt,
          inputs:isObligationGitInputs(obligationEvidence.inputs) ? obligationEvidence.inputs : obligationEvidence.inputs.map(input=>({path:input.path,digest:inputDigest(rootPath,input.path)}))}}]};
      await rollingCampaignStore.submit('worker-fixture',repairAllocation.assignment.id,repairAllocation.assignment.generation,repairedRollingWorkerSubmissionV1);
      await assert.rejects(rollingCampaignStore.requestReview('worker-fixture',repairAllocation.assignment.id,repairAllocation.assignment.generation,repairedRevision,'different-reviewer'),/original reviewer/);
      const repairedReview = await rollingCampaignStore.requestReview('worker-fixture',repairAllocation.assignment.id,repairAllocation.assignment.generation,repairedRevision,'original-reviewer');
      assert.notEqual(repairedReview.request.id,acceptedRollingStoredReview.request.id);
      await rollingCampaignStore.recordReviewOutcome('worker-fixture',repairedReview.request.id,'original-reviewer',{...acceptedRollingReviewOutcomeV1,
        reviewId:repairedReview.request.id,revision:repairedRevision,completedAt:new Date().toISOString()});
      const repairedClaim = await rollingCampaignStore.claimIncrement('worker-fixture',repairedReview.request.id);
      const repairedIntent = await rollingCampaignStore.beginIncrementRebase('worker-fixture',repairedReview.request.id);
      await rollingCampaignStore.recordIncrementRebase('worker-fixture',repairedReview.request.id,rebasePreparedRollingIncrement(rootPath,repairedIntent));
      await rollingCampaignStore.recordIncrementProof('worker-fixture',repairedReview.request.id,repairedRollingWorkerSubmissionV1);
      prepareCoordinatorIncrementCheckout(root,'campaign/worker-fixture');
      assert.equal((await rollingCampaignStore.publishIncrement('worker-fixture',repairedReview.request.id)).result.state,'PUBLISHED');
      const retainedReviews = await new RollingCampaignStore(pool,projectId).reviews('worker-fixture',repairAllocation.assignment.id);
      assert.equal(retainedReviews.length,2);
      assert.ok(retainedReviews.every(review=>review.outcome?.decision === 'accepted' && review.request.reviewerSessionId === 'original-reviewer'));
      assert.equal((await pool.query<Record<string,unknown>>('SELECT count(*)::integer AS count FROM ponytail_index.rolling_increment_delivery_v1 WHERE project_id=$1 AND increment_id=$2',[projectId,repairedClaim.id])).rows[0]?.count,1);
      if (retirement) {
        const assignmentId = repairAllocation.assignment.id, retirementGeneration = repairAllocation.assignment.generation;
        await assert.rejects(rollingCampaignStore.retire('worker-fixture',assignmentId,retirementGeneration,true),/observed native retirement/);
        const excludePath = execFileSync('git',['-C',rootPath,'rev-parse','--git-path','info/exclude'],{encoding:'utf8'}).trim();
        fs.mkdirSync(path.dirname(path.resolve(rootPath,excludePath)),{recursive:true});
        fs.appendFileSync(path.resolve(rootPath,excludePath),'\n/owned-resource.txt\n/cleanup-refuse.txt\n/retained-cache.txt\n');
        fs.writeFileSync(path.join(rootPath,'owned-resource.txt'),generation);
        fs.writeFileSync(path.join(rootPath,'retained-cache.txt'),'reuse build cache');
        fs.writeFileSync(path.join(rootPath,'cleanup-refuse.txt'),'retain ownership');
        await rollingCodex.request('fixture-archive-refuse',{refused:true});
        await assert.rejects(retireRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',assignmentId,retirementGeneration),/archival refused/);
        assert.equal((await rollingCampaignStore.workerRetirement('worker-fixture',assignmentId,retirementGeneration))?.state,'ARCHIVING');
        assert.ok(fs.existsSync(path.join(rootPath,'session_id.txt')));
        assert.ok(fs.existsSync(path.join(rootPath,'owned-resource.txt')));
        await rollingCodex.request('fixture-archive-refuse',{refused:false});
        await rollingCodex.request('fixture-archive-lost-ack',{});
        await assert.rejects(retireRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',assignmentId,retirementGeneration),/lost archive acknowledgement/);
        assert.equal((await rollingCampaignStore.workerRetirement('worker-fixture',assignmentId,retirementGeneration))?.state,'ARCHIVING');
        assert.ok(fs.existsSync(path.join(rootPath,'owned-resource.txt')));
        await assert.rejects(retireRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',assignmentId,retirementGeneration),/cleanup failed/);
        const failedRetirement = await rollingCampaignStore.workerRetirement('worker-fixture',assignmentId,retirementGeneration);
        assert.equal(failedRetirement?.state,'ARCHIVED');assert.ok(failedRetirement?.turnId);
        assert.equal(failedRetirement.rollingWorkerRetirementV1.resourceGeneration,generation);
        assert.notEqual(failedRetirement.rollingWorkerRetirementV1.resourceGeneration,retirementGeneration);
        assert.ok(fs.existsSync(path.join(rootPath,'session_id.txt')));
        const retirementGraph = collectRollingGraph(root,'obligations.json','bindings.json','history.json');
        const previousDigest = (await rollingCampaignStore.status('worker-fixture')).graphDigest;
        await rollingCampaignStore.reconcileGraph('worker-fixture',previousDigest,retirementGraph.digest);
        await assert.rejects(rollingCampaignStore.allocate('worker-fixture',retirementGraph.digest,{id:assignmentId,generation:retirementGeneration}),/completed native retirement/);
        await assert.rejects(rollingCampaignStore.workerContext('worker-fixture',assignmentId,retirementGeneration),/active attached session/);
        fs.unlinkSync(path.join(rootPath,'cleanup-refuse.txt'));
        const restartedRetirementStore = new RollingCampaignStore(pool,projectId);
        const completedRetirement = await retireRollingWorker(restartedRetirementStore,rollingCodex,'worker-fixture',assignmentId,retirementGeneration);
        assert.equal(completedRetirement.state,'CLEANED');assert.equal(completedRetirement.turnId,failedRetirement.turnId);
        assert.equal(stringify(await rollingCodex.request('fixture-archive-count',{})),'{"count":1}');
        assert.equal(fs.existsSync(path.join(rootPath,'session_id.txt')),false);
        assert.equal(fs.existsSync(path.join(rootPath,'owned-resource.txt')),false);
        assert.equal(fs.readFileSync(path.join(rootPath,'retained-cache.txt'),'utf8'),'reuse build cache');
        assert.equal(execFileSync('git',['-C',rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),repairedRevision);
        await restartedRetirementStore.allocate('worker-fixture',retirementGraph.digest,{id:assignmentId,generation:retirementGeneration});
        assert.equal((await restartedRetirementStore.status('worker-fixture')).assignments.find(item=>item.id === assignmentId)?.state,'RELEASED');
        assert.equal((await retireRollingWorker(restartedRetirementStore,rollingCodex,'worker-fixture',assignmentId,retirementGeneration)).state,'CLEANED');
      }
      return;
    }
    // Traceability: verifies REQ-ROLLING-REVIEW
    // This controlled Arc proves ownership/reviewer continuity, not native code correction.
    const rejectedRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',rollingAllocationResult.assignment.id,generation,revision,'original-reviewer');
    const rejectedRollingReviewOutcomeV1: RollingReviewOutcomeV1 = {schemaVersion:1,reviewId:rejectedRollingStoredReview.request.id,
      revision,reviewerSessionId:'original-reviewer',completedAt:new Date().toISOString(),decision:'rejected',findings:['fixture.ts:1: Required correction.']};
    await rollingCampaignStore.recordReviewOutcome('worker-fixture',rejectedRollingStoredReview.request.id,'original-reviewer',rejectedRollingReviewOutcomeV1);
    await suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,[]);
    await suspendRollingWorker(new RollingCampaignStore(pool,projectId),rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,[]);
    const reworkRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',rollingGraph.digest);
    assert.ok(reworkRollingAllocationResult.assignment && reworkRollingAllocationResult.actionId);
    assert.equal(reworkRollingAllocationResult.assignment.id,rollingAllocationResult.assignment.id);
    assert.equal(reworkRollingAllocationResult.assignment.worktreeNumber,rollingAllocationResult.assignment.worktreeNumber);
    assert.equal(reworkRollingAllocationResult.assignment.sessionId,rollingSessionAttachment.sessionId);
    assert.notEqual(reworkRollingAllocationResult.assignment.generation,generation);
    await resumeRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',reworkRollingAllocationResult.actionId,reworkRollingAllocationResult.assignment.generation);
    const correctedRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',reworkRollingAllocationResult.assignment.id,reworkRollingAllocationResult.assignment.generation);
    assert.deepEqual(correctedRollingWorkerContext.rejectedReview,rejectedRollingReviewOutcomeV1);
    assert.ok(buildRollingWorkerInstructions(correctedRollingWorkerContext).includes(JSON.stringify(rejectedRollingReviewOutcomeV1)));
    const correctedRollingWorkerSubmissionV1: RollingWorkerSubmissionV1 = {...rollingWorkerSubmissionV1,
      generation:correctedRollingWorkerContext.lease.generation,graphDigest:correctedRollingWorkerContext.lease.graphDigest};
    await rollingCampaignStore.submit('worker-fixture',reworkRollingAllocationResult.assignment.id,reworkRollingAllocationResult.assignment.generation,correctedRollingWorkerSubmissionV1);
    await assert.rejects(rollingCampaignStore.requestReview('worker-fixture',reworkRollingAllocationResult.assignment.id,
      reworkRollingAllocationResult.assignment.generation,revision,'different-reviewer'),/original reviewer/);
    const correctedRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',reworkRollingAllocationResult.assignment.id,
      reworkRollingAllocationResult.assignment.generation,revision,'original-reviewer');
    assert.equal(correctedRollingStoredReview.request.reviewerSessionId,rejectedRollingStoredReview.request.reviewerSessionId);
    assert.notEqual(correctedRollingStoredReview.request.id,rejectedRollingStoredReview.request.id);
    assert.deepEqual((await new RollingCampaignStore(pool,projectId).reviews('worker-fixture',rollingAllocationResult.assignment.id))[0]?.outcome,rejectedRollingReviewOutcomeV1);
    const correctedRejectedRollingReviewOutcomeV1: RollingReviewOutcomeV1 = { ...rejectedRollingReviewOutcomeV1,
      reviewId:correctedRollingStoredReview.request.id,completedAt:new Date().toISOString(),findings:['Controlled second rejection before reviewer loss.'] };
    await rollingCampaignStore.recordReviewOutcome('worker-fixture',correctedRollingStoredReview.request.id,'original-reviewer',correctedRejectedRollingReviewOutcomeV1);
    await suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',reworkRollingAllocationResult.assignment.id,reworkRollingAllocationResult.assignment.generation,[]);
    const recoveryRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',rollingGraph.digest);
    assert.ok(recoveryRollingAllocationResult.assignment && recoveryRollingAllocationResult.actionId);
    await resumeRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',recoveryRollingAllocationResult.actionId,recoveryRollingAllocationResult.assignment.generation);
    const recoveryRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',recoveryRollingAllocationResult.assignment.id,recoveryRollingAllocationResult.assignment.generation);
    await rollingCampaignStore.submit('worker-fixture',recoveryRollingAllocationResult.assignment.id,recoveryRollingAllocationResult.assignment.generation,
      {...rollingWorkerSubmissionV1,generation:recoveryRollingWorkerContext.lease.generation,graphDigest:recoveryRollingWorkerContext.lease.graphDigest});
    const recoveryRollingStoredReview = await rollingCampaignStore.requestReview('worker-fixture',recoveryRollingAllocationResult.assignment.id,
      recoveryRollingAllocationResult.assignment.generation,revision,'replacement-reviewer',
      {reviewId:correctedRollingStoredReview.request.id,lossReference:'Controlled reviewer loss between rejection and corrected submission'});
    assert.equal(recoveryRollingStoredReview.request.reviewerSessionId,'replacement-reviewer');
    assert.equal(recoveryRollingStoredReview.request.generation,recoveryRollingAllocationResult.assignment.generation);
    assert.equal(recoveryRollingStoredReview.outcome,null);
    const recoveredReviews = await new RollingCampaignStore(pool,projectId).reviews('worker-fixture',rollingAllocationResult.assignment.id);
    assert.deepEqual(recoveredReviews.find(review => review.request.id === rejectedRollingStoredReview.request.id)?.outcome,rejectedRollingReviewOutcomeV1);
    assert.deepEqual(recoveredReviews.find(review => review.request.id === correctedRollingStoredReview.request.id)?.outcome,correctedRejectedRollingReviewOutcomeV1);
    assert.equal((await rollingCampaignStore.reviewReplacement('worker-fixture',correctedRollingStoredReview.request.id))?.replacementReviewId,recoveryRollingStoredReview.request.id);
  }
  if ((operation === 'suspension' || operation === 'resumption')) {
    assert.ok(rollingWorkerDispatchAttached);
    const unfinished = 'export const unfinished: number = 7;\n';
    fs.writeFileSync(path.join(rollingAllocationResult.worktree.rootPath,'unfinished.ts'),unfinished);
    // A newly discovered dependency invalidates execution scope. Stopping old
    // ownership still uses its recorded native identity and preserved checkout.
    const changedObligationBindingRevisionV1:ObligationBindingRevisionV1 = {...obligationBindingRevisionV1,id:'BIND-3',predecessorId:'BIND-1',
      dependsOn:['OBL-1'],reason:'Newly discovered worker blocker'};
    const changedObligationBindingHistoryV1:ObligationBindingHistoryV1 = {...obligationBindingHistoryV1,
      revisions:[...obligationBindingHistoryV1.revisions,changedObligationBindingRevisionV1]};
    fs.writeFileSync(path.join(root,'history.json'),JSON.stringify(changedObligationBindingHistoryV1));
    await assert.rejects(rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,generation),/stale coordinator graph/);
    const gitFile = path.join(rollingAllocationResult.worktree.rootPath,'.git');
    fs.renameSync(gitFile,`${gitFile}.saved`);
    try {
      await assert.rejects(suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,['OBL-1']),/retained checkout identity differs/);
      assert.equal((await rollingCampaignStore.status('worker-fixture')).assignments[0]?.state,'WORKING');
    } finally {fs.renameSync(`${gitFile}.saved`,gitFile);}
    const rollingAssignmentTransition = await suspendRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation,['OBL-1']);
    assert.equal(rollingAssignmentTransition.state,'INACTIVE');
    const rollingWorkerStopV1 = await rollingCampaignStore.workerStop('worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.ok(rollingWorkerStopV1);
    assert.equal(rollingWorkerStopV1.nativeStatus,'idle');
    assert.equal(rollingWorkerStopV1.threadId,rollingWorkerInitialization.rollingWorkerCreationV1.threadId);
    assert.equal(rollingWorkerStopV1.turn?.id,rollingWorkerDispatchAttached.turnId);
    assert.ok(rollingWorkerStopV1.checkpoint.gitStatus.includes('unfinished.ts'));
    assert.equal(fs.readFileSync(path.join(rollingAllocationResult.worktree.rootPath,'unfinished.ts'),'utf8'),unfinished);
    assert.equal(fs.readFileSync(path.join(rollingAllocationResult.worktree.rootPath,'session_id.txt'),'utf8').trim(),rollingSessionAttachment.sessionId);
    const changedRollingGraph = collectRollingGraph(root,'obligations.json','bindings.json','history.json');
    await rollingCampaignStore.reconcileGraph('worker-fixture',rollingGraph.digest,changedRollingGraph.digest);
    if (operation === 'suspension') {
    const nextRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',changedRollingGraph.digest);
    assert.equal(nextRollingAllocationResult.assignment?.obligationId,nextObligation.id);
    assert.equal(nextRollingAllocationResult.worktree?.number,102);
    }
    const stoppedRollingStoredAssignment = (await rollingCampaignStore.status('worker-fixture')).assignments.find(item => item.id === rollingAllocationResult.assignment?.id);
    assert.equal(stoppedRollingStoredAssignment?.state,'INACTIVE');
    assert.equal(stoppedRollingStoredAssignment?.activityStopped,true);
    assert.equal(stoppedRollingStoredAssignment?.sessionId,rollingSessionAttachment.sessionId);
    assert.equal(stoppedRollingStoredAssignment?.worktreeNumber,101);
    assert.deepEqual(stoppedRollingStoredAssignment?.blockers,['OBL-1']);
    assert.deepEqual(await new RollingCampaignStore(pool,projectId).workerStop('worker-fixture',rollingAllocationResult.assignment.id,generation),rollingWorkerStopV1);
    await assert.rejects(rollingCampaignStore.suspendObservedWorker('worker-fixture',rollingAllocationResult.assignment.id,generation,
      {...rollingWorkerStopV1,sessionId:'foreign'},['OBL-1']),/attached native worker/);
    t.diagnostic(`worker suspension thread=${rollingWorkerStopV1.threadId}; session=${rollingWorkerStopV1.sessionId}; native=idle; retained checkout=101 with dirty checkpoint${operation === 'suspension' ? `; next obligation=${nextObligation.id}; allocated checkout=102` : '; retained for reactivation'}`);
  }
  if (operation === 'resumption') {
    const obligationCertificate:ObligationCertificate = {id:'CERT-fixture',obligationIds:['OBL-1'],
      inputs:[{path:'pm/requirements/rolling-campaigns.md',digest:inputDigest(root,'pm/requirements/rolling-campaigns.md')}],
      artifacts:['pm/requirements/rolling-campaigns.md'],assessor:'coordinator',authority:obligationBaseline.authority.references,
      adequate:true,reason:'Isolated fixture prerequisite assessment',disposition:null,evidence:[],inventoryIds:[]};
    const initialObligationCheckpoint:ObligationCheckpoint = {id:'CP-fixture-initial',predecessorId:null,baselineId:obligationBaseline.id,kind:'initial',
      selectedIds:[],registeredIds:obligationBaseline.obligationIds,certificateIds:[],invalidatedIds:[],before:[1,1,1,1,1,1],after:[1,1,1,1,1,1],
      preparation:null,reason:'Fixture initial observation',assessor:'coordinator'};
    const productiveObligationCheckpoint:ObligationCheckpoint = {id:'CP-fixture-discharge',predecessorId:initialObligationCheckpoint.id,baselineId:obligationBaseline.id,kind:'productive',
      selectedIds:['OBL-1'],registeredIds:[],certificateIds:[obligationCertificate.id],invalidatedIds:[],before:[1,1,1,1,1,1],after:[0,1,1,1,1,1],
      preparation:null,reason:'Fixture prerequisite discharged',assessor:'coordinator'};
    const unblockedObligationDocumentV1:ObligationDocumentV1 = {...obligationDocumentV1,certificates:[obligationCertificate],checkpoints:[initialObligationCheckpoint,productiveObligationCheckpoint]};
    const previousDigest = (await rollingCampaignStore.status('worker-fixture')).graphDigest;
    fs.writeFileSync(path.join(root,'obligations.json'),JSON.stringify(unblockedObligationDocumentV1));
    execFileSync('git',['-C',root,'add','obligations.json','history.json']);
    execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','resolve fixture prerequisite']);
    const refreshedBase = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    execFileSync('git',['-C',root,'branch','-f','campaign/worker-fixture',refreshedBase]);
    assert.notEqual(refreshedBase,rollingGraph.head);
    const unblockedRollingGraph = collectRollingGraph(root,'obligations.json','bindings.json','history.json');
    assert.ok(unblockedRollingGraph.projection.satisfiedIds.includes('OBL-1'));
    await rollingCampaignStore.reconcileGraph('worker-fixture',previousDigest,unblockedRollingGraph.digest);
    await rollingCampaignStore.rebindLease('worker-fixture',rollingAllocationResult.assignment.id,generation,unblockedRollingGraph.digest);
    const resumedRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',unblockedRollingGraph.digest);
    assert.ok(resumedRollingAllocationResult.assignment && resumedRollingAllocationResult.actionId && resumedRollingAllocationResult.worktree);
    assert.equal(resumedRollingAllocationResult.assignment.id,rollingAllocationResult.assignment.id);
    assert.equal(resumedRollingAllocationResult.worktree.number,101);
    assert.equal(resumedRollingAllocationResult.assignment.sessionId,rollingSessionAttachment.sessionId);
    assert.notEqual(resumedRollingAllocationResult.assignment.generation,generation);
    assert.equal((await rollingCampaignStore.nextActions('worker-fixture'))[0]?.kind,'RESUME_WORKER');
    const resumedGeneration = resumedRollingAllocationResult.assignment.generation;
    await assert.rejects(rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,resumedGeneration),/active attached session/);
    await assert.rejects(rollingCampaignStore.retire('worker-fixture',rollingAllocationResult.assignment.id,generation,true),/lease generation/);
    const resumedRollingSessionAttachment = await resumeRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration);
    assert.equal(resumedRollingSessionAttachment.sessionId,rollingSessionAttachment.sessionId);
    await assert.rejects(rollingCampaignStore.claimWorkerResumption('worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration),/already claimed/);
    const receiptRow = (await pool.query<Record<string,unknown>>('SELECT result_text FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND action_id=$2',
      [projectId,resumedRollingAllocationResult.actionId])).rows[0];
    assert.equal(typeof receiptRow?.result_text,'string');assert.ok(receiptRow && typeof receiptRow.result_text === 'string');
    const rollingWorkerResumptionV1 = parseRollingWorkerResumption(receiptRow.result_text);
    assert.equal(rollingWorkerResumptionV1.baseCommit,refreshedBase);
    assert.deepEqual(rollingWorkerResumptionV1.rollingWorkerCreationV1,rollingWorkerInitialization.rollingWorkerCreationV1);
    assert.deepEqual(await rollingCampaignStore.completeWorkerResumption('worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration,rollingWorkerResumptionV1),resumedRollingSessionAttachment);
    await assert.rejects(rollingCampaignStore.completeWorkerResumption('worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration,
      {...rollingWorkerResumptionV1,rollingWorkerCreationV1:{...rollingWorkerResumptionV1.rollingWorkerCreationV1,sessionId:'foreign'}}),/original native worker/);
    await assert.rejects(rollingCampaignStore.completeWorkerResumption('worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration,
      {...rollingWorkerResumptionV1,baseCommit:rollingGraph.head}),/immutable/);
    await pool.query("UPDATE ponytail_index.rolling_action_v1 SET state='STARTED',result_text=NULL WHERE project_id=$1 AND action_id=$2",[projectId,resumedRollingAllocationResult.actionId]);
    await assert.rejects(rollingCampaignStore.retire('worker-fixture',rollingAllocationResult.assignment.id,resumedGeneration,true),/external action outcome/);
    await rollingCampaignStore.completeWorkerResumption('worker-fixture',resumedRollingAllocationResult.actionId,resumedGeneration,rollingWorkerResumptionV1);
    const resumedRollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,resumedGeneration);
    assert.equal(resumedRollingWorkerContext.rollingWorkerCreationV1.threadId,rollingWorkerInitialization.rollingWorkerCreationV1.threadId);
    assert.equal(resumedRollingWorkerContext.baseCommit,refreshedBase);
    assert.deepEqual(resumedRollingWorkerContext.lease.binding.dependsOn,['OBL-1']);
    assert.equal((await rollingCampaignStore.allocate('worker-fixture',unblockedRollingGraph.digest)).reason,'capacity_reached');
    assert.equal(fs.readFileSync(path.join(resumedRollingAllocationResult.worktree.rootPath,'unfinished.ts'),'utf8'),'export const unfinished: number = 7;\n');
    instructionGeneration = resumedGeneration;
    rollingWorkerDispatchAttached = await dispatchRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,resumedGeneration);
    const resumedRollingNativeTurn = await observeRollingWorkerTurn(t,rollingCodex,rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
    assert.equal(resumedRollingNativeTurn.status,'completed');
    if (mode === 'native') {
      const resumedFinalText=resumedRollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
      assert.ok(resumedFinalText);
      // This Arc deliberately retains out-of-lease unfinished work and the old
      // HEAD. Resumption refreshes responsibility; it cannot certify clean QA.
      assert.ok(resumedFinalText.includes(refreshedBase),resumedFinalText);
      assert.ok(resumedFinalText.includes('unfinished.ts'),resumedFinalText);
      assert.throws(()=>parseRollingWorkerSubmission(resumedFinalText));
      assert.equal(execFileSync('git',['-C',resumedRollingAllocationResult.worktree.rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),rollingGraph.head);
    }
    assert.equal(rollingWorkerDispatchAttached.threadId,rollingWorkerInitialization.rollingWorkerCreationV1.threadId);
    assert.equal(fs.readFileSync(path.join(resumedRollingAllocationResult.worktree.rootPath,'unfinished.ts'),'utf8'),'export const unfinished: number = 7;\n');
    t.diagnostic(`worker resumption thread=${rollingWorkerDispatchAttached.threadId}; session=${resumedRollingSessionAttachment.sessionId}; checkout=101; base=${refreshedBase}; generation=${resumedGeneration}; fresh instructions completed before new allocation`);

  }
  if (mode === 'native') {
    const {rollingWorkerCreationV1,rollingTurnStarted} = rollingWorkerInitialization;
    await rollingCodex.close();
    rollingCodex = await connectRollingWorkerCodex(t);
    rollingCodex.on('serverRequest',message => rollingCodex.respondToServer(message.id,{decision:'decline'}));
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
    assert.equal(rollingNativeThread.thread.sessionId,rollingSessionAttachment.sessionId);
    assert.equal(rollingNativeThread.cwd,rollingAllocationResult.worktree.rootPath);
    assert.equal((await rollingCodex.readTurn(rollingNativeThread.thread.id,rollingTurnStarted.turn.id)).status,'completed');
    const restartedRollingCampaignStore = new RollingCampaignStore(pool,projectId);
    assert.equal((await restartedRollingCampaignStore.status('worker-fixture')).assignments[0]?.sessionId,rollingNativeThread.thread.sessionId);
    if (rollingWorkerDispatchAttached) {
      assert.ok(instructionGeneration);
      assert.deepEqual(await restartedRollingCampaignStore.workerDispatch('worker-fixture',rollingAllocationResult.assignment.id,instructionGeneration),rollingWorkerDispatchAttached);
      const recoveredInstructionTurn = await rollingCodex.readTurn(rollingNativeThread.thread.id,rollingWorkerDispatchAttached.turnId);
      assert.equal(recoveredInstructionTurn.status,'completed');
      assert.equal(recoveredInstructionTurn.id,rollingWorkerDispatchAttached.turnId);
    }
    t.diagnostic(`worker native thread=${rollingNativeThread.thread.id}; session=${rollingNativeThread.thread.sessionId}; checkout=${rollingNativeThread.cwd}; attachment recovered after restart; model=${rollingNativeThread.model}`);
  }
}

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('worker provisioning fences creation and atomically attaches the native identity and ignored marker',
 t => runRollingWorkerScenario(t, 'protocol', 'instructions'));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-SCHEDULING
// Traceability: verifies REQ-ROLLING-STATE
test('worker suspension observes stopped activity and frees capacity while retaining dirty ownership',
 t => runRollingWorkerScenario(t, 'protocol', 'suspension'));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-SCHEDULING
// Traceability: verifies REQ-ROLLING-STATE
test('worker resumption restores original native identity and refreshes its scope before new work',
 t => runRollingWorkerScenario(t,'protocol','resumption'));

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-WORKERS
test('worker creation recovery retains uncertain ownership and attaches original initialization after restart',
 t => runRollingWorkerScenario(t,'protocol','recovery'));

// Traceability: verifies REQ-ROLLING-REVIEW
// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('submission collection binds terminal idle actor and exact passing candidate before review',
 t => runRollingWorkerScenario(t,'protocol','collection'));

// Traceability: verifies REQ-ROLLING-PUBLICATION
 test('real PostgreSQL automatically publishes the reviewed increment through one coordinator operation',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',automaticPublication:true}));

// Traceability: verifies REQ-ROLLING-REVIEW
test('real PostgreSQL retains inspected conflict continuation across restart without duplicate replay',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',conflictContinuation:true}));

// Traceability: verifies REQ-ROLLING-REVIEW
test('real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',conflictRepair:true}));

// Traceability: verifies REQ-ROLLING-REVIEW
// Traceability: verifies REQ-ROLLING-PUBLICATION
test('substantive integration repair retains worker and reviewer through fresh proof and publication',
 t=>runRollingWorkerScenario(t,'protocol','collection',false,true));

// Traceability: verifies REQ-ROLLING-GRAPH
test('integrated certificate assessment uses retained published proof and serializes accepted record publication',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',integratedCertificates:true}));

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
test('worker retirement revokes native ownership and fences checkout release through restartable cleanup',
 t=>runRollingWorkerScenario(t,'protocol','collection',false,true,true));

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('publication batch freezes one shared partial claim across concurrent requests and restart',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',publicationBatch:'partial'}));

// Traceability: verifies REQ-ROLLING-PUBLICATION
for (const publicationFlush of ['completion','quiescence'] as const) test(`publication partial flush follows verified ${publicationFlush} state`,
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',integratedCertificates:true,publicationFlush}));

// Traceability: verifies REQ-ROLLING-PUBLICATION
test('publication threshold uses configured M and persists one claim without counting acknowledgement retries',
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',publicationBatch:'threshold'}));

// Traceability: verifies REQ-ROLLING-PUBLICATION
for (const mainlinePublication of ['normal','lost_ack','race','unavailable','rejected'] as const) test(`mainline ${mainlinePublication} publication retains one observation and synchronizes the campaign after restart`,
 t=>runRollingReviewScenario(t,{decision:'accepted',mode:'manual',publicationBatch:'partial'},mainlinePublication));
