// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'lossless-json';
import type {TraceabilityConfigurationV5,TraceabilityProject} from './traceability-project.js';
import type {TraceabilityCodeUnit,TraceabilityGraphRequestV1,TraceabilityGraphResponseV1} from '../../../tsts/src/traceability-graph.js' with {'resolution-mode':'import'};
import type {TstsDiagnostic} from '../../../tsts/src/index.js' with {'resolution-mode':'import'};

function isRecord(value: unknown): value is Readonly<Record<string,unknown>> {
 return typeof value === 'object' && value !== null && !Array.isArray(value);
}
// Traceability: implements OBL-CM-GRAPH from implementation readTraceabilityGraphResponseV1
function readTraceabilityGraphResponseV1(value: unknown): TraceabilityGraphResponseV1 {
 if (!isRecord(value) || Object.keys(value).length !== 5 || !['schemaVersion','checkedUnitCount','checkedFileCount','success','report'].every(key => Object.hasOwn(value,key)) || value.schemaVersion !== 1
  || typeof value.checkedUnitCount !== 'number' || !Number.isSafeInteger(value.checkedUnitCount) || value.checkedUnitCount < 0
  || typeof value.checkedFileCount !== 'number' || !Number.isSafeInteger(value.checkedFileCount) || value.checkedFileCount < 0
  || typeof value.success !== 'boolean' || typeof value.report !== 'string' || !value.report.trim()) {
  throw new Error('Invalid V1 traceability graph response');
 }
 return {schemaVersion:1,checkedUnitCount:value.checkedUnitCount,checkedFileCount:value.checkedFileCount,success:value.success,report:value.report};
}
export const TraceabilityGraphResponseReaders = {V1:readTraceabilityGraphResponseV1};

// Traceability: implements OBL-CM-GRAPH from implementation checkTraceabilityProjectTypescript
export function checkTraceabilityProjectTypescript(configuration: TraceabilityConfigurationV5, project: TraceabilityProject, root: string): readonly TstsDiagnostic[] {
 const diagnostics: TstsDiagnostic[] = [];
 const typedPaths = new Set<string>();
 for (const source of project.sources) {
  if (source.kind === 'markdown') continue;
  if (configuration.sources.some(scope => scope.locator === 'typescript' && scope.include.some(pattern => path.posix.matchesGlob(source.path,pattern)))) {
   typedPaths.add(source.path);
  } else if (/\.(?:[cm]?ts|tsx)$/u.test(source.path)) {
   diagnostics.push({ruleId:'traceability-typescript-configuration',severity:'error',filePath:source.path,message:'TypeScript source requires a semantic locator'});
  }
 }
 if (!typedPaths.size) return diagnostics;
 if (configuration.typescript === null) {
  diagnostics.push({ruleId:'traceability-typescript-configuration',severity:'error',message:'TypeScript source requires a configured semantic checker'});
  return diagnostics;
 }
 const units: TraceabilityCodeUnit[] = [];
 for (const entity of project.graph.entities) {
  if (typedPaths.has(entity.path) && (entity.kind === 'implementation' || entity.kind === 'unit-test' || entity.kind === 'integration-test')) {
   units.push({id:entity.id,kind:entity.kind,path:entity.path,line:entity.line});
  }
 }
 const request: TraceabilityGraphRequestV1 = {schemaVersion:1,projectPath:configuration.typescript.projectPath,units};
 const result = spawnSync(process.execPath,[path.resolve(root,configuration.typescript.cliPath),'--traceability-graph-stdin'], {
  cwd:root,encoding:'utf8',input:JSON.stringify(request),maxBuffer:16*1024*1024,
 });
 let message: string | null = null;
 if (result.error) message = result.error.message;
 else {
  try {
   const value: unknown = parse(result.stdout,null,token => {
    if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token))) throw new Error(`Unsupported graph response number: ${token}`);
    return Number(token);
   });
   const response = TraceabilityGraphResponseReaders.V1(value);
   if (response.checkedUnitCount !== units.length || response.checkedFileCount !== new Set(units.map(unit => unit.path)).size) {
    message = `TSTS graph response does not cover the requested units/files: ${response.report}`;
   } else if (result.status !== 0 || !response.success) message = `TSTS exited ${result.status}: ${response.report}`;
  } catch (error: unknown) {
   message = `Semantic checker did not return a valid V1 graph response: ${error instanceof Error ? error.message : String(error)}; ${(result.stderr || result.stdout).trim()}`;
  }
 }
 if (message !== null) diagnostics.push({ruleId:'traceability-typescript',severity:'error',message});
 return diagnostics;
}
