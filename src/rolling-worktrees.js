// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-worktrees.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRollingGitOperationAbsent = requireRollingGitOperationAbsent;
exports.readRollingPhysicalDirectory = readRollingPhysicalDirectory;
exports.resolveRollingManagedDirectory = resolveRollingManagedDirectory;
exports.requireRollingSessionMarkerAbsent = requireRollingSessionMarkerAbsent;
exports.validateRollingSessionMarker = validateRollingSessionMarker;
exports.ensureRollingSessionIdIgnored = ensureRollingSessionIdIgnored;
exports.provisionRollingWorktree = provisionRollingWorktree;
exports.cleanupRollingWorktree = cleanupRollingWorktree;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
function requireCheckout(condition, message) {
    if (!condition)
        throw new Error(`rolling worktree: ${message}`);
}
function git(root, argv) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', root, ...argv], { encoding: 'utf8' });
    requireCheckout(!result.error && result.status === 0, result.error?.message || result.stderr.trim() || `git ${argv[0]} failed`);
    return result.stdout.trim();
}
function requireRollingGitOperationAbsent(root) {
    for (const operation of ['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'sequencer']) {
        requireCheckout(!node_fs_1.default.existsSync(git(root, ['rev-parse', '--path-format=absolute', '--git-path', operation])), 'settle active Git operation before checkout reuse');
    }
}
function statIfPresent(file) {
    try {
        return node_fs_1.default.lstatSync(file);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
            return null;
        throw error;
    }
}
function readRollingPhysicalDirectory(directory) {
    const suffix = [];
    let ancestor = node_path_1.default.resolve(directory);
    while (!statIfPresent(ancestor)) {
        suffix.unshift(node_path_1.default.basename(ancestor));
        ancestor = node_path_1.default.dirname(ancestor);
    }
    requireCheckout(node_fs_1.default.statSync(ancestor).isDirectory(), 'managed directory ancestor is not a directory');
    return node_path_1.default.join(node_fs_1.default.realpathSync(ancestor), ...suffix);
}
function readConfiguration(root) {
    const file = node_path_1.default.join(root, '.agents/config/project/rolling-campaigns.json');
    requireCheckout(statIfPresent(file)?.isFile() && node_fs_1.default.realpathSync(file) === file, `missing regular project configuration in ${root}`);
    return (0, rolling_campaign_js_1.parseRollingProjectConfig)(node_fs_1.default.readFileSync(file, 'utf8'));
}
function resolveRollingManagedDirectory(coordinatorRoot) {
    const root = node_fs_1.default.realpathSync(coordinatorRoot);
    requireCheckout(git(root, ['rev-parse', '--show-toplevel']) === root, 'coordinator must be a Git checkout root');
    const inventory = git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0')
        .filter(field => field.startsWith('worktree ')).map(field => field.slice(9));
    const mainRoot = inventory[0];
    requireCheckout(mainRoot !== undefined, 'repository has no main worktree');
    const configuration = readConfiguration(root);
    const directory = readRollingPhysicalDirectory(node_path_1.default.resolve(mainRoot, configuration.managedWorktrees.directory));
    for (const checkout of inventory) {
        if (checkout === root)
            continue;
        if (node_path_1.default.dirname(checkout) !== directory &&
            !statIfPresent(node_path_1.default.join(checkout, '.agents/config/project/rolling-campaigns.json')))
            continue;
        const configured = readConfiguration(checkout);
        requireCheckout(readRollingPhysicalDirectory(node_path_1.default.resolve(mainRoot, configured.managedWorktrees.directory)) === directory, `managed directory differs in ${checkout}`);
    }
    const relative = node_path_1.default.relative(mainRoot, directory);
    requireCheckout(relative !== '', 'managed directory cannot be the main checkout itself');
    if (!relative.startsWith(`..${node_path_1.default.sep}`) && relative !== '..' && !node_path_1.default.isAbsolute(relative)) {
        const ignored = (0, node_child_process_1.spawnSync)('git', ['-C', mainRoot, 'check-ignore', '--no-index', '-q', '--', `${relative}/__ponytail_pool__`]);
        requireCheckout(ignored.status === 0, 'managed directory inside the main checkout must be Git ignored before allocation');
    }
    return { directory, mainRoot, worktrees: inventory, configuration };
}
function requireRollingSessionMarkerAbsent(worktreeRoot) {
    requireCheckout(!statIfPresent(node_path_1.default.join(worktreeRoot, 'session_id.txt')), 'previous session marker is still present');
}
function validateRollingSessionMarker(worktreeRoot, sessionId) {
    const marker = node_path_1.default.join(worktreeRoot, 'session_id.txt');
    requireCheckout(node_fs_1.default.lstatSync(marker).isFile() && !node_fs_1.default.lstatSync(marker).isSymbolicLink()
        && node_fs_1.default.readFileSync(marker, 'utf8').trim() === sessionId, 'session marker differs');
    git(worktreeRoot, ['check-ignore', '--no-index', '--quiet', '--', 'session_id.txt']);
    requireCheckout(git(worktreeRoot, ['ls-files', '--', 'session_id.txt']).length === 0, 'session marker must be untracked');
}
function ensureRollingSessionIdIgnored(worktreeRoot) {
    const tracked = (0, node_child_process_1.spawnSync)('git', ['-C', worktreeRoot, 'ls-files', '--error-unmatch', '--', 'session_id.txt'], { encoding: 'utf8' });
    requireCheckout(tracked.status === 1, 'session_id.txt is tracked or Git tracking could not be checked');
    const ignored = (0, node_child_process_1.spawnSync)('git', ['-C', worktreeRoot, 'check-ignore', '--no-index', '-q', '--', 'session_id.txt']);
    requireCheckout(ignored.status === 0 || ignored.status === 1, 'cannot check session marker ignore policy');
    if (ignored.status === 0)
        return { changed: false };
    const file = node_path_1.default.join(worktreeRoot, '.gitignore');
    const stat = statIfPresent(file);
    requireCheckout(stat === null || stat.isFile(), '.gitignore must be a regular non-symlink file');
    const previous = stat ? node_fs_1.default.readFileSync(file, 'utf8') : '';
    node_fs_1.default.writeFileSync(file, `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}/session_id.txt\n`);
    const repaired = (0, node_child_process_1.spawnSync)('git', ['-C', worktreeRoot, 'check-ignore', '--no-index', '-q', '--', 'session_id.txt']);
    requireCheckout(repaired.status === 0, 'setup did not establish marker ignore policy');
    return { changed: true };
}
function provisionRollingWorktree(coordinatorRoot, lease, baseCommit) {
    requireCheckout(Number.isSafeInteger(lease.number) && lease.number >= 101
        && typeof lease.generation === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lease.generation), 'invalid checkout lease');
    requireCheckout(typeof baseCommit === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(baseCommit), 'base must be a full commit identity');
    const pool = resolveRollingManagedDirectory(coordinatorRoot);
    const worktreeRoot = node_path_1.default.join(pool.directory, String(lease.number));
    requireCheckout(lease.rootPath === worktreeRoot, 'lease path differs from the physical managed directory');
    requireCheckout(git(coordinatorRoot, ['rev-parse', `${baseCommit}^{commit}`]) === baseCommit, 'base is not the identified commit');
    const branch = `ponytail/worker-${lease.number}/${lease.generation}`;
    const exists = statIfPresent(worktreeRoot);
    if (exists) {
        requireCheckout(exists.isDirectory() && node_fs_1.default.realpathSync(worktreeRoot) === worktreeRoot
            && pool.worktrees.includes(worktreeRoot), 'checkout path has unknown or conflicting registration');
        requireRollingSessionMarkerAbsent(worktreeRoot);
        requireCheckout(git(worktreeRoot, ['status', '--porcelain']).length === 0, 'checkout has uncommitted work; preserve it');
        const currentBranchResult = (0, node_child_process_1.spawnSync)('git', ['-C', worktreeRoot, 'symbolic-ref', '--quiet', '--short', 'HEAD'], { encoding: 'utf8' });
        requireCheckout(!currentBranchResult.error && (currentBranchResult.status === 0 || currentBranchResult.status === 1), 'cannot inspect retained checkout branch');
        const currentBranch = currentBranchResult.status === 0 ? currentBranchResult.stdout.trim() : null;
        if (currentBranch === branch) {
            requireCheckout(git(worktreeRoot, ['rev-parse', 'HEAD']) === baseCommit, 'provisioned intent has changed commits; preserve it');
        }
        else {
            const integrated = (0, node_child_process_1.spawnSync)('git', ['-C', worktreeRoot, 'merge-base', '--is-ancestor', 'HEAD', baseCommit]);
            requireCheckout(integrated.status === 0, 'checkout has unintegrated commits; preserve them');
            git(worktreeRoot, ['checkout', '-b', branch, baseCommit]);
        }
    }
    else {
        requireCheckout(!pool.worktrees.includes(worktreeRoot), 'missing registered checkout requires recovery');
        node_fs_1.default.mkdirSync(pool.directory, { recursive: true });
        requireCheckout(node_fs_1.default.realpathSync(pool.directory) === pool.directory, 'managed directory physical identity changed');
        git(coordinatorRoot, ['worktree', 'add', '-b', branch, worktreeRoot, baseCommit]);
    }
    const env = { ...process.env, PONYTAIL_WORKTREE_NUMBER: String(lease.number),
        PONYTAIL_WORKTREE_ROOT: worktreeRoot, PONYTAIL_MAIN_WORKTREE_ROOT: pool.mainRoot, PONYTAIL_WORKTREE_GENERATION: lease.generation };
    for (const argv of pool.configuration.setupCommands) {
        const result = (0, node_child_process_1.spawnSync)(argv[0], argv.slice(1), { cwd: worktreeRoot, env, encoding: 'utf8' });
        requireCheckout(!result.error && result.status === 0, `setup failed in retained checkout ${worktreeRoot}: ${result.error?.message || result.stderr.trim() || argv[0]}`);
    }
    requireCheckout(!statIfPresent(node_path_1.default.join(worktreeRoot, 'session_id.txt')), 'setup left a session marker before attachment');
    ensureRollingSessionIdIgnored(worktreeRoot);
    requireCheckout(resolveRollingManagedDirectory(worktreeRoot).directory === pool.directory, 'setup changed the physical pool configuration');
    return { number: lease.number, rootPath: worktreeRoot, branch, baseCommit };
}
function cleanupRollingWorktree(coordinatorRoot, rollingWorktreeRetirement) {
    requireCheckout(Number.isSafeInteger(rollingWorktreeRetirement.number) && rollingWorktreeRetirement.number >= 101, 'invalid checkout number');
    for (const identity of [rollingWorktreeRetirement.assignmentId, rollingWorktreeRetirement.generation, rollingWorktreeRetirement.resourceGeneration]) {
        requireCheckout(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(identity), 'invalid retirement owner identity');
    }
    requireCheckout(rollingWorktreeRetirement.sessionId.length > 0 && rollingWorktreeRetirement.sessionId.trim() === rollingWorktreeRetirement.sessionId
        && !/[\0\r\n]/u.test(rollingWorktreeRetirement.sessionId), 'invalid retirement session');
    requireCheckout(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(rollingWorktreeRetirement.integratedRevision), 'invalid integrated revision');
    const rollingManagedDirectory = resolveRollingManagedDirectory(coordinatorRoot);
    requireCheckout(rollingManagedDirectory.configuration.retirementCommands !== null, 'project retirement cleanup is unspecified; declare the V2 retirement contract before checkout reuse');
    requireCheckout(rollingWorktreeRetirement.rootPath === node_path_1.default.join(rollingManagedDirectory.directory, String(rollingWorktreeRetirement.number))
        && rollingManagedDirectory.worktrees.includes(rollingWorktreeRetirement.rootPath), 'retirement root differs from its registered physical pool');
    const markerPath = node_path_1.default.join(rollingWorktreeRetirement.rootPath, 'session_id.txt');
    if (statIfPresent(markerPath))
        validateRollingSessionMarker(rollingWorktreeRetirement.rootPath, rollingWorktreeRetirement.sessionId);
    requireCheckout(git(rollingWorktreeRetirement.rootPath, ['status', '--porcelain']).length === 0, 'checkout has uncommitted work; preserve it');
    const integrationSpawnSyncReturns = (0, node_child_process_1.spawnSync)('git', ['-C', coordinatorRoot, 'merge-base', '--is-ancestor', git(rollingWorktreeRetirement.rootPath, ['rev-parse', 'HEAD']), rollingWorktreeRetirement.integratedRevision], { encoding: 'utf8' });
    requireCheckout(!integrationSpawnSyncReturns.error && integrationSpawnSyncReturns.status === 0, 'checkout has unintegrated commits or unreadable integration; preserve it');
    const processEnv = { ...process.env, PONYTAIL_WORKTREE_NUMBER: String(rollingWorktreeRetirement.number),
        PONYTAIL_WORKTREE_ROOT: rollingWorktreeRetirement.rootPath, PONYTAIL_MAIN_WORKTREE_ROOT: rollingManagedDirectory.mainRoot,
        PONYTAIL_WORKTREE_GENERATION: rollingWorktreeRetirement.resourceGeneration, PONYTAIL_ASSIGNMENT_GENERATION: rollingWorktreeRetirement.generation,
        PONYTAIL_ASSIGNMENT_ID: rollingWorktreeRetirement.assignmentId, PONYTAIL_SESSION_ID: rollingWorktreeRetirement.sessionId };
    for (const argv of rollingManagedDirectory.configuration.retirementCommands) {
        const spawnSyncReturns = (0, node_child_process_1.spawnSync)(argv[0], argv.slice(1), { cwd: rollingWorktreeRetirement.rootPath, env: processEnv, encoding: 'utf8' });
        requireCheckout(!spawnSyncReturns.error && spawnSyncReturns.status === 0, `cleanup failed in retained checkout: ${spawnSyncReturns.error?.message || spawnSyncReturns.stderr.trim() || argv[0]}`);
    }
    requireCheckout(git(rollingWorktreeRetirement.rootPath, ['status', '--porcelain']).length === 0, 'cleanup changed tracked or untracked work; retain the checkout');
    if (statIfPresent(markerPath)) {
        validateRollingSessionMarker(rollingWorktreeRetirement.rootPath, rollingWorktreeRetirement.sessionId);
        node_fs_1.default.unlinkSync(markerPath);
    }
}
