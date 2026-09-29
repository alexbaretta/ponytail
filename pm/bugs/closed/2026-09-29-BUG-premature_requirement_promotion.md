<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-29-BUG-premature_requirement_promotion: Do not promote issue intake into requirements

## Status

closed

## Type, source, and authorization

- **Type:** BUG
- **Canonical issue ID:**
  `2026-09-29-BUG-premature_requirement_promotion`
- **Source:** Stakeholder report and clarifications on 2026-09-29.
- **Authorization:** The stakeholder explicitly authorized standalone
  implementation with “Make it happen.”
- **Canonical home:** `pm/bugs`, as configured for every Ponytail issue type.

Traceability: introduces REQ-ISSUE-REQUIREMENT-ACTIVATION from issue 2026-09-29-BUG-premature_requirement_promotion
Traceability: plans-implementation REQ-ISSUE-REQUIREMENT-ACTIVATION from issue 2026-09-29-BUG-premature_requirement_promotion
Traceability: plans-verification REQ-ISSUE-REQUIREMENT-ACTIVATION from issue 2026-09-29-BUG-premature_requirement_promotion

## Observation

The reusable requirements policy directed an agent to add behavior from a
newly filed issue to the canonical requirements and UAT immediately. The issue
policy also prescribed requirement-oriented prospective annotations at issue
intake. A feature request, bug, or task could therefore create missing
implementation and verification coverage before anybody had authorized or
started its implementation.

## Expected behavior

- The project configuration selects the canonical issue root for each type.
- Filing, prioritizing, approving for future consideration, deferring,
  rejecting, or merely adding an issue to a future plan does not add or change
  requirements, UAT, or requirement traceability.
- A bug may link an existing requirement at intake. Missing expected behavior
  remains issue-local.
- Requirements reconciliation begins only when standalone implementation is
  authorized, or when the issue belongs to a plan or campaign whose
  implementation begins.

## Confirmed root cause

The policy collapsed issue intake, stakeholder approval, plan association, and
implementation activation into one requirements-ingestion event. It also
hard-coded one issue collection name in reusable policy instead of deferring
canonical placement to the project’s configured type mapping.

## Resolution and acceptance

Separate issue intake from the two implementation-activation gates across the
requirements, issue-tracking, plan-execution, UAT, and traceability policies.
Focused policy tests must prove configured type ownership, absence of intake-
time promotion, both activation gates, and synchronized generated skill copies.

The reusable policies now preserve issue-local expectations until one of the
two implementation-activation gates is met. Focused policy and integration
tests pass, generated skill copies are synchronized, and project traceability
records the implementation, unit-test, integration-test, and UAT coverage.

Requirements: [`REQ-ISSUE-REQUIREMENT-ACTIVATION`](../../requirements/issue-requirement-activation.md).
UAT: [Issue requirement activation Suite](../../uat/issue-requirement-activation.md).
