#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const {
  findRelationships,
  loadTraceabilityConfiguration,
} = require('../skills/requirements-traceability/scripts/check-traceability');

// Traceability: implements REQ-TRACEABILITY-INDEX

function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function nullableString(value) {
  return value === null || typeof value === 'string';
}

function readProjectIndexStorageV1(payload) {
  if (!exactKeys(payload, ['schemaVersion', 'entities', 'relationships']) ||
      payload.schemaVersion !== 1 || !Array.isArray(payload.entities) ||
      !Array.isArray(payload.relationships)) {
    throw new Error('invalid project-index storage V1 payload');
  }
  for (const entity of payload.entities) {
    if (!exactKeys(entity, [
      'entityId', 'entityKind', 'path', 'line', 'unitName', 'annotation', 'description',
    ]) || !['entityId', 'entityKind', 'path'].every(key =>
      typeof entity[key] === 'string' && entity[key] !== '') ||
      !(entity.line === null || Number.isInteger(entity.line) && entity.line > 0) ||
      !['unitName', 'annotation', 'description'].every(key => nullableString(entity[key]))) {
      throw new Error('invalid project-index storage V1 entity');
    }
  }
  for (const relationship of payload.relationships) {
    if (!exactKeys(relationship, ['sourceEntityId', 'targetEntityId', 'role']) ||
      !['sourceEntityId', 'targetEntityId', 'role'].every(key =>
        typeof relationship[key] === 'string' && relationship[key] !== '')) {
      throw new Error('invalid project-index storage V1 relationship');
    }
  }
  return payload;
}

const ProjectIndexStorageReaders = Object.freeze({
  variants: Object.freeze({ V1: readProjectIndexStorageV1 }),
  writerVariant: 'V1',
});

const TraceabilityIndexResultReaders = Object.freeze({
  variants: Object.freeze({ V1: value => {
    if (!exactKeys(value, [
      'schemaVersion', 'corpus', 'generationId', 'headCommit', 'stateDigest',
      'worktree', 'processedFiles', 'parsedFiles', 'reusedFiles', 'rebuild',
    ]) || value.schemaVersion !== 1 || value.corpus !== 'traceability' ||
      !['generationId', 'headCommit', 'stateDigest', 'worktree'].every(key =>
        typeof value[key] === 'string' && value[key] !== '') ||
      !['processedFiles', 'parsedFiles', 'reusedFiles'].every(key =>
        Number.isInteger(value[key]) && value[key] >= 0) ||
      typeof value.rebuild !== 'boolean') {
      throw new Error('invalid traceability index result V1');
    }
    return value;
  } }),
  writerVariant: 'V1',
});

const TraceabilitySearchResultReaders = Object.freeze({
  variants: Object.freeze({ V1: value => {
    if (!exactKeys(value, [
      'schemaVersion', 'corpus', 'query', 'filters', 'generationId', 'results',
    ]) || value.schemaVersion !== 1 || value.corpus !== 'traceability' ||
      typeof value.query !== 'string' || typeof value.generationId !== 'string' ||
      value.generationId === '' || !exactKeys(value.filters, [
        'kind', 'role', 'requirement', 'path',
      ]) || !Object.values(value.filters).every(nullableString) ||
      !Array.isArray(value.results) || value.results.some(item =>
        !exactKeys(item, [
          'entityId', 'entityKind', 'role', 'requirementId', 'path', 'line',
          'unitName', 'annotation', 'description',
        ]) || typeof item.entityId !== 'string' || item.entityId === '' ||
        !['entityKind', 'role', 'requirementId', 'path', 'unitName', 'annotation',
          'description'].every(key => nullableString(item[key])) ||
        !(item.line === null || Number.isInteger(item.line) && item.line > 0))) {
      throw new Error('invalid traceability search result V1');
    }
    return value;
  } }),
  writerVariant: 'V1',
});

class ProjectIndexError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function gitPath(root, args) {
  const value = git(root, ['rev-parse', '--path-format=absolute', ...args]);
  return fs.realpathSync(value);
}

