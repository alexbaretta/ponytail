// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-info.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmInfoReaders = void 0;
exports.readSwarmInfoV1 = readSwarmInfoV1;
exports.inspectSwarmInfo = inspectSwarmInfo;
exports.renderSwarmInfo = renderSwarmInfo;
exports.runSwarmInfoCli = runSwarmInfoCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const project_index_database_js_1 = require("./project-index-database.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const swarm_owner_js_1 = require("./swarm-owner.js");
const cli_help_js_1 = require("./cli-help.js");
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function record(value) {
    if (!isRecord(value))
        throw new Error('swarm: expected a record');
    return value;
}
function text(value) {
    if (typeof value !== 'string' || value.length === 0)
        throw new Error('swarm: expected a nonempty string');
    return value;
}
function nullableText(value) { return value === null ? null : text(value); }
function absoluteRoot(value) {
    const rootPath = text(value);
    if (!node_path_1.default.isAbsolute(rootPath) || node_path_1.default.normalize(rootPath) !== rootPath)
        throw new Error('swarm: expected a canonical absolute root');
    return rootPath;
}
function worktreeState(value) {
    switch (value) {
        case 'AVAILABLE':
        case 'PROVISIONING':
        case 'RESERVED':
        case 'ACTIVE':
        case 'QUARANTINED': return value;
        default: throw new Error('swarm: invalid managed checkout state');
    }
}
function integer(value) {
    const number = typeof value === 'string' && /^[1-9][0-9]*$/u.test(value) ? Number(value) : value;
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 101)
        throw new Error('swarm: invalid managed worktree number');
    return number;
}
function keys(value, expected) {
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort()))
        throw new Error('swarm: unexpected record fields');
}
function readSwarmInfoV1(value) {
    const input = record(value);
    keys(input, ['schemaVersion', 'ownerRoot', 'ownershipSource', 'coordinator', 'nativeActivity', 'worktrees']);
    if (input.schemaVersion !== 1 || input.ownershipSource !== 'campaign-leases' || input.nativeActivity !== 'unobserved')
        throw new Error('swarm: unsupported inventory version/source');
    const coordinator = record(input.coordinator);
    keys(coordinator, ['kind']);
    if (coordinator.kind !== 'unrecorded' || !Array.isArray(input.worktrees))
        throw new Error('swarm: invalid coordinator or worktree inventory');
    return { schemaVersion: 1, ownerRoot: absoluteRoot(input.ownerRoot), ownershipSource: 'campaign-leases', coordinator: { kind: 'unrecorded' }, nativeActivity: 'unobserved',
        worktrees: input.worktrees.map((value) => {
            const input = record(value);
            keys(input, ['number', 'rootPath', 'present', 'state', 'assignmentId', 'campaignId', 'obligationId', 'sessionId']);
            if (typeof input.present !== 'boolean')
                throw new Error('swarm: invalid physical-presence observation');
            return { number: integer(input.number), rootPath: absoluteRoot(input.rootPath), present: input.present, state: worktreeState(input.state),
                assignmentId: text(input.assignmentId), campaignId: text(input.campaignId), obligationId: text(input.obligationId), sessionId: nullableText(input.sessionId) };
        }) };
}
exports.SwarmInfoReaders = { V1: readSwarmInfoV1 };
async function inspectSwarmInfo(invokingPath, pool, projectId) {
    const invokingRoot = node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(invokingPath, ['rev-parse', '--show-toplevel']).trim());
    const gitCommonDirectory = node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(invokingRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim());
    const physicalRoots = (0, rolling_integration_js_1.git)(invokingRoot, ['worktree', 'list', '--porcelain', '-z']).split('\0')
        .filter(field => field.startsWith('worktree ')).map(field => field.slice(9));
    const mainRoot = physicalRoots[0];
    if (mainRoot === undefined)
        throw new Error('swarm: repository has no main checkout');
    const poolClient = await pool.connect();
    try {
        await poolClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const users = (await poolClient.query('SELECT DISTINCT coordinator_root FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 ORDER BY coordinator_root', [projectId])).rows;
        const managed = (await poolClient.query(`SELECT w.number,w.root_path,w.state,a.assignment_id,a.campaign_id,a.obligation_id,a.session_id,c.coordinator_root
   FROM ponytail_index.rolling_worktree_v1 w
   LEFT JOIN ponytail_index.rolling_assignment_v1 a ON a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED'
   LEFT JOIN ponytail_index.rolling_campaign_v1 c ON c.project_id=a.project_id AND c.campaign_id=a.campaign_id
   WHERE w.project_id=$1 ORDER BY w.number`, [projectId])).rows;
        const userRoots = [...new Set([mainRoot, ...users.map(row => text(row.coordinator_root))])].filter(root => physicalRoots.includes(root));
        const swarmOwnershipInventory = { userWorktrees: userRoots.map(rootPath => ({ rootPath, gitCommonDirectory })),
            managedWorktrees: managed.filter(row => physicalRoots.includes(text(row.root_path))).map(row => ({ rootPath: text(row.root_path), ownerRoot: nullableText(row.coordinator_root), gitCommonDirectory })) };
        const swarmUserWorktree = (0, swarm_owner_js_1.resolveSwarmOwner)(invokingRoot, swarmOwnershipInventory);
        const worktrees = managed.filter(row => row.coordinator_root === swarmUserWorktree.rootPath).map(row => {
            const rootPath = text(row.root_path);
            if (node_fs_1.default.existsSync(rootPath) && node_fs_1.default.realpathSync(rootPath) !== rootPath)
                throw new Error('swarm: registered managed checkout is not a canonical physical path');
            if (node_fs_1.default.existsSync(rootPath) && node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== gitCommonDirectory)
                throw new Error('swarm: owned managed checkout belongs to another repository');
            return { number: integer(row.number), rootPath, present: node_fs_1.default.existsSync(rootPath), state: worktreeState(row.state),
                assignmentId: text(row.assignment_id), campaignId: text(row.campaign_id), obligationId: text(row.obligation_id), sessionId: nullableText(row.session_id) };
        });
        await poolClient.query('COMMIT');
        return { schemaVersion: 1, ownerRoot: swarmUserWorktree.rootPath, ownershipSource: 'campaign-leases', coordinator: { kind: 'unrecorded' }, nativeActivity: 'unobserved', worktrees };
    }
    catch (cause) {
        await poolClient.query('ROLLBACK');
        throw cause;
    }
    finally {
        poolClient.release();
    }
}
function renderSwarmInfo(swarmInfoV1) {
    return `Swarm owner: ${swarmInfoV1.ownerRoot}\nOwnership source: campaign leases\nCoordinator session: not recorded\nNative activity: not observed\n\nManaged worktrees (${swarmInfoV1.worktrees.length}):\n`
        + swarmInfoV1.worktrees.map(worktree => `  ${worktree.number} ${worktree.state}${worktree.present ? '' : ' (missing)'} ${worktree.rootPath}\n    session: ${worktree.sessionId ?? '(not attached)'} | assignment: ${worktree.assignmentId} | obligation: ${worktree.obligationId} | campaign: ${worktree.campaignId}\n`).join('');
}
async function runSwarmInfoCli(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write((0, cli_help_js_1.renderCliHelp)(['swarm', ...argv]) + '\n');
        return;
    }
    if (argv[0] !== 'info' || argv.length > 2 || argv.length === 2 && argv[1] !== '--json') {
        process.stderr.write((0, cli_help_js_1.renderCliHelp)(['swarm', argv[0] ?? '']) + '\n');
        process.exitCode = 2;
        return;
    }
    const root = node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(process.cwd(), ['rev-parse', '--show-toplevel']).trim());
    const journal = record(JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'ponytail-journal.json'), 'utf8')));
    if (journal.schemaVersion !== 1)
        throw new Error('swarm: invoking project requires a V1 journal');
    const projectId = text(journal.projectId);
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(projectId))
        throw new Error('swarm: invalid invoking project identity');
    const pool = new pg_1.Pool((0, project_index_database_js_1.databaseOptions)(root));
    try {
        const swarmInfoV1 = await inspectSwarmInfo(root, pool, projectId);
        process.stdout.write(argv[1] === '--json' ? JSON.stringify(swarmInfoV1) + '\n' : renderSwarmInfo(swarmInfoV1));
    }
    finally {
        await pool.end();
    }
}
if (require.main === module)
    runSwarmInfoCli(process.argv.slice(2)).catch((cause) => {
        process.stderr.write((cause instanceof Error ? cause.message : String(cause)) + '\n');
        process.exitCode = 1;
    });
