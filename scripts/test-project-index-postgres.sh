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
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const {
  collectTraceabilityProjection,
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
  } finally {
    await client.query(`
      DELETE FROM ponytail_index.generation_v1
      WHERE worktree_id IN (
        SELECT worktree_id FROM ponytail_index.worktree_v1 worktree
        JOIN ponytail_index.repository_v1 repository USING (repository_id)
        WHERE repository.project_id = $1::uuid
      )`, [projectId]);
    await client.query(`
      DELETE FROM ponytail_index.worktree_v1
      WHERE repository_id IN (
        SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid
      )`, [projectId]);
    await client.query(
      'DELETE FROM ponytail_index.parse_result_v1 WHERE project_id = $1::uuid', [projectId]);
    await client.query(
      'DELETE FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid', [projectId]);
    await client.query(
      'DELETE FROM ponytail_index.project_v1 WHERE project_id = $1::uuid', [projectId]);
    client.release();
    await pool.end();
  }
  const cli = path.join(root, 'src/project-index.js');
  const indexed = JSON.parse(execFileSync(process.execPath, [
    cli, 'traceability', 'index', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.equal(indexed.processedFiles, indexed.parsedFiles + indexed.reusedFiles);
  const searched = JSON.parse(execFileSync(process.execPath, [
    cli, 'traceability', 'search', 'REQ-TRACEABILITY-INDEX',
    '--role', 'implements', '--json',
  ], { cwd: root, encoding: 'utf8' }));
  assert.ok(searched.results.some(result =>
    result.requirementId === 'REQ-TRACEABILITY-INDEX' &&
    result.role === 'implements'));
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
