#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/plan-input.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readV2 = exports.readV1 = exports.queueRoot = exports.entries = exports.enqueue = exports.complete = exports.claim = exports.PlanInputReaders = exports.parseCli = void 0;
exports.main = main;
const campaign_scope_js_1 = require("./campaign-scope.js");
const plan_input_command_js_1 = require("./plan-input-command.js");
var plan_input_command_js_2 = require("./plan-input-command.js");
Object.defineProperty(exports, "parseCli", { enumerable: true, get: function () { return plan_input_command_js_2.parseCli; } });
const plan_input_queue_js_1 = require("./plan-input-queue.js");
var plan_input_queue_js_2 = require("./plan-input-queue.js");
Object.defineProperty(exports, "PlanInputReaders", { enumerable: true, get: function () { return plan_input_queue_js_2.PlanInputReaders; } });
Object.defineProperty(exports, "claim", { enumerable: true, get: function () { return plan_input_queue_js_2.claim; } });
Object.defineProperty(exports, "complete", { enumerable: true, get: function () { return plan_input_queue_js_2.complete; } });
Object.defineProperty(exports, "enqueue", { enumerable: true, get: function () { return plan_input_queue_js_2.enqueue; } });
Object.defineProperty(exports, "entries", { enumerable: true, get: function () { return plan_input_queue_js_2.entries; } });
Object.defineProperty(exports, "queueRoot", { enumerable: true, get: function () { return plan_input_queue_js_2.queueRoot; } });
Object.defineProperty(exports, "readV1", { enumerable: true, get: function () { return plan_input_queue_js_2.readV1; } });
Object.defineProperty(exports, "readV2", { enumerable: true, get: function () { return plan_input_queue_js_2.readV2; } });
function main(argv = process.argv.slice(2), repositoryRoot = process.cwd()) {
    const planInputCommand = (0, plan_input_command_js_1.parseCli)(argv);
    const campaignRoot = (0, campaign_scope_js_1.resolveCampaignRoot)(repositoryRoot, planInputCommand.plan);
    const { campaignId, submittedPlanId } = campaignRoot;
    switch (planInputCommand.command) {
        case 'enqueue': {
            const planInputV2 = (0, plan_input_queue_js_1.enqueue)(repositoryRoot, campaignId, submittedPlanId, planInputCommand.prompt, 'cli');
            console.log(`Recorded as plan input ${planInputV2.id} for campaign ${campaignId}`);
            return 0;
        }
        case 'list': {
            const result = (0, plan_input_queue_js_1.entries)(repositoryRoot, campaignId).filter((entry) => entry.status !== 'closed');
            console.log(planInputCommand.json ? JSON.stringify(result) : result.map((entry) => `${entry.status}\t${entry.id}\t${entry.prompt}`).join('\n'));
            return 0;
        }
        case 'claim': {
            const planInputV2 = (0, plan_input_queue_js_1.claim)(repositoryRoot, campaignId);
            console.log(planInputCommand.json ? JSON.stringify(planInputV2) : planInputV2 ? `${planInputV2.id}\t${planInputV2.prompt}` : 'No pending plan input');
            return 0;
        }
        case 'coordinate': {
            console.log(`Validated coordinator campaign ${campaignId}`);
            return 0;
        }
        case 'release': {
            console.log(`Validated release for campaign ${campaignId}`);
            return 0;
        }
        case 'complete': {
            const planInputV2 = (0, plan_input_queue_js_1.complete)(repositoryRoot, campaignId, planInputCommand.id, planInputCommand.records);
            console.log(`Completed plan input ${planInputV2.id}`);
            return 0;
        }
    }
}
if (require.main === module) {
    try {
        process.exitCode = main();
    }
    catch (error) {
        console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
