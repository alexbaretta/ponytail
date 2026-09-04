---
name: codex-execpolicy
description: >-
  Use when defining, reviewing, proposing, accepting, installing, restoring, or
  troubleshooting Ponytail-managed Codex command-prefix policy.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Codex Execpolicy

Treat every allow, prompt, and forbidden directive as shared user authority.
Repository policy is an untrusted proposal because an agent can edit it; only
accepted state under `~/.ponytail/codex-execpolicy/` is authoritative.

Projects declare V1 proposals at `.ponytail/codex-execpolicy.json` with `safe`
and `unsafe` arrays. A safe entry contains a nonempty literal-token `pattern`
and `justification`. An unsafe entry also specifies `decision` as `prompt` or
`forbidden`. Prefer `prompt`; `forbidden` can deny service to every Codex task
using the shared policy.

Run `ponytail setup-project` inside each adopting Git worktree to register its
root in user-owned `~/.ponytail/config.json`. Registration resolves only the
enclosing Git root; never scan the filesystem for projects. Run
`ponytail install-permissions` to compute the complete registered policy
proposal. Review the displayed additions, removals, and decision changes.
Accept interactively or rerun with the exact displayed `--accept <digest>`.
Never accept a digest on the user's behalf.

The first accepted run imports existing Codex prefix rules once. Later runs do
not re-import generated output. Restore an accepted policy after loss of
`~/.codex` with `ponytail install-permissions --restore`; verify installed
state with `ponytail install-permissions --check`.

Do not describe package managers, Git commands, repository scripts, or
forbidden patterns as intrinsically safe. Prefix rules authorize every suffix,
and repository executables remain mutable. Keep patterns narrow, include an
actionable justification, and use Codex `match`/`not_match` fixtures when
editing generated-policy support itself.
