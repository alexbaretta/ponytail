# 2026-10-01-BUG-managed_worktree_not_attached

**Title:** Retire managed campaign worktrees that are not attached artifacts

**Type:** `BUG`

**Status:** `closed`

**Report:** A campaign worker received an `ARCHIVE_WORKTREE` action and called
Codex's recoverable archive operation. Codex rejected it with “This worktree is
not attached to the current task.” The checkout remained present and clean, so
the campaign could not complete cleanup.

**Intended behavior:** Cleanup must work for every authenticated Codex-managed
campaign worktree, including worktrees created by thread handoff that are not
archive artifacts attached to the worker chat. The worker performs canonical
project-resource cleanup, then the coordinator moves that exact session out of
the managed worktree through the supported current-host thread handoff and
records success only after the old checkout disappears.

**Scope:** Versioned cleanup action, ledger, status, and ready-action contracts;
coordinator policy; architecture, requirements, UAT, and regression coverage.

**Acceptance criteria:**

- `ARCHIVE_WORKTREE` names the exact bound session and worktree.
- Historical cleanup actions normalize with the session from their immutable
  assignment without changing action or idempotency identity.
- Coordinator policy runs project-owned resource cleanup before worktree
  retirement.
- The coordinator retires the managed checkout with current-host thread
  handoff and does not require an attached archive artifact.
- Success remains gated on disappearance of the exact authenticated checkout.
- Failure leaves the same action and assignment cleanup-pending for retry.

**Authorization:** Repair of the unsuccessful cleanup implementation reported
by the stakeholder on 2026-10-01. This corrects an agent-created defect within
the already authorized campaign cleanup work.

**Confirmed root cause:** The coordinator policy equated the host's
`managedWorktree` classification with ownership of an archive artifact by that
worker chat. Codex's archive operation is task-attachment-scoped, while a
worktree created by thread handoff can be host-managed without being attached
to the destination chat. The repository's earlier live-host acceptance record
already documented that distinction, but the cleanup policy encoded the
unsupported equivalence.

**Debugging-pattern observation:**
[Cleanup assumed a managed worktree was attached](../../debugging-pattern-observations/2026-10-01-cleanup_assumed_managed_worktree_was_attached.json).

**Requirements reconciliation:** Clarifies the approved campaign cleanup
requirement and supported Codex host boundary. It changes no cleanup
eligibility, integration, session identity, or project-resource ownership.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-managed_worktree_not_attached

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-managed_worktree_not_attached

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-managed_worktree_not_attached

**Requirement:** [Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:** [Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:** [Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The focused campaign and coordinator-policy selection
passed 35/35 tests. Full Node acceptance passed 468/471 tests; the three
failures are the pre-existing restricted-PATH installer fixtures reporting
`codex or npm is required`. The standalone Codex installer harness, Pi suite
(23/23), MCP suite (4/4), and TSTS suite (80/80) passed. Traceability,
generated adapters and manifests, rule copies, registries, version checks, and
JSON parsing passed. Build-impact reported no affected or indeterminate build
targets.

**Resolution:** `ARCHIVE_WORKTREE` V4 now carries the bound session identity;
historical cleanup actions acquire it from their assignment during ledger
normalization. Coordinator policy now treats current-host thread handoff as the
single supported retirement operation after project-owned resource cleanup,
instead of asking the worker to use an attachment-scoped archive operation.

**Subsequent correction:** The handoff remedy above was disproved by the next
coordinator report: handoff changed the ordinary checkout and thread identity
without retiring the source. See
[canonical project retirement](2026-10-01-BUG-handoff_is_not_worktree_retirement.md)
for its replacement. The original V4 action identity remains valid.
