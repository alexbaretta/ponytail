// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { checkDirectoryStructure } from '../src/directory-structure.js';
import type {
    DirectoryStructureFileRule,
    DirectoryStructureManifest,
    DirectoryStructureManifestV1,
    DirectoryStructureRule,
} from '../src/directory-structure.js';
import type { TstsCheckResult } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';

const rootDirectoryRule: DirectoryStructureRule = {
    path: '.',
    recursive: true,
    allowedContentKinds: ['configuration', 'source'],
    git: 'tracked',
};

const cleanManifest: DirectoryStructureManifest = {
    schemaVersion: 2,
    contentKinds: {
        configuration: ['.gitignore', 'structure.json'],
        environment: ['**/*.env'],
        source: ['**/*.ts'],
        temporary: ['tmp/**'],
    },
    directories: [
        rootDirectoryRule,
        {
            path: 'env/private',
            recursive: true,
            allowedContentKinds: ['environment'],
            git: 'ignored',
        },
        {
            path: 'env/tracked',
            recursive: true,
            allowedContentKinds: ['environment'],
            git: 'tracked',
        },
        {
            path: 'tmp',
            recursive: true,
            allowedContentKinds: ['temporary'],
            git: 'ignored',
        },
    ],
    files: [],
    opaqueDirectories: [],
};

