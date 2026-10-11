# Increment publication: OBL-54

Source revision: abefd705867214dc6c3bab6b50769c7b26acd7a4. Baseline: BASELINE-16. Binding: BIND-70.

This packet establishes OBL-54: a reviewed increment with fresh focused QA fast-forwards the configured local branch and publishes by normal push; delivery is recorded only after fresh remote containment. It does not claim completion of conflict recovery, mainline batch publication, CLI adoption, or final campaign QA.

The actual Git/PostgreSQL Arc starts from an accepted stored review and frozen worker lease, records rebase and refreshed QA, refuses stale proof, serializes four concurrent publication requests to one push owner, fast-forwards the configured coordinator branch, pushes normally to a disposable remote, verifies the exact candidate on both branches, and retains exactly one delivery across restart observation. Existing rejection and unknown-outcome recovery scenarios also pass. Synthetic actor acknowledgments exercise the component boundary; they do not replace native worker/reviewer proof.

Strict compilation, unchanged TSTS, runtime synchronization, rule copies, version files, manifests and command adapters pass. Eleven Git/contract tests and four PostgreSQL scenarios pass with zero failures, skips or cancellations. Three CLI/interface traceability gaps remain. Historical certificate freshness is not renewed by this packet.

Node v24.15.0; git version 2.54.0. Local PostgreSQL uses the invoking project's configuration.

## npm run build

2026-10-11T21:27:50.529Z – 2026-10-11T21:27:52.373Z

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~

## node --test dist/tests/rolling-integration.test.js

2026-10-11T21:27:52.391Z – 2026-10-11T21:27:58.627Z

~~~text
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (557.061083ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (581.45ms)
✔ fast integration refuses a changed checkout before fetching or replaying (378.609958ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (825.479541ms)
✔ upstream divergence requests another rebase and preserves both revisions (570.091166ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1261.002209ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (815.921208ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (642.013958ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.491208ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (521.948334ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.358375ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6202.210292

~~~

## node --test '--test-name-pattern=real PostgreSQL (serializes allocation|automatically publishes)' dist/tests/rolling-campaign-store.integration.test.js

2026-10-11T21:27:58.648Z – 2026-10-11T21:28:20.569Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7067.943ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (4497.486ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (4361.48425ms)
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (5784.2545ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 21885.581

~~~

## npm run check:tsts

2026-10-11T21:28:20.586Z – 2026-10-11T21:28:22.546Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1165 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-11T21:28:22.562Z – 2026-10-11T21:28:22.603Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-11T21:28:22.619Z – 2026-10-11T21:28:22.651Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-11T21:28:22.665Z – 2026-10-11T21:28:22.697Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-11T21:28:22.711Z – 2026-10-11T21:28:22.743Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-11T21:28:22.757Z – 2026-10-11T21:28:22.789Z

~~~text
Validated 5 OpenCode commands.

~~~
