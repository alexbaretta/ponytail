// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatTextReport, type TstsCheckResult } from '../src/index.js';
import { parseTstsCliArguments, usage, type TstsCliParseResult } from '../src/cli.js';

describe('parseTstsCliArguments', (): void => {
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
    });
});
