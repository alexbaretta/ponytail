<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Integrate campaign deliveries before plan closure

- ID: `2026-10-01-BUG-premature_campaign_plan_closure`
- Type: BUG
- Status: in_progress
- Authority: stakeholder explicitly authorized implementation on 2026-10-01.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-premature_campaign_plan_closure
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-premature_campaign_plan_closure
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-premature_campaign_plan_closure

## Observation and confirmed cause

The scheduler derives worker evidence completion from successful whole-plan
closure. That makes merge readiness require closure even though final
acceptance must run after the worker commit joins the coordinator tree. The
proxy reverses the correct evidence and lifecycle order.

## Resolution and acceptance

Add an authenticated worker-delivery record for the exact clean commit and
committed plan-owned evidence paths. Use that record plus completed host
observation for ancestry and integration while the plan remains active. Hold
the integrated assignment at `MERGED` until final acceptance closes the plan;
only then permit cleanup. Prove dirty and uncommitted evidence rejection,
pre-closure integration, post-closure cleanup, and retry-compatible state.

Requirement: [Campaign orchestration](../../requirements/campaign-orchestration.md).
Architecture: [Campaign orchestration](../../architecture/campaign-orchestration.md).
UAT: [Campaign orchestration Suite](../../uat/campaign-orchestration.md).
Pattern observation: [lifecycle used as delivery evidence](../../debugging-pattern-observations/2026-10-01-lifecycle_used_as_delivery_evidence.json).

## Validation checkpoint

Focused delivery regressions prove exact clean revisions, plan-owned committed
evidence, integration while active, retention at `MERGED`, and cleanup only
after closure. Contract, traceability, generated-skill, registry, manifest,
syntax, and build-impact checks pass. The full root suite passes 450 of 453
Node tests; its three failures are the pre-existing installer fixtures that
remove both `codex` and `npm`. Direct installer, Pi, MCP, all 80 TSTS tests, and
the 542-file TSTS structural check pass. The issue remains in progress because
the configured full-unit gate is not wholly green.
