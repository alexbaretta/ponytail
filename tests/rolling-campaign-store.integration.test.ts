// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { databaseOptions } from '../src/project-index-database.js';
import { collectRollingGraph, type RollingProjectConfigV1, type RollingBindingsV1, type RollingBinding, type RollingGraph } from '../src/rolling-campaign.js';
import { RollingCampaignStore, type RollingCampaignRegistration, type RollingAllocationResult, type RollingWorkerDispatchAttached, type RollingStoredAssignment, type RollingCampaignStatus } from '../src/rolling-campaign-store.js';
import { inputDigest, parseObligationDocument, type ObligationDocumentV1, type ObligationBaseline, type Obligation, type ObligationCertificate, type ObligationCheckpoint } from '../skills/plan-execution/scripts/obligations.js';
import type { ObligationBindingHistoryV1, ObligationBindingRevisionV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import type { ObligationEvidence } from '../skills/plan-execution/scripts/obligations.js';
import type { RollingWorkerSubmissionV1 } from '../src/rolling-worker-submission.js';
import { dispatchRollingReview, collectRollingReview, type RollingReviewOutcomeV1 } from '../src/rolling-review.js';
import { provisionRollingWorker, attachRollingWorker, suspendRollingWorker, dispatchRollingWorker, buildRollingWorkerInstructions, type RollingWorkerInitialization } from '../src/rolling-worker.js';
import { RollingCodex, RollingObservationTimeout, type RollingNativeTurn, type RollingNativeThread } from '../src/rolling-codex.js';
import { acceptBoundCheckpoint, type ObligationCertificateBindingV1, type ObligationCertificateSubmission,
  type ObligationCertificateBindingRequest } from '../skills/plan-execution/scripts/obligation-certificate-bindings.js';

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-SCHEDULING
export interface ReviewScenario { readonly decision: RollingReviewOutcomeV1['decision']; readonly mode: 'manual' | 'protocol' | 'native' }
function declineReviewApprovals(rollingCodex: RollingCodex): void {
  rollingCodex.on('serverRequest', message => rollingCodex.respondToServer(message.id, { decision: 'decline' }));
}
export async function runRollingReviewScenario(t: TestContext, reviewScenario: ReviewScenario): Promise<void> {
  const reviewDecision = reviewScenario.decision;
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
    publicationSize: 1, setupCommands: [], qa: { focused: [], publication: [['node', '--test']] },
  };
  fs.writeFileSync(path.join(root, '.agents/config/project/rolling-campaigns.json'), JSON.stringify(rollingProjectConfigV1));
  const source = path.join(repositoryRoot, 'pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json');
  let obligationDocumentV1: ObligationDocumentV1 = parseObligationDocument(fs.readFileSync(source, 'utf8'));
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
    configuration: { mainline: { remote: 'origin', branch: 'main' }, incrementRef: 'campaign/fixture', maxActiveWorkers: 1, publicationSize: 1 } };
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
  // Explicit V2 adoption shares this isolated project pool with the retained V1 owner.
  const boundObligationDocumentV1: ObligationDocumentV1 = { ...obligationDocumentV1, scopeId: 'bound-fixture',
    obligations: reviewScenario.mode === 'native' ? obligationDocumentV1.obligations.map(item => item.id === firstRollingBinding.obligationId
      ? { ...item, condition: 'The exported value in fixture/current.ts must remain exactly 1.',
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
  assert.equal(boundRollingStoredAssignment.lease?.graphDigest, boundRollingGraph.digest);
  assert.deepEqual(boundRollingStoredAssignment.plannedPaths, ['fixture/current.ts']);
  const frozen = JSON.stringify(boundRollingStoredAssignment.lease);
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
  await assert.rejects(rollingCampaignStore.rebindLease('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, nextRollingGraph.digest), /stopped retained owner/);
  await assert.rejects(rollingCampaignStore.suspend('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, false, ['OBL-1']), /stopped acknowledgment/);
  await rollingCampaignStore.suspend('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, true, ['OBL-1']);
  const blockedRollingAllocationResult = await rollingCampaignStore.allocate('bound-fixture', nextRollingGraph.digest);
  assert.equal(blockedRollingAllocationResult.assignment, null);
  assert.ok(blockedRollingAllocationResult.blocked?.some(item => item.reason === 'scope_changed'));
  const rollingLeaseRenewal = await rollingCampaignStore.rebindLease('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, nextRollingGraph.digest);
  assert.notEqual(rollingLeaseRenewal.generation, boundRollingStoredAssignment.generation);
  assert.equal(rollingLeaseRenewal.lease.binding.revisionId, 'BIND-2');
  await assert.rejects(rollingCampaignStore.rebindLease('bound-fixture', boundRollingStoredAssignment.id, boundRollingStoredAssignment.generation, nextRollingGraph.digest), /lease generation/);
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
  for (const malformed of ['{"schemaVersion":3}', '{"schemaVersion":"2"}', '{"schemaVersion":null}', '{}']) {
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
  execFileSync('git', ['-C', root, 'add', '--', '.gitignore', 'fixture/current.ts']);
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
  fs.writeFileSync(path.join(workerRoot, 'fixture/current.ts'), 'export const value: number = 2;\n');
  execFileSync('git', ['-C', workerRoot, 'add', '--', 'fixture/current.ts']);
  execFileSync('git', ['-C', workerRoot, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '-m', 'bounded submission fixture']);
  const revision = execFileSync('git', ['-C', workerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const checkOutput = execFileSync(process.execPath, ['--check', path.join(workerRoot, 'fixture/current.ts')], { encoding: 'utf8' });
  fs.writeFileSync(path.join(workerRoot, 'proof.txt'), `${checkOutput}Node syntax check exited 0\n`);
  const submissionObligationEvidence: ObligationEvidence = { command: 'node --check fixture/current.ts', selection: ['focused fixture proof'],
    target: { identity: 'local', profile: 'fixture', verification: 'proof.txt' }, revision, dirty: false,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outcome: 'pass', skips: 0, failures: 0,
    inputs: ['fixture/current.ts', 'proof.txt'].map(relative => ({ path: relative, digest: inputDigest(workerRoot, relative) })), outputPath: 'proof.txt', finalization: 'pass' };
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
  const rollingStoredReview = reviewRequests[0];
  assert.ok(rollingStoredReview);
  assert.ok(reviewRequests.every(item => item.request.id === rollingStoredReview.request.id && item.outcome === null));
  assert.equal((await rollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id)).length, 1);
  assert.equal(rollingStoredReview.request.baseCommit, rollingWorkerSubmissionV1.baseCommit);
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
  const attachments = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, claimed.value.id, 'reviewer-session', 'review-turn')));
  assert.ok(attachments.every(item => item.state === 'ATTACHED' && item.turnId === 'review-turn'));
  await assert.rejects(rollingCampaignStore.attachReviewDispatch('bound-fixture', rollingStoredReview.request.id, claimed.value.id, 'reviewer-session', 'different-turn'), /retry differs/);
  assert.deepEqual(await restartedRollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), attachments[0]);
  assert.equal(await foreignRollingCampaignStore.reviewDispatch('bound-fixture', rollingStoredReview.request.id), null);
  await assert.rejects(rollingCampaignStore.requestReview('bound-fixture', submissionRollingStoredAssignment.id,
    submissionRollingStoredAssignment.generation, revision, 'other-reviewer'), /retry differs/);
  const rollingReviewOutcomeV1: RollingReviewOutcomeV1 = reviewDecision === 'accepted'
    ? { schemaVersion: 1, reviewId: rollingStoredReview.request.id, revision,
      reviewerSessionId: 'reviewer-session', completedAt: new Date().toISOString(), decision: 'accepted', findings: [] }
    : { schemaVersion: 1, reviewId: rollingStoredReview.request.id, revision,
      reviewerSessionId: 'reviewer-session', completedAt: new Date().toISOString(), decision: 'rejected', findings: ['Required correction.'] };
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, 'other-reviewer', rollingReviewOutcomeV1), /only the assigned/);
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, 'reviewer-session',
    { ...rollingReviewOutcomeV1, revision: 'f'.repeat(40) }), /differs from assigned/);
  fs.writeFileSync(path.join(workerRoot, 'unexpected.ts'), 'dirty during review');
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, 'reviewer-session', rollingReviewOutcomeV1), /dirty/);
  fs.unlinkSync(path.join(workerRoot, 'unexpected.ts'));
  const decisions = await Promise.all(Array.from({ length: 4 }, () => rollingCampaignStore.recordReviewOutcome('bound-fixture',
    rollingStoredReview.request.id, 'reviewer-session', rollingReviewOutcomeV1)));
  assert.ok(decisions.every(item => JSON.stringify(item.outcome) === JSON.stringify(rollingReviewOutcomeV1)));
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
  const changedRollingReviewOutcomeV1: RollingReviewOutcomeV1 = reviewDecision === 'accepted'
    ? { ...rollingReviewOutcomeV1, decision: 'rejected', findings: ['Changed verdict.'] }
    : { ...rollingReviewOutcomeV1, decision: 'accepted', findings: [] };
  await assert.rejects(rollingCampaignStore.recordReviewOutcome('bound-fixture', rollingStoredReview.request.id, 'reviewer-session', changedRollingReviewOutcomeV1), /immutable decision/);
  assert.deepEqual((await rollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id))[0]?.outcome, rollingReviewOutcomeV1);
  assert.deepEqual(await foreignRollingCampaignStore.reviews('bound-fixture', submissionRollingStoredAssignment.id), []);
  assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
  }

  // Traceability: verifies REQ-ROLLING-GRAPH
  // This fixture reconciles Git and certificate inputs; it does not replace adversarial review or production publication.
  const rollingStoredSubmission = storedSubmissions[0];
  assert.ok(rollingStoredSubmission);
  execFileSync('git', ['-C', root, 'merge', '-q', '--ff-only', revision]);
  fs.copyFileSync(path.join(workerRoot, 'proof.txt'), path.join(root, 'proof.txt'));
  const obligationCertificateSubmission: ObligationCertificateSubmission = { lease: rollingStoredSubmission.lease,
    revision: rollingStoredSubmission.submission.revision, operations: rollingStoredSubmission.submission.proof.map(item => item.operation),
    evidence: rollingStoredSubmission.submission.proof.map(item => item.evidence) };
  const obligationCertificateBindingV1: ObligationCertificateBindingV1 = { schemaVersion: 1, certificateId: 'CERT-bound-candidate',
    lease: rollingStoredSubmission.lease, revision: rollingStoredSubmission.submission.revision,
    proof: [{ operation: 'check', certificateEvidenceIndex: 0, submissionEvidenceIndex: 0 }] };
  fs.writeFileSync(path.join(root, 'certificate-binding.json'), JSON.stringify(obligationCertificateBindingV1));
  const obligationCertificateBindingRequest: ObligationCertificateBindingRequest = { path: 'certificate-binding.json', submission: obligationCertificateSubmission };
  const boundObligationCertificate: ObligationCertificate = { id: obligationCertificateBindingV1.certificateId,
    obligationIds: [firstRollingBinding.obligationId], inputs: [...new Set([...fixtureObligationBaseline.requirements.map(item => item.path),
      ...submissionObligationEvidence.inputs.map(item => item.path), 'certificate-binding.json'])].map(relative => ({ path: relative, digest: inputDigest(root, relative) })),
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
  const acceptedBoundObligationDocumentV1 = acceptBoundCheckpoint(boundObligationDocumentV1, candidateBoundObligationDocumentV1, root,
    submissionObligationBindingHistoryV1, [obligationCertificateBindingRequest]);
  assert.deepEqual(acceptedBoundObligationDocumentV1.obligations, boundObligationDocumentV1.obligations);
  fs.writeFileSync(path.join(root, 'bound-obligations.json'), JSON.stringify(acceptedBoundObligationDocumentV1));
  const acceptedBoundRollingGraph = collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json');
  assert.ok(acceptedBoundRollingGraph.projection.satisfiedIds.includes(firstRollingBinding.obligationId));
  await rollingCampaignStore.reconcileGraph('bound-fixture', submissionRollingGraph.digest, acceptedBoundRollingGraph.digest);
  assert.equal((await rollingCampaignStore.status('bound-fixture')).assignments[0]?.state, reviewDecision === 'accepted' ? 'INTEGRATING' : 'REWORK');
  fs.writeFileSync(path.join(root, 'fixture/current.ts'), 'export const value: number = 3;\n');
  assert.throws(() => acceptBoundCheckpoint(boundObligationDocumentV1, candidateBoundObligationDocumentV1, root,
    submissionObligationBindingHistoryV1, [obligationCertificateBindingRequest]), /changed input: fixture\/current.ts/);
  assert.ok(!collectRollingGraph(root, 'bound-obligations.json', 'bound-bindings.json', 'history.json').projection.satisfiedIds.includes(firstRollingBinding.obligationId));
}
const reviewScenarios: readonly ReviewScenario[] = [{ decision: 'accepted', mode: 'manual' }, { decision: 'rejected', mode: 'manual' }, { decision: 'accepted', mode: 'protocol' }];
for (const reviewScenario of reviewScenarios) {
  test(`real PostgreSQL serializes allocation, retains ownership and persists ${reviewScenario.mode === 'protocol' ? 'native application' : reviewScenario.decision} review`,
    t => runRollingReviewScenario(t, reviewScenario));
}

