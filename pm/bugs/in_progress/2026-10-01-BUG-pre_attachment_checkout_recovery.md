# Missing bootstrap checkout has no recovery authority

- ID: `2026-10-01-BUG-pre_attachment_checkout_recovery`
- Type: `BUG`
- Status: `in_progress`

GWEN's original effect-disposition and gate-race native creations produced
ready sessions, but adoption failed before campaign attachment. Their original
checkouts subsequently disappeared. Recovery required a post-attachment
binding that could not exist yet, leaving started creations permanently
pending. Supported thread inspection confirmed both original session/cwd
identities; no replacement creation is needed or authorized by this repair.

Original identities:

- Action `67fb33cb-8557-4315-9401-9e7c4286266e`, session
  `01a0f68c-79f7-7462-902d-d6a88b49a914`, checkout
  `/Users/alex/.codex/worktrees/2012/gwen`.
- Action `78eaf190-ed22-4d38-824f-0488e2e59a3d`, session
  `01a0f68c-79e5-7811-aa8a-571842c769ad`, checkout
  `/Users/alex/.codex/worktrees/ca42/gwen`.

Implementation plan:

1. Enroll supported ready identity with fresh complete host evidence on the
   existing started creation, without claiming attachment or success.
2. Bind the original capability to its exact detached checkpoint, checkout,
   and main-worktree source; reuse canonical capability-owned recovery.
3. Emit durable worker guidance: recover, immediately adopt, establish the
   canonical branch, and authenticate the original attachment.
4. Preserve old output readers, reconcile documentation and generated copies,
   run focused and final core acceptance, then verify both original live pairs.

Fail-first real-Git regression reproduced the missing authenticated binding.
The repaired focused scheduler, recovery, and hook suite passes 71 tests.
Final `npm test` passes 506 core tests, installer proofs, bundled suites,
80 TSTS unit tests, and structural checking of 584 files. Rule copies,
versions, generated manifests/adapters/registry, the pattern schema, and
221 traceability relationships validate. Build-impact reports no affected
or indeterminate targets. Live continuity acceptance remains pending.

Requirements: [worker retention](../../requirements/worker-worktree-retention.md).
Verification: [retention Suite](../../uat/worker-worktree-retention.md).

Traceability: introduces REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-pre_attachment_checkout_recovery
Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-pre_attachment_checkout_recovery
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-pre_attachment_checkout_recovery
