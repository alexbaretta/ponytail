// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/tasklet-statuses.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTaskletStatuses = parseTaskletStatuses;
const node_fs_1 = __importDefault(require("node:fs"));
function parseTaskletStatuses(sprintFile, text = node_fs_1.default.readFileSync(sprintFile, 'utf8'), allowEmpty = false) {
    const statuses = new Map();
    const heading = /^### \[( |DONE|ERROR)\] Tasklet (S\d+-F\d+-T\d+): .+$/;
    for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith('###') || !line.includes('Tasklet'))
            continue;
        const match = line.match(heading);
        if (!match)
            throw new Error(`${sprintFile} contains a malformed tasklet heading: ${line}`);
        const id = match[2];
        if (id === undefined)
            throw new Error('tasklet matcher lacks its required ID capture');
        if (statuses.has(id))
            throw new Error(`duplicate tasklet heading: ${id}`);
        const status = match[1];
        if (status !== ' ' && status !== 'DONE' && status !== 'ERROR')
            throw new Error(`invalid tasklet status: ${id}`);
        statuses.set(id, status === ' ' ? 'PENDING' : status);
    }
    if (statuses.size === 0 && !allowEmpty)
        throw new Error(`${sprintFile} contains no tasklet headings`);
    return statuses;
}
