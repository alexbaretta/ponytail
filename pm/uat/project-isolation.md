<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Ponytail project isolation Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-PONYTAIL-PROJECT-ISOLATION`](../requirements/project-isolation.md).

## Arc: Keep project command policy local

Traceability: verifies REQ-PONYTAIL-PROJECT-ISOLATION

- **Actor:** Developer updating Ponytail permissions in one project.
- **Prerequisites:** Two registered projects with different command-policy
  proposals; one may have dirty, malformed, or unavailable configuration.
- **Profiles:** Automated production CLI integration test.
- **External effects:** Writes isolated fixture user state and project-local
  Codex rule projections.

1. Accept each project's proposal from its own worktree.
   - Each accepted state contains only that project.
   - Each generated project rule file contains only that project's rules.
   - The user-global Ponytail rule file contains no project-sourced rule.
2. Change, remove, or invalidate the foreign project and update, check, and
   restore the local project.
   - Every local operation succeeds independently.
   - Neither project's accepted state or rule projection changes because of
     the other project.
3. Upgrade an aggregate V1 or V2 accepted state.
   - Ponytail retains only non-project user policy globally, extracts only the
     invoking project's prior contribution for local comparison, and discards
     every foreign contribution from the active policy without opening a
     foreign path.

## Arc: Keep local commands and skills independent

Traceability: verifies REQ-PONYTAIL-PROJECT-ISOLATION

- **Actor:** Developer invoking Ponytail in one registered project.
- **Prerequisites:** Another registered project has distinct identity and
  configuration.
- **Profiles:** Automated CLI and policy tests.
- **External effects:** Writes isolated fixtures only.

1. Change the other project's registration, identity, or configuration and run
   ordinary local QA.
   - Local output and result remain determined solely by the invoking project.
2. Load Ponytail's reusable skill policy in the invoking project.
   - It requires project-specific decisions and configuration to come only from
     that project's instruction and configuration layers.
3. Run an explicitly cross-project administrative command.
   - Only the explicitly selected inventory or target is consulted; the
     exception does not expand ordinary local command scope.
