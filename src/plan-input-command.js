// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/plan-input-command.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRollingCampaignCommand = isRollingCampaignCommand;
exports.parseCli = parseCli;
const plan_input_queue_js_1 = require("./plan-input-queue.js");
const rolling_cli_registry_js_1 = require("./rolling-cli-registry.js");
function isRollingCampaignCommand(operation, argument) {
    return (0, rolling_cli_registry_js_1.isRollingCommandName)(operation) && (argument === null
        || argument !== '--json' && argument.startsWith('-'));
}
function parseCli(argv) {
    const command = argv[0];
    if (command === undefined)
        (0, plan_input_queue_js_1.fail)('usage: ponytail plan-input <plan> -- <instruction> | coordinate <plan> | release <plan> | list <plan> [--json] | claim <plan> [--json] | complete <plan> <id> --record <pm-path>...');
    const plan = argv[1];
    if (command === 'coordinate' || command === 'release') {
        if (argv.length !== 2 || plan === undefined)
            (0, plan_input_queue_js_1.fail)(`usage: ponytail plan-input ${command} <plan>`);
        return { command, plan };
    }
    if (command === 'list' || command === 'claim') {
        if (argv.length < 2 || argv.length > 3 || plan === undefined || (argv[2] && argv[2] !== '--json'))
            (0, plan_input_queue_js_1.fail)(`usage: ponytail plan-input ${command} <plan> [--json]`);
        return { command, plan, json: argv[2] === '--json' };
    }
    if (command === 'complete') {
        const id = argv[2];
        const records = [];
        for (let index = 3; index < argv.length; index += 2) {
            const record = argv[index + 1];
            if (argv[index] !== '--record' || !record)
                (0, plan_input_queue_js_1.fail)('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
            records.push(record);
        }
        if (!plan || !id || records.length === 0)
            (0, plan_input_queue_js_1.fail)('usage: ponytail plan-input complete <plan> <id> --record <pm-path>...');
        return { command, plan, id, records };
    }
    const separator = argv.indexOf('--');
    if (separator !== 1 || argv.length < 3)
        (0, plan_input_queue_js_1.fail)('usage: ponytail plan-input <plan> -- <instruction>');
    return { command: 'enqueue', plan: command, prompt: argv.slice(2).join(' ') };
}
