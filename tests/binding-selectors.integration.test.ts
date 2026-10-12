// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {readRollingObligationFixtureSource} from './helpers/rolling-obligation-source.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseObligationDocument, selectObligation, type ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';
import { type ObligationBindingHistoryV1, type ObligationBindingRevisionV1 } from '../skills/plan-execution/scripts/obligation-binding-history.js';
import { collectRollingGraph, selectRollingAssignments, type RollingProjectConfigV1, type RollingBindingsV1 } from '../src/rolling-campaign.js';

// Traceability: verifies REQ-ROLLING-GRAPH
test('portable and rolling queries share explicit coordinator bindings and preserve historical inputs', t => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'binding-selectors-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Binding proof', '-c', 'user.email=proof@example.invalid',
    'commit', '-q', '--allow-empty', '-m', 'isolated binding query']);
  const sourceObligationDocumentV1 = readRollingObligationFixtureSource('history');
  // Fixed immutable history prefix keeps this proof independent of its later certificates.
  const checkpointIndex = sourceObligationDocumentV1.checkpoints.findIndex(item => item.id === 'CHECKPOINT-24');
  assert.ok(checkpointIndex >= 0);
  const checkpoints = sourceObligationDocumentV1.checkpoints.slice(0, checkpointIndex + 1);
  const baselineIds = new Set(checkpoints.map(item => item.baselineId));
  const certificateIds = new Set(checkpoints.flatMap(item => item.certificateIds));
  const obligationDocumentV1: ObligationDocumentV1 = { ...sourceObligationDocumentV1, checkpoints,
    baselines: sourceObligationDocumentV1.baselines.filter(item => baselineIds.has(item.id)),
    certificates: sourceObligationDocumentV1.certificates.filter(item => certificateIds.has(item.id)) };
  const obligationBaseline = obligationDocumentV1.baselines.at(-1);
  const authority = obligationBaseline?.authority.references[0];
  const firstObligation = obligationDocumentV1.obligations.find(item => item.id === 'OBL-1');
  const nextObligation = obligationDocumentV1.obligations.find(item => item.id === 'OBL-15');
  assert.ok(obligationBaseline && authority && firstObligation && nextObligation);
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const rollingProjectConfigV1: RollingProjectConfigV1 = { schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    managedWorktrees: { directory: 'managed', anchor: 'main' }, maxActiveWorkers: null, publicationSize: null,
    setupCommands: [], qa: { focused: [], publication: [[process.execPath, '--version']] } };
  fs.writeFileSync(path.join(directory, 'rolling-campaigns.json'), JSON.stringify(rollingProjectConfigV1));
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  for (const name of ['rolling-campaigns.md', 'static-language.md']) fs.copyFileSync(path.join(repositoryRoot, 'pm/requirements', name), path.join(root, 'pm/requirements', name));
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  const rollingBindingsV1: RollingBindingsV1 = { schemaVersion: 1, bindings: obligationDocumentV1.obligations.map(item => ({
    obligationId: item.id, implementationIds: [], sourcePaths: [], acceptances: [], unitTests: [], integrationTests: [], exclusiveResources: [] })) };
  fs.writeFileSync(path.join(root, 'bindings.json'), JSON.stringify(rollingBindingsV1));
  const firstObligationBindingRevisionV1: ObligationBindingRevisionV1 = { id: 'BIND-1', obligationId: firstObligation.id,
    predecessorId: null, baselineId: obligationBaseline.id, assessor: 'coordinator', authority: [authority],
    reason: 'Discovered prerequisite', dependsOn: [nextObligation.id], execution: firstObligation.execution };
  const nextObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1,
    id: 'BIND-2', obligationId: nextObligation.id, reason: 'Current bounded source', dependsOn: [],
    execution: { ...nextObligation.execution, plannedPaths: ['src/current.ts'] } };
  const obligationBindingHistoryV1: ObligationBindingHistoryV1 = { schemaVersion: 1, scopeId: obligationDocumentV1.scopeId,
    revisions: [firstObligationBindingRevisionV1, nextObligationBindingRevisionV1] };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(obligationBindingHistoryV1));
  const legacyRollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.deepEqual(legacyRollingGraph.unavailableInputs, []);
  assert.equal(selectObligation(obligationDocumentV1, root).selectedId, firstObligation.id);
  assert.equal(selectObligation(obligationDocumentV1, root, obligationBindingHistoryV1).selectedId, nextObligation.id);
  const boundRollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json', 'history.json');
  const rollingSchedulingResult = selectRollingAssignments(boundRollingGraph, [], 1, boundRollingGraph.digest);
  assert.equal(rollingSchedulingResult.selected[0]?.obligationId, nextObligation.id);
  assert.deepEqual(rollingSchedulingResult.selected[0]?.plannedPaths, ['src/current.ts']);
  assert.throws(() => selectRollingAssignments(boundRollingGraph, [], 1, legacyRollingGraph.digest), /stale coordinator graph/);
  fs.writeFileSync(path.join(root, 'worker-copy.json'), '{"unrelated":"worker"}');
  assert.equal(collectRollingGraph(root, 'obligations.json', 'bindings.json', 'history.json').digest, boundRollingGraph.digest);
  fs.copyFileSync(path.join(root, 'history.json'), path.join(root, 'different-history.json'));
  assert.notEqual(collectRollingGraph(root, 'obligations.json', 'bindings.json', 'different-history.json').digest, boundRollingGraph.digest);
  const cli = path.join(repositoryRoot, 'skills/plan-execution/scripts/obligations.js');
  for (const bindings of [[], ['--binding-history', 'history.json']]) {
    const result = spawnSync(process.execPath, [cli, 'select', path.join(root, 'obligations.json'), root, ...bindings], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const expected = selectObligation(obligationDocumentV1, root, bindings.length === 0 ? undefined : obligationBindingHistoryV1);
    const actual: unknown = JSON.parse(result.stdout);
    assert.deepEqual(actual, expected);
  }
  const removingObligationBindingRevisionV1: ObligationBindingRevisionV1 = { ...firstObligationBindingRevisionV1,
    id: 'BIND-3', predecessorId: 'BIND-1', reason: 'Prerequisite no longer needed', dependsOn: [] };
  const revisedObligationBindingHistoryV1: ObligationBindingHistoryV1 = { ...obligationBindingHistoryV1,
    revisions: [...obligationBindingHistoryV1.revisions, removingObligationBindingRevisionV1] };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(revisedObligationBindingHistoryV1));
  const revisedRollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json', 'history.json');
  assert.notEqual(revisedRollingGraph.digest, boundRollingGraph.digest);
  assert.equal(selectObligation(obligationDocumentV1, root, revisedObligationBindingHistoryV1).selectedId, firstObligation.id);
  assert.equal(selectRollingAssignments(revisedRollingGraph, [], 1, revisedRollingGraph.digest).selected[0]?.obligationId, firstObligation.id);
  const foreignObligationBindingHistoryV1: ObligationBindingHistoryV1 = { ...obligationBindingHistoryV1, scopeId: 'foreign' };
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify(foreignObligationBindingHistoryV1));
  assert.throws(() => collectRollingGraph(root, 'obligations.json', 'bindings.json', 'history.json'), /scope mismatch/);
  assert.equal(spawnSync(process.execPath, [cli, 'select', path.join(root, 'obligations.json'), root, '--binding-history', 'history.json']).status, 1);
  fs.symlinkSync('different-history.json', path.join(root, 'linked.json'));
  assert.throws(() => collectRollingGraph(root, 'obligations.json', 'bindings.json', 'linked.json'));
  assert.equal(spawnSync(process.execPath, [cli, 'select', path.join(root, 'obligations.json'), root, '--binding-history', 'linked.json']).status, 2);
  assert.equal(spawnSync(process.execPath, [cli, 'select', path.join(root, 'obligations.json'), root, '--wrong', 'history.json']).status, 2);
});
