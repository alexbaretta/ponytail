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

interface ConfigCheckFixture {
    readonly configPath: string;
    readonly result: TstsCheckResult;
}

interface UnknownConfigPropertyCase {
    readonly config: unknown;
    readonly propertyPath: string;
}

const validConfig: TstsConfig = {
    schemaVersion: 2,
    workspaces: [
        {
            name: 'records',
            packageName: '@example/records',
            projectPath: 'records/tsconfig.json',
        },
    ],
};

describe('TSTS configuration v2', (): void => {
    it('accepts an exact graph-only configuration', async (): Promise<void> => {
        const fixture: ConfigCheckFixture = await checkConfig(validConfig);

        assert.equal(fixture.result.checkedFileCount, 1);
        assert.deepEqual(fixture.result.diagnostics, []);
    });

    it('rejects missing and unsupported schema versions with upgrade guidance', async ():
        Promise<void> => {
        for (const config of [
            { workspaces: validConfig.workspaces },
            { schemaVersion: 1, workspaces: validConfig.workspaces },
            { schemaVersion: 3, workspaces: validConfig.workspaces },
        ]) {
            const fixture: ConfigCheckFixture = await checkConfig(config);

            assert.deepEqual(fixture.result.diagnostics, [
                invalidVersionDiagnostic(fixture.configPath),
            ]);
        }
    });

    it('rejects unknown keys at every configuration object level', async ():
        Promise<void> => {
        const malformedConfigs: readonly UnknownConfigPropertyCase[] = [
            {
                config: { ...validConfig, unexpected: true },
                propertyPath: '$.unexpected',
            },
            {
                config: {
                    ...validConfig,
                    workspaces: [
                        { projectPath: 'records/tsconfig.json', unexpected: true },
                    ],
                },
                propertyPath: '$.workspaces[0].unexpected',
            },
            {
                config: { ...validConfig, noAliasing: { unexpected: true } },
                propertyPath: '$.noAliasing.unexpected',
            },
            {
                config: { ...validConfig, unusedCode: { unexpected: true } },
                propertyPath: '$.unusedCode.unexpected',
            },
            {
                config: {
                    ...validConfig,
                    typeSafeSerdes: { contracts: [], unexpected: true },
                },
                propertyPath: '$.typeSafeSerdes.unexpected',
            },
            {
                config: {
                    ...validConfig,
                    typeSafeSerdes: {
                        contracts: [
                            {
                                canonicalSchemaName: 'RecordEnvelopeSchema',
                                canonicalTypeName: 'RecordEnvelope',
                                propertyNames: ['record_payload'],
                                unexpected: true,
                            },
                        ],
                    },
                },
                propertyPath: '$.typeSafeSerdes.contracts[0].unexpected',
            },
            {
                config: {
                    ...validConfig,
                    versionedDataContracts: {
                        manifestPath: 'contracts.json',
                        unexpected: true,
                    },
                },
                propertyPath: '$.versionedDataContracts.unexpected',
            },
        ];

        for (const testCase of malformedConfigs) {
            const fixture: ConfigCheckFixture = await checkConfig(testCase.config);

            assert.deepEqual(fixture.result.diagnostics, [
                unknownPropertyDiagnostic(fixture.configPath, testCase.propertyPath),
            ]);
        }
    });

    it('rejects malformed required fields and severities', async (): Promise<void> => {
        const malformedConfigs: readonly unknown[] = [
            { schemaVersion: 2 },
            { ...validConfig, workspaces: [{}] },
            {
                ...validConfig,
                workspaces: [{ projectPath: 'records/tsconfig.json', publicEntrypoints: 'index.ts' }],
            },
            {
                ...validConfig,
                workspaces: [{ projectPath: 'records/tsconfig.json', publicEntrypoints: [1] }],
            },
            { ...validConfig, noAliasing: { severity: 'notice' } },
            { ...validConfig, unusedCode: { severity: 'notice' } },
            {
                ...validConfig,
                typeSafeSerdes: { contracts: [], severity: 'notice' },
            },
            {
                ...validConfig,
                typeSafeSerdes: {
                    contracts: [
                        {
                            canonicalSchemaName: 'RecordEnvelopeSchema',
                            propertyNames: ['record_payload'],
                        },
                    ],
                },
            },
            {
                ...validConfig,
                versionedDataContracts: {
                    manifestPath: 'contracts.json',
                    severity: 'notice',
                },
            },
        ];

        for (const config of malformedConfigs) {
            const fixture: ConfigCheckFixture = await checkConfig(config);

            assert.deepEqual(fixture.result.diagnostics, [
                invalidShapeDiagnostic(fixture.configPath),
            ]);
        }
    });
});

async function checkConfig(config: unknown): Promise<ConfigCheckFixture> {
    const root: string = await mkdtemp(path.join(tmpdir(), 'tsts-config-v2-'));
    const workspaceDirectory: string = path.join(root, 'records');
    const configPath: string = path.join(root, 'tsts.json');

    await mkdir(workspaceDirectory);
    await writeFile(path.join(workspaceDirectory, 'index.ts'), 'export {};\n');
    await writeFile(
        path.join(workspaceDirectory, 'tsconfig.json'),
        stringifyJsonLosslessly({
            compilerOptions: {
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                target: 'ES2024',
            },
            files: ['index.ts'],
        })
    );
    await writeFile(configPath, stringifyJsonLosslessly(config));

    return {
        configPath,
        result: await checkProject({ configPath }),
    };
}

function invalidVersionDiagnostic(configPath: string): TstsDiagnostic {
    return {
        message:
            `Invalid TSTS configuration at ${configPath}. ` +
            'Add "schemaVersion": 2 and migrate the configuration to the v2 contract.',
        ruleId: 'tsts-config',
        severity: 'error',
    };
}

function invalidShapeDiagnostic(configPath: string): TstsDiagnostic {
    return {
        message:
            `Invalid TSTS configuration at ${configPath}. ` +
            'Use only documented schemaVersion 2 keys and value shapes.',
        ruleId: 'tsts-config',
        severity: 'error',
    };
}

function unknownPropertyDiagnostic(
    configPath: string,
    propertyPath: string
): TstsDiagnostic {
    return {
        message:
            `Invalid TSTS configuration at ${configPath}. ` +
            `Unknown configuration property "${propertyPath}". ` +
            'Remove it or replace it with a documented schemaVersion 2 property.',
        ruleId: 'tsts-config',
        severity: 'error',
    };
}
