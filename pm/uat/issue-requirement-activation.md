<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Issue requirement activation Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-ISSUE-REQUIREMENT-ACTIVATION`](../requirements/issue-requirement-activation.md).

## Arc: Triage Reports And Preserve Authorization Gates

Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

- **Actor:** User and triaging agent.
- **Prerequisites:** Canonical requirements, manually filed and imported
  reports, and configured issue collections and type tokens.
- **Profiles:** Reusable-policy scenario review.
- **External effects:** Local records only; external publication needs authority.

1. Review a novel noncontradictory request, a contradictory request, and a
   discrepancy from existing required behavior despite misleading tracker labels.
   - Classify them as FEAT, CHNG, and BUG respectively, preserving provenance
     and exact requirement references. Leave underspecified reports unresolved.
2. Compare approvals across sources.
   - BUGs and manually user-filed FEATs are approved for possible planning.
     Imported FEATs and every CHNG await explicit approval one by one.
     Refreshing source data does not overwrite reviewed classification or approval.
3. Attempt plan inclusion and execution.
   - Only approved scope enters a plan or campaign. Approval and inclusion do
     not activate requirements or authorize execution. Explicit human kickoff
     authorizes the included approved scope; a small standalone issue instead
     requires an explicit implementation request.
4. Test a BUG whose existing behavior satisfies its governing requirement.
   - Record WORKS FOR ME or an equivalent configured disposition, with tested
     version or revision, reproduction steps, observed result, and requirement
     in resolution comments. Claim no fix. An inconclusive reproduction leaves
     unverified conditions explicit.

## Arc: Keep issue intake out of canonical requirements

Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

- **Actor:** Agent filing a project issue.
- **Prerequisites:** Project configuration maps at least two issue types to
  canonical collections; the proposed behavior is absent from requirements.
- **Profiles:** Automated reusable-policy test.
- **External effects:** Creates only the configured issue record.

1. File a feature request, bug, or task without authorizing implementation.
   - The record is created under the collection configured for that type.
   - Proposed or missing expected behavior remains in the issue.
   - No requirement, UAT Arc, requirement identifier, or prospective
     requirement relationship is created.
2. Prioritize, defer, reject, cancel, or associate it with a future plan whose
   implementation has not begun.
   - Requirements and UAT remain unchanged.
3. For a bug governed by an existing requirement, link that requirement.
   - The existing requirement remains canonical; no duplicate is created.

## Arc: Activate requirements for standalone implementation

Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

- **Actor:** Stakeholder and implementing agent.
- **Prerequisites:** An issue whose implementation is not part of an active
  plan or campaign.
- **Profiles:** Automated reusable-policy integration test.
- **External effects:** Updates project-management records only.

1. The stakeholder authorizes implementation as a standalone development
   task.
   - Before product implementation, the agent reconciles the approved behavior
     into requirements, UAT, traceability, and the configured active-work
     issue state.

## Arc: Activate requirements only when planned implementation begins

Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

- **Actor:** Plan or campaign coordinator.
- **Prerequisites:** An issue associated with a future implementation plan or
  campaign.
- **Profiles:** Automated reusable-policy integration test.
- **External effects:** Updates project-management records only.

1. Approve or schedule the plan without starting implementation.
   - The issue remains issue-local and creates no requirements or UAT.
2. Begin implementation of the plan or campaign.
   - Before product edits, the agent reconciles the issue’s approved scope into
     requirements, UAT, traceability, and active-work lifecycle state.
3. Explicitly authorize another issue as an addition to the executing scope.
   - Reconciliation happens immediately, without waiting for another kickoff.

## Arc: Reconcile Each Issue Type And Its Complete Traceability

Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION

- **Actor:** Stakeholder and implementing agent.
- **Prerequisites:** Approved FEAT, BUG, and CHNG records authorized for
  implementation; existing requirements and acceptance procedures.
- **Profiles:** Reusable-policy scenario review.
- **External effects:** Local requirements, acceptance, and traceability records.

1. Activate the FEAT.
   - Add its new noncontradictory requirement and specific new UAT coverage.
2. Activate the BUG.
   - Link existing requirements and UAT; clarify imprecise text and fill UAT
     gaps without inventing new behavior. If misclassified, apply the correct
     type's approval gate before incorporating the expectation.
3. Activate the CHNG.
   - Modify the existing requirement and corresponding UAT expected results
     as approved, retaining superseded behavior only as provenance.
4. Follow each issue's traceability through completion.
   - At activation, discover its requirements and UAT and record missing
     implementation and tests in active scope, without claiming coverage.
   - At closure, discover the implementing source files and stable methods or
     endpoints, unit and integration tests, and reverse links. Configured
     traceability checks pass with only justified permitted dispositions.
