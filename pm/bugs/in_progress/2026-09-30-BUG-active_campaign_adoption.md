<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Adopt pre-existing active campaign plans

- ID: `2026-09-30-BUG-active_campaign_adoption`
- Type: BUG
- Status: in_progress
- Authority: stakeholder explicitly authorized canonical scheduler writes and
  scoped Ponytail repairs on 2026-09-30 and identified the requesting session
  as coordinator.

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-active_campaign_adoption
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-active_campaign_adoption
Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-09-30-BUG-active_campaign_adoption

## Confirmed cause and exact scope

An empty ledger over an already active campaign emits unassigned-plan
diagnostics, and ordinary advance rejects these before creating assignments.
There is no supported recovery command. Preserve that rejection for advance;
add explicit authenticated `campaign reconcile` to reserve those plans in the
existing V1 DISPATCH_PENDING representation. No reader schema changes, fake
host identity, lifecycle moves, completed-task claims, or ledger editing.

Reconciliation is idempotent and refuses every diagnostic except the specific
unassigned-plan conditions it repairs. Reserve all affected plans atomically
under the existing worktree and ledger locks. Null session, worktree, branch,
and worker revision mean queued work, not observed workers. Pending host actions
remain untouched. Advance dispatches a queued dependency-ready leaf through
the normal typed action and authenticated attach handshake; parents wait for
their unfinished children. Focused tests prove retries, uniqueness, null host
provenance, dependency waits, unauthorized rejection, and conflict rejection.

Requirements and acceptance: [campaign contract](../../requirements/campaign-orchestration.md)
and [canonical UAT](../../uat/campaign-orchestration.md). The recovery exception
is limited to correcting the named diagnostic, not a waiver of ordinary gates.
Missing authority and conflicting assignments are hard security/correctness
invariants; their failures prevent unsafe mutation and remain scoped to the
command. No cross-session restriction or new resource is introduced.

## Validation checkpoint

The pre-edit focused adoption regressions fail because the required recovery
operation is absent. After repair, all 51 orchestration, hook, and CLI focused
tests pass, including actual CLI routing. Build impact reports no affected or
indeterminate targets; syntax, rule-copy, and version checks pass. The full
core command initially fails under local PostgreSQL sandbox restrictions; its
discriminating reference-QA case passes with dependency access. The full
authorized retry remains separate final acceptance, not presumed passing.

[Confirmed recovery observation](../../debugging-pattern-observations/2026-09-30-active_campaign_recovery_deadlock.json).

Final core acceptance completed: 446 root Node tests, 23 extension tests,
four MCP tests, 80 TSTS tests, and the installer checks pass in the authorized
retry. The final TSTS directory gate initially rejects this new untracked
issue; after selective staging, its canonical rerun checks 532 files with no
violations. Traceability generation and validation pass with 136 relationships.
Complete full-command output remains in ignored `tmp/campaign-adoption-core.log`.
No changed product input followed that test run. Real GWEN dispatch remains
unverified until the installed host package contains and executes the hook.
