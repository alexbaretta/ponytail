# Worktree reclamation

[Back to the requirements index](index.md).

**Identifier:** `REQ-WORKTREE-RECLAMATION`

**Approval:** Approved by the stakeholder's explicit 2026-10-01 request for an
algorithmic Ponytail subcommand that reclaims stale unused Codex slot claims
and removes their corresponding worktrees.

## Project-isolated lifecycle authority

Ponytail must provide `ponytail worktree reclaim` for deterministic reclamation
of abandoned agent-worktree claims in the invoking project. The command must
derive claim inventory, liveness, ownership, project-resource cleanup, and
worktree retirement only from that project's committed lifecycle configuration
and canonical adapter. It must not inspect or execute configuration from any
other registered project.

Retirement includes every resource the project binds to the claim, not only
the Git worktree. Such resources may include PostgreSQL databases, ports,
containers, credential material, or generated state. Their identities and
cleanup operations remain project-owned because Ponytail cannot safely infer
them from the worktree path.

The adapter is the authority for whether one exact claim generation is active,
uncertain, or abandoned. Time, a missing status message, a path naming pattern,
or absence from a partial session listing must not establish abandonment.
Ponytail must never accept a caller-supplied deletion path or invent a generic
fallback cleanup when the adapter cannot prove safety.

## Deterministic fenced reclamation

`ponytail worktree reclaim --dry-run` must inventory claims without mutation.
The mutating form must process adapter-proven reclaimable claims in stable claim
order. Each mutation request must identify the exact claim ID, immutable
generation, and canonical worktree path returned by inventory so that the
adapter can repeat authoritative preflight immediately before cleanup.

The adapter must keep the claim as the durable recovery record until all
claim-owned resources and the physical/Git worktree have been retired. It may
return `reclaimed` and remove the claim only after complete cleanup. A partial
failure must preserve a resumable claim state and return `blocked`; repeating
the same generation-fenced request must safely continue cleanup.

The adapter must retain active and uncertain claims. It must keep interrupted
destructive cleanup recoverable and generation-fenced. One claim-specific
blocked result must not prevent independent reclaimable claims from being
attempted, while a malformed contract or failed adapter process must stop the
command rather than guessing.

Ponytail may report one claim reclaimed only after a fresh inventory no longer
contains that exact claim generation and the recorded worktree path is absent,
including a symlink at that path. A retained or blocked result is valid only
while fresh inventory still contains the same ID, generation, and path.

The command must expose deterministic human output and a versioned JSON result.
Exit `0` means dry-run completed or every attempted claim was reclaimed or
safely retained after revalidation. Exit `1` means at least one independently
processed claim remains blocked. Exit `2` means invocation, configuration,
adapter execution, or contract validation prevented a trustworthy result.

Only one reclamation command may operate on an invoking project at a time.
This serialization must not couple distinct project roots.

Acceptance coverage: [Worktree reclamation Suite](../uat/worktree-reclamation.md).
