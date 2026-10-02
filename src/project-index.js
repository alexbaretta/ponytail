#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn, spawnSync } = require('node:child_process');

const {
  findRelationships,
  loadTraceabilityConfiguration,
  validateRelationship,
} = require('../skills/requirements-traceability/scripts/check-traceability');
const {
  CampaignError,
  linkedPlanFiles,
  listPlanSourceFiles,
  metadataBlocks,
  parsePlanSource,
  readManagementConfigV1,
  resolveCampaignRoot,
  resolveCampaignScope,
} = require('./campaign-census');
const {
  parseSprintFile,
} = require('../skills/plan-execution/scripts/ready-sprints');
const {
  TaskletMetadataReaders,
  parseTaskletStatuses,
} = require('../skills/plan-execution/scripts/ready-tasklets');

// Traceability: implements REQ-TRACEABILITY-INDEX
// Traceability: implements REQ-REPOSITORY-TEXT-INDEX

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

function readPlanIndexStorageV1(payload) {
  if (!exactKeys(payload, ['schemaVersion', 'records']) ||
      payload.schemaVersion !== 1 || !Array.isArray(payload.records)) {
    throw new Error('invalid plan-index storage V1 payload');
  }
  const keys = [
    'recordKind', 'recordId', 'owningPlanId', 'path', 'line', 'heading',
    'excerpt', 'lifecycle', 'status', 'parentPlanId', 'dependsOn', 'plannedPaths',
    'linkedPlanPaths',
  ];
  for (const record of payload.records) {
    if (!exactKeys(record, keys) ||
        !['recordKind', 'recordId', 'owningPlanId', 'path'].every(key =>
          typeof record[key] === 'string' && record[key] !== '') ||
        !(record.line === null || Number.isInteger(record.line) && record.line > 0) ||
        !['heading', 'excerpt', 'lifecycle', 'status', 'parentPlanId']
          .every(key => nullableString(record[key])) ||
        ![record.dependsOn, record.plannedPaths, record.linkedPlanPaths].every(items =>
          Array.isArray(items) && items.every(item => typeof item === 'string'))) {
      throw new Error('invalid plan-index storage V1 record');
    }
  }
  return payload;
}

const PlanIndexStorageReaders = Object.freeze({
  variants: Object.freeze({ V1: readPlanIndexStorageV1 }),
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
  }, V2: value => {
    if (!exactKeys(value, [
      'schemaVersion', 'headCommit', 'worktree', 'rebuild', 'corpora',
    ]) || value.schemaVersion !== 2 ||
      !['headCommit', 'worktree'].every(key =>
        typeof value[key] === 'string' && value[key] !== '') ||
      typeof value.rebuild !== 'boolean' || !Array.isArray(value.corpora) ||
      value.corpora.length !== 2 || value.corpora.some(corpus =>
        !exactKeys(corpus, [
          'corpus', 'generationId', 'stateDigest', 'processedFiles',
          'parsedFiles', 'reusedFiles',
        ]) || !['traceability', 'plans'].includes(corpus.corpus) ||
        !['generationId', 'stateDigest'].every(key =>
          typeof corpus[key] === 'string' && corpus[key] !== '') ||
        !['processedFiles', 'parsedFiles', 'reusedFiles'].every(key =>
          Number.isInteger(corpus[key]) && corpus[key] >= 0)) ||
      new Set(value.corpora.map(corpus => corpus.corpus)).size !== 2) {
      throw new Error('invalid traceability index result V2');
    }
    return value;
  } }),
  writerVariant: 'V2',
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

function readTraceabilityValidationResultV1(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'corpus', 'scope', 'generationId', 'rules', 'gaps',
  ]) || value.schemaVersion !== 1 || value.corpus !== 'traceability' ||
      typeof value.generationId !== 'string' || !Number.isInteger(value.rules) ||
      value.rules < 0 || !exactKeys(value.scope, ['kind', 'id']) ||
      !['repository', 'plan', 'campaign'].includes(value.scope.kind) ||
      !nullableString(value.scope.id) || !Array.isArray(value.gaps) ||
      value.gaps.some(gap =>
        !exactKeys(gap, [
          'ruleId', 'sourceEntityId', 'sourceKind', 'sourcePath', 'sourceLine',
          'targetKind', 'roles', 'direction', 'minimum', 'actual',
        ]) ||
        !['ruleId', 'sourceEntityId', 'sourceKind', 'targetKind', 'direction']
          .every(key => typeof gap[key] === 'string' && gap[key] !== '') ||
        !nullableString(gap.sourcePath) ||
        !(gap.sourceLine === null || Number.isInteger(gap.sourceLine) && gap.sourceLine > 0) ||
        !Array.isArray(gap.roles) || gap.roles.length === 0 ||
        gap.roles.some(role => typeof role !== 'string' || role === '') ||
        !Number.isInteger(gap.minimum) || gap.minimum < 1 ||
        !Number.isInteger(gap.actual) || gap.actual < 0)) {
    throw new Error('invalid traceability validation result V1');
  }
  return value;
}

const TraceabilityValidationResultReaders = Object.freeze({
  variants: Object.freeze({ V1: readTraceabilityValidationResultV1 }),
  writerVariant: 'V1',
});

function readPlanSearchResultV1(value) {
  const resultKeys = [
    'recordId', 'recordKind', 'owningPlanId', 'lifecycle', 'path', 'line',
    'heading', 'excerpt',
  ];
  if (!exactKeys(value, [
    'schemaVersion', 'corpus', 'query', 'filters', 'generationId', 'results',
  ]) || value.schemaVersion !== 1 || value.corpus !== 'plans' ||
      typeof value.query !== 'string' || typeof value.generationId !== 'string' ||
      !exactKeys(value.filters, ['lifecycle', 'kind', 'plan']) ||
      !Object.values(value.filters).every(nullableString) ||
      !Array.isArray(value.results) || value.results.some(item =>
        !exactKeys(item, resultKeys) ||
        !['recordId', 'recordKind', 'owningPlanId', 'path'].every(key =>
          typeof item[key] === 'string' && item[key] !== '') ||
        !['lifecycle', 'heading', 'excerpt'].every(key => nullableString(item[key])) ||
        !(item.line === null || Number.isInteger(item.line) && item.line > 0))) {
    throw new Error('invalid plan search result V1');
  }
  return value;
}

const PlanSearchResultReaders = Object.freeze({
  variants: Object.freeze({ V1: readPlanSearchResultV1 }),
  writerVariant: 'V1',
});

function readPlanGraphResultV1(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'corpus', 'operation', 'input', 'direct', 'generationId',
    'results',
  ]) || value.schemaVersion !== 1 || value.corpus !== 'plans' ||
      !['operation', 'generationId'].every(key =>
        typeof value[key] === 'string' && value[key] !== '') ||
      !['descendants', 'ancestors', 'roots', 'stranded'].includes(value.operation) ||
      !nullableString(value.input) || typeof value.direct !== 'boolean' ||
      (value.direct && value.operation !== 'descendants') ||
      !Array.isArray(value.results) || value.results.some(item =>
        !exactKeys(item, ['planId', 'lifecycle', 'path', 'reason']) ||
        !['planId', 'path'].every(key => typeof item[key] === 'string' && item[key] !== '') ||
        !['lifecycle', 'reason'].every(key => nullableString(item[key])))) {
    throw new Error('invalid plan graph result V1');
  }
  return value;
}

