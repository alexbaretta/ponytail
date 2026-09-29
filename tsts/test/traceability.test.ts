// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
    checkTraceabilityAnnotations,
    type TraceabilityConfigurationV1,
    type TraceabilityConfigurationV2,
} from '../src/traceability.js';
import type { TstsCheckResult } from '../src/index.js';

async function writeFixture(source: string): Promise<{
    readonly configurationPath: string;
    readonly projectPath: string;
}> {
    const root: string = await mkdtemp(path.join(os.tmpdir(), 'tsts-traceability-'));
    const projectPath: string = 'tsconfig.json';
    const configurationPath: string = path.join(root, 'traceability.json');
    const configuration: TraceabilityConfigurationV1 = {
        artifacts: [
            {
                class: 'implementation',
                locator: 'typescript',
                path: 'source.ts',
            },
        ],
        generatedArtifacts: [],
        projectRoot: '.',
        requirements: [
            {
                id: 'REQ-ONE',
                sourcePath: 'requirements.md',
            },
        ],
        reverseViewPath: 'traceability.generated.md',
        schemaVersion: 1,
        typescript: {
            cliPath: 'tsts.js',
            projectPath,
        },
    };
    await writeFile(
        path.join(root, projectPath),
        `${JSON.stringify({
            compilerOptions: {
                strict: true,
                target: 'ES2024',
            },
            files: ['source.ts'],
        })}\n`
    );
    await writeFile(configurationPath, `${JSON.stringify(configuration)}\n`);
    await writeFile(path.join(root, 'source.ts'), source);
    return { configurationPath, projectPath };
}

async function writesSharedTypeScriptArtifactFixture(): Promise<{
    readonly configurationPath: string;
    readonly projectPath: string;
}> {
    const traceabilityFixture: {
        readonly configurationPath: string;
        readonly projectPath: string;
    } = await writeFixture(
        '// Traceability: implements REQ-ONE\nexport function implementation(): void {}\n// Traceability: verifies REQ-ONE\nexport function verification(): void {}\n'
    );
    const configuration: TraceabilityConfigurationV1 = {
        artifacts: [
            {
                class: 'implementation',
                locator: 'typescript',
                path: 'source.ts',
                roles: ['implements'],
            },
            {
                class: 'unit-test',
                locator: 'typescript',
                path: 'source.ts',
                roles: ['verifies'],
            },
        ],
        generatedArtifacts: [],
        projectRoot: '.',
        requirements: [{ id: 'REQ-ONE', sourcePath: 'requirements.md' }],
        reverseViewPath: 'traceability.generated.md',
        schemaVersion: 1,
        typescript: {
            cliPath: 'tsts.js',
            projectPath: traceabilityFixture.projectPath,
        },
    };
    await writeFile(
        traceabilityFixture.configurationPath,
        `${JSON.stringify(configuration)}\n`
    );
    return traceabilityFixture;
}

// Traceability: verifies REQ-REQUIREMENTS-TRACEABILITY
async function verifiesTypeScriptTraceability(): Promise<void> {
    const traceabilityFixture: {
        readonly configurationPath: string;
        readonly projectPath: string;
    } = await writeFixture(
        '// Traceability: implements REQ-ONE\nexport function traced(): void {}\n'
    );

    const result: TstsCheckResult = await checkTraceabilityAnnotations(
        traceabilityFixture
    );

    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.checkedFileCount, 1);
}

describe('TypeScript traceability locators', (): void => {
    it('accepts a leading annotation on a named declaration', verifiesTypeScriptTraceability);

    it('rejects annotations inside a declaration body', async (): Promise<void> => {
        const traceabilityFixture: {
            readonly configurationPath: string;
            readonly projectPath: string;
        } = await writeFixture(
            'export function untraced(): void {\n  // Traceability: implements REQ-ONE\n}\n'
        );

        const result: TstsCheckResult = await checkTraceabilityAnnotations(
            traceabilityFixture
        );

        assert.equal(result.diagnostics.length, 1);
        assert.equal(result.diagnostics[0]?.ruleId, 'traceability-typescript-locator');
        assert.match(
            result.diagnostics[0]?.message ?? '',
            /not attached to a supported named declaration/u
        );
    });

    it('rejects configured files outside the TypeScript project', async (): Promise<void> => {
        const traceabilityFixture: {
            readonly configurationPath: string;
            readonly projectPath: string;
        } = await writeFixture(
            '// Traceability: implements REQ-ONE\nexport const traced: number = 1;\n'
        );
        await writeFile(
            path.join(path.dirname(traceabilityFixture.configurationPath), 'tsconfig.json'),
            `${JSON.stringify({ files: [] })}\n`
        );

        const result: TstsCheckResult = await checkTraceabilityAnnotations(
            traceabilityFixture
        );

        assert.equal(result.diagnostics.length, 1);
        assert.match(result.diagnostics[0]?.message ?? '', /not part of the project/u);
    });

    it('checks a shared configured TypeScript path once', async (): Promise<void> => {
        const traceabilityFixture: {
            readonly configurationPath: string;
            readonly projectPath: string;
        } = await writesSharedTypeScriptArtifactFixture();

        const result: TstsCheckResult = await checkTraceabilityAnnotations(
            traceabilityFixture
        );

        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.checkedFileCount, 1);
    });

    it('accepts an exact V2 configuration with safe search fields', async (): Promise<void> => {
        const traceabilityFixture: {
            readonly configurationPath: string;
            readonly projectPath: string;
        } = await writeFixture(
            '// Traceability: implements REQ-ONE\nexport const traced: number = 1;\n'
        );
        const configuration: TraceabilityConfigurationV2 = {
            artifacts: [
                {
                    class: 'implementation',
                    locator: 'typescript',
                    path: 'source.ts',
                },
            ],
            generatedArtifacts: [],
            index: { searchableFields: ['requirementId', 'path'] },
            projectRoot: '.',
            requirements: [{ id: 'REQ-ONE', sourcePath: 'requirements.md' }],
            reverseViewPath: 'traceability.generated.md',
            schemaVersion: 2,
            typescript: {
                cliPath: 'tsts.js',
                projectPath: traceabilityFixture.projectPath,
            },
        };
        await writeFile(
            traceabilityFixture.configurationPath,
            `${JSON.stringify(configuration)}\n`
        );

        const result: TstsCheckResult = await checkTraceabilityAnnotations(
            traceabilityFixture
        );

        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.checkedFileCount, 1);
    });
});
