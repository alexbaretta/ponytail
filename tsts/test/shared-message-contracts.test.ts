// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { readTstsConfigV2, readTstsConfigV3 } from '../src/index.js';
import type { TstsConfig, TstsConfigV3, TstsDiagnostic } from '../src/index.js';
import type { TstsSharedMessageContractsConfig } from '../src/shared-message-contracts.js';
import { parseJsonLosslessly, stringifyJsonLosslessly } from '../src/lossless-json.js';

import { canonicalApi, createFixture, messageDiagnostics, compileFixture, rawRule, cleanupSharedMessageFixtures } from './shared-message-fixture.js';
import type { SharedMessageFixture } from './shared-message-fixture.js';
afterEach(cleanupSharedMessageFixtures);

// Traceability: verifies REQ-TSTS-SHARED-MESSAGE-CONTRACTS
describe('canonical shared message contracts', () => {
    it('accepts shared producer and consumer declarations and contextual callbacks', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            transport.send('patch', '{}');
            transport.on('patch', patchJson => { patchJson.toUpperCase(); });
            transport.on('patch', (...args: Messages['patch']) => { args[0].toUpperCase(); });
        `);
        assert.deepEqual(compileFixture(fixture), []);
        assert.deepEqual(await messageDiagnostics(fixture), []);
    });

    it('rejects the original string plus unknown-array sender', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            'send<C extends keyof Messages>(channel: C, ...args: Messages[C]): void;',
            'send(channel: string, ...args: unknown[]): void;') + "transport.send('patch', {});");
        assert.deepEqual(compileFixture(fixture), []);
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'),
            /send.*uncoupled.*canonical contract sidebar/u);
    });

    it('rejects independently duplicated endpoint contracts despite structural compatibility', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            '...args: Messages[C]): void;', '...args: Duplicate[C]): void;') +
            'interface Duplicate { patch: [patchJson: string]; ready: []; }');
        assert.deepEqual(compileFixture(fixture), []);
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'), /uncoupled/u);
    });

    it('rejects independent consumer tuples and explicit handler argument annotations', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            'listener: (...args: Messages[C]) => void', 'listener: (patchJson: string) => void') +
            "transport.on('patch', (patchJson: string) => { patchJson.toUpperCase(); });");
        const diagnostics: readonly TstsDiagnostic[] = await messageDiagnostics(fixture);
        assert.ok(diagnostics.some(diagnostic => /on.*uncoupled/u.test(diagnostic.message)));
        assert.ok(diagnostics.some(diagnostic => /callback arguments must derive/u.test(diagnostic.message)));
    });

    it('checks every overload, including permissive bypasses', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            'send<C extends keyof Messages>', 'send(channel: string, ...args: unknown[]): void; send<C extends keyof Messages>'));
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'), /every overload/u);
    });

    it('discovers unregistered channels and unrestricted strings, including extracted methods', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            transport.send('unregistered');
            declare const dynamic: string;
            const send = transport.send;
            send(dynamic);
        `);
        const diagnostics: readonly TstsDiagnostic[] = await messageDiagnostics(fixture);
        assert.ok(diagnostics.some(diagnostic => /unregistered channel unregistered/u.test(diagnostic.message)));
        assert.ok(diagnostics.some(diagnostic => /unrestricted dynamic strings/u.test(diagnostic.message)));
    });

    it('rejects unrestricted contract keys, optional channels and untyped tuples', async () => {
        for (const contract of [
            'export interface Messages { [channel: string]: unknown[]; }',
            'export interface Messages { patch?: [patchJson: string]; ready: []; }',
            'export interface Messages { patch: [payload: unknown]; ready: []; }',
            'export interface Messages<T> { patch: [payload: T]; ready: []; }',
        ]) {
            const fixture: SharedMessageFixture = createFixture(canonicalApi);
            fs.writeFileSync(path.join(fixture.root, 'messages.ts'), contract);
            assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'),
                /finite required channel set/u);
        }
    });

    it('rejects uncoupled non-generic union signatures', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            'send<C extends keyof Messages>(channel: C, ...args: Messages[C])',
            'send(channel: keyof Messages, ...args: Messages[keyof Messages])'));
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'), /uncoupled/u);
    });

    it('rejects indirect Function APIs that erase channel coupling', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            transport.send.call(transport, 'patch', '{}');
            transport.send.apply(transport, ['patch', '{}']);
            const bound = transport.send.bind(transport);
        `);
        const diagnostics: readonly TstsDiagnostic[] = await messageDiagnostics(fixture);
        assert.equal(diagnostics.length, 3);
        assert.ok(diagnostics.every(diagnostic => /indirect.*invocation/u.test(diagnostic.message)));
    });

    it('accepts finite declared channel generics and rejects foreign channel members', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            export function notify<C extends keyof Messages>(channel: C, ...args: Messages[C]): void {
                transport.send(channel, ...args);
            }
            declare const foreignChannel: 'patch' | 'foreign';
            transport.send(foreignChannel);
        `);
        const diagnostics: readonly TstsDiagnostic[] = await messageDiagnostics(fixture);
        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /unregistered channel foreign/u);
    });

    it('rejects competing canonical declarations for the same channel', async () => {
        const rule: TstsSharedMessageContractsConfig = {
            contracts: [
                { id: 'sidebar', path: 'messages.ts', exportName: 'Messages' },
                { id: 'duplicate', path: 'index.ts', exportName: 'OtherMessages' },
            ],
            apis: [{ id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0,
                payloadParameter: 1, receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' }],
        };
        const fixture: SharedMessageFixture = createFixture(canonicalApi +
            'export interface OtherMessages { patch: [patchJson: string]; }', rule);
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'),
            /belongs to both/u);
    });

    it('resolves canonical helper tuple and callback type aliases', async () => {
        const fixture: SharedMessageFixture = createFixture(canonicalApi.replace(
            '...args: Messages[C]): void;', '...args: Arguments<C>): void;').replace(
            'listener: (...args: Messages[C]) => void', 'listener: Listener<C>') + `
            type Arguments<C extends keyof Messages> = Messages[C];
            type Listener<C extends keyof Messages> = (...args: Messages[C]) => void;
        `);
        assert.deepEqual(compileFixture(fixture), []);
        assert.deepEqual(await messageDiagnostics(fixture), []);
    });

    it('keeps canonical declaration identity across distinct producer and consumer programs', async () => {
        const rule: TstsSharedMessageContractsConfig = {
            contracts: [{ id: 'sidebar', path: 'messages.ts', exportName: 'Messages' }],
            apis: [
                { id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0,
                    payloadParameter: 1, receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' },
                { id: 'receive', role: 'consumer', contractId: 'sidebar', channelParameter: 0,
                    callbackParameter: 1, callbackPayloadParameter: 0,
                    receiver: { path: 'consumer.ts', exportName: 'Subscriber' }, method: 'receive' },
            ],
        };
        const fixture: SharedMessageFixture = createFixture(canonicalApi, rule);
        const consumerSource: string = `
            import type { Messages } from './messages.js';
            export interface Subscriber {
                receive<C extends keyof Messages>(channel: C, listener: (...args: Messages[C]) => void): void;
            }
            declare const subscriber: Subscriber;
            subscriber.receive('patch', patchJson => { patchJson.toUpperCase(); });
        `;
        fs.writeFileSync(path.join(fixture.root, 'consumer.ts'), consumerSource);
        fs.writeFileSync(path.join(fixture.root, 'consumer-tsconfig.json'), stringifyJsonLosslessly({
            compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, target: 'ES2022' },
            files: ['consumer.ts', 'messages.ts'],
        }));
        const config: TstsConfigV3 = {
            schemaVersion: 3, sharedMessageContracts: rule,
            workspaces: [{ projectPath: 'tsconfig.json' }, { projectPath: 'consumer-tsconfig.json' }],
        };
        fs.writeFileSync(fixture.configPath, stringifyJsonLosslessly(config));
        const consumerFixture: SharedMessageFixture = {
            ...fixture, projectPath: path.join(fixture.root, 'consumer-tsconfig.json'),
        };
        assert.deepEqual(compileFixture(fixture), []);
        assert.deepEqual(compileFixture(consumerFixture), []);
        assert.deepEqual(await messageDiagnostics(fixture), []);
        fs.writeFileSync(path.join(fixture.root, 'consumer.ts'), consumerSource.replace(
            'listener: (...args: Messages[C]) => void', 'listener: (patchJson: string) => void'));
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'),
            /receive.*canonical contract sidebar/u);
    });

    it('supports configurable transport names and nonstandard parameter positions', async () => {
        const rule: TstsSharedMessageContractsConfig = {
            contracts: [{ id: 'sidebar', path: 'messages.ts', exportName: 'Messages' }],
            apis: [
                { id: 'publish', role: 'producer', contractId: 'sidebar', channelParameter: 1,
                    payloadParameter: 2, receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'publish' },
                { id: 'subscribe', role: 'consumer', contractId: 'sidebar', channelParameter: 1,
                    callbackParameter: 0, callbackPayloadParameter: 1,
                    receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'subscribe' },
            ],
        };
        const fixture: SharedMessageFixture = createFixture(`
            import type { Messages } from './messages.js';
            export interface Transport {
                publish<C extends keyof Messages>(priority: number, channel: C, ...args: Messages[C]): void;
                subscribe<C extends keyof Messages>(handler: (event: number, ...args: Messages[C]) => void, channel: C): void;
            }
            declare const transport: Transport;
            transport.publish(1, 'patch', '{}');
            transport.subscribe((event, patchJson) => { event.toFixed(); patchJson.toUpperCase(); }, 'patch');
        `, rule);
        assert.deepEqual(compileFixture(fixture), []);
        assert.deepEqual(await messageDiagnostics(fixture), []);
    });

    it('accepts a contained raw dependency adapter with a canonical typed interface', async () => {
        const rule: TstsSharedMessageContractsConfig = rawRule();
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            import type { RawTransport } from './node_modules/raw/index.js';
            export function adaptTransport(rawTransport: RawTransport): Transport {
                return {
                    send(channel, ...args) { rawTransport.send(channel, ...args); },
                    on() {},
                };
            }
        `, rule);
        assert.deepEqual(compileFixture(fixture), []);
        assert.deepEqual(await messageDiagnostics(fixture), []);
    });

    it('rejects raw calls outside the designated adapter, including elsewhere in its file', async () => {
        const rule: TstsSharedMessageContractsConfig = rawRule();
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            import type { RawTransport } from './node_modules/raw/index.js';
            declare const rawTransport: RawTransport;
            export function adaptTransport(): Transport { return transport; }
            rawTransport.send('patch', '{}');
        `, rule);
        assert.match((await messageDiagnostics(fixture)).map(diagnostic => diagnostic.message).join('\n'), /only inside a designated adapter/u);
    });

    it('rejects incorrectly typed adapters and raw owned interfaces', async () => {
        const rule: TstsSharedMessageContractsConfig = {
            ...rawRule(), apis: [
                { id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0, payloadParameter: 1,
                    receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' },
                { id: 'raw', role: 'producer', contractId: 'sidebar', channelParameter: 0, payloadParameter: 1,
                    receiver: { path: 'index.ts', exportName: 'RawTransport' }, method: 'send', raw: true },
            ],
        };
        const fixture: SharedMessageFixture = createFixture(canonicalApi + `
            export interface RawTransport { send(channel: string, ...args: unknown[]): void; }
            declare const rawTransport: RawTransport;
            export function adaptTransport(): RawTransport { return rawTransport; }
        `, rule);
        const diagnostics: readonly TstsDiagnostic[] = await messageDiagnostics(fixture);
        assert.ok(diagnostics.some(diagnostic => /dependency declaration, not owned/u.test(diagnostic.message)));
        assert.ok(diagnostics.some(diagnostic => /must expose canonical typed receiver/u.test(diagnostic.message)));
    });

    it('rejects malformed V3 rule configuration without accepting new keys in V2', () => {
        const legacy: TstsConfig = { schemaVersion: 2, workspaces: [] };
        assert.equal(readTstsConfigV2(legacy).schemaVersion, 4);
        const malformed: unknown = { schemaVersion: 2, workspaces: [], sharedMessageContracts: {} };
        assert.throws(() => readTstsConfigV2(malformed), /V2/u);
        for (const value of [0.5, -1, '0', 9007199254740992, NaN, Infinity]) {
            const invalid: unknown = { schemaVersion: 3, workspaces: [], sharedMessageContracts: {
                contracts: [{ id: 'x', path: 'x.ts', exportName: 'X' }],
                apis: [{ id: 'x', receiver: { path: 'x.ts', exportName: 'X' }, method: 'send',
                    contractId: 'x', role: 'producer', channelParameter: value, payloadParameter: 1 }],
            } };
            assert.throws(() => readTstsConfigV3(invalid), /V3/u);
        }
    });

    it('normalizes lossless index numbers only inside the exact safe range', () => {
        for (const payloadParameter of [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER]) {
            const config: TstsConfigV3 = {
                schemaVersion: 3, workspaces: [], sharedMessageContracts: {
                    contracts: [{ id: 'sidebar', path: 'messages.ts', exportName: 'Messages' }],
                    apis: [{ id: 'send', role: 'producer', contractId: 'sidebar', channelParameter: 0,
                        payloadParameter, receiver: { path: 'index.ts', exportName: 'Transport' }, method: 'send' }],
                },
            };
            const json: string = stringifyJsonLosslessly(config);
            assert.deepEqual(readTstsConfigV3(parseJsonLosslessly(json)), {...config,schemaVersion:4});
            assert.throws(() => readTstsConfigV3(parseJsonLosslessly(
                json.replace(String(payloadParameter), '9007199254740993'))), /V3/u);
        }
    });


});
