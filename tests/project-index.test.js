#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const {
  collectPlanProjection,
  collectTraceabilityProjection,
  evaluateValidationRules,
  normalizePlanPayloads,
  parseGrepArguments,
  parseRepositoryIndexUpdateArguments,
  parsePlanGraphArguments,
  parsePlanSearchArguments,
  parseSearchArguments,
  parseValidationArguments,
  publishTraceabilityGeneration,
  prepareGitCommitBatch,
  repositoryIndexProgress,
  queryPlanGraph,
  searchPlans,
  scopedTraceabilityEntityIds,
  searchTraceability,
  validateTraceability,
} = require('../src/project-index');

// Traceability: verifies REQ-TRACEABILITY-INDEX
// Traceability: verifies REQ-REPOSITORY-TEXT-INDEX

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-project-index-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify({
    schemaVersion: 1,
    projectId: '019c0000-0000-7000-8000-000000000001',
    projectName: 'fixture',
    database: { name: 'ponytail' },
  }));
  fs.writeFileSync(path.join(root, 'pm/requirements/value.md'),
    '# Visible requirement\n\n**Identifier:** `REQ-VALUE`\n');
  fs.writeFileSync(path.join(root, 'src/value.js'),
    `// ${'Trace' + 'ability'}: implements REQ-VALUE\n` +
    'const privateBody = "must-not-be-indexed";\n');
  const configurationPath = path.join(root, '.agents/config/project/traceability.json');
  fs.writeFileSync(configurationPath, JSON.stringify({
    schemaVersion: 2,
    projectRoot: '../../..',
    requirements: [{ id: 'REQ-VALUE', sourcePath: 'pm/requirements/value.md' }],
    artifacts: [{ class: 'implementation', path: 'src/value.js', locator: 'text' }],
    generatedArtifacts: [],
    reverseViewPath: 'pm/requirements/traceability.generated.md',
    index: { searchableFields: ['entityId', 'entityKind', 'requirementId', 'path'] },
  }));
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-qm', 'fixture',
  ], { cwd: root });
  return { configurationPath, root };
}

