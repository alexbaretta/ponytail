# Campaign reset and parallel restart acceptance

Status: IN_PROGRESS. Authority: Alex's 2026-10-13 explicit end-to-end request.

OBL-RESTART-1: IN_PROGRESS. Implement REQ-ROLLING-EXISTING-POOL and demonstrate
ACC-ROLLING-EXISTING-POOL. Canonical owners: [requirements](../../../requirements/rolling-campaigns.md)
and [UAT](../../../uat/rolling-campaigns.md).

OBL-RESET-1: acceptance reopened for retained-checkout provisioning. Canonical
owner REQ-ROLLING-RESET; preserve earlier source/DB proof while repairing the
detached-checkout assumption and proving actual provisioning after reset.

Final live gate: GWEN coordinator demonstrates reset COMPLETE, cleared old
assignment/lease state, fresh campaign initialization and genuinely overlapping
top-level worker turns within existing pool101–107,N10,M5,mainline
origin/uat-requirements. Delivery, allocated slots and idle chats do not establish
this gate. Client edits/cleanup are owned by the GWEN session. Fix additional
confirmed Ponytail blockers here, with focused regressions and final QA.

## Component acceptance

Confirmed finite-pool and detached-provisioning fixes pass full `npm test`:
949 tests, zero failures (`tmp/campaign-restart-full.log`, ignored). Focused
reset/admission/resumption/checkout proof passes 26 tests. TSTS checked 1,573
files without violations; traceability checked 978 relationships. Final read-only
review accepted exact physical-directory/number/common-Git admission and the
detached provision path. Exported instructions and command help are synchronized.

Live gate remains pending: component tests do not establish actual GWEN reset
or native parallel worker activity. Keep this plan active until that evidence
is obtained; fix any further confirmed Ponytail blocker rather than reporting
delivery as completion.

OBL-RESTART-2: DISCHARGED. Expose retained increment remote observation under
REQ-ROLLING-PUBLICATION so a failed local fast-forward can be settled without
pushing or discarding coordinator source. Verify real Git and PostgreSQL
PUSHING-to-REBASE_REQUIRED receipt and unchanged local/remote source.

## Increment observation acceptance

Ponytail commit `7133238` exposes stopped original increment observation.
Focused proof: 21 operation tests and the real Git/PostgreSQL failed-FF
regression pass. Final `npm test` passes 951 tests, zero failures
(`tmp/restart-observe-final-full.log`, ignored); TSTS checks 1,574 files,
traceability checks 980 relationships; rule copies and versions pass.
Read-only adversarial review accepts the explicit coordinator cessation
attestation boundary. Observation schema validates.

Actual GWEN observation exited zero for increment
`67dcf2ca-8564-40b3-8d86-f298bc5b43d5`, candidate
`47a6963dd927eaa859101636d7615ba566db8d25`, remote
`a3a81afb876c2b217c277eca570c98eba922362a`, recording
REBASE_REQUIRED with source unchanged. Its original failed integration
command had genuinely terminated before any push. This discharges
OBL-RESTART-2; it does not discharge reset or parallel restart.

Actual same-request reset subsequently failed at configured GWEN resource
cleanup after 335,768 ms: observability used `/var/run/docker.sock` instead of
the target Colima daemon. The client session owns the canonical adapter fix
and retry of request `e3235fab-8e71-419a-b079-59823d2ba0fa`.
Reset COMPLETE, fresh initialization and native parallel overlap remain
unverified; this plan remains IN_PROGRESS.

OBL-RESTART-3: DISCHARGED. Establish the explicit worker campaign-upstream
instruction under REQ-ROLLING-WORKERS and ACC-ROLLING-WORKER-UPSTREAM.
Actual worker101 fetched mainline and was correctly refused semantic-rebase
approval; generic campaign-branch wording did not identify its distinct ref.
Preserve its candidate and original actor during correction.

Live reset acceptance: independent read-only PostgreSQL observation at
2026-10-14T00:08:44Z confirms COMPLETE, 15/15 actors, 25/25 checkout operations,
zero project pool/campaign/assignment/worktree/action rows, all obsolete roots
absent and marker-free retained roots101–107. Fresh initialization and seven
finite-pool reservations subsequently succeeded (N10, M5, origin/uat-requirements).
All seven original worker dispatch turns started within nine seconds and
performed substantive inspection/edit/proof in parallel. Four valid initial
submissions and three correction outcomes were reported. Desktop reports
private App Server threads as notLoaded/interrupted while the owning
controllers and saved tool results demonstrate execution. Do not equate
Desktop runtime indicators with the separate owning servers' activity.

Original worker101 correction completed in native turn
`01a137d0-8c69-7573-b3d5-89eb8b083f62` with retained candidate
`6313652095a8deeeb19d2210d1c19a4fe81170be`, after receiving the explicit
`origin/traceability` upstream. Focused worker instruction/approval proof passes
6 tests; TSTS and independent read-only review pass. Full core QA is pending.
The causal observation is
[worker upstream ambiguity](../../../debugging-pattern-observations/2026-10-13-worker_rebase_upstream_ambiguity.json).

