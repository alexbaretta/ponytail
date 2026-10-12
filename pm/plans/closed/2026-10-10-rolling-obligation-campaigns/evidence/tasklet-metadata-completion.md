# Physical tasklet reader completion

Exact clean revision 6790bdfbf53d49530b6c17900db8126278879d65. OBL-96 through OBL-100 preserve their original
conditions and discharge criteria, with append-only BIND-18 through BIND-22.
Each has its own frozen standalone lease and bound certificate. These records
use existing standalone coordinator authority and actual executed local proof;
they do not represent PostgreSQL worker leases or live campaign submissions.

OBL-96: V1 preserves scalar selection, normalized tasklet maps and absence of
feature metadata. The typed registry and actual generated Node CLI preserve
exact output; reader snapshots remain unchanged.
OBL-97: V2 preserves feature/tasklet maps, high-risk reasons, paths and feature
membership. Unknown physical inputs with missing reason, unsupported fields,
invalid paths or ownership reject. Successful reads and rejection snapshots
remain unchanged; typed V2 graph and selection regressions pass.
OBL-98: V3 preserves V2 normalized maps under its own physical reader and
returns ordered, bounded batches. Literal bracket paths remain exact; invalid
paths reject. Input snapshots remain unchanged.
OBL-99: V4 preserves local V3 selection and external plan/tasklet identities;
unknown owners, duplicate external edges and invalid external types reject.
Physical values remain unchanged.
OBL-100: actual file dispatch uses each declared physical version. Unknown
versions, malformed JSON and invalid filename grammar reject; supported and
rejected file reads leave their bytes unchanged. Completion returns exact
JSON without mutating sprint or metadata files.

All historical regression cases remain in tests/ready-tasklets.test.ts with
canonical statically checked fixtures and immutable successors. Strict root
compilation and unchanged TSTS cover production readers and all owned fixtures.
Project command paths, traceability classification and generated runtime are
synchronized. No checker extension, cast or type bypass was introduced.

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

37 passes; no failures, skips or cancellations. The additional complete typed
parser/graph/selection/CLI regression selection passed 20 tests. Original V1
checkpoint preparation retains inspection semantics; committed proof edits
were separately authorized by frozen append-only bindings.

```text
✔ retains strict physical V1 parsing and scalar selection (42.042875ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (4.712792ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (6.616708ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (4.534917ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (4.008542ms)
✔ selects the highest-ranked V2 tasklet (8.438334ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (2.764291ms)
✔ blocks tasklets until dependency-feature validation is complete (3.349792ms)
✔ uses prior affinity and graph criteria deterministically (0.978ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (38.771375ms)
✔ V3 returns one complete ordered batch (1.347958ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.324958ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (6.970042ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.406083ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.417708ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.808209ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (21.702792ms)
✔ campaign graph exposes detailed planning review without an execution lease (16.736083ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (224.114541ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (128.528958ms)
✔ campaign report and graph accept an initial planning-only sprint (117.266416ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (85.22775ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.633667ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.937ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.473084ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (84.779417ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (451.2075ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (157.840542ms)
✔ omitted report input requires exactly one campaign containing active plans (100.799917ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.678875ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (61.122875ms)
✔ selected campaign validates direct dependency membership and cycles (29.608459ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (29.597ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (88.496125ms)
✔ V1 report reader rejects unknown output fields (71.422333ms)
✔ production module uses exact exit and stream contracts without mutation (693.801583ms)
✔ ponytail dispatches campaign reporting through the production module (1907.970458ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4400.899875

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 945 files: no violations found.
```