test('incremental commit preparation never rereads already indexed Git blobs', async () => {
  const { root } = fixture();
  const known = execFileSync('git', ['ls-tree', '-r', '--format=%(objectname)', 'HEAD'],
    { cwd: root, encoding: 'utf8' }).trim().split('\n');
  fs.writeFileSync(path.join(root, 'src/value.js'), 'const updated = true;\n');
  execFileSync('git', ['add', 'src/value.js'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-qm', 'update one blob'], { cwd: root });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const changed = execFileSync('git', ['rev-parse', 'HEAD:src/value.js'],
    { cwd: root, encoding: 'utf8' }).trim();
  const unchanged = execFileSync('git', ['ls-tree', '-r', '--format=%(objectname)', 'HEAD'],
    { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(oid => known.includes(oid));
  // Persisted immutable blobs need not be available for another content read.
  for (const oid of unchanged) fs.unlinkSync(path.join(root, '.git/objects', oid.slice(0, 2), oid.slice(2)));
  const queries = [];
  const client = { query: async (sql, values) => {
    queries.push({ sql, values });
    return { rows: unchanged.map(blob_oid => ({ blob_oid })) };
  } };
  const prepared = await prepareGitCommitBatch(client,
    { root, repositoryId: '019c0000-0000-7000-8000-000000000003' }, [[commit]]);
  assert.deepEqual([...prepared.blobs.keys()], [changed]);
  assert.equal(prepared.commits[0].entries.length, unchanged.length + 1);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /repository_id = \$1::uuid/);
  assert.deepEqual(new Set(queries[0].values[1]), new Set([...unchanged, changed]));
});

test('parses exact repository grep selectors and paths', () => {
  assert.deepEqual(parseGrepArguments(['needle']), {
    query: 'needle', selector: 'worktree', selectorValue: null, path: null, ignoreCase: false,
  });
  assert.deepEqual(parseGrepArguments([
    'needle', '--history', 'main', '--path', 'src/lib', '--ignore-case',
  ]), {
    query: 'needle', selector: 'history', selectorValue: 'main', path: 'src/lib', ignoreCase: true,
  });
  assert.throws(() => parseGrepArguments(['needle', '--ref', 'main', '--commit', 'abc123']),
    /mutually exclusive/);
  assert.throws(() => parseGrepArguments(['needle', '--path', '../outside']),
    /invalid repository path/);
  assert.throws(() => parseGrepArguments(['']), /must not be empty/);
});

test('parses exact repository index worker and transaction options', () => {
  assert.deepEqual(parseRepositoryIndexUpdateArguments([], 8), {
    workers: 4,
    commitsPerTransaction: 1,
  });
  assert.deepEqual(parseRepositoryIndexUpdateArguments(['-n', '5', '-j', '3'], 8), {
    workers: 3,
    commitsPerTransaction: 5,
  });
  for (const arguments of [
    ['-j'], ['-n'], ['-j', '0'], ['-n', '-1'], ['-j', '1.5'], ['-n', 'value'],
    ['-j', '2', '-j', '3'], ['-n', '2', '-n', '3'], ['--workers', '2'],
  ]) assert.throws(() => parseRepositoryIndexUpdateArguments(arguments, 8), /usage:/);
});

test('index progress emits cumulative markers, throughput ETA, and final publication phase', () => {
  let output = '';
  let milliseconds = 0;
  const progress = repositoryIndexProgress({ write: text => { output += text; } }, () => milliseconds);
  progress.update(0, 51);
  assert.match(output, /51 unseen commits \(ETA unknown\)/);
  for (let count = 1; count <= 50; count += 1) {
    milliseconds += 1000;
    progress.update(count, 51);
  }
  assert.equal((output.match(/\./gu) ?? []).length, 50);
  assert.equal((output.match(/\+/gu) ?? []).length, 5);
  assert.match(output, /\| 98% ETA 1s\n$/);
  progress.update(51, 51);
  progress.publish();
  assert.match(output, /\.\nHistory complete; publishing refs and worktree overlay\n$/);
  progress.stop();
});

test('index progress extends one durable total for a late history snapshot', () => {
  let output = '';
  let milliseconds = 0;
  const progress = repositoryIndexProgress({ write: text => { output += text; } }, () => milliseconds);
  progress.update(0, 2);
  milliseconds = 1000;
  progress.update(1, 2);
  milliseconds = 2000;
  progress.update(2, 2);
  progress.update(2, 3);
  milliseconds = 3000;
  progress.update(3, 3);
  progress.publish();
  assert.equal((output.match(/\./gu) ?? []).length, 3);
  assert.match(output, /\.\.\nDiscovered 1 additional unseen commits \(ETA 1s\)\n\.\nHistory complete/);
});

test('index progress ends interrupted lines and handles a zero-commit update', () => {
  let output = '';
  const progress = repositoryIndexProgress({ write: text => { output += text; } }, () => 0);
  progress.update(0, 2);
  progress.update(1, 2);
  progress.stop();
  assert.match(output, /\.\n$/);
  const empty = repositoryIndexProgress({ write: text => { output += text; } }, () => 0);
  empty.update(0, 0);
  empty.publish();
  assert.match(output, /0 unseen commits \(ETA 0s\)/);
});

test('TTY index progress renders the installed open-source bar with percent and explicit ETA', () => {
  let output = '';
  let milliseconds = 0;
  const progress = repositoryIndexProgress({
    isTTY: true, columns: 120, write: text => { output += text; },
  }, () => milliseconds);
  try {
    progress.update(0, 2);
    assert.match(output, /History \[.*\] 0% 0\/2 commits \| ETA unknown/);
    milliseconds = 1000;
    progress.update(1, 2);
  } finally {
    progress.stop();
  }
  assert.match(output, /50% 1\/2 commits \| ETA 1s/);
});

function planFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-plan-index-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/in_progress/root'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/child'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/invalid'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/dependency'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/dependent'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/referrer'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/open/referenced'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/legacy'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pm/plans/legacy-invalid'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify({
    schemaVersion: 1,
    projectId: '019c0000-0000-7000-8000-000000000002',
    projectName: 'plan fixture',
    database: { name: 'ponytail' },
  }));
  fs.writeFileSync(path.join(root, '.agents/config/project/management.json'), JSON.stringify({
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: {
        initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed',
        deferred: 'deferred', rejected: 'rejected',
      },
    },
    legacyPlanLayout: 'flat',
  }));
  fs.writeFileSync(path.join(root, 'pm/plans/in_progress/root/plan.md'), `# Root plan

- **Plan ID:** \`root\`
- **Status:** \`in_progress\`
- **Member plan:** [child](../../open/child/plan.md)

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"root","parent_plan_id":null}
-->

## Processor architecture

Own the payment processor.
`);
  fs.writeFileSync(path.join(root, 'pm/plans/open/child/plan.md'), `# Child plan

- **Plan ID:** \`child\`
- **Status:** \`open\`
- **Parent:** [root](../../in_progress/root/plan.md)

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"child","parent_plan_id":"root"}
-->

## Child objective

Extend processor routing.
`);
  fs.writeFileSync(path.join(root, 'pm/plans/legacy/plan.md'), '# Legacy note\n\nUnmanaged processor notes.\n');
  fs.writeFileSync(path.join(root, 'pm/plans/legacy-invalid/plan.md'), `# Invalid legacy plan

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"legacy-invalid","parent_plan_id":null}
-->
<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"legacy-invalid","parent_plan_id":null}
-->
`);
  fs.writeFileSync(path.join(root, 'pm/plans/open/invalid/plan.md'), '# Invalid managed plan\n');
  fs.writeFileSync(path.join(root, 'pm/plans/open/dependency/plan.md'), '# Unmarked dependency plan\n');
  fs.writeFileSync(path.join(root, 'pm/plans/open/dependent/plan.md'), `# Dependent plan

- **Plan ID:** \`dependent\`
- **Status:** \`open\`

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"dependent","parent_plan_id":null,"depends_on":["dependency"]}
-->
`);
  fs.writeFileSync(path.join(root, 'pm/plans/open/referenced/plan.md'), '# Referenced legacy plan\n');
  fs.writeFileSync(path.join(root, 'pm/plans/open/referrer/plan.md'), `# Referrer plan

- **Plan ID:** \`referrer\`
- **Status:** \`open\`
- **Parent:** [referenced](../referenced/plan.md)

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"referrer","parent_plan_id":"referenced"}
-->
`);
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-qm', 'fixture',
  ], { cwd: root });
  return root;
}