function fileState(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return { content: Buffer.alloc(0), gitState: 'deleted' };
  const tracked = spawnSync(
    'git',
    ['ls-files', '--error-unmatch', '--', relativePath],
    { cwd: root, encoding: 'utf8' },
  );
  if (tracked.status !== 0 && tracked.status !== 1) throw tracked.error ?? new Error(tracked.stderr);
  const changed = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', relativePath], {
    cwd: root,
  });
  if (changed.status !== 0 && changed.status !== 1) throw changed.error ?? new Error(changed.stderr);
  const gitState = tracked.status === 1 ? 'added' : changed.status === 0 ? 'tracked' : 'modified';
  return { content: fs.readFileSync(absolutePath), gitState };
}

function markdownDescription(source) {
  const heading = source.match(/^#{1,6}\s+(.+)$/mu);
  return heading === null ? null : heading[1].trim();
}

function relationshipEntityId(relationship) {
  return `trace:${digest([
    relationship.path,
    relationship.line,
    relationship.artifactClass,
    relationship.role,
    relationship.requirementId,
  ].join('\0'))}`;
}

function parseFile(configuration, relativePath, source) {
  const entities = [];
  const relationships = [];
  for (const requirement of configuration.requirements.filter(
    candidate => candidate.sourcePath === relativePath,
  )) {
    entities.push({
      entityId: requirement.id,
      entityKind: 'requirement',
      path: relativePath,
      line: null,
      unitName: requirement.id,
      annotation: null,
      description: markdownDescription(source),
    });
  }
  for (const artifact of configuration.artifacts.filter(
    candidate => candidate.path === relativePath,
  )) {
    for (const relationship of findRelationships(source, artifact)) {
      const entityId = relationshipEntityId(relationship);
      entities.push({
        entityId,
        entityKind: relationship.artifactClass,
        path: relationship.path,
        line: relationship.line,
        unitName: null,
        annotation: `${relationship.role} ${relationship.requirementId}`,
        description: null,
      });
      relationships.push({
        sourceEntityId: entityId,
        targetEntityId: relationship.requirementId,
        role: relationship.role,
      });
    }
  }
  return { schemaVersion: 1, entities, relationships };
}

function collectTraceabilityProjection(configurationPath) {
  configurationPath = fs.realpathSync(configurationPath);
  const configuration = loadTraceabilityConfiguration(configurationPath);
  const root = fs.realpathSync(configuration.root);
  const relativeConfigurationPath = path.relative(root, path.resolve(configurationPath));
  const paths = [...new Set([
    relativeConfigurationPath,
    ...configuration.requirements.map(requirement => requirement.sourcePath),
    ...configuration.artifacts.map(artifact => artifact.path),
  ])].sort();
  const configurationBytes = fs.readFileSync(configurationPath);
  const configurationDigest = digest(configurationBytes);
  const parserIdentity = digest(Buffer.concat([
    Buffer.from('traceability-v1\0'),
    fs.readFileSync(__filename),
    fs.readFileSync(require.resolve('../skills/requirements-traceability/scripts/check-traceability')),
  ]));
  const files = paths.map(relativePath => {
    const { content, gitState } = fileState(root, relativePath);
    return {
      path: relativePath,
      contentDigest: digest(content),
      parserIdentity: digest(`${parserIdentity}\n${configurationDigest}\n${relativePath}`),
      gitState,
      parse: () => gitState === 'deleted'
        ? { schemaVersion: 1, entities: [], relationships: [] }
        : parseFile(configuration, relativePath, content.toString('utf8')),
    };
  });
  const stateDigest = digest(files.map(file =>
    `${file.path}\0${file.gitState}\0${file.contentDigest}\n`).join(''));
  const project = JSON.parse(fs.readFileSync(path.join(root, 'ponytail-journal.json'), 'utf8'));
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    repositoryPath: gitPath(root, ['--git-common-dir']),
    worktreePath: gitPath(root, ['--show-toplevel']),
    headCommit: git(root, ['rev-parse', 'HEAD']),
    corpus: 'traceability',
    configurationDigest,
    parserIdentity,
    stateDigest,
    searchableFields: configuration.index.searchableFields,
    files,
  };
}

