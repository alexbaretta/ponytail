const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const tool = path.join(__dirname, '..', 'skills', 'plan-execution', 'scripts', 'ready-sprints.js');
const { SprintMetadataReaders, parseSprintFile, readSprints, validateDependencies, validatePathOwnership, validateCheckpointOrder, selectPlanningReadySprints, selectExecutionReadySprints } = require(tool);

function metadata(id, version = 2, overrides = {}) {
  const execution = {
    status: 'PENDING',
    depends_on: [],
    ...(version === 1
      ? { planned_paths: [`skills/plan-execution/${id}.js`] }
      : { tasklets_reviewed: true }),
  };
  return {
    schemaVersion: version,
    id,
    planning: { status: 'APPROVED', depends_on: [], scope_roots: ['skills/plan-execution'] },
    execution,
    ...overrides,
  };
}

function writePlan(sprints) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-sprints-'));
  const dir = path.join(root, 'sprints');
  fs.mkdirSync(dir);
  for (const sprint of sprints) fs.writeFileSync(path.join(dir, `${sprint.id}.md`), `<!-- ponytail-plan-sprint\n${JSON.stringify(sprint, null, 2)}\n-->\n## Sprint\n`);
  return root;
}

test('dispatches strict physical V1 and V2 sprint readers', () => {
  assert.deepEqual(Object.keys(SprintMetadataReaders), ['V1', 'V2']);
  const v1 = metadata('S01', 1);
  const v2 = metadata('S01', 2);
  const parsedV1 = parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(v1)}\n-->`);
  assert.equal(parsedV1.schemaVersion, 1);
  assert.equal('tasklets_reviewed' in parsedV1.execution, false);
  const parsedV2 = parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify(v2)}\n-->`);
  assert.equal(parsedV2.execution.tasklets_reviewed, true);
  assert.equal('planned_paths' in parsedV2.execution, false);
  assert.throws(() => parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...v1, execution: { ...v1.execution, tasklets_reviewed: true } })}\n-->`), /exactly/);
  assert.throws(() => parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...v2, execution: { status: 'PENDING', depends_on: [], planned_paths: ['a'] } })}\n-->`), /exactly/);
  assert.throws(() => parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...v2, execution: { ...v2.execution, planned_paths: ['a'] } })}\n-->`), /exactly/);
  assert.throws(() => parseSprintFile('/tmp/S01.md', `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...v2, schemaVersion: 3 })}\n-->`), /unsupported schemaVersion/);
});

test('rejects malformed metadata, collections, paths, and duplicate numeric order', () => {
  const file = '/tmp/S01.md';
  const base = metadata('S01');
  const block = `<!-- ponytail-plan-sprint\n${JSON.stringify(base)}\n-->`;
  assert.throws(() => parseSprintFile(file, `${block}\n${block}`), /exactly one/);
  assert.throws(() => parseSprintFile('/tmp/S02.md', block), /metadata id/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, planning: { ...base.planning, status: 'NOPE' } })}\n-->`), /planning status/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, execution: { ...base.execution, tasklets_reviewed: 'yes' } })}\n-->`), /must be Boolean/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, planning: { ...base.planning, scope_roots: ['../secret'] } })}\n-->`), /invalid path/);
  const v1 = metadata('S01', 1);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...v1, execution: { ...v1.execution, planned_paths: ['a/*'] } })}\n-->`), /glob/);
  assert.throws(() => parseSprintFile(file, `<!-- ponytail-plan-sprint\n${JSON.stringify({ ...base, extra: true })}\n-->`), /exactly/);
  assert.throws(() => readSprints(writePlan([metadata('S1'), metadata('S01')])), /duplicate numeric sprint order/);
});

test('rejects plans containing mixed physical sprint versions', () => {
  assert.throws(() => readSprints(writePlan([metadata('S01', 1), metadata('S02', 2)])), /must not mix physical sprint schema versions/);
});

test('retains V1 dependency scheduling and unordered-path validation', () => {
  const sprints = readSprints(writePlan([metadata('S01', 1), metadata('S02', 1)]));
  const map = validateDependencies(sprints);
  assert.deepEqual(selectExecutionReadySprints(sprints, map), ['S01', 'S02']);
  sprints[1].execution.planned_paths = [...sprints[0].execution.planned_paths];
  assert.throws(() => validatePathOwnership(sprints, map), /unordered sprint path overlap/);
});

test('keeps V2 planning dependency-ready and parallel', () => {
  const sprints = readSprints(writePlan([
    metadata('S01', 2, { planning: { status: 'STUB', depends_on: [], scope_roots: ['x'] }, execution: null }),
    metadata('S02', 2, { planning: { status: 'STUB', depends_on: [], scope_roots: ['y'] }, execution: null }),
  ]));
  assert.deepEqual(selectPlanningReadySprints(sprints, validateDependencies(sprints)), ['S01', 'S02']);
});

test('selects at most the earliest reviewed V2 execution checkpoint', () => {
  const root = writePlan([metadata('S03'), metadata('S01'), metadata('S02')]);
  const sprints = readSprints(root);
  assert.deepEqual(sprints.map(({ id }) => id), ['S01', 'S02', 'S03']);
  assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies(sprints)), ['S01']);
  sprints[0].execution.status = 'DONE';
  assert.deepEqual(selectExecutionReadySprints(sprints, validateDependencies(sprints)), ['S02']);
  sprints[1].execution.tasklets_reviewed = false;
  assert.throws(() => selectExecutionReadySprints(sprints, validateDependencies(sprints)), /tasklets must be reviewed/);
});

test('blocks dependencies and rejects a later advanced checkpoint', () => {
  const blocked = readSprints(writePlan([
    metadata('S01', 2, { execution: { ...metadata('S01').execution, status: 'DONE' } }),
    metadata('S02', 2, { execution: { ...metadata('S02').execution, depends_on: ['S03'] } }),
    metadata('S03', 2),
  ]));
  assert.deepEqual(selectExecutionReadySprints(blocked, validateDependencies(blocked)), []);
  const advanced = readSprints(writePlan([metadata('S01'), metadata('S02', 2, { execution: { ...metadata('S02').execution, status: 'IN_PROGRESS' } })]));
  assert.throws(() => validateCheckpointOrder(advanced), /advanced before unfinished predecessor/);
});

test('CLI returns exact JSON without mutating inputs', () => {
  const root = writePlan([metadata('S01')]);
  const file = path.join(root, 'sprints', 'S01.md');
  const before = fs.readFileSync(file, 'utf8');
  assert.equal(execFileSync(process.execPath, [tool, 'execution', root], { encoding: 'utf8' }), '["S01"]\n');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.throws(() => execFileSync(process.execPath, [tool, 'bad', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), (error) => error.status !== 0 && /usage/.test(error.stderr));
});
