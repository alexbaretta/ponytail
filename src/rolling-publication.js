// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/rolling-publication.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollingMainlinePublicationReaders = exports.RollingPublicationQaJobReaders = exports.RollingPublicationQaReaders = exports.RollingMainlineCandidateReaders = exports.RollingMainlinePreparationReaders = exports.RollingPublicationBatchClaimReaders = void 0;
exports.readRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1;
exports.selectRollingPublicationBatch = selectRollingPublicationBatch;
exports.readRollingMainlinePreparationV1 = readRollingMainlinePreparationV1;
exports.readRollingMainlineCandidateV1 = readRollingMainlineCandidateV1;
exports.readRollingPublicationQaV1 = readRollingPublicationQaV1;
exports.parseRollingPublicationQa = parseRollingPublicationQa;
exports.prepareRollingMainline = prepareRollingMainline;
exports.mergeRollingMainline = mergeRollingMainline;
exports.observeRollingMainlineCandidate = observeRollingMainlineCandidate;
exports.verifyRollingMainlineCandidate = verifyRollingMainlineCandidate;
exports.runRollingPublicationQa = runRollingPublicationQa;
exports.verifyRollingPublicationQa = verifyRollingPublicationQa;
exports.readRollingPublicationQaJobV1 = readRollingPublicationQaJobV1;
exports.readRollingMainlinePublicationV1 = readRollingMainlinePublicationV1;
exports.synchronizeRollingCampaign = synchronizeRollingCampaign;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const lossless_json_1 = require("lossless-json");
const rolling_campaign_js_1 = require("./rolling-campaign.js");
const rolling_integration_js_1 = require("./rolling-integration.js");
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function record(value, keys) {
    requirePublication(isRecord(value), 'publication contract must be a record');
    requirePublication(Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'unknown or missing publication fields');
    return value;
}
function readRollingPublicationBatchClaimV1(value) {
    const batch = record(value, ['schemaVersion', 'id', 'campaignId', 'rootPath', 'incrementRef', 'target', 'graphDigest', 'configurationDigest',
        'publicationSize', 'trigger', 'increments', 'campaignRevision']);
    requirePublication(batch.schemaVersion === 1, 'unsupported publication claim version');
    requirePublication(typeof batch.id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(batch.id), 'invalid publication batch ID');
    requirePublication(typeof batch.campaignId === 'string' && batch.campaignId.trim() === batch.campaignId && batch.campaignId.length > 0
        && !/[\0\r\n]/u.test(batch.campaignId), 'invalid publication campaign ID');
    requirePublication(typeof batch.rootPath === 'string' && node_path_1.default.isAbsolute(batch.rootPath) && node_path_1.default.normalize(batch.rootPath) === batch.rootPath, 'invalid publication checkout');
    const rollingResolvedConfiguration = (0, rolling_campaign_js_1.readRollingResolvedConfiguration)({ mainline: batch.target, incrementRef: batch.incrementRef,
        maxActiveWorkers: 1, publicationSize: batch.publicationSize });
    requirePublication(typeof batch.graphDigest === 'string' && /^[a-f0-9]{64}$/u.test(batch.graphDigest)
        && typeof batch.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(batch.configurationDigest), 'invalid publication input digest');
    requirePublication(batch.trigger === 'threshold' || batch.trigger === 'explicit_flush' || batch.trigger === 'completion' || batch.trigger === 'quiescence', 'invalid publication trigger');
    requirePublication(Array.isArray(batch.increments) && batch.increments.length > 0, 'publication claim has no accepted increments');
    const rollingAcceptedIncrements = batch.increments.map((value) => {
        const increment = record(value, ['id', 'revision']);
        requirePublication(typeof increment.id === 'string' && typeof increment.revision === 'string', 'invalid publication increment');
        return { id: increment.id, revision: increment.revision };
    });
    requirePublication(new Set(rollingAcceptedIncrements.map(item => item.id)).size === rollingAcceptedIncrements.length, 'publication claim repeats an increment');
    const rollingPublicationSelection = selectRollingPublicationBatch(rollingAcceptedIncrements, rollingResolvedConfiguration.publicationSize, batch.trigger === 'threshold' ? null : batch.trigger);
    requirePublication(rollingPublicationSelection.state === 'FROZEN' && rollingPublicationSelection.increments.length === rollingAcceptedIncrements.length
        && rollingPublicationSelection.trigger === batch.trigger && rollingPublicationSelection.campaignRevision === batch.campaignRevision, 'claim differs from its frozen publication selection');
    return { schemaVersion: 1, id: batch.id, campaignId: batch.campaignId, rootPath: batch.rootPath, incrementRef: rollingResolvedConfiguration.incrementRef,
        target: rollingResolvedConfiguration.mainline, graphDigest: batch.graphDigest, configurationDigest: batch.configurationDigest,
        publicationSize: rollingResolvedConfiguration.publicationSize, trigger: batch.trigger, increments: rollingPublicationSelection.increments,
        campaignRevision: rollingPublicationSelection.campaignRevision };
}
exports.RollingPublicationBatchClaimReaders = { V1: readRollingPublicationBatchClaimV1 };
function requirePublication(condition, message) {
    if (!condition)
        throw new Error(`rolling publication: ${message}`);
}
function selectRollingPublicationBatch(orderedRollingAcceptedIncrements, publicationSize, flush = null) {
    requirePublication(Number.isSafeInteger(publicationSize) && publicationSize > 0, 'publication size must be a positive safe integer');
    requirePublication(flush === null || flush === 'explicit_flush' || flush === 'completion' || flush === 'quiescence', 'unsupported publication trigger');
    const map = new Map();
    for (const rollingAcceptedIncrement of orderedRollingAcceptedIncrements) {
        requirePublication(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(rollingAcceptedIncrement.id)
            && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(rollingAcceptedIncrement.revision), 'invalid accepted increment identity');
        const previousRollingAcceptedIncrement = map.get(rollingAcceptedIncrement.id);
        requirePublication(!previousRollingAcceptedIncrement || previousRollingAcceptedIncrement.revision === rollingAcceptedIncrement.revision, 'accepted increment revision is immutable');
        if (!previousRollingAcceptedIncrement)
            map.set(rollingAcceptedIncrement.id, { id: rollingAcceptedIncrement.id, revision: rollingAcceptedIncrement.revision });
    }
    const uniqueRollingAcceptedIncrements = [...map.values()];
    if (uniqueRollingAcceptedIncrements.length === 0)
        return { state: 'WAITING', reason: 'empty', count: 0 };
    const trigger = uniqueRollingAcceptedIncrements.length >= publicationSize ? 'threshold' : flush;
    if (trigger === null)
        return { state: 'WAITING', reason: 'below_threshold', count: uniqueRollingAcceptedIncrements.length };
    const selectedRollingAcceptedIncrements = uniqueRollingAcceptedIncrements.slice(0, publicationSize);
    const finalRollingAcceptedIncrement = selectedRollingAcceptedIncrements.at(-1);
    requirePublication(finalRollingAcceptedIncrement, 'publication cannot freeze an empty batch');
    return { state: 'FROZEN', trigger,
        increments: selectedRollingAcceptedIncrements, campaignRevision: finalRollingAcceptedIncrement.revision };
}
function commit(value) {
    requirePublication(typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value), 'invalid publication commit');
    return value;
}
function batchId(value) {
    requirePublication(typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value), 'invalid publication batch ID');
    return value;
}
function physicalRoot(value) {
    requirePublication(typeof value === 'string' && node_path_1.default.isAbsolute(value) && node_path_1.default.normalize(value) === value, 'invalid publication root');
    return value;
}
function readRollingMainlinePreparationV1(value) {
    const preparation = record(value, ['schemaVersion', 'batchId', 'rootPath', 'sourceRevision', 'mainlineRevision']);
    requirePublication(preparation.schemaVersion === 1, 'unsupported mainline preparation version');
    return { schemaVersion: 1, batchId: batchId(preparation.batchId), rootPath: physicalRoot(preparation.rootPath),
        sourceRevision: commit(preparation.sourceRevision), mainlineRevision: commit(preparation.mainlineRevision) };
}
exports.RollingMainlinePreparationReaders = { V1: readRollingMainlinePreparationV1 };
function readRollingMainlineCandidateV1(value) {
    const candidate = record(value, ['schemaVersion', 'batchId', 'rootPath', 'sourceRevision', 'mainlineRevision', 'revision']);
    const rollingMainlinePreparationV1 = readRollingMainlinePreparationV1({ schemaVersion: candidate.schemaVersion, batchId: candidate.batchId,
        rootPath: candidate.rootPath, sourceRevision: candidate.sourceRevision, mainlineRevision: candidate.mainlineRevision });
    return { ...rollingMainlinePreparationV1, revision: commit(candidate.revision) };
}
exports.RollingMainlineCandidateReaders = { V1: readRollingMainlineCandidateV1 };
function readRollingPublicationQaV1(value) {
    const qa = record(value, ['schemaVersion', 'id', 'batchId', 'revision', 'configurationDigest', 'outcome', 'commands']);
    requirePublication(qa.schemaVersion === 1 && (qa.outcome === 'PASS' || qa.outcome === 'FAIL'), 'unsupported publication QA outcome');
    requirePublication(typeof qa.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(qa.configurationDigest), 'invalid publication QA configuration digest');
    requirePublication(Array.isArray(qa.commands) && qa.commands.length > 0, 'publication QA requires recorded commands');
    const commands = qa.commands.map((value) => {
        const command = record(value, ['argv', 'status', 'output']);
        requirePublication((0, rolling_campaign_js_1.isRollingArgv)(command.argv) && (command.status === null || typeof command.status === 'number'
            && Number.isSafeInteger(command.status)) && typeof command.output === 'string', 'invalid publication QA command result');
        return { argv: command.argv, status: command.status, output: command.output };
    });
    requirePublication(qa.outcome !== 'PASS' || commands.every(command => command.status === 0), 'publication QA cannot pass a failed command');
    return { schemaVersion: 1, id: batchId(qa.id), batchId: batchId(qa.batchId), revision: commit(qa.revision), configurationDigest: qa.configurationDigest, outcome: qa.outcome, commands };
}
exports.RollingPublicationQaReaders = { V1: readRollingPublicationQaV1 };
function parseRollingPublicationQa(text) {
    return readRollingPublicationQaV1((0, lossless_json_1.parse)(text, null, token => {
        requirePublication(/^-?(0|[1-9][0-9]*)$/u.test(token), 'publication QA numbers must be integer tokens');
        const number = Number(token);
        requirePublication(Number.isSafeInteger(number), 'publication QA number exceeds the safe integer range');
        return number;
    }));
}
function publicationBranch(id) { return `refs/heads/ponytail/publication/${batchId(id)}`; }
function cleanPublicationCheckout(rootPath) {
    requirePublication(node_fs_1.default.realpathSync(rootPath) === rootPath && (0, rolling_integration_js_1.git)(rootPath, ['rev-parse', '--show-toplevel']).trim() === rootPath, 'publication checkout physical identity changed');
    requirePublication((0, rolling_integration_js_1.git)(rootPath, ['status', '--porcelain=v1', '--untracked-files=all']).length === 0, 'publication checkout has work to preserve');
}
function prepareRollingMainline(rollingPublicationBatchClaimV1) {
    const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
    const rootPath = checkedRollingPublicationBatchClaimV1.rootPath;
    cleanPublicationCheckout(rootPath);
    requirePublication((0, rolling_integration_js_1.git)(rootPath, ['symbolic-ref', 'HEAD']).trim() === `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`, 'publication must begin on its configured campaign branch');
    requirePublication((0, rolling_integration_js_1.gitResult)(rootPath, ['show-ref', '--verify', '--quiet', publicationBranch(checkedRollingPublicationBatchClaimV1.id)]).status === 1, 'publication branch already exists; reconcile its retained intent instead of replacing it');
    const sourceRevision = commit((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', 'HEAD']).trim());
    (0, rolling_integration_js_1.git)(rootPath, ['merge-base', '--is-ancestor', checkedRollingPublicationBatchClaimV1.campaignRevision, sourceRevision]);
    const remoteRef = `refs/remotes/${checkedRollingPublicationBatchClaimV1.target.remote}/${checkedRollingPublicationBatchClaimV1.target.branch}`;
    (0, rolling_integration_js_1.git)(rootPath, ['fetch', '--no-tags', '--', checkedRollingPublicationBatchClaimV1.target.remote, `refs/heads/${checkedRollingPublicationBatchClaimV1.target.branch}:${remoteRef}`]);
    return readRollingMainlinePreparationV1({ schemaVersion: 1, batchId: checkedRollingPublicationBatchClaimV1.id, rootPath, sourceRevision,
        mainlineRevision: commit((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', `${remoteRef}^{commit}`]).trim()) });
}
function mergeRollingMainline(rollingPublicationBatchClaimV1, rollingMainlinePreparationV1) {
    const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
    const checkedRollingMainlinePreparationV1 = readRollingMainlinePreparationV1(rollingMainlinePreparationV1);
    requirePublication(checkedRollingMainlinePreparationV1.batchId === checkedRollingPublicationBatchClaimV1.id
        && checkedRollingMainlinePreparationV1.rootPath === checkedRollingPublicationBatchClaimV1.rootPath, 'mainline preparation differs from its frozen batch');
    const rootPath = checkedRollingMainlinePreparationV1.rootPath;
    cleanPublicationCheckout(rootPath);
    requirePublication((0, rolling_integration_js_1.git)(rootPath, ['symbolic-ref', 'HEAD']).trim() === `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`
        && (0, rolling_integration_js_1.git)(rootPath, ['rev-parse', 'HEAD']).trim() === checkedRollingMainlinePreparationV1.sourceRevision, 'campaign checkout changed after publication preparation');
    (0, rolling_integration_js_1.git)(rootPath, ['checkout', '-b', publicationBranch(checkedRollingPublicationBatchClaimV1.id).slice('refs/heads/'.length), checkedRollingPublicationBatchClaimV1.campaignRevision]);
    (0, rolling_integration_js_1.git)(rootPath, ['merge', '--no-edit', '--no-ff', checkedRollingMainlinePreparationV1.mainlineRevision]);
    return observeRollingMainlineCandidate(checkedRollingPublicationBatchClaimV1, checkedRollingMainlinePreparationV1);
}
function observeRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlinePreparationV1) {
    const checkedRollingMainlinePreparationV1 = readRollingMainlinePreparationV1(rollingMainlinePreparationV1);
    const rollingMainlineCandidateV1 = readRollingMainlineCandidateV1({ ...checkedRollingMainlinePreparationV1,
        revision: (0, rolling_integration_js_1.git)(checkedRollingMainlinePreparationV1.rootPath, ['rev-parse', 'HEAD']).trim() });
    verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1);
    return rollingMainlineCandidateV1;
}
function verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1) {
    const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
    const checkedRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(rollingMainlineCandidateV1);
    requirePublication(checkedRollingMainlineCandidateV1.batchId === checkedRollingPublicationBatchClaimV1.id
        && checkedRollingMainlineCandidateV1.rootPath === checkedRollingPublicationBatchClaimV1.rootPath, 'candidate differs from its publication batch');
    const rootPath = checkedRollingMainlineCandidateV1.rootPath;
    cleanPublicationCheckout(rootPath);
    requirePublication((0, rolling_integration_js_1.git)(rootPath, ['symbolic-ref', 'HEAD']).trim() === publicationBranch(checkedRollingPublicationBatchClaimV1.id)
        && (0, rolling_integration_js_1.git)(rootPath, ['rev-parse', 'HEAD']).trim() === checkedRollingMainlineCandidateV1.revision, 'publication candidate checkout changed');
    requirePublication((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`]).trim() === checkedRollingMainlineCandidateV1.sourceRevision, 'publication altered or lost its retained campaign history');
    for (const revision of [checkedRollingPublicationBatchClaimV1.campaignRevision, checkedRollingMainlineCandidateV1.mainlineRevision,
        ...checkedRollingPublicationBatchClaimV1.increments.map(item => item.revision)])
        (0, rolling_integration_js_1.git)(rootPath, ['merge-base', '--is-ancestor', revision, checkedRollingMainlineCandidateV1.revision]);
}
function runRollingPublicationQa(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1, id, configurationDigest, requiredCommands) {
    verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1);
    const rollingPublicationQaJobV1 = readRollingPublicationQaJobV1({ schemaVersion: 1, id, batchId: rollingPublicationBatchClaimV1.id,
        revision: rollingMainlineCandidateV1.revision, configurationDigest, commands: requiredCommands });
    const commands = [];
    for (const argv of rollingPublicationQaJobV1.commands) {
        const spawnSyncReturns = (0, node_child_process_1.spawnSync)(argv[0], argv.slice(1), { cwd: rollingMainlineCandidateV1.rootPath, encoding: 'utf8' });
        commands.push({ argv, status: spawnSyncReturns.status, output: (spawnSyncReturns.stdout ?? '') + (spawnSyncReturns.stderr ?? '') + (spawnSyncReturns.error?.message ?? '') });
        if (spawnSyncReturns.error || spawnSyncReturns.status !== 0)
            return readRollingPublicationQaV1({ schemaVersion: 1, id,
                batchId: rollingPublicationBatchClaimV1.id, revision: rollingMainlineCandidateV1.revision, configurationDigest, outcome: 'FAIL', commands });
        verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1);
    }
    return readRollingPublicationQaV1({ schemaVersion: 1, id, batchId: rollingPublicationBatchClaimV1.id, revision: rollingMainlineCandidateV1.revision,
        configurationDigest, outcome: 'PASS', commands });
}
function verifyRollingPublicationQa(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1, rollingPublicationQaV1, configurationDigest, requiredCommands) {
    const checkedRollingPublicationQaV1 = readRollingPublicationQaV1(rollingPublicationQaV1);
    verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1);
    requirePublication(checkedRollingPublicationQaV1.batchId === rollingPublicationBatchClaimV1.id
        && checkedRollingPublicationQaV1.revision === rollingMainlineCandidateV1.revision && checkedRollingPublicationQaV1.configurationDigest === configurationDigest, 'publication QA belongs to stale or different candidate inputs');
    requirePublication(checkedRollingPublicationQaV1.outcome === 'PASS' && requiredCommands.length > 0
        && JSON.stringify(checkedRollingPublicationQaV1.commands.map(command => command.argv)) === JSON.stringify(requiredCommands), 'all required full publication QA must pass on the exact candidate');
}
function readRollingPublicationQaJobV1(value) {
    const job = record(value, ['schemaVersion', 'id', 'batchId', 'revision', 'configurationDigest', 'commands']);
    requirePublication(job.schemaVersion === 1, 'unsupported publication QA job version');
    requirePublication(typeof job.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(job.configurationDigest), 'invalid QA job input digest');
    requirePublication(Array.isArray(job.commands) && job.commands.length > 0 && job.commands.every(rolling_campaign_js_1.isRollingArgv), 'QA job requires its complete configured command profile');
    return { schemaVersion: 1, id: batchId(job.id), batchId: batchId(job.batchId), revision: commit(job.revision), configurationDigest: job.configurationDigest, commands: job.commands };
}
exports.RollingPublicationQaJobReaders = { V1: readRollingPublicationQaJobV1 };
function readRollingMainlinePublicationV1(value) {
    const publication = record(value, ['schemaVersion', 'id', 'batchId', 'result']);
    requirePublication(publication.schemaVersion === 1, 'unsupported mainline publication version');
    return { schemaVersion: 1, id: batchId(publication.id), batchId: batchId(publication.batchId), result: (0, rolling_integration_js_1.readRollingIncrementPublicationResult)(publication.result) };
}
exports.RollingMainlinePublicationReaders = { V1: readRollingMainlinePublicationV1 };
function synchronizeRollingCampaign(rollingPublicationBatchClaimV1, rollingMainlineCandidateV1, rollingMainlinePublicationV1) {
    const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
    const checkedRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(rollingMainlineCandidateV1);
    const checkedRollingMainlinePublicationV1 = readRollingMainlinePublicationV1(rollingMainlinePublicationV1);
    requirePublication(checkedRollingMainlinePublicationV1.batchId === checkedRollingPublicationBatchClaimV1.id
        && checkedRollingMainlinePublicationV1.result.state === 'PUBLISHED'
        && checkedRollingMainlinePublicationV1.result.revision === checkedRollingMainlineCandidateV1.revision, 'campaign synchronization requires observed mainline publication');
    const rootPath = checkedRollingPublicationBatchClaimV1.rootPath;
    cleanPublicationCheckout(rootPath);
    const campaignRef = `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`;
    const currentRef = (0, rolling_integration_js_1.git)(rootPath, ['symbolic-ref', 'HEAD']).trim();
    if (currentRef === publicationBranch(checkedRollingPublicationBatchClaimV1.id)) {
        verifyRollingMainlineCandidate(checkedRollingPublicationBatchClaimV1, checkedRollingMainlineCandidateV1);
        (0, rolling_integration_js_1.git)(rootPath, ['switch', checkedRollingPublicationBatchClaimV1.incrementRef]);
    }
    else
        requirePublication(currentRef === campaignRef, 'synchronization checkout is neither its retained candidate nor campaign');
    const revision = commit((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', 'HEAD']).trim());
    (0, rolling_integration_js_1.git)(rootPath, ['merge-base', '--is-ancestor', checkedRollingMainlineCandidateV1.sourceRevision, revision]);
    const containment = (0, rolling_integration_js_1.gitResult)(rootPath, ['merge-base', '--is-ancestor', checkedRollingMainlinePublicationV1.result.remoteRevision, revision]);
    if (containment.status !== 0) {
        requirePublication(containment.status === 1 && revision === checkedRollingMainlineCandidateV1.sourceRevision, 'campaign synchronization contains unexpected work; preserve it for reconciliation');
        (0, rolling_integration_js_1.git)(rootPath, ['merge', '--no-edit', '--no-ff', checkedRollingMainlinePublicationV1.result.remoteRevision]);
    }
    const synchronizedRevision = commit((0, rolling_integration_js_1.git)(rootPath, ['rev-parse', 'HEAD']).trim());
    cleanPublicationCheckout(rootPath);
    return (0, rolling_integration_js_1.publishRollingIncrement)({ rootPath, target: { remote: checkedRollingPublicationBatchClaimV1.target.remote,
            branch: checkedRollingPublicationBatchClaimV1.incrementRef }, revision: synchronizedRevision });
}
