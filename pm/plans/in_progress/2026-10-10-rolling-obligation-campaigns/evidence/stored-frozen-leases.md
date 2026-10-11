# Stored frozen lease allocation and retained-owner adoption

Starting revision f3435ec, dirty approved BASELINE-12 inputs. OBL-110's original
identity, condition and criterion are preserved. Coordinator amendment BIND-1
in binding-history.json adds the owning schema adapter after the real PostgreSQL
registration error identified V1-only configuration/scope constraints. This
bounded repair was authorized and declared before its SQL edit. No external
worker assignment through the unfinished application layer was issued.

V2 execution configuration explicitly persists the coordinator history path and
its lease-issuance authority. V2 assignment scope persists the complete portable
frozen lease plus traceability/resource references. Historical V1 readers and
records retain their accepted meanings; no implicit adoption or new mutable
graph copy is stored in PostgreSQL. Existing project pool, assignment, worktree
and action transactions and indexes remain the scheduling authority.

Allocation freezes the actual coordinator graph, accepted binding revision,
generation and exact execution permissions. Resume compares complete bindings
and traceability references, so changed operations with identical paths cannot
silently resume. Store authorization checks the currently accepted graph and
prerequisites while enforcing the worker's original frozen graph identity. An
unrelated accepted graph/HEAD change does not force unchanged owners to restart.
Changed bindings, wrong graph identities/generations, unsupported operations and
out-of-scope changes are rejected.

Rebinding requires an attached non-retired retained owner that has acknowledged
stopped activity and is INACTIVE, with no unresolved external action. It adopts
only the current coordinator-authorized binding, refences generation, retains
session/worktree/blockers and remains inactive. Allocation then resumes that
owner through a new fenced action, retaining its original session and checkout.
It does not clear unresolved blockers or fabricate external completion.

The schema upgrade replaces only the two existing JSON-version constraints
inside the existing BEGIN/COMMIT transaction. Both fresh and existing tables
accept numeric V1/V2 and reject unsupported, missing, null or string versions.
Historical valid V1 rows remain readable. No new table or resource is introduced.
The project-owned setup command succeeded twice; real fixture data and malformed
version writes establish the intended constraints after the idempotent upgrade.

## Focused component verification

Command: node --test dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js

