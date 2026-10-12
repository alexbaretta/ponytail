# Coordination batch: OBL-63

Source revision: 3f2203fdf15a2bab98dc17a039fc7061e8cac378. Baseline: BASELINE-16. Binding: BIND-95.

Condition: Replenish capacity from events and periodic reconciliation without duplicating allocations.

Criterion: Coordinator recovery/replenishment Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Concurrent event and periodic replenishment use the same canonical reconciliation and fenced allocation path. The real database Arc reserves exactly the configured capacity without duplicate obligation ownership; repeated polls reserve nothing. A stopped blocked worker frees a slot for another obligation. Canonical prerequisite discharge and atomic completed-worker release cause the original unblocked session to resume first with its identity retained and a new generation.

Twenty-three focused component/Git tests and twelve real PostgreSQL/CLI scenarios pass with no failures, skips or cancellations. TSTS, traceability, runtime synchronization, rules, versions, manifests, adapters and registry pass. Strict root compilation is reused after its final relevant input edit. The installed chapter registry, legacy-route replacement, MCP parity and final campaign closure/acceptance remain open. Historical assessments are retained without a freshness-renewal claim.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-operations.test.js dist/tests/rolling-publication.test.js dist/tests/rolling-publication.integration.test.js dist/tests/rolling-integration.test.js dist/tests/rolling-campaign-store.test.js

2026-10-12T02:28:30.109Z – 2026-10-12T02:28:36.626Z

~~~text
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (31.216041ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (11.58825ms)
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (579.18625ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (614.745709ms)
✔ fast integration refuses a changed checkout before fetching or replaying (409.598458ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (920.826666ms)
✔ upstream divergence requests another rebase and preserves both revisions (580.975166ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1271.490166ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (824.187084ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (695.339166ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.501875ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (532.823708ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.400459ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (11.555458ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.215708ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.119083ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.127375ms)
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (2664.30875ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (559.35775ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.395792ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.16925ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (110.23625ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.918125ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6481.595667

~~~

## node --test '--test-name-pattern=publication (batch freezes|partial flush|threshold uses)|mainline .*publication'|persists (accepted|rejected) review|shared operations dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-operations.integration.test.js

2026-10-12T02:28:36.645Z – 2026-10-12T02:30:18.609Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7939.044666ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (5006.99775ms)
✔ publication batch freezes one shared partial claim across concurrent requests and restart (9525.513417ms)
✔ publication partial flush follows verified completion state (8190.72ms)
✔ publication partial flush follows verified quiescence state (8318.097667ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (8038.93575ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (10030.817209ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (10198.436167ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-ZesfVI/managed/increment-remote.git
   619af90..b798ce1  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (11429.961584ms)
✔ mainline unavailable publication retains one observation and synchronizes the campaign after restart (11309.955084ms)
✔ mainline rejected publication retains one observation and synchronizes the campaign after restart (11751.284958ms)
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (3443.226666ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 101930.078833

~~~

## npm run check:traceability

2026-10-12T02:30:18.630Z – 2026-10-12T02:30:19.591Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 801 relationships: no violations found.

~~~

## npm run check:tsts

2026-10-12T02:30:19.607Z – 2026-10-12T02:30:21.592Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1217 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T02:30:21.608Z – 2026-10-12T02:30:21.649Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T02:30:21.664Z – 2026-10-12T02:30:21.697Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T02:30:21.712Z – 2026-10-12T02:30:21.742Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T02:30:21.757Z – 2026-10-12T02:30:21.788Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T02:30:21.804Z – 2026-10-12T02:30:21.838Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T02:30:21.853Z – 2026-10-12T02:30:21.884Z

~~~text
Validated 39 registry entries.

~~~

## Reused strict compilation

Relevant compilation inputs are unchanged since this passing configured build; runtime synchronization is checked above.

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~
