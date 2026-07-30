---
name: bash-parse-safe-scripts
description: "Use when creating or editing Bash scripts so they remain parse-safe if the file is modified or replaced while running. Requires set -euo pipefail, top-level function definitions only, a main function with explicit exit, and a final main invocation."
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Bash Parse-Safe Scripts

Use this skill for Bash scripts, especially operational scripts that may
be edited, replaced, or redeployed while a process is running.

## Required Structure

Every Bash script shall:

1. Start with `set -euo pipefail`.
2. Keep all remaining top-level statements as function definitions,
   except for the final `main "$@"` invocation.
3. Put what would normally be the body of the script inside a
   `main` function.
4. End `main` with an explicit `exit`.
5. Make the final line of the file the `main "$@"` invocation.

## Why

Bash parses scripts incrementally while executing them. If a script is
edited while it is running, later lines may be reparsed from the changed
file contents and fail unexpectedly.

By placing the runtime logic inside function definitions and invoking
`main` only after the whole file has been parsed, the script avoids that
incremental-parse hazard. The explicit `exit` at the end of `main`
prevents Bash from continuing past the invocation if the file changes
while `main` is running.

## Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

helper() {
  printf '%s\n' '...'
}

main() {
  helper
  exit 0
}

main "$@"
```

## Verification

- Run `bash -n` after editing the script.
- Keep comments concise and operational.
- Prefer small helper functions over long `main` bodies.
