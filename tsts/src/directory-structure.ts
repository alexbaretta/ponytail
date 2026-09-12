// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { execFile } from 'node:child_process';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';

import { isLosslessNumber } from 'lossless-json';

import type { TstsCheckResult, TstsDiagnostic } from './index.js';
import { parseJsonLosslessly } from './lossless-json.js';

export type DirectoryStructureGitPolicy = 'either' | 'ignored' | 'tracked';

export interface DirectoryStructureRule {
    readonly allowedContentKinds: readonly string[];
    readonly git: DirectoryStructureGitPolicy;
    readonly path: string;
    readonly recursive: boolean;
}

export interface DirectoryStructureManifest {
    readonly contentKinds: Readonly<Record<string, readonly string[]>>;
    readonly directories: readonly DirectoryStructureRule[];
    readonly opaqueDirectories: readonly string[];
    readonly schemaVersion: 1;
}

interface ClassifiedDirectoryStructurePath {
    readonly contentKind: string;
    readonly kind: 'classified';
}

interface InvalidDirectoryStructurePath {
    readonly diagnostic: TstsDiagnostic;
    readonly kind: 'invalid';
}

// Discriminator: kind
type ClassifiedPath = ClassifiedDirectoryStructurePath | InvalidDirectoryStructurePath;

interface GitInventory {
    readonly ignoredPaths: ReadonlySet<string>;
    readonly paths: readonly string[];
    readonly trackedPaths: ReadonlySet<string>;
}

const manifestKeys: readonly string[] = [
    'contentKinds',
    'directories',
    'opaqueDirectories',
    'schemaVersion',
];
const directoryRuleKeys: readonly string[] = [
    'allowedContentKinds',
    'git',
    'path',
    'recursive',
];

export async function checkDirectoryStructure(
    manifestPath: string
): Promise<TstsCheckResult> {
    const absoluteManifestPath: string = path.resolve(manifestPath);

    try {
        const canonicalManifestPath: string = await realpath(absoluteManifestPath);
        const manifest: DirectoryStructureManifest = await loadDirectoryStructureManifest(
            canonicalManifestPath
        );
        const repositoryRoot: string = await realpath(
            await runGit(path.dirname(canonicalManifestPath), [
                'rev-parse',
                '--show-toplevel',
            ]).then((output: string): string => output.trim())
        );
        const relativeManifestPath: string = toRepositoryPath(
            path.relative(repositoryRoot, canonicalManifestPath)
        );

        if (!isRepositoryRelativePath(relativeManifestPath, false)) {
            throw new Error(
                `Directory-structure manifest ${canonicalManifestPath} is outside Git repository ${repositoryRoot}.`
            );
        }

        const gitInventory: GitInventory = await readGitInventory({
            manifest,
            repositoryRoot,
        });
        const diagnostics: TstsDiagnostic[] = [];

        for (const filePath of gitInventory.paths) {
            const classifiedPath: ClassifiedPath = classifyPath({
                contentKinds: manifest.contentKinds,
                filePath,
            });
            if (classifiedPath.kind === 'invalid') {
                diagnostics.push(classifiedPath.diagnostic);
                continue;
            }

            const directoryRule: DirectoryStructureRule | undefined = findOwningRule({
                filePath,
                rules: manifest.directories,
            });
            if (directoryRule === undefined) {
                diagnostics.push({
                    filePath,
                    message: 'No directory rule owns this path.',
                    ruleId: 'directory-structure-unowned',
                    severity: 'error',
                });
                continue;
            }

            const contentKind: string = classifiedPath.contentKind;
            if (!directoryRule.allowedContentKinds.includes(contentKind)) {
                diagnostics.push({
                    filePath,
                    message:
                        `Content kind "${contentKind}" is not allowed under ` +
                        `directory rule "${directoryRule.path}".`,
                    ruleId: 'directory-structure-content-kind',
                    severity: 'error',
                });
            }

            const gitState: DirectoryStructureGitPolicy | 'untracked' =
                gitInventory.trackedPaths.has(filePath)
                    ? 'tracked'
                    : gitInventory.ignoredPaths.has(filePath)
                      ? 'ignored'
                      : 'untracked';
            if (directoryRule.git !== 'either' && directoryRule.git !== gitState) {
                diagnostics.push({
                    filePath,
                    message:
                        `Git state "${gitState}" violates the "${directoryRule.git}" policy ` +
                        `for directory rule "${directoryRule.path}".`,
                    ruleId: 'directory-structure-git-state',
                    severity: 'error',
                });
            }
        }

        return {
            checkedFileCount: gitInventory.paths.length,
            diagnostics: diagnostics.sort(compareDiagnostics),
        };
    } catch (error: unknown) {
        return {
            checkedFileCount: 0,
            diagnostics: [
                {
                    filePath: absoluteManifestPath,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unable to load or apply the directory-structure manifest.',
                    ruleId: 'directory-structure-config',
                    severity: 'error',
                },
            ],
        };
    }
}

