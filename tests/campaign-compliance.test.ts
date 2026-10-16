// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(__dirname,'../..');
const read = (relative:string):string => fs.readFileSync(path.join(root,relative),'utf8');

// Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL
test('OBL-114: canonical vocabulary defines actors and atomic delivery boundaries',()=>{
 const glossary = read('skills/plan-execution/references/glossary.md');
 for (const term of ['Obligation','Acceptance','Worker','Coordinator','Tasklet','Arc','Step'])
  assert.match(glossary,new RegExp(`\\| ${term} \\|`));
 assert.match(glossary,/smallest independently verifiable functional condition/);
 assert.match(glossary,/coherent integration/);
});

// Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL
test('OBL-115: coordinator procedure owns graph, scheduling and publication decisions',()=>{
 const procedure = read('skills/plan-execution/references/rolling-campaigns.md');
 for (const operation of ['init','reconcile','status','next-actions','replenish','submit','request-review','record-review','integrate','accept','freeze-publication',
  'prepare-publication','run-publication-qa','publish-mainline','synchronize-campaign'])
  assert.ok(procedure.includes(operation),`missing coordinator operation: ${operation}`);
 for (const field of ['coordinatorRoot','documentPath','bindingsPath','bindingHistory','incrementRef','maxActiveWorkers','publicationSize'])
  assert.ok(procedure.includes(field),`missing initialization field: ${field}`);
 assert.match(procedure,/worker copies are not/);
 assert.match(procedure,/do not recreate scheduling policy/);
});

// Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL
test('OBL-116: rolling workers progress autonomously with explicit authority boundaries',()=>{
 const skill = read('skills/plan-execution/SKILL.md');
 const procedure = read('skills/plan-execution/references/rolling-campaigns.md');
 assert.match(skill,/references\/rolling-campaigns\.md/);
 assert.doesNotMatch(skill,/Every long-lived plan uses one execution path/);
 assert.match(skill,/Plans using the legacy serial selectors use one execution path/);
 for (const invariant of [/Implement autonomously/,/Do not request\s+routine implementation approvals/,
  /review the aggregate\s+final-state changes once/,/Correct findings autonomously and return the corrected exact candidate/,
  /Workers never publish to mainline/,/Report unknown prerequisites/]) assert.match(procedure,invariant);
});
