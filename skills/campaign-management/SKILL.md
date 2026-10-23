---
name: campaign-management
description: >-
  Coordinate an authorized campaign through native worker sessions, reviewed
  Git deliveries, truthful requirement coverage and independent final QA.
---

<!--
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
Enforce approved heavy-operation limits automatically at project command entry
points, using a semaphore shared across its worktrees. Workers acquire capacity
without coordinator allocation or acknowledgment; waiting commands report the
capacity wait. Use OS-managed permits whose lifetime covers the command and its
children, including nested invocations and cancellation. Honor explicit
project-specific user exceptions: when the user permits temporary cap overshoot
after abnormal Docker client exit, release that permit without waiting for
daemon-quiescence confirmation and report that daemon work may remain. Do not
describe client exit as proof that daemon work stopped. Git operations and
lightweight work do not acquire heavy permits. A permit grants capacity, not
otherwise-missing authorization. Do not introduce manual rebase windows or
per-command coordinator approval gates. Serialize shared-branch integration only.

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

### Optional persistent recovery deputy

When the user authorizes a deputy, create one native campaign chat dedicated to
worker recovery, with explicit authority to inspect and message campaign workers
and the coordinator. Identify both roles in worker assignments. Transfer the
existing recovery heartbeat to the deputy, preserving its configured schedule;
do not run competing recovery loops. The deputy is not an execution worker and
does not count toward configured worker parallelism.

The deputy owns routine recovery: inspect actual activity, leave running workers
alone, diagnose idle/blocked unfinished workers, send a concrete authorized next
action, and verify resumption with bounded waits. A message or active chat flag
alone does not prove resumed work. Do not repeatedly demand continuation on an
unchanged external blocker or claim to resume a goal requiring human action.
Escalate genuine human-only gates, dependency/assignment decisions, capacity
shortfalls and ready-delivery backlogs to the coordinator. Stay quiet on unchanged
or non-actionable state. Keep compact context in the chat and recover inventory
from native sessions; add no ledger or queue.

With a deputy, the coordinator delegates the inspection and routine recovery in
steps 1–2 below. It remains the sole owner of scope, assignments/replacements,
integration, assessments, DONE decisions and final QA. The deputy does not edit
the shared checkout, implement fixes, perform reviews, reassign work or merge.
Workers route operational blockers to the deputy and deliveries to the coordinator.
Routine recovery requires no per-action coordinator acknowledgment. End the
recovery heartbeat when the campaign completes or the user stops the deputy.

### Service responsibilities

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
   `Campaign completeness vector (F,O,A,T,I): (...)` after every accepted merge.
   Maintain one assessment tag per campaign per commit. Further review of the
   same commit replaces that tag's annotation, preserving its target; validation
   tags remain immutable. Follow `requirements-traceability` for updates. Run
   `ponytail traceability completeness --campaign <name> --assessment-tag <tag>`.
   The command reads the tag target directly from Git, preserving any local drafts;
   its result covers that commit only. Default output includes the vector and T/I
   presence/completion statistics, with early progress on stderr; use `--verbose`
   for individual findings or `--json` for the complete machine-readable report.
   Use the statistics to distinguish missing links from linked unresolved work.
   Reconcile existing adequate reviews and passing proof before assigning new
   implementation; linked unresolved work is not automatically missing code.
   Use its vector and unresolved IDs; do not maintain a separate hand-counted
   vector. F counts returned annotation findings and must reach zero first; invalid
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
| F | Unresolved structural annotation findings; O/A/T/I remain provisional until F is zero |
| O | Requirements with missing, incomplete or unreviewed obligation decomposition |
| A | Obligations without adequate acceptance coverage |
| T | Acceptances without adequate executable test coverage |
| I | Obligations without adequate implementation |

F counts findings directly. The remaining letters name the missing coverage: obligation decomposition, acceptance, tests,
and implementation. Coordinates count entities lacking that coverage, not the
unknown number of missing artifacts.

Unknown adequacy remains unresolved. T and I decrease only when the linked tests
and implementation exist, the implementation passes required automated and
explicitly requested manual tests, and adversarial review establishes adequacy.
Manual tests are disabled by default: retain the complete DAG, but do not require
their execution or passing credit. Use the assessment statuses and exact counting
rules in `requirements-traceability`; do not reclassify broken automation as manual.
Unit or integration coverage may suffice. Never sum
stale worker-local vectors. Use canonical IDs to retain unresolved scope.

Generally favor coherent changes that decrease `(F,O,A,T,I)` lexicographically:
the first changed coordinate decreases; later coordinates may increase. Discoveries,
invalidated proof and user-added scope may honestly increase it. Record those
reasons rather than mislabeling them productive descent or hiding them.

Keep a bounded set of timestamped vector observations in host context. Over
30 active minutes on comparable scope, diagnose net regression or no new minimum.
Exclude acknowledged external waits; start a new comparison baseline after scope
changes. Investigate recurring reopened work. Alerts trigger correction of work
or assignments, not automatic cancellation or a new monitoring service.

## Annotated validation tags

Follow [plan-execution's annotated-tag-only policy](../plan-execution/SKILL.md#annotated-tag-only-validation).
Use `ponytail/validation/<campaign>/<unique-run>` and identify the worker or
coordinator and focused or final scope. The coordinator accepts only the exact
reviewed candidate targeted by the validation tag.

## Independent final acceptance

Worker-reported zero is provisional. After the last accepted delivery, require
all campaign workers DONE, including retained blocked workers, and no unresolved
coverage. The coordinator then independently runs and verifies every configured
full unit/integration suite and additional automated QA on the final integrated
commit. Worker-focused tags or delegated QA do not replace this run.

Do not run human-intervention tests without an explicit user request. Their
default omission is non-blocking; enabled manual tests must pass. Keep their
definitions and links in scope and report their status separately from FOATI.

If any required QA fails or remains unavailable, the campaign is not DONE. Assign
bugs to workers, record the reopened gaps, service and integrate their repairs,
then repeat the full independent QA on the new candidate after zero/all-DONE is
restored. Only a fully passing run permits the final acceptance tag and campaign
DONE. Missing full-QA configuration is unresolved, not an empty passing suite.
