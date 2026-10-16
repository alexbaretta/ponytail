<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Sustained worker execution and responsive coordination
Use this protocol for authorized execution, including an adopted host-managed
swarm. Initialization holds and actual authority boundaries remain in force.
The aim is completed obligations, not sessions kept artificially busy.

## Give the worker a complete assignment

Assign a coherent, independently actionable obligation or QA slice through its
verification, local review and delivery, with the canonical discharge condition
and coordinator-owned integration gate identified. Include all known necessary
owned edit paths, configured proof commands and targets, prerequisites, actual
base and resource constraints. Avoid assignments that end after one command,
callback rename, inspection receipt or passing subset while the worker's assigned
outcome remains unfinished. A narrow resource grant resumes that outcome; it
does not replace the assignment or define a new completion condition.

The worker owns diagnosis, implementation, necessary regression proof, configured
build-impact checks, focused validation, correction of local reviewer findings
and a review-ready delivery. It reads the approved requirements/UAT and existing
configuration to answer routine questions itself. Passing evidence is reused
while its relevant inputs remain unchanged. It does not request a coordinator
instruction between these steps or turn a progress receipt into final delivery.
Preserve reviewed candidate identities; changed candidates require renewed exact
review rather than borrowing an older verdict. For QA slices, retain the
whole-slice acceptance contract in `qa-swarm`.

Use the original session's goal for this complete assignment. A matching
unfinished goal survives resource grants, progress reports, review and integration
waits. If no goal exists, establish one before continuing authorized execution;
if the previous goal legitimately finished, assign and establish the next complete
eligible outcome. Never create a goal per small coordinator message. Completing
a command or exhausting a resource grant does not discharge an unfinished goal.

Temporary queueing, a running operation, pending local review or a coordinator
reply is a wait to manage, not by itself proof that the goal is blocked. Keep
independent assigned work moving and observe original live handles. Apply the
host goal tool's actual blocked-state threshold only after genuine inability to
progress is established; repeated verified waits are not repeated failed repair
attempts. Do not manufacture activity with redundant commands or status-only
turns. If a native goal is already blocked and the host exposes no resume API,
report the exact unfinished originals once for the user's supported Resume
operation. Do not fake completion, replace the worker or duplicate the goal to
clear that state. Manual follow-ups can advance work but do not prove automatic
continuation has been restored.

## Make routine execution standing authority

The coordinator supplies standing permission for the assigned in-scope workflow,
including its configured light/focused proofs and local review. Workers consume
that authority without requesting a fresh grant for every test, callback or
unchanged candidate. Host command restrictions, review denials and genuine
human approval gates still apply; standing task authority cannot bypass them.

Declare the actual scarce resources and capacities. An operation that consumes
several resources must fit every applicable limit; a released build slot does
not implicitly release a runtime or packaging slot. Queue only operations that
consume a conflicting slot; a build queue does not suspend source work, test
preparation, inspection or independent local review. Record the current holder,
original live handle and next eligible waiter in the existing coordinator record.
Release a slot on verified completion/finalization and promptly hand it to the
next eligible worker without another human permission request. Checkpoints and
source-only progress need no heavyweight slot unless their actual execution
consumes one. Separate Git indexes do not require a global commit mutex; a shared
indexing commit hook may require its own measured resource budget. Do not turn a
temporary contention limit into permanent serialization of every worker's Git
operations. Never restart a live command merely because observation timed out.

Exact frozen paths and ownership remain authoritative. If a necessary repair
needs an additional path, send one concrete request with its required behavior,
exact paths, current owner/conflict and evidence. Continue independent authorized
parts. The coordinator resolves routine same-requirement, disjoint scope changes
within existing authority and reconciles/renews the canonical binding before
further edits. Workers cannot self-enlarge a lease or edit another owner's files.
Conflicting requirements, new scope and literal outside-project authority remain
user decisions. Escalate those once with the actual conflict or concrete change;
do not require the user to decide routine implementation details.

## Service worker requests before starting more coordinator work

Keep coordination responsive while workers execute. Use the host project's
existing roster/journal or transient coordinator record; do not invent Ponytail
commands, database fields or a second scope/ownership registry. Use the existing worker
roster as the request queue: retain each unanswered request, its original worker,
required decision/resource, independent next action and the response sent. A
request is not resolved because a progress summary mentioned it. Respond in the
original session and confirm that the reply reached that session.

Where the user explicitly authorizes worker-to-coordinator messaging, include
the exact coordinator thread and that authority in the assignment so workers
can report help immediately. Otherwise collect requests from original worker
progress/output through host inspection; do not invent cross-chat permission.
A worker's request identifies the obligation, attempted action, decisive evidence,
smallest needed decision and any work it can continue. It reports progress while
continuing, and yields at a genuine coordination boundary only when no independent
assigned action remains. A final response at that boundary does not complete its
goal or transfer the unfinished assignment away.

The coordinator's execution loop is:

1. Inspect all workers in compact batches, retaining host cursors. In Codex,
   `wait_threads` accepts at most eight targets; use enough batches for the whole
   roster. An immediate snapshot can reveal progress even when a wait does not
   wake on commentary. Read detailed history only for a specific unresolved need.
2. Answer unblocking requests, collect finished resource handles, grant released
   slots and resume ready unfinished assignments before starting another long
   integration or analysis step. Decide from canonical requirements and scope;
   request concrete missing evidence instead of re-investigating every worker's
   accepted proof. Delegate domain implementation and proof to its owning worker.
3. Advance coordinator-owned reconciliation/integration at a safe boundary.
   Retain asynchronous command handles; do not block the coordinator on a long
   build, test or commit hook while requests go unattended. Never interrupt an
   active Git operation to perform a service sweep.
4. Repeat. While help or runnable queued work is pending, target a whole-roster
   service sweep at least once per minute; use host waits of at most 30 seconds
   between sweeps. A periodic heartbeat is recovery support, not the response
   mechanism. Report host latency/capability limits honestly instead of claiming
   an unavailable interrupt or a guaranteed response time.

Count execution from host activity and goal evidence separately from bindings.
For each idle unfinished worker, identify whether the cause is a pending reply,
resource queue, dependency, review/integration gate, exhausted scope or a native
goal state. Correct avoidable coordinator waits; preserve genuine gates. Finish
and discharge started outcomes before giving idle workers unrelated new work.
