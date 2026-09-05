const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const tool = path.join(__dirname, '..', 'skills', 'plan-execution', 'scripts', 'ready-tasklets.js');
const { MAX_BATCH_TASKLETS, TaskletMetadataReaders, parseTaskletStatuses, readTaskletGraph, validateTaskletGraph, selectReadyTasklets } = require(tool);

function writeFixture(metadata, statuses = Object.fromEntries(Object.keys(metadata.tasklets).map((id) => [id, ' ']))) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-tasklets-'));
  const sprint = path.join(root, 'S01.md');
  const headings = Object.entries(statuses).map(([id, status]) => `### [${status}] Tasklet ${id}: Work ${id}`).join('\n');
  fs.writeFileSync(sprint, `# Sprint\n\n${headings}\n`);
  fs.writeFileSync(path.join(root, 'S01.tasklets.json'), JSON.stringify(metadata, null, 2));
  return { root, sprint };
}

function tasklet(feature, plannedPaths, overrides = {}) {
  return { depends_on: [], affinity: [], risk: 'normal', feature, planned_paths: plannedPaths, ...overrides };
}

function graphV2(overrides = {}) {
  return {
    schemaVersion: 2,
    sprint: 'S01',
    features: {
      'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' },
      'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T02' },
    },
    tasklets: {
      'S01-F01-T01': tasklet('S01-F01', ['src/a.js'], { affinity: ['core'], risk: 'high', risk_reason: 'Owns the core boundary.' }),
      'S01-F01-T02': tasklet('S01-F01', [], { depends_on: ['S01-F01-T01'] }),
      'S01-F02-T01': tasklet('S01-F02', ['src/b.js']),
      'S01-F02-T02': tasklet('S01-F02', ['tests/b.test.js'], { depends_on: ['S01-F02-T01'] }),
    },
    ...overrides,
  };
}

function graphV3(overrides = {}) {
  return { ...graphV2(overrides), schemaVersion: 3 };
}

function select(fixture, last = null) {
  const graph = readTaskletGraph(fixture.sprint);
  const statuses = parseTaskletStatuses(fixture.sprint);
  return selectReadyTasklets(graph, statuses, validateTaskletGraph(graph, statuses), last);
}

test('retains strict physical V1 parsing and scalar selection', () => {
  assert.deepEqual(Object.keys(TaskletMetadataReaders), ['V1', 'V2', 'V3']);
  const metadata = {
    schemaVersion: 1,
    sprint: 'S01',
    tasklets: {
      'S01-F01-T01': { depends_on: [], affinity: ['core'], risk: 'normal' },
      'S01-F01-T02': { depends_on: [], affinity: [], risk: 'high', risk_reason: 'Historical risk.' },
    },
  };
  const fixture = writeFixture(metadata);
  const graph = readTaskletGraph(fixture.sprint);
  assert.equal(graph.schemaVersion, 1);
  assert.equal('features' in graph, false);
  assert.deepEqual(select(fixture), { next: 'S01-F01-T02', criteria: { risk: 'high', affinity_overlap: 0, unfinished_descendants: 0, remaining_depth: 0 } });
  assert.equal(execFileSync(process.execPath, [tool, fixture.sprint], { encoding: 'utf8' }), '{"next":"S01-F01-T02","criteria":{"risk":"high","affinity_overlap":0,"unfinished_descendants":0,"remaining_depth":0}}\n');
});

