// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/requirements-traceability/scripts/traceability-v5.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceabilityV5CoverageRuleCount = void 0;
exports.loadTraceabilityV5 = loadTraceabilityV5;
exports.parseTraceabilityV5 = parseTraceabilityV5;
exports.renderTraceabilityV5 = renderTraceabilityV5;
exports.analyzeTraceabilityV5 = analyzeTraceabilityV5;
exports.traceabilityV5IndexSources = traceabilityV5IndexSources;
exports.projectTraceabilityV5File = projectTraceabilityV5File;
exports.normalizeTraceabilityV5Payloads = normalizeTraceabilityV5Payloads;
exports.traceabilityV5RequirementPredicate = traceabilityV5RequirementPredicate;
exports.evaluateTraceabilityV5Coverage = evaluateTraceabilityV5Coverage;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const lossless_json_1 = require("./lossless-json.js");
const traceability_project_js_1 = require("./traceability-project.js");
const traceability_discovery_js_1 = require("./traceability-discovery.js");
const traceability_graph_js_1 = require("./traceability-graph.js");
const traceability_semantic_js_1 = require("./traceability-semantic.js");
function loadTraceabilityV5(document, configurationPath, invokingRoot) {
    const configuration = (0, traceability_project_js_1.readTraceabilityConfigurationV5)(document);
    const root = node_fs_1.default.realpathSync(node_path_1.default.resolve(node_path_1.default.dirname(configurationPath), configuration.projectRoot));
    if (root !== node_fs_1.default.realpathSync(invokingRoot))
        throw new Error('Traceability configuration projectRoot does not match the invoking repository');
    return { ...configuration, root, configurationPath: node_path_1.default.resolve(configurationPath), index: { searchableFields: ['entityId', 'entityKind', 'role', 'requirementId', 'path', 'unitName', 'annotation', 'description'] } };
}
function parseTraceabilityV5(text) {
    return (0, lossless_json_1.parse)(text, null, token => {
        if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token)))
            throw new Error(`Unsupported V5 configuration number: ${token}`);
        return Number(token);
    });
}
function renderTraceabilityV5(configuration, graph) {
    const lines = [traceability_project_js_1.traceabilityGeneratedHeader, '', '# Traceability graph', '',
        'Structural relationships only; this view does not certify execution or behavioral adequacy.', '',
        '| ID | Kind | Declaration | Outgoing relationships |', '| --- | --- | --- | --- |'];
    const escape = (text) => text.replace(/\|/gu, '\\|').replace(/[\r\n]/gu, ' ');
    for (const entity of [...graph.entities].sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path) || left.line - right.line)) {
        const link = node_path_1.default.posix.relative(node_path_1.default.posix.dirname(configuration.reverseViewPath), entity.path);
        const edges = graph.relationships.filter(edge => edge.source === entity.id).map(edge => `${edge.role} ${edge.target}`).sort();
        lines.push(`| ${escape(entity.id)} | ${entity.kind} | [${escape(entity.path)}:${entity.line}](<${link}#L${entity.line}>) | ${edges.map(escape).join('; ')} |`);
    }
    return `${lines.join('\n')}\n`;
}
function analyzeTraceabilityV5(configuration, options = {}) {
    const output = (0, traceability_project_js_1.traceabilityReverseViewPath)(configuration.root, configuration.reverseViewPath);
    const project = (0, traceability_project_js_1.discoverTraceabilityProject)(configuration, configuration.configurationPath, configuration.root);
    const diagnostics = [...project.projectFindings, ...project.discoveryFindings, ...project.graphFindings].map(finding => ({
        ruleId: `traceability-${finding.code}`, severity: 'error', message: finding.message,
        ...(finding.path === null ? {} : { filePath: finding.path }), ...(finding.line === null ? {} : { line: finding.line }),
    }));
    const reverseView = renderTraceabilityV5(configuration, project.graph);
    if (options.write === true) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(output), { recursive: true });
        node_fs_1.default.writeFileSync(output, reverseView);
    }
    else if (!node_fs_1.default.existsSync(output) || node_fs_1.default.readFileSync(output, 'utf8') !== reverseView) {
        diagnostics.push({ ruleId: 'traceability-reverse-view', severity: 'error', message: `Generated reverse view is missing or stale: ${configuration.reverseViewPath}` });
    }
    if (options.runTypescript !== false)
        diagnostics.push(...(0, traceability_semantic_js_1.checkTraceabilityProjectTypescript)(configuration, project, configuration.root));
    return { configuration, diagnostics, entities: project.graph.entities, relationships: project.graph.relationships, reverseView };
}
function traceabilityV5IndexSources(configuration) {
    const project = (0, traceability_project_js_1.discoverTraceabilityProject)(configuration, configuration.configurationPath, configuration.root);
    const failures = [...project.discoveryFindings, ...project.projectFindings];
    if (failures.length)
        throw new Error(failures.map(finding => `${finding.path}:${finding.line}: ${finding.message}`).join('\n'));
    return [...project.sources.map(source => source.path), ...configuration.generatedArtifacts.filter(item => node_fs_1.default.existsSync(node_path_1.default.join(configuration.root, item.path))).map(item => item.path)];
}
function projectTraceabilityV5File(configuration, file, text) {
    if (file === configuration.reverseViewPath || configuration.generatedArtifacts.some(item => item.path === file))
        return { entities: [], relationships: [] };
    const pm = [configuration.requirementsRoot, configuration.uatRoot].some(root => file.startsWith(`${root}/`) && file.endsWith('.md'));
    if (!pm && configuration.exclusions.some(exclusion => node_path_1.default.posix.matchesGlob(file, exclusion.pattern)))
        return { entities: [], relationships: [] };
    const scope = configuration.sources.find(candidate => candidate.include.some(pattern => node_path_1.default.posix.matchesGlob(file, pattern)));
    const kind = pm ? 'markdown' : scope?.kind;
    if (!kind)
        return { entities: [], relationships: [] };
    const source = { kind, path: file, text };
    const discovered = (0, traceability_discovery_js_1.discoverTraceabilitySource)(source);
    if (discovered.findings.length)
        throw new Error(discovered.findings.map(finding => `${file}:${finding.line}: ${finding.message}`).join('\n'));
    return { entities: discovered.graph.entities.map(entity => ({ entityId: entity.id, entityKind: entity.kind, path: entity.path, line: entity.line, unitName: entity.id,
            annotation: discovered.graph.relationships.filter(edge => edge.source === entity.id).map(edge => `${edge.role} ${edge.target}`).join('; ') || null, description: null })),
        relationships: discovered.graph.relationships.map(edge => ({ sourceEntityId: edge.source, targetEntityId: edge.target, role: edge.role })) };
}
function graphFromPayload(payload) {
    const entities = payload.entities.map(entity => {
        const kind = entity.entityKind;
        if (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance' && kind !== 'implementation' && kind !== 'unit-test' && kind !== 'integration-test')
            throw new Error(`Invalid V5 indexed entity kind: ${kind}`);
        if (entity.line === null)
            throw new Error(`V5 indexed entity lacks its declaration line: ${entity.entityId}`);
        return { id: entity.entityId, kind, path: entity.path, line: entity.line };
    });
    const relationships = payload.relationships.map(edge => {
        const role = edge.role;
        if (role !== 'decomposes' && role !== 'verifies' && role !== 'implements')
            throw new Error(`Invalid V5 indexed relationship role: ${role}`);
        return { source: edge.sourceEntityId, target: edge.targetEntityId, role };
    });
    return { entities, relationships };
}
function normalizeTraceabilityV5Payloads(payloads) {
    const payload = { entities: payloads.flatMap(item => item.entities), relationships: payloads.flatMap(item => item.relationships) };
    const failures = (0, traceability_graph_js_1.validateTraceabilityGraph)(graphFromPayload(payload)).filter(finding => !finding.code.startsWith('missing-'));
    if (failures.length)
        throw new Error(failures.map(finding => finding.message).join('\n'));
    return payload;
}
exports.traceabilityV5CoverageRuleCount = 9;
function traceabilityV5RequirementPredicate(parameter) {
    if (!Number.isSafeInteger(parameter) || parameter < 1)
        throw new Error('Invalid SQL parameter number');
    return `document.entity_id IN (WITH RECURSIVE linked(entity_id) AS (
  SELECT entity_id FROM ponytail_index.entity_v1 WHERE generation_id = $1::uuid AND entity_id = $${parameter} AND entity_kind = 'requirement'
  UNION SELECT relationship.source_entity_id FROM ponytail_index.relationship_v1 relationship JOIN linked ON relationship.target_entity_id = linked.entity_id WHERE relationship.generation_id = $1::uuid
 ) SELECT entity_id FROM linked)`;
}
function evaluateTraceabilityV5Coverage(payload) {
    const graph = graphFromPayload(payload);
    return (0, traceability_graph_js_1.validateTraceabilityGraph)(graph).map(finding => {
        const entity = graph.entities.find(candidate => candidate.id === finding.id);
        if (!entity || !finding.code.startsWith('missing-'))
            throw new Error(finding.message);
        let targetKind;
        let role;
        let direction = 'reverse';
        switch (finding.code) {
            case 'missing-obligation':
                targetKind = 'obligation';
                role = 'decomposes';
                break;
            case 'missing-acceptance':
                targetKind = 'acceptance';
                role = 'verifies';
                break;
            case 'missing-test':
                targetKind = 'unit-test|integration-test';
                role = 'verifies';
                break;
            case 'missing-implementation':
                targetKind = 'implementation';
                role = 'implements';
                break;
            case 'missing-parent':
                direction = 'forward';
                targetKind = entity.kind === 'obligation' ? 'requirement' : entity.kind === 'acceptance' || entity.kind === 'implementation' ? 'obligation' : 'acceptance';
                role = entity.kind === 'obligation' ? 'decomposes' : entity.kind === 'implementation' ? 'implements' : 'verifies';
                break;
            default: throw new Error(finding.message);
        }
        return { ruleId: `graph-${finding.code}`, sourceEntityId: entity.id, sourceKind: entity.kind, sourcePath: entity.path, sourceLine: entity.line,
            targetKind, roles: [role], direction, minimum: 1, actual: 0 };
    });
}
