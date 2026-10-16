<!-- Copyright (c) 2026 Alex Baretta. MIT License. -->
# Autonomous campaign queues
Use `ponytail swarm queue --help`. Queue campaigns replace coordinator-mediated
assignment dispatch and assignment-local worker goals. The existing project
PostgreSQL database owns the queue; no daemon, session API, remote publication or
new checkout is involved. Host session operations remain coordinator-owned.

## Campaign authority and kickoff

After execution is authorized, inventory canonical obligations and queue all known
work before starting execution goals. Dependencies can be unresolved at kickoff;
only dependency-ready, nonconflicting obligations can be claimed. Queue tasks
reference canonical obligation IDs, not copied acceptance conditions. Reconcile
requirements, UAT, issues, plan, obligation document, binding history and adopted
traceability whenever discovered work changes them.

Each command uses one strict V2 request file:

```text
ponytail swarm queue <command> --request @<request.json>
```

Capture command JSON under the invoking project's ignored temporary directory
and inspect the selected `task`/`request` or compact queue metadata. Do not load
the accumulated source snapshots and discovery history into every worker turn.

Every new request has `schemaVersion: 2`, `command`, `campaignId`, and `actor`.
A coordinator actor is `{kind: "coordinator", sessionId: "<bound-session>"}`;
a worker actor is `{kind: "worker", sessionId: "<original-session>",
generation: "<current-worker-generation>"}`. Run coordinator commands from the
owner checkout and worker commands from their original enrolled checkout.
Generations come from `swarm info`; none are invented. V1 request files remain readable. Output is physical V2: `schemaVersion: 2`,
compact `queue` metadata (campaign, owner, state, sequence, pending discovery ID,
task/request counts), selected `task`/`request`, `page`, and `artifact`, each
selection nullable. It never returns the accumulated queue or source bytes.
`requests` returns the first page of unresolved requests, including processing
ones. Use `page` with `collection: "tasks"|"requests"`, `offset: 0`,
`limit: 1..32`, and `unresolvedOnly: true|false`; continue at `page.nextOffset`
until null. Offset pages are snapshots: restart inventory if concurrent mutation
changes composition. `status` returns only metadata.

Request evidence, source patches/untracked snapshots and host-review content are immutable database-backed `{path, blob: {id, byteLength,
sha256}}`. Use `artifact-read` with `id`, `offset: 0`, and `length: 1..65536`;
append decoded `artifact.contentBase64` bytes and continue at `artifact.nextOffset`
until null, then verify the declared size and digest. Do not attach whole queue
inventories or accumulated receipt collections as evidence: attach the specific
proof/assessment file needed by the request. A selected task receipt omits
historical claims and checkpoint payload bytes; it retains current ownership,
lease, candidate/base, checkpoint revision/ref and review identity. Task inventory pages expose source/review blob references for exact bounded recovery; every referenced byte remains available through `artifact-read`.

The first authorized command upgrades retained V1 storage transactionally using
streamed decoding into chunked artifacts. Its exact original state text is
retained in `legacy_state_text`; interruption rolls back the entire migration,
including new chunks. Run `status` first after installation, verify preserved
counts/ownership and original archive digest, then resume queue mutations. Never
clear the queue, edit its database rows, or raise the heap to mask amplification.
An uncertain mutation requires inspecting current state before retrying. Queue receipts do not establish host execution or obligation acceptance.
Queue commands resolve only the invoking checkout and its recorded owner; a
stale retained sibling cannot suspend service. They still validate the actual
owner/worker repository, session, generation and exclusive claim. Full swarm
inventory and host recovery remain separate operations.

`init` additionally requires `documentPath`, `bindingsPath` (the canonical
`ObligationBindingHistoryV1` file containing exactly `schemaVersion`, `scopeId`
and `revisions`, or null when no history exists),
`authority` (nonempty canonical authority-reference array), `recordRoots`
(the invoking project's declared `{requirements, uat, issues, plans}` relative
directory paths), and `assessor` (an
existing authorized baseline issuer). Initialization delegates routine automatic
lease issuance to the CLI under that campaign authority; workers need no
coordinator acknowledgment. It validates existing local canonical documents;
it does not require `campaign init`, publication, push or deployment. Only one
open queue campaign per swarm is allowed. Release superseded legacy allocations
only after host quiescence and preservation; queue activation and legacy
allocation are mutually fenced. Ordinary existing worker bindings without
rolling allocations are admissible.

