// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {discoverTraceabilitySource, type TraceabilitySource} from '../skills/requirements-traceability/scripts/traceability-discovery.js';
import {validateTraceabilityGraph, type TraceabilityGraph} from '../skills/requirements-traceability/scripts/traceability-graph.js';

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-EXPLICIT-KIND
test('explicit Markdown kinds preserve IDs without interpreting their prefixes', () => {
 const discovery = discoverTraceabilitySource({kind:'markdown',path:'pm/requirements/a.md',text:[
  '## requirement ACC-LOGIN: existing requirement identity',
  '## obligation LOGIN-ATOMIC: atomic condition',
  'Traceability: decomposes ACC-LOGIN from obligation LOGIN-ATOMIC',
  '## acceptance REQ-LOGIN-CHECK: existing acceptance identity',
  'Traceability: verifies LOGIN-ATOMIC from acceptance REQ-LOGIN-CHECK',
  '**Identifier:** `GWEN-IDENTITY`',
  '```markdown',
  '## requirement ACC-EXAMPLE',
  '```',
 ].join('\n')});
 assert.deepEqual(discovery.findings, []);
 assert.deepEqual(discovery.graph.entities.map(({id,kind}) => ({id,kind})), [
  {id:'ACC-LOGIN',kind:'requirement'},
  {id:'LOGIN-ATOMIC',kind:'obligation'},
  {id:'REQ-LOGIN-CHECK',kind:'acceptance'},
  {id:'GWEN-IDENTITY',kind:'requirement'},
 ]);
 assert.deepEqual(discovery.graph.relationships, [
  {source:'LOGIN-ATOMIC',role:'decomposes',target:'ACC-LOGIN'},
  {source:'REQ-LOGIN-CHECK',role:'verifies',target:'LOGIN-ATOMIC'},
 ]);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-DISCOVER-UNREFERENCED
test('source discovery inventories an acceptance with no incoming test marker', () => {
 const traceabilitySource: TraceabilitySource = {kind:'markdown',path:'pm/uat/a.md',text:[
  '## ACC-A',
  'Traceability: verifies OBL-A from acceptance ACC-A',
  '## ACC-UNTESTED',
  'Traceability: verifies OBL-A from acceptance ACC-UNTESTED',
 ].join('\n')};
 const discovery = discoverTraceabilitySource(traceabilitySource);
 assert.deepEqual(discovery.findings, []);
 assert.deepEqual(discovery.graph.entities.map(entity => entity.id), ['ACC-A','ACC-UNTESTED']);
 assert.ok(validateTraceabilityGraph(discovery.graph).some(finding => finding.id === 'ACC-UNTESTED' && finding.code === 'missing-test'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-MARKDOWN
test('canonical Markdown declarations are distinct from references and fenced examples', () => {
 const traceabilitySource: TraceabilitySource = {kind:'markdown',path:'pm/requirements/a.md',text:[
  '**Identifier:** `REQ-A`',
  'This prose mentions REQ-INCIDENTAL and ACC-INCIDENTAL.',
  '### OBL-A: condition',
  'Traceability: decomposes REQ-A from obligation OBL-A',
  '- **REQ-B**: another requirement',
  '1. **REQ-C**: numbered declaration',
  '+ **REQ-D:** plus declaration',
  '~~~~markdown',
  '## ACC-EXAMPLE',
  '```',
  'Traceability: verifies OBL-A from acceptance ACC-EXAMPLE',
  '~~~~',
  '    ## ACC-INDENTED-EXAMPLE',
 ].join('\n')};
 const discovery = discoverTraceabilitySource(traceabilitySource);
 assert.deepEqual(discovery.findings, []);
 assert.deepEqual(discovery.graph.entities.map(entity => entity.id), ['REQ-A','OBL-A','REQ-B','REQ-C','REQ-D']);
 assert.deepEqual(discovery.graph.relationships,[{source:'OBL-A',role:'decomposes',target:'REQ-A'}]);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-CONTAINER-FENCES
test('list and quoted fenced examples cannot hide subsequent real acceptance declarations', () => {
 for (const text of [
  '- ```markdown\n  ## ACC-EXAMPLE\n  Traceability: verifies OBL-A from acceptance ACC-EXAMPLE\n  ```\n\n## ACC-REAL',
  '1. ~~~markdown\n   ## ACC-EXAMPLE\n   ~~~\n\n## ACC-REAL',
  '> ```markdown\n> ## ACC-EXAMPLE\n> ```\n\n## ACC-REAL',
  '> ```markdown\n> ## ACC-EXAMPLE\n\n## ACC-REAL',
  '- ```markdown\n  ## ACC-EXAMPLE\n\n## ACC-REAL',
  '- Example:\n  ```markdown\n  ## ACC-EXAMPLE\n\n## ACC-REAL',
  '```markdown\n- ```\n## ACC-EXAMPLE\n```\n\n## ACC-REAL',
  '```markdown\n> ```\n## ACC-EXAMPLE\n```\n\n## ACC-REAL',
  '> ```markdown\n> > ```\n> ## ACC-EXAMPLE\n> ```\n\n## ACC-REAL',
  '- ```markdown\n  - ```\n  ## ACC-EXAMPLE\n  ```\n\n## ACC-REAL',
 ]) {
  const traceabilitySource: TraceabilitySource = {kind:'markdown',path:'pm/uat/a.md',text};
  const discovery = discoverTraceabilitySource(traceabilitySource);
  assert.deepEqual(discovery.findings, []);
  assert.deepEqual(discovery.graph.entities.map(entity => entity.id), ['ACC-REAL']);
 }
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-CODE-IDENTITY
test('adjacent relationships share one code identity but separate declarations remain duplicates', () => {
 const traceabilitySource: TraceabilitySource = {kind:'implementation',path:'src/a.ts',text:[
  '// Traceability: implements OBL-A from implementation doWork',
  '// Traceability: implements OBL-B from implementation doWork',
  'function doWork() {}',
  '// Traceability: implements OBL-A from implementation doWork',
  'function otherWork() {}',
 ].join('\n')};
 const discovery = discoverTraceabilitySource(traceabilitySource);
 assert.deepEqual(discovery.findings, []);
 assert.equal(discovery.graph.entities.length,2);
 assert.equal(discovery.graph.relationships.length,3);
 assert.ok(validateTraceabilityGraph(discovery.graph).some(finding => finding.code === 'duplicate-id'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-LEGACY-MARKER
test('legacy implicit identities and malformed markers cannot silently supply coverage', () => {
 const traceabilitySource: TraceabilitySource = {kind:'unit-test',path:'tests/a.ts',text:'// Traceability: verifies REQ-A\ntest("old test", () => {});'};
 const discovery = discoverTraceabilitySource(traceabilitySource);
 assert.deepEqual(discovery.graph,{entities:[],relationships:[]});
 assert.deepEqual(discovery.findings.map(finding => finding.code),['malformed-marker','missing-declaration']);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-KIND
test('source classification and Markdown declaration kind must agree with marker source', () => {
 const codeTraceabilitySource: TraceabilitySource = {kind:'unit-test',path:'tests/a.ts',text:'// Traceability: implements OBL-A from implementation fn'};
 assert.ok(discoverTraceabilitySource(codeTraceabilitySource).findings.some(finding => finding.code === 'unexpected-kind'));
 const markdownTraceabilitySource: TraceabilitySource = {kind:'markdown',path:'pm/uat/a.md',text:'## ACC-A\nTraceability: verifies OBL-A from obligation ACC-A'};
 const discovery = discoverTraceabilitySource(markdownTraceabilitySource);
 assert.equal(discovery.graph.relationships.length,0);
 assert.equal(discovery.findings[0]?.code,'missing-declaration');
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-CROSS-FILE
test('discovered Markdown and executable declarations compose into the four-edge graph', () => {
 const traceabilitySources: readonly TraceabilitySource[] = [
  {kind:'markdown',path:'pm/requirements/a.md',text:'## REQ-A\n### OBL-A\nTraceability: decomposes REQ-A from obligation OBL-A'},
  {kind:'markdown',path:'pm/uat/a.md',text:'## ACC-A\nTraceability: verifies OBL-A from acceptance ACC-A'},
  {kind:'integration-test',path:'tests/a.ts',text:'// Traceability: verifies ACC-A from integration-test TEST-A\ntest("behavior", () => {});'},
  {kind:'implementation',path:'src/a.ts',text:'// Traceability: implements OBL-A from implementation doWork\nfunction doWork() {}'},
 ];
 const discoveries = traceabilitySources.map(discoverTraceabilitySource);
 assert.deepEqual(discoveries.flatMap(discovery => discovery.findings), []);
 const traceabilityGraph: TraceabilityGraph = {
  entities:discoveries.flatMap(discovery => discovery.graph.entities),
  relationships:discoveries.flatMap(discovery => discovery.graph.relationships),
 };
 assert.deepEqual(validateTraceabilityGraph(traceabilityGraph), []);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-JSON
test('JSON annotations belong to their actual object and preserve source lines', () => {
 const traceabilitySource: TraceabilitySource = {kind:'implementation',path:'ponytail.json',text:[
  '{"inputs":[',
  ' {"path":"terms.md","traceability":[',
  '  "Traceability: implements OBL-A from implementation legalInput",',
  '  "Traceability: implements OBL-B from implementation legalInput"]},',
  ' {"path":"privacy.md","traceability":["Traceability: implements OBL-A from implementation privacyInput"]}',
  '],"description":"Traceability: implements OBL-C from implementation fake"}',
 ].join('\n')};
 const discovery = discoverTraceabilitySource(traceabilitySource);
 assert.deepEqual(discovery.findings,[]);
 assert.deepEqual(discovery.graph.entities.map(entity => [entity.id,entity.line]),[['legalInput',3],['privacyInput',5]]);
 assert.deepEqual(discovery.graph.relationships.map(edge => edge.target),['OBL-A','OBL-B','OBL-A']);
 const duplicate = discoverTraceabilitySource({...traceabilitySource,text:traceabilitySource.text.replace('privacyInput','legalInput')});
 assert.ok(validateTraceabilityGraph(duplicate.graph).some(finding => finding.code === 'duplicate-id'));
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-JSON-BOUNDARIES
test('JSON discovery rejects duplicate properties, malformed annotations and fake test declarations', () => {
 for (const text of [
  '{"traceability":[],"traceability":[]}',
  '{"x":1,"x":2}',
  '{"x":1,"x":1,"traceability":["Traceability: implements OBL-A from implementation invalid"]}',
  '{"traceability":["Traceability: implements OBL-A from implementation invalid"],"traceability":["Traceability: implements OBL-A from implementation invalid"]}',
  '{"traceability":"Traceability: implements OBL-A from implementation bad"}',
  '{"traceability":[1]}',
  '{"traceability":["Traceability: implements OBL-A from unit-test fake"]}',
  '{"traceability":["Traceability: implements OBL-A from implementation a\\n// Traceability: implements OBL-B from implementation b"]}',
  '{"traceability":["// Traceability: implements OBL-A from implementation bad"]}',
  '{"traceability":["Traceability: implements OBL-A from implementation invalid"] unquoted: true}',
 ]) {
  const traceabilitySource: TraceabilitySource = {kind:'implementation',path:'a.json',text};
  const discovery = discoverTraceabilitySource(traceabilitySource);
  assert.ok(discovery.findings.length > 0,text);
  assert.deepEqual(discovery.graph.entities,[],text);
  assert.deepEqual(discovery.graph.relationships,[],text);
 }

});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-JSONC
test('JSONC configuration preserves existing comment annotations alongside structured declarations', () => {
 for (const file of ['scripts/tsconfig.traceability-component.json','settings.jsonc']) {
  const traceabilitySource: TraceabilitySource = {kind:'implementation',path:file,text:[
   '{',
   ' /* Configuration copyright */',
   ' // Traceability: implements OBL-INT-033-GRAPH from implementation traceabilityComponentStaticConfiguration',
   ' "extends": "../tsconfig.unit-tests.json",',
   ' "traceability": ["Traceability: implements OBL-A from implementation structuredInput"],',
   ' "largeNumber": 123456789012345678901234567890,',
   '}',
  ].join('\n')};
  const discovery = discoverTraceabilitySource(traceabilitySource);
  assert.deepEqual(discovery.findings,[]);
  assert.deepEqual(discovery.graph.entities.map(entity => [entity.id,entity.line]),[['traceabilityComponentStaticConfiguration',3],['structuredInput',5]]);
  assert.deepEqual(discovery.graph.relationships.map(edge => edge.target),['OBL-INT-033-GRAPH','OBL-A']);
 }
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-DISCOVER-JSON-ARC
test('configured executable JSON preserves test declarations without granting implementation-kind test coverage', () => {
 const text = '{"traceability":["Traceability: verifies ACC-A from integration-test TEST-LEGAL-SEED"],"steps":[]}';
 const discovery = discoverTraceabilitySource({kind:'integration-test',path:'arcs/legal-seed.json',text});
 assert.deepEqual(discovery.findings,[]);
 assert.deepEqual(discovery.graph.entities,[{id:'TEST-LEGAL-SEED',kind:'integration-test',path:'arcs/legal-seed.json',line:1}]);
 assert.deepEqual(discovery.graph.relationships,[{source:'TEST-LEGAL-SEED',target:'ACC-A',role:'verifies'}]);
 const rejected = discoverTraceabilitySource({kind:'implementation',path:'configuration.json',text});
 assert.ok(rejected.findings.some(finding => finding.code === 'unexpected-kind'));
 assert.deepEqual(rejected.graph.entities,[]);
 assert.deepEqual(rejected.graph.relationships,[]);
});
