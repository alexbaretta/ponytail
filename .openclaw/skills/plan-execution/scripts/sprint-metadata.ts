// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';

export const METADATA_MARKER = 'ponytail-plan-sprint';
export type SprintPlanningStatus = 'STUB' | 'PLANNING' | 'READY_FOR_REVIEW' | 'APPROVED' | 'ERROR';
export type SprintExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'DONE' | 'ERROR';
export interface SprintPlanning { readonly status: SprintPlanningStatus; readonly depends_on: readonly string[]; readonly scope_roots: readonly string[] }
interface SprintExecutionFields { readonly status: SprintExecutionStatus; readonly depends_on: readonly string[] }
export interface SprintExecutionV1 extends SprintExecutionFields { readonly planned_paths: readonly string[] }
export interface SprintExecutionReviewed extends SprintExecutionFields { readonly tasklets_reviewed: boolean }
export interface SprintMetadataV1 { readonly schemaVersion: 1; readonly id: string; readonly planning: SprintPlanning; readonly execution: SprintExecutionV1 | null }
export interface SprintMetadataV2 { readonly schemaVersion: 2; readonly id: string; readonly planning: SprintPlanning; readonly execution: SprintExecutionReviewed | null }
export interface SprintMetadataV3 { readonly schemaVersion: 3; readonly id: string; readonly planning: SprintPlanning; readonly execution: SprintExecutionReviewed | null }
export interface SprintV1 extends SprintMetadataV1 { readonly filePath: string }
export interface SprintV2 extends SprintMetadataV2 { readonly filePath: string }
export interface SprintV3 extends SprintMetadataV3 { readonly filePath: string }
interface CommonSprintInput { readonly id: string; readonly planning: SprintPlanning; readonly execution: unknown; readonly filePath: string }
interface ReviewedSprintFields { readonly id: string; readonly planning: SprintPlanning; readonly execution: SprintExecutionReviewed | null; readonly filePath: string }
function fail(message: string): never { throw new Error(message); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value: unknown, expected: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label} must contain exactly: ${wanted.join(', ')}`);
}
function isStrings(value: unknown): value is string[] { return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.length > 0); }
function strings(value: unknown, label: string): readonly string[] {
  if (!isStrings(value)) fail(`${label} must be an array of nonempty strings`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  return value;
}
function relativePath(value: string, label: string): string {
  if (!value || value.includes('\\') || /[*?{}]/.test(value)) fail(`${label} must be a relative path without glob syntax`);
  if (value.split('/').some(segment => !segment || segment === '.' || segment === '..')) fail(`${label} contains an invalid path segment`);
  return value;
}
function metadataBlock(filePath: string, text: string): unknown {
  const marker = new RegExp(`^<!--\\s*${METADATA_MARKER}\\s*$([\\s\\S]*?)^-->\\s*$`, 'gm');
  const blocks = [...text.matchAll(marker)];
  if (blocks.length !== 1) fail(`${filePath} must contain exactly one ${METADATA_MARKER} metadata block`);
  const block = blocks[0]?.[1];
  if (block === undefined) fail('sprint metadata matcher lacks its required capture');
  try { const value: unknown = JSON.parse(block); return value; }
  catch (error) { fail(`${filePath} metadata is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}
