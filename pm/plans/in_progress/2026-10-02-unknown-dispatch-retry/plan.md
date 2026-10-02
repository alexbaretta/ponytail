# Bounded retry of unknown worker creations

- Plan ID: `2026-10-02-unknown-dispatch-retry`
- Status: in_progress
- Approval: direct stakeholder `approved` on 2026-10-02 after the bounded repair
  explanation. No consumer state mutation, native session creation or deletion.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-02-unknown-dispatch-retry","parent_plan_id":null,"depends_on":[]}
-->

Objective: implement the [retry contract](../../../requirements/campaign-orchestration.md#explicit-retry-of-unknown-creation-outcomes)
and [acceptance Arc](../../../uat/campaign-orchestration.md#arc-explicit-unknown-outcome-creation-retry).
This repository owns source, tests, policy and generated adapters. Exclusions:
missing-checkout replacement, planning dispatch, deletion and capacity waivers.
Starting checkpoint: clean `8199fa3`; focused baseline passes all 44 scheduler
tests. Prior configured core acceptance retained; final full acceptance required.

[S01](sprints/S01.md) owns the frozen ordered batch. Final acceptance: real-Git
retry/storage/attachment proof, full Node command, rule copies, versions,
generated adapters, traceability and build-impact. Native creation is not
claimed by fixtures. No unresolved product questions.

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-unknown-dispatch-retry
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-unknown-dispatch-retry
