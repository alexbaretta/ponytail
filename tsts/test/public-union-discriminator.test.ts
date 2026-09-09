// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import type { TstsCheckResult, TstsDiagnostic } from '../src/index.js';

describe('public union discriminator rule', (): void => {
  it('accepts a valid discriminated public union', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
        readonly type: 'shared_mode';
        readonly alpha_value: string;
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
        readonly type: 'shared_mode';
        readonly beta_value: string;
      }

      // Discriminator: command_kind
      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('accepts const-backed string literal discriminants', async ():
    Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export const AlphaCommandKind = 'alpha';
      export const BetaCommandKind = 'beta';

      export interface AlphaCommand {
        readonly command_kind: typeof AlphaCommandKind;
      }

      export interface BetaCommand {
        readonly command_kind: typeof BetaCommandKind;
      }

      // Discriminator: command_kind
      export type SyntheticCommand = AlphaCommand | BetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects a public union with duplicate discriminator values', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly type: 'shared_mode';
        readonly alpha_value: string;
      }

      export interface LiteralBetaCommand {
        readonly type: 'shared_mode';
        readonly beta_value: string;
      }

      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'public-union-discriminator');
    assert.match(diagnostic.message, /SyntheticCommand/u);
    assert.match(diagnostic.message, /"type" reuses/u);
    assert.match(diagnostic.message, /"shared_mode" appears in 2 variants/u);
  });

  it('rejects an ambiguous four-variant shape', async ():
    Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface ChannelAlphaCommand {
        readonly type: 'shared_channel';
        readonly alpha_value: string;
      }

      export interface ChannelBetaCommand {
        readonly type: 'shared_channel';
        readonly beta_value: string;
      }

      export interface ModeAlphaCommand {
        readonly type: 'shared_mode';
        readonly alpha_value: string;
      }

      export interface ModeBetaCommand {
        readonly type: 'shared_mode';
        readonly beta_value: string;
      }

      export type AmbiguousCommand =
        | ChannelAlphaCommand
        | ChannelBetaCommand
        | ModeAlphaCommand
        | ModeBetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'public-union-discriminator');
    assert.match(diagnostic.message, /AmbiguousCommand/u);
    assert.match(diagnostic.message, /"type" reuses/u);
    assert.match(diagnostic.message, /"shared_channel" appears in 2 variants/u);
    assert.match(diagnostic.message, /"shared_mode" appears in 2 variants/u);
  });

  it('accepts synthetic row result variants', async ():
    Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface AcceptedRow {
        readonly rowResultKind: 'succeeded';
        readonly resultId: string;
      }

      export interface RejectedRow {
        readonly rowResultKind: 'failed';
        readonly errorCode: string;
      }

      // Discriminator: rowResultKind
      export type SyntheticRowResult =
        | AcceptedRow
        | RejectedRow;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects ambiguous synthetic channel variants', async ():
    Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface DirectChannelCommand {
        readonly channelKind: 'shared_channel';
        readonly directValue: string;
      }

      export interface ReferencedChannelCommand {
        readonly channelKind: 'shared_channel';
        readonly referencedValue: string;
      }

      export type AmbiguousChannelCommand =
        | DirectChannelCommand
        | ReferencedChannelCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.equal(diagnostic.ruleId, 'public-union-discriminator');
    assert.match(diagnostic.message, /AmbiguousChannelCommand/u);
    assert.match(diagnostic.message, /"channelKind" reuses/u);
    assert.match(diagnostic.message, /"shared_channel" appears in 2 variants/u);
  });

  it('rejects a public union with no shared required literal field', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind: 'literal_alpha';
        readonly alpha_value: string;
      }

      export interface LiteralBetaCommand {
        readonly beta_value: string;
      }

      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.match(diagnostic.message, /No required string-literal field/u);
  });

  it('explains shared required fields that are not literal in every variant', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralLocation {
        readonly category: 'literal_location';
        readonly payload: string;
      }

      export interface GeneralLocation {
        readonly category: string;
        readonly payload: string;
      }

      export type SyntheticLocation = LiteralLocation | GeneralLocation;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.match(diagnostic.message, /SyntheticLocation/u);
    assert.match(diagnostic.message, /"category" is not a string literal/u);
    assert.match(diagnostic.message, /1 variant/u);
  });

  it('rejects optional discriminator fields', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface LiteralAlphaCommand {
        readonly command_kind?: 'literal_alpha';
        readonly alpha_value: string;
      }

      export interface LiteralBetaCommand {
        readonly command_kind: 'literal_beta';
        readonly beta_value: string;
      }

      export type SyntheticCommand =
        | LiteralAlphaCommand
        | LiteralBetaCommand;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });
    const diagnostic: TstsDiagnostic = singleDiagnostic(result);

    assert.match(diagnostic.message, /No required string-literal field/u);
  });

  it('ignores non-object unions outside the rule scope', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export type StringOrNumber = string | number;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.deepEqual(result.diagnostics, []);
  });

  it('reports every non-fatal violation', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      export interface FirstA {
        readonly type: 'shared';
      }

      export interface FirstB {
        readonly type: 'shared';
      }

      export type FirstRequest = FirstA | FirstB;

      export interface SecondA {
        readonly kind: 'shared';
      }

      export interface SecondB {
        readonly kind: 'shared';
      }

      export type SecondRequest = SecondA | SecondB;
    `);

    const result: TstsCheckResult = await checkProject({ projectPath });

    assert.equal(result.diagnostics.length, 2);
    assert.match(result.diagnostics[0]?.message ?? '', /FirstRequest/u);
    assert.match(result.diagnostics[1]?.message ?? '', /SecondRequest/u);
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
