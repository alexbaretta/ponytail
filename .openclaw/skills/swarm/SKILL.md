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
canonical graph is authoritative.

1. Allocate a checkout with `worktree-assign --base <approved-commit-or-ref>`.
   Retain its returned number, path and membership generation. Allocation chooses
   the lowest eligible available number and creates/setup a checkout if needed.
   A failed setup retains ownership: resume `worktree-setup --number <n>
   --generation <worktree-generation>` rather than allocating a replacement.
2. Create a top-level worker through the host's session-creation tool in that
   existing checkout. In Codex, discover `list_projects` and `create_thread`;
   select a saved project whose local root is the designated checkout. Use the
   existing local environment, not Codex-managed worktree creation. Inspect the
   actual tool schema: do not invent a cwd argument or substitute a private App
   Server controller. If the host cannot start a session in the assigned root,
   report that concrete capability gap while continuing independent work.
3. Obtain the actual returned thread/session IDs. Ask the worker to verify its
   designated root and exclusively create ignored `session_id.txt` there with
   its exact session ID followed by one newline. An existing differing marker
   must be reconciled before admission. Initialization alone is not development.
4. Record `worker-bind --thread <thread-id> --session <session-id> --number <n>
   --generation <worktree-generation> --kind <plan|sprint> --assignment <full-id>
   --summary "three word summary"`. Retain the returned worker generation,
   distinct from the checkout generation. For a campaign reservation, this also
   records the host identity against its original pending campaign action, using
   the current graph and exact plan/sprint scope. It starts no session. The worker has a permanent origin
   owner and checkout; do not invent identifiers or bind it elsewhere.
5. Apply the returned desired name through host naming tools (`set_thread_title`
   in Codex): `W<nn> P<mm> <three words>` or `W<nn> S<mm> <three words>`. Send the
   bounded implementation assignment through the host messaging tool
   (`send_message_to_thread`). The user's campaign execution authorization covers
   these worker instructions. Include exact obligation IDs, requirements,
   acceptance/Arc/Step references, paths, proof selections, prerequisites and base.
6. Start the other selected independent workers without awaiting the first
   worker's completion. Use host inspection/wait tools (`read_thread` and
   `wait_threads`) to verify that implementation actually started and to collect
   results or approval/blocker requests. Preserve original handles and identities
   after uncertain sends; inspect before retrying rather than creating duplicates.

Implementation workers are top-level sessions. Subagents may perform explicitly
allowed work such as adversarial reviews; they do not replace worker sessions.
Keep compatible development overlapping up to N. Report the actual reason when
capacity cannot be filled; never describe idle bindings as active development.

## Coordinate results and blockers

Workers implement autonomously within their exact scope and run configured
focused QA and Arcs. For changed code they fetch and semantically rebase against
the campaign branch before submitting the final commit/base and proof. They
request adversarial review and coordinator publication; routine coding decisions
remain worker-owned. Review corrections go to the original worker and reviewer.
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
resume the original session first through host tools with the updated authorized
scope. Bind the same identity again with `worker-bind` and the returned campaign
`--lease-generation`; retain the original checkout generation and worker number.
Binding completes only the bookkeeping resumption. Never edit
DB projections directly or manufacture native activity observations.

## Complete, detach and reuse

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
--generation <worktree-generation>`. Release preserves source and checkout. It may
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
