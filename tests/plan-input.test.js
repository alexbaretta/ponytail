#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { claim, complete, enqueue, entries, parseCli, readV1 } = require('../src/plan-input');

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-input-'));
  fs.mkdirSync(path.join(root, 'pm', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'pm', 'requirements', 'index.md'), '# Requirements\n');
  return root;
}

test('both producers share the exact durable V1 queue contract', () => {
  const root = repository();
  const cli = enqueue(root, 'first requirement', 'cli');
  const composer = enqueue(root, 'second requirement\nwith detail', 'codex-composer', { sessionId: 's', turnId: 't' });
  assert.deepEqual(entries(root).map(({ source, prompt }) => ({ source, prompt })), [
    { source: 'cli', prompt: 'first requirement' },
    { source: 'codex-composer', prompt: 'second requirement\nwith detail' },
  ]);
  assert.equal(readV1(JSON.parse(fs.readFileSync(path.join(root, 'pm', 'plan-inputs', 'open', `${composer.id}.json`)))).turnId, 't');
  assert.notEqual(cli.id, composer.id);
});

test('one claim is a critical section and completion requires durable PM evidence', () => {
  const root = repository();
  const first = enqueue(root, 'first', 'cli');
  const second = enqueue(root, 'second', 'cli');
  assert.equal(claim(root).id, first.id);
  enqueue(root, 'third', 'cli');
  assert.equal(claim(root).id, first.id);
  assert.throws(() => complete(root, first.id, []), /at least one PM record/);
  assert.throws(() => complete(root, first.id, ['pm/requirements/missing.md']), /does not exist/);
  complete(root, first.id, ['pm/requirements/index.md']);
  assert.equal(claim(root).id, second.id);
  assert.deepEqual(entries(root).map(({ status, prompt }) => ({ status, prompt })), [
    { status: 'closed', prompt: 'first' },
    { status: 'in_progress', prompt: 'second' },
    { status: 'open', prompt: 'third' },
  ]);
});

test('CLI grammar preserves multiword prompts and validates lifecycle commands', () => {
  assert.deepEqual(parseCli(['a', 'new', 'bug']), { command: 'enqueue', prompt: 'a new bug' });
  assert.deepEqual(parseCli(['claim', '--json']), { command: 'claim', json: true });
  assert.deepEqual(parseCli(['complete', 'id', '--record', 'pm/requirements/index.md']), {
    command: 'complete', id: 'id', records: ['pm/requirements/index.md'],
  });
  assert.throws(() => parseCli(['complete', 'id']), /usage/);
});
