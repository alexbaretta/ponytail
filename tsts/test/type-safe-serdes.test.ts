// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import type { TstsCheckResult, TstsConfig, TstsDiagnostic } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';

describe('type-safe persisted serdes rule', (): void => {
    it('accepts canonical persisted envelope types and schemas', async (): Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            interface SchemaBuilder {
                optional(): SchemaBuilder;
            }

            declare const z: {
                object(shape: unknown): SchemaBuilder;
                literal(value: string): SchemaBuilder;
            };

            export interface CanonicalEnvelope {
                readonly envelope_kind: 'canonical_alpha';
            }

            export const CanonicalEnvelopeSchema = z.object({
                envelope_kind: z.literal('canonical_alpha'),
            });

            export interface PersistedRecord {
                readonly serializedEnvelope?: CanonicalEnvelope;
            }

            export const PersistedRecordSchema = z.object({
                serializedEnvelope: CanonicalEnvelopeSchema.optional(),
            });
        `);

        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(typeSafeSerdesDiagnostics(result), []);
    });

    it('rejects unknown persisted envelope types', async (): Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            export interface PersistedRecord {
                readonly serializedEnvelope?: unknown;
            }
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /serializedEnvelope/u);
        assert.match(diagnostics[0]?.message ?? '', /unknown/u);
        assert.match(diagnostics[0]?.message ?? '', /CanonicalEnvelope/u);
    });

    it('rejects untyped JSON persisted envelope types', async (): Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            export type JsonValue = string | number | boolean | null;

            export interface PersistedRecord {
                readonly serialized_envelope?: JsonValue | null;
            }
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /serialized_envelope/u);
        assert.match(diagnostics[0]?.message ?? '', /JsonValue/u);
    });

    it('rejects private narrower reader envelope types', async (): Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            type PrivateEnvelope = {
                readonly privateFlag: 0 | 1;
            };

            export interface PersistedReader {
                readonly serializedEnvelopeDetails: PrivateEnvelope;
            }
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /serializedEnvelopeDetails/u);
        assert.match(diagnostics[0]?.message ?? '', /PrivateEnvelope/u);
    });

    it('rejects private reader schemas for persisted envelope parsing', async (): Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            interface SchemaBuilder {
                parse(input: unknown): unknown;
            }

            declare const PrivateEnvelopeSchema: SchemaBuilder;

            export function parseInitialEnvelope(input: {
                readonly serialized_envelope: unknown;
            }): unknown {
                return PrivateEnvelopeSchema.parse(
                    input.serialized_envelope
                );
            }
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 2);
        assert.match(diagnostics[1]?.message ?? '', /serialized_envelope/u);
        assert.match(
            diagnostics[1]?.message ?? '',
            /PrivateEnvelopeSchema/u
        );
    });

    it('rejects non-canonical Zod schemas for persisted envelope fields', async ():
        Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            interface SchemaBuilder {
                optional(): SchemaBuilder;
            }

            declare const z: {
                object(shape: unknown): SchemaBuilder;
                unknown(): SchemaBuilder;
            };

            export const PersistedResultSchema = z.object({
                serializedEnvelope: z.unknown().optional(),
            });
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /schema/u);
        assert.match(diagnostics[0]?.message ?? '', /z\.unknown/u);
    });

    it('accepts canonical contract variant helpers only inside canonical declarations', async ():
        Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            interface SchemaBuilder {
                optional(): SchemaBuilder;
            }

            declare const z: {
                object(shape: unknown): SchemaBuilder;
                unknown(): SchemaBuilder;
            };

            export type CanonicalEnvelopeVariant<TEnvelope> = {
                readonly serialized_envelope_kind: 'canonical_alpha';
                readonly serialized_envelope: TEnvelope;
            };

            export type CanonicalEnvelope =
                CanonicalEnvelopeVariant<{ readonly payload_kind: 'publish' }>;

            export function canonicalEnvelopeVariantSchema(
                serializedEnvelopeSchema: SchemaBuilder
            ): SchemaBuilder {
                return z.object({
                    serialized_envelope_kind: z.unknown(),
                    serialized_envelope: serializedEnvelopeSchema,
                });
            }

            export const CanonicalEnvelopeSchema =
                canonicalEnvelopeVariantSchema(z.unknown());

            export interface UnsafeExternalDto {
                readonly serialized_envelope: unknown;
            }
        `);

        const result: TstsCheckResult = await checkProject({ configPath });
        const diagnostics: readonly TstsDiagnostic[] = typeSafeSerdesDiagnostics(result);

        assert.equal(diagnostics.length, 1);
        assert.match(diagnostics[0]?.message ?? '', /UnsafeExternalDto|serialized_envelope/u);
        assert.match(diagnostics[0]?.message ?? '', /unknown/u);
    });

    it('ignores ordinary object literals with matching envelope property names', async ():
        Promise<void> => {
        const configPath: string = await createTypeSafeSerdesFixture(`
            export const fixture = {
                serializedEnvelope: {
                    envelope_kind: 'canonical_alpha',
                },
            };
        `);

        const result: TstsCheckResult = await checkProject({ configPath });

        assert.deepEqual(typeSafeSerdesDiagnostics(result), []);
    });
});

function typeSafeSerdesDiagnostics(result: TstsCheckResult): readonly TstsDiagnostic[] {
    assert.deepEqual(
        result.diagnostics.filter(
            (diagnostic: TstsDiagnostic): boolean => diagnostic.ruleId === 'unused-code'
        ),
        []
    );
    return result.diagnostics.filter(
        (diagnostic: TstsDiagnostic): boolean => diagnostic.ruleId === 'type-safe-serdes'
    );
}

async function createTypeSafeSerdesFixture(sourceText: string): Promise<string> {
    const fixtureDirectory: string = await mkdtemp(path.join(tmpdir(), 'tsts-serdes-fixture-'));
    const appDirectory: string = path.join(fixtureDirectory, 'app');

    await mkdir(appDirectory);
    await writeFile(path.join(appDirectory, 'index.ts'), sourceText);
    await writeFile(path.join(appDirectory, 'tsconfig.json'), createTsconfig(['index.ts']));
    const config: TstsConfig = {
        schemaVersion: 2,
        typeSafeSerdes: {
            severity: 'error',
            contracts: [
                {
                    contractName: 'canonical envelope',
                    canonicalTypeName: 'CanonicalEnvelope',
                    canonicalSchemaName: 'CanonicalEnvelopeSchema',
                    propertyNames: [
                        'serialized_envelope',
                        'serializedEnvelope',
                        'serializedEnvelopeDetails',
                    ],
                },
            ],
        },
        workspaces: [
            {
                entrypoints: ['index.ts'],
                projectPath: 'app/tsconfig.json',
            },
        ],
    };
    await writeFile(
        path.join(fixtureDirectory, 'tsts.json'),
        stringifyJsonLosslessly(config, 2)
    );

    return path.join(fixtureDirectory, 'tsts.json');
}

function createTsconfig(files: readonly string[]): string {
    return stringifyJsonLosslessly(
        {
            compilerOptions: {
                exactOptionalPropertyTypes: true,
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                target: 'ES2024',
            },
            files,
        },
        2
    );
}
