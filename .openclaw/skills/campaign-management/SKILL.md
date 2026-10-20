---
name: campaign-management
description: "Native worker campaigns with reviewed Git delivery and independent final QA"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management

Use native host tools for sessions, goals, messages, waits and worktrees; use
Git for integration and validation tags. No Ponytail swarm enrollment, queue,
lease, certificate ledger or replacement orchestration API is required.

## Establish scope and start workers

Read the project's instructions, approved requirements, UAT and QA commands.
Use the `requirements-traceability` graph and checks: obligations reference
requirements, acceptances reference obligations, tests reference acceptances,
and stable code blocks reference obligations. Scope is an explicit set of
requirement IDs; preserve every unresolved descendant. Do not infer semantic
coverage from links or passing tests alone.

Confirm the native project, integration branch, configured worker parallelism,
model/reasoning constraints and authority to create and message workers. Reuse
existing project configuration; do not create another settings or state system.
Inspect existing sessions and unfinished branches before assigning work. Keep
compact host-context notes with scope, worker IDs, assigned IDs, candidate/branch,
blockers and latest assessment; recover them from native sessions and Git after
interruption. Preserve unfinished work and genuine human authorization gates.

Start the configured number of compatible, dependency-ready workers. Prefer
finishing started obligations; do not duplicate retained assignments or invent
work to fill capacity. Use isolated host-managed worktrees when authorized and
respect project resource limits independently of session parallelism.

Name each worker `<campaign-id> W<sequence> <three word summary>`: campaign-local increasing
sequence, three words summarizing the assignment. Replacements get new numbers;
resumed workers retain theirs. Prepend `DONE` once only after accepted integration.
Choose informative, discriminating words that distinguish this assignment from
its peers: specific domains, components or outcomes. Avoid repeated generic
phrases such as `Complete … coverage`; spend all three words on useful detail.

Give each worker a complete assignment identifying canonical IDs, completion
conditions, scope/dependencies, integration branch/base, coordinator identity,
applicable QA and review, and authorized workflow/messaging. Have it set a goal
where supported. A goal or completed chat turn does not prove completion or
continuous activity. The worker owns the assignment through delivery.

## Worker execution and delivery

Implement the obligation, its adequate acceptances, executable tests and code
annotations together as needed. Resolve routine questions autonomously and
continue independent work while a part is blocked. Ask the coordinator only for
a concrete intervention: report assigned IDs, decisive evidence, remedies tried,
what is needed and whether independent work remains. Say when only the human can
unblock the work; neither worker nor coordinator may bypass that gate.

Run the project's focused tests and other applicable checks. Obtain adversarial
review from a worker-local subagent inspecting canonical requirements,
acceptances and the actual diff. The reviewer must assess whether the tests and
implementation establish the obligations, including missing cases; a mutually
weak test and implementation passing each other is insufficient. Fix findings.

Reconcile with the current integration branch using the project's rebase
workflow. Refresh affected tests and review after changes. Commit the final
candidate and record focused validation using the tagging procedure below.
Submit its exact commit, branch/base, tag, covered IDs, review reference and
proposed changes to unresolved coverage. Ready for integration is not DONE.
Return to work if the coordinator reports a stale candidate or incomplete proof.

## Coordinator service loop

The coordinator does not implement worker repairs, perform their code reviews,
or rebase their submissions. Keep it available to:

1. Inspect actual native worker activity. Leave executing workers running;
   resume idle unfinished workers with a concrete next action.
2. Resolve blockers within authority. Retain workers that need human/external
   help and start workers on other compatible assignments to restore capacity.
   Recheck unchanged blockers when relevant state changes, not by repeatedly
   demanding continuation.
3. Accept ready deliveries serially. Verify exact candidate/base, review scope
   and passing tag against the submitted commit. Integrate with
   `git merge --ff-only <candidate>`. Return stale or non-fast-forward deliveries
   to their workers. Never repair them in the coordinator.
4. Reassess the integrated scope and display
   `Campaign completeness vector (O,A,T,I): (...)` after every accepted merge.
   Publish the updated commit-bound assessment tag and run
   `ponytail traceability completeness --campaign <name> --assessment-tag <tag>`.
   Default output is the vector with early progress on stderr; use `--verbose`
   for individual findings or `--json` for the complete machine-readable report.
   Use its vector and unresolved IDs; do not maintain a separate hand-counted
   vector. Returned annotation findings block final completion even at zero; invalid
   scope or ambiguous graph ownership must be repaired before computing progress.
   The `requirements-traceability` skill owns the compact snapshot format
   and initial unassessed-scope command. Carry forward only still-applicable
   review and passing-test claims; unknowns remain unresolved.
   Mark the accepted worker DONE and rename it through native tools.
