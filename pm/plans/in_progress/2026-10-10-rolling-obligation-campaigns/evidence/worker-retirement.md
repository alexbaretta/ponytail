# Worker retirement: OBL-57

Source revision: 1343884d35a3bb3c0845ee22b24b5b000acc1e98. Baseline: BASELINE-16. Binding: BIND-81.

The canonical retirement operation observes the original worker turn terminal and native activity idle, revokes assignment authority in the existing project transaction, informs the original worker through a journaled notification, waits for that known turn to complete and become idle, acknowledges native archival, and runs the declared V2 cleanup commands before removing the ignored session marker. Atomic release-and-allocate refuses attached ownership until the retirement journal is CLEANED. Checkout and reusable build caches remain intact. Original setup resource generation is retained separately from the current resumed assignment generation.

The real PostgreSQL/Git Arc refuses blind retirement, archival refusal, lost archive acknowledgement and failed resource cleanup; reservation and marker survive failures. Restart reuses the same notification identity and archival receipt, cleans the exact original resource ownership, retains build cache and integrated HEAD, and permits checkout release only afterward. A post-release retirement retry returns its retained completed receipt without further worker messages. Exactly one archival mutation is observed. The filesystem proof independently preserves dirty user work, foreign markers and unintegrated commits.

The real installed native Codex App Server worker completes initialization and retirement notification, is observed idle, and is found in authoritative archived inventory scoped to its exact physical checkout and original thread ID. Native archival is not idempotent. A bounded native probe confirmed that creation through App Server carried source vscode; recovery includes every supported source kind rather than inferring source from transport. The protocol component proof exercises pagination and rejects a returned foreign physical checkout.

Eighteen focused tests, one complete database/filesystem retirement Arc and one live native retirement Arc pass with no failures, skips or cancellations. Strict root compilation passed after the final product input edit and is reused while those inputs remain unchanged; generated runtime synchronization and unchanged TSTS validate the committed tree. Rules, versions, manifests, adapters and registry checks pass. Three pending CLI/interface traceability gaps remain; full campaign unit/native acceptance and obligations 58–69 remain open. Historical certificates are preserved without freshness renewal.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configuration.

## node --test dist/tests/rolling-codex.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js

2026-10-11T23:49:38.171Z – 2026-10-11T23:49:39.603Z

~~~text
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (48.850875ms)
✔ terminal notifications supersede an earlier in-progress history response (41.077208ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (165.382542ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (42.998042ms)
  ✔ malformed (38.504584ms)
✔ lost or malformed responses reject all affected pending operations (81.861792ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (44.139709ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (39.947334ms)
✔ archive recovery uses paginated exact-checkout inventory and rejects an escaped physical root (41.328834ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.261041ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (92.849833ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.30875ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.466708ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.229542ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.316083ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (809.151167ms)
✔ retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup (532.188ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.603292ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1393.878542

~~~

## node --test '--test-name-pattern=worker retirement revokes' dist/tests/rolling-campaign-store.integration.test.js

2026-10-11T23:49:39.619Z – 2026-10-11T23:49:45.831Z

~~~text
Successfully rebased and updated refs/heads/ponytail/worker-101/15dac9dd-25f2-413c-a041-af2494812a7a.
✔ worker retirement revokes native ownership and fences checkout release through restartable cleanup (6053.954666ms)
ℹ component submission revision=ae827a7ea069324f853c104b7fb5a31358e21a5f; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6179.2345

~~~

## node --test '--test-name-pattern=live worker acknowledges retirement' dist/tests/rolling-codex.integration.js

2026-10-11T23:49:45.848Z – 2026-10-11T23:50:03.186Z

~~~text
✔ live worker acknowledges retirement, becomes idle and reconciles archival of the same actor (17240.387625ms)
ℹ native retirement thread=01a12d5f-59ac-7812-a218-acaba2f09073; session=01a12d5f-59ac-7812-a218-acaba2f09073; terminal notification=01a12d5f-7750-7501-8a46-b579ba15bd56; idle verified; archived inventory confirms the exact actor without another turn
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 17301.33775

~~~

## npm run check:tsts

2026-10-11T23:50:03.204Z – 2026-10-11T23:50:05.102Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1182 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-11T23:50:05.116Z – 2026-10-11T23:50:05.153Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-11T23:50:05.168Z – 2026-10-11T23:50:05.200Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-11T23:50:05.215Z – 2026-10-11T23:50:05.245Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-11T23:50:05.259Z – 2026-10-11T23:50:05.291Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-11T23:50:05.305Z – 2026-10-11T23:50:05.337Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-11T23:50:05.352Z – 2026-10-11T23:50:05.382Z

~~~text
Validated 39 registry entries.

~~~

## Reused strict compilation

Relevant product inputs are unchanged since this passing configured build; compiled output synchronization is checked above.

~~~text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


~~~
