#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  analyzeTraceability,
  loadTraceabilityConfiguration,
} = require('../skills/requirements-traceability/scripts/check-traceability');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-traceability-'));
  const marker = role => `Traceability: ${role} REQ-ONE`;
  const files = {
    'requirements.md': '# Requirement\n\n**Identifier:** `REQ-ONE`\n',
    'src.js': `// ${marker('implements')}\nfunction value() {}\n`,
    'unit.test.js': `// ${marker('verifies')}\ntest("value", () => {});\n`,
    'integration.json': `{"traceability": "${marker('verifies').replace('Traceability: ', '')}"}\n`,
    'uat.md': `${marker('verifies')}\n\n## Arc\n`,
    'generated.txt': 'generated\n',
    'generator.js': 'module.exports = {};\n',
  };
  for (const [file, source] of Object.entries(files)) fs.writeFileSync(path.join(root, file), source);
  const configuration = {
    schemaVersion: 1,
    projectRoot: '.',
    requirements: [{ id: 'REQ-ONE', sourcePath: 'requirements.md' }],
    artifacts: [
      { class: 'implementation', path: 'src.js', locator: 'text' },
      { class: 'unit-test', path: 'unit.test.js', locator: 'text' },
      { class: 'integration-test', path: 'integration.json', locator: 'text' },
      { class: 'uat', path: 'uat.md', locator: 'text' },
    ],
    generatedArtifacts: [{ path: 'generated.txt', sourcePath: 'generator.js' }],
    reverseViewPath: 'traceability.generated.md',
  };
  const configurationPath = path.join(root, 'traceability.json');
  fs.writeFileSync(configurationPath, `${JSON.stringify(configuration, null, 2)}\n`);
  return { configuration, configurationPath, root };
}

test('retains exact V1 reads and validates latest V2 search policy', () => {
  const traceabilityFixture = fixture();
  const v1 = loadTraceabilityConfiguration(traceabilityFixture.configurationPath);
  assert.equal(v1.schemaVersion, 1);
  assert.deepEqual(v1.index.searchableFields, [
    'entityId',
    'entityKind',
    'role',
    'requirementId',
    'path',
    'unitName',
    'annotation',
    'description',
  ]);

  traceabilityFixture.configuration.schemaVersion = 2;
  traceabilityFixture.configuration.index = { searchableFields: ['requirementId', 'path'] };
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );
  const v2 = loadTraceabilityConfiguration(traceabilityFixture.configurationPath);
  assert.equal(v2.schemaVersion, 2);
  assert.deepEqual(v2.index.searchableFields, ['requirementId', 'path']);

  for (const searchableFields of [[], ['path', 'path'], ['secret']]) {
    traceabilityFixture.configuration.index.searchableFields = searchableFields;
    fs.writeFileSync(
      traceabilityFixture.configurationPath,
      `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
    );
    assert.throws(
      () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
      /searchableFields/u,
    );
  }

  traceabilityFixture.configuration.schemaVersion = 5;
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /unsupported traceability configuration schemaVersion: 5/u,
  );
});

test('reads an exact V4 directional validation matrix', () => {
  const traceabilityFixture = fixture();
  traceabilityFixture.configuration.schemaVersion = 4;
  traceabilityFixture.configuration.index = { searchableFields: ['entityId'] };
  traceabilityFixture.configuration.entities = [];
  traceabilityFixture.configuration.validationRules = [{
    id: 'requirement-implementation',
    sourceKind: 'requirement',
    targetKind: 'implementation',
    roles: ['implements', 'supports'],
    direction: 'reverse',
    cardinality: { minimum: 1 },
  }];
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );
  const loaded = loadTraceabilityConfiguration(traceabilityFixture.configurationPath);
  assert.equal(loaded.schemaVersion, 4);
  assert.deepEqual(loaded.validationRules, traceabilityFixture.configuration.validationRules);

  for (const invalidRule of [
    { ...traceabilityFixture.configuration.validationRules[0], roles: [] },
    { ...traceabilityFixture.configuration.validationRules[0], direction: 'sideways' },
    { ...traceabilityFixture.configuration.validationRules[0], cardinality: { minimum: 0 } },
  ]) {
    traceabilityFixture.configuration.validationRules = [invalidRule];
    fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
    assert.throws(
      () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
      /validationRules/u,
    );
  }
});

test('reads exact V3 entity declarations and prospective planning roles', () => {
  const traceabilityFixture = fixture();
  const requirementId = 'REQ-' + 'ONE';
  traceabilityFixture.configuration.schemaVersion = 3;
  traceabilityFixture.configuration.index = { searchableFields: ['entityId', 'role'] };
  traceabilityFixture.configuration.entities = [{
    kind: 'endpoint',
    id: 'GET-value',
    path: 'src.js',
    line: 1,
    annotation: 'GET /value',
    description: 'Returns the configured value.',
  }];
  traceabilityFixture.configuration.artifacts.push({
    class: 'plan', path: 'plan.md', locator: 'text',
  });
  traceabilityFixture.configuration.artifacts.push({
    class: 'issue', path: 'issue.md', locator: 'text',
  });
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'src.js'),
    `// Traceability: implements ${requirementId} from endpoint GET-value\nfunction value() {}\n`,
  );
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'plan.md'),
    `Traceability: plans-implementation ${requirementId} from tasklet S01-F01-T01\n` +
    `Traceability: plans-verification ${requirementId} from plan PLAN-ONE\n`,
  );
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'issue.md'),
    `Traceability: introduces ${requirementId} from issue BUG-ONE\n`,
  );
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );

  const loaded = loadTraceabilityConfiguration(traceabilityFixture.configurationPath);
  assert.equal(loaded.schemaVersion, 3);
  assert.deepEqual(loaded.entities, traceabilityFixture.configuration.entities);
  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    result.relationships.filter(relationship => relationship.role.includes('plans-'))
      .map(relationship => [relationship.entityKind, relationship.entityId, relationship.role]),
    [
      ['tasklet', 'S01-F01-T01', 'plans-implementation'],
      ['plan', 'PLAN-ONE', 'plans-verification'],
    ],
  );
  assert.equal(result.relationships.some(relationship =>
    relationship.entityKind === 'issue' && relationship.role === 'introduces'), true);
  assert.equal(result.relationships.some(relationship =>
    relationship.entityKind === 'endpoint' && relationship.entityId === 'GET-value'), true);
});

