const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const tool = path.join(__dirname, '..', 'skills', 'plan-execution', 'scripts', 'next-tasklet.js');
const { TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph, validateTaskletGraph, selectNextTasklet } = require(tool);

function fixture(statuses = { 'S01-F01-T01': ' ', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ' }, nodes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-tasklet-'));
  const sprint = path.join(root, 'S01.md');
  const headings = Object.entries(statuses).map(([id, status]) => `### [${status}] Tasklet ${id}: Work ${id}`).join('\n');
  fs.writeFileSync(sprint, `# Sprint\n\n${headings}\n`);
  const tasklets = nodes ?? Object.fromEntries(Object.keys(statuses).map((id) => [id, { depends_on: [], affinity: [id], risk: 'normal' }]));
  fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify({ schemaVersion: 1, sprint: 'S01', tasklets }, null, 2));
  return { root, sprint };
}

test('parses canonical tasklet headings and rejects malformed or duplicate headings', () => {
  assert.equal(TaskletMetadataReaders.V1, readTaskletGraph);
  const { sprint } = fixture();
  assert.deepEqual(parseTaskletStatuses(sprint), new Map([['S01-F01-T01', 'PENDING'], ['S01-F01-T02', 'PENDING'], ['S01-F01-T03', 'PENDING']]));
  assert.throws(() => parseTaskletStatuses(sprint, '### [ ] Tasklet S01-F01-T01: One\n### [DONE] Tasklet S01-F01-T01: Two'), /duplicate/);
  assert.throws(() => parseTaskletStatuses(sprint, '### [?] Tasklet S01-F01-T01: Bad'), /malformed/);
});

test('requires exact graph metadata and one-to-one Markdown identity', () => {
  const { sprint, root } = fixture();
  const graph = readTaskletGraph(sprint);
  assert.equal(graph.tasklets.size, 3);
  fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify({ schemaVersion: 2, sprint: 'S01', tasklets: {} }));
  assert.throws(() => readTaskletGraph(sprint), /unsupported schemaVersion/);
  fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify({ schemaVersion: 1, sprint: 'S01', tasklets: { 'S01-F01-T01': { depends_on: [], affinity: [], risk: 'high' } } }));
  assert.throws(() => readTaskletGraph(sprint), /risk_reason/);
  fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify({ schemaVersion: 1, sprint: 'S01', tasklets: { 'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' } } }));
  assert.throws(() => validateTaskletGraph(readTaskletGraph(sprint), parseTaskletStatuses(sprint)), /exactly the same/);
});

test('validates unknown, error, completed dependency, and cyclic tasklets', () => {
  const unknown = fixture({ 'S01-F01-T01': ' ', 'S01-F01-T02': ' ' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T99'], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: [], risk: 'normal' },
  });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(unknown.sprint), parseTaskletStatuses(unknown.sprint)), /unknown/);
  const blocked = fixture({ 'S01-F01-T01': 'ERROR', 'S01-F01-T02': ' ' }, {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal' },
  });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(blocked.sprint), parseTaskletStatuses(blocked.sprint)), /ERROR/);
  const completed = fixture({ 'S01-F01-T01': ' ', 'S01-F01-T02': 'DONE' }, {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal' },
  });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(completed.sprint), parseTaskletStatuses(completed.sprint)), /completed/);
  const cycle = fixture({ 'S01-F01-T01': ' ', 'S01-F01-T02': ' ' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal' },
  });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(cycle.sprint), parseTaskletStatuses(cycle.sprint)), /cycle/);
  const self = fixture({ 'S01-F01-T01': ' ' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal' },
  });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(self.sprint), parseTaskletStatuses(self.sprint)), /cannot depend on itself/);
  const invalidRisk = fixture({ 'S01-F01-T01': ' ' }, {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'urgent' },
  });
  assert.throws(() => readTaskletGraph(invalidRisk.sprint), /invalid risk/);
  const malformedMetadata = fixture({ 'S01-F01-T01': ' ' }, {
    'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', description: 'not scheduling metadata' },
  });
  assert.throws(() => readTaskletGraph(malformedMetadata.sprint), /exactly/);
});

test('selects high risk before other criteria', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['shared'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: ['shared'], risk: 'high', risk_reason: 'Important boundary.' },
    'S01-F01-T03': { depends_on: [], affinity: [], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes);
  const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint); const derived = validateTaskletGraph(graph, parsed);
  assert.deepEqual(selectNextTasklet(graph, parsed, derived, 'S01-F01-T01'), { next: 'S01-F01-T02', criteria: { risk: 'high', affinity_overlap: 1, unfinished_descendants: 0, remaining_depth: 0 } });
});

