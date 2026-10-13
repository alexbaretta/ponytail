<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Native adapter declines authorized worker semantic replay

- ID: 2026-10-12-BUG-native_worker_rebase_approval
- Type: BUG
- Status: IN_PROGRESS
- Authority: stakeholder explicitly authorized required worker semantic rebase
  and Ponytail tooling repair during the GWEN N=10 campaign.
Traceability: introduces REQ-ROLLING-WORKERS from issue 2026-10-12-BUG-native_worker_rebase_approval
- Atomic obligation: the active leased worker can perform its required scoped
  semantic replay without the adapter silently rejecting authorized escalation.
- Root cause: production native adapter unconditionally declines every request,
  while native acceptance fixtures already approved scoped replay commands.
- Repair: bind one-use approval to current active DB lease, retained checkout,
  session marker and exact instruction turn; recognize only the documented replay
  stop command against the freshly fetched configured campaign ref and continuation
  of an existing checkout rebase. No persistent policy, model or host permission change.
- Evidence: GWEN worker102 staged/committed/fetched successfully, then its explicit
  semantic-review-stop request was declined and reported as user rejection.
- Regression: controlled native protocol accepts the exact replay command and
  rejects foreign checkout/thread/turn, destructive command suffixes, file-change
  requests, unknown dispatches and inspection-only leases.
- Validation: focused native protocol/worker/operations 34/34 passed. The
  remaining configured cohort passed 274 typed, 23 Pi, 4 MCP and 80 TSTS tests,
  installation checks and static checks. A final diagnostic guard prevents an
  approval response after disconnect from producing an unhandled rejection;
  root build, focused proof and TSTS were repeated after that edit.
- Acceptance pending: real native worker replay and full core acceptance.
  Full core QA passed 546/547 legacy tests, then stopped at the independently
  confirmed shared-index pruning race (PostgreSQL 23503 in project-index.js).
  This issue remains IN_PROGRESS; no full-QA pass or live acceptance is claimed.