describe('directory-structure manifest', (): void => {
    it('accepts declared tracked and ignored content', async (): Promise<void> => {
        const fixture: DirectoryStructureFixture = await createFixture(cleanManifest);
        await mkdir(path.join(fixture.root, 'env', 'private'), { recursive: true });
        await mkdir(path.join(fixture.root, 'env', 'tracked'), { recursive: true });
        await mkdir(path.join(fixture.root, 'tmp'), { recursive: true });
        await writeFile(path.join(fixture.root, 'env', 'private', 'developer.env'), 'A=1\n');
        await writeFile(path.join(fixture.root, 'env', 'tracked', 'default.env'), 'A=\n');
        await writeFile(path.join(fixture.root, 'tmp', 'run.txt'), 'temporary\n');
        await runGit(fixture.root, ['add', 'env/tracked/default.env']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.checkedFileCount, 6);
    });

    it('accepts V1 by normalizing it without exact file rules', async (): Promise<void> => {
        const manifest: DirectoryStructureManifestV1 = {
            contentKinds: cleanManifest.contentKinds,
            directories: cleanManifest.directories,
            opaqueDirectories: cleanManifest.opaqueDirectories,
            schemaVersion: 1,
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(result.diagnostics, []);
    });

    it('lets one exact file override its containing directory policy', async ():
        Promise<void> => {
        const worktreeFileRule: DirectoryStructureFileRule = {
            allowedContentKinds: ['source'],
            git: 'ignored',
            path: '.worktree',
        };
        const manifest: DirectoryStructureManifest = {
            ...cleanManifest,
            contentKinds: {
                ...cleanManifest.contentKinds,
                source: ['**/*.ts', '.worktree'],
            },
            files: [worktreeFileRule],
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest);
        await writeFile(
            path.join(fixture.root, '.gitignore'),
            'env/private/\ntmp/\n.worktree\nother.ts\n'
        );
        await writeFile(path.join(fixture.root, '.worktree'), '{}\n');
        await writeFile(path.join(fixture.root, 'other.ts'), 'export {};\n');
        await runGit(fixture.root, ['add', '.gitignore']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string =>
                `${diagnostic.filePath}:${diagnostic.ruleId}`
            ),
            ['other.ts:directory-structure-git-state']
        );
    });

    it('reports misplaced and untracked content together', async (): Promise<void> => {
        const fixture: DirectoryStructureFixture = await createFixture(cleanManifest);
        await writeFile(path.join(fixture.root, 'rogue.env'), 'A=1\n');

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(
            result.diagnostics.map((diagnostic): string => diagnostic.ruleId),
            ['directory-structure-content-kind', 'directory-structure-git-state']
        );
        assert.ok(result.diagnostics.every((diagnostic): boolean => diagnostic.filePath === 'rogue.env'));
    });

    it('uses the most specific content pattern and directory owner', async (): Promise<void> => {
        const manifest: DirectoryStructureManifest = {
            ...cleanManifest,
            contentKinds: {
                configuration: ['.gitignore', 'structure.json'],
                environment: ['apps/demo/env/**'],
                source: ['apps/**'],
            },
            directories: [
                {
                    path: '.',
                    recursive: true,
                    allowedContentKinds: ['configuration', 'source'],
                    git: 'tracked',
                },
                {
                    path: 'apps/demo/env',
                    recursive: true,
                    allowedContentKinds: ['environment'],
                    git: 'tracked',
                },
            ],
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest, false);
        await mkdir(path.join(fixture.root, 'apps', 'demo', 'env'), { recursive: true });
        await writeFile(path.join(fixture.root, 'apps', 'demo', 'env', 'default.env'), 'A=\n');
        await runGit(fixture.root, ['add', '.']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(result.diagnostics, []);
    });

    it('accepts data and compiled artifacts only under their declared owners', async ():
        Promise<void> => {
        const manifest: DirectoryStructureManifest = {
            ...cleanManifest,
            contentKinds: {
                ...cleanManifest.contentKinds,
                compiled: ['dist/**'],
                data: ['data/**'],
            },
            directories: [
                rootDirectoryRule,
                ...cleanManifest.directories.slice(1),
                {
                    path: 'data',
                    recursive: true,
                    allowedContentKinds: ['data'],
                    git: 'tracked',
                },
                {
                    path: 'dist',
                    recursive: true,
                    allowedContentKinds: ['compiled'],
                    git: 'ignored',
                },
            ],
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest);
        await mkdir(path.join(fixture.root, 'data'));
        await mkdir(path.join(fixture.root, 'dist'));
        await writeFile(path.join(fixture.root, 'data', 'dataset.csv'), 'id\n1\n');
        await writeFile(path.join(fixture.root, 'dist', 'index.js'), 'export {};\n');
        await writeFile(
            path.join(fixture.root, '.gitignore'),
            'dist/\nenv/private/\ntmp/\n'
        );
        await runGit(fixture.root, ['add', '.gitignore', 'data/dataset.csv']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(result.diagnostics, []);
    });

    it('reports equal-specificity content kinds as ambiguous', async (): Promise<void> => {
        const manifest: DirectoryStructureManifest = {
            ...cleanManifest,
            contentKinds: {
                alpha: ['ambiguous/**'],
                beta: ['ambiguous/**'],
                configuration: ['.gitignore', 'structure.json'],
                source: ['**/*.ts'],
            },
            directories: [
                {
                    ...rootDirectoryRule,
                    allowedContentKinds: ['alpha', 'beta', 'configuration', 'source'],
                },
            ],
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest);
        await mkdir(path.join(fixture.root, 'ambiguous'));
        await writeFile(path.join(fixture.root, 'ambiguous', 'value.txt'), 'value\n');
        await runGit(fixture.root, ['add', 'ambiguous/value.txt']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.equal(
            result.diagnostics[0]?.ruleId,
            'directory-structure-ambiguous-content-kind'
        );
    });

    it('does not follow configured opaque directory symlinks', async (): Promise<void> => {
        const externalRoot: string = await mkdtemp(path.join(tmpdir(), 'tsts-external-'));
        await writeFile(path.join(externalRoot, 'secret.env'), 'SECRET=value\n');
        const manifest: DirectoryStructureManifest = {
            ...cleanManifest,
            contentKinds: {
                ...cleanManifest.contentKinds,
                opaque: ['opaque-link'],
            },
            directories: [
                {
                    ...rootDirectoryRule,
                    allowedContentKinds: ['configuration', 'opaque', 'source'],
                },
                ...cleanManifest.directories.slice(1),
            ],
            opaqueDirectories: ['opaque-link'],
        };
        const fixture: DirectoryStructureFixture = await createFixture(manifest);
        await symlink(externalRoot, path.join(fixture.root, 'opaque-link'));
        await runGit(fixture.root, ['add', 'opaque-link']);

        const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.checkedFileCount, 4);
    });

    it('rejects unknown keys and escaping paths', async (): Promise<void> => {
        for (const manifest of [
            { ...cleanManifest, unexpected: true },
            { ...cleanManifest, schemaVersion: 1 },
            { ...cleanManifest, schemaVersion: 3 },
            {
                ...cleanManifest,
                directories: [
                    {
                        ...cleanManifest.directories[0],
                        path: '../outside',
                    },
                ],
            },
            {
                ...cleanManifest,
                files: [
                    {
                        allowedContentKinds: ['source'],
                        git: 'ignored',
                        path: '*.worktree',
                    },
                ],
            },
            {
                ...cleanManifest,
                directories: [{ ...rootDirectoryRule, git: 'sometimes' }],
            },
        ]) {
            const fixture: DirectoryStructureFixture = await createFixture(manifest);
            const result: TstsCheckResult = await checkDirectoryStructure(fixture.manifestPath);

            assert.deepEqual(
                result.diagnostics.map((diagnostic): string => diagnostic.ruleId),
                ['directory-structure-config']
            );
        }
    });

    it('rejects duplicate JSON keys and directory owners', async (): Promise<void> => {
        const duplicateKeyFixture: DirectoryStructureFixture = await createFixture(cleanManifest);
        await writeFile(
            duplicateKeyFixture.manifestPath,
            '{"schemaVersion":1,"schemaVersion":1,"contentKinds":{},"directories":[],"opaqueDirectories":[]}'
        );
        const duplicateKeyResult: TstsCheckResult = await checkDirectoryStructure(
            duplicateKeyFixture.manifestPath
        );
        assert.equal(duplicateKeyResult.diagnostics[0]?.ruleId, 'directory-structure-config');

        const duplicateOwnerFixture: DirectoryStructureFixture = await createFixture({
            ...cleanManifest,
            directories: [rootDirectoryRule, rootDirectoryRule],
        });
        const duplicateOwnerResult: TstsCheckResult = await checkDirectoryStructure(
            duplicateOwnerFixture.manifestPath
        );
        assert.equal(duplicateOwnerResult.diagnostics[0]?.ruleId, 'directory-structure-config');

        const fileRule: DirectoryStructureFileRule = {
            allowedContentKinds: ['source'],
            git: 'ignored',
            path: '.worktree',
        };
        const duplicateFileOwnerFixture: DirectoryStructureFixture = await createFixture({
            ...cleanManifest,
            files: [fileRule, fileRule],
        });
        const duplicateFileOwnerResult: TstsCheckResult = await checkDirectoryStructure(
            duplicateFileOwnerFixture.manifestPath
        );
        assert.equal(
            duplicateFileOwnerResult.diagnostics[0]?.ruleId,
            'directory-structure-config'
        );
    });
});

interface DirectoryStructureFixture {
    readonly manifestPath: string;
    readonly root: string;
}

async function createFixture(
    manifest: unknown,
    includeSource: boolean = true
): Promise<DirectoryStructureFixture> {
    const root: string = await mkdtemp(path.join(tmpdir(), 'tsts-directory-structure-'));
    const manifestPath: string = path.join(root, 'structure.json');

    await runGit(root, ['init', '--quiet']);
    await writeFile(path.join(root, '.gitignore'), 'env/private/\ntmp/\n');
    if (includeSource) {
        await mkdir(path.join(root, 'src'));
        await writeFile(path.join(root, 'src', 'index.ts'), 'export {};\n');
    }
    await writeFile(manifestPath, stringifyJsonLosslessly(manifest, 2));
    await runGit(root, ['add', '.gitignore', 'structure.json', ...(includeSource ? ['src/index.ts'] : [])]);

    return { manifestPath, root };
}

function runGit(currentDirectory: string, args: readonly string[]): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
        execFile('git', ['-C', currentDirectory, ...args], (error: Error | null): void => {
            if (error !== null) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
