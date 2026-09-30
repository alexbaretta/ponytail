<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Developer-private agent instructions

[Back to requirements index](index.md)

**Identifier:** `REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS`

**Approval:** Approved and authorized for standalone implementation by the
stakeholder on 2026-09-30.

**Source:**
[`2026-09-30-FEAT-developer_private_agent_instructions`](../bugs/closed/2026-09-30-FEAT-developer_private_agent_instructions.md).

Ponytail must support an optional root-level `AGENTS.local.md` containing
developer-private instructions that add to the project's tracked `AGENTS.md`.
Registration must add `/AGENTS.local.md` to Git's repository-local exclude
file without modifying the project's tracked `.gitignore` or creating the
optional add-on.

An agent must load `AGENTS.local.md` after the applicable tracked project
instructions only when the local file is a regular non-symlink file, is not
tracked, and is ignored by Git. The add-on may specialize developer-local
workflow but must not weaken or contradict user requirements, tracked project
instructions, explicit contracts, or higher-authority safety policy. It must
not be used to store secrets.

Project validation must reject a present local add-on that is tracked,
unignored, non-regular, or a symlink. Registration and validation must preserve
existing local exclude content and behave idempotently.

Acceptance coverage:
[Developer-private agent instructions Suite](../uat/developer-private-agent-instructions.md).
