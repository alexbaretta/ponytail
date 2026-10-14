<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# QA swarm acceptance Suite

## Arc QA-SWARM-SLICE

Traceability: verifies REQ-QA-SWARM

- **Actor:** QA coordinator and independent QA slice workers.
- **Prerequisites:** An authoritative selector manifest, retained worker
  bindings, reviewed Git-integration path, generated skill distribution and
  QA-swarm policy fixtures. A configured rolling campaign may own these
  contracts but is not required for an existing host-managed swarm.
- **Profiles:** Automated policy and distribution proof through
  `node --test tests/qa-swarm-policy.test.js tests/qa-swarm.integration.test.js`.
- **External effects:** Disposable Git and campaign fixtures only; no deployment
  or provider effect.

1. **Acceptance QA-SLICE-COMPLETE (QA-SWARM-001):** Inspect the execution
   contract for one explicit slice.
   - Each slice has one complete aggregate selection, expected inventory,
     actual bounded runner concurrency and declared exclusive resources.
   - Automatic and manual/provider/hardware selectors are all accounted for;
     unavailable selectors retain their configured non-pass disposition.
   - Every independent selected test or Arc reaches a terminal result before
     the worker reports the aggregate outcome.
   - No passing subset creates a separate acceptance submission.
2. **Acceptance QA-REPAIR-INCREMENT (QA-SWARM-002):** Inspect the failing-slice
   causal-repair procedure.
   - The repair handoff identifies the failure, diagnosis, commit/base, changed
     paths, focused proof and remaining slice state.
   - The coordinator can review and integrate the repair while the slice stays
     unresolved. The worker does not call any rolling terminal collection,
     review, integration or acceptance operation for this progress message.
   - The host contract names a separate reviewed Git-integration path that can
     land the repair while the rolling assignment remains active.
   - The worker reconciles the integrated repair, reruns the affected failure and
     continues the remaining slice; compatible workers continue independently.
3. **Acceptance QA-SLICE-ATOMIC (QA-SWARM-003):** Inspect terminal submission
   of the repaired slice against the latest relevant campaign revision.
   - One final aggregate run covers every assigned selection on the same exact
     revision and target/profile identity.
   - The worker submits one exact-schema proposal. The coordinator rejects
     partial, stale, mixed-revision, missing-selection and unapproved-skip
     variants.
   - Ordinary review and bound-certificate acceptance can satisfy the gate
     only from the complete green packet.
4. **Acceptance QA-EXISTING-ADOPTION (QA-SWARM-004):** Inspect conversion of an
   already-running host-managed swarm.
   - Active tests, Git operations, sessions and checkouts continue to their next
     safe boundary without restart or scheduler migration.
   - One authoritative record identifies every unfinished lane's complete
     selector count, execution-class commands and/or manual procedures, actual
     concurrency, target/profile, exclusive resources and state.
   - The record and at least one worker acknowledgment or whole-slice start
     establish adoption.
5. Inspect the canonical skill, registry and generated host copy.
   - They preserve the same scheduler-neutral procedure and use rolling
     campaign commands only when that scheduler is configured.

[UAT index](index.md) | [Requirement](../requirements/qa-swarm.md)
