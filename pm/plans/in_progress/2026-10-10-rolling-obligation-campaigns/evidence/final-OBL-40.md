# Final delivery assessment: OBL-40

Source revision: d237877cebac100b0deb996f3015cfe4d0186ee2. Baseline: BASELINE-16. Binding: BIND-164.

Condition: Recover an identical provisioning intent without creating a second checkout; retain failed setup ownership.

Criterion: Git worktree Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

A real ordinary Git worktree Arc replays the identical provisioning intent and obtains the original checkout/branch without another creation. A failed configured setup remains visible in the managed pool with its ownership rather than being reset or deleted.

Nineteen focused cases passed on this exact clean source revision: fifteen typed adapter/worker tests, three actual native cases and one real Git provisioning-intent Arc. Unchanged TSTS checked 1,303 files without violations. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-codex.test.js dist/tests/rolling-worker.test.js

2026-10-12T08:08:46.459901+00:00 – 2026-10-12T08:09:22.732569+00:00

~~~text
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (48.058958ms)
✔ terminal notifications supersede an earlier in-progress history response (40.973875ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (167.151209ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (49.843708ms)
  ✔ malformed (40.445625ms)
✔ lost or malformed responses reject all affected pending operations (90.731ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (42.089833ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (41.119375ms)
✔ archive recovery uses paginated exact-checkout inventory and rejects an escaped physical root (40.607792ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.266584ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (92.369333ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.215375ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.41225ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.208333ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.290416ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 515.653584

~~~

## node --test '--test-name-pattern=native App Server starts|live worker provisioning binds|live attached worker receives' dist/tests/rolling-codex.integration.js

2026-10-12T08:09:25.807782+00:00 – 2026-10-12T08:12:09.302840+00:00

~~~text
✔ native App Server starts and resumes the same session in the designated existing checkout (24238.438625ms)
ℹ {"timestamp":"2026-10-12T08:09:26.122344Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T08:09:26.122385Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T08:09:26.851247Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T08:09:26.851281Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12f28-cf4a-76b0-86a0-253bbee454e4; session=01a12f28-cf4a-76b0-86a0-253bbee454e4; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-VOZRJ0; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (19310.980667ms)
ℹ {"timestamp":"2026-10-12T08:09:54.198334Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T08:09:54.198370Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native lifecycle thread/status/changed; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn={"id":"01a12f29-3da3-7fc2-bb9a-f8e04fc5123c","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn={"id":"01a12f29-3da3-7fc2-bb9a-f8e04fc5123c","status":"completed"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn=null; activity={"type":"idle"}
ℹ worker native thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; session=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-aGOnXX/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ native lifecycle thread/status/changed; thread=01a12f29-3cf3-7e02-af4b-6bd0fc98a7d0; turn=null; activity={"type":"notLoaded"}
✔ live attached worker receives exact obligation, traceability, frozen lease and QA instructions (119755.793417ms)
ℹ {"timestamp":"2026-10-12T08:10:13.253202Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T08:10:13.253246Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn={"id":"01a12f29-8804-70b3-b81a-69d19d6ce7c5","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn={"id":"01a12f29-8804-70b3-b81a-69d19d6ce7c5","status":"completed"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn={"id":"01a12f29-b163-71f2-a736-b4f6541c0d61","status":"inProgress"}; activity=null
ℹ worker turn remains active: thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=01a12f29-b163-71f2-a736-b4f6541c0d61; continue observing the same handle
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn={"id":"01a12f29-b163-71f2-a736-b4f6541c0d61","status":"completed"}; activity=null
ℹ worker instruction turn=01a12f29-b163-71f2-a736-b4f6541c0d61; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; final={"schemaVersion":1,"campaignId":"worker-fixture","assignmentId":"e32a923f-68e1-43fc-b710-eb3c78835e50","generation":"fd6a41ea-28a4-4465-97dd-042b92044e23","sessionId":"01a12f29-8763-70a2-a114-d0ee6123c58c","graphDigest":"eab754f8f9606d02174d3b75bdd9b39e21c4b90c3d3b43a576f4c2fc07fc6dbf","revision":"ad38998f1ad716d9405363f7515946a51b3271b8","baseCommit":"ad38998f1ad716d9405363f7515946a51b3271b8","stopped":true,"proof":[{"operation":"test","evidence":{"command":"node --test fixture.test.ts","selection":["fixture unit","fixture integration"],"target":{"identity":"local","profile":"fixture","verification":"tmp/verification.json"},"revision":"ad38998f1ad716d9405363f7515946a51b3271b8","dirty":false,"startedAt":"2026-10-12T01:11:49.463750-07:00","completedAt":"2026-10-12T01:11:49.569567-07:00","outcome":"pass","skips":0,"failures":0,"inputs":[{"path":"fixture.ts","digest":"65d570a60297d35424dbd6002fd49adebc1ba796119a76c0344eef768080d073"},{"path":"fixture.test.ts","digest":"ff91dd23a8591ebd4f1db54ac03e52577aa369ea9a282de07eb7d3e54a0244a5"},{"path":"pm/requirements/rolling-campaigns.md","digest":"7259dad587a8117e4c6e4f365736dac8157f9eb3cfaa2b9e62f7960b0c1d96a7"},{"path":".agents/config/project/rolling-campaigns.json","digest":"483357dc3ead996e301a3f35a8b83e8c2e7bd80c047bdf8ecaf95e41ca204af5"},{"path":"bindings.json","digest":"909e3f3df85154e6c1e1066a74624fe069e944b777b8603d427a935e1a2c605d"},{"path":"obligations.json","digest":"53ddee9fd8f9b2ff1b04abe3a9039e84ca26ffbb2ce022db73e8475939ce242e"},{"path":"history.json","digest":"0eed7af516da0d092c60e6488d4561a02f8fc669fb0ab6706d57eb519b58d273"},{"path":".gitignore","digest":"005bfc7eea8071a2a03ca57d8f915cf80b2d19dda6e4a2565d26dc6f5c136dfe"},{"path":"tmp/responsibility.txt","digest":"ba5fa364084f015276c361b4d6abd9e0bcc235f7254dd4126c3158eff015b948"},{"path":"tmp/focused.txt","digest":"960a58f7e5f38e8d879f2928d1e70195d7c46759dda5b315a330e2fcca974072"},{"path":"tmp/verification.json","digest":"1254d8b8548f876c76f6dda8dbcd7bff8baef90b0096e97dc994f8f78de9b3fc"}],"outputPath":"tmp/focused.txt","finalization":"pass"}}]}
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"idle"}
ℹ worker native thread=01a12f29-8763-70a2-a114-d0ee6123c58c; session=01a12f29-8763-70a2-a114-d0ee6123c58c; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-ddc4oh/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ native lifecycle thread/status/changed; thread=01a12f29-8763-70a2-a114-d0ee6123c58c; turn=null; activity={"type":"notLoaded"}
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 163465.489917

~~~

## node --test '--test-name-pattern=ordinary Git pool setup' dist/tests/rolling-worktrees.integration.test.js

2026-10-12T08:11:43.419348+00:00 – 2026-10-12T08:11:44.281224+00:00

~~~text
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (780.017208ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 831.542708

~~~

## npm run check:tsts

2026-10-12T08:09:40.433224+00:00 – 2026-10-12T08:09:42.770072+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1303 files: no violations found.

~~~
