# Worktree reclamation Suite

[Back to the UAT index](index.md).

**Requirement:**
[`REQ-WORKTREE-RECLAMATION`](../requirements/worktree-reclamation.md), approved
2026-10-01.

## Arc: Reclaim abandoned claims without affecting active sessions

Traceability: verifies REQ-WORKTREE-RECLAMATION

- **Actor:** Developer or campaign coordinator maintaining local worktree
  capacity.
- **Prerequisites:** A committed project lifecycle adapter exposing one active
  claim, one abandoned claim whose worktree still exists, and one independently
  blocked abandoned claim. Every claim also owns a project-specific resource
  representing a PostgreSQL database.
- **Profiles:** Automated cross-session CLI profile using isolated filesystem
  and Git fixtures.
- **External effects:** Deletes only the adapter-proven abandoned claim's
  project resources and worktree.

1. Run `ponytail worktree reclaim --dry-run --json`.
   - All claims are reported in stable order; active and uncertain claims are
     retained; no claim, project resource, or worktree changes.
2. Run `ponytail worktree reclaim --json` concurrently from two independent
   maintenance sessions in the same project.
   - Exactly one run owns the project reclamation lock; the other fails before
     adapter mutation.
3. Let the owning run process the reclaimable claims.
   - Every adapter request repeats the exact inventory claim ID, generation,
     and path. The active claim is never submitted for mutation.
4. Let one adapter preflight return blocked and another complete reclamation.
   - The blocked claim and worktree remain, while already completed idempotent
     resource cleanup remains complete for a later retry. Independent cleanup
     continues, and the successful claim, project resource, and worktree are
     all absent. The claim is removed last.
5. Reuse the reclaimed claim ID with a new generation before an old request can
   complete.
   - Generation fencing prevents the old observation from deleting or claiming
     success for the new owner.

## Arc: Fail closed on untrusted lifecycle configuration

Traceability: verifies REQ-WORKTREE-RECLAMATION

- **Actor:** Developer invoking Ponytail in a configured project.
- **Prerequisites:** Fixtures with an untracked, modified, symlinked, escaping,
  malformed, non-executable, or failing lifecycle adapter.
- **Profiles:** Automated module and CLI contract profile.
- **External effects:** None.

1. Invoke dry-run and mutating reclamation against each invalid fixture.
   - Ponytail exits `2` with an actionable diagnostic and does not invoke an
     alternative command or mutate any claim or worktree.
2. Return malformed inventory or reclaim output from an otherwise trusted
   adapter.
   - Exact V1 readers reject it; no later claim is processed.
