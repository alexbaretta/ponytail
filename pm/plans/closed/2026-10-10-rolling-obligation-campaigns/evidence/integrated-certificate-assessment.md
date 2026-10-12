# Integrated certificate assessment: OBL-56

Source revision: 42619a9677d68532d18d4cee6cdeef3ebe5df38f. Baseline: BASELINE-16. Binding: BIND-79.

The coordinator operation assesses only a published, reviewed increment with stopped retained ownership and its exact retained integrated proof. It reuses the canonical bound-certificate verifier, requires configured coordinator authority and the exact assigned obligation, forbids accepted-document self inputs, and publishes the accepted document by atomic rename under the existing serialized database mutation boundary. The file checkpoint remains authoritative; graph state is a projection.

The real PostgreSQL/Git Arc refuses an unpublished candidate, an accepted-path overwrite, worker authority, unapproved scope amendments and stale integrated inputs without changing accepted records. An active integration on the same coordinator checkout refuses assessment without accepted-file mutation. Four concurrent requests retain one checkpoint. Restart recovery revalidates retained proof and restores a deliberately stale database graph digest after the accepted file has landed, without duplicate acceptance. Four canonical certificate tests and eight PostgreSQL scenarios pass with zero failures, skips or cancellations.

Strict compilation, unchanged TSTS, runtime synchronization, rule copies, versions, manifests and command adapters pass. Three CLI/interface traceability gaps remain. Controlled actor acknowledgments prove this independently testable coordinator boundary; native actor acceptance, CLI adoption and final campaign QA remain separate gates. Prior historical certificates are preserved without freshness renewal.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configuration.

## npm run build

2026-10-11T22:34:54.930Z – 2026-10-11T22:34:56.817Z

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~

## node --test dist/tests/obligation-certificate-bindings.test.js

2026-10-11T22:34:56.836Z – 2026-10-11T22:35:04.393Z

~~~text
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (1830.836042ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (1999.221583ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (1724.189875ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (1832.760666ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7522.999417

~~~

## node --test '--test-name-pattern=real PostgreSQL (serializes allocation|automatically publishes|retains inspected conflict|routes substantive integration)|substantive integration repair retains worker|integrated certificate assessment uses retained' dist/tests/rolling-campaign-store.integration.test.js

2026-10-11T22:35:04.414Z – 2026-10-11T22:35:52.748Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7600.811917ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (4733.941958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (4848.912ms)
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (6005.526542ms)
✔ real PostgreSQL retains inspected conflict continuation across restart without duplicate replay (5708.503084ms)
✔ real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review (5299.06025ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/ddaeacf1-e3cf-4887-a91d-c31200de2f93.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (6029.39ms)
ℹ component submission revision=998c8a957115373341fe288063606519ab6235de; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (7917.97275ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 48297.033709

~~~

## npm run check:tsts

2026-10-11T22:35:52.766Z – 2026-10-11T22:35:54.678Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1175 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-11T22:35:54.694Z – 2026-10-11T22:35:54.726Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-11T22:35:54.741Z – 2026-10-11T22:35:54.775Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-11T22:35:54.792Z – 2026-10-11T22:35:54.826Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-11T22:35:54.842Z – 2026-10-11T22:35:54.875Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-11T22:35:54.891Z – 2026-10-11T22:35:54.923Z

~~~text
Validated 5 OpenCode commands.

~~~
