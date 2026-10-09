// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { checkProject } from '../src/index.js';
import type { TstsConfigV3, TstsCheckResult, TstsDiagnostic } from '../src/index.js';
import type { TstsSharedMessageContractsConfig } from '../src/shared-message-contracts.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';

const fixtureRoots: string[] = [];
export const canonicalApi: string = `
    import type { Messages } from './messages.js';
    export interface Transport {
        send<C extends keyof Messages>(channel: C, ...args: Messages[C]): void;
        on<C extends keyof Messages>(channel: C, listener: (...args: Messages[C]) => void): void;
    }
    declare const transport: Transport;
`;

export interface SharedMessageFixture {
    readonly root: string;
    readonly configPath: string;
    readonly projectPath: string;
}

export function createFixture(source: string, rule?: TstsSharedMessageContractsConfig): SharedMessageFixture {
    const root: string = fs.mkdtempSync(path.join(os.tmpdir(), 'tsts-message-contracts-'));
    fixtureRoots.push(root);
    fs.writeFileSync(path.join(root, 'package.json'), stringifyJsonLosslessly({ type: 'module' }));
    fs.writeFileSync(path.join(root, 'messages.ts'),
        "export interface Messages { patch: [patchJson: string]; ready: []; }\n");
    fs.writeFileSync(path.join(root, 'index.ts'), source);
    fs.mkdirSync(path.join(root, 'node_modules/raw'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules/raw/index.d.ts'),
        'export interface RawTransport { send(channel: string, ...args: unknown[]): void; }\n');
    const projectPath: string = path.join(root, 'tsconfig.json');
    fs.writeFileSync(projectPath, stringifyJsonLosslessly({ compilerOptions: {
        module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, target: 'ES2022', noEmit: true,
    }, files: ['index.ts', 'messages.ts'] }));
    const config: TstsConfigV3 = {
        schemaVersion: 3, workspaces: [{ projectPath: 'tsconfig.json' }],
        sharedMessageContracts: rule ?? {
            contracts: [{ id: 'sidebar', path: 'messages.ts', exportName: 'Messages' }],
            apis: [
                { id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0,
                    payloadParameter: 1, receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' },
                { id: 'on', role: 'consumer', contractId: 'sidebar', channelParameter: 0,
                    callbackParameter: 1, callbackPayloadParameter: 0,
                    receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'on' },
            ],
        },
    };
    const configPath: string = path.join(root, 'tsts.json');
    fs.writeFileSync(configPath, stringifyJsonLosslessly(config));
    return { root, configPath, projectPath };
}

export async function messageDiagnostics(fixture: SharedMessageFixture): Promise<readonly TstsDiagnostic[]> {
    const result: TstsCheckResult = await checkProject({ configPath: fixture.configPath });
    return result.diagnostics.filter(diagnostic =>
        diagnostic.ruleId === 'shared-message-contracts' || diagnostic.ruleId === 'tsts-config');
}

export function compileFixture(fixture: SharedMessageFixture): readonly ts.Diagnostic[] {
    const read: { config?: unknown; error?: ts.Diagnostic } = ts.readConfigFile(fixture.projectPath, ts.sys.readFile);
    const parsedCommandLine: ts.ParsedCommandLine = ts.parseJsonConfigFileContent(read.config, ts.sys, fixture.root);
    const program: ts.Program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
    return ts.getPreEmitDiagnostics(program);
}

export function rawRule(): TstsSharedMessageContractsConfig {
    return {
        contracts: [{ id: 'sidebar', path: 'messages.ts', exportName: 'Messages' }],
        apis: [
            { id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0, payloadParameter: 1,
                receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' },
            { id: 'raw', role: 'producer', contractId: 'sidebar', channelParameter: 0, payloadParameter: 1,
                receiver: { path: 'node_modules/raw/index.d.ts', exportName: 'RawTransport' }, method: 'send', raw: true },
        ],
        adapters: [{ path: 'index.ts', exportName: 'adaptTransport', apiId: 'send' }],
    };
}

export function cleanupSharedMessageFixtures(): void {
    for (const root of fixtureRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
}
