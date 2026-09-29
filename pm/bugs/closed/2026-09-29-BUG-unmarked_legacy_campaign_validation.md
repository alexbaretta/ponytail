<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Unmarked legacy plans fail campaign validation

## Status

closed

## Type, source, and authorization

- **Type:** BUG
- **Canonical issue ID:** `2026-09-29-BUG-unmarked_legacy_campaign_validation`
- **Source:** Stakeholder clarifications on 2026-09-29, including the exact
  definition of a stranded plan.
- **Authorization:** The stakeholder explicitly requested implementation and
  canonical requirements documentation.
- **Canonical home:** `pm/bugs`, as configured for Ponytail issues.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-29-BUG-unmarked_legacy_campaign_validation
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-29-BUG-unmarked_legacy_campaign_validation
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-29-BUG-unmarked_legacy_campaign_validation

## Observation

Repository-wide campaign validation classifies an unmarked plan in a
configured lifecycle directory as invalid even when no managed campaign
references it. The same plan in the permitted flat legacy layout is valid
unmanaged legacy data.

## Expected behavior

- A plan with no `ponytail-plan-campaign` block is valid unmanaged legacy data
  regardless of its location under the configured plan root.
- Ponytail infers no campaign membership or active-campaign state for it.
- If a managed plan names the unmarked plan as its parent or direct
  dependency, the reference proves intended campaign membership. The
  referenced plan and the managed reference are invalid until the referenced
  plan gains supported campaign metadata.
- A present but malformed campaign block remains invalid managed data.
- Plan P is stranded exactly when P declares campaign parent C and C does not
  contain a human-readable reference to P. Other invalid campaign records are
  not stranded.

## Confirmed root cause

`buildRepositoryInventory` exempted an unmarked candidate only when its
normalized lifecycle was `null`, coupling legacy validity to the historical
flat directory layout rather than to the absence of a managed-campaign
reference. The plan index also used `stranded-plan` as a broad invalid-record
classification instead of the exact reciprocal-reference predicate.

## Resolution and acceptance

Every unmarked plan is classified provisionally as unmanaged, then promoted to
invalid when a valid managed record references its inferred stable directory
identity. Malformed blocks remain invalid.

The plan index reserves `stranded-plan` for a missing reciprocal C-to-P
campaign reference. Malformed metadata, missing records, duplicate identities,
dependencies, and cycles are classified as `invalid-plan`.

Focused campaign-census, plan-index, and policy tests pass. Repository-wide
traceability, QA, and full test evidence is recorded by the implementing
commit.

Requirement:
[`REQ-CAMPAIGN-ORCHESTRATION`](../../requirements/campaign-orchestration.md).
UAT: [Campaign orchestration Suite](../../uat/campaign-orchestration.md).