test('uses affinity overlap independently after risk ties', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['shared'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: ['shared'], risk: 'normal' },
    'S01-F01-T03': { depends_on: [], affinity: ['other'], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes); const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint);
  assert.equal(selectNextTasklet(graph, parsed, validateTaskletGraph(graph, parsed), 'S01-F01-T01').next, 'S01-F01-T02');
});

test('treats first-task affinity as neutral when last tasklet is omitted', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['shared'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: [], risk: 'normal' },
    'S01-F01-T03': { depends_on: [], affinity: ['shared'], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes); const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint);
  const derived = validateTaskletGraph(graph, parsed);
  assert.equal(selectNextTasklet(graph, parsed, derived).next, 'S01-F01-T02');
  assert.equal(selectNextTasklet(graph, parsed, derived, 'S01-F01-T01').next, 'S01-F01-T03');
});

test('uses unfinished descendants independently after risk and affinity ties', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ', 'S01-F01-T04': ' ', 'S01-F01-T05': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T03': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T04': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T05': { depends_on: [], affinity: ['same'], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes); const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint);
  const result = selectNextTasklet(graph, parsed, validateTaskletGraph(graph, parsed), 'S01-F01-T01');
  assert.equal(result.next, 'S01-F01-T02');
  assert.equal(result.criteria.unfinished_descendants, 2);
});

test('uses remaining depth independently after descendant-count ties', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ', 'S01-F01-T04': ' ', 'S01-F01-T05': ' ', 'S01-F01-T06': ' ', 'S01-F01-T07': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T03': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T04': { depends_on: ['S01-F01-T03'], affinity: [], risk: 'normal' },
    'S01-F01-T05': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T06': { depends_on: ['S01-F01-T05'], affinity: [], risk: 'normal' },
    'S01-F01-T07': { depends_on: ['S01-F01-T05'], affinity: [], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes); const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint);
  const result = selectNextTasklet(graph, parsed, validateTaskletGraph(graph, parsed), 'S01-F01-T01');
  assert.equal(result.next, 'S01-F01-T02');
  assert.equal(result.criteria.unfinished_descendants, 2);
  assert.equal(result.criteria.remaining_depth, 2);
});

test('uses the lowest ID independently as the final tie-breaker', () => {
  const statuses = { 'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F01-T03': ' ' };
  const nodes = {
    'S01-F01-T01': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: ['same'], risk: 'normal' },
    'S01-F01-T03': { depends_on: [], affinity: ['same'], risk: 'normal' },
  };
  const { sprint } = fixture(statuses, nodes); const graph = readTaskletGraph(sprint); const parsed = parseTaskletStatuses(sprint);
  assert.equal(selectNextTasklet(graph, parsed, validateTaskletGraph(graph, parsed), 'S01-F01-T01').next, 'S01-F01-T02');
});

test('rejects an unfinished graph with no ready tasklet and handles completed graphs', () => {
  const { sprint } = fixture({ 'S01-F01-T01': ' ', 'S01-F01-T02': ' ' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal' },
  });
  const graph = readTaskletGraph(sprint); const statuses = parseTaskletStatuses(sprint);
  assert.throws(() => selectNextTasklet(graph, statuses, {}), /unfinished.*no ready/);
  const completed = fixture({ 'S01-F01-T01': 'DONE', 'S01-F01-T02': 'DONE' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: [], risk: 'normal' },
  });
  const completedGraph = readTaskletGraph(completed.sprint); const completedStatuses = parseTaskletStatuses(completed.sprint);
  assert.deepEqual(selectNextTasklet(completedGraph, completedStatuses, validateTaskletGraph(completedGraph, completedStatuses)), { next: null });
  const simple = fixture({ 'S01-F01-T01': ' ', 'S01-F01-T02': 'DONE' }, {
    'S01-F01-T01': { depends_on: ['S01-F01-T02'], affinity: [], risk: 'normal' },
    'S01-F01-T02': { depends_on: [], affinity: [], risk: 'normal' },
  });
  const before = fs.readFileSync(simple.sprint, 'utf8');
  assert.throws(() => execFileSync(process.execPath, [tool, simple.sprint, 'S01-F01-T01'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), (error) => error.status !== 0 && /last completed/.test(error.stderr));
  assert.equal(execFileSync(process.execPath, [tool, simple.sprint], { encoding: 'utf8' }), '{"next":"S01-F01-T01","criteria":{"risk":"normal","affinity_overlap":0,"unfinished_descendants":0,"remaining_depth":0}}\n');
  const completedBefore = fs.readFileSync(completed.sprint, 'utf8');
  assert.equal(execFileSync(process.execPath, [tool, completed.sprint], { encoding: 'utf8' }), '{"next":null}\n');
  assert.equal(fs.readFileSync(completed.sprint, 'utf8'), completedBefore);
  assert.equal(fs.readFileSync(simple.sprint, 'utf8'), before);
});
