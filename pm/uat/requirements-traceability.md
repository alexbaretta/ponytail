<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements Traceability Suite

[Back to UAT index](index.md)

**Requirement:**
[`REQ-REQUIREMENTS-TRACEABILITY`](../requirements/requirements-traceability.md#portable-bidirectional-traceability),
approved 2026-09-27.

Traceability: verifies REQ-REQUIREMENTS-TRACEABILITY

## Arc: Navigate the complete requirement relationship graph

- **Actor:** Developer or agent working in an adopting repository.
- **Prerequisites:** A versioned project traceability manifest containing an
  approved requirement, handwritten implementation, unit-test, integration
  Arc, UAT, generated-output mapping, and configured TSTS project.
- **Profiles:** Automated through the project's configured traceability check;
  no manual execution profile is required.
- **External effects:** The check is read-only unless reverse-view generation
  is explicitly selected.

1. Inspect each annotated implementation or verification unit.
   - The adjacent annotation names its requirement and one approved
     relationship role.
2. Run the reverse-view generator, then inspect the requirement entry.
   - It lists the same implementation, unit-test, integration-test, and UAT
     locators without a second handwritten relationship map.
3. Run the checker without generation.
   - The checked-in reverse view matches the canonical annotations; every
     required relationship class is present; all locators and canonical
     generated sources resolve.
4. Use each canonical requirement-source declaration form: explicit Identifier,
   bold list-ID, and ATX ID heading.
   - Each declares the configured requirement; an ordinary prose mention does
     not.
5. Register one explicitly enumerated file as implementation/support and as
   integration-test verification with disjoint, class-valid role filters.
   - The reverse view records each role under its truthful class, while the
     TypeScript semantic pass checks that path once when it is TypeScript.
6. Remove or corrupt, one at a time, a requirement ID, reverse connection,
   required relationship class, TypeScript declaration attachment,
   non-TypeScript locator, and generated canonical source.
   - Each defect fails with a deterministic actionable diagnostic identifying
     the affected requirement or locator.
7. Mark a requirement as having no possible unit test without a reason.
   - The checker rejects it; a non-empty explicit disposition satisfies only
     the unit-test class and does not waive integration or UAT coverage.
