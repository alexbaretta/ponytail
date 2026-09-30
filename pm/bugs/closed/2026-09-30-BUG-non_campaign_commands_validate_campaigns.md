<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-30-BUG-non_campaign_commands_validate_campaigns: Keep campaign validation inside campaign commands

## Status

closed

## Type, source, and authorization

- **Type:** BUG
- **Canonical issue ID:** `2026-09-30-BUG-non_campaign_commands_validate_campaigns`
- **Source:** Stakeholder report and clarification on 2026-09-30.
- **Authorization:** The stakeholder explicitly authorized standalone
  implementation by reporting the behavior as a bug and specifying the
  required command boundary.
- **Canonical home:** `pm/bugs`, as configured for Ponytail issues.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-non_campaign_commands_validate_campaigns
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-non_campaign_commands_validate_campaigns
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-non_campaign_commands_validate_campaigns

## Observation

`ponytail qa references` invokes repository-wide campaign validation before
reference QA. It therefore prints campaign inventory and can fail because of
campaign validity even though `qa` does not operate on a campaign.

## Expected behavior

Only commands in the `ponytail campaign` subtree enforce campaign validity or
campaign uniqueness. Commands outside that subtree neither invoke campaign
validation nor change their result because campaign data is invalid or
ambiguous.

## Confirmed root cause

The shared `qa()` CLI function directly invokes `src/campaign-census.js` with
`validate --all` whenever project management configuration exists. Canonical
plan-execution policy and campaign requirements also prescribe this coupling
through the ordinary plan-documentation QA gate.

## Resolution and acceptance

Remove campaign census invocation from `qa()`, preserve explicit campaign
validation at campaign coordination gates, and reconcile the requirement,
architecture, reusable policy, UAT, and focused CLI regression proof.

Requirements: [`REQ-CAMPAIGN-ORCHESTRATION`](../../requirements/campaign-orchestration.md).
Architecture: [Campaign orchestration](../../architecture/campaign-orchestration.md).
UAT: [Campaign orchestration Suite](../../uat/campaign-orchestration.md).
Pattern observation:
[`2026-09-30-unrelated_command_invoked_domain_validator`](../../debugging-pattern-observations/2026-09-30-unrelated_command_invoked_domain_validator.json).

## Verification

- The focused regression failed before the production edit and passed after
  campaign validation was removed from `qa()`.
- `bash -n cli/ponytail` passes.
- The 72 focused CLI, project-validation, and plan-execution policy tests pass.
- The supplied Gwen reproduction emits no campaign inventory and reaches
  reference QA; it then exposes the separate existing `spawnSync git ENOBUFS`
  failure.
- The reusable OpenClaw skill copy was regenerated and the Ponytail rule-copy
  check passes.
- Traceability checks 90 relationships with no violations, the debugging
  observation matches its schema, and build impact reports no affected or
  indeterminate targets.
