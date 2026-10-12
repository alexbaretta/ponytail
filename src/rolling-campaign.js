// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-campaign.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingBindingsReaders = exports.RollingProjectConfigReaders = void 0;
exports.isRollingArgv = isRollingArgv;
exports.readRollingProjectConfigV1 = readRollingProjectConfigV1;
exports.readRollingProjectConfigV2 = readRollingProjectConfigV2;
exports.normalizeRollingProjectConfig = normalizeRollingProjectConfig;
exports.parseRollingProjectConfig = parseRollingProjectConfig;
exports.readRollingBindingsV1 = readRollingBindingsV1;
exports.collectRollingGraph = collectRollingGraph;
exports.selectRollingAssignments = selectRollingAssignments;
exports.readRollingCampaignRequest = readRollingCampaignRequest;
exports.resolveRollingConfiguration = resolveRollingConfiguration;
exports.readRollingResolvedConfiguration = readRollingResolvedConfiguration;
exports.loadRollingConfiguration = loadRollingConfiguration;
const lossless_json_1 = require("lossless-json");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_util_1 = require("node:util");
const obligations_js_1 = require("../skills/plan-execution/scripts/obligations.js");
const obligation_binding_history_js_1 = require("../skills/plan-execution/scripts/obligation-binding-history.js");
function requireRollingCondition(condition, message) {
    if (!condition)
        throw new Error(`rolling campaign: ${message}`);
}
function isRollingRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function requireRollingRecord(value, keys, label) {
    requireRollingCondition(isRollingRecord(value)
        && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label} must contain exactly ${keys.join(', ')}`);
}
function isRollingStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}
function isRollingArgv(value) {
    return Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0
        && value.every((argument) => typeof argument === 'string' && !argument.includes('\0'));
}
function isRollingMainline(value) {
    requireRollingRecord(value, ['remote', 'branch'], 'mainline');
    for (const key of ['remote', 'branch']) {
        const field = value[key];
        requireRollingCondition(typeof field === 'string' && field.trim() === field && field.length > 0 && !field.startsWith('-'), `invalid mainline ${key}`);
    }
    return true;
}
function isRollingPositiveInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function isRollingProjectConfigV1(value) {
    requireRollingRecord(value, ['schemaVersion', 'mainline', 'managedWorktrees', 'maxActiveWorkers', 'publicationSize', 'setupCommands', 'qa'], 'project configuration V1');
    requireRollingCondition(value.schemaVersion === 1, 'unsupported project configuration version');
    requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline), 'invalid mainline');
    requireRollingRecord(value.managedWorktrees, ['directory', 'anchor'], 'managed worktrees');
    requireRollingCondition(value.managedWorktrees.anchor === 'main', 'managed directory anchor must be main');
    requireRollingCondition(typeof value.managedWorktrees.directory === 'string' && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory && value.managedWorktrees.directory.length > 0, 'managed directory must be nonempty');
    for (const key of ['maxActiveWorkers', 'publicationSize'])
        requireRollingCondition(value[key] === null || isRollingPositiveInteger(value[key]), `${key} must be null or a positive safe integer`);
    requireRollingRecord(value.qa, ['focused', 'publication'], 'QA');
    const commandGroups = [['setupCommands', value.setupCommands], ['focused QA', value.qa.focused], ['publication QA', value.qa.publication]];
    for (const [label, commands] of commandGroups) {
        requireRollingCondition(Array.isArray(commands), `${label} must be an array`);
        requireRollingCondition(commands.every(isRollingArgv), `${label} commands must be nonempty executable argument arrays`);
    }
    requireRollingCondition(Array.isArray(value.qa.publication) && value.qa.publication.length > 0, 'publication QA must be configured');
    return true;
}
function readRollingProjectConfigV1(value) {
    requireRollingCondition(isRollingProjectConfigV1(value), 'invalid project configuration');
    return value;
}
function isRollingProjectConfigV2(value) {
    requireRollingRecord(value, ['schemaVersion', 'mainline', 'managedWorktrees', 'maxActiveWorkers', 'publicationSize', 'setupCommands', 'qa', 'retirementCommands'], 'project configuration V2');
    requireRollingCondition(value.schemaVersion === 2, 'unsupported project configuration version');
    requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline), 'invalid mainline');
    requireRollingRecord(value.managedWorktrees, ['directory', 'anchor'], 'managed worktrees');
    requireRollingCondition(value.managedWorktrees.anchor === 'main', 'managed directory anchor must be main');
    requireRollingCondition(typeof value.managedWorktrees.directory === 'string' && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory && value.managedWorktrees.directory.length > 0, 'managed directory must be nonempty');
    for (const key of ['maxActiveWorkers', 'publicationSize'])
        requireRollingCondition(value[key] === null || isRollingPositiveInteger(value[key]), `${key} must be null or a positive safe integer`);
    requireRollingRecord(value.qa, ['focused', 'publication'], 'QA');
    const commandGroups = [['setupCommands', value.setupCommands], ['focused QA', value.qa.focused], ['publication QA', value.qa.publication]];
    for (const [label, commands] of commandGroups) {
        requireRollingCondition(Array.isArray(commands) && commands.every(isRollingArgv), `${label} commands must be nonempty executable argument arrays`);
    }
    requireRollingCondition(Array.isArray(value.qa.publication) && value.qa.publication.length > 0, 'publication QA must be configured');
    requireRollingCondition(value.retirementCommands === null || Array.isArray(value.retirementCommands) && value.retirementCommands.every(isRollingArgv), 'retirement commands must be null or executable argument arrays');
    return true;
}
function readRollingProjectConfigV2(value) {
    requireRollingCondition(isRollingProjectConfigV2(value), 'invalid project configuration');
    return value;
}
function readRollingPhysicalProjectConfig(value) {
    requireRollingCondition(isRollingRecord(value), 'project configuration must be a record');
    switch (value.schemaVersion) {
        case 1: return readRollingProjectConfigV1(value);
        case 2: return readRollingProjectConfigV2(value);
        default: throw new Error('rolling campaign: unsupported project configuration version');
    }
}
function unreachableRollingProjectConfig(rollingPhysicalProjectConfig) {
    throw new Error(`rolling campaign: unsupported project configuration ${JSON.stringify(rollingPhysicalProjectConfig)}`);
}
function normalizeRollingProjectConfig(rollingPhysicalProjectConfig) {
    switch (rollingPhysicalProjectConfig.schemaVersion) {
        case 1: return { ...rollingPhysicalProjectConfig, schemaVersion: 2, retirementCommands: null };
        case 2: return rollingPhysicalProjectConfig;
    }
    return unreachableRollingProjectConfig(rollingPhysicalProjectConfig);
}
function parseRollingProjectConfig(text) {
    return normalizeRollingProjectConfig(readRollingPhysicalProjectConfig((0, lossless_json_1.parse)(text, null, token => {
        requireRollingCondition(/^(0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(Number(token)), `unsupported JSON number token: ${token}`);
        return Number(token);
    })));
}
exports.RollingProjectConfigReaders = { V1: readRollingProjectConfigV1, V2: readRollingProjectConfigV2 };
function isRollingAcceptanceReference(value) {
    requireRollingRecord(value, ['id', 'arcId', 'stepId'], 'acceptance reference');
    requireRollingCondition(typeof value.id === 'string' && value.id.length > 0 && typeof value.arcId === 'string' && value.arcId.length > 0
        && (value.stepId === null || typeof value.stepId === 'string' && value.stepId.length > 0), 'invalid acceptance reference');
    return true;
}
function isRollingTestReference(value) {
    requireRollingRecord(value, ['id', 'path', 'selection'], 'test reference');
    requireRollingCondition(typeof value.id === 'string' && value.id.length > 0 && typeof value.path === 'string' && value.path.length > 0
        && isRollingStringArray(value.selection) && value.selection.length > 0, 'invalid test reference');
    return true;
}
function isRollingBinding(value) {
    requireRollingRecord(value, ['obligationId', 'implementationIds', 'sourcePaths', 'acceptances', 'unitTests', 'integrationTests', 'exclusiveResources'], 'execution binding');
    requireRollingCondition(typeof value.obligationId === 'string' && /^OBL-[1-9][0-9]*$/.test(value.obligationId), 'duplicate or invalid binding obligation');
    for (const key of ['implementationIds', 'exclusiveResources']) {
        const strings = value[key];
        requireRollingCondition(isRollingStringArray(strings) && new Set(strings).size === strings.length, `invalid binding ${key}`);
    }
    requireRollingCondition(Array.isArray(value.acceptances) && value.acceptances.every(isRollingAcceptanceReference), 'acceptances must be an array');
    requireRollingCondition(Array.isArray(value.unitTests) && value.unitTests.every(isRollingTestReference), 'unitTests must be an array');
    requireRollingCondition(Array.isArray(value.integrationTests) && value.integrationTests.every(isRollingTestReference), 'integrationTests must be an array');
    requireRollingCondition(isRollingStringArray(value.sourcePaths) && new Set(value.sourcePaths).size === value.sourcePaths.length, 'invalid binding sourcePaths');
    for (const relative of [...value.sourcePaths, ...value.unitTests.map((item) => item.path), ...value.integrationTests.map((item) => item.path)]) {
        requireRollingCondition(!node_path_1.default.isAbsolute(relative) && relative.split('/').every(component => component && component !== '.' && component !== '..') && !relative.includes('\\'), 'binding path must be normalized and repository-relative');
    }
    return true;
}
function isRollingBindingsV1(value) {
    requireRollingRecord(value, ['schemaVersion', 'bindings'], 'execution bindings V1');
    requireRollingCondition(value.schemaVersion === 1 && Array.isArray(value.bindings), 'unsupported execution bindings');
    const ids = new Set();
    for (const binding of value.bindings) {
        requireRollingCondition(isRollingBinding(binding), 'invalid execution binding');
        requireRollingCondition(!ids.has(binding.obligationId), 'duplicate or invalid binding obligation');
        ids.add(binding.obligationId);
    }
    return true;
}
function readRollingBindingsV1(value) {
    requireRollingCondition(isRollingBindingsV1(value), 'invalid execution bindings');
    return value;
}
exports.RollingBindingsReaders = { V1: readRollingBindingsV1 };
function readRollingCoordinatorRoot(coordinatorRoot) {
    const root = node_fs_1.default.realpathSync(coordinatorRoot);
    const repository = (0, node_child_process_1.spawnSync)('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
    requireRollingCondition(repository.status === 0 && node_fs_1.default.realpathSync(repository.stdout.trim()) === root, 'coordinator root must identify the exact Git checkout');
    return root;
}
function collectRollingGraph(coordinatorRoot, documentPath, bindingsPath, bindingHistoryPath) {
    const root = readRollingCoordinatorRoot(coordinatorRoot);
    const head = (0, node_child_process_1.spawnSync)('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    requireRollingCondition(head.status === 0, 'coordinator must have a committed HEAD');
    const texts = [];
    for (const relative of [documentPath, bindingsPath, '.agents/config/project/rolling-campaigns.json', ...(bindingHistoryPath === undefined ? [] : [bindingHistoryPath])]) {
        requireRollingCondition(typeof relative === 'string' && !node_path_1.default.isAbsolute(relative)
            && relative.split('/').every(component => component && component !== '.' && component !== '..') && !relative.includes('\\'), 'graph input must be repository-relative');
        const file = node_path_1.default.join(root, relative);
        requireRollingCondition(node_fs_1.default.lstatSync(file).isFile() && node_fs_1.default.realpathSync(file) === file, 'graph input must be a regular file without symlink ancestors');
        texts.push(node_fs_1.default.readFileSync(file, 'utf8'));
    }
    const [documentText, bindingsText, configurationText, historyText] = texts;
    requireRollingCondition(documentText !== undefined && bindingsText !== undefined && configurationText !== undefined, 'graph input texts are missing');
    const document = (0, obligations_js_1.parseObligationDocument)(documentText);
    const bindings = readRollingBindingsV1((0, lossless_json_1.parse)(bindingsText, null, token => {
        requireRollingCondition(token === '1', 'unsupported bindings number');
        return 1;
    }));
    const projectConfiguration = parseRollingProjectConfig(configurationText);
    const bindingHistory = historyText === undefined ? null : (0, obligation_binding_history_js_1.parseObligationBindingHistory)(historyText);
    const obligationScopeProjection = (0, obligations_js_1.projectObligationScope)(document, root, bindingHistory === null ? undefined : bindingHistory);
    const projection = obligationScopeProjection.projection;
    const obligationIds = new Set(document.obligations.map(item => item.id));
    requireRollingCondition(bindings.bindings.every(binding => obligationIds.has(binding.obligationId)), 'binding references an unknown obligation');
    const obligationBaseline = document.baselines.at(-1);
    requireRollingCondition(obligationBaseline, 'graph has no current baseline');
    const inputs = new Set(obligationBaseline.requirements.map(item => item.path));
    const acceptedCertificateIds = new Set(projection.assessments.map(assessment => assessment.id));
    for (const certificate of document.certificates.filter(certificate => acceptedCertificateIds.has(certificate.id))) {
        for (const input of certificate.inputs)
            inputs.add(input.path);
    }
    const inputDigests = [...inputs].sort().map((relative) => {
        try {
            return [relative, (0, obligations_js_1.inputDigest)(root, relative)];
        }
        catch {
            return [relative, null];
        }
    });
    const digest = node_crypto_1.default.createHash('sha256').update(JSON.stringify([root, head.stdout.trim(), documentPath, bindingsPath, texts, inputDigests,
        ...(bindingHistoryPath === undefined ? [] : [bindingHistoryPath])])).digest('hex');
    const unavailableInputs = inputDigests.filter(([, digest]) => digest === null).map(([relative]) => relative);
    return { coordinatorRoot: root, head: head.stdout.trim(), digest, document,
        bindings: bindings.bindings, projection, bindingHistory, effectiveBindings: obligationScopeProjection.bindings, projectConfiguration, unavailableInputs };
}
function selectRollingAssignments(rollingGraph, assignments, maxActiveWorkers, expectedDigest) {
    requireRollingCondition(rollingGraph.digest === expectedDigest, 'stale coordinator graph');
    requireRollingCondition(Number.isSafeInteger(maxActiveWorkers) && maxActiveWorkers > 0, 'capacity must be a positive safe integer');
    requireRollingCondition(Array.isArray(rollingGraph.unavailableInputs), 'graph must assess input availability');
    const live = assignments.filter(assignment => assignment.state !== 'RELEASED');
    const states = new Set(['RESERVED', 'PROVISIONING', 'ATTACHING', 'WORKING', 'REVIEW', 'REWORK', 'INTEGRATING', 'RETIRING', 'INACTIVE']);
    const owners = new Set();
    for (const assignment of live) {
        requireRollingCondition(states.has(assignment.state) && typeof assignment.scopeId === 'string' && !owners.has(`${assignment.scopeId}:${assignment.obligationId}`), 'invalid or duplicate live obligation ownership');
        owners.add(`${assignment.scopeId}:${assignment.obligationId}`);
        requireRollingCondition(Array.isArray(assignment.plannedPaths) && Array.isArray(assignment.exclusiveResources)
            && Array.isArray(assignment.blockers), 'assignment must retain scope and blockers');
        requireRollingCondition(assignment.state !== 'INACTIVE' || assignment.activityStopped === true, 'inactive worker must acknowledge stopped activity');
    }
    const occupied = live.filter(assignment => assignment.state !== 'INACTIVE');
    let capacity = Math.max(0, maxActiveWorkers - occupied.length);
    const satisfied = new Set(rollingGraph.projection.satisfiedIds);
    const unresolved = new Set(rollingGraph.projection.unresolvedIds);
    const bindings = new Map(rollingGraph.bindings.map(binding => [binding.obligationId, binding]));
    const categoryOrder = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2', 'gate'];
    const obligations = rollingGraph.document.obligations.filter(obligation => unresolved.has(obligation.id))
        .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || Number(a.id.slice(4)) - Number(b.id.slice(4)));
    const selected = [];
    const blocked = [];
    if (rollingGraph.unavailableInputs.length > 0)
        return { digest: rollingGraph.digest,
            activeCount: occupied.length, availableCapacity: capacity, selected,
            blocked: [{ reason: 'unavailable_inputs', paths: rollingGraph.unavailableInputs }] };
    for (const resume of [true, false])
        for (const obligation of obligations) {
            const assignment = live.find(item => item.scopeId === rollingGraph.document.scopeId && item.obligationId === obligation.id);
            if (resume ? assignment?.state !== 'INACTIVE' : assignment !== undefined)
                continue;
            const binding = bindings.get(obligation.id);
            const obligationEffectiveBinding = rollingGraph.effectiveBindings.get(obligation.id);
            requireRollingCondition(obligationEffectiveBinding, `missing effective binding: ${obligation.id}`);
            const prerequisites = [...obligationEffectiveBinding.dependsOn, ...(assignment?.blockers ?? [])].filter(id => !satisfied.has(id));
            if (prerequisites.length || !binding) {
                blocked.push({ obligationId: obligation.id, reason: binding ? 'prerequisites' : 'missing_binding', prerequisites });
                continue;
            }
            if (resume && assignment && (JSON.stringify(assignment.plannedPaths) !== JSON.stringify(obligationEffectiveBinding.execution.plannedPaths)
                || JSON.stringify(assignment.exclusiveResources) !== JSON.stringify(binding.exclusiveResources)
                || (assignment.lease ? !(0, node_util_1.isDeepStrictEqual)(assignment.lease.binding, obligationEffectiveBinding)
                    || !(0, node_util_1.isDeepStrictEqual)(assignment.binding, binding) : obligationEffectiveBinding.revisionId !== null))) {
                blocked.push({ obligationId: obligation.id, reason: 'scope_changed', prerequisites: [] });
                continue;
            }
            const plannedPaths = resume && assignment ? assignment.plannedPaths : obligationEffectiveBinding.execution.plannedPaths;
            const exclusiveResources = resume && assignment ? assignment.exclusiveResources : binding.exclusiveResources;
            const conflicts = occupied.filter(other => (plannedPaths.some(left => other.plannedPaths.some(right => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)))
                || exclusiveResources.some(resource => other.exclusiveResources.includes(resource))));
            if (conflicts.length) {
                blocked.push({ obligationId: obligation.id, reason: 'conflict', assignmentIds: conflicts.map(item => item.id) });
                continue;
            }
            if (capacity === 0)
                continue;
            if (resume && assignment)
                selected.push({ kind: 'resume_worker', obligationId: obligation.id,
                    assignmentId: assignment.id, plannedPaths, exclusiveResources, binding });
            else
                selected.push({ kind: 'start_worker', obligationId: obligation.id,
                    assignmentId: null, plannedPaths, exclusiveResources, binding });
            occupied.push({ id: assignment?.id ?? obligation.id, plannedPaths, exclusiveResources });
            capacity--;
        }
    return { digest: rollingGraph.digest, activeCount: live.filter(item => item.state !== 'INACTIVE').length,
        availableCapacity: capacity, selected, blocked };
}
function readRollingCampaignRequest(value) {
    requireRollingRecord(value, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'campaign request');
    requireRollingCondition(value.mainline === null || isRollingMainline(value.mainline), 'invalid campaign mainline');
    requireRollingCondition(typeof value.incrementRef === 'string' && !value.incrementRef.startsWith('-') && (0, node_child_process_1.spawnSync)('git', ['check-ref-format', `refs/heads/${value.incrementRef}`]).status === 0, 'invalid campaign increment branch');
    requireRollingCondition(value.maxActiveWorkers === null || isRollingPositiveInteger(value.maxActiveWorkers), 'invalid campaign capacity');
    requireRollingCondition(value.publicationSize === null || isRollingPositiveInteger(value.publicationSize), 'invalid campaign publication size');
    return { mainline: value.mainline, incrementRef: value.incrementRef, maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize };
}
function resolveRollingConfiguration(rollingPhysicalProjectConfig, request, gitDefaultBranch) {
    const rollingProjectConfigV2 = normalizeRollingProjectConfig(readRollingPhysicalProjectConfig(rollingPhysicalProjectConfig));
    readRollingCampaignRequest(request);
    const mainline = request.mainline ?? rollingProjectConfigV2.mainline
        ?? { remote: 'origin', branch: gitDefaultBranch };
    const maxActiveWorkers = request.maxActiveWorkers ?? rollingProjectConfigV2.maxActiveWorkers ?? 10;
    const publicationSize = request.publicationSize ?? rollingProjectConfigV2.publicationSize ?? 1;
    readRollingProjectConfigV2({ ...rollingProjectConfigV2, mainline, maxActiveWorkers, publicationSize });
    return readRollingResolvedConfiguration({ mainline: { ...mainline }, incrementRef: request.incrementRef, maxActiveWorkers, publicationSize });
}
function isRollingResolvedConfiguration(value) {
    requireRollingRecord(value, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'resolved campaign configuration');
    requireRollingRecord(value.mainline, ['remote', 'branch'], 'resolved mainline');
    requireRollingCondition(typeof value.mainline.remote === 'string' && value.mainline.remote.length > 0
        && value.mainline.remote.trim() === value.mainline.remote && !value.mainline.remote.startsWith('-'), 'invalid mainline remote');
    for (const key of ['maxActiveWorkers', 'publicationSize'])
        requireRollingCondition(isRollingPositiveInteger(value[key]), `invalid resolved ${key}`);
    const refs = [['mainline branch', value.mainline.branch], ['increment branch', value.incrementRef]];
    for (const [label, ref] of refs) {
        requireRollingCondition(typeof ref === 'string' && ref.length > 0 && !ref.startsWith('-')
            && (0, node_child_process_1.spawnSync)('git', ['check-ref-format', `refs/heads/${ref}`]).status === 0, `invalid ${label}`);
    }
    requireRollingCondition(value.mainline.branch !== value.incrementRef, 'increment and mainline branches must differ');
    return true;
}
function readRollingResolvedConfiguration(value) {
    requireRollingCondition(isRollingResolvedConfiguration(value), 'invalid resolved campaign configuration');
    return value;
}
function loadRollingConfiguration(coordinatorRoot, request) {
    const root = readRollingCoordinatorRoot(coordinatorRoot);
    const configurationPath = node_path_1.default.join(root, '.agents/config/project/rolling-campaigns.json');
    requireRollingCondition(node_fs_1.default.lstatSync(configurationPath).isFile()
        && node_fs_1.default.realpathSync(configurationPath) === configurationPath, 'project configuration must be a regular non-symlink file without symlink ancestors');
    const rollingProjectConfig = parseRollingProjectConfig(node_fs_1.default.readFileSync(configurationPath, 'utf8'));
    const gitDefault = (0, node_child_process_1.spawnSync)('git', ['-C', root, 'config', '--get', 'init.defaultBranch'], { encoding: 'utf8' });
    requireRollingCondition(gitDefault.status === 0 || gitDefault.status === 1, 'cannot read effective Git default branch');
    return resolveRollingConfiguration(rollingProjectConfig, request, gitDefault.status === 0 ? gitDefault.stdout.trim() : null);
}
