<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Revalidate stale campaign dispatches

- ID: `2026-10-01-BUG-stale_campaign_dispatch`
- Type: BUG
- Status: in_progress
- Authority: stakeholder explicitly authorized implementation on 2026-10-01.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-stale_campaign_dispatch
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-stale_campaign_dispatch
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-stale_campaign_dispatch

## Observation and confirmed cause

After a worker action is selected, a later dependency correction can make its
plan unready. `advanceLedger` returns any existing pending action before
re-evaluating the graph, so a worker operation that never started prevents
unrelated ready work from being dispatched indefinitely.

## Resolution and acceptance

Re-evaluate pending create and reuse actions against current prerequisites.
The host records `STARTED` with its stable identity as soon as an external
effect begins. Permit `NOT_STARTED` postponement only for an action that is now
unready and has never started. Retain started actions, attachment tokens, host
identities, and idempotency identities. Prove both paths and unrelated-work
progress through the production scheduler tests.

Requirement: [Campaign orchestration](../../requirements/campaign-orchestration.md).
Architecture: [Campaign orchestration](../../architecture/campaign-orchestration.md).
UAT: [Campaign orchestration Suite](../../uat/campaign-orchestration.md).
Pattern observation: [pending action bypassed readiness](../../debugging-pattern-observations/2026-10-01-pending_action_bypassed_readiness.json).

## Validation checkpoint

The focused scheduler regression passes, including historical pending-action
payload normalization, unstarted reuse release, unrelated dispatch, and
started-host identity retention. Contract, traceability, generated-skill,
registry, manifest, syntax, and build-impact checks pass. The full root suite
passes 450 of 453 Node tests; its three failures are the pre-existing installer
fixtures that remove both `codex` and `npm`. Direct installer, Pi, MCP, all 80
TSTS tests, and the 542-file TSTS structural check pass. The issue remains in
progress because the configured full-unit gate is not wholly green.
