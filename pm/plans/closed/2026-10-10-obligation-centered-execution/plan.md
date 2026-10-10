<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Obligation-centered planning, execution, and acceptance

- Plan ID: `2026-10-10-obligation-centered-execution`
- **Status:** `closed`
- Management and component repository: Ponytail, in the supplied checkout.
- Authority: the stakeholder approved the recorded plan, detailed design, glossary
  amendment and its two named CHNG proposals with "Approved. Go." on 2026-10-10.
  This is explicit implementation kickoff within the recorded project scope.
  Outside-project migration and installation remain excluded.
- Planning authority: on 2026-10-10 the stakeholder instructed the coordinator
  to proceed with detailed planning. Explicit implementation kickoff was subsequently given with "Approved. Go.".
- Final validation: configured full acceptance passed; scoped certificates and lifecycle evidence are recorded below.

<!-- ponytail-plan-campaign
{"schemaVersion":3,"id":"2026-10-10-obligation-centered-execution","parent_plan_id":null,"depends_on":[],"obligation_document":"pm/plans/closed/2026-10-10-obligation-centered-execution/obligations.json"}
-->

## Objective and provenance

Make obligations the durable objects of planning, worker assignment, progress,
and acceptance. Preserve tasklets as subordinate atomic implementation steps
when decomposition is useful. A completed edit is evidence to assess, not proof
that its governing obligation is satisfied.

This proposal incorporates the stakeholder's accepted obligation definition,
the preceding coordinator proposal, and the supplied traceability/correctness
decisions. Those decisions are expressed below entirely through Ponytail
concepts. No originating-project files, identifiers, audit counts, operational
assumptions, or confidential narrative are required to understand or execute
this plan. Imported decisions are design inputs, not implementation authority.

Canonical approved behavior remains in the
[requirements web](../../../requirements/index.md); canonical acceptance
procedures remain in the [UAT web](../../../uat/index.md). The approved requirements are activated; coverage and execution are independently
assessed in the canonical local pilot.

## Scope and exclusions

Scope comprises reusable policy and skills, durable obligation and evidence
contracts, existing readiness selectors, obligation-based assignment and
delivery, campaign projections, indexed discovery, compatibility, focused
proof, generated host copies, and project-local configuration synchronization.
Concrete emitted schemas and command names require detailed planning first.

Keep all work in this project. Do not modify adopting projects, create or switch
worktrees, provision cloud resources, add another scheduler, introduce product
test paths, install policy into user directories, or retrospectively rewrite
completed plans. Select a local pilot only through the approval gate below.

## Accepted definition and proposed planning model

**Obligation:** an identifiable responsibility to establish a specified
condition, derived from approved requirements or applicable Ponytail rules,
and discharged by adequate evidence.

An obligation is neither a requirement nor its UAT representation. Its identity
persists after discharge; invalid evidence can reopen it. An obligation is not
inherently atomic in the sense of owning one implementation declaration.

| Construct | Responsibility |
| --- | --- |
| Requirement | Defines approved product behavior. |
| Acceptance | Defines the atomic observable acceptance condition in the UAT root, with its demonstration procedure. |
| Obligation | Defines a condition and its discharge criterion. |
| Plan | Organizes authorized discharge of a declared obligation scope. |
| Sprint | Groups work intended for one execution interval. |
| Feature/story | Retains a complete independently releasable outcome. |
| Tasklet | Describes an atomic implementation step toward discharge. |
| Worker assignment | Gives a session bounded responsibility for selected obligations. |
| Certificate | Establishes satisfaction for identified inputs. |

One obligation may require several tasklets. One authorized change may discharge
several obligations. Existing adequate evidence may discharge an obligation
without an edit. Preserve tasklet atomicity when tasklets are used; replace the
blanket assumption that the central acceptance object owns one declaration.
Do not require a tasklet graph for inspection, reuse of evidence, or a single
bounded operation when its omission preserves execution safeguards.

