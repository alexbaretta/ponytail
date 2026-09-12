// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import path from 'node:path';
import { readFile } from 'node:fs/promises';

import ts from 'typescript';
import { isLosslessNumber } from 'lossless-json';

import { parseJsonLosslessly } from './lossless-json.js';
import { checkDirectoryStructure } from './directory-structure.js';

export type TstsDiagnosticSeverity = 'error' | 'warning';

export interface TstsDiagnostic {
    readonly column?: number | undefined;
    readonly filePath?: string | undefined;
    readonly line?: number | undefined;
    readonly message: string;
    readonly ruleId: string;
    readonly severity: TstsDiagnosticSeverity;
}

export interface TstsCheckProjectInput {
    readonly configPath?: string | undefined;
    readonly directoryStructurePath?: string | undefined;
    readonly projectPath?: string | undefined;
}

export interface TstsWorkspaceConfig {
    readonly entrypoints?: readonly string[] | undefined;
    readonly name?: string | undefined;
    readonly packageName?: string | undefined;
    readonly projectPath: string;
    readonly publicEntrypoints?: readonly string[] | undefined;
}

export interface TstsConfig {
    readonly noAliasing?: TstsNoAliasingConfig | undefined;
    readonly schemaVersion: 2;
    readonly typeSafeSerdes?: TstsTypeSafeSerdesConfig | undefined;
    readonly unusedCode?: TstsUnusedCodeConfig | undefined;
    readonly versionedDataContracts?: TstsVersionedDataContractsConfig | undefined;
    readonly workspaces: readonly TstsWorkspaceConfig[];
}

export interface TstsNoAliasingConfig {
    readonly severity?: TstsDiagnosticSeverity | undefined;
}

export interface TstsUnusedCodeConfig {
    readonly severity?: TstsDiagnosticSeverity | undefined;
}

export interface TstsVersionedDataContractsConfig {
    readonly familyIds?: readonly string[] | undefined;
    readonly manifestPath: string;
    readonly severity?: TstsDiagnosticSeverity | undefined;
}

export interface TstsTypeSafeSerdesConfig {
    readonly contracts: readonly TstsTypeSafeSerdesContractConfig[];
    readonly severity?: TstsDiagnosticSeverity | undefined;
}

export interface TstsTypeSafeSerdesContractConfig {
    readonly canonicalSchemaName: string;
    readonly canonicalTypeName: string;
    readonly contractName?: string | undefined;
    readonly propertyNames: readonly string[];
}

export interface TstsCheckResult {
    readonly checkedFileCount: number;
    readonly diagnostics: readonly TstsDiagnostic[];
}

interface DeclarationIndex {
    readonly interfaces: ReadonlyMap<string, ts.InterfaceDeclaration>;
    readonly stringConstants: ReadonlyMap<string, string>;
    readonly typeAliases: ReadonlyMap<string, ts.TypeAliasDeclaration>;
}

interface RequiredProperty {
    readonly literalValue?: string | undefined;
}

type RequiredPropertyMap = ReadonlyMap<string, RequiredProperty>;

interface DiscriminatedUnionDescriptor {
    readonly discriminatorFieldName: string;
    readonly discriminatorValues: readonly string[];
    readonly unionName: string;
}

interface ExhaustiveSwitchDescriptor {
    readonly discriminatorValues: readonly ExhaustiveSwitchValue[];
    readonly displayName: string;
}

interface ExhaustiveSwitchValue {
    readonly key: string;
    readonly label: string;
}

export async function checkProject(input: TstsCheckProjectInput): Promise<TstsCheckResult> {
    const diagnostics: TstsDiagnostic[] = [];
    let checkedFileCount: number = 0;
    const projectPath: string | undefined =
        input.projectPath ?? (input.configPath === undefined ? 'tsconfig.json' : undefined);

    const parsedCommandLine: ts.ParsedCommandLine | undefined =
        projectPath === undefined
            ? undefined
            : ts.getParsedCommandLineOfConfigFile(
                  path.resolve(projectPath),
                  {},
                  {
                      fileExists: ts.sys.fileExists,
                      getCurrentDirectory: ts.sys.getCurrentDirectory,
                      onUnRecoverableConfigFileDiagnostic: (diagnostic: ts.Diagnostic): void => {
                          diagnostics.push(toTstsDiagnostic(diagnostic));
                      },
                      readDirectory: ts.sys.readDirectory,
                      readFile: ts.sys.readFile,
                      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
                  }
              );

    if (parsedCommandLine !== undefined) {
        const program: ts.Program = ts.createProgram(
            parsedCommandLine.fileNames,
            parsedCommandLine.options
        );
        const sourceFiles: readonly ts.SourceFile[] = program
            .getSourceFiles()
            .filter((sourceFile: ts.SourceFile): boolean => !sourceFile.isDeclarationFile);
        const declarationIndex: DeclarationIndex = buildDeclarationIndex(sourceFiles);
        const publicUnionAnalysis: PublicUnionAnalysis = analyzePublicUnions({
            declarationIndex,
            sourceFiles,
        });
        diagnostics.push(...publicUnionAnalysis.diagnostics);

        for (const sourceFile of sourceFiles) {
            diagnostics.push(
                ...checkSourceFileDiscriminatedUnionDispatch({
                    checker: program.getTypeChecker(),
                    publicUnionDescriptors: publicUnionAnalysis.publicUnionDescriptors,
                    sourceFile,
                })
            );
        }

        checkedFileCount += sourceFiles.length;
    }

    if (input.configPath !== undefined) {
        const configuredAnalysisResult: TstsCheckResult = await checkConfiguredProject({
            configPath: input.configPath,
        });

        diagnostics.push(...configuredAnalysisResult.diagnostics);

        checkedFileCount += configuredAnalysisResult.checkedFileCount;
    }

    if (input.directoryStructurePath !== undefined) {
        const directoryStructureResult: TstsCheckResult = await checkDirectoryStructure(
            input.directoryStructurePath
        );
        checkedFileCount += directoryStructureResult.checkedFileCount;
        diagnostics.push(...directoryStructureResult.diagnostics);
    }

    return {
        checkedFileCount,
        diagnostics,
    };
}

export function formatTextReport(result: TstsCheckResult): string {
    if (result.diagnostics.length === 0) {
        return `TSTS checked ${result.checkedFileCount} files: no violations found.`;
    }

    const lines: string[] = result.diagnostics.map((diagnostic: TstsDiagnostic): string => {
        const location: string = formatDiagnosticLocation(diagnostic);

        return `${location}${diagnostic.severity} ${diagnostic.ruleId}: ${diagnostic.message}`;
    });

    return lines.join('\n');
}

function formatDiagnosticLocation(diagnostic: TstsDiagnostic): string {
    if (diagnostic.filePath === undefined) {
        return '';
    }

    if (diagnostic.line === undefined) {
        return `${diagnostic.filePath}: `;
    }

    if (diagnostic.column === undefined) {
        return `${diagnostic.filePath}:${diagnostic.line}: `;
    }

    return `${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}: `;
}

async function checkConfiguredProject(input: {
    readonly configPath: string;
}): Promise<TstsCheckResult> {
    const resolvedConfigPath: string = path.resolve(input.configPath);
    const diagnostics: TstsDiagnostic[] = [];

    try {
        const config: TstsConfig = await loadTstsConfig(resolvedConfigPath);
        const noAliasingSeverity: TstsDiagnosticSeverity = config.noAliasing?.severity ?? 'error';
        const configDirectory: string = path.dirname(resolvedConfigPath);
        const graph: UnusedCodeGraph = await buildUnusedCodeGraph({
            config,
            configDirectory,
            diagnostics,
        });
        diagnostics.push(...checkDiscriminatedUnionDispatch(graph.workspaces));

        if (config.noAliasing !== undefined) {
            diagnostics.push(
                ...checkNoAliasing({
                    graph,
                    severity: noAliasingSeverity,
                })
            );
        }

        if (config.typeSafeSerdes !== undefined) {
            diagnostics.push(
                ...checkTypeSafeSerdes({
                    graph,
                    config: config.typeSafeSerdes,
                })
            );
        }

        if (config.versionedDataContracts !== undefined) {
            diagnostics.push(
                ...(await checkVersionedDataContracts({
                    config: config.versionedDataContracts,
                    configDirectory,
                    graph,
                }))
            );
        }

        if (config.unusedCode !== undefined) {
            const unusedCodeSeverity: TstsDiagnosticSeverity =
                config.unusedCode.severity ?? 'error';
            const reachability: ReachabilityState = computeReachability({
                diagnostics,
                graph,
            });

            for (const declaration of graph.declarationById.values()) {
                const startPosition: number = declaration.declaration.getStart();
                const location: ts.LineAndCharacter = declaration.declaration
                    .getSourceFile()
                    .getLineAndCharacterOfPosition(startPosition);

                if (
                    declaration.kind.type &&
                    !reachability.reachableTypeDeclarations.has(declaration.declarationId)
                ) {
                    diagnostics.push({
                        column: location.character + 1,
                        filePath: declaration.filePath,
                        line: location.line + 1,
                        message: `Unused type declaration "${declaration.declarationName}" is not reachable from configured entrypoints.`,
                        ruleId: 'unused-type',
                        severity: unusedCodeSeverity,
                    });
                }

                if (
                    declaration.kind.value &&
                    !reachability.reachableValueDeclarations.has(declaration.declarationId)
                ) {
                    diagnostics.push({
                        column: location.character + 1,
                        filePath: declaration.filePath,
                        line: location.line + 1,
                        message: `Unused value declaration "${declaration.declarationName}" is not reachable from configured entrypoints.`,
                        ruleId: 'unused-value',
                        severity: unusedCodeSeverity,
                    });
                }
            }
        }

        return {
            checkedFileCount: graph.sourceFiles.length,
            diagnostics,
        };
    } catch (error: unknown) {
        return {
            checkedFileCount: 0,
            diagnostics: [
                ...diagnostics,
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unable to load or parse the tsts config.',
                    ruleId: 'tsts-config',
                    severity: 'error',
                },
            ],
        };
    }
}

function checkDiscriminatedUnionDispatch(
    workspaces: readonly LoadedWorkspace[]
): readonly TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];
    const publicUnionDescriptors: ReadonlyMap<string, DiscriminatedUnionDescriptor> = new Map();

    for (const workspace of workspaces) {
        for (const sourceFile of workspace.sourceFiles) {
            diagnostics.push(
                ...checkSourceFileDiscriminatedUnionDispatch({
                    checker: workspace.checker,
                    publicUnionDescriptors,
                    sourceFile,
                })
            );
        }
    }

    return diagnostics;
}

interface LoadedWorkspace {
    readonly checker: ts.TypeChecker;
    readonly config: TstsWorkspaceConfig;
    readonly exportedTypeDeclarationIds: Set<string>;
    readonly exportedTypeDeclarationIdsByName: Map<string, Set<string>>;
    readonly exportedValueDeclarationIds: Set<string>;
    readonly exportedValueDeclarationIdsByName: Map<string, Set<string>>;
    readonly rootPath: string;
    readonly sourceFiles: readonly ts.SourceFile[];
}

interface DeclCandidate {
    readonly declaration: ts.NamedDeclaration;
    readonly declarationId: string;
    readonly declarationName: string;
    readonly filePath: string;
    readonly kind: DeclUsageKind;
}

interface DeclUsageKind {
    readonly type: boolean;
    readonly value: boolean;
}

interface DeclUsageEdges {
    readonly executedFilePaths: Set<string>;
    readonly referencesByType: Set<string>;
    readonly referencesByValue: Set<string>;
}

interface FileUsageEdges {
    readonly executedFilePaths: Set<string>;
    readonly referencesByType: Set<string>;
    readonly referencesByValue: Set<string>;
}

interface ImportedSymbolTargets {
    readonly referencesByType: Set<string>;
    readonly referencesByValue: Set<string>;
}

interface UnusedCodeGraph {
    readonly declarationById: Map<string, DeclCandidate>;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly declarationEdges: Map<string, DeclUsageEdges>;
    readonly fileEdges: Map<string, FileUsageEdges>;
    readonly fileToDeclarationIds: Map<string, string[]>;
    readonly globalEdges: FileUsageEdges;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceFilePathSet: Set<string>;
    readonly sourceFiles: readonly ts.SourceFile[];
    readonly workspaces: readonly LoadedWorkspace[];
    readonly workspaceByPackageName: Map<string, LoadedWorkspace>;
}

interface ReachabilityState {
    readonly reachableTypeDeclarations: Set<string>;
    readonly reachableValueDeclarations: Set<string>;
}

