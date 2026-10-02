# Bounded retry of unknown worker creations

- Plan ID: `2026-10-02-unknown-dispatch-retry`
- Status: closed
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

## Final evidence

Implementation: `ae06663`, followed by final malformed-null history validation.
Configured `npm test` passes against the final product tree: 530 core, 23 Pi,
4 MCP and 80 TSTS tests; 614-file directory validation. Log:
`tmp/unknown-dispatch-retry-final.log` (ignored). Focused tests prove real CLI
restart/idempotency, original receipt preservation, stale capability/results,
all eligibility refusals, safe idle reuse, retained capacity and the attachment
lock interleaving. Original V1–V5 readers remain unchanged.
Build-impact reports no affected/indeterminate targets. Rule copies, versions,
generated adapters and skill structure pass. Traceability is regenerated.
No native workers, consumer ledgers, branches, worktrees or resources changed.
Installation refresh has separate direct human authorization; it is not a native
creation acceptance claim. The coordinator owns the five original retries.

Authorized Codex refresh and installer `--check` pass. Cached plugin runtime,
authentication hook and installed plan-execution skill match canonical source
byte-for-byte. No host-side creation result is implied by installation.

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-unknown-dispatch-retry
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-unknown-dispatch-retry
