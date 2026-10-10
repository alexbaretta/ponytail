// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { fixture, git } = require('./helpers/obligation-fixture');
const { inputDigest } = require('../skills/plan-execution/scripts/obligations');
const { campaignGraph } = require('../src/campaign-census');
const { withLedgerLock, reserveAssignment, readLedger, recordWorkerDelivery } = require('../src/campaign-orchestration');

// Traceability: verifies REQ-PONYTAIL-GLOSSARY
// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-DISCHARGE
// Traceability: verifies REQ-OBLIGATION-ASSIGNMENT
// Traceability: verifies REQ-OBLIGATION-PRIORITY
// Traceability: verifies REQ-OBLIGATION-TRANSITIONS
// Traceability: verifies REQ-OBLIGATION-COMPLETENESS
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-FRESHNESS
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI', async t => {
  const { root, documentPath, proofPath, environment, sprintPath } = fixture(t);
  const script = path.join(__dirname, '../src/campaign-census.js');
  const read = () => JSON.parse(fs.readFileSync(path.join(root, documentPath), 'utf8'));
  const invoke = (operation, args = []) => spawnSync(process.execPath, [script, operation, 'pilot', ...args, '--json'], { cwd: root, env: environment, encoding: 'utf8' });
  const status = () => {
    const result = invoke('obligation-status');
    assert.equal(result.status, 0, result.stderr);
    const selection = JSON.parse(result.stdout);
    return { ...selection.projection, selectedId: selection.selectedId };
  };
  const publish = (candidate, accepted = true) => {
    const before = fs.readFileSync(path.join(root, documentPath), 'utf8');
    fs.writeFileSync(path.join(root, 'candidate.json'), JSON.stringify(candidate));
    const result = invoke('obligation-accept', ['--candidate', 'candidate.json']);
    if (accepted) assert.equal(result.status, 0, result.stderr);
    else {
      assert.notEqual(result.status, 0);
      assert.equal(fs.readFileSync(path.join(root, documentPath), 'utf8'), before);
    }
    return result;
  };
  const checkpoint = (candidate, kind, selectedIds, certificateIds, after, extra = {}) => {
    const prior = read().checkpoints.at(-1);
    candidate.checkpoints.push({ id: `CP${candidate.checkpoints.length + 1}`, predecessorId: prior.id,
      baselineId: candidate.baselines.at(-1).id, kind, selectedIds, registeredIds: [], certificateIds,
      invalidatedIds: [], before: prior.after, after, preparation: null, reason: 'Observed complete scoped CLI lifecycle', assessor: 'coordinator', ...extra });
  };
  const certify = (candidate, id) => {
    const obligation = candidate.obligations.find(item => item.id === id);
    const certificate = { id: `CERT-${candidate.certificates.length + 1}`, obligationIds: [id],
      inputs: ['requirement.md', proofPath].map(relative => ({ path: relative, digest: inputDigest(root, relative) })),
      artifacts: [proofPath], assessor: 'coordinator', authority: ['approved-CHNG'], adequate: true,
      reason: 'Inspected fixture responsibility and enumerated all discovered members', disposition: null, evidence: [],
      inventoryIds: candidate.baselines.at(-1).inventoryIds.includes(id) ? candidate.baselines.at(-1).obligationIds.filter(member => !candidate.baselines.at(-1).inventoryIds.includes(member) && candidate.obligations.find(item => item.id === member).category === obligation.category) : [] };
    candidate.certificates.push(certificate);
    return certificate.id;
  };

  await t.test('Step 1: canonical glossary and unresolved legacy DONE', () => {
    const glossary = fs.readFileSync(path.join(__dirname, '../skills/plan-execution/references/glossary.md'), 'utf8');
    assert.match(glossary, /\| Acceptance \| An atomic observable condition/);
    assert.match(glossary, /\| Arc \| A named ordered sequence/);
    const definitions = source => source.split('\n').filter(line => line.startsWith('|'));
    assert.deepEqual(definitions(fs.readFileSync(path.join(__dirname, '../.openclaw/skills/plan-execution/references/glossary.md'), 'utf8')), definitions(glossary));
    fs.writeFileSync(path.join(root, sprintPath), fs.readFileSync(path.join(root, sprintPath), 'utf8').replaceAll('### [ ]', '### [DONE]'));
    assert.equal(status().complete, false);
    assert.deepEqual(status().vector, [1, 1, 1, 1, 1, 1]);
    fs.writeFileSync(path.join(root, sprintPath), fs.readFileSync(path.join(root, sprintPath), 'utf8').replaceAll('### [DONE]', '### [ ]'));
  });
  await t.test('Step 2: frozen assignment and candidate delivery never discharge', () => {
    const graph = campaignGraph(root, 'pilot');
    const assignment = withLedgerLock(root, 'pilot', environment, ledger => {
      const assignment = reserveAssignment(ledger, 'pilot', null, graph);
      assignment.worktree = root; assignment.sessionId = 'worker'; assignment.branch = 'main'; assignment.state = 'ACTIVE';
      return { ...assignment, planPath: graph.plans[0].path };
    });
    const binding = readLedger(root, 'pilot', environment).obligationAssignments[0];
    fs.writeFileSync(path.join(root, 'src.txt'), 'Delivered authorized behavior');
    git(root, ['add', 'src.txt']); git(root, ['commit', '-m', 'Authorized fixture work']);
    const delivery = { schemaVersion: 2, bindingId: binding.id, revision: git(root, ['rev-parse', 'HEAD']), evidencePaths: [proofPath], obligationIds: ['OBL-1'], predecessorId: 'CP1', changedPaths: ['src.txt'] };
    recordWorkerDelivery(root, 'pilot', assignment, delivery, environment);
    assert.deepEqual(status().vector, [1, 1, 1, 1, 1, 1]);
    assert.throws(() => recordWorkerDelivery(root, 'pilot', assignment, { ...delivery, changedPaths: ['other.txt'] }, environment));
  });
  await t.test('Step 3: bounded neutral preparation and honest productive downstream growth', () => {
    let candidate = read();
    checkpoint(candidate, 'neutral', ['OBL-1'], [], [1, 1, 1, 1, 1, 1], { preparation: { obligationId: 'OBL-1', operations: ['inspect'], deliverable: 'Complete scoped UAT assessment' } });
    publish(candidate);
    candidate = read();
    checkpoint(candidate, 'neutral', ['OBL-1'], [], [1, 1, 1, 1, 1, 1], { preparation: { deliverable: 'Complete scoped UAT assessment', operations: ['inspect'], obligationId: 'OBL-1' } });
    publish(candidate, false);
    candidate = read();
    candidate.obligations.push({ ...structuredClone(candidate.obligations[1]), id: 'OBL-7', responsibilityId: 'Discovered integration responsibility', condition: 'Executable newly discovered Arc', criterion: 'Inspected actual scoped executable path' });
    candidate.baselines[0].obligationIds.push('OBL-7');
    const certificateId = certify(candidate, 'OBL-1');
    checkpoint(candidate, 'productive', ['OBL-1'], [certificateId], [0, 2, 1, 1, 1, 1], { registeredIds: ['OBL-7'] });
    publish(candidate);
    assert.equal(status().selectedId, 'OBL-2');
    assert.deepEqual(status().vector, [0, 2, 1, 1, 1, 1]);
    publish(candidate, false);
  });
  await t.test('Step 4: complete inventories and no-edit assessments reach zero', () => {
    for (const id of ['OBL-2', 'OBL-7', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6']) {
      const candidate = read();
      const vector = [...status().vector];
      const categoryIndex = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'].indexOf(candidate.obligations.find(item => item.id === id).category);
      vector[categoryIndex]--;
      checkpoint(candidate, 'productive', [id], [certify(candidate, id)], vector);
      publish(candidate);
    }
    assert.equal(status().complete, true);
    assert.deepEqual(status().vector, [0, 0, 0, 0, 0, 0]);
  });
  await t.test('Step 5: stale inputs reopen original identities and require disturbance', () => {
    fs.writeFileSync(path.join(root, proofPath), 'Changed assessment input invalidates previous certificates');
    assert.equal(status().complete, false);
    assert.equal(status().selectedId, 'OBL-1');
    const invalid = read();
    checkpoint(invalid, 'productive', ['OBL-1'], [certify(invalid, 'OBL-1')], [0, 2, 1, 1, 1, 1]);
    publish(invalid, false);
    const candidate = read();
    checkpoint(candidate, 'disturbance', [], [], [1, 2, 1, 1, 1, 1], { invalidatedIds: candidate.certificates.map(item => item.id) });
    publish(candidate);
    assert.equal(read().obligations[0].id, 'OBL-1');
    const falseZero = read(); falseZero.baselines[0].obligationIds.pop(); publish(falseZero, false);
  });
  await t.test('Step 6: activated successor preserves IDs and old unresolved history', () => {
    const before = read();
    const invalid = structuredClone(before); invalid.baselines[0].requirements[0].digest = 'f'.repeat(64); publish(invalid, false);
    const candidate = read();
    candidate.baselines.push({ ...structuredClone(candidate.baselines[0]), id: 'B2', predecessorId: 'B1', authority: { references: ['approved-CHNG', 'activated-amendment'], assessors: ['coordinator'] } });
    checkpoint(candidate, 'rebaseline', [], [], [1, 2, 1, 1, 1, 1], { registeredIds: [...candidate.baselines[1].obligationIds] });
    publish(candidate);
    assert.deepEqual(read().obligations, before.obligations);
    assert.deepEqual(read().checkpoints.slice(0, -1), before.checkpoints);
    assert.equal(status().baselineId, 'B2');
    const reused = read(); reused.obligations.push(structuredClone(reused.obligations[0])); publish(reused, false);
  });
});
