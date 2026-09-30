<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Explicit concurrent campaign selection

- **Plan ID:** `2026-09-30-explicit-concurrent-campaign-selection`
- **Status:** `closed`
- **Epic:**
  [`2026-09-30-FEAT-explicit_concurrent_campaign_selection`](../../../bugs/closed/2026-09-30-FEAT-explicit_concurrent_campaign_selection.md)
- **Approval:** The stakeholder approved the requirement and explicitly
  authorized implementation on 2026-09-30.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{
  "schemaVersion": 2,
  "id": "2026-09-30-explicit-concurrent-campaign-selection",
  "parent_plan_id": null,
  "depends_on": []
}
-->

## Objective

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-09-30-explicit-concurrent-campaign-selection
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-09-30-explicit-concurrent-campaign-selection

Permit several active campaigns in one top-level worktree while requiring
explicit selection for single-campaign commands and preserving deterministic,
serialized integration through one coordinator session.

## Scope

- Reconcile the approved campaign requirement, architecture, UAT, CLI policy,
  and traceability.
- Make repository inventory validity independent of active-campaign count.
- Add deterministic campaign listing by normalized lifecycle status and
  campaign-root activation from any member-plan name.
- Select and authorize orchestration by explicit campaign.
- Allow one session to coordinate several campaigns while rejecting a second
  session for the same top-level worktree.
- Serialize campaign advancement across the shared integration worktree.
- Add focused regression and final acceptance evidence.

## Exclusions

- Multiple independent coordinator sessions in one top-level worktree.
- New worker, ledger, campaign membership, or plan metadata representations.
- Cross-worktree locks or effects.
- Deployment, publication, or external state changes.

## Architecture

The existing campaign census remains the repository-wide classifier. Multiple
active roots become valid inventory. Commands needing one campaign resolve an
explicit argument or infer the sole active root; ambiguity is an invocation
error, not invalid repository data. Coordinator bindings remain exclusive by
top-level worktree session but may contain several campaign bindings for that
session. A worktree-scoped advance lock serializes all campaign-scoped ledger
mutations that can change the shared integration branch.

## Plan-wide acceptance

- The linked feature issue and approved requirement describe the same command
  contract and lifecycle state.
- Repository-wide inventory accepts and reports multiple active campaigns.
- Campaign listing defaults to active roots and filters pending, closed,
  deferred, rejected, or explicitly active roots.
- Activation recursively resolves the root from any member, moves a pending
  root to active work, synchronizes canonical lifecycle prose and Markdown
  links, and is idempotent for an already active campaign.
- Explicit command selection reaches either campaign; implicit selection
  reports all candidates and performs no mutation.
- Coordinator and action-result routing cannot cross campaign boundaries.
- Cross-campaign advancement is serialized without introducing coordination
  effects between independent sessions.
- Focused tests, build-impact-selected builds, full unit acceptance,
  traceability, rule-copy, version, generated-adapter, registry, manifest,
  campaign, structure, and diff checks pass on the final tree.

## Sprints

1. [S01](sprints/S01.md): reconcile, implement, and verify explicit concurrent
   campaign selection — DONE.

## Questions and approval gates

- [RESOLVED] Multiple active campaigns are valid when the command explicitly
  selects one; commands requiring one campaign do not guess when omitted.
- [RESOLVED] Repository-wide report and validation inspect all campaigns and
  do not fail solely because more than one is active.
- [RESOLVED] Preserve one coordinator session per top-level worktree; that
  session may bind multiple campaigns. This avoids an unapproved cross-session
  availability effect.
- [RESOLVED] `campaign action-result` will take an explicit campaign before the
  action ID so recovery remains deterministic with several active campaigns.
- [RESOLVED] The implementation plan is justified because census validity,
  lifecycle mutation, CLI grammar, hook authorization, durable coordinator
  state, shared Git integration, policy, UAT, and traceability must change
  together.
- [RESOLVED] Campaign status is normalized as `active` when any member is in
  active work; otherwise it follows the root lifecycle role as `pending`,
  `closed`, `deferred`, or `rejected`. Activation is the idempotent transition
  from pending to active and rejects other source states.
- [RESOLVED] The clean starting revision `4bdf4b35e2969b932d982c7d2c85ed4898836e81`
  passed `npm test` after rebuilding stale ignored TSTS output; rule-copy,
  version, traceability, and repository-wide campaign validation also passed.

## Starting checkpoint

On 2026-09-30, `npm test` passed 428 core tests, the Codex installer checks,
23 Pi tests, 4 MCP tests, 80 TSTS tests, and the 506-file TSTS structure check.
Traceability checked 70 relationships; rule-copy, version, and repository-wide
campaign validation passed. The first test attempt exposed only stale ignored
`tsts/dist` output and passed after the configured `npm run build:tsts` repair.

## Final validation record

On 2026-09-30, focused lifecycle, orchestration, hook, CLI, and policy tests
passed 62 tests. Build-impact returned `ok` with no affected or indeterminate
targets for every changed QA-relevant input, so no build ran. Final `npm test`
passed 432 core tests, installer checks, 23 Pi tests, 4 MCP tests, 80 TSTS
tests, and the 510-file structure check. Traceability checked 86 relationships;
repository-wide V3 campaign validation, rule-copy, all seven version files,
generated registry, command adapters, repeated manifests, generated skill
copies, and `git diff --check` passed.
