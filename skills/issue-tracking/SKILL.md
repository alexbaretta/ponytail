---
name: issue-tracking
description: >-
  Use when creating, classifying, updating, or transitioning project issues,
  configuring issue types and shared issue/plan statuses, or linking an issue
  to an epic's long-lived plan. Owns configured issue placement and identity.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Issue Tracking

Traceability: implements REQ-ISSUE-REQUIREMENT-ACTIVATION

Keep one canonical local record for each issue. Its collection is selected by
the issue type and host configuration; a project may keep bugs, feature
requests, tasks, and custom issue types in different roots. When the host does
not configure type-specific roots, every type uses the default `bugs/`
collection. External issue trackers do not replace these records unless the
host explicitly assigns them that ownership.

## Project Configuration

Read the host's Ponytail project configuration through its agent instructions,
directly or through their referenced management document. Use one declared
owner, for example `.agents/config/project/management.md`, for:

- management repository and root (default `pm/`);
- the canonical issue root for each issue type, plus plan and requirements
  roots (issue roots default to `bugs/`; the others default to `plans/` and
  `requirements/` beneath the management root);
- allowed issue type tokens, meanings, and requirements effects at
  implementation activation;
- one shared set of issue and plan status directory names, their meanings,
  initial, active-work and successful-completion roles, and allowed transitions;
- any additional required issue fields or transition gates.

This is agent-readable configuration, not an extension to either existing
`ponytail.json` JSON schema. A host may keep these values directly in
`AGENTS.md`; a separate file is unnecessary when no customization is needed.
Use the defaults below for omitted categories. Every project supports at least
`BUG`, `FEAT`, `CHNG`, and `TASK`; projects may extend this list with additional
issue types and their explicit semantics. An explicit status set replaces the
default status set; do not append default statuses to a custom set.

The required base types are:

| Type | Meaning | Requirements effect when implementation activates |
| --- | --- | --- |
| `BUG` | Reported behavior violates existing required behavior | Verify and link the existing requirements; clarify ambiguity without inventing new behavior |
| `FEAT` | Add intended capability or behavior | Add the approved requirements |
| `CHNG` | Change behavior specified by an existing requirement | Reconcile the explicitly approved change and retain superseded-source provenance |
| `TASK` | Work not inherently a defect or new capability | Assess and document any effect on requirements |

The default shared statuses and transitions are:

| Directory | Meaning | Allowed next statuses |
| --- | --- | --- |
| `open` | Reported or being clarified; implementation has not started | `in_progress`, `deferred`, `rejected` |
| `in_progress` | Approved work is being implemented | `closed`, `deferred`, `rejected` |
| `closed` | Successfully completed with required acceptance evidence | `open`, `in_progress` |
| `deferred` | Retained for later work, with a reason | `open`, `in_progress`, `rejected` |
| `rejected` | Deliberately declined, with a reason | `open` |

The initial role is `open`; active work is `in_progress`; successful completion
is `closed`.
`deferred` and `rejected` never mean successfully completed. This vocabulary
governs issue and whole-plan placement, not serialized sprint execution states
or tasklet markers owned by `plan-execution`.

For customization, the host can declare, for example, statuses
`backlog`, `active`, `done`, and `parked`,
initial role `backlog`, active-work role `active`, successful-completion role
`done`, and the exact
allowed transitions between those states. Define whether `parked` is deferred
or rejected. Use those exact names under both issue and plan roots. Never
infer a custom type's requirements effect or a custom status's role from its
spelling. Resolve missing semantics before the affected transition.

Use type tokens and status names that each fit one filename/path component,
without separators, `.` or `..`. Keep type spelling and case as configured.
Apply `project-structure` when establishing or changing the owning configuration.

## Requirements-Relative Triage And Approval

Use the host's configured import tooling and requested source selection to
store external reports in their configured local collections:

- Preserve the external ID, URL, reporter, creation date, and report text.
- Classify against canonical requirements, not issue tracker labels; preserve
  those labels as provenance.
- Refresh existing records by external ID within their source issue tracker,
  without overwriting local classification, approval evidence, or
  implementation notes.
- Do not publish comments or change issue tracker statuses unless requested.

Compare each report's intended behavior with canonical requirements:

- `FEAT`: it adds behavior absent from requirements without contradicting an
  existing requirement.
- `CHNG`: it contradicts or changes an existing requirement. Record the exact
  requirement and proposed change for the user's decision.
- `BUG`: it reports a discrepancy from behavior already required. Link the
  requirement; the report alone does not establish that a defect exists.

Keep insufficiently specified reports unresolved until they can be classified.
Separate independently classifiable requests in a mixed report into linked
records. Apply the host's explicit semantics for additional issue types.

Approval permits possible inclusion in a plan or campaign; it does not
authorize implementation or require prioritization:

