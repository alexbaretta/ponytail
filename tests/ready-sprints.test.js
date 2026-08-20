const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const tool = path.join(__dirname, '..', 'skills', 'plan-execution', 'scripts', 'ready-sprints.js');
const { SprintMetadataReaders, parseSprintFile, readSprints, validateDependencies, validatePathOwnership, selectPlanningReadySprints, selectExecutionReadySprints } = require(tool);

function metadata(id, overrides = {}) {
  return {
    schemaVersion: 1,
    id,
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['skills/plan-execution'] },
    execution: { status: 'PENDING', depends_on: [], planned_paths: [`skills/plan-execution/${id}.js`] },
    ...overrides,
  };
}

function writePlan(sprints, bodies = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-sprints-'));
  const dir = path.join(root, 'sprints');
  fs.mkdirSync(dir);
  for (const sprint of sprints) {
    const body = bodies[sprint.id] ?? '## Sprint\n';
    fs.writeFileSync(path.join(dir, `${sprint.id}.md`), `<!-- ponytail-plan-sprint\n${JSON.stringify(sprint, null, 2)}\n-->\n${body}`);
  }
  return root;
}

test('parses strict sprint metadata and reads numeric sprint order', () => {
  assert.equal(SprintMetadataReaders.V1, parseSprintFile);
  const root = writePlan([metadata('S10'), metadata('S02')]);
  const sprints = readSprints(root);
  assert.deepEqual(sprints.map(({ id }) => id), ['S02', 'S10']);
  assert.equal(parseSprintFile(path.join(root, 'sprints', 'S02.md')).execution.status, 'PENDING');
});

test('rejects metadata shape, filename, status, collection, and path errors', () => {
  const file = '/tmp/S01.md';
  assert.throws(() => parseSprintFile(file, ''), /exactly one/);
  const base = metadata('S01');
  const block = `<!-- ponytail-plan-sprint\n${JSON.stringify(base)}\n-->`;
  assert.throws(() => parseSprintFile(file, `${block}\n${block}`), /exactly one/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, schemaVersion: 2 })}\n-->`), /unsupported schemaVersion/);
  assert.throws(() => parseSprintFile('/tmp/S02.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(base)}\n-->`), /metadata id/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, planning: { ...base.planning, status: 'NOPE' } })}\n-->`), /planning status/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, execution: { ...base.execution, status: 'NOPE' } })}\n-->`), /execution status/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, planning: { ...base.planning, scope_roots: ['../secret'] } })}\n-->`), /invalid path/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, execution: { ...base.execution, planned_paths: ['a/*'] } })}\n-->`), /glob/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, execution: { ...base.execution, depends_on: ['S01', 'S01'] } })}\n-->`), /duplicates/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, extra: true })}\n-->`), /exactly/);
});

test('permits null execution metadata until planning is ready', () => {
  const sprint = metadata('S01', { execution: null });
  const root = writePlan([sprint]);
  assert.equal(readSprints(root)[0].execution, null);
});

test('validates unknown, self, and cyclic planning and execution dependencies', () => {
  assert.throws(() => validateDependencies([metadata('S01', { planning: { status: 'APPROVED', depends_on: ['S99'], scope_roots: ['x'] } })]), /unknown planning/);
  assert.throws(() => validateDependencies([metadata('S01', { planning: { status: 'APPROVED', depends_on: ['S01'], scope_roots: ['x'] } })]), /cannot depend/);
  const cycle = [metadata('S01', { planning: { status: 'APPROVED', depends_on: ['S02'], scope_roots: ['x'] } }), metadata('S02', { planning: { status: 'APPROVED', depends_on: ['S01'], scope_roots: ['x'] } })];
  assert.throws(() => validateDependencies(cycle), /planning dependency cycle.*S01.*S02/);
  const executionCycle = [metadata('S01', { execution: { status: 'PENDING', depends_on: ['S02'], planned_paths: ['a'] } }), metadata('S02', { execution: { status: 'PENDING', depends_on: ['S01'], planned_paths: ['b'] } })];
  assert.throws(() => validateDependencies(executionCycle), /execution dependency cycle/);
});

test('allows ordered path overlap and rejects unordered overlap', () => {
  const ordered = [metadata('S01', { execution: { status: 'DONE', depends_on: [], planned_paths: ['shared'] } }), metadata('S02', { execution: { status: 'PENDING', depends_on: ['S01'], planned_paths: ['shared'] } })];
  const map = validateDependencies(ordered);
  assert.doesNotThrow(() => validatePathOwnership(ordered, map));
  const unordered = [metadata('S01', { execution: { status: 'PENDING', depends_on: [], planned_paths: ['shared'] } }), metadata('S02', { execution: { status: 'PENDING', depends_on: [], planned_paths: ['shared'] } })];
  const unorderedMap = validateDependencies(unordered);
  assert.throws(() => validatePathOwnership(unordered, unorderedMap), /unordered.*S01.*S02.*shared/);
});

test('selects planning and execution ready sets in stable order', () => {
  const sprints = [
    metadata('S03', { planning: { status: 'STUB', depends_on: ['S01'], scope_roots: ['x'] }, execution: null }),
    metadata('S01', { planning: { status: 'APPROVED', depends_on: [], scope_roots: ['x'] }, execution: { status: 'DONE', depends_on: [], planned_paths: ['a'] } }),
    metadata('S02', { planning: { status: 'STUB', depends_on: [], scope_roots: ['x'] }, execution: { status: 'PENDING', depends_on: [], planned_paths: ['b'] } }),
  ];
  const map = validateDependencies(sprints);
  assert.deepEqual(selectPlanningReadySprints(sprints, map), ['S03', 'S02']);
  assert.deepEqual(selectExecutionReadySprints(sprints, map), []);
  sprints[0].planning.status = 'APPROVED';
  sprints[0].execution = { status: 'PENDING', depends_on: ['S01'], planned_paths: ['c'] };
  assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies(sprints)), ['S03']);
});

test('CLI returns exact JSON and fails without mutation', () => {
  const root = writePlan([metadata('S01', { planning: { status: 'STUB', depends_on: [], scope_roots: ['x'] }, execution: null })]);
  const file = path.join(root, 'sprints', 'S01.md');
  const before = fs.readFileSync(file, 'utf8');
  assert.equal(execFileSync(process.execPath, [tool, 'planning', root], { encoding: 'utf8' }), '["S01"]\n');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.throws(() => execFileSync(process.execPath, [tool, 'bad', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), (error) => error.status !== 0 && /usage/.test(error.stderr));
});