One canonical obligation record should contain stable identity, authoritative
derivation, precise condition, scope and baseline, discharge criterion,
prerequisites, authority gates, certificate or unresolved reason, and references
to work and evidence. Assignment state is distinct from satisfaction. A worker
finishing, a commit merging, or a tasklet reaching DONE is not discharge.

Workers receive obligation IDs, exact write boundaries, prerequisites, permitted
operations, evidence expectations, and return conditions. They propose discharge;
acceptance validates certificates on reconciled inputs. Preserve exclusive path
ownership, dependency ordering, generated/configuration synchronization, review,
selective commits, and all approval boundaries.

Plans and their acceptance groups complete only when owned obligations and
applicable validation gates are satisfied. Retain canceled or superseded work
with its rationale; necessary unfinished work still prevents completion.

## Traceability and correctness requirements for the proposed system

### Frozen baseline and controlled changes

Freeze the exact selected approved requirement IDs, canonical sources, meanings,
and relevant repository/input identities. Global scope is this declared set,
including necessary supporting artifacts; it is not an implicit inventory of
all registered projects. A campaign uses its authorized members' selected union.
A repository-wide claim requires repository-wide scope.

Keep the requirements constant through both control stages. Unknown coverage
is unresolved. Scope moves, deferral, reassignment, and work decomposition do
not discharge obligations or shrink the frozen set.

Use issue-tracking's FEAT/CHNG process for additions or changes. Filing, approval,
and implementation activation remain separate. CHNG requires explicit approval
per issue; manually filed human FEATs are approved at filing, whereas imported
FEATs require explicit approval. Neither intake approval authorizes execution.
BUG concerns existing required behavior; TASK requires requirements assessment.
Never amend requirements to excuse observed behavior or reduce the metric.

An approved, activated amendment creates a new baseline. Preserve the predecessor,
authority, reason, superseded meaning, and unresolved obligations. Rebaselining is
not a decrease within the old baseline. Reconcile requirements and UAT through
their existing activation gate before dependent implementation.

### Atomic requirements and acceptance

One atomic requirement admits a UAT procedure that independently establishes
compliance with the whole requirement. If distinct procedures are jointly
necessary, split the requirement through the controlled amendment process.
Several ordered Steps in one Arc remain compatible with atomicity.

Multiple procedures may verify one requirement when each independently proves
the whole requirement. Execution profiles do not justify duplicate Arcs. UAT
derives actors, prerequisites, actions, and observations from approved behavior;
it cannot create new product behavior. Missing automation does not prevent
maintaining the plain-English acceptance contract.

### Six-coordinate metric

Use finite non-negative integer counts of unresolved obligations in this exact
order. Unknown, missing, unsupported, or invalid certificates remain unresolved.

| Priority | Coordinate | Obligation and required certificate |
| --- | --- | --- |
| 1 | T1 | Requirement to UAT: an adequate linked Arc independently proves the atomic requirement. |
| 2 | T2 | UAT to executable integration: an addressable Arc and its Steps implement the actions, observations, and lifecycle through the real product path. |
| 3 | T3 | Acceptance path to implementation: truthful relationships resolve behavior to actual stable owned units and necessary support. |
| 4 | T4 | Implementation to unit proof: independently testable responsibilities have adequate executable unit proofs or admissible justified dispositions. |
| 5 | C1 | Required unit proofs have fresh passing execution evidence. |
| 6 | C2 | Required integration selections have fresh passing evidence for the linked UAT observations and intended environment. |

Traceability equilibrium is `(T1,T2,T3,T4) = (0,0,0,0)`; business equilibrium is
`V = (T1,T2,T3,T4,C1,C2) = (0,0,0,0,0,0)`. A structural pass proves neither
relationship adequacy nor product compliance. A linked test can fail; a passing
test can prove the wrong behavior.

