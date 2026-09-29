<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Pre-commit project isolation Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-PRECOMMIT-PROJECT-ISOLATION`](../requirements/precommit-project-isolation.md).

## Arc: Commit independently of foreign worktree health

Traceability: verifies REQ-PRECOMMIT-PROJECT-ISOLATION

- **Actor:** Developer committing in one registered project.
- **Prerequisites:** Two registered projects with identity snapshots and a
  Ponytail pre-commit hook in the first project.
- **Profiles:** Automated production CLI integration test.
- **External effects:** Creates commits only inside isolated temporary Git
  repositories.

1. Make the second project's configuration dirty or unavailable.
   - Its durable identity snapshot remains unchanged.
2. Commit a valid change in the first project.
   - Pre-commit succeeds without opening or validating the second worktree.
3. Add an undeclared reference matching the second project's snapshot.
   - Reference QA still rejects the commit.

## Arc: Diagnose global registration health explicitly

Traceability: verifies REQ-PRECOMMIT-PROJECT-ISOLATION

- **Actor:** Developer maintaining Ponytail registration.
- **Prerequisites:** Registered projects with, respectively, dirty, missing,
  invalid, absent-snapshot, or stale-snapshot state.
- **Profiles:** Automated production CLI integration test.
- **External effects:** None.

1. Run `ponytail validate --all`.
   - The command fails with an actionable diagnostic identifying the first
     invalid global registration condition.
   - No project file or user-registry value changes.
2. Repair or refresh the affected registration and repeat the command.
   - Validation succeeds when every live identity matches its snapshot.

## Arc: Upgrade the durable user registry

Traceability: verifies REQ-PRECOMMIT-PROJECT-ISOLATION

- **Actor:** Existing Ponytail user upgrading from a V1 registry.
- **Prerequisites:** An exact V1 user registry.
- **Profiles:** Automated CLI contract test.
- **External effects:** Updates only the temporary fixture's user registry.

1. Read the V1 registry through an ordinary command.
   - The physical V1 contract remains accepted and missing snapshots are
     explicit in the normalized representation.
2. Register or bless a project.
   - Ponytail writes exact V2 and records the validated identity snapshot for
     that project without inventing snapshots for unrelated legacy entries.
