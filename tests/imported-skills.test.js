#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const skillsRoot = path.join(root, 'skills');

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

function importedSkillNames() {
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, 'agents', 'openai.yaml')))
    .sort();
}

test('imported skills have valid project-neutral metadata and attribution', () => {
  const names = importedSkillNames();
  assert.ok(names.length > 0);
  assert.ok(!names.includes('git-write-escalation'));

  for (const name of names) {
    const skillDirectory = path.join(skillsRoot, name);
    const skill = fs.readFileSync(path.join(skillDirectory, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(skill, /\ndescription:/);
    assert.doesNotMatch(skill, /GWEN|agent_harness|CTO's Club/i);

    for (const file of filesUnder(skillDirectory)) {
      const content = fs.readFileSync(file, 'utf8');
      assert.match(content, /Copyright \(c\) 2026 Alex Baretta/);
    }

    for (const match of skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)) {
      assert.ok(
        fs.existsSync(path.join(skillDirectory, match[1])),
        `${name} has a broken reference to ${match[1]}`,
      );
    }
  }
});
