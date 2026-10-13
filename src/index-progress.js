// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/index-progress.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexProgress = indexProgress;
function indexProgress(indexProgressStream = process.stdout, now = Date.now) {
    let discoveryCorpus = null;
    let spinnerIndex = 0;
    let spinnerTimer;
    const stageStarts = new Map();
    let currentStage = '';
    let startedAt = now();
    let lastPrintedAt = 0;
    let lineOpen = false;
    let lineLength = 0;
    const stop = () => { if (spinnerTimer !== undefined)
        clearInterval(spinnerTimer); spinnerTimer = undefined; discoveryCorpus = null; if (lineOpen)
        indexProgressStream.write('\n'); lineOpen = false; lineLength = 0; };
    const pulse = () => {
        if (discoveryCorpus === null || now() - lastPrintedAt < (indexProgressStream.isTTY ? 200 : 5000))
            return;
        lastPrintedAt = now();
        const frame = '|/-\\'.charAt(spinnerIndex++ % 4);
        const text = `${discoveryCorpus.padEnd(12)} ${indexProgressStream.isTTY ? frame : '...'} discovering sources | elapsed ${Math.floor((now() - startedAt) / 1000)}s`;
        indexProgressStream.write(indexProgressStream.isTTY ? `\r${text.padEnd(lineLength)}` : `${text}\n`);
        lineLength = Math.max(lineLength, text.length);
        lineOpen = indexProgressStream.isTTY === true;
    };
    return {
        prepare(corpus) {
            if (discoveryCorpus === corpus) {
                pulse();
                return;
            }
            stop();
            discoveryCorpus = corpus;
            startedAt = now();
            currentStage = '';
            spinnerIndex = 0;
            lastPrintedAt = now() - 5000;
            pulse();
            spinnerTimer = setInterval(pulse, 200);
            spinnerTimer.unref();
        },
        update(completed, total, corpus, phase = 'files') {
            const stage = `${corpus}:${phase}`;
            const first = stage !== currentStage;
            if (first) {
                stop();
                currentStage = stage;
                startedAt = completed === 0 ? now() : stageStarts.get(stage) ?? now();
                stageStarts.set(stage, startedAt);
            }
            if (!first && completed !== total && now() - lastPrintedAt < 1000)
                return;
            lastPrintedAt = now();
            const percentage = total === 0 ? 100 : Math.floor(completed * 100 / total);
            const filled = Math.floor(percentage * 40 / 100);
            const eta = total === 0 ? '0s' : completed === 0 ? 'unknown' : `${Math.ceil((now() - startedAt) / 1000 * (total - completed) / completed)}s`;
            const text = `${corpus.padEnd(12)} [${'='.repeat(filled)}${' '.repeat(40 - filled)}] ${percentage}% ${completed}/${total} ${phase} | elapsed ${Math.floor((now() - startedAt) / 1000)}s | ETA ${eta}`;
            const line = indexProgressStream.isTTY ? text.padEnd(lineLength) : text;
            indexProgressStream.write(indexProgressStream.isTTY ? `\r${line}` : `${line}\n`);
            lineLength = line.length;
            lineOpen = indexProgressStream.isTTY === true;
            if (completed === total)
                stop();
        }, stop,
    };
}