async function buildUnusedCodeGraph(input: {
    readonly config: TstsConfig;
    readonly configDirectory: string;
    readonly diagnostics: TstsDiagnostic[];
}): Promise<UnusedCodeGraph> {
    const declarationById: Map<string, DeclCandidate> = new Map();
    const declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets> = new Map();
    const declarationEdges: Map<string, DeclUsageEdges> = new Map();
    const fileEdges: Map<string, FileUsageEdges> = new Map();
    const fileToDeclarationIds: Map<string, string[]> = new Map();
    const globalEdges: FileUsageEdges = {
        executedFilePaths: new Set(),
        referencesByType: new Set(),
        referencesByValue: new Set(),
    };
    const importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets> = new Map();
    const sourceFilePathSet: Set<string> = new Set();
    const sourceFiles: ts.SourceFile[] = [];
    const workspaces: LoadedWorkspace[] = [];
    const workspaceByPackageName: Map<string, LoadedWorkspace> = new Map();

    for (const workspaceConfig of input.config.workspaces) {
        const projectPath: string = path.resolve(
            input.configDirectory,
            workspaceConfig.projectPath
        );
        const parsedCommandLine: ts.ParsedCommandLine | undefined =
            ts.getParsedCommandLineOfConfigFile(
                projectPath,
                {},
                {
                    fileExists: ts.sys.fileExists,
                    getCurrentDirectory: ts.sys.getCurrentDirectory,
                    onUnRecoverableConfigFileDiagnostic: (diagnostic: ts.Diagnostic): void => {
                        input.diagnostics.push(toTstsDiagnostic(diagnostic));
                    },
                    readDirectory: ts.sys.readDirectory,
                    readFile: ts.sys.readFile,
                    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
                }
            );

        if (parsedCommandLine === undefined) {
            throw new Error(`Cannot load TypeScript config at ${projectPath}.`);
        }

        const program: ts.Program = ts.createProgram(
            parsedCommandLine.fileNames,
            parsedCommandLine.options
        );
        const checker: ts.TypeChecker = program.getTypeChecker();
        const projectFilePaths: ReadonlySet<string> = new Set(parsedCommandLine.fileNames);
        const workspaceSourceFiles: ts.SourceFile[] = program
            .getSourceFiles()
            .filter(
                (sourceFile: ts.SourceFile): boolean =>
                    !sourceFile.isDeclarationFile || projectFilePaths.has(sourceFile.fileName)
            );
        const workspace: LoadedWorkspace = {
            checker,
            config: workspaceConfig,
            exportedTypeDeclarationIds: new Set(),
            exportedTypeDeclarationIdsByName: new Map(),
            exportedValueDeclarationIds: new Set(),
            exportedValueDeclarationIdsByName: new Map(),
            rootPath: path.dirname(projectPath),
            sourceFiles: workspaceSourceFiles,
        };

        if (workspaceConfig.packageName !== undefined) {
            workspaceByPackageName.set(workspaceConfig.packageName, workspace);
        }

        for (const sourceFile of workspaceSourceFiles) {
            if (!sourceFilePathSet.has(sourceFile.fileName)) {
                sourceFiles.push(sourceFile);
                sourceFilePathSet.add(sourceFile.fileName);
            }

            const declarationIds: string[] = collectTopLevelDeclarationsFromSourceFile({
                checker,
                declarationById,
                declarationBySymbol,
                filePath: sourceFile.fileName,
                sourceFile,
            });
            fileToDeclarationIds.set(sourceFile.fileName, declarationIds);
        }

        workspaces.push(workspace);
    }

    for (const workspace of workspaces) {
        for (const sourceFile of workspace.sourceFiles) {
            indexWorkspaceExports({
                declarationById,
                fileToDeclarationIds,
                sourceFile,
                workspace,
            });
        }
    }

    let addedCrossWorkspaceExport: boolean;
    do {
        addedCrossWorkspaceExport = false;
        for (const workspace of workspaces) {
            for (const sourceFile of workspace.sourceFiles) {
                addedCrossWorkspaceExport =
                    indexCrossWorkspaceExports({
                        sourceFile,
                        workspace,
                        workspaceByPackageName,
                    }) || addedCrossWorkspaceExport;
            }
        }
    } while (addedCrossWorkspaceExport);

    for (const workspace of workspaces) {
        for (const sourceFile of workspace.sourceFiles) {
            processImportDeclarations({
                checker: workspace.checker,
                importTargetsBySymbol,
                sourceFile,
                workspaceByPackageName,
            });
            collectSourceFileEntryReferences({
                checker: workspace.checker,
                declarationBySymbol,
                fileEdges,
                importTargetsBySymbol,
                sourceFile,
            });
            collectGlobalAugmentationReferences({
                checker: workspace.checker,
                declarationBySymbol,
                globalEdges,
                importTargetsBySymbol,
                sourceFile,
            });

            for (const declarationId of fileToDeclarationIds.get(sourceFile.fileName) ?? []) {
                const declaration: DeclCandidate | undefined = declarationById.get(declarationId);

                if (declaration === undefined) {
                    continue;
                }

                collectReferenceUsage({
                    checker: workspace.checker,
                    declarationBySymbol,
                    importTargetsBySymbol,
                    sourceDeclId: declarationId,
                    sourceNodes: declaration.declaration,
                    targetDeclarationEdges: declarationEdges,
                    usageKind: declaration.kind.value ? 'value' : 'type',
                });
            }
        }
    }

    return {
        declarationById,
        declarationBySymbol,
        declarationEdges,
        fileEdges,
        fileToDeclarationIds,
        globalEdges,
        importTargetsBySymbol,
        sourceFilePathSet,
        sourceFiles,
        workspaces,
        workspaceByPackageName,
    };
}

function computeReachability(input: {
    readonly diagnostics: TstsDiagnostic[];
    readonly graph: UnusedCodeGraph;
}): ReachabilityState {
    const reachableTypeDeclarations: Set<string> = new Set();
    const reachableValueDeclarations: Set<string> = new Set();
    const reachableFileExecutions: Set<string> = new Set();
    const typeDeclarationQueue: string[] = [];
    const valueDeclarationQueue: string[] = [];

    const queueTypeDeclaration = (declarationId: string): void => {
        if (reachableTypeDeclarations.has(declarationId)) {
            return;
        }

        reachableTypeDeclarations.add(declarationId);
        typeDeclarationQueue.push(declarationId);
    };

    const queueValueDeclaration = (declarationId: string): void => {
        if (reachableValueDeclarations.has(declarationId)) {
            return;
        }

        reachableValueDeclarations.add(declarationId);
        valueDeclarationQueue.push(declarationId);

        const declaration: DeclCandidate | undefined =
            input.graph.declarationById.get(declarationId);

        if (declaration?.kind.type) {
            queueTypeDeclaration(declarationId);
        }

        if (declaration !== undefined) {
            queueFileExecution(declaration.filePath);
        }
    };

    const queueFileExecution = (filePath: string): void => {
        if (reachableFileExecutions.has(filePath)) {
            return;
        }

        reachableFileExecutions.add(filePath);
        const fileEdges: FileUsageEdges | undefined = input.graph.fileEdges.get(filePath);
        if (fileEdges === undefined) {
            return;
        }

        for (const declarationId of fileEdges.referencesByType) {
            queueTypeDeclaration(declarationId);
        }

        for (const declarationId of fileEdges.referencesByValue) {
            queueValueDeclaration(declarationId);
        }

        for (const executedFilePath of fileEdges.executedFilePaths) {
            queueFileExecution(executedFilePath);
        }
    };

    for (const declarationId of input.graph.globalEdges.referencesByType) {
        queueTypeDeclaration(declarationId);
    }

    for (const declarationId of input.graph.globalEdges.referencesByValue) {
        queueValueDeclaration(declarationId);
    }

    for (const workspace of input.graph.workspaces) {
        for (const entrypoint of workspace.config.entrypoints ?? []) {
            const entrypointPath: string = path.resolve(workspace.rootPath, entrypoint);

            if (!input.graph.sourceFilePathSet.has(entrypointPath)) {
                input.diagnostics.push({
                    filePath: entrypointPath,
                    message: `Entrypoint file does not resolve in workspace config: ${entrypoint}`,
                    ruleId: 'tsts-config',
                    severity: 'error',
                });
                continue;
            }

            queueFileExecution(entrypointPath);
        }

        for (const entrypoint of workspace.config.publicEntrypoints ?? []) {
            const entrypointPath: string = path.resolve(workspace.rootPath, entrypoint);

            if (!input.graph.sourceFilePathSet.has(entrypointPath)) {
                input.diagnostics.push({
                    filePath: entrypointPath,
                    message: `Public entrypoint file does not resolve in workspace config: ${entrypoint}`,
                    ruleId: 'tsts-config',
                    severity: 'error',
                });
                continue;
            }

            queueFileExecution(entrypointPath);
            for (const declarationId of input.graph.fileToDeclarationIds.get(entrypointPath) ??
                []) {
                if (workspace.exportedTypeDeclarationIds.has(declarationId)) {
                    queueTypeDeclaration(declarationId);
                }
                if (workspace.exportedValueDeclarationIds.has(declarationId)) {
                    queueValueDeclaration(declarationId);
                }
            }
        }
    }

    while (typeDeclarationQueue.length > 0 || valueDeclarationQueue.length > 0) {
        const valueDeclarationId: string | undefined = valueDeclarationQueue.shift();

        if (valueDeclarationId !== undefined) {
            const edges: DeclUsageEdges | undefined =
                input.graph.declarationEdges.get(valueDeclarationId);

            if (edges !== undefined) {
                for (const referencedId of edges.referencesByType) {
                    queueTypeDeclaration(referencedId);
                }

                for (const referencedId of edges.referencesByValue) {
                    queueValueDeclaration(referencedId);
                }

                for (const executedFilePath of edges.executedFilePaths) {
                    queueFileExecution(executedFilePath);
                }
            }
        }

        const typeDeclarationId: string | undefined = typeDeclarationQueue.shift();

        if (typeDeclarationId !== undefined) {
            const edges: DeclUsageEdges | undefined =
                input.graph.declarationEdges.get(typeDeclarationId);

            if (edges !== undefined) {
                for (const referencedId of edges.referencesByType) {
                    queueTypeDeclaration(referencedId);
                }

                for (const referencedId of edges.referencesByValue) {
                    queueValueDeclaration(referencedId);
                }

                for (const executedFilePath of edges.executedFilePaths) {
                    queueFileExecution(executedFilePath);
                }
            }
        }
    }

    return {
        reachableTypeDeclarations,
        reachableValueDeclarations,
    };
}

function collectTopLevelDeclarationsFromSourceFile(input: {
    readonly checker: ts.TypeChecker;
    readonly declarationById: Map<string, DeclCandidate>;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly filePath: string;
    readonly sourceFile: ts.SourceFile;
}): string[] {
    const declarationIds: string[] = [];

    for (const statement of input.sourceFile.statements) {
        const declarationInputs: readonly TopLevelDeclarationInput[] =
            getTopLevelDeclarationInputs(statement);

        for (const declarationInput of declarationInputs) {
            const declarationId: string | undefined = addTopLevelDeclaration({
                checker: input.checker,
                declaration: declarationInput.declaration,
                declarationById: input.declarationById,
                declarationBySymbol: input.declarationBySymbol,
                declarationKind: declarationInput.declarationKind,
                declarationName: declarationInput.declarationName,
                declarationNameNode: declarationInput.declarationNameNode,
                filePath: input.filePath,
            });

            if (declarationId !== undefined) {
                declarationIds.push(declarationId);
            }
        }
    }

    return [...new Set(declarationIds)];
}

interface TopLevelDeclarationInput {
    readonly declaration: ts.NamedDeclaration;
    readonly declarationKind: DeclUsageKind;
    readonly declarationName: string;
    readonly declarationNameNode: ts.Identifier;
}

function getTopLevelDeclarationInputs(
    statement: ts.Statement
): readonly TopLevelDeclarationInput[] {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
        return [
            {
                declaration: statement,
                declarationKind: { type: false, value: true },
                declarationName: statement.name.text,
                declarationNameNode: statement.name,
            },
        ];
    }

    if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
        return [
            {
                declaration: statement,
                declarationKind: { type: true, value: true },
                declarationName: statement.name.text,
                declarationNameNode: statement.name,
            },
        ];
    }

    if (ts.isInterfaceDeclaration(statement)) {
        return [
            {
                declaration: statement,
                declarationKind: { type: true, value: false },
                declarationName: statement.name.text,
                declarationNameNode: statement.name,
            },
        ];
    }

    if (ts.isTypeAliasDeclaration(statement)) {
        return [
            {
                declaration: statement,
                declarationKind: { type: true, value: false },
                declarationName: statement.name.text,
                declarationNameNode: statement.name,
            },
        ];
    }

    if (ts.isEnumDeclaration(statement)) {
        return [
            {
                declaration: statement,
                declarationKind: { type: true, value: true },
                declarationName: statement.name.text,
                declarationNameNode: statement.name,
            },
        ];
    }

    if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.flatMap(
            (declaration: ts.VariableDeclaration): readonly TopLevelDeclarationInput[] => {
                if (!ts.isIdentifier(declaration.name)) {
                    return [];
                }

                return [
                    {
                        declaration,
                        declarationKind: { type: false, value: true },
                        declarationName: declaration.name.text,
                        declarationNameNode: declaration.name,
                    },
                ];
            }
        );
    }

    return [];
}

function addTopLevelDeclaration(input: {
    readonly checker: ts.TypeChecker;
    readonly declaration: ts.NamedDeclaration;
    readonly declarationById: Map<string, DeclCandidate>;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly declarationKind: DeclUsageKind;
    readonly declarationName: string;
    readonly declarationNameNode: ts.Identifier;
    readonly filePath: string;
}): string | undefined {
    const symbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(
        input.declarationNameNode
    );

    if (symbol === undefined) {
        return undefined;
    }

    const declarationId: string = createDeclarationId(
        input.declaration,
        input.filePath,
        input.declarationNameNode
    );

    if (!input.declarationById.has(declarationId)) {
        input.declarationById.set(declarationId, {
            declaration: input.declaration,
            declarationId,
            declarationName: input.declarationName,
            filePath: input.filePath,
            kind: input.declarationKind,
        });
    }

    const declarationTargets: ImportedSymbolTargets = input.declarationBySymbol.get(symbol) ?? {
        referencesByType: new Set(),
        referencesByValue: new Set(),
    };
    if (input.declarationKind.type) {
        declarationTargets.referencesByType.add(declarationId);
    }
    if (input.declarationKind.value) {
        declarationTargets.referencesByValue.add(declarationId);
    }
    input.declarationBySymbol.set(symbol, declarationTargets);

    return declarationId;
}

function createDeclarationId(declaration: ts.Node, filePath: string, name: ts.Identifier): string {
    return `${filePath}#${name.text}#${declaration.getStart()}`;
}

function indexWorkspaceExports(input: {
    readonly declarationById: Map<string, DeclCandidate>;
    readonly fileToDeclarationIds: Map<string, string[]>;
    readonly sourceFile: ts.SourceFile;
    readonly workspace: LoadedWorkspace;
}): void {
    for (const declarationId of input.fileToDeclarationIds.get(input.sourceFile.fileName) ?? []) {
        const declaration: DeclCandidate | undefined = input.declarationById.get(declarationId);

        if (declaration !== undefined && isExportedDeclaration(declaration.declaration)) {
            addWorkspaceExport({
                declaration,
                exportName: declaration.declarationName,
                workspace: input.workspace,
            });
        }
    }

    for (const statement of input.sourceFile.statements) {
        if (!ts.isExportDeclaration(statement)) {
            continue;
        }

        const targetDeclarationIds: readonly string[] =
            statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
                ? resolveModuleDeclarationIds({
                      checker: input.workspace.checker,
                      fileToDeclarationIds: input.fileToDeclarationIds,
                      moduleSpecifier: statement.moduleSpecifier,
                  })
                : (input.fileToDeclarationIds.get(input.sourceFile.fileName) ?? []);

        if (statement.exportClause === undefined) {
            for (const declarationId of targetDeclarationIds) {
                const declaration: DeclCandidate | undefined =
                    input.declarationById.get(declarationId);

                if (declaration !== undefined) {
                    addWorkspaceExport({
                        declaration,
                        exportName: declaration.declarationName,
                        workspace: input.workspace,
                    });
                }
            }

            continue;
        }

        if (!ts.isNamedExports(statement.exportClause)) {
            continue;
        }

        for (const exportSpecifier of statement.exportClause.elements) {
            const sourceName: string =
                exportSpecifier.propertyName?.text ?? exportSpecifier.name.text;
            const exportName: string = exportSpecifier.name.text;

            for (const declarationId of targetDeclarationIds) {
                const declaration: DeclCandidate | undefined =
                    input.declarationById.get(declarationId);

                if (declaration?.declarationName === sourceName) {
                    addWorkspaceExport({ declaration, exportName, workspace: input.workspace });
                }
            }
        }
    }
}