Other Ponytail-rule obligations, including authority and synchronization gates,
remain explicit. Do not force them into this requirements metric or introduce a
seventh coordinate. Tasklet counts remain operational information, not acceptance
progress or a substitute scalar metric.

### Relationships, identities, counting, and completeness

Canonical annotations beside the smallest stable owned units remain the sole
relationship source. Generate reverse discovery from them. Distinguish direct
implementation, support, verification, and prospective work. Structural IDs,
artifact registration, semantic attachment, generated-source integrity, and
reverse parity are necessary parts of affected certificates.

Planned units, incidental mentions, empty tests, and substitute product paths
cannot discharge obligations. Unit proofs establish units' responsibilities;
they need not duplicate integration assertions. A disposition waives only its
justified unit obligation, never integration or UAT; inconvenience is insufficient.

Proposed counting units are: one T1 per atomic requirement; one T2 per required
UAT Arc; one T3 per required acceptance Step/assertion responsibility; one T4 per
independently testable unit/responsibility; one C1 per required unit selection;
one C2 per required integration Arc/profile/environment selection. Tests may
discharge multiple responsibilities only when adequacy is established for each.
Optional redundant procedures do not automatically become required obligations.

Proposed stable IDs combine baseline, coordinate, governing requirement, and
responsibility/artifact identity. Use declared Arc, Step, unit, and test IDs;
line numbers are locators. Preserve identity across moves and record explicit
supersession when responsibilities change. Shared structural failures invalidate
affected certificates without duplicating diagnostics as additional obligations.

Completeness requires review of the selected requirements, UAT observations,
executable selections/lifecycle, real implementation/support, unit proofs and
dispositions, and required environments. Registration alone is insufficient.
Propose explicit inventory obligations for unfinished discovery in the affected
coordinate. Closing one must enumerate discovered responsibilities. Counts then
measure unresolved responsibilities including inventory, not a claimed exact
number of undiscovered leaf gaps. This counting design remains subject to review.

### Controller and accepted checkpoints

At every accepted checkpoint:

1. Verify the frozen baseline and affected prior certificates.
2. Select an unresolved obligation in the earliest nonzero coordinate; use
   stable obligation-ID ordering for equally eligible work.
3. Perform the smallest authorized repair, reusing adequate artifacts and
   immediately recording every necessary downstream obligation it exposes.
4. Validate affected certificates and applicable QA; record exact before/after
   vectors, changed IDs, commands, selections, evidence, and remaining gaps.
5. Accept productive progress only on strict lexicographic decrease: earlier
   coordinates equal, first differing coordinate smaller, later coordinates
   allowed any finite non-negative values.

Stage one resolves T1 through T4 globally. Stage two resolves C1, then C2,
preserving earlier zeros. After adding UAT, the next downstream category is T2,
then T3, then T4, but an earlier unresolved category elsewhere retains priority.
Do not substitute per-requirement end-to-end completion for global ordering.

Mandatory QA may run in either stage. Reuse its passing evidence when inputs
remain unchanged. Intermediate edits or individual tasklet completion are not
automatically accepted state transitions. An integration repair that changes
source must reconcile relationships and affected unit passing evidence before
accepting a C2 decrease. Preserve focused, feature, sprint, and final QA cadence.

An accepted boundary spans the necessary reconciled project change-set. Record
baseline, predecessor, selected obligation, certificates, vectors, evidence,
and productive/neutral/disturbance/rebaseline classification. Before publishing,
verify the predecessor against current state and revalidate affected evidence;
concurrent work cannot publish discharge against an obsolete predecessor.

Neutral preparation names one selected obligation, a concrete deliverable, and
a finite stopping condition. Do not repeat an exhausted investigation without
new evidence or a different bounded approach. Missing authority or capability
remains explicit, not satisfied; continue independent authorized preparation
without bypassing global productive-transition priority.

### Evidence, disturbances, and limits

