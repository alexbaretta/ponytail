# Final delivery assessment: OBL-59

Source revision: 5a31cc7f07c82c54800e9c4379722265fb39e38e. Baseline: BASELINE-16. Binding: BIND-183.

Condition: Flush a nonempty partial publication batch at explicit flush, completion or quiescence.

Criterion: Partial publication Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Explicit flush, verified completion and verified quiescence freeze a nonempty partial publication batch below M. Typed and PostgreSQL proof rejects an empty batch, keeps the accepted prefix immutable and verifies the completion/quiescence triggers against current state.

Fourteen focused typed binding/worker/publication cases, seven real PostgreSQL correction/acceptance/retirement/publication workflows and two native same-actor correction/retirement workflows passed on this exact clean source revision. Unchanged TSTS checked 1,419 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-worker.test.js dist/tests/rolling-publication.test.js dist/tests/obligation-certificate-bindings.test.js

2026-10-12T09:58:53.703037+00:00 – 2026-10-12T09:59:10.268891+00:00

~~~text
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (4017.898708ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (4164.946041ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (4078.735042ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (4120.7045ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.062833ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.140792ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (115.428042ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.792541ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.2285ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (104.608166ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.256083ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.42275ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.223041ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.269708ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16536.278958

~~~

## node --test '--test-name-pattern=substantive integration repair|integrated certificate assessment|worker retirement|publication batch freezes|publication partial flush|publication threshold uses' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T09:58:55.987659+00:00 – 2026-10-12T10:00:03.812428+00:00

~~~text
Successfully rebased and updated refs/heads/ponytail/worker-101/73f9f2d8-c082-44f8-a654-8788b8316d45.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (8837.23425ms)
ℹ component submission revision=68b34bcf4e0c19863e42c725a1f13793dcccf9a5; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (10453.517958ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/0da66a91-3982-4590-b304-6516481c9f43.
✔ worker retirement revokes native ownership and fences checkout release through restartable cleanup (8058.11725ms)
ℹ component submission revision=1f8b3365e8af25adafcfab8d0b924d038d454fb5; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ publication batch freezes one shared partial claim across concurrent requests and restart (11051.092333ms)
✔ publication partial flush follows verified completion state (9928.881ms)
✔ publication partial flush follows verified quiescence state (9750.944209ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (9538.842667ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 67792.879083

~~~

## node --test '--test-name-pattern=live rejected candidate|live worker acknowledges retirement' dist/tests/rolling-codex.integration.js

2026-10-12T10:00:27.575961+00:00 – 2026-10-12T10:04:46.819776+00:00

~~~text
✔ live rejected candidate returns to its original worker and is accepted by its original reviewer after correction and semantic rebase (240078.230875ms)
ℹ {"timestamp":"2026-10-12T10:00:32.052221Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T10:00:32.052275Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native fixture identity thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; root=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-WTcJfT/managed/101
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn={"id":"01a12f8e-86c3-7a12-ada4-4962ce697ddf","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn={"id":"01a12f8e-86c3-7a12-ada4-4962ce697ddf","status":"completed"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn={"id":"01a12f8e-a9b8-7450-ab30-5693d0787681","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn={"id":"01a12f8e-a9b8-7450-ab30-5693d0787681","status":"completed"}; activity=null
ℹ native rejected review: {"request":{"schemaVersion":1,"id":"2f961d79-1a62-47b8-8efe-4477479d0813","campaignId":"worker-fixture","assignmentId":"8e61a30b-ee8a-445b-a2b1-0cbb2f7f6ce2","generation":"fc6e579d-281c-4412-8796-4c20567249fd","baseCommit":"37a330f691aa84e036b3d4b7ea7d947e06fa3510","revision":"56c09a7f1d7f797753e7aa8e98b4a07f0c25050d","reviewerSessionId":"01a12f8e-a861-7d42-b465-36eaad06eb5c"},"outcome":{"schemaVersion":1,"reviewId":"2f961d79-1a62-47b8-8efe-4477479d0813","revision":"56c09a7f1d7f797753e7aa8e98b4a07f0c25050d","reviewerSessionId":"01a12f8e-a861-7d42-b465-36eaad06eb5c","completedAt":"2026-10-12T03:01:19.898-07:00","decision":"rejected","findings":["fixture.ts:1: Exported value is 3, violating OBL-2's required value 2; an independent requirement assertion fails. Change the value to 2.","fixture.test.ts:4: The unit test expects 3 and therefore passes despite the requirement violation. Change the expectation to 2 and preserve the integration invariant.","pm/requirements/rolling-campaigns.md:3: The required semantic rebase is not established: candidate history contains only the seed commit, and tmp/original-commit.txt and tmp/semantic-rebase.txt are absent. Perform the authorized fresh fetch and interactive rebase, inspect and run focused QA at both replay stops, and retain the original SHA and actual rebase and inspection output.","tmp/seed-focused.txt:1: Submission proof uses this file instead of required tmp/focused.txt and omits hashes for the required retained rebase outputs. After correcting and rebasing the candidate, retain final TAP output at tmp/focused.txt and submit fresh evidence and hashes covering both source files and all required retained outputs."]}}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn={"id":"01a12f8f-6f5f-7533-80b1-77973306ac95","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":["waitingOnApproval"]}
ℹ native QA approval method=item/commandExecution/requestApproval; decision=accept exact fixture command; request={"kind":"command","threadId":"01a12f8e-860d-7561-afd1-2fc0eb93098c","turnId":"01a12f8f-6f5f-7533-80b1-77973306ac95","itemId":"exec-f20035a2-b9d0-4846-b0c6-d901f1b23a2f","startedAtMs":{"isLosslessNumber":true,"value":"1791799328046"},"environmentId":"local","reason":"Allow the required fresh fetch of origin campaign/worker-fixture into shared Git metadata?","command":"/opt/homebrew/bin/bash -lc 'git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1'","cwd":"/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-WTcJfT/managed/101","commandActions":[{"type":"unknown","command":"git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1"}],"proposedExecpolicyAmendment":["/opt/homebrew/bin/bash","-lc","git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1"],"availableDecisions":["accept",{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["/opt/homebrew/bin/bash","-lc","git fetch origin campaign/worker-fixture > tmp/fetch.txt 2>&1"]}},"cancel"]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":["waitingOnApproval"]}
ℹ native QA approval method=item/commandExecution/requestApproval; decision=accept exact fixture command; request={"kind":"command","threadId":"01a12f8e-860d-7561-afd1-2fc0eb93098c","turnId":"01a12f8f-6f5f-7533-80b1-77973306ac95","itemId":"exec-81ca250c-3f5c-404c-9eca-20c788947419","startedAtMs":{"isLosslessNumber":true,"value":"1791799335857"},"environmentId":"local","reason":"Allow the required interactive rebase using the configured checked editor, stopping at each of the two commits?","command":"/opt/homebrew/bin/bash -lc 'git rebase -i origin/campaign/worker-fixture > tmp/semantic-rebase.txt 2>&1'","cwd":"/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-WTcJfT/managed/101","commandActions":[{"type":"unknown","command":"git rebase -i origin/campaign/worker-fixture > tmp/semantic-rebase.txt 2>&1"}],"proposedExecpolicyAmendment":["/opt/homebrew/bin/bash","-lc","git rebase -i origin/campaign/worker-fixture > tmp/semantic-rebase.txt 2>&1"],"availableDecisions":["accept",{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["/opt/homebrew/bin/bash","-lc","git rebase -i origin/campaign/worker-fixture > tmp/semantic-rebase.txt 2>&1"]}},"cancel"]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ worker turn remains active: thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=01a12f8f-6f5f-7533-80b1-77973306ac95; continue observing the same handle
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":["waitingOnApproval"]}
ℹ native QA approval method=item/commandExecution/requestApproval; decision=accept exact fixture command; request={"kind":"command","threadId":"01a12f8e-860d-7561-afd1-2fc0eb93098c","turnId":"01a12f8f-6f5f-7533-80b1-77973306ac95","itemId":"exec-07a81650-d3d4-4a49-bd72-8ae1853029c4","startedAtMs":{"isLosslessNumber":true,"value":"1791799353039"},"environmentId":"local","reason":"Allow continuing to the second replay stop after inspecting the seed patch and passing focused build and tests?","command":"/opt/homebrew/bin/bash -lc 'git rebase --continue >> tmp/semantic-rebase.txt 2>&1'","cwd":"/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-WTcJfT/managed/101","commandActions":[{"type":"unknown","command":"git rebase --continue >> tmp/semantic-rebase.txt 2>&1"}],"proposedExecpolicyAmendment":["/opt/homebrew/bin/bash","-lc","git rebase --continue >> tmp/semantic-rebase.txt 2>&1"],"availableDecisions":["accept",{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["/opt/homebrew/bin/bash","-lc","git rebase --continue >> tmp/semantic-rebase.txt 2>&1"]}},"cancel"]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":["waitingOnApproval"]}
ℹ native QA approval method=item/commandExecution/requestApproval; decision=accept exact fixture command; request={"kind":"command","threadId":"01a12f8e-860d-7561-afd1-2fc0eb93098c","turnId":"01a12f8f-6f5f-7533-80b1-77973306ac95","itemId":"exec-2ebe27bb-83ac-45bb-bc5e-1feefa92abec","startedAtMs":{"isLosslessNumber":true,"value":"1791799371743"},"environmentId":"local","reason":"Allow finalizing the rebase after the second commit’s semantic inspection and passing focused build and tests?","command":"/opt/homebrew/bin/bash -lc 'git rebase --continue >> tmp/semantic-rebase.txt 2>&1'","cwd":"/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-WTcJfT/managed/101","commandActions":[{"type":"unknown","command":"git rebase --continue >> tmp/semantic-rebase.txt 2>&1"}],"proposedExecpolicyAmendment":["/opt/homebrew/bin/bash","-lc","git rebase --continue >> tmp/semantic-rebase.txt 2>&1"],"availableDecisions":["accept",{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["/opt/homebrew/bin/bash","-lc","git rebase --continue >> tmp/semantic-rebase.txt 2>&1"]}},"cancel"]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ worker turn remains active: thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=01a12f8f-6f5f-7533-80b1-77973306ac95; continue observing the same handle
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn={"id":"01a12f8f-6f5f-7533-80b1-77973306ac95","status":"completed"}; activity=null
ℹ native corrective worker response: {"schemaVersion":1,"campaignId":"worker-fixture","assignmentId":"8e61a30b-ee8a-445b-a2b1-0cbb2f7f6ce2","generation":"5a560f96-3cd3-4b0f-b2d5-29e4c3c91af6","sessionId":"01a12f8e-860d-7561-afd1-2fc0eb93098c","graphDigest":"e68b1a3614fd3de2a278ffdc779001713712db35dae3673c0a550143ad89cf46","revision":"5de20f54134e20c94c2007353977355f2d2f858c","baseCommit":"8cbfe07b3d7a56b45d23a15cddd1f6a812bbcd10","stopped":true,"proof":[{"operation":"test","evidence":{"command":"node --test --test-reporter=tap fixture.test.ts > tmp/focused.txt 2>&1","selection":["fixture unit","fixture integration"],"target":{"identity":"local","profile":"fixture","verification":"tmp/target-verification.txt"},"revision":"5de20f54134e20c94c2007353977355f2d2f858c","dirty":false,"startedAt":"2026-10-12T03:03:21.470400-07:00","completedAt":"2026-10-12T03:03:21.574875-07:00","outcome":"pass","skips":0,"failures":0,"inputs":[{"path":"fixture.ts","digest":"2d70d6b9667adb3841a01a4733553b466ffdaf2de258596f42d7c14d0f1038ab"},{"path":"fixture.test.ts","digest":"9ed6d98527ea55b5667b0def3ad75d8a176a4dab6a2f0b1710c8bf9dfac8c601"},{"path":"package.json","digest":"7d4c8e5b3e35857b265ecd2219e99070ef4e828bc8d5548f2cf7462d772f11e4"},{"path":"tsconfig.json","digest":"1985699b4930f1cc1601c9f572f15361e135e1ec334a10ada11d413a51c8b55a"},{"path":"ponytail.json","digest":"7a43abd0ca71b4610ade2754921edc600ebc7868833206f8b2d0c53bf7fa4440"},{"path":"pm/requirements/rolling-campaigns.md","digest":"a80dcccf384a7dab813542c2fbc61ebef6fc0e3f0eb0a7f6e27258d40ab95a54"},{"path":"bindings.json","digest":"909e3f3df85154e6c1e1066a74624fe069e944b777b8603d427a935e1a2c605d"},{"path":".agents/config/project/rolling-campaigns.json","digest":"de1e2a49716e509ccffca80ac269a468f19aa5eb86c773244ae6cee17ea4542e"},{"path":"tmp/original-commit.txt","digest":"91375c6058749827df863fd3207049429b4122e4b1fd67c9857c814f9469c54e"},{"path":"tmp/original-series.txt","digest":"bcd799ca09ed0b0714f5a386aac030b3ba74c8b2bdbfe3d1bcdfc040ad73dbd1"},{"path":"tmp/fetch.txt","digest":"2bf3ad02c466c7e858437238a278ccefc269c0141918444fa670e5d689de3760"},{"path":"tmp/semantic-rebase.txt","digest":"e0e08b909d6e85732a062cbef357138bae052a552e48f0be07b8ece9c9bfe15e"},{"path":"tmp/build-impact.txt","digest":"52660dd633c5d27cba3ae4b8b26a8792e700e10f2ae50ff93c8cf413419e0475"},{"path":"tmp/target-verification.txt","digest":"79613588f15bc0dcc5bf02806dba9dece80f9974b35e20c00265d2b51a5b888d"},{"path":"tmp/focused.txt","digest":"71dcb6b775753c25a0745cdbffa3f09d8a94f297e9414eaf7bcac64fa039c0a6"},{"path":"tmp/focused-metadata.json","digest":"89803813787739ee9c3f7672f7b0cff71f767183920799dceb24494f98ca651f"}],"outputPath":"tmp/focused.txt","finalization":"pass"}}]}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"active","activeFlags":[]}
ℹ native lifecycle turn/started; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn={"id":"01a12f91-6e2e-7b22-ac41-9d336d887770","status":"inProgress"}; activity=null
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"idle"}
ℹ native lifecycle turn/completed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn={"id":"01a12f91-6e2e-7b22-ac41-9d336d887770","status":"completed"}; activity=null
ℹ native corrective semantic rebase: Rebasing (1/2)Stopped at 56c09a7...  # Seed incorrect candidate for native review
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue

STOP 1 semantic inspection: original seed changes 1 to 3 with matching unit expectation; this historical intermediate commit preserves the integer invariant. New base adds only upstream.txt, so no semantic conflict exists. The next correction commit establishes OBL-2 value 2.

startedAt=2026-10-12T03:02:29.061736-07:00
command=git status
interactive rebase in progress; onto 8cbfe07
Last command done (1 command done):
   edit 56c09a7 # Seed incorrect candidate for native review
Next command to do (1 remaining command):
   edit ecae679 # Set fixture value and unit expectation to 2
  (use "git rebase --edit-todo" to view and edit)
You are currently editing a commit while rebasing branch 'ponytail/worker-101/fc6e579d-281c-4412-8796-4c20567249fd' on '8cbfe07'.
  (use "git commit --amend" to amend the current commit)
  (use "git rebase --continue" once you are satisfied with your changes)

nothing to commit, working tree clean
completedAt=2026-10-12T03:02:29.070640-07:00
exit=0

startedAt=2026-10-12T03:02:29.071248-07:00
command=git show HEAD -- fixture.ts fixture.test.ts
commit ba583cd44e2a8b362bb087c8653d27ebab6b9831
Author: Fixture <fixture@example.test>
Date:   Mon Oct 12 03:00:40 2026 -0700

    Seed incorrect candidate for native review

diff --git a/fixture.test.ts b/fixture.test.ts
index 87c5c24..6617166 100644
--- a/fixture.test.ts
+++ b/fixture.test.ts
@@ -1,5 +1,5 @@
 import test from 'node:test';
 import assert from 'node:assert/strict';
 import { value } from './fixture.ts';
-test('fixture unit', () => assert.equal(value, 1));
+test('fixture unit', () => assert.equal(value, 3));
 test('fixture integration', () => assert.equal(Number.isSafeInteger(value), true));
diff --git a/fixture.ts b/fixture.ts
index 13d7f8c..b6270a1 100644
--- a/fixture.ts
+++ b/fixture.ts
@@ -1 +1 @@
-export const value: number = 1;
+export const value: number = 3;
completedAt=2026-10-12T03:02:29.079649-07:00
exit=0

startedAt=2026-10-12T03:02:29.080279-07:00
command=git show origin/campaign/worker-fixture -- upstream.txt
commit 8cbfe07b3d7a56b45d23a15cddd1f6a812bbcd10
Author: Fixture <fixture@example.test>
Date:   Mon Oct 12 03:01:31 2026 -0700

    Independent increment before correction

diff --git a/upstream.txt b/upstream.txt
new file mode 100644
index 0000000..500eec3
--- /dev/null
+++ b/upstream.txt
@@ -0,0 +1 @@
+Preserve this independently published campaign increment.
completedAt=2026-10-12T03:02:29.088575-07:00
exit=0

startedAt=2026-10-12T03:02:29.089179-07:00
command=npm run build

> build
> node node_modules/typescript/bin/tsc --project tsconfig.json

completedAt=2026-10-12T03:02:30.156791-07:00
exit=0

startedAt=2026-10-12T03:02:30.157562-07:00
command=node --test --test-reporter=tap fixture.test.ts
TAP version 13
# Subtest: fixture unit
ok 1 - fixture unit
  ---
  duration_ms: 0.354458
  type: 'test'
  ...
# Subtest: fixture integration
ok 2 - fixture integration
  ---
  duration_ms: 0.063084
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 66.0885
completedAt=2026-10-12T03:02:30.258380-07:00
exit=0
Rebasing (2/2)Stopped at ecae679...  # Set fixture value and unit expectation to 2
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue

STOP 2 semantic inspection: correction changes exported number and unit expectation from 3 to required 2; integration invariant is unchanged. Both replayed hunks match original correction intent. Independent upstream.txt remains intact. No semantic or textual conflict; no amendment required.

startedAt=2026-10-12T03:02:47.975845-07:00
command=git status
interactive rebase in progress; onto 8cbfe07
Last commands done (2 commands done):
   edit 56c09a7 # Seed incorrect candidate for native review
   edit ecae679 # Set fixture value and unit expectation to 2
No commands remaining.
You are currently editing a commit while rebasing branch 'ponytail/worker-101/fc6e579d-281c-4412-8796-4c20567249fd' on '8cbfe07'.
  (use "git commit --amend" to amend the current commit)
  (use "git rebase --continue" once you are satisfied with your changes)

nothing to commit, working tree clean
completedAt=2026-10-12T03:02:47.984499-07:00
exit=0

startedAt=2026-10-12T03:02:47.985148-07:00
command=git show HEAD -- fixture.ts fixture.test.ts
commit 5de20f54134e20c94c2007353977355f2d2f858c
Author: Alex Baretta <alex@baretta.com>
Date:   Mon Oct 12 03:02:05 2026 -0700

    Set fixture value and unit expectation to 2

diff --git a/fixture.test.ts b/fixture.test.ts
index 6617166..2bdfe94 100644
--- a/fixture.test.ts
+++ b/fixture.test.ts
@@ -1,5 +1,5 @@
 import test from 'node:test';
 import assert from 'node:assert/strict';
 import { value } from './fixture.ts';
-test('fixture unit', () => assert.equal(value, 3));
+test('fixture unit', () => assert.equal(value, 2));
 test('fixture integration', () => assert.equal(Number.isSafeInteger(value), true));
diff --git a/fixture.ts b/fixture.ts
index b6270a1..e3f0f4e 100644
--- a/fixture.ts
+++ b/fixture.ts
@@ -1 +1 @@
-export const value: number = 3;
+export const value: number = 2;
completedAt=2026-10-12T03:02:47.993804-07:00
exit=0

startedAt=2026-10-12T03:02:47.994423-07:00
command=npm run build

> build
> node node_modules/typescript/bin/tsc --project tsconfig.json

completedAt=2026-10-12T03:02:49.060019-07:00
exit=0

startedAt=2026-10-12T03:02:49.060784-07:00
command=node --test --test-reporter=tap fixture.test.ts
TAP version 13
# Subtest: fixture unit
ok 1 - fixture unit
  ---
  duration_ms: 0.344667
  type: 'test'
  ...
# Subtest: fixture integration
ok 2 - fixture integration
  ---
  duration_ms: 0.061583
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 66.857792
completedAt=2026-10-12T03:02:49.162312-07:00
exit=0
Successfully rebased and updated refs/heads/ponytail/worker-101/fc6e579d-281c-4412-8796-4c20567249fd.

ℹ native accepted review: {"request":{"schemaVersion":1,"id":"6bf1548f-ace0-4aa4-a98f-3dd9aad004c4","campaignId":"worker-fixture","assignmentId":"8e61a30b-ee8a-445b-a2b1-0cbb2f7f6ce2","generation":"5a560f96-3cd3-4b0f-b2d5-29e4c3c91af6","baseCommit":"8cbfe07b3d7a56b45d23a15cddd1f6a812bbcd10","revision":"5de20f54134e20c94c2007353977355f2d2f858c","reviewerSessionId":"01a12f8e-a861-7d42-b465-36eaad06eb5c"},"outcome":{"schemaVersion":1,"reviewId":"6bf1548f-ace0-4aa4-a98f-3dd9aad004c4","revision":"5de20f54134e20c94c2007353977355f2d2f858c","reviewerSessionId":"01a12f8e-a861-7d42-b465-36eaad06eb5c","completedAt":"2026-10-12T03:04:24.117-07:00","decision":"accepted","findings":[]}}
ℹ native correction Arc worker=01a12f8e-860d-7561-afd1-2fc0eb93098c; original reviewer=01a12f8e-a861-7d42-b465-36eaad06eb5c; rejected=56c09a7f1d7f797753e7aa8e98b4a07f0c25050d; corrected=5de20f54134e20c94c2007353977355f2d2f858c; fresh base=8cbfe07b3d7a56b45d23a15cddd1f6a812bbcd10; two commits replayed; focused QA=2; both verdicts retained after store restart
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"notLoaded"}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-a861-7d42-b465-36eaad06eb5c; turn=null; activity={"type":"notLoaded"}
ℹ native lifecycle thread/status/changed; thread=01a12f8e-860d-7561-afd1-2fc0eb93098c; turn=null; activity={"type":"notLoaded"}
✔ live worker acknowledges retirement, becomes idle and reconciles archival of the same actor (19054.095042ms)
ℹ native retirement thread=01a12f92-1f17-7bc3-968a-eb1cfa0b8d80; session=01a12f92-1f17-7bc3-968a-eb1cfa0b8d80; terminal notification=01a12f92-4208-7d10-9028-a91a4a0dc143; idle verified; archived inventory confirms the exact actor without another turn
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 259220.325916

~~~

## npm run check:tsts

2026-10-12T09:58:57.377306+00:00 – 2026-10-12T09:59:00.028164+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1419 files: no violations found.

~~~
