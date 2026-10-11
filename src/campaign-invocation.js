// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/campaign-invocation.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCampaignInvocation = parseCampaignInvocation;
exports.campaignUsage = campaignUsage;
const campaign_configuration_js_1 = require("./campaign-configuration.js");
const campaignStatuses = ['active', 'pending', 'closed', 'deferred', 'rejected'];
const REPORT_TABLE_FLAGS = new Map([
    ['--summary-table', ['summaryTable', true]], ['--no-summary-table', ['summaryTable', false]],
    ['--plan-table', ['planTable', true]], ['--no-plan-table', ['planTable', false]],
    ['--sprint-table', ['sprintTable', true]], ['--no-sprint-table', ['sprintTable', false]],
]);
function parseCampaignInvocation(argv) {
    const operation = argv[0];
    if (operation === 'list') {
        if (argv.length > 2)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
        if (argv.length === 1)
            return { operation, campaignStatus: 'active' };
        const campaignStatus = campaignStatuses.find(status => argv[1] === `--${status}`);
        if (campaignStatus === undefined)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
        return { operation, campaignStatus };
    }
    if (operation === 'activate') {
        const input = argv[1];
        if (argv.length !== 2 || input === undefined || input.startsWith('-'))
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
        return { operation, input };
    }
    if (operation === 'validate') {
        let input;
        let all = false;
        let json = false;
        for (const argument of argv.slice(1)) {
            if (argument === '--all' && !all && input === undefined)
                all = true;
            else if (argument === '--json' && !json && input === undefined)
                json = true;
            else if (argument.startsWith('-') || input !== undefined || all || json)
                (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
            else
                input = argument;
        }
        if (all)
            return { operation, selection: { mode: 'all', json } };
        if (input === undefined || json)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
        return { operation, selection: { mode: 'plan', input } };
    }
    if (operation === 'report') {
        let input;
        let json = false;
        let tableFlagSeen = false;
        let campaignReportTableOptions = {};
        for (const argument of argv.slice(1)) {
            const tableFlag = REPORT_TABLE_FLAGS.get(argument);
            if (argument === '--json')
                json = true;
            else if (tableFlag) {
                const [name, enabled] = tableFlag;
                campaignReportTableOptions = { ...campaignReportTableOptions, [name]: enabled };
                tableFlagSeen = true;
            }
            else if (argument.startsWith('-') || input !== undefined)
                (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
            else
                input = argument;
        }
        if (json && tableFlagSeen)
            (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', 'table options cannot be combined with --json');
        return { operation, input, json, campaignReportTableOptions };
    }
    (0, campaign_configuration_js_1.toolError)('CAMPAIGN_USAGE', campaignUsage());
}
function campaignUsage() {
    return 'usage: ponytail campaign validate <plan-name-or-path>\n       ponytail campaign validate --all [--json]\n       ponytail campaign report [<plan-name-or-path>] [--json] [--[no-]summary-table] [--[no-]plan-table] [--[no-]sprint-table]\n       ponytail campaign list [--active|--pending|--closed|--deferred|--rejected]\n       ponytail campaign activate <plan-name-or-path>\n       ponytail campaign status [<campaign>] [--json]\n       ponytail campaign reservation-audit [<campaign>] [--json]\n       ponytail campaign runnable-plans [<campaign>] [--json]\n       ponytail campaign tasklet-prerequisites [<campaign>] [--json]\n       ponytail campaign schedule-ready [<campaign>] [--json]\n       ponytail campaign schedule-review-ready [<campaign>] [--json]\n       ponytail campaign schedule-planning-ready [<campaign>] [--json]\n       ponytail campaign ready-actions [<campaign>] [--json]\n       ponytail campaign report-blocker <campaign> --result <json>\n       ponytail campaign observe <campaign> --snapshot <json>\n       ponytail campaign advance [<campaign>] [--json]\n       ponytail campaign reconcile <campaign> [--json]\n       ponytail campaign retry-dispatch <campaign> <original-action-id> --authorization <non-secret-reference> [--json]\n       ponytail campaign action-result <campaign> <action-id> --result <json>\n       ponytail campaign retire-worktree <campaign> <action-id> [--json]\n       ponytail campaign attach <token>\n       ponytail campaign deliver <campaign> --result <json>';
}
