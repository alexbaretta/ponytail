<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Valid parallel proposal rejected after coordinator advancement

- ID: 2026-10-12-BUG-parallel_submission_base
- Type: BUG
- Status: IN_PROGRESS
- Authority: stakeholder authorized rolling parallel execution and repair of
  Ponytail tooling discovered during the GWEN traceability campaign.
- Requirement: [REQ-ROLLING-WORKERS](../../requirements/rolling-campaigns.md#req-rolling-workers-ponytail-owned-checkouts-and-direct-sessions),
  preserving reviewed integration under REQ-ROLLING-REVIEW.
- Atomic obligation: a valid finalized worker proposal remains admissible after
  compatible coordinator advancement, without accepting foreign/concealed bases.
Traceability: introduces REQ-ROLLING-WORKERS from issue 2026-10-12-BUG-parallel_submission_base
- Observation: original GWEN worker 105 completed its candidate, focused proof
  and replay but submission failed solely because the coordinator had advanced.
- Confirmed cause: submit required base equality with the current increment;
  this contradicted the authorized worker-replay/coordinator-fast-rebase window.
- Repair: require submitted-base ancestry in the current campaign increment.
  Retain all original session, generation, binding, candidate, path and fresh
  proof checks; never change the worker packet to conceal its original base.
- Regression: real Git and isolated PostgreSQL records reproduce rejection of
  a clean valid proposal before the fix; the repaired case accepts it after
  independent coordinator advancement and preserves unrelated-base,
  candidate-as-base, dirty-checkout and immutable replay rejection.
- Focused proof: `node --test --test-name-pattern='parallel submission accepts an ancestor base' dist/tests/rolling-campaign-store.integration.test.js` passes 1/1.
- Acceptance pending: final combined core/static/traceability checks after the
  separate integration and reviewer lifecycle repairs. No full-core pass claimed.
