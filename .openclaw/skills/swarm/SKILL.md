---
name: swarm
description: "Coordinate parallel sessions and managed worktree ownership"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarm coordination
A user worktree owns one swarm: zero or one coordinator, worker sessions and
managed worktrees. Either resource set may be empty. From a managed checkout,
`ponytail swarm info` reports its recorded user-worktree owner. Coordinator loss
preserves worker and worktree ownership; it does not prove workers have stopped.

Use the invoking project's rules and configuration. For obligation definitions,
dependency changes, QA, review, acceptance and publication gates, apply
`plan-execution` and its rolling-campaign procedure. This skill owns session and
checkout operations; campaign identity is not swarm identity.

## Establish ownership

Inspect `ponytail swarm info --json` and `ponytail swarm --help`. Each command's
`--help` describes required selectors and effects. Enroll a configured user
checkout with `owner-enroll` when necessary. Bind the coordinator's actual host
identity with `coordinator-bind --thread <thread-id> --session <session-id>`.
There may be only one bound coordinator. Do not replace an existing binding
without settling its ownership and activity. A successor may bind an orphaned
swarm without discarding its workers or checkouts.

In Codex, inspect the coordinator through `list_threads` and freeze its exact
non-null `projectId` before allocating a worker. Confirm that `list_projects`
contains that ID. The coordinator session's project is the project for every
worker it creates; never derive worker project membership from the owner or
managed-checkout path, repository identity or project name. If host metadata
contradicts an explicitly selected project, present the conflict once. Preserve
the user's direct resolution and label the read-back discrepancy; do not turn
an already-confirmed selection into an endless gate or repeat an unchanged move.
Independently verify every actual child's non-null project association.

Ponytail CLI and MCP do not create, start, stop, inspect, rename, archive or delete
Codex sessions. They record associations and manage Git worktrees. The coordinator
performs session operations through the host tools exposed in its environment.
`swarm info` reports membership and desired names, with runtime activity
unobserved. Observe actual activity through host tools; a database reservation,
session marker, or completed initialization turn is not an executing worker.

## Start compatible workers concurrently

Approval to execute a configured parallel plan includes parallelization; do not
ask for another instruction. Use configured N (default 10) as the active-session
limit. Prefer completing started obligations, including proof and discharge,
over new work. Prefer reactivating an unblocked retained worker over creating a
new session. Select dependency-ready obligations whose paths and exclusive
resources are compatible using the project's planning tools; the coordinator's
canonical graph is authoritative. Worker capacity is separate from setup and QA
resource capacity: count dependency downloads, installation and package linking
against the project's heavy-resource limits, alongside builds and runtime tests.
Queue further setup while completing started setup; keep source-only work moving.

1. In Codex, create a fresh worker with `create_thread`, a target of type
   `project`, the coordinator's frozen `projectId`, and
   `environment: {type: "worktree"}`. Use this creation shape, substituting the
   actual selected project and worker number:

   ```javascript
   create_thread({
     title: "Worker 1 — initialization",
     target: {
       type: "project",
       projectId: "<coordinator-project-id>",
       environment: {type: "worktree"}
     },
     prompt: "Initialization only. Remain idle; do not use tools, inspect or edit files, run tests, provision resources, create sessions, or message other chats. Reply 'Worker ready and idle.' and end your turn. Await a bounded coordinator assignment."
   })
   ```

   Omit model/thinking overrides unless authorized. Omit `startingState` unless
   the user specified a Git starting state; otherwise report the actual resulting
   base. Fresh conversation history does not mean empty Git history. Do not use
   `fork_thread`: it copies the coordinator's conversation. A same-directory
   session does not satisfy worker isolation. Do not allocate a numbered Ponytail
   checkout first or create parent-root standby chats. If project-local
   instructions conflict, ask the user before changing instructions or creating
   a worker. If a specific parent directory is required, use the host's supported
   setting before creation: Codex Settings > Worktrees > Worktree root. The
   creation tool has no directory argument, and Ponytail's pool configuration
   does not change that host setting. Preserve any explicit user resolution
   allowing the current native location.