5. Replenish only when active campaign workers fall below configured parallelism
   and compatible work exists. Blocked, DONE and merely ready workers do not fill
   execution capacity; local reviewers and unrelated chats are not workers.
6. Use bounded native waits and repeat. Inspect about once a minute when supported;
   use a same-session heartbeat for recovery only where authorized and available.
   Do not promise exact scheduling or continuous execution through host limits.

Human-unblocked workers may temporarily take activity above target. Let them
continue; completion naturally reduces excess. Do not retire their work to enforce
a ceiling. An exhausted compatible frontier is a real constraint, not permission
to duplicate assignments.

## Assess progress

Count unresolved objects in the integrated scope:

| Coordinate | Unresolved objects |
| --- | --- |
| O | Requirements with missing, incomplete or unreviewed obligation decomposition |
| A | Obligations without adequate acceptance coverage |
| T | Acceptances without adequate executable test coverage |
| I | Obligations without adequate implementation |

The letters name the missing coverage: obligation decomposition, acceptance, tests,
and implementation. Coordinates count entities lacking that coverage, not the
unknown number of missing artifacts.

Unknown adequacy remains unresolved. T and I decrease only when the linked tests
and implementation exist, the implementation passes those tests, and adversarial
review establishes adequacy. Unit or integration coverage may suffice. Never sum
stale worker-local vectors. Use canonical IDs to retain unresolved scope.

Generally favor coherent changes that decrease `(O,A,T,I)` lexicographically:
the first changed coordinate decreases; later coordinates may increase. Discoveries,
invalidated proof and user-added scope may honestly increase it. Record those
reasons rather than mislabeling them productive descent or hiding them.

Keep a bounded set of timestamped vector observations in host context. Over
30 active minutes on comparable scope, diagnose net regression or no new minimum.
Exclude acknowledged external waits; start a new comparison baseline after scope
changes. Investigate recurring reopened work. Alerts trigger correction of work
or assignments, not automatic cancellation or a new monitoring service.

## Annotated validation tags

Run the actual configured commands on the identified clean commit and inspect
results, including failures, missing selections and unexpected skips. Recheck
HEAD and tracked inputs afterward; changed inputs require applicable validation
again. A zero exit code cannot establish tests that did not run.

Create a uniquely named annotated Git tag on that exact commit with `git tag -a`;
never force-update a tag. Use `ponytail/validation/<campaign>/<unique-run>`.
Keep the annotation compact: worker/coordinator identity, focused or final scope,
covered requirement/obligation/acceptance/test IDs, working directory, relevant environment, timestamp, commands,
observed results and review references. Counts belong only when actually observed.
The tag target alone identifies the commit. Apply Ponytail's commit-ID content
prohibition to all annotation fields, including copied commands and references;
choose tag names without embedded commit IDs so they can be cited safely.
A plain-text annotation is sufficient; no mandatory JSON schema or custom runner.

Keep raw output in ignored temporary storage or the project's external evidence
owner. Do not commit passing output, certificate files or evidence-only updates.
Create passing tags for deliveries/final acceptance, not every exploratory run.
Failed-run tags are optional, never automatic. Corrections use a new tag naming
the superseded tag; invalidate affected coverage and do not reuse known-bad proof.

Verify a submitted tag is annotated and targets the exact reviewed candidate.
A tag attests what ran; it does not independently prove execution or adequacy.
Worktrees of one repository share Git refs. For separate repositories, explicitly
transfer the required candidate and tag within authorized scope; no implicit push
or release publication. Historical tags retain their original meaning.

## Independent final acceptance

Worker-reported zero is provisional. After the last accepted delivery, require
all campaign workers DONE, including retained blocked workers, and no unresolved
coverage. The coordinator then independently runs and verifies every configured
full unit/integration suite and additional automated QA on the final integrated
commit. Worker-focused tags or delegated QA do not replace this run.

If any required QA fails or remains unavailable, the campaign is not DONE. Assign
bugs to workers, record the reopened gaps, service and integrate their repairs,
then repeat the full independent QA on the new candidate after zero/all-DONE is
restored. Only a fully passing run permits the final acceptance tag and campaign
DONE. Missing full-QA configuration is unresolved, not an empty passing suite.
