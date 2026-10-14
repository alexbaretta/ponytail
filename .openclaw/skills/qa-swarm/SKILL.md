---
name: qa-swarm
description: "Parallel whole-slice QA with incremental repairs and atomic acceptance"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# QA Swarm
Use Ponytail's configured rolling campaign as the scheduler, worker/session
owner, dependency graph and final certificate authority. This skill specializes
that technology for broad QA execution; it does not create another scheduler,
assignment ledger, campaign command or acceptance vocabulary.

Apply this skill only when the stakeholder has authorized a broad QA run and
the invoking project configures rolling campaign operations. Ordinary tasklet,
feature or standalone-change validation continues to use `plan-execution`.

## Host contract

Read the invoking project's instructions and configuration for:

- named unit-test families and their full and focused command forms;
- the integration Suite/Arc inventory and multi-selection command;
- per-runner concurrency controls and safe worker count;
- build, static, packaging and final-acceptance commands;
- a coordinator-owned reviewed Git-integration path that can land a repair
  commit while its rolling assignment remains active;
- exclusive resources used by selections, including databases, ports,
  applications, devices, accounts, providers and persistent environments; and
- rolling campaign configuration and its coordinator-owned obligation files.

Do not invent commands, selectors, concurrency flags, execution profiles or
resource-isolation claims. If a family cannot execute several explicit
selections through one aggregate invocation, repair that project-configuration
or harness discrepancy before using a one-test-at-a-time loop as a substitute.
If no nonterminal reviewed Git-integration path is configured, this workflow
cannot land incremental repairs; configure that host prerequisite before
starting the swarm rather than misusing terminal rolling operations.

Campaign worker capacity and a test runner's internal parallelism are different
controls. Keep both bounded by the host configuration. A default such as four
runner processes is appropriate only when the invoking project selects it.

## Slice contract

The coordinator freezes one initial QA baseline and derives an exhaustive test
inventory from the configured commands. Partition it into stable slices by
runner, environment and exclusive-resource compatibility. Balance estimated
runtime rather than raw test count.

Represent each slice as one configured `gate` acceptance rollup, not an atomic
delivery obligation and not a unit of completed implementation work. Its
condition is that every declared selection passes in one aggregate slice run on
one exact reconciled Git revision and configured target identity. Its discharge
criterion requires:

- the exact command and complete ordered `selection` from the frozen execution
  binding;
- the tested revision, base, dirty state, dependencies, profile and target;
- aggregate counts, failures, skips and finalization, with runner output that
  accounts for every explicit selector;
- retained output or an immutable output reference; and
- no failure, unapproved skip, missing selection or stale relevant input.

The binding names the slice's complete ordered selectors, permitted operations
and exclusive resources. The exact aggregate command carries any configured
concurrency flag or environment setting; do not invent an extra evidence field.
Every required test belongs to exactly one slice unless an explicit acceptance
contract requires an overlap. Do not count the rollup as an atomic delivery
obligation or turn each passing observation into a separate submission.

Use only a runner whose explicit multi-selection form fails when it cannot
resolve or execute an assigned selector. The adversarial reviewer compares the
retained output with the frozen `selection`; aggregate counts alone do not prove
inventory completeness.

A sharded run replaces a configured full-suite command only when the host
explicitly declares the exhaustive slice union semantically equivalent,
including global setup, teardown and aggregation. Otherwise the configured
full-suite command remains a separate final gate.

## Coordinator procedure

1. Reconcile the authoritative obligation document and execution bindings,
   then initialize or resume the rolling campaign.
2. Use `status`, `next-actions` and `replenish` to allocate compatible slice
   gates. Do not reconstruct their scheduling policy in conversation.
3. Keep the slice worker and checkout assigned until the complete slice is
   green or a genuine blocker requires suspension. A passing subset does not
   release the worker.
