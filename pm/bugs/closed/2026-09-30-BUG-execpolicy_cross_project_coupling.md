<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Enforce full project isolation

- **ID:** `2026-09-30-BUG-execpolicy_cross_project_coupling`
- **Type:** BUG
- **Status:** closed
- **Source:** Stakeholder reports on 2026-09-30.
- **Authorization:** The stakeholder explicitly required full project
  isolation after rejecting the narrower accepted-snapshot repair.

Traceability: introduces REQ-PONYTAIL-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling
Traceability: plans-implementation REQ-PONYTAIL-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling
Traceability: plans-verification REQ-PONYTAIL-PROJECT-ISOLATION from issue 2026-09-30-BUG-execpolicy_cross_project_coupling

## Observation and confirmed root cause

The first repair stopped opening foreign worktrees but retained every foreign
project's accepted rules in one generated user-global Codex policy. Reference
QA also derived its search catalog from every registered project's identity
snapshot. Both paths allowed one project's configuration to change commands
run in another project.

## Resolution

Project command rules are stored per canonical project root and projected only
to the invoking worktree's ignored Codex project layer. The user-global policy
contains only Ponytail baseline and user-owned imported rules. Aggregate V1/V2
state migrates to V3 without retaining foreign project authority. Ordinary QA
receives no foreign registry catalog, while commands explicitly targeting a
project or global inventory retain that documented scope. The reusable
Ponytail skill states the same boundary.

Requirement: [REQ-PONYTAIL-PROJECT-ISOLATION](../../requirements/project-isolation.md).
UAT: [Ponytail project isolation Suite](../../uat/project-isolation.md).

## Evidence

- The focused execpolicy suite passes 9/9, including disjoint project
  projections, V1 migration, and malformed-foreign V2 migration.
- Focused high-level permission/pre-commit tests pass 3/3 and focused local-QA
  isolation tests pass 17/17.
- Traceability passes with 147 relationships; generated host rule copies and
  version pins validate.
- The repository-wide Node run passes 447/450. The three failures are the
  pre-existing installer fixtures that omit both `codex` and `npm`; they do
  not exercise project isolation.

Pattern observation:
[`2026-09-30-local_command_read_foreign_configuration`](../../debugging-pattern-observations/2026-09-30-local_command_read_foreign_configuration.json).
