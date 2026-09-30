<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-30-FEAT-developer_private_agent_instructions: Add private project agent instructions

## Status

closed

## Type, source, and authorization

- **Type:** FEAT
- **Canonical issue ID:** `2026-09-30-FEAT-developer_private_agent_instructions`
- **Source:** Stakeholder feature request on 2026-09-30.
- **Authorization:** The stakeholder explicitly requested implementation.
- **Canonical home:** `pm/bugs`, as configured for Ponytail issues.

Traceability: introduces REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS from issue 2026-09-30-FEAT-developer_private_agent_instructions
Traceability: plans-implementation REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS from issue 2026-09-30-FEAT-developer_private_agent_instructions
Traceability: plans-verification REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS from issue 2026-09-30-FEAT-developer_private_agent_instructions

## Objective

Support optional developer-private project instructions that add to the
tracked root `AGENTS.md` without entering Git history.

## Intended behavior

- The canonical optional add-on is root-level `AGENTS.local.md`.
- `ponytail register` adds `/AGENTS.local.md` to the repository-local Git
  exclude file without changing the tracked `.gitignore`.
- Agents load a valid local file after tracked project instructions.
- The file must be untracked, ignored, regular, and not a symlink.
- Tracked project instructions remain authoritative on conflicts.
- The local file is instructions, not a secrets store.

## Acceptance criteria

1. Registration installs the local exclusion idempotently and preserves the
   existing exclude file.
2. A regular `AGENTS.local.md` remains absent from Git status and local
   validation succeeds.
3. Local validation rejects a tracked or symlinked add-on.
4. Portable Ponytail policy defines loading, authority, and secret-handling
   semantics, and generated host copies remain synchronized.
5. Focused validation and traceability pass.

## Requirements and acceptance

Requirement:
[`REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS`](../../requirements/developer-private-agent-instructions.md).
Architecture: [Developer-private agent instructions](../../architecture/developer-private-agent-instructions.md).
UAT: [Developer-private agent instructions Suite](../../uat/developer-private-agent-instructions.md).

## Verification

- `node --test tests/policy-conformance.test.js`
- `node --test tests/project-validation.test.js`
- `node scripts/check-rule-copies.js`
- `npm run check:traceability`

The focused production CLI and portable-policy coverage passed on 2026-09-30.