2. Retain the returned child handle. A queued `clientThreadId` is not a usable
   thread ID: retain it with `hostId`, wait for setup, and resolve the actual child
   through supported host inventory or exact setup provenance. Inspect that
   actual child; do not fabricate a UUID or retry uncertain creation. Use
   `read_thread`/`wait_threads` to verify a completed initialization-only turn,
   idle status and fresh history without inherited coordinator turns. Verify
   that the worker and coordinator have the same non-null
   `projectId` (or the user's explicitly resolved project identity), that the
   child's native cwd is a distinct physical Git worktree,
   and that it shares the coordinator's Git common directory. Never dispatch or bind a `projectless` worker.
   If project association needs correction, use `move_thread_to_project` and
   verify the result through host inventory; success without matching read-back
   is unresolved. Command `workdir` overrides do not change native placement.
   Run `ponytail swarm worktree-enroll --path <actual-native-cwd> --json` from
   the owner checkout. Retain its returned number and membership generation;
   these are bookkeeping selectors, not a requirement to rename the host path.
   Enrollment neither creates nor moves the checkout and preserves any
   uncommitted source in the checkout. The host owns its Git
   lifecycle; run only the invoking project's authorized setup for that exact
   root. Other hosts may use their supported native isolated-session workflow
   and enroll its verified actual checkout by the same command.
3. Retain the actual returned thread ID and host ID. Obtain the session ID from
   trusted host metadata (including exact `session_meta` when available) or
   the original worker's own session identity; inspect
   the exposed tools rather than assuming a field. Codex `create_thread` does not
   document a separate returned session ID. Never infer it equals the thread ID.
   Do not make an idle worker execute tools solely to obtain identity when
   trusted metadata already establishes it.
   If the session identity is unavailable, retain the enrolled checkout and
   report that capability gap; do not bind an invented identity or write a marker.
   With that identity established, ask the worker to verify its designated root
   and exclusively create ignored `session_id.txt` with its exact session ID
   followed by one newline. An existing differing marker
   must be reconciled before admission. Initialization alone is not development.
4. Record `worker-bind --thread <thread-id> --session <session-id> --number <n>
   --generation <worktree-generation> --kind <plan|sprint> --assignment <full-id>
   --summary "three word summary"`. Retain the returned worker generation,
   distinct from the checkout generation. For a campaign reservation, this also
   records the host identity against its original pending campaign action, using
   the current graph and exact plan/sprint scope. It starts no session. The worker has a permanent origin
   owner and checkout; do not invent identifiers or bind it elsewhere.
   For a first campaign lease on an already-bound native worker, initialize the
   authorized campaign and reconcile its adopted binding history. Establish
   quiescence through host tools, then invoke from the owner:

   ```text
   ponytail campaign replenish --campaign <id> --worker-session <session-id> --worker-generation <worker-uuid> --worktree-generation <membership-uuid>
   ```

   All three worker selectors are required together and come from current
   `swarm info`. This reserves at most one dependency-ready obligation through
   the existing scheduler, freezes its lease and records admission of the
   already-created original worker. It preserves its thread, session, root and
   worker/checkout generations; the new assignment generation is separate.
   Retrying a current allocation returns that same assignment. No second root,
   session operation or fabricated identity is needed. An owner with native
   workers must supply these selectors for a new allocation. Native admission
   preserves historical numbered-pool metadata; numbered allocation still
   requires owner configuration to match that recorded pool.
   Read back `campaign status`/`next-actions`, carry the frozen assignment and
   generation into the exact worker instructions, and follow the normal
   submission/review/acceptance path. For an inactive original native worker,
   use the same selectors; replenishment records the normal pending resumption,
   and `worker-bind` with its returned `--lease-generation` completes it.
   Campaign initialization/publication gates remain independently applicable.
5. For initialization-only admission, stop after binding, naming and read-back;
   do not analyze a plan, run tests, adopt runtime resources or dispatch product
   work. Creation, admission and executing an assignment are distinct stages.
   Apply the returned desired name through host naming tools (`set_thread_title`
   in Codex): `W<nn> P<mm> <three words>` or `W<nn> S<mm> <three words>`. When
   execution is authorized, send the bounded implementation assignment through the host messaging tool
   (`send_message_to_thread`). The user's campaign execution authorization covers
   these worker instructions. Include exact obligation IDs, requirements,
   acceptance/Arc/Step references, paths, proof selections, prerequisites and base.
   Explicitly instruct each worker to call `create_goal` in its own session for
   the complete bounded assignment before implementation, so work continues beyond the
   first turn. The goal must include the authorized obligations and acceptance
   conditions; omit a token budget unless the user requested one. Have the worker
   inspect `get_goal` first and retain a matching unfinished goal instead of
   creating a duplicate. Verify its active goal from worker tool evidence before
   counting it as executing. A prompt, binding or completed first turn does not
   establish a goal. Initialization-only and held workers remain held; create
   the execution goal when their assignment is authorized. Keep the goal active
   through verification and durable discharge, and mark it complete only when
   its assignment's acceptance conditions are satisfied. Report a missing goal
   capability rather than claiming sustained execution.
6. If the user requested a pilot for review, wait for that review before
   expanding. Otherwise start the other selected independent workers without awaiting the first
   worker's completion. Use host inspection/wait tools (`read_thread` and
   `wait_threads`) to verify that implementation actually started and to collect
   results or approval/blocker requests. Preserve original handles and identities
   after uncertain sends; inspect before retrying rather than creating duplicates.

