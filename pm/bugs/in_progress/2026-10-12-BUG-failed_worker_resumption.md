<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Failed native worker cannot resume without a fabricated dependency

- ID: 2026-10-12-BUG-failed_worker_resumption
- Type: BUG
- Status: IN_PROGRESS
- Authority: stakeholder authorized rolling worker lifecycle and Ponytail
  tooling repairs during the GWEN traceability campaign.
- Requirements: [REQ-ROLLING-WORKERS](../../requirements/rolling-campaigns.md#req-rolling-workers-ponytail-owned-checkouts-and-direct-sessions), REQ-ROLLING-STATE.
Historical coverage: introduces REQ-ROLLING-WORKERS from issue 2026-10-12-BUG-failed_worker_resumption
- Atomic obligation: an observed failed original instruction turn can resume
  the same actor and retained work without an invented obligation prerequisite.
- Observation: original GWEN worker 105's turn failed with model capacity after
  amending its owned semantic rebase stop. Its session and checkout remain.
- Confirmed cause: empty blockers were permitted only for rejected review;
  failed native execution had no canonical suspension/reactivation route.
- Repair: permit empty blockers for an observed failed WORKING instruction turn;
  preserve known turn, actor, generation and idle observation checks. Keep the
  existing stop record immutable and resume through ordinary allocation.
- Regression: canonical native observer with the controlled protocol and real
  PostgreSQL rejects a completed unreviewed turn, accepts the known failed turn,
  reactivates the original actor with a new generation, preserves dirty work and
  retains the old failure checkpoint across restart.
- Validation: focused native-observer/PostgreSQL regression passed (1/1); indexed
  traceability passed (909 relationships). Final combined checks pending; no
  full QA claimed.
