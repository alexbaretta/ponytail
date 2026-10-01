# 2026-10-01-FEAT-stale_worktree_slot_reclamation

**Title:** Reclaim stale project worktree slots safely

**Type:** `FEAT`

**Status:** `closed`

**Objective:** Add a project-isolated Ponytail subcommand that inventories
project-owned worktree claims, reclaims claims proven abandoned by the
project's canonical lifecycle adapter, and verifies that both the exact claim
generation and its associated worktree are absent before reporting success.

**Source and authorization:** The stakeholder reported on 2026-10-01 that all
146 GWEN Codex slot claims were occupied while 122 recorded worktree paths no
longer existed, and explicitly requested an algorithmic Ponytail subcommand to
reclaim stale unused slots and delete their corresponding worktrees.

**Scope:** A versioned project configuration and adapter protocol, deterministic
batch reclamation, generation fencing, dry-run and JSON output, CLI routing,
project-specific resource retirement, project documentation, and automated
unit and cross-session integration proof.

**Exclusions:** Ponytail does not encode a client project's resource topology,
infer abandonment from elapsed time, inspect another registered project, or
delete a caller-supplied path directly. Each invoking project owns the
authoritative abandonment proof and exact resumable cleanup through its tracked
adapter.

**Acceptance criteria:**

- `ponytail worktree reclaim --dry-run` reports every claim and the adapter's
  current retain-or-reclaim disposition without mutation.
- `ponytail worktree reclaim` processes reclaimable claims deterministically
  and supplies the exact claim identity, generation, and worktree path back to
  the adapter for a fresh fenced preflight.
- A reclaimed result is accepted only when fresh inventory no longer contains
  that exact claim generation and the recorded worktree path is absent.
- The project adapter retains the claim as a recovery record until every
  claim-owned resource, including project-specific databases when applicable,
  and the worktree have been retired.
- A retained or blocked claim remains present at the same generation; one
  blocked claim does not prevent independent reclaimable claims from being
  processed.
- Malformed, untracked, dirty, symlinked, escaping, or failing adapter state
  fails closed without Ponytail selecting an alternative cleanup path.
- Two independent sessions cannot run reclamation concurrently for the same
  invoking project.

**Cross-session effect:** This explicitly requested operation allows one
maintenance session to retire resources previously owned by another session.
The approved availability boundary is limited to claims that the invoking
project's canonical adapter currently proves abandoned. Active or uncertain
claims are retained, and exact generation fencing prevents an old observation
from reclaiming a newly reused slot.

Traceability: introduces REQ-WORKTREE-RECLAMATION from issue 2026-10-01-FEAT-stale_worktree_slot_reclamation

Traceability: plans-implementation REQ-WORKTREE-RECLAMATION from issue 2026-10-01-FEAT-stale_worktree_slot_reclamation

Traceability: plans-verification REQ-WORKTREE-RECLAMATION from issue 2026-10-01-FEAT-stale_worktree_slot_reclamation

**Requirement:** [Worktree reclamation](../../requirements/worktree-reclamation.md)

**Architecture:** [Worktree reclamation](../../architecture/worktree-reclamation.md)

**UAT:** [Worktree reclamation Suite](../../uat/worktree-reclamation.md)

**Validation evidence:** Test-first CLI proof initially failed with unknown
command `worktree`. The final focused suite passed 9/9 reclamation unit and
integration tests, including project-resource cleanup, resumable partial
retirement, generation reuse, same-project serialization, distinct-project
independence, malformed output, and untrusted configuration. Build-impact
reported no affected build targets for every changed path. Traceability checked
167 relationships, TSTS checked 552 files, version/rule/manifest checks passed,
and the Codex installer, Pi extension, Ponytail MCP, and TSTS suites passed.
The complete root Node population passed 462/465; its only failures are the
three pre-existing installer fixtures whose restricted PATH cannot find
`codex` or `npm`.

**Resolution:** Added `ponytail worktree reclaim [--dry-run] [--json]` with a
strict V1 project lifecycle-adapter protocol. The adapter proves abandonment,
retires every project-owned resource and the Git worktree, and removes the
claim last. Ponytail serializes each project independently, generation-fences
every request, verifies fresh inventory and path postconditions, and fails
closed on untrusted or malformed adapter state.
