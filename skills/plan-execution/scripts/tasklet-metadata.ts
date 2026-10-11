// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';

interface TaskletFields { readonly depends_on: readonly string[]; readonly affinity: readonly string[] }
export interface NormalTasklet extends TaskletFields { readonly risk: 'normal' }
export interface HighRiskTasklet extends TaskletFields { readonly risk: 'high'; readonly risk_reason: string }
export type TaskletValue = NormalTasklet | HighRiskTasklet;
export type FeatureTasklet = TaskletValue & { readonly feature: string; readonly planned_paths: readonly string[] };
export interface TaskletFeature { readonly depends_on: readonly string[]; readonly validation_tasklet: string }
export interface ExternalTaskletDependency { readonly planId: string; readonly taskletId: string }
export interface TaskletMetadataV1 { readonly schemaVersion: 1; readonly sprint: string; readonly tasklets: Readonly<Record<string, TaskletValue>> }
interface FeatureMetadataFields { readonly sprint: string; readonly features: Readonly<Record<string, TaskletFeature>>; readonly tasklets: Readonly<Record<string, FeatureTasklet>> }
export interface TaskletMetadataV2 extends FeatureMetadataFields { readonly schemaVersion: 2 }
export interface TaskletMetadataV3 extends FeatureMetadataFields { readonly schemaVersion: 3 }
export interface TaskletExternalDependencyMetadata { readonly plan_id: string; readonly tasklet_id: string }
export interface TaskletMetadataV4 extends FeatureMetadataFields { readonly schemaVersion: 4; readonly external_depends_on: Readonly<Record<string, readonly TaskletExternalDependencyMetadata[]>> }
export interface TaskletGraphV1 { readonly schemaVersion: 1; readonly sprint: string; readonly tasklets: ReadonlyMap<string, TaskletValue>; readonly filePath: string }
interface FeatureGraphFields { readonly sprint: string; readonly features: ReadonlyMap<string, TaskletFeature>; readonly tasklets: ReadonlyMap<string, FeatureTasklet>; readonly filePath: string }
export interface TaskletGraphV2 extends FeatureGraphFields { readonly schemaVersion: 2 }
export interface TaskletGraphV3 extends FeatureGraphFields { readonly schemaVersion: 3 }
export interface TaskletGraphV4 extends FeatureGraphFields { readonly schemaVersion: 4; readonly externalDependsOn: ReadonlyMap<string, readonly ExternalTaskletDependency[]> }
function fail(message: string): never { throw new Error(message); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value: unknown, expected: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label} must contain exactly: ${wanted.join(', ')}`);
}
function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}
function isStrings(value: unknown): value is string[] { return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.length > 0); }
function uniqueStrings(value: unknown, label: string): readonly string[] {
  if (!isStrings(value)) fail(`${label} must be an array of nonempty strings`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  return value;
}
function relativePaths(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (new Set<unknown>(value).size !== value.length) fail(`${label} must not contain duplicates`);
  const paths: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !candidate || candidate.includes('\\') || /[*?{}]/.test(candidate)) fail(`${label} must contain relative paths without glob syntax`);
    if (candidate.split('/').some(segment => !segment || segment === '.' || segment === '..')) fail(`${label} contains an invalid path segment`);
    paths.push(candidate);
  }
  return paths;
}
function taskletValue(id: string, value: Record<string, unknown>, expected: readonly string[]): TaskletValue {
  exactKeys(value, value.risk === 'high' ? [...expected, 'risk_reason'] : expected, `tasklet ${id}`);
  if (value.risk !== 'normal' && value.risk !== 'high') fail(`tasklet ${id} has invalid risk`);
  if (value.risk === 'high') {
    const risk_reason = value.risk_reason;
    if (typeof risk_reason !== 'string' || risk_reason.trim() === '') fail(`high-risk tasklet ${id} requires risk_reason`);
    return { ...readTaskletFields(id, value), risk: 'high', risk_reason };
  }
  return { ...readTaskletFields(id, value), risk: 'normal' };
}
function readTaskletFields(id: string, value: Record<string, unknown>): TaskletFields {
  return { depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`), affinity: uniqueStrings(value.affinity, `${id}.affinity`) };
}
export function readTaskletMetadataV1(sprintId: string, metadata: unknown, graphFile: string): TaskletGraphV1 {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== 1) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  const values = record(metadata.tasklets, 'tasklets');
  const tasklets = new Map<string, TaskletValue>();
  for (const [id, value] of Object.entries(values)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    tasklets.set(id, taskletValue(id, record(value, `tasklet ${id}`), ['depends_on', 'affinity', 'risk']));
  }
  return { schemaVersion: 1, sprint: sprintId, tasklets, filePath: graphFile };
}
function featureGraph(sprintId: string, metadata: unknown, graphFile: string, version: 2 | 3): FeatureGraphFields {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'features', 'tasklets'], 'tasklet metadata');
  if (metadata.schemaVersion !== version) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  if (metadata.sprint !== sprintId) fail(`tasklet metadata sprint must be ${sprintId}`);
  const featureValues = record(metadata.features, 'features');
  const taskletValues = record(metadata.tasklets, 'tasklets');
  const features = new Map<string, TaskletFeature>();
  for (const [id, value] of Object.entries(featureValues)) {
    if (!/^S\d+-F\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid feature id: ${id}`);
    exactKeys(value, ['depends_on', 'validation_tasklet'], `feature ${id}`);
    if (typeof value.validation_tasklet !== 'string' || !value.validation_tasklet) fail(`feature ${id} validation_tasklet must be a nonempty string`);
    features.set(id, { depends_on: uniqueStrings(value.depends_on, `${id}.depends_on`), validation_tasklet: value.validation_tasklet });
  }
  const tasklets = new Map<string, FeatureTasklet>();
  for (const [id, value] of Object.entries(taskletValues)) {
    if (!/^S\d+-F\d+-T\d+$/.test(id) || !id.startsWith(`${sprintId}-`)) fail(`invalid tasklet id: ${id}`);
    const fields = record(value, `tasklet ${id}`);
    const parsed = taskletValue(id, fields, ['depends_on', 'affinity', 'risk', 'feature', 'planned_paths']);
    const planned_paths = relativePaths(fields.planned_paths, `${id}.planned_paths`);
    const feature = fields.feature;
    if (typeof feature !== 'string' || !features.has(feature) || !id.startsWith(`${feature}-T`)) fail(`tasklet ${id} has invalid feature membership: ${feature}`);
    tasklets.set(id, { ...parsed, feature, planned_paths });
  }
  return { sprint: sprintId, features, tasklets, filePath: graphFile };
}
export function readTaskletMetadataV2(sprintId: string, metadata: unknown, graphFile: string): TaskletGraphV2 {
  return { schemaVersion: 2, ...featureGraph(sprintId, metadata, graphFile, 2) };
}
export function readTaskletMetadataV3(sprintId: string, metadata: unknown, graphFile: string): TaskletGraphV3 {
  return { schemaVersion: 3, ...featureGraph(sprintId, metadata, graphFile, 3) };
}
export function readTaskletMetadataV4(sprintId: string, metadata: unknown, graphFile: string): TaskletGraphV4 {
  exactKeys(metadata, ['schemaVersion', 'sprint', 'features', 'tasklets', 'external_depends_on'], 'tasklet metadata');
  if (metadata.schemaVersion !== 4) fail(`${graphFile} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  const { external_depends_on: externalDependencies, ...localMetadata } = metadata;
  const taskletGraphV3: TaskletGraphV3 = readTaskletMetadataV3(sprintId, { ...localMetadata, schemaVersion: 3 }, graphFile);
  const dependenciesRecord = record(externalDependencies, 'external_depends_on');
  const externalDependsOn = new Map<string, readonly ExternalTaskletDependency[]>();
  for (const [id, dependencies] of Object.entries(dependenciesRecord)) {
    if (!taskletGraphV3.tasklets.has(id) || !Array.isArray(dependencies) || dependencies.length === 0) fail(`external dependencies require a known tasklet and nonempty list: ${id}`);
    const seen = new Set<string>();
    externalDependsOn.set(id, dependencies.map((dependency: unknown): ExternalTaskletDependency => {
      exactKeys(dependency, ['plan_id', 'tasklet_id'], `external dependency of ${id}`);
      if (typeof dependency.plan_id !== 'string' || !dependency.plan_id || typeof dependency.tasklet_id !== 'string' || !/^S\d+-F\d+-T\d+$/.test(dependency.tasklet_id)) fail(`invalid external dependency of ${id}`);
      const key = `${dependency.plan_id}\0${dependency.tasklet_id}`;
      if (seen.has(key)) fail(`duplicate external dependency of ${id}: ${dependency.plan_id}/${dependency.tasklet_id}`);
      seen.add(key);
      return { planId: dependency.plan_id, taskletId: dependency.tasklet_id };
    }));
  }
  return { ...taskletGraphV3, schemaVersion: 4, externalDependsOn };
}
export const TaskletMetadataReaders = Object.freeze({ V1: readTaskletMetadataV1, V2: readTaskletMetadataV2, V3: readTaskletMetadataV3, V4: readTaskletMetadataV4 });
export function readTaskletGraph(sprintFile: string): TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4 {
  const graphFile = sprintFile.replace(/\.md$/, '.tasklets.json');
  if (graphFile === sprintFile) fail(`sprint file must end in .md: ${sprintFile}`);
  let metadata: unknown;
  try { metadata = JSON.parse(fs.readFileSync(graphFile, 'utf8')); }
  catch (error) { fail(`cannot parse tasklet metadata ${graphFile}: ${error instanceof Error ? error.message : String(error)}`); }
  const version = isRecord(metadata) ? metadata.schemaVersion : undefined;
  const sprintId = path.basename(sprintFile, '.md');
  switch (version) {
    case 1: return readTaskletMetadataV1(sprintId, metadata, graphFile);
    case 2: return readTaskletMetadataV2(sprintId, metadata, graphFile);
    case 3: return readTaskletMetadataV3(sprintId, metadata, graphFile);
    case 4: return readTaskletMetadataV4(sprintId, metadata, graphFile);
    default: fail(`${graphFile} has unsupported schemaVersion: ${version}`);
  }
}
