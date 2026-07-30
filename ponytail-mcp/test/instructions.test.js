import assert from "node:assert/strict";
import test from "node:test";

import { MODES, resolveMode, buildInstructions } from "../instructions.js";

test("resolveMode keeps valid intensities", () => {
  for (const mode of MODES) assert.equal(resolveMode(mode), mode);
});

test("resolveMode preserves off and falls back for unknown or empty values", () => {
  assert.equal(resolveMode("off"), "off");
  for (const input of ["review", "nonsense", "", undefined, null]) {
    assert.ok(MODES.includes(resolveMode(input)), `resolveMode(${input}) must be a served mode`);
  }
});

test("buildInstructions returns the ruleset tagged with the resolved mode", () => {
  const text = buildInstructions("ultra");
  assert.match(text, /PONYTAIL MODE ACTIVE/);
  assert.match(text, /ultra/);
});

test("buildInstructions preserves core policy when compaction is off", () => {
  const text = buildInstructions("off");
  assert.match(text, /level: off/);
  assert.match(text, /All always-on rules still apply/);
});
