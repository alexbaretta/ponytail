---
name: worktree-lifecycle
description: >-
  Create, retain and clean up authorized agent worktrees using their native
  owner, preserving unfinished work and releasing project-owned resources.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Worktree lifecycle

Use the native host to create and manage its worktrees when authorized. Confirm
the intended project/repository, actual checkout path and owning session. Respect
project setup and resource limits. Do not create a Ponytail pool, enrollment,
lease, session marker or duplicate membership record.

Inspect actual session and Git state before reuse or cleanup. Active, blocked,
ready-for-integration or otherwise unfinished workers retain their worktrees.
Silence, an observation timeout or a missing session response is not abandonment.
Campaign replacement uses a different compatible assignment and preserves the
blocked worker. Completion naming does not itself authorize deletion.

Use the host's documented retention controls for needed checkouts. Do not assume
archiving a chat preserves its worktree, ignored artifacts or local resources.
If a retained checkout is missing, inspect the host's recovery/snapshot facilities
and available Git refs. Preserve original work and identity where possible;
committed Git state does not prove recovery of unsaved files. Report any genuine
uncertainty instead of silently replacing lost work.

For abandoned agent-created worktrees whose cleanup is authorized:

1. Verify ownership and quiescence. Preserve required commits, unintegrated work
   and non-disposable artifacts. Retain ambiguous or user-owned changes.
2. Stop only its owned processes and run the project's cleanup for its databases,
   containers, listeners and other resources. Verify cleanup; do not leave
   resources behind when setup or execution failed.
3. Use the native worktree lifecycle operation. Use ordinary Git removal only
   when no host or configured project lifecycle owns the checkout.
4. Confirm the checkout/registration and its project resources are gone.

Authorization to create an ephemeral agent-owned checkout includes its eventual
cleanup unless retention was requested; it does not authorize deleting shared,
pre-existing or user-owned work. Failed cleanup remains work to resolve, not a
reason to accumulate abandoned resources. Retained blocked work is not abandoned
and must not be deleted to meet the campaign's worker target.
