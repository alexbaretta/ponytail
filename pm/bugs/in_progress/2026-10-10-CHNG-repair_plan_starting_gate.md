# Allow explicitly owned existing failures at repair-plan kickoff

- Issue ID: `2026-10-10-CHNG-repair_plan_starting_gate`
- Type: CHNG
- Status: in_progress
- Source: coordinator proposal from the stakeholder's 2026-10-10 convergence
  discussion; approved and activated with the recorded plan.
- Approval: the current human stakeholder approved this named CHNG as part of
  the recorded plan and glossary amendment with "Approved. Go." on 2026-10-10.
- Implementation activation: stakeholder kickoff on 2026-10-10; requirements
  and acceptance reconciliation is the first S01 gate.
- Associated plan: [Obligation-centered execution](../../plans/in_progress/2026-10-10-obligation-centered-execution/plan.md).

## Existing behavior and proposed change

Current [plan-execution policy](../../../skills/plan-execution/SKILL.md) requires
a green starting checkpoint and prevents starting when a required applicable
test fails. Structural traceability gaps already have explicit handling.

Permit reproduced pre-existing test failures only when the approved repair
objective expressly owns the exact selection, governing requirement, unresolved
obligation and bounded repair. Record their failing evidence before kickoff.
Other applicable starting checks retain existing pass/manual/unavailable rules.
New, unplanned or unrelated failures still block. Target failures remain
unresolved and prevent final acceptance; this amendment never weakens assertions.

## Acceptance and authority

Demonstrate a repair plan admitted with its exact owned baseline failure, an
unrelated failure rejected, and an introduced regression rejected. Preserve
full final acceptance and truthful before/after vectors. Do not auto-enroll
failing tests into repair scope or interpret blanket plan approval as new scope.

This is an independent CHNG requiring explicit human approval. Until approved
and activated, current readiness remains authoritative. This is not a BUG or
a mechanical configuration repair. It is not required merely to record or review
the proposal. The associated plan links this canonical issue rather than claiming
approval or implementation has already occurred.

## Validation and resolution

Proposal links and lifecycle placement are subject to document checks. The approved policy is implemented; final acceptance remains pending.

## Activation reconciliation

Approved scope has been reconciled into [requirements](../../requirements/obligation-execution.md)
and [UAT](../../uat/obligation-execution.md). Implementation and executable proof
gaps remain owned by the active plan. No planned test is credited as completed.

Traceability: introduces REQ-REPAIR-PLAN-STARTING-GATE from issue 2026-10-10-CHNG-repair_plan_starting_gate
