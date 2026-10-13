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
