// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { it, afterEach } from 'node:test';

import { canonicalApi, createFixture, compileFixture, cleanupSharedMessageFixtures } from './shared-message-fixture.js';
import type { SharedMessageFixture } from './shared-message-fixture.js';
afterEach(cleanupSharedMessageFixtures);

// Traceability: verifies REQ-TSTS-SHARED-MESSAGE-CONTRACTS
it('real CLI accepts shared contracts; TypeScript rejects an object for JSON-text payloads', async () => {
    const fixture: SharedMessageFixture = createFixture(canonicalApi + "transport.send('patch', '{}');");
    const cliPath: string = path.resolve('tsts/dist/src/cli.js');
    const output: string = execFileSync(process.execPath, [cliPath, '--config', fixture.configPath], { encoding: 'utf8' });
    assert.match(output, /no violations/u);
    fs.appendFileSync(path.join(fixture.root, 'index.ts'), "\ntransport.send('patch', {});\n");
    assert.ok(compileFixture(fixture).some(diagnostic => diagnostic.code === 2345));
    fs.writeFileSync(path.join(fixture.root, 'index.ts'), canonicalApi.replace(
        'send<C extends keyof Messages>(channel: C, ...args: Messages[C]): void;',
        'send(channel: string, ...args: unknown[]): void;'));
    assert.throws(() => execFileSync(process.execPath, [cliPath, '--config', fixture.configPath],
        { encoding: 'utf8', stdio: 'pipe' }), error => error instanceof Error &&
            'stdout' in error && typeof error.stdout === 'string' && /uncoupled/u.test(error.stdout));
});
