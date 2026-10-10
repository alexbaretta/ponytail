<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# S01 design: obligation-centered execution

[Back to plan](./plan.md)

## Decision authority

The stakeholder approved this detailed design, the named CHNGs and glossary
amendment and authorized implementation with "Approved. Go." on 2026-10-10.
Approval activates the requirements gate; future contracts become available
only when their implementation and validation actually complete. Existing commands and physical contracts
remain authoritative until approved implementation adopts their replacements.

The accepted obligation definition and six-coordinate model in the plan are
unchanged. All choices below are proposed implementation decisions. No new skill,
scheduler, cloud resource, outside-project operation, or user-policy installation
is part of this design.

## Central model and adoption

### Shared glossary and the UAT atom

Plan one canonical portable glossary at
`skills/plan-execution/references/glossary.md`. The always-on rules and specialized
skills reference it rather than copy definitions. Generated host resources are
derived copies, never alternative authorities. The glossary owns the short
definitions; existing skills retain their detailed contracts and procedures.
Where a skill currently repeats a short definition, replace it with a reference
while preserving its detailed semantics. This includes the production-test
Suite/Arc/Step definitions; their execution rules remain in their existing owner.

Use **acceptance** as the single-word term for an atomic acceptance condition
recorded in the configured UAT root, normally `pm/uat`. It states the observable
condition establishing compliance with an atomic approved requirement. Its record
also supplies actors, prerequisites and a procedure demonstrating that condition.
A condition stated without an adequate procedure does not satisfy T1.

An **Arc** remains a named ordered procedure of Steps, in plain English or
executable form. Acceptance names the condition; Arc names its demonstration.
They are not aliases or interchangeable IDs. Multiple independently complete
Arcs may demonstrate the same acceptance; no second relationship map or mandatory
new identifier is introduced just to name that distinction. Existing UAT records
may contain both the acceptance and its Arc. Suite/Arc/Step remains the integration
hierarchy. Ordinary uses such as plan acceptance and release acceptance continue
to mean their existing gates; qualify them when needed to avoid ambiguity.

| Construct | Glossary definition |
| --- | --- |
| Requirement | Defines approved product behavior. |
| Acceptance | Defines the atomic observable condition by which compliance with a requirement is established; its UAT record includes an adequate demonstration procedure. |
| Obligation | An identifiable responsibility to establish a specified condition, derived from approved requirements or applicable Ponytail rules, and discharged by adequate evidence. |
| Plan | Organizes authorized discharge of a declared obligation scope. |
| Sprint | Groups work intended for one execution interval. |
| Feature/story | A complete piece of functionality that could be released independently. |
| Tasklet | Describes an atomic implementation step toward discharge. |
| Worker assignment | Gives a session bounded responsibility for selected obligations. |
| Certificate | Establishes that an obligation is satisfied for identified inputs. |
| Suite | Groups related Arcs. |
| Arc | A named ordered procedure of one or more Steps demonstrating an acceptance condition. |
| Step | A user or system action and its expected observable result; executable integration Steps are independently reported operations with assertions. |

The screenshot supplied on 2026-10-10 is reference material for this glossary,
not a source of instructions or implementation authority. The stakeholder asked
to plan the glossary and proposed the word acceptance; implementation remains
subject to the plan's kickoff gate. This glossary addition preserves the agreed
six-coordinate model and counting by required demonstration Arc, not by labels.

Newly activated plans use obligations as acceptance objects. Existing plans retain
their physical format until explicitly migrated. The plain-English plan and
sprint describe intent, design, authority and work; the obligation document owns
conditions, certificates and transition history. Tasklet metadata continues to
own exact implementation paths and dependencies when tasklets are needed.

Do not rename tasklets as obligations or convert DONE into satisfaction. Keep
tasklets atomic. Permit a bounded certificate assessment or no-edit operation
without a tasklet graph; represent its authority and exact permitted paths in
the obligation execution binding. A multi-edit repair still requires reviewed
atomic decomposition. Retain feature/story and sprint QA gates.

Current rules can be introduced in S01 as a documented adoption contract with
an explicit tooling prerequisite. Do not globally require unavailable commands.
S02 implements the contract, S03 integrates consumers, and S04 demonstrates
adoption and removes transitional qualification after final acceptance.

