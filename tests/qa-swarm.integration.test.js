#!/usr/bin/env node
// Traceability: verifies REQ-QA-SWARM

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readRegistry } = require('../scripts/registry');
const { render, outPath } = require('../scripts/build-openclaw-skills');
const { rollingCommandDefinitions } = require('../src/rolling-cli-registry');
const { readObligationEvidence } = require('../skills/plan-execution/scripts/obligations');

const skillPath = path.join(__dirname, '..', 'skills', 'qa-swarm', 'SKILL.md');
const skill = fs.readFileSync(skillPath, 'utf8');

test('QA swarm is registered and its generated distribution is canonical', () => {
  const entry = readRegistry().find(
    candidate => candidate.kind === 'skill' && candidate.name === 'qa-swarm',
  );
  assert.ok(entry);
  assert.equal(entry.status, 'enabled');
  assert.equal(entry.source, 'skills/qa-swarm');
  assert.equal(
    fs.readFileSync(outPath('qa-swarm'), 'utf8').replace(/\r\n/g, '\n'),
    render('qa-swarm'),
  );
});

test('QA swarm references only implemented rolling coordinator commands', () => {
  const implemented = new Set(rollingCommandDefinitions.map(command => command.name));
  const referenced = [
    'status', 'next-actions', 'replenish', 'collect-submission',
    'request-review', 'integrate', 'accept',
  ];
  for (const command of referenced) {
    assert.ok(implemented.has(command), `missing rolling command: ${command}`);
    assert.ok(skill.includes(command), `skill does not reference rolling command: ${command}`);
  }
});

test('QA swarm terminal evidence uses the implemented exact schema', () => {
  const evidence = {
    command: 'node --test --test-concurrency=4 one.test.js two.test.js',
    selection: ['one.test.js', 'two.test.js'],
    target: { identity: 'local', profile: 'unit', verification: 'tests/qa-swarm-policy.test.js' },
    revision: 'a'.repeat(40),
    dirty: false,
    startedAt: '2026-10-14T12:00:00-07:00',
    completedAt: '2026-10-14T12:01:00-07:00',
    outcome: 'pass',
    skips: 0,
    failures: 0,
    inputs: { schemaVersion: 2, revision: 'a'.repeat(40), paths: ['tests'] },
    outputPath: 'tmp/qa-slice.log',
    finalization: 'pass',
  };
  assert.deepEqual(readObligationEvidence(evidence), evidence);
  assert.throws(
    () => readObligationEvidence({ ...evidence, concurrency: 4 }),
    /must contain exactly/u,
  );
});
