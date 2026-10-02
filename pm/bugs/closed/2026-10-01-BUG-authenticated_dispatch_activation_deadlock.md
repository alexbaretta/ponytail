<!-- Copyright (c) 2026 Alex Baretta. Licensed under the MIT License. -->

# 2026-10-01-BUG-authenticated_dispatch_activation_deadlock

## Status

closed

## Source, scope, and authority

Confirmed in the authorized live GWEN campaign test, 2026-10-01. Successful
authenticated REUSE `92bd02a4-5f03-4fb2-8d7f-11c9b95fb12f` made assignment
`a9e4a968-adad-4ae0-9b40-6275babfc319` ACTIVE while both tracked plans remained
OPEN. The user authorized fixing confirmed campaign execution blockers.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-authenticated_dispatch_activation_deadlock

## Diagnosis and repair

Dispatch completion admits attachment before plan edits; lifecycle validation
requires ACTIVE to already be in_progress. The producer's legitimate bootstrap
state blocks its consumer. Suppression alone also leaves activation delivery
outside merge readiness. Preserve dispatch/binding proof, accept this proven
interval, require worker activation before delivery, and allow that exact clean
delivery into the unchanged serialized join path.

Canonical clarification: [operational requirement](../../requirements/campaign-orchestration.md#operational-campaign-status).
Acceptance: [activation Arc](../../uat/campaign-orchestration.md#arc-authenticate-activate-and-integrate-an-initially-open-plan).

## Verification

Real Git/authenticated binding regression failed before repair at the exact
ACTIVE/OPEN diagnostic, then passed through authenticated reuse, rejection of
premature delivery, activation delivery, and serialized fast-forward integration.
Controls retain diagnostics for unproven assignments and rejected/deferred plans.
All 46 focused orchestration/policy tests passed. Final `npm test` passes: 513
core, Codex installer checks, 23 Pi, four MCP, 80 TSTS, and 590-file structure.
Build-impact reports no affected/indeterminate targets. Traceability, generated
OpenClaw skills, rule-copy, version, JSON-schema observation and diff checks pass.
Read-only live reconciliation no longer emits the audit lifecycle mismatch.
Final live advancement still requires fresh native observations and the human
index checkpoint; no tasklet-execution or campaign-completion claim is made.
No live ledger or plan was manually modified.
