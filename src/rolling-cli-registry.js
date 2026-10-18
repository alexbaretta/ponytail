// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-cli-registry.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollingCommandDefinitions = void 0;
exports.isRollingCommandName = isRollingCommandName;
exports.rollingCampaignHelp = rollingCampaignHelp;
exports.rollingCommandDefinitions = [
    { cli: true, name: 'legacy', description: 'Explicitly inspect historical campaign records.', preconditions: 'Read-only legacy command: validate, report, list, status or reservation-audit.', mutations: 'None.', result: 'Historical inspection from the existing reader.', fields: [{ name: 'command', kind: 'string', required: true, description: 'Legacy inspection command; trailing arguments belong to that reader.' }, { name: 'arguments', kind: 'json', required: false, description: 'Array of literal historical-reader arguments.' }] }
];
function isRollingCommandName(value) { return value === 'legacy'; }
function rollingCampaignHelp(commandName) {
    if (commandName === undefined)
        return 'Usage: ponytail campaign <command> [arguments]\n\n' + exports.rollingCommandDefinitions.filter(command => command.cli).map(command => `  ${command.name.padEnd(28)} ${command.description}`).join('\n') + '\n\nUse ponytail campaign <command> --help for arguments and behavior.\n';
    const command = exports.rollingCommandDefinitions.find(item => item.cli && item.name === commandName);
    if (!command)
        throw new Error(`rolling campaign: unknown command ${commandName}`);
    return `Usage: ponytail campaign ${command.name} ` + command.fields.map(field => `${field.required ? '' : '['}--${field.name} <${field.kind === 'json' ? 'JSON|@file' : 'value'}>${field.required ? '' : ']'}`).join(' ')
        + `\n\n${command.description}\nPreconditions: ${command.preconditions}\nMutations: ${command.mutations}\nResult: ${command.result}\n\n`
        + command.fields.map(field => `  --${field.name}: ${field.description}${field.required ? ' Required.' : ' Optional.'}`).join('\n') + '\n';
}
