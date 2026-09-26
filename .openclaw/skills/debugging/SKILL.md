---
name: debugging
description: "Differential diagnosis and root-cause hypothesis testing"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Debugging

Establish the causal mechanism before changing behavior. A symptom, correlated
log, plausible explanation, or unfalsified hypothesis is not a confirmed root
cause.

## Failure Model And Evidence

Before exercising a costly workflow, map its relevant layers, ownership
boundaries, durable state, ephemeral state, and expected failure boundaries.
Account for known restart, retry, cleanup, credential, resource-contention, and
partial-completion cases before testing rather than turning each observed case
into newly discovered scope.

Capture one bounded failure dossier that is sufficient for later diagnosis
without immediately reproducing the entire workflow. When applicable, include:

- the exact selection, failed boundary, observed and expected behavior;
- inputs, versions, configuration, environment, random seed, and artifact
  identity;
- request, operation, transaction, job, message, or trace identities;
- state transitions and ownership on both sides of each relevant boundary;
- the causal error and bounded logs, traces, responses, and dependency events;
- retained-state and process-cleanup results.

Automate this capture in the owning test or diagnostic harness when the same
manual probes would otherwise recur. Keep secrets and unrelated tenant or user
data out of the dossier.

## Investigation

1. State the observed and expected behavior, the smallest reliable
   reproduction, and the exact inputs, version, configuration, environment,
   and timing that distinguish the failure. Read the complete error and trace.
2. Classify the owning layer before editing. Distinguish the harness,
   environment, fixture or test data, product behavior, dependency, and test
   expectation when those categories apply. Do not change several layers to
   compensate for an unidentified owner.
3. Identify the components and boundaries crossed by the failing path. Trace
   the relevant value, state transition, or control flow backward to the first
   point where the failing and working paths diverge.
4. Build a differential diagnosis from plausible causes at those boundaries.
   Compare a working case with the failing case and list the material
   differences. Use recent changes as evidence, not as proof of causation.
5. Select one hypothesis that best explains the current evidence. State the
   mechanism and the observation that would distinguish it from the remaining
   alternatives.
6. Run the smallest discriminating probe. Prefer existing logs, retained
   state, focused queries, and narrow reproductions over another expensive
   suite run. Change one variable at a time. If the prediction fails, discard
   or revise the hypothesis before making another change.

Add temporary diagnostics only at the boundary needed to distinguish the
remaining hypotheses. Keep captured evidence bounded and secret-safe. Apply
`diagnostic-assertions` when diagnostic code could alter production control
flow.

## Root Cause And Repair

A root cause is confirmed when evidence identifies the owning mechanism and
rules out the material alternatives well enough that the proposed change has a
specific predicted effect. Record uncertainty explicitly when that standard is
not met; do not convert the leading hypothesis into a fix.

Create or identify the smallest durable regression proof for the causal
mechanism. Implement one root-cause correction without bundling speculative
repairs or unrelated cleanup. Re-run the focused reproduction first, then the
smallest applicable regression and integration selections. Reuse passing
evidence whose relevant inputs did not change.

When a repair crosses layers, prove why each changed layer participates in the
same causal mechanism. Do not alter product behavior merely to accommodate a
broken harness or fixture, and do not conceal a product defect in test support.

## Pattern Observations

After the causal mechanism is confirmed and the correction passes its smallest
durable regression proof, record one bug-pattern observation in the host
project's configured observation root. The default root is
`pm/debugging-pattern-observations/`. Read
[references/pattern-observations.md](references/pattern-observations.md) before
recording the observation.

One observation represents one independently occurring causal defect. Several
symptoms, affected files, failing selections, or users caused by that defect do
not create additional occurrences. A later independent defect caused by the
same implementation pattern is a separate observation. Do not create another
observation when the same causal incident already has one; link the existing
record from the bug, plan, or change instead.

Record the observed and expected behavior, confirmed causal mechanism,
implementation anti-pattern, proven correct pattern, applicability conditions,
known non-matches, source references, discriminating evidence, and regression
proof. Keep secrets and unrelated user or tenant data out of the record. Do not
record an unconfirmed hypothesis or a correction that has not passed its
regression proof.

Observations are source evidence for later analysis. Do not assign a proposed
category, increment a pattern count, or turn one observation into prescriptive
guidance during collection. A separate mining workflow may deduplicate and
cluster independent observations by causal mechanism and required invariant,
then propose a specialized skill only after the configured promotion threshold
is met and the category has been reviewed.

## Stateful And Resumable Workflows

Treat retained state as diagnostic evidence, not proof that a workflow can
resume safely. Every resumable unit needs an explicit restart contract that
identifies:

- the completed prefix and exact failed boundary;
- the durable attempt identity and completed substeps;
- the durable state that authorizes continuation;
- ephemeral dependencies that must be reconstructed;
- readiness and consistency preconditions checked before continuation;
- idempotency behavior for partially completed effects; and
- cleanup ownership for pass, failure, retry, cancellation, and abandonment.

Reuse deterministic operation, request, and idempotency identities within the
same attempt. Create new identities only for a deliberate new attempt. If the
checkpoint is incomplete, inconsistent, or owns a busy or poisoned resource,
fail immediately with the conflicting state and owner rather than starting the
unit again or layering another partial attempt onto it.

## Rerun Discipline

Before an expensive rerun, record the hypothesis it tests, the predicted new
observation, and the relevant inputs changed since the prior run. Resume from
the failed boundary when the harness can prove that the successful prefix and
its inputs remain valid. Do not restart a long workflow merely to rediscover
an unchanged failure.

Use expensive integration and end-to-end workflows to discover independent
failure classes or prove acceptance after focused repairs. Do not use them as
the primary interactive debugger when a retained artifact, state query,
component reproduction, or focused test can discriminate the hypotheses.

Establish correctness before measuring performance. Track semantic failures
and latency failures as separate gates so performance tuning cannot obscure an
invalid result or an unsafe restart.

When independent tests can run concurrently, let all of them reach a terminal
result. Cluster failures by causal mechanism, diagnose every reported cluster,
apply the confirmed fixes, run their focused proofs, and rerun the failed
selections together.

After three failed corrective attempts, or earlier when each attempt reveals
new shared state or coupling in a different component, stop local patching and
reassess the model, ownership boundary, or architecture before another fix.
Do not stack another speculative change on the previous attempts.

## Progress

Measure debugging progress through resolved causal classes, passing focused
reproductions, passing acceptance selections, and the count of distinct
remaining failures. Track latency separately when it is an acceptance result.
Commits, patches, diagnostic additions, and lifecycle records are supporting
artifacts; their quantity is not evidence that the failing behavior improved.

## Project Bindings

The host project supplies its reproduction commands, focused tests, retained
state, logs, traces, environment probes, acceptance gates, and any override of
the default bug-pattern observation root. This skill owns the diagnosis and
observation methods; `plan-execution` owns durable bug and plan lifecycle,
`ux-testing` owns proof through the real interactive path, and
`production-test-boundaries` owns the separation between product and test
mechanisms.