function addWorkspaceExport(input: {
    readonly declaration: DeclCandidate;
    readonly exportName: string;
    readonly workspace: LoadedWorkspace;
}): void {
    if (input.declaration.kind.type) {
        input.workspace.exportedTypeDeclarationIds.add(input.declaration.declarationId);
        addNamedExport(
            input.workspace.exportedTypeDeclarationIdsByName,
            input.exportName,
            input.declaration.declarationId
        );
    }

    if (input.declaration.kind.value) {
        input.workspace.exportedValueDeclarationIds.add(input.declaration.declarationId);
        addNamedExport(
            input.workspace.exportedValueDeclarationIdsByName,
            input.exportName,
            input.declaration.declarationId
        );
    }
}

function indexCrossWorkspaceExports(input: {
    readonly sourceFile: ts.SourceFile;
    readonly workspace: LoadedWorkspace;
    readonly workspaceByPackageName: Map<string, LoadedWorkspace>;
}): boolean {
    let addedExport = false;

    for (const statement of input.sourceFile.statements) {
        if (
            !ts.isExportDeclaration(statement) ||
            statement.moduleSpecifier === undefined ||
            !ts.isStringLiteral(statement.moduleSpecifier)
        ) {
            continue;
        }

        const targetWorkspace = resolveWorkspaceImport({
            moduleName: statement.moduleSpecifier.text,
            workspaceByPackageName: input.workspaceByPackageName,
        });
        if (targetWorkspace === undefined || targetWorkspace === input.workspace) {
            continue;
        }

        if (statement.exportClause === undefined) {
            for (const [name, declarationIds] of targetWorkspace.exportedTypeDeclarationIdsByName) {
                addedExport =
                    addWorkspaceExportTargets({
                        declarationIds,
                        exportName: name,
                        exportedDeclarationIds: input.workspace.exportedTypeDeclarationIds,
                        exportedDeclarationIdsByName:
                            input.workspace.exportedTypeDeclarationIdsByName,
                    }) || addedExport;
            }
            if (!statement.isTypeOnly) {
                for (const [
                    name,
                    declarationIds,
                ] of targetWorkspace.exportedValueDeclarationIdsByName) {
                    addedExport =
                        addWorkspaceExportTargets({
                            declarationIds,
                            exportName: name,
                            exportedDeclarationIds: input.workspace.exportedValueDeclarationIds,
                            exportedDeclarationIdsByName:
                                input.workspace.exportedValueDeclarationIdsByName,
                        }) || addedExport;
                }
            }
            continue;
        }

        if (!ts.isNamedExports(statement.exportClause)) {
            continue;
        }

        for (const specifier of statement.exportClause.elements) {
            const sourceName = specifier.propertyName?.text ?? specifier.name.text;
            const exportName = specifier.name.text;
            addedExport =
                addWorkspaceExportTargets({
                    declarationIds:
                        targetWorkspace.exportedTypeDeclarationIdsByName.get(sourceName) ?? [],
                    exportName,
                    exportedDeclarationIds: input.workspace.exportedTypeDeclarationIds,
                    exportedDeclarationIdsByName: input.workspace.exportedTypeDeclarationIdsByName,
                }) || addedExport;
            if (!statement.isTypeOnly && !specifier.isTypeOnly) {
                addedExport =
                    addWorkspaceExportTargets({
                        declarationIds:
                            targetWorkspace.exportedValueDeclarationIdsByName.get(sourceName) ?? [],
                        exportName,
                        exportedDeclarationIds: input.workspace.exportedValueDeclarationIds,
                        exportedDeclarationIdsByName:
                            input.workspace.exportedValueDeclarationIdsByName,
                    }) || addedExport;
            }
        }
    }

    return addedExport;
}

function addWorkspaceExportTargets(input: {
    readonly declarationIds: Iterable<string>;
    readonly exportName: string;
    readonly exportedDeclarationIds: Set<string>;
    readonly exportedDeclarationIdsByName: Map<string, Set<string>>;
}): boolean {
    let addedExport = false;
    for (const declarationId of input.declarationIds) {
        addedExport =
            !input.exportedDeclarationIds.has(declarationId) ||
            !input.exportedDeclarationIdsByName
                .get(input.exportName)
                ?.has(declarationId) ||
            addedExport;
        input.exportedDeclarationIds.add(declarationId);
        addNamedExport(input.exportedDeclarationIdsByName, input.exportName, declarationId);
    }
    return addedExport;
}

function addNamedExport(
    declarationsByName: Map<string, Set<string>>,
    exportName: string,
    declarationId: string
): void {
    const declarationIds: Set<string> = declarationsByName.get(exportName) ?? new Set();
    declarationIds.add(declarationId);
    declarationsByName.set(exportName, declarationIds);
}

function resolveModuleDeclarationIds(input: {
    readonly checker: ts.TypeChecker;
    readonly fileToDeclarationIds: Map<string, string[]>;
    readonly moduleSpecifier: ts.StringLiteral;
}): readonly string[] {
    const moduleSymbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(
        input.moduleSpecifier
    );

    if (moduleSymbol === undefined) {
        return [];
    }

    const declarationIds: string[] = [];

    for (const declaration of moduleSymbol.declarations ?? []) {
        if (ts.isSourceFile(declaration)) {
            declarationIds.push(...(input.fileToDeclarationIds.get(declaration.fileName) ?? []));
        }
    }

    return declarationIds;
}

interface ReferenceUsageOptions {
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceDeclId?: string | undefined;
    readonly sourceNodes: ts.Node | ts.NodeArray<ts.Node>;
    readonly targetDeclarationEdges?: Map<string, DeclUsageEdges> | undefined;
    readonly usageEdges?: FileUsageEdges | undefined;
    readonly usageKind: UsageKind;
}

type UsageKind = 'type' | 'value';

function collectSourceFileEntryReferences(input: {
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly fileEdges: Map<string, FileUsageEdges>;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceFile: ts.SourceFile;
}): void {
    const fileEdges: FileUsageEdges = getFileUsageEdges(input.fileEdges, input.sourceFile.fileName);

    for (const statement of input.sourceFile.statements) {
        if (isTopLevelDeclarationStatement(statement) || ts.isImportDeclaration(statement)) {
            continue;
        }

        collectReferenceUsage({
            checker: input.checker,
            declarationBySymbol: input.declarationBySymbol,
            importTargetsBySymbol: input.importTargetsBySymbol,
            sourceNodes: statement,
            usageEdges: fileEdges,
            usageKind: 'value',
        });
    }
}

function collectGlobalAugmentationReferences(input: {
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly globalEdges: FileUsageEdges;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceFile: ts.SourceFile;
}): void {
    for (const statement of input.sourceFile.statements) {
        if (
            !ts.isModuleDeclaration(statement) ||
            (statement.flags & ts.NodeFlags.GlobalAugmentation) === 0
        ) {
            continue;
        }

        collectReferenceUsage({
            checker: input.checker,
            declarationBySymbol: input.declarationBySymbol,
            importTargetsBySymbol: input.importTargetsBySymbol,
            sourceNodes: statement,
            usageEdges: input.globalEdges,
            usageKind: 'type',
        });
    }
}

function collectReferenceUsage(input: ReferenceUsageOptions): void {
    const targetEdges: DeclUsageEdges | undefined =
        input.targetDeclarationEdges !== undefined && input.sourceDeclId !== undefined
            ? getDeclarationEdges(input.targetDeclarationEdges, input.sourceDeclId)
            : undefined;
    const nodes: readonly ts.Node[] = Array.isArray(input.sourceNodes)
        ? (input.sourceNodes as readonly ts.Node[])
        : [input.sourceNodes as ts.Node];

    for (const node of nodes) {
        visitReferenceNode({
            checker: input.checker,
            declarationBySymbol: input.declarationBySymbol,
            importTargetsBySymbol: input.importTargetsBySymbol,
            node,
            sourceDeclId: input.sourceDeclId,
            targetEdges,
            usageEdges: input.usageEdges,
            usageKind: input.usageKind,
        });
    }
}

function visitReferenceNode(input: {
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly node: ts.Node;
    readonly sourceDeclId?: string | undefined;
    readonly targetEdges?: DeclUsageEdges | undefined;
    readonly usageEdges?: FileUsageEdges | undefined;
    readonly usageKind: UsageKind;
}): void {
    if (
        ts.isCallExpression(input.node) &&
        input.node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
        addDynamicImportReferences({
            ...input,
            callExpression: input.node,
        });
    }

    if (ts.isIdentifier(input.node) && !isDeclarationName(input.node)) {
        const referenceKind: UsageKind = isValueReferenceInTypeContext(input.node)
            ? 'value'
            : isTypeContext(input.node)
              ? 'type'
              : input.usageKind;
        const symbol: ts.Symbol | undefined =
            ts.isShorthandPropertyAssignment(input.node.parent) &&
            input.node.parent.name === input.node
                ? input.checker.getShorthandAssignmentValueSymbol(input.node.parent)
                : input.checker.getSymbolAtLocation(input.node);

        if (symbol !== undefined) {
            addSymbolReference({
                checker: input.checker,
                declarationBySymbol: input.declarationBySymbol,
                importTargetsBySymbol: input.importTargetsBySymbol,
                referenceKind,
                sourceDeclId: input.sourceDeclId,
                symbol,
                targetEdges: input.targetEdges,
                usageEdges: input.usageEdges,
            });
        }
    }

    ts.forEachChild(input.node, (child: ts.Node): void => {
        visitReferenceNode({
            ...input,
            node: child,
        });
    });
}

function addDynamicImportReferences(input: {
    readonly callExpression: ts.CallExpression;
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceDeclId?: string | undefined;
    readonly targetEdges?: DeclUsageEdges | undefined;
    readonly usageEdges?: FileUsageEdges | undefined;
}): void {
    const moduleSpecifier: ts.Expression | undefined = input.callExpression.arguments[0];
    if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) {
        return;
    }

    const moduleSymbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(moduleSpecifier);
    for (const declaration of moduleSymbol?.declarations ?? []) {
        if (ts.isSourceFile(declaration)) {
            input.targetEdges?.executedFilePaths.add(declaration.fileName);
            input.usageEdges?.executedFilePaths.add(declaration.fileName);
        }
    }

    const bindingPattern: ts.ObjectBindingPattern | undefined =
        getDynamicImportObjectBindingPattern(input.callExpression);
    if (bindingPattern === undefined) {
        return;
    }

    const moduleType: ts.Type | undefined = input.checker.getAwaitedType(
        input.checker.getTypeAtLocation(input.callExpression)
    );
    if (moduleType === undefined) {
        return;
    }

    for (const element of bindingPattern.elements) {
        const exportNameNode: ts.BindingName | ts.PropertyName =
            element.propertyName ?? element.name;
        const exportName: string | undefined = ts.isIdentifier(exportNameNode)
            ? exportNameNode.text
            : ts.isStringLiteral(exportNameNode)
              ? exportNameNode.text
              : undefined;
        const exportSymbol: ts.Symbol | undefined =
            exportName === undefined ? undefined : moduleType.getProperty(exportName);

        if (exportSymbol !== undefined) {
            addSymbolReference({
                checker: input.checker,
                declarationBySymbol: input.declarationBySymbol,
                importTargetsBySymbol: input.importTargetsBySymbol,
                referenceKind: 'value',
                sourceDeclId: input.sourceDeclId,
                symbol: exportSymbol,
                targetEdges: input.targetEdges,
                usageEdges: input.usageEdges,
            });
        }
    }
}

function getDynamicImportObjectBindingPattern(
    callExpression: ts.CallExpression
): ts.ObjectBindingPattern | undefined {
    let parent: ts.Node = callExpression.parent;
    while (ts.isAwaitExpression(parent) || ts.isParenthesizedExpression(parent)) {
        parent = parent.parent;
    }

    return ts.isVariableDeclaration(parent) && ts.isObjectBindingPattern(parent.name)
        ? parent.name
        : undefined;
}

function addSymbolReference(input: {
    readonly checker: ts.TypeChecker;
    readonly declarationBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly referenceKind: UsageKind;
    readonly sourceDeclId?: string | undefined;
    readonly symbol: ts.Symbol;
    readonly targetEdges?: DeclUsageEdges | undefined;
    readonly usageEdges?: FileUsageEdges | undefined;
}): void {
    const symbolToUse: ts.Symbol =
        (input.symbol.flags & ts.SymbolFlags.Alias) === ts.SymbolFlags.Alias
            ? input.checker.getAliasedSymbol(input.symbol)
            : input.symbol;
    const declarationTargets: ImportedSymbolTargets | undefined =
        input.declarationBySymbol.get(symbolToUse) ?? input.declarationBySymbol.get(input.symbol);

    if (declarationTargets !== undefined) {
        const targetIds: ReadonlySet<string> =
            input.referenceKind === 'type'
                ? declarationTargets.referencesByType
                : declarationTargets.referencesByValue;
        for (const declarationId of targetIds) {
            if (declarationId !== input.sourceDeclId) {
                addDeclarationReference({
                    declarationId,
                    referenceKind: input.referenceKind,
                    targetEdges: input.targetEdges,
                    usageEdges: input.usageEdges,
                });
            }
        }
        return;
    }

    const importTargets: ImportedSymbolTargets | undefined = input.importTargetsBySymbol.get(
        input.symbol
    );

    if (importTargets === undefined) {
        return;
    }

    const targetIds: ReadonlySet<string> =
        input.referenceKind === 'type'
            ? importTargets.referencesByType
            : importTargets.referencesByValue;

    for (const targetId of targetIds) {
        if (targetId !== input.sourceDeclId) {
            addDeclarationReference({
                declarationId: targetId,
                referenceKind: input.referenceKind,
                targetEdges: input.targetEdges,
                usageEdges: input.usageEdges,
            });
        }
    }
}

function addDeclarationReference(input: {
    readonly declarationId: string;
    readonly referenceKind: UsageKind;
    readonly targetEdges?: DeclUsageEdges | undefined;
    readonly usageEdges?: FileUsageEdges | undefined;
}): void {
    if (input.referenceKind === 'type') {
        input.targetEdges?.referencesByType.add(input.declarationId);
        input.usageEdges?.referencesByType.add(input.declarationId);
        return;
    }

    input.targetEdges?.referencesByValue.add(input.declarationId);
    input.usageEdges?.referencesByValue.add(input.declarationId);
}

