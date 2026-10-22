// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/requirements-traceability/scripts/traceability-discovery.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverTraceabilitySource = discoverTraceabilitySource;
const commonmark_1 = require("./commonmark.js");
const jsonc_parser_1 = require("./json-parser.js");
function discoverTraceabilitySource(traceabilitySource) {
    if (traceabilitySource.kind !== 'markdown' && /\.jsonc?$/u.test(traceabilitySource.path))
        return discoverJsonTraceabilitySource(traceabilitySource);
    return discoverTextTraceabilitySource(traceabilitySource);
}
function discoverJsonTraceabilitySource(traceabilitySource) {
    const entities = [];
    const relationships = [];
    const findings = [];
    const report = (line, message) => { findings.push({ code: 'malformed-marker', path: traceabilitySource.path, line, message }); };
    const parseErrors = [];
    const rootNode = (0, jsonc_parser_1.parseTree)(traceabilitySource.text, parseErrors, { disallowComments: false, allowTrailingComma: true });
    const lineAt = (offset) => traceabilitySource.text.slice(0, offset).split('\n').length;
    if (!rootNode || parseErrors.length > 0) {
        report(lineAt(parseErrors[0]?.offset ?? 0), 'Invalid JSON/JSONC syntax');
        return { graph: { entities, relationships }, findings };
    }
    const duplicateProperties = (node) => {
        if (node.type === 'object') {
            const keys = new Set();
            for (const propertyNode of node.children ?? []) {
                const key = propertyNode.children?.[0]?.value;
                if (typeof key !== 'string')
                    throw new Error('Validated JSON property has no string key');
                if (keys.has(key)) {
                    report(lineAt(propertyNode.offset), `Duplicate JSON property: ${key}`);
                    return true;
                }
                keys.add(key);
            }
        }
        return (node.children ?? []).some(duplicateProperties);
    };
    if (duplicateProperties(rootNode))
        return { graph: { entities, relationships }, findings };
    const commentTraceabilityDiscovery = discoverTextTraceabilitySource(traceabilitySource);
    entities.push(...commentTraceabilityDiscovery.graph.entities);
    relationships.push(...commentTraceabilityDiscovery.graph.relationships);
    findings.push(...commentTraceabilityDiscovery.findings.filter(finding => finding.code !== 'missing-declaration'));
    const visit = (node) => {
        const key = node.children?.[0]?.value;
        if (node.type === 'property' && key === 'traceability') {
            const line = lineAt(node.offset);
            const arrayNode = node.children?.[1];
            if (arrayNode?.type !== 'array') {
                report(line, 'JSON traceability must be an array of canonical annotation strings');
                return;
            }
            const markers = [];
            const locations = [];
            for (const childNode of arrayNode.children ?? []) {
                const value = childNode.value;
                if (childNode.type !== 'string' || typeof value !== 'string' || /[\r\n]/u.test(value) || !value.startsWith('Traceability:')) {
                    report(lineAt(childNode.offset), 'JSON traceability requires single-line canonical annotations');
                    return;
                }
                markers.push(`// ${value}`);
                locations.push(lineAt(childNode.offset));
            }
            const traceabilityDiscovery = discoverTextTraceabilitySource({ ...traceabilitySource, text: markers.join('\n') });
            entities.push(...traceabilityDiscovery.graph.entities.map(entity => ({ ...entity, line: locations[entity.line - 1] ?? line })));
            relationships.push(...traceabilityDiscovery.graph.relationships);
            findings.push(...traceabilityDiscovery.findings.map(finding => ({ ...finding, line: locations[finding.line - 1] ?? line })));
            return;
        }
        for (const childNode of node.children ?? [])
            visit(childNode);
    };
    visit(rootNode);
    if (!entities.length && !findings.length)
        findings.push({ code: 'missing-declaration', path: traceabilitySource.path, line: 1, message: `Configured ${traceabilitySource.kind} source contains no identified unit` });
    return { graph: { entities, relationships }, findings };
}
function discoverTextTraceabilitySource(traceabilitySource) {
    const entities = [];
    const relationships = [];
    const findings = [];
    const blockIds = new Set();
    const codeLines = new Set();
    if (traceabilitySource.kind === 'markdown') {
        const parser = new commonmark_1.Parser();
        const walker = parser.parse(traceabilitySource.text).walker();
        for (let event = walker.next(); event !== null; event = walker.next()) {
            if (event.entering && event.node.type === 'code_block') {
                for (let line = event.node.sourcepos[0][0]; line <= event.node.sourcepos[1][0]; line += 1)
                    codeLines.add(line);
            }
        }
    }
    let markdownTraceabilityGraphEntity = null;
    const lines = traceabilitySource.text.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
        const lineNumber = index + 1;
        const trimmed = line.trim();
        if (traceabilitySource.kind === 'markdown') {
            if (codeLines.has(lineNumber))
                continue;
            const typedDeclaration = /^#{1,6}\s+(requirement|obligation|acceptance)\s+([A-Z][A-Z0-9-]*)(?=\s|:|$)/u.exec(trimmed);
            const identifier = /^\*\*Identifier:\*\*\s+`?([A-Z][A-Z0-9-]*)`?\s*$/u.exec(trimmed);
            const declaration = /^(?:#{1,6}\s+|(?:[-+*]|\d+[.)])\s+\*\*)(REQ-[A-Z0-9-]+|OBL-[A-Z0-9-]+|ACC-[A-Z0-9-]+)(?=\s|:|\*|$)/u.exec(trimmed);
            const id = typedDeclaration?.[2] ?? identifier?.[1] ?? declaration?.[1];
            if (id) {
                const declaredKind = typedDeclaration?.[1];
                const kind = declaredKind === 'requirement' || declaredKind === 'obligation' || declaredKind === 'acceptance'
                    ? declaredKind : identifier || id.startsWith('REQ-') ? 'requirement' : id.startsWith('OBL-') ? 'obligation' : 'acceptance';
                markdownTraceabilityGraphEntity = { id, kind, path: traceabilitySource.path, line: lineNumber };
                entities.push(markdownTraceabilityGraphEntity);
            }
        }
        const isComment = /^(?:\/\/|\/\*|\*|#|--|<!--)/u.test(trimmed);
        if (traceabilitySource.kind !== 'markdown' && !isComment) {
            if (trimmed)
                blockIds.clear();
            continue;
        }
        const marker = trimmed.replace(/^(?:\/\/|\/\*+|\*|#|<!--|--)\s*/u, '').replace(/\s*(?:\*\/|-->)$/u, '');
        if (!/^Traceability\s*:/iu.test(marker))
            continue;
        const match = /^Traceability:\s+(decomposes|verifies|implements)\s+([A-Z][A-Z0-9-]*)\s+from\s+(requirement|obligation|acceptance|implementation|unit-test|integration-test)\s+([^\s"'`,;]+)\s*$/iu.exec(marker);
        const role = match?.[1];
        const target = match?.[2];
        const kind = match?.[3];
        const id = match?.[4];
        if (!target || !id || (role !== 'decomposes' && role !== 'verifies' && role !== 'implements')
            || (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance' && kind !== 'implementation' && kind !== 'unit-test' && kind !== 'integration-test')) {
            findings.push({ code: 'malformed-marker', path: traceabilitySource.path, line: lineNumber, message: 'Traceability requires a supported role, target and explicit source kind/ID' });
            continue;
        }
        if (traceabilitySource.kind === 'markdown') {
            if (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance') {
                findings.push({ code: 'unexpected-kind', path: traceabilitySource.path, line: lineNumber, message: `Markdown cannot declare executable ${kind} coverage` });
                continue;
            }
            if (markdownTraceabilityGraphEntity?.id !== id || markdownTraceabilityGraphEntity.kind !== kind) {
                findings.push({ code: 'missing-declaration', path: traceabilitySource.path, line: lineNumber, message: `Marker source ${kind} ${id} must match its preceding canonical declaration` });
                continue;
            }
        }
        else {
            if (kind !== traceabilitySource.kind && kind !== 'implementation') {
                findings.push({ code: 'unexpected-kind', path: traceabilitySource.path, line: lineNumber, message: `Source classified ${traceabilitySource.kind} cannot declare ${kind}` });
                continue;
            }
            if (!blockIds.has(id)) {
                entities.push({ id, kind, path: traceabilitySource.path, line: lineNumber });
                blockIds.add(id);
            }
        }
        relationships.push({ source: id, target, role });
    }
    if (!entities.length && traceabilitySource.kind !== 'markdown') {
        findings.push({ code: 'missing-declaration', path: traceabilitySource.path, line: 1, message: `Configured ${traceabilitySource.kind} source contains no identified unit` });
    }
    return { graph: { entities, relationships }, findings };
}
