// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import type { TstsCheckResult, TstsConfig, TstsDiagnostic } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';

interface ContractImplementationFixture {
    readonly downgradeRegistryExport?: string | undefined;
    readonly module: string;
    readonly readerRegistryExport: string;
    readonly workspace: string;
}

interface ContractFamilyFixture {
    readonly currentVersion: string;
    readonly id: string;
    readonly implementation: ContractImplementationFixture;
    readonly supportedDowngradeVersions: readonly string[];
    readonly supportedReadVersions: readonly string[];
    readonly versions: readonly string[];
}

interface CreateFixtureInput {
    readonly downgradeRegistryExport?: string | undefined;
    readonly duplicateFamilyId?: boolean | undefined;
    readonly familyIds?: readonly string[] | undefined;
    readonly invalidFamilyIds?: readonly string[] | undefined;
    readonly source: string;
    readonly supportedDowngradeVersions: readonly string[];
    readonly supportedReadVersions: readonly string[];
}

describe('versioned data contracts rule', (): void => {
    it('accepts exact readers and no adapters when none are required', async ():
        Promise<void> => {
        const configPath: string = await createFixture({
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        const result: TstsCheckResult = await checkProject({ configPath });
        assert.deepEqual(versionedDiagnostics(result), []);
    });

    it('reports missing readers and downgrade adapters', async (): Promise<void> => {
        const configPath: string = await createFixture({
            source: `${contractSource('V2')}
                export const ExampleDowngrades = {
                    V1: (input: Current): Current => input,
                };
            `,
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: ['V1', 'V2'],
            downgradeRegistryExport: 'ExampleDowngrades',
        });
        const diagnostics: readonly TstsDiagnostic[] = versionedDiagnostics(
            await checkProject({ configPath })
        );
        assert.ok(diagnostics.some((diagnostic: TstsDiagnostic): boolean =>
            diagnostic.ruleId === 'versioned-data-contract-reader-missing' &&
            diagnostic.message.includes('"V1"')
        ));
        assert.ok(diagnostics.some((diagnostic: TstsDiagnostic): boolean =>
            diagnostic.ruleId === 'versioned-data-contract-adapter-missing' &&
            diagnostic.message.includes('"V2"')
        ));
    });

    it('checks a selected valid family without checking an unrelated invalid family', async ():
        Promise<void> => {
        const configPath: string = await createFixture({
            familyIds: ['example'],
            invalidFamilyIds: ['unrelated'],
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        assert.deepEqual(versionedDiagnostics(await checkProject({ configPath })), []);
    });

    it('checks selected families in configuration order', async (): Promise<void> => {
        const configPath: string = await createFixture({
            familyIds: ['second', 'first'],
            invalidFamilyIds: ['first', 'second'],
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        assert.deepEqual(
            diagnosticMessages(await checkProject({ configPath })),
            [
                'second: Workspace "missing-second" does not exist in tsts.json.',
                'first: Workspace "missing-first" does not exist in tsts.json.',
            ]
        );
    });

    it('reports every selected family missing from the manifest', async (): Promise<void> => {
        const configPath: string = await createFixture({
            familyIds: ['missing-first', 'missing-second'],
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        assert.deepEqual(
            versionedDiagnostics(await checkProject({ configPath })).map(
                (diagnostic: TstsDiagnostic): string =>
                    `${diagnostic.ruleId}:${diagnostic.message}`
            ),
            [
                'versioned-data-contract-family-selection:Selected family id "missing-first" does not exist in the manifest.',
                'versioned-data-contract-family-selection:Selected family id "missing-second" does not exist in the manifest.',
            ]
        );
    });

    it('rejects empty and duplicate family selections at the configuration boundary', async ():
        Promise<void> => {
        for (const familyIds of [[], [''], ['example', 'example']]) {
            const configPath: string = await createMalformedSelectionFixture(familyIds);
            const result: TstsCheckResult = await checkProject({ configPath });
            assert.deepEqual(
                result.diagnostics.map((diagnostic: TstsDiagnostic): string => diagnostic.ruleId),
                ['tsts-config']
            );
        }
    });

    it('validates duplicate manifest IDs before applying selection', async (): Promise<void> => {
        const configPath: string = await createFixture({
            duplicateFamilyId: true,
            familyIds: ['example'],
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        assert.deepEqual(
            diagnosticMessages(await checkProject({ configPath })),
            ['example: Duplicate family id "example".']
        );
    });

    it('checks every manifest family when selection is omitted', async (): Promise<void> => {
        const configPath: string = await createFixture({
            invalidFamilyIds: ['unrelated'],
            source: contractSource('V1', 'V2'),
            supportedReadVersions: ['V1', 'V2'],
            supportedDowngradeVersions: [],
        });
        assert.deepEqual(
            diagnosticMessages(await checkProject({ configPath })),
            ['unrelated: Workspace "missing-unrelated" does not exist in tsts.json.']
        );
    });
});

function contractSource(...versions: readonly string[]): string {
    const variants: string = versions.map((version: string): string => `
        ${version}: { normalize: (input: Current): Current => input },
    `).join('\n');
    return `
        export type Current = { readonly model_version: 2 };
        const WriterVersion: 'V2' = 'V2';
        export const ExampleContract = {
            variants: { ${variants} },
            writerVariant: WriterVersion,
        };
    `;
}

async function createFixture(input: CreateFixtureInput): Promise<string> {
    const root: string = await mkdtemp(path.join(tmpdir(), 'tsts-versioned-contracts-'));
    const appDirectory: string = path.join(root, 'app');
    await mkdir(appDirectory);
    await writeFile(path.join(appDirectory, 'contract.ts'), input.source);
    await writeFile(
        path.join(appDirectory, 'tsconfig.json'),
        stringifyJsonLosslessly({
            compilerOptions: {
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                target: 'ES2024',
            },
            files: ['contract.ts'],
        })
    );
    const implementation: ContractImplementationFixture = {
        workspace: 'app',
        module: 'app/contract.ts',
        readerRegistryExport: 'ExampleContract',
        ...(input.downgradeRegistryExport === undefined
            ? {}
            : { downgradeRegistryExport: input.downgradeRegistryExport }),
    };
    const exampleFamily: ContractFamilyFixture = {
        id: 'example',
        implementation,
        currentVersion: 'V2',
        versions: ['V1', 'V2'],
        supportedReadVersions: input.supportedReadVersions,
        supportedDowngradeVersions: input.supportedDowngradeVersions,
    };
    const invalidFamilies: readonly ContractFamilyFixture[] =
        (input.invalidFamilyIds ?? []).map(invalidFamily);
    await writeFile(
        path.join(root, 'versioned-data-contracts.json'),
        stringifyJsonLosslessly({
            schemaVersion: 1,
            families: [
                exampleFamily,
                ...invalidFamilies,
                ...(input.duplicateFamilyId === true ? [exampleFamily] : []),
            ],
        })
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        versionedDataContracts: {
            severity: 'error',
            manifestPath: 'versioned-data-contracts.json',
            ...(input.familyIds === undefined ? {} : { familyIds: input.familyIds }),
        },
        workspaces: [{ name: 'app', projectPath: 'app/tsconfig.json' }],
    };
    const configPath: string = path.join(root, 'tsts.json');
    await writeFile(configPath, stringifyJsonLosslessly(config));
    return configPath;
}

function invalidFamily(id: string): ContractFamilyFixture {
    return {
        id,
        implementation: {
            workspace: `missing-${id}`,
            module: `missing-${id}/contract.ts`,
            readerRegistryExport: 'MissingContract',
        },
        currentVersion: 'V1',
        versions: ['V1'],
        supportedReadVersions: ['V1'],
        supportedDowngradeVersions: [],
    };
}

async function createMalformedSelectionFixture(familyIds: unknown): Promise<string> {
    const configPath: string = await createFixture({
        source: contractSource('V1', 'V2'),
        supportedReadVersions: ['V1', 'V2'],
        supportedDowngradeVersions: [],
    });
    await writeFile(
        configPath,
        stringifyJsonLosslessly({
            schemaVersion: 2,
            versionedDataContracts: {
                familyIds,
                manifestPath: 'versioned-data-contracts.json',
            },
            workspaces: [{ name: 'app', projectPath: 'app/tsconfig.json' }],
        })
    );
    return configPath;
}

function versionedDiagnostics(result: TstsCheckResult): readonly TstsDiagnostic[] {
    return result.diagnostics.filter((diagnostic: TstsDiagnostic): boolean =>
        diagnostic.ruleId.startsWith('versioned-data-contract-')
    );
}

function diagnosticMessages(result: TstsCheckResult): readonly string[] {
    return versionedDiagnostics(result).map(
        (diagnostic: TstsDiagnostic): string => diagnostic.message
    );
}
