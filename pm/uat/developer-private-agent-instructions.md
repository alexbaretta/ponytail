<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Developer-private agent instructions Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS`](../requirements/developer-private-agent-instructions.md).

## Arc: Apply an ignored project-local instruction add-on

Traceability: verifies REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS

- **Actor:** Developer using Ponytail in a registered Git project.
- **Prerequisites:** A Git project with tracked `AGENTS.md` and existing local
  exclude content.
- **Profiles:** Automated production CLI and portable-policy tests.
- **External effects:** Updates only the repository's local Git exclude file.

1. Run `ponytail register` twice.
   - `/AGENTS.local.md` appears exactly once in `info/exclude`, and the
     pre-existing exclude content remains unchanged.
2. Create a regular root `AGENTS.local.md` with developer-local instructions.
   - Git status omits the file and `ponytail validate` succeeds.
   - The agent reads it after tracked project instructions, without allowing
     it to weaken a higher-authority instruction.
3. Force-add the file to Git and validate again.
   - Validation fails with an actionable tracked-file diagnostic.
4. Replace it with a symlink or remove its ignore rule and validate again.
   - Validation fails without loading the unsafe add-on.
5. Inspect the portable policy.
   - It identifies the canonical path, validation conditions, authority order,
     and prohibition on storing secrets.
