// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'lossless-json';
import {readTraceabilityConfigurationV5,discoverTraceabilityProject,traceabilityGeneratedHeader,traceabilityReverseViewPath,type TraceabilityConfigurationV5} from './traceability-project.js';
import {discoverTraceabilitySource,type TraceabilitySource} from './traceability-discovery.js';
import {validateTraceabilityGraph,type TraceabilityGraph,type TraceabilityGraphEntity,type TraceabilityGraphRelationship} from './traceability-graph.js';
import {checkTraceabilityProjectTypescript} from './traceability-semantic.js';
import type {TraceabilityPayload} from '../../../src/traceability-projection.js';
import type {TstsDiagnostic} from '../../../tsts/src/index.js' with {'resolution-mode':'import'};

export interface LoadedTraceabilityV5 extends TraceabilityConfigurationV5 {
 readonly root: string;
 readonly configurationPath: string;
 readonly index: {readonly searchableFields: readonly string[]};
}
export interface TraceabilityV5Options { readonly write?: boolean; readonly runTypescript?: boolean }
export interface TraceabilityV5Analysis {
 readonly configuration: LoadedTraceabilityV5;
 readonly diagnostics: readonly TstsDiagnostic[];
 readonly entities: TraceabilityGraph['entities'];
 readonly relationships: TraceabilityGraph['relationships'];
 readonly reverseView: string;
}
export interface TraceabilityValidationGap {
 readonly ruleId: string; readonly sourceEntityId: string; readonly sourceKind: string;
 readonly sourcePath: string; readonly sourceLine: number; readonly targetKind: string;
 readonly roles: readonly string[]; readonly direction: 'forward' | 'reverse'; readonly minimum: number; readonly actual: number;
}

// Traceability: implements OBL-CM-GRAPH from implementation loadTraceabilityV5
export function loadTraceabilityV5(document: unknown, configurationPath: string, invokingRoot: string): LoadedTraceabilityV5 {
 const configuration = readTraceabilityConfigurationV5(document);
 const root = fs.realpathSync(path.resolve(path.dirname(configurationPath),configuration.projectRoot));
 if (root !== fs.realpathSync(invokingRoot)) throw new Error('Traceability configuration projectRoot does not match the invoking repository');
 return {...configuration,root,configurationPath:path.resolve(configurationPath),index:{searchableFields:['entityId','entityKind','role','requirementId','path','unitName','annotation','description']}};
}

export function parseTraceabilityV5(text: string): unknown {
 return parse(text,null,token => {
  if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token))) throw new Error(`Unsupported V5 configuration number: ${token}`);
  return Number(token);
 });
}

// Traceability: implements OBL-CM-GRAPH from implementation renderTraceabilityV5
export function renderTraceabilityV5(configuration: LoadedTraceabilityV5, graph: TraceabilityGraph): string {
 const lines = [traceabilityGeneratedHeader,'','# Traceability graph','',
  'Structural relationships only; this view does not certify execution or behavioral adequacy.','',
  '| ID | Kind | Declaration | Outgoing relationships |','| --- | --- | --- | --- |'];
 const escape = (text: string): string => text.replace(/\|/gu,'\\|').replace(/[\r\n]/gu,' ');
 for (const entity of [...graph.entities].sort((left,right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path) || left.line-right.line)) {
  const link = path.posix.relative(path.posix.dirname(configuration.reverseViewPath),entity.path);
  const edges = graph.relationships.filter(edge => edge.source === entity.id).map(edge => `${edge.role} ${edge.target}`).sort();
  lines.push(`| ${escape(entity.id)} | ${entity.kind} | [${escape(entity.path)}:${entity.line}](<${link}#L${entity.line}>) | ${edges.map(escape).join('; ')} |`);
 }
 return `${lines.join('\n')}\n`;
}

// Traceability: implements OBL-CM-GRAPH from implementation analyzeTraceabilityV5
export function analyzeTraceabilityV5(configuration: LoadedTraceabilityV5, options: TraceabilityV5Options = {}): TraceabilityV5Analysis {
 const output = traceabilityReverseViewPath(configuration.root,configuration.reverseViewPath);
 const project = discoverTraceabilityProject(configuration,configuration.configurationPath,configuration.root);
 const diagnostics: TstsDiagnostic[] = [...project.projectFindings,...project.discoveryFindings,...project.graphFindings].map(finding => ({
  ruleId:`traceability-${finding.code}`,severity:'error',message:finding.message,
  ...(finding.path === null ? {} : {filePath:finding.path}),...(finding.line === null ? {} : {line:finding.line}),
 }));
 const reverseView = renderTraceabilityV5(configuration,project.graph);
 if (options.write === true) {
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,reverseView);
 } else if (!fs.existsSync(output) || fs.readFileSync(output,'utf8') !== reverseView) {
  diagnostics.push({ruleId:'traceability-reverse-view',severity:'error',message:`Generated reverse view is missing or stale: ${configuration.reverseViewPath}`});
 }
 if (options.runTypescript !== false) diagnostics.push(...checkTraceabilityProjectTypescript(configuration,project,configuration.root));
 return {configuration,diagnostics,entities:project.graph.entities,relationships:project.graph.relationships,reverseView};
}

// Traceability: implements OBL-CM-GRAPH from implementation traceabilityV5IndexSources
export function traceabilityV5IndexSources(configuration: LoadedTraceabilityV5): readonly string[] {
 const project = discoverTraceabilityProject(configuration,configuration.configurationPath,configuration.root);
 const failures = [...project.discoveryFindings,...project.projectFindings];
 if (failures.length) throw new Error(failures.map(finding => `${finding.path}:${finding.line}: ${finding.message}`).join('\n'));
 return [...project.sources.map(source => source.path),...configuration.generatedArtifacts.filter(item => fs.existsSync(path.join(configuration.root,item.path))).map(item => item.path)];
}

