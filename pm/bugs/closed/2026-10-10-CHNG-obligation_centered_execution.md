# Make obligations central to planning and acceptance

- Issue ID: `2026-10-10-CHNG-obligation_centered_execution`
- Type: CHNG
- Status: closed
- Source: stakeholder's 2026-10-10 discussion of obligation-centered execution;
  coordinator-authored incorporation proposal, now recorded for review.
- Approval: the current human stakeholder approved this named CHNG as part of
  the recorded plan and glossary amendment with "Approved. Go." on 2026-10-10.
- Implementation activation: stakeholder kickoff on 2026-10-10; requirements
  and acceptance reconciliation is the first S01 gate.
- Epic plan: [Obligation-centered execution](../../plans/closed/2026-10-10-obligation-centered-execution/plan.md).

## Existing behavior and proposed change

Current [plan-execution policy](../../../skills/plan-execution/SKILL.md) makes
tasklets atomic acceptance/evidence units and selects work using tasklet graph
readiness, risk and affinity. Change the central acceptance object to a stable
obligation with a discharge criterion and adequate certificate. Retain conditional
subordinate atomic tasklets and exact-path/dependency safeguards. Preserve
historical readers rather than rename their fields or reinterpret DONE.

The accepted definition and six-coordinate order are design inputs. This issue
proposes new satisfaction/assignment semantics, certificate-based parent closure,
obligation-first selection, scoped completeness/counting, UAT alternatives, and
versioned assignment/discovery integration as specified by the
[design](../../plans/closed/2026-10-10-obligation-centered-execution/design.md).

Planning amendment on 2026-10-10: the stakeholder requested a shared glossary
for rules and skills and suggested acceptance for the atomic UAT condition.
The design proposes one canonical definition source, acceptance for the condition
and Arc for its demonstration. Existing integration execution semantics remain
unchanged. This scope was approved and activated with the recorded plan.

## Acceptance and authority

Prove stable identity, independent satisfaction and assignment, scoped evidence,
earliest-coordinate selection, honest downstream growth/disturbances/rebaselines,
bounded authority, and legacy compatibility. No worker claim, merged commit,
structural pass or tasklet count may substitute for discharge. Preserve all
existing mandatory QA, topology, production-path and project boundaries.

This issue is the canonical proposed policy change associated with the epic.
It does not activate canonical requirements or authorize implementation. The
separate [starting-gate change](2026-10-10-CHNG-repair_plan_starting_gate.md)
requires its own approval. Exact candidate requirements and UAT identities are
listed in the design; they become active only through the normal kickoff gate.

## Validation and resolution

Proposal links and lifecycle placement are subject to document checks. Product
implementation, certificate evidence and acceptance are complete. This is a
approved change, implemented and verified under its linked plan.

## Activation reconciliation

Approved scope has been reconciled into [requirements](../../requirements/obligation-execution.md)
and [UAT](../../uat/obligation-execution.md). Implementation and executable proof
gaps were resolved by the closed plan; only actual adequate proof was credited.

Traceability: introduces REQ-PONYTAIL-GLOSSARY from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-IDENTITY from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-DISCHARGE from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-ASSIGNMENT from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-PRIORITY from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-TRANSITIONS from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-COMPLETENESS from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-BASELINE from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-FRESHNESS from issue 2026-10-10-CHNG-obligation_centered_execution
Traceability: introduces REQ-OBLIGATION-COMPATIBILITY from issue 2026-10-10-CHNG-obligation_centered_execution

## Completed resolution

The explicitly approved amendment is implemented and accepted by the closed
plan. All applicable full tests pass; canonical requirements/UAT, generated
copies, scoped certificates and historical compatibility are reconciled.
