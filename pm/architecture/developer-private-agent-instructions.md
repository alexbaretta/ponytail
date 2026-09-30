<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Developer-private agent instructions

[Back to architecture index](index.md) · Governing requirement:
[`REQ-DEVELOPER-PRIVATE-AGENT-INSTRUCTIONS`](../requirements/developer-private-agent-instructions.md)

## Architecture

The root `AGENTS.md` remains the tracked project instruction owner. Its
optional developer-private additive layer is the sibling `AGENTS.local.md`.
Ponytail's portable always-on policy owns discovery and authority semantics;
the project registration and validation CLI owns the Git-state safety
boundary.

`ponytail register` resolves the invoking worktree's repository-local
`info/exclude` through Git and adds the anchored `/AGENTS.local.md` pattern.
It preserves existing lines and does not create the optional file. The exclude
file is repository-local developer state outside the tracked project tree.

Before loading the add-on, the agent confirms that it is a regular non-symlink
file, untracked, and ignored. `ponytail validate` enforces the same physical
contract when the file exists. The tracked instructions win any conflict, and
the ignored add-on is not a credential boundary or secrets store.