## Canonical storage and identities

Use one `obligations.json` beside the owning `plan.md` for an independent plan.
A campaign root owns the shared document; member plans reference it and do not
copy obligations. An activated standalone issue may use a sibling
`<issue-id>.obligations.json` under its configured collection. Lifecycle moves
move those records and repair links together. Host configuration names the
document explicitly; tools do not search secondary locations.

The new physical V1 document has exactly these top-level fields:

`schemaVersion`, `scopeId`, `baselines`, `obligations`, `certificates`, `checkpoints`.

Arrays use stable IDs and deterministic ordering. Conditions and certificates
are authoritative records; status and counts are derived, not separately edited.
Assignments stay in their existing execution owner and reference this document.
Ordinary runtime logic normalizes exact physical versions into one current model.
Register the new family as `plan-obligation-document` in the contract manifest.
Define exact nested schemas and exported reader names during S02 planning before
any writer emits V1; do not freeze a representation from this prose alone.

An obligation ID is local to its scope and stable across baseline revisions:
`OBL-` followed by a monotonically allocated positive decimal number. Never
reuse a retired ID. The document's scope ID plus local ID is the global identity.
Baseline membership references that identity rather than renaming unchanged
obligations at every rebaseline. Changed condition meaning creates a successor
ID with an explicit supersession record. Requirement, entity, Arc and selection
IDs remain references to their own canonical declarations, not aliases.

This refines the plan's earlier candidate of embedding a baseline in every ID:
membership supplies baseline context while unchanged obligations keep identity.
It does not change the accepted definition or coordinate order.

## Obligation and certificate contracts

An obligation declares its ID, governing authority references, condition,
discharge criterion, category (`T1` through `C2` or `gate`), responsibility ID,
prerequisites, applicability, and owning acceptance groups. Refer to canonical
requirement/Arc/unit/selection identities instead of maintaining another graph of
requirement relationships. A gate is not a seventh coordinate.

Baseline membership records the exact required obligation IDs and governing
requirements. Keep optional redundant proofs out of required membership until
an approved acceptance contract makes them necessary. Remove no responsibility
through an ordinary work move or convenience disposition. Supersession must
retain its predecessor and have an appropriate baseline or justified equivalent
decomposition; decomposition does not erase the predecessor's condition.

Certificate records identify the obligation, assessed input snapshot, canonical
artifact references, adequacy rationale, structural results, evidence references,
assessor identity and time. Their validity is derived from accepted checkpoint
events, current inputs, and invalidations. A pending assessment is unresolved.
Store no second Boolean satisfaction flag in tasklets or assignments.

The existing authorized coordinator accepts shared-scope certificates. A worker
delivers candidate evidence and cannot certify its own delivery merely by claiming
completion. A standalone executing agent may assess local evidence under its
existing authority; stakeholder/manual approval is still required wherever the
acceptance contract requires it. Do not invent another independent-review gate.

## Counting and completeness

Use the plan's proposed T1-T4/C1-C2 responsibility granularity. A certificate may
cover a finite declared set of obligations, with adequacy assessed for each.
One missing certificate means one unresolved obligation, irrespective of how
many diagnostic messages describe it. Disposition is an admissible T4 certificate,
not proof of passing execution. It must resolve the exact canonical disposition
and cover only independently untestable responsibilities.

Initialize a discovery/inventory obligation for each incomplete requirement and
category inventory. It shares that category, never a separate metric. Closing
it requires a reviewed enumeration of required responsibilities plus references
to inspected artifacts and exclusions. Known downstream obligations are registered
immediately; no assumption of their completeness is needed to prioritize T1.

Enumerating previously unknown obligations within the same coordinate may increase
that count. Record this as discovery/disturbance, never as productive progress.
The inventory marker prevents a false zero; it does not prove complete knowledge
of unknown leaf counts or guarantee a monotonic initial discovery period. Begin
a claimed descending segment only from its truthfully certified observation state.
Repeated discovery invalidations cannot establish unconditional convergence.

