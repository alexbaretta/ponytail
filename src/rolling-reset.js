// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-reset.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingProjectResetReaders = exports.RollingResetRequestReaders = void 0;
exports.readRollingResetRequestV1 = readRollingResetRequestV1;
exports.readRollingProjectResetV1 = readRollingProjectResetV1;
exports.resetRollingProject = resetRollingProject;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const lossless_json_1 = require("lossless-json");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
const rolling_worktrees_js_1 = require("./rolling-worktrees.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
const rolling_worker_js_1 = require("./rolling-worker.js");
const rolling_review_js_1 = require("./rolling-review.js");
function requireReset(value, message) { if (!value)
    throw new Error(`rolling reset: ${message}`); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function object(value) { requireReset(isRecord(value), 'expected object'); return value; }
function keys(value, names) { requireReset((0, node_util_1.isDeepStrictEqual)(Object.keys(value).sort(), [...names].sort()), 'invalid fields'); }
function strings(value) { requireReset(Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0), 'expected nonempty strings'); return value; }
function text(value) { requireReset(typeof value === 'string' && value.length > 0 && !/[\0\r\n]/u.test(value), 'invalid string'); return value; }
function readRollingResetRequestV1(value) {
    const input = object(value);
    keys(input, ['schemaVersion', 'id', 'reason', 'authority']);
    requireReset(input.schemaVersion === 1 && typeof input.id === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u.test(input.id), 'invalid reset V1 identity');
    const authority = strings(input.authority);
    requireReset(authority.length > 0, 'explicit reset authority required');
    return { schemaVersion: 1, id: input.id, reason: text(input.reason), authority };
}
exports.RollingResetRequestReaders = { V1: readRollingResetRequestV1 };
function readRollingProjectResetV1(value) {
    const input = object(value);
    keys(input, ['schemaVersion', 'request', 'coordinatorRoot', 'mainRoot', 'managedDirectory', 'gitDirectory', 'baseCommit', 'campaignIds', 'actors', 'worktrees', 'retirementCommands', 'completedActors', 'completedWorktrees', 'state']);
    requireReset(input.schemaVersion === 1 && (input.state === 'PENDING' || input.state === 'COMPLETE'), 'invalid reset version/state');
    requireReset(Array.isArray(input.actors) && Array.isArray(input.worktrees) && Array.isArray(input.retirementCommands), 'invalid inventory');
    const actors = input.actors.map((actor) => (0, rolling_worker_js_1.parseRollingWorkerCreation)(JSON.stringify(actor)));
    const worktrees = input.worktrees.map((value) => {
        const tree = object(value);
        keys(tree, ['rootPath', 'disposition', 'sessionId', 'assignmentId', 'generation', 'resourceGeneration', 'number']);
        requireReset(tree.disposition === 'retain' || tree.disposition === 'reuse' || tree.disposition === 'remove', 'invalid disposition');
        requireReset(tree.number === null || typeof tree.number === 'number' && Number.isSafeInteger(tree.number) && tree.number >= 101, 'invalid worktree number');
        return { rootPath: text(tree.rootPath), disposition: tree.disposition, sessionId: tree.sessionId === null ? null : text(tree.sessionId), assignmentId: tree.assignmentId === null ? null : text(tree.assignmentId), generation: tree.generation === null ? null : text(tree.generation), resourceGeneration: tree.resourceGeneration === null ? null : text(tree.resourceGeneration), number: tree.number };
    });
    const retirementCommands = input.retirementCommands.map((value) => { const argv = strings(value); requireReset(argv.length > 0, 'empty cleanup command'); return argv; });
    for (const root of [input.coordinatorRoot, input.mainRoot, input.managedDirectory, input.gitDirectory, ...worktrees.map(tree => tree.rootPath)])
        requireReset(typeof root === 'string' && node_path_1.default.isAbsolute(root) && node_path_1.default.normalize(root) === root, 'inventory requires physical absolute roots');
    requireReset(typeof input.baseCommit === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(input.baseCommit), 'invalid base commit');
    const completedActors = strings(input.completedActors), completedWorktrees = strings(input.completedWorktrees);
    requireReset(completedActors.every(id => actors.some(actor => actor.threadId === id)) && completedWorktrees.every(root => worktrees.some(tree => tree.rootPath === root && tree.disposition !== 'retain')), 'progress escaped inventory');
    return { schemaVersion: 1, request: readRollingResetRequestV1(input.request), coordinatorRoot: text(input.coordinatorRoot), mainRoot: text(input.mainRoot), managedDirectory: text(input.managedDirectory), gitDirectory: text(input.gitDirectory), baseCommit: text(input.baseCommit), campaignIds: strings(input.campaignIds), actors, worktrees, retirementCommands, completedActors, completedWorktrees, state: input.state };
}
exports.RollingProjectResetReaders = { V1: readRollingProjectResetV1 };
function decodeReset(text) { return readRollingProjectResetV1((0, lossless_json_1.parse)(text, null, token => { const value = Number(token); requireReset(Number.isSafeInteger(value), 'reset numbers must be exact safe integers'); return value; })); }
function nullableText(value) { return value === null ? null : text(value); }
function inventoryRoots(root) { return (0, rolling_integration_js_1.git)(root, ['worktree', 'list', '--porcelain', '-z']).split('\0').filter(field => field.startsWith('worktree ')).map(field => field.slice(9)); }
function poolMember(root, directory) { const number = Number(node_path_1.default.basename(root)); return node_path_1.default.dirname(root) === directory && Number.isSafeInteger(number) && number >= 101 && String(number) === node_path_1.default.basename(root); }
async function inventoryReset(poolClient, projectId, root, rollingResetRequestV1, rollingCodex) {
    const coordinatorRoot = node_fs_1.default.realpathSync(root);
    requireReset((0, rolling_integration_js_1.git)(root, ['rev-parse', '--show-toplevel']).trim() === coordinatorRoot, 'invoking root must be a checkout root');
    const roots = inventoryRoots(root), mainRoot = roots[0];
    requireReset(mainRoot, 'missing main checkout');
    const configurationText = node_fs_1.default.readFileSync(node_path_1.default.join(root, '.agents/config/project/rolling-campaigns.json'), 'utf8');
    requireReset(configurationText.trim() === (0, rolling_integration_js_1.git)(root, ['show', 'HEAD:.agents/config/project/rolling-campaigns.json']).trim(), 'commit coordinator pool configuration before reset');
    const configuration = (0, rolling_campaign_js_1.parseRollingProjectConfig)(configurationText);
    requireReset(configuration.retirementCommands !== null, 'declare project retirement cleanup before reset');
    const managedDirectory = (0, rolling_worktrees_js_1.readRollingPhysicalDirectory)(node_path_1.default.resolve(mainRoot, configuration.managedWorktrees.directory));
    requireReset(managedDirectory !== mainRoot && managedDirectory !== coordinatorRoot, 'pool cannot be main/coordinator checkout');
    const campaigns = (await poolClient.query('SELECT campaign_id,coordinator_root FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 ORDER BY campaign_id', [projectId])).rows;
    const assignments = (await poolClient.query('SELECT a.*,w.root_path FROM ponytail_index.rolling_assignment_v1 a JOIN ponytail_index.rolling_worktree_v1 w USING(project_id) WHERE a.project_id=$1 AND a.worktree_number=w.number AND a.state<>\'RELEASED\' ORDER BY a.worktree_number', [projectId])).rows;
    const creations = (await poolClient.query('SELECT c.result_text FROM ponytail_index.rolling_action_v1 c JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,assignment_id) WHERE c.project_id=$1 AND c.kind=\'START_WORKER\' AND c.result_text IS NOT NULL AND a.state<>\'RELEASED\'', [projectId])).rows.map(row => (0, rolling_worker_js_1.parseRollingWorkerCreation)(text(row.result_text)));
    const unknown = (await poolClient.query('SELECT 1 FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND state=\'STARTED\' AND result_text IS NULL LIMIT 1', [projectId])).rows;
    requireReset(unknown.length === 0, 'unknown native creation must be reconciled before reset');
    const actors = [...creations];
    const reviews = (await poolClient.query('SELECT d.reviewer_thread_id,r.request_text,i.root_path FROM ponytail_index.rolling_review_dispatch_v1 d JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id) JOIN ponytail_index.rolling_worktree_v1 i ON i.project_id=a.project_id AND i.number=a.worktree_number WHERE d.project_id=$1', [projectId])).rows;
    for (const row of reviews) {
        const threadId = text(row.reviewer_thread_id);
        if (!actors.some(actor => actor.threadId === threadId))
            actors.push({ schemaVersion: 1, threadId, sessionId: (0, rolling_review_js_1.parseRollingReviewRequest)(text(row.request_text)).reviewerSessionId, rootPath: text(row.root_path) });
    }
    const worktrees = [];
    const protectedRoots = new Set([mainRoot, coordinatorRoot, ...campaigns.map(row => text(row.coordinator_root))]);
    for (const rootPath of roots) {
        requireReset(node_fs_1.default.existsSync(rootPath) && node_fs_1.default.realpathSync(rootPath) === rootPath, 'missing or redirected registered checkout; recover physical ownership first');
        const assignment = assignments.find(row => row.root_path === rootPath);
        const marker = node_path_1.default.join(rootPath, 'session_id.txt');
        const sessionId = node_fs_1.default.existsSync(marker) ? node_fs_1.default.readFileSync(marker, 'utf8').trim() : null;
        const isPool = poolMember(rootPath, managedDirectory);
        const codexOwned = rootPath.split(node_path_1.default.sep).includes('.codex') && rootPath.split(node_path_1.default.sep).includes('worktrees');
        const disposition = protectedRoots.has(rootPath) ? 'retain' : isPool ? 'reuse' : assignment || codexOwned ? 'remove' : 'retain';
        if (disposition !== 'retain') {
            if (rollingCodex !== null)
                for (const actor of await inventoryResetActors(rollingCodex, rootPath))
                    if (!actors.some(existing => existing.threadId === actor.threadId))
                        actors.push(actor);
            if (sessionId !== null) {
                (0, rolling_worktrees_js_1.validateRollingSessionMarker)(rootPath, sessionId);
                if (!actors.some(actor => actor.rootPath === rootPath && actor.sessionId === sessionId)) {
                    requireReset(rollingCodex !== null, 'marker requires native owner discovery');
                    const identity = await rollingCodex.readThreadIdentity(sessionId, rootPath);
                    requireReset(identity.sessionId === sessionId, 'marker owner differs');
                    actors.push({ schemaVersion: 1, ...identity });
                }
            }
            if (assignment)
                requireReset(sessionId === assignment.session_id || assignment.session_id === null, 'marker differs from original leased worker');
            requireReset(sessionId !== null || !codexOwned || rollingCodex !== null || actors.some(actor => actor.rootPath === rootPath), 'external Codex checkout has no verifiable actor; retain it');
        }
        const allocation = assignment ? (await poolClient.query('SELECT generation FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND kind=\'START_WORKER\'', [projectId, assignment.assignment_id])).rows[0] : undefined;
        worktrees.push({ rootPath, disposition, sessionId, assignmentId: assignment ? text(assignment.assignment_id) : null, generation: assignment ? text(assignment.generation) : null, resourceGeneration: allocation ? text(allocation.generation) : null, number: isPool ? Number(node_path_1.default.basename(rootPath)) : assignment ? Number(assignment.worktree_number) : null });
    }
    requireReset(assignments.every(row => worktrees.some(tree => tree.rootPath === row.root_path && tree.disposition !== 'retain')), 'a live lease targets a protected or missing checkout');
    return { schemaVersion: 1, request: rollingResetRequestV1, coordinatorRoot, mainRoot, managedDirectory, gitDirectory: node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()), baseCommit: (0, rolling_integration_js_1.git)(root, ['rev-parse', 'HEAD']).trim(), campaignIds: campaigns.map(row => text(row.campaign_id)), actors, worktrees, retirementCommands: configuration.retirementCommands, completedActors: [], completedWorktrees: [], state: 'PENDING' };
}
async function inventoryResetActors(rollingCodex, root) {
    const actors = [];
    let cursor = null;
    const cursors = new Set();
    for (;;) {
        const response = object(await rollingCodex.request('thread/list', { archived: false, cwd: root, cursor, limit: 100 }));
        requireReset(Array.isArray(response.data), 'invalid root actor inventory');
        for (const value of response.data) {
            const thread = object(value);
            requireReset(thread.cwd === root, 'actor inventory escaped checkout');
            const threadId = text(thread.id);
            const identity = await rollingCodex.readThreadIdentity(threadId, root);
            actors.push({ schemaVersion: 1, ...identity });
        }
        if (response.nextCursor === null)
            break;
        cursor = text(response.nextCursor);
        requireReset(!cursors.has(cursor), 'actor inventory cursor repeated');
        cursors.add(cursor);
    }
    return actors;
}
async function stopResetActor(rollingCodex, rollingWorkerCreationV1) {
    if (await rollingCodex.isThreadArchived(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath))
        return;
    const identity = await rollingCodex.readThreadIdentity(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireReset(identity.threadId === rollingWorkerCreationV1.threadId && identity.sessionId === rollingWorkerCreationV1.sessionId, 'native owner differs from inventory');
    const rollingNativeThread = await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath);
    requireReset((0, node_util_1.isDeepStrictEqual)((0, rolling_worker_js_1.identifyRollingWorkerCreation)(rollingNativeThread, rollingWorkerCreationV1.rootPath), rollingWorkerCreationV1), 'resumed actor differs');
    const activity = await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
    if (activity.status === 'active') {
        const turn = await rollingCodex.readLatestTurn(rollingWorkerCreationV1.threadId);
        requireReset(turn.status === 'inProgress', 'active actor has unknown latest turn');
        await rollingCodex.interruptTurn(rollingWorkerCreationV1.threadId, turn.id);
        await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId, turn.id);
    }
    requireReset((await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId)).status === 'idle', 'original actor is not stopped');
    await rollingCodex.archiveThread(rollingWorkerCreationV1.threadId);
    requireReset(await rollingCodex.isThreadArchived(rollingWorkerCreationV1.threadId, rollingWorkerCreationV1.rootPath), 'native archival not observed');
}
function resetCheckout(rollingProjectResetV1, rollingResetWorktree, index) {
    const root = rollingResetWorktree.rootPath;
    if (!inventoryRoots(rollingProjectResetV1.coordinatorRoot).includes(root)) {
        requireReset(rollingResetWorktree.disposition === 'remove' && !node_fs_1.default.existsSync(root), 'lost checkout ownership');
        return;
    }
    requireReset(node_fs_1.default.realpathSync(root) === root && (0, rolling_integration_js_1.git)(root, ['rev-parse', '--show-toplevel']).trim() === root, 'checkout identity changed');
    requireReset(node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) === rollingProjectResetV1.gitDirectory, 'checkout now belongs to another Git repository');
    (0, rolling_worktrees_js_1.requireRollingGitOperationAbsent)(root);
    const marker = node_path_1.default.join(root, 'session_id.txt');
    if (node_fs_1.default.existsSync(marker)) {
        requireReset(rollingResetWorktree.sessionId !== null, 'unexpected new session marker');
        (0, rolling_worktrees_js_1.validateRollingSessionMarker)(root, rollingResetWorktree.sessionId);
    }
    const env = { ...process.env, PONYTAIL_WORKTREE_ROOT: root, PONYTAIL_MAIN_WORKTREE_ROOT: rollingProjectResetV1.mainRoot,
        PONYTAIL_WORKTREE_NUMBER: rollingResetWorktree.number === null ? '' : String(rollingResetWorktree.number), PONYTAIL_SESSION_ID: rollingResetWorktree.sessionId ?? '', PONYTAIL_ASSIGNMENT_ID: rollingResetWorktree.assignmentId ?? '',
        PONYTAIL_ASSIGNMENT_GENERATION: rollingResetWorktree.generation ?? '', PONYTAIL_WORKTREE_GENERATION: rollingResetWorktree.resourceGeneration ?? '' };
    for (const argv of rollingProjectResetV1.retirementCommands) {
        const executable = argv[0];
        requireReset(executable, 'missing cleanup executable');
        const result = (0, node_child_process_1.spawnSync)(executable, argv.slice(1), { cwd: root, env, encoding: 'utf8' });
        requireReset(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || 'resource cleanup failed');
    }
    const prefix = `refs/ponytail/reset/${rollingProjectResetV1.request.id}/${index}`;
    const stashMessage = `ponytail reset ${rollingProjectResetV1.request.id}/${index}`;
    if ((0, rolling_integration_js_1.gitResult)(root, ['show-ref', '--verify', '--quiet', `${prefix}/changes`]).status !== 0) {
        const history = (0, rolling_integration_js_1.gitResult)(root, ['reflog', 'show', '--format=%H%x00%gs', 'refs/stash']);
        if (history.status === 0)
            for (const entry of history.stdout.split('\n')) {
                const [revision, message] = entry.split('\0');
                if (revision && message?.endsWith(`: ${stashMessage}`)) {
                    (0, rolling_integration_js_1.git)(root, ['update-ref', `${prefix}/changes`, revision]);
                    break;
                }
            }
    }
    if ((0, rolling_integration_js_1.gitResult)(root, ['show-ref', '--verify', '--quiet', `${prefix}/head`]).status !== 0)
        (0, rolling_integration_js_1.git)(root, ['update-ref', `${prefix}/head`, (0, rolling_integration_js_1.git)(root, ['rev-parse', 'HEAD']).trim()]);
    if ((0, rolling_integration_js_1.git)(root, ['status', '--porcelain']).trim() !== '') {
        (0, rolling_integration_js_1.git)(root, ['stash', 'push', '--include-untracked', '--message', stashMessage]);
        (0, rolling_integration_js_1.git)(root, ['update-ref', `${prefix}/changes`, (0, rolling_integration_js_1.git)(root, ['rev-parse', 'refs/stash']).trim()]);
    }
    requireReset((0, rolling_integration_js_1.git)(root, ['status', '--porcelain']).trim() === '', 'source checkpoint did not settle checkout');
    if (node_fs_1.default.existsSync(marker))
        node_fs_1.default.unlinkSync(marker);
    if (rollingResetWorktree.disposition === 'remove') {
        (0, rolling_integration_js_1.git)(rollingProjectResetV1.coordinatorRoot, ['worktree', 'remove', '--force', '--', root]);
        requireReset(!node_fs_1.default.existsSync(root) && !inventoryRoots(rollingProjectResetV1.coordinatorRoot).includes(root), 'external checkout removal incomplete');
    }
    else {
        requireReset(poolMember(root, rollingProjectResetV1.managedDirectory), 'reuse escaped configured pool');
        (0, rolling_integration_js_1.git)(root, ['switch', '--detach', rollingProjectResetV1.baseCommit]);
    }
}
async function resetRollingProject(poolClient, projectId, root, request, execute, rollingCodex) {
    const rollingResetRequestV1 = readRollingResetRequestV1(request);
    const locked = (await poolClient.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked', [projectId])).rows[0];
    requireReset(locked?.locked === true, 'another project operation owns reset/scheduling');
    try {
        requireReset((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 LIMIT 1', [projectId])).rowCount === 0, 'release retained swarm worktree memberships before project reset');
        requireReset((await poolClient.query("SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 WHERE project_id=$1 AND state='PENDING' LIMIT 1", [projectId])).rowCount === 0, 'complete pending swarm worktree deletion before project reset');
        const existing = (await poolClient.query('SELECT reset_text FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1', [projectId])).rows[0];
        let rollingProjectResetV1;
        if (existing) {
            rollingProjectResetV1 = decodeReset(text(existing.reset_text));
            if (rollingProjectResetV1.request.id === rollingResetRequestV1.id) {
                requireReset((0, node_util_1.isDeepStrictEqual)(rollingProjectResetV1.request, rollingResetRequestV1) && rollingProjectResetV1.coordinatorRoot === node_fs_1.default.realpathSync(root), 'reset retry differs from original request/root');
                if (rollingProjectResetV1.state === 'COMPLETE')
                    return rollingProjectResetV1;
            }
            else {
                requireReset(rollingProjectResetV1.state === 'COMPLETE', 'resume original pending reset request');
                rollingProjectResetV1 = await inventoryReset(poolClient, projectId, root, rollingResetRequestV1, rollingCodex);
            }
        }
        else
            rollingProjectResetV1 = await inventoryReset(poolClient, projectId, root, rollingResetRequestV1, rollingCodex);
        if (!execute)
            return rollingProjectResetV1;
        requireReset(rollingCodex !== null || rollingProjectResetV1.actors.length === 0, 'native ownership transport required');
        const busy = (await poolClient.query('SELECT 1 FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND NOT withdrawn AND state IN (\'PREPARING\',\'QA_RUNNING\',\'PUSHING\',\'UNCONFIRMED\') UNION ALL SELECT 1 FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND state IN (\'REBASING\',\'PUSHING\',\'UNCONFIRMED\')', [projectId])).rows;
        requireReset(busy.length === 0, 'settle external QA/preparation/replay/push before reset');
        async function save() { await poolClient.query('INSERT INTO ponytail_index.rolling_reset_v1(project_id,reset_text,state) VALUES($1,$2,$3) ON CONFLICT(project_id) DO UPDATE SET reset_text=EXCLUDED.reset_text,state=EXCLUDED.state', [projectId, JSON.stringify(rollingProjectResetV1), rollingProjectResetV1.state]); }
        await save();
        for (const actor of rollingProjectResetV1.actors) {
            if (rollingProjectResetV1.completedActors.includes(actor.threadId))
                continue;
            requireReset(rollingCodex !== null, 'missing native transport');
            await stopResetActor(rollingCodex, actor);
            rollingProjectResetV1 = { ...rollingProjectResetV1, completedActors: [...rollingProjectResetV1.completedActors, actor.threadId] };
            await save();
        }
        for (const [index, tree] of rollingProjectResetV1.worktrees.entries()) {
            if (tree.disposition === 'retain' || rollingProjectResetV1.completedWorktrees.includes(tree.rootPath))
                continue;
            resetCheckout(rollingProjectResetV1, tree, index);
            rollingProjectResetV1 = { ...rollingProjectResetV1, completedWorktrees: [...rollingProjectResetV1.completedWorktrees, tree.rootPath] };
            await save();
        }
        requireReset(node_fs_1.default.realpathSync((0, rolling_integration_js_1.git)(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()) === rollingProjectResetV1.gitDirectory, 'coordinator repository changed during reset');
        await poolClient.query('BEGIN');
        try {
            await poolClient.query('DELETE FROM ponytail_index.rolling_publication_member_v1 WHERE project_id=$1', [projectId]);
            await poolClient.query('DELETE FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1', [projectId]);
            rollingProjectResetV1 = { ...rollingProjectResetV1, state: 'COMPLETE' };
            await save();
            await poolClient.query('COMMIT');
        }
        catch (cause) {
            await poolClient.query('ROLLBACK');
            throw cause;
        }
        return rollingProjectResetV1;
    }
    finally {
        await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [projectId]);
    }
}
