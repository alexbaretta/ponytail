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
    return { generationId: generation.generation_id, stateDigest: projection.stateDigest };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function indexTraceability(options = {}) {
  const configurationPath = options.configurationPath ??
    path.resolve('.agents/config/project/traceability.json');
  const projection = collectTraceabilityProjection(configurationPath);
  const project = JSON.parse(fs.readFileSync(
    path.join(projection.worktreePath, 'ponytail-journal.json'), 'utf8'));
  const database = project.database;
  const pool = options.pool ?? new (require('pg').Pool)({
    database: database.name,
    host: database.host,
    port: database.port,
    user: database.role,
    password: database.passwordEnvironment === undefined
      ? undefined : process.env[database.passwordEnvironment],
  });
  const client = await pool.connect();
  try {
    return await publishTraceabilityGeneration(client, projection);
  } finally {
    client.release();
    if (options.pool === undefined) await pool.end();
  }
}

module.exports = {
  ProjectIndexStorageReaders,
  collectTraceabilityProjection,
  digest,
  parseFile,
  publishTraceabilityGeneration,
  indexTraceability,
};