async function one(client, text, values) {
  const result = await client.query(text, values);
  if (result.rows.length !== 1) throw new Error(`expected one row, received ${result.rows.length}`);
  return result.rows[0];
}

async function publishTraceabilityGeneration(client, projection) {
  await client.query('BEGIN');
  try {
    const lockKey = JSON.stringify([
      projection.projectId,
      projection.repositoryPath,
      projection.worktreePath,
      projection.corpus,
    ]);
    const lock = await one(client,
      'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired', [lockKey]);
    if (!lock.acquired) throw new Error('project index writer is already active for this worktree corpus');
    await client.query('SELECT ponytail_index.register_project($1::uuid, $2)', [
      projection.projectId,
      projection.projectName,
    ]);
    const repository = await one(client, `
      INSERT INTO ponytail_index.repository_v1 (project_id, common_directory)
      VALUES ($1::uuid, $2)
      ON CONFLICT (project_id, common_directory) DO UPDATE
      SET common_directory = EXCLUDED.common_directory
      RETURNING repository_id`, [projection.projectId, projection.repositoryPath]);
    const worktree = await one(client, `
      INSERT INTO ponytail_index.worktree_v1 (repository_id, root_path)
      VALUES ($1::uuid, $2)
      ON CONFLICT (repository_id, root_path) DO UPDATE
      SET root_path = EXCLUDED.root_path
      RETURNING worktree_id`, [repository.repository_id, projection.worktreePath]);
    const previous = await client.query(`
      SELECT generation_id
      FROM ponytail_index.published_generation_v1
      WHERE worktree_id = $1::uuid AND corpus = $2`, [worktree.worktree_id, projection.corpus]);
    const generation = await one(client, `
      INSERT INTO ponytail_index.generation_v1 (
        worktree_id, corpus, head_commit, state_digest, configuration_digest, parser_identity
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6)
      RETURNING generation_id`, [
      worktree.worktree_id,
      projection.corpus,
      projection.headCommit,
      projection.stateDigest,
      projection.configurationDigest,
      projection.parserIdentity,
    ]);
    const allEntities = [];
    const allRelationships = [];
    let parsedFiles = 0;
    let reusedFiles = 0;
    for (const file of projection.files) {
      let parseResult = await client.query(`
        SELECT parse_result_id, payload
        FROM ponytail_index.parse_result_v1
        WHERE project_id = $1::uuid AND corpus = $2
          AND content_digest = $3 AND parser_identity = $4`, [
        projection.projectId,
        projection.corpus,
        file.contentDigest,
        file.parserIdentity,
      ]);
      if (parseResult.rows.length > 1) throw new Error('duplicate immutable parse results');
      if (parseResult.rows.length === 0) {
        parsedFiles += 1;
        const payload = file.parse();
        await client.query(`
        INSERT INTO ponytail_index.parse_result_v1 (
          project_id, corpus, content_digest, parser_identity, payload
        ) VALUES ($1::uuid, $2, $3, $4, $5::jsonb)
        ON CONFLICT (project_id, corpus, content_digest, parser_identity) DO NOTHING`, [
          projection.projectId,
          projection.corpus,
          file.contentDigest,
          file.parserIdentity,
          JSON.stringify(payload),
        ]);
        parseResult = await client.query(`
          SELECT parse_result_id, payload
          FROM ponytail_index.parse_result_v1
          WHERE project_id = $1::uuid AND corpus = $2
            AND content_digest = $3 AND parser_identity = $4`, [
          projection.projectId,
          projection.corpus,
          file.contentDigest,
          file.parserIdentity,
        ]);
      } else {
        reusedFiles += 1;
      }
      if (parseResult.rows.length !== 1) throw new Error('immutable parse result was not persisted');
      const parsed = {
        ...parseResult.rows[0],
        payload: ProjectIndexStorageReaders.variants.V1(parseResult.rows[0].payload),
      };
      await client.query(`
        INSERT INTO ponytail_index.file_v1 (
          generation_id, path, content_digest, git_state, parse_result_id
        ) VALUES ($1::uuid, $2, $3, $4, $5::uuid)`, [
        generation.generation_id,
        file.path,
        file.contentDigest,
        file.gitState,
        parsed.parse_result_id,
      ]);
      allEntities.push(...parsed.payload.entities);
      allRelationships.push(...parsed.payload.relationships);
    }
    for (const entity of allEntities) {
      await client.query(`
        INSERT INTO ponytail_index.entity_v1 (
          generation_id, entity_id, entity_kind, path, line, unit_name, annotation, description
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`, [
        generation.generation_id,
        entity.entityId,
        entity.entityKind,
        entity.path,
        entity.line,
        entity.unitName,
        entity.annotation,
        entity.description,
      ]);
      const searchable = Object.fromEntries(Object.entries({
        entityId: entity.entityId,
        entityKind: entity.entityKind,
        path: entity.path,
        unitName: entity.unitName,
        annotation: entity.annotation,
        description: entity.description,
      }).map(([field, value]) => [field, projection.searchableFields.includes(field) ? value : null]));
      await client.query(`
        INSERT INTO ponytail_index.search_document_v1 (
          generation_id, entity_id, searchable_entity_id, entity_kind, path,
          unit_name, annotation, description
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`, [
        generation.generation_id,
        entity.entityId,
        searchable.entityId,
        searchable.entityKind,
        searchable.path,
        searchable.unitName,
        searchable.annotation,
        searchable.description,
      ]);
    }
    for (const relationship of allRelationships) {
      await client.query(`
        INSERT INTO ponytail_index.relationship_v1 (
          generation_id, source_entity_id, target_entity_id, role
        ) VALUES ($1::uuid, $2, $3, $4)`, [
        generation.generation_id,
        relationship.sourceEntityId,
        relationship.targetEntityId,
        relationship.role,
      ]);
      if (projection.searchableFields.includes('role') ||
          projection.searchableFields.includes('requirementId')) {
        await client.query(`
          UPDATE ponytail_index.search_document_v1
          SET role = $3, requirement_id = $4
          WHERE generation_id = $1::uuid AND entity_id = $2`, [
          generation.generation_id,
          relationship.sourceEntityId,
          projection.searchableFields.includes('role') ? relationship.role : null,
          projection.searchableFields.includes('requirementId')
            ? relationship.targetEntityId : null,
        ]);
      }
    }
    await client.query(`
      INSERT INTO ponytail_index.published_generation_v1 (worktree_id, corpus, generation_id)
      VALUES ($1::uuid, $2, $3::uuid)
      ON CONFLICT (worktree_id, corpus) DO UPDATE
      SET generation_id = EXCLUDED.generation_id`, [
      worktree.worktree_id,
      projection.corpus,
      generation.generation_id,
    ]);
    if (previous.rows.length === 1) {
      await client.query('DELETE FROM ponytail_index.generation_v1 WHERE generation_id = $1::uuid', [
        previous.rows[0].generation_id,
      ]);
    }
    await client.query('COMMIT');
    return {
      generationId: generation.generation_id,
      stateDigest: projection.stateDigest,
      parsedFiles,
      reusedFiles,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function databaseOptions(worktreePath) {
  const project = JSON.parse(fs.readFileSync(
    path.join(worktreePath, 'ponytail-journal.json'), 'utf8'));
  const database = project.database;
  if (database.passwordEnvironment !== undefined &&
      process.env[database.passwordEnvironment] === undefined) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_PASSWORD_MISSING',
      `password environment variable is missing: ${database.passwordEnvironment}`,
    );
  }
  return {
    database: database.name,
    host: database.host,
    port: database.port,
    user: database.role,
    password: database.passwordEnvironment === undefined
      ? undefined : process.env[database.passwordEnvironment],
  };
}

async function indexTraceability(options = {}) {
  const configurationPath = options.configurationPath ??
    path.resolve('.agents/config/project/traceability.json');
  const projection = collectTraceabilityProjection(configurationPath);
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(projection.worktreePath));
  const client = await pool.connect();
  try {
    const publication = await publishTraceabilityGeneration(client, projection);
    return TraceabilityIndexResultReaders.variants.V1({
      schemaVersion: 1,
      corpus: 'traceability',
      generationId: publication.generationId,
      headCommit: projection.headCommit,
      stateDigest: publication.stateDigest,
      worktree: projection.worktreePath,
      processedFiles: projection.files.length,
      parsedFiles: publication.parsedFiles,
      reusedFiles: publication.reusedFiles,
      rebuild: options.rebuild === true,
    });
  } finally {
    client.release();
    if (options.pool === undefined) await pool.end();
  }
}

