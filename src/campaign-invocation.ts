// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { toolError } from './campaign-configuration.js';
import type { CampaignStatus } from './campaign-inventory.js';
import type { CampaignReportTableOptions } from './campaign-report.js';

export interface CampaignListInvocation { readonly operation: 'list'; readonly campaignStatus: CampaignStatus }
export interface CampaignActivateInvocation { readonly operation: 'activate'; readonly input: string }
export type CampaignValidationSelection = { readonly mode: 'all'; readonly json: boolean } | { readonly mode: 'plan'; readonly input: string };
export interface CampaignValidateInvocation { readonly operation: 'validate'; readonly selection: CampaignValidationSelection }
export interface CampaignReportInvocation {
  readonly operation: 'report'; readonly input: string | undefined; readonly json: boolean;
  readonly campaignReportTableOptions: CampaignReportTableOptions;
}
export type CampaignInvocation = CampaignListInvocation | CampaignActivateInvocation | CampaignValidateInvocation | CampaignReportInvocation;

const campaignStatuses: readonly CampaignStatus[] = ['active', 'pending', 'closed', 'deferred', 'rejected'];
const REPORT_TABLE_FLAGS: ReadonlyMap<string, readonly [keyof CampaignReportTableOptions, boolean]> = new Map([
  ['--summary-table', ['summaryTable', true]], ['--no-summary-table', ['summaryTable', false]],
  ['--plan-table', ['planTable', true]], ['--no-plan-table', ['planTable', false]],
  ['--sprint-table', ['sprintTable', true]], ['--no-sprint-table', ['sprintTable', false]],
]);

// Traceability: implements REQ-PONYTAIL-STATIC-LANGUAGE
export function parseCampaignInvocation(argv: readonly string[]): CampaignInvocation {
  const operation = argv[0];
  if (operation === 'list') {
    if (argv.length > 2) toolError('CAMPAIGN_USAGE', campaignUsage());
    if (argv.length === 1) return { operation, campaignStatus: 'active' };
    const campaignStatus: CampaignStatus | undefined = campaignStatuses.find(status => argv[1] === `--${status}`);
    if (campaignStatus === undefined) toolError('CAMPAIGN_USAGE', campaignUsage());
    return { operation, campaignStatus };
  }
  if (operation === 'activate') {
    const input = argv[1];
    if (argv.length !== 2 || input === undefined || input.startsWith('-')) toolError('CAMPAIGN_USAGE', campaignUsage());
    return { operation, input };
  }
  if (operation === 'validate') {
    let input: string | undefined;
    let all = false;
    let json = false;
    for (const argument of argv.slice(1)) {
      if (argument === '--all' && !all && input === undefined) all = true;
      else if (argument === '--json' && !json && input === undefined) json = true;
      else if (argument.startsWith('-') || input !== undefined || all || json) toolError('CAMPAIGN_USAGE', campaignUsage());
      else input = argument;
    }
    if (all) return { operation, selection: { mode: 'all', json } };
    if (input === undefined || json) toolError('CAMPAIGN_USAGE', campaignUsage());
    return { operation, selection: { mode: 'plan', input } };
  }
  if (operation === 'report') {
    let input: string | undefined;
    let json = false;
    let tableFlagSeen = false;
    let campaignReportTableOptions: CampaignReportTableOptions = {};
    for (const argument of argv.slice(1)) {
      const tableFlag = REPORT_TABLE_FLAGS.get(argument);
      if (argument === '--json') json = true;
      else if (tableFlag) {
        const [name, enabled] = tableFlag;
        campaignReportTableOptions = { ...campaignReportTableOptions, [name]: enabled };
        tableFlagSeen = true;
      } else if (argument.startsWith('-') || input !== undefined) toolError('CAMPAIGN_USAGE', campaignUsage());
      else input = argument;
    }
    if (json && tableFlagSeen) toolError('CAMPAIGN_USAGE', 'table options cannot be combined with --json');
    return { operation, input, json, campaignReportTableOptions };
  }
  toolError('CAMPAIGN_USAGE', campaignUsage());
}

export function campaignUsage(): string {
  return 'usage: ponytail campaign validate <plan-name-or-path>\n       ponytail campaign validate --all [--json]\n       ponytail campaign report [<plan-name-or-path>] [--json] [--[no-]summary-table] [--[no-]plan-table] [--[no-]sprint-table]\n       ponytail campaign list [--active|--pending|--closed|--deferred|--rejected]\n       ponytail campaign activate <plan-name-or-path>\n       ponytail campaign status [<campaign>] [--json]\n       ponytail campaign reservation-audit [<campaign>] [--json]\n       ponytail campaign runnable-plans [<campaign>] [--json]\n       ponytail campaign tasklet-prerequisites [<campaign>] [--json]\n       ponytail campaign schedule-ready [<campaign>] [--json]\n       ponytail campaign schedule-review-ready [<campaign>] [--json]\n       ponytail campaign schedule-planning-ready [<campaign>] [--json]\n       ponytail campaign ready-actions [<campaign>] [--json]\n       ponytail campaign report-blocker <campaign> --result <json>\n       ponytail campaign observe <campaign> --snapshot <json>\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign reconcile <campaign> [--json]\n       ponytail campaign retry-dispatch <campaign> <original-action-id> --authorization <non-secret-reference> [--json]\n       ponytail campaign action-result <campaign> <action-id> --result <json>\n       ponytail campaign retire-worktree <campaign> <action-id> [--json]\n       ponytail campaign attach <token>\n       ponytail campaign deliver <campaign> --result <json>';
}
