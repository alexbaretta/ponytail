<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaigns

[Requirements index](index.md) | [Implementation plan](../plans/closed/2026-10-10-rolling-obligation-campaigns/plan.md)

Approval: stakeholder implementation goal and preceding clarified workflow,
2026-10-10. This explicitly changes campaign scheduling, worker retention,
publication cadence and fast-rebase policy for the new rolling mode. Historical
records/readers retain their physical meanings; no live campaign auto-migration.

## REQ-ROLLING-CONFIGURATION: Persist the campaign's execution configuration

**Atomic obligations:** [OBL-22](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-22), [OBL-23](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-23), [OBL-24](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-24), [OBL-36](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Resolve mainline at planning from user request, project default, then effective
Git `init.defaultBranch`; validate refs and persist remote/branch selection.
Resolve active N with default 10 and publication M with campaign/project/global
precedence and global default 1. Validate positive safe integers. Validate one
physical managed-worktree directory from the invoking owner's configuration,
accepting absolute or explicitly anchored relative configuration. Do not read or
validate sibling checkout configurations, including registered numbered-pool
members. Historical checkouts need no adoption or configuration changes. The
owner's configured directory must still match its recorded pool when allocating
numbered checkouts. This stakeholder clarification (2026-10-16, Option 1)
supersedes the earlier cross-checkout agreement requirement.
Numbers start at 101.

## REQ-ROLLING-GRAPH: Coordinator-authoritative dependencies

**Atomic obligations:** [OBL-25](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-25), [OBL-26](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-26), [OBL-27](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-27), [OBL-35](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35), [OBL-56](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

The coordinator's accepted files exclusively own obligations and dependency
edges. Assignments identify that snapshot. Reconcile discoveries and relevant
incoming changes, detect cycles, reject stale allocation inputs and invalidate
affected evidence truthfully. Worker copies cannot change scheduling authority.
Keep any database graph projection derived and disposable. Assignment references
include requirements, acceptances, implementation files and unit/integration
Arc/Step identities and selectors where applicable.

Compliance obligation OBL-129 requires the coordinator API and next-action
projection to expose renewal of a stopped inactive worker's frozen lease after
an authorized dependency/binding amendment. Preserve its original session and
checkout, fence the previous generation, and resume only the current lease.
An internal database method callable only by tests does not meet this contract.

## REQ-ROLLING-SCHEDULING: Resume-first maximal compatible allocation

**Atomic obligations:** [OBL-28](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-28), [OBL-29](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-29), [OBL-30](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-30), [OBL-31](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31), [OBL-34](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34), [OBL-46](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-63](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Algorithmically select a deterministic maximal compatible ready set up to N.
Prefer unblocked inactive sessions before new workers. Acknowledged suspension
releases active capacity while retaining exclusive checkout/obligation ownership.
Release plus subsequent allocation is atomic; absence of ready work does not
undo release. Unknown readiness/compatibility cannot be treated as success.

## REQ-ROLLING-STATE: Durable operational coordination

**Atomic obligations:** [OBL-31](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31), [OBL-32](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-32), [OBL-33](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-33), [OBL-34](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34), [OBL-35](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35), [OBL-44](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44), [OBL-46](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-48](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48), [OBL-56](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56), [OBL-57](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57), [OBL-58](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-62](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62), [OBL-63](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64), [OBL-69](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

PostgreSQL exclusively owns rolling execution state, reservations, leases,
blockers, reviews, QA references, publication and external-action recovery.
Enforce ownership, stale-generation fencing and project scoping. Recover unknown
external outcomes idempotently. Query interfaces return executable next actions,
their exact identities, dependencies and reasons so the coordinator can dispatch
without reconstructing scheduling state. Files remain obligation authority.

Historical plan inspection contribution: [OBL-113](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-113), owned by REQ-ROLLING-STATE. The plan-execution contract requires a completed plan to remain an immutable historical execution record across its successful-completion directory move. Inspect its accepted history without treating that historical result as current-input authorization for active work. Canonical conditions and criteria remain in the obligation document.

## REQ-ROLLING-WORKERS: Ponytail-owned checkouts and direct sessions

**Atomic obligations:** [OBL-36](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37), [OBL-38](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-38), [OBL-39](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-39), [OBL-40](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-40), [OBL-41](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-41), [OBL-42](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-42), [OBL-43](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-43), [OBL-44](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44), [OBL-45](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-45), [OBL-46](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-48](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48), [OBL-57](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Create/setup ordinary Git worktrees in the configured pool; reuse the lowest
healthy available number with a fresh Codex session in that exact checkout.
Use direct Codex control without requiring a Ponytail plugin. Setup repairs and
verifies the session marker's ignore rule. Validate native attachment identity.
Required semantic replay receives one-use native escalation approval only for
the active frozen edit lease, retained actor, checkout and instruction turn,
using the documented replay command against its freshly fetched campaign base.
Unrelated commands and native file-change requests remain outside that authority.
A submitted campaign base may remain an ancestor of the current increment after
another compatible delivery lands. Preserve the exact worker candidate, lease
and proof; the coordinator refreshes it through the reviewed fast-rebase path.
Reject an unrelated base or an unintegrated candidate revision used as its own
base to conceal changes.
Retire a worker and its owned activity before release/reuse; inactive workers
retain their original session/checkout. Preserve valid caches and user work.
An observed failed native instruction turn may be suspended without a fabricated
obligation dependency. Retain its original idle actor and checkout, including an
unfinished rebase, and resume through the same completion-first lifecycle.

## REQ-ROLLING-REVIEW: Reviewed incremental integration

**Atomic obligations:** [OBL-49](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-49), [OBL-50](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-50), [OBL-51](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-51), [OBL-52](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-52), [OBL-53](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-53), [OBL-54](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-56](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Workers perform full semantic rebases and focused QA, then normally use a local
read-only reviewer subagent whose host-issued identity and verdict bind the exact
candidate. The worker preserves that reviewer through corrections. The
coordinator records and verifies the resulting attestation without repeating the
review, then retains sole ownership of integration, acceptance and publication.
If that reviewer is lost, the coordinator records the loss reference and
replacement, preserves previous requests and verdicts, fences the replaced
request, and obtains a fresh review of the exact candidate from the replacement reviewer. The
coordinator uses the explicitly authorized interactive fast rebase, inspecting
semantic conflicts when textual conflicts arise. Refresh required proof on
changed inputs, push normally, and verify remote outcomes. Delivery does not
by itself discharge obligations or establish mainline acceptance.

The canonical `start-review` command remains the fallback when a worker cannot
create or identify a local reviewer: it creates a top-level reviewer and starts
its actual review on the same native connection before closing it. Rework
resumes the recorded reviewer thread; retries retain its exact original turn. An empty native
thread is not a durable review actor, and replacement still requires an explicit
observed loss reference.

The canonical `integrate` command must perform this complete lifecycle, retaining
the original integration intent for retries. A changed replay reruns the configured
focused QA against the actual candidate before publication. Textual conflicts
return the original worker for semantic repair and fresh review; failed QA leaves
the candidate unpublished. A confirmed delivery retry returns its original receipt.

OBL-160 requires loss-aware reviewer replacement through the shared coordinator
API, CLI and MCP. Supply the original review ID and an explicit loss reference;
retain the prior request/verdict, fence its actor and obtain fresh review from
the replacement. An internal store method alone is insufficient.

## REQ-ROLLING-PUBLICATION: Fully validated publication batches

**Atomic obligations:** [OBL-54](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-58](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-59](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-59), [OBL-60](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-60), [OBL-61](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-61), [OBL-62](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Integrate each reviewed increment to the campaign branch after focused QA.
Publish to the configured mainline at M increments, explicit flush, final partial
completion or quiescence. Full applicable unit/integration/project QA precedes
publication on the exact mainline-reconciled candidate. Failures and stale proof
prevent publication. Preserve history and resolve upstream races without force
pushes. Daily delivery is an expected consequence, never an imposed constraint.

## REQ-ROLLING-INTERFACES: One operation model for CLI and MCP

**Atomic obligations:** [OBL-63](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64), [OBL-65](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-65), [OBL-66](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-66), [OBL-67](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-67), [OBL-68](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-68), [OBL-69](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Replace the obsolete campaign dispatcher. Organize CLI into chapters with root,
chapter and command usage describing arguments and behavior. Expose the same
coordination operations through MCP without duplicate policy or scheduling.
Keep historical inspection available and make live migration explicit.

## REQ-ROLLING-CLIENT-PROTOCOL: Export the rolling operating procedure

Approval: stakeholder compliance audit and implementation goal, 2026-10-12.
Atomic obligations OBL-114, OBL-115 and OBL-116 in the campaign's compliance
baseline own the conditions and discharge criteria for this requirement.

The exported glossary must define worker and coordinator alongside obligation,
acceptance, Arc, Step and tasklet. Exported rules and skills must teach planning
around the smallest independently verifiable, coherently integrable obligation.

The coordinator's exported procedure must describe creating the authoritative
obligation and binding files, initializing the campaign, querying status and
next actions, updating discovered dependencies and reconciling the graph,
allocating compatible work, suspending blocked workers and resuming them first,
and carrying review, integration and publication through the canonical CLI.
It must use returned identities and scheduling decisions rather than recreate
the scheduler in conversation. Explain required configuration and request data.

Workers must autonomously implement their leased obligation, synchronize
traceability, run focused QA and builds, perform the required semantic rebase,
and submit exact evidence for adversarial review and coordinator publication.
They must correct rejected work without requesting routine implementation
approval. Unknown dependencies, scope changes and blockers require coordinator
attention; workers cannot alter the authoritative graph or publish themselves.
Serial-only instructions must be limited to legacy serial execution and must
not prohibit the explicitly configured rolling workflow or adversarial review.

The installer and generated host copies must export this same procedure and
its glossary resources. Copied obligation inspection runtimes must include their
required dependencies and execute outside the source repository without Node
module search overrides. Runtime worker briefs alone do not satisfy this
requirement. Acceptance: [ROLL-CLIENT-PROTOCOL](../uat/rolling-campaigns.md#arc-roll-client-protocol).

### CLI help compliance amendment

OBL-117 through OBL-122 under REQ-ROLLING-INTERFACES cover search, plan,
traceability, plan-input, worktree and root utility help respectively. Every
chapter lists its commands; every command explains its arguments and behavior.
Root `-h`/`--help` lists only first-level chapters and utilities, without
expanding their subcommands or usage pages. Invalid command selection prints
the same relevant chapter/root help as `-h`, exits unsuccessfully, and precedes
project/database access. Index argument errors print full subcommand help.
Help wraps at word boundaries to the terminal width (80 columns when no
terminal width is available), preserving indentation.
Help returns successfully without performing the command's mutations, including
for registration and recovery commands. Existing campaign and PM help must
remain functional. Acceptance: [ROLL-CLI-HELP](../uat/rolling-campaigns.md#arc-roll-cli-help).

Execution binding amendment contribution: [OBL-107](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-107), owned by REQ-ROLLING-GRAPH. Canonical conditions and criteria remain in the obligation document.

Shared binding-aware selector contribution: [OBL-108](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-108), owned by REQ-ROLLING-GRAPH. Its canonical criterion is in the obligation document.

Frozen execution lease contribution: [OBL-109](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-109), owned by REQ-ROLLING-GRAPH. Its canonical criterion is in the obligation document.

Stored frozen lease contribution: [OBL-110](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-110), owned by REQ-ROLLING-GRAPH, REQ-ROLLING-STATE and REQ-ROLLING-SCHEDULING. Its canonical criterion is in the obligation document.

Frozen worker submission contribution: [OBL-111](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-111), owned by REQ-ROLLING-GRAPH, REQ-ROLLING-STATE and REQ-ROLLING-WORKERS. Its canonical criterion is in the obligation document.

Bound certificate acceptance contribution: [OBL-112](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-112), owned by REQ-ROLLING-GRAPH. Its canonical criterion is in the obligation document.

## REQ-ROLLING-READONLY-COLLECTION: Read-only result collection

Atomic obligation: OBL-RECOVERY-1. Collect the recorded original worker turn
without resuming its thread, acquiring a writer, or interrupting foreign
activity. Verify native thread/session/physical checkout identity, current
assignment generation and the exact recorded turn. Require known idle activity
and a completed, valid submission before existing submission checks run.
An unloaded observer is not proof of idle activity. Where the worker belongs to
another transport, the authorized coordinator may provide a fresh owning-
transport observation of that same actor and latest turn; contradictory,
stale, active or mismatched observations are rejected. Actual dispatch retains
writer acquisition. Completed blocker prose is not a discharge proposal.
Discharge: ACC-ROLLING-READONLY-COLLECTION demonstrates collection while another
transport retains its idle writer and rejection of every invalid boundary above.

## REQ-ROLLING-PUBLICATION-REPAIR: Repair a failed-QA candidate

Atomic obligation: OBL-RECOVERY-2. A retained QA_FAILED batch can adopt an
explicitly reviewed, committed descendant repair through `repair-publication`.
The repair identifies the exact predecessor, accepted review and changed paths.
Preserve batch identity, original candidate, source history, frozen membership
and immutable QA attempts. Atomically journal candidate adoption, clear current
QA authorization, and require fresh configured full QA on the exact repaired
candidate before normal publication. Reject unrelated ancestry, dirty or
foreign checkouts, unreviewed changes and retries with different repair data.
Discharge: ACC-ROLLING-PUBLICATION-REPAIR demonstrates failed QA, reviewed
candidate adoption, restart-safe retry, rejected stale proof, fresh full QA and
normal publication without replacing the original batch or its history.

## REQ-ROLLING-CONFIGURATION-AMENDMENT: Existing-campaign configuration

Atomic obligation: OBL-RECOVERY-3. Amend the existing campaign's mainline branch,
active-worker limit and publication size through an authorized, optimistic,
immutable recorded amendment. Preserve campaign identity, increment branch and
remote, workers, leases and historical configuration. Refuse changes while an
unwithdrawn publication or integration owns the coordinator checkout. Identical
request retries return the original receipt without overwriting later changes.
Discharge: ACC-ROLLING-CONFIGURATION-AMENDMENT verifies amendment, stale-input
refusal, replay safety and scheduling against the amended effective values.

## REQ-ROLLING-PUBLICATION-WITHDRAWAL: Unpublished batch withdrawal

Atomic obligation: OBL-RECOVERY-4. Withdraw an unpublished, settled batch with
recorded reason and authority, retaining its frozen claim, membership, candidate,
repairs and QA attempts. Refuse running QA, incomplete Git preparation/refresh,
or any started/unresolved/published push. Atomically release its operational
ownership and membership reservations so accepted increments can be frozen under
the current amended configuration. Preserve the original candidate branch; no
Git reset, target rewrite or push occurs. Refuse future mutations/publication of
the withdrawn batch. Discharge: ACC-ROLLING-PUBLICATION-WITHDRAWAL verifies all
boundaries, retained history, refreezing and fresh QA against the new target.

## REQ-ROLLING-WORKER-CORRECTION: Terminal worker correction

Atomic obligation: OBL-RECOVERY-5. Return an original terminal, idle worker for
correction without inventing a prerequisite or changing its actual native turn
status. Verify latest original turn, actor, checkout and current generation;
record the correction reason and retained checkout checkpoint. Release active
capacity while preserving actor, work and lease for preferred reactivation.
Unknown/active ownership remains refused. Discharge:
ACC-ROLLING-WORKER-CORRECTION verifies completed blocker prose, same-actor
reactivation and stale/active observation refusal.

## REQ-ROLLING-QA-APPROVAL: Required focused QA approval

Atomic obligation: OBL-RECOVERY-6. Native worker approval routing recognizes the
exact required focused QA argv from its current frozen execution/bindings and
configured focused QA, fenced to the original actor, checkout, instruction turn
and generation. Preserve accepted host permission restrictions. Do not authorize
arbitrary shell suffixes, diagnostic scripts or policy proposals. Retain bounded
semantic-rebase approvals. Discharge: ACC-ROLLING-QA-APPROVAL verifies exact QA
requests and refusal of altered commands, foreign identities and stale leases.

## REQ-ROLLING-PARALLEL-DISPATCH: Automatic configured concurrency

Atomic obligation: OBL-RECOVERY-7. Once campaign execution is authorized and
rolling operations adopted, fill compatible ready work up to N without requiring
another instruction to parallelize. N defaults to 10. Keep long-running worker
dispatches on concurrent retained transports rather than awaiting workers one by
one. Report actual running workers separately from occupied leases, projected
selection and unavailable checkouts. Preserve dependency, ownership and physical
checkout authorization constraints. Discharge: ACC-ROLLING-PARALLEL-DISPATCH
verifies concurrent dispatch guidance and truthful capacity/blocker reporting.

## REQ-ROLLING-RESET: Explicit project campaign reset

Authority: Alex's explicit reset request on 2026-10-13.
Atomic obligation OBL-RESET-1: preview and execute a restartable reset of the
invoking project's parallel campaign execution state. Stop and archive original
workers/reviewers before releasing ownership, run declared resource cleanup,
remove leases and prior rolling campaign records, and allow fresh initialization.
Remove obsolete agent-owned registered Git checkouts outside the configured
physical managed directory, including this repository's Codex checkouts; retain
main/coordinator and ordinary user checkouts. Clear session markers in retained
pool members and prepare them at the coordinator's committed base while retaining
build caches. Preserve unpublished commits and tracked/untracked source changes
through named Git recovery refs. Never wipe other projects or search/traceability
indexes. A preview must list exact paths, actors and disposition without mutation.
Unknown actor ownership, active external publication/QA, incomplete resource
cleanup or changed physical identity retains a pending reset and blocks new work.
Execution requires an explicit request ID, reason and authority; interrupted
execution resumes that request, and identical completed retries are harmless.
Discharge: ACC-ROLLING-RESET demonstrates preview, original actor cessation,
external removal, pool reuse, DB isolation and interrupted retry.

## REQ-ROLLING-EXISTING-POOL: Replenish within existing physical checkouts

Authority: Alex's 2026-10-13 request to verify successful reset and actual
parallel restart; GWEN's fixed existing checkout boundary.
Atomic obligation OBL-RESTART-1: allow the coordinator to replenish only into
registered physical numbered checkouts in the configured managed directory.
An explicit existing-only invocation must import safely available retained
checkouts after reset clears DB pool rows, choose the lowest available number,
prefer original resumable actors, and stop with a physical capacity result
without reserving nonexistent roots. Keep configured N unchanged.
Discharge: ACC-ROLLING-EXISTING-POOL demonstrates a gapped physical pool with
N larger than the pool, reuse after reset, and no out-of-pool creation.

Under REQ-ROLLING-PUBLICATION, atomic obligation OBL-RESTART-2 requires
`campaign observe-increment --campaign <id> --review <id>` to settle the
original push intent from freshly fetched remote containment without checkout
mutation or another push. An absent candidate yields REBASE_REQUIRED; an
unobservable remote remains UNCONFIRMED and cannot be treated as settled.

Observation requires `--stopped <reference>`: the coordinator explicitly
attests terminal cessation of the original integration/push operation using
owning-command evidence. Remote absence alone is insufficient; running or
unknown operations remain fenced.

Under REQ-ROLLING-WORKERS, atomic obligation OBL-RESTART-3 requires worker
instructions to name the exact remote-tracking campaign increment branch and
fetch argument vector used for full semantic replay. The coordinator owns
publication to the separately configured mainline.

Under REQ-ROLLING-WORKERS, atomic obligation OBL-RESTART-4 requires instructions
to include changed candidate artifacts and command-consumed QA inputs while
distinguishing authority-only reads. Artifact inclusion establishes Git
freshness, not automated testing of inert prose. Retain authority in the frozen
lease. A worker must report incompatible proof
scope if QA consumes the accepted obligation document, whose changing accepted
state cannot certify its own bytes; it must not omit a genuine QA input.

Under REQ-ROLLING-WORKERS, atomic obligation OBL-RESTART-5 requires a desktop
coordinator to hand frozen work to the existing desktop-owned worker session.
Ponytail preparation must observe the original identity and terminal turn
without acquiring a competing writer or executing implementation. An observed
active actor or failed native runtime cannot be prepared; an unloaded actor
is not asserted idle. Acknowledgment must bind
the original dispatch/session/generation to the actual latest native turn and
verify its canonical instruction delivery against the immutable instructions,
without acquiring a
second writer. Recover uncertain sends by observing the original turn; never
resend blindly. Desktop activity must be verified through the owning desktop,
separately from database occupancy and private App Server activity.

Direct native dispatch records a user-message input. Desktop cross-session
delivery records the `codex_app` / `send_message_to_thread` function-call output
with its delegation envelope and once-escaped input. Acknowledgment must compare
that exact canonical representation to the frozen instructions; arbitrary tool
outputs, altered or duplicate inputs and noncanonical escaping do not qualify.
