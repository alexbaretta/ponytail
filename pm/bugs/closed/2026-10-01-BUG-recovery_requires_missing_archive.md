# 2026-10-01-BUG-recovery_requires_missing_archive

**Title:** Recover a worker when its missing checkout was never archived

**Type:** `BUG`

**Status:** `closed`

**Report:** A coordinator executed the scheduler's `RECOVER_WORKTREE` action
for an undelivered worker whose checkout had disappeared. The existing worker
session could not start recovery because its artifact inventory was empty and
the supported restore operation accepts only an archived artifact identity.

**Intended behavior:** Recovery retains the existing session, assignment,
branch, and preserved commit. When the old checkout has no archived artifact,
the same session may create a new managed checkout from that commit and report
its host-selected path. Ponytail must authenticate the new managed path before
atomically replacing the stale assignment and worker binding. It must not
create a replacement session, assignment, branch, or commit.

**Scope:** Versioned campaign action, ledger, status, and ready-action
contracts; recovery result validation and binding replacement; coordinator
policy; architecture, requirements, UAT, and regression coverage.

**Acceptance criteria:**

- An existing V2 recovery action normalizes into the current recovery action
  without changing its action, assignment, session, branch, revision, or
  idempotency identity.
- Recovery may return a different managed checkout path selected by the host.
- The result is rejected unless a fresh complete host observation proves that
  the same session owns the returned managed path.
- The returned checkout must be clean, use the named branch and revision, and
  belong to the campaign repository.
- A successful result replaces the stale assignment and authenticated binding
  path and retains the original session and assignment.
- Recovery creates no replacement session, assignment, branch, or commit and
  still requires ordinary authenticated delivery.

**Authorization:** Repair of the unsuccessful recovery implementation reported
by the stakeholder on 2026-10-01. This corrects an agent-created defect within
the already authorized campaign recovery work.

**Confirmed root cause:** The recovery policy and action-result validator
assumed every missing managed checkout had first been archived and therefore
required restoration at the extinct path. Codex exposes archival restore only
when that chat owns an archived artifact identity; an unarchived vanished
checkout has no such identity. The preserved Git branch and live session are
sufficient to re-provision a managed checkout, but the V2 action result could
not authenticate or adopt a host-selected replacement path.

**Debugging-pattern observation:**
[Recovery assumed an archived artifact](../../debugging-pattern-observations/2026-10-01-recovery_assumed_archived_artifact.json).

**Requirements reconciliation:** Clarifies the existing approved campaign
recovery requirement. Recovery preserves logical worker identity, not an
unrecoverable physical checkout path.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-recovery_requires_missing_archive

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-recovery_requires_missing_archive

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-recovery_requires_missing_archive

**Requirement:** [Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:** [Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:** [Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The focused recovery and version-normalization tests
passed, and the combined campaign, coordinator-policy, conformance, and
versioned-contract selection passed 46/46 tests. Full Node acceptance passed
467/470 tests; the three failures are the pre-existing restricted-PATH
installer fixtures that cannot find `codex` or `npm`. The installer shell
suite, Pi suite (23/23), MCP suite (4/4), and TSTS suite (80/80) passed.
Traceability, generated adapters and manifests, rule copies, registries,
version checks, and JSON parsing also passed. Build-impact reported no affected
or indeterminate targets.

**Resolution:** Added immutable V3 recovery actions and V4 ledger normalization
for already-persisted V2 actions. Recovery now accepts a host-selected managed
checkout path only after a fresh complete observation authenticates that path
to the same session. Action-result validation proves the repository, branch,
revision, and cleanliness, then replaces the stale assignment and binding path
idempotently. Coordinator policy now restores an archive when available and
otherwise creates a managed checkout in the same session from the preserved
revision. The assignment still requires ordinary authenticated delivery.
