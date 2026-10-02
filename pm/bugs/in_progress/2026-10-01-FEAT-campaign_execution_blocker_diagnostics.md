# Automated runnable-plan blocker and parallelism diagnostics

- ID: `2026-10-01-FEAT-campaign_execution_blocker_diagnostics`
- Type: `FEAT`
- Status: `in_progress`
- Authorization: explicit stakeholder implementation direction on 2026-10-01.

## Scope and provenance

The stakeholder requires tooling to report theoretically runnable plans blocked
by anomalies, including missing-checkout recovery rejection and host-review
rejection. The coordinator skill must work with the exact worker to unblock
those conditions and request human information, scoped authority, or manual
operations when genuinely needed. The updated active campaign goal also
requires monitoring actual worker concurrency against achievable concurrency
from runnable plans and available session slots.

This feature diagnoses the failure recorded in
[runnable workers not activated](../open/2026-10-01-BUG-runnable_campaign_workers_not_activated.md).
It does not itself resolve that incident's pending permissions, change the
retention/capacity policy, or authorize outside writes or token transmission.

## Implementation plan

1. Reconcile the approved behavior into the canonical campaign requirement and
   one UAT Arc before changing tooling.
2. Extend the existing runnable-plan output with a new immutable version:
   retain exact eligibility and add original assignment/action/worker identity,
   observed activity, deterministic anomalies, and capacity/parallelism facts.
   Preserve its V1 reader; unavailable host evidence is unknown, not idle.
3. Add one coordinator-owned, versioned blocker-report boundary and durable
   scoped records for failures the CLI cannot observe directly. Preserve
   assignment/action identity, explicit resolution, and secret exclusion;
   reporting is not execution or authorization. No alternate eligibility query.
4. Document coordinator monitoring, worker collaboration, exact repair, and
   necessary nonduplicated human escalation in canonical plan-execution;
   regenerate host copies and synchronize commands/contracts/traceability.
5. Prove the GWEN-shaped failure using focused real-Git CLI/adapter regressions,
   validate historical readers and reporting ownership, run final core gates,
   commit cohesively, and exercise the report with the existing coordinator.

Requirements: [campaign orchestration](../../requirements/campaign-orchestration.md).
Acceptance: [concurrency-shortfall Arc](../../uat/campaign-orchestration.md#arc-explain-and-resolve-runnable-plan-concurrency-shortfalls).
Validation and live activation acceptance remain pending. Do not close this
feature merely because documentation or reservations exist.

## Verification

### Live authentication defect and correction

The installed GWEN coordinator's three exact reports failed with
`CAMPAIGN_COORDINATOR_REQUIRED`, although canonical coordinate and observe
authenticated the same session. Source inspection proves two gaps: the trusted
PreToolUse campaign matcher omitted `report-blocker`, and reporting required
the standalone `PONYTAIL_SESSION_ID` environment variable instead of the native
adapter's existing scoped `PLUGIN_DATA` coordinator binding. Direct CLI tests
had supplied that variable and did not exercise the native boundary.

Repair both participating layers: route the new command through the existing
coordinator hook, and use the existing scoped coordinator binding in plugin
mode (explicit session identity in standalone mode). Preserve denial of other
sessions, worker mutations, unrelated campaign scopes, and unbound callers.
Add one real hook-to-CLI regression without the standalone identity variable,
then rerun focused and core acceptance before refreshing the approved install.
This is a repair of the already-approved coordinator reporting capability, not
new authority or a weakened host-review gate. The existing requirement and
concurrency-shortfall UAT Arc already require bound coordinator ownership.

The new regression failed before correction and all 48 focused hook and
orchestration tests pass afterward. The confirmed occurrence is recorded in
[adapter identity observation](../../debugging-pattern-observations/2026-10-01-coordinator_report_adapter_identity.json).
The corrected full `npm test` pipeline passes, including 509 core tests,
installer and bundled subprojects, eighty TSTS tests, and structural checks;
traceability now validates 227 relationships. Live retry remains pending the
corrected installed hook/runtime.

The live retry of `ea5536a` disproved its command-environment assumption:
the trusted hook authenticated successfully, but both ordinary and elevated
exec commands have `CODEX_SESSION_ID` and no `PLUGIN_DATA` or
`PONYTAIL_SESSION_ID`. Hook identity storage is not exported into the command
process. The writer now compares the actual command-side native session ID
with the existing ledger coordinator (the standalone adapter retains its
explicit `PONYTAIL_SESSION_ID` contract). The native regression separates hook
and CLI environments, removes `PLUGIN_DATA` before spawning the command, and
checks native wrong-session denial. It reproduced the same coordinator error
before this correction. No identity is supplied manually during live retry.
The corrected separated-environment regression and all 48 focused tests pass;
the full core pipeline also passes again (509 core, installer, bundled
subprojects, eighty TSTS tests, and structural validation). This supersedes the
earlier passing shared-environment test as evidence of command identity
transport. Live retry is still required before claiming native reporting works.

- Forty focused orchestration tests pass, including real-Git CLI report
  persistence across process restart, original bootstrap/checkouts, scoped
  coordinator ownership, capability exclusion, explicit resolution, stale
  activity, and historical V1 normalization.
- Skill validation, rule copies, versions, traceability (226 relationships),
  and build-impact pass; no affected build target exists.
- Live coordinator query at GWEN `9d414b35` confirms theoretical three versus
  observed runnable zero, one earlier closure worker, and both exact missing
  original checkouts. Its audit host refusal still awaits durable reporting.
- Full `npm test` acceptance passes with local PostgreSQL access, including
  runtime tests, installer, bundled subprojects, eighty TSTS tests, and the
  final structural gate. The initial sandbox denial and unstaged-record gate
  were repaired without changing product behavior or bypassing checks.
- Pending human recovery/dispatch authority and live repaired product-worker
  activation are not granted or claimed by these diagnostics.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_execution_blocker_diagnostics
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_execution_blocker_diagnostics
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-FEAT-campaign_execution_blocker_diagnostics
