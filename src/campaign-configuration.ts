// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';

export interface CampaignLifecycleRoles {
  readonly initial: string;
  readonly activeWork: string;
  readonly successfulCompletion: string;
  readonly deferred: string;
  readonly rejected: string;
}
export interface CampaignManagementConfigV1 {
  readonly schemaVersion: 1;
  readonly managementRoot: string;
  readonly planRoot: string;
  readonly lifecycle: { readonly directories: readonly string[]; readonly roles: CampaignLifecycleRoles };
  readonly legacyPlanLayout: 'flat' | 'none';
}
const MANAGEMENT_CONFIG_PATH = '.agents/config/project/management.json';
const LIFECYCLE_ROLES: readonly (keyof CampaignLifecycleRoles)[] = ['initial', 'activeWork', 'successfulCompletion', 'deferred', 'rejected'];

export class CampaignError extends Error {
  constructor(readonly status: 1 | 2, readonly code: string, message: string,
    readonly recordId: unknown = null, readonly relativePath: string | null = null) { super(message); }
}
export function dataError(code: string, message: string, recordId: unknown = null, relativePath: string | null = null): never {
  throw new CampaignError(1, code, message, recordId, relativePath);
}
export function toolError(code: string, message: string, relativePath: string | null = null): never {
  throw new CampaignError(2, code, message, null, relativePath);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function exactKeys(value: unknown, expected: readonly string[], label: string,
  fail: (code: string, message: string) => never = dataError): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail('CAMPAIGN_SCHEMA', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('CAMPAIGN_SCHEMA', `${label} must contain exactly: ${wanted.join(', ')}`);
  }
}
function relativePath(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value) || value.includes('\\') || /[*?{}]/.test(value)) {
    dataError('CAMPAIGN_CONFIG_PATH', `${label} must be an exact relative path without glob syntax`);
  }
  if (value.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    dataError('CAMPAIGN_CONFIG_PATH', `${label} contains an invalid path segment`);
  }
  return value;
}
function isLifecycleDirectories(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 &&
    value.every((directory: unknown) => typeof directory === 'string' && /^[a-z][a-z0-9_]*$/.test(directory)) &&
    new Set<unknown>(value).size === value.length;
}
function isLifecycleRoles(value: Record<string, unknown>, directories: readonly string[]): value is Record<string, unknown> & CampaignLifecycleRoles {
  const roleDirectories = LIFECYCLE_ROLES.map(role => value[role]);
  return roleDirectories.every(directory => typeof directory === 'string' && directories.includes(directory)) &&
    new Set(roleDirectories).size === roleDirectories.length;
}

export function readManagementConfigV1(value: unknown): CampaignManagementConfigV1 {
  exactKeys(value, ['schemaVersion', 'managementRoot', 'planRoot', 'lifecycle', 'legacyPlanLayout'], 'management configuration');
  if (value.schemaVersion !== 1) dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${value.schemaVersion}`);
  const managementRoot = relativePath(value.managementRoot, 'managementRoot');
  const planRoot = relativePath(value.planRoot, 'planRoot');
  if (planRoot !== managementRoot && !planRoot.startsWith(`${managementRoot}/`)) {
    dataError('CAMPAIGN_CONFIG_PATH', 'planRoot must be within managementRoot');
  }
  exactKeys(value.lifecycle, ['directories', 'roles'], 'lifecycle configuration');
  if (!isLifecycleDirectories(value.lifecycle.directories)) {
    dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle.directories must contain unique status directory names');
  }
  exactKeys(value.lifecycle.roles, LIFECYCLE_ROLES, 'lifecycle roles');
  if (!isLifecycleRoles(value.lifecycle.roles, value.lifecycle.directories)) {
    dataError('CAMPAIGN_CONFIG_LIFECYCLE', 'lifecycle roles must map bijectively to configured directories');
  }
  if (!(value.legacyPlanLayout === 'flat' || value.legacyPlanLayout === 'none')) {
    dataError('CAMPAIGN_CONFIG_LEGACY', 'legacyPlanLayout must be flat or none');
  }
  return { schemaVersion: 1, managementRoot, planRoot,
    lifecycle: { directories: [...value.lifecycle.directories], roles: { ...value.lifecycle.roles } },
    legacyPlanLayout: value.legacyPlanLayout };
}
export const CampaignManagementConfigReaders = Object.freeze({ V1: readManagementConfigV1 });

function parseJsonFile(filePath: string, code: string): unknown {
  try { const value: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8')); return value; }
  catch (error) {
    if (error instanceof SyntaxError) dataError(code, `${filePath} is not valid JSON: ${error.message}`);
    toolError('CAMPAIGN_IO', `cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export function readManagementConfig(repositoryRoot: string): CampaignManagementConfigV1 {
  const filePath = path.join(repositoryRoot, MANAGEMENT_CONFIG_PATH);
  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isSymbolicLink() || !fs.statSync(filePath).isFile()) {
    toolError('CAMPAIGN_CONFIG_MISSING', `missing or unsafe management configuration: ${MANAGEMENT_CONFIG_PATH}`, MANAGEMENT_CONFIG_PATH);
  }
  const value = parseJsonFile(filePath, 'CAMPAIGN_CONFIG_JSON');
  if (!isRecord(value) || value.schemaVersion !== 1) {
    dataError('CAMPAIGN_CONFIG_VERSION', `unsupported management configuration version: ${isRecord(value) ? value.schemaVersion : undefined}`, null, MANAGEMENT_CONFIG_PATH);
  }
  return CampaignManagementConfigReaders.V1(value);
}
