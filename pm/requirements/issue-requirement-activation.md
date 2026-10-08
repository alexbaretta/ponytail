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
The stakeholder extended this policy on 2026-10-08 with requirements-relative
triage, separate approval and implementation authorization, and tested-version
evidence for reports whose behavior is already correct.

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

## Triage, Approval, And Authorization

Reusable issue policy must classify reports against canonical requirements,
irrespective of external tracker labels. New noncontradictory behavior is
`FEAT`; a change contradicting an existing requirement is `CHNG`; a reported
discrepancy from existing required behavior is `BUG`. Projects retain ownership
of source selection, import tools, type-specific collections, custom type
extensions, and lifecycle mappings. Project structure must support at least
`BUG`, `FEAT`, `CHNG`, and `TASK`; clients may add explicitly defined issue
types without removing these base categories. Preserve reviewed local
classification and approval evidence across external refreshes.

BUGs are automatically approved regardless of source. FEATs manually filed by
the current human user are approved at filing; imported FEATs require explicit
user approval one by one. Every CHNG requires explicit user approval one by
one, regardless of source. Approval permits possible inclusion in a plan or
campaign, without authorizing implementation. Only approved changes may enter
executable scope. The human user's explicit kickoff authorizes implementation
of the included approved scope. A sufficiently small issue may instead receive
an explicit standalone implementation request. Filing or automatic approval
alone does not authorize implementation.

Testing may establish that a BUG is moot because existing behavior satisfies
the requirement. Record `WORKS FOR ME` or an equivalent configured disposition
with resolution comments identifying the tested version or revision,
reproduction steps, observed result, and governing requirement. Do not claim
an implementation fix. Failure to reproduce alone is insufficient evidence of
correctness; disclose unverified conditions. Publication to an external tracker
remains separately authorized.

## Implementation Activation

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
