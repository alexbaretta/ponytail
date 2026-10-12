<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign acceptance Suite

[UAT index](index.md) | [Requirements](../requirements/rolling-campaigns.md)

Actor: coordinator and independent workers. Prerequisites: isolated project
fixtures, configured PostgreSQL roles, direct Codex session capability and no
live campaign ownership. Expected outcomes below are required; automation and
runtime evidence are pending implementation, not claimed passing.

## Arc ROLL-CONFIG: Resolve and retain configuration

Traceability: verifies REQ-ROLLING-CONFIGURATION

1. **Step CONFIG-PRECEDENCE:** Acceptance contribution to [OBL-22](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-22), [OBL-23](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-23), [OBL-24](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-24). Initialize campaigns with explicit, project and
   Git-default target selections; inspect persisted targets. Each uses the
   requested precedence, remains fixed after default changes, and rejects an
   invalid ref or nonpositive/unsafe N/M.
2. **Step CONFIG-POOL:** Acceptance contribution to [OBL-36](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37). Configure absolute and anchored-relative pool paths.
   All registered checkouts resolve to the same physical directory. A mismatch
   is rejected. First managed allocation uses number 101.

## Arc ROLL-GRAPH: Reconcile dependency discovery

Traceability: verifies REQ-ROLLING-GRAPH

1. **Step GRAPH-AUTHORITY:** Acceptance contribution to [OBL-25](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-25). Give a worker an older graph and change coordinator
   files. Scheduling uses only the accepted coordinator snapshot; an allocation
   with its old digest is rejected.
2. **Step GRAPH-DISCOVERY:** Acceptance contribution to [OBL-26](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-26), [OBL-35](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35). Report an unknown dependency, reconcile its amendment
   and rerun scheduling. The new prerequisite gates the obligation. A cycle is
   diagnosed and cannot produce assignments; affected evidence is invalidated.
3. **Step GRAPH-TRACE:** Acceptance contribution to [OBL-27](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-27), [OBL-45](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-45). Inspect assignment requirement, acceptance and specific
   test-Step references. All resolve to canonical files/selectors.

## Arc ROLL-SCHEDULE: Suspend and resume while filling capacity

Traceability: verifies REQ-ROLLING-SCHEDULING

1. **Step SCHEDULE-FILL:** Acceptance contribution to [OBL-28](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-28), [OBL-30](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-30). Request more compatible obligations than N. Exactly
   available capacity is reserved; conflicting work is excluded deterministically.
2. **Step SCHEDULE-SUSPEND:** Acceptance contribution to [OBL-46](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46). Suspend an acknowledged blocked worker; start other
   ready work. Its retained checkout cannot be reused. Silence does not release
   capacity or ownership.
3. **Step SCHEDULE-RESUME:** Acceptance contribution to [OBL-29](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-29). Resolve the blocker and free capacity. Resume its
   original session before creating a new worker.
4. **Step SCHEDULE-RELEASE:** Acceptance contribution to [OBL-34](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34). Release a retired assignment when nothing is ready.
   Release succeeds and reports no ready obligation.

## Arc ROLL-STATE: Recover ownership and external actions

Traceability: verifies REQ-ROLLING-STATE

1. **Step STATE-CONTENTION:** Acceptance contribution to [OBL-31](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31). Race allocation in real PostgreSQL transactions.
   Capacity and exclusive ownership hold; the lowest available number is chosen.
2. **Step STATE-RECOVERY:** Acceptance contribution to [OBL-32](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-32), [OBL-33](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-33), [OBL-43](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-43), [OBL-48](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48). Interrupt after a recorded external-action intent.
   Restart coordination, reconcile its actual result, and continue without a
   duplicate worker or publication. Old lease events cannot affect a successor.
3. **Step STATE-ACTIONS:** Acceptance contribution to [OBL-63](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64). Inspect next-actions from durable state. Each action
   includes exact assignment/session identities and executable prerequisites.

## Arc ROLL-WORKER: Execute in a Ponytail-owned checkout

Traceability: verifies REQ-ROLLING-WORKERS

1. **Step WORKER-START:** Acceptance contribution to [OBL-38](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-38), [OBL-40](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-40), [OBL-41](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-41), [OBL-44](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44). Prepare an ordinary Git checkout and start a fresh
   native Codex thread with its exact cwd, without a Ponytail plugin. Verify
   returned session identity, loaded project instructions, marker and ignore.
2. **Step WORKER-REUSE:** Acceptance contribution to [OBL-39](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-39), [OBL-42](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-42), [OBL-57](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57). Retire its completed assignment, prove writes/processes
   ceased, then allocate the lowest available checkout to a new session. Reuse
   cannot precede retirement; valid caches remain.
3. **Step WORKER-RESUME:** Acceptance contribution to [OBL-47](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47). Resume a suspended native session in its original
   checkout. Desktop visibility is recorded separately from execution support.

## Arc ROLL-REVIEW: Iterate and integrate exact candidates

Traceability: verifies REQ-ROLLING-REVIEW

1. **Step REVIEW-CORRECTION:** Acceptance contribution to [OBL-50](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-50), [OBL-51](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-51), [OBL-52](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-52). Reject a candidate, return corrections, and submit
   a newly semantically rebased revision. The original reviewer assesses it.
   For OBL-52, establish reviewer loss, record its reference and replacement,
   reject late activity on the replaced request, and obtain a fresh exact-candidate
   review from the replacement. Verify both the replacement record and immutable
   prior requests/verdicts after restart; a timeout alone does not establish loss.
