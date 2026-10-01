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
