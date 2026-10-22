// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { checkProject } from '../src/index.js';
import { stringifyJsonLosslessly } from '../src/lossless-json.js';
import type { TstsCheckResult, TstsConfig, TstsDiagnostic } from '../src/index.js';

describe('public union dispatch rule', (): void => {
  it('checks nested private dispatch and keeps same-named local unions distinct', async (): Promise<void> => {
    const projectPath = await createFixtureProject(`
      type Event = { destination: { kind: 'a' } } | { destination: { kind: 'b' } };
      function complete(event: Event): void {
        switch (event.destination.kind) { case 'a': return; case 'b': return; }
      }
      function incomplete(event: Event): void {
        switch (event.destination.kind) { case 'a': return; }
      }
      function conditional(event: Event): void { if (event.destination.kind === 'a') return; }
      function outer(): void {
        type Event = { ok: true } | { ok: false };
        function conditional(event: Event): void { if (event.ok === true) return; }
      }
    `);
    const result = await checkProject({ projectPath });
    assert.equal(result.diagnostics.length, 3);
    assert.equal(result.diagnostics.filter(diagnostic => diagnostic.ruleId === 'public-union-exhaustive-dispatch').length, 2);
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.message.includes('Missing cases: b')));
  });

  it('focuses diagnostics while retaining imported union context and rejecting unmatched selections', async (): Promise<void> => {
    const projectPath: string = await createFixtureProject(`
      import type { Command } from './dependency.js';
      export function dispatch(command: Command): string {
        switch (command.kind) { case 'a': return 'a'; }
        return '';
      }
    `);
    const filePath: string = path.join(path.dirname(projectPath), 'contract.ts');
    const dependencyPath: string = path.join(path.dirname(projectPath), 'dependency.ts');
    await writeFile(dependencyPath, `
      export interface Alpha { readonly kind: 'a'; }
      export interface Beta { readonly kind: 'b'; }
      export type Command = Alpha | Beta;
      export interface BadAlpha { readonly value: string; }
      export interface BadBeta { readonly count: number; }
      export type Bad = BadAlpha | BadBeta;
    `);
    const focused: TstsCheckResult = await checkProject({ projectPath, filePaths: [filePath] });
    assert.equal(focused.checkedFileCount, 1);
    assert(focused.diagnostics.some(diagnostic => diagnostic.ruleId === 'discriminated-union-exhaustive-dispatch'));
    assert(focused.diagnostics.every(diagnostic => diagnostic.filePath === filePath));
    const full: TstsCheckResult = await checkProject({ projectPath });
    assert(full.diagnostics.some(diagnostic => diagnostic.filePath === dependencyPath));
    const unmatched: TstsCheckResult = await checkProject({ projectPath, filePaths: [filePath, path.join(path.dirname(projectPath), 'missing.ts')] });
    assert(unmatched.diagnostics.some(diagnostic => diagnostic.ruleId === 'focused-source-selection'));
    const empty: TstsCheckResult = await checkProject({ projectPath, filePaths: [] });
    assert.equal(empty.diagnostics[0]?.ruleId, 'focused-source-selection');
    const incompatible: TstsCheckResult = await checkProject({ projectPath, filePaths: [filePath], configPath: 'not-read.json' });
    assert.equal(incompatible.diagnostics[0]?.ruleId, 'focused-source-selection');
    await writeFile(filePath, `
      import type { Command } from './dependency.js';
      export function dispatch(command: Command): string {
        switch (command.kind) { case 'a': return 'a'; case 'b': return 'b'; }
      }
    `);
    const passing: TstsCheckResult = await checkProject({ projectPath, filePaths: [filePath, filePath] });
    assert.equal(passing.checkedFileCount, 1);
    assert.deepEqual(passing.diagnostics, []);
    const cliPath: string = fileURLToPath(new URL('../src/cli.js', import.meta.url));
    assert.match(execFileSync(process.execPath, [cliPath, '--project', projectPath, '--file', filePath], { encoding: 'utf8' }), /checked 1 files: no violations/);
    assert.throws(() => execFileSync(process.execPath, [cliPath, '--project', projectPath], { stdio: 'pipe' }));
    const dependency: TstsCheckResult = await checkProject({ projectPath, filePaths: [dependencyPath] });
    assert(dependency.diagnostics.some(diagnostic => diagnostic.filePath === dependencyPath));
  });

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
