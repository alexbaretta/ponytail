// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { fail } from './plan-input-queue.js';
import { isRollingCommandName } from './rolling-cli-registry.js';

// Traceability: implements REQ-ROLLING-INTERFACES
export function isRollingCampaignCommand(operation: string, argument: string | null): boolean {
  // Positional plan selectors and the historical --json reader retain the
  // legacy hook's authentication. Named rolling flags are checked by its CLI.
  return isRollingCommandName(operation) && (argument === null
    || argument !== '--json' && argument.startsWith('-'));
}

interface PlanInputCommandFields {
  readonly plan: string;
}
export interface PlanInputEnqueueCommand extends PlanInputCommandFields { readonly command: 'enqueue'; readonly prompt: string }
export interface PlanInputCoordinateCommand extends PlanInputCommandFields { readonly command: 'coordinate' }
export interface PlanInputReleaseCommand extends PlanInputCommandFields { readonly command: 'release' }
export interface PlanInputListCommand extends PlanInputCommandFields { readonly command: 'list'; readonly json: boolean }
export interface PlanInputClaimCommand extends PlanInputCommandFields { readonly command: 'claim'; readonly json: boolean }
export interface PlanInputCompleteCommand extends PlanInputCommandFields { readonly command: 'complete'; readonly id: string; readonly records: readonly string[] }
export type PlanInputCommand = PlanInputEnqueueCommand | PlanInputCoordinateCommand | PlanInputReleaseCommand |
  PlanInputListCommand | PlanInputClaimCommand | PlanInputCompleteCommand;

// Traceability: implements REQ-PLAN-INPUT-QUEUE
export function parseCli(argv: readonly string[]): PlanInputCommand {
  const command = argv[0];
  if (command === undefined) fail('usage: ponytail plan-input <plan> -- <instruction> | coordinate <plan> | release <plan> | list <plan> [--json] | claim <plan> [--json] | complete <plan> <id> --record <pm-path>...');
  const plan = argv[1];
  if (command === 'coordinate' || command === 'release') {
    if (argv.length !== 2 || plan === undefined) fail(`usage: ponytail plan-input ${command} <plan>`);
    return { command, plan };
  }
  if (command === 'list' || command === 'claim') {
    if (argv.length < 2 || argv.length > 3 || plan === undefined || (argv[2] && argv[2] !== '--json')) fail(`usage: ponytail plan-input ${command} <plan> [--json]`);
    return { command, plan, json: argv[2] === '--json' };
  }
  if (command === 'complete') {
    const id = argv[2];
    const records: string[] = [];
    for (let index = 3; index < argv.length; index += 2) {
      const record = argv[index + 1];
      if (argv[index] !== '--record' || !record) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
      records.push(record);
    }
    if (!plan || !id || records.length === 0) fail('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
    return { command, plan, id, records };
  }
  const separator = argv.indexOf('--');
  if (separator !== 1 || argv.length < 3) fail('usage: ponytail plan-input <plan> -- <instruction>');
  return { command: 'enqueue', plan: command, prompt: argv.slice(2).join(' ') };
}
