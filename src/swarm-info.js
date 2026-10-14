// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-info.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmInfoReaders = exports.SwarmWorktreeDeletionReportReaders = void 0;
exports.readSwarmWorktreeDeletionReportV1 = readSwarmWorktreeDeletionReportV1;
exports.readSwarmInfoV1 = readSwarmInfoV1;
exports.readSwarmInfoV2 = readSwarmInfoV2;
exports.readSwarmInfoV3 = readSwarmInfoV3;
exports.readSwarmInfo = readSwarmInfo;
exports.bindSwarmCoordinator = bindSwarmCoordinator;
exports.inspectSwarmInfo = inspectSwarmInfo;
exports.renderSwarmInfo = renderSwarmInfo;
exports.runSwarmCli = runSwarmCli;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_1 = require("pg");
const project_index_database_js_1 = require("./project-index-database.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const swarm_owner_js_1 = require("./swarm-owner.js");
const cli_help_js_1 = require("./cli-help.js");
const swarm_store_js_1 = require("./swarm-store.js");
const rolling_codex_js_1 = require("./rolling-codex.js");
function readSwarmWorktreeDeletionReportV1(value) {
    const input = record(value);
    keys(input, ['schemaVersion', 'ownerRoot', 'results']);
    if (input.schemaVersion !== 1 || !Array.isArray(input.results))
        throw new Error('swarm: unsupported deletion report');
    return { schemaVersion: 1, ownerRoot: absoluteRoot(input.ownerRoot), results: input.results.map((value) => {
            const input = record(value);
            const number = integer(input.number), rootPath = absoluteRoot(input.rootPath);
            switch (input.outcome) {
                case 'deleted':
                    keys(input, ['number', 'rootPath', 'outcome']);
                    return { number, rootPath, outcome: 'deleted' };
                case 'retained':
                case 'protected':
                    keys(input, ['number', 'rootPath', 'outcome', 'reason']);
                    return { number, rootPath, outcome: input.outcome, reason: text(input.reason) };
                default: throw new Error('swarm: unsupported deletion outcome');
            }
        }) };
}
exports.SwarmWorktreeDeletionReportReaders = { V1: readSwarmWorktreeDeletionReportV1 };
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
function readSwarmInfoV2(value) {
    const input = record(value);
    keys(input, ['schemaVersion', 'ownerRoot', 'ownershipSource', 'coordinator', 'nativeActivity', 'worktrees']);
    if (input.schemaVersion !== 2 || (input.ownershipSource !== 'campaign-leases' && input.ownershipSource !== 'swarm-owners-and-campaign-leases'))
        throw new Error('swarm: unsupported inventory version/source');
    const coordinator = record(input.coordinator);
    let swarmCoordinator;
    switch (coordinator.kind) {
        case 'unrecorded':
        case 'unbound':
            keys(coordinator, ['kind']);
            swarmCoordinator = { kind: coordinator.kind };
            break;
        case 'bound':
            keys(coordinator, ['kind', 'sessionId', 'threadId']);
            swarmCoordinator = { kind: 'bound', sessionId: text(coordinator.sessionId), threadId: nullableText(coordinator.threadId) };
            break;
        default: throw new Error('swarm: unsupported coordinator binding');
    }
    const swarmInfoV1 = readSwarmInfoV1({ ...input, schemaVersion: 1, ownershipSource: 'campaign-leases', coordinator: { kind: 'unrecorded' } });
    return { ...swarmInfoV1, schemaVersion: 2, ownershipSource: input.ownershipSource, coordinator: swarmCoordinator };
}
function normalizeSwarmInfoV2(swarmInfoV2) {
    return { ...swarmInfoV2, schemaVersion: 3, worktrees: swarmInfoV2.worktrees.map(worktree => ({ number: worktree.number, rootPath: worktree.rootPath,
            present: worktree.present, state: worktree.state, membership: { kind: 'campaign-lease' }, assignment: { assignmentId: worktree.assignmentId,
                campaignId: worktree.campaignId, obligationId: worktree.obligationId, sessionId: worktree.sessionId } })) };
}
function readSwarmInfoV3(value) {
    const input = record(value);
    keys(input, ['schemaVersion', 'ownerRoot', 'ownershipSource', 'coordinator', 'nativeActivity', 'worktrees']);
    if (input.schemaVersion !== 3 || !Array.isArray(input.worktrees))
        throw new Error('swarm: unsupported inventory version');
    const swarmInfoV2 = readSwarmInfoV2({ ...input, schemaVersion: 2, worktrees: [] });
    return { ...swarmInfoV2, schemaVersion: 3, worktrees: input.worktrees.map((value) => {
            const input = record(value);
            keys(input, ['number', 'rootPath', 'present', 'state', 'membership', 'assignment']);
            if (typeof input.present !== 'boolean')
                throw new Error('swarm: invalid physical-presence observation');
            const membership = record(input.membership);
            let swarmWorktreeMembership;
            switch (membership.kind) {
                case 'campaign-lease':
                    keys(membership, ['kind']);
                    swarmWorktreeMembership = { kind: 'campaign-lease' };
                    break;
                case 'swarm':
                    keys(membership, ['kind', 'generation']);
                    swarmWorktreeMembership = { kind: 'swarm', generation: text(membership.generation) };
                    break;
                default: throw new Error('swarm: invalid worktree membership');
            }
            let assignment = null;
            if (input.assignment !== null) {
                const value = record(input.assignment);
                keys(value, ['assignmentId', 'campaignId', 'obligationId', 'sessionId']);
                assignment = { assignmentId: text(value.assignmentId), campaignId: text(value.campaignId), obligationId: text(value.obligationId), sessionId: nullableText(value.sessionId) };
            }
            if (swarmWorktreeMembership.kind === 'campaign-lease' && assignment === null)
                throw new Error('swarm: campaign membership requires an assignment');
            return { number: integer(input.number), rootPath: absoluteRoot(input.rootPath), present: input.present, state: worktreeState(input.state), membership: swarmWorktreeMembership, assignment };
        }) };
}
exports.SwarmInfoReaders = { V1: readSwarmInfoV1, V2: readSwarmInfoV2, V3: readSwarmInfoV3 };
function readSwarmInfo(value) {
    const input = record(value);
    switch (input.schemaVersion) {
        case 1: return normalizeSwarmInfoV2({ ...readSwarmInfoV1(input), schemaVersion: 2 });
        case 2: return normalizeSwarmInfoV2(readSwarmInfoV2(input));
        case 3: return readSwarmInfoV3(input);
        default: throw new Error('swarm: unsupported inventory version');
    }
}
async function bindSwarmCoordinator(swarmStore, swarmUserWorktree, threadId, sessionId, rollingCodex) {
    const rollingNativeThreadIdentity = await rollingCodex.readThreadIdentity(threadId, swarmUserWorktree.rootPath);
    if (rollingNativeThreadIdentity.sessionId !== sessionId || rollingNativeThreadIdentity.threadId !== threadId || rollingNativeThreadIdentity.rootPath !== swarmUserWorktree.rootPath)
        throw new Error('swarm: observed native session identity differs from requested coordinator');
    await swarmStore.enrollOwner(swarmUserWorktree);
    await swarmStore.bindCoordinator(swarmUserWorktree.rootPath, rollingNativeThreadIdentity);
}
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
        const owners = (await poolClient.query(`SELECT o.owner_root,o.git_common_directory,o.coordinator_session_id,n.thread_id
   FROM ponytail_index.swarm_owner_v1 o LEFT JOIN ponytail_index.swarm_native_session_v1 n ON n.session_id=o.coordinator_session_id AND n.project_id=o.project_id AND n.root_path=o.owner_root
   WHERE o.project_id=$1`, [projectId])).rows;
        const managed = (await poolClient.query(`SELECT w.number,w.root_path,w.state,a.assignment_id,a.campaign_id,a.obligation_id,a.session_id,c.coordinator_root,s.owner_root,s.generation
   FROM ponytail_index.rolling_worktree_v1 w
   LEFT JOIN ponytail_index.rolling_assignment_v1 a ON a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED'
   LEFT JOIN ponytail_index.rolling_campaign_v1 c ON c.project_id=a.project_id AND c.campaign_id=a.campaign_id
   LEFT JOIN ponytail_index.swarm_worktree_v1 s ON s.project_id=w.project_id AND s.number=w.number
   WHERE w.project_id=$1 ORDER BY w.number`, [projectId])).rows;
        for (const row of managed)
            if (row.owner_root !== null && row.coordinator_root !== null && row.owner_root !== row.coordinator_root)
                throw new Error('swarm: checkout has conflicting swarm and campaign owners');
        const userRoots = [...new Set([mainRoot, ...users.map(row => text(row.coordinator_root)), ...owners.map(row => text(row.owner_root))])].filter(root => physicalRoots.includes(root));
        const swarmOwnershipInventory = { userWorktrees: userRoots.map(rootPath => ({ rootPath, gitCommonDirectory })),
            managedWorktrees: managed.filter(row => physicalRoots.includes(text(row.root_path))).map(row => ({ rootPath: text(row.root_path), ownerRoot: nullableText(row.owner_root ?? row.coordinator_root), gitCommonDirectory })) };
        const swarmUserWorktree = (0, swarm_owner_js_1.resolveSwarmOwner)(invokingRoot, swarmOwnershipInventory);
        const owner = owners.find(row => row.owner_root === swarmUserWorktree.rootPath);
        if (owner !== undefined && owner.git_common_directory !== gitCommonDirectory)
            throw new Error('swarm: enrolled owner repository identity changed');
        const swarmCoordinator = owner === undefined ? { kind: 'unrecorded' } : owner.coordinator_session_id === null ? { kind: 'unbound' } : { kind: 'bound', sessionId: text(owner.coordinator_session_id), threadId: nullableText(owner.thread_id) };
        const worktrees = managed.filter(row => (row.owner_root ?? row.coordinator_root) === swarmUserWorktree.rootPath).map(row => {
            const rootPath = text(row.root_path);
            if (node_fs_1.default.existsSync(rootPath) && node_fs_1.default.realpathSync(rootPath) !== rootPath)
                throw new Error('swarm: registered managed checkout is not a canonical physical path');
            if (node_fs_1.default.existsSync(rootPath) && node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) !== gitCommonDirectory)
                throw new Error('swarm: owned managed checkout belongs to another repository');
            return { number: integer(row.number), rootPath, present: node_fs_1.default.existsSync(rootPath), state: worktreeState(row.state),
                membership: row.owner_root === null ? { kind: 'campaign-lease' } : { kind: 'swarm', generation: text(row.generation) },
                assignment: row.assignment_id === null ? null : { assignmentId: text(row.assignment_id), campaignId: text(row.campaign_id), obligationId: text(row.obligation_id), sessionId: nullableText(row.session_id) } };
        });
        await poolClient.query('COMMIT');
        return { schemaVersion: 3, ownerRoot: swarmUserWorktree.rootPath, ownershipSource: owner === undefined ? 'campaign-leases' : 'swarm-owners-and-campaign-leases', coordinator: swarmCoordinator, nativeActivity: 'unobserved', worktrees };
    }
    catch (cause) {
        await poolClient.query('ROLLBACK');
        throw cause;
    }
    finally {
        poolClient.release();
    }
}
function renderSwarmInfo(swarmInfoV3) {
    const coordinator = swarmInfoV3.coordinator.kind === 'bound' ? `${swarmInfoV3.coordinator.sessionId} | thread: ${swarmInfoV3.coordinator.threadId ?? '(not recorded)'}` : swarmInfoV3.coordinator.kind === 'unbound' ? 'not bound' : 'not recorded';
    return `Swarm owner: ${swarmInfoV3.ownerRoot}\nOwnership source: ${swarmInfoV3.ownershipSource}\nCoordinator session: ${coordinator}\nNative activity: not observed\n\nManaged worktrees (${swarmInfoV3.worktrees.length}):\n`
        + swarmInfoV3.worktrees.map(worktree => `  ${worktree.number} ${worktree.state}${worktree.present ? '' : ' (missing)'} ${worktree.rootPath}\n    session: ${worktree.assignment?.sessionId ?? '(not attached)'} | assignment: ${worktree.assignment?.assignmentId ?? '(none)'} | obligation: ${worktree.assignment?.obligationId ?? '(none)'} | campaign: ${worktree.assignment?.campaignId ?? '(none)'}\n    membership: ${worktree.membership.kind}${worktree.membership.kind === 'swarm' ? ` | generation: ${worktree.membership.generation}` : ''}\n`).join('');
}
async function runSwarmCli(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write((0, cli_help_js_1.renderCliHelp)(['swarm', ...argv]) + '\n');
        return;
    }
    const fields = new Map();
    let json = false, valid = true;
    for (let i = 1; i < argv.length; i++) {
        const flag = argv[i];
        if (flag === '--json' && !json) {
            json = true;
            continue;
        }
        if (flag === '--all' && !fields.has(flag)) {
            fields.set(flag, 'true');
            continue;
        }
        const value = argv[i + 1];
        if ((flag === '--session' || flag === '--thread' || flag === '--base' || flag === '--number' || flag === '--generation') && !fields.has(flag) && typeof value === 'string' && value.length > 0 && !value.startsWith('--')) {
            fields.set(flag, value);
            i++;
            continue;
        }
        valid = false;
        break;
    }
    const info = argv[0] === 'info' && fields.size === 0;
    const enrollment = argv[0] === 'owner-enroll' && fields.size === 0;
    const bind = argv[0] === 'coordinator-bind' && fields.size === 2 && fields.has('--session') && fields.has('--thread');
    const unbind = argv[0] === 'coordinator-unbind' && fields.size === 1 && fields.has('--session');
    const assign = argv[0] === 'worktree-assign' && fields.size === 1 && fields.has('--base');
    const setup = argv[0] === 'worktree-setup' && fields.size === 2 && fields.has('--number') && fields.has('--generation');
    const release = argv[0] === 'worktree-release' && fields.size === 2 && fields.has('--number') && fields.has('--generation');
    const deletion = argv[0] === 'worktree-delete' && fields.size === 1 && (fields.has('--number') || fields.has('--all'));
    if (!valid || !info && !enrollment && !bind && !unbind && !assign && !setup && !release && !deletion) {
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
    let outputRoot = root;
    try {
        if (enrollment || bind || unbind || assign || setup || release || deletion) {
            const swarmStore = new swarm_store_js_1.SwarmStore(pool, projectId);
            const ownerRoot = enrollment ? root : (await inspectSwarmInfo(root, pool, projectId)).ownerRoot;
            const swarmUserWorktree = { rootPath: ownerRoot, gitCommonDirectory: node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(ownerRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) };
            outputRoot = ownerRoot;
            if (deletion) {
                await swarmStore.enrollOwner(swarmUserWorktree);
                const results = await swarmStore.deleteWorktrees(ownerRoot, fields.has('--all') ? null : integer(fields.get('--number')));
                const swarmWorktreeDeletionReportV1 = { schemaVersion: 1, ownerRoot, results };
                process.stdout.write(json ? JSON.stringify(swarmWorktreeDeletionReportV1) + '\n' : `Swarm owner: ${ownerRoot}\n` + results.map(result => `  ${result.number} ${result.outcome} ${result.rootPath}${result.outcome === 'deleted' ? '' : ` | ${result.reason}`}\n`).join(''));
                if (results.some(result => result.outcome === 'retained' || result.outcome === 'protected' && !fields.has('--all')))
                    process.exitCode = 1;
                return;
            }
            else if (assign) {
                await swarmStore.enrollOwner(swarmUserWorktree);
                const baseCommit = (0, rolling_integration_js_1.git)(ownerRoot, ['rev-parse', '--verify', '--end-of-options', `${text(fields.get('--base'))}^{commit}`]).trim();
                const swarmWorktreeMembership = await swarmStore.reserveWorktree(ownerRoot, { kind: 'provision', baseCommit });
                if (swarmWorktreeMembership === null)
                    throw new Error('swarm: allocation did not reserve a checkout');
                try {
                    await swarmStore.provisionWorktree(swarmWorktreeMembership);
                }
                catch (cause) {
                    throw new Error(`swarm: setup failed for worktree ${swarmWorktreeMembership.number}, generation ${swarmWorktreeMembership.generation}; use worktree-setup to retry: ${cause instanceof Error ? cause.message : String(cause)}`);
                }
            }
            else if (setup || release) {
                const number = integer(fields.get('--number'));
                const worktree = (await inspectSwarmInfo(ownerRoot, pool, projectId)).worktrees.find(worktree => worktree.number === number);
                if (worktree === undefined || worktree.membership.kind !== 'swarm' || worktree.membership.generation !== fields.get('--generation'))
                    throw new Error('swarm: checkout membership changed or is absent');
                const swarmWorktreeMembership = { number, rootPath: worktree.rootPath, ownerRoot, generation: worktree.membership.generation };
                if (setup)
                    await swarmStore.provisionWorktree(swarmWorktreeMembership);
                else
                    await swarmStore.releaseWorktree(swarmWorktreeMembership);
            }
            else if (enrollment)
                await swarmStore.enrollOwner(swarmUserWorktree);
            else if (bind) {
                const rollingCodex = await rolling_codex_js_1.RollingCodex.connect({ cwd: ownerRoot });
                try {
                    await bindSwarmCoordinator(swarmStore, swarmUserWorktree, text(fields.get('--thread')), text(fields.get('--session')), rollingCodex);
                }
                finally {
                    await rollingCodex.close();
                }
            }
            else
                await swarmStore.unbindCoordinator(ownerRoot, text(fields.get('--session')));
        }
        const swarmInfoV3 = await inspectSwarmInfo(outputRoot, pool, projectId);
        process.stdout.write(json ? JSON.stringify(swarmInfoV3) + '\n' : renderSwarmInfo(swarmInfoV3));
    }
    finally {
        await pool.end();
    }
}
if (require.main === module)
    runSwarmCli(process.argv.slice(2)).catch((cause) => {
        process.stderr.write((cause instanceof Error ? cause.message : String(cause)) + '\n');
        process.exitCode = 1;
    });
