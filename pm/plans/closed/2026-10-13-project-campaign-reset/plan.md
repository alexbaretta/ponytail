# Explicit project campaign reset

Status: CLOSED. Authority: human reset request on 2026-10-13.

OBL-RESET-1: DONE. Implement REQ-ROLLING-RESET and demonstrate ACC-ROLLING-RESET.
Canonical conditions: [requirements](../../../requirements/rolling-campaigns.md).
Acceptance: [UAT](../../../uat/rolling-campaigns.md).

Scope: project-scoped typed reset tooling, command help, exported lifecycle
instructions and durable regression proof. Do not execute against GWEN from
this checkout. Preserve unrelated uncommitted issue prose.

Implement preview/inventory, durable scheduling fence, native cessation,
resource cleanup, Git recovery/removal/pool preparation and final project-only
DB clearing. Use focused disposable-Git and isolated PostgreSQL tests, then
full repository acceptance. Deliver validated command to GWEN coordinator.

## Final acceptance

Full `npm test` passed 948 tests with zero failures; ignored log:
`tmp/project-reset-full.log`. TSTS checked 1,572 files without violations.
Focused reset/store proof passed seven tests; traceability checked 974
relationships without violations. Runtime consistency, rule copies, versions
and command help passed. Final read-only review accepted all corrected guards.

Disposable Git and isolated PostgreSQL tests demonstrate original active actor
interruption/archival through the controlled native protocol, external checkout
removal, preserved source recovery refs/cache, pending cleanup restart, foreign
repository and active Git-operation refusal, initialization fencing and harmless
completed retry after new allocation. No live GWEN reset was performed; this is
not a claim of live native acceptance or completed client campaign restart.
