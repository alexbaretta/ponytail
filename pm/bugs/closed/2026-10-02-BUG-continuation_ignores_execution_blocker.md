# Campaign continuation ignores unresolved execution blockers

- ID: `2026-10-02-BUG-continuation_ignores_execution_blocker`
- Type: `BUG`
- Status: `closed`
- Authority: stakeholder direction to repair Ponytail causes of GWEN under-parallelism.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-continuation_ignores_execution_blocker
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-continuation_ignores_execution_blocker
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-continuation_ignores_execution_blocker

## Confirmed cause

The live GWEN scheduler marked the original API standalone session's `TASKLETS`
continuation ready despite its durable unresolved `ENVIRONMENT_BLOCKED` report.
`reconcile` constructed continuation objections solely from host observations,
assignment diagnostics, and pending actions. `runnablePlanDiagnostics` read the
separate execution-blocker store, but continuation readiness did not. A
waiting session and present checkout therefore looked executable even though
the recorded external prerequisite was unchanged.

## Requirements and acceptance

The [campaign orchestration requirement](../../requirements/campaign-orchestration.md)
already requires evidence blocking a wakeup. Its
[concurrency-shortfall Arc](../../uat/campaign-orchestration.md) already tests
durable blocker reports. Clarify that an unresolved report also obstructs an
existing-session continuation; a resolved or no-longer-applicable action-scoped
report does not. No new requirement identifier is needed.

Use the same latest-per-assignment-and-phase blocker selection for runnable
diagnostics and continuations. Preserve worker, assignment, action, and report
identities. Do not wake a known blocked worker merely to repeat the failure.
The focused real-Git regression must fail before the repair, then show
`ENVIRONMENT_BLOCKED` in continuation objections and show readiness restored
after a matching `RESOLVED` report.

Pattern observation:
[2026-10-02-continuation_ignores_execution_blocker](../../debugging-pattern-observations/2026-10-02-continuation_ignores_execution_blocker.json).

## Validation and resolution

The focused real-Git continuation test failed before repair with an empty
objection list and passed afterward with `ENVIRONMENT_BLOCKED`; resolving the
report restored readiness. The related runnable-diagnostic test also passed.
Build impact found no affected or indeterminate targets. Traceability checked
295 relationships, and rule-copy and version checks passed. Full `npm test`
passed with local PostgreSQL access, including TSTS over 646 files after the
new records were staged. The repair preserves the original assignment and
does not resolve GWEN's external gate.
