<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Codex execpolicy project isolation

[Back to requirements index](index.md)

**Identifier:** `REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION`

**Approval:** Approved and authorized for standalone implementation by the
stakeholder on 2026-09-30.

**Source:**
[`2026-09-30-BUG-execpolicy_cross_project_coupling`](../bugs/closed/2026-09-30-BUG-execpolicy_cross_project_coupling.md).

An ordinary `ponytail update-permissions` invocation must read and validate
only the invoking worktree's `.agents/config/codex-execpolicy.json`. It must
not open, validate, require cleanliness from, or otherwise depend on a foreign
registered project's live worktree or configuration.

Ponytail may preserve a foreign project's previously accepted policy only from
durable user-owned accepted state. That state must retain each project's exact
accepted proposal independently so a local replacement does not reread,
reinterpret, remove, or invent another project's contribution. A project
proposal is keyed by its canonical registered repository root while its source
is the invoking worktree, so an ordinary linked worktree does not silently use
the blessed worktree's different live proposal.

The accepted-state contract must preserve exact V1 reads, normalize V1 project
provenance without consulting project worktrees, and write only the latest V2
representation. Dry-run, digest acceptance, check, restore, Codex validation,
and atomic output replacement must retain their existing fail-closed behavior.

Acceptance coverage:
[Codex execpolicy project isolation Suite](../uat/codex-execpolicy-project-isolation.md).