test('requires strict V2 identity, keys, feature membership, risks, and paths', () => {
  const valid = writeFixture(graphV2());
  assert.equal(readTaskletGraph(valid.sprint).schemaVersion, 2);
  assert.equal(readTaskletGraph(writeFixture(graphV3()).sprint).schemaVersion, 3);
  const unsupported = writeFixture({ ...graphV2(), schemaVersion: 4 });
  assert.throws(() => readTaskletGraph(unsupported.sprint), /unsupported schemaVersion/);
  const extra = graphV2(); extra.tasklets['S01-F01-T01'].description = 'not scheduling metadata';
  assert.throws(() => readTaskletGraph(writeFixture(extra).sprint), /exactly/);
  const membership = graphV2(); membership.tasklets['S01-F01-T01'].feature = 'S01-F02';
  assert.throws(() => readTaskletGraph(writeFixture(membership).sprint), /invalid feature membership/);
  const pathError = graphV2(); pathError.tasklets['S01-F01-T01'].planned_paths = ['src/*'];
  assert.throws(() => readTaskletGraph(writeFixture(pathError).sprint), /without glob syntax/);
  const risk = graphV2(); delete risk.tasklets['S01-F01-T01'].risk_reason;
  assert.throws(() => readTaskletGraph(writeFixture(risk).sprint), /risk_reason/);
});

test('requires one validation owner and nonempty implementation paths', () => {
  const missingDependency = graphV2(); missingDependency.tasklets['S01-F01-T02'].depends_on = [];
  const first = writeFixture(missingDependency);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(first.sprint), parseTaskletStatuses(first.sprint)), /directly depend on every other/);
  const emptyImplementation = graphV2(); emptyImplementation.tasklets['S01-F01-T01'].planned_paths = [];
  const second = writeFixture(emptyImplementation);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(second.sprint), parseTaskletStatuses(second.sprint)), /non-validation.*requires planned_paths/);
  const wrongOwner = graphV2(); wrongOwner.features['S01-F01'].validation_tasklet = 'S01-F02-T02';
  const third = writeFixture(wrongOwner);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(third.sprint), parseTaskletStatuses(third.sprint)), /invalid validation_tasklet/);
  assert.doesNotThrow(() => select(writeFixture(graphV2())));
});

test('rejects tasklet and feature dependency errors and cycles', () => {
  const unknown = graphV2(); unknown.tasklets['S01-F01-T01'].depends_on = ['S01-F99-T01'];
  const first = writeFixture(unknown);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(first.sprint), parseTaskletStatuses(first.sprint)), /unknown tasklet dependency/);
  const taskletCycle = graphV2(); taskletCycle.tasklets['S01-F01-T01'].depends_on = ['S01-F01-T02'];
  const second = writeFixture(taskletCycle);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(second.sprint), parseTaskletStatuses(second.sprint)), /tasklet dependency cycle/);
  const featureCycle = graphV2(); featureCycle.features['S01-F01'].depends_on = ['S01-F02']; featureCycle.features['S01-F02'].depends_on = ['S01-F01'];
  const third = writeFixture(featureCycle);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(third.sprint), parseTaskletStatuses(third.sprint)), /feature dependency cycle/);
  const undeclaredFeature = graphV2(); undeclaredFeature.tasklets['S01-F02-T01'].depends_on = ['S01-F01-T01'];
  const fourth = writeFixture(undeclaredFeature);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(fourth.sprint), parseTaskletStatuses(fourth.sprint)), /cross-feature dependency requires feature dependency/);
  const identity = writeFixture(graphV2(), { 'S01-F01-T01': ' ' });
  assert.throws(() => validateTaskletGraph(readTaskletGraph(identity.sprint), parseTaskletStatuses(identity.sprint)), /exactly the same/);
});

test('selects the highest-ranked V2 tasklet', () => {
  const metadata = graphV2({
    features: {
      'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' },
      'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T02' },
      'S01-F03': { depends_on: [], validation_tasklet: 'S01-F03-T02' },
    },
    tasklets: {
      'S01-F01-T01': tasklet('S01-F01', ['src/shared.js'], { risk: 'high', risk_reason: 'Ranks first.' }),
      'S01-F01-T02': tasklet('S01-F01', [], { depends_on: ['S01-F01-T01', 'S01-F01-T03'] }),
      'S01-F01-T03': tasklet('S01-F01', ['src/same-feature-disjoint.js']),
      'S01-F02-T01': tasklet('S01-F02', ['src/feature-b.js']),
      'S01-F02-T02': tasklet('S01-F02', [], { depends_on: ['S01-F02-T01'] }),
      'S01-F03-T01': tasklet('S01-F03', ['src/disjoint.js']),
      'S01-F03-T02': tasklet('S01-F03', [], { depends_on: ['S01-F03-T01'] }),
    },
  });
  const result = select(writeFixture(metadata));
  assert.deepEqual(result.next, ['S01-F01-T01']);
  assert.deepEqual(Object.keys(result.criteria), result.next);
  assert.equal(result.criteria['S01-F01-T01'].risk, 'high');
});