T4 adequacy is unit/responsibility-specific even if the structural checker only
requires a test class per requirement. Retain V1-V4 traceability readers unchanged.
For legacy no-unit reasons, require explicit semantic assessment of their scope;
do not apply a blanket reason to discovered testable units. S02 planning determines
whether an immutable V5 is necessary for canonical scoped disposition storage.

## Baseline and freshness policy

A baseline identifies its predecessor, authority/activation references, selected
canonical requirement IDs/sources, source content digests, required membership,
and the inspected repository/input snapshot. Capture governing meanings at an
exact Git revision or retained relevant dirty input; an evidence snapshot is
historical provenance, not another active requirements document.

Freshness uses explicit relevant input manifests: repository-relative paths,
content digests, relevant configuration/generator/dependency inputs, selection
identity, and applicable environment/profile/deployed identity. The adequacy
assessment must justify the dependency closure. If closure is not established,
use the full applicable product/configuration input set; do not assume freshness.
Evidence output and PM-only updates are not automatically product inputs.

Time alone neither establishes freshness nor creates a portable expiry period.
Mutable environment state and required lifecycle conditions must be verified
through the configured project-local operations owner before reuse. Missing
environment identity or required verification leaves C2 unresolved. Reuse is
permitted for unchanged relevant inputs and equivalent required target conditions.

Execution evidence includes command, exact selection, revision/dirty state and
input manifest, target identity/profile, start/end time, outcomes, failures/skips,
output references, and finalization result. No arbitrary command is executed by
the record validator. The host's existing operations own running and collecting
proof. A structural check or a passing empty selection cannot certify behavior.

## Selection, checkpoints, and concurrency

First compute the earliest nonzero coordinate from the canonical accepted state.
Among eligible unresolved obligations there, order by numeric obligation ID.
Eligibility requires authority and prerequisites; explain unavailable candidates
without hiding them. If none can be repaired, report the blocking conditions and
perform only independently authorized bounded preparation, not productive repair
in a later coordinate. Within a selected obligation, reuse existing tasklet
dependency/path checks and optimize necessary work without overriding priority.

The controller may batch obligations from the same earliest category. Freeze
the selected IDs and paths; a single accepted checkpoint covers the reconciled
repair and all necessary downstream registration. Do not dispatch unrelated later
categories as batch descendants. Existing QA runs remain permitted in both stages.

Checkpoint records identify predecessor, baseline, selected obligations, input
snapshot, additions/assessments/invalidations, before/after vectors, evidence,
authority references, and event kind. Count vectors from membership and certificate
validity, then compare with the recorded values. Productive requires strict lexicographic
decrease and earlier-coordinate preservation; neutral requires unchanged vector and
a bounded preparation record; disturbance preserves honest increases; rebaseline
starts another baseline and is never compared as old-baseline progress.

Neutral preparation records one selected obligation, a finite declared inspection
or operation set, expected deliverable, and stop result. Exhausting that set ends
the preparation episode. Another episode needs changed evidence or a different
bounded approach; repeated no-op continuation is invalid.

One existing coordinator owns the shared obligation document and Git index.
Workers write candidate evidence within their leases, not the accepted document.
Acceptance uses the existing coordinator mutation boundary, checks predecessor
and inputs inside that boundary, then publishes the document and lifecycle
evidence in its cohesive project change-set. S03 must prove the serialization
boundary before accepting concurrent delivery; compare-then-rename alone is not
atomic compare-and-swap. No new global lock or independently managed resource.

## Starting gate and authority

Recommend admitting only reproduced pre-existing failures that the approved repair
plan explicitly owns, with failing selection, requirement, obligation and repair
scope recorded before kickoff. All other required starting checks must pass or
receive their existing valid manual/unavailable handling. Newly introduced or
unplanned failures block readiness. Known failures remain unresolved in vectors
and prevent acceptance; this exception grants no permission to weaken assertions.

The stakeholder approved the revised allowance with this incorporation plan.
The unchanged starting tree nonetheless passed its existing tests; this run does
not rely on the allowance to bypass a product failure. FEAT/CHNG intake
approval, plan approval, kickoff, deployment/resource authority, and release
authorization retain their separate meanings. Current policy changes that alter
approved behavior must be reconciled through the corresponding issue gate.

## Consumer migration and pilot

