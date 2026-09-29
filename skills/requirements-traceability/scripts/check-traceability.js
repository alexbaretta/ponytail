#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const artifactClasses = new Set(['implementation', 'unit-test', 'integration-test', 'uat']);
const locatorKinds = new Set(['text', 'typescript']);
const relationshipRoles = new Set(['implements', 'supports', 'verifies']);
const searchableFields = Object.freeze([
  'entityId',
  'entityKind',
  'role',
  'requirementId',
  'path',
  'unitName',
  'annotation',
  'description',
]);
const searchableFieldSet = new Set(searchableFields);
const artifactClassRoles = new Map([
  ['implementation', new Set(['implements', 'supports'])],
  ['unit-test', new Set(['verifies'])],
  ['integration-test', new Set(['verifies'])],
  ['uat', new Set(['verifies'])],
]);
const markerPattern = /[Tt]raceability["']?\s*:\s*["']?(implements|supports|verifies)\s+([A-Z][A-Z0-9-]*)/gu;

function exactObject(value, keys, label) {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label} must be an object`);
  }
  const unknown = Object.keys(value).filter(key => !keys.includes(key));
  if (unknown.length) throw new Error(`${label} has unknown keys: ${unknown.join(', ')}`);
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function relativePath(value, label) {
  const candidate = nonEmptyString(value, label);
  if (path.isAbsolute(candidate) || candidate.split(/[\\/]/u).some(part => part === '.' || part === '..')) {
    throw new Error(`${label} must be a safe project-relative path`);
  }
  return candidate.replace(/\\/gu, '/');
}

function roles(value, artifactClass, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(role => typeof role !== 'string')) {
    throw new Error(`${label} must be a non-empty array of roles`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates`);
  const validRoles = artifactClassRoles.get(artifactClass);
  if (value.some(role => !relationshipRoles.has(role) || !validRoles.has(role))) {
    throw new Error(`${label} contains a role invalid for ${artifactClass}`);
  }
  return value;
}