async function loadDirectoryStructureManifest(
    manifestPath: string
): Promise<DirectoryStructureManifest> {
    const value: unknown = parseJsonLosslessly(await readFile(manifestPath, 'utf8'));

    if (!isObjectRecord(value) || !isSchemaVersion1(value.schemaVersion)) {
        throw new Error(
            `Invalid directory-structure manifest at ${manifestPath}. ` +
                'Set "schemaVersion" to 1.'
        );
    }

    const rootUnknownKey: string | undefined = firstUnknownKey(value, manifestKeys);
    if (rootUnknownKey !== undefined) {
        throw new Error(
            `Invalid directory-structure manifest at ${manifestPath}. ` +
                `Unknown property "$.${rootUnknownKey}".`
        );
    }

    if (!isObjectRecord(value.contentKinds)) {
        throw invalidManifestShape(manifestPath);
    }

    const contentKinds: Record<string, readonly string[]> = {};
    for (const [contentKind, patterns] of Object.entries(value.contentKinds)) {
        if (
            contentKind.length === 0 ||
            !isNonemptyUniqueStringArray(patterns) ||
            !patterns.every((pattern: string): boolean => isRepositoryGlob(pattern))
        ) {
            throw invalidManifestShape(manifestPath);
        }
        contentKinds[contentKind] = patterns;
    }
    if (Object.keys(contentKinds).length === 0) {
        throw invalidManifestShape(manifestPath);
    }

    if (!Array.isArray(value.directories)) {
        throw invalidManifestShape(manifestPath);
    }
    const directories: DirectoryStructureRule[] = [];
    const ownedDirectoryPaths: Set<string> = new Set();
    for (const [index, candidate] of value.directories.entries()) {
        if (!isObjectRecord(candidate)) {
            throw invalidManifestShape(manifestPath);
        }
        const unknownKey: string | undefined = firstUnknownKey(candidate, directoryRuleKeys);
        if (unknownKey !== undefined) {
            throw new Error(
                `Invalid directory-structure manifest at ${manifestPath}. ` +
                    `Unknown property "$.directories[${index}].${unknownKey}".`
            );
        }
        if (
            typeof candidate.path !== 'string' ||
            !isRepositoryRelativePath(candidate.path, true) ||
            typeof candidate.recursive !== 'boolean' ||
            !isGitPolicy(candidate.git) ||
            !isNonemptyUniqueStringArray(candidate.allowedContentKinds) ||
            !candidate.allowedContentKinds.every(
                (contentKind: string): boolean => contentKinds[contentKind] !== undefined
            )
        ) {
            throw invalidManifestShape(manifestPath);
        }
        if (ownedDirectoryPaths.has(candidate.path)) {
            throw new Error(
                `Invalid directory-structure manifest at ${manifestPath}. ` +
                    `Directory "${candidate.path}" has more than one owner.`
            );
        }
        ownedDirectoryPaths.add(candidate.path);
        directories.push({
            allowedContentKinds: candidate.allowedContentKinds,
            git: candidate.git,
            path: candidate.path,
            recursive: candidate.recursive,
        });
    }
    if (directories.length === 0) {
        throw invalidManifestShape(manifestPath);
    }

    if (
        !isUniqueStringArray(value.opaqueDirectories) ||
        !value.opaqueDirectories.every(
            (directoryPath: string): boolean => isRepositoryGlob(directoryPath)
        )
    ) {
        throw invalidManifestShape(manifestPath);
    }

    return {
        contentKinds,
        directories,
        opaqueDirectories: value.opaqueDirectories,
        schemaVersion: 1,
    };
}

