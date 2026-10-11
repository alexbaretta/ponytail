// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fixture, type ObligationFixture } from './helpers/obligation-fixture.js';
import { type ObligationDocumentV1 } from '../skills/plan-execution/scripts/obligations.js';
import { parsePlanSource } from '../src/campaign-plan-metadata.js';
import { campaignGraph } from '../src/campaign-graph.js';
import { readTaskletGraph, parseTaskletStatuses, validateTaskletGraph, selectObligationTasklets } from '../skills/plan-execution/scripts/ready-tasklets.js';

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-ASSIGNMENT
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('adopted scope selects only owned tasklets and rejects path escape without mutation', testContext => {
 const obligationFixture: ObligationFixture = fixture(testContext);
 const owningPlan = parsePlanSource(obligationFixture.root, obligationFixture.planPath, 'in_progress', obligationFixture.planText);
 assert.equal(owningPlan.schemaVersion, 3);
 assert.ok(owningPlan.schemaVersion === 3);
 assert.equal(owningPlan.obligationDocument, obligationFixture.documentPath);
 const campaign = campaignGraph(obligationFixture.root, 'pilot');
 assert.equal(campaign.plans[0]?.runnableTasklets?.sprintId, 'S01');
 const graph = readTaskletGraph(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const statuses = parseTaskletStatuses(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const derivation = validateTaskletGraph(graph, statuses);
 const original = JSON.stringify(obligationFixture.document);
 const originalGraph = JSON.stringify([...graph.tasklets]);
 const originalStatuses = [...statuses];
 const selection = selectObligationTasklets(graph, statuses, derivation, null, obligationFixture.document, obligationFixture.root, 'pilot');
 assert.equal(selection.selectedId, 'OBL-1');
 assert.deepEqual(selection.taskletIds, ['S01-F01-T01']);
 assert.deepEqual(selection.plannedPaths, ['src.txt']);
 const outsideObligationDocumentV1: ObligationDocumentV1 = { ...obligationFixture.document, obligations: obligationFixture.document.obligations.map(
  obligation => obligation.id === 'OBL-1' ? { ...obligation, execution: { ...obligation.execution, plannedPaths: [] } } : obligation) };
 const outsideOriginal = JSON.stringify(outsideObligationDocumentV1);
 assert.throws(() => selectObligationTasklets(graph, statuses, derivation, null, outsideObligationDocumentV1, obligationFixture.root, 'pilot'), /exceeds obligation paths/);
 assert.equal(JSON.stringify(outsideObligationDocumentV1), outsideOriginal);
 assert.equal(JSON.stringify(obligationFixture.document), original);
 assert.equal(JSON.stringify([...graph.tasklets]), originalGraph);
 assert.deepEqual([...statuses], originalStatuses);
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
test('no-edit assessment remains selectable while subordinate edit tasks are pending', testContext => {
 const obligationFixture: ObligationFixture = fixture(testContext);
 const obligationDocumentV1: ObligationDocumentV1 = { ...obligationFixture.document, obligations: obligationFixture.document.obligations.map(
  obligation => obligation.id === 'OBL-1' ? { ...obligation, execution: { ...obligation.execution, taskletIds: [], plannedPaths: [] } } : obligation) };
 const graph = readTaskletGraph(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const statuses = parseTaskletStatuses(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const original = JSON.stringify(obligationDocumentV1);
 const selection = selectObligationTasklets(graph, statuses, validateTaskletGraph(graph, statuses), null, obligationDocumentV1, obligationFixture.root, 'pilot');
 assert.equal(selection.selectedId, 'OBL-1');
 assert.deepEqual(selection.taskletIds, []);
 assert.deepEqual(selection.plannedPaths, []);
 assert.equal(JSON.stringify(obligationDocumentV1), original);
});

test('foreign ownership returns no edits and unknown allowed tasklets reject without mutation', testContext => {
 const obligationFixture: ObligationFixture = fixture(testContext);
 const graph = readTaskletGraph(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const statuses = parseTaskletStatuses(path.join(obligationFixture.root, obligationFixture.sprintPath));
 const derivation = validateTaskletGraph(graph, statuses);
 const foreign = selectObligationTasklets(graph, statuses, derivation, null, obligationFixture.document, obligationFixture.root, 'foreign');
 assert.equal(foreign.selectedId, 'OBL-1');
 assert.deepEqual(foreign.taskletIds, []);
 assert.deepEqual(foreign.plannedPaths, []);
 const obligationDocumentV1: ObligationDocumentV1 = { ...obligationFixture.document, obligations: obligationFixture.document.obligations.map(
  obligation => obligation.id === 'OBL-1' ? { ...obligation, execution: { ...obligation.execution, taskletIds: ['S01-F01-T99'] } } : obligation) };
 const original = JSON.stringify(obligationDocumentV1);
 assert.throws(() => selectObligationTasklets(graph, statuses, derivation, null, obligationDocumentV1, obligationFixture.root, 'pilot'), /unknown obligation tasklet/);
 assert.throws(() => selectObligationTasklets(graph, statuses, derivation, null, obligationFixture.document, obligationFixture.root, null), /owning plan ID/);
 assert.equal(JSON.stringify(obligationDocumentV1), original);
});

// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('canonical adopted CLI requires its document and DONE edits leave discharge unresolved', testContext => {
 const obligationFixture: ObligationFixture = fixture(testContext);
 const script = path.join(__dirname, '..', '..', 'skills/plan-execution/scripts/ready-tasklets.js');
 const sprintFile = path.join(obligationFixture.root, obligationFixture.sprintPath);
 const documentFile = path.join(obligationFixture.root, obligationFixture.documentPath);
 const originalDocument = fs.readFileSync(documentFile, 'utf8');
 const missing = spawnSync(process.execPath, [script, sprintFile], { encoding: 'utf8' });
 assert.equal(missing.status, 1);
 assert.equal(missing.stdout, '');
 assert.equal(missing.stderr, 'adopted plan requires its configured --obligations document and --root\n');
 const invoke = () => spawnSync(process.execPath, [script, sprintFile, '--obligations', documentFile, '--root', obligationFixture.root], { encoding: 'utf8' });
 const initial = invoke();
 assert.equal(initial.status, 0, initial.stderr);
 const graph = readTaskletGraph(sprintFile);
 const statuses = parseTaskletStatuses(sprintFile);
 const expected = selectObligationTasklets(graph, statuses, validateTaskletGraph(graph, statuses), null, obligationFixture.document, obligationFixture.root, 'pilot');
 assert.equal(initial.stdout, `${JSON.stringify(expected)}\n`);
 fs.writeFileSync(sprintFile, fs.readFileSync(sprintFile, 'utf8').replaceAll('### [ ]', '### [DONE]'));
 const completedGraph = readTaskletGraph(sprintFile);
 const completedStatuses = parseTaskletStatuses(sprintFile);
 const completed = invoke();
 assert.equal(completed.status, 0, completed.stderr);
 const expectedCompleted = selectObligationTasklets(completedGraph, completedStatuses, validateTaskletGraph(completedGraph, completedStatuses), null,
  obligationFixture.document, obligationFixture.root, 'pilot');
 assert.equal(expectedCompleted.projection.complete, false);
 assert.equal(expectedCompleted.selectedId, 'OBL-1');
 assert.deepEqual(expectedCompleted.taskletIds, []);
 assert.equal(completed.stdout, `${JSON.stringify(expectedCompleted)}\n`);
 assert.equal(fs.readFileSync(documentFile, 'utf8'), originalDocument);
});
