#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { claim, complete, enqueue, entries, main, parseCli, readV1, readV2 } = require('../src/plan-input');

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-'));
  fs.mkdirSync(path.join(root, 'pm', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'pm', 'requirements', 'index.md'), '# Requirements\n');
  return root;
}

function campaignRepository() {
  const root = repository();
  fs.mkdirSync(path.join(root, '.agents', 'config', 'project'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents', 'config', 'project', 'management.json'), JSON.stringify({
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    },
    legacyPlanLayout: 'none',
  }));
  const plans = path.join(root, 'pm', 'plans', 'in_progress');
  fs.mkdirSync(path.join(plans, 'root'), { recursive: true });
  fs.mkdirSync(path.join(plans, 'child'), { recursive: true });
  fs.writeFileSync(path.join(plans, 'root', 'plan.md'), '# Root\n\nPlan ID: root\nStatus: in_progress\n\n<!-- ponytail-plan-campaign\n{"schemaVersion":1,"id":"root","parent_plan_id":null}\n-->\n');
  fs.writeFileSync(path.join(plans, 'child', 'plan.md'), '# Child\n\nPlan ID: child\nStatus: in_progress\n\n[Parent](../root/plan.md)\n<!-- ponytail-plan-campaign\n{"schemaVersion":1,"id":"child","parent_plan_id":"root"}\n-->\n');
  return root;
}

test('both producers share the exact durable V2 queue contract', () => {
  const root = repository();
  const cli = enqueue(root, 'campaign-a', 'root-a', 'first requirement', 'cli');
  const composer = enqueue(root, 'campaign-a', 'child-a', 'second requirement\nwith detail', 'codex-composer', { sessionId: 's', turnId: 't' });
  assert.deepEqual(entries(root, 'campaign-a').map(({ source, submittedPlanId, prompt }) => ({ source, submittedPlanId, prompt })), [
    { source: 'cli', submittedPlanId: 'root-a', prompt: 'first requirement' },
    { source: 'codex-composer', submittedPlanId: 'child-a', prompt: 'second requirement\nwith detail' },
  ]);
  assert.equal(readV2(JSON.parse(fs.readFileSync(path.join(root, 'pm', 'plan-inputs', 'campaign-a', 'open', `${composer.id}.json`)))).turnId, 't');
  assert.equal(composer.schemaVersion, 2);
  assert.notEqual(cli.id, composer.id);
});

test('physical V1 remains exact but is retired from queue consumption', () => {
  const value = {
    schemaVersion: 1,
    id: 'legacy',
    status: 'open',
    source: 'cli',
    prompt: 'legacy input',
    receivedAt: '2026-09-27T00:00:00.000Z',
    sessionId: null,
    turnId: null,
  };
  assert.deepEqual(readV1(value), value);
  assert.throws(() => readV1({ ...value, campaignId: 'new-field' }), /unknown field campaignId/);
});

test('one claim is a critical section and completion requires durable PM evidence', () => {
  const root = repository();
  const first = enqueue(root, 'campaign-a', 'root-a', 'first', 'cli');
  const second = enqueue(root, 'campaign-a', 'root-a', 'second', 'cli');
  enqueue(root, 'campaign-b', 'root-b', 'independent', 'cli');
  assert.equal(claim(root, 'campaign-a').id, first.id);
  enqueue(root, 'campaign-a', 'root-a', 'third', 'cli');
  assert.equal(claim(root, 'campaign-a').id, first.id);
  assert.throws(() => complete(root, 'campaign-a', first.id, []), /at least one PM record/);
  assert.throws(() => complete(root, 'campaign-a', first.id, ['pm/requirements/missing.md']), /does not exist/);
  complete(root, 'campaign-a', first.id, ['pm/requirements/index.md']);
  assert.equal(claim(root, 'campaign-a').id, second.id);
  assert.equal(entries(root, 'campaign-b')[0].prompt, 'independent');
  assert.deepEqual(entries(root, 'campaign-a').map(({ status, prompt }) => ({ status, prompt })), [
    { status: 'closed', prompt: 'first' },
    { status: 'in_progress', prompt: 'second' },
    { status: 'open', prompt: 'third' },
  ]);
});

test('CLI grammar preserves multiword prompts and validates lifecycle commands', () => {
  assert.deepEqual(parseCli(['plan', '--', 'a', 'new', 'bug']), { command: 'enqueue', plan: 'plan', prompt: 'a new bug' });
  assert.deepEqual(parseCli(['coordinate', 'plan']), { command: 'coordinate', plan: 'plan' });
  assert.deepEqual(parseCli(['release', 'plan']), { command: 'release', plan: 'plan' });
  assert.deepEqual(parseCli(['claim', 'plan', '--json']), { command: 'claim', plan: 'plan', json: true });
  assert.deepEqual(parseCli(['complete', 'plan', 'id', '--record', 'pm/requirements/index.md']), {
    command: 'complete', plan: 'plan', id: 'id', records: ['pm/requirements/index.md'],
  });
  assert.throws(() => parseCli(['complete', 'plan', 'id']), /usage/);
});

test('coordinator lifecycle commands validate campaign membership', (context) => {
  const root = campaignRepository();
  const lines = [];
  context.mock.method(console, 'log', (line) => lines.push(line));
  assert.equal(main(['coordinate', 'child'], root), 0);
  assert.equal(main(['release', 'child'], root), 0);
  assert.deepEqual(lines, ['Validated coordinator campaign root', 'Validated release for campaign root']);
});

test('CLI producer resolves a member plan to the campaign root', (context) => {
  const root = campaignRepository();
  const lines = [];
  context.mock.method(console, 'log', (line) => lines.push(line));
  assert.equal(main(['child', '--', 'cli requirement'], root), 0);
  assert.match(lines[0], /for campaign root$/);
  assert.deepEqual(entries(root, 'root').map(({ submittedPlanId, prompt }) => ({ submittedPlanId, prompt })), [
    { submittedPlanId: 'child', prompt: 'cli requirement' },
  ]);
});
