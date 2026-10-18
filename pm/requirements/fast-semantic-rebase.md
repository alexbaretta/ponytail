# Fast semantic rebase

[Back to requirements index](index.md)

**Identifier:** `REQ-FAST-SEMANTIC-REBASE`

**Approval:** Approved and activated by the stakeholder on 2026-10-13.

**Source:** The stakeholder's 2026-10-13 aggregate-diff semantic-rebase design
and explicit implementation instruction. Native detached-source support follows
the stakeholder-authorized 2026-10-18 campaign-management adoption.

Ponytail must make semantic rebasing fast by separating semantic judgment from
mechanical replay. An agent reviews one aggregate final-state diff for the
target and source sides and identifies potential conflict relationships.
Ponytail must not infer language domains, definitions, references, or semantic
conflicts itself.

The approved atomic obligations are:

- `FSR-01`: `ponytail rebase diff <target>` freezes the merge base, source
  tip, target tip, source branch or native detached state, and ordered source commits, then emits one
  deterministic human-readable stream containing stable IDs for both
  aggregate final-state diffs.
- `FSR-02`: the agent records selected source changes and their optional
  related target changes in a strict selection document bound to that frozen
  analysis. Only source selections create replay stops.
- `FSR-03`: Ponytail maps each selected final source change to every source
  commit that contributed to it, following path and line history when exact
  and conservatively widening only to the affected path lineage when exact
  attribution is unavailable.
- `FSR-04`: `run`, `status`, `continue`, and `abort` operate only on the
  invoking worktree and exact frozen history, retain unexpected textual
  conflicts, reject stale or foreign state, and prevent an unreviewed
  broadened resolution from continuing automatically.
- `FSR-05`: none of the rebase commands launches unit tests, integration
  tests, builds, product QA, fetch, push, publication, merge, worktree
  creation, autostash, autosquash, or unrelated-ref updates.

The final-tree review deliberately does not promise separate review of a
transient source change that is absent from the source tip. Git textual
conflicts remain mandatory stops. Development and release validation occur
outside the rebase command lifecycle.
