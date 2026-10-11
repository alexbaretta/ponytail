<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling obligation campaigns

- Plan ID: `2026-10-10-rolling-obligation-campaigns`
- **Status:** `in_progress`
- Management and component repository: Ponytail in the supplied checkout.
- Implementation authority: stakeholder goal on 2026-10-10: "Finish
  documenting this campaign, the implement it. If possible, do away with the
  requirement to leverage a ponytail plugin."
- Starting revision: `fc8f0d43382d7e7b3d38d5881483a074d525a4ff`; clean tracked tree.
- Starting QA: all configured unit families passed (606 core, 23 extension,
  4 MCP, 80 TSTS); installer checks passed. Final directory validation passed
  after tracking the new records (696 files). See evidence/starting.md.
- Product contract: [requirements](../../../requirements/rolling-campaigns.md).
- Acceptance procedures: [UAT](../../../uat/rolling-campaigns.md).
- Execution contract: [design](design.md).

<!-- ponytail-plan-campaign
{"schemaVersion":3,"id":"2026-10-10-rolling-obligation-campaigns","parent_plan_id":null,"depends_on":[],"obligation_document":"pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json"}
-->

## Objective

Replace tasklet-driven campaign dispatch with rolling obligation execution,
Ponytail-owned reusable checkouts, PostgreSQL-owned operational state, and
direct Codex session control. Deliver reviewed increments continuously to a
campaign branch and fully validated batches to its configured mainline.
Daily delivery is an expected consequence, never a deadline or acceptance gate.

## Scope

Coordinator-authoritative dependency snapshots; deterministic maximal compatible
scheduling; atomic allocation/release; resume-first suspension; worker and
reviewer lifecycle; recovery of external action outcomes; project-owned worktree
setup; focused and publication QA; full worker and fast coordinator rebases;
publication; chapter-based CLI; shared MCP operations; policy, traceability,
configuration, and generated-source synchronization.

This change explicitly replaces the old campaign dispatch CLI and retained
worker capacity policy for rolling campaigns. Historical serialized readers
and records remain inspectable; no old campaign is silently migrated or resumed.
The rolling selector uses category priority among ready obligations, replacing
the global-category barrier only in the explicitly configured rolling mode.

## Exclusions

No changes to other projects or user configuration, no Codex plugin requirement,
no new cloud resource, no actual worker worktree creation during development,
no deployment, no force-push, no automatic migration of existing live campaigns,
and no retrospective rewrite of closed plan evidence.

## Implementation sequence

| Sprint | Deliverable | State |
| --- | --- | --- |
| S01 | Activated requirements/UAT, execution design, starting evidence and atomic implementation records | Done |
| S02 | [Configuration and graph](sprints/S02.md) | Done |
| S03 | PostgreSQL execution ownership, transactions, indexes and recoverable action records | Pending |
| S04 | Ponytail worktree pool, direct Codex adapter, suspension/reactivation and review lifecycle | Pending |
| S05 | Increment integration, publication batches and QA evidence on exact revisions | Pending |
| S06 | Chapter CLI/MCP, old dispatcher replacement, portable policy and final acceptance | Pending |

The active sprint's exact declarations, paths, invariants and focused proofs
are recorded before source edits. Later sprint detail is refined from the
accepted design before its readiness gate, without expanding approved scope.

## Acceptance

Every requirement below has implemented behavior, adequate unit proof,
executable integration proof and UAT. Real PostgreSQL tests demonstrate
allocation contention, ownership uniqueness, suspension capacity, stale graph
rejection and action recovery. A real Codex adapter smoke test establishes a
fresh session in a designated existing directory and verifies returned identity,
instruction loading and resumability; it does not rely on a plugin or assume
desktop visibility from CLI support alone.

Disposable repositories establish focused campaign integration, publication
after M increments, final partial flush, full-QA failure preventing mainline
publication, upstream movement and recovery of uncertain pushes. No synthetic
pass substitutes for the applicable product path.

Final acceptance: `npm test`, configured PostgreSQL integration, adapter smoke
proof, rule-copy/version checks, traceability generation/check, build-impact
query and affected builds. Plan closure additionally requires fresh obligation
certificates and final evidence; edits or merged commits alone do not close it.

## Decisions and remaining evidence

All stakeholder product decisions are resolved in the design. Desktop visibility
of directly created threads is a capability to verify, not a prerequisite for
documented Codex execution. Tool/configuration gaps remain implementation-owned.
No unavailable credential or external approval has yet been established.

Traceability: plans-implementation REQ-ROLLING-CONFIGURATION from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-GRAPH from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-SCHEDULING from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-STATE from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-WORKERS from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-REVIEW from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-PUBLICATION from plan 2026-10-10-rolling-obligation-campaigns
Traceability: plans-implementation REQ-ROLLING-INTERFACES from plan 2026-10-10-rolling-obligation-campaigns
