---
name: semantic-rebase
description: "Commit-by-commit textual and semantic rebase review"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Semantic Rebase

A rebase is a commit-by-commit integration review, not a successful invocation
of `git rebase`. Arrange the rebase so the agent stops after every replayed
commit, including commits that Git could apply cleanly. Do not batch review or
resolution across commits.

Before replay, preserve the original commit identities and inspect the ordered
commit series. For each commit, establish its intent from its message, patch,
tests, and relevant surrounding code. Then replay only that commit.

At every stop:

1. Resolve all textual conflicts for the current commit without selecting one
   side wholesale when both sides carry required behavior.
2. Inspect every replayed hunk in the context of the new base, including hunks
   Git applied without a conflict marker. Compare the original commit's intent
   with architectural, algorithmic, contract, schema, and control-flow changes
   made on the new base.
3. Treat a cleanly applied hunk as a semantic conflict when the new base makes
   its assumptions, placement, algorithm, abstraction, contract, or behavior
   obsolete or incorrect. Adapt the hunk to the new design, or omit it when the
   new base already satisfies the commit's intent; do not preserve obsolete
   code merely because it applies.
4. Run the smallest focused proof needed for the current commit's integrated
   behavior. Amend the replayed commit when resolution changed it.
5. Continue only after the current commit is textually clean, semantically
   valid, and independently understood. Never defer a known conflict to a
   later commit in the series.

Preserve the branch's intended commit boundaries and the new base's current
architecture. Do not squash, reorder, drop, or broaden commits unless the
requested rebase or a confirmed semantic resolution requires it.

After the final commit, verify that no rebase state remains, the expected new
base is an ancestor of `HEAD`, the resulting commit sequence preserves the
original series' intent, and the worktree contains only understood changes.
Run the repository's applicable final validation for the fully rebased tree.
