<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# CLI interruption

[Back to requirements index](index.md)

**Identifier:** `REQ-CLI-INTERRUPTION`

**Approval and source:** Explicit stakeholder implementation request on
2026-10-01: `update-index`, and every Ponytail subcommand, must handle Ctrl-C
gracefully without printing a stack trace.

Ctrl-C must terminate a Ponytail command with cancellation status 130, without
Python tracebacks or runtime stack traces. The CLI must wait for its delegated
command's cancellation cleanup rather than abandon it. Concise cancellation
diagnostics remain permitted; ordinary errors must not be hidden.

For index updates, completed commit checkpoints remain durable, incomplete
transactions roll back, progress output ends cleanly, and the same command can
resume. This does not add a restart guarantee to unrelated non-resumable commands.

Acceptance: [CLI interruption Suite](../uat/cli-interruption.md).
