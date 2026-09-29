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
  collectTraceabilityProjection,
  publishTraceabilityGeneration,
} = require('../src/project-index');

// Traceability: verifies REQ-TRACEABILITY-INDEX

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
