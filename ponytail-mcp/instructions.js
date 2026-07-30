// Copyright (c) 2026 DietrichGebert.
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

// Pure instruction selection for the Ponytail MCP server. No MCP/SDK imports,
// so this stays unit-testable on its own. Reuses the same builder the Claude
// hooks and Pi extension use, so every host emits identical rules.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getPonytailInstructions } = require("../hooks/ponytail-instructions.js");
const { getDefaultMode, normalizeMode } = require("../hooks/ponytail-config.js");

export const MODES = ["off", "lite", "full", "ultra"];

// Resolve a requested compaction level. Unknown or empty values fall back to
// the configured default, then to full.
export function resolveMode(requested) {
  const asked = normalizeMode(requested);
  if (asked) return asked;

  const fallback = normalizeMode(getDefaultMode());
  return fallback || "full";
}

export function buildInstructions(requested) {
  return getPonytailInstructions(resolveMode(requested));
}
