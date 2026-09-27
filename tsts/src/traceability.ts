// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import path from 'node:path';
import { readFile } from 'node:fs/promises';

import ts from 'typescript';

import type { TstsCheckResult, TstsDiagnostic } from './index.js';

export interface TraceabilityRequirementConfiguration {
    readonly id: string;
    readonly noUnitTestReason?: string | undefined;
    readonly sourcePath: string;
}

export interface TraceabilityArtifactConfiguration {
    readonly class: 'implementation' | 'unit-test' | 'integration-test' | 'uat';
    readonly locator: 'text' | 'typescript';
    readonly path: string;
}

export interface TraceabilityGeneratedArtifactConfiguration {
    readonly path: string;
    readonly sourcePath: string;
}

export interface TraceabilityTypescriptConfiguration {
    readonly cliPath: string;
    readonly projectPath: string;
}

export interface TraceabilityConfiguration {
    readonly artifacts: readonly TraceabilityArtifactConfiguration[];
    readonly generatedArtifacts: readonly TraceabilityGeneratedArtifactConfiguration[];
    readonly projectRoot: string;
    readonly requirements: readonly TraceabilityRequirementConfiguration[];
    readonly reverseViewPath: string;
    readonly schemaVersion: 1;
    readonly typescript?: TraceabilityTypescriptConfiguration | undefined;
}

interface TraceabilityMarker {
    readonly line: number;
    readonly position: number;
    readonly requirementId: string;
    readonly role: 'implements' | 'supports' | 'verifies';
}

