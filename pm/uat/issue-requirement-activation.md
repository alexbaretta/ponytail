<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Issue requirement activation Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-ISSUE-REQUIREMENT-ACTIVATION`](../requirements/issue-requirement-activation.md).

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
