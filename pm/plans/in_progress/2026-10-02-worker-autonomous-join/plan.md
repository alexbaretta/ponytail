# Worker-autonomous optimistic campaign joins

- Plan ID: `2026-10-02-worker-autonomous-join`
- Status: in_progress
- Approval: stakeholder authorized the feature and implementation on 2026-10-02.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-02-worker-autonomous-join","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-worker-autonomous-join
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-worker-autonomous-join

## Objective

Implement the [approved optimistic join requirement](../../../requirements/campaign-orchestration.md)
and prove the [acceptance Arc](../../../uat/campaign-orchestration.md). Workers
prepare and retry their own semantic rebases; only the coordinator joins them.

## Boundaries

One existing top-level worktree and its existing worker worktrees. No new
global long-lived lock, host API, cloud resource, worker session, automatic
worktree retirement, or change to the historical serialized-action reader.
The short existing coordinator worktree lock remains the atomic merge boundary.

## Execution

[S01](sprints/S01.md) is approved by the explicit stakeholder request to begin.
Record the baseline and implement the focused scheduler and worker protocol
changes first, then update the canonical skill and generated copy. Historical
pending `REQUEST_REBASE` actions remain executable; no new such actions are
created. If live host acceptance cannot be performed in this checkout, keep
the plan in progress and report that gate separately from automated proof.

The working-worker Git regression, scheduler compatibility tests, canonical
skill, generated host copy, requirement, architecture, UAT, and traceability
are implemented in this checkout. Build impact reports no affected or
indeterminate targets. The complete configured `npm test` pipeline passes,
including core, installer, bundled subprojects, TSTS unit tests, and the
620-file structural check. Rule copies, versions, command adapters, manifests,
registry, traceability, campaign inventory, and diff checks also pass.
Live Codex worker continuity and semantic-review behavior are separate host
gates; the plan stays in progress until they are proven.

The live GWEN authentication worker has now completed one worker-owned
semantic rebase and authenticated redelivery, followed by the coordinator's
canonical fast-forward join of `d980c2cad9ab90f7ede1561958fc1da0418ee6e2`.
The original session continued integrated acceptance. See the
[partial live UAT evidence](../../../uat/campaign-orchestration.md#partial-live-codex-proof-2026-10-02).
Its subsequent acceptance-gate record was also delivered and joined as
`386d972600e2c8f1f9a444e4aedb63f83ac07f28` without a new assignment.
The two-concurrent-worker live contention and complete post-merge acceptance
remain unverified; do not close this plan on the single-worker proof.