function getDeclarationEdges(
    declEdges: Map<string, DeclUsageEdges>,
    declarationId: string
): DeclUsageEdges {
    const existing: DeclUsageEdges | undefined = declEdges.get(declarationId);

    if (existing !== undefined) {
        return existing;
    }

    const usageEdges: DeclUsageEdges = {
        executedFilePaths: new Set(),
        referencesByType: new Set(),
        referencesByValue: new Set(),
    };
    declEdges.set(declarationId, usageEdges);

    return usageEdges;
}

function getFileUsageEdges(
    fileEdges: Map<string, FileUsageEdges>,
    filePath: string
): FileUsageEdges {
    const existing: FileUsageEdges | undefined = fileEdges.get(filePath);

    if (existing !== undefined) {
        return existing;
    }

    const usageEdges: FileUsageEdges = {
        executedFilePaths: new Set(),
        referencesByType: new Set(),
        referencesByValue: new Set(),
    };
    fileEdges.set(filePath, usageEdges);

    return usageEdges;
}

function processImportDeclarations(input: {
    readonly checker: ts.TypeChecker;
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly sourceFile: ts.SourceFile;
    readonly workspaceByPackageName: Map<string, LoadedWorkspace>;
}): void {
    for (const statement of input.sourceFile.statements) {
        if (!ts.isImportDeclaration(statement)) {
            continue;
        }

        const moduleSpecifier: ts.Expression = statement.moduleSpecifier;
        if (!ts.isStringLiteral(moduleSpecifier)) {
            continue;
        }

        const workspace: LoadedWorkspace | undefined = resolveWorkspaceImport({
            moduleName: moduleSpecifier.text,
            workspaceByPackageName: input.workspaceByPackageName,
        });

        if (workspace === undefined || statement.importClause === undefined) {
            continue;
        }

        const importClause: ts.ImportClause = statement.importClause;
        if (importClause.name !== undefined && !importClause.isTypeOnly) {
            const symbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(
                importClause.name
            );

            if (symbol !== undefined) {
                setImportedSymbolTargets({
                    importTargetsBySymbol: input.importTargetsBySymbol,
                    symbol,
                    referencesByType: new Set(),
                    referencesByValue: workspace.exportedValueDeclarationIds,
                });
            }
        }

        if (importClause.namedBindings === undefined) {
            continue;
        }

        if (ts.isNamespaceImport(importClause.namedBindings)) {
            const symbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(
                importClause.namedBindings.name
            );

            if (symbol !== undefined) {
                setImportedSymbolTargets({
                    importTargetsBySymbol: input.importTargetsBySymbol,
                    symbol,
                    referencesByType: workspace.exportedTypeDeclarationIds,
                    referencesByValue: importClause.isTypeOnly
                        ? new Set()
                        : workspace.exportedValueDeclarationIds,
                });
            }

            continue;
        }

        for (const specifier of importClause.namedBindings.elements) {
            const importedName: string = specifier.propertyName?.text ?? specifier.name.text;
            const symbol: ts.Symbol | undefined = input.checker.getSymbolAtLocation(specifier.name);

            if (symbol === undefined) {
                continue;
            }

            const importedAsType: boolean = importClause.isTypeOnly || specifier.isTypeOnly;
            setImportedSymbolTargets({
                importTargetsBySymbol: input.importTargetsBySymbol,
                symbol,
                referencesByType: getNamedExportIds({
                    exportedIdsByName: workspace.exportedTypeDeclarationIdsByName,
                    name: importedName,
                }),
                referencesByValue: importedAsType
                    ? new Set()
                    : getNamedExportIds({
                          exportedIdsByName: workspace.exportedValueDeclarationIdsByName,
                          name: importedName,
                      }),
            });
        }
    }
}

function resolveWorkspaceImport(input: {
    readonly moduleName: string;
    readonly workspaceByPackageName: Map<string, LoadedWorkspace>;
}): LoadedWorkspace | undefined {
    const exactWorkspace: LoadedWorkspace | undefined = input.workspaceByPackageName.get(
        input.moduleName
    );

    if (exactWorkspace !== undefined) {
        return exactWorkspace;
    }

    for (const [packageName, workspace] of input.workspaceByPackageName) {
        if (input.moduleName.startsWith(`${packageName}/`)) {
            return workspace;
        }
    }

    return undefined;
}

function setImportedSymbolTargets(input: {
    readonly importTargetsBySymbol: Map<ts.Symbol, ImportedSymbolTargets>;
    readonly referencesByType: ReadonlySet<string>;
    readonly referencesByValue: ReadonlySet<string>;
    readonly symbol: ts.Symbol;
}): void {
    input.importTargetsBySymbol.set(input.symbol, {
        referencesByType: new Set(input.referencesByType),
        referencesByValue: new Set(input.referencesByValue),
    });
}

function getNamedExportIds(input: {
    readonly exportedIdsByName: ReadonlyMap<string, Set<string>>;
    readonly name: string;
}): Set<string> {
    return new Set(input.exportedIdsByName.get(input.name) ?? []);
}

function checkTypeSafeSerdes(input: {
    readonly config: TstsTypeSafeSerdesConfig;
    readonly graph: UnusedCodeGraph;
}): readonly TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];
    const severity: TstsDiagnosticSeverity = input.config.severity ?? 'error';
    const contractByPropertyName: Map<string, TstsTypeSafeSerdesContractConfig> = new Map();

    for (const contract of input.config.contracts) {
        for (const propertyName of contract.propertyNames) {
            contractByPropertyName.set(propertyName, contract);
        }
    }

    for (const workspace of input.graph.workspaces) {
        for (const sourceFile of workspace.sourceFiles) {
            visitTypeSafeSerdesNode({
                contractByPropertyName,
                diagnostics,
                severity,
                sourceFile,
                node: sourceFile,
            });
        }
    }

    return diagnostics;
}

function visitTypeSafeSerdesNode(input: {
    readonly contractByPropertyName: ReadonlyMap<string, TstsTypeSafeSerdesContractConfig>;
    readonly diagnostics: TstsDiagnostic[];
    readonly node: ts.Node;
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
}): void {
    if (
        (ts.isPropertySignature(input.node) || ts.isPropertyDeclaration(input.node)) &&
        input.node.type !== undefined
    ) {
        const propertyName: string | undefined = getPropertyNameText(input.node.name);
        const contract: TstsTypeSafeSerdesContractConfig | undefined =
            propertyName === undefined ? undefined : input.contractByPropertyName.get(propertyName);

        if (propertyName !== undefined && contract !== undefined) {
            if (isWithinCanonicalSerdesDefinition(input.node, contract)) {
                return;
            }

            const observedType: string | undefined = getInvalidSerdesTypeDescription({
                canonicalTypeName: contract.canonicalTypeName,
                sourceFile: input.sourceFile,
                typeNode: input.node.type,
            });

            if (observedType !== undefined) {
                input.diagnostics.push(
                    createTypeSafeSerdesDiagnostic({
                        contract,
                        observed: observedType,
                        propertyName,
                        severity: input.severity,
                        sourceFile: input.sourceFile,
                        ruleSubject: 'type',
                        node: input.node.name,
                    })
                );
            }
        }
    }

    if (ts.isParameter(input.node) && input.node.type !== undefined) {
        const parameterName: string | undefined = ts.isIdentifier(input.node.name)
            ? input.node.name.text
            : undefined;
        const contract: TstsTypeSafeSerdesContractConfig | undefined =
            parameterName === undefined
                ? undefined
                : input.contractByPropertyName.get(parameterName);

        if (parameterName !== undefined && contract !== undefined) {
            const observedType: string | undefined = getInvalidSerdesTypeDescription({
                canonicalTypeName: contract.canonicalTypeName,
                sourceFile: input.sourceFile,
                typeNode: input.node.type,
            });

            if (observedType !== undefined) {
                input.diagnostics.push(
                    createTypeSafeSerdesDiagnostic({
                        contract,
                        observed: observedType,
                        propertyName: parameterName,
                        severity: input.severity,
                        sourceFile: input.sourceFile,
                        ruleSubject: 'type',
                        node: input.node.name,
                    })
                );
            }
        }
    }

    if (ts.isPropertyAssignment(input.node) && isZodObjectShapeProperty(input.node)) {
        const propertyName: string | undefined = getObjectLiteralPropertyNameText(input.node.name);
        const contract: TstsTypeSafeSerdesContractConfig | undefined =
            propertyName === undefined ? undefined : input.contractByPropertyName.get(propertyName);

        if (propertyName !== undefined && contract !== undefined) {
            if (isWithinCanonicalSerdesDefinition(input.node, contract)) {
                return;
            }

            const observedSchema: string | undefined = getInvalidSerdesSchemaDescription({
                canonicalSchemaName: contract.canonicalSchemaName,
                expression: input.node.initializer,
                sourceFile: input.sourceFile,
            });

            if (observedSchema !== undefined) {
                input.diagnostics.push(
                    createTypeSafeSerdesDiagnostic({
                        contract,
                        observed: observedSchema,
                        propertyName,
                        severity: input.severity,
                        sourceFile: input.sourceFile,
                        ruleSubject: 'schema',
                        node: input.node.name,
                    })
                );
            }
        }
    }

    if (ts.isCallExpression(input.node)) {
        const parsedPropertyName: string | undefined = getParsedSerdesPropertyName({
            callExpression: input.node,
            propertyNames: input.contractByPropertyName,
        });
        const contract: TstsTypeSafeSerdesContractConfig | undefined =
            parsedPropertyName === undefined
                ? undefined
                : input.contractByPropertyName.get(parsedPropertyName);

        if (parsedPropertyName !== undefined && contract !== undefined) {
            const schemaExpression: ts.Expression | undefined = getParseCallSchemaExpression(
                input.node
            );

            if (schemaExpression !== undefined) {
                const observedSchema: string | undefined = getInvalidSerdesSchemaDescription({
                    canonicalSchemaName: contract.canonicalSchemaName,
                    expression: schemaExpression,
                    sourceFile: input.sourceFile,
                });

                if (observedSchema !== undefined) {
                    input.diagnostics.push(
                        createTypeSafeSerdesDiagnostic({
                            contract,
                            observed: observedSchema,
                            propertyName: parsedPropertyName,
                            severity: input.severity,
                            sourceFile: input.sourceFile,
                            ruleSubject: 'schema',
                            node: schemaExpression,
                        })
                    );
                }
            }
        }
    }

    ts.forEachChild(input.node, (child: ts.Node): void => {
        visitTypeSafeSerdesNode({
            ...input,
            node: child,
        });
    });
}

function getInvalidSerdesTypeDescription(input: {
    readonly canonicalTypeName: string;
    readonly sourceFile: ts.SourceFile;
    readonly typeNode: ts.TypeNode;
}): string | undefined {
    if (ts.isParenthesizedTypeNode(input.typeNode)) {
        return getInvalidSerdesTypeDescription({
            ...input,
            typeNode: input.typeNode.type,
        });
    }

    if (ts.isUnionTypeNode(input.typeNode)) {
        const invalidMembers: readonly string[] = input.typeNode.types.flatMap(
            (member: ts.TypeNode): readonly string[] => {
                if (isNullableSerdesTypeMember(member)) {
                    return [];
                }

                const invalidMember: string | undefined = getInvalidSerdesTypeDescription({
                    ...input,
                    typeNode: member,
                });

                return invalidMember === undefined ? [] : [invalidMember];
            }
        );

        return invalidMembers.length === 0 ? undefined : input.typeNode.getText(input.sourceFile);
    }

    if (isCanonicalTypeReference(input.typeNode, input.canonicalTypeName)) {
        return undefined;
    }

    if (input.typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
        return 'unknown';
    }

    if (input.typeNode.kind === ts.SyntaxKind.AnyKeyword) {
        return 'any';
    }

    if (ts.isTypeLiteralNode(input.typeNode)) {
        return 'anonymous object type';
    }

    const typeText: string = input.typeNode.getText(input.sourceFile);

    if (
        typeText === 'JsonValue' ||
        typeText === 'Prisma.JsonValue' ||
        typeText === 'Record<string, unknown>' ||
        typeText === 'Readonly<Record<string, unknown>>'
    ) {
        return typeText;
    }

    return typeText;
}

function isNullableSerdesTypeMember(typeNode: ts.TypeNode): boolean {
    if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) {
        return true;
    }

    return ts.isLiteralTypeNode(typeNode) && typeNode.literal.kind === ts.SyntaxKind.NullKeyword;
}

function isCanonicalTypeReference(typeNode: ts.TypeNode, canonicalTypeName: string): boolean {
    if (!ts.isTypeReferenceNode(typeNode)) {
        return false;
    }

    if (ts.isIdentifier(typeNode.typeName)) {
        return typeNode.typeName.text === canonicalTypeName;
    }

    return typeNode.typeName.right.text === canonicalTypeName;
}

function isWithinCanonicalSerdesDefinition(
    node: ts.Node,
    contract: TstsTypeSafeSerdesContractConfig
): boolean {
    const canonicalTypeName: string = contract.canonicalTypeName.toLowerCase();
    const canonicalSchemaName: string = contract.canonicalSchemaName.toLowerCase();

    let current: ts.Node | undefined = node.parent;

    while (current !== undefined) {
        const declarationName: string | undefined = getNamedDeclarationText(current);

        if (declarationName !== undefined) {
            const normalizedDeclarationName: string = declarationName.toLowerCase();

            if (
                normalizedDeclarationName.includes(canonicalTypeName) ||
                normalizedDeclarationName.includes(canonicalSchemaName)
            ) {
                return true;
            }
        }

        current = current.parent;
    }

    return false;
}

function getNamedDeclarationText(node: ts.Node): string | undefined {
    if (
        (ts.isClassDeclaration(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) ||
            ts.isVariableDeclaration(node)) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name)
    ) {
        return node.name.text;
    }

    return undefined;
}

function getObjectLiteralPropertyNameText(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }

    return undefined;
}

function isZodObjectShapeProperty(propertyAssignment: ts.PropertyAssignment): boolean {
    const objectLiteral: ts.Node | undefined = propertyAssignment.parent;

    if (!ts.isObjectLiteralExpression(objectLiteral)) {
        return false;
    }

    const callExpression: ts.Node | undefined = objectLiteral.parent;

    if (!ts.isCallExpression(callExpression)) {
        return false;
    }

    const expression: ts.Expression = callExpression.expression;

    if (ts.isPropertyAccessExpression(expression)) {
        const methodName: string = expression.name.text;

        return methodName === 'object' || methodName === 'strictObject' || methodName === 'extend';
    }

    return false;
}

