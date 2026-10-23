// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/traceability-completeness.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignAssessmentReaders = void 0;
exports.computeCampaignCompleteness = computeCampaignCompleteness;
exports.runTraceabilityCompleteness = runTraceabilityCompleteness;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const lossless_json_1 = require("lossless-json");
const index_progress_js_1 = require("./index-progress.js");
const traceability_v5_js_1 = require("../skills/requirements-traceability/scripts/traceability-v5.js");
const traceability_project_js_1 = require("../skills/requirements-traceability/scripts/traceability-project.js");
const traceability_graph_js_1 = require("../skills/requirements-traceability/scripts/traceability-graph.js");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function object(value, keys) {
    if (!isRecord(value)
        || Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key)))
        throw new Error(`Expected exactly: ${keys.join(', ')}`);
    return value;
}
function strings(value) {
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string' && entry.trim() === entry && entry.length > 0)
        || new Set(value).size !== value.length)
        throw new Error('Expected unique nonempty strings');
    return value;
}
function campaignName(value) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(value))
        throw new Error('Invalid campaign name');
    return value;
}
function readCampaignAssessmentV1(value) {
    const record = object(value, ['schemaVersion', 'campaign', 'requirementIds', 'complete', 'reviewReferences', 'validationTags']);
    if (record.schemaVersion !== 1)
        throw new Error('Unsupported campaign assessment version');
    const complete = object(record.complete, ['R', 'A', 'T', 'I']);
    const result = { schemaVersion: 1, campaign: campaignName(record.campaign), requirementIds: strings(record.requirementIds),
        complete: { R: strings(complete.R), A: strings(complete.A), T: strings(complete.T), I: strings(complete.I) },
        reviewReferences: strings(record.reviewReferences), validationTags: strings(record.validationTags) };
    if (result.requirementIds.length === 0)
        throw new Error('Campaign requirement scope must not be empty');
    if (Object.values(result.complete).some(ids => ids.length > 0) && result.reviewReferences.length === 0)
        throw new Error('Completed IDs require review references');
    if ((result.complete.T.length > 0 || result.complete.I.length > 0) && result.validationTags.length === 0)
        throw new Error('T/I credit requires passing validation tag references');
    return result;
}
function readCampaignAssessmentV2(value) {
    const record = object(value, ['schemaVersion', 'campaign', 'requirementIds', 'complete', 'reviewReferences', 'validationTags']);
    if (record.schemaVersion !== 2)
        throw new Error('Unsupported campaign assessment version');
    const complete = object(record.complete, ['O', 'A', 'T', 'I']);
    const legacy = readCampaignAssessmentV1({ ...record, schemaVersion: 1, complete: { R: complete.O, A: complete.A, T: complete.T, I: complete.I } });
    return { ...legacy, schemaVersion: 2, complete: { O: legacy.complete.R, A: legacy.complete.A, T: legacy.complete.T, I: legacy.complete.I } };
}
function readCampaignAssessmentV3(value) {
    const record = object(value, ['schemaVersion', 'campaign', 'requirementIds', 'complete', 'reviewReferences', 'validationTags', 'manualTests']);
    if (record.schemaVersion !== 3)
        throw new Error('Unsupported campaign assessment version');
    const { manualTests: rawManualTests, ...previous } = record;
    const previousAssessment = readCampaignAssessmentV2({ ...previous, schemaVersion: 2 });
    const manual = object(rawManualTests, ['disabled', 'pending', 'passed', 'failed', 'requestReferences']);
    const manualTests = { disabled: strings(manual.disabled), pending: strings(manual.pending), passed: strings(manual.passed), failed: strings(manual.failed), requestReferences: strings(manual.requestReferences) };
    const ids = [...manualTests.disabled, ...manualTests.pending, ...manualTests.passed, ...manualTests.failed];
    if (new Set(ids).size !== ids.length)
        throw new Error('Manual test statuses must be disjoint');
    if (ids.length > 0 && previousAssessment.reviewReferences.length === 0)
        throw new Error('Manual classification requires review references');
    if (manualTests.pending.length + manualTests.passed.length + manualTests.failed.length > 0 && manualTests.requestReferences.length === 0)
        throw new Error('Enabled manual tests require explicit user request references');
    if (manualTests.passed.length > 0 && previousAssessment.validationTags.length === 0)
        throw new Error('Passed manual tests require validation tags');
    return { ...previousAssessment, schemaVersion: 3, manualTests };
}
exports.CampaignAssessmentReaders = { V1: readCampaignAssessmentV1, V2: readCampaignAssessmentV2, V3: readCampaignAssessmentV3 };
function readCampaignAssessment(value) {
    if (!isRecord(value))
        throw new Error('Expected campaign assessment object');
    if (value.schemaVersion === 3)
        return readCampaignAssessmentV3(value);
    let previous;
    if (value.schemaVersion === 1) {
        const legacy = readCampaignAssessmentV1(value);
        previous = { ...legacy, schemaVersion: 2, complete: { O: legacy.complete.R, A: legacy.complete.A, T: legacy.complete.T, I: legacy.complete.I } };
    }
    else
        previous = readCampaignAssessmentV2(value);
    return { ...previous, schemaVersion: 3, manualTests: { disabled: [], pending: [], passed: [], failed: [], requestReferences: [] } };
}
function computeCampaignCompleteness(graph, assessment, commit, assessmentTag, findings = []) {
    const manualTests = assessment.schemaVersion === 3 ? assessment.manualTests : { disabled: [], pending: [], passed: [], failed: [], requestReferences: [] };
    const scoped = (0, traceability_graph_js_1.scopeTraceabilityGraph)(graph, assessment.requirementIds);
    const kindsById = new Map(scoped.entities.map(entity => [entity.id, entity.kind]));
    const byKind = (kind) => scoped.entities.filter(entity => entity.kind === kind).map(entity => entity.id).sort();
    const requirements = byKind('requirement');
    const obligations = byKind('obligation');
    const acceptances = byKind('acceptance');
    const expected = { O: requirements, A: obligations, T: acceptances, I: obligations };
    for (const coordinate of ['O', 'A', 'T', 'I']) {
        for (const id of assessment.complete[coordinate]) {
            if (!expected[coordinate].includes(id))
                throw new Error(`Assessment ${coordinate} ID is outside scope or has the wrong kind: ${id}`);
        }
    }
    const incoming = (id, kinds) => scoped.relationships
        .filter(edge => edge.target === id && kinds.includes(kindsById.get(edge.source) ?? ''))
        .map(edge => edge.source);
    for (const id of [...manualTests.disabled, ...manualTests.pending, ...manualTests.passed, ...manualTests.failed]) {
        if (kindsById.get(id) !== 'integration-test')
            throw new Error(`Manual test must identify an in-scope integration test: ${id}`);
    }
    const tests = (id) => incoming(id, ['unit-test', 'integration-test']);
    const disabledOnly = (id) => tests(id).length > 0 && tests(id).every(testId => manualTests.disabled.includes(testId));
    const implemented = (id) => incoming(id, ['implementation']).length > 0;
    const tested = (id) => (disabledOnly(id) || assessment.complete.T.includes(id)) && tests(id).length > 0
        && !tests(id).some(testId => manualTests.pending.includes(testId) || manualTests.failed.includes(testId))
        && scoped.relationships.filter(edge => edge.source === id).every(edge => implemented(edge.target));
    const unresolved = {
        O: requirements.filter(id => !assessment.complete.O.includes(id) || incoming(id, ['obligation']).length === 0),
        A: obligations.filter(id => !assessment.complete.A.includes(id) || incoming(id, ['acceptance']).length === 0),
        T: acceptances.filter(id => !tested(id)),
        I: obligations.filter(id => (!assessment.complete.I.includes(id) && !incoming(id, ['acceptance']).every(disabledOnly)) || !implemented(id) || !assessment.complete.A.includes(id)
            || incoming(id, ['acceptance']).length === 0 || !incoming(id, ['acceptance']).every(tested)),
    };
    const coverageStatistics = (ids, unresolvedIds, linked) => {
        const missingLink = ids.filter(id => !linked(id)).length;
        return { total: ids.length, missingLink, linkedUnresolved: unresolvedIds.length - missingLink, complete: ids.length - unresolvedIds.length };
    };
    return { campaign: assessment.campaign, commit, assessmentTag, requirementIds: [...assessment.requirementIds].sort(),
        vector: [findings.length, unresolved.O.length, unresolved.A.length, unresolved.T.length, unresolved.I.length], unresolved, manualTests,
        statistics: { T: coverageStatistics(acceptances, unresolved.T, id => incoming(id, ['unit-test', 'integration-test']).length > 0),
            I: coverageStatistics(obligations, unresolved.I, implemented) } };
}
function git(root, args) {
    return (0, node_child_process_1.execFileSync)('git', [...args], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}
function annotatedTag(root, name) {
    if (!name || name.startsWith('-') || /[\s~^:?*\[\\]/u.test(name))
        throw new Error(`Invalid tag name: ${name}`);
    const ref = `refs/tags/${name}`;
    const objectId = git(root, ['rev-parse', '--verify', ref]);
    if (git(root, ['cat-file', '-t', objectId]) !== 'tag')
        throw new Error(`Expected annotated tag: ${name}`);
    const text = git(root, ['cat-file', 'tag', objectId]);
    const separator = text.indexOf('\n\n');
    return { commit: git(root, ['rev-parse', `${objectId}^{commit}`]), contents: separator < 0 ? '' : text.slice(separator + 2) };
}
function runTraceabilityCompleteness(argv, cwd = process.cwd()) {
    let campaign;
    let assessmentTag;
    let json = false;
    let verbose = false;
    const requirementIds = [];
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--help') {
            process.stdout.write('Usage: ponytail traceability completeness [--campaign <name>] [--assessment-tag <tag> | --requirement <id> ...] [--json] [--verbose]\nDefault output includes the vector, T/I coverage and manual test statuses; --verbose adds unresolved IDs and findings. Progress is written to stderr, except with --json.\nV3 assessment tags classify manual integration tests: disabled by default, enabled only by explicit user request. Disabled manual tests require complete graph links, not passing execution credit.\nWithout an explicit tag, select the unique current-commit assessment tag for the campaign. Explicit tags assess their immutable target; explicit requirements assess HEAD. Working-tree edits are not included.\n');
            return null;
        }
        if (argument === '--verbose') {
            verbose = true;
            continue;
        }
        if (argument === '--json') {
            json = true;
            continue;
        }
        if (argument !== '--campaign' && argument !== '--assessment-tag' && argument !== '--requirement')
            throw new Error(`Unknown completeness argument: ${argument}`);
        const value = argv[++index];
        if (!value || value.startsWith('--'))
            throw new Error(`${argument} requires a value`);
        if (argument === '--campaign')
            campaign = campaignName(value);
        else if (argument === '--assessment-tag')
            assessmentTag = value;
        else
            requirementIds.push(value);
    }
    if (assessmentTag !== undefined && requirementIds.length > 0)
        throw new Error('Use the assessment scope or explicit requirements, not both');
    const progress = (0, index_progress_js_1.indexProgress)(process.stderr);
    const update = (completed, total, stage) => { if (!json)
        progress.update(completed, total, stage); };
    update(0, 1, 'Preparation');
    try {
        const root = node_fs_1.default.realpathSync(git(cwd, ['rev-parse', '--show-toplevel']));
        let commit = git(root, ['rev-parse', 'HEAD']);
        let assessment;
        if (requirementIds.length > 0) {
            if (campaign === undefined)
                throw new Error('Unassessed scope requires --campaign');
            assessment = readCampaignAssessment({ schemaVersion: 3, campaign, requirementIds, complete: { O: [], A: [], T: [], I: [] }, reviewReferences: [], validationTags: [], manualTests: { disabled: [], pending: [], passed: [], failed: [], requestReferences: [] } });
        }
        else {
            if (assessmentTag === undefined) {
                const pattern = campaign === undefined ? 'ponytail/completeness/*' : `ponytail/completeness/${campaign}/*`;
                const tags = git(root, ['tag', '--points-at', 'HEAD', '--list', pattern]).split('\n').filter(Boolean);
                if (tags.length === 0)
                    throw new Error('No campaign assessment tag targets HEAD. Provide --campaign and --requirement IDs for an unassessed scope, or --assessment-tag to inspect an existing assessment.');
                if (tags.length > 1)
                    throw new Error(`Expected exactly one campaign assessment at HEAD; found ${tags.length}: ${tags.join(', ')}. Use --campaign for distinct campaigns. For duplicate assessments of the same campaign and commit, reconcile the review claims into one tag, replace its annotation and remove the obsolete assessment tags; never select by timestamp.`);
                assessmentTag = tags[0];
            }
            if (assessmentTag === undefined)
                throw new Error('Missing assessment tag');
            const tag = annotatedTag(root, assessmentTag);
            commit = tag.commit;
            const payload = (0, lossless_json_1.parse)(tag.contents, null, token => {
                if (token !== '1' && token !== '2' && token !== '3')
                    throw new Error(`Unsupported assessment number: ${token}`);
                return Number(token);
            });
            assessment = readCampaignAssessment(payload);
            if (campaign !== undefined && assessment.campaign !== campaign)
                throw new Error('Assessment campaign does not match --campaign');
            for (const name of assessment.validationTags) {
                const validation = annotatedTag(root, name);
                git(root, ['merge-base', '--is-ancestor', validation.commit, commit]);
                if (!validation.contents)
                    throw new Error(`Empty validation tag: ${name}`);
            }
        }
        const configurationPath = node_path_1.default.join(root, '.agents/config/project/traceability.json');
        const configurationFile = '.agents/config/project/traceability.json';
        const configurationEntry = git(root, ['ls-tree', commit, '--', configurationFile]);
        if (!/^100(?:644|755) blob /u.test(configurationEntry))
            throw new Error('Traceability configuration must be a regular committed file');
        const configurationText = git(root, ['show', `${commit}:${configurationFile}`]);
        const configuration = (0, traceability_project_js_1.readTraceabilityConfigurationV5)((0, traceability_v5_js_1.parseTraceabilityV5)(configurationText));
        update(1, 1, 'Preparation');
        update(0, 1, 'Inventory');
        const project = (0, traceability_project_js_1.discoverTraceabilityProject)(configuration, configurationPath, root, (completed, total) => update(completed, total, 'Sources'), commit);
        update(0, 1, 'Assessment');
        const failures = project.projectFindings.filter(finding => finding.code !== 'empty-scope');
        if (failures.length > 0)
            throw new Error(`Cannot assess malformed canonical traceability sources: ${failures.map(finding => `${finding.path}:${finding.line} ${finding.code}: ${finding.message}`).join('; ')}`);
        const result = {
            ...computeCampaignCompleteness(project.graph, assessment, commit, assessmentTag ?? null, project.discoveryFindings),
            findings: project.discoveryFindings,
            completionBlocked: project.discoveryFindings.length > 0,
        };
        update(1, 1, 'Assessment');
        if (json)
            process.stdout.write(`${JSON.stringify(result)}\n`);
        else {
            process.stdout.write(`Campaign completeness vector (F,O,A,T,I): (${result.vector.join(',')})\n`);
            for (const coordinate of ['T', 'I']) {
                const coverageStatistics = result.statistics[coordinate];
                process.stdout.write(`${coordinate} coverage: ${coverageStatistics.total} total; ${coverageStatistics.missingLink} no linked artifact; ${coverageStatistics.linkedUnresolved} linked but not accepted complete; ${coverageStatistics.complete} accepted complete\n`);
            }
            process.stdout.write('Links establish presence only; unresolved linked coverage may need repair, execution, review or assessment.\n');
            process.stdout.write(`Manual tests: ${result.manualTests.disabled.length} disabled/not run; ${result.manualTests.pending.length} enabled/pending; ${result.manualTests.passed.length} passed; ${result.manualTests.failed.length} failed\n`);
            if (result.completionBlocked && !verbose)
                process.stderr.write(`O/A/T/I are provisional: completion blocked by ${result.findings.length} annotation findings; use --verbose for details.\n`);
            if (verbose) {
                process.stdout.write(`Campaign: ${result.campaign}; commit: ${commit}; assessment: ${result.assessmentTag ?? 'none (all adequacy unknown)'}\n`);
                for (const coordinate of ['O', 'A', 'T', 'I'])
                    process.stdout.write(`${coordinate} unresolved: ${result.unresolved[coordinate].join(', ') || 'none'}\n`);
                process.stdout.write(`Annotation findings blocking completion: ${result.findings.length}\n`);
                for (const finding of result.findings)
                    process.stdout.write(`${finding.path}:${finding.line} ${finding.code}: ${finding.message}\n`);
                process.stdout.write('Based on declared review and validation applicability; zero is provisional until all workers are DONE and independent final QA passes.\n');
            }
        }
        return result;
    }
    finally {
        progress.stop();
    }
}
