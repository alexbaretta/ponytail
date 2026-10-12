# Typed sprint selectors and CLI completion proof

Exact clean revision 08c13fc9ee4e19151473ae61bfc3f0b21bd140cf; OBL-90 through OBL-95 retain their original
conditions and criteria under BIND-12 through BIND-17. Each has an independently
frozen standalone lease and certificate; these are not parallel worker leases.
No live campaign review/publication or replacement CLI operation is inferred.

OBL-90: planning selection returns the first eligible STUB, blocks an
unapproved prerequisite, and selects the dependent after approval. Both blocked
and successful selections leave input values unchanged.
OBL-91: detailed planning review selects only an unapproved detailed sprint
with approved prerequisites and null execution; execution-bearing candidates
are excluded.
OBL-92: execution readiness preserves V1 dependency readiness, V2 earliest
reviewed checkpoint ordering/blocking, and V3 reviewed dependency readiness.
OBL-93: V3 runnable selection prefers existing IN_PROGRESS work and retains
review, approval, dependency and completed-state gates.
OBL-94: V3 execution review selects approved pending unreviewed tasklets with
completed dependencies and defers while execution is active.
OBL-95: actual generated Node CLI invocations preserve exact planning,
execution and completion JSON, grammar errors and exit statuses. Sprint and
tasklet bytes remain unchanged on execution and completion.

All selector functions are exercised against the canonical readonly values,
with unchanged value snapshots and identity-map references. Existing actual
ordered/unordered sharing and literal path regressions remain passing.
The entire fixture owner is checked TypeScript; no handwritten JavaScript,
casts, weak fixtures or checker extensions were introduced. Strong root
compilation and unchanged TSTS cover the canonical implementation and fixtures.
Generated runtime and classification mappings remain synchronized.

Command: node --test dist/tests/ready-sprints-cli.test.js dist/tests/sprint-metadata.test.js dist/tests/sprint-graph.test.js dist/tests/ready-sprints.test.js tests/campaign-census.test.js

45 passes, zero failures/skips/cancellations. Original V1 preparations record
inspection. Prior committed proof edits are separately authorized by the
frozen bindings; delivery assessment uses existing standalone coordinator
authority and the actual clean local command, not simulated worker evidence.

```text
✔ generated sprint CLI preserves planning, execution and completion JSON (130.818208ms)
✔ native sprint CLI preserves grammar error output and exit status (37.689292ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (2.257417ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.310542ms)
✔ selects one V1 sprint and retains unordered-path validation (0.271292ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.165667ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (2.388625ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.130042ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.0965ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.11075ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (85.523125ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (36.217333ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.480083ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.126958ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (1.048375ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.382625ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (2.490833ms)
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.426041ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (0.887583ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.257875ms)
✔ physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged (0.156375ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.256834ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (2.825875ms)
✔ discovery preserves homogeneous physical collections and files and rejects absent or empty collections (2.601292ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (26.735875ms)
✔ campaign graph exposes detailed planning review without an execution lease (18.808792ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (241.19525ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (139.224541ms)
✔ campaign report and graph accept an initial planning-only sprint (133.425792ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (95.924875ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.7605ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (17.495333ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.654959ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (88.431084ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (698.244417ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (335.892042ms)
✔ omitted report input requires exactly one campaign containing active plans (126.198625ms)
✔ bare plan names fail explicitly when missing or ambiguous (34.122167ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (70.472792ms)
✔ selected campaign validates direct dependency membership and cycles (33.39825ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (37.591167ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (117.91425ms)
✔ V1 report reader rejects unknown output fields (142.505ms)
✔ production module uses exact exit and stream contracts without mutation (1241.769667ms)
✔ ponytail dispatches campaign reporting through the production module (2220.60375ms)
ℹ tests 45
ℹ suites 0
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5917.513041

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 936 files: no violations found.
```
