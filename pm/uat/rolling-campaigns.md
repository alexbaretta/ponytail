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

1. **Step CONFIG-PRECEDENCE:** Initialize campaigns with explicit, project and
   Git-default target selections; inspect persisted targets. Each uses the
   requested precedence, remains fixed after default changes, and rejects an
   invalid ref or nonpositive/unsafe N/M.
2. **Step CONFIG-POOL:** Configure absolute and anchored-relative pool paths.
   All registered checkouts resolve to the same physical directory. A mismatch
   is rejected. First managed allocation uses number 101.

## Arc ROLL-GRAPH: Reconcile dependency discovery

Traceability: verifies REQ-ROLLING-GRAPH

1. **Step GRAPH-AUTHORITY:** Give a worker an older graph and change coordinator
   files. Scheduling uses only the accepted coordinator snapshot; an allocation
   with its old digest is rejected.
2. **Step GRAPH-DISCOVERY:** Report an unknown dependency, reconcile its amendment
   and rerun scheduling. The new prerequisite gates the obligation. A cycle is
   diagnosed and cannot produce assignments; affected evidence is invalidated.
3. **Step GRAPH-TRACE:** Inspect assignment requirement, acceptance and specific
   test-Step references. All resolve to canonical files/selectors.

## Arc ROLL-SCHEDULE: Suspend and resume while filling capacity

Traceability: verifies REQ-ROLLING-SCHEDULING

1. **Step SCHEDULE-FILL:** Request more compatible obligations than N. Exactly
   available capacity is reserved; conflicting work is excluded deterministically.
2. **Step SCHEDULE-SUSPEND:** Suspend an acknowledged blocked worker; start other
   ready work. Its retained checkout cannot be reused. Silence does not release
   capacity or ownership.
3. **Step SCHEDULE-RESUME:** Resolve the blocker and free capacity. Resume its
   original session before creating a new worker.
4. **Step SCHEDULE-RELEASE:** Release a retired assignment when nothing is ready.
   Release succeeds and reports no ready obligation.

## Arc ROLL-STATE: Recover ownership and external actions

Traceability: verifies REQ-ROLLING-STATE

1. **Step STATE-CONTENTION:** Race allocation in real PostgreSQL transactions.
   Capacity and exclusive ownership hold; the lowest available number is chosen.
2. **Step STATE-RECOVERY:** Interrupt after a recorded external-action intent.
   Restart coordination, reconcile its actual result, and continue without a
   duplicate worker or publication. Old lease events cannot affect a successor.
3. **Step STATE-ACTIONS:** Inspect next-actions from durable state. Each action
   includes exact assignment/session identities and executable prerequisites.

## Arc ROLL-WORKER: Execute in a Ponytail-owned checkout

Traceability: verifies REQ-ROLLING-WORKERS

1. **Step WORKER-START:** Prepare an ordinary Git checkout and start a fresh
   native Codex thread with its exact cwd, without a Ponytail plugin. Verify
   returned session identity, loaded project instructions, marker and ignore.
2. **Step WORKER-REUSE:** Retire its completed assignment, prove writes/processes
   ceased, then allocate the lowest available checkout to a new session. Reuse
   cannot precede retirement; valid caches remain.
3. **Step WORKER-RESUME:** Resume a suspended native session in its original
   checkout. Desktop visibility is recorded separately from execution support.

## Arc ROLL-REVIEW: Iterate and integrate exact candidates

Traceability: verifies REQ-ROLLING-REVIEW

1. **Step REVIEW-CORRECTION:** Reject a candidate, return corrections, and submit
   a newly semantically rebased revision. The original reviewer assesses it.
2. **Step REVIEW-REBASE:** Advance the campaign base with clean and conflicting
   edits. Full worker rebase inspects every commit; coordinator fast rebase
   applies the declared textual-conflict semantic-review exception.
3. **Step REVIEW-PUSH:** Integrate after applicable proof. Reconcile rejected or
   uncertain pushes by actual remote state, never force or assumed success.

## Arc ROLL-PUBLISH: Publish tested batches

Traceability: verifies REQ-ROLLING-PUBLICATION

1. **Step PUBLISH-BATCH:** Set M=2; integrate one focused-QA increment, then a
   second. Campaign results are visible immediately; mainline changes only after
   full QA passes for their reconciled publication candidate.
2. **Step PUBLISH-FAILURE:** Fail a required full QA workflow. Mainline remains
   unchanged; repair, rerun and publish. Move upstream and demonstrate evidence
   refresh on changed candidate inputs.
3. **Step PUBLISH-FLUSH:** Publish a final partial batch and flush quiescent work.
   Default M=1 publishes each increment. No daily deadline gates execution.

## Arc ROLL-INTERFACE: Coordinate through either transport

Traceability: verifies REQ-ROLLING-INTERFACES

1. **Step INTERFACE-HELP:** Request root, campaign and command help. Each lists
   its scope and arguments/behavior without requiring knowledge of old commands.
2. **Step INTERFACE-PARITY:** Execute equivalent CLI and MCP coordination actions.
   Results and fencing agree because both invoke the same operation layer.
3. **Step INTERFACE-LEGACY:** Inspect an old campaign. It is not dispatched or
   silently migrated by the replacement scheduler.