function freshPlanClient(projection, rows) {
  const queries = [];
  const client = {
    async query(text, values = []) {
      queries.push({ text, values });
      if (text.includes('to_regclass')) return { rows: [{ relation: 'schema_version_v1' }] };
      if (text.includes('FROM ponytail_index.schema_version_v1')) return { rows: [{ schema_version: 1 }] };
      if (text.includes('FROM ponytail_index.project_v1')) return { rows: [{
        generation_id: 'plan-generation',
        head_commit: projection.headCommit,
        state_digest: projection.stateDigest,
        configuration_digest: projection.configurationDigest,
        parser_identity: projection.parserIdentity,
      }] };
      return { rows };
    },
    release() {},
  };
  return { client, queries, pool: { async connect() { return client; } } };
}

class BoundaryClient {
  constructor(options = {}) {
    this.options = options;
    this.queries = [];
    this.parseResult = 0;
  }

  async query(text, values = []) {
    this.queries.push({ text, values });
    if (this.options.failAt !== undefined && text.includes(this.options.failAt)) {
      throw new Error('injected database failure');
    }
    if (text.includes('pg_try_advisory_xact_lock')) {
      return { rows: [{ acquired: this.options.acquired ?? true }] };
    }
    if (text.includes('RETURNING repository_id')) return { rows: [{ repository_id: 'repository' }] };
    if (text.includes('RETURNING worktree_id')) return { rows: [{ worktree_id: 'worktree' }] };
    if (text.includes('FROM ponytail_index.published_generation_v1')) return { rows: [] };
    if (text.includes('RETURNING generation_id')) return { rows: [{ generation_id: 'generation' }] };
    if (text.includes('SELECT parse_result_id, payload')) {
      if (this.options.cachedPayload !== undefined) {
        this.parseResult += 1;
        return { rows: [{
          parse_result_id: `parse-${this.parseResult}`,
          payload: this.options.cachedPayload,
        }] };
      }
      return { rows: [] };
    }
    if (text.includes('INSERT INTO ponytail_index.parse_result_v1')) {
      this.parseResult += 1;
      this.options.cachedPayload = JSON.parse(values[4]);
      return { rows: [] };
    }
    return { rows: [] };
  }
}

test('collects exact Git state and only normalized traceability content', () => {
  const { configurationPath, root } = fixture();
  const first = collectTraceabilityProjection(configurationPath);
  assert.equal(first.files.every(file => file.gitState === 'tracked'), true);
  assert.equal(first.files.some(file => file.parse().entities.some(
    entity => entity.entityId === 'REQ-VALUE' && entity.description === 'Visible requirement',
  )), true);
  assert.doesNotMatch(JSON.stringify(first), /must-not-be-indexed/);

  fs.appendFileSync(path.join(root, 'src/value.js'), '// changed\n');
  const second = collectTraceabilityProjection(configurationPath);
  assert.notEqual(second.stateDigest, first.stateDigest);
  assert.equal(second.files.find(file => file.path === 'src/value.js').gitState, 'modified');
  assert.equal(second.repositoryPath, fs.realpathSync(path.join(root, '.git')));
  assert.equal(second.worktreePath, fs.realpathSync(root));
});

test('replaces renamed configured paths without retaining deleted inputs', () => {
  const { configurationPath, root } = fixture();
  execFileSync('git', ['mv', 'src/value.js', 'src/renamed.js'], { cwd: root });
  const configuration = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
  configuration.artifacts[0].path = 'src/renamed.js';
  fs.writeFileSync(configurationPath, JSON.stringify(configuration));
  const projection = collectTraceabilityProjection(configurationPath);
  assert.equal(projection.files.some(file => file.path === 'src/value.js'), false);
  const renamed = projection.files.find(file => file.path === 'src/renamed.js');
  assert.equal(renamed.gitState, 'modified');
  assert.equal(renamed.parse().relationships[0].targetEntityId, 'REQ-VALUE');
});

