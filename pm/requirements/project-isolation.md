<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Ponytail project isolation

[Back to requirements index](index.md)

**Identifier:** `REQ-PONYTAIL-PROJECT-ISOLATION`

**Approval:** Approved and authorized for standalone implementation by the
stakeholder on 2026-09-30. This requirement supersedes the narrower permission
snapshot behavior recorded earlier that day.

**Source:**
[`2026-09-30-BUG-execpolicy_cross_project_coupling`](../bugs/in_progress/2026-09-30-BUG-execpolicy_cross_project_coupling.md).

When a Ponytail command or skill operates in a project, no configuration,
accepted state, identity, worktree contents, or other project-owned input from
a different project may change that operation's behavior, output, success, or
failure. The operation may consume only the invoking project's inputs and
Ponytail-owned or user-owned inputs that are not derived from another project.

Commands whose explicit contract names another project or requests a
user-level inventory may operate on those explicitly selected records. That
explicit target does not authorize an ordinary local command to enumerate,
validate, search, aggregate, or inherit configuration from other registered
projects.

Project command policy must be accepted and installed in a project-scoped
Codex configuration layer. User-global Ponytail policy must contain no
project-sourced rule. Updating, checking, or restoring one project must neither
read another project's accepted state nor change the policy loaded in another
project.

Local reference QA and reusable skills must derive project-specific behavior
only from the invoking project's configuration. Global registration may locate
an explicitly selected project, but registration, blessing, or configuration
changes in one project must not silently alter commands or skills run in
another.

Acceptance coverage:
[Ponytail project isolation Suite](../uat/project-isolation.md).