test('rejects unordered path overlap within and across features but permits ordered overlap', () => {
  const across = graphV2();
  across.tasklets['S01-F02-T01'].planned_paths = ['src/a.js'];
  const acrossFixture = writeFixture(across);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(acrossFixture.sprint), parseTaskletStatuses(acrossFixture.sprint)), /unordered tasklet path overlap.*S01-F01-T01.*S01-F02-T01.*src\/a\.js/);

  const within = graphV2();
  within.tasklets['S01-F01-T03'] = tasklet('S01-F01', ['src/a.js']);
  within.tasklets['S01-F01-T02'].depends_on.push('S01-F01-T03');
  const withinFixture = writeFixture(within);
  assert.throws(() => validateTaskletGraph(readTaskletGraph(withinFixture.sprint), parseTaskletStatuses(withinFixture.sprint)), /unordered tasklet path overlap.*S01-F01-T01.*S01-F01-T03.*src\/a\.js/);

  const ordered = graphV2();
  ordered.features['S01-F02'].depends_on = ['S01-F01'];
  ordered.tasklets['S01-F02-T01'].planned_paths = ['src/a.js'];
  assert.doesNotThrow(() => select(writeFixture(ordered)));
});

test('blocks tasklets on dependency-feature validation', () => {
  const metadata = graphV2();
  metadata.features['S01-F02'].depends_on = ['S01-F01'];
  const pending = writeFixture(metadata);
  assert.deepEqual(select(pending).next, ['S01-F01-T01']);
  const implementationDone = writeFixture(metadata, {
    'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F02-T01': ' ', 'S01-F02-T02': ' ',
  });
  assert.deepEqual(select(implementationDone).next, ['S01-F01-T02']);
  const featureDone = writeFixture(metadata, {
    'S01-F01-T01': 'DONE', 'S01-F01-T02': 'DONE', 'S01-F02-T01': ' ', 'S01-F02-T02': ' ',
  });
  assert.deepEqual(select(featureDone).next, ['S01-F02-T01']);
});

test('uses prior affinity and graph criteria deterministically', () => {
  const metadata = graphV2();
  metadata.tasklets['S01-F01-T01'].risk = 'normal'; delete metadata.tasklets['S01-F01-T01'].risk_reason;
  metadata.tasklets['S01-F01-T01'].affinity = ['core'];
  metadata.tasklets['S01-F02-T01'].affinity = ['core'];
  const fixture = writeFixture(metadata, {
    'S01-F01-T01': 'DONE', 'S01-F01-T02': ' ', 'S01-F02-T01': ' ', 'S01-F02-T02': ' ',
  });
  const result = select(fixture, 'S01-F01-T01');
  assert.deepEqual(result.next, ['S01-F02-T01']);
  assert.equal(result.criteria['S01-F02-T01'].affinity_overlap, 1);
});

test('returns exact completion JSON and never mutates inputs', () => {
  const metadata = graphV2();
  const statuses = Object.fromEntries(Object.keys(metadata.tasklets).map((id) => [id, 'DONE']));
  const fixture = writeFixture(metadata, statuses);
  const sprintBefore = fs.readFileSync(fixture.sprint, 'utf8');
  const graphFile = path.join(fixture.root, 'S01.tasklets.json');
  const graphBefore = fs.readFileSync(graphFile, 'utf8');
  assert.deepEqual(select(fixture), { next: null });
  assert.equal(execFileSync(process.execPath, [tool, fixture.sprint], { encoding: 'utf8' }), '{"next":null}\n');
  assert.equal(fs.readFileSync(fixture.sprint, 'utf8'), sprintBefore);
  assert.equal(fs.readFileSync(graphFile, 'utf8'), graphBefore);
});