Execution evidence identifies revision or relevant input identity, dirty-tree
state, exact command/selection, environment/profile and deployed identity where
applicable, timestamps, outcomes, failures, skips, output references, and required
finalization. Unrun, stale, failed, or skipped required proof remains unresolved.
Reuse requires unchanged relevant inputs; uncertain dependency scope cannot
justify freshness. A new unrelated commit alone need not invalidate evidence
when unchanged relevant inputs can be established.

When observations invalidate a certificate, record the honest increase, its
cause, and before/after vectors; return to the earliest affected category. Late
discovery after certified completeness invalidates that certificate. Preserve
the earlier segment and distinguish the new certified segment. Do not rewrite
history, weaken assertions, remove obligations, or call regressions productive.

Strict lexicographic descent in `N^6` is well-founded, including finite downstream
growth. It bounds productive transitions, not every possible execution. Reaching
zero additionally requires reachable finite authorized repairs, progress, and
controlled disturbances/baselines. No unconditional convergence claim or finite
weighted scalar replacement is permitted. The systems analogy is not a claim
of a continuous-state stability theorem.

## Canonical ownership and implementation boundaries

| Owner | Proposed responsibility |
| --- | --- |
| [Ponytail](../../../../skills/ponytail/SKILL.md) | Short obligation/convergence trigger; preserve existing safeguards. |
| [Requirements](../../../../skills/requirements/SKILL.md) | Baseline, atomicity, source authority, controlled amendments. |
| [UAT](../../../../skills/user-acceptance-testing/SKILL.md) | Independently complete procedures and canonical Arc/profile distinction. |
| [Traceability](../../../../skills/requirements-traceability/SKILL.md) | T1-T4 certificates, identity/counting and completeness assessment; one relationship source. |
| [Issue tracking](../../../../skills/issue-tracking/SKILL.md) | Existing approval/type/activation semantics; cross-reference rebaseline effects. |
| [Plan execution](../../../../skills/plan-execution/SKILL.md) | Central obligation model, assignments, C1/C2 evidence, controller, acceptance and lifecycle. |
| [Production test boundaries](../../../../skills/production-test-boundaries/SKILL.md) | Existing real-path proof, profiles, isolation and production exclusion. |

Extend existing selectors rather than create a scheduler. The central selection
is an obligation; necessary tasklets can use risk/affinity within that repair.
Preserve exact-path/dependency checks and prohibit unrelated later-coordinate
work from bypassing upstream gaps. Review batching against checkpoint boundaries.

Existing traceability checks prove structural relationships and locators;
indexed discovery proves projection freshness. Neither certifies adequacy or
execution success. Add the smallest record/transition validator for IDs,
predecessors, baseline identity, certificate/evidence references, arithmetic,
ordering, and event classification. Keep semantic adequacy review explicit.

Reuse existing campaign census/orchestration and project-index boundaries for
readiness, assignment, delivery, and discovery. Commands, environment adapters,
credentials, evidence locations, and topology remain project-owned. Durable
emitted schemas require immutable versions, explicit readers, latest writers,
manifest registration, and compatibility proof. Decide exact schemas in planning.

## Design disposition and approval boundary

[The S01 design](./design.md) records concrete recommendations selected during
stakeholder-authorized detailed planning. Its record is the canonical design
specification; the summaries here do not create alternate physical schemas.

Canonical proposed issues: [obligation-centered execution epic](../../../bugs/closed/2026-10-10-CHNG-obligation_centered_execution.md)
and [repair-plan starting gate](../../../bugs/closed/2026-10-10-CHNG-repair_plan_starting_gate.md).
Both named CHNGs were explicitly approved with the plan and are now in progress.
Their requirements and UAT reconciliation precedes the first product policy edit.

- [RESOLVED] Design recommendation: obligations are central for new activated
  plans; tasklets remain conditional subordinate work with existing safeguards.
- [RESOLVED] Design recommendation: responsibility counting includes explicit
  category inventory obligations. Same-category discovery increases are honest
  disturbances. Stable scope-local numeric IDs survive rebaselines; membership
  provides baseline context rather than encoding a baseline in every ID.
