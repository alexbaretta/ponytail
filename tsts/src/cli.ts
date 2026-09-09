#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.


import { checkProject, formatTextReport } from './index.js';
import type { TstsCheckResult } from './index.js';

export interface TstsCliOptions {
    readonly configPath?: string | undefined;
    readonly projectPath?: string | undefined;
}

export interface TstsCliHelpRequest {
    readonly kind: 'help';
}

export interface TstsCliRunRequest {
    readonly kind: 'run';
    readonly options: TstsCliOptions;
}

// Discriminator: kind
export type TstsCliParseResult = TstsCliHelpRequest | TstsCliRunRequest;

export function parseTstsCliArguments(args: readonly string[]): TstsCliParseResult {
    if (args.includes('--help') || args.includes('-h')) {
        return { kind: 'help' };
    }

    const projectFlagIndex: number = args.indexOf('--project');
    const projectPath: string | undefined =
        projectFlagIndex >= 0 ? args[projectFlagIndex + 1] : undefined;
    const configFlagIndex: number = args.indexOf('--config');
    const configPath: string | undefined =
        configFlagIndex >= 0 ? args[configFlagIndex + 1] : undefined;
    const options: TstsCliOptions = {
        projectPath: projectPath ?? (configPath === undefined ? 'tsconfig.json' : undefined),
        ...(configPath === undefined ? {} : { configPath }),
    };

    return {
        kind: 'run',
        options,
    };
}

export async function runTstsCli(args: readonly string[]): Promise<number> {
    const parseResult: TstsCliParseResult = parseTstsCliArguments(args);

    switch (parseResult.kind) {
        case 'help': {
            process.stdout.write(`${usage()}\n`);
            return 0;
        }
        case 'run': {
            const result: TstsCheckResult = await checkProject({
                configPath: parseResult.options.configPath,
                projectPath: parseResult.options.projectPath,
            });
            process.stdout.write(`${formatTextReport(result)}\n`);
            return result.diagnostics.some((diagnostic): boolean => diagnostic.severity === 'error')
                ? 1
                : 0;
        }
    }
}

export function usage(): string {
    return [
        'Usage: tsts [--project <tsconfig.json>] [--config <tsts.json>]',
        '',
        'TSTS strengthens TypeScript static type-safety checks.',
    ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const exitCode: number = await runTstsCli(process.argv.slice(2));
    process.exitCode = exitCode;
}
