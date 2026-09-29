<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Pre-commit project isolation

[Back to requirements index](index.md)

**Identifier:** `REQ-PRECOMMIT-PROJECT-ISOLATION`

**Approval:** Approved and authorized for standalone implementation by the
stakeholder on 2026-09-29.

**Source:**
[`2026-09-29-BUG-precommit_cross_project_coupling`](../bugs/closed/2026-09-29-BUG-precommit_cross_project_coupling.md).

Ponytail must prevent the live state of one registered project from changing
whether an independent registered project can commit.

The global Ponytail registry must retain a validated last-known-good identity
snapshot for each registered project. The snapshot contains only the foreign
identity fields needed by reference QA. Ordinary `ponytail qa`, including the
pre-commit hook, must read those snapshots and must not open or validate
foreign worktrees.

Reference QA must continue rejecting undeclared references represented by an
available snapshot. A legacy registration without a snapshot must emit an
actionable warning but must not block an unrelated commit or silently inspect
the foreign worktree. Registering or blessing a project, and canonical CLI
operations that change its identity, must refresh its validated snapshot.

`ponytail validate --all` must explicitly inspect every registered project's
blessed worktree and report missing or unrelated worktrees, untracked, dirty,
or invalid configuration, absent snapshots, duplicate canonical names, and
snapshots that differ from current valid project identity. This global check
must not mutate the registry or project repositories.

The durable user-registry contract must preserve exact V1 reads, write only
the latest V2 representation, and represent a missing legacy snapshot
explicitly rather than inventing identity data.

Acceptance coverage:
[Pre-commit project isolation Suite](../uat/precommit-project-isolation.md).
