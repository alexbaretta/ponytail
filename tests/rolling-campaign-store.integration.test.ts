// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { databaseOptions } from '../src/project-index-database.js';
import { collectRollingGraph, type RollingProjectConfigV1, type RollingBindingsV1, type RollingBinding, type RollingGraph } from '../src/rolling-campaign.js';
import { RollingCampaignStore, type RollingCampaignRegistration, type RollingAllocationResult, type RollingStoredAssignment, type RollingCampaignStatus } from '../src/rolling-campaign-store.js';
import { inputDigest, parseObligationDocument, type ObligationDocumentV1, type ObligationBaseline, type Obligation, type ObligationCertificate, type ObligationCheckpoint } from '../skills/plan-execution/scripts/obligations.js';

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work', async t => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const pool: Pool = new Pool(databaseOptions(repositoryRoot));
  const projectId = crypto.randomUUID();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-store-')));
  t.after(async () => {
    try { await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1', [projectId]); }
    finally { await pool.end(); fs.rmSync(root, { recursive: true, force: true }); }
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
    checkpoints: [], scopeId: 'fixture' };
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
});