- BUGs are automatically approved regardless of source.
- FEATs filed manually by the current human user are approved at filing.
  Imported FEATs require that user's explicit approval one by one.
- CHNGs require that user's explicit approval one by one regardless of source.

Record the source and approval evidence separately from implementation
authorization. Only approved changes may enter a plan or campaign's executable
scope. The human user's explicit kickoff authorizes implementation of its
included approved scope. A sufficiently small issue may instead be implemented
without a plan when the user explicitly requests its standalone implementation.
Automatic BUG approval or manual FEAT filing alone never authorizes execution.
Use `plan-execution` for plan eligibility and execution gates, and `requirements`
for activation; approval and plan inclusion leave new expectations issue-local
until implementation begins.

### Reports That Already Work

Investigate a BUG against its linked requirement. When testing demonstrates
that the reported behavior already satisfies the requirement, record a
`WORKS FOR ME` or equivalent supported disposition. Include the exact tested
version or revision, reproduction steps, observed result, and requirement
reference in the issue's resolution comments. Do not claim a fix or fabricate
an implementation change. A failed attempt to reproduce alone does not prove
correctness; retain any unverified conditions explicitly. Use the host's
configured lifecycle for this disposition, without adding a new shared status.
External comments or status updates still require authority to publish.

## Placement And Identity

Under the issue root configured for the selected type, use:

```text
<status>/YYYY-MM-DD-<type>-<short_description>.md
```

For example, `pm/bugs/open/2026-09-08-BUG-password_reset_expiry.md`.
Use the report's creation date and a concise lowercase underscore-separated
description. The filename stem is the canonical issue ID; record it in the
issue. Keep the date and ID stable during status changes. If two reports would
collide, choose a distinguishing description before creating the second file.

The containing directory is the lifecycle source of truth. Move the same file
between configured status directories; never copy it into a second state.
Create directories when their first record is added, without placeholders.
Update inbound and outbound relative links in the same change when moving a
record. Keep existing records at their established paths until an explicit
migration; do not infer missing legacy types from filenames alone.

An issue records its ID, title, type, report or objective, proposed or intended behavior,
scope, acceptance criteria, evidence, unresolved questions and answers,
authorization, requirements links and reconciliation result, implementation
or plan links, validation evidence, and resolution or disposition reason.
For bugs, distinguish observations, hypotheses, and confirmed root cause.
Use project-required fields without duplicating canonical requirements text.
At intake, link only approved requirements that already exist; keep absent
expected behavior and acceptance ideas issue-local. Do not create requirement
identifiers, UAT records, or prospective requirement annotations merely
because the issue was filed, prioritized, approved for future consideration,
or associated with a plan. When implementation activates and the host
configures `requirements-traceability`, record the canonical `introduces`,
`plans-implementation`, and `plans-verification` annotations beside the stable
issue record as part of the same reconciliation. These prospective
relationships preserve provenance but never satisfy completed coverage.

## Epics

An **epic** is an issue with an associated long-lived plan. Any issue type can
be an epic; epic is not a separate type, status, or size estimate. Store the
issue in the same collection and keep its original type and ID. Link the issue
to the plan manifest and the manifest back to the issue. An issue without an
associated plan is not yet an epic. A plan may also exist without an issue.

The plan owns its sprints and tasklets under `plan-execution`. The issue owns
the report and its lifecycle. Reconcile their states against actual scope and
evidence; do not blindly mirror them. An epic cannot close while its associated
plan's required acceptance remains incomplete. Several issues can reference a
shared plan; preserve each issue's own scope and acceptance evidence.

## Transitions

1. Read the canonical issue, configured type/status meanings, transition
   graph, requirements, and any associated plan. Check authority for the work.
2. Begin implementation only after one of two gates: the stakeholder
   authorizes the issue as a standalone development task, or the issue belongs
   to an implementation plan or campaign whose implementation is beginning.
   Plan membership or approval without implementation beginning is not a
   gate. Apply `requirements`, reconcile the activated behavior, and enter the
   configured active-work role in the same change. Reopening or resuming
   implementation repeats this review. A configured rename of `in_progress`
   retains the same semantics.
   Explicitly authorized additions to an executing plan or campaign meet this
   gate immediately. Apply the type-specific requirements and UAT reconciliation
   in `requirements` before product edits, and maintain issue-to-requirement,
   UAT, implementation, unit-test, and integration-test traceability through
   completion under `requirements-traceability`.
3. Move the issue and update links, reconciliation evidence, and any associated
   plan in one coordinated change. If required requirements changes remain
   unresolved, leave the transition pending and continue independent work.
4. Close only after the issue's acceptance evidence is complete. Record a
   reason when deferring or rejecting. Reopening requires fresh reconciliation;
   previous closure is not evidence that new work is already accepted.

Use `plan-execution` for implementation, diagnosis routing, validation cadence,
approval, selective commits, and non-local mutation restrictions. This skill
does not authorize external issue publication or notifications.
