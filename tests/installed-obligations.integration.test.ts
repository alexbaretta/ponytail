// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fixture} from './helpers/obligation-fixture.js';

// Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL
test('installed obligation runtime works outside the repository without Node dependency search overrides', testContext => {
  const obligationFixture = fixture(testContext);
  const home = path.join(obligationFixture.root, 'codex');
  const bin = path.join(obligationFixture.root, 'bin');
  fs.mkdirSync(bin);
  // The external plugin command is outside this skill-copy acceptance boundary.
  fs.writeFileSync(path.join(bin, 'codex'), '#!/bin/sh\nexit 0\n', {mode: 0o755});
  const environment: NodeJS.ProcessEnv = {...process.env, HOME: obligationFixture.root,
    PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`};
  delete environment.NODE_PATH;
  delete environment.NODE_OPTIONS;
  const installed = spawnSync('bash', ['scripts/install-to-codex.sh', '--codex-home', home],
    {cwd: process.cwd(), env: environment, encoding: 'utf8'});
  assert.equal(installed.status, 0, installed.stderr);
  const runtime = path.join(home, 'skills/plan-execution/scripts/obligations.js');
  assert.equal(fs.lstatSync(path.dirname(runtime)).isSymbolicLink(), false);
  const validated = spawnSync(process.execPath,
    [runtime, 'validate', obligationFixture.documentPath, obligationFixture.root],
    {cwd: obligationFixture.root, env: environment, encoding: 'utf8'});
  assert.equal(validated.status, 0, validated.stderr);
  assert.match(validated.stdout, /unresolvedIds/);
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {parseObligationDocument} from ${JSON.stringify(pathToFileURL(runtime).href)}; if (typeof parseObligationDocument !== 'function') process.exit(1);`],
    {cwd: obligationFixture.root, env: environment, encoding: 'utf8'});
  assert.equal(imported.status, 0, imported.stderr);
});
