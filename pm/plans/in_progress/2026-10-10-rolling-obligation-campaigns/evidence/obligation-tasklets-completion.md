# Typed adopted obligation tasklet execution completion

Exact clean revision b966e18842f7b5681c77474ad53b06ba037941a6. OBL-105 through OBL-106 preserve their original
conditions and discharge criteria, with append-only BIND-26 through BIND-27.
Each has its own frozen standalone lease and bound certificate. These records
use existing standalone coordinator authority and actual executed local proof;
they do not represent PostgreSQL worker leases or live campaign submissions.

OBL-105: adopted scope binds the owning plan and exact subordinate tasklet
paths; foreign ownership selects no edits, unknown assigned tasklets and path
escape reject. No-edit assessment remains eligible while edit tasks are pending.
Immutable document successors, graph snapshots and status snapshots establish
non-mutation across success and rejection.
OBL-106: actual generated Node CLI requires the configured adopted document
and root, preserves exact complete JSON for selected and completed tasklets,
and keeps the obligation unresolved after DONE edits. The document bytes remain
unchanged. Existing grammar and configured-document mismatch tests pass.

The three historically handwritten adopted selector cases moved to checked
TypeScript; unrelated legacy ledger tests remain and still pass. The canonical
shared fixture now has exact static obligation, plan, sprint and tasklet types,
with a generated JavaScript compatibility copy. No weak declaration shim, cast,
checker extension or copied fixture contract was introduced. Strong compilation,
unchanged TSTS, project command paths and reverse traceability are synchronized.

Command: node --test dist/tests/obligation-tasklet-execution.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/ready-tasklets.test.js tests/obligation-execution.test.js tests/obligation-execution.integration.test.js tests/campaign-census.test.js

56 passes; no failures, skips or cancellations. The 37-test metadata and
51-test graph selections also passed in renewal. Original V1
checkpoint preparation retains inspection semantics; committed proof edits
were separately authorized by frozen append-only bindings.

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (114.542291ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (85.519041ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (79.513791ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (198.369125ms)
✔ generated portable launch path preserves scalar selection and exact completion output (80.873541ms)
✔ adopted owning plans require their configured obligation document (79.984958ms)
✔ retains strict physical V1 parsing and scalar selection (41.925167ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (6.264459ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (8.650042ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (7.365792ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (7.56425ms)
✔ selects the highest-ranked V2 tasklet (9.434167ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (4.337291ms)
✔ blocks tasklets until dependency-feature validation is complete (4.470625ms)
✔ uses prior affinity and graph criteria deterministically (1.697542ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (44.544459ms)
✔ V3 returns one complete ordered batch (1.690291ms)
✔ V3 bounds a batch while V2 selects one tasklet (3.359834ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (9.3555ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (25.128584ms)
✔ campaign graph exposes detailed planning review without an execution lease (18.18125ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (251.973166ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (138.471ms)
✔ campaign report and graph accept an initial planning-only sprint (127.954375ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (94.121875ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.604792ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.932625ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.236917ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (88.878708ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (456.149417ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (170.509709ms)
✔ omitted report input requires exactly one campaign containing active plans (111.382958ms)
✔ bare plan names fail explicitly when missing or ambiguous (30.74175ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (64.6955ms)
✔ selected campaign validates direct dependency membership and cycles (31.710459ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (33.680333ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (99.6515ms)
✔ V1 report reader rejects unknown output fields (73.437625ms)
✔ production module uses exact exit and stream contracts without mutation (683.967291ms)
✔ ponytail dispatches campaign reporting through the production module (1822.906625ms)
▶ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI
  ✔ Step 1: canonical glossary and unresolved legacy DONE (124.169875ms)
  ✔ Step 2: frozen assignment and candidate delivery never discharge (188.252166ms)
  ✔ Step 3: bounded neutral preparation and honest productive downstream growth (392.317208ms)
  ✔ Step 4: complete inventories and no-edit assessments reach zero (982.6915ms)
  ✔ Step 5: stale inputs reopen original identities and require disturbance (371.152042ms)
  ✔ Step 6: activated successor preserves IDs and old unresolved history (296.7015ms)
✔ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI (2459.916375ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (116.942709ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1505.188917ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (246.861875ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (270.493667ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (115.144584ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.320042ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (279.675042ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.301458ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (229.2185ms)
ℹ tests 56
ℹ suites 0
ℹ pass 56
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4429.382375

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 961 files: no violations found.
```
