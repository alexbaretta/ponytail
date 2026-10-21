// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'lossless-json';
import {indexProgress} from './index-progress.js';
import type {TraceabilityDiscoveryFinding} from '../skills/requirements-traceability/scripts/traceability-discovery.js';
import {parseTraceabilityV5} from '../skills/requirements-traceability/scripts/traceability-v5.js';
import {discoverTraceabilityProject,readTraceabilityConfigurationV5} from '../skills/requirements-traceability/scripts/traceability-project.js';
import {scopeTraceabilityGraph,type TraceabilityGraph} from '../skills/requirements-traceability/scripts/traceability-graph.js';

export interface CompletenessIds { readonly O: readonly string[]; readonly A: readonly string[]; readonly T: readonly string[]; readonly I: readonly string[] }
export interface CampaignAssessmentV1 {
 readonly schemaVersion: 1;
 readonly campaign: string;
 readonly requirementIds: readonly string[];
 readonly complete: { readonly R: readonly string[]; readonly A: readonly string[]; readonly T: readonly string[]; readonly I: readonly string[] };
 readonly reviewReferences: readonly string[];
 readonly validationTags: readonly string[];
}
export interface CampaignAssessmentV2 {
 readonly schemaVersion: 2;
 readonly campaign: string;
 readonly requirementIds: readonly string[];
 readonly complete: CompletenessIds;
 readonly reviewReferences: readonly string[];
 readonly validationTags: readonly string[];
}
export interface CampaignCompleteness {
 readonly campaign: string;
 readonly commit: string;
 readonly assessmentTag: string | null;
 readonly requirementIds: readonly string[];
 readonly vector: readonly [number,number,number,number];
 readonly unresolved: CompletenessIds;
}
export interface CampaignCompletenessReport extends CampaignCompleteness {
 readonly findings: readonly TraceabilityDiscoveryFinding[];
 readonly completionBlocked: boolean;
}

function isRecord(value: unknown): value is Readonly<Record<string,unknown>> {
 return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function object(value: unknown, keys: readonly string[]): Readonly<Record<string,unknown>> {
 if (!isRecord(value)
  || Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value,key))) throw new Error(`Expected exactly: ${keys.join(', ')}`);
 return value;
}
function strings(value: unknown): readonly string[] {
 if (!Array.isArray(value) || !value.every((entry: unknown): entry is string => typeof entry === 'string' && entry.trim() === entry && entry.length > 0)
  || new Set(value).size !== value.length) throw new Error('Expected unique nonempty strings');
 return value;
}
function campaignName(value: unknown): string {
 if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(value)) throw new Error('Invalid campaign name');
 return value;
}
function readCampaignAssessmentV1(value: unknown): CampaignAssessmentV1 {
 const record = object(value,['schemaVersion','campaign','requirementIds','complete','reviewReferences','validationTags']);
 if (record.schemaVersion !== 1) throw new Error('Unsupported campaign assessment version');
 const complete = object(record.complete,['R','A','T','I']);
 const result: CampaignAssessmentV1 = {schemaVersion:1,campaign:campaignName(record.campaign),requirementIds:strings(record.requirementIds),
  complete:{R:strings(complete.R),A:strings(complete.A),T:strings(complete.T),I:strings(complete.I)},
  reviewReferences:strings(record.reviewReferences),validationTags:strings(record.validationTags)};
 if (result.requirementIds.length === 0) throw new Error('Campaign requirement scope must not be empty');
 if (Object.values(result.complete).some(ids => ids.length > 0) && result.reviewReferences.length === 0) throw new Error('Completed IDs require review references');
 if ((result.complete.T.length > 0 || result.complete.I.length > 0) && result.validationTags.length === 0) throw new Error('T/I credit requires passing validation tag references');
 return result;
}
function readCampaignAssessmentV2(value: unknown): CampaignAssessmentV2 {
 const record = object(value,['schemaVersion','campaign','requirementIds','complete','reviewReferences','validationTags']);
 if (record.schemaVersion !== 2) throw new Error('Unsupported campaign assessment version');
 const complete = object(record.complete,['O','A','T','I']);
 const legacy = readCampaignAssessmentV1({...record,schemaVersion:1,complete:{R:complete.O,A:complete.A,T:complete.T,I:complete.I}});
 return {...legacy,schemaVersion:2,complete:{O:legacy.complete.R,A:legacy.complete.A,T:legacy.complete.T,I:legacy.complete.I}};
}
export const CampaignAssessmentReaders = {V1:readCampaignAssessmentV1,V2:readCampaignAssessmentV2};
function readCampaignAssessment(value: unknown): CampaignAssessmentV2 {
 if (!isRecord(value)) throw new Error('Expected campaign assessment object');
 if (value.schemaVersion === 1) {
  const legacy = readCampaignAssessmentV1(value);
  return {...legacy,schemaVersion:2,complete:{O:legacy.complete.R,A:legacy.complete.A,T:legacy.complete.T,I:legacy.complete.I}};
 }
 return readCampaignAssessmentV2(value);
}