test('projects explicit inventories and stable prospective planning entities', () => {
  const { configurationPath, root } = fixture();
  const requirementId = 'REQ-' + 'VALUE';
  const configuration = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
  configuration.schemaVersion = 3;
  configuration.entities = [{
    kind: 'endpoint', id: 'GET-value', path: 'src/value.js', line: 1,
    annotation: 'GET /value', description: 'Returns a value.',
  }];
  configuration.artifacts.push({ class: 'plan', path: 'plan.md', locator: 'text' });
  fs.writeFileSync(configurationPath, JSON.stringify(configuration));
  fs.writeFileSync(
    path.join(root, 'src/value.js'),
    `// Traceability: implements ${requirementId} from endpoint GET-value\n`,
  );
  fs.writeFileSync(
    path.join(root, 'plan.md'),
    `Traceability: plans-implementation ${requirementId} from tasklet S01-F01-T01\n` +
    `Traceability: plans-verification ${requirementId} from tasklet S01-F01-T01\n`,
  );
  const projection = collectTraceabilityProjection(configurationPath);
  const payloads = projection.files.map(file => file.parse());
  const entities = payloads.flatMap(payload => payload.entities);
  const relationships = payloads.flatMap(payload => payload.relationships);
  assert.equal(entities.filter(entity => entity.entityId === 'trace:endpoint:GET-value').length, 1);
  assert.equal(entities.filter(entity =>
    entity.entityId === 'trace:tasklet:plan.md:S01-F01-T01').length, 1);
  assert.deepEqual(relationships.filter(relationship =>
    relationship.sourceEntityId === 'trace:tasklet:plan.md:S01-F01-T01')
    .map(relationship => relationship.role), [
    'plans-implementation', 'plans-verification',
  ]);
});

test('does not parse files already present in the immutable cache', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  let parses = 0;
  for (const file of projection.files) {
    const parse = file.parse;
    file.parse = () => {
      parses += 1;
      return parse();
    };
  }
  const client = new BoundaryClient({
    cachedPayload: { schemaVersion: 1, entities: [], relationships: [] },
  });
  await publishTraceabilityGeneration(client, projection);
  assert.equal(parses, 0);
  assert.equal(client.queries.some(query =>
    query.text.includes('INSERT INTO ponytail_index.parse_result_v1')), false);
});

test('publishes a complete generation with parameterized statements', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  const client = new BoundaryClient();
  const result = await publishTraceabilityGeneration(client, projection);
  assert.equal(result.stateDigest, projection.stateDigest);
  assert.equal(client.queries[0].text, 'BEGIN');
  assert.equal(client.queries.at(-1).text, 'COMMIT');
  const publication = client.queries.find(query =>
    query.text.includes('INSERT INTO ponytail_index.published_generation_v1'));
  assert.deepEqual(publication.values, ['worktree', 'traceability', 'generation']);
  assert.equal(client.queries.every(query => !query.text.includes(projection.projectName)), true);
});

test('rolls back failed and contended publications', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  for (const client of [
    new BoundaryClient({ acquired: false }),
    new BoundaryClient({ failAt: 'INSERT INTO ponytail_index.generation_v1' }),
  ]) {
    await assert.rejects(() => publishTraceabilityGeneration(client, projection));
    assert.equal(client.queries.at(-1).text, 'ROLLBACK');
    assert.equal(client.queries.some(query => query.text === 'COMMIT'), false);
  }
});

test('rejects malformed durable cache payloads before publication', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  const client = new BoundaryClient({ cachedPayload: { schemaVersion: 1 } });
  await assert.rejects(
    () => publishTraceabilityGeneration(client, projection),
    /invalid project-index storage V1 payload/,
  );
  assert.equal(client.queries.at(-1).text, 'ROLLBACK');
});

test('parses exact search filters and rejects ambiguous options', () => {
  assert.deepEqual(parseSearchArguments([
    'processor', '--kind', 'implementation', '--role', 'implements',
    '--requirement', 'REQ-VALUE', '--path', 'src/value.js', '--json',
  ]), {
    query: 'processor',
    filters: {
      kind: 'implementation',
      role: 'implements',
      requirement: 'REQ-VALUE',
      path: 'src/value.js',
    },
    json: true,
  });
  assert.throws(() => parseSearchArguments([]), /usage:/);
  assert.throws(
    () => parseSearchArguments(['processor', '--kind', 'one', '--kind', 'two']),
    /invalid search option/,
  );
  assert.throws(() => parseSearchArguments(['processor', '--unknown']), /invalid search option/);
});

