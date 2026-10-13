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