test('V3 returns one complete ordered batch', () => {
  const metadata = graphV3({
    features: {
      'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T03' },
      'S01-F02': { depends_on: [], validation_tasklet: 'S01-F02-T03' },
      'S01-F03': { depends_on: ['S01-F01', 'S01-F02'], validation_tasklet: 'S01-F03-T02' },
    },
    tasklets: {
      'S01-F01-T01': tasklet('S01-F01', ['src/a.js']),
      'S01-F01-T02': tasklet('S01-F01', ['src/a-helper.js'], { depends_on: ['S01-F01-T01'] }),
      'S01-F01-T03': tasklet('S01-F01', ['tests/a.test.js'], { depends_on: ['S01-F01-T01', 'S01-F01-T02'] }),
      'S01-F02-T01': tasklet('S01-F02', ['src/b.js']),
      'S01-F02-T02': tasklet('S01-F02', ['src/b-helper.js'], { depends_on: ['S01-F02-T01'] }),
      'S01-F02-T03': tasklet('S01-F02', ['tests/b.test.js'], { depends_on: ['S01-F02-T01', 'S01-F02-T02'] }),
      'S01-F03-T01': tasklet('S01-F03', ['src/converged.js']),
      'S01-F03-T02': tasklet('S01-F03', [], { depends_on: ['S01-F03-T01'] }),
    },
  });
  const result = select(writeFixture(metadata));
  assert.deepEqual(result.next, [
    { tasklets: ['S01-F01-T01', 'S01-F01-T02'], planned_paths: ['src/a.js', 'src/a-helper.js'] },
  ]);
  assert.equal('S01-F03-T01' in result.criteria, false);
  assert.equal('S01-F01-T03' in result.criteria, false);
  assert.equal('S01-F02-T01' in result.criteria, false);
});

test('V3 bounds one batch and V2 selects one tasklet', () => {
  const tasklets = {};
  for (let index = 1; index <= MAX_BATCH_TASKLETS + 2; index += 1) {
    const id = `S01-F01-T${String(index).padStart(2, '0')}`;
    tasklets[id] = tasklet('S01-F01', [`src/${index}.js`], index === 1 ? {} : { depends_on: [`S01-F01-T${String(index - 1).padStart(2, '0')}`] });
  }
  const validation = `S01-F01-T${String(MAX_BATCH_TASKLETS + 2).padStart(2, '0')}`;
  tasklets[validation].depends_on = Object.keys(tasklets).filter((id) => id !== validation);
  const result = select(writeFixture(graphV3({
    features: { 'S01-F01': { depends_on: [], validation_tasklet: validation } },
    tasklets,
  })));
  assert.equal(result.next.length, 1);
  assert.equal(result.next[0].tasklets.length, MAX_BATCH_TASKLETS);
  assert.deepEqual(select(writeFixture(graphV2())).next, ['S01-F01-T01']);
});


test('preserves bracket route paths as exact tasklet leases', (t) => {
  for (const route of ['app/[id]/page.tsx', 'app/[...slug]/page.tsx', 'app/[[...slug]]/page.tsx']) {
    const graph = graphV3();
    graph.tasklets['S01-F01-T01'].planned_paths = [route];
    const fixture = writeFixture(graph);
    t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
    assert.deepEqual(select(fixture).next[0].planned_paths, [route]);
  }
  for (const invalid of ['app/*/page.tsx', 'app/?/page.tsx', 'app/{a,b}/page.tsx', '../app/page.tsx', '/app/page.tsx']) {
    const graph = graphV3();
    graph.tasklets['S01-F01-T01'].planned_paths = [invalid];
    const fixture = writeFixture(graph);
    t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
    assert.throws(() => readTaskletGraph(fixture.sprint), /glob syntax|invalid path segment/);
  }
});
