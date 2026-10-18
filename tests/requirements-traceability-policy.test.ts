// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {discoverTraceabilitySource} from '../skills/requirements-traceability/scripts/traceability-discovery.js';
import {validateTraceabilityGraph} from '../skills/requirements-traceability/scripts/traceability-graph.js';

const root = path.resolve(__dirname,'../..');
const skill = fs.readFileSync(path.join(root,'skills/requirements-traceability/SKILL.md'),'utf8');

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SKILL-GRAPH-EXAMPLES
test('published graph examples compose a valid graph using the actual discovery parser', () => {
 const examples = [...skill.matchAll(/```(markdown|typescript)\n([\s\S]*?)\n```/gu)];
 assert.equal(examples.length,3);
 const requirement = examples[0]?.[2];
 const acceptance = examples[1]?.[2];
 const typescript = examples[2]?.[2];
 assert.ok(requirement && acceptance && typescript);
 const testStart = typescript.indexOf('// Traceability: verifies');
 assert.ok(testStart > 0);
 const discoveries = [
  discoverTraceabilitySource({kind:'markdown',path:'pm/requirements/order.md',text:requirement}),
  discoverTraceabilitySource({kind:'markdown',path:'pm/uat/order.md',text:acceptance}),
  discoverTraceabilitySource({kind:'implementation',path:'src/order.ts',text:typescript.slice(0,testStart)}),
  discoverTraceabilitySource({kind:'unit-test',path:'test/order.ts',text:typescript.slice(testStart)}),
 ];
 assert.deepEqual(discoveries.flatMap(item => item.findings),[]);
 assert.deepEqual(validateTraceabilityGraph({entities:discoveries.flatMap(item => item.graph.entities),relationships:discoveries.flatMap(item => item.graph.relationships)}),[]);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SKILL-COVERAGE-BOUNDARY
test('V5 instructions separate executable acceptance coverage, adequacy and legacy semantics', () => {
 assert.match(skill,/Every acceptance needs an\nidentified executable unit test or integration test/);
 assert.match(skill,/second acceptance\nwithout a test must remain a gap/);
 assert.match(skill,/Unknown adequacy remains\nunresolved/);
 assert.match(skill,/implementation passes those\ntests/);
 assert.match(skill,/TSTS owns only semantic TypeScript locators/);
 const legacy = fs.readFileSync(path.join(root,'skills/requirements-traceability/references/legacy-graph.md'),'utf8');
 assert.match(legacy,/legacy green result cannot\nprove that every acceptance has an executable test/);
 for (const match of skill.matchAll(/\]\(([^)]+\.md)\)/gu)) {
  const relative = match[1];
  assert.ok(relative);
  assert.ok(fs.existsSync(path.resolve(root,'skills/requirements-traceability',relative)),relative);
 }
});