async function readGitInventory(input: {
    readonly manifest: DirectoryStructureManifest;
    readonly repositoryRoot: string;
}): Promise<GitInventory> {
    const pathspecs: string[] = [
        '.',
        ...input.manifest.opaqueDirectories.map(
            (directoryPath: string): string => `:(exclude,glob)${directoryPath}/**`
        ),
    ];
    const outputs: readonly string[] = await Promise.all([
        runGit(input.repositoryRoot, ['ls-files', '--cached', '-z', '--', ...pathspecs]),
        runGit(input.repositoryRoot, [
            'ls-files',
            '--others',
            '--exclude-standard',
            '-z',
            '--',
            ...pathspecs,
        ]),
        runGit(input.repositoryRoot, [
            'ls-files',
            '--others',
            '--ignored',
            '--exclude-standard',
            '-z',
            '--',
            ...pathspecs,
        ]),
    ]);
    const trackedOutput: string | undefined = outputs[0];
    const untrackedOutput: string | undefined = outputs[1];
    const ignoredOutput: string | undefined = outputs[2];
    if (
        trackedOutput === undefined ||
        untrackedOutput === undefined ||
        ignoredOutput === undefined
    ) {
        throw new Error('Git directory inventory returned an incomplete result.');
    }
    const trackedPaths: ReadonlySet<string> = new Set(splitNullSeparated(trackedOutput));
    const ignoredPaths: ReadonlySet<string> = new Set(splitNullSeparated(ignoredOutput));
    const paths: readonly string[] = [
        ...new Set([
            ...trackedPaths,
            ...splitNullSeparated(untrackedOutput),
            ...ignoredPaths,
        ]),
    ].sort();

    return { ignoredPaths, paths, trackedPaths };
}

function classifyPath(input: {
    readonly contentKinds: Readonly<Record<string, readonly string[]>>;
    readonly filePath: string;
}): ClassifiedPath {
    const matches: { readonly contentKind: string; readonly specificity: number }[] = [];

    for (const [contentKind, patterns] of Object.entries(input.contentKinds)) {
        const specificities: number[] = patterns
            .filter((pattern: string): boolean => path.matchesGlob(input.filePath, pattern))
            .map(patternSpecificity);
        if (specificities.length > 0) {
            matches.push({
                contentKind,
                specificity: Math.max(...specificities),
            });
        }
    }

    if (matches.length === 0) {
        return {
            kind: 'invalid',
            diagnostic: {
                filePath: input.filePath,
                message: 'Path does not match a declared content kind.',
                ruleId: 'directory-structure-unclassified',
                severity: 'error',
            },
        };
    }

    const highestSpecificity: number = Math.max(
        ...matches.map((match): number => match.specificity)
    );
    const winningKinds: readonly string[] = matches
        .filter((match): boolean => match.specificity === highestSpecificity)
        .map((match): string => match.contentKind)
        .sort();
    if (winningKinds.length !== 1) {
        return {
            kind: 'invalid',
            diagnostic: {
                filePath: input.filePath,
                message: `Path ambiguously matches content kinds: ${winningKinds.join(', ')}.`,
                ruleId: 'directory-structure-ambiguous-content-kind',
                severity: 'error',
            },
        };
    }

    const contentKind: string | undefined = winningKinds[0];
    if (contentKind === undefined) {
        throw new Error('Directory-structure classification produced no winning kind.');
    }
    return { contentKind, kind: 'classified' };
}

