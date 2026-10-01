<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Isolate permission updates from foreign project configuration

- **ID:** `2026-09-30-BUG-execpolicy_cross_project_coupling`
- **Type:** BUG
- **Status:** closed
- **Source:** Stakeholder report on 2026-09-30.
- **Authorization:** The stakeholder explicitly requested the standalone repair
  with “Fix this.”

Traceability: introduces REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling
Traceability: plans-implementation REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling
Traceability: plans-verification REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling

## Observation and confirmed root cause

Running `ponytail update-permissions` in one repository failed because another
registered repository had an uncommitted `.agents/config` change. The command
iterated every registered project, opened its blessed worktree, and applied the
blessing cleanliness gate before invoking the policy compiler. The compiler
then reread every foreign proposal to reconstruct one accepted rule set. A
local permission update was therefore coupled to unrelated live configuration.

## Resolution

An ordinary permission update now reads only the invoking worktree's proposal.
Previously accepted foreign contributions come only from durable user-owned
accepted-policy snapshots; foreign worktree availability, dirt, or malformed
configuration cannot affect the local command. The exact V1 accepted-state
reader normalizes existing project provenance into a migration snapshot, and
the latest writer emits V2 with exact per-project accepted proposals. Local
`--check`, dry-run, acceptance, restoration, and idempotency retain the same
isolation boundary.

Requirement: [REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION](../../requirements/codex-execpolicy-project-isolation.md).
UAT: [Codex execpolicy project isolation Suite](../../uat/codex-execpolicy-project-isolation.md).

## Evidence

- Before the production repair, the focused regressions failed because the
  command emitted aggregate V1 state and selected the blessed worktree rather
  than the invoking worktree.
- After the repair, the focused compiler suite passes 7/7 and the two focused
  high-level CLI regressions pass 2/2, including dirty and missing foreign
  project fixtures.
- Traceability passes with 145 relationships; TSTS unit tests pass 80/80; the
  TSTS semantic check passes after staging the new tracked records.
- The full Node run passes 445/448. Its three failures are pre-existing Codex
  installer-fixture failures (`codex is required to install the Ponytail
  plugin`) and do not exercise permission isolation.
- Pattern observation:
  [`2026-09-30-local_command_read_foreign_configuration`](../../debugging-pattern-observations/2026-09-30-local_command_read_foreign_configuration.json).
