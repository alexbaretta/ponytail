// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';
import type { TstsCheckResult, TstsConfig, TstsDiagnostic } from '../src/index.js';

describe('public union dispatch rule', (): void => {
  it('accepts exhaustive switch dispatch', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;

      export function handleSyntheticCommand(request: SyntheticCommand): string {
        switch (request.command_kind) {
          case 'literal_alpha':
            return 'alpha';
          case 'literal_beta':
            return 'beta';
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('accepts const-backed exhaustive switch dispatch', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export const LiteralAlphaCommandKind = 'literal_alpha';
      export const LiteralBetaCommandKind = 'literal_beta';

      export interface LiteralAlphaCommand {
        readonly command_kind: typeof LiteralAlphaCommandKind;
      }

      export interface LiteralBetaCommand {
        readonly command_kind: typeof LiteralBetaCommandKind;
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;

      export function handleSyntheticCommand(request: SyntheticCommand): string {
        switch (request.command_kind) {
          case LiteralAlphaCommandKind:
            return 'alpha';
          case LiteralBetaCommandKind:
            return 'beta';
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects non-exhaustive switch dispatch', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;

      export function handleSyntheticCommand(request: SyntheticCommand): string {
        switch (request.command_kind) {
          case 'literal_alpha':
            return 'alpha';
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'discriminated-union-exhaustive-dispatch');
    assert.match(diagnostic.message, /SyntheticCommand\.command_kind/u);
    assert.match(diagnostic.message, /literal_beta/u);
  });

  it('rejects non-exhaustive dispatch over a non-exported union', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      interface RawAchPaymentRequest {
        readonly request_kind: 'raw_ach';
      }

      interface StoredAchPaymentRequest {
        readonly request_kind: 'stored_ach';
      }

      type PaymentRequest =
        | RawAchPaymentRequest
        | StoredAchPaymentRequest;

      export function handlePaymentRequest(request: PaymentRequest): string {
        switch (request.request_kind) {
          case 'raw_ach':
            return 'raw';
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'discriminated-union-exhaustive-dispatch');
    assert.match(diagnostic.message, /stored_ach/u);
  });

  it('does not allow default clauses to hide missing cases', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;

      export function handleSyntheticCommand(request: SyntheticCommand): string {
        switch (request.command_kind) {
          case 'literal_alpha':
            return 'alpha';
          default:
            return 'fallback';
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.match(diagnostic.message, /literal_beta/u);
  });

  it('rejects a catch-all branch that throws', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface RawAchPaymentRequest {
        readonly request_kind: 'raw_ach';
      }

      export interface StoredAchPaymentRequest {
        readonly request_kind: 'stored_ach';
      }

      // Discriminator: request_kind
      export type PaymentRequest =
        | RawAchPaymentRequest
        | StoredAchPaymentRequest;

      export function handlePaymentRequest(request: PaymentRequest): string {
        switch (request.request_kind) {
          case 'raw_ach':
            return 'raw';
          case 'stored_ach':
            return 'stored';
          default:
            throw new Error('unsupported payment request');
        }
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'discriminated-union-exhaustive-dispatch');
    assert.match(diagnostic.message, /must not use a default clause/u);
  });

  it('checks discriminated union dispatch in configured workspaces', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      interface RawAchPaymentRequest {
        readonly request_kind: 'raw_ach';
      }

      interface StoredAchPaymentRequest {
        readonly request_kind: 'stored_ach';
      }

      type PaymentRequest = RawAchPaymentRequest | StoredAchPaymentRequest;

      export function handlePaymentRequest(request: PaymentRequest): string {
        switch (request.request_kind) {
          case 'raw_ach':
            return 'raw';
        }
      }
    `);
    const configPath: string = path.join(path.dirname(projectPath), 'tsts.json');
    const tstsConfig: TstsConfig = {
      schemaVersion: 2,
      workspaces: [
        {
          entrypoints: ['contract.ts'],
          name: 'fixture',
          packageName: 'fixture',
          projectPath: 'tsconfig.json',
        },
      ],
    };
    await writeFile(configPath, stringifyJsonLosslessly(tstsConfig));

    const result: TstsCheckResult = await checkProject({ configPath });

    assert.equal(
      result.diagnostics.some(
        (diagnostic: TstsDiagnostic): boolean =>
          diagnostic.ruleId === 'discriminated-union-exhaustive-dispatch',
      ),
      true,
    );
  });

  it('rejects if dispatch over public union discriminators', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;

      export function handleSyntheticCommand(request: SyntheticCommand): string {
        if (request.command_kind === 'literal_alpha') {
          return 'alpha';
        }

        return 'beta';
      }
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'public-union-exhaustive-dispatch');
    assert.match(diagnostic.message, /must use an exhaustive switch/u);
  });
});

async function createFixtureProject(sourceText: string): Promise<string> {
  const fixtureDirectory: string = await mkdtemp(
    path.join(tmpdir(), 'tsts-fixture-'),
  );
  const sourcePath: string = path.join(fixtureDirectory, 'contract.ts');
  const projectPath: string = path.join(fixtureDirectory, 'tsconfig.json');

  await writeFile(sourcePath, sourceText);
  await writeFile(
    projectPath,
    [
      '{',
      '  "compilerOptions": {',
      '    "exactOptionalPropertyTypes": true,',
      '    "module": "NodeNext",',
      '    "moduleResolution": "NodeNext",',
      '    "noImplicitReturns": false,',
      '    "strict": true,',
      '    "target": "ES2024"',
      '  },',
      '  "include": ["contract.ts"]',
      '}',
      '',
    ].join('\n'),
  );

  return projectPath;
}

function singleDiagnostic(result: TstsCheckResult): TstsDiagnostic {
  assert.equal(result.diagnostics.length, 1);

  const diagnostic: TstsDiagnostic | undefined = result.diagnostics[0];
  if (diagnostic === undefined) {
    throw new Error('Expected one diagnostic.');
  }

  return diagnostic;
}
