<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management redesign

- Plan ID: `2026-10-17-campaign-management-redesign`
- Status: in_progress
- Authority: the stakeholder explicitly authorized implementation, repeated
  `scripts/install.sh` installation, and a new coordinator session in Codex project
  gwen-001 to bring Gwen to full campaign completeness. The goal also authorizes
  messaging and replacing that coordinator and its workers when necessary.
  The Gwen coordinator and all Gwen workers, including replacements, must use
  GPT 6.1 Sol (`gpt-6.1-sol`) with `medium` reasoning.
  No release publication or cloud topology change is authorized.
- Management and implementation repository: `/Users/alex/git/ctosclub/ponytail`.
<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-17-campaign-management-redesign","parent_plan_id":null,"depends_on":[]}
-->

## Objective and scope authority

Implement [campaign-management.md](../../../../docs/campaign-management.md), then
install with `scripts/install.sh` and run Gwen to full campaign completeness.
The stakeholder's 2026-10-18 clarification makes the **smallest resulting skills
and tools** the design objective, not the smallest diff. Scrap bloated or
nonconforming implementations instead of wrapping or preserving them for their
own sake. This revision supersedes the earlier plan's expanded controller,
validation-interface and database design, including conflicting S01 decisions.

## Minimum resulting system

1. **Canonical traceability and checker.** Keep the approved four-edge graph,
   stable IDs and reverse discovery. Retain the implemented structural/TSTS
   checks that detect unresolved references and missing acceptance coverage.
   Semantic adequacy belongs to adversarial review, not another rules engine.
2. **One campaign-management skill.** The coordinator uses native Codex sessions,
   goals, messages, waits and worktrees. It keeps compact assignment/scope and
   timestamped vector notes in its host context; recovery starts from native
   sessions, branches and canonical PM records. No new database, queue, lease,
   membership registry, event log, scheduler or campaign command protocol.
3. **Ordinary Git delivery and certificates.** Workers run configured tests,
   inspect actual results, obtain local adversarial review and submit a rebased,
   annotated-tagged commit. The coordinator checks the exact candidate and uses
   serialized `git merge --ff-only`; stale submissions return to their workers.
   Tag annotations contain compact commands/results and scope/review references.
   No validation CLI chapter, MCP adapter, custom process runner, revocation
   service or mandatory machine-readable certificate schema. Corrections use
   new tags identifying the superseded tag; never move the original.
4. **Coordinator assessment.** Compute the campaign completeness vector `(R,A,T,I)`
   from canonical scoped objects and reviewed, passing work. Unknown remains
   unresolved; links alone cannot reduce T/I. Display it after every accepted
   merge. Compare timestamped observations over 30 active minutes for regression
   or no new minimum, distinguishing discoveries, scope changes and external waits.
   This is coordinator guidance, not a persistent acceptance/monitoring engine.
5. **Independent final QA.** Worker-reported zero is provisional. Only all workers
   DONE, zero unresolved coverage, adequate review and the coordinator's own full
   passing automated QA on the final integrated commit allow campaign DONE and
   its final tag. Failed QA reopens worker repairs and requires another full run.

Reuse existing project QA commands and parallelism configuration. Do not create a
new configuration family to repeat them. Add a helper only for a demonstrated
repetitive operation that cannot be handled reliably by the existing graph tools,
Git and host tools; its necessity must be concrete, not hypothetical.

## Remaining delivery sequence

| Sprint | Remaining result |
| --- | --- |
| [S01](sprints/S01.md) | Completed provenance; expanded design decisions superseded by this revision. |
| [S02](sprints/S02.md) | Completed graph checks; retain required behavior without adding another assessment layer. |
| [S03](sprints/S03.md) | Validation prototypes removed; finish concise Git tagging guidance and evidence boundaries. |
| [S04](sprints/S04.md) | Define the short assessment, merge and final-QA workflow within campaign-management. No controller implementation. |
| [S05](sprints/S05.md) | Replace bloated swarm/plan instructions, delete retired CLI/MCP/export paths, regenerate distributions. |
| [S06](sprints/S06.md) | Focused and final Ponytail QA, install, run the real Gwen campaign through independent final QA. |

S04 and S05 are one practical skill rewrite, not separate software subsystems.
Keep these existing sprint IDs for navigation; do not add tasklets or artifacts
merely to restate the workflow. Record substantive completion in the owning
sprint. Existing completed work is evidence of progress, not a reason to retain
unnecessary code.

## Skill disposition

