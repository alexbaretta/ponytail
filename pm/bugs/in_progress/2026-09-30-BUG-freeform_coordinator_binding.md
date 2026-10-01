<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Free-form coordinator binding

- ID: `2026-09-30-BUG-freeform_coordinator_binding`
- Type: BUG
- Status: in_progress
- Authorization: stakeholder authorized scoped Ponytail coordinator-binding
  repairs on 2026-09-30 and explicitly identified this session as coordinator.

Traceability: plans-implementation REQ-PLAN-INPUT-QUEUE from issue 2026-09-30-BUG-freeform_coordinator_binding
Traceability: plans-verification REQ-PLAN-INPUT-QUEUE from issue 2026-09-30-BUG-freeform_coordinator_binding

## Diagnosis and bounded resolution

The hook recognizes object-shaped `code` input but ignores the same code as a
free-form string. The focused regression fails before the production edit:
the hook returns no binding result. Normalize the free-form representation
into the existing code reader, without changing identity, ownership, attach,
or authorization rules. Prove binding, conflicting-session denial, mutating
campaign-command denial, unrelated-command omission, and owner release.

The existing [queue requirement](../../requirements/plan-input-queue.md)
already requires hook-provided coordinator identity. No new requirement or
capability is introduced. The [producer UAT Arc](../../uat/plan-input-queue.md)
is extended to exercise both physical tool-input forms. Hook-script tests
prove parser behavior, not actual live host-hook installation or delivery.

Acceptance requires focused hook and queue tests, traceability parity, syntax,
and build-impact validation. Live coordinator binding remains separately
unverified until canonical commands report this session in campaign status.

## Verified checkpoint

- The free-form regression failed before the one-line normalization repair
  and passed afterward; the hook and queue selections pass all 13 tests.
- JavaScript syntax, rule-copy parity, and version checks pass. Build impact
  reports no affected or indeterminate targets. Traceability generation and
  validation pass with 132 relationships.
- A subsequent elevated, canonical GWEN binding command still reports a null
  coordinator in live status. Hook parser correctness does not prove live host
  delivery. Do not synthesize a hook invocation or forge an identity to hide it.
- [Confirmed parser observation](../../debugging-pattern-observations/2026-09-30-freeform_tool_input_ignored.json).
