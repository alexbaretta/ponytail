# Worker closure delivery uses the coordinator's obsolete plan path

- ID: `2026-10-01-BUG-worker_closure_delivery_locator`
- Type: `BUG`
- Status: `closed`

GWEN's monitor-state worker committed its accepted plan closure, moving its
stable plan ID from `in_progress` to `closed`. Authenticated delivery rejected
the actual closed evidence paths against the coordinator's still-active plan
path. The unmerged closure then caused `CAMPAIGN_CLEANUP_UNINTEGRATED` and
blocked every queued join.

The confirmed cause is the `deliver` boundary taking the evidence locator from
the coordinator graph. The correction resolves the assigned stable plan ID in
the authenticated worker checkout and verifies the same campaign before
validating committed evidence. Another plan's evidence remains rejected.

Authorization: the stakeholder authorized fixing confirmed Ponytail defects
and collaborating with the GWEN coordinator through campaign completion.

Requirements reconciliation: clarifies stable plan ownership in
[campaign orchestration](../../requirements/campaign-orchestration.md).
[UAT](../../uat/campaign-orchestration.md) covers closure delivery and the
ordinary serialized join. No new lifecycle or host effect is introduced.

Acceptance: the real-Git CLI regression reproduced the exact outside-plan
rejection before the correction, then passed delivery and fast-forward
integration afterwards. All 49 campaign census/orchestration tests pass.
Live GWEN redelivery accepted the same clean closure commit with its actual
closed evidence paths, cleared the delivery-related guard, and resumed normal
serialized actions. Live closure acceptance completed on 2026-10-01: the same
worker's original closure was rebased through action
`29850fad-a572-42d2-ba50-0c75ab00a47c` and fast-forward integrated at
`cd7985a11477102da02b0d2b79a7bfe2fedc4079`. The coordinator's current tree
contains `pm/plans/closed/2026-09-30-traceability-async-monitor-state/plan.md`
with closed lifecycle and preserved acceptance evidence. Canonical campaign
validation passed after integration. No replacement session or manual merge
was used; this resolves this bug, not the remaining campaign acceptance.
Full core unit suites, installer proofs, traceability, rule-copy, version, and
TSTS checks pass. The final TSTS check ran after the new records were staged,
as required by their tracked-file policy; no product build target was affected.

Pattern observation:
[worker closure delivery locator](../../debugging-pattern-observations/2026-10-01-worker_closure_delivery_locator.json).

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-worker_closure_delivery_locator
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-worker_closure_delivery_locator
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-worker_closure_delivery_locator