Keep historical sprint V1-V3 and tasklet V1-V4 readers unchanged. Introduce new
physical versions only where emitted fields or semantics change. The new selector
first resolves an obligation, then uses subordinate tasklet readiness if bound.
Obligation-only work must have its own exact execution binding; it cannot borrow
undeclared paths from a legacy tasklet or use a prose fallback selector.

Campaign ledger, actions, status, census and project-index consumers require
new explicit representations if they acquire obligation fields. Their currently
emitted versions are inventory inputs, not permission to amend those schemas.
S03 planning must inventory every boundary and freeze concrete replacements.
No claim that legacy workers satisfy obligation assignments by normalization.

Use this plan's S04 acceptance as the bounded local pilot after the tools exist:
keep current sprint/tasklet metadata for implementation, add the plan's obligation
document for its acceptance responsibilities, and prove the new behavior against
real local files and existing commands. This does not mark earlier edits satisfied
automatically. Exercise two independent local deliveries with deterministic fixtures
for stale predecessor proof; no new worker session or external project is required.
Active-plan migrations beyond this pilot remain excluded until separately scoped.

## Proposed acceptance responsibilities and proof

Candidate canonical requirement and UAT identities for activation are:

| Requirement | Independently complete UAT Arc |
| --- | --- |
| REQ-PONYTAIL-GLOSSARY | GLOSSARY: resolve the same canonical definitions from rules and skills, distinguish acceptance from its Arc, and verify source/generated parity. |
| REQ-OBLIGATION-IDENTITY | OBL-IDENTITY: retain identity through reassignment, moves and unchanged rebaselines; reject ID reuse. |
| REQ-OBLIGATION-DISCHARGE | OBL-DISCHARGE: assess adequate evidence, accept satisfaction, then invalidate evidence and reopen the same obligation. |
| REQ-OBLIGATION-ASSIGNMENT | OBL-ASSIGNMENT: deliver within an exact lease and reject unauthorized paths and unaccepted completion claims. |
| REQ-OBLIGATION-PRIORITY | OBL-PRIORITY: select the earliest category and stable eligible ID, preserving dependency/authority gates. |
| REQ-OBLIGATION-TRANSITIONS | OBL-TRANSITIONS: prove downstream growth, neutral bounds, honest disturbance and rejection of false productive claims. |
| REQ-OBLIGATION-COMPLETENESS | OBL-COMPLETENESS: prevent false zero from incomplete discovery and preserve new obligations or invalidated inventory evidence. |
| REQ-OBLIGATION-BASELINE | OBL-BASELINE: reject unauthorized meaning changes and retain the predecessor after approved activated amendment. |
| REQ-OBLIGATION-FRESHNESS | OBL-FRESHNESS: reuse unchanged relevant input evidence and reject stale, failing, skipped or wrong-target proof. |
| REQ-OBLIGATION-COMPATIBILITY | OBL-COMPATIBILITY: read historical formats faithfully and reject conversion of tasklet DONE into certified acceptance. |
| REQ-REPAIR-PLAN-STARTING-GATE | REPAIR-START: admit exact approved existing repair failures and reject unrelated/introduced failures. |

These are proposals in this design, not declarations in the active requirements
web or completed traceability relationships. Every Arc must prove its entire
atomic requirement. Detailed Steps and executable selection belong to the
activation/implementation owner; no empty future Arc counts as coverage.

At implementation activation, derive atomic canonical requirements for stable
identity, evidence-based discharge/reopening, bounded assignment authority,
deterministic priority, truthful transitions, completeness, controlled baseline
change, evidence freshness, and historical compatibility. Each needs an independently
complete UAT Arc; do not group these as fragments of one composite requirement.
Record approved CHNGs against existing policy where their meanings change.

S01 focused checks cover policy consistency, unchanged authority boundaries and
source/generated parity. S02 proves exact readers, malformed/version rejection,
vector derivation and every transition example; tests assess asserted candidate
certificates without claiming machine semantic understanding. S03 proves real CLI
and coordinated acceptance paths and legacy behavior. S04 reuses unchanged focused
evidence, adds the distinct combined pilot, and runs final repository acceptance.

No additional full-suite run is required at every checkpoint. Preserve all final
gates; skips and human/host limitations remain unresolved rather than passes.
