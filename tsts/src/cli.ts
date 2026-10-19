#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.


import { checkProject, formatTextReport } from './index.js';
import type { TstsCheckResult } from './index.js';
import {readFileSync} from 'node:fs';
import {parse} from 'lossless-json';
import {checkTraceabilityGraphAnnotations,TraceabilityGraphRequestReaders} from './traceability-graph.js';
import type {TraceabilityGraphResponseV1} from './traceability-graph.js';

export interface TstsCliOptions {
    readonly filePaths?: readonly string[] | undefined;
    readonly configPath?: string | undefined;
    readonly directoryStructurePath?: string | undefined;
    readonly projectPath?: string | undefined;
    readonly traceabilityPath?: string | undefined;
}

export interface TstsCliHelpRequest {
    readonly kind: 'help';
}

export interface TstsCliRunRequest {
    readonly kind: 'run';
    readonly options: TstsCliOptions;
}

export interface TstsCliTraceabilityGraphRequest { readonly kind: 'traceability-graph-stdin' }

// Discriminator: kind
export type TstsCliParseResult = TstsCliHelpRequest | TstsCliRunRequest | TstsCliTraceabilityGraphRequest;

export function parseTstsCliArguments(args: readonly string[]): TstsCliParseResult {
    if (args.includes('--help') || args.includes('-h')) {
        return { kind: 'help' };
    }
    if (args.includes('--traceability-graph-stdin')) {
        if (args.length !== 1) throw new Error('--traceability-graph-stdin cannot be combined with other options');
        return {kind:'traceability-graph-stdin'};
    }

    const filePaths: string[] = [];
    for (let index: number = 0; index < args.length; index += 1) {
        if (args[index] !== '--file') continue;
        const filePath: string | undefined = args[index + 1];
        if (filePath === undefined || filePath.trim() === '' || filePath.startsWith('--')) {
            throw new Error('--file requires a source path');
        }
        filePaths.push(filePath);
        index += 1;
    }
    const projectFlagIndex: number = args.indexOf('--project');
    const projectPath: string | undefined =
        projectFlagIndex >= 0 ? args[projectFlagIndex + 1] : undefined;
    const configFlagIndex: number = args.indexOf('--config');
    const configPath: string | undefined =
        configFlagIndex >= 0 ? args[configFlagIndex + 1] : undefined;
    const directoryStructureFlagIndex: number = args.indexOf('--directory-structure');
    const directoryStructurePath: string | undefined =
        directoryStructureFlagIndex >= 0
            ? args[directoryStructureFlagIndex + 1]
            : undefined;
    const traceabilityFlagIndex: number = args.indexOf('--traceability');
    const traceabilityPath: string | undefined =
        traceabilityFlagIndex >= 0 ? args[traceabilityFlagIndex + 1] : undefined;
    if (filePaths.length > 0 &&
        (configFlagIndex >= 0 || directoryStructureFlagIndex >= 0 || traceabilityFlagIndex >= 0)) {
        throw new Error('--file cannot be combined with other analysis modes');
    }
    const options: TstsCliOptions = {
        ...(filePaths.length === 0 ? {} : { filePaths }),
        projectPath:
            projectPath ??
            (configPath === undefined &&
            directoryStructurePath === undefined &&
            traceabilityPath === undefined
                ? 'tsconfig.json'
                : undefined),
        ...(configPath === undefined ? {} : { configPath }),
        ...(directoryStructurePath === undefined ? {} : { directoryStructurePath }),
        ...(traceabilityPath === undefined ? {} : { traceabilityPath }),
    };

    return {
        kind: 'run',
        options,
    };
}

export async function runTstsCli(args: readonly string[]): Promise<number> {
    const parseResult: TstsCliParseResult = parseTstsCliArguments(args);

    switch (parseResult.kind) {
        case 'traceability-graph-stdin': {
            try {
                const value: unknown = parse(readFileSync(0,'utf8'),null,token => {
                    if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token))) throw new Error(`Unsupported graph request number: ${token}`);
                    return Number(token);
                });
                const request = TraceabilityGraphRequestReaders.V1(value);
                const result = checkTraceabilityGraphAnnotations({projectRoot:process.cwd(),projectPath:request.projectPath,units:request.units});
                const response: TraceabilityGraphResponseV1 = {schemaVersion:1,checkedUnitCount:request.units.length,checkedFileCount:result.checkedFileCount,
                    success:!result.diagnostics.some(diagnostic => diagnostic.severity === 'error'),report:formatTextReport(result)};
                process.stdout.write(`${JSON.stringify(response)}\n`);
                return response.success ? 0 : 1;
            } catch (error: unknown) {
                process.stderr.write(`error traceability-graph-input: ${error instanceof Error ? error.message : String(error)}\n`);
                return 1;
            }
        }
        case 'help': {
            process.stdout.write(`${usage()}\n`);
            return 0;
        }
        case 'run': {
            const result: TstsCheckResult = await checkProject({
                filePaths: parseResult.options.filePaths,
                configPath: parseResult.options.configPath,
                directoryStructurePath: parseResult.options.directoryStructurePath,
                projectPath: parseResult.options.projectPath,
                traceabilityPath: parseResult.options.traceabilityPath,
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
        'Usage: tsts [--project <tsconfig.json>] [--config <tsts.json>] [--directory-structure <manifest.json>] [--traceability <traceability.json>]',
        '       tsts --project <tsconfig.json> --file <source.ts> [--file <source.ts> ...]',
        '       tsts --traceability-graph-stdin  (V1 discovered TypeScript units as JSON on stdin)',
        '',
        'TSTS strengthens TypeScript static type-safety checks.',
    ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const exitCode: number = await runTstsCli(process.argv.slice(2));
    process.exitCode = exitCode;
}
