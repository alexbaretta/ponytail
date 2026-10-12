# Publication batch: OBL-60

Source revision: 730a132313263df19a5465bdda3ae9bcdf1bd584. Baseline: BASELINE-16. Binding: BIND-100.

Condition: Incorporate fresh mainline into the publication candidate while preserving published campaign history.

Freshly fetched mainline is merged into a separate branch rooted at the frozen campaign prefix. The real Git Arc verifies both histories while published campaign refs and subsequent unselected increments remain unchanged. A completed merge is recovered after a lost acknowledgement using its original preparation, without another merge or branch creation. Conflicts preserve the unmerged file, MERGE_HEAD and published refs.

Six focused component/Git tests and seven real PostgreSQL publication/mainline scenarios pass with zero failures, skips or cancellations. The shared cohort covers threshold, explicit flush, completion, quiescence, immutable concurrent claims, restart, mainline incorporation, lost merge acknowledgement, conflicts and full-QA acceptance/refusal. Strict root compilation is reused after its final relevant input edit; unchanged TSTS and runtime synchronization validate the committed tree. Rules, versions, manifests, adapters and registry pass.

Mainline push execution, push-race/unknown-outcome reconciliation and campaign synchronization belong to OBL-62. CLI/MCP adoption and final campaign acceptance remain open. Three interface traceability gaps remain; this record does not claim a globally passing traceability or full campaign unit/native suite. Historical certificates are retained without freshness renewal.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-publication.test.js dist/tests/rolling-publication.integration.test.js

2026-10-12T02:05:01.806Z – 2026-10-12T02:05:04.856Z

~~~text
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (2460.177541ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (507.876916ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.075791ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.153667ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (101.558166ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.814583ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3016.907709

~~~

## node --test '--test-name-pattern=publication (batch freezes|partial flush|threshold uses)|mainline .*publication' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T02:05:04.873Z – 2026-10-12T02:06:06.746Z

~~~text
✔ publication batch freezes one shared partial claim across concurrent requests and restart (9029.937375ms)
✔ publication partial flush follows verified completion state (7805.402292ms)
✔ publication partial flush follows verified quiescence state (7857.166417ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (7340.728959ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (9320.0245ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (9427.627041ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-VACCq1/managed/increment-remote.git
   e1c6c8d..25dc3ab  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (10904.244542ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61840.350125

~~~

## npm run check:tsts

2026-10-12T02:06:06.764Z – 2026-10-12T02:06:08.642Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1202 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T02:06:08.657Z – 2026-10-12T02:06:08.688Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T02:06:08.702Z – 2026-10-12T02:06:08.732Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T02:06:08.747Z – 2026-10-12T02:06:08.776Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T02:06:08.791Z – 2026-10-12T02:06:08.822Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T02:06:08.837Z – 2026-10-12T02:06:08.867Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T02:06:08.882Z – 2026-10-12T02:06:08.911Z

~~~text
Validated 39 registry entries.

~~~

## Reused strict compilation

Relevant product inputs are unchanged since this passing configured build; runtime synchronization is checked above.

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~
