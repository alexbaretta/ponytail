# OBL-48 uncertain worker creation recovery

Recorded under BIND-43 / BASELINE-14. The original condition and full restart/recovery Arc criterion remain unchanged. This is implementation and executed native evidence; discharge requires accepted certificate reconciliation.

Recovery reads the original started creation action, current assignment generation, reserved checkout and retained native receipt from the existing PostgreSQL resource. It accepts only its original START_WORKER action. Missing receipts remain explicitly unknown and retain capacity, action intent and checkout ownership. Recovery never starts another native thread or initialization turn, and never infers identity from a different session or checkout.

For a known receipt, recovery resumes that original native session in its recorded checkout. Before initial attachment, the native initialization history must contain exactly one turn: creation owns an initialization-only session until attachment. Absent or ambiguous history is rejected. Active initialization or active native metadata preserves the reservation. Successful initialization must be completed and idle, with the matching regular ignored session marker, before the fresh coordinator records attachment under its current lease. Repeated recovery after attachment preserves the same session and original action; it does not reinterpret later responsibility turns as initialization.

Native history reads share one status-observation path with existing exact-turn reads, preserving active-turn tracking and close guards. An observation failure, unsupported state or ambiguous history does not authorize replacement or ownership release. If the native receipt is missing, the actual original external receipt must be recovered and recorded before identified recovery can continue; this is not an automatic retry.

Validation on the changed component tree:

- Strict configured build passed and compiler-generated runtime copies match.
- Focused worker, native protocol, submission and store contract selection: 18 passes, no failures, skips or cancellations. Initialization history checks reject both empty and ambiguous history.
- Existing local PostgreSQL suite: seven passes. A missing receipt retains STARTED intent and active capacity; repeated creation and retirement are rejected. Controlled active native activity preserves RESERVED ownership and prevents closing the session. Restoring the original actual receipt allows recovery from native history without an initialization handle.
- Installed native Codex recovery Arc: one pass. After completed initialization but before final attachment acknowledgment, the coordinator store and App Server connection are restarted. Recovery receives only durable action selectors, identifies the original completed initialization, validates idle activity and marker, and attaches the same native session. Recovery is idempotent; responsibility delivery and another restart retain the same identity. Native sessions are archived before isolated fixture cleanup. Host model and permissions remain configured; no plugin API is used.
- Unchanged TSTS checked 1,005 tracked files without violations before adding this record. Traceability retains the six previously identified publication/interface coverage gaps.

Local outputs remain under `tmp/binding-selectors/worker-recovery-`: `focused.txt`, `store.txt`, `store-final.txt`, `native.txt`, `build.txt`, `tsts.txt` and `traceability.txt`. Shared input changes stale intersecting prior closures until explicit renewal. Code execution/rebase, review corrections, integration/publication, interfaces and final campaign acceptance remain separate unresolved obligations.
