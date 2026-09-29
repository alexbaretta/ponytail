<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Issue requirement activation

[Back to requirements index](index.md)

**Identifier:** `REQ-ISSUE-REQUIREMENT-ACTIVATION`

**Approval:** Approved by explicit stakeholder decisions on 2026-09-29 and
authorized for standalone implementation with “Make it happen.”

**Source:**
[`2026-09-29-BUG-premature_requirement_promotion`](../bugs/closed/2026-09-29-BUG-premature_requirement_promotion.md).

Ponytail must keep issue intake distinct from requirements activation.

The project’s Ponytail configuration determines the canonical collection for
each issue type, including bugs, feature requests, tasks, and custom types.
Reusable policy must not impose one physical issue root on every project or
type.

Filing, importing, prioritizing, approving for future consideration,
deferring, rejecting, canceling, or merely associating an issue with a future
plan or campaign must not add or change canonical requirements, UAT, or
requirement-traceability relationships. Proposed behavior, expected behavior
that is not already specified, acceptance ideas, and unresolved questions
remain in the issue.

An issue may link an approved requirement that already exists. In particular,
a bug may identify an existing requirement violated by observed behavior. This
link does not create a new requirement.

Issue behavior enters the requirements corpus only when implementation
activates through either of these gates:

1. a stakeholder authorizes implementation as a standalone development task;
   or
2. the issue has been added to an implementation plan or campaign and
   implementation of that plan or campaign begins.

Both conditions in the planned gate are mandatory. Plan membership, plan
approval, prioritization, or scheduling without implementation beginning is
not sufficient. At activation, the issue, requirement, UAT, traceability, and
active-work lifecycle records must be reconciled together before product
implementation proceeds.

Acceptance coverage:
[Issue requirement activation Suite](../uat/issue-requirement-activation.md).