const markerPattern: RegExp =
    /[Tt]raceability["']?\s*:\s*["']?(implements|supports|verifies)\s+([A-Z][A-Z0-9-]*)/gu;

export async function checkTraceabilityAnnotations(input: {
    readonly configurationPath: string;
    readonly projectPath: string;
}): Promise<TstsCheckResult> {
    const configurationPath: string = path.resolve(input.configurationPath);
    const configuration: TraceabilityConfiguration = await loadTraceabilityConfiguration(
        configurationPath
    );
    const configurationDirectory: string = path.dirname(configurationPath);
    const projectRoot: string = path.resolve(configurationDirectory, configuration.projectRoot);
    const configuredPaths: ReadonlySet<string> = new Set(
        configuration.artifacts
            .filter(
                (
                    artifact: TraceabilityArtifactConfiguration
                ): artifact is TraceabilityArtifactConfiguration & { readonly locator: 'typescript' } =>
                    artifact.locator === 'typescript'
            )
            .map((artifact: TraceabilityArtifactConfiguration): string =>
                path.resolve(projectRoot, artifact.path)
            )
    );
    if (configuredPaths.size === 0) return { checkedFileCount: 0, diagnostics: [] };

    const diagnostics: TstsDiagnostic[] = [];
    const parsedCommandLine: ts.ParsedCommandLine | undefined = ts.getParsedCommandLineOfConfigFile(
        path.resolve(projectRoot, input.projectPath),
        {},
        {
            fileExists: ts.sys.fileExists,
            getCurrentDirectory: (): string => projectRoot,
            onUnRecoverableConfigFileDiagnostic: (diagnostic: ts.Diagnostic): void => {
                diagnostics.push(toDiagnostic(diagnostic));
            },
            readDirectory: ts.sys.readDirectory,
            readFile: ts.sys.readFile,
            useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
        }
    );
    if (parsedCommandLine === undefined) return { checkedFileCount: 0, diagnostics };

    const program: ts.Program = ts.createProgram(
        parsedCommandLine.fileNames,
        parsedCommandLine.options
    );
    const sourceFilesByPath: ReadonlyMap<string, ts.SourceFile> = new Map(
        program
            .getSourceFiles()
            .filter((sourceFile: ts.SourceFile): boolean => !sourceFile.isDeclarationFile)
            .map((sourceFile: ts.SourceFile): readonly [string, ts.SourceFile] => [
                path.resolve(sourceFile.fileName),
                sourceFile,
            ])
    );

    for (const configuredPath of configuredPaths) {
        const sourceFile: ts.SourceFile | undefined = sourceFilesByPath.get(configuredPath);
        const relativePath: string = path.relative(projectRoot, configuredPath).replace(/\\/gu, '/');
        if (sourceFile === undefined) {
            diagnostics.push({
                filePath: relativePath,
                message: 'configured TypeScript traceability artifact is not part of the project',
                ruleId: 'traceability-typescript-locator',
                severity: 'error',
            });
            continue;
        }
        for (const marker of findTraceabilityMarkers(sourceFile.text)) {
            if (!hasAttachedNamedDeclaration(sourceFile, marker.position)) {
                diagnostics.push({
                    filePath: relativePath,
                    line: marker.line,
                    message: `${marker.role} ${marker.requirementId} is not attached to a supported named declaration`,
                    ruleId: 'traceability-typescript-locator',
                    severity: 'error',
                });
            }
        }
    }

    return { checkedFileCount: configuredPaths.size, diagnostics };
}

async function loadTraceabilityConfiguration(
    configurationPath: string
): Promise<TraceabilityConfiguration> {
    const parsed: unknown = JSON.parse(await readFile(configurationPath, 'utf8'));
    if (!isObject(parsed) || parsed.schemaVersion !== 1 || typeof parsed.projectRoot !== 'string') {
        throw new Error('traceability configuration must be a schemaVersion 1 object');
    }
    if (
        !Array.isArray(parsed.requirements) ||
        !parsed.requirements.every(isRequirementConfiguration) ||
        !Array.isArray(parsed.artifacts) ||
        !parsed.artifacts.every(isArtifactConfiguration) ||
        !Array.isArray(parsed.generatedArtifacts) ||
        !parsed.generatedArtifacts.every(isGeneratedArtifactConfiguration) ||
        typeof parsed.reverseViewPath !== 'string' ||
        (parsed.typescript !== undefined && !isTypescriptConfiguration(parsed.typescript))
    ) {
        throw new Error('traceability configuration does not satisfy the semantic checker contract');
    }
    return {
        artifacts: parsed.artifacts,
        generatedArtifacts: parsed.generatedArtifacts,
        projectRoot: parsed.projectRoot,
        requirements: parsed.requirements,
        reverseViewPath: parsed.reverseViewPath,
        schemaVersion: 1,
        ...(parsed.typescript === undefined ? {} : { typescript: parsed.typescript }),
    };
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRequirementConfiguration(
    value: unknown
): value is TraceabilityRequirementConfiguration {
    return (
        isObject(value) &&
        typeof value.id === 'string' &&
        typeof value.sourcePath === 'string' &&
        (value.noUnitTestReason === undefined || typeof value.noUnitTestReason === 'string')
    );
}

function isArtifactConfiguration(value: unknown): value is TraceabilityArtifactConfiguration {
    return (
        isObject(value) &&
        (value.class === 'implementation' ||
            value.class === 'unit-test' ||
            value.class === 'integration-test' ||
            value.class === 'uat') &&
        (value.locator === 'text' || value.locator === 'typescript') &&
        typeof value.path === 'string'
    );
}

function isGeneratedArtifactConfiguration(
    value: unknown
): value is TraceabilityGeneratedArtifactConfiguration {
    return (
        isObject(value) &&
        typeof value.path === 'string' &&
        typeof value.sourcePath === 'string'
    );
}

function isTypescriptConfiguration(
    value: unknown
): value is TraceabilityTypescriptConfiguration {
    return (
        isObject(value) &&
        typeof value.cliPath === 'string' &&
        typeof value.projectPath === 'string'
    );
}

function findTraceabilityMarkers(source: string): readonly TraceabilityMarker[] {
    const markers: TraceabilityMarker[] = [];
    for (const match of source.matchAll(markerPattern)) {
        const role: string | undefined = match[1];
        const requirementId: string | undefined = match[2];
        if (
            requirementId === undefined ||
            (role !== 'implements' && role !== 'supports' && role !== 'verifies')
        ) {
            continue;
        }
        markers.push({
            line: source.slice(0, match.index).split('\n').length,
            position: match.index,
            requirementId,
            role,
        });
    }
    return markers;
}

function hasAttachedNamedDeclaration(sourceFile: ts.SourceFile, position: number): boolean {
    let attached: boolean = false;
    function visit(node: ts.Node): void {
        if (attached) return;
        if (traceableDeclarationName(node) !== undefined) {
            const ranges: readonly ts.CommentRange[] =
                ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? [];
            if (ranges.some((range: ts.CommentRange): boolean => position >= range.pos && position < range.end)) {
                attached = true;
                return;
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return attached;
}

function traceableDeclarationName(node: ts.Node): string | undefined {
    if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node)
    ) {
        return node.name !== undefined && ts.isIdentifier(node.name) ? node.name.text : undefined;
    }
    if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
        const declaration: ts.VariableDeclaration | undefined =
            node.declarationList.declarations[0];
        if (declaration === undefined) return undefined;
        return ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
    }
    return undefined;
}

function toDiagnostic(diagnostic: ts.Diagnostic): TstsDiagnostic {
    const message: string = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (diagnostic.file === undefined || diagnostic.start === undefined) {
        return {
            message,
            ruleId: 'typescript',
            severity: 'error',
        };
    }
    const location: ts.LineAndCharacter = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
    );
    return {
        column: location.character + 1,
        filePath: diagnostic.file.fileName,
        line: location.line + 1,
        message,
        ruleId: 'typescript',
        severity: 'error',
    };
}
