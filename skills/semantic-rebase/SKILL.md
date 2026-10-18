---
name: semantic-rebase
description: >-
  Use whenever performing or continuing a Git rebase. Review one aggregate
  final-state diff, select potential semantic conflicts, and let Ponytail stop
  only at contributing commits or unexpected textual conflicts.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Semantic Rebase

Traceability: implements REQ-FAST-SEMANTIC-REBASE

A semantic rebase preserves the source branch's required intent on the target
branch's final architecture. Perform semantic judgment once over both final
trees; do not inspect every cleanly replayed commit by default.

## Prepare one aggregate review

Start from a clean attached source branch and invoke:

```text
ponytail rebase diff <target> [--output <review-file>]
```

The command freezes the invoking worktree's source branch and tip, resolved
target tip, merge base, and ordered source commits. It emits one deterministic
stream containing `base..target` and `base..source` final-state changes. Stable
`TNNNN` and `SNNNN` identifiers belong only to that frozen analysis.

Review the complete stream as a code review. Compare behavior, contracts,
algorithms, architecture, data flow, schemas, and control flow across the two
final states. The CLI performs no language, symbol, domain, dependency, or
semantic-conflict inference.

Record every source change that may need adaptation and its optional related
target context in a selection file:

```text
ponytail-semantic-rebase-selection-v1 <analysis-digest>
S0003 T0002,T0007 | concise review reason
S0011 - | source-side interaction needing replay inspection
```

Select source IDs to create stops. Target IDs explain context and do not create
stops. When the review finds no candidate, use a header-only selection file;
`run` then replays without planned agent stops while retaining unexpected Git
conflicts.

## Replay only reviewed candidates

Run:

```text
ponytail rebase run <target> --conflicts <selection-file>
```

Ponytail maps each selected final source change backward through the frozen
source history, following exact text intervals where possible. New files,
deletions, binary or structural changes, and ambiguous provenance widen only
to commits touching that affected path lineage. It programs Git interactive
rebase with a `break` immediately after every contributor and plain `pick` for
the rest, so review occurs in the contributor's replayed context.

At each retained stop:

1. Read `ponytail rebase status` and the current dossier.
2. If Git reported a textual conflict, resolve both sides according to the
   aggregate review and the stopped commit's intent. Never select one side
   wholesale when both contain required behavior.
3. If this is a planned semantic stop, inspect the selected source patch in
   the replayed context and adapt or omit it when the target already satisfies
   its intent.
4. Keep edits within the dossier's selected lineage. If a necessary repair
   expands beyond it, make the repair and let `continue` retain a residual
   review rather than treating the expanded change as pre-reviewed.
5. Invoke `ponytail rebase continue`.

The rebase commands never run unit tests, integration tests, builds, product
QA, fetch, push, merge, publication, worktree creation, autostash, autosquash,
or update-refs behavior. Rebase-time validation is Git integrity only. Run
project validation separately after the rebase under the invoking project's
ordinary acceptance policy.

Use `ponytail rebase abort` to restore an active replay to the exact frozen
source tip. Do not manually delete Ponytail or Git rebase state. A stale
analysis, changed source or target, dirty start, foreign rebase, malformed
selection, or broadened resolution must stop with its state retained.

## Completion

After completion, verify that the target tip is an ancestor of `HEAD`, no Git
rebase state remains, every original source commit is accounted for as
replayed, empty, equivalent, or conflict-adapted, every selected contributor
was stopped, and the final range-diff is understood. Then run the repository's
applicable validation outside the rebase lifecycle.

## Campaign delivery

The worker owns rebase and refreshed affected tests/review. The coordinator
accepts only the exact reviewed/tagged candidate by fast-forward; it returns
stale submissions to the worker. Follow `campaign-management` for delivery.
