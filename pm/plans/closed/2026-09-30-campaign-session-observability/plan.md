# Campaign session observability and coordinator harness

- **Plan ID:** `2026-09-30-campaign-session-observability`
- **Status:** `closed`
- **Approval:** The stakeholder explicitly requested implementation on
  2026-09-30.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{
  "schemaVersion": 2,
  "id": "2026-09-30-campaign-session-observability",
  "parent_plan_id": null,
  "depends_on": []
}
-->

## Objective

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-09-30-campaign-session-observability
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-09-30-campaign-session-observability
Traceability: plans-implementation REQ-PONYTAIL-CLI-AGENT-HARNESS from plan 2026-09-30-campaign-session-observability
Traceability: plans-verification REQ-PONYTAIL-CLI-AGENT-HARNESS from plan 2026-09-30-campaign-session-observability

Provide a complete deterministic campaign view of session activity,
assignments, managed worktrees, and contradictions, and teach the published
agent harness to monitor and advance that state safely.

## Scope

- Add a versioned authenticated Codex host-observation contract and CLI input.
- Add a V2 campaign status contract with explicit session, assignment,
  worktree, working, idle, waiting, finished, and reusable views.
- Return complete structured operational diagnostics while failing closed on
  every coordinator mutation.
- Publish periodic coordinator monitoring, diagnostic-first recovery,
  rebase/fast-forward, reuse, and cleanup policy through the canonical skill
  and generated host adapters.
- Synchronize requirements, architecture, UAT, traceability, command
  inventory, and versioned contracts.

## Exclusions

- No private or reverse-engineered Codex API.
- No background daemon, timer, cloud resource, or independent scheduler.
- No inference of session liveness from a partial host listing or chat memory.
- No cleanup outside Ponytail-selected typed actions.

## Plan-wide acceptance

- `ponytail campaign status <campaign> --json` exposes every requested view
  after an authenticated host observation and retains deterministic recovery
  state across coordinator context loss.
- Status reports all listed operational inconsistencies with stable codes and
  affected identities; advance makes no mutation while any blocker exists.
- The canonical and generated agent harnesses require periodic observation,
  diagnostic-first recovery, completion inspection, rebase/fast-forward, and
  explicit reuse or cleanup.
- Focused, full, traceability, generated-adapter, version, manifest, and
  campaign validation gates pass.

## Sprints

1. [S01](sprints/S01.md): implement the observation/status contracts and
   coordinator harness, then complete acceptance — APPROVED.
