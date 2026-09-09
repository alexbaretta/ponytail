---
name: diagnostic-assertions
description: >-
  Use when adding, changing, reviewing, or testing production assertions,
  invariant checks, diagnostic instrumentation, warning logs, throws, error
  dialogs, or other checks that might alter failure control flow. Distinguish
  diagnostic observations from invariants and prevent diagnostics from becoming
  product failures.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Diagnostic Assertions

Classify every production check before choosing its behavior.

## Diagnostic Observations

A check is diagnostic when execution remains valid after it fails. A diagnostic
observation must not throw, terminate a workflow, display an error dialog, or
otherwise become user-visible failure control flow. Record it through the
project's structured warning-level diagnostic channel.

Do not use assertion primitives, generic assertion helpers, or ad hoc
log-and-throw sequences for diagnostic observations.

## Hard Invariants

A hard assertion is permitted only for a product, security, or
program-correctness invariant for which continuing would be invalid. Before
adding one, establish:

- the invariant being enforced;
- why execution cannot safely continue;
- why the condition is not merely diagnostic;
- the production failure scope; and
- success-path and failure-path tests.

Use the owning error mechanism and keep the resulting failure actionable and
contained to the narrowest valid scope.

## Review Workflow

1. Inspect each added or changed assertion, throw, error dialog, and diagnostic
   check.
2. Classify it as a hard invariant or diagnostic observation.
3. Convert diagnostic observations to warning-only structured diagnostics.
4. Verify that hard invariants have an explicit justification and focused
   success and failure coverage.
5. Record the classification where the host's review or management workflow
   requires it.

Do not preserve an assertion merely because it is pre-existing or useful during
development. Production behavior follows the classification above.
