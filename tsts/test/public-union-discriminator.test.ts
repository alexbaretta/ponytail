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
  it('does not impose owned discriminators on third-party declarations', async (): Promise<void> => {
    const projectPath = await createFixtureProject(`
      import type { ExternalNode, ExternalNodes } from './external.js';
      interface Options { nodes: ExternalNode | ExternalNodes; }
    `);
    await writeFile(path.join(path.dirname(projectPath), 'external.d.ts'), `
      export interface ExternalNode { text: string; }
      export interface ExternalNodes { length: number; }
    `);
    const result = await checkProject({ projectPath });
    assert.deepEqual(result.diagnostics, []);
  });

  it('accepts private nested paths and non-string singleton discriminators', async (): Promise<void> => {
    const projectPath = await createFixtureProject(`
      interface Destination<Kind extends string> { readonly kind: Kind; }
      type Event = { destination: Destination<'admin'>; value: string }
        | { destination: Destination<'project'>; value: number };
      type Result = { ok: true; value: string } | { ok: false; error: string };
      type Numeric = { kind: 1 } | { kind: 2 };
      type Big = { kind: 1n } | { kind: 2n };
      enum Kind { A = 1, B = 2 }
      type Enumeration = { kind: Kind.A } | { kind: Kind.B };
      type Mixed = { kind: '1' } | { kind: 1 } | { kind: null };
      function local() { type Local = { destination: { kind: 'a' } } | { destination: { kind: 'b' } }; }
    `);
    const result = await checkProject({ projectPath });
    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects invalid nested paths in private, local and inline unions', async (): Promise<void> => {
    const projectPath = await createFixtureProject(`
      type Missing = { destination: { kind: 'a' } } | { destination: { other: 'b' } };
      type OptionalParent = { destination?: { kind: 'a' } } | { destination: { kind: 'b' } };
      type OptionalLeaf = { destination: { kind?: 'a' } } | { destination: { kind: 'b' } };
      type Duplicate = { destination: { kind: 'a' }; value: string } | { destination: { kind: 'a' }; value: number };
      type Multiple = { destination: { kind: 'a' | 'b' } } | { destination: { kind: 'c' } };
      enum Kind { A = 1, B = 2 }
      type EnumDuplicate = { kind: Kind.A; value: string } | { kind: 1; value: number };
      type EnumMultiple = { kind: Kind } | { kind: 3 };
      function local() { type Local = { value: string } | { value: number }; }
      function inline(value: { data: string } | { data: number }): void {}
      interface Cycle { next: Cycle; }
      type Recursive = { destination: Cycle; value: string } | { destination: Cycle; value: number };
    `);
    const result = await checkProject({ projectPath });
    assert.equal(result.diagnostics.length, 10);
    assert.ok(result.diagnostics.every(diagnostic => diagnostic.ruleId === 'public-union-discriminator'));
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.message.includes('"destination.kind" reuses')));
  });

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

  it('resolves instantiated generic discriminants through inheritance and aliases', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      interface Metric<Kind extends string> { readonly kind: Kind; }
      interface Recordable<Kind extends string> extends Metric<Kind> { readonly value: number; }
      type Counter<Kind extends string = 'counter'> = Recordable<Kind>;
      export type TelemetryApiMetric = Counter | Recordable<'histogram'>
        | Recordable<'up_down_counter'> | Metric<'observable_gauge'>;
    `);
    const result: TstsCheckResult = await checkProject({ projectPath });
    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects generic discriminants that are duplicate, broad, optional or nonsingleton', async (): Promise<void> => {
    for (const property of ["readonly kind: Kind", "readonly kind?: Kind"]) {
      const projectPath: string = await createFixtureProject(`
        interface Metric<Kind extends string> { ${property}; }
        export type Broad = Metric<string> | Metric<'gauge'>;
        export type Multiple = Metric<'counter' | 'histogram'> | Metric<'gauge'>;
        export type Duplicate = Metric<'same'> | (Metric<'same'> & { readonly value: number });
      `);
      const result: TstsCheckResult = await checkProject({ projectPath });
      assert.equal(result.diagnostics.length, 3);
      assert.ok(result.diagnostics.every(diagnostic => diagnostic.ruleId === 'public-union-discriminator'));
    }
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

    assert.match(diagnostic.message, /No required singleton-literal field/u);
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
    assert.match(diagnostic.message, /"category" is not a singleton literal/u);
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

    assert.match(diagnostic.message, /No required singleton-literal field/u);
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