test('parses mutually exclusive validation scopes', () => {
  assert.deepEqual(parseValidationArguments([]), {
    json: false, scope: { kind: 'repository', input: null },
  });
  assert.deepEqual(parseValidationArguments(['--plan', 'child', '--json']), {
    json: true, scope: { kind: 'plan', input: 'child' },
  });
  assert.throws(
    () => parseValidationArguments(['--plan', 'one', '--campaign', 'two']),
    /invalid validate option/,
  );
  assert.throws(() => parseValidationArguments(['--campaign']), /invalid validate option/);
});

test('reports every directional cardinality gap without counting prospective roles', () => {
  const configuration = {
    requirements: [
      { id: 'REQ-ONE', sourcePath: 'one.md' },
      { id: 'REQ-TWO', sourcePath: 'two.md', noUnitTestReason: 'Not executable.' },
    ],
    validationRules: [
      {
        id: 'endpoint-requirement', sourceKind: 'endpoint', targetKind: 'requirement',
        roles: ['implements'], direction: 'forward', cardinality: { minimum: 1 },
      },
      {
        id: 'requirement-endpoint', sourceKind: 'requirement', targetKind: 'endpoint',
        roles: ['implements'], direction: 'reverse', cardinality: { minimum: 1 },
      },
      {
        id: 'requirement-unit', sourceKind: 'requirement', targetKind: 'unit-test',
        roles: ['verifies'], direction: 'reverse', cardinality: { minimum: 1 },
      },
    ],
  };
  const entities = [
    { entity_id: 'REQ-ONE', entity_kind: 'requirement', path: 'one.md', line: null },
    { entity_id: 'REQ-TWO', entity_kind: 'requirement', path: 'two.md', line: null },
    { entity_id: 'trace:endpoint:one', entity_kind: 'endpoint', path: 'api.ts', line: 3 },
    { entity_id: 'trace:endpoint:orphan', entity_kind: 'endpoint', path: 'api.ts', line: 9 },
    { entity_id: 'trace:unit:one', entity_kind: 'unit-test', path: 'api.test.ts', line: 4 },
    { entity_id: 'trace:tasklet:one', entity_kind: 'tasklet', path: 'plan.md', line: 4 },
  ];
  const relationships = [
    { source_entity_id: 'trace:endpoint:one', target_entity_id: 'REQ-ONE', role: 'implements' },
    { source_entity_id: 'trace:unit:one', target_entity_id: 'REQ-ONE', role: 'verifies' },
    { source_entity_id: 'trace:tasklet:one', target_entity_id: 'REQ-TWO', role: 'plans-implementation' },
  ];
  const gaps = evaluateValidationRules(
    configuration, entities, relationships, new Set(entities.map(entity => entity.entity_id)),
  );
  assert.deepEqual(gaps.map(gap => [gap.ruleId, gap.sourceEntityId]), [
    ['endpoint-requirement', 'trace:endpoint:orphan'],
    ['requirement-endpoint', 'REQ-TWO'],
  ]);
});

test('validates only the exact fresh indexed graph and emits typed gaps', async () => {
  const { configurationPath } = fixture();
  const configuration = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
  configuration.schemaVersion = 4;
  configuration.entities = [];
  configuration.validationRules = [
    {
      id: 'requirement-implementation', sourceKind: 'requirement', targetKind: 'implementation',
      roles: ['implements'], direction: 'reverse', cardinality: { minimum: 1 },
    },
    {
      id: 'requirement-unit', sourceKind: 'requirement', targetKind: 'unit-test',
      roles: ['verifies'], direction: 'reverse', cardinality: { minimum: 1 },
    },
  ];
  fs.writeFileSync(configurationPath, JSON.stringify(configuration));
  const projection = collectTraceabilityProjection(configurationPath);
  const queries = [];
  const client = {
    async query(text, values = []) {
      queries.push({ text, values });
      if (text.includes('to_regclass')) return { rows: [{ relation: 'schema_version_v1' }] };
      if (text.includes('FROM ponytail_index.schema_version_v1')) return { rows: [{ schema_version: 1 }] };
      if (text.includes('FROM ponytail_index.project_v1')) return { rows: [{
        generation_id: 'generation', head_commit: projection.headCommit,
        state_digest: projection.stateDigest,
        configuration_digest: projection.configurationDigest,
        parser_identity: projection.parserIdentity,
      }] };
      if (text.includes('FROM ponytail_index.entity_v1')) return { rows: [
        { entity_id: 'REQ-VALUE', entity_kind: 'requirement', path: 'requirements.md', line: null },
        { entity_id: 'implementation', entity_kind: 'implementation', path: 'src/value.js', line: 1 },
      ] };
      return { rows: [{
        source_entity_id: 'implementation', target_entity_id: 'REQ-VALUE', role: 'implements',
      }] };
    },
    release() {},
  };
  const result = await validateTraceability(
    { kind: 'repository', input: null },
    { configurationPath, pool: { async connect() { return client; } } },
  );
  assert.deepEqual(result.gaps.map(gap => [gap.ruleId, gap.sourceEntityId, gap.actual]), [
    ['requirement-unit', 'REQ-VALUE', 0],
  ]);
  assert.equal(result.scope.kind, 'repository');
  assert.equal(queries.at(-1).values[0], 'generation');
});

