# Reuse attachment can be accepted from the wrong session

- ID: `2026-10-02-BUG-reuse_reserved_session_identity`
- Type: `BUG`
- Status: `closed`
- Authority: the stakeholder's 2026-10-02 GWEN campaign instruction to
  restrict reuse to sessions created for that campaign. This activates a
  standalone repair under the approved live Ponytail/GWEN goal.

Traceability: introduces REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-reuse_reserved_session_identity
Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-reuse_reserved_session_identity
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-reuse_reserved_session_identity

## Observation and confirmed cause

The GWEN coordinator messaged an unrelated dedicated chat to repair a fixture,
outside the campaign scheduler. The stakeholder stopped that chat and required
reuse to stay within workers created for the campaign. `scheduleWorker` already
selects only idle workers in the selected campaign ledger, not arbitrary host
chats. However, `bindWorker` checks a `REUSE_WORKER` reservation's worktree but
not its reserved session ID. A different chat able to invoke attachment in
that checkout can therefore bind the token. A focused real-Git test reproduced
acceptance of the wrong session before the repair.

## Resolution boundary

Reject attachment unless both the exact reserved session and worktree match.
Keep safe same-campaign retention and reuse; do not allocate a replacement or
retire existing pairs. Reconcile the newer same-campaign policy with the older
successor-campaign wording in the canonical requirement and UAT. The host
adapter and coordinator must use only the exact session named by a returned
`REUSE_WORKER` action, never choose an unrelated idle chat conversationally.

## Acceptance

The wrong session is rejected with no binding written; the original reserved
session can attach using the same action and token. Host observations of an
unrelated idle chat do not place it in the campaign's reusable pool. No
physical worker retirement or unrelated GWEN edit is part of this repair.

Requirement: [retained workers](../../requirements/worker-worktree-retention.md).
UAT: [retained-worker Suite](../../uat/worker-worktree-retention.md).

## Validation

The focused attachment test failed before implementation because the wrong
session was accepted. Both focused identity tests pass after the guard.
`node --test tests/campaign-orchestration.test.js
tests/plan-execution-policy.test.js` passes all 55 tests. The first sandboxed
`npm test` could not connect to the local PostgreSQL test database (`EPERM` at
localhost:5432); the same complete command passed with ordinary local database
access, including bundled products, 80 TSTS tests, and the 623-file structural
check. Traceability, version, skill-format, diff, and pattern-observation
schema checks pass. Build impact reports no affected target for the changed
runtime file. These real-Git tests prove the product boundary. The live GWEN
coordinator reported successful authentication and action completion for an
original campaign worker selected by `REUSE_WORKER`; the fixture tasklets and
campaign acceptance remain separate.

The [causal observation](../../debugging-pattern-observations/2026-10-02-reuse_reserved_session_identity.json)
records the confirmed identity gap. The reserved-session guard, requirements,
UAT, and coordinator skill are reconciled. No worker or checkout was retired.
