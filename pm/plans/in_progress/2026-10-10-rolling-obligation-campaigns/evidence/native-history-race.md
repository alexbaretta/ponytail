# Native history response race

OBL-52 remains pending shared native acceptance. BIND-51 / CHECKPOINT-140
extends its finite investigation to deterministic protocol ordering.

A protocol reproduction confirmed that a stale in-progress history response
can restore activity after a terminal notification. The response and terminal
notification arrive in one chunk, and the history promise continuation runs
after the notification. Before correction, close rejects with unresolved
`thread-fixture` / `turn-1`, although terminal observation succeeds. After
correction, the terminal evidence supersedes the stale snapshot for that same
turn; shutdown retains its existing ownership invariant.

The protocol suite passes 8 tests with no failures, skips or cancellations.
Strict compilation passes using the repository tsconfig with an isolated
temporary output directory for the first discriminating probe. Unchanged TSTS
checks 1107 files with no violations. The configured build-impact query names
the Ponytail target; the normal `npm run build` then passes, generated runtime
reconciliation passes, and all 8 protocol tests pass from the root build.
The already-running native diagnostic process retains its previously loaded
adapter. That run cannot establish acceptance of the corrected adapter.

The canonical observation passes JSON Schema validation. Traceability
generation still reports the six known publication/interface coverage gaps;
this repair does not discharge those obligations.

The old full-suite failure did not retain history-response ordering, so this
confirmed race does not prove the cause of that historical occurrence. The
native suite now logs bounded thread and turn lifecycle identities. Its current
run exercises the pre-correction compiled adapter and is diagnostic evidence,
not acceptance of the correction.

Canonical observation:
[terminal history response race](../../../../debugging-pattern-observations/2026-10-11-terminal_history_response_race.json).
