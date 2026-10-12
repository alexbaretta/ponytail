# Publication batch: OBL-61

Source revision: 161d1cccc21f2f260960f7a647935dc738520911. Baseline: BASELINE-16. Binding: BIND-93.

Condition: Prevent mainline publication unless all required full QA passes on the exact candidate.

The complete configured full-QA profile executes against the exact reconciled candidate. The real Git Arc runs strict TypeScript compilation and actual unit and integration test files; failures, incomplete profiles, changed configuration and dirty inputs refuse authorization. Real PostgreSQL retains distinct QA job identities, refuses overlapping attempts and early push, and prevents an old failed receipt from overwriting a newer running attempt. Only complete current passing proof permits mainline push intent.

Six focused component/Git tests and four real PostgreSQL publication scenarios pass with zero failures, skips or cancellations. The shared cohort covers threshold, explicit flush, completion, quiescence, immutable concurrent claims, restart, mainline incorporation, lost merge acknowledgement, conflicts and full-QA acceptance/refusal. Strict root compilation is reused after its final relevant input edit; unchanged TSTS and runtime synchronization validate the committed tree. Rules, versions, manifests, adapters and registry pass.

Mainline push execution, push-race/unknown-outcome reconciliation and campaign synchronization belong to OBL-62. CLI/MCP adoption and final campaign acceptance remain open. Three interface traceability gaps remain; this record does not claim a globally passing traceability or full campaign unit/native suite. Historical certificates are retained without freshness renewal.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-publication.test.js dist/tests/rolling-publication.integration.test.js

2026-10-12T01:30:49.873Z – 2026-10-12T01:30:52.949Z

~~~text
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (2495.926833ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (495.527167ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.051ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.144ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (99.741167ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.808ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3040.906042

~~~

## node --test '--test-name-pattern=publication (batch freezes|partial flush|threshold uses)' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T01:30:52.966Z – 2026-10-12T01:31:19.911Z

~~~text
✔ publication batch freezes one shared partial claim across concurrent requests and restart (5762.72825ms)
✔ publication partial flush follows verified completion state (7689.045791ms)
✔ publication partial flush follows verified quiescence state (7762.30725ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (5528.068833ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 26912.772542

~~~

## npm run check:tsts

2026-10-12T01:31:19.929Z – 2026-10-12T01:31:21.935Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1193 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T01:31:21.951Z – 2026-10-12T01:31:21.992Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T01:31:22.007Z – 2026-10-12T01:31:22.041Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T01:31:22.055Z – 2026-10-12T01:31:22.087Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T01:31:22.102Z – 2026-10-12T01:31:22.133Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T01:31:22.148Z – 2026-10-12T01:31:22.179Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T01:31:22.194Z – 2026-10-12T01:31:22.224Z

~~~text
Validated 39 registry entries.

~~~

## Reused strict compilation

Relevant product inputs are unchanged since this passing configured build; runtime synchronization is checked above.

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~
