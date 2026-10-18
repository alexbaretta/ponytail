<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# QA swarm execution


**Redesign supersession:** For explicitly adopted redesigned campaigns, the
[campaign-management contract](campaign-management.md) supersedes the
six-coordinate progress model, direct requirement-only test coverage, mandatory
unit-and-integration quotas, tracked passing-evidence ledgers and Ponytail swarm
session/queue orchestration described below. Historical records and readers
retain their original meanings. This notice does not claim adoption or completion.

**Identifier:** `REQ-QA-SWARM`

**Approval:** Approved by the stakeholder's explicit implementation request on
2026-10-14.

**Source:** The stakeholder required a Ponytail-swarm QA process in which each
worker owns a slice of the QA suite, runs that whole slice to completion,
submits causal bugfixes incrementally, and submits acceptance evidence atomically
only after the complete slice is green.

Ponytail must provide a reusable scheduler-neutral QA-swarm skill for configured
rolling campaigns and already-running host-managed swarms without creating or
requiring a second scheduler or ledger.

## Atomic obligations

### QA-SWARM-001: Complete slice execution

Each worker receives one finite, explicit QA gate rollup whose automatic,
manual, provider-dependent and hardware-dependent selectors, runner/profile,
actual concurrency and exclusive resources are known. A slice is not an
atomic delivery obligation and does not increase completed-work counts. The
worker runs the slice through an aggregate command, lets every independent
selection reach a terminal outcome, and retains complete failures rather than
submitting one passing test at a time.

Discharge requires the exported canonical skill, its registered generated copy,
and executable policy proof to agree on that complete-slice procedure.

### QA-SWARM-002: Incremental causal repair

A failing slice remains assigned while independently confirmed causal bugfixes
are committed, reviewed by worker-local read-only subagents and integrated
incrementally by the coordinator. A repair progress message
in the active worker turn contains its exact revisions, diagnosis, paths and
focused proof but does not use the rolling terminal collection/review/acceptance
operations and cannot satisfy the slice. The invoking project must configure a
separate Git-integration path capable of landing the locally reviewed repair
while the assignment remains active. Relevant integrated repairs invalidate
only affected proof; unrelated compatible work continues.

Discharge requires the exported procedure and executable policy proof to keep
repair integration distinct from slice acceptance.

### QA-SWARM-003: Atomic green-slice acceptance

The worker submits one schema-valid terminal proposal only after every declared
selection is green on one exact reconciled revision with no missing result or
unapproved skip and a local read-only reviewer subagent accepts that exact
candidate. Its exact command carries configured concurrency, its frozen
selection is the complete selector inventory, and retained output accounts for
every selector. The coordinator verifies and records the reviewer attestation,
then accepts that proposal atomically without repeating the review. It must
reject partial, mixed-revision, stale or incrementally patched
evidence.

Discharge requires the canonical and generated skills, registered distribution,
and executable integration proof to preserve that boundary.

### QA-SWARM-004: Existing-swarm adoption

An already-running host-managed swarm adopts the method at safe boundaries
without restarting active tests, Git operations, sessions or checkouts and
without first migrating to rolling campaigns. The coordinator publishes one
authoritative conversion record containing each unfinished lane's complete
selector count, execution-class aggregate commands and/or configured manual
procedures, actual concurrency, target/profile, exclusive resources and current
state. Adoption is established by that record plus at least one worker
acknowledgment or whole-slice start, not by reading the skill or announcing intent.

Discharge requires the exported procedure and executable policy proof to
preserve this scheduler-neutral transition.

Acceptance: [QA swarm Suite](../uat/qa-swarm.md).

[Requirements index](index.md) | [Rolling campaigns](rolling-campaigns.md)