function getInvalidSerdesSchemaDescription(input: {
    readonly canonicalSchemaName: string;
    readonly expression: ts.Expression;
    readonly sourceFile: ts.SourceFile;
}): string | undefined {
    const expressionText: string = input.expression.getText(input.sourceFile);

    if (expressionText.includes(input.canonicalSchemaName)) {
        return undefined;
    }

    if (
        expressionText.includes('z.unknown') ||
        expressionText.includes('z.any') ||
        expressionText.includes('JsonValueSchema') ||
        expressionText.includes('Prisma.JsonValue')
    ) {
        return expressionText;
    }

    return expressionText;
}

function getParsedSerdesPropertyName(input: {
    readonly callExpression: ts.CallExpression;
    readonly propertyNames: ReadonlyMap<string, TstsTypeSafeSerdesContractConfig>;
}): string | undefined {
    if (getParseCallSchemaExpression(input.callExpression) === undefined) {
        return undefined;
    }

    const firstArgument: ts.Expression | undefined = input.callExpression.arguments[0];

    if (firstArgument === undefined) {
        return undefined;
    }

    return findReferencedSerdesPropertyName({
        node: firstArgument,
        propertyNames: input.propertyNames,
    });
}

function getParseCallSchemaExpression(
    callExpression: ts.CallExpression
): ts.Expression | undefined {
    const expression: ts.Expression = callExpression.expression;

    if (!ts.isPropertyAccessExpression(expression)) {
        return undefined;
    }

    if (expression.name.text !== 'parse' && expression.name.text !== 'safeParse') {
        return undefined;
    }

    return expression.expression;
}

function findReferencedSerdesPropertyName(input: {
    readonly node: ts.Node;
    readonly propertyNames: ReadonlyMap<string, TstsTypeSafeSerdesContractConfig>;
}): string | undefined {
    if (ts.isIdentifier(input.node) && input.propertyNames.has(input.node.text)) {
        return input.node.text;
    }

    if (
        ts.isPropertyAccessExpression(input.node) &&
        input.propertyNames.has(input.node.name.text)
    ) {
        return input.node.name.text;
    }

    if (
        ts.isElementAccessExpression(input.node) &&
        ts.isStringLiteral(input.node.argumentExpression) &&
        input.propertyNames.has(input.node.argumentExpression.text)
    ) {
        return input.node.argumentExpression.text;
    }

    let referencedPropertyName: string | undefined;

    ts.forEachChild(input.node, (child: ts.Node): void => {
        if (referencedPropertyName !== undefined) {
            return;
        }

        referencedPropertyName = findReferencedSerdesPropertyName({
            node: child,
            propertyNames: input.propertyNames,
        });
    });

    return referencedPropertyName;
}

function createTypeSafeSerdesDiagnostic(input: {
    readonly contract: TstsTypeSafeSerdesContractConfig;
    readonly node: ts.Node;
    readonly observed: string;
    readonly propertyName: string;
    readonly ruleSubject: 'schema' | 'type';
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
}): TstsDiagnostic {
    const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
        input.node.getStart(input.sourceFile)
    );
    const contractLabel: string = input.contract.contractName ?? input.contract.canonicalTypeName;

    return {
        column: location.character + 1,
        filePath: input.sourceFile.fileName,
        line: location.line + 1,
        message: `Persisted structured field "${input.propertyName}" for ${contractLabel} uses ${input.ruleSubject} "${formatObservedSerdesValue(input.observed)}". Expected ${input.contract.canonicalTypeName} validated by ${input.contract.canonicalSchemaName}.`,
        ruleId: 'type-safe-serdes',
        severity: input.severity,
    };
}

function formatObservedSerdesValue(value: string): string {
    return value.replace(/\s+/gu, ' ').trim();
}

function checkNoAliasing(input: {
    readonly graph: UnusedCodeGraph;
    readonly severity: TstsDiagnosticSeverity;
}): TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];

    for (const sourceFile of input.graph.sourceFiles) {
        for (const statement of sourceFile.statements) {
            if (ts.isImportDeclaration(statement)) {
                diagnostics.push(
                    ...checkImportDeclarationAliases({
                        severity: input.severity,
                        sourceFile,
                        statement,
                    })
                );
                continue;
            }

            if (ts.isExportDeclaration(statement)) {
                diagnostics.push(
                    ...checkExportDeclarationAliases({
                        severity: input.severity,
                        sourceFile,
                        statement,
                    })
                );
            }
        }
    }

    return diagnostics;
}

function checkImportDeclarationAliases(input: {
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
    readonly statement: ts.ImportDeclaration;
}): TstsDiagnostic[] {
    const namedBindings: ts.NamedImportBindings | undefined =
        input.statement.importClause?.namedBindings;

    if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) {
        return [];
    }

    return namedBindings.elements.flatMap((specifier: ts.ImportSpecifier): TstsDiagnostic[] =>
        createNoAliasingDiagnostic({
            aliasKind: 'Import',
            severity: input.severity,
            sourceFile: input.sourceFile,
            specifier,
        })
    );
}

function checkExportDeclarationAliases(input: {
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
    readonly statement: ts.ExportDeclaration;
}): TstsDiagnostic[] {
    const exportClause: ts.NamedExportBindings | undefined = input.statement.exportClause;

    if (exportClause === undefined || !ts.isNamedExports(exportClause)) {
        return [];
    }

    return exportClause.elements.flatMap((specifier: ts.ExportSpecifier): TstsDiagnostic[] =>
        createNoAliasingDiagnostic({
            aliasKind: 'Export',
            severity: input.severity,
            sourceFile: input.sourceFile,
            specifier,
        })
    );
}

function createNoAliasingDiagnostic(input: {
    readonly aliasKind: 'Export' | 'Import';
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
    readonly specifier: ts.ExportSpecifier | ts.ImportSpecifier;
}): TstsDiagnostic[] {
    const originalName: ts.ModuleExportName | undefined = input.specifier.propertyName;

    if (
        originalName === undefined ||
        !ts.isIdentifier(originalName) ||
        originalName.text === input.specifier.name.text
    ) {
        return [];
    }

    const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
        input.specifier.getStart(input.sourceFile)
    );

    return [
        {
            column: location.character + 1,
            filePath: input.sourceFile.fileName,
            line: location.line + 1,
            message: `${input.aliasKind} alias "${originalName.text} as ${input.specifier.name.text}" renames a symbol without a rule-approved reason. Use "${originalName.text}" directly instead.`,
            ruleId: 'no-aliasing',
            severity: input.severity,
        },
    ];
}

function isTopLevelDeclarationStatement(statement: ts.Statement): boolean {
    return (
        ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isVariableStatement(statement)
    );
}

function isTypeContext(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent;

    while (current !== undefined) {
        if (ts.isTypeQueryNode(current) || ts.isComputedPropertyName(current)) {
            return false;
        }

        if (ts.isTypeNode(current)) {
            return true;
        }

        if (ts.isExpression(current)) {
            return false;
        }

        current = current.parent;
    }

    return false;
}

function isValueReferenceInTypeContext(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent;

    while (current !== undefined) {
        if (
            ts.isExpressionWithTypeArguments(current) &&
            isClassExtendsClause(current.parent) &&
            node.getStart() >= current.expression.getStart() &&
            node.getEnd() <= current.expression.getEnd()
        ) {
            return true;
        }

        if (ts.isTypeQueryNode(current) || ts.isComputedPropertyName(current)) {
            return true;
        }

        if (ts.isTypeNode(current) || ts.isExpression(current)) {
            return false;
        }

        current = current.parent;
    }

    return false;
}

function isClassExtendsClause(node: ts.Node): node is ts.HeritageClause {
    if (!ts.isHeritageClause(node) || node.token !== ts.SyntaxKind.ExtendsKeyword) {
        return false;
    }

    return ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent);
}

function isDeclarationName(node: ts.Identifier): boolean {
    const parent: ts.Node | undefined = node.parent;
    return (
        parent !== undefined &&
        ((ts.isFunctionDeclaration(parent) && parent.name === node) ||
            (ts.isClassDeclaration(parent) && parent.name === node) ||
            (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
            (ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
            (ts.isEnumDeclaration(parent) && parent.name === node) ||
            (ts.isVariableDeclaration(parent) && parent.name === node) ||
            (ts.isParameter(parent) && parent.name === node) ||
            (ts.isPropertyDeclaration(parent) && parent.name === node) ||
            (ts.isPropertySignature(parent) && parent.name === node) ||
            (ts.isImportSpecifier(parent) && parent.name === node) ||
            (ts.isImportSpecifier(parent) && parent.propertyName === node) ||
            (ts.isImportClause(parent) && parent.name === node) ||
            (ts.isNamespaceImport(parent) && parent.name === node) ||
            (ts.isImportEqualsDeclaration(parent) && parent.name === node) ||
            (ts.isExportSpecifier(parent) && parent.name === node))
    );
}

interface VersionedDataContractManifest {
    readonly schemaVersion: 1;
    readonly families: readonly VersionedDataContractFamily[];
}

interface VersionedDataContractFamily {
    readonly id: string;
    readonly implementation: VersionedDataContractImplementation;
    readonly currentVersion: string;
    readonly versions: readonly string[];
    readonly supportedReadVersions: readonly string[];
    readonly supportedDowngradeVersions: readonly string[];
}

interface VersionedDataContractImplementation {
    readonly workspace: string;
    readonly module: string;
    readonly readerRegistryExport: string;
    readonly downgradeRegistryExport?: string | undefined;
}

async function checkVersionedDataContracts(input: {
    readonly config: TstsVersionedDataContractsConfig;
    readonly configDirectory: string;
    readonly graph: UnusedCodeGraph;
}): Promise<TstsDiagnostic[]> {
    const severity: TstsDiagnosticSeverity = input.config.severity ?? 'error';
    const manifestPath: string = path.resolve(input.configDirectory, input.config.manifestPath);
    const manifestValue: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));

    if (!isVersionedDataContractManifest(manifestValue)) {
        return [
            {
                filePath: manifestPath,
                message: 'Invalid versioned data contract manifest.',
                ruleId: 'versioned-data-contract-manifest',
                severity,
            },
        ];
    }

    const diagnostics: TstsDiagnostic[] = [];
    const familyById: Map<string, VersionedDataContractFamily> = new Map();

    for (const family of manifestValue.families) {
        if (familyById.has(family.id)) {
            diagnostics.push(
                versionedContractDiagnostic({
                    family,
                    manifestPath,
                    message: `Duplicate family id "${family.id}".`,
                    ruleId: 'versioned-data-contract-manifest',
                    severity,
                })
            );
            continue;
        }
        familyById.set(family.id, family);
    }

    if (diagnostics.length > 0) {
        return diagnostics;
    }

    const selectedFamilies: VersionedDataContractFamily[] = [];

    if (input.config.familyIds === undefined) {
        selectedFamilies.push(...manifestValue.families);
    } else {
        for (const familyId of input.config.familyIds) {
            const family: VersionedDataContractFamily | undefined = familyById.get(familyId);

            if (family === undefined) {
                diagnostics.push({
                    filePath: manifestPath,
                    message: `Selected family id "${familyId}" does not exist in the manifest.`,
                    ruleId: 'versioned-data-contract-family-selection',
                    severity,
                });
            } else {
                selectedFamilies.push(family);
            }
        }
    }

    for (const family of selectedFamilies) {
        diagnostics.push(
            ...checkVersionedDataContractFamily({
                configDirectory: input.configDirectory,
                family,
                graph: input.graph,
                manifestPath,
                severity,
            })
        );
    }

    return diagnostics;
}

function checkVersionedDataContractFamily(input: {
    readonly configDirectory: string;
    readonly family: VersionedDataContractFamily;
    readonly graph: UnusedCodeGraph;
    readonly manifestPath: string;
    readonly severity: TstsDiagnosticSeverity;
}): TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];
    const knownVersions: Set<string> = new Set(input.family.versions);

    if (!knownVersions.has(input.family.currentVersion)) {
        diagnostics.push(
            versionedContractDiagnostic({
                family: input.family,
                manifestPath: input.manifestPath,
                message: `Current version "${input.family.currentVersion}" is not known.`,
                ruleId: 'versioned-data-contract-manifest',
                severity: input.severity,
            })
        );
    }

    for (const version of [
        ...input.family.supportedReadVersions,
        ...input.family.supportedDowngradeVersions,
    ]) {
        if (!knownVersions.has(version)) {
            diagnostics.push(
                versionedContractDiagnostic({
                    family: input.family,
                    manifestPath: input.manifestPath,
                    message: `Supported version "${version}" is not known.`,
                    ruleId: 'versioned-data-contract-manifest',
                    severity: input.severity,
                })
            );
        }
    }

    const workspace: LoadedWorkspace | undefined = input.graph.workspaces.find(
        (candidate: LoadedWorkspace): boolean =>
            candidate.config.name === input.family.implementation.workspace ||
            candidate.config.packageName === input.family.implementation.workspace
    );
    if (workspace === undefined) {
        diagnostics.push(
            versionedContractDiagnostic({
                family: input.family,
                manifestPath: input.manifestPath,
                message:
                    `Workspace "${input.family.implementation.workspace}" ` +
                    'does not exist in tsts.json.',
                ruleId: 'versioned-data-contract-workspace',
                severity: input.severity,
            })
        );
        return diagnostics;
    }

    const modulePath: string = path.resolve(
        input.configDirectory,
        input.family.implementation.module
    );
    const sourceFile: ts.SourceFile | undefined = workspace.sourceFiles.find(
        (candidate: ts.SourceFile): boolean => path.resolve(candidate.fileName) === modulePath
    );
    if (sourceFile === undefined) {
        diagnostics.push(
            versionedContractDiagnostic({
                family: input.family,
                manifestPath: input.manifestPath,
                message: `Module "${input.family.implementation.module}" is not in the workspace.`,
                ruleId: 'versioned-data-contract-module',
                severity: input.severity,
            })
        );
        return diagnostics;
    }

    const readerDeclaration: ts.VariableDeclaration | undefined = findExportedVariable(
        sourceFile,
        input.family.implementation.readerRegistryExport
    );
    if (readerDeclaration === undefined) {
        diagnostics.push(
            sourceVersionedContractDiagnostic({
                family: input.family,
                message:
                    `Missing reader registry export ` +
                    `"${input.family.implementation.readerRegistryExport}".`,
                node: sourceFile,
                ruleId: 'versioned-data-contract-reader-registry',
                severity: input.severity,
            })
        );
        return diagnostics;
    }

    const readerType: ts.Type = workspace.checker.getTypeAtLocation(readerDeclaration.name);
    const variantsType: ts.Type | undefined = getPropertyType(
        workspace.checker,
        readerType,
        'variants',
        readerDeclaration
    );
    const writerVersion: string | undefined = getStringLiteralProperty(
        workspace.checker,
        readerType,
        'writerVariant',
        readerDeclaration
    );

    if (variantsType === undefined) {
        diagnostics.push(
            sourceVersionedContractDiagnostic({
                family: input.family,
                message: 'Reader registry has no typed "variants" property.',
                node: readerDeclaration,
                ruleId: 'versioned-data-contract-reader-registry',
                severity: input.severity,
            })
        );
        return diagnostics;
    }

    const implementedReadVersions: readonly string[] = workspace.checker
        .getPropertiesOfType(variantsType)
        .map((property: ts.Symbol): string => property.getName());
    diagnostics.push(
        ...compareVersionSets({
            actual: implementedReadVersions,
            expected: input.family.supportedReadVersions,
            family: input.family,
            manifestPath: input.manifestPath,
            missingRuleId: 'versioned-data-contract-reader-missing',
            unexpectedRuleId: 'versioned-data-contract-reader-undeclared',
            severity: input.severity,
        })
    );

    if (writerVersion !== input.family.currentVersion) {
        diagnostics.push(
            sourceVersionedContractDiagnostic({
                family: input.family,
                message:
                    `Writer version is "${writerVersion ?? 'unknown'}"; expected ` +
                    `"${input.family.currentVersion}".`,
                node: readerDeclaration,
                ruleId: 'versioned-data-contract-writer-version',
                severity: input.severity,
            })
        );
    }

    diagnostics.push(
        ...checkNormalizerReturnTypes({
            checker: workspace.checker,
            currentVersion: input.family.currentVersion,
            family: input.family,
            node: readerDeclaration,
            severity: input.severity,
            variantsType,
        })
    );

    diagnostics.push(
        ...checkDowngradeRegistry({
            family: input.family,
            manifestPath: input.manifestPath,
            severity: input.severity,
            sourceFile,
            workspace,
        })
    );

    return diagnostics;
}