Exit 0, 52 passes, zero failures/skips/cancellations. The real PostgreSQL Arc
first exercises the complete retained V1 lifecycle, then concurrently allocates
one explicit V2 owner from the same pool. It checks frozen operations, stale
graphs/tokens, external unknown-outcome fencing, stopped-only rebinding, original
session/checkout resumption, schema constraints and unrelated graph updates.
External action acknowledgments in this store fixture are synthetic; they are
not evidence of an actual amended worker execution or delivery.

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (1549.925084ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (199.489792ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (89.955042ms)
✔ lease use fences graph and generation, operations and exact changed paths (112.894958ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (60.18575ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (54.91625ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (54.016208ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (58.658542ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (52.0135ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (53.2735ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (61.654625ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (2321.281084ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (66.483541ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (31.259708ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.411667ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (2.056708ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (2.589125ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (108.233625ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (235.939834ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (7.601708ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.827ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.47125ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.290708ms)
✔ adopted plan binds explicit scope and selects only subordinate tasklets within its paths (227.724667ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (169.106083ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1343.582ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (241.390833ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (245.188459ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (105.862333ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.358375ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (287.82175ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (6.077459ms)
✔ canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved (201.641083ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (226.057875ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (73.81775ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles (5.19775ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.765792ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (9.247209ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (6.184958ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.735084ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.178709ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (4.028208ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (12.964958ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.487167ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.096375ms)
✔ stale proof forces honest disturbance before new productive acceptance (12.494959ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (8.891042ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (297.908709ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.425708ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (30.239958ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.493ms)
✔ reader cannot hide declared membership from the accepted current observation (2.888792ms)
ℹ tests 52
ℹ suites 0
ℹ pass 52
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3254.532458
```

## Prior atomic delivery reassessment

The same 32 prior outcomes in CERT-15 retain their full conditions and historical
per-outcome observations. Current typed/store/portable compatibility, Git and
PostgreSQL executions refresh their affected inputs. No additional handwritten
proof migration, live amended worker delivery or candidate acceptance is inferred.

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

Exit 0, 57 passes, zero failures/skips/cancellations.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (121.201708ms)
✔ activation write failure restores the directory and every original Markdown byte (80.827417ms)
✔ activation destination and status guards reject before changing source bytes (62.0015ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (1.019292ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.24625ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (140.133ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.259792ms)
✔ empty valid inventory presentation retains its summary and final newline (0.105458ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.888917ms)
✔ typed validation selection retains all/json ordering and plan selection (0.12175ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.131208ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.4335ms)
✔ generated portable launch path preserves scalar selection and exact completion output (120.811458ms)
✔ adopted owning plans require their configured obligation document (110.771833ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (1829.472875ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (261.979333ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (352.644334ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.563792ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.4315ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.626958ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (72.372583ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (175.307459ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.821583ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.601875ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.478ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.274916ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (65.099083ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (176.383083ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (37.705541ms)
  ✔ malformed (39.72375ms)
✔ lost or malformed responses reject all affected pending operations (77.842416ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1114.483792ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (6.625542ms)
✔ heading parser retains the exact pending, done and error statuses (0.949583ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.259333ms)
✔ human report aligns census columns after long identifiers (0.692375ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (38.268ms)
✔ campaign graph exposes detailed planning review without an execution lease (20.126541ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (288.192958ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (149.178291ms)
✔ campaign report and graph accept an initial planning-only sprint (130.95875ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (99.081334ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.917875ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (15.906958ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.6585ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (91.260208ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (473.583959ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (170.855541ms)
✔ omitted report input requires exactly one campaign containing active plans (110.659416ms)
✔ bare plan names fail explicitly when missing or ambiguous (29.878792ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (60.303375ms)
✔ selected campaign validates direct dependency membership and cycles (29.965917ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (32.637542ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (88.559708ms)
✔ V1 report reader rejects unknown output fields (76.441958ms)
✔ production module uses exact exit and stream contracts without mutation (685.942709ms)
✔ ponytail dispatches campaign reporting through the production module (2188.349ms)
ℹ tests 57
ℹ suites 0
ℹ pass 57
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5153.962583
```

Strict configured compilation after final source edits:

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js

```

Unchanged TSTS and canonical source coverage:

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 901 files: no violations found.
tsconfig.json: 66 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
83 owned TypeScript files covered (66 Ponytail, 17 existing TSTS); zero root-owned type bypasses; checker source/tests unchanged from campaign start
Fresh npm run build passed on these final source inputs; runtime materialization check passed. Remaining handwritten executable owners and global language/runtime completeness stay unresolved
```

Native transport proof reuse (no new native process or thread needed):

```text
Native proof reused: all six runtime/fixture/dependency inputs unchanged from CERT-15; installed codex-cli 0.159.2. Original finalized one-test native start/resume and cleanup evidence is tmp/binding-selectors/lease-native.txt.
```

The retained finalized one-test start/resume/archive output is recorded in
frozen-lease-component.md. Its relevant inputs are unchanged; store/schema
changes are independent of that native runtime boundary.

Affected graph/state/scheduling traceability coverage and generated mappings
remain synchronized. The configured global checker still reports exactly nine
review/publication/interface coverage gaps, so no global traceability pass is
claimed. Runtime check, eight rule copies, seven pinned versions and diff checks
pass. Full campaign acceptance remains open. Worker delivery and bound candidate
acceptance must still consume the stored lease before amended edits are assigned
through the application workflow. No obligation-document self-hash is included.
