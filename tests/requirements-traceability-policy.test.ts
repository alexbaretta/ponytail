// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(__dirname,'../..');
const skill = fs.readFileSync(path.join(root,'skills/requirements-traceability/SKILL.md'),'utf8');

function tableRows(heading: string): readonly (readonly string[])[] {
 const section = skill.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`,'u'))?.[1];
 assert.ok(section,heading);
 return [...section.matchAll(/^\|([^\n]+)\|$/gmu)]
  .slice(2)
  .map(match => match[1]?.split('|').map(cell => cell.trim()) ?? []);
}

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SKILL-GRAPH-EXAMPLES
test('expanded ontology and graph remain complete and source-owned', () => {
 const kinds = tableRows('Canonical records').map(row => row[0]);
 assert.deepEqual(kinds,[
  'Requirement','Obligation','Constraint','Invariant','Structure',
  'Component','Acceptance','Test','Implementation',
 ]);

 const graph = tableRows('Canonical graph').map(row => row.slice(0,3));
 assert.deepEqual(graph,[
  ['Obligation','`decomposes`','Requirement'],
  ['Structure element','`satisfies`','Requirement'],
  ['Component','`refines`','Structure element'],
  ['Component element','`realizes`','Obligation'],
  ['Invariant','`specializes`','Constraint'],
  ['Component','`governed-by`','Invariant'],
  ['Acceptance','`verifies`','Obligation'],
  ['Unit or integration test','`verifies`','Acceptance or Invariant'],
  ['Implementation','`implements`','Component element'],
  ['Implementation','`upholds`','Invariant'],
 ]);
 assert.match(skill,/Each relationship is declared beside its source/);
 assert.match(skill,/A component owns its\nidentified elements and declares which invariants govern it/);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SKILL-COVERAGE-BOUNDARY
test('expanded compliance instructions preserve evidence and scope gates', () => {
 assert.match(skill,/\*\*Structural:\*\*/);
 assert.match(skill,/\*\*Executional:\*\*/);
 assert.match(skill,/\*\*Semantic:\*\*/);
 assert.match(skill,/F \| \(Cn, R, S, O, Cm, In, A, T, Im\)/);
 assert.match(skill,/Every revision must have `F = 0`/);
 assert.match(skill,/Every integration into a shared line must leave the baseline vector zero/);
 assert.match(skill,/Every release must have a zero baseline vector and make all in-flight behavior\n  unreachable/);
 assert.match(skill,/A correction creates a new assessment naming the one it\nsupersedes/);
 assert.match(skill,/Earlier traceability configurations retain their documented meanings/);
 for (const match of skill.matchAll(/\]\(([^)]+\.md)\)/gu)) {
  const relative = match[1];
  assert.ok(relative);
  assert.ok(fs.existsSync(path.resolve(root,'skills/requirements-traceability',relative)),relative);
 }
});