function normalizeTraceabilityConfiguration(document, configurationPath, schemaVersion) {
  const root = path.dirname(path.resolve(configurationPath));
  exactObject(
    document,
    ['schemaVersion', 'projectRoot', 'requirements', 'artifacts', 'generatedArtifacts', 'reverseViewPath', 'typescript', ...(schemaVersion === 2 ? ['index'] : [])],
    'traceability configuration',
  );
  if (document.schemaVersion !== schemaVersion) {
    throw new Error(`traceability configuration schemaVersion must be ${schemaVersion}`);
  }
  const configuredProjectRoot = nonEmptyString(document.projectRoot, 'projectRoot');
  if (path.isAbsolute(configuredProjectRoot)) throw new Error('projectRoot must be relative to the configuration file');
  const projectRoot = path.resolve(root, configuredProjectRoot);
  if (!Array.isArray(document.requirements) || document.requirements.length === 0) {
    throw new Error('traceability configuration requirements must be a non-empty array');
  }
  if (!Array.isArray(document.artifacts)) throw new Error('traceability configuration artifacts must be an array');
  if (!Array.isArray(document.generatedArtifacts)) {
    throw new Error('traceability configuration generatedArtifacts must be an array');
  }

  const requirements = document.requirements.map((value, index) => {
    const requirement = exactObject(value, ['id', 'sourcePath', 'noUnitTestReason'], `requirements[${index}]`);
    return {
      id: nonEmptyString(requirement.id, `requirements[${index}].id`),
      sourcePath: relativePath(requirement.sourcePath, `requirements[${index}].sourcePath`),
      ...(requirement.noUnitTestReason === undefined
        ? {}
        : { noUnitTestReason: nonEmptyString(requirement.noUnitTestReason, `requirements[${index}].noUnitTestReason`) }),
    };
  });
  const requirementIds = new Set();
  for (const requirement of requirements) {
    if (requirementIds.has(requirement.id)) throw new Error(`duplicate requirement id: ${requirement.id}`);
    requirementIds.add(requirement.id);
  }

  const artifacts = document.artifacts.map((value, index) => {
    const artifact = exactObject(value, ['class', 'path', 'locator', 'roles'], `artifacts[${index}]`);
    const artifactClass = nonEmptyString(artifact.class, `artifacts[${index}].class`);
    const locator = nonEmptyString(artifact.locator, `artifacts[${index}].locator`);
    if (!artifactClasses.has(artifactClass)) throw new Error(`artifacts[${index}].class is unsupported: ${artifactClass}`);
    if (!locatorKinds.has(locator)) throw new Error(`artifacts[${index}].locator is unsupported: ${locator}`);
    if (locator === 'typescript' && artifactClass !== 'implementation' && artifactClass !== 'unit-test') {
      throw new Error(`artifacts[${index}] uses a TypeScript locator for unsupported class ${artifactClass}`);
    }
    return {
      class: artifactClass,
      path: relativePath(artifact.path, `artifacts[${index}].path`),
      locator,
      ...(artifact.roles === undefined ? {} : { roles: roles(artifact.roles, artifactClass, `artifacts[${index}].roles`) }),
    };
  });

  const artifactsByPath = new Map();
  for (const artifact of artifacts) {
    const grouped = artifactsByPath.get(artifact.path) ?? [];
    grouped.push(artifact);
    artifactsByPath.set(artifact.path, grouped);
  }
  for (const [artifactPath, grouped] of artifactsByPath) {
    if (grouped.length === 1) continue;
    if (new Set(grouped.map(artifact => artifact.class)).size !== grouped.length) {
      throw new Error(`duplicate artifact path has repeated class: ${artifactPath}`);
    }
    if (grouped.some(artifact => artifact.roles === undefined)) {
      throw new Error(`duplicate artifact path requires explicit role filters: ${artifactPath}`);
    }
    const filteredRoles = new Set();
    for (const artifact of grouped) {
      for (const role of artifact.roles) {
        if (filteredRoles.has(role)) throw new Error(`duplicate artifact path has overlapping role filters: ${artifactPath}`);
        filteredRoles.add(role);
      }
    }
  }

  const generatedArtifacts = document.generatedArtifacts.map((value, index) => {
    const generatedArtifact = exactObject(value, ['path', 'sourcePath'], `generatedArtifacts[${index}]`);
    return {
      path: relativePath(generatedArtifact.path, `generatedArtifacts[${index}].path`),
      sourcePath: relativePath(generatedArtifact.sourcePath, `generatedArtifacts[${index}].sourcePath`),
    };
  });

  let typescript;
  if (document.typescript !== undefined) {
    const configuredTypescript = exactObject(document.typescript, ['cliPath', 'projectPath'], 'typescript');
    typescript = {
      cliPath: relativePath(configuredTypescript.cliPath, 'typescript.cliPath'),
      projectPath: relativePath(configuredTypescript.projectPath, 'typescript.projectPath'),
    };
  }

  let configuredSearchableFields = searchableFields;
  if (schemaVersion === 2) {
    const indexConfiguration = exactObject(document.index, ['searchableFields'], 'index');
    if (
      !Array.isArray(indexConfiguration.searchableFields) ||
      indexConfiguration.searchableFields.length === 0 ||
      indexConfiguration.searchableFields.some(value => typeof value !== 'string')
    ) {
      throw new Error('index.searchableFields must be a non-empty array of strings');
    }
    if (new Set(indexConfiguration.searchableFields).size !== indexConfiguration.searchableFields.length) {
      throw new Error('index.searchableFields must not contain duplicates');
    }
    const unknownSearchableField = indexConfiguration.searchableFields.find(value => !searchableFieldSet.has(value));
    if (unknownSearchableField !== undefined) {
      throw new Error(`index.searchableFields contains unsupported field: ${unknownSearchableField}`);
    }
    configuredSearchableFields = Object.freeze([...indexConfiguration.searchableFields]);
  }

  return {
    schemaVersion,
    root: projectRoot,
    configurationPath: path.resolve(configurationPath),
    requirements,
    artifacts,
    generatedArtifacts,
    reverseViewPath: relativePath(document.reverseViewPath, 'reverseViewPath'),
    index: { searchableFields: configuredSearchableFields },
    ...(typescript === undefined ? {} : { typescript }),
  };
}

function readTraceabilityConfigurationV1(document, configurationPath) {
  return normalizeTraceabilityConfiguration(document, configurationPath, 1);
}

function readTraceabilityConfigurationV2(document, configurationPath) {
  return normalizeTraceabilityConfiguration(document, configurationPath, 2);
}

const TraceabilityConfigReaders = Object.freeze({
  V1: readTraceabilityConfigurationV1,
  V2: readTraceabilityConfigurationV2,
});

function loadTraceabilityConfiguration(configurationPath) {
  const document = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
  const reader = TraceabilityConfigReaders[`V${document?.schemaVersion}`];
  if (reader === undefined) {
    throw new Error(`unsupported traceability configuration schemaVersion: ${document?.schemaVersion}`);
  }
  return reader(document, configurationPath);
}

