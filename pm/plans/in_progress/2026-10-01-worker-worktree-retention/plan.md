# Retained worker pools and worker-owned recovery

- Plan ID: `2026-10-01-worker-worktree-retention`
- Status: in_progress
- Approval: stakeholder authorized requirements, UAT, planning, and execution
  on 2026-10-01. No outside-project installation or live resource deletion is
  authorized by this implementation request.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-01-worker-worktree-retention","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from plan 2026-10-01-worker-worktree-retention
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from plan 2026-10-01-worker-worktree-retention

## Objective

Implement the [approved requirement](../../../requirements/worker-worktree-retention.md)
and prove the [acceptance Suite](../../../uat/worker-worktree-retention.md).
Retain inactive pairs, bound each top-level project's pool independently to
fifteen workers, and permit an authenticated worker to rebuild its own missing
checkout from its recorded main worktree without coordinator initiation.

## Execution

[S01](sprints/S01.md) is approved. Its ordered tasklets cover baseline repair,
test-first retention/capacity, worker recovery, and policy/acceptance. Existing
physical serialized readers remain immutable; new persistent contracts have
explicit versions and registration. Historical pending deletion must be
superseded without fabricated success. Explicit retirement remains separate.

## Starting checkpoint and gates

Starting revision: `f4f735f`. Tree clean. Previous final root acceptance
reported three installer fixture failures: their isolated PATH contains neither
Codex nor npm. Repair the external-command test fixtures, without invoking a
real installation, as a prerequisite; establish green baseline before product
implementation. Focused tests run per tasklet; full configured acceptance,
build-impact, generated adapters, traceability, rule copies, and versions run
against the final tree.

Baseline at `af2995e` passed the complete configured `npm test` after fixture
repair: 473 core tests, installer harness, Pi, MCP, TSTS, and 568-file structure
check. Log: ignored `tmp/worker-retention-baseline.log`.

Live Codex continuity is a separate acceptance gate. A production Git fixture
does not prove the app can resume a formerly missing cwd. No test owned host
session is presently available inside this task's fixed operational boundary;
do not close the plan or claim host acceptance without that evidence.

## Exclusions

No cloud resources, client-project modifications, bulk retirement, private host
API, hidden host-setting edits, or deletion of native recovery snapshots.

## Final repository evidence and remaining acceptance

Implementation commits: `081a50f` (retained project pools) and `c476db9`
(worker-owned recovery), followed by the policy/combined-boundary change-set.
Canonical skills and generated OpenClaw copies are synchronized. Requirements,
UAT, architecture, command inventory, and the existing recovery observation
now distinguish retention and exact-path recovery from legacy retirement.

Final `npm test` passes: 491 core tests, the Codex installer harness, 23 Pi,
4 MCP, 80 TSTS tests, and 570-file structure validation. Traceability resolves
201 relationships; rule-copy, version, generated registry/adapter/manifest,
skill structural checks, Bash syntax, and diff checks pass. Build impact selects
no affected or indeterminate targets, so no build is required. The first full
final run exposed one stale coordinator-only recovery policy assertion; that
assertion was reconciled and the complete command rerun successfully.

Evidence: `tmp/worker-retention-final.log`, `tmp/worker-retention-final-focused.log`.
These logs are ignored, not committed product artifacts.

The plan remains in_progress solely for the manual live Codex continuity Arc.
No test-owned host session with authority to alter its exact managed checkout
is available within this task's fixed repository boundary. Deployment to client
plugin caches and disabling host automatic deletion are not performed by this
change-set. Repository Git proof must not be presented as live host acceptance.
