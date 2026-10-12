<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling obligation campaigns

## Stakeholder scope correction — 2026-10-11

The repository's [local rules](../../../../AGENTS.md#local-rules) own the
corrected prospective language scope: our Codex plan-execution code only.
Keep completed translations. Earlier whole-owned-codebase migration statements
in this plan, S07, the language inventory and decomposition are historical
interpretations superseded by this correction. Do not start further migration
of pre-existing Ponytail code. Preserve immutable obligation and certificate
history. BASELINE-15 activates the corrected requirement bytes and authority,
retains all 91 registered atomic delivery obligations and invalidates affected
certificates for explicit renewal. This amendment awards no completion.

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
| S07 | [Static TypeScript migration](sprints/S07.md), scoped prospectively to our campaign code | Done |
| S04 | [Ponytail checkouts and direct Codex workers](sprints/S04.md) | Done |
| S05 | Increment integration, publication batches and QA evidence on exact revisions | Done |
| S06 | Chapter CLI/MCP, old dispatcher replacement, portable policy and final acceptance | Done |

Current reconciliation, 2026-10-11: BASELINE-16 contains 91 atomic delivery
obligations and 21 inventory/requirement rollups. All 91 delivery obligations
have historical accepted certificates; source corrections and binding amendments
require current evidence renewal before final discharge. The last twelve delivery
items were executed in the approved groups of four (OBL-58–61, OBL-62–65,
OBL-66–69). The interface group includes a direct CLI cancellation regression.
The final store-contract correction adds current V3 configuration and scope
writers with immutable V1/V2 readers and normalization at the boundary.

Clean-tree full acceptance on `ff5bb07` passed 883 Node tests with zero failures;
unchanged TSTS checked 1,253 files, and traceability checked 827 relationships
without violations. No product input changed in the following no-edit prerequisite
renewal scope. These results are reusable QA evidence, not a declaration that
the campaign is complete. Outstanding work is current certificate renewal in
dependency order, requirement/inventory rollups, native evidence freshness and
final documentation reconciliation. Historical sprint/tasklet records remain
preserved; the states above describe implementation separately from acceptance.

The active sprint's exact declarations, paths, invariants and focused proofs
are recorded before source edits. Later sprint detail is refined from the
accepted design before its readiness gate, without expanding approved scope.

The corrected language gate applies to code introduced by our Codex
plan-execution work and its supporting tests/tooling. Preserve completed
translations and their verification responsibilities. Existing S02/S03 and
checkout evidence does not by itself establish acceptance after relevant source
changes. The former S07 blanket migration frontier is historical; it does not
authorize further conversion of unrelated Ponytail code.

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

The [owned executable inventory](language-inventory.md) records the current
canonical source, generated-runtime, OpenClaw and TSTS partitions, public
boundaries and embedded-program/host-launch ownership. It closes the missing
path census without claiming that the atomic outcome inventory is complete.
Reconcile its behavioral boundaries into canonical obligations before treating
source counts, existing typed modules or test fixtures as delivered outcomes.

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

## Final delivery checkpoint — 2026-10-12

BASELINE-16 / CHECKPOINT-294 records fresh discharge of all 91 registered
atomic delivery obligations (OBL-22 through OBL-112). The canonical
[obligation document](obligations.json) remains the satisfaction authority;
this is a dated checkpoint, not another status registry. The historical
reconciliation snapshots above retain their original meanings.

The 12 proof-inventory records and nine requirement rollups remain pending.
The complete native acceptance Suite is running from clean revision
`a1cc7dc74f8b897062d238d177290ea35bf8894b`; its result is not yet acceptance.
Final requirement-by-requirement audit and the successful-completion lifecycle
transition remain required. Delivery discharge alone does not close this plan.

## Final execution checkpoint — 2026-10-12

BASELINE-17 registers 92 atomic delivery conditions, including the reproduced archive compatibility correction OBL-113. Full repository QA passed 897 tests; final clean-source native acceptance passed all 12 cases. Sprint execution records are reconciled to DONE from that actual proof. S05/S06 were prospective delivery groups implemented through the identified atomic obligations and recorded operation evidence, rather than additional registered sprint files. Final certificate/inventory/requirement assessment and the successful-completion directory transition remain pending; no completed-plan claim is made here.

## Final acceptance — 2026-10-12

BASELINE-17 / CHECKPOINT-327 accepts all 92 atomic delivery obligations and all 21 proof-inventory/requirement rollups. The six-coordinate proof vector is zero and no owned responsibility remains unresolved. CERT-324 through CERT-436 retain the final source, actual execution provenance and sealed evidence. All predecessor baselines, certificates and checkpoints are preserved. Full repository QA passed 897 tests; final clean-source native QA passed 12 cases; unchanged TSTS, generated runtime, traceability, rule-copy and version checks passed. The directory transition below will preserve this accepted historical record; current-input projection is not substituted for historical acceptance after relocation.