function checkNormalizerReturnTypes(input: {
    readonly checker: ts.TypeChecker;
    readonly currentVersion: string;
    readonly family: VersionedDataContractFamily;
    readonly node: ts.Node;
    readonly severity: TstsDiagnosticSeverity;
    readonly variantsType: ts.Type;
}): TstsDiagnostic[] {
    const currentVariantType: ts.Type | undefined = getPropertyType(
        input.checker,
        input.variantsType,
        input.currentVersion,
        input.node
    );
    const currentReturnType: ts.Type | undefined =
        currentVariantType === undefined
            ? undefined
            : getFunctionPropertyReturnType(
                  input.checker,
                  currentVariantType,
                  'normalize',
                  input.node
              );
    if (currentReturnType === undefined) {
        return [
            sourceVersionedContractDiagnostic({
                family: input.family,
                message: `Current variant "${input.currentVersion}" has no typed normalizer.`,
                node: input.node,
                ruleId: 'versioned-data-contract-normalizer',
                severity: input.severity,
            }),
        ];
    }

    const diagnostics: TstsDiagnostic[] = [];
    for (const version of input.family.supportedReadVersions) {
        const variantType: ts.Type | undefined = getPropertyType(
            input.checker,
            input.variantsType,
            version,
            input.node
        );
        const returnType: ts.Type | undefined =
            variantType === undefined
                ? undefined
                : getFunctionPropertyReturnType(
                      input.checker,
                      variantType,
                      'normalize',
                      input.node
                  );
        if (
            returnType === undefined ||
            !input.checker.isTypeAssignableTo(returnType, currentReturnType) ||
            !input.checker.isTypeAssignableTo(currentReturnType, returnType)
        ) {
            diagnostics.push(
                sourceVersionedContractDiagnostic({
                    family: input.family,
                    message:
                        `Normalizer "${version}" must return the exact current ` +
                        `representation produced by "${input.currentVersion}".`,
                    node: input.node,
                    ruleId: 'versioned-data-contract-normalizer-output',
                    severity: input.severity,
                })
            );
        }
    }
    return diagnostics;
}

function checkDowngradeRegistry(input: {
    readonly family: VersionedDataContractFamily;
    readonly manifestPath: string;
    readonly severity: TstsDiagnosticSeverity;
    readonly sourceFile: ts.SourceFile;
    readonly workspace: LoadedWorkspace;
}): TstsDiagnostic[] {
    const exportName: string | undefined = input.family.implementation.downgradeRegistryExport;
    if (exportName === undefined) {
        return input.family.supportedDowngradeVersions.length === 0
            ? []
            : [
                  versionedContractDiagnostic({
                      family: input.family,
                      manifestPath: input.manifestPath,
                      message: 'Required downgrade versions need a downgrade registry export.',
                      ruleId: 'versioned-data-contract-adapter-registry',
                      severity: input.severity,
                  }),
              ];
    }

    const declaration: ts.VariableDeclaration | undefined = findExportedVariable(
        input.sourceFile,
        exportName
    );
    if (declaration === undefined) {
        return [
            sourceVersionedContractDiagnostic({
                family: input.family,
                message: `Missing downgrade registry export "${exportName}".`,
                node: input.sourceFile,
                ruleId: 'versioned-data-contract-adapter-registry',
                severity: input.severity,
            }),
        ];
    }

    const registryType: ts.Type = input.workspace.checker.getTypeAtLocation(declaration.name);
    return compareVersionSets({
        actual: input.workspace.checker
            .getPropertiesOfType(registryType)
            .map((property: ts.Symbol): string => property.getName()),
        expected: input.family.supportedDowngradeVersions,
        family: input.family,
        manifestPath: input.manifestPath,
        missingRuleId: 'versioned-data-contract-adapter-missing',
        unexpectedRuleId: 'versioned-data-contract-adapter-undeclared',
        severity: input.severity,
    });
}

function compareVersionSets(input: {
    readonly actual: readonly string[];
    readonly expected: readonly string[];
    readonly family: VersionedDataContractFamily;
    readonly manifestPath: string;
    readonly missingRuleId: string;
    readonly unexpectedRuleId: string;
    readonly severity: TstsDiagnosticSeverity;
}): TstsDiagnostic[] {
    const actual: Set<string> = new Set(input.actual);
    const expected: Set<string> = new Set(input.expected);
    return [
        ...input.expected
            .filter((version: string): boolean => !actual.has(version))
            .map(
                (version: string): TstsDiagnostic =>
                    versionedContractDiagnostic({
                        family: input.family,
                        manifestPath: input.manifestPath,
                        message: `Required version "${version}" is not implemented.`,
                        ruleId: input.missingRuleId,
                        severity: input.severity,
                    })
            ),
        ...input.actual
            .filter((version: string): boolean => !expected.has(version))
            .map(
                (version: string): TstsDiagnostic =>
                    versionedContractDiagnostic({
                        family: input.family,
                        manifestPath: input.manifestPath,
                        message: `Implemented version "${version}" is not declared as supported.`,
                        ruleId: input.unexpectedRuleId,
                        severity: input.severity,
                    })
            ),
    ];
}

function findExportedVariable(
    sourceFile: ts.SourceFile,
    exportName: string
): ts.VariableDeclaration | undefined {
    for (const statement of sourceFile.statements) {
        if (
            !ts.isVariableStatement(statement) ||
            !statement.modifiers?.some(
                (modifier: ts.ModifierLike): boolean =>
                    modifier.kind === ts.SyntaxKind.ExportKeyword
            )
        ) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
                return declaration;
            }
        }
    }
    return undefined;
}

function getPropertyType(
    checker: ts.TypeChecker,
    type: ts.Type,
    propertyName: string,
    location: ts.Node
): ts.Type | undefined {
    const property: ts.Symbol | undefined = checker.getPropertyOfType(type, propertyName);
    return property === undefined
        ? undefined
        : checker.getTypeOfSymbolAtLocation(property, location);
}

function getStringLiteralProperty(
    checker: ts.TypeChecker,
    type: ts.Type,
    propertyName: string,
    location: ts.Node
): string | undefined {
    const propertyType: ts.Type | undefined = getPropertyType(
        checker,
        type,
        propertyName,
        location
    );
    return propertyType?.isStringLiteral() === true ? propertyType.value : undefined;
}

function getFunctionPropertyReturnType(
    checker: ts.TypeChecker,
    type: ts.Type,
    propertyName: string,
    location: ts.Node
): ts.Type | undefined {
    const functionType: ts.Type | undefined = getPropertyType(
        checker,
        type,
        propertyName,
        location
    );
    const signature: ts.Signature | undefined = functionType?.getCallSignatures()[0];
    return signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature);
}

function sourceVersionedContractDiagnostic(input: {
    readonly family: VersionedDataContractFamily;
    readonly message: string;
    readonly node: ts.Node;
    readonly ruleId: string;
    readonly severity: TstsDiagnosticSeverity;
}): TstsDiagnostic {
    const sourceFile: ts.SourceFile = input.node.getSourceFile();
    const location: ts.LineAndCharacter = sourceFile.getLineAndCharacterOfPosition(
        input.node.getStart(sourceFile)
    );
    return {
        column: location.character + 1,
        filePath: sourceFile.fileName,
        line: location.line + 1,
        message: `${input.family.id}: ${input.message}`,
        ruleId: input.ruleId,
        severity: input.severity,
    };
}

function versionedContractDiagnostic(input: {
    readonly family: VersionedDataContractFamily;
    readonly manifestPath: string;
    readonly message: string;
    readonly ruleId: string;
    readonly severity: TstsDiagnosticSeverity;
}): TstsDiagnostic {
    return {
        filePath: input.manifestPath,
        message: `${input.family.id}: ${input.message}`,
        ruleId: input.ruleId,
        severity: input.severity,
    };
}

function isVersionedDataContractManifest(value: unknown): value is VersionedDataContractManifest {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as {
        schemaVersion?: unknown;
        families?: unknown;
    };
    return (
        candidate.schemaVersion === 1 &&
        Array.isArray(candidate.families) &&
        candidate.families.every(isVersionedDataContractFamily)
    );
}

function isVersionedDataContractFamily(value: unknown): value is VersionedDataContractFamily {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Partial<Record<keyof VersionedDataContractFamily, unknown>>;
    return (
        typeof candidate.id === 'string' &&
        typeof candidate.currentVersion === 'string' &&
        isUniqueStringArray(candidate.versions) &&
        isUniqueStringArray(candidate.supportedReadVersions) &&
        isUniqueStringArray(candidate.supportedDowngradeVersions) &&
        isVersionedDataContractImplementation(candidate.implementation)
    );
}

function isVersionedDataContractImplementation(
    value: unknown
): value is VersionedDataContractImplementation {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as {
        workspace?: unknown;
        module?: unknown;
        readerRegistryExport?: unknown;
        downgradeRegistryExport?: unknown;
    };
    return (
        typeof candidate.workspace === 'string' &&
        typeof candidate.module === 'string' &&
        typeof candidate.readerRegistryExport === 'string' &&
        (candidate.downgradeRegistryExport === undefined ||
            typeof candidate.downgradeRegistryExport === 'string')
    );
}

function isUniqueStringArray(value: unknown): value is readonly string[] {
    return (
        Array.isArray(value) &&
        value.every((entry: unknown): boolean => typeof entry === 'string') &&
        new Set(value).size === value.length
    );
}

const tstsConfigKeys: readonly string[] = [
    'noAliasing',
    'schemaVersion',
    'typeSafeSerdes',
    'unusedCode',
    'versionedDataContracts',
    'workspaces',
];
const workspaceConfigKeys: readonly string[] = [
    'entrypoints',
    'name',
    'packageName',
    'projectPath',
    'publicEntrypoints',
];
const severityConfigKeys: readonly string[] = ['severity'];
const typeSafeSerdesConfigKeys: readonly string[] = ['contracts', 'severity'];
const typeSafeSerdesContractConfigKeys: readonly string[] = [
    'canonicalSchemaName',
    'canonicalTypeName',
    'contractName',
    'propertyNames',
];
const versionedDataContractsConfigKeys: readonly string[] = [
    'familyIds',
    'manifestPath',
    'severity',
];

async function loadTstsConfig(configPath: string): Promise<TstsConfig> {
    const absoluteConfigPath: string = path.resolve(configPath);
    const rawText: string = await readFile(absoluteConfigPath, 'utf8');
    const data: unknown = parseJsonLosslessly(rawText);

    if (!isObjectRecord(data) || !isSchemaVersion2(data.schemaVersion)) {
        throw new Error(
            `Invalid TSTS configuration at ${absoluteConfigPath}. ` +
                'Add "schemaVersion": 2 and migrate the configuration to the v2 contract.'
        );
    }

    const unknownPropertyPath: string | undefined = findUnknownConfigProperty(data);

    if (unknownPropertyPath !== undefined) {
        throw new Error(
            `Invalid TSTS configuration at ${absoluteConfigPath}. ` +
                `Unknown configuration property "${unknownPropertyPath}". ` +
                'Remove it or replace it with a documented schemaVersion 2 property.'
        );
    }

    const config: TstsConfig | undefined = parseTstsConfig(data);

    if (config === undefined) {
        throw new Error(
            `Invalid TSTS configuration at ${absoluteConfigPath}. ` +
                'Use only documented schemaVersion 2 keys and value shapes.'
        );
    }

    return config;
}

function parseTstsConfig(value: unknown): TstsConfig | undefined {
    if (
        !isObjectRecord(value) ||
        !hasOnlyKeys(value, tstsConfigKeys) ||
        !isSchemaVersion2(value.schemaVersion)
    ) {
        return undefined;
    }

    const noAliasing: unknown = value.noAliasing;
    if (noAliasing !== undefined && !isNoAliasingConfig(noAliasing)) {
        return undefined;
    }

    const typeSafeSerdes: unknown = value.typeSafeSerdes;
    if (typeSafeSerdes !== undefined && !isTypeSafeSerdesConfig(typeSafeSerdes)) {
        return undefined;
    }

    const versionedDataContracts: unknown = value.versionedDataContracts;
    if (
        versionedDataContracts !== undefined &&
        !isVersionedDataContractsConfig(versionedDataContracts)
    ) {
        return undefined;
    }

    const workspaces: unknown = value.workspaces;
    if (
        !Array.isArray(workspaces) ||
        !workspaces.every((entry: unknown): entry is TstsWorkspaceConfig =>
            isWorkspaceConfig(entry)
        )
    ) {
        return undefined;
    }

    const unusedCode: unknown = value.unusedCode;
    if (unusedCode !== undefined && !isUnusedCodeConfig(unusedCode)) {
        return undefined;
    }

    return {
        schemaVersion: 2,
        workspaces,
        ...(noAliasing === undefined ? {} : { noAliasing }),
        ...(typeSafeSerdes === undefined ? {} : { typeSafeSerdes }),
        ...(unusedCode === undefined ? {} : { unusedCode }),
        ...(versionedDataContracts === undefined ? {} : { versionedDataContracts }),
    };
}

