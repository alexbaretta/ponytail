# Typed sprint path ownership completion proof

Exact clean revision 42a204aba237cfad09c9e28e4feb99cf4c1b2dbd; OBL-88 and OBL-89 retain their original
conditions and criteria under BIND-10 and BIND-11. Each has a distinct frozen
standalone lease and certificate. No worker or PostgreSQL delivery is simulated.

OBL-88: exact V1 fixtures establish transitive ordering, permitted ordered
sharing and rejected unordered overlap. Successful and rejected validation
leave the complete serialized sprint values unchanged.

OBL-89: actual typed V3 tasklet files establish unordered overlap rejection,
ordered sharing and planning-only exemption without a tasklet file. Successful
and rejected validation leave both serialized sprint values and all existing
tasklet file bytes unchanged. Strong compilation and unchanged TSTS cover
the canonical owner and exact typed fixtures. Existing generated runtime and
artifact classification remain synchronized; the earlier handwritten fixture
suite has already been converted to checked TypeScript.

Command: node --test dist/tests/sprint-graph.test.js dist/tests/ready-sprints.test.js tests/campaign-census.test.js

34 passes, zero failures/skips/cancellations. Original V1 preparations record
inspection of proof. Prior committed edits are separately authorized by the
frozen bindings. Other selector and CLI obligations remain separate.

```text
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (2.16825ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.231375ms)
✔ selects one V1 sprint and retains unordered-path validation (0.266083ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.160334ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (2.4235ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.114917ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (114.477375ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (40.025333ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.526333ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.180334ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (1.094792ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.367416ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (2.828708ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (47.077208ms)
✔ campaign graph exposes detailed planning review without an execution lease (20.566584ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (249.261625ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (141.210375ms)
✔ campaign report and graph accept an initial planning-only sprint (129.469ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (96.414ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.515959ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.472125ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.568667ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (88.658959ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (479.705208ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (167.641ms)
✔ omitted report input requires exactly one campaign containing active plans (101.349208ms)
✔ bare plan names fail explicitly when missing or ambiguous (28.599167ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (61.075375ms)
✔ selected campaign validates direct dependency membership and cycles (25.941041ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (28.788625ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (83.465709ms)
✔ V1 report reader rejects unknown output fields (70.443833ms)
✔ production module uses exact exit and stream contracts without mutation (754.871625ms)
✔ ponytail dispatches campaign reporting through the production module (2637.000417ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5324.581875

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 932 files: no violations found.
```
