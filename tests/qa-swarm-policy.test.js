#!/usr/bin/env node
// Traceability: verifies REQ-QA-SWARM

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'qa-swarm', 'SKILL.md'),
  'utf8',
);

test('QA swarm assigns and completes whole aggregate slices', () => {
  assert.match(skill, /Represent each slice as one configured `gate` acceptance rollup/u);
  assert.match(skill, /not an atomic\ndelivery obligation/u);
  assert.match(skill, /every\s+declared selection passes in one aggregate slice run/u);
  assert.match(skill, /Let every independent selected unit reach a terminal result/u);
  assert.match(skill, /Do not repeatedly\nrun only one Arc and submit its passing receipt/u);
  assert.match(skill, /worker and checkout assigned until the complete slice is\n   green/u);
});

test('QA swarm separates incremental repairs from acceptance', () => {
  assert.match(skill, /ordinary progress message, not a durable rolling\n   operation/u);
  assert.match(skill, /do not call `collect-submission`, `request-review`, `integrate` or\n   `accept`/u);
  assert.match(skill, /report progress in the still-active worker turn/u);
  assert.match(skill, /Do not stop the worker turn or emit a terminal rolling submission/u);
  assert.match(skill, /If no nonterminal reviewed Git-integration path is configured/u);
  assert.match(skill, /invalidate only proof whose dependency closure intersects the repair/u);
});

test('QA swarm accepts only one complete green revision-bound result', () => {
  assert.match(skill, /Create exactly one terminal submission for a slice attempt/u);
  assert.match(skill, /Use the existing obligation-evidence schema exactly/u);
  assert.match(skill, /complete\nslice passes/u);
  assert.match(skill, /reject a packet\nassembled from different revisions/u);
  assert.match(skill, /missing\nassigned selections/u);
  assert.match(skill, /later\nrelevant change invalidates the packet honestly/u);
});
