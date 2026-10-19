<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management

[Back to requirements index](index.md)

**Authority:** The stakeholder’s campaign redesign discussion and explicit implementation goal of 2026-10-17.

This activated contract supersedes the old six-coordinate progress model,
mandatory per-requirement unit-and-integration quotas, committed passing-evidence
ledgers, Ponytail swarm membership/queue protocols and coordinator-owned reviews
for the redesigned workflow. Historical records retain their original meaning.
The [design record](../../docs/campaign-management.md) records provenance;
implementation choices belong to the [redesign plan](../plans/in_progress/2026-10-17-campaign-management-redesign/plan.md).
Existing scope, resource safety and unrelated project behavior remain governed
by their original requirements. These requirements describe intended behavior,
not completed implementation.

## Canonical graph

**Identifier:** `REQ-CM-GRAPH`

### OBL-CM-GRAPH

Requirement: `REQ-CM-GRAPH`.

Every requirement, atomic obligation, acceptance and test has a stable ID. Obligations reference requirements, acceptances reference obligations, tests reference acceptances and stable code blocks reference obligations. References resolve and reverse discovery derives from the canonical declarations.

Discharge: [ACC-CM-GRAPH](../uat/campaign-management.md#acc-cm-graph) with adequate executable proof and adversarial assessment.

## Acceptance coverage

**Identifier:** `REQ-CM-ACCEPTANCE-COVERAGE`

### OBL-CM-ACCEPTANCE-COVERAGE

Requirement: `REQ-CM-ACCEPTANCE-COVERAGE`.

Every acceptance has adequate executable coverage in the unit or integration suite. A test of another acceptance under the same requirement does not cover the missing acceptance.

Discharge: [ACC-CM-ACCEPTANCE-COVERAGE](../uat/campaign-management.md#acc-cm-acceptance-coverage) with adequate executable proof and adversarial assessment.

## Truthful completeness

**Identifier:** `REQ-CM-DESCENT`

### OBL-CM-DESCENT

Requirement: `REQ-CM-DESCENT`.

Report the campaign completeness vector (R,A,T,I) as unresolved decomposition, acceptance, test and implementation counts. Unknown adequacy is unresolved. T and I decrease only with linked tests and implementations that pass; adversarial review assesses semantic adequacy. Productive accepted changes descend lexicographically; discoveries and scope changes may increase the vector honestly.

Discharge: [ACC-CM-DESCENT](../uat/campaign-management.md#acc-cm-descent) with adequate executable proof and adversarial assessment.

## Commit-attached validation

**Identifier:** `REQ-CM-CERTIFICATES`

### OBL-CM-CERTIFICATES

Requirement: `REQ-CM-CERTIFICATES`.

Passing validation certificates are annotated Git tags on tested commits, storing commands and results. Focused worker and full coordinator validation are distinct. Passing evidence and captured output do not create tracked files or evidence-only commits. Failed-run recording is optional.

Discharge: [ACC-CM-CERTIFICATES](../uat/campaign-management.md#acc-cm-certificates) with adequate executable proof and adversarial assessment.

## Autonomous worker capacity

**Identifier:** `REQ-CM-CAPACITY`

### OBL-CM-CAPACITY

Requirement: `REQ-CM-CAPACITY`.

The coordinator maintains configured active parallelism using native sessions. Workers pursue complete assignments autonomously. Unresolvable blockers retain original work while replacements receive other compatible assignments. Recovered workers may temporarily exceed target capacity.

Discharge: [ACC-CM-CAPACITY](../uat/campaign-management.md#acc-cm-capacity) with adequate executable proof and adversarial assessment.

## Worker-owned delivery

**Identifier:** `REQ-CM-WORKER-DELIVERY`

### OBL-CM-WORKER-DELIVERY

Requirement: `REQ-CM-WORKER-DELIVERY`.

Workers obtain adversarial subagent review, repair findings, rebase and refresh validation before submitting tagged branches. The coordinator serially accepts current, reviewed, valid fast-forward deliveries; it returns stale candidates to their workers.

Discharge: [ACC-CM-WORKER-DELIVERY](../uat/campaign-management.md#acc-cm-worker-delivery) with adequate executable proof and adversarial assessment.

## Instability monitoring

**Identifier:** `REQ-CM-MONITORING`

### OBL-CM-MONITORING

Requirement: `REQ-CM-MONITORING`.

The coordinator monitors honest vector progression and detects regression or lack of progress over an active monitoring interval, distinguishing scope changes and external waits.

Discharge: [ACC-CM-MONITORING](../uat/campaign-management.md#acc-cm-monitoring) with adequate executable proof and adversarial assessment.

## Native session ownership

**Identifier:** `REQ-CM-HOST-OWNERSHIP`

### OBL-CM-HOST-OWNERSHIP

Requirement: `REQ-CM-HOST-OWNERSHIP`.

Native Codex tools own swarm session lifecycle. Retire the ponytail swarm chapter and competing queue/membership orchestration. Preserve unfinished work and historical records during explicit adoption.

Discharge: [ACC-CM-HOST-OWNERSHIP](../uat/campaign-management.md#acc-cm-host-ownership) with adequate executable proof and adversarial assessment.

## Worker names and merge reporting

**Identifier:** `REQ-CM-REPORTING`

### OBL-CM-REPORTING

Requirement: `REQ-CM-REPORTING`.

Worker names identify campaign, sequence and a three-word assignment summary. The summary uses informative, discriminating words identifying specific domains, components or outcomes; avoid repeated generic phrases such as `Complete … coverage`. Final worker completion prepends DONE. After every accepted merge request, the coordinator displays the campaign completeness vector from the resulting integrated revision.

Discharge: [ACC-CM-REPORTING](../uat/campaign-management.md#acc-cm-reporting) with adequate executable proof and adversarial assessment.

## Independent final acceptance

**Identifier:** `REQ-CM-FINAL-QA`

### OBL-CM-FINAL-QA

Requirement: `REQ-CM-FINAL-QA`.

Worker-reported zero is provisional. A campaign is DONE only when all its workers are DONE and the coordinator independently verifies that every required automated QA command passes on the final integrated candidate. QA defects reopen the campaign with worker repair assignments; full independent QA repeats after repairs.

Discharge: [ACC-CM-FINAL-QA](../uat/campaign-management.md#acc-cm-final-qa) with adequate executable proof and adversarial assessment.

