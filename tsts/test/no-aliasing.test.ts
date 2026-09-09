// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';
import type {
    TstsCheckResult,
    TstsConfig,
    TstsDiagnostic,
} from '../src/index.js';

function writeFixtureFile(root: string, relativePath: string, contents: string): void {
    const filePath: string = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
}

function createFixture(): string {
    const root: string = fs.mkdtempSync(path.join(os.tmpdir(), 'tsts-no-aliasing-'));

    writeFixtureFile(
        root,
        'package.json',
        stringifyJsonLosslessly({ type: 'module' }, 2)
    );
    writeFixtureFile(
        root,
        'tsconfig.json',
        stringifyJsonLosslessly(
            {
                compilerOptions: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    strict: true,
                    target: 'ES2022',
                },
                include: ['*.ts'],
            },
            2
        )
    );
    const config: TstsConfig = {
        noAliasing: {},
        schemaVersion: 2,
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    writeFixtureFile(root, 'tsts.json', stringifyJsonLosslessly(config, 2));
    writeFixtureFile(
        root,
        'types.ts',
        [
            'export interface PrimaryRecord {',
            '    readonly id: string;',
            '}',
            'export interface SecondaryRecord {',
            '    readonly id: string;',
            '}',
            'export const usedValue = 1;',
            '',
        ].join('\n')
    );
    writeFixtureFile(
        root,
        'main.ts',
        [
            'import type {',
            '    PrimaryRecord,',
            '    SecondaryRecord as SecondaryRecordType,',
            "} from './types.js';",
            "export { usedValue as aliasedUsedValue } from './types.js';",
            'const primary: PrimaryRecord = { id: "primary" };',
            'const secondary: SecondaryRecordType = { id: primary.id };',
            'void secondary;',
            '',
        ].join('\n')
    );

    return root;
}

describe('no-aliasing', () => {
    it('reports import and export aliases when configured', async () => {
        const root: string = createFixture();
        const result: TstsCheckResult = await checkProject({
            configPath: path.join(root, 'tsts.json'),
        });
        const noAliasingDiagnostics: readonly TstsDiagnostic[] =
            result.diagnostics.filter(
                (diagnostic: TstsDiagnostic): boolean =>
                    diagnostic.ruleId === 'no-aliasing'
            );

        assert.equal(noAliasingDiagnostics.length, 2);
        assert.deepEqual(
            noAliasingDiagnostics.map((diagnostic: TstsDiagnostic): string =>
                diagnostic.message
            ),
            [
                'Import alias "SecondaryRecord as SecondaryRecordType" renames a symbol without a rule-approved reason. Use "SecondaryRecord" directly instead.',
                'Export alias "usedValue as aliasedUsedValue" renames a symbol without a rule-approved reason. Use "usedValue" directly instead.',
            ]
        );
    });
});