function parseSearchArguments(args) {
  if (args.length === 0 || args[0].startsWith('--')) {
    throw new ProjectIndexError(
      'TRACEABILITY_SEARCH_USAGE',
      'usage: ponytail traceability search <query> [--kind <kind>] [--role <role>] [--requirement <id>] [--path <path>] [--json]',
    );
  }
  const query = args.shift();
  if (query.trim() === '') throw new ProjectIndexError('TRACEABILITY_SEARCH_USAGE', 'search query must not be empty');
  const filters = { kind: null, role: null, requirement: null, path: null };
  let json = false;
  while (args.length > 0) {
    const option = args.shift();
    if (option === '--json') {
      json = true;
      continue;
    }
    const key = { '--kind': 'kind', '--role': 'role', '--requirement': 'requirement', '--path': 'path' }[option];
    if (key === undefined || args.length === 0 || args[0].startsWith('--') || filters[key] !== null) {
      throw new ProjectIndexError('TRACEABILITY_SEARCH_USAGE', `invalid search option: ${option}`);
    }
    filters[key] = args.shift();
  }
  return { query, filters, json };
}

async function currentGeneration(client, projection) {
  const relation = await client.query(
    `SELECT to_regclass('ponytail_index.schema_version_v1') AS relation`);
  if (relation.rows.length !== 1 || relation.rows[0].relation === null) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_SCHEMA_MISSING',
      'project index schema is missing; run scripts/setup-project-journal.sh',
    );
  }
  const schema = await client.query(`
    SELECT schema_version
    FROM ponytail_index.schema_version_v1
    WHERE singleton`);
  if (schema.rows.length !== 1 || schema.rows[0].schema_version !== 1) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_SCHEMA_MISMATCH',
      'project index schema is missing or incompatible; run scripts/setup-project-journal.sh',
    );
  }
  const result = await client.query(`
    SELECT generation.generation_id, generation.head_commit,
      generation.state_digest, generation.configuration_digest,
      generation.parser_identity
    FROM ponytail_index.project_v1 project
    JOIN ponytail_index.repository_v1 repository USING (project_id)
    JOIN ponytail_index.worktree_v1 worktree USING (repository_id)
    JOIN ponytail_index.published_generation_v1 published USING (worktree_id)
    JOIN ponytail_index.generation_v1 generation USING (generation_id)
    WHERE project.project_id = $1::uuid
      AND repository.common_directory = $2
      AND worktree.root_path = $3
      AND published.corpus = $4`, [
    projection.projectId,
    projection.repositoryPath,
    projection.worktreePath,
    projection.corpus,
  ]);
  if (result.rows.length !== 1) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_MISSING',
      'traceability index is missing for this worktree; run ponytail traceability index',
    );
  }
  const generation = result.rows[0];
  if (generation.head_commit !== projection.headCommit ||
      generation.state_digest !== projection.stateDigest ||
      generation.configuration_digest !== projection.configurationDigest ||
      generation.parser_identity !== projection.parserIdentity) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_STALE',
      'traceability index is stale for this worktree; run ponytail traceability index',
    );
  }
  return generation;
}

