# Legacy recovery binding differs from native session checkout

**Type:** `BUG`

**Status:** `in_progress`

**Authorization:** The stakeholder explicitly authorized collaboration with the
GWEN coordinator, diagnosis and correction of Ponytail blockers, and recovery
instructions on 2026-10-01.

**Requirement:** [Retained workers](../../requirements/worker-worktree-retention.md)

**Report and root cause:** The previous replacement-path recovery protocol
changed the authenticated binding but did not move the native chat's cwd. PWP's
original `38fe/gwen` checkout remained clean and detached at its earlier recovery
checkpoint; `pwp-recovery/gwen` held the delivered merged branch. A truthful fresh
host observation therefore produced `CAMPAIGN_SESSION_WORKTREE_MISMATCH` and
blocked scheduling. Exact-path recovery could only restore the incorrectly
relocated binding, leaving no canonical reconciliation operation.

**Correction:** The same authenticated worker recovery command validates fresh
native host evidence against its initial completed dispatch and historical
recovery result. It transfers the branch back to the proven original checkout,
retains the replacement detached, and reconciles binding/worker/assignment paths
without resetting merged state or completed actions. It rejects dirty or
unproven targets and protects ignored files. Interrupted transfer is retryable.

**Evidence:** A real Git regression first failed by returning the replacement
path. The focused worker/scheduler/hook selection passes 62 tests. Live PWP
reconciliation and coordinator campaign resumption remain pending.

Final configured `npm test` passes against the staged correction, including
the local PostgreSQL tests, installer harness, Pi, MCP, TSTS, and 572-file
structure check. Rule copies, versions, generated registry/adapters/manifests,
traceability and diff checks pass. Build impact selects no targets.
Log: ignored `tmp/legacy-recovery-final.log`.

Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-legacy_recovery_native_path
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-legacy_recovery_native_path
