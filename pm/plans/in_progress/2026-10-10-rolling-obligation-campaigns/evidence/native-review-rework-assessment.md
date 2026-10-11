# OBL-51 native correction and same-reviewer proof

The live native Arc passed on the first attempt (one pass, zero failures,
skips or cancellations, approximately 230 seconds). The harness seeds a
deliberately incorrect candidate for review; it does not manufacture a native
worker implementation or either verdict. A real native reviewer rejects it,
the original retained native worker corrects it, and that same reviewer accepts
the corrected, newly semantically rebased candidate.

Worker session: `01a12bed-f21e-7560-9075-a777dba668b8`.
Reviewer session: `01a12bee-1d08-7211-9c79-2f3e1da4d44f`.
Rejected revision: `f25f6fe848f38d3ad62e44b9dde73447acf14f7e`.
Corrected revision: `adcaa2842de760f1ddf3920580f6fdf8a15d7cdc`.
Fresh campaign base: `7c0b9bdd814b2655ac1e9aebd825701ce277aa6c`.

The original assignment, session and checkout survive rejection. Resumption
uses a fresh generation and supplies the persisted findings. The worker
changes both typed fixture source and its unit expectation, retains the
integration invariant, and performs an interactive semantic rebase with an
edit stop at each of the two replayed commits. Strict fixture compilation and
both focused tests pass at the stops. Independently published upstream content
survives; the final worktree is clean and its aggregate patch is unchanged by
rebase. The two immutable verdicts retain the same reviewer after store restart.
The native sessions are archived before fixture checkout/database cleanup.

The [actual output](native-review-rework-output.txt) retains the native decisions,
submission, semantic inspection and test result. Trailing horizontal whitespace
is normalized for repository whitespace checks; the original output remains in
`tmp/binding-selectors/native-rework-arc.txt`.

The strict root build, unchanged TSTS (1057 files), runtime synchronization and
all five submission regression tests pass. The generated reverse view is
synchronized; its six known publication/interface coverage gaps remain open.
This is live proof from development of the checked QA fixture. Clean candidate
assessment and binding-aware certificate acceptance still need to be recorded;
this document does not discharge OBL-51 by itself.