function findOwningRule(input: {
    readonly filePath: string;
    readonly rules: readonly DirectoryStructureRule[];
}): DirectoryStructureRule | undefined {
    const directoryPath: string = path.posix.dirname(input.filePath);

    return input.rules
        .filter((rule: DirectoryStructureRule): boolean => {
            if (rule.path === '.') {
                return rule.recursive || directoryPath === '.';
            }
            return rule.recursive
                ? directoryPath === rule.path || directoryPath.startsWith(`${rule.path}/`)
                : directoryPath === rule.path;
        })
        .sort(
            (left: DirectoryStructureRule, right: DirectoryStructureRule): number =>
                right.path.length - left.path.length
        )[0];
}

function patternSpecificity(pattern: string): number {
    return pattern.replaceAll(/[!*?[\]{}()]/gu, '').length;
}

function compareDiagnostics(left: TstsDiagnostic, right: TstsDiagnostic): number {
    return (
        (left.filePath ?? '').localeCompare(right.filePath ?? '') ||
        left.ruleId.localeCompare(right.ruleId) ||
        left.message.localeCompare(right.message)
    );
}

function invalidManifestShape(manifestPath: string): Error {
    return new Error(
        `Invalid directory-structure manifest at ${manifestPath}. ` +
            'Use only documented schemaVersion 1 keys and value shapes.'
    );
}

function isObjectRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    const prototype: object | null = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function firstUnknownKey(
    value: Readonly<Record<string, unknown>>,
    allowedKeys: readonly string[]
): string | undefined {
    return Object.keys(value).find((key: string): boolean => !allowedKeys.includes(key));
}

function isSchemaVersion1(value: unknown): boolean {
    return value === 1 || (isLosslessNumber(value) && value.value === '1');
}

function isGitPolicy(value: unknown): value is DirectoryStructureGitPolicy {
    return value === 'either' || value === 'ignored' || value === 'tracked';
}

function isUniqueStringArray(value: unknown): value is readonly string[] {
    return (
        Array.isArray(value) &&
        value.every((entry: unknown): entry is string => typeof entry === 'string') &&
        new Set(value).size === value.length
    );
}

function isNonemptyUniqueStringArray(value: unknown): value is readonly string[] {
    return (
        isUniqueStringArray(value) &&
        value.length > 0 &&
        value.every((entry: string): boolean => entry.length > 0)
    );
}

function isRepositoryRelativePath(value: string, allowRoot: boolean): boolean {
    if (value === '.') {
        return allowRoot;
    }
    return (
        value.length > 0 &&
        !path.posix.isAbsolute(value) &&
        !value.includes('\\') &&
        value
            .split('/')
            .every(
                (segment: string): boolean =>
                    segment !== '' && segment !== '.' && segment !== '..'
            ) &&
        path.posix.normalize(value) === value
    );
}

function isRepositoryGlob(value: string): boolean {
    if (!isRepositoryRelativePath(value, false)) {
        return false;
    }
    try {
        path.matchesGlob('', value);
        return true;
    } catch {
        return false;
    }
}

function toRepositoryPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

function splitNullSeparated(value: string): readonly string[] {
    return value
        .split('\0')
        .filter((entry: string): boolean => entry.length > 0)
        .map(toRepositoryPath);
}

function runGit(currentDirectory: string, args: readonly string[]): Promise<string> {
    return new Promise<string>((resolve, reject): void => {
        execFile(
            'git',
            ['-C', currentDirectory, ...args],
            { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
            (error: Error | null, stdout: string, stderr: string): void => {
                if (error !== null) {
                    reject(
                        new Error(
                            `Git directory inventory failed: ${stderr.trim() || error.message}`
                        )
                    );
                    return;
                }
                resolve(stdout);
            }
        );
    });
}
