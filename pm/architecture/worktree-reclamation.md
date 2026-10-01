# Worktree reclamation

[Back to the architecture index](index.md).

This component implements
[`REQ-WORKTREE-RECLAMATION`](../requirements/worktree-reclamation.md) without
embedding any client project's resource topology in Ponytail.

## Boundary

`src/worktree-reclamation.js` owns argument parsing, strict contract readers,
project configuration trust checks, deterministic selection, project-scoped
serialization, adapter invocation, postcondition verification, and human/JSON
reporting. `cli/ponytail` only dispatches the `worktree` command family into
that module after ordinary invoking-project validation.

The invoking project owns
`.agents/config/project/worktree-lifecycle.json`. Physical V1 contains exactly
`schemaVersion` and `adapterPath`. The adapter path is root-relative, tracked,
committed, executable, regular, non-symlinked, and contained by the invoking
project. Ponytail invokes it directly without a shell from that project root.

## Adapter protocol V1

Ponytail writes exactly one JSON request to adapter standard input and accepts
exactly one JSON result from standard output.

An inventory request contains `schemaVersion` and operation `inventory`. Its
result contains operation `inventory` and a claim array. Each claim has a
stable `claimId`, immutable `generation`, adapter-owned `state`, absolute
canonical `worktreePath`, disposition `retain` or `reclaim`, and a nonempty
reason. Claim IDs and worktree paths are unique.

A reclaim request contains operation `reclaim` and the exact claim ID,
generation, and worktree path from inventory. The adapter repeats its canonical
liveness and ownership preflight under its own allocation lock, then returns
`reclaimed`, `retained`, or `blocked` with the same ID and generation plus a
reason. It owns complete project-resource cleanup and physical/Git worktree
retirement. This includes project-specific resources such as PostgreSQL
databases; neither their discovery nor their deletion belongs in generic
Ponytail core. The adapter removes the durable claim last. Interrupted cleanup
therefore remains represented by that claim and is resumable through another
identical request.

Ponytail freshens inventory after every result. `reclaimed` requires both the
exact generation and path to be absent. `retained` and `blocked` require the
same generation and path to remain. A generation change is a concurrency
conflict, never successful cleanup.

## Concurrency and isolation

A process-identity lock in the operating system's temporary directory is keyed
by the canonical invoking-project root. It prevents two Ponytail reclamation
runs for that project while leaving other project roots independent. The
adapter remains responsible for synchronization with its project's allocation,
adoption, and retirement commands; generation fencing is the shared invariant.

The core command never enumerates the user-wide Ponytail registry, another
project's configuration, arbitrary worktree directories, or Codex-private
session storage.
