# Fast semantic rebase architecture

[Back to architecture index](index.md)

The typed `semantic-rebase` component is the sole owner of analysis, durable
state, selection parsing, contributor mapping, and interactive-rebase control.
The root launcher validates the invoking registered project and dispatches the
chapter; Git remains the only replay engine.

`diff` stores a strict V1 analysis beneath the invoking worktree's absolute Git
administrative directory. The state freezes the source branch and tip, target
tip, merge base, ordered source commits, aggregate source and target change
units, and a content digest. The text review stream is derived from that state.
A strict line-oriented V1 selection document names source IDs, optional target
IDs, and uninterpreted reasons, and is bound to the analysis digest.

Contributor mapping walks source commits and rename-aware patches. Exact text
intervals are projected through the commit series; deleted intervals are
tracked from the base. A binary, mode, symlink, submodule, rename ambiguity, or
unresolvable interval uses the narrow path-lineage fallback. The resulting
commit set programs an interactive rebase todo with `edit`; other commits use
`pick`. Git's ordinary conflicts stop independently of the planned set.

Lifecycle operations validate the frozen identity and Git's retained state on
every invocation. They never use the common Git directory for mutable state,
never update unrelated refs, and never execute project validation. If an
agent's resolution changes paths outside the selected lineage, continuation
stops and emits a residual aggregate review for the expanded change.
