// Copyright (c) 2026 Alex Baretta.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-queue-cli.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSwarmQueueCli = runSwarmQueueCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const cli_help_js_1 = require("./cli-help.js");
const project_index_database_js_1 = require("./project-index-database.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const swarm_queue_js_1 = require("./swarm-queue.js");
const swarm_info_js_1 = require("./swarm-info.js");
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
    const swarmQueueCommandV1 = (0, swarm_queue_js_1.readSwarmQueueCommandV1)((0, swarm_queue_js_1.parseSwarmQueueJson)(node_fs_1.default.readFileSync(argv[2].slice(1), 'utf8')));
    if (swarmQueueCommandV1.command !== argv[0])
        throw new Error('swarm queue: request command differs from CLI command');
    const root = node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(process.cwd(), ['rev-parse', '--show-toplevel']).trim());
    const journal = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'ponytail-journal.json'), 'utf8'));
    if (journal === null || typeof journal !== 'object' || !('schemaVersion' in journal) || journal.schemaVersion !== 1 || !('projectId' in journal) || typeof journal.projectId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(journal.projectId))
        throw new Error('swarm queue: invoking project requires V1 journal identity');
    const pool = new pg_1.Pool((0, project_index_database_js_1.databaseOptions)(root));
    try {
        const inventorySwarmInfoV5 = await (0, swarm_info_js_1.inspectSwarmInfo)(root, pool, journal.projectId);
        const swarmQueueStore = new swarm_queue_js_1.SwarmQueueStore(pool, journal.projectId, inventorySwarmInfoV5.ownerRoot);
        const resultSwarmQueueResultV1 = await swarmQueueStore.execute(swarmQueueCommandV1, root);
        process.stdout.write(JSON.stringify(resultSwarmQueueResultV1) + '\n');
    }
    finally {
        await pool.end();
    }
}
