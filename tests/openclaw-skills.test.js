#!/usr/bin/env node
// Copyright (c) 2026 DietrichGebert.
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// The OpenClaw skill package (.openclaw/skills/) is generated from skills/ by
// scripts/build-openclaw-skills.js from the canonical registry and skills.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { NAMES, render, outPath, sourceBody, DESCRIPTIONS } = require('../scripts/build-openclaw-skills');

for (const name of NAMES) {
  test(`${name}: committed OpenClaw skill matches the generator`, () => {
    const onDisk = fs.readFileSync(outPath(name), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(onDisk, render(name), 'stale — run: node scripts/build-openclaw-skills.js');
  });

  test(`${name}: body contains the canonical skills/${name} body`, () => {
    const onDisk = fs.readFileSync(outPath(name), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(onDisk.endsWith(sourceBody(name)), 'body drifted from skills/' + name);
  });

  test(`${name}: description is one line under 160 chars`, () => {
    const d = DESCRIPTIONS[name];
    assert.ok(d.length <= 160 && !d.includes('\n'), 'description too long or multiline');
  });

  test(`${name}: referenced resources are packaged`, () => {
    for (const match of sourceBody(name).matchAll(/\]\((references\/[^)]+)\)/g)) {
      assert.ok(fs.existsSync(outPath(name).replace(/SKILL\.md$/, match[1])));
    }
  });
}
