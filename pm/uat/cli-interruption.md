<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# CLI interruption Suite

[Back to UAT index](index.md)

## Arc: Cancel a command without a stack trace

Traceability: verifies REQ-CLI-INTERRUPTION

- **Requirement:** [CLI interruption](../requirements/cli-interruption.md), approved 2026-10-01.
- **Actor:** Terminal user.
- **Profiles:** Automated CLI process-group signals and real PostgreSQL indexing.
- **Effects:** Cancels only the selected command; retains completed index checkpoints.

1. Press Ctrl-C while a built-in command is running, then while a delegated
   Node command is cleaning up and while a PDF command is running.
   - Each exits with status 130, prints no stack trace, and waits for owned cleanup.
2. Press Ctrl-C during `ponytail search update-index` after completed commits.
   - Output ends cleanly; completed checkpoints survive, unfinished publication
     does not replace the prior published state, and no child writer remains.
3. Run the same update command again.
   - It processes only remaining commits and publishes successfully.
