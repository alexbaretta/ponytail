# 2026-10-01-FEAT-campaign_ready_actions

**Title:** Expose campaign actions that are ready for coordinator execution

**Type:** `FEAT`

**Status:** `closed`

**Report:** A coordinator needs one deterministic machine-readable command
that lists host actions executable now: worker dispatch, serialized rebase,
and surplus-worker cleanup after accounting for worker reuse.

**Intended behavior:** `ponytail campaign ready-actions [<campaign>] --json`
returns a read-only V1 projection of durable pending actions that the
coordinator may execute now. It does not execute effects, create assignments,
or infer advisory actions.

**Scope:** The ready-action result contract, dispatch readiness filtering,
capacity-aware worker reuse and cleanup selection, CLI and coordinator policy,
architecture, automated coverage, and acceptance documentation.

**Exclusions:** Executing host effects, materializing actions, retrying a
started dispatch, or returning dependency-blocked dispatches.

**Acceptance criteria:**

- The command returns ready, not-started create/reuse actions and every durable
  rebase or cleanup action, preserving each V1 action envelope unchanged.
- Dependency-blocked and already-started dispatch actions remain durable but
  are not returned as executable actions.
- Blocking campaign diagnostics fail the command closed.
- Worker reuse retains only the cleanup-pending workers needed after available
  idle capacity is counted; additional workers proceed through project-aware
  worktree and session cleanup.
- The coordinator skill uses `ready-actions` as the sole executable-action
  selection view while `status.pendingActions` remains the recovery inventory.

**Authorization:** Explicit stakeholder instruction on 2026-10-01.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_ready_actions

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_ready_actions

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_ready_actions

**Requirement:**
[Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:**
[Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:**
[Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The failing-first focused run proved all three missing
behaviors: `readyActions` was absent, a second cleanup-pending worker was
retained despite only one ready plan, and the CLI rejected `ready-actions`.
After implementation, the focused campaign, hook, coordinator-policy, CLI, and
manifest suites pass. Rule-copy, registry, generated-adapter, manifest,
version, and traceability checks pass. The installer script, Pi extension,
Ponytail MCP, all 80 TSTS unit tests, and TSTS semantic checks pass. The full
Node population passes 464 of 467 tests; its three failures are the existing
restricted-PATH installer-fixture failures reporting `codex or npm is required`
and are unrelated to this change.

**Resolution:** Added the versioned read-only `campaign ready-actions` command,
which preserves durable action identities while excluding blocked and started
dispatches and failing closed on diagnostics. The scheduler now retains only
the cleanup-pending worker capacity needed by current dispatch demand after
idle workers are counted, allowing surplus workers and project resources to be
retired. The coordinator skill and generated copy now define the advance,
ready-action, exact-result loop and require project-resource cleanup, including
container networks, before worktree reclamation.