test('rejects malformed V3 entities and never counts prospective work as actual coverage', () => {
  const traceabilityFixture = fixture();
  const requirementId = 'REQ-' + 'ONE';
  traceabilityFixture.configuration.schemaVersion = 3;
  traceabilityFixture.configuration.index = { searchableFields: ['entityId'] };
  traceabilityFixture.configuration.entities = [];
  traceabilityFixture.configuration.artifacts.push({
    class: 'plan', path: 'plan.md', locator: 'text',
  });
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'plan.md'),
    `Traceability: plans-implementation ${requirementId} from tasklet S01-F01-T01\n`,
  );
  fs.writeFileSync(path.join(traceabilityFixture.root, 'src.js'), '// no completed implementation\n');
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );
  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.ok(result.diagnostics.some(item =>
    item.ruleId === 'traceability-coverage' && item.message.includes('implementation')));

  traceabilityFixture.configuration.entities = [
    { kind: 'Endpoint', id: 'one', path: 'src.js' },
  ];
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /kind must be a lowercase token/u,
  );
  traceabilityFixture.configuration.entities = [
    { kind: 'endpoint', id: 'one', path: 'src.js' },
    { kind: 'endpoint', id: 'one', path: 'unit.test.js' },
  ];
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /duplicate entity/u,
  );

  traceabilityFixture.configuration.entities = [
    { kind: 'endpoint', id: 'one', path: 'src.js', line: 2 },
  ];
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'src.js'),
    `// Traceability: implements ${requirementId} from endpoint one\n`,
  );
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  const invalidLocator = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.ok(invalidLocator.diagnostics.some(item =>
    item.ruleId === 'traceability-entity-locator' && item.line === 1));

  traceabilityFixture.configuration.entities = [];
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  const undeclared = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.ok(undeclared.diagnostics.some(item =>
    item.ruleId === 'traceability-entity-id' && item.message.includes('undeclared entity')));
});

// Traceability: verifies REQ-REQUIREMENTS-TRACEABILITY
test('generates one reverse view and validates complete structural coverage', () => {
  const traceabilityFixture = fixture();
  const generated = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.deepEqual(generated.diagnostics, []);
  assert.equal(generated.relationships.length, 4);

  const checked = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
  });
  assert.deepEqual(checked.diagnostics, []);
  assert.equal(fs.readFileSync(path.join(traceabilityFixture.root, 'traceability.generated.md'), 'utf8'), checked.reverseView);
});

