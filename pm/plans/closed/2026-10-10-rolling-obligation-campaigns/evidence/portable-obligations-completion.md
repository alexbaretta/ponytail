# Typed portable obligation completion

Exact clean revision 9c5dad9fc8178431cad735d0403aaaea427826ef. OBL-77 through OBL-82 preserve their original
conditions and discharge criteria, with append-only BIND-28 through BIND-33.
Each has its own frozen standalone lease and bound certificate. These records
use existing standalone coordinator authority and actual executed local proof;
they do not represent PostgreSQL worker leases or live campaign submissions.

OBL-77: physical V1 preserves its registry and identities, rejects unsupported
fields, reference cycles and numeric token spellings before normalization.
Successful and rejected reads leave the entire input unchanged.
OBL-78: current scoped input hashes, assessor authority, adequacy and complete
finalized execution evidence establish freshness. Changed/missing inputs,
unapproved assessors, failing/skipped/unfinalized execution and wrong command,
selection or target reject. Unrelated files do not invalidate proof.
OBL-79: only accepted certificates satisfy obligations. Changed own inputs
reopen satisfaction; a stale prerequisite also reopens a dependent whose own
certificate remains fresh. Exact vectors, unresolved inventories and authority
gates distinguish zero coordinates from complete scope, without input mutation.
OBL-80: unresolved upstream coordinates cannot be bypassed; a blocked earlier
coordinate reports its exact blocked obligation. Numeric stable identity orders
eligible work, and changed evidence makes the same identity selectable again.
OBL-81: exact predecessor and append-only historical meaning/authority are
required. Productive vectors strictly decrease lexicographically and retain
necessary downstream discoveries; neutral preparation is bounded and cannot
repeat via key reordering. Disturbance honestly records stale proof. Activated
baselines retain old IDs/history; hidden membership and erased history reject.
Entire predecessor/candidate snapshots remain unchanged across acceptance and
rejection.
OBL-82: actual generated Node commands use an explicit document/root. Select
and status return exact complete JSON, valid validation succeeds, invalid data
and unavailable IO/grammar are contained with exact exit codes. Input bytes
remain unchanged. Full zero with all six inventories and the authority gate
establishes completion in the disposable fixture.

All 17 former handwritten cases are now checked TypeScript, with one additional
prerequisite-invalidation proof. Named physical fixtures and immutable updates
use canonical static types; malformed external data is unknown at the parser
boundary. No cast, suppression, weak declaration or checker extension was used.
Command paths, source classification and reverse traceability are synchronized.
The lossless numeric reader and historical V1 contracts are unchanged.

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

31 passes; no failures, skips or cancellations. The 37-test metadata and
51-test graph selections also pass in renewal. Original V1
checkpoint preparation retains inspection semantics; committed proof edits
were separately authorized by frozen append-only bindings.

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (243.421167ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (175.61725ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (129.528958ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (255.663792ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.034875ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (18.227167ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (6.831667ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (9.924375ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (5.883792ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (21.760875ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.273834ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.480167ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (36.777333ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (6.875416ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (4.381333ms)
✔ stale proof forces honest disturbance before new productive acceptance (6.198541ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (4.237917ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (353.5745ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.169667ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (33.949791ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.725167ms)
✔ reader cannot hide declared membership from the accepted current observation (2.447542ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (227.605583ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1575.0275ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (356.283875ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (496.346625ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (162.179292ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.3895ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (369.325042ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.318417ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (282.569666ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3590.64275

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 966 files: no violations found.
```
