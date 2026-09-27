# 2026-09-27-FEAT-plan_input_queue: Preserve plan input during active Goals

## Status

in_progress

## Source and authorization

- **Type:** FEAT
- **Source:** Stakeholder report and explicit dual-implementation direction on
  2026-09-27.
- **Authorization:** Implement, document, and test both producer UXs fully.
  Remove one only after negative live evidence, documenting why.

## Objective

Add the durable fast queue and critical section defined by
[`REQ-PLAN-INPUT-QUEUE`](../../requirements/plan-input-queue.md), so additional
requirements cannot displace one another while a long-lived plan remains
active.

## Acceptance

The automated and live Arcs in
[`Plan input queue Suite`](../../uat/plan-input-queue.md) pass, or a producer
that fails its live viability Arc is excised with the evidence and retained
workflow reconciled in requirements, architecture, UAT, code, and tests.
