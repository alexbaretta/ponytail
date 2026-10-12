# Frozen worker submission and retained review ownership

Starting revision 0b75b52, approved dirty BASELINE-13 inputs for OBL-111.
Canonical original conditions and immutable histories are retained.

The physical submission V1 records campaign/assignment/generation/session, frozen
graph identity, exact base and candidate commits, stopped acknowledgment and
focused proof. Its exact reader rejects unknown versions/keys, active claims,
unsafe or inexact numbers, malformed commits and absent proof. Evidence uses
the existing canonical typed reader, renamed at its source and exported without
a duplicate implementation. Generated runtime and version manifest are current.

The independent validator inspects an actual physical Git checkout and an
ignored, untracked, regular session marker. It requires actual clean HEAD, base
ancestry and linear history; checks changed paths in every commit, including
rename sources, deleted files and reverted out-of-scope changes; and rejects
stale permissions, identity, selection, target or evidence. Finalized passing
proof identifies the exact clean candidate and freshly hashed inputs, including
its output/target verification and every still-present changed file. Deletions
are established by the exact Git candidate rather than hashes of absent files.

The store derives the checkout and lease from its registered assignment. It
checks the current accepted coordinator graph/bindings/prerequisites, original
session and physical common Git directory. The candidate base must be the
current coordinator increment ref, preventing a worker from hiding earlier
changes by choosing its own base. PostgreSQL stores the immutable candidate and
frozen lease and enters REVIEW with stopped activity in one existing campaign
transaction. Concurrent identical requests return one receipt/record; changed
payloads for that receipt are rejected. Rejected submissions roll back without
a review record or state transition. Project/campaign/assignment foreign keys,
the exact idempotency key and ordered assignment-history index bound queries.

REVIEW retains checkout/obligation ownership. Submission does not discharge
the obligation, establish adversarial approval, perform integration or publish.
The validator does not prove full semantic rebase merely from linear history.
Actual App Server worker dispatch, semantic-rebase execution, bound certificate
acceptance, review/publication and CLI/MCP operation parity remain required.
The PostgreSQL Arc uses synthetic external session acknowledgments, then creates
a real reserved Git worktree and executes a real Node syntax check. Its focused
fixture output proves submission metadata validation, not host-product QA.

## Focused proof

Command: node --test dist/tests/rolling-worker-submission.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js

Exit 0, 56 passes, zero failures/skips/cancellations. The first sandboxed attempt
failed because localhost PostgreSQL access was denied; the canonical isolated
Arc then passed with the narrow approved database access. No failing attempt
is counted as a pass.

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (1207.300959ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (121.636458ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (106.387292ms)
✔ lease use fences graph and generation, operations and exact changed paths (68.179416ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (71.410708ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (67.710417ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (65.235375ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (71.995917ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (61.310083ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (69.847041ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (72.788459ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (2643.156708ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (42.7295ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (19.181209ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.363375ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.414ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.841584ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (63.211708ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (162.342667ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.358875ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (3.119875ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.455459ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.286625ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1117.508458ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (186.387333ms)
✔ submission rejects merge history and reverted out-of-scope commits (348.399917ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (88.707833ms)
✔ adopted plan binds explicit scope and selects only subordinate tasklets within its paths (153.402542ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (103.798292ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1487.007792ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (234.96625ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (241.083042ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (103.330834ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.310917ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (261.105375ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (4.338791ms)
✔ canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved (210.333125ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (241.268ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (74.601125ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles (3.485167ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.949667ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (6.349ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (6.4535ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.66875ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.167083ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.117583ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (10.761791ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (4.701417ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.518ms)
✔ stale proof forces honest disturbance before new productive acceptance (6.238625ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.543292ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (197.598333ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.381375ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (26.121667ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.020583ms)
✔ reader cannot hide declared membership from the accepted current observation (1.839416ms)
ℹ tests 56
ℹ suites 0
ℹ pass 56
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3192.812958
```

## Current reassessment of the same 33 prior atomic outcomes

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

Exit 0, 57 passes, zero failures/skips/cancellations. Earlier complete conditions
and per-outcome observations remain required; no partial application outcome
is substituted for those existing component contracts.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (86.289083ms)
✔ activation write failure restores the directory and every original Markdown byte (63.65375ms)
✔ activation destination and status guards reject before changing source bytes (59.010583ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (1.1335ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.231583ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (125.131417ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.453541ms)
✔ empty valid inventory presentation retains its summary and final newline (0.108375ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.918584ms)
✔ typed validation selection retains all/json ordering and plan selection (0.113916ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.11975ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.3645ms)
✔ generated portable launch path preserves scalar selection and exact completion output (96.269834ms)
✔ adopted owning plans require their configured obligation document (96.292917ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (2341.116792ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (193.530709ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (310.692584ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.349584ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.414208ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.669833ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (49.618667ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (132.632292ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.755375ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.630084ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.433458ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.272917ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (61.765584ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (165.313375ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (36.762709ms)
  ✔ malformed (36.717541ms)
✔ lost or malformed responses reject all affected pending operations (73.844291ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (949.424667ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.826708ms)
✔ heading parser retains the exact pending, done and error statuses (1.016833ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.297583ms)
✔ human report aligns census columns after long identifiers (0.696542ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (27.814666ms)
✔ campaign graph exposes detailed planning review without an execution lease (17.96675ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (223.288792ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (135.387291ms)
✔ campaign report and graph accept an initial planning-only sprint (124.839583ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (92.169333ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.6415ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.736917ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.696334ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (88.341666ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (448.180417ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (162.711958ms)
✔ omitted report input requires exactly one campaign containing active plans (99.342583ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.847959ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (59.913208ms)
✔ selected campaign validates direct dependency membership and cycles (28.837917ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.8775ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (83.020625ms)
✔ V1 report reader rejects unknown output fields (70.898417ms)
✔ production module uses exact exit and stream contracts without mutation (641.421417ms)
✔ ponytail dispatches campaign reporting through the production module (2140.770333ms)
ℹ tests 57
ℹ suites 0
ℹ pass 57
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4800.104875
```

Strict configured compilation and unchanged TSTS after final source edits:

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 907 files: no violations found.
tsconfig.json: 68 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
85 owned TypeScript files covered (68 Ponytail, 17 existing TSTS); zero root-owned type bypasses; checker source/tests unchanged from campaign start
Fresh npm run build passed on these final source inputs; runtime materialization check passed. Remaining handwritten executable owners and global language/runtime completeness stay unresolved
```

Actual native proof reuse (no redundant new native process/thread):

```text
Native proof reused: all six runtime/fixture/dependency inputs unchanged from CERT-15; installed codex-cli 0.159.2. Original finalized one-test native start/resume and cleanup evidence is tmp/binding-selectors/lease-native.txt.
```

The finalized native start/resume/archive proof remains in frozen-lease-component.md;
all six relevant native inputs are unchanged. Schema setup succeeded twice in
the existing database. Runtime materialization, eight rule copies, seven pinned
version files and diff checks pass. Affected graph/state/worker coverage and
generated mappings are synchronized. The configured global traceability check
still has exactly nine review/publication/interface gaps; no global pass or full
campaign acceptance is claimed. Historical handwritten owners remain unresolved.
