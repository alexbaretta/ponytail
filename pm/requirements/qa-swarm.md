<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# QA swarm execution

**Identifier:** `REQ-QA-SWARM`

**Approval:** Approved by the stakeholder's explicit implementation request on
2026-10-14.

**Source:** The stakeholder required a Ponytail-swarm QA process in which each
worker owns a slice of the QA suite, runs that whole slice to completion,
submits causal bugfixes incrementally, and submits acceptance evidence atomically
only after the complete slice is green.

Ponytail must provide a reusable QA-swarm skill that specializes configured
rolling campaign operations without creating a second scheduler or ledger.

## Atomic obligations

### QA-SWARM-001: Complete slice execution

Each worker receives one finite, explicit QA gate rollup whose selectors,
runner/profile, concurrency and exclusive resources are known. A slice is not an
atomic delivery obligation and does not increase completed-work counts. The
worker runs the slice through an aggregate command, lets every independent
selection reach a terminal outcome, and retains complete failures rather than
submitting one passing test at a time.

Discharge requires the exported canonical skill, its registered generated copy,
and executable policy proof to agree on that complete-slice procedure.

### QA-SWARM-002: Incremental causal repair

A failing slice remains assigned while independently confirmed causal bugfixes
are committed, reviewed and integrated incrementally. A repair progress message
in the active worker turn contains its exact revisions, diagnosis, paths and
focused proof but does not use the rolling terminal collection/review/acceptance
operations and cannot satisfy the slice. The invoking project must configure a
separate reviewed Git-integration path capable of landing that repair while the
assignment remains active. Relevant integrated repairs invalidate only affected
proof; unrelated compatible work continues.

Discharge requires the exported procedure and executable policy proof to keep
repair integration distinct from slice acceptance.

### QA-SWARM-003: Atomic green-slice acceptance

The worker submits one schema-valid terminal proposal only after every declared
selection is green on one exact reconciled revision with no missing result or
unapproved skip. Its exact command carries configured concurrency, its frozen
selection is the complete selector inventory, and retained output accounts for
every selector. The coordinator accepts that proposal atomically after ordinary
review. It must reject partial, mixed-revision, stale or incrementally patched
evidence.

Discharge requires the canonical and generated skills, registered distribution,
and executable integration proof to preserve that boundary.

Acceptance: [QA swarm Suite](../uat/qa-swarm.md).

[Requirements index](index.md) | [Rolling campaigns](rolling-campaigns.md)
