# 2026-10-01-BUG-missing_worktree_has_no_recovery_action

**Title:** Provide a typed recovery action for a missing undelivered worker checkout

**Type:** `BUG`

**Status:** `closed`

**Report:** A campaign assignment retained its authenticated session, managed
worktree identity, branch, and unmerged Git commit after the physical checkout
disappeared. Because it had not yet recorded an authenticated delivery, status
correctly rejected integration but the scheduler exposed no executable action
to restore the same worker. Both advance and ready-actions therefore blocked
without a canonical recovery path.

**Intended behavior:** When complete fresh host evidence proves the same live
managed session and authenticated binding, and the assignment branch resolves
to a commit containing its dispatch revision, Ponytail emits one typed action
to recover that same checkout and session at the preserved branch revision.
The recovered worker must still record an ordinary authenticated delivery
before integration. Missing or contradictory recovery evidence remains
blocking, and recovery must never allocate a replacement worker.

**Scope:** Versioned campaign actions, ledgers, status, and ready-action
contracts; recovery selection and result validation; coordinator policy;
architecture, requirements, UAT, and regression coverage.

**Acceptance criteria:**

- A recoverable missing undelivered checkout is distinguished from an
  unrecoverable missing checkout.
- Advance persists exactly one recovery action naming the existing session,
  worktree, branch, and preserved branch revision.
- Ready-actions returns that action without weakening unrelated diagnostics.
- A recovery result is accepted only when the exact authenticated checkout is
  restored cleanly in the same repository, on the named branch and revision.
- Recovery retains the assignment and session and still requires delivery
  before integration.
- Missing branch, commit, host, binding, or managed-worktree proof remains
  blocking and creates no replacement worker.

**Authorization:** Explicit stakeholder instruction to implement the recovery
on 2026-10-01.

**Confirmed root cause:** The scheduler modeled missing checkouts only as a
terminal blocking diagnostic or as post-delivery recovery. It had no durable
host-action variant for reconstructing an authenticated worker before
delivery, so the coordinator could neither act through ready-actions nor
legitimately bypass the diagnostic.

**Requirements reconciliation:** Clarifies the approved durable campaign
recovery and authenticated-worker requirements. It does not make an
undelivered commit merge-ready.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_worktree_has_no_recovery_action

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_worktree_has_no_recovery_action

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_worktree_has_no_recovery_action

**Requirement:** [Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:** [Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:** [Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The focused campaign, policy, and versioned-contract
suite passed 50/50 tests. Full Node acceptance passed 467/470 tests; the three
failures are the pre-existing restricted-PATH installer fixtures that cannot
find `codex` or `npm`. The installer shell suite, Pi suite (23/23), MCP suite
(4/4), and TSTS suite (80/80) passed. Traceability generation and validation,
command-adapter, runtime-registry, manifest, rule-copy, registry, and version
checks also passed. Build-impact reported no affected or indeterminate build
targets.

**Resolution:** Added the versioned `RECOVER_WORKTREE` action. Complete fresh
host evidence and the authenticated worker binding can now prove that an
undelivered missing checkout is recoverable from its preserved branch. The
scheduler returns one action for the existing session and exact path, branch,
and revision; its result accepts only the clean restored checkout in the same
repository. The assignment remains active and must still deliver normally
before integration.
