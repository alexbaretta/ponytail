<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-29-BUG-precommit_cross_project_coupling: Isolate commits from foreign project health

## Status

closed

## Type, source, and authorization

- **Type:** BUG
- **Canonical issue ID:** `2026-09-29-BUG-precommit_cross_project_coupling`
- **Source:** Stakeholder report on 2026-09-29.
- **Authorization:** The stakeholder explicitly authorized standalone
  implementation with “Let's fix this as you proposed.”
- **Canonical home:** `pm/bugs`, as configured for Ponytail issues.

Traceability: introduces REQ-PRECOMMIT-PROJECT-ISOLATION from issue 2026-09-29-BUG-precommit_cross_project_coupling
Traceability: plans-implementation REQ-PRECOMMIT-PROJECT-ISOLATION from issue 2026-09-29-BUG-precommit_cross_project_coupling
Traceability: plans-verification REQ-PRECOMMIT-PROJECT-ISOLATION from issue 2026-09-29-BUG-precommit_cross_project_coupling

## Observation

The Ponytail pre-commit hook runs `ponytail qa`. Reference QA opens every
other registered project's blessed worktree and requires its configuration to
be present, tracked, valid, and clean. A missing or misconfigured foreign
project can therefore prevent an unrelated repository from committing.

## Expected behavior

- Pre-commit and ordinary local QA depend only on the invoking project and a
  durable last-known-good catalog of foreign project identities.
- Foreign working-tree availability, dirt, or malformed live configuration
  cannot change another project's commit outcome.
- An explicit global validation command reports unavailable, invalid, dirty,
  missing-snapshot, and stale-snapshot registrations.
- Reference QA continues detecting undeclared cross-project references from
  the durable identity catalog.

## Confirmed root cause

The local QA path obtains foreign identities by calling `blessed_project()`
for every registered project. That helper intentionally enforces live
worktree and cleanliness invariants, coupling the local commit gate to all
registered repositories instead of to a durable identity input.

## Resolution and acceptance

Version the global Ponytail registry so each project registration owns a
validated identity snapshot. Make local QA consume only snapshots, and move
live cross-project health and freshness checks to `ponytail validate --all`.

Requirements: [`REQ-PRECOMMIT-PROJECT-ISOLATION`](../../requirements/precommit-project-isolation.md).
Architecture: [Project validation isolation](../../architecture/project-validation-isolation.md).
UAT: [Pre-commit project isolation Suite](../../uat/precommit-project-isolation.md).

## Verification

- The regression was observed failing before the production change.
- `bash -n cli/ponytail` passes.
- The 71 focused CLI, project-validation, and CLI-tools tests pass, including
  dirty, missing, stale, absent-snapshot, blessing-refresh, and V1-upgrade
  cases.