- [RESOLVED] Design recommendation: one canonical obligation document, derived
  satisfaction, explicit input manifests, and existing coordinator acceptance.
- [RESOLVED] Design recommendation: earliest-coordinate obligation selection
  precedes subordinate tasklet ranking. Freeze same-category batches and paths.
- [RESOLVED] Design recommendation: narrowly admit reproduced existing failures
  expressly owned by an approved repair objective; retain all other readiness gates.
- [RESOLVED] Design recommendation: use this plan's S04 acceptance as the local
  pilot; other active plans and external-project migrations remain excluded.

The stakeholder subsequently approved these design decisions and both named
CHNGs and gave explicit kickoff on 2026-10-10. Requirement activation is the first
implementation gate; selector results alone never provide authority.

Per-requirement structural coverage is weaker than responsibility-level T3/T4
adequacy. Current one-Arc wording must permit independently complete alternatives.
Requirement-level unit dispositions need reassessment for independently testable
units. Preserve inherently human acceptance as explicit unresolved gates when
automation cannot honestly prove the outcome. These are disclosed policy changes,
not decisions already approved by accepting the obligation definition.

## Sprint manifest and readiness

| Sprint | Intent | Planning dependency | State |
| --- | --- | --- | --- |
| [S01](./sprints/S01.md) | Adopt the reviewed policy and acceptance contract after kickoff. | None | DONE |
| [S02](./sprints/S02.md) | Implement durable records, validation, and obligation-first selection. | S01 | DONE |
| [S03](./sprints/S03.md) | Integrate assignment/delivery and discovery; prove compatibility. | S02 | DONE |
| [S04](./sprints/S04.md) | Run approved local pilot, reconcile generated policy, and final acceptance. | S03 | DONE |

All four sprints now have reviewed V4 tasklet graphs and approved V3 execution
metadata. All four sprints are DONE. S04 adopted this authorized local pilot;
C1/C2 and the final synchronization gate are discharged by recorded final proof.
Shared aggregate paths retain explicit execution ordering. The V3 plan pointer
names the sole canonical obligation document.

## Acceptance and validation examples

The implemented system must make obligation state authoritative for assignment
and acceptance, preserve exact scopes and historical readers, prevent false
discharge, and derive vectors deterministically from assessed certificates.

| Case | Required result |
| --- | --- |
| Add missing UAT: `(1,0,0,0,0,0)` to `(0,1,2,2,2,1)` | Productive; record necessary downstream growth without inventing scope. |
| Repair integration: `(0,0,0,0,0,1)` to zero | Accept only after preserving traceability and fresh affected unit proof. |
| Invalidate UAT: `(0,0,0,0,0,1)` to `(1,0,0,0,0,1)` | Disturbance; reopen identity, retain history, return to T1. |
| Approved and activated CHNG | New baseline; preserve old unresolved obligations, no cross-baseline decrease. |
| Existing adequate evidence, no edit | Discharge after assessment without fabricating a tasklet or commit. |
| All edits DONE but proof stale/failed/skipped | Obligation and parent acceptance remain unresolved. |
| Two deliveries share an obsolete predecessor | Reject stale publication; reconcile and revalidate before acceptance. |

Focused proof must reject equal/increased vectors labeled productive, hidden
inventory gaps, blanket dispositions concealing testable units, invalid links,
unauthorized baseline edits, and scope/order bypass. Prove exact historical
contract readers and legacy-plan execution; migration cannot reinterpret DONE
as satisfaction. Keep one canonical record and derive projections from it.

Pure proposal prose requires structural checks, not product acceptance. During
implementation use configured focused proof at tasklet/standalone gates, smallest
sufficient feature integration, affected sprint Arcs, and final applicable full
unit/integration gates. For Ponytail final core acceptance run `npm test`, the
rule-copy check and version check after final relevant edits. Query build impact
and build only affected targets; resolve indeterminate results. Synchronize
canonical policy, generated rule/OpenClaw copies, contracts, configuration,
requirements, UAT and reverse views through their owning generators.