2. **Step REVIEW-REBASE:** Acceptance contribution to [OBL-49](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-49), [OBL-53](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-53). Advance the campaign base with clean and conflicting
   edits. Full worker rebase inspects every commit; coordinator fast rebase
   applies the declared textual-conflict semantic-review exception.
3. **Step REVIEW-PUSH:** Acceptance contribution to [OBL-54](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-56](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Integrate after applicable proof. Reconcile rejected or
   uncertain pushes by actual remote state, never force or assumed success.

## Arc ROLL-PUBLISH: Publish tested batches

Traceability: verifies REQ-ROLLING-PUBLICATION

1. **Step PUBLISH-BATCH:** Acceptance contribution to [OBL-58](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-60](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-60). Set M=2; integrate one focused-QA increment, then a
   second. Campaign results are visible immediately; mainline changes only after
   full QA passes for their reconciled publication candidate.
2. **Step PUBLISH-FAILURE:** Acceptance contribution to [OBL-61](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-61), [OBL-62](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62). Fail a required full QA workflow. Mainline remains
   unchanged; repair, rerun and publish. Move upstream and demonstrate evidence
   refresh on changed candidate inputs.
3. **Step PUBLISH-FLUSH:** Acceptance contribution to [OBL-59](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-59). Publish a final partial batch and flush quiescent work.
   Default M=1 publishes each increment. No daily deadline gates execution.

## Arc ROLL-INTERFACE: Coordinate through either transport

Traceability: verifies REQ-ROLLING-INTERFACES

1. **Step INTERFACE-HELP:** Acceptance contribution to [OBL-66](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-66). Request root, campaign and command help. Each lists
   its scope and arguments/behavior without requiring knowledge of old commands.
2. **Step INTERFACE-PARITY:** Acceptance contribution to [OBL-65](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-65), [OBL-68](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-68). Execute equivalent CLI and MCP coordination actions.
   Results and fencing agree because both invoke the same operation layer.
   The OBL-65 contribution initializes and reconciles a disposable campaign
   through the real CLI entrypoint and compares its results with the typed
   application operations. Confirm mainline/default resolution, idempotent
   registration and preservation of unreviewed local work. The additional OBL-68
   contribution compares these same fenced operations through MCP.
3. **Step INTERFACE-LEGACY:** Acceptance contribution to [OBL-67](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-67). Inspect an old campaign. It is not dispatched or
   silently migrated by the replacement scheduler.

## Arc ROLL-CLOSE: Close only verified campaign scope

Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-INTERFACES

1. **Step CAMPAIGN-CLOSE:** Acceptance contribution to
   [OBL-69](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69).
   Request closure with an unresolved delivery obligation or stale final gate.
   Closure is refused. Establish all required fresh evidence and request closure
   again; closure succeeds without erasing historical identities or disturbances.

Every Step above identifies its contribution to atomic obligations. The existing
observations are minimum demonstrations: evaluate each referenced canonical
criterion in full, adding its necessary assertions before declaring discharge.
Several Steps may contribute jointly; one passing contribution is not whole
obligation or requirement acceptance. All runtime acceptance remains pending
until adequate execution evidence is recorded.

### Acceptance ROLL-BINDING-AMENDMENT

Traceability: verifies REQ-ROLLING-GRAPH

Demonstrates [OBL-107](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-107) through Step ROLL-BINDING-API: exercise the typed amendment boundary and observe its entire canonical criterion, including preserved identities/history and rejected invalid revisions. Selector, live lease and acceptance integration still require their application Arcs.

### Acceptance ROLL-BINDING-SELECT

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-BINDING-QUERY demonstrates [OBL-108](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-108): query portable and rolling selection against an explicitly identified coordinator binding history, observe its complete declared criterion, then amend that history and reject the obsolete graph identity. Live lease and candidate acceptance integration remain required.

### Acceptance ROLL-FROZEN-LEASE

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-LEASE-CONTRACT demonstrates [OBL-109](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-109): issue an authorized portable frozen lease, amend coordinator bindings, and verify that the original lease retains its earlier permissions and rejects wrong generations, graph identities and out-of-scope changes. Live database and worker integration remain required.

### Acceptance ROLL-STORED-LEASE

Traceability: verifies REQ-ROLLING-GRAPH
Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-SCHEDULING

Step ROLL-STORE-REVISION demonstrates [OBL-110](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-110): allocate against explicit coordinator binding history, amend it, reject old permissions, acknowledge cessation, adopt the new revision and resume the original session with a new generation. V1 records retain their meanings. Worker delivery and candidate acceptance still require application integration.

### Acceptance ROLL-SUBMISSION

Traceability: verifies REQ-ROLLING-GRAPH
Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-WORKERS

Step ROLL-WORKER-SUBMIT demonstrates [OBL-111](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-111): submit an actual isolated Git candidate from its stopped retained owner, reject foreign changes and stale evidence, persist it atomically in PostgreSQL and replay the exact submission without duplicate review records. Submission alone leaves obligation acceptance unresolved.

### Acceptance ROLL-BOUND-ACCEPTANCE

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-ACCEPT-BINDING demonstrates [OBL-112](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-112): read an actual retained PostgreSQL submission, reconcile its Git candidate in a disposable coordinator checkout, and accept only fresh proof for its frozen current binding. Reject stale or forged references, changed inputs and unmet current prerequisites while preserving legacy V1 meanings.
