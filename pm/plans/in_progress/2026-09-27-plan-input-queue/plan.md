# Durable plan input queue

Plan ID: 2026-09-27-plan-input-queue
Status: in_progress

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"2026-09-27-plan-input-queue","parent_plan_id":null}
-->

## Objective and authority

Implement the approved `REQ-PLAN-INPUT-QUEUE` with fully documented and tested
CLI and Codex-composer producers over one serialized fast queue, then compare
their live behavior. Starting branch: `local_rules`. Starting revision:
`07d599408f40de0fe2458720ea838ff50728faac`; clean working tree.

## Scope and architecture

The governing requirement, architecture, UAT, and issue are linked from the
project indexes. Each queue is campaign scoped, file-backed under `pm/`, and
uses one runtime owner with two thin producers. Any member-plan input resolves
to its root. One coordinator per campaign exclusively owns draining and
resumption of that campaign's slow tasklet queue.

Global installation, package publication, and changes outside this repository
are excluded. Live host validation may require a later trusted installation;
the plan remains active until that evidence is recorded.

## Sprint

1. [S01](sprints/S01.md): document, implement, integrate, and validate the plan
   input queue — IN_PROGRESS.

## Starting checkpoint

`npm test` passed 357 core tests, installer checks, 23 Pi tests, 4 MCP tests,
70 TSTS tests, and the 452-file TSTS structure check. The seven version pins
also passed. The tree was clean.

## Current validation

Build impact reports no affected build target. The complete `npm test` command
passes 369 core tests, installer checks, 23 Pi tests, 4 MCP tests, 70 TSTS
tests, and the 464-file structure check. Traceability resolves 14
relationships; rule copies and version pins pass. Campaign validation accepts
this plan and its eight-tasklet V3 graph.

Automated acceptance includes the coordinator-session binding refinement. The
trusted live Codex Arc that determines whether `UserPromptSubmit` blocks before
an active-turn interruption remains unexecuted, so this plan and feature remain
in progress.
