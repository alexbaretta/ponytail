// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const { databaseOptions } = require('../src/project-index');
const { collectRollingGraph } = require('../src/rolling-campaign');
const { RollingCampaignStore } = require('../src/rolling-campaign-store');
const { inputDigest } = require('../skills/plan-execution/scripts/obligations');

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work', async t => {
  const pool = new Pool(databaseOptions(path.join(__dirname, '..')));
  const projectId = crypto.randomUUID();
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-store-')));
  t.after(async () => {
    try { await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id=$1', [projectId]); }
    finally { await pool.end(); fs.rmSync(root, { recursive: true, force: true }); }
  });
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents/config/project/rolling-campaigns.json'), JSON.stringify({
    schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: 'managed', anchor: 'main' }, maxActiveWorkers: 1,
    publicationSize: 1, setupCommands: [], qa: { focused: [], publication: [['node', '--test']] },
  }));
  const source = path.join(__dirname, '../pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json');
  const document = JSON.parse(fs.readFileSync(source, 'utf8'));
  document.scopeId = 'fixture';
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '../pm/requirements/rolling-campaigns.md'), path.join(root, 'pm/requirements/rolling-campaigns.md'));
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(document));
  fs.writeFileSync(path.join(root, 'bindings.json'), JSON.stringify({ schemaVersion: 1,
    bindings: document.obligations.slice(1, 3).map(item => ({ obligationId: item.id,
      implementationIds: [], sourcePaths: [], acceptances: [], unitTests: [], integrationTests: [], exclusiveResources: [] })) }));
  const graph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await pool.query('INSERT INTO ponytail_index.project_v1(project_id,project_name) VALUES($1,$2)', [projectId, `rolling-${projectId}`]);
  const store = new RollingCampaignStore(pool, projectId);
  await store.registerCampaign({ id: 'fixture', coordinatorRoot: root, documentPath: 'obligations.json',
    bindingsPath: 'bindings.json', graphDigest: graph.digest, managedDirectory: path.join(root, 'managed'),
    configuration: { mainline: { remote: 'origin', branch: 'main' }, incrementRef: 'campaign/fixture', maxActiveWorkers: 1, publicationSize: 1 } });
  const allocations = await Promise.all(Array.from({ length: 4 }, () => store.allocate('fixture', graph.digest)));
  const allocated = allocations.filter(item => item.assignment);
  assert.equal(allocated.length, 1);
  assert.equal(allocated[0].worktree.number, 101);
  assert.equal(allocations.filter(item => item.reason === 'capacity_reached').length, 3);
  const first = allocated[0].assignment;
  await store.acknowledgeAction('fixture', allocated[0].actionId, first.generation, 'STARTED');
  await assert.rejects(store.retire('fixture', first.id, first.generation, true), /outcome must be reconciled/);
  assert.equal((await store.nextActions('fixture'))[0].state, 'STARTED');
  await store.acknowledgeAction('fixture', allocated[0].actionId, first.generation, 'COMPLETED', 'fixture external acknowledgment');
  await store.acknowledgeAction('fixture', allocated[0].actionId, first.generation, 'COMPLETED', 'fixture external acknowledgment');
  await assert.rejects(store.acknowledgeAction('fixture', allocated[0].actionId, first.generation, 'COMPLETED', 'different'), /differs/);
  await store.attachSession('fixture', first.id, first.generation, 'fixture-session');
  await assert.rejects(store.suspend('fixture', first.id, 'wrong-generation', true, ['OBL-1']), /lease generation/);
  await store.suspend('fixture', first.id, first.generation, true, ['OBL-1']);
  const second = await store.allocate('fixture', graph.digest);
  assert.equal(second.worktree.number, 102);
  assert.notEqual(second.assignment.id, first.id);
  await assert.rejects(store.allocate('fixture', 'stale'), /stale/);
  await store.retire('fixture', second.assignment.id, second.assignment.generation, true);
  const bindingsFile = path.join(root, 'bindings.json');
  const remaining = JSON.parse(fs.readFileSync(bindingsFile, 'utf8'));
  remaining.bindings = remaining.bindings.slice(0, 1);
  fs.writeFileSync(bindingsFile, JSON.stringify(remaining));
  const reconciled = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await store.reconcileGraph('fixture', graph.digest, reconciled.digest);
  const resumed = await store.allocate('fixture', reconciled.digest, { id: second.assignment.id, generation: second.assignment.generation });
  assert.equal(resumed.reason, 'no_ready_obligation');
  const status = await store.status('fixture');
  assert.equal(status.assignments.find(item => item.id === second.assignment.id).state, 'RELEASED');
  assert.equal(status.assignments.find(item => item.id === first.id).state, 'INACTIVE');
  assert.ok((await store.nextActions('fixture')).every(action => action.assignmentId === first.id || action.state !== 'PENDING'));
  await assert.rejects(store.retire('fixture', second.assignment.id, second.assignment.generation, true), /released assignment/);
  remaining.bindings.push({ ...remaining.bindings[0], obligationId: document.obligations[2].id });
  fs.writeFileSync(bindingsFile, JSON.stringify(remaining));
  const restored = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  await store.reconcileGraph('fixture', reconciled.digest, restored.digest);
  const reused = await store.allocate('fixture', restored.digest);
  assert.equal(reused.worktree.number, 102);
  assert.notEqual(reused.assignment.id, second.assignment.id);
  await store.retire('fixture', reused.assignment.id, reused.assignment.generation, true);
  const baseline = document.baselines[0];
  document.certificates.push({ id: 'CERT-fixture', obligationIds: ['OBL-1'],
    inputs: [{ path: 'pm/requirements/rolling-campaigns.md', digest: inputDigest(root, 'pm/requirements/rolling-campaigns.md') }],
    artifacts: ['pm/requirements/rolling-campaigns.md'], assessor: 'coordinator', authority: baseline.authority.references,
    adequate: true, reason: 'Fixture inventory assessment', disposition: null, evidence: [], inventoryIds: [] });
  document.checkpoints.push({ id: 'CP-fixture-initial', predecessorId: null, baselineId: baseline.id, kind: 'initial',
    selectedIds: [], registeredIds: baseline.obligationIds, certificateIds: [], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1], preparation: null, reason: 'Fixture initial observation', assessor: 'coordinator' });
  document.checkpoints.push({ id: 'CP-fixture-discharge', predecessorId: 'CP-fixture-initial', baselineId: baseline.id, kind: 'productive',
    selectedIds: ['OBL-1'], registeredIds: [], certificateIds: ['CERT-fixture'], invalidatedIds: [],
    before: [1, 1, 1, 1, 1, 1], after: [0, 1, 1, 1, 1, 1], preparation: null, reason: 'Fixture dependency discharged', assessor: 'coordinator' });
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(document));
  const unblocked = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.ok(unblocked.projection.satisfiedIds.includes('OBL-1'));
  await store.reconcileGraph('fixture', restored.digest, unblocked.digest);
  const reactivated = await store.allocate('fixture', unblocked.digest, { id: reused.assignment.id, generation: reused.assignment.generation });
  assert.equal(reactivated.assignment.id, first.id);
  assert.equal(reactivated.worktree.number, 101);
  assert.equal(reactivated.assignment.sessionId, 'fixture-session');
  assert.notEqual(reactivated.assignment.generation, first.generation);
  assert.equal((await store.nextActions('fixture'))[0].kind, 'RESUME_WORKER');
  await assert.rejects(store.retire('fixture', first.id, first.generation, true), /lease generation/);
  await store.acknowledgeAction('fixture', reactivated.actionId, reactivated.assignment.generation, 'STARTED');
  await store.acknowledgeAction('fixture', reactivated.actionId, reactivated.assignment.generation, 'COMPLETED', 'fixture resume acknowledgment');
  await assert.rejects(store.attachSession('fixture', first.id, reactivated.assignment.generation, 'other-session'), /original session/);
  await store.attachSession('fixture', first.id, reactivated.assignment.generation, 'fixture-session');
});
