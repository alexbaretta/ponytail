// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import ts from 'typescript';
import type {TstsCheckResult, TstsDiagnostic} from './index.js';

export interface TraceabilityCodeUnit {
 readonly id: string;
 readonly kind: 'implementation' | 'unit-test' | 'integration-test';
 readonly path: string;
 readonly line: number;
}
export interface TraceabilityGraphAnnotationsInput {
 readonly projectRoot: string;
 readonly projectPath: string;
 readonly units: readonly TraceabilityCodeUnit[];
}

export interface TraceabilityGraphRequestV1 {
 readonly schemaVersion: 1;
 readonly projectPath: string;
 readonly units: readonly TraceabilityCodeUnit[];
}

export interface TraceabilityGraphResponseV1 {
 readonly schemaVersion: 1;
 readonly checkedUnitCount: number;
 readonly checkedFileCount: number;
 readonly success: boolean;
 readonly report: string;
}

function record(value: unknown): value is Readonly<Record<string, unknown>> {
 return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value: unknown, keys: readonly string[]): value is Readonly<Record<string, unknown>> {
 return record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
}
function relativeFile(value: unknown): value is string {
 return typeof value === 'string' && value.length > 0 && value.trim() === value && !path.posix.isAbsolute(value)
  && !path.win32.isAbsolute(value) && !value.includes('\\') && !value.includes('\0')
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
function codeUnit(value: unknown): value is TraceabilityCodeUnit {
 return exact(value,['id','kind','path','line']) && typeof value.id === 'string' && /^[^\s"'`,;]+$/u.test(value.id)
  && (value.kind === 'implementation' || value.kind === 'unit-test' || value.kind === 'integration-test')
  && relativeFile(value.path) && typeof value.line === 'number' && Number.isSafeInteger(value.line) && value.line > 0;
}

// Traceability: implements OBL-CM-GRAPH from implementation readTraceabilityGraphRequestV1
function readTraceabilityGraphRequestV1(value: unknown): TraceabilityGraphRequestV1 {
 if (!exact(value,['schemaVersion','projectPath','units']) || value.schemaVersion !== 1
  || !relativeFile(value.projectPath) || !Array.isArray(value.units) || !value.units.every(codeUnit)) {
  throw new Error('Invalid V1 traceability graph request');
 }
 return {schemaVersion:1,projectPath:value.projectPath,units:value.units};
}

export const TraceabilityGraphRequestReaders = {V1:readTraceabilityGraphRequestV1};

function namedImplementation(node: ts.Node): boolean {
 if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)
  || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isMethodDeclaration(node)
  || ts.isPropertyDeclaration(node)) return node.name !== undefined && ts.isIdentifier(node.name);
 if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
  const declaration = node.declarationList.declarations[0];
  return declaration !== undefined && ts.isIdentifier(declaration.name);
 }
 return false;
}

interface RunnerRegistration { readonly name: 'test' | 'it' | 'describe' | 'suite'; readonly disabled: boolean }

function runnerDeclaration(node: ts.Node): boolean {
 for (let ancestor: ts.Node | undefined = node; ancestor; ancestor = ancestor.parent) {
  const specifier = ts.isImportDeclaration(ancestor) ? ancestor.moduleSpecifier : ts.isModuleDeclaration(ancestor) ? ancestor.name : undefined;
  if (specifier && ts.isStringLiteral(specifier)
   && ['node:test','vitest','@jest/globals','mocha','@playwright/test'].includes(specifier.text)) return true;
 }
 const sourceFile = node.getSourceFile();
 if (!sourceFile.isDeclarationFile && ((ts.isFunctionDeclaration(node) && node.body !== undefined)
  || (ts.isVariableDeclaration(node) && node.initializer !== undefined))
  && (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0
  && ts.getJSDocTags(node).some(tag => tag.tagName.text === 'traceabilityRunner' && tag.comment === undefined)) return true;
 return sourceFile.isDeclarationFile && /\/node_modules\/@types\/(?:jest|mocha)\/index\.d\.ts$/u.test(sourceFile.fileName.replace(/\\/gu,'/'));
}

function runnerRegistration(expression: ts.Expression, typeChecker: ts.TypeChecker): RunnerRegistration | null {
 if (ts.isCallExpression(expression)) return runnerRegistration(expression.expression,typeChecker);
 if (ts.isPropertyAccessExpression(expression)) {
  if (['only','each','skip','todo','skipIf','runIf'].includes(expression.name.text)) {
   const registration = runnerRegistration(expression.expression,typeChecker);
   return registration && {name:registration.name,disabled:registration.disabled || !['only','each'].includes(expression.name.text)};
  }
 }
 const symbol = typeChecker.getSymbolAtLocation(expression);
 if (!symbol) return null;
 const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? typeChecker.getAliasedSymbol(symbol) : symbol;
 const name = resolvedSymbol.name;
 if (name !== 'test' && name !== 'it' && name !== 'describe' && name !== 'suite') return null;
 if (![...(symbol.declarations ?? []),...(resolvedSymbol.declarations ?? [])].some(runnerDeclaration)) return null;
 return {name,disabled:false};
}

function enabledBody(call: ts.CallExpression, typeChecker: ts.TypeChecker): boolean {
 const last = call.arguments[call.arguments.length - 1];
 const lastType = last && typeChecker.getTypeAtLocation(last);
 // Vitest and Jest permit a numeric timeout after the body.
 const hasTimeout = lastType !== undefined && (lastType.isUnion() ? lastType.types : [lastType])
  .every(type => (type.flags & ts.TypeFlags.NumberLike) !== 0);
 const callbackIndex = call.arguments.length - (hasTimeout ? 2 : 1);
 const callback = call.arguments[callbackIndex];
 if (!callback || typeChecker.getTypeAtLocation(callback).getCallSignatures().length === 0) return false;
 // node:test permits options between the title and body. A skipped/todo call is not executable coverage.
 const first = call.arguments[0];
 const hasTitle = first !== undefined && (typeChecker.getTypeAtLocation(first).flags & ts.TypeFlags.StringLike) !== 0;
 for (const argument of call.arguments.slice(hasTitle ? 1 : 0,callbackIndex)) {
  if (!ts.isObjectLiteralExpression(argument)) return false;
  for (const property of argument.properties) {
   if (!ts.isPropertyAssignment(property)) return false;
   const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null;
   if (name === null) return false;
   if ((name === 'skip' || name === 'todo') && property.initializer.kind !== ts.SyntaxKind.FalseKeyword) return false;
  }
 }
 return true;
}

function executableTest(node: ts.Node, typeChecker: ts.TypeChecker): boolean {
 if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression)) return false;
 const registration = runnerRegistration(node.expression.expression,typeChecker);
 if (!registration || registration.disabled || (registration.name !== 'test' && registration.name !== 'it') || !enabledBody(node.expression,typeChecker)) return false;
 for (let ancestor: ts.Node | undefined = node.parent; ancestor; ancestor = ancestor.parent) {
  if (!ts.isCallExpression(ancestor)) continue;
  const enclosingRegistration = runnerRegistration(ancestor.expression,typeChecker);
  if (enclosingRegistration && (enclosingRegistration.disabled || !enabledBody(ancestor,typeChecker))) return false;
 }
 return true;
}

