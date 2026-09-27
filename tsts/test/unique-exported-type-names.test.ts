// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import type { TstsCheckResult, TstsConfig, TstsDiagnostic } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';

function writeFixtureFile(root: string, relativePath: string, contents: string): void {
    const filePath: string = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
}

function writeWorkspaceConfig(root: string, workspaceName: string): void {
    writeFixtureFile(
        root,
        `${workspaceName}/tsconfig.json`,
        stringifyJsonLosslessly(
            {
                compilerOptions: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    strict: true,
                    target: 'ES2022',
                },
                files: ['index.ts'],
            },
            2
        )
    );
}

function createFixture(secondWorkspaceSource: string): string {
    const root: string = fs.mkdtempSync(
        path.join(os.tmpdir(), 'tsts-unique-exported-type-names-')
    );
    writeFixtureFile(root, 'package.json', stringifyJsonLosslessly({ type: 'module' }, 2));
    writeWorkspaceConfig(root, 'contracts');
    writeWorkspaceConfig(root, 'consumer');
    writeFixtureFile(
        root,
        'contracts/index.ts',
        'export interface AppState { readonly currentScreen: string; }\n'
    );
    writeFixtureFile(root, 'consumer/index.ts', secondWorkspaceSource);

    const config: TstsConfig = {
        schemaVersion: 2,
        uniqueExportedTypeNames: {},
        workspaces: [
            {
                name: 'contracts',
                packageName: '@fixture/contracts',
                projectPath: 'contracts/tsconfig.json',
            },
            {
                name: 'consumer',
                packageName: '@fixture/consumer',
                projectPath: 'consumer/tsconfig.json',
            },
        ],
    };
    writeFixtureFile(root, 'tsts.json', stringifyJsonLosslessly(config, 2));

    return root;
}

function uniquenessDiagnostics(result: TstsCheckResult): readonly TstsDiagnostic[] {
    return result.diagnostics.filter(
        (diagnostic: TstsDiagnostic): boolean =>
            diagnostic.ruleId === 'unique-exported-type-name'
    );
}

describe('unique exported type names', () => {
    it('rejects independently declared exported AppState contracts', async () => {
        const root: string = createFixture(
            'export interface AppState { readonly currentScreen: number; }\n'
        );
        const result: TstsCheckResult = await checkProject({
            configPath: path.join(root, 'tsts.json'),
        });
        const diagnostics: readonly TstsDiagnostic[] = uniquenessDiagnostics(result);

        assert.equal(diagnostics.length, 2);
        assert.deepEqual(
            diagnostics.map((diagnostic: TstsDiagnostic): string => diagnostic.message),
            [
                'Exported type name "AppState" identifies 2 independent declarations. Import or re-export one canonical declaration.',
                'Exported type name "AppState" identifies 2 independent declarations. Import or re-export one canonical declaration.',
            ]
        );
        assert.deepEqual(
            diagnostics
                .map((diagnostic: TstsDiagnostic): string =>
                    path.relative(root, diagnostic.filePath ?? '')
                )
                .sort(),
            ['consumer/index.ts', 'contracts/index.ts']
        );
    });

    it('accepts a re-export of the canonical AppState declaration', async () => {
        const root: string = createFixture(
            "export type { AppState } from '@fixture/contracts';\n"
        );
        const result: TstsCheckResult = await checkProject({
            configPath: path.join(root, 'tsts.json'),
        });

        assert.deepEqual(uniquenessDiagnostics(result), []);
    });
});