At 2026-10-13T17:36-07:00, independent original-turn reads confirm both101 and107
completed and their latest turn IDs match the persisted ATTACHED dispatches.
101's stale-graph failure occurred during collection after implementation, not
before starting a turn; no orphaned pre-turn claim is established.107's earlier
latest-turn rejection is no longer reproduced; its causal status/identity
difference remains unconfirmed. Fresh private observers see both actors as
notLoaded, so they cannot manufacture owning-idle attestations. Preserve their
candidates and use explicit original-actor correction recovery.

Desktop-visible worker activity remains unestablished. Separate CLI App Server
processes performed the genuine parallel execution, while the desktop's own
runtime reports these threads unloaded. Database WORKING/INTEGRATING states
are lifecycle accounting, not live execution evidence. This limitation must
remain explicit when reporting the restart result.

OBL-RESTART-4: IN_PROGRESS. Bind changed candidate artifacts and QA inputs separately
from coordinator authority reads under REQ-ROLLING-WORKERS and
ACC-ROLLING-WORKER-QA-INPUTS. Original101/107 retain their candidates and
produce fresh proof; never rewrite immutable submissions. Build and focused
worker proof pass (6 tests); independent read-only review accepts the
no-omission boundary. Final core QA and actual corrected proof remain pending.
Causal observation: [proof authority inputs](../../../debugging-pattern-observations/2026-10-13-worker_proof_authority_inputs.json).

Upstream acceptance in `d921e5e`: all 951 core unit/integration tests
pass, TSTS checks 1,575 files without violations, and rule copies/versions pass.
The original native actor's corrected candidate establishes the live branch
selection gate. Subsequent result-collection recovery preserves that candidate.

After generated QA-input instructions passed focused proof and review, the
GWEN coordinator launched original101 and107 corrected native dispatches
concurrently (retained controllers25098/90430), plus worker102 inventory
dispatch67088 after canonical retirement/release of its previous obligation.
These are genuine native dispatches, not desktop-owned activity evidence.

The command-consumed-only wording in `71f0665` was too restrictive: existing
submission validation also binds all changed candidate artifacts for Git
freshness. Original101/107 correctly failed on omitted report inputs. Corrected
instructions preserve artifact freshness, genuine QA inputs and the exclusion
of authority-only accepted state. No validator exemption or retained proof edit
is introduced. A real-Git consumer regression accepts a changed report input
and rejects omission, without asserting automated prose testing. Focused worker
and submission proof passes13 tests; independent review accepts this correction.
Final full core QA and fresh original-worker proof remain pending.

Final coherent artifact/input correction in `63657ca` passes all952 tests,
TSTS1,576 files and traceability981 relationships. This establishes component
acceptance; native fresh proof correction remains owned by the GWEN coordinator.

OBL-RESTART-5: IN_PROGRESS. Implement desktop-owned original worker handoff
under REQ-ROLLING-WORKERS and ACC-ROLLING-DESKTOP-WORKER. Current private
processes do not produce desktop-owned runtime activity. Hold private redispatch;
prepare existing idle actors, send frozen instructions once through the desktop,
acknowledge the observed exact original turn and verify actual visible execution.
No replacement sessions, writer competition or fabricated idle observations.

Desktop preparation now observes original identity and the latest terminal turn
without resuming or acquiring the native writer. A retained-writer fixture
rejects resume while preparation and exact-input acknowledgement succeed;
active actors are rejected before any claim. Focused worker/Codex/operation
proof passes 37 tests and the real PostgreSQL provisioning Arc passes. Existing
TSTS checks 1,619 files without violations. Full core acceptance still stops on
the three upstream REQ-TYPESCRIPT-ONLY-SOURCE coverage gaps; no broad upstream
language migration or fabricated coverage is introduced. Full typed execution
and independent review are pending. Actual Desktop parallel overlap remains
unproved until the cooperating coordinator dispatches original actors.
Observation: [preparation writer conflict](../../../debugging-pattern-observations/2026-10-13-desktop_preparation_writer_conflict.json).

Live Desktop dispatch started four retained original actors within 13 seconds,
with overlapping in-progress turns `01a1381d-39c3-71f3-80a1-9cbe37b6b3e4`,
`01a1381d-5351-7f31-8ed6-4a6c4a1b7ad8`,
`01a1381d-6b75-7c01-a412-31fffea685ee` and
`01a1381d-5ee6-7021-8bb2-5b3d492bd9f4`. Independent Desktop observations
confirm actual worker commentary and commands, not just assigned records;
three subsequently returned structured proposals. No replacement or private
implementation dispatch was used.

The first actual acknowledgement exposed a transport mismatch: Desktop sends
produce a `functionCallOutput` delegation with XML-escaped input, not the direct
native `userMessage` used by the former fixture. Inspection of the exact raw
original turn proves once-escaped input matches the frozen instructions. The
canonical parser and acknowledgement now accept only that actual tool identity,
strict envelope and exact escaped input; direct native input remains exact.
Focused 37 tests and the PostgreSQL provisioning Arc pass with actual envelope
shape, and independent review accepts the correction. The full typed run had
306/307 passes; its sole stale OpenClaw resource was regenerated and its focused
11 exported-resource/compliance tests pass. Final actual same-dispatch
acknowledgements and full final-input validation remain pending.
Observation: [Desktop input mismatch](../../../debugging-pattern-observations/2026-10-13-desktop_delegation_input_mismatch.json).
