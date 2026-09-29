#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.
# Traceability: verifies REQ-TRACEABILITY-INDEX

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

main() {
  local project_root
  command -v node >/dev/null || fail 'node is required'
  command -v psql >/dev/null || fail 'psql is required'
  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  "${project_root}/scripts/setup-project-journal.sh" >/dev/null
  node - "${project_root}" <<'NODE'
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const {
  collectPlanProjection,
  collectTraceabilityProjection,
  indexTraceability,
  publishTraceabilityGeneration,
} = require(path.join(process.argv[2], 'src/project-index'));

async function main() {
  const root = process.argv[2];
  const configurationPath = path.join(root, '.agents/config/project/traceability.json');
  const database = JSON.parse(fs.readFileSync(
    path.join(root, 'ponytail-journal.json'), 'utf8')).database;
  const pool = new Pool({
    database: database.name,
    host: database.host,
    port: database.port,
    user: database.role,
    password: database.passwordEnvironment === undefined
      ? undefined : process.env[database.passwordEnvironment],
  });
  const projectId = crypto.randomUUID();
  const gapProjectId = crypto.randomUUID();
  const projectName = `project-index-contract-${projectId}`;
  const repositoryPath = `contract://${projectId}`;
  const base = collectTraceabilityProjection(configurationPath);
  const first = {
    ...base,
    projectId,
    projectName,
    repositoryPath,
    worktreePath: `${repositoryPath}/one`,
  };
  const second = { ...first, worktreePath: `${repositoryPath}/two` };
  const client = await pool.connect();
  let gapRoot;
  try {
    const firstResult = await publishTraceabilityGeneration(client, first);
    const secondResult = await publishTraceabilityGeneration(client, second);
    assert.notEqual(firstResult.generationId, secondResult.generationId);
    assert.equal(firstResult.stateDigest, secondResult.stateDigest);

    const reuse = await client.query(`
      SELECT
        (SELECT count(*)::integer FROM ponytail_index.parse_result_v1
         WHERE project_id = $1::uuid) AS parse_results,
        (SELECT count(*)::integer FROM ponytail_index.published_generation_v1 published
         JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
         JOIN ponytail_index.repository_v1 repository USING (repository_id)
         WHERE repository.project_id = $1::uuid) AS publications`, [projectId]);
    assert.equal(reuse.rows[0].parse_results, first.files.length);
    assert.equal(reuse.rows[0].publications, 2);
    const search = await client.query(`
      SELECT
        count(*) FILTER (
          WHERE document.search_vector @@ plainto_tsquery('simple', $2)
        )::integer AS visible,
        count(*) FILTER (
          WHERE document.search_vector @@ plainto_tsquery('simple', $3)
        )::integer AS excluded
      FROM ponytail_index.search_document_v1 document
      JOIN ponytail_index.generation_v1 generation USING (generation_id)
      JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
      JOIN ponytail_index.repository_v1 repository USING (repository_id)
      WHERE repository.project_id = $1::uuid`, [
      projectId,
      'REQ-REQUIREMENTS-TRACEABILITY',
      'must-not-be-indexed',
    ]);
    assert.ok(search.rows[0].visible > 0);
    assert.equal(search.rows[0].excluded, 0);
    const privileges = await client.query(`
      SELECT
        has_schema_privilege('public', 'ponytail_index', 'USAGE') AS public_schema,
        has_table_privilege(
          'public', 'ponytail_index.search_document_v1', 'SELECT'
        ) AS public_table`);
    assert.deepEqual(privileges.rows[0], { public_schema: false, public_table: false });

    const rebuilt = await publishTraceabilityGeneration(client, first);
    assert.equal(rebuilt.stateDigest, firstResult.stateDigest);
    const generations = await client.query(`
      SELECT count(*)::integer AS count
      FROM ponytail_index.generation_v1 generation
      JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
      JOIN ponytail_index.repository_v1 repository USING (repository_id)
      WHERE repository.project_id = $1::uuid`, [projectId]);
    assert.equal(generations.rows[0].count, 2);

    const reduced = {
      ...first,
      stateDigest: crypto.createHash('sha256').update('reduced').digest('hex'),
      files: first.files.slice(1),
    };
    const reducedResult = await publishTraceabilityGeneration(client, reduced);
    const cleanup = await client.query(`
      SELECT count(*)::integer AS count
      FROM ponytail_index.file_v1
      WHERE generation_id = $1::uuid`, [reducedResult.generationId]);
    assert.equal(cleanup.rows[0].count, reduced.files.length);

    const beforeFailure = reducedResult.generationId;
    const invalid = { ...first, files: first.files.map(file => ({ ...file })) };
    const payloads = invalid.files.map(file => file.parse());
    const requirement = payloads.flatMap(payload => payload.entities)
      .find(entity => entity.entityKind === 'requirement');
    const invalidFile = invalid.files.find((file, index) =>
      payloads[index].entities.some(entity => entity.entityKind === 'requirement'));
    const validParse = invalidFile.parse;
    invalidFile.parserIdentity = crypto.createHash('sha256')
      .update(`${invalidFile.parserIdentity}-invalid`).digest('hex');
    invalidFile.parse = () => {
      const payload = validParse();
      payload.entities.push(requirement);
      return payload;
    };
    await assert.rejects(() => publishTraceabilityGeneration(client, invalid));
    const afterFailure = await client.query(`
      SELECT published.generation_id
      FROM ponytail_index.published_generation_v1 published
      JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
      JOIN ponytail_index.repository_v1 repository USING (repository_id)
      WHERE repository.project_id = $1::uuid AND worktree.root_path = $2`,
    [projectId, first.worktreePath]);
    assert.equal(afterFailure.rows[0].generation_id, beforeFailure);

    const locker = await pool.connect();
    try {
      await locker.query('BEGIN');
      const lockKey = JSON.stringify([
        first.projectId,
        first.repositoryPath,
        first.worktreePath,
        first.corpus,
      ]);
      await locker.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockKey]);
      await publishTraceabilityGeneration(client, second);
      await assert.rejects(
        () => publishTraceabilityGeneration(client, first),
        /already active/,
      );
      await locker.query('ROLLBACK');
    } finally {
      locker.release();
    }

    const planBase = collectPlanProjection(root);
    const planFirst = {
      ...planBase,
      projectId,
      projectName,
      repositoryPath,
      worktreePath: first.worktreePath,
    };
    const planFirstResult = await publishTraceabilityGeneration(client, planFirst);
    const traceBeforePlanChange = await client.query(`
      SELECT published.generation_id
      FROM ponytail_index.published_generation_v1 published
      JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
      JOIN ponytail_index.repository_v1 repository USING (repository_id)
      WHERE repository.project_id = $1::uuid
        AND worktree.root_path = $2 AND published.corpus = 'traceability'`,
    [projectId, first.worktreePath]);
    const changedIndex = planFirst.files.findIndex(file => file.path.endsWith('/plan.md'));
    assert.ok(changedIndex >= 0);
    const changedFiles = planFirst.files.map((file, index) => index === changedIndex ? {
      ...file,
      contentDigest: crypto.createHash('sha256').update(`${file.contentDigest}-changed`).digest('hex'),
      gitState: 'modified',
    } : file);
    const changedPlan = {
      ...planFirst,
      stateDigest: crypto.createHash('sha256').update('changed-plan').digest('hex'),
      files: changedFiles,
    };
    const changedPlanResult = await publishTraceabilityGeneration(client, changedPlan);
    assert.notEqual(changedPlanResult.generationId, planFirstResult.generationId);
    assert.equal(changedPlanResult.parsedFiles, 1);
    assert.equal(changedPlanResult.reusedFiles, changedFiles.length - 1);
    const traceAfterPlanChange = await client.query(`
      SELECT published.generation_id
      FROM ponytail_index.published_generation_v1 published
      JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
      JOIN ponytail_index.repository_v1 repository USING (repository_id)
      WHERE repository.project_id = $1::uuid
        AND worktree.root_path = $2 AND published.corpus = 'traceability'`,
    [projectId, first.worktreePath]);
    assert.equal(
      traceAfterPlanChange.rows[0].generation_id,
      traceBeforePlanChange.rows[0].generation_id,
    );

    gapRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-index-gaps-'));
    const gapRequirementId = 'REQ-' + 'GAP';
    execFileSync('git', ['init', '-q'], { cwd: gapRoot });
    fs.mkdirSync(path.join(gapRoot, '.agents/config/project'), { recursive: true });
    fs.writeFileSync(path.join(gapRoot, 'ponytail-journal.json'), JSON.stringify({
      schemaVersion: 1,
      projectId: gapProjectId,
      projectName: 'gap fixture',
      database,
    }));
    fs.writeFileSync(path.join(gapRoot, 'requirement.md'),
      `# Requirement\n\n**Identifier:** \`${gapRequirementId}\`\n`);
    fs.writeFileSync(path.join(gapRoot, 'implementation.js'),
      `// Traceability: implements ${gapRequirementId}\nfunction implementation() {}\n`);
    const gapConfigurationPath = path.join(gapRoot, '.agents/config/project/traceability.json');
    fs.writeFileSync(gapConfigurationPath, JSON.stringify({
      schemaVersion: 4,
      projectRoot: '../../..',
      requirements: [{ id: gapRequirementId, sourcePath: 'requirement.md' }],
      artifacts: [{ class: 'implementation', path: 'implementation.js', locator: 'text' }],
      entities: [],
      generatedArtifacts: [],
      reverseViewPath: 'traceability.generated.md',
      index: { searchableFields: ['entityId', 'entityKind', 'role', 'requirementId', 'path'] },
      validationRules: [{
        id: 'requirement-unit-test', sourceKind: 'requirement', targetKind: 'unit-test',
        roles: ['verifies'], direction: 'reverse', cardinality: { minimum: 1 },
      }],
    }));
    execFileSync('git', ['add', '.'], { cwd: gapRoot });
    execFileSync('git', [
      '-c', 'user.name=Test', '-c', 'user.email=test@example.test',
      'commit', '-qm', 'fixture',
    ], { cwd: gapRoot });
    await indexTraceability({ configurationPath: gapConfigurationPath });
    const gapValidation = spawnSync(process.execPath, [
      path.join(root, 'src/project-index.js'), 'traceability', 'validate', '--json',
    ], { cwd: gapRoot, encoding: 'utf8' });
    assert.equal(gapValidation.status, 1, gapValidation.stderr);
    assert.equal(gapValidation.stderr, '');
    assert.ok(gapValidation.stdout.endsWith('\n'));
    const gapResult = JSON.parse(gapValidation.stdout);
    assert.deepEqual(gapResult.gaps.map(gap => gap.ruleId), ['requirement-unit-test']);
  } finally {
    await client.query(`
      DELETE FROM ponytail_index.generation_v1
      WHERE worktree_id IN (
        SELECT worktree_id FROM ponytail_index.worktree_v1 worktree
        JOIN ponytail_index.repository_v1 repository USING (repository_id)
        WHERE repository.project_id = ANY($1::uuid[])
      )`, [[projectId, gapProjectId]]);
    await client.query(`
      DELETE FROM ponytail_index.worktree_v1
      WHERE repository_id IN (
        SELECT repository_id FROM ponytail_index.repository_v1
        WHERE project_id = ANY($1::uuid[])
      )`, [[projectId, gapProjectId]]);
    await client.query(
      'DELETE FROM ponytail_index.parse_result_v1 WHERE project_id = ANY($1::uuid[])', [[projectId, gapProjectId]]);
    await client.query(
      'DELETE FROM ponytail_index.repository_v1 WHERE project_id = ANY($1::uuid[])', [[projectId, gapProjectId]]);
    await client.query(
      'DELETE FROM ponytail_index.project_v1 WHERE project_id = ANY($1::uuid[])', [[projectId, gapProjectId]]);
    if (gapRoot !== undefined) fs.rmSync(gapRoot, { recursive: true, force: true });
    client.release();
    await pool.end();
  }
  const cli = path.join(root, 'src/project-index.js');
  const indexed = JSON.parse(execFileSync(process.execPath, [
    cli, 'traceability', 'index', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.equal(indexed.schemaVersion, 2);
  assert.deepEqual(indexed.corpora.map(corpus => corpus.corpus), ['traceability', 'plans']);
  for (const corpus of indexed.corpora) {
    assert.equal(corpus.processedFiles, corpus.parsedFiles + corpus.reusedFiles);
  }
  const searched = JSON.parse(execFileSync(process.execPath, [
    cli, 'traceability', 'search', 'REQ-TRACEABILITY-INDEX',
    '--role', 'implements', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.ok(searched.results.some(result =>
    result.requirementId === 'REQ-TRACEABILITY-INDEX' &&
    result.role === 'implements'));
  for (const scopeArguments of [
    [],
    ['--plan', '2026-09-29-traceability-index'],
    ['--campaign', '2026-09-29-traceability-index'],
  ]) {
    const validation = JSON.parse(execFileSync(process.execPath, [
      cli, 'traceability', 'validate', ...scopeArguments, '--json',
    ], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(validation.gaps, []);
    assert.equal(validation.rules, 4);
  }
  const planSearch = JSON.parse(execFileSync(process.execPath, [
    cli, 'plan', 'search', 'PostgreSQL', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.ok(planSearch.results.some(result =>
    result.owningPlanId && result.path.startsWith('pm/plans/')));
  const roots = JSON.parse(execFileSync(process.execPath, [
    cli, 'plan', 'roots', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.ok(roots.results.some(result =>
    result.planId === '2026-09-29-traceability-index'));
  const stranded = JSON.parse(execFileSync(process.execPath, [
    cli, 'plan', 'stranded', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.deepEqual(stranded.results, []);
  const legacy = JSON.parse(execFileSync(process.execPath, [
    cli, 'plan', 'search', 'Ponytail', '--kind', 'legacy-plan', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.ok(legacy.results.length > 0);
  assert.ok(legacy.results.every(result => result.recordKind === 'legacy-plan'));
}

main().then(
  () => process.stdout.write('PostgreSQL project-index contract tests passed.\n'),
  error => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  },
);
NODE
  exit 0
}

main "$@"