// Traceability: verifies REQ-ROLLING-WORKERS
// Traceability: verifies REQ-ROLLING-STATE
function connectRollingWorkerCodex(): Promise<RollingCodex> {
  // Node's test-runner metadata belongs to this harness, not the native worker.
  return RollingCodex.connect({executable:'env',argv:['-u','NODE_TEST_CONTEXT','codex','app-server','--listen','stdio://']});
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

export async function runRollingWorkerScenario(t: TestContext, mode: 'protocol' | 'native', operation: 'attachment' | 'instructions' | 'suspension'): Promise<void> {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const pool = new Pool(databaseOptions(repositoryRoot));
  const projectId = crypto.randomUUID();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-worker-store-')));
  const rollingCampaignStore = new RollingCampaignStore(pool, projectId);
  let rollingCodex = mode === 'native' ? await connectRollingWorkerCodex()
    : new RollingCodex({executable:process.execPath,argv:[path.join(__dirname,'fixtures/rolling-codex-server.js')]});
  let rollingWorkerInitialization: RollingWorkerInitialization | null = null;
  let provisioningStarted = false;
  let instructionDispatchStarted = false;
  let rollingWorkerDispatchAttached: RollingWorkerDispatchAttached | null = null;
  let cleanupSafe = false;
  t.after(async () => {
    try {
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
    managedWorktrees:{directory:'managed',anchor:'main'},maxActiveWorkers:1,publicationSize:1,setupCommands:[],qa:{focused:operation !== 'attachment' ? [['node','--test','fixture.test.ts']] : [],publication:[['node','--test']]}};
  fs.writeFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),JSON.stringify(rollingProjectConfigV1));
  fs.writeFileSync(path.join(root,'.gitignore'),'/managed/\n/session_id.txt\n/origin.git/\n');
  const sourceObligationDocumentV1 = parseObligationDocument(fs.readFileSync(path.join(repositoryRoot,
    'pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json'),'utf8'));
  const originalObligationBaseline = sourceObligationDocumentV1.baselines[0];assert.ok(originalObligationBaseline);
  const fixtureRequirementText = '# Worker responsibility fixture\n\nInspect the fixture value and report the assigned requirement, acceptance, Arc/step, implementation, unit/integration, lease, path and QA references. Preserve the source files.\n';
  const obligationBaseline: ObligationBaseline = {...originalObligationBaseline,
    requirements:originalObligationBaseline.requirements.map(item => ({...item,digest:operation !== 'attachment'
      ? crypto.createHash('sha256').update(fixtureRequirementText).digest('hex') : inputDigest(repositoryRoot,item.path)}))};
  const obligationDocumentV1: ObligationDocumentV1 = {...sourceObligationDocumentV1,scopeId:'worker-fixture',baselines:[obligationBaseline],
    obligations:sourceObligationDocumentV1.obligations.filter(item => obligationBaseline.obligationIds.includes(item.id)).map((item,index) =>
      operation !== 'attachment' && index === 1 ? {...item,
        condition:'Inspect fixture.ts and establish that its exported value remains 1. Run the configured focused fixture QA. In the final report identify every assigned requirement ID, acceptance ID, Arc/step IDs, implementation ID, unit/integration IDs and selections, permitted paths, lease generation and target. Do not modify files.',
        criterion:'Read-only fixture inspection and passing focused QA with the exact worker responsibility references in the final report.'} : item),
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
  const rollingBindingsV1: RollingBindingsV1 = {schemaVersion:1,bindings:operation === 'suspension' ? [rollingBinding,nextRollingBinding] : [rollingBinding]};
  fs.writeFileSync(path.join(root,'bindings.json'),JSON.stringify(rollingBindingsV1));
  const obligationBindingRevisionV1: ObligationBindingRevisionV1 = {id:'BIND-1',obligationId:obligation.id,predecessorId:null,
    baselineId:obligationBaseline.id,assessor:'coordinator',authority:obligationBaseline.authority.references,reason:'Isolated worker attachment',dependsOn:[],
    execution:{sprintId:null,taskletIds:[],plannedPaths:operation !== 'attachment' ? ['fixture.ts','fixture.test.ts','pm/requirements/rolling-campaigns.md'] : ['fixture.ts'],
      operations:operation !== 'attachment' ? ['inspect','test'] : ['edit','test'],selection:operation !== 'attachment' ? ['fixture unit','fixture integration'] : ['fixture'],target:{identity:'local',profile:'fixture'}}};
  const nextObligationBindingRevisionV1:ObligationBindingRevisionV1 = {...obligationBindingRevisionV1,id:'BIND-2',obligationId:nextObligation.id,
    reason:'Independent next fixture obligation',execution:{...obligationBindingRevisionV1.execution,plannedPaths:['next.ts']}};
  const obligationBindingHistoryV1: ObligationBindingHistoryV1 = {schemaVersion:1,scopeId:'worker-fixture',
    revisions:operation === 'suspension' ? [obligationBindingRevisionV1,nextObligationBindingRevisionV1] : [obligationBindingRevisionV1]};
  fs.writeFileSync(path.join(root,'history.json'),JSON.stringify(obligationBindingHistoryV1));
  execFileSync('git',['-C',root,'add','.']);
  execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','-m','worker base']);
  execFileSync('git',['-C',root,'branch','campaign/worker-fixture']);
  if (operation !== 'attachment' && mode === 'native') {
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
    rollingCodex.on('serverRequest',message => rollingCodex.respondToServer(message.id,{decision:'decline'}));
    rollingCodex.on('diagnostic',message => t.diagnostic(message.trim()));
  }
  provisioningStarted = true;
  rollingWorkerInitialization = await provisionRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,generation);
  await assert.rejects(rollingCampaignStore.claimWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation),/already claimed/);
  await assert.rejects(rollingCampaignStore.recordWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    {...rollingWorkerInitialization.rollingWorkerCreationV1,sessionId:'foreign'}),/immutable/);
  await assert.rejects(rollingCampaignStore.completeWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    {...rollingWorkerInitialization.rollingWorkerCreationV1,sessionId:'foreign'}),/receipt differs/);
  const rollingSessionAttachment = await attachRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.actionId,
    generation,rollingWorkerInitialization);
  assert.equal(rollingSessionAttachment.sessionId,rollingWorkerInitialization.rollingWorkerCreationV1.sessionId);
  assert.equal(rollingSessionAttachment.state,'WORKING');
  assert.equal((await rollingCampaignStore.status('worker-fixture')).assignments[0]?.sessionId,rollingWorkerInitialization.rollingWorkerCreationV1.sessionId);
  assert.deepEqual(await rollingCampaignStore.nextActions('worker-fixture'),[]);
  assert.deepEqual(await rollingCampaignStore.completeWorkerCreation('worker-fixture',rollingAllocationResult.actionId,generation,
    rollingWorkerInitialization.rollingWorkerCreationV1),rollingSessionAttachment);
  assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'status','--porcelain'],{encoding:'utf8'}),'');
  if (operation !== 'attachment') {
    const rollingWorkerContext = await rollingCampaignStore.workerContext('worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.equal(rollingWorkerContext.obligation.id,obligation.id);
    assert.deepEqual(rollingWorkerContext.lease,rollingAllocationResult.assignment.lease);
    assert.deepEqual(rollingWorkerContext.qa,rollingProjectConfigV1.qa);
    instructionDispatchStarted = true;
    rollingWorkerDispatchAttached = await dispatchRollingWorker(rollingCampaignStore,rollingCodex,'worker-fixture',rollingAllocationResult.assignment.id,generation);
    assert.equal(rollingWorkerDispatchAttached.threadId,rollingWorkerInitialization.rollingWorkerCreationV1.threadId);
    const rollingNativeTurn = await observeRollingWorkerTurn(t,rollingCodex,rollingWorkerDispatchAttached.threadId,rollingWorkerDispatchAttached.turnId);
    assert.equal(rollingNativeTurn.status,'completed');
    assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'status','--porcelain'],{encoding:'utf8'}),'');
    assert.equal(execFileSync('git',['-C',rollingAllocationResult.worktree.rootPath,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),rollingGraph.head);
    const finalText = rollingNativeTurn.items.filter(item => item.type === 'agentMessage').at(-1)?.text;
    assert.ok(finalText);
    if (mode === 'protocol') assert.equal(finalText,`Worker instructions digest: ${crypto.createHash('sha256').update(buildRollingWorkerInstructions(rollingWorkerContext)).digest('hex')}`);
    else {
      for (const expected of [...obligation.requirementIds,'IMPL-FIXTURE','ACCEPT-FIXTURE','ARC-FIXTURE','STEP-FIXTURE','UNIT-FIXTURE',
        'INTEGRATION-FIXTURE','fixture unit','fixture integration',...rollingWorkerContext.lease.binding.execution.plannedPaths,generation]) assert.ok(finalText.includes(expected),finalText);
      const target = rollingWorkerContext.lease.binding.execution.target;assert.ok(target);
      assert.ok(finalText.includes(target.identity) && finalText.includes(target.profile),finalText);
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
  if (operation === 'suspension') {
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
    const nextRollingAllocationResult = await rollingCampaignStore.allocate('worker-fixture',changedRollingGraph.digest);
    assert.equal(nextRollingAllocationResult.assignment?.obligationId,nextObligation.id);
    assert.equal(nextRollingAllocationResult.worktree?.number,102);
    const stoppedRollingStoredAssignment = (await rollingCampaignStore.status('worker-fixture')).assignments.find(item => item.id === rollingAllocationResult.assignment?.id);
    assert.equal(stoppedRollingStoredAssignment?.state,'INACTIVE');
    assert.equal(stoppedRollingStoredAssignment?.activityStopped,true);
    assert.equal(stoppedRollingStoredAssignment?.sessionId,rollingSessionAttachment.sessionId);
    assert.equal(stoppedRollingStoredAssignment?.worktreeNumber,101);
    assert.deepEqual(stoppedRollingStoredAssignment?.blockers,['OBL-1']);
    assert.deepEqual(await new RollingCampaignStore(pool,projectId).workerStop('worker-fixture',rollingAllocationResult.assignment.id,generation),rollingWorkerStopV1);
    await assert.rejects(rollingCampaignStore.suspendObservedWorker('worker-fixture',rollingAllocationResult.assignment.id,generation,
      {...rollingWorkerStopV1,sessionId:'foreign'},['OBL-1']),/attached native worker/);
    t.diagnostic(`worker suspension thread=${rollingWorkerStopV1.threadId}; session=${rollingWorkerStopV1.sessionId}; native=idle; retained checkout=101 with dirty checkpoint; next obligation=${nextObligation.id}; allocated checkout=102`);
  }
  if (mode === 'native') {
    const {rollingWorkerCreationV1,rollingTurnStarted} = rollingWorkerInitialization;
    await rollingCodex.close();
    rollingCodex = await connectRollingWorkerCodex();
    rollingCodex.on('serverRequest',message => rollingCodex.respondToServer(message.id,{decision:'decline'}));
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
    assert.equal(rollingNativeThread.thread.sessionId,rollingSessionAttachment.sessionId);
    assert.equal(rollingNativeThread.cwd,rollingAllocationResult.worktree.rootPath);
    assert.equal((await rollingCodex.readTurn(rollingNativeThread.thread.id,rollingTurnStarted.turn.id)).status,'completed');
    const restartedRollingCampaignStore = new RollingCampaignStore(pool,projectId);
    assert.equal((await restartedRollingCampaignStore.status('worker-fixture')).assignments[0]?.sessionId,rollingNativeThread.thread.sessionId);
    if (rollingWorkerDispatchAttached) {
      assert.deepEqual(await restartedRollingCampaignStore.workerDispatch('worker-fixture',rollingAllocationResult.assignment.id,generation),rollingWorkerDispatchAttached);
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