`add` additionally requires `tasks`, each exactly:

```json
{
  "id": "TASK-logging",
  "title": "Verify runtime logging",
  "obligationIds": ["OBL-21"],
  "preferredWorker": null,
  "context": ["backend", "logging"]
}
```

Use actual original session IDs for preferences. Both coordinator and workers
may add already-canonical work. Reusing the same task ID with identical contents
is idempotent; duplicate outstanding obligation ownership is rejected. Preference
is a scheduling hint, never exclusive ownership. Unknown work first uses
`discover`, not an invented obligation ID or local second registry.

## Stable worker goal and execution loop

Once authorized, each new execution worker inspects its native goal and creates
one campaign-wide goal, without a token budget unless explicitly requested:

> Collaborate with coordinator session <coordinator-session-id> to bring
> <campaign/plan-name> to verified completion. Autonomously claim work through
> Ponytail's swarm queue, execute your current frozen obligation cluster through
> implementation, configured proof, independent local review and delivery, and
> register newly discovered work with its canonical project records. When work
> needs coordinator help or integration, durably hand it off and immediately
> claim another eligible item. Prefer work allocated to you; otherwise steal
> compatible work, favoring useful context. Never wait for coordinator assignment
> or acknowledgment when eligible authorized work exists. Preserve parked work,
> actual approval gates, resource limits and exclusive scope. Complete this goal
> only after verified campaign completion; respect explicit pause/stop directions.

The goal contains the enduring campaign role. Current obligation IDs, base, paths,
proof selections and claim generations come from each returned claim, not stale
text embedded in the goal. Slice completion never completes the campaign goal.
Retain matching unfinished campaign goals. Do not fake completion, duplicate an
unfinished goal or claim a nonexistent resume/edit API. An obsolete blocked goal
may require graceful replacement of the session after preservation and retirement.
Initialization-only workers remain held until execution is authorized.

The worker loop is:

1. Invoke `claim` (no additional fields). It atomically returns existing working
   ownership on retry, or selects the oldest eligible task preferred for this
   session. Otherwise it steals eligible work, ranking context overlap with its
   most recent task before FIFO. Original parked source ownership is distinct
   from preference: a resumed parked task stays with its original owner.
2. Read the returned frozen leases, actual `claim.base`, canonical conditions,
   proof selections and prerequisite evidence. Work autonomously within this
   scope, including configured focused checks and independent read-only local
   review. Real host denials remain gates. A blocked operation does not suspend
   other authorized work. Queue only operations consuming unavailable resources;
   continue source/proof preparation or other compatible work.
3. When help or integration is needed, invoke `handoff`, then immediately invoke
   `claim` again. Coordinator notification is the durable request itself; no
   message receipt or permission reply gates acquiring another task.
4. Register discoveries as they occur and repeat. Add canonical unfinished work
   missing from the queue yourself; use discovery for genuinely new obligations.
   When no item is returned,
   check pending original requests, resource completions and dependency readiness;
   do genuinely useful independent authorized work. Do not manufacture activity
   with unchanged polls or retry real denials. An exhausted queue is an observable
   lack of runnable work, not a promise that native goals can never block.

`handoff` additionally requires `taskId`, current claim `generation`, stable
`requestId`, `kind` (`help` or `integration`), `detail` (exact needed action),
`evidencePaths` (worker-relative files), and `candidate` (null for help).
The operation retains unresolved path/obligation reservations, preserves HEAD
under a durable Git ref, and snapshots index/worktree binary patches plus
nonignored untracked source bytes. It does not reset, clean, stash, switch or
commit the checkout, and it cannot bypass a denied Git operation. Snapshots are
recoverable preservation evidence, not permission to overwrite pre-existing work.
The task and request retain their original worker/root and generation.

Continue on disjoint paths while parked changes remain. Stage only the current
claim's changes; never sweep parked changes into a new commit. If the index
already contains parked changes, use the project's exact-path commit workflow
(for ordinary Git, `git commit --only ... -- <current-claim-paths>`) to preserve
those staged changes outside the new commit. Preserve exact
base and candidate refs. If clean source permits a branch switch, retain pending
candidate refs first and use the actual safe base. Stacked deliveries retain their
Git prerequisite and must integrate in that order; do not represent an unmerged
ancestor as independently accepted. Scope conflicts make an item ineligible;
choose another rather than waiting for coordinator reassignment.

