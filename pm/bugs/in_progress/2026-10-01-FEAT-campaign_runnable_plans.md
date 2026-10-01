# Exact tasklet-ready campaign query and deterministic batch dispatch

- ID: `2026-10-01-FEAT-campaign_runnable_plans`
- Type: `FEAT`
- Status: `in_progress`

The stakeholder requires the exact list of plans with satisfied dependencies
and a nonempty set of runnable tasklets, used as the sole plan-start query.
The former scheduler checked only campaign prerequisites and could activate
an unreviewed or exhausted plan. The approved extension also requests batch,
programmatic activation when the supported Codex host makes that possible.

Implementation plan:

1. Reuse canonical execution-sprint and immediately-ready tasklet selection.
2. Share one predicate among the read-only summary, new/queued dispatch, and
   unstarted retry checks; preserve delivered integration readiness.
3. Add atomic batch reservations under existing project capacity, reuse,
   authentication, host-observation, uniqueness, and join gates.
4. Reconcile requirements, UAT, architecture, versioned output, and coordinator
   skill instructions; generate copies and traceability.
5. Run focused regressions and final core acceptance, then have GWEN's existing
   coordinator use the validated query and batch actions at maximum safe capacity.

Capability evidence: installed Codex 0.159.2 app-server generated schemas expose
`thread/start` but no managed-worktree operation. Its CLI cannot replace the
desktop native actuator. Batch scheduling therefore selects and reserves plans
programmatically and returns native host actions, without claiming activation.

Requirements: [campaign orchestration](../../requirements/campaign-orchestration.md).
Verification: [campaign Suite](../../uat/campaign-orchestration.md).
Focused proof: `node --test tests/campaign-orchestration.test.js tests/campaign-census.test.js`.
Acceptance: 85 focused tests pass across campaign census/orchestration,
authenticated host hooks, and retained-worker lifecycle. The full `npm test`
pipeline passes: 505 core tests, installer proofs, bundled subproject suites,
80 TSTS unit tests, and TSTS structural checking of 582 files. Traceability
checks 218 relationships without violations; generated adapters/manifests,
rule copies, and all seven version files validate. Build-impact reports no
affected or indeterminate build targets. Live GWEN query at integration
`281648fa82a1b31e753909d89e357a0045aca464` returned exactly diagnostic-succeed /
S01-F03-T034, effect-disposition / S01-F03-T032, and gate-race / S01-F03-T037.
After observing all sixteen retained assignments idle, `schedule-ready`
returned no new actions because eligible plans already had assignments. Normal
advance also succeeded; no duplicate worker was created. Further live
parallelization acceptance remains in progress with the existing coordinator;
no new desktop capability is claimed.

Later live acceptance at integration
`c725f51078e79fcba9a8b6f10b28a873ed8899bd` verified dependency closure
unlocked safe-inspection-audit / S01-F03-T040 alongside the already-assigned
effect-disposition and gate-race tasklets. With the historical pool at capacity,
the first batch query returned no dispatch while completed assignments awaited
logical release. Canonical advance released monitor-state without deleting its
session, checkout, or resource claim. The next batch query returned exactly
REUSE_WORKER `92bd02a4-5f03-4fb2-8d7f-11c9b95fb12f` for audit assignment
`a9e4a968-adad-4ae0-9b40-6275babfc319`, retaining session
`01a0f68d-279a-7183-a778-6bc995849281` and checkout
`/Users/alex/.codex/worktrees/60d8/gwen`. Native prompt review rejected
delivery of the new assignment capability before host start; the action remains
NOT_STARTED. No STARTED receipt, attachment, running tasklet, or activation
acceptance is claimed. This refusal is not an identified human policy ban.

Pattern observation: [dispatch without runnable tasklets](../../debugging-pattern-observations/2026-10-01-dispatch_without_runnable_tasklets.json).

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_runnable_plans
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_runnable_plans
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_runnable_plans
