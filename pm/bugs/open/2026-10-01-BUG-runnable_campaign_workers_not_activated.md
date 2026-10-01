# Runnable campaign plans are not reaching worker execution

- ID: `2026-10-01-BUG-runnable_campaign_workers_not_activated`
- Type: `BUG`
- Status: `open`
- Reported: 2026-10-01 by the stakeholder after repeated requests for maximum parallelism.

## Report and expected behavior

GWEN has several dependency-ready plans with nonempty immediately runnable
tasklet sets, but no worker is executing those tasklets. One worker performing
an already-completed plan's scoped closure is not product-plan parallelism.
The coordinator must activate all eligible plans within safe project capacity,
not treat reservations, closure activity, or repeated status reports as proof
of successful parallel execution.

## Verified live evidence

At integrated revision `9d414b35bd70fc26f516b41b1923e01dae4bc42e`, the GWEN
coordinator refreshed `ponytail campaign runnable-plans
2026-09-25-product-requirements-and-release-acceptance --json` and reported:

| Runnable plan | Runnable tasklet | Existing action | Failed boundary |
| --- | --- | --- | --- |
| `2026-09-30-traceability-async-effect-disposition` | `S01-F03-T032` | CREATE `67fb33cb-8557-4315-9401-9e7c4286266e` | Original-session checkout recovery rejected by automatic permission review |
| `2026-09-30-traceability-async-gate-race` | `S01-F03-T037` | CREATE `78eaf190-ed22-4d38-824f-0488e2e59a3d` | Original-session checkout recovery rejected by automatic permission review |
| `2026-09-30-traceability-async-safe-inspection-audit` | `S01-F03-T040` | REUSE `92bd02a4-5f03-4fb2-8d7f-11c9b95fb12f` | Native assignment-capability message rejected before worker activation |

The live counts are zero product-tasklet workers, one scoped closure worker
(observe-success), and zero rebase workers. Coordinator identity is
`01a0dbd5-b910-79d1-b12a-bd9e4125641c`; its checkout is
`/Users/alex/git/gwen.vc/gwen`. The canonical capacity bound is fifteen retained
session/worktree pairs, including creation reservations, per top-level project;
it is not simply an active-thread quota. Reuse was already selected for audit,
so its failure is not an absence of an available scheduler action.

The two original CREATE effects have started native sessions and PROVISIONED
enrollment, but no authenticated attachment. Their original checkout paths
are `/Users/alex/.codex/worktrees/2012/gwen` and
`/Users/alex/.codex/worktrees/ca42/gwen`. Supported native snapshots verified
both original sessions idle after failed canonical recovery. The automatic
review rejected elevated recovery because it writes the original checkout,
campaign state, and project-owned slot resources outside the supplied project
boundary. No replacement session or checkout was created.

Audit's retained session is `01a0f68d-279a-7183-a778-6bc995849281`, at
`/Users/alex/.codex/worktrees/60d8/gwen`. The REUSE action remains NOT_STARTED;
no successful native prompt, STARTED receipt, attachment, or tasklet execution
is claimed. Automatic review classified the assignment attachment capability
as a credential-like transmission. No corresponding blanket human prohibition
was identified; canonical plan-execution bootstrap requires scoped capability
delivery. Capability values must not be stored in this report.

## Diagnosis and unresolved ownership

Confirmed: repository eligibility and durable batch reservation do not result
in native worker execution on this live host. The observed failures are at
host authorization boundaries, not a lack of runnable tasklets or a global
serialized join requirement. The scheduler's selection alone is not evidence
that activation works end to end.

Not yet proven: whether the durable correction belongs in Ponytail's host
adapter, installed policy/skill authority contract, or the host permission
reviewer. Do not weaken authorization, remove authenticated attachment, bypass
native review, or invent replacement workers to conceal the failure. Existing
scoped human requests remain pending; do not duplicate them.

## Scope and acceptance criteria

1. Establish a supported authorization and activation path for the existing
   exact assignments, preserving action, session, checkout, and retry identity.
2. Verify that each currently eligible plan executes its runnable tasklets
   concurrently, up to safe project capacity; account explicitly for any
   genuine dependency, ownership, resource, or approval gate.
3. Record native started/active evidence and authenticated attachments, not
   merely returned reservations or accepted planning messages.
4. Preserve serialized joins, retained-pair reuse, project isolation, and
   existing security boundaries. Add focused regression proof for any
   confirmed Ponytail correction and live host acceptance for activation.

## Authorization and reconciliation

The stakeholder explicitly requested this bug report on 2026-10-01. This intake
does not itself grant new outside-path mutation or capability-transmission
authority. The existing approved campaign-testing goal continues; implementation
of a specific correction requires a confirmed causal mechanism within its
authorized boundary. No new requirement or UAT record is introduced at intake.

Requirements: [campaign orchestration](../../requirements/campaign-orchestration.md)
and [retained worker recovery](../../requirements/worker-worktree-retention.md).
Related work: [runnable plan batch scheduling](../in_progress/2026-10-01-FEAT-campaign_runnable_plans.md)
and [pre-attachment checkout recovery](../in_progress/2026-10-01-BUG-pre_attachment_checkout_recovery.md).

Validation: live canonical runnable-plan query and supported native snapshots;
report structural validation is recorded in the change's commit. Resolution
remains open; successful maximum-parallelism activation has not been proved.