test('derives exact plan and campaign entity closure through canonical membership and issue links', () => {
  const root = planFixture();
  fs.mkdirSync(path.join(root, 'pm/bugs/open'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'pm/bugs/open/issue.md'),
    '# Issue\n\nPlan: [child](../../plans/open/child/plan.md)\n',
  );
  const configuration = {
    artifacts: [{ class: 'issue', path: 'pm/bugs/open/issue.md' }],
  };
  const entities = [
    { entity_id: 'trace:plan:root', entity_kind: 'plan', path: 'pm/plans/in_progress/root/plan.md' },
    { entity_id: 'trace:tasklet:child', entity_kind: 'tasklet', path: 'pm/plans/open/child/plan.md' },
    { entity_id: 'trace:issue:one', entity_kind: 'issue', path: 'pm/bugs/open/issue.md' },
    { entity_id: 'REQ-ROOT', entity_kind: 'requirement', path: 'requirements.md' },
    { entity_id: 'REQ-CHILD', entity_kind: 'requirement', path: 'requirements.md' },
    { entity_id: 'trace:implementation:child', entity_kind: 'implementation', path: 'src/child.js' },
  ];
  const relationships = [
    { source_entity_id: 'trace:plan:root', target_entity_id: 'REQ-ROOT', role: 'plans-implementation' },
    { source_entity_id: 'trace:tasklet:child', target_entity_id: 'REQ-CHILD', role: 'plans-implementation' },
    { source_entity_id: 'trace:issue:one', target_entity_id: 'REQ-CHILD', role: 'introduces' },
    { source_entity_id: 'trace:implementation:child', target_entity_id: 'REQ-CHILD', role: 'implements' },
  ];
  const rows = entities.map(entity => ({ ...entity, line: null }));
  const plan = scopedTraceabilityEntityIds(
    configuration, { worktreePath: root }, { kind: 'plan', input: 'child' }, rows, relationships,
  );
  assert.equal(plan.id, 'child');
  assert.deepEqual([...plan.entityIds].sort(), [
    'REQ-CHILD', 'trace:implementation:child', 'trace:issue:one', 'trace:tasklet:child',
  ]);
  const campaign = scopedTraceabilityEntityIds(
    configuration, { worktreePath: root }, { kind: 'campaign', input: 'child' }, rows, relationships,
  );
  assert.equal(campaign.id, 'root');
  assert.equal(campaign.entityIds.has('REQ-ROOT'), true);
  assert.equal(campaign.entityIds.has('trace:plan:root'), true);
});

test('searches only the exact fresh generation with bound filters', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  const queries = [];
  let released = false;
  const client = {
    async query(text, values = []) {
      queries.push({ text, values });
      if (text.includes('to_regclass')) return { rows: [{ relation: 'schema_version_v1' }] };
      if (text.includes('FROM ponytail_index.schema_version_v1')) {
        return { rows: [{ schema_version: 1 }] };
      }
      if (text.includes('FROM ponytail_index.project_v1')) {
        return { rows: [{
          generation_id: 'generation',
          head_commit: projection.headCommit,
          state_digest: projection.stateDigest,
          configuration_digest: projection.configurationDigest,
          parser_identity: projection.parserIdentity,
        }] };
      }
      return { rows: [{
        entity_id: 'entity',
        entity_kind: 'implementation',
        role: 'implements',
        requirement_id: 'REQ-VALUE',
        path: 'src/value.js',
        line: 1,
        unit_name: null,
        annotation: 'implements REQ-VALUE',
        description: null,
      }] };
    },
    release() { released = true; },
  };
  const pool = { async connect() { return client; } };
  const filters = {
    kind: 'implementation',
    role: 'implements',
    requirement: 'REQ-VALUE',
    path: 'src/value.js',
  };
  const result = await searchTraceability('processor & \' injection', filters, {
    configurationPath,
    pool,
  });
  assert.equal(result.results.length, 1);
  assert.equal(released, true);
  const search = queries.at(-1);
  assert.deepEqual(search.values, [
    'generation',
    'processor & \' injection',
    'implementation',
    'implements',
    'REQ-VALUE',
    'src/value.js',
  ]);
  assert.doesNotMatch(search.text, /processor|REQ-VALUE/);
  assert.match(search.text, /ORDER BY document\.path/);
});