Before reporting setup complete, read back `swarm info --json` and the host
inventory. Match every requested worker's actual thread/session, exact project,
native checkout, membership generation, assignment and applied name. Verify
unique checkouts and one binding per requested worker. Classify every extra old
binding or checkout explicitly; preserve unfinished source. Partial initialization
or a proposed roster is incomplete setup. Establish this path with one worker
before creating the rest of a requested replacement roster. Verify the worker
has fresh conversation history as well as its own native checkout. Retire only
explicitly superseded chats within user authority after verifying quiescence
and preserving source. Use host lifecycle operations; a refusal to delete a
task-primary checkout leaves a retained resource, not permission to force-delete
it. Report archived sessions and retained physical checkouts separately.

Implementation workers are top-level sessions. Each worker uses a local,
read-only subagent for adversarial review when the host exposes subagents and a
stable reviewer identity. The subagent does not replace the worker session and
must not edit files, commits, branches or project state. A coordinator-assigned
top-level reviewer is a fallback only when the worker cannot create or identify
an independent local reviewer.
Keep compatible development overlapping up to N. Report the actual reason when
capacity cannot be filled; never describe idle bindings as active development.

## Coordinate results and blockers

Use the [worker continuity protocol](references/worker-continuity.md) for complete
assignments, standing execution/resource authority, session-local goals, help
requests and the coordinator service loop. Apply it when adopting an existing
swarm as well as when starting one; a short follow-up must not shrink an
unfinished assignment into a one-turn chore.

Workers implement autonomously within their exact scope and run configured
focused QA and Arcs. Actual host approval denials remain gates; retain the
original candidate and use the continuity protocol for help and independent
work rather than bypassing the denied operation. For changed code they fetch and semantically rebase against
the campaign branch, commit the exact candidate, and have a local read-only
reviewer subagent inspect that SHA and base before terminal submission. The
worker corrects findings and returns the corrected candidate to the same
reviewer until accepted. It then supplies the exact host-issued reviewer
identity and verdict with its final commit/base and proof. The coordinator
records that review and performs publication; it does not repeat the review.
Record host-collected proposals and verdicts through the rolling procedure's
`campaign submit` and `campaign record-review` commands; neither operates a
session. The coordinator owns fast rebase, acceptance and publication under the plan's
existing gates; worker edits alone are not discharged obligations.

On an unknown dependency, update the authoritative plan graph and reconcile it.
Drive the worker to quiescence through host tools and verify the original session
has stopped. Retain its checkout and unfinished work, classify it inactive and
exclude it from active capacity with `worker-inactive --session <id>
--generation <worker-generation> --lease-generation <campaign-generation>
--blockers '["OBL-n"]'`. Blockers must already exist in the reconciled graph; use
an empty list for non-prerequisite pauses. This only records inactivity and
retains ownership. Replenish other compatible work. When unblocked,
renew an amended frozen scope through `campaign renew-lease` with its exact
current assignment generation after reconciling the approved graph. This changes
only the lease and preserves the stopped original worker. Then replenish and
resume the original session first through host tools with the updated authorized
scope. Bind the same identity again with `worker-bind` and the returned campaign
`--lease-generation`; retain the original checkout generation and worker number.
Binding completes only the bookkeeping resumption. Never edit
DB projections directly or manufacture native activity observations.

## Complete, detach and reuse

The existing numbered pool remains inspectable through `worktree-assign` and
`worktree-setup` for workflows that use Ponytail-provisioned checkouts. Those
commands do not place a Codex session and are not prerequisites for native worktree sessions.
Never allocate a second checkout to represent a worker's actual host checkout.

At final session completion, use `worker-complete --session <id>
--generation <worker-generation>` and apply the returned DONE-prefixed name
through host naming tools. Completion metadata does not rename the session,
discharge an obligation or release ownership.

Before removal, cancel assigned work through host tools and establish quiescence.
Then use `worker-unbind --session <id> --generation <worker-generation>`. It removes
membership and the matching session marker, fences its matching campaign
assignment and cancels pending allocation actions. It preserves submitted evidence
and does not discharge unfinished obligations. It does not stop, delete or archive
the session. Stop sending work to a detached session. Where supported, an original
session may reattach through `worker-bind` to its original owner and checkout;
never attach it to another user-worktree swarm.

Release the unowned checkout with `worktree-release --number <n>
--generation <worktree-generation>`. Release preserves source and checkout. Host-created checkouts remain retained
outside numbered-pool reuse and deletion; use host lifecycle tools for their
physical cleanup after project resource cleanup. A numbered pool checkout may
subsequently be allocated to this or another swarm of the same repository,
exclusively. Delete only unassigned checkouts with `worktree-delete --number <n>`
or `worktree-delete --all`; inspect protected/retained results and preserve source.

To clear this swarm, first quiesce all its workers through host tools, settle
active Git operations and preserve unfinished work. Then use `ponytail swarm
clear`. It releases worker, checkout and coordinator associations and campaign
leases/actions while preserving sessions, checkouts and campaign evidence.
Inspect `swarm info` afterward. Clear does not stop sessions or reset other swarms.
Use `coordinator-unbind --session <id>` to release only the coordinator binding
when workers/checkouts should remain attached.
