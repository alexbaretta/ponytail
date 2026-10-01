<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-10-01-FEAT-typescript_only_source: Replace JavaScript source with fully typed TypeScript

## Status

open

## Type, source, and authorization

- **Type:** FEAT
- **Canonical issue ID:** `2026-10-01-FEAT-typescript_only_source`
- **Source:** Stakeholder feature request on 2026-10-01.
- **Authorization:** Record the feature request. Implementation has not started
  and has not been activated by this issue-intake change.
- **Canonical home:** `pm/bugs`, as configured for Ponytail issues.

## Objective

Deprecate authored JavaScript in Ponytail's `local_rules` branch and migrate
all repository-owned JavaScript code to fully statically typed TypeScript
validated by TSTS.

## Proposed behavior

- TypeScript is the only authored source language for code currently written
  in JavaScript, including production modules, hooks, scripts, tests, skills,
  plugin adapters, package subprojects, and benchmarks.
- Every migrated source file participates in a configured TypeScript project
  and in TSTS validation. No source subtree may remain outside semantic
  analysis merely because it previously executed directly under Node.js.
- Migrated code follows the `static-type-safety` contract: no `any`, unchecked
  assertions, non-null assertions, suppression comments, duplicate test-only
  contract types, or other type-system bypasses.
- JavaScript required as a runtime or distribution artifact is generated from
  canonical TypeScript and is not maintained as handwritten source. Generated
  host adapters remain synchronized with their canonical TypeScript sources.
- Repository validation rejects newly introduced handwritten `.js`, `.cjs`,
  or `.mjs` files after the migration.

## Scope evidence

At intake, the branch contains 96 JavaScript files across `src/`, `hooks/`,
`scripts/`, `tests/`, `skills/`, `ponytail-mcp/`, `pi-extension/`, and
`benchmarks/`. This count records the initial migration surface; the acceptance
criteria apply to the final repository inventory rather than this snapshot.

## Acceptance criteria

1. Every repository-owned handwritten `.js`, `.cjs`, and `.mjs` file has a
   canonical fully typed TypeScript replacement, and no handwritten JavaScript
   remains in the branch.
2. The TypeScript compiler checks every migrated source and test without
   weakening strictness or using type-system bypasses.
3. TSTS analyzes every migrated source set and reports no violations.
4. Runtime, hook, plugin, CLI, package, benchmark, and test entry points consume
   compiled artifacts from the canonical TypeScript sources without requiring
   checked-in handwritten JavaScript.
5. A repository-owned static check prevents regression by rejecting new
   handwritten JavaScript.
6. Build, full unit tests, installer checks, package tests, generated-adapter
   checks, and TSTS validation pass against the reconciled final tree.

## Requirements reconciliation

Issue intake does not activate implementation, so this proposed behavior has
not yet been added to the approved requirements web or UAT. Reconcile both
when implementation is authorized directly or begins through an approved
plan.

## Implementation and validation

No implementation plan or validation evidence exists yet. Because the
migration spans many independently testable code areas, implementation will
require a long-lived plan with atomic tasklets and an explicit ordering for
compiler configuration, runtime build outputs, source migration, and final
JavaScript prohibition.
