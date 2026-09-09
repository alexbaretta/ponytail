---
name: build-impact
description: "Build only affected targets"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Build Impact

Run project builds only when changed files participate in configured build
targets.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Build-impact configuration`;
- `Build-impact query command`; and
- `Build target commands`.

The build-impact configuration defaults to `ponytail.json` at the project
root. The query command defaults to the bundled
`scripts/build-impact.js` resource in this skill. Build target commands have no
portable default.

Read [configuration.md](references/configuration.md) before creating or
changing `ponytail.json`.

## Workflow

1. Identify the intended changed paths. Do not include unrelated dirty files.
2. Before deleting or renaming a path, query it while it still exists and
   retain that result for final validation. A post-deletion TypeScript query
   cannot prove whether an absent path belonged to the prior compiler input
   set, so the adapter reports an unmatched missing path as indeterminate.
3. Run the configured build-impact query with added and modified paths after the intended
   change-set stabilizes.
4. Merge any retained pre-deletion result with the final query. When either
   reports affected targets, run each reported build command
   once after the final change to that target's inputs.
5. When the combined result reports no affected or indeterminate targets, skip the
   project build.
6. When the query reports indeterminate targets or a configuration error,
   resolve the tool or configuration failure before claiming build validation
   is unnecessary.
7. When a target input changes after its successful build, query again and
   rebuild only the newly affected targets.

Do not run a build merely because a tasklet, story, sprint, or plan completed.
An explicit user request to build or validate a release artifact remains
independent authority.

## Adapter Ownership

One dispatcher queries every configured adapter with the same intended paths.
Each build target has exactly one owning adapter.

The bundled `typescript` adapter:

- resolves TypeScript from the governed project;
- runs `tsc --listFilesOnly` for each target's configured `tsconfig`;
- matches repository-owned compiler inputs and configured additional inputs;
  and
- emits no compiler output or complete input list.

A `custom` adapter is project-owned. It receives the versioned request on
standard input and returns the versioned adapter result on standard output.
The dispatcher invokes it without a shell, validates its declared target
ownership, and merges its result with every other adapter.

When one adapter fails, preserve successful results from other adapters and
mark the failed adapter's targets indeterminate. Never reduce a partial result
to "no build required."

## Completion Check

- The query used only intended changed paths.
- Every reported affected target was built once after its final input change.
- No unreported target was built for ordinary change validation.
- No complete compiler input list entered agent context.
- Indeterminate results were resolved or reported without a false skip claim.