test('reports unknown IDs, missing classes, unresolved locators, and stale reverse views', () => {
  const traceabilityFixture = fixture();
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'src.js'),
    `// Traceability: implements ${'REQ-STALE'}\n`,
  );
  fs.unlinkSync(path.join(traceabilityFixture.root, 'integration.json'));

  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
  });
  const rules = result.diagnostics.map(item => item.ruleId);
  assert.ok(rules.includes('traceability-requirement-id'));
  assert.ok(rules.includes('traceability-locator'));
  assert.ok(rules.includes('traceability-coverage'));
  assert.ok(rules.includes('traceability-reverse-view'));
});

test('accepts a justified no-unit-test disposition only for unit coverage', () => {
  const traceabilityFixture = fixture();
  traceabilityFixture.configuration.requirements[0].noUnitTestReason = 'The requirement is inert documentation with no executable unit.';
  traceabilityFixture.configuration.artifacts = traceabilityFixture.configuration.artifacts.filter(
    artifact => artifact.class !== 'unit-test',
  );
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );

  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.deepEqual(result.diagnostics, []);
  assert.match(result.reverseView, /unit-test: not possible/u);
});

test('recognizes only canonical Markdown requirement declarations', () => {
  const declarations = [
    '**Identifier:** `REQ-ONE`',
    '- **REQ-ONE:** List declaration',
    '## REQ-ONE: Heading declaration',
  ];
  for (const declaration of declarations) {
    const traceabilityFixture = fixture();
    fs.writeFileSync(path.join(traceabilityFixture.root, 'requirements.md'), `${declaration}\n`);
    const result = analyzeTraceability(traceabilityFixture.configurationPath, {
      runTypescript: false,
      write: true,
    });
    assert.deepEqual(result.diagnostics, []);
  }

  const traceabilityFixture = fixture();
  fs.writeFileSync(path.join(traceabilityFixture.root, 'requirements.md'), 'A note mentions REQ-ONE without declaring it.\n');
  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.ok(result.diagnostics.some(item => item.ruleId === 'traceability-requirement-source'));
});

test('allows one path to carry disjoint class-valid role filters', () => {
  const traceabilityFixture = fixture();
  const marker = role => `Traceability: ${role} ${'REQ-ONE'}`;
  traceabilityFixture.configuration.artifacts = [
    { class: 'implementation', path: 'src.js', locator: 'text', roles: ['implements', 'supports'] },
    { class: 'integration-test', path: 'src.js', locator: 'text', roles: ['verifies'] },
    { class: 'unit-test', path: 'unit.test.js', locator: 'text' },
    { class: 'uat', path: 'uat.md', locator: 'text' },
  ];
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'src.js'),
    `// ${marker('implements')}\n// ${marker('supports')}\n// ${marker('verifies')}\n`,
  );
  fs.writeFileSync(
    traceabilityFixture.configurationPath,
    `${JSON.stringify(traceabilityFixture.configuration, null, 2)}\n`,
  );

  const result = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    result.relationships.filter(relationship => relationship.path === 'src.js').map(relationship => [relationship.artifactClass, relationship.role]),
    [['implementation', 'implements'], ['implementation', 'supports'], ['integration-test', 'verifies']],
  );

  traceabilityFixture.configuration.artifacts[1].roles = ['implements'];
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /roles contains a role invalid for integration-test/u,
  );

  delete traceabilityFixture.configuration.artifacts[1].roles;
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /duplicate artifact path requires explicit role filters/u,
  );

  traceabilityFixture.configuration.artifacts[1].roles = ['verifies'];
  traceabilityFixture.configuration.artifacts[0] = { class: 'unit-test', path: 'src.js', locator: 'text', roles: ['verifies'] };
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(traceabilityFixture.configuration));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /duplicate artifact path has overlapping role filters/u,
  );
});

test('rejects generated relationship copies and unsafe or unknown configuration', () => {
  const traceabilityFixture = fixture();
  fs.writeFileSync(
    path.join(traceabilityFixture.root, 'generated.txt'),
    `Traceability: supports ${'REQ-ONE'}\n`,
  );
  const generatedResult = analyzeTraceability(traceabilityFixture.configurationPath, {
    runTypescript: false,
    write: true,
  });
  assert.ok(generatedResult.diagnostics.some(item => item.ruleId === 'traceability-generated-annotation'));

  const invalid = { ...traceabilityFixture.configuration, unexpected: true };
  fs.writeFileSync(traceabilityFixture.configurationPath, JSON.stringify(invalid));
  assert.throws(
    () => loadTraceabilityConfiguration(traceabilityFixture.configurationPath),
    /unknown keys: unexpected/u,
  );
});