function isSchemaVersion2(value: unknown): boolean {
    return value === 2 || (isLosslessNumber(value) && value.value === '2');
}

function isObjectRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    const prototype: object | null = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
    value: Readonly<Record<string, unknown>>,
    allowedKeys: readonly string[]
): boolean {
    return firstUnknownKey(value, allowedKeys) === undefined;
}

function firstUnknownKey(
    value: Readonly<Record<string, unknown>>,
    allowedKeys: readonly string[]
): string | undefined {
    return Object.keys(value).find((key: string): boolean => !allowedKeys.includes(key));
}

function findUnknownConfigProperty(
    value: Readonly<Record<string, unknown>>
): string | undefined {
    const rootUnknownKey: string | undefined = firstUnknownKey(value, tstsConfigKeys);

    if (rootUnknownKey !== undefined) {
        return `$.${rootUnknownKey}`;
    }

    if (Array.isArray(value.workspaces)) {
        for (const [index, workspace] of value.workspaces.entries()) {
            if (isObjectRecord(workspace)) {
                const unknownKey: string | undefined = firstUnknownKey(
                    workspace,
                    workspaceConfigKeys
                );
                if (unknownKey !== undefined) {
                    return `$.workspaces[${index}].${unknownKey}`;
                }
            }
        }
    }

    for (const propertyName of ['noAliasing', 'unusedCode']) {
        const config: unknown = value[propertyName];
        if (isObjectRecord(config)) {
            const unknownKey: string | undefined = firstUnknownKey(config, severityConfigKeys);
            if (unknownKey !== undefined) {
                return `$.${propertyName}.${unknownKey}`;
            }
        }
    }

    if (isObjectRecord(value.typeSafeSerdes)) {
        const unknownKey: string | undefined = firstUnknownKey(
            value.typeSafeSerdes,
            typeSafeSerdesConfigKeys
        );
        if (unknownKey !== undefined) {
            return `$.typeSafeSerdes.${unknownKey}`;
        }

        if (Array.isArray(value.typeSafeSerdes.contracts)) {
            for (const [index, contract] of value.typeSafeSerdes.contracts.entries()) {
                if (isObjectRecord(contract)) {
                    const contractUnknownKey: string | undefined = firstUnknownKey(
                        contract,
                        typeSafeSerdesContractConfigKeys
                    );
                    if (contractUnknownKey !== undefined) {
                        return `$.typeSafeSerdes.contracts[${index}].${contractUnknownKey}`;
                    }
                }
            }
        }
    }

    if (isObjectRecord(value.versionedDataContracts)) {
        const unknownKey: string | undefined = firstUnknownKey(
            value.versionedDataContracts,
            versionedDataContractsConfigKeys
        );
        if (unknownKey !== undefined) {
            return `$.versionedDataContracts.${unknownKey}`;
        }
    }

    return undefined;
}

function isVersionedDataContractsConfig(value: unknown): value is TstsVersionedDataContractsConfig {
    if (
        !isObjectRecord(value) ||
        !hasOnlyKeys(value, versionedDataContractsConfigKeys)
    ) {
        return false;
    }

    return (
        (value.familyIds === undefined || isNonemptyUniqueStringArray(value.familyIds)) &&
        typeof value.manifestPath === 'string' &&
        value.manifestPath.length > 0 &&
        isOptionalSeverity(value.severity)
    );
}

function isNonemptyUniqueStringArray(value: unknown): value is readonly string[] {
    return isUniqueStringArray(value) &&
        value.length > 0 &&
        value.every((entry: string): boolean => entry.length > 0);
}

function isNoAliasingConfig(value: unknown): value is TstsNoAliasingConfig {
    return isObjectRecord(value) &&
        hasOnlyKeys(value, severityConfigKeys) &&
        isOptionalSeverity(value.severity);
}

function isUnusedCodeConfig(value: unknown): value is TstsUnusedCodeConfig {
    return isObjectRecord(value) &&
        hasOnlyKeys(value, severityConfigKeys) &&
        isOptionalSeverity(value.severity);
}

function isTypeSafeSerdesConfig(value: unknown): value is TstsTypeSafeSerdesConfig {
    if (
        !isObjectRecord(value) ||
        !hasOnlyKeys(value, typeSafeSerdesConfigKeys) ||
        !isOptionalSeverity(value.severity)
    ) {
        return false;
    }

    if (!Array.isArray(value.contracts)) {
        return false;
    }

    return value.contracts.every((contract: unknown): boolean =>
        isTypeSafeSerdesContractConfig(contract)
    );
}

function isTypeSafeSerdesContractConfig(value: unknown): value is TstsTypeSafeSerdesContractConfig {
    if (
        !isObjectRecord(value) ||
        !hasOnlyKeys(value, typeSafeSerdesContractConfigKeys)
    ) {
        return false;
    }

    if (
        typeof value.canonicalSchemaName !== 'string' ||
        typeof value.canonicalTypeName !== 'string'
    ) {
        return false;
    }

    if (value.contractName !== undefined && typeof value.contractName !== 'string') {
        return false;
    }

    if (!Array.isArray(value.propertyNames)) {
        return false;
    }

    return value.propertyNames.every(
        (propertyName: unknown): boolean => typeof propertyName === 'string'
    );
}

function isWorkspaceConfig(value: unknown): value is TstsWorkspaceConfig {
    if (
        !isObjectRecord(value) ||
        !hasOnlyKeys(value, workspaceConfigKeys)
    ) {
        return false;
    }

    if (typeof value.projectPath !== 'string') {
        return false;
    }

    if (value.name !== undefined && typeof value.name !== 'string') {
        return false;
    }

    if (value.packageName !== undefined && typeof value.packageName !== 'string') {
        return false;
    }

    for (const propertyName of ['entrypoints', 'publicEntrypoints']) {
        const entrypoints: unknown = value[propertyName];
        if (
            entrypoints !== undefined &&
            (!Array.isArray(entrypoints) ||
                !entrypoints.every((entrypoint: unknown): boolean => typeof entrypoint === 'string'))
        ) {
            return false;
        }
    }

    return true;
}

function isOptionalSeverity(value: unknown): value is TstsDiagnosticSeverity | undefined {
    return value === undefined || value === 'error' || value === 'warning';
}

function buildDeclarationIndex(sourceFiles: readonly ts.SourceFile[]): DeclarationIndex {
    const interfaces: Map<string, ts.InterfaceDeclaration> = new Map();
    const stringConstants: Map<string, string> = new Map();
    const typeAliases: Map<string, ts.TypeAliasDeclaration> = new Map();

    for (const sourceFile of sourceFiles) {
        for (const statement of sourceFile.statements) {
            if (ts.isInterfaceDeclaration(statement)) {
                interfaces.set(statement.name.text, statement);
            }

            if (ts.isTypeAliasDeclaration(statement)) {
                typeAliases.set(statement.name.text, statement);
            }

            if (
                ts.isVariableStatement(statement) &&
                (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
            ) {
                for (const declaration of statement.declarationList.declarations) {
                    if (
                        ts.isIdentifier(declaration.name) &&
                        declaration.initializer !== undefined &&
                        ts.isStringLiteral(declaration.initializer)
                    ) {
                        stringConstants.set(declaration.name.text, declaration.initializer.text);
                    }
                }
            }
        }
    }

    return { interfaces, stringConstants, typeAliases };
}

interface PublicUnionAnalysis {
    readonly diagnostics: readonly TstsDiagnostic[];
    readonly publicUnionDescriptors: ReadonlyMap<string, DiscriminatedUnionDescriptor>;
}

function analyzePublicUnions(input: {
    readonly declarationIndex: DeclarationIndex;
    readonly sourceFiles: readonly ts.SourceFile[];
}): PublicUnionAnalysis {
    const diagnostics: TstsDiagnostic[] = [];
    const publicUnionDescriptors: Map<string, DiscriminatedUnionDescriptor> = new Map();

    for (const sourceFile of input.sourceFiles) {
        for (const statement of sourceFile.statements) {
            if (
                ts.isTypeAliasDeclaration(statement) &&
                isExportedDeclaration(statement) &&
                ts.isUnionTypeNode(statement.type)
            ) {
                const analysisResult: PublicUnionDiscriminatorAnalysisResult =
                    analyzePublicUnionDiscriminator({
                        declarationIndex: input.declarationIndex,
                        sourceFile,
                        typeAlias: statement,
                        unionTypeNode: statement.type,
                    });

                if (analysisResult.diagnostic !== undefined) {
                    diagnostics.push(analysisResult.diagnostic);
                }

                if (analysisResult.publicUnionDescriptor !== undefined) {
                    publicUnionDescriptors.set(
                        analysisResult.publicUnionDescriptor.unionName,
                        analysisResult.publicUnionDescriptor
                    );
                }
            }
        }
    }

    return { diagnostics, publicUnionDescriptors };
}

interface PublicUnionDiscriminatorAnalysisResult {
    readonly diagnostic?: TstsDiagnostic | undefined;
    readonly publicUnionDescriptor?: DiscriminatedUnionDescriptor | undefined;
}

function analyzePublicUnionDiscriminator(input: {
    readonly declarationIndex: DeclarationIndex;
    readonly sourceFile: ts.SourceFile;
    readonly typeAlias: ts.TypeAliasDeclaration;
    readonly unionTypeNode: ts.UnionTypeNode;
}): PublicUnionDiscriminatorAnalysisResult {
    const variants: RequiredPropertyMap[] = [];

    for (const typeNode of input.unionTypeNode.types) {
        const variant: RequiredPropertyMap | undefined = collectRequiredProperties({
            declarationIndex: input.declarationIndex,
            typeNode,
            visitedTypeNames: new Set(),
        });

        if (variant === undefined) {
            return {};
        }

        variants.push(variant);
    }

    if (variants.length < 2) {
        return {};
    }

    const discriminatorAnalysis: DiscriminatorAnalysis = analyzeDiscriminatorCandidates(variants);

    if (discriminatorAnalysis.validDiscriminator !== undefined) {
        return {
            publicUnionDescriptor: {
                discriminatorFieldName: discriminatorAnalysis.validDiscriminator.fieldName,
                discriminatorValues: discriminatorAnalysis.validDiscriminator.literalValues,
                unionName: input.typeAlias.name.text,
            },
        };
    }

    const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
        input.typeAlias.name.getStart(input.sourceFile)
    );

    return {
        diagnostic: {
            column: location.character + 1,
            filePath: input.sourceFile.fileName,
            line: location.line + 1,
            message: formatDiscriminatorFailureMessage({
                analysis: discriminatorAnalysis,
                unionName: input.typeAlias.name.text,
            }),
            ruleId: 'public-union-discriminator',
            severity: 'error',
        },
    };
}

interface CollectRequiredStringLiteralPropertiesInput {
    readonly declarationIndex: DeclarationIndex;
    readonly typeNode: ts.TypeNode;
    readonly visitedTypeNames: ReadonlySet<string>;
}

function collectRequiredProperties(
    input: CollectRequiredStringLiteralPropertiesInput
): RequiredPropertyMap | undefined {
    if (ts.isParenthesizedTypeNode(input.typeNode)) {
        return collectRequiredProperties({
            ...input,
            typeNode: input.typeNode.type,
        });
    }

    if (ts.isTypeLiteralNode(input.typeNode)) {
        return collectPropertiesFromMembers(input.declarationIndex, input.typeNode.members);
    }

    if (ts.isIntersectionTypeNode(input.typeNode)) {
        return collectPropertiesFromIntersection(input);
    }

    if (ts.isTypeReferenceNode(input.typeNode)) {
        return collectPropertiesFromTypeReference(input);
    }

    return undefined;
}

function collectPropertiesFromIntersection(
    input: CollectRequiredStringLiteralPropertiesInput
): RequiredPropertyMap | undefined {
    if (!ts.isIntersectionTypeNode(input.typeNode)) {
        return undefined;
    }

    const intersectionTypeNode: ts.IntersectionTypeNode = input.typeNode;
    const properties: Map<string, RequiredProperty> = new Map();

    for (const typeNode of intersectionTypeNode.types) {
        const memberProperties: RequiredPropertyMap | undefined = collectRequiredProperties({
            ...input,
            typeNode,
        });

        if (memberProperties === undefined) {
            return undefined;
        }

        for (const [propertyName, property] of memberProperties) {
            properties.set(propertyName, property);
        }
    }

    return properties;
}

function collectPropertiesFromTypeReference(
    input: CollectRequiredStringLiteralPropertiesInput
): RequiredPropertyMap | undefined {
    if (!ts.isTypeReferenceNode(input.typeNode)) {
        return undefined;
    }

    const typeReferenceNode: ts.TypeReferenceNode = input.typeNode;

    if (!ts.isIdentifier(typeReferenceNode.typeName)) {
        return undefined;
    }

    const typeName: string = typeReferenceNode.typeName.text;

    if (input.visitedTypeNames.has(typeName)) {
        return undefined;
    }

    const visitedTypeNames: Set<string> = new Set(input.visitedTypeNames);
    visitedTypeNames.add(typeName);

    const interfaceDeclaration: ts.InterfaceDeclaration | undefined =
        input.declarationIndex.interfaces.get(typeName);

    if (interfaceDeclaration !== undefined) {
        return collectPropertiesFromInterface({
            declarationIndex: input.declarationIndex,
            interfaceDeclaration,
            visitedTypeNames,
        });
    }

    const typeAliasDeclaration: ts.TypeAliasDeclaration | undefined =
        input.declarationIndex.typeAliases.get(typeName);

    if (typeAliasDeclaration !== undefined) {
        return collectRequiredProperties({
            declarationIndex: input.declarationIndex,
            typeNode: typeAliasDeclaration.type,
            visitedTypeNames,
        });
    }

    return undefined;
}

function collectPropertiesFromInterface(input: {
    readonly declarationIndex: DeclarationIndex;
    readonly interfaceDeclaration: ts.InterfaceDeclaration;
    readonly visitedTypeNames: ReadonlySet<string>;
}): RequiredPropertyMap | undefined {
    const properties: Map<string, RequiredProperty> = new Map();

    for (const heritageClause of input.interfaceDeclaration.heritageClauses ?? []) {
        for (const heritageType of heritageClause.types) {
            if (!ts.isIdentifier(heritageType.expression)) {
                return undefined;
            }

            const inheritedProperties: RequiredPropertyMap | undefined = collectRequiredProperties({
                declarationIndex: input.declarationIndex,
                typeNode: ts.factory.createTypeReferenceNode(heritageType.expression.text),
                visitedTypeNames: input.visitedTypeNames,
            });

            if (inheritedProperties === undefined) {
                return undefined;
            }

            for (const [propertyName, property] of inheritedProperties) {
                properties.set(propertyName, property);
            }
        }
    }

    for (const [propertyName, property] of collectPropertiesFromMembers(
        input.declarationIndex,
        input.interfaceDeclaration.members
    )) {
        properties.set(propertyName, property);
    }

    return properties;
}

