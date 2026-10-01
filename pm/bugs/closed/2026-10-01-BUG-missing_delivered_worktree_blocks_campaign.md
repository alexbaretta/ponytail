# 2026-10-01-BUG-missing_delivered_worktree_blocks_campaign

**Title:** Preserve campaign progress after a delivered worker checkout disappears

**Type:** `BUG`

**Status:** `closed`

**Report:** A coordinator observed every retained session and found no active
work, with completed deliveries preserved. Repeated missing-checkout
diagnostics nevertheless blocked both integration and unrelated dispatch.

**Intended behavior:** A missing worker checkout remains diagnostic. When the
assignment has a previously authenticated delivery proving its exact clean
commit and committed evidence, and the host observes the session as completed,
the missing checkout does not invalidate that durable delivery or block
integration, later cleanup, or unrelated dispatch. A missing checkout without
that proof remains blocking.

**Scope:** Campaign worker reconciliation, diagnostic classification,
scheduler and ready-action gates, coordinator policy, automated regression
coverage, architecture, and acceptance documentation.

**Acceptance criteria:**

- A completed session with an authenticated delivery retains its delivered
  revision and evidence after its checkout disappears.
- Status reports the missing checkout with a distinct recoverable diagnostic.
- Advance may reconcile, fast-forward integrate, and dispatch independent work
  while that recoverable diagnostic remains visible.
- Missing checkouts without a verified delivery continue to block mutation.
- Cleanup remains explicit and action-driven after final plan closure.

**Authorization:** Explicit stakeholder instruction to repair the scheduler on
2026-10-01.

**Confirmed root cause:** Reconciliation replaced every missing bound checkout
with an incomplete `missing` worker observation before considering its durable
delivery. That erased the exact clean delivered revision, emitted universally
blocking worker/worktree diagnostics, and prevented both fast-forward
integration and unrelated dispatch even when the delivered Git commit remained
available.

**Requirements reconciliation:** Clarifies the existing approved durable
delivery and fail-closed campaign-orchestration requirement. A verified
delivery is source-proven evidence that survives checkout loss; an unverified
missing checkout remains unavailable evidence.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_delivered_worktree_blocks_campaign

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_delivered_worktree_blocks_campaign

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_delivered_worktree_blocks_campaign

**Requirement:**
[Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:**
[Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:**
[Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** Focused scheduler and policy suites passed 37/37. The
full Node suite passed 466/469; its three failures are the pre-existing
restricted-PATH installer fixtures reporting `codex or npm is required`. The
installer harness, Pi extension (23/23), Ponytail MCP (4/4), TSTS unit suite
(80/80), structural checks, generated adapters, manifests, rule copies,
registry, version check, and 175 traceability relationships passed.

**Resolution:** Missing-checkout reconciliation now recovers only from a
completed host observation, authenticated delivery record, and surviving
delivered commit. Status exposes
`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` as informational while retaining
ordinary missing-checkout diagnostics as blocking. Reconcile, advance, and
ready-actions share that classification, so the exact delivered commit remains
integrable and independent work remains dispatchable without bypassing the
durable action protocol.
