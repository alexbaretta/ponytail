// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {Parser} from 'commonmark';
import type {TraceabilityGraph, TraceabilityGraphEntity, TraceabilityGraphKind, TraceabilityGraphRelationship} from './traceability-graph.js';

export interface TraceabilitySource {
 readonly kind: 'markdown' | 'implementation' | 'unit-test' | 'integration-test';
 readonly path: string;
 readonly text: string;
}
export interface TraceabilityDiscoveryFinding {
 readonly code: 'malformed-marker' | 'unexpected-kind' | 'missing-declaration';
 readonly path: string;
 readonly line: number;
 readonly message: string;
}
export interface TraceabilityDiscovery {
 readonly graph: TraceabilityGraph;
 readonly findings: readonly TraceabilityDiscoveryFinding[];
}

// Traceability: implements OBL-CM-GRAPH from implementation discoverTraceabilitySource
// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation discoverTraceabilitySource
export function discoverTraceabilitySource(traceabilitySource: TraceabilitySource): TraceabilityDiscovery {
 const entities: TraceabilityGraphEntity[] = [];
 const relationships: TraceabilityGraphRelationship[] = [];
 const findings: TraceabilityDiscoveryFinding[] = [];
 const blockIds = new Set<string>();
 const codeLines = new Set<number>();
 if (traceabilitySource.kind === 'markdown') {
  const parser = new Parser();
  const walker = parser.parse(traceabilitySource.text).walker();
  for (let event = walker.next(); event !== null; event = walker.next()) {
   if (event.entering && event.node.type === 'code_block') {
    for (let line = event.node.sourcepos[0][0]; line <= event.node.sourcepos[1][0]; line += 1) codeLines.add(line);
   }
  }
 }
 let markdownTraceabilityGraphEntity: TraceabilityGraphEntity | null = null;
 const lines = traceabilitySource.text.split(/\r?\n/u);
 for (const [index, line] of lines.entries()) {
  const lineNumber = index + 1;
  const trimmed = line.trim();
  if (traceabilitySource.kind === 'markdown') {
   if (codeLines.has(lineNumber)) continue;
   const typedDeclaration = /^#{1,6}\s+(requirement|obligation|acceptance)\s+([A-Z][A-Z0-9-]*)(?=\s|:|$)/u.exec(trimmed);
   const identifier = /^\*\*Identifier:\*\*\s+`?([A-Z][A-Z0-9-]*)`?\s*$/u.exec(trimmed);
   const declaration = /^(?:#{1,6}\s+|(?:[-+*]|\d+[.)])\s+\*\*)(REQ-[A-Z0-9-]+|OBL-[A-Z0-9-]+|ACC-[A-Z0-9-]+)(?=\s|:|\*|$)/u.exec(trimmed);
   const id = typedDeclaration?.[2] ?? identifier?.[1] ?? declaration?.[1];
   if (id) {
    const declaredKind = typedDeclaration?.[1];
    const kind: TraceabilityGraphKind = declaredKind === 'requirement' || declaredKind === 'obligation' || declaredKind === 'acceptance'
     ? declaredKind : identifier || id.startsWith('REQ-') ? 'requirement' : id.startsWith('OBL-') ? 'obligation' : 'acceptance';
    markdownTraceabilityGraphEntity = {id, kind, path:traceabilitySource.path, line:lineNumber};
    entities.push(markdownTraceabilityGraphEntity);
   }
  }

  const isComment = /^(?:\/\/|\/\*|\*|#|--|<!--)/u.test(trimmed);
  if (traceabilitySource.kind !== 'markdown' && !isComment) {
   if (trimmed) blockIds.clear();
   continue;
  }
  const marker = trimmed.replace(/^(?:\/\/|\/\*+|\*|#|<!--|--)\s*/u, '').replace(/\s*(?:\*\/|-->)$/u, '');
  if (!/^Traceability\s*:/iu.test(marker)) continue;
  const match = /^Traceability:\s+(decomposes|verifies|implements)\s+([A-Z][A-Z0-9-]*)\s+from\s+(requirement|obligation|acceptance|implementation|unit-test|integration-test)\s+([^\s"'`,;]+)\s*$/iu.exec(marker);
  const role = match?.[1];
  const target = match?.[2];
  const kind = match?.[3];
  const id = match?.[4];
  if (!target || !id || (role !== 'decomposes' && role !== 'verifies' && role !== 'implements')
   || (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance' && kind !== 'implementation' && kind !== 'unit-test' && kind !== 'integration-test')) {
   findings.push({code:'malformed-marker',path:traceabilitySource.path,line:lineNumber,message:'Traceability requires a supported role, target and explicit source kind/ID'});
   continue;
  }
  if (traceabilitySource.kind === 'markdown') {
   if (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance') {
    findings.push({code:'unexpected-kind',path:traceabilitySource.path,line:lineNumber,message:`Markdown cannot declare executable ${kind} coverage`});
    continue;
   }
   if (markdownTraceabilityGraphEntity?.id !== id || markdownTraceabilityGraphEntity.kind !== kind) {
    findings.push({code:'missing-declaration',path:traceabilitySource.path,line:lineNumber,message:`Marker source ${kind} ${id} must match its preceding canonical declaration`});
    continue;
   }
  } else {
   if (kind !== traceabilitySource.kind) {
    findings.push({code:'unexpected-kind',path:traceabilitySource.path,line:lineNumber,message:`Source classified ${traceabilitySource.kind} cannot declare ${kind}`});
    continue;
   }
   if (!blockIds.has(id)) {
    entities.push({id,kind,path:traceabilitySource.path,line:lineNumber});
    blockIds.add(id);
   }
  }
  relationships.push({source:id,target,role});
 }
 if (!entities.length && traceabilitySource.kind !== 'markdown') {
  findings.push({code:'missing-declaration',path:traceabilitySource.path,line:1,message:`Configured ${traceabilitySource.kind} source contains no identified unit`});
 }
 return {graph:{entities,relationships},findings};
}
