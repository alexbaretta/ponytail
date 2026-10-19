// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatTextReport, type TstsCheckResult } from '../src/index.js';
import { parseTstsCliArguments, usage, type TstsCliParseResult } from '../src/cli.js';

describe('parseTstsCliArguments', (): void => {
    it('selects graph stdin exclusively without changing legacy modes', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments(['--traceability-graph-stdin']);
        assert.deepEqual(result,{kind:'traceability-graph-stdin'});
        assert.throws(() => parseTstsCliArguments(['--traceability-graph-stdin','--project','tsconfig.json']),/cannot be combined/);
    });
    it('parses repeated file selections and rejects a missing path', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments(['--project', 'tsconfig.json', '--file', 'a.ts', '--file', 'b.ts']);
        assert.deepEqual(result, { kind: 'run', options: { projectPath: 'tsconfig.json', filePaths: ['a.ts', 'b.ts'] } });
        for (const flag of ['--config', '--directory-structure', '--traceability']) {
            assert.throws(() => parseTstsCliArguments(['--file', 'a.ts', flag]), /cannot be combined/);
            assert.throws(() => parseTstsCliArguments(['--file', 'a.ts', flag, 'config.json']), /cannot be combined/);
        }
        assert.throws(() => parseTstsCliArguments(['--file']), /requires a source path/);
        assert.throws(() => parseTstsCliArguments(['--file', '--project', 'tsconfig.json']), /requires a source path/);
    });
    it('defaults to tsconfig.json', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments([]);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                projectPath: 'tsconfig.json',
            },
        });
    });

    it('parses an explicit unused-code config path', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments(['--config', 'tsts.json']);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                configPath: 'tsts.json',
                projectPath: undefined,
            },
        });
    });

    it('parses an explicit project path', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments([
            '--project',
            'tsconfig.contracts.json',
        ]);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                projectPath: 'tsconfig.contracts.json',
            },
        });
    });

    it('parses a directory-structure manifest with a project', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments([
            '--project',
            'tsconfig.contracts.json',
            '--directory-structure',
            '.agents/config/project/directory-structure.json',
        ]);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                directoryStructurePath: '.agents/config/project/directory-structure.json',
                projectPath: 'tsconfig.contracts.json',
            },
        });
    });

    it('runs directory-structure analysis without an implicit TypeScript project', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments([
            '--directory-structure',
            'structure.json',
        ]);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                directoryStructurePath: 'structure.json',
                projectPath: undefined,
            },
        });
    });

    it('parses semantic traceability with an explicit project', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments([
            '--project',
            'tsconfig.contracts.json',
            '--traceability',
            '.agents/config/project/traceability.json',
        ]);

        assert.deepEqual(result, {
            kind: 'run',
            options: {
                projectPath: 'tsconfig.contracts.json',
                traceabilityPath: '.agents/config/project/traceability.json',
            },
        });
    });

    it('parses help requests', (): void => {
        const result: TstsCliParseResult = parseTstsCliArguments(['--help']);

        assert.deepEqual(result, { kind: 'help' });
    });
});

describe('formatTextReport', (): void => {
    it('formats an empty result', (): void => {
        const result: TstsCheckResult = {
            checkedFileCount: 0,
            diagnostics: [],
        };

        assert.equal(formatTextReport(result), 'TSTS checked 0 files: no violations found.');
    });
});

describe('usage', (): void => {
    it('describes the project option', (): void => {
        assert.match(usage(), /--project <tsconfig\.json>/u);
        assert.match(usage(), /--config <tsts\.json>/u);
        assert.match(usage(), /--directory-structure <manifest\.json>/u);
        assert.match(usage(), /--traceability <traceability\.json>/u);
    });
});
