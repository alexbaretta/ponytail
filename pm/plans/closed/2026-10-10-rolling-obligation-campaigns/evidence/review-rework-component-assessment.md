# First execution batch: rework component proof

The agreed first batch is OBL-72 and OBL-51 through OBL-55. OBL-72 was independently discharged in CERT-85/CHECKPOINT-121 before new source edits. Execution grouping shares setup and verification; each atomic condition retains its own certificate. Later groups remain OBL-56–59, OBL-60–63 and OBL-64–69. Complete started work first.

OBL-51 remains in progress. Its exact authority is BIND-47. Rejected work now returns through the original retained worker's stopped/resumed lifecycle, opens capacity while inactive, receives the immutable findings, uses a new generation, and retains its original reviewer. A retry after the stop record was committed reuses that observation. Ordinary suspension still requires blockers. The real PostgreSQL/control-protocol Arc verifies the original session, assignment and checkout, fresh generation, immutable prior verdict after restart, and refusal of a different reviewer. This component scenario resubmits an unchanged candidate; it does not establish the required native code-correction/semantic-rebase/re-review Arc and awards no OBL-51 discharge.

Build and generated runtime checks pass. Unchanged TSTS checks 1056 files. Focused unit proof has 10 passes; the complete controlled store selection has 9 passes. All have zero failures, cancellations and skips. The generated reverse view is synchronized, but traceability still reports the six known publication/interface coverage gaps. Final full QA and campaign acceptance are outstanding.

The binding amendment and source changes make earlier input-bound proof stale. Preserve accepted history and count historical delivery separately from current certificate freshness; renew adequate proof on the reconciled batch tree rather than presenting old native proof as current.

Command: npm run build

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js

```

Command: npm run check:tsts

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1056 files: no violations found.
```

Command: node --test dist/tests/rolling-worker.test.js dist/tests/rolling-review.test.js

```text
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.089084ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.21175ms)
✔ review completion requires the exact terminal turn and validated final message (0.474542ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.31475ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.100333ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.931375ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (93.306083ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.418625ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.453708ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.199917ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 149.765292
```

Command: node --test dist/tests/rolling-campaign-store.integration.test.js

```text
✔ native code fixture approvals permit exact shell-wrapped commands only for the assigned checkout and turn (0.474791ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3989.251959ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3594.678667ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3773.321542ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1798.497792ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (2185.571333ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2680.346958ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=d577403291883501c9ecd7da08d4e7b3ea88eb27; generation=f109de2e-c11f-4bf2-9dd6-d105acb30ba8; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (1904.8605ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ submission collection binds terminal idle actor and exact passing candidate before review (3002.327125ms)
ℹ component submission revision=32a883fdce60f2e7e000f13ab11ecf57e3017022; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 23092.848459
```

Command: node dist/scripts/build-runtime.js --check

```text
```

Command: node scripts/check-rule-copies.js

```text
8 rule copies match skills/ponytail/SKILL.md.
```

Command: node scripts/check-versions.js

```text
All 7 version files pinned at 4.8.4.
```
