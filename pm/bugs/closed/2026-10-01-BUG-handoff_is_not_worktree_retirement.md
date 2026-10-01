# 2026-10-01-BUG-handoff_is_not_worktree_retirement

**Title:** Retire campaign worktrees without thread handoff

**Type:** `BUG`

**Status:** `closed`

**Report:** Cleanup action `80013582-e21c-479d-b2c9-9d3ec2b92eb9`
remained pending after a successful Codex handoff. The host left the source
checkout present and registered, created a destination thread, and switched
the ordinary project checkout to the worker branch.

**Authorization:** The stakeholder requested a better implementation on
2026-10-01 after supplying the coordinator's report.

**Confirmed cause:** The coordinator policy treated movement of thread Git
state as worktree retirement and assumed the original session identity survived.
Neither assumption is guaranteed by the host operation.

**Resolution scope:** Execute the original cleanup action through the invoking
project's committed, generation-fenced worktree lifecycle adapter. Archive the
original worker chat after project cleanup and observe that exact session as
archived before retirement. Do not hand off a thread or switch any ordinary
checkout. Refuse unsafe, unconfigured, or unproven retirement and preserve the
pending action. A new command takes campaign/action identity, never a deletion
path. Existing host effects in the supplied report require separate reconciliation;
this change does not mutate those external checkouts or threads.

**Acceptance:** Exact action, binding, closed plan, integrated clean revision,
archived host session, adapter ownership and generation must be verified. Only
the selected claim is reclaimed. Both the directory and Git registration must
disappear before the original action is completed. Interrupted cleanup retries
the same action. Unrelated worktrees, sessions, and ordinary checkout state
remain untouched.

**Requirements reconciliation:** Clarifies the existing approved cleanup and
project-resource ownership contracts; replaces the incorrect handoff procedure.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-handoff_is_not_worktree_retirement

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-handoff_is_not_worktree_retirement

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-handoff_is_not_worktree_retirement

**Requirement:** [Campaign orchestration](../../requirements/campaign-orchestration.md)

**UAT:** [Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Debugging-pattern observation:**
[Handoff assumed retirement](../../debugging-pattern-observations/2026-10-01-handoff_assumed_worktree_retirement.json).

**Resolution:** `campaign retire-worktree` uses the existing project adapter
for only the action's authenticated claim. Working sessions, stale or incomplete
observations, open plans, unintegrated or dirty revisions, and retained claims
cannot authorize retirement. Missing directories with surviving Git
registrations cannot be recorded as successful. Adapter completion before
ledger persistence retries the original action without a replacement.

**Validation boundary:** The focused campaign, reclamation, and coordinator
policy profiles passed 45/45. CLI help and parse-safe shell checks passed.
Live retirement in the reported client project is not claimed: that project's
adapter and already altered host state are outside this change's write scope.

Final full Node acceptance passed 470/473 tests. The three failures are the
pre-existing restricted-PATH installer fixtures reporting `codex or npm is
required`; no installer implementation was changed. The standalone Codex
installer harness, Pi (23/23), MCP (4/4), and TSTS (80/80) suites passed.
TSTS checked 563 tracked files without violations. Generated-skill and debugging
structural profiles passed 136/136; skill validation, observation JSON schema,
traceability (191 relationships), registries, manifests, rule copies, version
checks, and patch whitespace checks passed. Build-impact reported no affected
or indeterminate targets. Regenerating the edited OpenClaw skill also brought
its previously stale recovery paragraph into sync with its canonical source.