// Traceability: implements OBL-CM-DESCENT from implementation computeCampaignCompleteness
export function computeCampaignCompleteness(graph: TraceabilityGraph, assessment: CampaignAssessmentV2, commit: string, assessmentTag: string | null): CampaignCompleteness {
 const scoped = scopeTraceabilityGraph(graph,assessment.requirementIds);
 const kindsById = new Map(scoped.entities.map(entity => [entity.id,entity.kind]));
 const byKind = (kind: string): readonly string[] => scoped.entities.filter(entity => entity.kind === kind).map(entity => entity.id).sort();
 const requirements = byKind('requirement');
 const obligations = byKind('obligation');
 const acceptances = byKind('acceptance');
 const expected: CompletenessIds = {O:requirements,A:obligations,T:acceptances,I:obligations};
 for (const coordinate of ['O','A','T','I'] as const) {
  for (const id of assessment.complete[coordinate]) {
   if (!expected[coordinate].includes(id)) throw new Error(`Assessment ${coordinate} ID is outside scope or has the wrong kind: ${id}`);
  }
 }
 const incoming = (id: string, kinds: readonly string[]): readonly string[] => scoped.relationships
  .filter(edge => edge.target === id && kinds.includes(kindsById.get(edge.source) ?? ''))
  .map(edge => edge.source);
 const implemented = (id: string): boolean => incoming(id,['implementation']).length > 0;
 const tested = (id: string): boolean => assessment.complete.T.includes(id) && incoming(id,['unit-test','integration-test']).length > 0
  && scoped.relationships.filter(edge => edge.source === id).every(edge => implemented(edge.target));
 const unresolved: CompletenessIds = {
  O:requirements.filter(id => !assessment.complete.O.includes(id) || incoming(id,['obligation']).length === 0),
  A:obligations.filter(id => !assessment.complete.A.includes(id) || incoming(id,['acceptance']).length === 0),
  T:acceptances.filter(id => !tested(id)),
  I:obligations.filter(id => !assessment.complete.I.includes(id) || !implemented(id) || !assessment.complete.A.includes(id)
   || incoming(id,['acceptance']).length === 0 || !incoming(id,['acceptance']).every(tested)),
 };
 return {campaign:assessment.campaign,commit,assessmentTag,requirementIds:[...assessment.requirementIds].sort(),
  vector:[unresolved.O.length,unresolved.A.length,unresolved.T.length,unresolved.I.length],unresolved};
}

