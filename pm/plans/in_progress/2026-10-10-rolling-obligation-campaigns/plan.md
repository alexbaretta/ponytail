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
  requirement to leverage a ponytail plugin." Amended by the stakeholder on
  2026-10-10: handwritten JavaScript is prohibited; use fully statically typed
  TypeScript and apply existing TSTS to Ponytail itself. TSTS extensions are
  explicitly unnecessary.
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
| S03 | [PostgreSQL execution ownership](sprints/S03.md) | Done |
| S07 | [Static TypeScript migration](sprints/S07.md), inserted before continuing S04 | In progress |
| S04 | [Ponytail checkouts and direct Codex workers](sprints/S04.md) | Pending continuation after S07; existing tasklets retained |
| S05 | Increment integration, publication batches and QA evidence on exact revisions | Pending |
| S06 | Chapter CLI/MCP, old dispatcher replacement, portable policy and final acceptance | Pending |

The active sprint's exact declarations, paths, invariants and focused proofs
are recorded before source edits. Later sprint detail is refined from the
accepted design before its readiness gate, without expanding approved scope.

The amended language gate applies to the whole owned executable codebase,
including tests, generators, portable skill scripts and host adapters. Existing
S02/S03 and checkout evidence records the previous implementation; it does not
establish acceptance of the converted implementation. S04's uncommitted native
transport is converted before its implementation tasklet is accepted. See S07
for migration order, runtime compatibility and compiler/checker gates.

## Work metric

Work completion and final acceptance are separate measurements. Report work
completion as discharged atomic delivery obligations divided by the approved
inventory of atomic delivery obligations. Each delivery obligation must name
one bounded outcome and an evidence-based discharge criterion, including its
applicable focused QA. Keep outcomes at comparable granularity; decompose a
whole-feature or whole-codebase responsibility before counting it as a unit of
work. Use outcome obligations rather than tasklet, file or commit counts.

Apply the normative [glossary atomicity contract](../../../../skills/plan-execution/references/glossary.md#atomicity-and-expression).
The stakeholder approved its application to requirements, acceptances and other
delivery records on 2026-10-10. Requirement gates in this campaign roll up atomic
obligations; every adopted successor baseline and assignment must reference
their canonical identities and complete discharge criteria.

The [delivery decomposition](delivery-decomposition.md) records candidate
outcomes and the evidence boundaries inspected so far. It is a planning input
to the next explicit ledger baseline, not an alternative satisfaction registry.

Keep inventory checks and requirement-wide final acceptance gates in their
own readouts. Their discharge remains mandatory for campaign closure, but
mixing them with delivery obligations does not measure work completion. A
completed delivery obligation never implies its parent requirement gate is
satisfied. Evidence must remain valid for the relevant inputs; an edit or
commit alone does not establish discharge.

Historical BASELINE-2 contains 12 inventory obligations and 9 broad requirement acceptance
gates. Its 0 satisfied and 21 unresolved projection measures formal acceptance,
not 0 percent of work performed. It does not yet provide a suitable delivery
obligation denominator. Report work percentage as unassessed until bounded
delivery obligations and their current evidence have been inventoried. The
next assessment must enumerate completed and remaining component migration
outcomes and rolling campaign operations, preserving the full approved scope,
existing obligation IDs and historical baselines. Any denominator amendment
must be explicit; never rewrite history or add only completed outcomes to
inflate progress.

BASELINE-3 appends 48 known rolling delivery obligations (OBL-22 through OBL-69)
and three language foundation obligations (OBL-70 through OBL-72), reconciles
requirement membership and acceptance Step contributions, and retains every
previous ID and gate. These are registered conditions, not discharged work.
Their execution bindings permit inspection only until prerequisites, exact
paths and executable operations are reviewed and registered. Remaining language
operation discovery keeps the full delivery denominator explicitly incomplete.

Reconciliation QA additionally owns the fixture input-identity repair in
`tests/rolling-campaign-store.integration.test.ts`: its isolated original-scope
baseline copies the current requirement bytes, so derive its fixture hashes from
those same inputs. Preserve every campaign historical baseline; do not weaken
certificate adequacy or freshness validation. Focused Git/PostgreSQL proof,
strict root build and unchanged TSTS validate this repair with the reconciliation.

Reconciliation evidence, 2026-10-10: the existing `acceptCheckpoint` operation
validates the successor against the immutable predecessor and current requirement
digests. All 51 registered atomic conditions are referenced by requirement and
acceptance records; 192 file/anchor links resolve. The configured strict root
build, runtime materialization check and unchanged TSTS pass (865 files).
Focused rolling configuration/graph/store proof passes 13 tests, including real
Git and PostgreSQL, with no failures or skips after repairing the isolated
fixture's stale input identities. Plan structure passes. Reverse-view generation
is synchronized but still reports the same nine unfinished review/publication/
interface coverage gaps. These checks validate reconciliation; they award no
delivery certificate and do not establish final campaign acceptance.

Show both delivery progress and final acceptance in status reports. Passing
checks and implementation details support the obligation assessment but are
not independent units of work. Do not invent lifecycle counts or a numerical
percentage unsupported by the authoritative records.

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
