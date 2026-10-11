# Increment integration: OBL-53

Source revision: 62ac6dc56bd8191a550a717ebd5377c96538087e. Baseline: BASELINE-16. Binding: BIND-75.

This packet establishes the post-review fast-rebase policy at the independently testable coordinator/Git boundary. Clean commits replay interactively without additional semantic edit stops. Textual conflicts retain their original replay identity and require a semantic inspection reference before continuation. Continuation intent precedes Git mutation, preserving the original conflict and immutable completion across restart.

Substantive conflicts return to the retained worker without changing the original accepted verdict. The controlled complete Arc observes the retained dirty checkpoint, renews the same worker after authoritative coordinator graph reconciliation, inspects and repairs the replayed commit, refreshes QA on the corrected SHA/base, refuses a different reviewer, records a new accepted verdict by the original reviewer, claims a new increment, and normally publishes exactly one corrected delivery. Original conflict and review history remain intact.

Sixteen Git/contract/worker tests and seven real PostgreSQL scenarios pass with zero failures, skips or cancellations. Strict compilation, unchanged TSTS, runtime synchronization, rule copies, versions, manifests and command adapters pass. Three CLI/interface traceability gaps remain. The controlled actor protocol establishes the component boundary; native actor acceptance and final campaign QA remain separate required gates. Historical certificates are preserved without freshness renewal.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configuration.

## npm run build

2026-10-11T21:44:34.233Z – 2026-10-11T21:44:36.042Z

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~

## node --test dist/tests/rolling-integration.test.js dist/tests/rolling-worker.test.js

2026-10-11T21:44:36.060Z – 2026-10-11T21:44:42.306Z

~~~text
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (565.88625ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (562.737084ms)
✔ fast integration refuses a changed checkout before fetching or replaying (365.398709ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (812.502625ms)
✔ upstream divergence requests another rebase and preserves both revisions (514.833709ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1352.175458ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (780.515ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (651.137834ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.475333ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (559.232292ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.434208ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.789792ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (92.758375ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.542291ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.479208ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.2265ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6213.313167

~~~

## node --test '--test-name-pattern=real PostgreSQL (serializes allocation|automatically publishes|retains inspected conflict|routes substantive integration)|substantive integration repair retains worker' dist/tests/rolling-campaign-store.integration.test.js

2026-10-11T21:44:42.328Z – 2026-10-11T21:45:20.434Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7141.703583ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (4420.998458ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (4471.870083ms)
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (5723.22225ms)
✔ real PostgreSQL retains inspected conflict continuation across restart without duplicate replay (5609.687958ms)
✔ real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review (4939.131083ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/fc60b842-7e1a-4f34-9682-bf68bdac6b64.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (5623.073708ms)
ℹ component submission revision=b7ddadabfdcd93c614f698c77fbc1742434470fc; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 38069.502708

~~~

## npm run check:tsts

2026-10-11T21:45:20.451Z – 2026-10-11T21:45:22.295Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1170 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-11T21:45:22.311Z – 2026-10-11T21:45:22.341Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-11T21:45:22.355Z – 2026-10-11T21:45:22.387Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-11T21:45:22.403Z – 2026-10-11T21:45:22.433Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-11T21:45:22.448Z – 2026-10-11T21:45:22.478Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-11T21:45:22.493Z – 2026-10-11T21:45:22.523Z

~~~text
Validated 5 OpenCode commands.

~~~
