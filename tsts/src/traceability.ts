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
    readonly class:
        | 'implementation'
        | 'unit-test'
        | 'integration-test'
        | 'uat'
        | 'plan'
        | 'tasklet'
        | 'issue';
    readonly locator: 'text' | 'typescript';
    readonly path: string;
    readonly roles?: readonly TraceabilityRelationshipRole[] | undefined;
}

export interface TraceabilityCompletedArtifactConfiguration
    extends Omit<TraceabilityArtifactConfiguration, 'class'> {
    readonly class: 'implementation' | 'unit-test' | 'integration-test' | 'uat';
}

export type TraceabilityRelationshipRole =
    | 'implements'
    | 'supports'
    | 'verifies'
    | 'plans-implementation'
    | 'plans-verification'
    | 'introduces';

export interface TraceabilityEntityConfiguration {
    readonly annotation?: string | undefined;
    readonly description?: string | undefined;
    readonly id: string;
    readonly kind: string;
    readonly line?: number | undefined;
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

export type TraceabilitySearchableField =
    | 'entityId'
    | 'entityKind'
    | 'role'
    | 'requirementId'
    | 'path'
    | 'unitName'
    | 'annotation'
    | 'description';

export interface TraceabilityIndexConfiguration {
    readonly searchableFields: readonly TraceabilitySearchableField[];
}

interface TraceabilityConfigurationBase {
    readonly artifacts: readonly TraceabilityArtifactConfiguration[];
    readonly generatedArtifacts: readonly TraceabilityGeneratedArtifactConfiguration[];
    readonly projectRoot: string;
    readonly requirements: readonly TraceabilityRequirementConfiguration[];
    readonly reverseViewPath: string;
    readonly typescript?: TraceabilityTypescriptConfiguration | undefined;
}

export interface TraceabilityConfigurationV1 extends TraceabilityConfigurationBase {
    readonly artifacts: readonly TraceabilityCompletedArtifactConfiguration[];
    readonly schemaVersion: 1;
}

export interface TraceabilityConfigurationV2 extends TraceabilityConfigurationBase {
    readonly artifacts: readonly TraceabilityCompletedArtifactConfiguration[];
    readonly index: TraceabilityIndexConfiguration;
    readonly schemaVersion: 2;
}

export interface TraceabilityConfigurationV3 extends TraceabilityConfigurationBase {
    readonly artifacts: readonly TraceabilityArtifactConfiguration[];
    readonly entities: readonly TraceabilityEntityConfiguration[];
    readonly index: TraceabilityIndexConfiguration;
    readonly schemaVersion: 3;
}

type TraceabilityConfiguration =
    | TraceabilityConfigurationV1
    | TraceabilityConfigurationV2
    | TraceabilityConfigurationV3;

interface TraceabilityMarker {
    readonly line: number;
    readonly position: number;
    readonly requirementId: string;
    readonly role: TraceabilityRelationshipRole;
}

const markerPattern: RegExp =
    /[Tt]raceability["']?\s*:\s*["']?(implements|supports|verifies|plans-implementation|plans-verification|introduces)\s+([A-Z][A-Z0-9-]*)(?:\s+from\s+([a-z][a-z0-9-]*)\s+([^\s"'`,;]+))?/gu;

// Traceability: supports REQ-REQUIREMENTS-TRACEABILITY
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
    if (
        !isObject(parsed) ||
        (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3) ||
        typeof parsed.projectRoot !== 'string'
    ) {
        throw new Error('traceability configuration must be a supported versioned object');
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
    const base: TraceabilityConfigurationBase = {
        artifacts: parsed.artifacts,
        generatedArtifacts: parsed.generatedArtifacts,
        projectRoot: parsed.projectRoot,
        requirements: parsed.requirements,
        reverseViewPath: parsed.reverseViewPath,
        ...(parsed.typescript === undefined ? {} : { typescript: parsed.typescript }),
    };
    if (parsed.schemaVersion === 1) {
        if (!base.artifacts.every(isCompletedArtifactConfiguration)) {
            throw new Error('traceability configuration V1 artifact class is invalid');
        }
        return { ...base, artifacts: base.artifacts, schemaVersion: 1 };
    }
    if (!isIndexConfiguration(parsed.index)) {
        throw new Error(`traceability configuration V${parsed.schemaVersion} index is invalid`);
    }
    if (parsed.schemaVersion === 2) {
        if (!base.artifacts.every(isCompletedArtifactConfiguration)) {
            throw new Error('traceability configuration V2 artifact class is invalid');
        }
        return { ...base, artifacts: base.artifacts, index: parsed.index, schemaVersion: 2 };
    }
    if (!Array.isArray(parsed.entities) || !parsed.entities.every(isEntityConfiguration)) {
        throw new Error('traceability configuration V3 entities are invalid');
    }
    return { ...base, entities: parsed.entities, index: parsed.index, schemaVersion: 3 };
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
            value.class === 'uat' ||
            value.class === 'plan' ||
            value.class === 'tasklet' ||
            value.class === 'issue') &&
        (value.locator === 'text' || value.locator === 'typescript') &&
        typeof value.path === 'string' &&
        (value.roles === undefined ||
            (Array.isArray(value.roles) &&
                value.roles.every(
                    (role: unknown): role is TraceabilityRelationshipRole =>
                        role === 'implements' ||
                        role === 'supports' ||
                        role === 'verifies' ||
                        role === 'plans-implementation' ||
                        role === 'plans-verification' ||
                        role === 'introduces'
                )))
    );
}

function isCompletedArtifactConfiguration(
    value: TraceabilityArtifactConfiguration
): value is TraceabilityCompletedArtifactConfiguration {
    return (
        value.class === 'implementation' ||
        value.class === 'unit-test' ||
        value.class === 'integration-test' ||
        value.class === 'uat'
    );
}

function isEntityConfiguration(value: unknown): value is TraceabilityEntityConfiguration {
    return (
        isObject(value) &&
        typeof value.kind === 'string' &&
        typeof value.id === 'string' &&
        typeof value.path === 'string' &&
        (value.line === undefined || typeof value.line === 'number') &&
        (value.annotation === undefined || typeof value.annotation === 'string') &&
        (value.description === undefined || typeof value.description === 'string')
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

function isIndexConfiguration(value: unknown): value is TraceabilityIndexConfiguration {
    const searchableFields: ReadonlySet<string> = new Set([
        'entityId',
        'entityKind',
        'role',
        'requirementId',
        'path',
        'unitName',
        'annotation',
        'description',
    ]);
    return (
        isObject(value) &&
        Array.isArray(value.searchableFields) &&
        value.searchableFields.length > 0 &&
        new Set(value.searchableFields).size === value.searchableFields.length &&
        value.searchableFields.every(
            (searchableField: unknown): searchableField is TraceabilitySearchableField =>
                typeof searchableField === 'string' && searchableFields.has(searchableField)
        )
    );
}

function findTraceabilityMarkers(source: string): readonly TraceabilityMarker[] {
    const markers: TraceabilityMarker[] = [];
    const scanner: ts.Scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        false,
        ts.LanguageVariant.Standard,
        source
    );
    for (
        let token: ts.SyntaxKind = scanner.scan();
        token !== ts.SyntaxKind.EndOfFileToken;
        token = scanner.scan()
    ) {
        if (
            token !== ts.SyntaxKind.SingleLineCommentTrivia &&
            token !== ts.SyntaxKind.MultiLineCommentTrivia
        ) {
            continue;
        }
        const commentStart: number = scanner.getTokenPos();
        const comment: string = scanner.getTokenText();
        for (const match of comment.matchAll(markerPattern)) {
            const role: string | undefined = match[1];
            const requirementId: string | undefined = match[2];
            if (
                requirementId === undefined ||
                (role !== 'implements' && role !== 'supports' && role !== 'verifies')
            ) {
                continue;
            }
            const position: number = commentStart + match.index;
            markers.push({
                line: source.slice(0, position).split('\n').length,
                position,
                requirementId,
                role,
            });
        }
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