test('refuses stale search without rebuilding', async () => {
  const { configurationPath } = fixture();
  const projection = collectTraceabilityProjection(configurationPath);
  const client = {
    async query(text) {
      if (text.includes('to_regclass')) return { rows: [{ relation: 'schema_version_v1' }] };
      if (text.includes('schema_version_v1')) return { rows: [{ schema_version: 1 }] };
      return { rows: [{
        generation_id: 'generation',
        head_commit: projection.headCommit,
        state_digest: 'stale',
        configuration_digest: projection.configurationDigest,
        parser_identity: projection.parserIdentity,
      }] };
    },
    release() {},
  };
  await assert.rejects(
    () => searchTraceability('value', {
      kind: null,
      role: null,
      requirement: null,
      path: null,
    }, {
      configurationPath,
      pool: { async connect() { return client; } },
    }),
    /traceability index is stale/,
  );
});

test('indexes canonical plan hierarchy and separates legacy, invalid, and stranded plans', () => {
  const root = planFixture();
  const projection = collectPlanProjection(root);
  const normalized = normalizePlanPayloads(projection.files.map(file => file.parse()));
  assert.equal(projection.corpus, 'plans');
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:root' && entity.entityKind === 'plan' &&
    entity.searchRole === 'in_progress'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityKind === 'plan-section' && entity.annotation === 'Processor architecture' &&
    entity.description === 'Own the payment processor.'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:legacy' && entity.entityKind === 'legacy-plan' &&
    entity.status === 'CAMPAIGN_LEGACY_UNMANAGED' && entity.searchRole === null), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:invalid' && entity.entityKind === 'legacy-plan' &&
    entity.status === 'CAMPAIGN_LEGACY_UNMANAGED' && entity.searchRole === 'open'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:referenced' && entity.entityKind === 'invalid-plan' &&
    entity.status === 'CAMPAIGN_PLAN_BLOCK' && entity.searchRole === 'open'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:referrer' && entity.entityKind === 'invalid-plan' &&
    entity.status === 'CAMPAIGN_PARENT_MISSING' && entity.searchRole === 'open'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:dependency' && entity.entityKind === 'invalid-plan' &&
    entity.status === 'CAMPAIGN_PLAN_BLOCK' && entity.searchRole === 'open'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:dependent' && entity.entityKind === 'invalid-plan' &&
    entity.status === 'CAMPAIGN_DEPENDENCY_MISSING' && entity.searchRole === 'open'), true);
  assert.equal(normalized.entities.some(entity =>
    entity.entityId === 'plan:legacy-invalid' && entity.entityKind === 'invalid-plan' &&
    entity.status === 'CAMPAIGN_PLAN_BLOCK' && entity.searchRole === null), true);
  assert.equal(normalized.relationships.some(relationship =>
    relationship.sourceEntityId === 'plan:child' &&
    relationship.targetEntityId === 'plan:root' &&
    relationship.role === 'campaign-parent'), true);
});

test('reuses immutable cached plan parses without opening the source parser', async () => {
  const projection = collectPlanProjection(planFixture());
  let parses = 0;
  for (const file of projection.files) {
    const parse = file.parse;
    file.parse = () => {
      parses += 1;
      return parse();
    };
  }
  const client = new BoundaryClient({
    cachedPayload: { schemaVersion: 1, records: [] },
  });
  await publishTraceabilityGeneration(client, projection);
  assert.equal(parses, 0);
});

test('classifies missing-parent and cyclic plan records as invalid rather than stranded', () => {
  const record = (recordId, parentPlanId) => ({
    recordKind: 'plan', recordId, owningPlanId: recordId,
    path: `pm/plans/open/${recordId}/plan.md`, line: 1,
    heading: recordId, excerpt: null, lifecycle: 'open', status: null,
    parentPlanId, dependsOn: [], plannedPaths: [],
    linkedPlanPaths: [],
  });
  const records = [
    record('missing', 'absent'),
    record('cycle-a', 'cycle-b'),
    record('cycle-b', 'cycle-a'),
    record('cycle-child', 'cycle-a'),
  ];
  for (const child of records) {
    const parent = records.find(candidate => candidate.recordId === child.parentPlanId);
    if (parent !== undefined) parent.linkedPlanPaths.push(child.path);
  }
  const normalized = normalizePlanPayloads([{ schemaVersion: 1, records }]);
  assert.deepEqual(normalized.entities.map(entity => [entity.unitName, entity.entityKind, entity.status]), [
    ['missing', 'invalid-plan', 'CAMPAIGN_PARENT_MISSING'],
    ['cycle-a', 'invalid-plan', 'CAMPAIGN_PARENT_CYCLE'],
    ['cycle-b', 'invalid-plan', 'CAMPAIGN_PARENT_CYCLE'],
    ['cycle-child', 'invalid-plan', 'CAMPAIGN_PARENT_INVALID'],
  ]);
  assert.deepEqual(normalized.relationships, []);
});

