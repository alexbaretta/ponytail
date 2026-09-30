<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-30-FEAT-explicit_concurrent_campaign_selection: Select among concurrent active campaigns explicitly

## Status

closed

## Type, source, and authorization

- **Type:** FEAT
- **Canonical issue ID:**
  `2026-09-30-FEAT-explicit_concurrent_campaign_selection`
- **Source:** Stakeholder proposal and explicit approval on 2026-09-30.
- **Approval state:** Approved.
- **Authorization:** The stakeholder explicitly authorized documentation,
  planning when justified, implementation, testing, and PM reconciliation.
- **Intended owner:** Ponytail campaign census, coordination, and orchestration.

## Objective

Allow one top-level worktree to contain multiple active campaigns. Commands
that require one campaign must accept an explicit campaign and must not choose
among multiple active campaigns when their argument is omitted. Repository-wide
inventory and validation remain available without selecting one campaign.

## Intended behavior

- Multiple active campaigns are valid repository inventory state.
- Explicit campaign validation, reporting, status, advancement, coordination,
  release, and action-result recording operate on only that campaign.
- A no-input command that requires one campaign fails with every active
  candidate when more than one exists.
- Repository-wide report and `validate --all` continue to inspect all campaigns
  and do not fail merely because several campaigns are active.
- `campaign list` lists active campaigns. `--pending`, `--closed`, and the
  corresponding `--active`, `--deferred`, and `--rejected` filters list the
  requested normalized campaign status.
- `campaign activate <plan-name>` follows the selected plan's parent chain to
  its campaign root and moves a pending campaign into active work while
  preserving affected Markdown links and manifest lifecycle text.
- One coordinator session may bind several campaigns in one top-level worktree;
  a different session may not concurrently coordinate that worktree.
- Cross-campaign advancement is serialized at the top-level-worktree boundary
  so campaign-scoped ledgers cannot race on the shared integration branch.
- Campaign selection remains implicit only when exactly one active campaign is
  available, or when an authenticated worker or token uniquely supplies it.

## Scope

- Campaign census inventory validity and diagnostics.
- Campaign orchestration command grammar and selection.
- Campaign lifecycle listing and activation.
- Coordinator binding and composer-enqueue ambiguity.
- Cross-campaign advancement serialization.
- CLI, policy, architecture, UAT, traceability, and generated policy copies.

## Exclusions

- Concurrent coordinators from independent sessions in one top-level worktree.
- Cross-worktree coordination or locking.
- Non-fast-forward integration or automatic conflict resolution.
- Changes to campaign membership, dependency, sprint, or tasklet schemas.

## Acceptance criteria

1. Repository-wide report and validation succeed for two otherwise valid active
   campaigns and report both.
2. Explicit status and advance select either active campaign independently.
3. Omitted status or advance rejects ambiguity and lists every candidate.
4. One session can coordinate both campaigns, while a different session is
   rejected for either campaign until the worktree coordinator releases all
   bindings.
5. Composer enqueue rejects a multiply bound session instead of choosing a
   campaign; plan-specific enqueue remains available.
6. Action-result recording names its campaign explicitly and cannot update a
   different campaign ledger.
7. Advancement mutations for different campaigns use one worktree-scoped
   critical section.
8. Focused and full configured acceptance gates pass.
9. Campaign listing deterministically filters normalized active, pending,
   closed, deferred, and rejected states.
10. Activation accepts any campaign member, resolves the root recursively,
    performs an idempotent pending-to-active lifecycle transition, and leaves
    the selected campaign valid.

## Requirements and implementation activation

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-FEAT-explicit_concurrent_campaign_selection

This approved feature clarifies
[`REQ-CAMPAIGN-ORCHESTRATION`](../../requirements/campaign-orchestration.md).
Implementation is authorized and active. Requirements, UAT, and architecture
are reconciled in the linked plan change-set before product implementation.

## Plan

[Explicit concurrent campaign selection](../../plans/closed/2026-09-30-explicit-concurrent-campaign-selection/plan.md).

## Evidence and resolution

Implemented by the linked plan. Focused campaign lifecycle, orchestration,
hook, CLI, and policy tests passed 62 tests. Final `npm test` passed 432 core
tests, installer checks, 23 Pi tests, 4 MCP tests, 80 TSTS tests, and the
510-file structure check. Traceability checked 86 relationships; build impact
reported no affected or indeterminate targets, and campaign, rule-copy,
version, generated-source, registry, manifest, and diff checks passed.
