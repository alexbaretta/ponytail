// Copyright (c) 2026 Alex Baretta.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-queue-cli.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSwarmQueueCli = runSwarmQueueCli;
exports.runSwarmRetirementCli = runSwarmRetirementCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const cli_help_js_1 = require("./cli-help.js");
const project_index_database_js_1 = require("./project-index-database.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const swarm_queue_js_1 = require("./swarm-queue.js");
async function runSwarmQueueCli(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write((0, cli_help_js_1.renderCliHelp)(['swarm', 'queue']) + '\n');
        return;
    }
    if (argv.length !== 3 || argv[1] !== '--request' || !argv[2]?.startsWith('@')) {
        process.stderr.write((0, cli_help_js_1.renderCliHelp)(['swarm', 'queue']) + '\n');
        process.exitCode = 2;
        return;
    }
    if (node_fs_1.default.statSync(argv[2].slice(1)).size > 8 * 1024 * 1024)
        throw new Error('swarm queue: request metadata exceeds 8 MiB; retain large evidence in artifact files');
    const swarmQueueCommandV3 = (0, swarm_queue_js_1.readSwarmQueueCommand)((0, swarm_queue_js_1.parseSwarmQueueJson)(node_fs_1.default.readFileSync(argv[2].slice(1), 'utf8')));
    if (swarmQueueCommandV3.command !== argv[0])
        throw new Error('swarm queue: request command differs from CLI command');
    await withSwarmQueueStore(async (swarmQueueStore, root) => (0, swarm_queue_js_1.createSwarmQueueResultV3)(await swarmQueueStore.execute(swarmQueueCommandV3, root)));
}
async function withSwarmQueueStore(action) {
    const root = node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(process.cwd(), ['rev-parse', '--show-toplevel']).trim());
    const journal = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'ponytail-journal.json'), 'utf8'));
    if (journal === null || typeof journal !== 'object' || !('schemaVersion' in journal) || journal.schemaVersion !== 1 || !('projectId' in journal) || typeof journal.projectId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(journal.projectId))
        throw new Error('swarm queue: invoking project requires V1 journal identity');
    const pool = new pg_1.Pool((0, project_index_database_js_1.databaseOptions)(root));
    try {
        const rows = (await pool.query(`SELECT owner_root FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2
  UNION ALL SELECT s.owner_root FROM ponytail_index.swarm_worktree_v1 s JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
  WHERE s.project_id=$1 AND w.root_path=$2`, [journal.projectId, root])).rows;
        const row = rows[0];
        if (rows.length !== 1 || row === undefined || typeof row.owner_root !== 'string')
            throw new Error('swarm queue: invoking checkout requires one recorded owner');
        const swarmQueueStore = new swarm_queue_js_1.SwarmQueueStore(pool, journal.projectId, row.owner_root);
        process.stdout.write(JSON.stringify(await action(swarmQueueStore, root)) + '\n');
    }
    finally {
        await pool.end();
    }
}
async function runSwarmRetirementCli(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write((0, cli_help_js_1.renderCliHelp)(['swarm', 'retirement-authorize']) + '\n');
        return;
    }
    if (argv.length !== 2 || argv[0] !== '--request' || !argv[1]?.startsWith('@'))
        throw new Error('swarm retirement-authorize requires --request @<request.json>');
    const file = argv[1].slice(1);
    if (node_fs_1.default.statSync(file).size > 8 * 1024 * 1024)
        throw new Error('retirement authorization metadata exceeds 8 MiB');
    const command = (0, swarm_queue_js_1.readSwarmRetirementAuthorizationCommandV1)((0, swarm_queue_js_1.parseSwarmQueueJson)(node_fs_1.default.readFileSync(file, 'utf8')));
    await withSwarmQueueStore((swarmQueueStore, root) => swarmQueueStore.authorizeRetirement(command, root));
}
