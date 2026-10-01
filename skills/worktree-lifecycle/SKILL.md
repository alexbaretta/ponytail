---
name: worktree-lifecycle
description: >-
  Use when creating, assigning, retaining, handing off, abandoning, or removing
  agent-owned Git worktrees. Require complete cleanup of abandoned worktrees
  and their project resources without deleting active or user-owned work.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Worktree Lifecycle

Traceability: supports REQ-WORKER-WORKTREE-RETENTION

Treat every agent-created worktree as a resource with an explicit owner and
disposition. Record its repository, physical root, Git registration, task or
agent owner, creation purpose, and project-local resources when it is created
or assigned.

Authorization to create an ephemeral agent-owned worktree includes authority
to remove that same worktree and its agent-created resources when its purpose
ends, unless the user explicitly requests retention. It does not authorize
removing a pre-existing, user-created, shared, or ambiguously owned worktree.

## Ownership And State

Before operating on a worktree, determine from authoritative task and Git state
whether it is:

- active: its owning task or agent can still use it;
- retained: the user or an active workflow explicitly needs it later; or
- abandoned: its task completed, failed, was cancelled or replaced, and no
  remaining work is assigned to it.

Do not infer abandonment from silence, an observation timeout, a stale status
message, or an inaccessible task. Poll the owning task or inspect its current
authoritative state. Do not remove an active or explicitly retained worktree.
For a Ponytail campaign, retain the session/worktree pair indefinitely, even
after integration and successful plan closure. Logical assignment completion
does not prove the session will never be needed again. Reuse the first safe
inactive pair; do not archive the chat, delete the checkout, or release its
resource claim to obtain capacity. The pool limit is fifteen worker slots per
user-owned top-level Codex project, independently of other projects sharing
the same main worktree. Wait at capacity rather than creating a sixteenth pair.
Historical scheduler cleanup actions are not retirement authority.

If a retained worker's checkout disappears, that worker invokes `ponytail
worktree recover <attachment-token>` from an existing neutral directory and
runs canonical project adoption/setup from its restored original path. Its
durable binding records the main worktree as a Git source, not a configuration
source. Preserve session, branch, assignment, and any native snapshot; committed
Git state cannot prove restoration of unsaved files. No coordinator-initiated
recovery action is required. Disable host automatic deletion for retained pools.

## Cleanup Contract

Garbage-collect an abandoned agent-owned worktree promptly, and always before
creating its replacement when the old worktree consumes a bounded slot or
substantial disk space.

1. Inspect status and ownership. Commit or transfer finalized work that must be
   retained. Remove disposable agent-created diagnostics and generated state.
   If user-owned or pre-existing uncommitted work cannot be distinguished,
   retain the worktree and report the exact uncertainty.
2. Stop its owned processes and release project resources such as databases,
   roles, containers, listeners, locks, claims, caches, and generated profiles.
3. Use the repository's canonical worktree retirement command when one exists.
   Do not bypass its ownership, cleanliness, confirmation, or resource checks.
4. Use the host task or worktree lifecycle operation for a host-owned Git
   registration and physical root after project cleanup. Use raw Git removal
   only when the repository has no canonical owner and the host does not own
   the worktree lifecycle.
5. Verify that the root and Git registration are absent and that every
   project-owned resource assigned to it has been released. A missing root
   with a live registration, claim, process, or database is incomplete cleanup.

Only for explicit human-requested campaign retirement, archive the original owning chat and observe it as
archived before invoking `ponytail campaign retire-worktree <campaign>
<action-id>`. This is the canonical project-owned retirement path: its adapter
must prove abandonment and release the exact worktree's resources. Do not use
thread handoff for retirement; it can change the ordinary checkout and session
identity without removing the source worktree. A missing adapter or retained
claim leaves the original action pending; never substitute raw Git removal.

Failure during setup does not make the partial worktree someone else's cleanup
problem. Retire all resources that were successfully allocated before moving
to another attempt. If cleanup itself fails, diagnose and repair the canonical
lifecycle rather than accumulating additional abandoned worktrees.

## Task Completion

Before returning control after worktree-backed execution, reconcile every
worktree created or assigned during the task. State which remain active or
retained and why. Leave no abandoned agent-owned worktree behind.
