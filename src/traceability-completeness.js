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
exports.CampaignAssessmentReaders = { V1: readCampaignAssessmentV1, V2: readCampaignAssessmentV2 };
function readCampaignAssessment(value) {
    if (!isRecord(value))
        throw new Error('Expected campaign assessment object');
    if (value.schemaVersion === 1) {
        const legacy = readCampaignAssessmentV1(value);
        return { ...legacy, schemaVersion: 2, complete: { O: legacy.complete.R, A: legacy.complete.A, T: legacy.complete.T, I: legacy.complete.I } };
    }
    return readCampaignAssessmentV2(value);
}
function computeCampaignCompleteness(graph, assessment, commit, assessmentTag) {
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
    const implemented = (id) => incoming(id, ['implementation']).length > 0;
    const tested = (id) => assessment.complete.T.includes(id) && incoming(id, ['unit-test', 'integration-test']).length > 0
        && scoped.relationships.filter(edge => edge.source === id).every(edge => implemented(edge.target));
    const unresolved = {
        O: requirements.filter(id => !assessment.complete.O.includes(id) || incoming(id, ['obligation']).length === 0),
        A: obligations.filter(id => !assessment.complete.A.includes(id) || incoming(id, ['acceptance']).length === 0),
        T: acceptances.filter(id => !tested(id)),
        I: obligations.filter(id => !assessment.complete.I.includes(id) || !implemented(id) || !assessment.complete.A.includes(id)
            || incoming(id, ['acceptance']).length === 0 || !incoming(id, ['acceptance']).every(tested)),
    };
    return { campaign: assessment.campaign, commit, assessmentTag, requirementIds: [...assessment.requirementIds].sort(),
        vector: [unresolved.O.length, unresolved.A.length, unresolved.T.length, unresolved.I.length], unresolved };
}
function git(root, args) {
    return (0, node_child_process_1.execFileSync)('git', [...args], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}
function requireVisibleIndex(root) {
    if (git(root, ['ls-files', '-v', '-z']).split('\0').some(entry => /^[a-zS] /u.test(entry))) {
        throw new Error('Completeness requires an index without assume-unchanged or skip-worktree flags; hidden inputs cannot be assessed');
    }
}
function annotatedTag(root, name) {
    if (!name || name.startsWith('-') || /[\s~^:?*\[\\]/u.test(name))
        throw new Error(`Invalid tag name: ${name}`);
    const ref = `refs/tags/${name}`;
    if (git(root, ['cat-file', '-t', ref]) !== 'tag')
        throw new Error(`Expected annotated tag: ${name}`);
    return { commit: git(root, ['rev-parse', `${ref}^{commit}`]), contents: git(root, ['for-each-ref', '--format=%(contents)', ref]) };
}
function committedInputs(root, commit, inputs) {
    const paths = [...inputs.keys()];
    if (paths.some(file => /[\r\n]/u.test(file)))
        throw new Error('Unsupported newline in traceability input path');
    const maxBuffer = [...inputs].reduce((bytes, [file, text]) => bytes + Buffer.byteLength(text) + Buffer.byteLength(file) + 128, 1024);
    const output = (0, node_child_process_1.execFileSync)('git', ['cat-file', '--batch'], { cwd: root, input: paths.map(file => `${commit}:${file}\n`).join(''), maxBuffer });
    const committed = new Map();
    let offset = 0;
    for (const file of paths) {
        const end = output.indexOf(10, offset);
        const header = output.subarray(offset, end).toString('utf8');
        const match = /^[0-9a-f]+ blob ([0-9]+)$/u.exec(header);
        const size = Number(match?.[1]);
        if (end < offset || !match || !Number.isSafeInteger(size) || size < 0)
            throw new Error(`Traceability input is missing from assessed commit: ${file}`);
        offset = end + 1;
        const content = output.subarray(offset, offset + size);
        if (!content.equals(Buffer.from(inputs.get(file) ?? '', 'utf8')))
            throw new Error(`Traceability input differs from assessed commit: ${file}`);
        committed.set(file, content);
        offset += size + 1;
    }
    return committed;
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
            process.stdout.write('Usage: ponytail traceability completeness [--campaign <name>] [--assessment-tag <tag> | --requirement <id> ...] [--json] [--verbose]\nDefault output is the vector only; --verbose includes unresolved IDs and findings. Progress is written to stderr, except with --json.\nWithout an explicit tag, select the unique current-commit assessment tag for the campaign. Explicit requirements inspect an unassessed scope.\n');
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
        const commit = git(root, ['rev-parse', 'HEAD']);
        requireVisibleIndex(root);
        if (git(root, ['status', '--porcelain', '--untracked-files=all']))
            throw new Error('Completeness requires a clean worktree so source and assessment identify the same commit');
        let assessment;
        if (requirementIds.length > 0) {
            if (campaign === undefined)
                throw new Error('Unassessed scope requires --campaign');
            assessment = readCampaignAssessmentV2({ schemaVersion: 2, campaign, requirementIds, complete: { O: [], A: [], T: [], I: [] }, reviewReferences: [], validationTags: [] });
        }
        else {
            if (assessmentTag === undefined) {
                const pattern = campaign === undefined ? 'ponytail/completeness/*' : `ponytail/completeness/${campaign}/*`;
                const tags = git(root, ['tag', '--points-at', 'HEAD', '--list', pattern]).split('\n').filter(Boolean);
                if (tags.length !== 1)
                    throw new Error('Select exactly one current assessment with --assessment-tag, or provide --campaign and --requirement IDs for an unassessed scope');
                assessmentTag = tags[0];
            }
            if (assessmentTag === undefined)
                throw new Error('Missing assessment tag');
            const tag = annotatedTag(root, assessmentTag);
            if (tag.commit !== commit)
                throw new Error('Assessment tag is stale: it must target HEAD');
            const payload = (0, lossless_json_1.parse)(tag.contents, null, token => {
                if (token !== '1' && token !== '2')
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
        const configurationText = node_fs_1.default.readFileSync(configurationPath, 'utf8');
        const configuration = (0, traceability_v5_js_1.loadTraceabilityV5)((0, traceability_v5_js_1.parseTraceabilityV5)(configurationText), configurationPath, root);
        update(1, 1, 'Preparation');
        update(0, 1, 'Inventory');
        const project = (0, traceability_project_js_1.discoverTraceabilityProject)(configuration, configurationPath, root, (completed, total) => update(completed, total, 'Sources'));
        update(0, 1, 'Commit check');
        const inputs = new Map(project.sources.map(source => [source.path, source.text]));
        inputs.set('.agents/config/project/traceability.json', configurationText);
        const committed = committedInputs(root, commit, inputs);
        update(1, 1, 'Commit check');
        update(0, 1, 'Assessment');
        const failures = project.projectFindings.filter(finding => finding.code !== 'empty-scope');
        if (failures.length > 0)
            throw new Error(`Cannot assess malformed canonical traceability sources: ${failures.map(finding => `${finding.path}:${finding.line} ${finding.code}: ${finding.message}`).join('; ')}`);
        const result = {
            ...computeCampaignCompleteness(project.graph, assessment, commit, assessmentTag ?? null),
            findings: project.discoveryFindings,
            completionBlocked: project.discoveryFindings.length > 0,
        };
        update(1, 1, 'Assessment');
        update(0, committed.size, 'Verify');
        requireVisibleIndex(root);
        let verified = 0;
        for (const [file, content] of committed) {
            if (!node_fs_1.default.readFileSync(node_path_1.default.join(root, file)).equals(content))
                throw new Error(`Traceability input changed during assessment: ${file}`);
            update(++verified, committed.size, 'Verify');
        }
        if (git(root, ['rev-parse', 'HEAD']) !== commit || git(root, ['status', '--porcelain', '--untracked-files=all']))
            throw new Error('Repository changed during completeness assessment');
        if (json)
            process.stdout.write(`${JSON.stringify(result)}\n`);
        else {
            process.stdout.write(`Campaign completeness vector (O,A,T,I): (${result.vector.join(',')})\n`);
            if (result.completionBlocked && !verbose)
                process.stderr.write(`Completion blocked by ${result.findings.length} annotation findings; use --verbose for details.\n`);
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
