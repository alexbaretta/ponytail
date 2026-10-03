# Linked dispatch prerequisite omitted from campaign graph

- ID: `2026-10-02-BUG-prose-only-campaign-dispatch-dependency`
- Type: `BUG`
- Status: `closed`
- Reported: 2026-10-02 during live GWEN parallelism diagnosis.

## Failure

GWEN managed plans explicitly said `Dispatch only after` a linked prerequisite
plan, but V2 `depends_on` was empty. Ponytail correctly schedules from the
machine-readable graph, so it classified these plans as review-ready before
their declared prerequisites were complete. The affected GWEN metadata was
reconciled in its owning repository.

## Correction

For a V2 plan, campaign validation now rejects a direct plan-manifest link in
an explicit `Dispatch only after` line under `## Dependencies` unless that plan
is also in `depends_on`. It does not infer an edge from prose or parse arbitrary
natural language. Plan-execution instructs authors to encode all whole-plan
dispatch prerequisites, including those described in sprint gates.

Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
Acceptance: [linked dispatch prerequisite Arc](../../uat/campaign-orchestration.md#arc-reject-prose-only-linked-plan-dispatch-prerequisites).
Proof: focused campaign-census test, live GWEN graph validation after its
metadata correction, and final core acceptance.