// Traceability: implements OBL-CM-GRAPH from implementation projectTraceabilityV5File
export function projectTraceabilityV5File(configuration: LoadedTraceabilityV5, file: string, text: string): TraceabilityPayload {
 if (file === configuration.reverseViewPath || configuration.generatedArtifacts.some(item => item.path === file)) return {entities:[],relationships:[]};
 const pm = [configuration.requirementsRoot,configuration.uatRoot].some(root => file.startsWith(`${root}/`) && file.endsWith('.md'));
 if (!pm && configuration.exclusions.some(exclusion => path.posix.matchesGlob(file,exclusion.pattern))) return {entities:[],relationships:[]};
 const scope = configuration.sources.find(candidate => candidate.include.some(pattern => path.posix.matchesGlob(file,pattern)));
 const kind = pm ? 'markdown' : scope?.kind;
 if (!kind) return {entities:[],relationships:[]};
 const source: TraceabilitySource = {kind,path:file,text};
 const discovered = discoverTraceabilitySource(source);
 if (discovered.findings.length) throw new Error(discovered.findings.map(finding => `${file}:${finding.line}: ${finding.message}`).join('\n'));
 return {entities:discovered.graph.entities.map(entity => ({entityId:entity.id,entityKind:entity.kind,path:entity.path,line:entity.line,unitName:entity.id,
  annotation:discovered.graph.relationships.filter(edge => edge.source === entity.id).map(edge => `${edge.role} ${edge.target}`).join('; ') || null,description:null})),
 relationships:discovered.graph.relationships.map(edge => ({sourceEntityId:edge.source,targetEntityId:edge.target,role:edge.role}))};
}

function graphFromPayload(payload: TraceabilityPayload): TraceabilityGraph {
 const entities: TraceabilityGraphEntity[] = payload.entities.map(entity => {
  const kind = entity.entityKind;
  if (kind !== 'requirement' && kind !== 'obligation' && kind !== 'acceptance' && kind !== 'implementation' && kind !== 'unit-test' && kind !== 'integration-test') throw new Error(`Invalid V5 indexed entity kind: ${kind}`);
  if (entity.line === null) throw new Error(`V5 indexed entity lacks its declaration line: ${entity.entityId}`);
  return {id:entity.entityId,kind,path:entity.path,line:entity.line};
 });
 const relationships: TraceabilityGraphRelationship[] = payload.relationships.map(edge => {
  const role = edge.role;
  if (role !== 'decomposes' && role !== 'verifies' && role !== 'implements') throw new Error(`Invalid V5 indexed relationship role: ${role}`);
  return {source:edge.sourceEntityId,target:edge.targetEntityId,role};
 });
 return {entities,relationships};
}

// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation normalizeTraceabilityV5Payloads
export function normalizeTraceabilityV5Payloads(payloads: readonly TraceabilityPayload[]): TraceabilityPayload {
 const payload: TraceabilityPayload = {entities:payloads.flatMap(item => item.entities),relationships:payloads.flatMap(item => item.relationships)};
 const failures = validateTraceabilityGraph(graphFromPayload(payload)).filter(finding => !finding.code.startsWith('missing-'));
 if (failures.length) throw new Error(failures.map(finding => finding.message).join('\n'));
 return payload;
}

export const traceabilityV5CoverageRuleCount = 9;

export function traceabilityV5RequirementPredicate(parameter: number): string {
 if (!Number.isSafeInteger(parameter) || parameter < 1) throw new Error('Invalid SQL parameter number');
 return `document.entity_id IN (WITH RECURSIVE linked(entity_id) AS (
  SELECT entity_id FROM ponytail_index.entity_v1 WHERE generation_id = $1::uuid AND entity_id = $${parameter} AND entity_kind = 'requirement'
  UNION SELECT relationship.source_entity_id FROM ponytail_index.relationship_v1 relationship JOIN linked ON relationship.target_entity_id = linked.entity_id WHERE relationship.generation_id = $1::uuid
 ) SELECT entity_id FROM linked)`;
}

// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation evaluateTraceabilityV5Coverage
export function evaluateTraceabilityV5Coverage(payload: TraceabilityPayload): readonly TraceabilityValidationGap[] {
 const graph = graphFromPayload(payload);
 return validateTraceabilityGraph(graph).map(finding => {
  const entity = graph.entities.find(candidate => candidate.id === finding.id);
  if (!entity || !finding.code.startsWith('missing-')) throw new Error(finding.message);
  let targetKind: string;
  let role: string;
  let direction: 'forward' | 'reverse' = 'reverse';
  switch (finding.code) {
   case 'missing-obligation': targetKind='obligation';role='decomposes';break;
   case 'missing-acceptance': targetKind='acceptance';role='verifies';break;
   case 'missing-test': targetKind='unit-test|integration-test';role='verifies';break;
   case 'missing-implementation': targetKind='implementation';role='implements';break;
   case 'missing-parent':
    direction='forward';
    targetKind=entity.kind === 'obligation' ? 'requirement' : entity.kind === 'acceptance' || entity.kind === 'implementation' ? 'obligation' : 'acceptance';
    role=entity.kind === 'obligation' ? 'decomposes' : entity.kind === 'implementation' ? 'implements' : 'verifies';break;
   default: throw new Error(finding.message);
  }
  return {ruleId:`graph-${finding.code}`,sourceEntityId:entity.id,sourceKind:entity.kind,sourcePath:entity.path,sourceLine:entity.line,
   targetKind,roles:[role],direction,minimum:1,actual:0};
 });
}