4. Observe repair progress in the original active worker turn while the slice
   remains open. This is an ordinary progress message, not a durable rolling
   operation: do not call `collect-submission`, `request-review`, `integrate` or
   `accept` for it. Review and integrate each causal repair through the project's
   configured reviewed Git-integration path. The message does not mutate rolling
   assignment state and cannot create or update a slice certificate.
5. Notify workers whose relevant inputs changed. Let unaffected work continue;
   invalidate only proof whose dependency closure intersects the repair. When
   that closure is unknown, require a fresh complete slice run before acceptance.
6. Call `collect-submission` only after the worker reports a fresh complete green
   slice and stops the original turn. Apply `request-review`, `integrate` and
   bound-certificate `accept` to that one terminal result.
7. Close or publish the campaign only after every slice gate and every
   additional configured final gate is satisfied on compatible final inputs.

Do not commit, review, rebase or publish one evidence record per passing test.
The coordinator may retain transient progress outside the accepted obligation
document, but only the final complete slice result is acceptance evidence.

## Worker execution

Start from the exact frozen assignment and current campaign revision. Run the
entire assigned slice through one aggregate command with the configured internal
parallelism. Let every independent selected unit reach a terminal result. Within
an integration Arc, stop ordinary Steps after its first failure and run required
finalization; continue every remaining selected Arc before reporting the
aggregate outcome.

If the slice is green, synchronize with the latest integrated repair revision and
run the complete slice once more whenever relevant inputs changed. Submit only
the resulting complete revision-bound evidence packet.

If the slice fails:

1. Retain the complete aggregate result and cluster failures by causal
   mechanism.
2. Apply `debugging` to one causal class. Establish the owning layer and add or
   identify its smallest durable regression proof.
3. Implement one cohesive repair within authorized scope. Run the failing
   selections and affected focused proof; do not rerun passing selections whose
   relevant inputs are unchanged merely to prepare the repair.
4. Commit the repair and report progress in the still-active worker turn,
   containing the slice and failure identities, commit and base revisions,
   changed paths, diagnosis, focused commands and outcomes, relevant-input
   impact, and the remaining slice state.
5. Do not stop the worker turn or emit a terminal rolling submission, slice
   acceptance packet, DONE transition or discharge certificate for the repair.
   Continue only on a tree whose relationship to the coordinator's integrated
   repair line is explicit.
6. After integration, reconcile at a safe boundary, rerun affected failed
   selections, and continue the rest of the assigned slice. Repeat for each
   independently confirmed causal class.

Do not restart a slice merely because one selection failed. Do not repeatedly
run only one Arc and submit its passing receipt. The assignment ends when its
entire declared selection is green on one exact current revision.

## Atomic acceptance packet

Create exactly one terminal submission for a slice attempt that can satisfy the
gate. Use the existing obligation-evidence schema exactly: command, selection,
target, revision, dirty state, start and completion timestamps, outcome, skips,
failures, inputs, output path and finalization. The exact command records the
configured concurrency. The retained output must account for every frozen
selector; do not add unrecognized packet keys.

Commit the canonical evidence with the final candidate only after the complete
slice passes. The coordinator creates and accepts the bound certificate only
after terminal collection, review and integration. It must reject a packet
assembled from different revisions, patched from several partial runs, missing
assigned selections, or produced before the latest relevant repair. A later
relevant change invalidates the packet honestly and requires another complete
slice run; it does not permit editing the old result into success.

## Shared resources and failures

Parallelize slices only when their exclusive-resource declarations are
compatible. Serialize the conflicting resource, not unrelated tests. A shared
development database, provider sandbox, native application, fixed port or
machine capacity is a test-isolation and scheduling concern, not by itself a
product cross-session effect.

When infrastructure failure makes later outcomes indeterminate, preserve the
result, repair or restore the owning harness boundary, and rerun the affected
selection. Never record infrastructure failure as a product failure or convert
an unexecuted selection into a skip. Continue independent compatible slices
while the blocked path is repaired.
