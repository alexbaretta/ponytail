// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateTraceabilityGraph, type TraceabilityGraph, type TraceabilityGraphEntity} from '../skills/requirements-traceability/scripts/traceability-graph.js';

function completeGraph(testKind: 'unit-test' | 'integration-test' = 'unit-test'): TraceabilityGraph {
 return {
  entities: [
   {id:'REQ-A', kind:'requirement', path:'pm/requirements/a.md', line:1},
   {id:'OBL-A', kind:'obligation', path:'pm/requirements/a.md', line:3},
   {id:'ACC-A', kind:'acceptance', path:'pm/uat/a.md', line:1},
   {id:'TEST-A', kind:testKind, path:'tests/a.ts', line:3},
   {id:'CODE-A', kind:'implementation', path:'src/a.ts', line:3},
  ],
  relationships: [
   {source:'OBL-A', role:'decomposes', target:'REQ-A'},
   {source:'ACC-A', role:'verifies', target:'OBL-A'},
   {source:'TEST-A', role:'verifies', target:'ACC-A'},
   {source:'CODE-A', role:'implements', target:'OBL-A'},
  ],
 };
}

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-GRAPH-TEST-LAYERS
test('unit-only and integration-only graphs both provide structural coverage', () => {
 for (const kind of ['unit-test', 'integration-test'] as const) {
  const traceabilityGraph: TraceabilityGraph = completeGraph(kind);
  assert.deepEqual(validateTraceabilityGraph(traceabilityGraph), []);
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-GRAPH-UNCOVERED-ACCEPTANCE
test('a second acceptance cannot borrow the first acceptance test', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  entities:[...originalTraceabilityGraph.entities, {id:'ACC-B',kind:'acceptance',path:'pm/uat/a.md',line:7}],
  relationships:[...originalTraceabilityGraph.relationships, {source:'ACC-B',role:'verifies',target:'OBL-A'}],
 };
 assert.deepEqual(validateTraceabilityGraph(traceabilityGraph), [{code:'missing-test',id:'ACC-B',path:'pm/uat/a.md',line:7,message:'Acceptance ACC-B has no executable test'}]);
 const coveredTraceabilityGraph: TraceabilityGraph = {
  ...traceabilityGraph,
  relationships:[...traceabilityGraph.relationships,{source:'TEST-A',role:'verifies',target:'ACC-B'}],
 };
 assert.deepEqual(validateTraceabilityGraph(coveredTraceabilityGraph), []);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-MANY-TO-MANY
test('multiple obligations can share adequate acceptance, test and code relationships', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  entities:[...originalTraceabilityGraph.entities,{id:'OBL-B',kind:'obligation',path:'pm/requirements/a.md',line:7}],
  relationships:[...originalTraceabilityGraph.relationships,
   {source:'OBL-B',role:'decomposes',target:'REQ-A'},
   {source:'ACC-A',role:'verifies',target:'OBL-B'},
   {source:'CODE-A',role:'implements',target:'OBL-B'},
  ],
 };
 assert.deepEqual(validateTraceabilityGraph(traceabilityGraph), []);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-DUPLICATE
test('duplicate identities cannot contribute coverage through an ambiguous declaration', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  ...originalTraceabilityGraph,
  entities:[...originalTraceabilityGraph.entities,{id:'TEST-A',kind:'unit-test',path:'tests/b.ts',line:1}],
 };
 const findings = validateTraceabilityGraph(traceabilityGraph);
 assert.ok(findings.some(finding => finding.code === 'duplicate-id' && finding.id === 'TEST-A'));
 assert.ok(findings.some(finding => finding.code === 'missing-test' && finding.id === 'ACC-A'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-ENDPOINTS
test('unknown endpoints are diagnosed and do not create coverage', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  ...originalTraceabilityGraph,
  relationships:originalTraceabilityGraph.relationships.map(relationship => relationship.source === 'TEST-A'
   ? {...relationship,target:'ACC-MISSING'} : relationship),
 };
 const danglingTraceabilityGraph: TraceabilityGraph = {
  ...traceabilityGraph,
  relationships:[...traceabilityGraph.relationships,{source:'TEST-MISSING',role:'verifies',target:'ACC-A'}],
 };
 const findings = validateTraceabilityGraph(danglingTraceabilityGraph);
 assert.ok(findings.some(finding => finding.code === 'dangling-source' && finding.id === 'TEST-MISSING'));
 assert.ok(findings.some(finding => finding.code === 'dangling-target' && finding.id === 'TEST-A'));
 assert.ok(findings.some(finding => finding.code === 'missing-test' && finding.id === 'ACC-A'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-WRONG-EDGE
test('direct requirement annotations and wrong-kind edges do not satisfy the new graph', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  ...originalTraceabilityGraph,
  relationships:originalTraceabilityGraph.relationships.map(relationship => relationship.source === 'CODE-A' || relationship.source === 'TEST-A'
   ? {...relationship,target:'REQ-A'} : relationship),
 };
 const findings = validateTraceabilityGraph(traceabilityGraph);
 assert.equal(findings.filter(finding => finding.code === 'invalid-edge').length, 2);
 assert.ok(findings.some(finding => finding.code === 'missing-test' && finding.id === 'ACC-A'));
 assert.ok(findings.some(finding => finding.code === 'missing-implementation' && finding.id === 'OBL-A'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-ORPHANS
test('declared but disconnected entities remain visible as gaps', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {...originalTraceabilityGraph,relationships:[]};
 const findings = validateTraceabilityGraph(traceabilityGraph);
 assert.deepEqual(findings.filter(finding => finding.code === 'missing-parent').map(finding => finding.id).sort(), ['ACC-A','CODE-A','OBL-A','TEST-A']);
 assert.equal(findings.filter(finding => finding.code !== 'missing-parent').length, 4);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-INVENTORY-ORDER
test('finding order is stable across inventory and relationship traversal order', () => {
 const traceabilityGraphEntity: TraceabilityGraphEntity = {id:'ACC-B',kind:'acceptance',path:'pm/uat/b.md',line:1};
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {...originalTraceabilityGraph,entities:[...originalTraceabilityGraph.entities,traceabilityGraphEntity],relationships:[]};
 const reversedTraceabilityGraph: TraceabilityGraph = {entities:[...traceabilityGraph.entities].reverse(),relationships:[...traceabilityGraph.relationships].reverse()};
 assert.deepEqual(validateTraceabilityGraph(traceabilityGraph),validateTraceabilityGraph(reversedTraceabilityGraph));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-GRAPH-AMBIGUOUS-ORDER
test('duplicate locators and conflicting kinds produce deterministic findings', () => {
 const originalTraceabilityGraph: TraceabilityGraph = completeGraph();
 const traceabilityGraph: TraceabilityGraph = {
  entities:[...originalTraceabilityGraph.entities,
   {id:'TEST-A',kind:'requirement',path:'pm/requirements/conflict.md',line:5},
   {id:'ACC-A',kind:'acceptance',path:'pm/uat/duplicate.md',line:2},
  ],
  relationships:[...originalTraceabilityGraph.relationships,{source:'TEST-A',role:'verifies',target:'MISSING'}],
 };
 const reversedTraceabilityGraph: TraceabilityGraph = {entities:[...traceabilityGraph.entities].reverse(),relationships:[...traceabilityGraph.relationships].reverse()};
 assert.deepEqual(validateTraceabilityGraph(traceabilityGraph),validateTraceabilityGraph(reversedTraceabilityGraph));
 assert.equal(validateTraceabilityGraph(traceabilityGraph).filter(finding => finding.code === 'duplicate-id').length,2);
});