const PlanGraphResultReaders = Object.freeze({
  variants: Object.freeze({ V1: readPlanGraphResultV1 }),
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

function headingAndExcerpt(source) {
  const heading = markdownDescription(source);
  const withoutMetadata = source.replace(/^<!--\s*ponytail-[\s\S]*?^-->\s*$/gmu, '');
  const excerpt = withoutMetadata.split(/\n\s*\n/u)
    .map(block => block.replace(/^#{1,6}\s+.*$/gmu, '').trim())
    .find(block => block !== '' && !/^(?:Status|Plan ID|Questions|Atomicity review):/u.test(block));
  return {
    heading,
    excerpt: excerpt === undefined ? null : excerpt.replace(/\s+/gu, ' ').slice(0, 240),
  };
}

function markdownSections(source) {
  const headings = [...source.matchAll(/^(#{1,6})\s+([^\n]+)$/gmu)];
  return headings.map((match, index) => {
    const body = source.slice(match.index + match[0].length, headings[index + 1]?.index);
    const searchableText = body
      .replace(/^<!--[\s\S]*?^-->\s*$/gmu, '')
      .split('\n')
      .filter(line => !/^(?:Status|Plan ID|Questions|Atomicity review):/u.test(line.trim()))
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim();
    return {
      heading: match[2].trim(),
      line: source.slice(0, match.index).split('\n').length,
      excerpt: searchableText === '' ? null : searchableText,
    };
  });
}

function planRecord(overrides) {
  return {
    recordKind: overrides.recordKind,
    recordId: overrides.recordId,
    owningPlanId: overrides.owningPlanId,
    path: overrides.path,
    line: overrides.line ?? 1,
    heading: overrides.heading ?? null,
    excerpt: overrides.excerpt ?? null,
    lifecycle: overrides.lifecycle ?? null,
    status: overrides.status ?? null,
    parentPlanId: overrides.parentPlanId ?? null,
    dependsOn: overrides.dependsOn ?? [],
    plannedPaths: overrides.plannedPaths ?? [],
    linkedPlanPaths: overrides.linkedPlanPaths ?? [],
  };
}

function parsePlanIndexPlan(root, relativePath, lifecycle, source) {
  const text = headingAndExcerpt(source);
  const sections = markdownSections(source).slice(1).map(section => planRecord({
    recordKind: 'plan-section',
    recordId: `section-${section.line}`,
    owningPlanId: path.basename(path.dirname(relativePath)),
    path: relativePath,
    line: section.line,
    heading: section.heading,
    excerpt: section.excerpt,
    lifecycle,
  }));
  try {
    const plan = parsePlanSource(root, relativePath, lifecycle, source);
    for (const section of sections) section.owningPlanId = plan.id;
    return { schemaVersion: 1, records: [planRecord({
      recordKind: 'plan',
      recordId: plan.id,
      owningPlanId: plan.id,
      path: relativePath,
      heading: text.heading,
      excerpt: text.excerpt,
      lifecycle: plan.lifecycle,
      parentPlanId: plan.parentPlanId,
      dependsOn: plan.dependsOn,
      linkedPlanPaths: linkedPlanFiles(plan).map(planFile =>
        path.relative(root, planFile).split(path.sep).join('/')),
    }), ...sections] };
  } catch (error) {
    if (!(error instanceof CampaignError)) throw error;
    const inferredId = path.basename(path.dirname(relativePath));
    const unmanagedLegacy = error.code === 'CAMPAIGN_PLAN_BLOCK' && metadataBlocks(source).length === 0;
    return { schemaVersion: 1, records: [planRecord({
      recordKind: unmanagedLegacy ? 'legacy-plan' : 'invalid-plan',
      recordId: inferredId,
      owningPlanId: inferredId,
      path: relativePath,
      heading: text.heading,
      excerpt: unmanagedLegacy
        ? 'CAMPAIGN_LEGACY_UNMANAGED: unmarked plan has no managed campaign membership'
        : `${error.code}: ${error.message}`,
      lifecycle,
      status: unmanagedLegacy ? 'CAMPAIGN_LEGACY_UNMANAGED' : error.code,
    }), ...sections] };
  }
}

function headingLines(source) {
  const headings = new Map();
  for (const match of source.matchAll(/^(#{1,6})\s+(?:\[(?:DONE|ERROR| )\]\s*)?([^\n]+)$/gmu)) {
    headings.set(match[2].match(/S\d+(?:-F\d+(?:-T\d+)?)?/)?.[0] ?? match[2], {
      heading: match[2].trim(),
      line: source.slice(0, match.index).split('\n').length,
    });
  }
  return headings;
}

function parsePlanIndexSprint(relativePath, source) {
  const planId = path.basename(path.dirname(path.dirname(relativePath)));
  const text = headingAndExcerpt(source);
  let sprint;
  try {
    sprint = parseSprintFile(relativePath, source);
  } catch (error) {
    const sprintId = path.basename(relativePath, '.md');
    return { schemaVersion: 1, records: [planRecord({
      recordKind: 'stranded-sprint',
      recordId: sprintId,
      owningPlanId: planId,
      path: relativePath,
      heading: text.heading,
      excerpt: error.message,
      status: 'PLAN_SPRINT_INVALID',
    })] };
  }
  const headings = headingLines(source);
  const statuses = parseTaskletStatuses(relativePath, source);
  const records = [planRecord({
    recordKind: 'sprint',
    recordId: sprint.id,
    owningPlanId: planId,
    path: relativePath,
    heading: text.heading,
    excerpt: text.excerpt,
    status: sprint.execution?.status ?? sprint.planning.status,
    dependsOn: sprint.execution?.depends_on ?? sprint.planning.depends_on,
  }), ...markdownSections(source).slice(1).map(section => planRecord({
    recordKind: 'sprint-section',
    recordId: `section-${sprint.id}-${section.line}`,
    owningPlanId: planId,
    path: relativePath,
    line: section.line,
    heading: section.heading,
    excerpt: section.excerpt,
    status: sprint.execution?.status ?? sprint.planning.status,
  }))];
  for (const [taskletId, status] of statuses) {
    const taskletHeading = headings.get(taskletId);
    records.push(planRecord({
      recordKind: 'tasklet-status',
      recordId: taskletId,
      owningPlanId: planId,
      path: relativePath,
      line: taskletHeading?.line,
      heading: taskletHeading?.heading ?? taskletId,
      status,
    }));
  }
  return { schemaVersion: 1, records };
}

function parsePlanIndexTasklets(relativePath, source) {
  const planId = path.basename(path.dirname(path.dirname(relativePath)));
  const sprintId = path.basename(relativePath, '.tasklets.json');
  let graph;
  try {
    const value = JSON.parse(source);
    const reader = TaskletMetadataReaders[`V${value.schemaVersion}`];
    if (reader === undefined) throw new Error(`unsupported tasklet graph schemaVersion: ${value.schemaVersion}`);
    graph = reader(sprintId, value, relativePath);
  } catch (error) {
    return { schemaVersion: 1, records: [planRecord({
      recordKind: 'stranded-tasklet-graph',
      recordId: sprintId,
      owningPlanId: planId,
      path: relativePath,
      excerpt: error.message,
      status: 'PLAN_TASKLET_GRAPH_INVALID',
    })] };
  }
  const records = [];
  for (const [featureId, feature] of graph.features ?? []) {
    records.push(planRecord({
      recordKind: 'feature',
      recordId: featureId,
      owningPlanId: planId,
      path: relativePath,
      heading: featureId,
      dependsOn: feature.depends_on,
    }));
  }
  for (const [taskletId, tasklet] of graph.tasklets) {
    records.push(planRecord({
      recordKind: 'tasklet',
      recordId: taskletId,
      owningPlanId: planId,
      path: relativePath,
      heading: taskletId,
      excerpt: tasklet.planned_paths?.join(', ').slice(0, 240) ?? null,
      dependsOn: tasklet.depends_on,
      plannedPaths: tasklet.planned_paths ?? [],
    }));
  }
  return { schemaVersion: 1, records };
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

function declaredEntityId(kind, id, relativePath) {
  return kind === 'tasklet'
    ? `trace:${kind}:${relativePath}:${id}`
    : `trace:${kind}:${id}`;
}

function parseFile(configuration, relativePath, source) {
  const entities = new Map();
  const relationships = new Map();
  for (const requirement of configuration.requirements.filter(
    candidate => candidate.sourcePath === relativePath,
  )) {
    entities.set(requirement.id, {
      entityId: requirement.id,
      entityKind: 'requirement',
      path: relativePath,
      line: null,
      unitName: requirement.id,
      annotation: null,
      description: markdownDescription(source),
    });
  }
  for (const entity of configuration.entities.filter(
    candidate => candidate.path === relativePath,
  )) {
    const entityId = declaredEntityId(entity.kind, entity.id, entity.path);
    entities.set(entityId, {
      entityId,
      entityKind: entity.kind,
      path: entity.path,
      line: entity.line ?? null,
      unitName: entity.id,
      annotation: entity.annotation ?? null,
      description: entity.description ?? null,
    });
  }
  for (const artifact of configuration.artifacts.filter(
    candidate => candidate.path === relativePath,
  )) {
    for (const relationship of findRelationships(source, artifact)) {
      const relationshipDiagnostic = validateRelationship(configuration, artifact, relationship);
      if (relationshipDiagnostic !== null) {
        throw new Error(`${relationshipDiagnostic.ruleId}: ${relationshipDiagnostic.message}`);
      }
      const entityId = relationship.entityId === null
        ? relationshipEntityId(relationship)
        : declaredEntityId(relationship.entityKind, relationship.entityId, relationship.path);
      const declaration = configuration.entities.find(entity =>
        entity.kind === relationship.entityKind && entity.id === relationship.entityId);
      entities.set(entityId, {
        entityId,
        entityKind: relationship.entityKind,
        path: declaration?.path ?? relationship.path,
        line: declaration?.line ?? relationship.line,
        unitName: relationship.entityId,
        annotation: declaration?.annotation ?? `${relationship.role} ${relationship.requirementId}`,
        description: declaration?.description ?? null,
      });
      const normalizedRelationship = {
        sourceEntityId: entityId,
        targetEntityId: relationship.requirementId,
        role: relationship.role,
      };
      relationships.set([
        normalizedRelationship.sourceEntityId,
        normalizedRelationship.targetEntityId,
        normalizedRelationship.role,
      ].join('\0'), normalizedRelationship);
    }
  }
  return {
    schemaVersion: 1,
    entities: [...entities.values()],
    relationships: [...relationships.values()],
  };
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
    ...configuration.entities.map(entity => entity.path),
  ])].sort();
  for (const relativePath of paths) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new ProjectIndexError(
        'TRACEABILITY_SOURCE_MISSING',
        `configured traceability source does not resolve: ${relativePath}`,
      );
    }
  }
  const configurationBytes = fs.readFileSync(configurationPath);
  const configurationDigest = digest(configurationBytes);
  const parserIdentity = digest(Buffer.concat([
    Buffer.from('traceability-v2\0'),
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
    readPayload: ProjectIndexStorageReaders.variants.V1,
    files,
  };
}

function planEntityId(record) {
  if (['plan', 'legacy-plan', 'invalid-plan', 'stranded-plan'].includes(record.recordKind)) {
    return `plan:${record.recordId}`;
  }
  return `${record.recordKind}:${record.owningPlanId}:${record.recordId}`;
}

function normalizePlanPayloads(payloads) {
  const records = payloads.flatMap(payload => payload.records).map(record => ({ ...record }));
  const statusByTasklet = new Map(records
    .filter(record => record.recordKind === 'tasklet-status')
    .map(record => [`${record.owningPlanId}\0${record.recordId}`, record]));
  const plansById = new Map();
  for (const record of records.filter(candidate =>
    ['plan', 'legacy-plan', 'invalid-plan', 'stranded-plan'].includes(candidate.recordKind))) {
    const matches = plansById.get(record.recordId) ?? [];
    matches.push(record);
    plansById.set(record.recordId, matches);
  }
  for (const matches of plansById.values()) {
    if (matches.length > 1) for (const record of matches) {
      const duplicateId = `${record.recordId}:${digest(record.path).slice(0, 16)}`;
      for (const related of records) {
        if (related.path === record.path && related.owningPlanId === record.recordId) {
          related.owningPlanId = duplicateId;
        }
      }
      record.recordKind = 'invalid-plan';
      record.status = 'CAMPAIGN_PLAN_ID_DUPLICATE';
      record.excerpt = `CAMPAIGN_PLAN_ID_DUPLICATE: duplicate plan ID ${record.recordId}`;
      record.recordId = duplicateId;
    }
  }
  const canonicalPlans = new Map(records
    .filter(record => record.recordKind === 'plan')
    .map(record => [record.recordId, record]));
  const strandReferencedLegacy = (planId) => {
    for (const record of plansById.get(planId) ?? []) {
      if (record.recordKind !== 'legacy-plan') continue;
      record.recordKind = 'invalid-plan';
      record.status = 'CAMPAIGN_PLAN_BLOCK';
      record.excerpt = `CAMPAIGN_PLAN_BLOCK: managed campaign metadata references unmarked plan ${planId}`;
    }
  };
  for (const record of canonicalPlans.values()) {
    if (record.parentPlanId !== null && !canonicalPlans.has(record.parentPlanId)) {
      strandReferencedLegacy(record.parentPlanId);
      record.recordKind = 'invalid-plan';
      record.status = 'CAMPAIGN_PARENT_MISSING';
      record.excerpt = `CAMPAIGN_PARENT_MISSING: missing parent plan ${record.parentPlanId}`;
    } else if (record.parentPlanId !== null &&
        !canonicalPlans.get(record.parentPlanId).linkedPlanPaths.includes(record.path)) {
      record.recordKind = 'stranded-plan';
      record.status = 'CAMPAIGN_MEMBER_LINK';
      record.excerpt = `CAMPAIGN_MEMBER_LINK: campaign plan ${record.parentPlanId} does not reference member plan ${record.recordId}`;
    }
    for (const dependencyId of record.dependsOn) {
      if (canonicalPlans.has(dependencyId)) continue;
      strandReferencedLegacy(dependencyId);
      record.recordKind = 'invalid-plan';
      record.status = 'CAMPAIGN_DEPENDENCY_MISSING';
      record.excerpt = `CAMPAIGN_DEPENDENCY_MISSING: missing dependency plan ${dependencyId}`;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of canonicalPlans.values()) {
      const parent = record.parentPlanId === null
        ? undefined : canonicalPlans.get(record.parentPlanId);
      if (record.recordKind === 'plan' && parent !== undefined && parent.recordKind !== 'plan') {
        record.recordKind = 'invalid-plan';
        record.status = 'CAMPAIGN_PARENT_INVALID';
        record.excerpt = `CAMPAIGN_PARENT_INVALID: invalid parent plan ${record.parentPlanId}`;
        changed = true;
      }
    }
  }
  const visit = (record, trail = []) => {
    if (record.recordKind !== 'plan' || record.parentPlanId === null) return;
    const cycle = trail.indexOf(record.recordId);
    if (cycle >= 0) {
      for (const id of trail.slice(cycle)) {
        const member = canonicalPlans.get(id);
        member.recordKind = 'invalid-plan';
        member.status = 'CAMPAIGN_PARENT_CYCLE';
        member.excerpt = `CAMPAIGN_PARENT_CYCLE: ${[...trail.slice(cycle), id].join(' -> ')}`;
      }
      return;
    }
    const parent = canonicalPlans.get(record.parentPlanId);
    if (parent !== undefined) visit(parent, [...trail, record.recordId]);
  };
  for (const record of canonicalPlans.values()) visit(record);
  changed = true;
  while (changed) {
    changed = false;
    for (const record of canonicalPlans.values()) {
      const parent = record.parentPlanId === null
        ? undefined : canonicalPlans.get(record.parentPlanId);
      if (record.recordKind === 'plan' && parent !== undefined && parent.recordKind !== 'plan') {
        record.recordKind = 'invalid-plan';
        record.status = 'CAMPAIGN_PARENT_INVALID';
        record.excerpt = `CAMPAIGN_PARENT_INVALID: invalid parent plan ${record.parentPlanId}`;
        changed = true;
      }
    }
  }

  const normalizedRecords = records.filter(record => record.recordKind !== 'tasklet-status');
  for (const record of normalizedRecords.filter(candidate => candidate.recordKind === 'tasklet')) {
    const status = statusByTasklet.get(`${record.owningPlanId}\0${record.recordId}`);
    if (status !== undefined) {
      record.status = status.status;
      record.heading = status.heading;
      record.line = status.line;
    }
  }
  const lifecycleByPlan = new Map(records
    .filter(record => ['plan', 'legacy-plan', 'invalid-plan', 'stranded-plan'].includes(record.recordKind))
    .map(record => [record.owningPlanId, record.lifecycle]));
  const entities = normalizedRecords.map(record => ({
    entityId: planEntityId(record),
    entityKind: record.recordKind,
    path: record.path,
    line: record.line,
    unitName: record.owningPlanId,
    annotation: record.heading,
    description: record.excerpt,
    searchRole: record.lifecycle ?? lifecycleByPlan.get(record.owningPlanId) ?? null,
    status: record.status,
    parentPlanId: record.parentPlanId,
    dependsOn: record.dependsOn,
  }));
  const ids = new Set(entities.map(entity => entity.entityId));
  const relationships = [];
  const add = (sourceEntityId, targetEntityId, role) => {
    if (ids.has(sourceEntityId) && ids.has(targetEntityId)) {
      relationships.push({ sourceEntityId, targetEntityId, role });
    }
  };
  for (const entity of entities) {
    if (entity.entityKind === 'plan') {
      if (entity.parentPlanId !== null) add(entity.entityId, `plan:${entity.parentPlanId}`, 'campaign-parent');
      for (const dependency of entity.dependsOn) add(entity.entityId, `plan:${dependency}`, 'depends-on');
    } else if (entity.entityKind === 'sprint') {
      add(entity.entityId, `plan:${entity.unitName}`, 'member-of-plan');
      for (const dependency of entity.dependsOn) {
        add(entity.entityId, `sprint:${entity.unitName}:${dependency}`, 'depends-on');
      }
    } else if (entity.entityKind === 'feature') {
      add(entity.entityId, `sprint:${entity.unitName}:${entity.entityId.split(':').at(-1).split('-F')[0]}`, 'member-of-sprint');
      for (const dependency of entity.dependsOn) {
        add(entity.entityId, `feature:${entity.unitName}:${dependency}`, 'depends-on');
      }
    } else if (entity.entityKind === 'tasklet') {
      const featureId = entity.entityId.split(':').at(-1).replace(/-T\d+$/u, '');
      add(entity.entityId, `feature:${entity.unitName}:${featureId}`, 'member-of-feature');
      for (const dependency of entity.dependsOn) {
        add(entity.entityId, `tasklet:${entity.unitName}:${dependency}`, 'depends-on');
      }
    }
  }
  return { entities, relationships };
}

function collectPlanProjection(root = fs.realpathSync(git(process.cwd(), ['rev-parse', '--show-toplevel']))) {
  root = fs.realpathSync(root);
  const managementPath = path.join(root, '.agents/config/project/management.json');
  const managementBytes = fs.readFileSync(managementPath);
  const management = readManagementConfigV1(JSON.parse(managementBytes));
  const planSources = listPlanSourceFiles(root, management);
  const sourceByPath = new Map(planSources.map(source => [source.relativePlanFile, source]));
  const paths = new Set([path.relative(root, managementPath)]);
  for (const source of planSources) {
    paths.add(source.relativePlanFile);
    const sprintDirectory = path.join(root, path.dirname(source.relativePlanFile), 'sprints');
    if (!fs.existsSync(sprintDirectory)) continue;
    for (const name of fs.readdirSync(sprintDirectory).sort()) {
      if (/^S\d+\.md$/u.test(name) || /^S\d+\.tasklets\.json$/u.test(name)) {
        const relativePath = path.relative(root, path.join(sprintDirectory, name));
        if (fs.statSync(path.join(root, relativePath)).isFile()) paths.add(relativePath);
      }
    }
  }
  const configurationDigest = digest(managementBytes);
  const parserIdentity = digest(Buffer.concat([
    Buffer.from('plan-index-v1\0'),
    fs.readFileSync(__filename),
    fs.readFileSync(require.resolve('./campaign-census')),
    fs.readFileSync(require.resolve('../skills/plan-execution/scripts/ready-sprints')),
    fs.readFileSync(require.resolve('../skills/plan-execution/scripts/ready-tasklets')),
  ]));
  const files = [...paths].sort().map(relativePath => {
    const { content, gitState } = fileState(root, relativePath);
    return {
      path: relativePath,
      contentDigest: digest(content),
      parserIdentity: digest(`${parserIdentity}\n${configurationDigest}\n${relativePath}`),
      gitState,
      parse: () => {
        if (relativePath.endsWith('/plan.md')) {
          return parsePlanIndexPlan(
            root,
            relativePath,
            sourceByPath.get(relativePath)?.lifecycle ?? null,
            content.toString('utf8'),
          );
        }
        if (/S\d+\.md$/u.test(relativePath)) {
          return parsePlanIndexSprint(relativePath, content.toString('utf8'));
        }
        if (/S\d+\.tasklets\.json$/u.test(relativePath)) {
          return parsePlanIndexTasklets(relativePath, content.toString('utf8'));
        }
        return { schemaVersion: 1, records: [] };
      },
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
    corpus: 'plans',
    configurationDigest,
    parserIdentity,
    stateDigest,
    searchableFields: [
      'entityId', 'entityKind', 'role', 'path', 'unitName', 'annotation', 'description',
    ],
    readPayload: PlanIndexStorageReaders.variants.V1,
    normalizePayloads: normalizePlanPayloads,
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
    const payloads = [];
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
        payload: projection.readPayload(parseResult.rows[0].payload),
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
      payloads.push(parsed.payload);
    }
    const normalized = projection.normalizePayloads === undefined
      ? {
        entities: payloads.flatMap(payload => payload.entities),
        relationships: payloads.flatMap(payload => payload.relationships),
      }
      : projection.normalizePayloads(payloads);
    const allEntities = normalized.entities;
    const allRelationships = normalized.relationships;
    const searchDocuments = new Map();
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
        role: entity.searchRole ?? null,
      }).map(([field, value]) => [field, projection.searchableFields.includes(field) ? value : null]));
      searchDocuments.set(entity.entityId, { ...searchable, requirementId: null });
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
        const document = searchDocuments.get(relationship.sourceEntityId);
        document.role = projection.searchableFields.includes('role') ? relationship.role : null;
        document.requirementId = projection.searchableFields.includes('requirementId')
          ? relationship.targetEntityId : null;
      }
    }
    for (const [entityId, document] of searchDocuments) {
      const content = Object.values(document).filter(value => value !== null).join('\n');
      const documentId = await insertTextDocument(client, Buffer.from(content));
      await client.query(`
        INSERT INTO ponytail_index.search_document_v2 (
          generation_id, entity_id, document_id, searchable_entity_id, entity_kind,
          path, unit_name, annotation, description, role, requirement_id
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
        generation.generation_id,
        entityId,
        documentId,
        document.entityId,
        document.entityKind,
        document.path,
        document.unitName,
        document.annotation,
        document.description,
        document.role,
        document.requirementId,
      ]);
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

async function indexProject(options = {}) {
  const configurationPath = options.configurationPath ??
    path.resolve('.agents/config/project/traceability.json');
  const traceability = collectTraceabilityProjection(configurationPath);
  const plans = collectPlanProjection(traceability.worktreePath);
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(traceability.worktreePath));
  const client = await pool.connect();
  try {
    const corpora = [];
    for (const projection of [traceability, plans]) {
      const publication = await publishTraceabilityGeneration(client, projection);
      corpora.push({
        corpus: projection.corpus,
        generationId: publication.generationId,
        stateDigest: publication.stateDigest,
        processedFiles: projection.files.length,
        parsedFiles: publication.parsedFiles,
        reusedFiles: publication.reusedFiles,
      });
    }
    return TraceabilityIndexResultReaders.variants.V2({
      schemaVersion: 2,
      headCommit: traceability.headCommit,
      worktree: traceability.worktreePath,
      rebuild: options.rebuild === true,
      corpora,
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
      `${projection.corpus} index is missing for this worktree; run ponytail traceability index`,
    );
  }
  const generation = result.rows[0];
  if (generation.head_commit !== projection.headCommit ||
      generation.state_digest !== projection.stateDigest ||
      generation.configuration_digest !== projection.configurationDigest ||
      generation.parser_identity !== projection.parserIdentity) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_STALE',
      `${projection.corpus} index is stale for this worktree; run ponytail traceability index`,
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
      `text.content ILIKE '%' || replace(replace(replace($2, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%' ESCAPE '\\'`,
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
      FROM ponytail_index.search_document_v2 document
      JOIN ponytail_index.text_document_v1 text USING (document_id)
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

function parseValidationArguments(args) {
  let json = false;
  let scope = { kind: 'repository', input: null };
  while (args.length > 0) {
    const option = args.shift();
    if (option === '--json' && !json) {
      json = true;
      continue;
    }
    const kind = { '--plan': 'plan', '--campaign': 'campaign' }[option];
    if (kind === undefined || scope.kind !== 'repository' || args.length === 0 ||
        args[0].startsWith('--')) {
      throw new ProjectIndexError(
        'TRACEABILITY_VALIDATE_USAGE',
        `invalid validate option: ${option}`,
      );
    }
    scope = { kind, input: args.shift() };
  }
  return { json, scope };
}

function scopedTraceabilityEntityIds(configuration, projection, scope, entities, relationships) {
  if (scope.kind === 'repository') {
    return { id: null, entityIds: new Set(entities.map(entity => entity.entity_id)) };
  }
  const campaign = resolveCampaignScope(projection.worktreePath, scope.input);
  const selectedPlans = scope.kind === 'campaign'
    ? campaign.plans
    : campaign.plans.filter(plan => plan.id === campaign.submittedPlanId);
  const selectedPlanFiles = new Set(selectedPlans.map(plan =>
    fs.realpathSync(path.join(projection.worktreePath, plan.path))));
  const planDirectories = selectedPlans.map(plan => `${path.posix.dirname(plan.path)}/`);
  const issuePaths = new Set();
  for (const artifact of configuration.artifacts.filter(candidate => candidate.class === 'issue')) {
    const issueFile = path.join(projection.worktreePath, artifact.path);
    if (!fs.existsSync(issueFile)) continue;
    const links = linkedPlanFiles({
      planFile: issueFile,
      text: fs.readFileSync(issueFile, 'utf8'),
    });
    if (links.some(link => selectedPlanFiles.has(link))) issuePaths.add(artifact.path);
  }
  const entityById = new Map(entities.map(entity => [entity.entity_id, entity]));
  const entityIds = new Set(entities.filter(entity =>
    entity.path !== null && (
      planDirectories.some(directory => entity.path.startsWith(directory)) ||
      issuePaths.has(entity.path)
    ) && ['plan', 'tasklet', 'issue'].includes(entity.entity_kind)
  ).map(entity => entity.entity_id));
  const requirementIds = new Set();
  for (const relationship of relationships) {
    if (entityIds.has(relationship.source_entity_id) &&
        entityById.get(relationship.target_entity_id)?.entity_kind === 'requirement') {
      requirementIds.add(relationship.target_entity_id);
    }
  }
  for (const requirementId of requirementIds) entityIds.add(requirementId);
  for (const relationship of relationships) {
    if (requirementIds.has(relationship.target_entity_id)) {
      entityIds.add(relationship.source_entity_id);
    }
  }
  return {
    id: scope.kind === 'campaign' ? campaign.campaignId : campaign.submittedPlanId,
    entityIds,
  };
}

function evaluateValidationRules(configuration, entities, relationships, entityIds) {
  const entityById = new Map(entities.map(entity => [entity.entity_id, entity]));
  const requirementById = new Map(configuration.requirements.map(requirement =>
    [requirement.id, requirement]));
  const gaps = [];
  for (const rule of configuration.validationRules) {
    const sources = entities.filter(entity =>
      entity.entity_kind === rule.sourceKind && entityIds.has(entity.entity_id));
    for (const source of sources) {
      if (rule.direction === 'reverse' && rule.sourceKind === 'requirement' &&
          rule.targetKind === 'unit-test' &&
          requirementById.get(source.entity_id)?.noUnitTestReason !== undefined) {
        continue;
      }
      const targets = new Set();
      for (const relationship of relationships) {
        if (!rule.roles.includes(relationship.role)) continue;
        const targetId = rule.direction === 'forward'
          ? relationship.target_entity_id : relationship.source_entity_id;
        const matchesSource = rule.direction === 'forward'
          ? relationship.source_entity_id === source.entity_id
          : relationship.target_entity_id === source.entity_id;
        if (matchesSource && entityIds.has(targetId) &&
            entityById.get(targetId)?.entity_kind === rule.targetKind) {
          targets.add(targetId);
        }
      }
      if (targets.size < rule.cardinality.minimum) gaps.push({
        ruleId: rule.id,
        sourceEntityId: source.entity_id,
        sourceKind: source.entity_kind,
        sourcePath: source.path,
        sourceLine: source.line,
        targetKind: rule.targetKind,
        roles: [...rule.roles],
        direction: rule.direction,
        minimum: rule.cardinality.minimum,
        actual: targets.size,
      });
    }
  }
  return gaps.sort((left, right) =>
    left.ruleId.localeCompare(right.ruleId) ||
    (left.sourcePath ?? '').localeCompare(right.sourcePath ?? '') ||
    (left.sourceLine ?? 0) - (right.sourceLine ?? 0) ||
    left.sourceEntityId.localeCompare(right.sourceEntityId));
}

async function validateTraceability(scope, options = {}) {
  const configurationPath = options.configurationPath ??
    path.resolve('.agents/config/project/traceability.json');
  const projection = collectTraceabilityProjection(configurationPath);
  const configuration = loadTraceabilityConfiguration(configurationPath);
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(projection.worktreePath));
  const client = await pool.connect();
  try {
    const generation = await currentGeneration(client, projection);
    const entityResult = await client.query(`
      SELECT entity_id, entity_kind, path, line
      FROM ponytail_index.entity_v1
      WHERE generation_id = $1::uuid
      ORDER BY entity_id`, [generation.generation_id]);
    const relationshipResult = await client.query(`
      SELECT source_entity_id, target_entity_id, role
      FROM ponytail_index.relationship_v1
      WHERE generation_id = $1::uuid
      ORDER BY source_entity_id, target_entity_id, role`, [generation.generation_id]);
    const selected = scopedTraceabilityEntityIds(
      configuration,
      projection,
      scope,
      entityResult.rows,
      relationshipResult.rows,
    );
    return TraceabilityValidationResultReaders.variants.V1({
      schemaVersion: 1,
      corpus: 'traceability',
      scope: { kind: scope.kind, id: selected.id },
      generationId: generation.generation_id,
      rules: configuration.validationRules.length,
      gaps: evaluateValidationRules(
        configuration,
        entityResult.rows,
        relationshipResult.rows,
        selected.entityIds,
      ),
    });
  } finally {
    client.release();
    if (options.pool === undefined) await pool.end();
  }
}

function parsePlanSearchArguments(args) {
  if (args.length === 0 || args[0].startsWith('--') || args[0].trim() === '') {
    throw new ProjectIndexError(
      'PLAN_SEARCH_USAGE',
      'usage: ponytail plan search <query> [--lifecycle <lifecycle>] [--kind <kind>] [--plan <plan>] [--json]',
    );
  }
  const query = args.shift();
  const filters = { lifecycle: null, kind: null, plan: null };
  let json = false;
  while (args.length > 0) {
    const option = args.shift();
    if (option === '--json') {
      if (json) throw new ProjectIndexError('PLAN_SEARCH_USAGE', `invalid search option: ${option}`);
      json = true;
      continue;
    }
    const key = { '--lifecycle': 'lifecycle', '--kind': 'kind', '--plan': 'plan' }[option];
    if (key === undefined || args.length === 0 || args[0].startsWith('--') || filters[key] !== null) {
      throw new ProjectIndexError('PLAN_SEARCH_USAGE', `invalid search option: ${option}`);
    }
    filters[key] = args.shift();
  }
  return { query, filters, json };
}

async function searchPlans(query, filters, options = {}) {
  const projection = collectPlanProjection(options.root);
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(projection.worktreePath));
  const client = await pool.connect();
  try {
    const generation = await currentGeneration(client, projection);
    const clauses = [
      'document.generation_id = $1::uuid',
      `text.content ILIKE '%' || replace(replace(replace($2, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%' ESCAPE '\\'`,
    ];
    const values = [generation.generation_id, query];
    for (const [key, column] of Object.entries({
      lifecycle: 'role',
      kind: 'entity_kind',
      plan: 'unit_name',
    })) {
      if (filters[key] !== null) {
        values.push(filters[key]);
        clauses.push(`document.${column} = $${values.length}`);
      }
    }
    const result = await client.query(`
      SELECT document.entity_id, document.entity_kind, document.unit_name,
        document.role, document.path, entity.line, document.annotation,
        left(document.description, 240) AS description
      FROM ponytail_index.search_document_v2 document
      JOIN ponytail_index.text_document_v1 text USING (document_id)
      JOIN ponytail_index.entity_v1 entity
        USING (generation_id, entity_id)
      WHERE ${clauses.join(' AND ')}
      ORDER BY document.path, entity.line NULLS LAST,
        document.entity_kind, document.entity_id`, values);
    return PlanSearchResultReaders.variants.V1({
      schemaVersion: 1,
      corpus: 'plans',
      query,
      filters,
      generationId: generation.generation_id,
      results: result.rows.map(row => ({
        recordId: row.entity_id,
        recordKind: row.entity_kind,
        owningPlanId: row.unit_name,
        lifecycle: row.role,
        path: row.path,
        line: row.line,
        heading: row.annotation,
        excerpt: row.description,
      })),
    });
  } finally {
    client.release();
    if (options.pool === undefined) await pool.end();
  }
}

function parsePlanGraphArguments(operation, args) {
  const needsInput = ['descendants', 'ancestors'].includes(operation);
  let input = null;
  let direct = false;
  let json = false;
  if (needsInput) {
    if (args.length === 0 || args[0].startsWith('--')) {
      throw new ProjectIndexError('PLAN_QUERY_USAGE', `usage: ponytail plan ${operation} <plan> ${operation === 'descendants' ? '[--direct] ' : ''}[--json]`);
    }
    input = args.shift();
  }
  for (const option of args) {
    if (option === '--json' && !json) json = true;
    else if (option === '--direct' && operation === 'descendants' && !direct) direct = true;
    else throw new ProjectIndexError('PLAN_QUERY_USAGE', `invalid ${operation} option: ${option}`);
  }
  return { input, direct, json };
}

async function queryPlanGraph(operation, input, direct, options = {}) {
  const projection = collectPlanProjection(options.root);
  let submittedPlanId = null;
  if (input !== null) {
    submittedPlanId = resolveCampaignRoot(projection.worktreePath, input).submittedPlanId;
  }
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(projection.worktreePath));
  const client = await pool.connect();
  try {
    const generation = await currentGeneration(client, projection);
    let result;
    const values = [generation.generation_id];
    if (operation === 'descendants' || operation === 'ancestors') {
      values.push(`plan:${submittedPlanId}`);
      const joins = operation === 'descendants'
        ? 'relation.target_entity_id = tree.entity_id'
        : 'relation.source_entity_id = tree.entity_id';
      const next = operation === 'descendants'
        ? 'relation.source_entity_id'
        : 'relation.target_entity_id';
      result = await client.query(`
        WITH RECURSIVE tree(entity_id, depth, trail) AS (
          SELECT $2::text, 0, ARRAY[$2::text]
          UNION ALL
          SELECT ${next}, tree.depth + 1, tree.trail || ${next}
          FROM tree
          JOIN ponytail_index.relationship_v1 relation ON ${joins}
            AND relation.generation_id = $1::uuid
            AND relation.role = 'campaign-parent'
          WHERE NOT ${next} = ANY(tree.trail)
        )
        SELECT entity.entity_id, document.role, document.path,
          NULL::text AS reason
        FROM tree
        JOIN ponytail_index.entity_v1 entity
          ON entity.generation_id = $1::uuid AND entity.entity_id = tree.entity_id
        JOIN ponytail_index.search_document_v2 document
          USING (generation_id, entity_id)
        WHERE tree.depth > 0${direct ? ' AND tree.depth = 1' : ''}
        ORDER BY tree.depth, entity.entity_id`, values);
    } else if (operation === 'roots') {
      result = await client.query(`
        SELECT entity.entity_id, document.role, document.path,
          NULL::text AS reason
        FROM ponytail_index.entity_v1 entity
        JOIN ponytail_index.search_document_v2 document
          USING (generation_id, entity_id)
        WHERE entity.generation_id = $1::uuid
          AND entity.entity_kind = 'plan'
          AND NOT EXISTS (
            SELECT 1 FROM ponytail_index.relationship_v1 relation
            WHERE relation.generation_id = entity.generation_id
              AND relation.source_entity_id = entity.entity_id
              AND relation.role = 'campaign-parent')
        ORDER BY entity.entity_id`, values);
    } else {
      result = await client.query(`
        SELECT entity.entity_id, document.role, document.path,
          document.description AS reason
        FROM ponytail_index.entity_v1 entity
        JOIN ponytail_index.search_document_v2 document
          USING (generation_id, entity_id)
        WHERE entity.generation_id = $1::uuid
          AND entity.entity_kind = 'stranded-plan'
        ORDER BY entity.entity_id`, values);
    }
    return PlanGraphResultReaders.variants.V1({
      schemaVersion: 1,
      corpus: 'plans',
      operation,
      input: submittedPlanId,
      direct,
      generationId: generation.generation_id,
      results: result.rows.map(row => ({
        planId: row.entity_id.replace(/^plan:/u, ''),
        lifecycle: row.role,
        path: row.path,
        reason: row.reason,
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

function printValidationHuman(result) {
  if (result.gaps.length === 0) {
    process.stdout.write(`traceability valid: ${result.rules} rules\n`);
    return;
  }
  for (const gap of result.gaps) {
    const location = `${gap.sourcePath ?? '-'}${gap.sourceLine === null ? '' : `:${gap.sourceLine}`}`;
    process.stdout.write(
      `${location}\t${gap.ruleId}\t${gap.sourceEntityId}\t` +
      `missing ${gap.targetKind} ${gap.direction} ${gap.roles.join(',')} ` +
      `(${gap.actual}/${gap.minimum})\n`,
    );
  }
}

function printPlanSearchHuman(result) {
  if (result.results.length === 0) {
    process.stdout.write('no plan matches\n');
    return;
  }
  for (const item of result.results) {
    const location = `${item.path}${item.line === null ? '' : `:${item.line}`}`;
    process.stdout.write([location, item.recordKind, item.owningPlanId, item.heading ?? '-'].join('\t') + '\n');
  }
}

function gitBuffer(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', status => {
      if (status === 0) resolve(Buffer.concat(stdout));
      else reject(new Error(Buffer.concat(stderr).toString('utf8').trim() ||
        `git ${args[0]} exited ${status}`));
    });
  });
}

function nulStrings(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function textContent(buffer) {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

function repositoryPath(value) {
  if (value === undefined || value === '.') return null;
  if (typeof value !== 'string' || value === '' || path.isAbsolute(value) || value.includes('\\')) {
    throw new ProjectIndexError('REPOSITORY_GREP_USAGE', `invalid repository path: ${value}`);
  }
  const normalized = path.posix.normalize(value.replaceAll(path.sep, '/')).replace(/^\.\//u, '').replace(/\/$/u, '');
  if (normalized === '..' || normalized.startsWith('../') || normalized === '') {
    throw new ProjectIndexError('REPOSITORY_GREP_USAGE', `invalid repository path: ${value}`);
  }
  return normalized;
}

function parseGrepArguments(args) {
  if (args.length === 0 || args[0].startsWith('--')) {
    throw new ProjectIndexError(
      'REPOSITORY_GREP_USAGE',
      'usage: ponytail search query <text> [--ref <ref> | --commit <commit-id> | --history <ref-or-commit>] [--path <path>] [-i|--ignore-case]',
    );
  }
  const query = args.shift();
  if (query === '') throw new ProjectIndexError('REPOSITORY_GREP_USAGE', 'search text must not be empty');
  let selector = null;
  let selectorValue = null;
  let pathFilter = null;
  let ignoreCase = false;
  while (args.length > 0) {
    const option = args.shift();
    if (option === '-i' || option === '--ignore-case') {
      if (ignoreCase) throw new ProjectIndexError('REPOSITORY_GREP_USAGE', `duplicate option: ${option}`);
      ignoreCase = true;
      continue;
    }
    if (!['--ref', '--commit', '--history', '--path'].includes(option) ||
        args.length === 0 || args[0].startsWith('--')) {
      throw new ProjectIndexError('REPOSITORY_GREP_USAGE', `invalid grep option: ${option}`);
    }
    const value = args.shift();
    if (option === '--path') {
      if (pathFilter !== null) throw new ProjectIndexError('REPOSITORY_GREP_USAGE', 'duplicate option: --path');
      pathFilter = repositoryPath(value);
      continue;
    }
    if (selector !== null) throw new ProjectIndexError('REPOSITORY_GREP_USAGE', 'grep state selectors are mutually exclusive');
    selector = option.slice(2);
    selectorValue = value;
  }
  return { query, selector: selector ?? 'worktree', selectorValue, path: pathFilter, ignoreCase };
}

function resolveCommit(root, selector, value) {
  if (selector === 'commit' && !/^[0-9a-f]{4,64}$/iu.test(value)) {
    throw new ProjectIndexError('REPOSITORY_GREP_REVISION', `invalid commit id: ${value}`);
  }
  try {
    let revision = value;
    if (selector === 'ref') {
      const candidates = value.startsWith('refs/')
        ? [value]
        : [`refs/heads/${value}`, `refs/tags/${value}`];
      const matches = candidates.filter(candidate => spawnSync(
        'git', ['show-ref', '--verify', '--quiet', candidate], { cwd: root },
      ).status === 0);
      if (matches.length !== 1) throw new Error('ref must resolve exactly once');
      revision = matches[0];
    }
    return git(root, ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]);
  } catch {
    throw new ProjectIndexError('REPOSITORY_GREP_REVISION', `cannot resolve ${selector}: ${value}`);
  }
}

async function repositoryTextContext(client, root) {
  const project = JSON.parse(fs.readFileSync(path.join(root, 'ponytail-journal.json'), 'utf8'));
  const repositoryDirectory = gitPath(root, ['--git-common-dir']);
  const worktreePath = gitPath(root, ['--show-toplevel']);
  await client.query('SELECT ponytail_index.register_project($1::uuid, $2)', [
    project.projectId,
    project.projectName,
  ]);
  const repository = await one(client, `
    INSERT INTO ponytail_index.repository_v1 (project_id, common_directory)
    VALUES ($1::uuid, $2)
    ON CONFLICT (project_id, common_directory) DO UPDATE
    SET common_directory = EXCLUDED.common_directory
    RETURNING repository_id`, [project.projectId, repositoryDirectory]);
  const worktree = await one(client, `
    INSERT INTO ponytail_index.worktree_v1 (repository_id, root_path)
    VALUES ($1::uuid, $2)
    ON CONFLICT (repository_id, root_path) DO UPDATE
    SET root_path = EXCLUDED.root_path
    RETURNING worktree_id`, [repository.repository_id, worktreePath]);
  return {
    project,
    repositoryId: repository.repository_id,
    worktreeId: worktree.worktree_id,
    root: worktreePath,
  };
}

async function currentRefs(root) {
  const names = (await gitBuffer(root, [
    'for-each-ref', '--format=%(refname)%00', 'refs/heads', 'refs/tags',
  ])).toString('utf8').split('\0').map(value => value.trim()).filter(Boolean);
  const refs = new Map();
  for (const name of names) refs.set(name, resolveCommit(root, 'ref', name));
  return refs;
}

async function insertTextDocument(client, buffer) {
  const content = textContent(buffer);
  if (content === null) return null;
  const documentId = digest(buffer);
  await client.query(`
    INSERT INTO ponytail_index.text_document_v1 (document_id, content)
    VALUES ($1, $2)
    ON CONFLICT (document_id) DO NOTHING`, [documentId, content]);
  return documentId;
}

async function ingestGitHistory(client, context, tips, options) {
  if (tips.length === 0) return { commits: 0, blobs: 0 };
  const lines = (await gitBuffer(context.root, [
    'rev-list', '--reverse', '--topo-order', '--parents', ...tips,
  ])).toString('utf8').trim().split('\n').filter(Boolean);
  const knownResult = await client.query(`
    SELECT commit_oid FROM ponytail_index.git_commit_v1
    WHERE repository_id = $1::uuid`, [context.repositoryId]);
  const known = new Set(knownResult.rows.map(row => row.commit_oid));
  const unseen = lines.map(line => line.split(' ')).filter(([commitOid]) => !known.has(commitOid));
  let commits = 0;
  let blobs = 0;
  await options.onProgress?.(commits, unseen.length);
  for (const [commitOid, ...parents] of unseen) {
    options.signal?.throwIfAborted();
    const [treeOid, committedAt] = (await gitBuffer(context.root, [
      'show', '-s', '--format=%T%x00%cI', commitOid,
    ])).toString('utf8').trim().split('\0');
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO ponytail_index.git_commit_v1 (
        repository_id, commit_oid, tree_oid, committed_at
      ) VALUES ($1::uuid, $2, $3, $4::timestamptz)
      ON CONFLICT (repository_id, commit_oid) DO NOTHING`, [
      context.repositoryId, commitOid, treeOid, committedAt,
    ]);
    for (const [parentOrder, parentOid] of parents.entries()) {
      await client.query(`
        INSERT INTO ponytail_index.git_commit_parent_v1 (
          repository_id, commit_oid, parent_oid, parent_order
        ) VALUES ($1::uuid, $2, $3, $4)
        ON CONFLICT DO NOTHING`, [context.repositoryId, commitOid, parentOid, parentOrder]);
    }
    const entries = nulStrings(await gitBuffer(context.root, [
      'ls-tree', '-r', '-z', '--full-tree', commitOid,
    ])).map(value => {
      const match = value.match(/^([0-7]{6}) (blob|commit) ([0-9a-f]{40,64})\t([\s\S]+)$/u);
      if (match === null) throw new Error(`invalid git tree entry: ${value}`);
      return { mode: match[1], type: match[2], blobOid: match[3], path: match[4] };
    }).filter(entry => entry.type === 'blob');
    for (const entry of entries) {
      options.signal?.throwIfAborted();
      const existing = await client.query(`
        SELECT 1 FROM ponytail_index.git_blob_v1
        WHERE repository_id = $1::uuid AND blob_oid = $2`, [context.repositoryId, entry.blobOid]);
      if (existing.rows.length === 0) {
        const buffer = await gitBuffer(context.root, ['cat-file', 'blob', entry.blobOid]);
        const documentId = await insertTextDocument(client, buffer);
        await client.query(`
          INSERT INTO ponytail_index.git_blob_v1 (
            repository_id, blob_oid, byte_length, document_id
          ) VALUES ($1::uuid, $2, $3, $4)
          ON CONFLICT (repository_id, blob_oid) DO NOTHING`, [
          context.repositoryId, entry.blobOid, buffer.length, documentId,
        ]);
        blobs += 1;
      }
      await client.query(`
        INSERT INTO ponytail_index.git_tree_entry_v1 (
          repository_id, commit_oid, path, mode, blob_oid
        ) VALUES ($1::uuid, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING`, [
        context.repositoryId, commitOid, entry.path, entry.mode, entry.blobOid,
      ]);
    }
    options.signal?.throwIfAborted();
    await client.query('COMMIT');
    commits += 1;
    await options.onProgress?.(commits, unseen.length);
  }
  return { commits, blobs };
}

function stableFileBuffer(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const first = fs.lstatSync(absolutePath);
  const buffer = first.isSymbolicLink()
    ? Buffer.from(fs.readlinkSync(absolutePath))
    : first.isFile() ? fs.readFileSync(absolutePath) : null;
  const second = fs.lstatSync(absolutePath);
  if (first.dev !== second.dev || first.ino !== second.ino || first.size !== second.size ||
      first.mtimeMs !== second.mtimeMs) {
    throw new ProjectIndexError('REPOSITORY_INDEX_UNSTABLE', `file changed while indexing: ${relativePath}`);
  }
  return buffer;
}

async function collectWorktreeOverlay(context) {
  const modified = new Set(nulStrings(await gitBuffer(context.root, [
    'diff', '--name-only', '-z', '--no-renames', 'HEAD', '--',
  ])));
  const untracked = new Set(nulStrings(await gitBuffer(context.root, [
    'ls-files', '--others', '--exclude-standard', '-z', '--',
  ])));
  const entries = [];
  for (const relativePath of [...new Set([...modified, ...untracked])].sort()) {
    let buffer;
    try {
      buffer = stableFileBuffer(context.root, relativePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        entries.push({ path: relativePath, state: 'deleted', documentId: null, content: null });
        continue;
      }
      throw error;
    }
    if (buffer === null) {
      entries.push({ path: relativePath, state: 'deleted', documentId: null, content: null });
      continue;
    }
    const content = textContent(buffer);
    if (content === null) {
      entries.push({ path: relativePath, state: 'deleted', documentId: null, content: null });
      continue;
    }
    entries.push({
      path: relativePath,
      state: untracked.has(relativePath) ? 'untracked' : 'modified',
      documentId: digest(buffer),
      content,
    });
  }
  const headCommit = git(context.root, ['rev-parse', 'HEAD']);
  const stateDigest = digest(`${headCommit}\n${entries.map(entry =>
    `${entry.path}\0${entry.state}\0${entry.documentId ?? ''}\n`).join('')}`);
  return { headCommit, stateDigest, entries };
}

async function publishWorktreeOverlay(client, context) {
  const first = await collectWorktreeOverlay(context);
  const second = await collectWorktreeOverlay(context);
  if (first.stateDigest !== second.stateDigest) {
    throw new ProjectIndexError('REPOSITORY_INDEX_UNSTABLE', 'worktree changed while indexing');
  }
  const current = await client.query(`
    SELECT generation.generation_id, generation.state_digest
    FROM ponytail_index.published_worktree_text_generation_v1 published
    JOIN ponytail_index.worktree_text_generation_v1 generation USING (generation_id)
    WHERE published.worktree_id = $1::uuid`, [context.worktreeId]);
  if (current.rows[0]?.state_digest === second.stateDigest) {
    return { generationId: current.rows[0].generation_id, indexedDocuments: 0, reused: true };
  }
  const generation = await one(client, `
    INSERT INTO ponytail_index.worktree_text_generation_v1 (
      worktree_id, head_commit, state_digest
    ) VALUES ($1::uuid, $2, $3)
    RETURNING generation_id`, [context.worktreeId, second.headCommit, second.stateDigest]);
  let indexedDocuments = 0;
  for (const entry of second.entries) {
    if (entry.documentId !== null) {
      const inserted = await client.query(`
        INSERT INTO ponytail_index.text_document_v1 (document_id, content)
        VALUES ($1, $2)
        ON CONFLICT (document_id) DO NOTHING
        RETURNING document_id`, [entry.documentId, entry.content]);
      indexedDocuments += inserted.rows.length;
    }
    await client.query(`
      INSERT INTO ponytail_index.worktree_text_entry_v1 (
        generation_id, path, state, document_id
      ) VALUES ($1::uuid, $2, $3, $4)`, [
      generation.generation_id, entry.path, entry.state, entry.documentId,
    ]);
  }
  await client.query(`
    INSERT INTO ponytail_index.published_worktree_text_generation_v1 (
      worktree_id, generation_id
    ) VALUES ($1::uuid, $2::uuid)
    ON CONFLICT (worktree_id) DO UPDATE
    SET generation_id = EXCLUDED.generation_id`, [context.worktreeId, generation.generation_id]);
  if (current.rows.length === 1) {
    await client.query(`DELETE FROM ponytail_index.worktree_text_generation_v1
      WHERE generation_id = $1::uuid`, [current.rows[0].generation_id]);
    await client.query(`DELETE FROM ponytail_index.text_document_v1 document
      WHERE NOT EXISTS (
        SELECT 1 FROM ponytail_index.git_blob_v1 blob
        WHERE blob.document_id = document.document_id
      ) AND NOT EXISTS (
        SELECT 1 FROM ponytail_index.worktree_text_entry_v1 entry
        WHERE entry.document_id = document.document_id
      ) AND NOT EXISTS (
        SELECT 1 FROM ponytail_index.search_document_v2 search
        WHERE search.document_id = document.document_id
      )`);
  }
  return { generationId: generation.generation_id, indexedDocuments, reused: false };
}

async function refreshRepositoryTextIndex(options = {}) {
  const root = fs.realpathSync(options.root ?? git(process.cwd(), ['rev-parse', '--show-toplevel']));
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(root));
  const client = await pool.connect();
  let lockKey;
  try {
    await client.query('BEGIN');
    const context = await repositoryTextContext(client, root);
    const writerKey = JSON.stringify([
      context.project.projectId, context.repositoryId, context.worktreeId, 'repository-text',
    ]);
    const lock = await one(client,
      'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired', [writerKey]);
    if (!lock.acquired) throw new ProjectIndexError('REPOSITORY_INDEX_BUSY', 'repository text index writer is already active');
    lockKey = writerKey;
    await client.query('COMMIT');
    const refs = await currentRefs(root);
    const headCommit = git(root, ['rev-parse', 'HEAD']);
    const tips = [...new Set([...refs.values(), headCommit, ...(options.tips ?? [])])];
    const history = await ingestGitHistory(client, context, tips, options);
    options.signal?.throwIfAborted();
    await options.onPublish?.();
    await client.query('BEGIN');
    const priorResult = await client.query(`
      SELECT ref_name, commit_oid FROM ponytail_index.git_ref_current_v1
      WHERE repository_id = $1::uuid`, [context.repositoryId]);
    const prior = new Map(priorResult.rows.map(row => [row.ref_name, row.commit_oid]));
    const observedAt = (await one(client, 'SELECT clock_timestamp() AS observed_at')).observed_at;
    for (const [refName, commitOid] of refs) {
      if (prior.get(refName) === commitOid) continue;
      await client.query(`
        INSERT INTO ponytail_index.git_ref_observation_v1 (
          repository_id, observed_at, ref_name, commit_oid, deleted
        ) VALUES ($1::uuid, $2::timestamptz, $3, $4, false)`, [
        context.repositoryId, observedAt, refName, commitOid,
      ]);
      await client.query(`
        INSERT INTO ponytail_index.git_ref_current_v1 (
          repository_id, ref_name, commit_oid, observed_at
        ) VALUES ($1::uuid, $2, $3, $4::timestamptz)
        ON CONFLICT (repository_id, ref_name) DO UPDATE
        SET commit_oid = EXCLUDED.commit_oid, observed_at = EXCLUDED.observed_at`, [
        context.repositoryId, refName, commitOid, observedAt,
      ]);
    }
    for (const refName of prior.keys()) {
      if (refs.has(refName)) continue;
      await client.query(`
        INSERT INTO ponytail_index.git_ref_observation_v1 (
          repository_id, observed_at, ref_name, commit_oid, deleted
        ) VALUES ($1::uuid, $2::timestamptz, $3, NULL, true)`, [
        context.repositoryId, observedAt, refName,
      ]);
      await client.query(`DELETE FROM ponytail_index.git_ref_current_v1
        WHERE repository_id = $1::uuid AND ref_name = $2`, [context.repositoryId, refName]);
    }
    const overlay = await publishWorktreeOverlay(client, context);
    if (git(root, ['rev-parse', 'HEAD']) !== headCommit ||
        JSON.stringify([...await currentRefs(root)]) !== JSON.stringify([...refs])) {
      throw new ProjectIndexError('REPOSITORY_INDEX_UNSTABLE', 'repository refs changed while indexing');
    }
    options.signal?.throwIfAborted();
    await client.query('COMMIT');
    return { ...context, headCommit, history, overlay };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    try {
      if (lockKey !== undefined) await client.query(
        'SELECT pg_advisory_unlock(hashtextextended($1, 0))', [lockKey]);
    } finally {
      client.release();
      if (options.pool === undefined) await pool.end();
    }
  }
}

function repositoryIndexProgress(stream = process.stdout, now = Date.now) {
  const startedAt = now();
  let bar;
  let completed = 0;
  let total = 0;
  let lineOpen = false;
  const status = () => {
    const percentage = total === 0 ? 100 : Math.floor(completed * 100 / total);
    const eta = completed === 0 && total > 0 ? 'unknown' :
      `${Math.ceil((now() - startedAt) / 1000 * (total - completed) / Math.max(completed, 1))}s`;
    return { percentage, eta };
  };
  const stop = () => {
    bar?.stop();
    if (lineOpen) stream.write('\n');
    lineOpen = false;
  };
  return {
    update(value, maximum) {
      completed = value;
      total = maximum;
      const payload = status();
      if (value === 0) {
        stream.write(`Indexing ${total} unseen commits (ETA ${payload.eta})\n`);
        if (stream.isTTY) {
          bar = new (require('cli-progress').SingleBar)({
            stream, format: 'History [{bar}] {percentage}% {value}/{total} commits | ETA {remaining}',
          });
          bar.start(total, 0, { remaining: payload.eta });
        }
      } else if (stream.isTTY) {
        bar.update(completed, { remaining: payload.eta });
      } else {
        stream.write('.');
        if (completed % 10 === 0) stream.write('+');
        lineOpen = true;
        if (completed % 50 === 0) {
          stream.write(`| ${payload.percentage}% ETA ${payload.eta}\n`);
          lineOpen = false;
        }
      }
    },
    publish() {
      stop();
      stream.write('History complete; publishing refs and worktree overlay\n');
    },
    stop,
  };
}

function literalMatches(content, query, ignoreCase) {
  const needle = ignoreCase ? query.toLocaleLowerCase() : query;
  const results = [];
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    const candidate = ignoreCase ? line.toLocaleLowerCase() : line;
    if (candidate.includes(needle)) results.push({ line: index + 1, text: line });
  }
  return results;
}

async function grepRepository(search, options = {}) {
  const root = fs.realpathSync(options.root ?? git(process.cwd(), ['rev-parse', '--show-toplevel']));
  let commitOid = null;
  if (search.selector !== 'worktree') {
    commitOid = resolveCommit(root, search.selector, search.selectorValue);
  }
  const pool = options.pool ?? new (require('pg').Pool)(databaseOptions(root));
  try {
    const refreshed = options.refreshed ?? await refreshRepositoryTextIndex({
      root, pool, tips: commitOid === null ? [] : [commitOid],
    });
    const client = await pool.connect();
    try {
      const escaped = search.query.replace(/[\\%_]/gu, value => `\\${value}`);
      const pattern = `%${escaped}%`;
      const operator = search.ignoreCase ? 'ILIKE' : 'LIKE';
      const pathCondition = `($3::text IS NULL OR candidate.path = $3 OR
        left(candidate.path, length($3) + 1) = $3 || '/')`;
      let sql;
      if (search.selector === 'worktree') {
        sql = `
          WITH published AS (
            SELECT generation.generation_id, generation.head_commit
            FROM ponytail_index.published_worktree_text_generation_v1 pointer
            JOIN ponytail_index.worktree_text_generation_v1 generation USING (generation_id)
            WHERE pointer.worktree_id = $4::uuid AND $1::text IS NULL
          ), candidate AS (
            SELECT tree.path, document.content, NULL::text AS commit_oid
            FROM published
            JOIN ponytail_index.git_tree_entry_v1 tree
              ON tree.repository_id = $5::uuid AND tree.commit_oid = published.head_commit
            JOIN ponytail_index.git_blob_v1 blob
              ON blob.repository_id = tree.repository_id AND blob.blob_oid = tree.blob_oid
            JOIN ponytail_index.text_document_v1 document USING (document_id)
            WHERE NOT EXISTS (
              SELECT 1 FROM ponytail_index.worktree_text_entry_v1 overlay
              WHERE overlay.generation_id = published.generation_id AND overlay.path = tree.path
            )
            UNION ALL
            SELECT overlay.path, document.content, NULL::text
            FROM published
            JOIN ponytail_index.worktree_text_entry_v1 overlay USING (generation_id)
            JOIN ponytail_index.text_document_v1 document USING (document_id)
            WHERE overlay.state <> 'deleted'
          )
          SELECT path, content, commit_oid FROM candidate
          WHERE content ${operator} $2 ESCAPE '\\' AND ${pathCondition}
          ORDER BY path`;
      } else if (search.selector === 'history') {
        sql = `
          WITH RECURSIVE commits(commit_oid) AS (
            VALUES ($1::text)
            UNION
            SELECT parent.parent_oid
            FROM commits
            JOIN ponytail_index.git_commit_parent_v1 parent
              ON parent.repository_id = $5::uuid AND parent.commit_oid = commits.commit_oid
          ), candidate AS (
            SELECT tree.path, document.content, tree.commit_oid
            FROM commits
            JOIN ponytail_index.git_tree_entry_v1 tree
              ON tree.repository_id = $5::uuid AND tree.commit_oid = commits.commit_oid
            JOIN ponytail_index.git_blob_v1 blob
              ON blob.repository_id = tree.repository_id AND blob.blob_oid = tree.blob_oid
            JOIN ponytail_index.text_document_v1 document USING (document_id)
          )
          SELECT path, content, commit_oid FROM candidate
          WHERE content ${operator} $2 ESCAPE '\\' AND ${pathCondition}
            AND $4::uuid IS NOT NULL
          ORDER BY commit_oid, path`;
      } else {
        sql = `
          WITH candidate AS (
            SELECT tree.path, document.content, tree.commit_oid
            FROM ponytail_index.git_tree_entry_v1 tree
            JOIN ponytail_index.git_blob_v1 blob
              ON blob.repository_id = tree.repository_id AND blob.blob_oid = tree.blob_oid
            JOIN ponytail_index.text_document_v1 document USING (document_id)
            WHERE tree.repository_id = $5::uuid AND tree.commit_oid = $1
          )
          SELECT path, content, commit_oid FROM candidate
          WHERE content ${operator} $2 ESCAPE '\\' AND ${pathCondition}
            AND $4::uuid IS NOT NULL
          ORDER BY path`;
      }
      const result = await client.query(sql, [
        commitOid, pattern, search.path, refreshed.worktreeId, refreshed.repositoryId,
      ]);
      return result.rows.flatMap(row => literalMatches(row.content, search.query, search.ignoreCase)
        .map(match => ({ commit: row.commit_oid, path: row.path, ...match })));
    } finally {
      client.release();
    }
  } finally {
    if (options.pool === undefined) await pool.end();
  }
}

function printGrepHuman(matches, history) {
  for (const match of matches) {
    process.stdout.write(`${history ? `${match.commit}:` : ''}${match.path}:${match.line}:${match.text}\n`);
  }
}

function printPlanGraphHuman(result) {
  if (result.results.length === 0) {
    process.stdout.write(`no ${result.operation} plans\n`);
    return;
  }
  for (const item of result.results) {
    process.stdout.write([item.planId, item.lifecycle ?? '-', item.path, item.reason ?? '-'].join('\t') + '\n');
  }
}

async function run(args) {
  const family = args.shift();
  const operation = args.shift();
  if (family === 'search' && operation === 'update-index') {
    if (args.length > 0) throw new ProjectIndexError(
      'REPOSITORY_INDEX_USAGE', 'usage: ponytail search update-index');
    const progress = repositoryIndexProgress();
    const abortController = new AbortController();
    const interrupt = () => abortController.abort(new ProjectIndexError(
      'REPOSITORY_INDEX_INTERRUPTED', 'index update interrupted; rerun to resume completed checkpoints'));
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    try {
      const result = await refreshRepositoryTextIndex({
        onProgress: progress.update, onPublish: progress.publish, signal: abortController.signal,
      });
      process.stdout.write(`Index updated: ${result.history.commits} commits, ${result.history.blobs} new blobs\n`);
    } finally {
      progress.stop();
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
    return;
  }
  if (family === 'search' && operation === 'query') {
    const search = parseGrepArguments(args);
    const matches = await grepRepository(search);
    printGrepHuman(matches, search.selector === 'history');
    if (matches.length === 0) process.exitCode = 1;
    return;
  }
  const valid = family === 'traceability' && ['index', 'search', 'validate'].includes(operation) ||
    family === 'plan' && ['search', 'descendants', 'ancestors', 'roots', 'stranded'].includes(operation);
  if (!valid) {
    throw new ProjectIndexError(
      'PROJECT_INDEX_USAGE',
      'usage: ponytail <search|traceability|plan> <operation> ...',
    );
  }
  if (family === 'plan') {
    if (operation === 'search') {
      const search = parsePlanSearchArguments(args);
      const result = await searchPlans(search.query, search.filters);
      if (search.json) process.stdout.write(`${JSON.stringify(result)}\n`);
      else printPlanSearchHuman(result);
      return;
    }
    const query = parsePlanGraphArguments(operation, args);
    const result = await queryPlanGraph(operation, query.input, query.direct);
    if (query.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else printPlanGraphHuman(result);
    return;
  }
  if (operation === 'index') {
    const allowed = new Set(['--rebuild', '--json']);
    if (args.some(argument => !allowed.has(argument)) || new Set(args).size !== args.length) {
      throw new ProjectIndexError(
        'TRACEABILITY_INDEX_USAGE',
        'usage: ponytail traceability index [--rebuild] [--json]',
      );
    }
    const result = await indexProject({ rebuild: args.includes('--rebuild') });
    if (args.includes('--json')) process.stdout.write(`${JSON.stringify(result)}\n`);
    else for (const corpus of result.corpora) process.stdout.write(
      `indexed ${corpus.corpus}: ${corpus.processedFiles} files, ` +
      `${corpus.parsedFiles} parsed, ${corpus.reusedFiles} reused\n`);
    return;
  }
  if (operation === 'validate') {
    const validation = parseValidationArguments(args);
    const result = await validateTraceability(validation.scope);
    if (validation.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else printValidationHuman(result);
    if (result.gaps.length > 0) process.exitCode = 1;
    return;
  }
  const search = parseSearchArguments(args);
  const result = await searchTraceability(search.query, search.filters);
  if (search.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else printSearchHuman(result);
}

if (require.main === module) {
  process.stdout.on('error', error => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });
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
  TraceabilityValidationResultReaders,
  PlanIndexStorageReaders,
  PlanSearchResultReaders,
  PlanGraphResultReaders,
  collectPlanProjection,
  collectTraceabilityProjection,
  digest,
  parseFile,
  publishTraceabilityGeneration,
  indexTraceability,
  indexProject,
  parseSearchArguments,
  parseValidationArguments,
  parsePlanSearchArguments,
  parsePlanGraphArguments,
  normalizePlanPayloads,
  searchPlans,
  queryPlanGraph,
  evaluateValidationRules,
  scopedTraceabilityEntityIds,
  searchTraceability,
  validateTraceability,
  parseGrepArguments,
  databaseOptions,
  refreshRepositoryTextIndex,
  repositoryIndexProgress,
  grepRepository,
};