function findRelationships(source, artifact) {
  const relationships = [];
  for (const match of source.matchAll(markerPattern)) {
    if (artifact.roles !== undefined && !artifact.roles.includes(match[1])) continue;
    const lineStart = source.lastIndexOf('\n', match.index) + 1;
    const prefix = source.slice(lineStart, match.index).trimStart();
    if (
      artifact.locator === 'typescript' &&
      !prefix.startsWith('//') &&
      !prefix.startsWith('/*') &&
      !prefix.startsWith('*')
    ) {
      continue;
    }
    relationships.push({
      artifactClass: artifact.class,
      locator: artifact.locator,
      path: artifact.path,
      line: source.slice(0, match.index).split('\n').length,
      role: match[1],
      requirementId: match[2],
    });
  }
  return relationships;
}

function requirementSourceDeclares(source, requirementId) {
  if (source.includes(`**Identifier:** \`${requirementId}\``)) return true;
  const escapedId = requirementId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const declarationEnd = String.raw`(?=\s*(?::|[-–—]|$))`;
  const boldList = new RegExp(String.raw`^(?: {0,3}[-+*]| {0,3}\d+[.)])\s+(?:\*\*${escapedId}\s*[:–—-]\*\*|\*\*${escapedId}\*\*${declarationEnd})`, 'mu');
  const atxHeading = new RegExp(String.raw`^ {0,3}#{1,6}\s+${escapedId}${declarationEnd}`, 'mu');
  return boldList.test(source) || atxHeading.test(source);
}

function diagnostic(ruleId, message, filePath, line) {
  return { ruleId, message, ...(filePath === undefined ? {} : { filePath }), ...(line === undefined ? {} : { line }) };
}

