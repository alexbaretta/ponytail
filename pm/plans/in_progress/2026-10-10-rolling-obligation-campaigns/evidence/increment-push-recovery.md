# Increment push recovery: OBL-55

Source revision: 6885f0771e2fc07b9b73e35ad1aafb9e8e36964f. Baseline: BASELINE-16. Binding: BIND-69.

This packet establishes only OBL-55: rejected and uncertain campaign increment pushes reconcile without force or duplicate delivery. It is independent of native actor creation and does not claim completion of the conflict path, mainline publication, CLI adoption, or final campaign QA.

The actual Git/PostgreSQL Arc starts from an accepted stored review and frozen worker lease, journals replay and refreshed QA, fast-forwards the configured local branch, observes explicit hook rejection and remote loss, refuses changed QA and stale proof, preserves a divergent upstream and worker revision, recovers through a normal push, and records exactly one delivery across restart and retries. The remote is disposable; no project remote is published. Synthetic session acknowledgments exercise the coordinator component boundary and do not replace previously required native worker/reviewer proof.

Strict compilation, unchanged TSTS, runtime synchronization, rule copies, version files, manifests and command adapters pass. Eleven Git/contract tests and three PostgreSQL scenarios pass with zero failures, skips or cancellations. Three CLI/interface traceability gaps remain. Previously delivered obligations retain historical certificates; their stale freshness is not renewed by this packet.

Node v24.15.0; git version 2.54.0. Local PostgreSQL connection uses the invoking Ponytail project's configuration.

## npm run build

2026-10-11T21:11:31.750Z – 2026-10-11T21:11:33.580Z

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~

## node --test dist/tests/rolling-integration.test.js

2026-10-11T21:11:33.599Z – 2026-10-11T21:11:39.974Z

~~~text
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (585.621708ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (612.723875ms)
✔ fast integration refuses a changed checkout before fetching or replaying (378.229ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (843.079167ms)
✔ upstream divergence requests another rebase and preserves both revisions (533.797458ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1275.747291ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (820.967ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (653.471667ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.475041ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (588.767958ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.440083ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6340.807875

~~~

## node --test '--test-name-pattern=real PostgreSQL serializes allocation' dist/tests/rolling-campaign-store.integration.test.js

2026-10-11T21:11:39.997Z – 2026-10-11T21:11:56.577Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7394.615083ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (4473.135708ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (4553.862ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16544.810083

~~~

## npm run check:tsts

2026-10-11T21:11:56.597Z – 2026-10-11T21:11:58.447Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1163 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-11T21:11:58.463Z – 2026-10-11T21:11:58.496Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-11T21:11:58.512Z – 2026-10-11T21:11:58.544Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-11T21:11:58.560Z – 2026-10-11T21:11:58.591Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-11T21:11:58.606Z – 2026-10-11T21:11:58.638Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-11T21:11:58.654Z – 2026-10-11T21:11:58.685Z

~~~text
Validated 5 OpenCode commands.

~~~