function isPlanningStatus(value: unknown): value is SprintPlanningStatus {
  return value === 'STUB' || value === 'PLANNING' || value === 'READY_FOR_REVIEW' || value === 'APPROVED' || value === 'ERROR';
}
function isExecutionStatus(value: unknown): value is SprintExecutionStatus {
  return value === 'PENDING' || value === 'IN_PROGRESS' || value === 'READY_FOR_REVIEW' || value === 'DONE' || value === 'ERROR';
}
function commonMetadata(filePath: string, metadata: unknown, schemaVersion: 1 | 2 | 3): CommonSprintInput {
  exactKeys(metadata, ['schemaVersion', 'id', 'planning', 'execution'], 'sprint metadata');
  if (metadata.schemaVersion !== schemaVersion) fail(`${filePath} has unsupported schemaVersion: ${metadata.schemaVersion}`);
  const expectedId = path.basename(filePath, '.md');
  if (metadata.id !== expectedId) fail(`${filePath} metadata id must be ${expectedId}`);
  exactKeys(metadata.planning, ['status', 'depends_on', 'scope_roots'], 'planning metadata');
  if (!isPlanningStatus(metadata.planning.status)) fail(`${filePath} has invalid planning status`);
  const sprintPlanning: SprintPlanning = { status: metadata.planning.status,
    depends_on: strings(metadata.planning.depends_on, 'planning.depends_on'),
    scope_roots: strings(metadata.planning.scope_roots, 'planning.scope_roots').map(value => relativePath(value, 'scope root')) };
  return { id: expectedId, planning: sprintPlanning, execution: metadata.execution, filePath };
}
function executionFields(filePath: string, execution: Record<string, unknown>): SprintExecutionFields {
  if (!isExecutionStatus(execution.status)) fail(`${filePath} has invalid execution status`);
  return { status: execution.status, depends_on: strings(execution.depends_on, 'execution.depends_on') };
}
function executionV1(filePath: string, value: unknown): SprintExecutionV1 {
  exactKeys(value, ['status', 'depends_on', 'planned_paths'], 'execution metadata');
  return { ...executionFields(filePath, value), planned_paths: strings(value.planned_paths, 'execution.planned_paths').map(candidate => relativePath(candidate, 'planned path')) };
}
function executionReviewed(filePath: string, value: unknown): SprintExecutionReviewed {
  exactKeys(value, ['status', 'depends_on', 'tasklets_reviewed'], 'execution metadata');
  const sprintExecutionFields: SprintExecutionFields = executionFields(filePath, value);
  if (typeof value.tasklets_reviewed !== 'boolean') fail(`${filePath} execution.tasklets_reviewed must be Boolean`);
  return { ...sprintExecutionFields, tasklets_reviewed: value.tasklets_reviewed };
}
export function readSprintMetadataV1(filePath: string, metadata: unknown): SprintV1 {
  const commonSprintInput: CommonSprintInput = commonMetadata(filePath, metadata, 1);
  return { ...commonSprintInput, schemaVersion: 1, execution: commonSprintInput.execution === null ? null : executionV1(filePath, commonSprintInput.execution) };
}
function reviewedSprint(filePath: string, metadata: unknown, version: 2 | 3): ReviewedSprintFields {
  const commonSprintInput: CommonSprintInput = commonMetadata(filePath, metadata, version);
  return { ...commonSprintInput, execution: commonSprintInput.execution === null ? null : executionReviewed(filePath, commonSprintInput.execution) };
}
export function readSprintMetadataV2(filePath: string, metadata: unknown): SprintV2 { return { schemaVersion: 2, ...reviewedSprint(filePath, metadata, 2) }; }
export function readSprintMetadataV3(filePath: string, metadata: unknown): SprintV3 { return { schemaVersion: 3, ...reviewedSprint(filePath, metadata, 3) }; }
export const SprintMetadataReaders = Object.freeze({ V1: readSprintMetadataV1, V2: readSprintMetadataV2, V3: readSprintMetadataV3 });
export function parseSprintFile(filePath: string, text = fs.readFileSync(filePath, 'utf8')): SprintV1 | SprintV2 | SprintV3 {
  const metadata = metadataBlock(filePath, text);
  const version = isRecord(metadata) ? metadata.schemaVersion : undefined;
  switch (version) {
    case 1: return readSprintMetadataV1(filePath, metadata);
    case 2: return readSprintMetadataV2(filePath, metadata);
    case 3: return readSprintMetadataV3(filePath, metadata);
    default: fail(`${filePath} has unsupported schemaVersion: ${version}`);
  }
}
export function readSprints(planDirectory: string): (SprintV1 | SprintV2 | SprintV3)[] {
  const sprintDirectory = path.join(planDirectory, 'sprints');
  if (!fs.existsSync(sprintDirectory) || !fs.statSync(sprintDirectory).isDirectory()) fail(`sprint directory does not exist: ${sprintDirectory}`);
  const files = fs.readdirSync(sprintDirectory).filter(name => /^S\d+\.md$/.test(name) && fs.statSync(path.join(sprintDirectory, name)).isFile())
    .sort((a, b) => Number(a.slice(1, -3)) - Number(b.slice(1, -3)));
  if (files.length === 0) fail(`no SNN.md sprint files found in ${sprintDirectory}`);
  const sprints = files.map(name => parseSprintFile(path.join(sprintDirectory, name)));
  const ids = new Set<string>();
  const ordinals = new Set<number>();
  for (const sprint of sprints) {
    if (ids.has(sprint.id)) fail(`duplicate sprint id: ${sprint.id}`);
    ids.add(sprint.id);
    const ordinal = Number(sprint.id.slice(1));
    if (ordinals.has(ordinal)) fail(`duplicate numeric sprint order: ${ordinal}`);
    ordinals.add(ordinal);
  }
  if (new Set(sprints.map(({ schemaVersion }) => schemaVersion)).size !== 1) fail('plan must not mix physical sprint schema versions');
  return sprints;
}
