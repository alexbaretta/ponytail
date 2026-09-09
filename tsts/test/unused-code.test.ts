// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';
import type { TstsCheckResult, TstsConfig } from '../src/index.js';

describe('unused code rule', (): void => {
    it('treats exported declarations from public package entrypoints as roots', async () => {
        const fixtureDirectory: string = await mkdtemp(
            path.join(tmpdir(), 'tsts-public-entrypoint-fixture-')
        );
        await writeFile(
            path.join(fixtureDirectory, 'index.ts'),
            [
                "export const publicValue = 'public';",
                "const privateValue = 'private';",
                'void privateValue;',
            ].join('\n')
        );
        await writeFile(path.join(fixtureDirectory, 'tsconfig.json'), createTsconfig(['index.ts']));
        const config: TstsConfig = {
            schemaVersion: 2,
            unusedCode: {},
            workspaces: [
                {
                    projectPath: 'tsconfig.json',
                    publicEntrypoints: ['index.ts'],
                },
            ],
        };
        await writeFile(
            path.join(fixtureDirectory, 'tsts.json'),
            stringifyJsonLosslessly(config, 2)
        );

        const result: TstsCheckResult = await checkProject({
            configPath: path.join(fixtureDirectory, 'tsts.json'),
        });

        assert.deepEqual(result.diagnostics, []);
    });

    it('reports declarations not reachable from configured entrypoints', async (): Promise<void> => {
        const configPath: string = await createUnusedCodeFixture();
        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly string[] = result.diagnostics.map(
            (diagnostic): string => `${diagnostic.ruleId}:${diagnostic.message}`
        );

        assert.deepEqual(diagnostics, [
            'unused-value:Unused value declaration "unusedAppValue" is not reachable from configured entrypoints.',
            'unused-type:Unused type declaration "UnusedAppType" is not reachable from configured entrypoints.',
            'unused-type:Unused type declaration "UnusedLibraryType" is not reachable from configured entrypoints.',
            'unused-value:Unused value declaration "unusedLibraryValue" is not reachable from configured entrypoints.',
        ]);
    });

    it('does not report unused declarations when the rule is omitted', async ():
        Promise<void> => {
        const configPath: string = await createUnusedCodeFixture(false);
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(result.diagnostics, []);
    });

    it('follows exported variables through cross-workspace re-exports', async (): Promise<void> => {
        const configPath: string = await createExportedVariableImportFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string => diagnostic.message),
            [
                'Unused value declaration "unusedLibraryConfig" is not reachable from configured entrypoints.',
            ]
        );
    });

    it('treats class extends expressions as value references', async (): Promise<void> => {
        const configPath: string = await createClassExtendsFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string => diagnostic.message),
            [
                'Unused type declaration "UnusedBase" is not reachable from configured entrypoints.',
                'Unused value declaration "UnusedBase" is not reachable from configured entrypoints.',
            ]
        );
    });

    it('follows value and type declarations through local star re-exports', async (): Promise<void> => {
        const configPath: string = await createLocalStarReExportFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(result.diagnostics, []);
    });

    it('follows imported module initialization', async (): Promise<void> => {
        const configPath: string = await createImportedModuleInitializationFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(result.diagnostics, []);
    });

    it('follows dynamically imported exports and module initialization', async (): Promise<void> => {
        const configPath: string = await createDynamicImportFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string => diagnostic.message),
            [
                'Unused value declaration "unusedRuntimeExport" is not reachable from configured entrypoints.',
            ]
        );
    });

    it('follows shorthand property value references', async (): Promise<void> => {
        const configPath: string = await createShorthandPropertyFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string => diagnostic.message),
            [
                'Unused value declaration "unusedConfig" is not reachable from configured entrypoints.',
            ]
        );
    });

    it('treats global augmentation contracts as type roots', async (): Promise<void> => {
        const configPath: string = await createGlobalAugmentationFixture();
        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(result.diagnostics, []);
    });
});

