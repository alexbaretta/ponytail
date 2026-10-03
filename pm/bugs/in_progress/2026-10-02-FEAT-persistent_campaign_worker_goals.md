# Give each Codex campaign worker a persistent assignment Goal

- ID: `2026-10-02-FEAT-persistent_campaign_worker_goals`
- Type: `FEAT`
- Status: `in_progress`
- Requested: 2026-10-02 by the stakeholder after observing one-turn workers.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md#persistent-codex-worker-goals).
- UAT: [persistent worker Goal](../../uat/campaign-orchestration.md#arc-codex-worker-dispatch-establishes-a-persistent-assignment-goal).
- Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-FEAT-persistent_campaign_worker_goals

## Approved outcome

Every new or restarted Codex campaign worker establishes a native, active
thread Goal for its exact assignment before executing it. The Goal persists
across turns, while typed actions continue to constrain authority. The worker
reports goal state; a delivered message alone does not prove activation. No
conflicting unfinished Goal is overwritten, and a missing Goal capability is
an explicit host blocker rather than a silent one-turn fallback.

## Acceptance

The skill-contract test must enforce the handshake and its no-fallback rule.
Live acceptance must show a worker create or retain its native Goal, finish a
turn with the plan incomplete, then continue in the same session and Goal.
The Goal must remain incomplete through review-only delivery and coordinator
join, and complete only after integrated plan DONE evidence. The host's Goal
API is thread-scoped; Ponytail cannot create or inspect another thread's Goal
from its CLI, so the worker performs and reports the native handshake.