An integration candidate is exactly:

```json
{
  "base": "<exact-claim-base-commit>",
  "revision": "<exact-reviewed-candidate-commit>",
  "reviewer": "<actual-host-issued-independent-reviewer-id>",
  "verdictPath": "tmp/proof/review.json",
  "proofPaths": ["tmp/proof/evidence.json"]
}
```

The verdict file contains exactly `schemaVersion: 1`, `reviewer`, `base`,
`revision`, `accepted: true`. Each proof file is the canonical `ObligationEvidence`
contract, with exact candidate revision, frozen selections/target, finalized pass,
no skips/failures and fresh inputs. Define command-consumed scopes before the run
using [proof input scopes](../../plan-execution/SKILL.md#proof-input-scopes);
retain an overbroad old receipt unchanged and correct scope only for a new run.
Queue storage snapshots review/proof/output
bytes; paths alone are insufficient. Before a necessary semantic rebase onto an advanced campaign branch, call
`refresh-base` with `taskId`, current claim `generation`, and exact new `base`.
The CLI verifies descendant owner HEAD and unchanged bindings, preserves source
and the prior claim, and issues a new generation without coordinator approval.
Use that returned base/generation for rebase, renewed proof and review.
All per-commit changed paths must belong to
the frozen cluster; hiding changes with a later arbitrary base is rejected.
Inspection-only leases (`operations: ["inspect"]`, empty selection, null target)
may deliver a finite source assessment with empty `proofPaths`. Supply the actual
assessment through `evidencePaths`, obtain independent review, and use unchanged
source (`candidate.base === candidate.revision`). No execution/test receipt is
invented. Resolution still requires a fresh canonical certificate with exact Git
revision inputs and the retained assessment bytes; this establishes source
assessment, not code integration, a unit pass or an external approval. Other
leases retain their configured execution-proof and integration requirements.

The worker's verdict is a proposal until the coordinator independently collects
the original host reviewer evidence. Never fabricate an identity or a verdict.

## Coordinator queue service

After kickoff, request service is the coordinator's main loop, not an occasional
interruption of unrelated implementation. Inspect processing requests and retained
operation handles, then invoke `take` (no additional fields). It marks the oldest
open request processing. Start that action or identify its exact impediment;
retain asynchronous handles and service the next request without waiting for a
long operation to finish. FIFO means service initiation order; it does not require
head-of-line blocking until every earlier operation completes. Never interrupt a
live Git operation. Restart from processing entries; do not lose or duplicate them.

For integration, collect the exact original independent reviewer verdict through
host tools, not a second implementation review. `record-review` requires `taskId`,
claim `generation`, `reviewer`, and owner-relative `hostEvidencePath` containing
that actual host-tool evidence. Only the bound coordinator can attest collection;
the evidence bytes and exact candidate/base are retained. Worker-supplied JSON
alone cannot satisfy acceptance. Apply the existing canonical certificate-binding,
proof, integration and publication gates; this queue grants no push authority.

`resolve` requires `requestId`, concrete `response`, and `outcome`:

- `answered` or `retry` resolves the request and returns the unfinished task to
  ready for its original worker, preserving parked source. That worker acquires
  it when available without a coordinator message or new goal.
- `accepted` requires the exact host-collected review, candidate integrated in
  the owner, and fresh canonical discharge evidence for that candidate. It marks
  the task done. A merge, acknowledgment or queue receipt alone is insufficient.

Retry the same operation identity after an uncertain response. Different content
or resolution outcome is rejected. Do not call a request resolved merely because
it appears in a progress summary. The worker need not remain idle while requests
are processing. Prioritize completing started obligations and promptly integrate
ready deliveries; do not repeatedly re-investigate accepted worker proof.

## Discover work throughout execution

Both actors have standing authority to call `discover`; no coordinator approval
is required for authorized campaign discoveries. Additional material scope,
contradictory requirements, literal outside-project changes and actual external
approval gates still require the user's resolution. Do not misclassify routine
bugs, missing proof or PM bookkeeping as new human decisions.

The command has one additional `discovery` field:

```json
{
  "id": "DISC-runtime-defect",
  "kind": "bug",
  "actor": {"kind": "worker", "sessionId": "<original>", "generation": "<worker-generation>"},
  "updates": [
    {"path": "pm/bugs/in_progress/<issue>.md", "beforeContent": null, "content": "<complete-new-content>"}
  ],
  "tasks": [{"id": "TASK-runtime-defect", "title": "Repair runtime defect", "obligationIds": ["OBL-22"], "preferredWorker": null, "context": ["runtime"]}]
}
```

Use `kind: "bug"` for a defect and `"work"` otherwise. Supply the complete,
applicable updates, not only the illustrative issue row: requirements, UAT, plan,
canonical obligation document/checkpoint and binding history as necessary,
issue records for bugs, and configured traceability inventory/reverse view.
`beforeContent` is exact current text, or null for a new path. Use configured PM
ownership and lifecycle paths; no scripts/executable payloads or outside-project
paths. Keep append-only obligation/history evidence and authority intact. Existing
canonical obligations can be queued without rewriting their meaning.

For an assessment of existing obligations with no new work, the coordinator uses
`discover` with `kind: "work"`, `tasks: []`, and the canonical obligation document
update appending its valid assessment checkpoint (and any new certificate). Include any new assessment
artifacts under the configured plan root, referenced by those certificates.
Baselines, obligation definitions and binding history remain unchanged. Only the
checkpoint document and its referenced plan evidence may be updated in this
mode; do not invent requirement IDs, UAT edits or another task. Canonical
checkpoint validation still requires authority, fresh inputs and honest neutral
or productive semantics. Workers propose assessments through handoff; the
coordinator records host review and performs canonical publication.

This persists PM assessment state without creating a source commit. For unchanged
inspection candidates, retain the reviewed source revision and its exact inputs;
queue resolution does not require an acceptance-only Git commit. Respect the
project's commit policy: when it forbids such commits, include the assessment
records in the next permitted productive change, retaining their exact source
binding. PM publication, source integration and campaign completion are distinct.

The CLI serializes discovery under the project fence, validates proposed canonical
transitions against proposed inputs, durably records intent before publishing,
then atomically makes tasks claimable only after all records are written. Stale
inputs fail rather than overwrite concurrent edits. An interrupted publication
leaves a visible pending discovery and fences new claims until recovery. Existing
frozen work remains owned; any authorized actor can recover, without coordinator
acknowledgment. `recover` requires `discoveryId`; retry the exact discovery ID.
`abort-discovery` with that ID reverses only that operation's exact text updates
when no intervening edit exists. It preserves unknown changes by refusing a
conflict. Correct the proposed input and submit a new discovery afterward.
Never hand-edit the database to clear pending state.

`complete` is coordinator-only and requires all requests resolved, all tasks done,
no pending discovery and verified complete canonical obligations, under the same
fence as discovery. Do not declare completion from an empty ready queue.

## Graceful transition

The replacement procedure here is a pre-claim migration. After a worker owns
parked queue source, retain that original; this version does not transfer its
dirty checkout or claim to a replacement. Authorized follow-up turns can advance
the original without pretending to reset its native goal.

Before queue activation, inventory every old session's actual operations, dirty
and staged source, reviewed candidate/base/verdict/proof and pending requests.
Quiesce through host tools at safe boundaries. Preserve source, exact index patches,
untracked work and durable Git refs plus reviewer evidence. Do not erase held
approval denials. Detach superseded bindings only after preservation and verify
read-back. Keep required original chats stopped and protected from host cleanup;
protect new idle workers before expanding the fleet. In Codex, pinning protects
against automatic cleanup; archiving a managed-worktree chat removes its checkout,
even when Ponytail still records it. Never use archival as harmless chat cleanup
while the checkout or ignored evidence is retained. Recheck physical roots after
host operations. If a root disappears, stop further creation/archival, preserve
all remaining refs/snapshots/evidence and use the original host restoration path;
do not reconstruct Git metadata or claim unverified ignored files survived.

Where obsolete unfinished goals prevent adoption, create fresh top-level workers
using the swarm skill's exact coordinator project/native-worktree creation path.
Admit actual returned identities and unique roots. Queue preserved unresolved
work with its provenance and delivery prerequisites, establish campaign-wide goals,
and verify real claims. Do not silently transfer a dirty original checkout to a
replacement. Keep a source-owning original retained until a verified handoff is
complete. Report retired sessions, retained roots, new bindings, queue ownership
and actual activity separately. Installation alone does not establish migration.
