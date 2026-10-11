// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadRollingConfiguration, collectRollingGraph, selectRollingAssignments,
  type RollingProjectConfigV1, type RollingCampaignRequest, type RollingBindingsV1,
  type RollingResolvedConfiguration, type RollingGraph,
} from '../src/rolling-campaign.js';
import { parseObligationDocument, type ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';

// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('configuration boundary uses the designated Git checkout and effective defaults', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-config-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'init.defaultBranch', 'release/stable']);
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'rolling-campaigns.json');
  let rollingProjectConfigV1: RollingProjectConfigV1 = { schemaVersion: 1, mainline: null,
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(file, JSON.stringify(rollingProjectConfigV1));
  const rollingCampaignRequest: RollingCampaignRequest = { mainline: null,
    incrementRef: 'campaign/example', maxActiveWorkers: null, publicationSize: null };
  const rollingResolvedConfiguration: RollingResolvedConfiguration = loadRollingConfiguration(root, rollingCampaignRequest);
  assert.deepEqual(rollingResolvedConfiguration, { mainline: { remote: 'origin', branch: 'release/stable' },
    incrementRef: 'campaign/example', maxActiveWorkers: 10, publicationSize: 1 });
  rollingProjectConfigV1 = { ...rollingProjectConfigV1, mainline: { remote: 'upstream', branch: 'main' }, publicationSize: 4 };
  fs.writeFileSync(file, JSON.stringify(rollingProjectConfigV1));
  assert.equal(loadRollingConfiguration(root, rollingCampaignRequest).mainline.remote, 'upstream');
  assert.equal(loadRollingConfiguration(root, rollingCampaignRequest).publicationSize, 4);
  assert.equal(rollingResolvedConfiguration.mainline.branch, 'release/stable');
  assert.throws(() => loadRollingConfiguration(directory, rollingCampaignRequest), /exact Git checkout/);
  fs.unlinkSync(file);
  assert.throws(() => loadRollingConfiguration(root, rollingCampaignRequest), /ENOENT/);
  const actual = path.join(root, 'actual.json');
  fs.writeFileSync(actual, JSON.stringify(rollingProjectConfigV1));
  fs.symlinkSync(actual, file);
  assert.throws(() => loadRollingConfiguration(root, rollingCampaignRequest), /regular non-symlink/);
  fs.unlinkSync(file);
  fs.writeFileSync(file, JSON.stringify(rollingProjectConfigV1));
  const elsewhere = path.join(root, 'elsewhere');
  fs.renameSync(directory, elsewhere);
  fs.symlinkSync(elsewhere, directory);
  assert.throws(() => loadRollingConfiguration(root, rollingCampaignRequest), /symlink ancestors/);
});

// Traceability: verifies REQ-ROLLING-GRAPH
// Traceability: verifies REQ-ROLLING-SCHEDULING
test('coordinator files alone determine graph identity, dependency changes and allocation', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rolling-graph-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', 'fixture']);
  const directory = path.join(root, '.agents/config/project');
  fs.mkdirSync(directory, { recursive: true });
  const rollingProjectConfigV1: RollingProjectConfigV1 = { schemaVersion: 1, mainline: null,
    managedWorktrees: { directory: '../managed_worktrees', anchor: 'main' },
    maxActiveWorkers: null, publicationSize: null, setupCommands: [],
    qa: { focused: [], publication: [['node', '--test']] } };
  fs.writeFileSync(path.join(directory, 'rolling-campaigns.json'), JSON.stringify(rollingProjectConfigV1));
  const repositoryRoot = path.resolve(__dirname, '../..');
  const source = path.join(repositoryRoot, 'pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json');
  let obligationDocumentV1: ObligationDocumentV1 = parseObligationDocument(fs.readFileSync(source, 'utf8'));
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  fs.copyFileSync(path.join(repositoryRoot, 'pm/requirements/rolling-campaigns.md'), path.join(root, 'pm/requirements/rolling-campaigns.md'));
  fs.copyFileSync(path.join(repositoryRoot, 'pm/requirements/static-language.md'), path.join(root, 'pm/requirements/static-language.md'));
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  const rollingBindingsV1: RollingBindingsV1 = { schemaVersion: 1,
    bindings: obligationDocumentV1.obligations.map(item => ({
      obligationId: item.id, implementationIds: [], sourcePaths: [], acceptances: [],
      unitTests: [], integrationTests: [], exclusiveResources: [],
    })) };
  fs.writeFileSync(path.join(root, 'bindings.json'), JSON.stringify(rollingBindingsV1));
  const beforeRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.equal(beforeRollingGraph.coordinatorRoot, root);
  assert.equal(selectRollingAssignments(beforeRollingGraph, [], 2, beforeRollingGraph.digest).selected.length, 2);
  fs.writeFileSync(path.join(root, 'worker-copy.json'), '{"not":"authoritative"}');
  assert.equal(collectRollingGraph(root, 'obligations.json', 'bindings.json').digest, beforeRollingGraph.digest);
  obligationDocumentV1 = { ...obligationDocumentV1, obligations: obligationDocumentV1.obligations.map(
    item => item.id === 'OBL-2' ? { ...item, dependsOn: ['OBL-1'] } : item) };
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  const afterRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.notEqual(afterRollingGraph.digest, beforeRollingGraph.digest);
  assert.throws(() => selectRollingAssignments(afterRollingGraph, [], 2, beforeRollingGraph.digest), /stale coordinator graph/);
  assert.equal(selectRollingAssignments(afterRollingGraph, [], 14, afterRollingGraph.digest).blocked.find(
    item => 'obligationId' in item && item.obligationId === 'OBL-2')?.reason, 'prerequisites');
  fs.appendFileSync(path.join(root, 'pm/requirements/rolling-campaigns.md'), '\nchanged input\n');
  assert.notEqual(collectRollingGraph(root, 'obligations.json', 'bindings.json').digest, afterRollingGraph.digest);
  fs.unlinkSync(path.join(root, 'pm/requirements/rolling-campaigns.md'));
  const unavailableRollingGraph: RollingGraph = collectRollingGraph(root, 'obligations.json', 'bindings.json');
  assert.equal(selectRollingAssignments(unavailableRollingGraph, [], 14, unavailableRollingGraph.digest).selected.length, 0);
  assert.deepEqual(unavailableRollingGraph.unavailableInputs, ['pm/requirements/rolling-campaigns.md']);
  obligationDocumentV1 = { ...obligationDocumentV1, obligations: obligationDocumentV1.obligations.map(
    item => item.id === 'OBL-1' ? { ...item, dependsOn: ['OBL-2'] } : item) };
  fs.writeFileSync(path.join(root, 'obligations.json'), JSON.stringify(obligationDocumentV1));
  assert.throws(() => collectRollingGraph(root, 'obligations.json', 'bindings.json'), /cyclic/);
  assert.throws(() => collectRollingGraph(root, '../foreign.json', 'bindings.json'), /repository-relative/);
});