function collectPropertiesFromMembers(
    declarationIndex: DeclarationIndex,
    members: ts.NodeArray<ts.TypeElement>
): RequiredPropertyMap {
    const properties: Map<string, RequiredProperty> = new Map();

    for (const member of members) {
        if (
            ts.isPropertySignature(member) &&
            member.questionToken === undefined &&
            member.type !== undefined
        ) {
            const propertyName: string | undefined = getPropertyNameText(member.name);
            const literalValue: string | undefined = getStringLiteralTypeValue(
                declarationIndex,
                member.type
            );

            if (propertyName !== undefined) {
                properties.set(propertyName, { literalValue });
            }
        }
    }

    return properties;
}

function getPropertyNameText(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
        return name.text;
    }

    return undefined;
}

function getStringLiteralTypeValue(
    declarationIndex: DeclarationIndex,
    typeNode: ts.TypeNode
): string | undefined {
    if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
        return typeNode.literal.text;
    }

    if (ts.isTypeQueryNode(typeNode) && ts.isIdentifier(typeNode.exprName)) {
        return declarationIndex.stringConstants.get(typeNode.exprName.text);
    }

    return undefined;
}

interface DiscriminatorAnalysis {
    readonly candidateFailures: readonly DiscriminatorCandidateFailure[];
    readonly validDiscriminator?: ValidDiscriminator | undefined;
}

interface DiscriminatorCandidateFailure {
    readonly duplicateValues: ReadonlyMap<string, number>;
    readonly fieldName: string;
    readonly nonLiteralVariantCount: number;
}

interface ValidDiscriminator {
    readonly fieldName: string;
    readonly literalValues: readonly string[];
}

function analyzeDiscriminatorCandidates(
    variants: readonly RequiredPropertyMap[]
): DiscriminatorAnalysis {
    const candidateFieldNames: string[] = [...(variants[0]?.keys() ?? [])].filter(
        (fieldName: string): boolean =>
            variants.every((variant: RequiredPropertyMap): boolean => variant.has(fieldName))
    );
    const candidateFailures: DiscriminatorCandidateFailure[] = [];

    for (const fieldName of candidateFieldNames) {
        const valueCounts: Map<string, number> = new Map();
        let nonLiteralVariantCount: number = 0;

        for (const variant of variants) {
            const property: RequiredProperty | undefined = variant.get(fieldName);
            const literalValue: string | undefined = property?.literalValue;

            if (literalValue !== undefined) {
                valueCounts.set(literalValue, (valueCounts.get(literalValue) ?? 0) + 1);
            } else {
                nonLiteralVariantCount += 1;
            }
        }

        const duplicateValues: Map<string, number> = new Map(
            [...valueCounts].filter((entry: readonly [string, number]): boolean => {
                const duplicateCount: number = entry[1];

                return duplicateCount > 1;
            })
        );

        if (
            nonLiteralVariantCount === 0 &&
            duplicateValues.size === 0 &&
            valueCounts.size === variants.length
        ) {
            return {
                candidateFailures,
                validDiscriminator: {
                    fieldName,
                    literalValues: [...valueCounts.keys()],
                },
            };
        }

        if (valueCounts.size > 0) {
            candidateFailures.push({
                duplicateValues,
                fieldName,
                nonLiteralVariantCount,
            });
        }
    }

    return { candidateFailures };
}

function checkSourceFileDiscriminatedUnionDispatch(input: {
    readonly checker: ts.TypeChecker;
    readonly publicUnionDescriptors: ReadonlyMap<string, DiscriminatedUnionDescriptor>;
    readonly sourceFile: ts.SourceFile;
}): readonly TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];

    function visit(node: ts.Node): void {
        if (ts.isSwitchStatement(node)) {
            const diagnostic: TstsDiagnostic | undefined = checkDiscriminatedUnionSwitchStatement({
                checker: input.checker,
                sourceFile: input.sourceFile,
                switchStatement: node,
            });

            if (diagnostic !== undefined) {
                diagnostics.push(diagnostic);
            }
        }

        if (ts.isIfStatement(node)) {
            const diagnostic: TstsDiagnostic | undefined = checkPublicUnionIfStatement({
                checker: input.checker,
                ifStatement: node,
                publicUnionDescriptors: input.publicUnionDescriptors,
                sourceFile: input.sourceFile,
            });

            if (diagnostic !== undefined) {
                diagnostics.push(diagnostic);
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(input.sourceFile);

    return diagnostics;
}

function checkDiscriminatedUnionSwitchStatement(input: {
    readonly checker: ts.TypeChecker;
    readonly sourceFile: ts.SourceFile;
    readonly switchStatement: ts.SwitchStatement;
}): TstsDiagnostic | undefined {
    const descriptor: ExhaustiveSwitchDescriptor | undefined =
        getExhaustiveSwitchDescriptor({
            checker: input.checker,
            switchExpression: input.switchStatement.expression,
        });

    if (descriptor === undefined) {
        return undefined;
    }

    const handledValues: Set<string> = new Set();

    for (const clause of input.switchStatement.caseBlock.clauses) {
        if (!ts.isCaseClause(clause)) {
            continue;
        }

        const caseType: ts.Type = input.checker.getTypeAtLocation(clause.expression);

        const caseValue: ExhaustiveSwitchValue | undefined = getExhaustiveSwitchValue({
            checker: input.checker,
            type: caseType,
        });

        if (caseValue !== undefined) {
            handledValues.add(caseValue.key);
        }
    }

    const missingValues: readonly ExhaustiveSwitchValue[] =
        descriptor.discriminatorValues.filter(
            (discriminatorValue: ExhaustiveSwitchValue): boolean =>
                !handledValues.has(discriminatorValue.key)
        );

    if (missingValues.length === 0) {
        const defaultClause: ts.DefaultClause | undefined =
            input.switchStatement.caseBlock.clauses.find(ts.isDefaultClause);

        if (defaultClause === undefined) {
            return undefined;
        }

        const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
            defaultClause.getStart(input.sourceFile)
        );

        return {
            column: location.character + 1,
            filePath: input.sourceFile.fileName,
            line: location.line + 1,
            message: `Switch over discriminated union ${descriptor.displayName} must not use a default clause; handle every variant explicitly.`,
            ruleId: 'discriminated-union-exhaustive-dispatch',
            severity: 'error',
        };
    }

    const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
        input.switchStatement.expression.getStart(input.sourceFile)
    );

    return {
        column: location.character + 1,
        filePath: input.sourceFile.fileName,
        line: location.line + 1,
        message: `Switch over discriminated union ${descriptor.displayName} must handle every variant. Missing cases: ${missingValues.map((value: ExhaustiveSwitchValue): string => value.label).join(', ')}.`,
        ruleId: 'discriminated-union-exhaustive-dispatch',
        severity: 'error',
    };
}

function checkPublicUnionIfStatement(input: {
    readonly checker: ts.TypeChecker;
    readonly ifStatement: ts.IfStatement;
    readonly publicUnionDescriptors: ReadonlyMap<string, DiscriminatedUnionDescriptor>;
    readonly sourceFile: ts.SourceFile;
}): TstsDiagnostic | undefined {
    const propertyAccessExpression: ts.PropertyAccessExpression | undefined =
        getComparedPropertyAccessExpression(input.ifStatement.expression);

    if (propertyAccessExpression === undefined) {
        return undefined;
    }

    const descriptor: DiscriminatedUnionDescriptor | undefined =
        getPublicUnionDescriptorForPropertyAccess({
            checker: input.checker,
            propertyAccessExpression,
            publicUnionDescriptors: input.publicUnionDescriptors,
        });

    if (descriptor === undefined) {
        return undefined;
    }

    const location: ts.LineAndCharacter = input.sourceFile.getLineAndCharacterOfPosition(
        input.ifStatement.expression.getStart(input.sourceFile)
    );

    return {
        column: location.character + 1,
        filePath: input.sourceFile.fileName,
        line: location.line + 1,
        message: `Dispatch over public union ${descriptor.unionName}.${descriptor.discriminatorFieldName} must use an exhaustive switch, not an if statement.`,
        ruleId: 'public-union-exhaustive-dispatch',
        severity: 'error',
    };
}

function getComparedPropertyAccessExpression(
    expression: ts.Expression
): ts.PropertyAccessExpression | undefined {
    if (!ts.isBinaryExpression(expression)) {
        return undefined;
    }

    if (
        expression.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
        expression.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken
    ) {
        return undefined;
    }

    if (ts.isPropertyAccessExpression(expression.left) && ts.isStringLiteral(expression.right)) {
        return expression.left;
    }

    if (ts.isPropertyAccessExpression(expression.right) && ts.isStringLiteral(expression.left)) {
        return expression.right;
    }

    return undefined;
}

function getExhaustiveSwitchDescriptor(input: {
    readonly checker: ts.TypeChecker;
    readonly switchExpression: ts.Expression;
}): ExhaustiveSwitchDescriptor | undefined {
    if (!ts.isPropertyAccessExpression(input.switchExpression)) {
        return undefined;
    }

    const receiverType: ts.Type = input.checker.getTypeAtLocation(
        input.switchExpression.expression
    );
    if (!receiverType.isUnion()) {
        return undefined;
    }

    const discriminatorValues: ExhaustiveSwitchValue[] = [];

    for (const variant of receiverType.types) {
        const discriminatorSymbol: ts.Symbol | undefined = input.checker.getPropertyOfType(
            variant,
            input.switchExpression.name.text
        );
        if (discriminatorSymbol === undefined) {
            return undefined;
        }

        const discriminatorType: ts.Type = input.checker.getTypeOfSymbolAtLocation(
            discriminatorSymbol,
            input.switchExpression.expression
        );
        const discriminatorValue: ExhaustiveSwitchValue | undefined =
            getExhaustiveSwitchValue({ checker: input.checker, type: discriminatorType });

        if (discriminatorValue === undefined) {
            return undefined;
        }

        discriminatorValues.push(discriminatorValue);
    }

    if (
        new Set(discriminatorValues.map((value: ExhaustiveSwitchValue): string => value.key)).size !==
        receiverType.types.length
    ) {
        return undefined;
    }

    return {
        discriminatorValues,
        displayName: `${receiverType.aliasSymbol?.getName() ?? input.switchExpression.expression.getText()}.${input.switchExpression.name.text}`,
    };
}

function getExhaustiveSwitchValue(input: {
    readonly checker: ts.TypeChecker;
    readonly type: ts.Type;
}): ExhaustiveSwitchValue | undefined {
    if (input.type.isStringLiteral()) {
        return { key: `string:${input.type.value}`, label: input.type.value };
    }

    if ((input.type.flags & (ts.TypeFlags.Literal | ts.TypeFlags.EnumLiteral)) === 0) {
        return undefined;
    }

    const typeText: string = input.checker.typeToString(input.type);

    return { key: typeText, label: typeText };
}

function getPublicUnionDescriptorForPropertyAccess(input: {
    readonly checker: ts.TypeChecker;
    readonly propertyAccessExpression: ts.PropertyAccessExpression;
    readonly publicUnionDescriptors: ReadonlyMap<string, DiscriminatedUnionDescriptor>;
}): DiscriminatedUnionDescriptor | undefined {
    const receiverType: ts.Type = input.checker.getTypeAtLocation(
        input.propertyAccessExpression.expression
    );
    const unionName: string | undefined =
        receiverType.aliasSymbol?.getName() ?? input.checker.typeToString(receiverType);
    const descriptor: DiscriminatedUnionDescriptor | undefined =
        input.publicUnionDescriptors.get(unionName);

    if (descriptor === undefined) {
        return undefined;
    }

    if (input.propertyAccessExpression.name.text !== descriptor.discriminatorFieldName) {
        return undefined;
    }

    return descriptor;
}

function formatDiscriminatorFailureMessage(input: {
    readonly analysis: DiscriminatorAnalysis;
    readonly unionName: string;
}): string {
    if (input.analysis.candidateFailures.length === 0) {
        return `Public union ${input.unionName} must have one required discriminator field with unique literal values across all variants. No required string-literal field is present in every variant.`;
    }

    const candidateSummaries: string = input.analysis.candidateFailures
        .map((failure: DiscriminatorCandidateFailure): string => {
            const failureReasons: string[] = [];

            if (failure.nonLiteralVariantCount > 0) {
                const variantWord: string =
                    failure.nonLiteralVariantCount === 1 ? 'variant' : 'variants';
                failureReasons.push(
                    `is not a string literal in ${failure.nonLiteralVariantCount} ${variantWord}`
                );
            }

            if (failure.duplicateValues.size > 0) {
                const duplicateSummary: string = [...failure.duplicateValues]
                    .map((entry: readonly [string, number]): string => {
                        const literalValue: string = entry[0];
                        const occurrenceCount: number = entry[1];

                        return `"${literalValue}" appears in ${occurrenceCount} variants`;
                    })
                    .join(', ');

                failureReasons.push(`reuses ${duplicateSummary}`);
            }

            if (failureReasons.length === 0) {
                return `"${failure.fieldName}" is present in every variant but does not uniquely identify all variants`;
            }

            return `"${failure.fieldName}" ${failureReasons.join(' and ')}`;
        })
        .join('; ');

    return `Public union ${input.unionName} must have one required discriminator field with unique literal values across all variants. Candidate ${candidateSummaries}.`;
}

function isExportedDeclaration(node: ts.Node): boolean {
    const declarationNode: ts.Node =
        ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent)
            ? node.parent.parent
            : node;
    const modifiers: readonly ts.ModifierLike[] | undefined = ts.canHaveModifiers(declarationNode)
        ? ts.getModifiers(declarationNode)
        : undefined;

    return (
        modifiers?.some(
            (modifier: ts.ModifierLike): boolean => modifier.kind === ts.SyntaxKind.ExportKeyword
        ) ?? false
    );
}

function toTstsDiagnostic(diagnostic: ts.Diagnostic): TstsDiagnostic {
    const sourceFile: ts.SourceFile | undefined = diagnostic.file;
    const start: number | undefined = diagnostic.start;
    const location: ts.LineAndCharacter | undefined =
        sourceFile !== undefined && start !== undefined
            ? sourceFile.getLineAndCharacterOfPosition(start)
            : undefined;

    return {
        column: location === undefined ? undefined : location.character + 1,
        filePath: sourceFile?.fileName,
        line: location === undefined ? undefined : location.line + 1,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ruleId: 'typescript-config',
        severity: 'error',
    };
}
