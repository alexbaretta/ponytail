#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getPonytailInstructions } = require('../hooks/ponytail-instructions');

const root = path.join(__dirname, '..');
const glossaryPath = 'skills/plan-execution/references/glossary.md';

// Traceability: verifies REQ-PONYTAIL-GLOSSARY
test('shared vocabulary resolves from each owner and generated resource', () => {
  const glossary = fs.readFileSync(path.join(root, glossaryPath), 'utf8');
  for (const name of ['requirements', 'user-acceptance-testing', 'requirements-traceability',
    'issue-tracking', 'plan-execution', 'production-test-boundaries']) {
    const sourcePath = path.join(root, 'skills', name, 'SKILL.md');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const reference = source.match(/\[Ponytail glossary\]\(([^)]+)\)/);
    assert.ok(reference, `missing vocabulary reference: ${name}`);
    assert.equal(path.resolve(path.dirname(sourcePath), reference[1]), path.join(root, glossaryPath));
  }
  const generated = fs.readFileSync(path.join(root,
    '.openclaw/skills/plan-execution/references/glossary.md'), 'utf8');
  assert.equal(generated.replace(/\s+/gu, ' '),
    glossary.replace(/^Traceability:.*$/gmu, '').replace(/\s+/gu, ' '));
  for (const mode of ['off', 'lite', 'full', 'ultra']) {
    assert.match(getPonytailInstructions(mode), /references\/glossary\.md/);
  }
  const terms = glossary.split('\n').filter(line => /^\| [A-Z]/.test(line))
    .map(line => line.split('|')[1].trim());
  assert.equal(new Set(terms).size, terms.length, 'ambiguous duplicate glossary term');
  for (const term of ['Requirement', 'Acceptance', 'Obligation', 'Plan', 'Sprint',
    'Tasklet', 'Worker assignment', 'Certificate', 'Suite', 'Arc', 'Step']) {
    assert.ok(terms.includes(term), `missing shared concept: ${term}`);
  }
});
