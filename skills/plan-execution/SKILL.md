---
name: plan-execution
description: >-
  Organize and execute authorized long-lived work using concise plans,
  canonical obligation IDs, truthful status and verified acceptance.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Plan execution

Use the project's instructions for PM paths, lifecycle, repository boundaries,
QA commands and approval gates. Shared terms live in the
[Ponytail glossary](references/glossary.md). Parallel campaigns use
`campaign-management`; this skill does not define another coordinator protocol.

## Plan only what execution needs

A bounded change need not create a plan. For long-lived work, use a stable
`YYYY-MM-DD-<name>` ID under the configured plan root, normally
`pm/plans/<status>/<id>/plan.md`. Use the shared statuses from `issue-tracking`.
Preserve existing record locations unless a move is needed for their lifecycle;
repair links when moving them. Link related issues and plans in both directions.

Keep the manifest concise: objective, canonical obligation scope, dependencies,
important design decisions, unresolved questions, acceptance and current status.
Split into sprints/features/tasklets only where this helps assignment or execution.
A tasklet is an implementation step, not a mandatory per-method record or a
second obligation. Do not create evidence directories, action journals,
checkpoint ledgers or duplicate requirement definitions to administer the work.

Requirements and atomic obligations belong in `pm/requirements`; acceptances
belong in `pm/uat`. Use `requirements`, `requirements-traceability` and
`user-acceptance-testing` for their contracts. Plans reference these IDs rather
than own another copy of their conditions. Preserve explicit stakeholder scope;
architectural preferences and possible future usefulness do not add requirements.

## Execute complete outcomes

Read the active plan and current source before resuming. Preserve user changes,
existing assignments and project boundaries. Start implementation when authorized
and material prerequisites are resolved; do not request approval again merely
because a plan or skill has a formal approval field.

Always prioritize completing started obligations, including verification and
acceptance, over opening new ones. Select compatible dependency-ready work.
Within an assignment, own implementation, configured focused QA, relevant review
and correction through completion. Routine local tooling repairs are part of
that work. Do not turn mechanical steps into human gates.

If an in-scope repair's original reproduction exposes a further causal defect
blocking the same approved outcome, diagnose and repair that continuation blocker,
then resume the reproduction. This does not authorize adjacent speculative fixes
or repository-wide cleanup. Record genuinely new requirements or changed scope
explicitly; ask only for a material decision or unavailable authority/capability.
Continue independent authorized work while a genuine blocker remains.

<!-- Traceability: implements REQ-REPAIR-PLAN-STARTING-GATE -->
A repair may start with a reproduced pre-existing failure expressly owned
by the approved repair objective. Before kickoff, record its exact failing
selection and evidence, governing requirement, unresolved obligation and bounded
repair scope. This exception does not admit unrelated, unplanned or newly
introduced failures. The failure remains unresolved and prevents final acceptance
until repaired; never weaken assertions to admit or complete the repair.

## Validation and status

Follow project QA cadence. Run focused proof for the changed behavior, affected
builds through `build-impact`, combined integration proof where required, and
full configured QA at final acceptance. Reuse valid unchanged focused proof;
never substitute it for a required full final run. Missing, skipped, failed or
unavailable checks are unresolved, not passes. A prose-only change needs applicable
structural checks, not invented product tests.

Keep each project change-set cohesive across the repositories that own its code,
configuration and tests. Respect commit conventions and each repository boundary.
Do not widen external-mutation or destructive-action authority through plan text.

Update lifecycle records when the actual state changes. Finished edits and worker
claims are not accepted obligations. A plan is complete only after its full scope
and final gates are verified. Record precise remaining work when incomplete.
Validation output stays outside tracked source; reference commit-attached tags
using `campaign-management` rather than copying certificates into PM records.
Durable requirements, design decisions and causal diagnosis remain source records.

Keep historical records and their physical meanings intact. Existing read-only
validators may inspect them; do not restart retired queue, lease or certificate
controllers to execute new work. Installation does not authorize migrating another
project or discarding unfinished work.