test('strands a member whose campaign does not reference it', () => {
  const base = {
    line: 1, heading: null, excerpt: null, lifecycle: 'open', status: null,
    dependsOn: [], plannedPaths: [], linkedPlanPaths: [],
  };
  const normalized = normalizePlanPayloads([{ schemaVersion: 1, records: [
    { ...base, recordKind: 'plan', recordId: 'root', owningPlanId: 'root',
      path: 'pm/plans/open/root/plan.md', parentPlanId: null },
    { ...base, recordKind: 'plan', recordId: 'child', owningPlanId: 'child',
      path: 'pm/plans/open/child/plan.md', parentPlanId: 'root' },
  ] }]);
  assert.equal(normalized.entities.find(entity => entity.unitName === 'child').status,
    'CAMPAIGN_MEMBER_LINK');
  assert.deepEqual(normalized.relationships, []);
});

test('parses exact plan search and graph query arguments', () => {
  assert.deepEqual(parsePlanSearchArguments([
    'processor', '--lifecycle', 'open', '--kind', 'plan-section', '--plan', 'child', '--json',
  ]), {
    query: 'processor',
    filters: { lifecycle: 'open', kind: 'plan-section', plan: 'child' },
    json: true,
  });
  assert.deepEqual(parsePlanGraphArguments('descendants', ['root', '--direct', '--json']), {
    input: 'root', direct: true, json: true,
  });
  assert.deepEqual(parsePlanGraphArguments('roots', ['--json']), {
    input: null, direct: false, json: true,
  });
  assert.throws(() => parsePlanSearchArguments(['processor', '--plan']), /invalid search option/);
  assert.throws(() => parsePlanGraphArguments('ancestors', ['child', '--direct']), /invalid ancestors option/);
});

test('searches the exact fresh plan generation with bound filters', async () => {
  const root = planFixture();
  const projection = collectPlanProjection(root);
  const boundary = freshPlanClient(projection, [{
    entity_id: 'plan-section:child:section-9',
    entity_kind: 'plan-section',
    unit_name: 'child',
    role: 'open',
    path: 'pm/plans/open/child/plan.md',
    line: 9,
    annotation: 'Child objective',
    description: 'Extend processor routing.',
  }]);
  const result = await searchPlans('processor & injection', {
    lifecycle: 'open', kind: 'plan-section', plan: 'child',
  }, { root, pool: boundary.pool });
  assert.equal(result.results[0].owningPlanId, 'child');
  const search = boundary.queries.at(-1);
  assert.deepEqual(search.values, [
    'plan-generation', 'processor & injection', 'open', 'plan-section', 'child',
  ]);
  assert.doesNotMatch(search.text, /processor|child/);
  assert.match(search.text, /search_document_v2/);
  assert.match(search.text, /text\.content ILIKE/);
});

test('refuses stale plan queries without rebuilding', async () => {
  const root = planFixture();
  const projection = collectPlanProjection(root);
  const boundary = freshPlanClient({ ...projection, stateDigest: 'current' }, []);
  await assert.rejects(
    () => searchPlans('processor', {
      lifecycle: null, kind: null, plan: null,
    }, { root, pool: boundary.pool }),
    /plans index is stale for this worktree; run ponytail traceability index/,
  );
  assert.equal(boundary.queries.some(query =>
    query.text.includes('websearch_to_tsquery')), false);
});

test('queries plan descendants, roots, and stranded records from the fresh generation', async () => {
  const root = planFixture();
  const projection = collectPlanProjection(root);
  for (const [operation, input, direct, row] of [
    ['descendants', 'root', true, {
      entity_id: 'plan:child', role: 'open', path: 'pm/plans/open/child/plan.md', reason: null,
    }],
    ['ancestors', 'child', false, {
      entity_id: 'plan:root', role: 'in_progress', path: 'pm/plans/in_progress/root/plan.md', reason: null,
    }],
    ['roots', null, false, {
      entity_id: 'plan:root', role: 'in_progress', path: 'pm/plans/in_progress/root/plan.md', reason: null,
    }],
    ['stranded', null, false, {
      entity_id: 'plan:child', role: 'open', path: 'pm/plans/open/child/plan.md', reason: 'campaign root does not reference child',
    }],
  ]) {
    const boundary = freshPlanClient(projection, [row]);
    const result = await queryPlanGraph(operation, input, direct, { root, pool: boundary.pool });
    assert.equal(result.results[0].planId, row.entity_id.slice(5));
    assert.equal(boundary.queries.at(-1).values[0], 'plan-generation');
    if (operation === 'descendants') {
      assert.deepEqual(boundary.queries.at(-1).values, ['plan-generation', 'plan:root']);
      assert.match(boundary.queries.at(-1).text, /tree\.depth = 1/);
    } else if (operation === 'ancestors') {
      assert.deepEqual(boundary.queries.at(-1).values, ['plan-generation', 'plan:child']);
      assert.match(boundary.queries.at(-1).text, /relation\.source_entity_id = tree\.entity_id/);
    }
  }
});