async function searchTraceability(query, filters, options = {}) {
  const configurationPath = options.configurationPath ??
    path.resolve('.agents/config/project/traceability.json');
  const projection = collectTraceabilityProjection(configurationPath);
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(projection.worktreePath));
  const client = await pool.connect();
  try {
    const generation = await currentGeneration(client, projection);
    const clauses = [
      'document.generation_id = $1::uuid',
      `document.search_vector @@ websearch_to_tsquery('simple', $2)`,
    ];
    const values = [generation.generation_id, query];
    for (const [key, column] of Object.entries({
      kind: 'entity_kind',
      role: 'role',
      requirement: 'requirement_id',
      path: 'path',
    })) {
      if (filters[key] !== null) {
        values.push(filters[key]);
        clauses.push(`document.${column} = $${values.length}`);
      }
    }
    const result = await client.query(`
      SELECT document.entity_id, document.entity_kind, document.role,
        document.requirement_id, document.path, entity.line,
        document.unit_name, document.annotation, document.description
      FROM ponytail_index.search_document_v1 document
      JOIN ponytail_index.entity_v1 entity
        USING (generation_id, entity_id)
      WHERE ${clauses.join(' AND ')}
      ORDER BY document.path NULLS LAST, entity.line NULLS LAST,
        document.entity_kind NULLS LAST, document.entity_id`, values);
    return TraceabilitySearchResultReaders.variants.V1({
      schemaVersion: 1,
      corpus: 'traceability',
      query,
      filters,
      generationId: generation.generation_id,
      results: result.rows.map(row => ({
        entityId: row.entity_id,
        entityKind: row.entity_kind,
        role: row.role,
        requirementId: row.requirement_id,
        path: row.path,
        line: row.line,
        unitName: row.unit_name,
        annotation: row.annotation,
        description: row.description,
      })),
    });
  } finally {
    client.release();
    if (options.pool === undefined) await pool.end();
  }
}