function renderReverseView(configuration, relationships) {
  const byRequirement = new Map(configuration.requirements.map(requirement => [requirement.id, []]));
  for (const relationship of relationships) byRequirement.get(relationship.requirementId)?.push(relationship);

  const lines = [
    '<!-- Generated by requirements-traceability. Do not edit. -->',
    '',
    '# Requirements Traceability',
    '',
    `Source: \`${path.relative(configuration.root, configuration.configurationPath).replace(/\\/gu, '/')}\``,
    '',
  ];
  for (const requirement of configuration.requirements) {
    const sourceLink = path.posix.relative(
      path.posix.dirname(configuration.reverseViewPath),
      requirement.sourcePath,
    );
    lines.push(`## ${requirement.id}`, '', `Requirement: [${requirement.sourcePath}](${sourceLink})`, '');
    const entries = byRequirement.get(requirement.id) ?? [];
    for (const artifactClass of artifactClasses) {
      const matches = entries
        .filter(relationship => relationship.artifactClass === artifactClass)
        .sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line);
      if (!matches.length && artifactClass === 'unit-test' && requirement.noUnitTestReason !== undefined) {
        lines.push(`- unit-test: not possible — ${requirement.noUnitTestReason}`);
      } else {
        for (const relationship of matches) {
          lines.push(`- ${artifactClass}: ${relationship.role} [${relationship.path}:${relationship.line}](../../${relationship.path}#L${relationship.line})`);
        }
      }
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function runTypescriptChecker(configuration) {
  if (!configuration.artifacts.some(artifact => artifact.locator === 'typescript')) return [];
  if (configuration.typescript === undefined) {
    return [diagnostic('traceability-typescript-configuration', 'TypeScript artifacts require a configured semantic checker')];
  }
  const result = spawnSync(
    process.execPath,
    [
      path.resolve(configuration.root, configuration.typescript.cliPath),
      '--project',
      configuration.typescript.projectPath,
      '--traceability',
      path.relative(configuration.root, configuration.configurationPath),
    ],
    { cwd: configuration.root, encoding: 'utf8' },
  );
  if (result.status === 0) return [];
  const message = (result.stderr || result.stdout || `TSTS exited ${result.status}`).trim();
  return [diagnostic('traceability-typescript', message)];
}

// Traceability: implements REQ-REQUIREMENTS-TRACEABILITY
function analyzeTraceability(configurationPath, options = {}) {
  const configuration = loadTraceabilityConfiguration(configurationPath);
  const diagnostics = [];
  const relationships = [];
  const ids = new Set(configuration.requirements.map(requirement => requirement.id));

  for (const requirement of configuration.requirements) {
    const sourcePath = path.resolve(configuration.root, requirement.sourcePath);
    if (!fs.existsSync(sourcePath)) {
      diagnostics.push(diagnostic('traceability-requirement-source', `requirement source does not resolve: ${requirement.sourcePath}`));
      continue;
    }
    const source = fs.readFileSync(sourcePath, 'utf8');
    if (!requirementSourceDeclares(source, requirement.id)) {
      diagnostics.push(diagnostic('traceability-requirement-source', `requirement source does not declare ${requirement.id}`, requirement.sourcePath));
    }
  }

  for (const artifact of configuration.artifacts) {
    const artifactPath = path.resolve(configuration.root, artifact.path);
    if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
      diagnostics.push(diagnostic('traceability-locator', `artifact locator does not resolve: ${artifact.path}`));
      continue;
    }
    for (const relationship of findRelationships(fs.readFileSync(artifactPath, 'utf8'), artifact)) {
      if (!relationshipRoles.has(relationship.role)) continue;
      if (!ids.has(relationship.requirementId)) {
        diagnostics.push(diagnostic('traceability-requirement-id', `unknown requirement id ${relationship.requirementId}`, relationship.path, relationship.line));
        continue;
      }
      if (!artifactClassRoles.get(relationship.artifactClass).has(relationship.role)) {
        diagnostics.push(diagnostic('traceability-role', `${relationship.artifactClass} artifacts cannot ${relationship.role} requirements`, relationship.path, relationship.line));
        continue;
      }
      relationships.push(relationship);
    }
  }

  for (const generatedArtifact of configuration.generatedArtifacts) {
    for (const key of ['path', 'sourcePath']) {
      const configuredPath = generatedArtifact[key];
      const resolvedPath = path.resolve(configuration.root, configuredPath);
      if (!fs.existsSync(resolvedPath)) {
        diagnostics.push(diagnostic('traceability-generated-source', `generated artifact mapping does not resolve ${key}: ${configuredPath}`));
      }
    }
    const generatedPath = path.resolve(configuration.root, generatedArtifact.path);
    const generatedSource = fs.existsSync(generatedPath)
      ? fs.readFileSync(generatedPath, 'utf8')
      : '';
    const duplicatesRelationship = [...generatedSource.matchAll(markerPattern)]
      .some(match => ids.has(match[2]));
    if (duplicatesRelationship) {
      diagnostics.push(diagnostic('traceability-generated-annotation', `generated output duplicates a relationship annotation: ${generatedArtifact.path}`));
    }
  }

  for (const requirement of configuration.requirements) {
    const owned = relationships.filter(relationship => relationship.requirementId === requirement.id);
    if (!owned.some(relationship => relationship.artifactClass === 'implementation')) {
      diagnostics.push(diagnostic('traceability-coverage', `${requirement.id} lacks implementation coverage`));
    }
    if (!owned.some(relationship => relationship.artifactClass === 'unit-test') && requirement.noUnitTestReason === undefined) {
      diagnostics.push(diagnostic('traceability-coverage', `${requirement.id} lacks unit-test coverage or a justified disposition`));
    }
    for (const artifactClass of ['integration-test', 'uat']) {
      if (!owned.some(relationship => relationship.artifactClass === artifactClass)) {
        diagnostics.push(diagnostic('traceability-coverage', `${requirement.id} lacks ${artifactClass} coverage`));
      }
    }
  }

  const reverseView = renderReverseView(configuration, relationships);
  const reverseViewPath = path.resolve(configuration.root, configuration.reverseViewPath);
  if (options.write === true) {
    fs.mkdirSync(path.dirname(reverseViewPath), { recursive: true });
    fs.writeFileSync(reverseViewPath, reverseView);
  } else if (!fs.existsSync(reverseViewPath) || fs.readFileSync(reverseViewPath, 'utf8') !== reverseView) {
    diagnostics.push(diagnostic('traceability-reverse-view', `generated reverse view is missing or stale: ${configuration.reverseViewPath}`));
  }

  if (options.runTypescript !== false) diagnostics.push(...runTypescriptChecker(configuration));
  return { configuration, diagnostics, relationships, reverseView };
}

function parseArguments(args) {
  const configIndex = args.indexOf('--config');
  if (configIndex < 0 || args[configIndex + 1] === undefined) {
    throw new Error('Usage: check-traceability.js --config <traceability.json> [--write]');
  }
  return { configurationPath: args[configIndex + 1], write: args.includes('--write') };
}

if (require.main === module) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = analyzeTraceability(options.configurationPath, { write: options.write });
    for (const item of result.diagnostics) {
      const location = item.filePath === undefined ? '' : `${item.filePath}${item.line === undefined ? '' : `:${item.line}`}: `;
      process.stderr.write(`${location}error ${item.ruleId}: ${item.message}\n`);
    }
    if (!result.diagnostics.length) {
      process.stdout.write(`Traceability checked ${result.relationships.length} relationships: no violations found.\n`);
    }
    process.exitCode = result.diagnostics.length ? 1 : 0;
  } catch (error) {
    process.stderr.write(`error traceability-configuration: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  TraceabilityConfigReaders,
  analyzeTraceability,
  findRelationships,
  loadTraceabilityConfiguration,
  renderReverseView,
};
