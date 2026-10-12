# Final functional compliance assessment — 2026-10-12

The scope is eleven atomic delivery obligations: OBL-114–122, OBL-129 and
OBL-160. Proof responsibilities, inventory reviews and final gate OBL-159 are
separate from this delivery denominator. The earlier audit and failed live run
remain historical evidence; this assessment includes their corrective work.

- OBL-114: canonical and exported glossary explicitly define both actors and
  retain the atomic obligation/acceptance/Arc/Step/tasklet contract.
- OBL-115: the exported coordinator procedure teaches graph authoring,
  validation, initialization, reconciliation, status/next-actions, compatible
  allocation, suspension/resumption, review/integration/publication and recovery.
- OBL-116: exported and runtime worker instructions agree on autonomous scoped
  implementation, focused QA, complete semantic rebase, original-reviewer
  correction, exact submission, and coordinator-owned blockers/publication.
- OBL-117–122: real root/chapter/command help is explanatory, succeeds before
  project registration and performs no operation mutations. Campaign and PM
  help remain available. Runtime generation and recursive installer/export
  checks cover the actual distributed resources.
- OBL-129: shared `rebind-worker` and next-actions preserve the stopped retained
  owner, fence its generation, and resume the original session/checkout after
  graph amendments. PostgreSQL proves the public path.
- OBL-160: `request-review --loss` is exact typed input through the CLI/MCP
  registry and shared operation. PostgreSQL and native proof establish one
  replacement under concurrent retries, immutable prior requests/verdicts,
  stale actor fencing and fresh replacement review after restart.

The original campaign requirement families remain satisfied by the
implementation and real-Git/PostgreSQL workflows identified in
[the requirement audit](compliance-audit.md). The complete plain-English
acceptances remain in `pm/uat/rolling-campaigns.md`. New client-interface
requirements did not replace the original configuration, graph, scheduling,
ownership, worker, review, publication, interface or closure requirements.

Final relevant implementation commit: `83b855a`.

- `npm test`: exit 0; 544 core + 262 typed + 23 extension + 4 MCP + 80 TSTS =
  **913 passing tests**, zero failures/skips; installer checks pass.
  `tmp/compliance-final-full.log`.
- Language/type scope: our CLI, supporting implementation and tests use strong
  TypeScript; completed translations remain, with no new upstream-wide migration.
- TSTS: **1,510 files, zero violations**. Traceability: **876 relationships,
  zero violations**. Runtime generation, eight rule copies and seven pinned
  version files pass.
- Targeted export/API proof: 32 passes. Public PostgreSQL reviewer-loss
  recovery: one pass. Public native reviewer-loss recovery: one pass.
  `tmp/compliance-reviewer-api-focused.log`, `tmp/compliance-reviewer-api-pg.log`,
  `tmp/compliance-reviewer-api-native.log`.
- All **12 required native workflows** have adequate passing evidence: reuse
  the nine unaffected native workflows from `tmp/compliance-native-final.log`;
  the two changed code/rebase and original-reviewer correction workflows pass
  in `tmp/compliance-native-git-repair.log`; the changed public replacement
  workflow passes in `tmp/compliance-reviewer-api-native.log`. Their inspected
  relevant inputs, actors and paths justify this reuse. The initial suite's
  failure is retained, not reported as a passing aggregate.

The fixture defect and validated repair are recorded in
[the failure dossier](native-git-proof-contract-failure.md) and
[the project observation](../../../../debugging-pattern-observations/2026-10-12-fixture_proof_contract_migration.json).
No production proof validation was weakened. New certificates use Git revisions
and bounded path scopes; neither removed hashes nor the oversized database is
restored. Raw logs remain ignored. No deployment or real origin push was done.

Canonical discharge and final structural/lifecycle reconciliation follow this
functional assessment. This prose alone is not an accepted checkpoint.