function printSearchHuman(result) {
  if (result.results.length === 0) {
    process.stdout.write('no traceability matches\n');
    return;
  }
  for (const item of result.results) {
    const location = `${item.path ?? '-'}${item.line === null ? '' : `:${item.line}`}`;
    process.stdout.write([
      location,
      item.entityKind ?? '-',
      item.role ?? '-',
      item.requirementId ?? item.entityId,
    ].join('\t') + '\n');
  }
}

async function run(args) {
  const family = args.shift();
  const operation = args.shift();
  if (family !== 'traceability' || !['index', 'search'].includes(operation)) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_USAGE',
      'usage: ponytail traceability <index|search> ...',
    );
  }
  if (operation === 'index') {
    const allowed = new Set(['--rebuild', '--json']);
    if (args.some(argument => !allowed.has(argument)) || new Set(args).size !== args.length) {
      throw new ProjectIndexError(
        'TRACEABILITY_INDEX_USAGE',
        'usage: ponytail traceability index [--rebuild] [--json]',
      );
    }
    const result = await indexTraceability({ rebuild: args.includes('--rebuild') });
    if (args.includes('--json')) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stdout.write(
      `indexed traceability: ${result.processedFiles} files, ` +
      `${result.parsedFiles} parsed, ${result.reusedFiles} reused\n`);
    return;
  }
  const search = parseSearchArguments(args);
  const result = await searchTraceability(search.query, search.filters);
  if (search.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else printSearchHuman(result);
}

if (require.main === module) {
  run(process.argv.slice(2)).catch(error => {
    const code = error instanceof ProjectIndexError ? error.code : 'PROJECT_INDEX_FAILURE';
    process.stderr.write(`error ${code}: ${error.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  ProjectIndexStorageReaders,
  TraceabilityIndexResultReaders,
  TraceabilitySearchResultReaders,
  collectTraceabilityProjection,
  digest,
  parseFile,
  publishTraceabilityGeneration,
  indexTraceability,
  parseSearchArguments,
  searchTraceability,
};
