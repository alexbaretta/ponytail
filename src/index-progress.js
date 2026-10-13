// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/index-progress.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexProgress = indexProgress;
function indexProgress(indexProgressStream = process.stdout, now = Date.now) {
    let currentCorpus = '';
    let startedAt = now();
    let lastPrintedAt = 0;
    let lineOpen = false;
    const stop = () => { if (lineOpen)
        indexProgressStream.write('\n'); lineOpen = false; };
    return {
        update(completed, total, corpus) {
            const first = corpus !== currentCorpus;
            if (first) {
                stop();
                currentCorpus = corpus;
                startedAt = now();
            }
            if (!first && completed !== total && now() - lastPrintedAt < 1000)
                return;
            lastPrintedAt = now();
            const percentage = total === 0 ? 100 : Math.floor(completed * 100 / total);
            const filled = Math.floor(percentage * 40 / 100);
            const eta = completed === 0 ? 'unknown' : `${Math.ceil((now() - startedAt) / 1000 * (total - completed) / completed)}s`;
            const text = `${corpus} [${'='.repeat(filled)}${' '.repeat(40 - filled)}] ${percentage}% ${completed}/${total} files | ETA ${eta}`;
            indexProgressStream.write(indexProgressStream.isTTY ? `\r${text}` : `${text}\n`);
            lineOpen = indexProgressStream.isTTY === true;
            if (completed === total)
                stop();
        }, stop,
    };
}