function ownsMarker(sourceFile: ts.SourceFile, node: ts.Node, traceabilityCodeUnit: TraceabilityCodeUnit): boolean {
 for (const range of ts.getLeadingCommentRanges(sourceFile.text,node.getFullStart()) ?? []) {
  const comment = sourceFile.text.slice(range.pos,range.end);
  const firstLine = sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1;
  const line = comment.split(/\r?\n/u)[traceabilityCodeUnit.line - firstLine];
  if (line === undefined) continue;
  const match = /^\s*(?:\/\/|\/\*+|\*)?\s*Traceability:\s+(implements|verifies)\s+[A-Z][A-Z0-9-]*\s+from\s+(implementation|unit-test|integration-test)\s+([^\s"'`,;]+)\s*$/u.exec(line.replace(/\s*\*\/\s*$/u,''));
  if (match?.[2] === traceabilityCodeUnit.kind && match[3] === traceabilityCodeUnit.id
   && match[1] === (traceabilityCodeUnit.kind === 'implementation' ? 'implements' : 'verifies')) return true;
 }
 return false;
}

// Traceability: implements OBL-CM-GRAPH from implementation checkTraceabilityGraphAnnotations
// Traceability: implements OBL-CM-ACCEPTANCE-COVERAGE from implementation checkTraceabilityGraphAnnotations
export function checkTraceabilityGraphAnnotations(input: TraceabilityGraphAnnotationsInput): TstsCheckResult {
 const root = path.resolve(input.projectRoot);
 const diagnostics: TstsDiagnostic[] = [];
 const report = (message: string, filePath?: string, line?: number): void => {
  diagnostics.push({ruleId:'traceability-typescript-locator',severity:'error',message,
   ...(filePath === undefined ? {} : {filePath}), ...(line === undefined ? {} : {line})});
 };
 const compilerDiagnostic = (diagnostic: ts.Diagnostic): void => {
  report(ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n'),diagnostic.file?.fileName,
   diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : undefined);
 };
 const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(path.resolve(root,input.projectPath),{}, {
  ...ts.sys,getCurrentDirectory:() => root,onUnRecoverableConfigFileDiagnostic:compilerDiagnostic,
 });
 if (!parsedCommandLine) return {checkedFileCount:0,diagnostics};
 for (const diagnostic of parsedCommandLine.errors) compilerDiagnostic(diagnostic);
 const program = ts.createProgram(parsedCommandLine.fileNames,parsedCommandLine.options);
 const typeChecker = program.getTypeChecker();
 const sourceFiles = new Map(program.getSourceFiles().filter(sourceFile => !sourceFile.isDeclarationFile).map(sourceFile => [path.resolve(sourceFile.fileName),sourceFile]));
 const checkedPaths = new Set<string>();
 for (const unit of input.units) {
  const absolute = path.resolve(root,unit.path);
  const relative = path.relative(root,absolute);
  if (path.isAbsolute(unit.path) || relative.startsWith(`..${path.sep}`) || relative === '..') {
   report('Traceability unit must be inside the invoking project',unit.path,unit.line);
   continue;
  }
  const sourceFile = sourceFiles.get(absolute);
  if (!sourceFile) {
   report(`${unit.id} is not part of the TypeScript project`,unit.path,unit.line);
   continue;
  }
  if (!checkedPaths.has(absolute)) {
   checkedPaths.add(absolute);
   for (const diagnostic of program.getSyntacticDiagnostics(sourceFile)) compilerDiagnostic(diagnostic);
  }
  let attached = false;
  const visit = (node: ts.Node): void => {
   if (attached) return;
   if ((unit.kind === 'implementation' ? namedImplementation(node) : executableTest(node,typeChecker)) && ownsMarker(sourceFile,node,unit)) {
    attached = true;
    return;
   }
   ts.forEachChild(node,visit);
  };
  visit(sourceFile);
  if (!attached) report(`${unit.id} must annotate ${unit.kind === 'implementation' ? 'a named implementation declaration' : 'an executable test call'} in a leading comment`,unit.path,unit.line);
 }
 return {checkedFileCount:checkedPaths.size,diagnostics};
}
