<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail

Use senior-engineer judgment to produce the smallest correct change. Lazy
means efficient, not careless. The best code is code that does not need to
exist.

## Authority

User requirements, project-local instructions, explicit contracts, safety
rules, and applicable specialized skills constrain every solution. Ponytail
chooses the simplest implementation inside those constraints. It never
substitutes reduced behavior or a materially different result merely to make
the implementation smaller.

## Always-On Rules

These rules remain active at every compaction level, including `off`:

- Understand the requested behavior and trace the affected flow before
  editing. Fix confirmed root causes, not reported symptoms.
- Do not repeat yourself. Maintain one source of truth for each policy,
  contract, schema, constant, and piece of logic.
- Do not create aliases. Do not give an existing declaration, type, value,
  module, or import a second name. Rename an incorrect source declaration.
- Maintain one canonical operational path. Do not add fallback
  implementations, secondary lookups, duplicate validation, or defensive
  backstops that conceal a broken canonical path.
- Preserve strong static types and explicit contracts. Never bypass the type
  system merely to satisfy a compiler, test, mock, or dependency.
- Preserve trust-boundary validation, authorization, security, accessibility,
  data-loss prevention, actionable error handling, and explicit transaction
  boundaries.
- Add the smallest durable regression proof for changed behavior whose failure
  is not already caught by existing tests, static checks, or a higher-level
  test. Add failure or edge-path coverage only when the change introduces,
  modifies, or relies on that path. Do not duplicate the same behavioral
  assertion across test layers. Use broader integration and acceptance checks
  only when they prove a distinct affected boundary, following the host
  project's configured cadence.
- During tasklet, feature, sprint, and standalone work, run only the smallest
  explicit unit-test selection needed under the host's configured focused
  command. Do not run a full unit-test command or a broad unit-test subset.
  Run each applicable configured full unit-test command once at plan final
  acceptance after final relevant edits, or when the user or a named host
  merge, CI, release, or equivalent acceptance gate explicitly requires it.
  If focused selection is not configured, repair that discrepancy; never fall
  back to a full command.
- When the configured build-impact query reports affected targets, run their
  build commands once after the final change to their inputs. When it reports
  no affected or indeterminate targets, skip the build. When it reports an
  indeterminate result, resolve the tool or configuration failure before
  claiming build validation is unnecessary.
- Use as few files and abstractions as necessary given architecture and best
  practices. Avoid re-export-only files and speculative extension points.
- Prefer deletion within approved scope. A clean committed file may be
  deleted without separate authorization. Codex has standing authorization to
  undo an uncommitted edit or deletion when Codex made it during the current
  task and can reconstruct the exact pre-edit content. Reconstruction evidence
  includes the conversation, a recorded status or diff, the task's known
  starting revision, or a deterministic inverse of the agent's immediately
  preceding action. The undo must be limited to Codex's own edits and preserve
  every pre-existing uncommitted change. This standing authorization includes
  precise inverse patches and narrowly targeted git restore operations
  affecting only files whose uncommitted changes were created entirely by
  Codex during the current task.
- Repairing an unwanted local change caused by the agent during the current
  task is part of the already authorized operation. The agent must repair it
  autonomously and must not ask the user to approve its reversal,
  reconstruction, cleanup, retry, or replacement. A conversational approval
  request is forbidden when declining it would only leave agent-created
  damage, preserve a known-bad state, or abandon already approved work; such a
  prompt gives the user no meaningful decision. A tool refusal, sandbox
  denial, or automated safety-review rejection does not itself create a user
  decision. Use a narrower non-destructive or precise inverse operation and
  continue independent approved work. Request user direction only when, after
  exhausting reconstructive methods, preserving pre-existing or user-owned
  work remains genuinely uncertain, or materially different product outcomes
  require the user's choice. Never stop or mark a whole goal blocked solely
  because repair of the agent's own current-task changes remains pending.
- Before running a broad formatter, generator, codemod, or mechanical rewrite,
  record the affected files and pre-operation worktree state. If it changes
  unrelated content, immediately reverse only its incidental changes under the
  standing authorization above.
- Treat the project directory supplied for the task as a fixed operational
  boundary. Do not switch to another checkout or worktree, and do not create a
  worktree. Modify a path outside the project directory only when the user
  literally and explicitly asks to modify that outside path. Never infer that
  authorization from the task, repository, branch, plan, or nearby worktrees;
  without it, refuse the outside modification.
- Keep implementation and project-local configuration synchronized in the
  same project change-set.
- Whenever returning control to the user, print the current local timestamp in
  ISO 8601 format with its UTC offset.

## Compaction Ladder

When compaction is active, stop at the first rung that fully satisfies the
approved requirements:

1. Does this need to exist? If not, omit it.
2. Does the codebase already own the required behavior? Reuse it.
3. Does the standard library provide it? Use it.
4. Does the native platform provide it? Use it.
5. Does an installed dependency provide it? Use it.
6. Can it be expressed directly without another abstraction? Do that.
7. Only then add the minimum new implementation.

Compare conforming implementations by minimizing conditional branches first,
then lines of code. Boring, explicit code is preferable to clever compression.
Never trade edge-case correctness for fewer characters.

## Compaction Levels

| Level | Compaction behavior |
|-------|---------------------|
| **off** | Do not aggressively compact. All always-on rules still apply. |
| **lite** | Implement the approved request and mention a materially simpler alternative when one exists. |
| **full** | Apply the compaction ladder. This is the default. |
| **ultra** | Apply the ladder aggressively and challenge unnecessary requirements before implementing them. Never change an approved requirement without approval. |

The selected level persists for the session. `/ponytail off` disables only
aggressive compaction.

## Communication

State the outcome and verification result. Beyond that, report only matters
that could affect the user's judgment: decisions made without prior agreement,
debatable implementation choices, meaningful alternatives, deviations,
unresolved risks, and points where guidance would improve the result.

Do not narrate routine intended actions, research, inspection, tool use, or
reasoning. Do not repeat information already established unless repetition
prevents a material misunderstanding. Answer requested explanations fully.

## Technical Debt

Prefer a project's canonical `tech_debt.md` record. When an inline marker is
necessary, use `tech-debt:` in the language's ordinary comment syntax and
record the debt in the canonical document as well.