function git(root: string, args: readonly string[]): string {
 return execFileSync('git',[...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
}
function annotatedTag(root: string, name: string): {readonly commit: string; readonly contents: string} {
 if (!name || name.startsWith('-') || /[\s~^:?*\[\\]/u.test(name)) throw new Error(`Invalid tag name: ${name}`);
 const ref = `refs/tags/${name}`;
 const objectId = git(root,['rev-parse','--verify',ref]);
 if (git(root,['cat-file','-t',objectId]) !== 'tag') throw new Error(`Expected annotated tag: ${name}`);
 const text = git(root,['cat-file','tag',objectId]);
 const separator = text.indexOf('\n\n');
 return {commit:git(root,['rev-parse',`${objectId}^{commit}`]),contents:separator < 0 ? '' : text.slice(separator+2)};
}

// Traceability: implements OBL-CM-DESCENT from implementation runTraceabilityCompleteness
export function runTraceabilityCompleteness(argv: readonly string[], cwd = process.cwd()): CampaignCompletenessReport | null {
 let campaign: string | undefined;
 let assessmentTag: string | undefined;
 let json = false;
 let verbose = false;
 const requirementIds: string[] = [];
 for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === '--help') {
   process.stdout.write('Usage: ponytail traceability completeness [--campaign <name>] [--assessment-tag <tag> | --requirement <id> ...] [--json] [--verbose]\nDefault output is the vector only; --verbose includes unresolved IDs and findings. Progress is written to stderr, except with --json.\nWithout an explicit tag, select the unique current-commit assessment tag for the campaign. Explicit tags assess their immutable target; explicit requirements assess HEAD. Working-tree edits are not included.\n');
   return null;
  }
  if (argument === '--verbose') { verbose = true; continue; }
  if (argument === '--json') { json = true; continue; }
  if (argument !== '--campaign' && argument !== '--assessment-tag' && argument !== '--requirement') throw new Error(`Unknown completeness argument: ${argument}`);
  const value = argv[++index];
  if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
  if (argument === '--campaign') campaign = campaignName(value);
  else if (argument === '--assessment-tag') assessmentTag = value;
  else requirementIds.push(value);
 }
 if (assessmentTag !== undefined && requirementIds.length > 0) throw new Error('Use the assessment scope or explicit requirements, not both');
 const progress = indexProgress(process.stderr);
 const update = (completed: number, total: number, stage: string): void => { if (!json) progress.update(completed,total,stage); };
 update(0,1,'Preparation');
 try {
 const root = fs.realpathSync(git(cwd,['rev-parse','--show-toplevel']));
 let commit = git(root,['rev-parse','HEAD']);
 let assessment: CampaignAssessmentV2;
 if (requirementIds.length > 0) {
  if (campaign === undefined) throw new Error('Unassessed scope requires --campaign');
  assessment = readCampaignAssessmentV2({schemaVersion:2,campaign,requirementIds,complete:{O:[],A:[],T:[],I:[]},reviewReferences:[],validationTags:[]});
 } else {
  if (assessmentTag === undefined) {
   const pattern = campaign === undefined ? 'ponytail/completeness/*' : `ponytail/completeness/${campaign}/*`;
   const tags = git(root,['tag','--points-at','HEAD','--list',pattern]).split('\n').filter(Boolean);
   if (tags.length !== 1) throw new Error('Select exactly one current assessment with --assessment-tag, or provide --campaign and --requirement IDs for an unassessed scope');
   assessmentTag = tags[0];
  }
  if (assessmentTag === undefined) throw new Error('Missing assessment tag');
  const tag = annotatedTag(root,assessmentTag);
  commit = tag.commit;
  const payload: unknown = parse(tag.contents,null,token => {
   if (token !== '1' && token !== '2') throw new Error(`Unsupported assessment number: ${token}`);
   return Number(token);
  });
  assessment = readCampaignAssessment(payload);
  if (campaign !== undefined && assessment.campaign !== campaign) throw new Error('Assessment campaign does not match --campaign');
  for (const name of assessment.validationTags) {
   const validation = annotatedTag(root,name);
   git(root,['merge-base','--is-ancestor',validation.commit,commit]);
   if (!validation.contents) throw new Error(`Empty validation tag: ${name}`);
  }
 }
 const configurationPath = path.join(root,'.agents/config/project/traceability.json');
 const configurationFile = '.agents/config/project/traceability.json';
 const configurationEntry = git(root,['ls-tree',commit,'--',configurationFile]);
 if (!/^100(?:644|755) blob /u.test(configurationEntry)) throw new Error('Traceability configuration must be a regular committed file');
 const configurationText = git(root,['show',`${commit}:${configurationFile}`]);
 const configuration = readTraceabilityConfigurationV5(parseTraceabilityV5(configurationText));
 update(1,1,'Preparation');
 update(0,1,'Inventory');
 const project = discoverTraceabilityProject(configuration,configurationPath,root,(completed,total) => update(completed,total,'Sources'),commit);
 update(0,1,'Assessment');
 const failures = project.projectFindings.filter(finding => finding.code !== 'empty-scope');
 if (failures.length > 0) throw new Error(`Cannot assess malformed canonical traceability sources: ${failures.map(finding => `${finding.path}:${finding.line} ${finding.code}: ${finding.message}`).join('; ')}`);
 const result: CampaignCompletenessReport = {
  ...computeCampaignCompleteness(project.graph,assessment,commit,assessmentTag ?? null),
  findings:project.discoveryFindings,
  completionBlocked:project.discoveryFindings.length > 0,
 };
 update(1,1,'Assessment');
 if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
 else {
  process.stdout.write(`Campaign completeness vector (O,A,T,I): (${result.vector.join(',')})\n`);
  if (result.completionBlocked && !verbose) process.stderr.write(`Completion blocked by ${result.findings.length} annotation findings; use --verbose for details.\n`);
  if (verbose) {
  process.stdout.write(`Campaign: ${result.campaign}; commit: ${commit}; assessment: ${result.assessmentTag ?? 'none (all adequacy unknown)'}\n`);
  for (const coordinate of ['O','A','T','I'] as const) process.stdout.write(`${coordinate} unresolved: ${result.unresolved[coordinate].join(', ') || 'none'}\n`);
  process.stdout.write(`Annotation findings blocking completion: ${result.findings.length}\n`);
  for (const finding of result.findings) process.stdout.write(`${finding.path}:${finding.line} ${finding.code}: ${finding.message}\n`);
  process.stdout.write('Based on declared review and validation applicability; zero is provisional until all workers are DONE and independent final QA passes.\n');
  }
 }
 return result;
 } finally { progress.stop(); }
}
