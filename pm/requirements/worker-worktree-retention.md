# Retained workers and worker-owned checkout recovery

**Identifier:** `REQ-WORKER-WORKTREE-RETENTION`

**Approval:** Explicit stakeholder approval on 2026-10-01 to document, plan,
and implement retained worker pairs, a fifteen-worktree project limit, and
worker-owned recovery from the main worktree.

Traceability: specifies REQ-WORKER-WORKTREE-RETENTION

## Lifetime and reuse

Ponytail must not automatically delete a worker checkout or archive its session
because a delivery was merged, its plan closed, or no new work is currently
ready. It retains the session/worktree pair indefinitely. Logical completion
of an assignment is not physical retirement of its worker.

Scheduling must select the first deterministically ordered, safe inactive pair
before creating a worker. Reuse requires a surviving clean checkout and no
outstanding assignment or action for that pair. Outstanding acceptance,
delivery, recovery, or integration obligations are not inactivity.
Both observed idle host states, `waiting` and `completed`, qualify once the
assignment's completion obligations are satisfied; neither implies retirement.

Each user-owned top-level Codex project has a limit of fifteen worker
worktrees. Reserved creations consume capacity. Campaigns in that project
share the pool. Other top-level projects have independent pools even when
their checkouts share one main worktree and Git object database. The main and
user-owned top-level checkouts are not worker slots. At capacity without a safe
inactive pair, scheduling waits rather than deleting or creating a sixteenth
worker. Pre-existing excess capacity must not cause destructive normalization.

Explicit human-authorized retirement remains a separate operation, with
preservation and project-resource cleanup prerequisites. It is not the
scheduler's way of obtaining capacity.

## Worker-owned recovery

Every authenticated worker receives durable knowledge of its owning top-level
project, main-worktree path, original checkout path, branch, and recovery
authority. These facts survive loss of its checkout. The worker can invoke
canonical recovery from an existing neutral directory; recovery must not first
require the missing directory to be a Git repository or require the coordinator
to initiate a recovery action.

This continuity must also cover a native worker created but not yet attached
to its campaign. Once fresh complete host evidence identifies the original
ready session and checkout for its existing started creation, the coordinator
may enroll that bootstrap identity without claiming adoption, attachment, or
task execution. The original client receipt, action, assignment, and token
remain unchanged. That same worker may then reconstruct only its original
detached dispatch checkpoint from enrolled main-worktree provenance, even after
the enrollment observation expires. It immediately adopts the restored
checkout before setup, establishes the project-owned branch, and completes the
original authenticated attachment. No replacement session or checkout is
created. Contradictory, reused, unobserved, or non-managed identities must be
rejected before enrollment; attachment must retain the enrolled session/path.

When adoption is blocked by tooling at the original dispatch revision, the
same provisioned worker must be able to receive the exact owning project's
integrated descendant through a canonical capability-owned bootstrap upgrade.
This is not permission to reset an authenticated worker or use an arbitrary
commit. Preserve immutable dispatch provenance and original creation identity;
checkpoint the pending target before moving a clean detached checkout, then
checkpoint completion. Recovery and identical retries finish that transition
without overwriting tracked, untracked, or ignored local content. Attachment
must wait for completion, then adoption is immediate, before environment setup.
Main-worktree Git objects remain a source, never its configuration or policy.

Recovery reconstructs the worker's original checkout from its preserved Git
branch in the recorded main worktree, without replacing the session, resetting
the branch, touching another worker's checkout, or importing the main worktree's
project configuration. The worker runs its project's canonical adoption/setup
before resuming normal work. The coordinator observes the outcome and retains
existing action, assignment, and delivery identities.

Historical recovery may have relocated a binding while the native session
kept its original checkout. Canonical recovery must reconcile that case using
fresh supported host evidence and the authenticated original dispatch/recovery
history. It may return the worker's branch to its proven original clean detached
checkout while retaining its own replacement checkout, without deleting either
path or changing assignment, merged state, or delivery evidence. Ambiguous or
changed checkpoints must fail before transfer; interrupted transfers must retry.

Recovery rejects ambiguous ownership, incorrect session authority, changed
source identity, symlink substitution, a branch owned by another checkout, or
an existing incompatible target. Repeated recovery is idempotent and must not
overwrite existing uncommitted changes. Missing Git objects or unavailable
source paths produce an actionable failure, not a replacement worker.

Git reconstruction restores committed state only. Native recoverable snapshots
must not be deleted; restoration of uncommitted or untracked files must never
be claimed without evidence. Codex automatic worktree cleanup is independently
owned by the host and must be disabled for retained pools; Ponytail must state
that boundary rather than pretend its own retention setting controls the host.

## Verification

The [acceptance Suite](../uat/worker-worktree-retention.md) distinguishes real
Git/CLI proof from live host proof that the original session resumes after
exact-path recovery.
