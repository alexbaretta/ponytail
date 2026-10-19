#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/semantic-rebase.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticRebaseRunReaders = exports.SemanticRebaseSelectionReaders = exports.SemanticRebaseAnalysisReaders = void 0;
exports.readSemanticRebaseAnalysisV1 = readSemanticRebaseAnalysisV1;
exports.readSemanticRebaseAnalysisV2 = readSemanticRebaseAnalysisV2;
exports.analyzeSemanticRebase = analyzeSemanticRebase;
exports.readSemanticRebaseSelectionV1 = readSemanticRebaseSelectionV1;
exports.startSemanticRebase = startSemanticRebase;
exports.continueSemanticRebase = continueSemanticRebase;
exports.semanticRebaseStatus = semanticRebaseStatus;
exports.abortSemanticRebase = abortSemanticRebase;
exports.main = main;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const ANALYSIS_FILE = 'analysis.json';
const RUN_FILE = 'run.json';
const REVIEW_FILE = 'review.diff';
const RESIDUAL_FILE = 'residual.diff';
function fail(message, status = 2) { const error = new Error(message); Object.assign(error, { status }); throw error; }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys, label) {
    const actual = Object.keys(value);
    if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(value, key)))
        fail(`${label} must contain exactly ${keys.join(', ')}`);
}
function stringValue(value, label) { if (typeof value !== 'string' || value.length === 0)
    fail(`${label} must be a nonempty string`); return value; }
function integerValue(value, label) { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    fail(`${label} must be a nonnegative integer`); return value; }
function stringArray(value, label) { if (!Array.isArray(value))
    fail(`${label} must be an array`); const result = value.map(item => stringValue(item, label)); if (new Set(result).size !== result.length)
    fail(`${label} must be unique`); return result; }