## Migration and final evidence

New plans adopt the approved model after implementation. Historical formats stay
readable; active-plan migration requires scoped authority and explicit certificate
assessment. Closed plans remain immutable except authorized corrections. Do not
auto-migrate external projects, install user policy, or manufacture historical
vectors. Rebaseline or disturbance history must retain unresolved obligations.

Final evidence must name changed paths/commits, certificate/transition results,
focused and final QA outcomes, build-impact outcome, compatibility results, pilot
scope and result, and remaining human/host gates. Final completion remains pending
until those gates actually pass and persistent records agree.

Glossary planning amendment on 2026-10-10: add one canonical portable glossary
referenced from rules and skills. Use acceptance for the atomic UAT condition and
Arc for its ordered demonstration; preserve the Suite/Arc/Step hierarchy and
existing traceability certificates. The detailed glossary and ownership/migration
contract are in design.md. S01 includes a dedicated glossary tasklet plus updates
to each existing owner's reference tasklet; the subsequent stakeholder approval authorized implementation; user-directory
installation remains excluded.

Document-recording validation on 2026-10-10: scoped campaign validation passes
for the original one open plan, four V3 sprint stubs, and zero tasklets.
The original planning selector returned `S01`; execution returned no executable
sprint. Original file-link and whitespace checks passed. Subsequent S01 detailed
planning is READY_FOR_REVIEW with eleven proposed pending tasklets; canonical graph,
dependency and scoped campaign validation pass. All 28 relative file links in the
eight plan/design/sprint/issue documents resolve; JSON and whitespace checks pass.
Those planning-time selectors allowed S01 review and no implementation;
S01–S03 are now DONE. Detailed
evidence is recorded in the S01 sprint document.
S01–S03 implementation and focused acceptance are complete in their sprint
records. S04 final acceptance passed; initial full QA found an obsolete
V2-only policy assertion, corrected under the approved adoption scope.

Traceability: plans-implementation REQ-PONYTAIL-GLOSSARY from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-PONYTAIL-GLOSSARY from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-IDENTITY from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-IDENTITY from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-DISCHARGE from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-DISCHARGE from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-ASSIGNMENT from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-ASSIGNMENT from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-PRIORITY from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-PRIORITY from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-TRANSITIONS from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-TRANSITIONS from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-COMPLETENESS from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-COMPLETENESS from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-BASELINE from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-BASELINE from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-FRESHNESS from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-FRESHNESS from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-OBLIGATION-COMPATIBILITY from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-OBLIGATION-COMPATIBILITY from plan 2026-10-10-obligation-centered-execution

Traceability: plans-implementation REQ-REPAIR-PLAN-STARTING-GATE from plan 2026-10-10-obligation-centered-execution
Traceability: plans-verification REQ-REPAIR-PLAN-STARTING-GATE from plan 2026-10-10-obligation-centered-execution

## Final implementation and acceptance

The approved implementation is complete. Final `npm test` passed 606 core,
23 extension, 4 MCP and 80 TSTS cases with no failures or skips; installer,
registry, manifest, rule-copy and structural checks passed. Build-impact returned
no affected or indeterminate targets. Full execution revision and exact input
digests are in `evidence/final-run.json` and `evidence/final-inputs.json`; raw
output is `evidence/final-tests.log`. Local adoption preserves sixty stable
obligation IDs, exact baseline requirement bytes and all accepted history.
Lifecycle relocation is recorded as an honest disturbance followed by fresh
assessment of relocated byte-identical proof; no historical prefix is rewritten.
Closure claims only these eleven approved requirements in Ponytail.

[Canonical obligations](obligations.json) | [Adequacy assessment](evidence/acceptance.md)
