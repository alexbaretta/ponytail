# GWEN traceability adoption

Plan ID: 2026-09-28-gwen-traceability-adoption
Status: closed

<!-- ponytail-plan-campaign
{
  "schemaVersion": 1,
  "id": "2026-09-28-gwen-traceability-adoption",
  "parent_plan_id": null
}
-->

## Objective and authority

Implement the stakeholder-approved 2026-09-28 portable traceability extension
needed by GWEN's release-acceptance campaign.

Repository: Ponytail. Starting revision: `f424162`.

## Scope

- Recognize canonical Markdown requirement declarations as explicit Identifier
  fields, bold list entries, or ATX requirement headings; reject incidental
  mentions as declarations.
- Allow a path to carry multiple artifact classes only through disjoint,
  class-valid explicit role filters.
- Preserve explicit artifact enumeration, generated-source mappings, locator
  semantics, and TypeScript semantic-path deduplication.

Excluded: repository discovery, globbing, GWEN-specific branches, fallback
checkers, source translation, duplicate requirement metadata, publication, and
changes outside this checkout.

## Architecture and requirements

The structural checker remains the single owner of requirement-source and
artifact-class validation. TSTS continues to validate configured TypeScript
paths once per path, regardless of their class registrations.

Affected requirement:
[`REQ-REQUIREMENTS-TRACEABILITY`](../../../requirements/requirements-traceability.md#portable-bidirectional-traceability).

## Acceptance

- The checker accepts only the three canonical Markdown declaration forms for
  a configured identifier and rejects an incidental mention.
- Duplicate artifact paths require explicit disjoint role filters; filters are
  rejected when a role is invalid for the artifact class.
- A file may supply implementation/support and integration-test/verify roles
  without duplicate relationship metadata, and TSTS checks one TypeScript path
  once.
- Focused structural and TypeScript tests, traceability generation/check, and
  build-impact-selected validation pass.

## Sprint

1. [S01](sprints/S01.md): implement and validate the portable extension — DONE.

## Questions and approval

Questions: [RESOLVED] The stakeholder explicitly authorized the canonical
declaration forms, filtered multi-class registrations, preserved constraints,
focused coverage, documentation/schema updates, and a cohesive commit.

## Final validation

Focused structural checker tests, the selected TSTS build and locator tests,
the configured traceability generator/check, the real checker CLI integration
test, generated OpenClaw parity test, and `git diff --check` passed. Build
impact selected `tsts`; `npm run build:tsts` passed after the final source edit.