function sha256(value) { return node_crypto_1.default.createHash('sha256').update(value).digest('hex'); }
function git(args, options = {}) {
    const result = (0, node_child_process_1.spawnSync)('git', args, { encoding: 'utf8', input: options.input, env: options.env });
    if (result.error)
        fail(`git ${args[0] ?? ''} failed: ${result.error.message}`);
    if (!options.allowFailure && result.status !== 0)
        fail((result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim(), 1);
    return result;
}
function gitText(args) { return git(args).stdout.trim(); }
function sourceBranch() {
    const result = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true });
    if (result.status === 1)
        return null;
    if (result.status !== 0)
        fail(result.stderr.trim() || 'cannot determine source branch', 1);
    return result.stdout.trim();
}
function repositoryRoot() { return node_fs_1.default.realpathSync(gitText(['rev-parse', '--show-toplevel'])); }
function gitDirectory() { return node_fs_1.default.realpathSync(gitText(['rev-parse', '--absolute-git-dir'])); }
function stateDirectory() { return node_path_1.default.join(gitDirectory(), 'ponytail-semantic-rebase'); }
function statePath(name) { return node_path_1.default.join(stateDirectory(), name); }
function writeAtomic(file, text) { node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.tmp`; node_fs_1.default.writeFileSync(temporary, text, { mode: 0o600 }); node_fs_1.default.renameSync(temporary, file); }
function canonicalAnalysis(value) { return JSON.stringify(value); }
function encodeAnalysis(value) { return { ...value, analysisDigest: sha256(canonicalAnalysis(value)) }; }
function changeValue(value) {
    if (!record(value))
        fail('analysis change must be an object');
    exactKeys(value, ['id', 'side', 'kind', 'oldPath', 'newPath', 'oldStart', 'oldCount', 'newStart', 'newCount', 'patch'], 'analysis change');
    const side = stringValue(value.side, 'change side');
    if (side !== 'source' && side !== 'target')
        fail('unsupported change side');
    const kind = stringValue(value.kind, 'change kind');
    if (kind !== 'hunk' && kind !== 'file')
        fail('unsupported change kind');
    return { id: stringValue(value.id, 'change id'), side, kind, oldPath: stringValue(value.oldPath, 'old path'), newPath: stringValue(value.newPath, 'new path'), oldStart: integerValue(value.oldStart, 'old start'), oldCount: integerValue(value.oldCount, 'old count'), newStart: integerValue(value.newStart, 'new start'), newCount: integerValue(value.newCount, 'new count'), patch: stringValue(value.patch, 'change patch') };
}
function analysisValue(value, schemaVersion) {
    if (!record(value))
        fail('analysis must be an object');
    exactKeys(value, ['schemaVersion', 'analysisDigest', 'repositoryRoot', 'gitDirectory', 'sourceBranch', 'sourceTip', 'target', 'targetTip', 'mergeBase', 'sourceCommits', 'targetChanges', 'sourceChanges'], 'analysis V1');
    if (value.schemaVersion !== schemaVersion)
        fail('unsupported semantic rebase analysis schemaVersion');
    const targetChanges = Array.isArray(value.targetChanges) ? value.targetChanges.map(changeValue) : fail('targetChanges must be an array');
    const sourceChanges = Array.isArray(value.sourceChanges) ? value.sourceChanges.map(changeValue) : fail('sourceChanges must be an array');
    const analysis = { schemaVersion, analysisDigest: stringValue(value.analysisDigest, 'analysis digest'), repositoryRoot: stringValue(value.repositoryRoot, 'repository root'), gitDirectory: stringValue(value.gitDirectory, 'Git directory'), sourceBranch: schemaVersion === 2 && value.sourceBranch === null ? null : stringValue(value.sourceBranch, 'source branch'), sourceTip: stringValue(value.sourceTip, 'source tip'), target: stringValue(value.target, 'target'), targetTip: stringValue(value.targetTip, 'target tip'), mergeBase: stringValue(value.mergeBase, 'merge base'), sourceCommits: stringArray(value.sourceCommits, 'source commits'), targetChanges, sourceChanges };
    const { analysisDigest, ...payload } = analysis;
    if (analysisDigest !== sha256(canonicalAnalysis(payload)))
        fail('analysis digest mismatch');
    return { ...analysis, schemaVersion: 2 };
}
function readSemanticRebaseAnalysisV1(value) { return analysisValue(value, 1); }
function readSemanticRebaseAnalysisV2(value) { return analysisValue(value, 2); }
exports.SemanticRebaseAnalysisReaders = { V1: readSemanticRebaseAnalysisV1, V2: readSemanticRebaseAnalysisV2 };
exports.SemanticRebaseSelectionReaders = { V1: readSemanticRebaseSelectionV1 };
function stripPrefixPath(line) { const value = line.slice(4); return value === '/dev/null' ? value : value.replace(/^[ab]\//u, ''); }
function parseRange(text) { const [startText, countText] = text.split(','); const start = Number(startText); const count = countText === undefined ? 1 : Number(countText); if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) || start < 0 || count < 0)
    fail(`invalid diff range: ${text}`); return [start, count]; }
function parseDiff(text) {
    if (text.length === 0)
        return [];
    const lines = text.replace(/\n$/u, '').split('\n');
    const files = [];
    let index = 0;
    while (index < lines.length) {
        if (!lines[index]?.startsWith('diff --git '))
            fail('unexpected aggregate diff preamble');
        const header = [];
        const body = [];
        const hunks = [];
        let oldPath = '';
        let newPath = '';
        while (index < lines.length && !lines[index]?.startsWith('@@ ') && !((lines[index]?.startsWith('diff --git ')) && header.length > 0)) {
            const line = lines[index];
            if (line === undefined)
                break;
            header.push(line);
            if (line.startsWith('--- '))
                oldPath = stripPrefixPath(line);
            if (line.startsWith('+++ '))
                newPath = stripPrefixPath(line);
            index++;
        }
        const diffHeader = header[0] ?? '';
        const match = /^diff --git a\/(.*) b\/(.*)$/u.exec(diffHeader);
        if (!oldPath)
            oldPath = match?.[1] ?? '<unknown>';
        if (!newPath)
            newPath = match?.[2] ?? oldPath;
        while (index < lines.length && !lines[index]?.startsWith('diff --git ')) {
            const line = lines[index];
            if (line === undefined)
                break;
            if (line.startsWith('@@ ')) {
                const hunkLines = [line];
                const range = /^@@ -(\d+(?:,\d+)?) \+(\d+(?:,\d+)?) @@/u.exec(line);
                if (!range?.[1] || !range[2])
                    fail(`invalid hunk header: ${line}`);
                index++;
                while (index < lines.length && !lines[index]?.startsWith('@@ ') && !lines[index]?.startsWith('diff --git ')) {
                    const hunkLine = lines[index];
                    if (hunkLine === undefined)
                        break;
                    hunkLines.push(hunkLine);
                    index++;
                }
                const [oldStart, oldCount] = parseRange(range[1]);
                const [newStart, newCount] = parseRange(range[2]);
                hunks.push({ oldStart, oldCount, newStart, newCount, lines: hunkLines });
                body.push(...hunkLines);
            }
            else {
                body.push(line);
                index++;
            }
        }
        files.push({ header, oldPath, newPath, hunks, body });
    }
    return files;
}
function changes(side, text) {
    const prefix = side === 'source' ? 'S' : 'T';
    const result = [];
    for (const file of parseDiff(text)) {
        if (file.hunks.length === 0) {
            result.push({ id: '', side, kind: 'file', oldPath: file.oldPath, newPath: file.newPath, oldStart: 0, oldCount: 0, newStart: 0, newCount: 0, patch: [...file.header, ...file.body].join('\n') + '\n' });
        }
        else
            for (const hunk of file.hunks)
                result.push({ id: '', side, kind: 'hunk', oldPath: file.oldPath, newPath: file.newPath, oldStart: hunk.oldStart, oldCount: hunk.oldCount, newStart: hunk.newStart, newCount: hunk.newCount, patch: [...file.header, ...hunk.lines].join('\n') + '\n' });
    }
    return result.map((item, index) => ({ ...item, id: `${prefix}${String(index + 1).padStart(4, '0')}` }));
}
function aggregateDiff(base, tip, context = 3) { return git(['diff', '--binary', '--find-renames', '--no-ext-diff', '--no-color', `--unified=${context}`, base, tip]).stdout; }
function renderReview(analysis) { const section = (title, items) => `${title}\n${'='.repeat(title.length)}\n` + items.map(item => `\n[${item.id}] ${item.kind} ${item.oldPath} -> ${item.newPath} -${item.oldStart},${item.oldCount} +${item.newStart},${item.newCount}\n${item.patch}`).join(''); return `PONYTAIL SEMANTIC REBASE ANALYSIS V${analysis.schemaVersion}\nanalysis ${analysis.analysisDigest}\nmerge-base ${analysis.mergeBase}\ntarget ${analysis.targetTip}\nsource ${analysis.sourceTip}\nsource-commits ${analysis.sourceCommits.join(' ')}\n\n${section('TARGET FINAL CHANGES', analysis.targetChanges)}\n${section('SOURCE FINAL CHANGES', analysis.sourceChanges)}`; }
function ensureNoRebase() { if (node_fs_1.default.existsSync(node_path_1.default.join(gitDirectory(), 'rebase-merge')) || node_fs_1.default.existsSync(node_path_1.default.join(gitDirectory(), 'rebase-apply')))
    fail('a Git rebase is already active'); }
function ensureClean() { if (gitText(['status', '--porcelain=v1', '--untracked-files=normal']).length > 0)
    fail('semantic rebase requires a clean worktree'); }
function resolveCommit(revision) { if (revision.startsWith('-'))
    fail('revision must not begin with -'); return gitText(['rev-parse', '--verify', `${revision}^{commit}`]); }
function writeAnalysis(analysis) { writeAtomic(statePath(ANALYSIS_FILE), `${JSON.stringify(analysis, null, 2)}\n`); }
function readAnalysis() { if (!node_fs_1.default.existsSync(statePath(ANALYSIS_FILE)))
    fail('run ponytail rebase diff first'); const value = JSON.parse(node_fs_1.default.readFileSync(statePath(ANALYSIS_FILE), 'utf8')); return record(value) && value.schemaVersion === 1 ? readSemanticRebaseAnalysisV1(value) : readSemanticRebaseAnalysisV2(value); }
function validateFrozen(analysis, requireSourceTip) { if (repositoryRoot() !== analysis.repositoryRoot || gitDirectory() !== analysis.gitDirectory)
    fail('analysis belongs to another worktree'); if (resolveCommit(analysis.target) !== analysis.targetTip)
    fail('target changed after analysis; rerun diff'); if (gitText(['merge-base', analysis.sourceTip, analysis.targetTip]) !== analysis.mergeBase)
    fail('merge base changed after analysis'); if (requireSourceTip && resolveCommit('HEAD') !== analysis.sourceTip)
    fail('source tip changed after analysis'); const branch = sourceBranch(); if (requireSourceTip && branch !== analysis.sourceBranch)
    fail('source branch changed after analysis'); }
function analyzeSemanticRebase(target) { ensureNoRebase(); ensureClean(); const root = repositoryRoot(); const directory = gitDirectory(); const branch = sourceBranch(); const sourceTip = resolveCommit('HEAD'); const targetTip = resolveCommit(target); const mergeBase = gitText(['merge-base', sourceTip, targetTip]); const sourceCommits = gitText(['rev-list', '--reverse', '--topo-order', `${mergeBase}..${sourceTip}`]).split('\n').filter(Boolean); if (sourceCommits.length === 0)
    fail('source branch has no commits to replay'); const parents = sourceCommits.map(commit => gitText(['rev-list', '--parents', '-n', '1', commit]).split(' ')); if (parents.some(parts => parts.length !== 2))
    fail('merge commits are not supported by semantic rebase'); const targetChanges = changes('target', aggregateDiff(mergeBase, targetTip)); const sourceChanges = changes('source', aggregateDiff(mergeBase, sourceTip)); const analysis = encodeAnalysis({ schemaVersion: 2, repositoryRoot: root, gitDirectory: directory, sourceBranch: branch, sourceTip, target, targetTip, mergeBase, sourceCommits, targetChanges, sourceChanges }); writeAnalysis(analysis); const review = renderReview(analysis); writeAtomic(statePath(REVIEW_FILE), review); return analysis; }
function readSemanticRebaseSelectionV1(text, analysis) { if (typeof text !== 'string')
    fail('selection must be text'); const lines = text.split(/\r?\n/u).filter(line => line.trim().length > 0); const header = /^ponytail-semantic-rebase-selection-v1 ([a-f0-9]{64})$/u.exec(lines.shift() ?? ''); if (!header?.[1])
    fail('selection requires a V1 analysis header'); const entries = lines.map((line, index) => { const match = /^(S\d{4})\s+(-|T\d{4}(?:,T\d{4})*)\s*(?:\|\s*(.*))?$/u.exec(line); if (!match?.[1] || !match[2])
    fail(`malformed selection line ${index + 2}`); return { sourceId: match[1], targetIds: match[2] === '-' ? [] : match[2].split(','), reason: match[3] ?? '' }; }); if (new Set(entries.map(entry => entry.sourceId)).size !== entries.length)
    fail('selection contains duplicate source IDs'); const selection = { schemaVersion: 1, analysisDigest: header[1], entries }; if (analysis) {
    if (selection.analysisDigest !== analysis.analysisDigest)
        fail('selection belongs to another analysis');
    const sourceIds = new Set(analysis.sourceChanges.map(change => change.id));
    const targetIds = new Set(analysis.targetChanges.map(change => change.id));
    for (const entry of entries) {
        if (!sourceIds.has(entry.sourceId))
            fail(`unknown source change: ${entry.sourceId}`);
        for (const id of entry.targetIds)
            if (!targetIds.has(id))
                fail(`unknown target change: ${id}`);
    }
} return selection; }
function selectionDigest(selection) { return sha256(JSON.stringify(selection)); }
function perCommitFiles(commit) { const parent = gitText(['rev-parse', `${commit}^`]); return parseDiff(aggregateDiff(parent, commit, 0)); }
function intersects(start, count, hunkStart, hunkCount) { const end = start + Math.max(count, 1); const hunkEnd = hunkStart + Math.max(hunkCount, 1); return start < hunkEnd && hunkStart < end; }
function contributingCommits(analysis, change) {
    let tracked = { path: change.newPath === '/dev/null' ? change.oldPath : change.newPath, start: change.newStart, count: change.newCount };
    const contributors = new Set();
    let ambiguous = change.kind === 'file' || change.newCount === 0 || change.oldPath === '/dev/null';
    const commits = [...analysis.sourceCommits].reverse();
    for (const commit of commits) {
        const files = perCommitFiles(commit);
        const file = files.find(item => item.newPath === tracked.path || item.oldPath === tracked.path);
        if (!file)
            continue;
        if (ambiguous) {
            contributors.add(commit);
            if (file.newPath === tracked.path && file.oldPath !== file.newPath && file.oldPath !== '/dev/null')
                tracked = { ...tracked, path: file.oldPath };
            continue;
        }
        const ordered = [...file.hunks].reverse();
        for (const hunk of ordered) {
            if (intersects(tracked.start, tracked.count, hunk.newStart, hunk.newCount)) {
                contributors.add(commit);
                tracked = { path: tracked.path, start: hunk.oldStart, count: Math.max(hunk.oldCount, 1) };
            }
            else if (tracked.start >= hunk.newStart + hunk.newCount)
                tracked = { ...tracked, start: Math.max(0, tracked.start + hunk.oldCount - hunk.newCount) };
        }
        if (file.newPath === tracked.path && file.oldPath !== file.newPath && file.oldPath !== '/dev/null')
            tracked = { ...tracked, path: file.oldPath };
    }
    if (contributors.size === 0) {
        ambiguous = true;
        tracked = { path: change.newPath === '/dev/null' ? change.oldPath : change.newPath, start: 0, count: 0 };
        for (const commit of commits) {
            const file = perCommitFiles(commit).find(item => item.newPath === tracked.path || item.oldPath === tracked.path);
            if (file) {
                contributors.add(commit);
                if (file.newPath === tracked.path && file.oldPath !== file.newPath && file.oldPath !== '/dev/null')
                    tracked = { ...tracked, path: file.oldPath };
            }
        }
    }
    return analysis.sourceCommits.filter(commit => contributors.has(commit));
}
function writeRun(run) { writeAtomic(statePath(RUN_FILE), `${JSON.stringify(run, null, 2)}\n`); }
function stringArrayRecord(value, label) { if (!record(value))
    fail(`${label} must be an object`); const result = {}; for (const [id, items] of Object.entries(value))
    result[id] = stringArray(items, `${label} ${id}`); return result; }
function runValue(value, schemaVersion) { if (!record(value))
    fail('run state must be an object'); exactKeys(value, ['schemaVersion', 'analysisDigest', 'selectionDigest', 'originalTip', 'sourceBranch', 'targetTip', 'contributors', 'selectionTargets', 'plannedCommits', 'reviewedCommits', 'status', 'residualPath'], 'run V1'); if (value.schemaVersion !== schemaVersion)
    fail('unsupported run schemaVersion'); const contributors = stringArrayRecord(value.contributors, 'contributors'); const selectionTargets = stringArrayRecord(value.selectionTargets, 'selection targets'); const status = stringValue(value.status, 'run status'); if (status !== 'prepared' && status !== 'running' && status !== 'residual' && status !== 'completed')
    fail('invalid run status'); const residualPath = value.residualPath === null ? null : stringValue(value.residualPath, 'residual path'); return { schemaVersion: 2, analysisDigest: stringValue(value.analysisDigest, 'analysis digest'), selectionDigest: stringValue(value.selectionDigest, 'selection digest'), originalTip: stringValue(value.originalTip, 'original tip'), sourceBranch: schemaVersion === 2 && value.sourceBranch === null ? null : stringValue(value.sourceBranch, 'source branch'), targetTip: stringValue(value.targetTip, 'target tip'), contributors, selectionTargets, plannedCommits: stringArray(value.plannedCommits, 'planned commits'), reviewedCommits: stringArray(value.reviewedCommits, 'reviewed commits'), status, residualPath }; }
function readSemanticRebaseRunV1(value) { return runValue(value, 1); }
function readSemanticRebaseRunV2(value) { return runValue(value, 2); }
exports.SemanticRebaseRunReaders = { V1: readSemanticRebaseRunV1, V2: readSemanticRebaseRunV2 };
function readRun() { if (!node_fs_1.default.existsSync(statePath(RUN_FILE)))
    fail('no semantic rebase run is prepared'); const value = JSON.parse(node_fs_1.default.readFileSync(statePath(RUN_FILE), 'utf8')); return record(value) && value.schemaVersion === 1 ? readSemanticRebaseRunV1(value) : readSemanticRebaseRunV2(value); }
function shellQuote(value) { return `'${value.replace(/'/gu, "'\\''")}'`; }
function rebaseActive() { return node_fs_1.default.existsSync(node_path_1.default.join(gitDirectory(), 'rebase-merge')) || node_fs_1.default.existsSync(node_path_1.default.join(gitDirectory(), 'rebase-apply')); }
function currentStop() {
    const done = node_path_1.default.join(gitDirectory(), 'rebase-merge', 'done');
    if (!node_fs_1.default.existsSync(done))
        return null;
    const commands = node_fs_1.default.readFileSync(done, 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const pick = commands.filter(line => /^(?:pick|edit) [a-f0-9]+/u.test(line)).at(-1);
    const match = /^(?:pick|edit) ([a-f0-9]+)/u.exec(pick ?? '');
    return match?.[1] ? { originalCommit: resolveCommit(match[1]), atBreak: commands.at(-1) === 'break' } : null;
}
function pathsForCommit(commit) { return [...new Set(perCommitFiles(commit).flatMap(file => [file.oldPath, file.newPath]).filter(item => item !== '/dev/null'))]; }
function dossier(analysis, run) { if (run.status === 'completed') {
    if (git(['merge-base', '--is-ancestor', run.targetTip, 'HEAD'], { allowFailure: true }).status !== 0)
        fail('completed replay does not contain the frozen target');
    const missing = run.plannedCommits.filter(commit => !run.reviewedCommits.includes(commit));
    if (missing.length > 0)
        fail(`completed replay missed planned stops: ${missing.join(' ')}`);
    const rangeDiff = gitText(['range-diff', `${analysis.mergeBase}..${run.originalTip}`, `${run.targetTip}..HEAD`]);
    return `semantic rebase complete\ntarget ${run.targetTip}\nhead ${resolveCommit('HEAD')}\nreviewed ${run.reviewedCommits.join(' ') || '-'}\nrange-diff\n${rangeDiff}\n`;
} const original = currentStop()?.originalCommit; if (!original)
    return `semantic rebase ${run.status}\n`; const sourceIds = Object.entries(run.contributors).filter(([, commits]) => commits.includes(original)).map(([id]) => id); const selected = analysis.sourceChanges.filter(change => sourceIds.includes(change.id)); const targetIds = new Set(sourceIds.flatMap(id => run.selectionTargets[id] ?? [])); const targetContext = analysis.targetChanges.filter(change => targetIds.has(change.id)); return `semantic rebase stop\noriginal-commit ${original}\nplanned ${run.plannedCommits.includes(original) ? 'yes' : 'no'}\nsource-changes ${sourceIds.join(' ') || '-'}\nallowed-paths ${[...new Set([...selected.flatMap(change => [change.oldPath, change.newPath]), ...pathsForCommit(original)])].filter(item => item !== '/dev/null').join(' ')}\ntarget-context ${[...targetIds].join(' ') || '-'}\n` + selected.map(change => `\n[${change.id}]\n${change.patch}`).join('') + targetContext.map(change => `\n[${change.id}]\n${change.patch}`).join(''); }
function sequenceEditor(todoPath) { const run = readRun(); const planned = new Set(run.plannedCommits); const lines = node_fs_1.default.readFileSync(todoPath, 'utf8').split('\n').flatMap(line => { const match = /^(pick) ([a-f0-9]+)(.*)$/u.exec(line); if (!match?.[2])
    return [line]; const full = resolveCommit(match[2]); return planned.has(full) ? [line, 'break'] : [line]; }); const text = lines.join('\n'); writeAtomic(statePath('todo'), text); node_fs_1.default.writeFileSync(todoPath, text); }
function launchRebase(analysis, run) { const editor = statePath('sequence-editor.sh'); writeAtomic(editor, `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(node_path_1.default.resolve(process.argv[1] ?? ''))} sequence-editor "$1"\n`); node_fs_1.default.chmodSync(editor, 0o700); const env = { ...process.env, GIT_SEQUENCE_EDITOR: editor }; const result = git(['rebase', '-i', '--empty=keep', '--no-autostash', '--no-autosquash', '--no-update-refs', '--onto', analysis.targetTip, analysis.mergeBase], { allowFailure: true, env }); if (rebaseActive()) {
    const running = { ...run, status: 'running' };
    writeRun(running);
    return running;
} if (result.status !== 0)
    fail((result.stderr || result.stdout || 'git rebase failed before retaining state').trim(), 1); const completed = { ...run, status: 'completed' }; writeRun(completed); return completed; }
function startSemanticRebase(selectionFile) { ensureNoRebase(); ensureClean(); const analysis = readAnalysis(); validateFrozen(analysis, true); const selection = readSemanticRebaseSelectionV1(node_fs_1.default.readFileSync(selectionFile, 'utf8'), analysis); const contributors = {}; const selectionTargets = {}; for (const entry of selection.entries) {
    const change = analysis.sourceChanges.find(item => item.id === entry.sourceId);
    if (!change)
        fail(`unknown source change: ${entry.sourceId}`);
    contributors[entry.sourceId] = contributingCommits(analysis, change);
    selectionTargets[entry.sourceId] = entry.targetIds;
} const plannedCommits = analysis.sourceCommits.filter(commit => Object.values(contributors).some(commits => commits.includes(commit))); if (selection.entries.length > 0 && plannedCommits.length === 0)
    fail('selected changes have no contributing source commit'); const prepared = { schemaVersion: 2, analysisDigest: analysis.analysisDigest, selectionDigest: selectionDigest(selection), originalTip: analysis.sourceTip, sourceBranch: analysis.sourceBranch, targetTip: analysis.targetTip, contributors, selectionTargets, plannedCommits, reviewedCommits: [], status: 'prepared', residualPath: null }; writeRun(prepared); return dossier(analysis, launchRebase(analysis, prepared)); }
function changedPaths() { const values = [gitText(['diff', '--name-only']), gitText(['diff', '--cached', '--name-only'])].flatMap(text => text.split('\n').filter(Boolean)); return [...new Set(values)]; }
function continueSemanticRebase() { const analysis = readAnalysis(); const run = readRun(); if (run.analysisDigest !== analysis.analysisDigest)
    fail('run state belongs to another analysis'); if (run.status === 'completed')
    return dossier(analysis, run); if (!rebaseActive())
    fail('Git rebase state is missing'); const semanticRebaseStop = currentStop(); if (!semanticRebaseStop)
    fail('cannot identify the stopped original commit'); const original = semanticRebaseStop.originalCommit; const unresolved = gitText(['diff', '--name-only', '--diff-filter=U']); if (unresolved)
    fail(`resolve and stage textual conflicts before continuing: ${unresolved.split('\n').join(' ')}`); const allowed = new Set(pathsForCommit(original)); for (const [id, commits] of Object.entries(run.contributors))
    if (commits.includes(original)) {
        const change = analysis.sourceChanges.find(item => item.id === id);
        if (change) {
            allowed.add(change.oldPath);
            allowed.add(change.newPath);
        }
    } const changed = changedPaths(); const outside = changed.filter(relative => !allowed.has(relative)); if (outside.length > 0) {
    const residual = gitText(['diff', 'HEAD', '--', ...outside]) + '\n';
    writeAtomic(statePath(RESIDUAL_FILE), residual);
    const retained = { ...run, status: 'residual', residualPath: statePath(RESIDUAL_FILE) };
    writeRun(retained);
    return `semantic rebase residual review required\npaths ${outside.join(' ')}\n${residual}`;
} const plannedStop = run.plannedCommits.includes(original) && semanticRebaseStop.atBreak; const continuedRun = plannedStop && !run.reviewedCommits.includes(original) ? { ...run, reviewedCommits: [...run.reviewedCommits, original] } : run; if (plannedStop && changed.length > 0) {
    git(['add', '--', ...changed]);
    git(['commit', '--amend', '--no-edit']);
} const result = git(['rebase', '--continue'], { allowFailure: true, env: { ...process.env, GIT_EDITOR: 'true' } }); if (result.status !== 0) {
    const newUnresolved = gitText(['diff', '--name-only', '--diff-filter=U']);
    if (!rebaseActive() || !newUnresolved)
        fail((result.stderr || result.stdout || 'git rebase continuation failed').trim(), 1);
} if (rebaseActive()) {
    const running = { ...continuedRun, status: 'running', residualPath: null };
    writeRun(running);
    return dossier(analysis, running);
} const completed = { ...continuedRun, status: 'completed', residualPath: null }; writeRun(completed); return dossier(analysis, completed); }
function semanticRebaseStatus() { if (!node_fs_1.default.existsSync(statePath(ANALYSIS_FILE)))
    return 'semantic rebase inactive\n'; const analysis = readAnalysis(); if (!node_fs_1.default.existsSync(statePath(RUN_FILE)))
    return `semantic rebase analyzed\nanalysis ${analysis.analysisDigest}\nreview ${statePath(REVIEW_FILE)}\n`; return dossier(analysis, readRun()); }
function abortSemanticRebase() { if (!node_fs_1.default.existsSync(statePath(RUN_FILE)))
    return 'semantic rebase inactive\n'; const run = readRun(); if (run.status === 'completed')
    fail('completed semantic rebase cannot be aborted'); if (rebaseActive())
    git(['rebase', '--abort']); if (resolveCommit('HEAD') !== run.originalTip)
    fail('Git abort did not restore the frozen source tip'); node_fs_1.default.rmSync(statePath(RUN_FILE), { force: true }); node_fs_1.default.rmSync(statePath(RESIDUAL_FILE), { force: true }); return `semantic rebase aborted\nrestored ${run.originalTip}\n`; }
function usage() { fail('usage: semantic-rebase <diff <target> [--output <file>]|run <target> --conflicts <file>|status|continue|abort>', 2); }
function main(argv = process.argv.slice(2)) { const [command, ...args] = argv; if (command === 'sequence-editor') {
    if (args.length !== 1)
        usage();
    sequenceEditor(args[0] ?? '');
    return;
} if (command === 'diff') {
    if (args.length !== 1 && !(args.length === 3 && args[1] === '--output'))
        usage();
    const analysis = analyzeSemanticRebase(args[0] ?? '');
    const review = renderReview(analysis);
    if (args.length === 3)
        writeAtomic(node_path_1.default.resolve(args[2] ?? ''), review);
    else
        process.stdout.write(review);
    return;
} if (command === 'run') {
    if (args.length !== 3 || args[1] !== '--conflicts')
        usage();
    const analysis = readAnalysis();
    if (resolveCommit(args[0] ?? '') !== analysis.targetTip)
        fail('run target does not match frozen analysis');
    process.stdout.write(startSemanticRebase(node_path_1.default.resolve(args[2] ?? '')));
    return;
} if (command === 'status' && args.length === 0) {
    process.stdout.write(semanticRebaseStatus());
    return;
} if (command === 'continue' && args.length === 0) {
    process.stdout.write(continueSemanticRebase());
    return;
} if (command === 'abort' && args.length === 0) {
    process.stdout.write(abortSemanticRebase());
    return;
} usage(); }
if (require.main === module) {
    try {
        main();
    }
    catch (error) {
        const status = record(error) && typeof error.status === 'number' ? error.status : 1;
        process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = status;
    }
}