async function createClassExtendsFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-class-extends-fixture-')
    );
    await writeFile(
        path.join(fixtureDirectory, 'main.ts'),
        [
            'class Base {}',
            'class App extends Base {}',
            'class UnusedBase {}',
            '',
            'void App;',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'tsconfig.json'),
        createTsconfig(['main.ts'])
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(
        path.join(fixtureDirectory, 'tsts.json'),
        stringifyJsonLosslessly(config, 2)
    );

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createExportedVariableImportFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-exported-variable-import-fixture-')
    );
    const appDirectory: string = path.join(fixtureDirectory, 'app');
    const facadeDirectory: string = path.join(fixtureDirectory, 'facade');
    const libraryDirectory: string = path.join(fixtureDirectory, 'library');
    await mkdir(appDirectory);
    await mkdir(facadeDirectory);
    await mkdir(libraryDirectory);
    await writeFile(
        path.join(appDirectory, 'main.ts'),
        [
            "import { libraryConfig } from '@fixture/facade';",
            '',
            'console.log(libraryConfig);',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(libraryDirectory, 'index.ts'),
        [
            "export const libraryConfig = 'reachable';",
            "export const unusedLibraryConfig = 'unreachable';",
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(facadeDirectory, 'index.ts'),
        "export { libraryConfig } from '@fixture/library';\n"
    );
    await writeFile(path.join(appDirectory, 'tsconfig.json'), createTsconfig(['main.ts']));
    await writeFile(path.join(facadeDirectory, 'tsconfig.json'), createTsconfig(['index.ts']));
    await writeFile(path.join(libraryDirectory, 'tsconfig.json'), createTsconfig(['index.ts']));
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'app/tsconfig.json',
            },
            {
                packageName: '@fixture/facade',
                projectPath: 'facade/tsconfig.json',
            },
            {
                packageName: '@fixture/library',
                projectPath: 'library/tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createDynamicImportFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-dynamic-import-fixture-')
    );
    await writeFile(
        path.join(fixtureDirectory, 'main.ts'),
        [
            'async function start(): Promise<void> {',
            "  const { RuntimeService } = await import('./runtime.js');",
            '  new RuntimeService();',
            '}',
            '',
            'void start();',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'runtime.ts'),
        [
            'function installRuntime(): void {}',
            '',
            'installRuntime();',
            '',
            'export class RuntimeService {}',
            '',
            'export function unusedRuntimeExport(): void {}',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'tsconfig.json'),
        createTsconfig(['main.ts', 'runtime.ts'])
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createShorthandPropertyFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-shorthand-property-fixture-')
    );
    await writeFile(
        path.join(fixtureDirectory, 'main.ts'),
        [
            "const config = 'reachable';",
            "const unusedConfig = 'unreachable';",
            'function consume(_input: { config: string }): void {}',
            'consume({ config });',
            '',
        ].join('\n')
    );
    await writeFile(path.join(fixtureDirectory, 'tsconfig.json'), createTsconfig(['main.ts']));
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createGlobalAugmentationFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-global-augmentation-fixture-')
    );
    await writeFile(path.join(fixtureDirectory, 'main.ts'), 'export {};\n');
    await writeFile(
        path.join(fixtureDirectory, 'window-contract.ts'),
        [
            'export interface RuntimeBridge {',
            '  readonly ready: boolean;',
            '}',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'globals.d.ts'),
        [
            "import type { RuntimeBridge } from './window-contract.js';",
            '',
            'declare global {',
            '  var runtimeBridge: RuntimeBridge;',
            '}',
            '',
            'export {};',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'tsconfig.json'),
        createTsconfig(['main.ts', 'globals.d.ts', 'window-contract.ts'])
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createImportedModuleInitializationFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-module-initialization-fixture-')
    );
    await writeFile(
        path.join(fixtureDirectory, 'main.ts'),
        ["import { runtimeValue } from './runtime.js';", '', 'void runtimeValue;', ''].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'runtime.ts'),
        [
            'interface RuntimeBridge {',
            '  readonly ready: boolean;',
            '}',
            '',
            'declare global {',
            '  var runtimeBridge: RuntimeBridge;',
            '}',
            '',
            'function installRuntimeBridge(): void {',
            '  globalThis.runtimeBridge = { ready: true };',
            '}',
            '',
            'installRuntimeBridge();',
            '',
            'export const runtimeValue = 1;',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'tsconfig.json'),
        createTsconfig(['main.ts', 'runtime.ts'])
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createLocalStarReExportFixture(): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(
        path.join(tmpdir(), 'tsts-star-re-export-fixture-')
    );
    await writeFile(
        path.join(fixtureDirectory, 'main.tsx'),
        ["import App from './app';", '', 'const rendered = <App />;', 'void rendered;', ''].join(
            '\n'
        )
    );
    await writeFile(
        path.join(fixtureDirectory, 'app.ts'),
        [
            "import { UsedKind, usedValue } from './barrel';",
            '',
            'const App = (): void => {',
            '  usedValue(UsedKind.ACTIVE);',
            '};',
            '',
            'export default App;',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'barrel.ts'),
        ["export * from './used';", ''].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'used.ts'),
        [
            "export const UsedKind = { ACTIVE: 'active' } as const;",
            'export type UsedKind = (typeof UsedKind)[keyof typeof UsedKind];',
            '',
            "export const TypeOnlyValue = { label: 'label' } as const;",
            'export type TypeOnlyValue = typeof TypeOnlyValue;',
            '',
            'export function usedValue(_kind: UsedKind, _metadata?: TypeOnlyValue): void {}',
            '',
        ].join('\n')
    );
    await writeFile(
        path.join(fixtureDirectory, 'tsconfig.json'),
        createTsconfig(['main.tsx', 'app.ts', 'barrel.ts', 'used.ts'], {
            jsx: 'preserve',
            module: 'ESNext',
            moduleResolution: 'Bundler',
        })
    );
    const config: TstsConfig = {
        schemaVersion: 2,
        unusedCode: {},
        workspaces: [
            {
                entrypoints: ['main.tsx'],
                projectPath: 'tsconfig.json',
            },
        ],
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

async function createUnusedCodeFixture(includeUnusedCode: boolean = true): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(path.join(tmpdir(), 'tsts-unused-fixture-'));
    const appDirectory: string = path.join(fixtureDirectory, 'app');
    const libraryDirectory: string = path.join(fixtureDirectory, 'library');

    await mkdir(appDirectory);
    await mkdir(libraryDirectory);
    await writeFile(
        path.join(appDirectory, 'main.ts'),
        [
            "import { usedLibraryValue, type UsedLibraryType } from '@fixture/library';",
            '',
            'interface AppConfig {',
            '  readonly value: UsedLibraryType;',
            '}',
            '',
            'function start(config: AppConfig): string {',
            '  return usedLibraryValue(config.value);',
            '}',
            '',
            'function unusedAppValue(): string {',
            "  return 'unused';",
            '}',
            '',
            'type UnusedAppType = {',
            '  readonly value: string;',
            '};',
            '',
            "start({ value: { label: 'ok' } });",
            '',
        ].join('\n')
    );
    await writeFile(path.join(appDirectory, 'tsconfig.json'), createTsconfig(['main.ts']));
    await writeFile(
        path.join(libraryDirectory, 'index.ts'),
        [
            'export interface UsedLibraryType {',
            '  readonly label: string;',
            '}',
            '',
            'export interface UnusedLibraryType {',
            '  readonly label: string;',
            '}',
            '',
            'export function usedLibraryValue(input: UsedLibraryType): string {',
            '  return formatLabel(input.label);',
            '}',
            '',
            'export function unusedLibraryValue(): string {',
            "  return 'unused';",
            '}',
            '',
            'function formatLabel(label: string): string {',
            '  return label;',
            '}',
            '',
        ].join('\n')
    );
    await writeFile(path.join(libraryDirectory, 'tsconfig.json'), createTsconfig(['index.ts']));
    const config: TstsConfig = {
        schemaVersion: 2,
        workspaces: [
            {
                entrypoints: ['main.ts'],
                projectPath: 'app/tsconfig.json',
            },
            {
                packageName: '@fixture/library',
                projectPath: 'library/tsconfig.json',
            },
        ],
        ...(includeUnusedCode ? { unusedCode: {} } : {}),
    };
    await writeFile(path.join(fixtureDirectory, 'tsts.json'), stringifyJsonLosslessly(config, 2));

    return path.join(fixtureDirectory, 'tsts.json');
}

function createTsconfig(
    files: readonly string[],
    compilerOptions: Readonly<Record<string, string>> = {}
): string {
    return stringifyJsonLosslessly(
        {
            compilerOptions: {
                exactOptionalPropertyTypes: true,
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                target: 'ES2024',
                ...compilerOptions,
            },
            files,
        },
        2
    );
}
