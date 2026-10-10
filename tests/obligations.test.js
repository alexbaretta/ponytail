// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const test = require('node:test');
const { readObligationDocumentV1, parseObligationDocument } = require('../skills/plan-execution/scripts/obligations');

function obligationDocument() {
  return {
    schemaVersion: 1, scopeId: 'pilot',
    baselines: [{ id: 'B1', predecessorId: null,
      authority: { references: ['approved-CHNG'], assessors: ['coordinator'] },
      requirements: [{ id: 'REQ-TEST', path: 'requirement.md', digest: 'a'.repeat(64) }],
      obligationIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'],
      inventoryIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'] }],
    obligations: ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'].map((category, index) => ({
      id: `OBL-${index + 1}`, category, requirementIds: ['REQ-TEST'],
      responsibilityId: `${category}-inventory`, condition: `Inventory ${category} responsibilities`,
      criterion: 'Inspected sources, justified exclusions and complete enumeration',
      dependsOn: [], acceptanceGroups: ['pilot'], supersedes: null,
      execution: { sprintId: null, taskletIds: [], plannedPaths: [], operations: ['inspect'] },
    })), certificates: [], checkpoints: [],
  };
}

// Traceability: verifies REQ-OBLIGATION-IDENTITY
// Traceability: verifies REQ-OBLIGATION-BASELINE
// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('V1 boundary rejects unknown fields, broken identities, references and cycles', () => {
  const document = obligationDocument();
  assert.equal(readObligationDocumentV1(document), document);
  const corruptions = [
    value => { value.schemaVersion = 2; },
    value => { value.status = 'DONE'; },
    value => { value.obligations[0].status = 'DONE'; },
    value => { value.obligations[0].id = 'OBL-0'; },
    value => { value.obligations[1].id = 'OBL-1'; },
    value => { value.obligations[0].dependsOn = ['OBL-999']; },
    value => { value.obligations[0].dependsOn = ['OBL-2']; value.obligations[1].dependsOn = ['OBL-1']; },
    value => { value.obligations[0].supersedes = 'OBL-2'; },
    value => { value.baselines[0].inventoryIds.pop(); },
    value => { value.baselines[0].authority.assessors = []; },
    value => { value.baselines[0].requirements[0].path = '../outside.md'; },
    value => { value.obligations[0].execution.taskletIds = ['S01-F01-T01']; },
  ];
  for (const corrupt of corruptions) {
    const value = structuredClone(document);
    corrupt(value);
    assert.throws(() => readObligationDocumentV1(value));
  }
});

test('owned JSON boundary rejects lossy number tokens before normalization', () => {
  const text = JSON.stringify(obligationDocument());
  assert.deepEqual(parseObligationDocument(text), obligationDocument());
  for (const token of ['9007199254740992', '9007199254740993', '1.0', '1e0', '-1']) {
    assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', `"schemaVersion":${token}`)), /unsupported JSON number/);
  }
  assert.throws(() => parseObligationDocument(text.replace('"schemaVersion":1', '"schemaVersion":9007199254740991')), /unsupported obligation document schemaVersion/);
});