| Skill | Action and owner sprint |
| --- | --- |
| swarm | Replace with campaign-management; S05. |
| requirements-traceability | Replace its graph/coverage contract under the same name; S02. |
| worktree-lifecycle | Replace its campaign/pool contract under the same name, preserving resource safety; S05. |
| plan-execution | Substantial edit; retain planning/ordinary execution, remove competing campaign controller and committed certificates; S05. |
| ponytail | Edit always-on integration points and completion-first semantics; S05. |
| requirements | Edit atomic decomposition and scope ownership; S02. |
| user-acceptance-testing | Edit acceptance identities, obligation references, executable coverage and tag evidence; S02/S03. |
| issue-tracking | Edit activation/closure references and certificate links; S05. |
| project-structure | Edit graph/configuration, operational-state and evidence ownership; S05. |
| typescript-unit-testing | Edit stable test identity and acceptance annotations; S02. |
| semantic-rebase | Edit to remove coordinator fast-rebase exception for the adopted workflow; S05. |
| production-test-boundaries | Align test/Arc identity and acceptance references; preserve isolation and real paths; S02. |
| ux-testing | Align acceptance-linked regression proof and certificate references; S03/S05. |
| debugging | Distinguish diagnostic observations from validation certificates; S03/S05. |
| architecture | Clarify durable design versus validation-output ownership; S05. |
| parallel-plan-scheduler | Remove exported skill; preserve necessary historical inspection documentation; S05. |
| qa-swarm | Remove standalone skill; retain necessary QA selection and isolation guidance in its existing owner; S05. |

The other 18 enabled skills remain behaviorally unchanged. Rewrite the shared
glossary once, update its consumers, and generate all host copies from canonical
owners. Changes to source skills that generators/tests consume are QA-relevant.

## Deletion and adoption boundaries

Delete the old swarm chapter, competing campaign scheduling/lease/queue/session
mutation interfaces and their unused implementation, tests and generated exports.
Preserve unrelated search, graph checks, project commands and resource cleanup.
Keep a historical reader only when existing records still need it; do not retain
a runnable legacy orchestration mode or build a general migration framework.
Preserve source, unfinished work, branches, tags and historical records. No Git
history rewrite or automatic clearing of client state.

Adopt the new graph for the authorized Gwen campaign explicitly. A whole-repository
Ponytail traceability migration is not a prerequisite for installing the skill.
Update Ponytail's configuration only where the actual changed tool contract
requires it. Native coordinator/worker sessions own Gwen changes under its local
instructions; this checkout remains the Ponytail implementation boundary.

## Acceptance

The authoritative behavior is the ten `REQ-CM-*` / `ACC-CM-*` conditions in the
canonical [requirements](../../../requirements/campaign-management.md) and
[UAT](../../../uat/campaign-management.md), interpreted through the design record.
No requirement calls for a new API, database controller or schema family.

Use existing focused tests for changed tools and generated/distribution checks
for skill changes. Delete tests that only enforce retired bureaucracy. Test
necessary graph logic behaviorally; do not build a simulated swarm to test prose.
Exercise worker capacity, blocked replacement, resumed excess, naming, local review,
fast-forward integration and vector reporting in the real native Gwen campaign.

Before installation, run the configured final Ponytail acceptance (`npm test`,
rule-copy and version checks) after final relevant edits. Inspect generated and
installed output for retired commands/skills. Keep raw output ignored. Install
again after corrections when necessary.

The goal is complete only when Gwen has adequate coverage, all workers DONE and
independent coordinator full automated QA passing on its final integrated commit.
Ponytail tests, installation, a zero structural gap count or a worker claim alone
cannot establish that result. Bugs discovered during QA return to workers.

## Native campaign handoff

Use **gwen-traceability-2 coordinator**:
`01a1531e-012f-7612-a8f4-9ceff55a627e`, project `gwen-001`, host `local`, cwd
`/Users/alex/git/gwen.vc/gwen-worktrees/gwen-001`. The user explicitly retired the
previous coordinator and workers and authorized fresh sessions after the Gwen
history cleanup. This checkout belongs to the rewritten repository at
`/Users/alex/git/gwen.vc/gwen`. Coordinator and every worker/replacement use
`gpt-6.1-sol` with `medium` reasoning. Preserve useful committed work and genuine
human approval boundaries; do not reactivate the retired swarm.

The parent owns concrete history-rewrite errors encountered during the campaign
and may make corrective/fixup commits in the main rewritten checkout. The user's
additional authorization permits autosquash only after acquiring a write lock
excluding all other sessions from the repository, followed by reconciliation of
all worktrees to their updated branches. This supersedes the earlier no-history-
rewrite boundary only for that corrective operation. No new exhaustive cleanup
audit or remote publication is authorized.
