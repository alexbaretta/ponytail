<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign acceptance Suite

## Arc ROLL-CLIENT-PROTOCOL

Traceability: verifies REQ-ROLLING-CLIENT-PROTOCOL

Actor: client coordinator and worker agents. Profile: disposable local exported
skill installation and controlled CLI/native-protocol fixtures.

1. **Acceptance CLIENT-TERMS (OBL-114):** Inspect exported glossary resources.
   Worker, coordinator and the existing planning terms have explicit definitions;
   the atomicity rule retains independent verification and integration boundaries.
2. **Acceptance COORDINATOR-PROCEDURE (OBL-115):** Follow the exported procedure
   through graph creation, initialization, dependency discovery, reconciliation,
   status/next-actions, allocation and blocked-worker reactivation. Its commands,
   configuration, requests and returned identities match the implemented API.
   The coordinator need not reconstruct scheduling policy independently.
3. **Acceptance WORKER-AUTONOMY (OBL-116):** Read the exported skill and actual
   worker brief together. Exercise implementation, focused QA, semantic rebase,
   rejected-review correction and submission. Routine progress requires no
   coordinator approval; review, publication, blockers and scope decisions retain
   their proper owners. No unconditional serial rule contradicts this workflow.
4. Inspect installed and generated host copies, including supporting resources;
   run obligation validation and ESM named imports outside the source repository
   without Node module search overrides. Both succeed. Installed resources
   agree with canonical skills. This is required proof for the three
   preceding acceptances, not an additional delivered obligation.

## Arc ROLL-CLI-HELP

Traceability: verifies REQ-ROLLING-INTERFACES

Actor: CLI user. Profile: isolated registered Git project with recorded original
Git, filesystem and operational state. No cloud or remote publication effects.

1. **Acceptances HELP-SEARCH (OBL-117), HELP-PLAN (OBL-118),
   HELP-TRACEABILITY (OBL-119), HELP-PLAN-INPUT (OBL-120),
   HELP-WORKTREE (OBL-121), HELP-UTILITIES (OBL-122):** Invoke each chapter and
   every advertised command with `--help`. Each exits successfully and lists
   the applicable commands, arguments and observable behavior.
2. Repeat help for campaign commands and PM PDF commands; existing help remains
   available. Verify help for mutating utilities, registration and worker
   recovery has not changed the recorded original state.
3. Inspect the exported coordinator procedure against the help/API inventory.
   Every required scheduling operation is documented and callable.
4. **Acceptance REBIND-RETAINED-WORKER (OBL-129):** Discover and amend a
   prerequisite of a stopped inactive worker. Reconcile the coordinator graph,
   obtain the required renewal action and execute it through the CLI/shared API.
   The original session/checkout remains owned; the old generation is rejected,
   and the renewed assignment can resume when its prerequisites are satisfied.

[UAT index](index.md) | [Requirements](../requirements/rolling-campaigns.md)

Actor: coordinator and independent workers. Prerequisites: isolated project
fixtures, configured PostgreSQL roles, direct Codex session capability and no
live campaign ownership. Expected outcomes below remain required. Automated
component, PostgreSQL, CLI/MCP and native execution evidence now exists.
Whole-campaign acceptance remains pending current certificate renewal and
requirement/inventory rollups; a passing contribution does not discharge its
entire requirement.

## Arc ROLL-CONFIG: Resolve and retain configuration

Traceability: verifies REQ-ROLLING-CONFIGURATION

1. **Step CONFIG-PRECEDENCE:** Acceptance contribution to [OBL-22](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-22), [OBL-23](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-23), [OBL-24](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-24). Initialize campaigns with explicit, project and
   Git-default target selections; inspect persisted targets. Each uses the
   requested precedence, remains fixed after default changes, and rejects an
   invalid ref or nonpositive/unsafe N/M.
2. **Step CONFIG-POOL:** Acceptance contribution to [OBL-36](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37). Configure absolute and anchored-relative pool paths.
   The coordinator, every registered pool member and every other configured checkout
   resolve to the same physical directory. Unconfigured historical branches need
   no edits; a missing configuration on a pool member fails closed. A mismatch
   is rejected. First managed allocation uses number 101.

## Arc ROLL-GRAPH: Reconcile dependency discovery

Traceability: verifies REQ-ROLLING-GRAPH

1. **Step GRAPH-AUTHORITY:** Acceptance contribution to [OBL-25](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-25). Give a worker an older graph and change coordinator
   files. Scheduling uses only the accepted coordinator snapshot; an allocation
   with its old digest is rejected.
2. **Step GRAPH-DISCOVERY:** Acceptance contribution to [OBL-26](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-26), [OBL-35](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35). Report an unknown dependency, reconcile its amendment
   and rerun scheduling. The new prerequisite gates the obligation. A cycle is
   diagnosed and cannot produce assignments; affected evidence is invalidated.
3. **Step GRAPH-TRACE:** Acceptance contribution to [OBL-27](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-27), [OBL-45](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-45). Inspect assignment requirement, acceptance and specific
   test-Step references. All resolve to canonical files/selectors.

## Arc ROLL-SCHEDULE: Suspend and resume while filling capacity

Traceability: verifies REQ-ROLLING-SCHEDULING

1. **Step SCHEDULE-FILL:** Acceptance contribution to [OBL-28](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-28), [OBL-30](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-30). Request more compatible obligations than N. Exactly
   available capacity is reserved; conflicting work is excluded deterministically.
2. **Step SCHEDULE-SUSPEND:** Acceptance contribution to [OBL-46](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46). Suspend an acknowledged blocked worker; start other
   ready work. Its retained checkout cannot be reused. Silence does not release
   capacity or ownership.
3. **Step SCHEDULE-RESUME:** Acceptance contribution to [OBL-29](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-29). Resolve the blocker and free capacity. Resume its
   original session before creating a new worker.
4. **Step SCHEDULE-RELEASE:** Acceptance contribution to [OBL-34](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34). Release a retired assignment when nothing is ready.
   Release succeeds and reports no ready obligation.

## Arc ROLL-STATE: Recover ownership and external actions

Traceability: verifies REQ-ROLLING-STATE

1. **Step STATE-CONTENTION:** Acceptance contribution to [OBL-31](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31). Race allocation in real PostgreSQL transactions.
   Capacity and exclusive ownership hold; the lowest available number is chosen.
2. **Step STATE-RECOVERY:** Acceptance contribution to [OBL-32](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-32), [OBL-33](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-33), [OBL-43](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-43), [OBL-48](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48). Interrupt after a recorded external-action intent.
   Restart coordination, reconcile its actual result, and continue without a
   duplicate worker or publication. Old lease events cannot affect a successor.
3. **Step STATE-ACTIONS:** Acceptance contribution to [OBL-63](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64). Inspect next-actions from durable state. Each action
   includes exact assignment/session identities and executable prerequisites.

## Arc ROLL-WORKER: Execute in a Ponytail-owned checkout

Traceability: verifies REQ-ROLLING-WORKERS

1. **Step WORKER-START:** Acceptance contribution to [OBL-38](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-38), [OBL-40](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-40), [OBL-41](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-41), [OBL-44](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44). Prepare an ordinary Git checkout and start a fresh
   native Codex thread with its exact cwd, without a Ponytail plugin. Verify
   returned session identity, loaded project instructions, marker and ignore.
2. **Step WORKER-REUSE:** Acceptance contribution to [OBL-39](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-39), [OBL-42](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-42), [OBL-57](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57). Retire its completed assignment, prove writes/processes
   ceased, then allocate the lowest available checkout to a new session. Reuse
   cannot precede retirement; valid caches remain.
3. **Step WORKER-RESUME:** Acceptance contribution to [OBL-47](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47). Resume a suspended native session in its original
   checkout. Desktop visibility is recorded separately from execution support.

4. **Step WORKER-REBASE-APPROVAL:** An active edit worker receives one-use
   approval for its required documented semantic replay and existing rebase
   continuation. Foreign cwd, thread or turn, unknown dispatch, inspection-only
   scope, destructive command suffixes and file-change requests receive no approval.

## Arc ROLL-REVIEW: Iterate and integrate exact candidates

Traceability: verifies REQ-ROLLING-REVIEW

1. **Step REVIEW-CORRECTION:** Acceptance contribution to [OBL-50](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-50), [OBL-51](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-51), [OBL-52](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-52). Reject a candidate, return corrections, and submit
   a newly semantically rebased revision. The original reviewer assesses it.
   For OBL-52, establish reviewer loss, record its reference and replacement,
   reject late activity on the replaced request, and obtain a fresh exact-candidate
   review from the replacement. Verify both the replacement record and immutable
   prior requests/verdicts after restart; a timeout alone does not establish loss.
2. **Step REVIEW-REBASE:** Acceptance contribution to [OBL-49](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-49), [OBL-53](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-53). Advance the campaign base with clean and conflicting
   edits. Full worker rebase inspects every commit; coordinator fast rebase
   applies the declared textual-conflict semantic-review exception.
3. **Step REVIEW-PUSH:** Acceptance contribution to [OBL-54](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-56](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Integrate after applicable proof. Reconcile rejected or
   uncertain pushes by actual remote state, never force or assumed success.

## Arc ROLL-PUBLISH: Publish tested batches

Traceability: verifies REQ-ROLLING-PUBLICATION

1. **Step PUBLISH-BATCH:** Acceptance contribution to [OBL-58](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-60](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-60). Set M=2; integrate one focused-QA increment, then a
   second. Campaign results are visible immediately; mainline changes only after
   full QA passes for their reconciled publication candidate.
2. **Step PUBLISH-FAILURE:** Acceptance contribution to [OBL-61](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-61), [OBL-62](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62). Fail a required full QA workflow. Mainline remains
   unchanged; repair, rerun and publish. Move upstream and demonstrate evidence
   refresh on changed candidate inputs.
3. **Step PUBLISH-FLUSH:** Acceptance contribution to [OBL-59](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-59). Publish a final partial batch and flush quiescent work.
   Default M=1 publishes each increment. No daily deadline gates execution.

## Arc ROLL-INTERFACE: Coordinate through either transport

Traceability: verifies REQ-ROLLING-INTERFACES

1. **Step INTERFACE-HELP:** Acceptance contribution to [OBL-66](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-66). Request root, campaign and command help. Each lists
   its scope and arguments/behavior without requiring knowledge of old commands.
2. **Step INTERFACE-PARITY:** Acceptance contribution to [OBL-65](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-65), [OBL-68](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-68). Execute equivalent CLI and MCP coordination actions.
   Results and fencing agree because both invoke the same operation layer.
   The OBL-65 contribution initializes and reconciles a disposable campaign
   through the real CLI entrypoint and compares its results with the typed
   application operations. Confirm mainline/default resolution, idempotent
   registration and preservation of unreviewed local work. The additional OBL-68
   contribution compares these same fenced operations through MCP.
3. **Step INTERFACE-LEGACY:** Acceptance contribution to [OBL-67](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-67). Inspect an old campaign. It is not dispatched or
   silently migrated by the replacement scheduler.
4. **Step INTERFACE-DECISIONS:** Acceptance contribution to
   [OBL-64](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64).
   Inspect worker and review requests before instruction dispatch, after a
   retained STARTED creation with unknown turn identity, and after ATTACHED
   receipt acknowledgement. The shared operations return dispatch only before
   creation, original-turn observation only with a known turn, and retained
   ownership with an explicit unresolved reason for uncertain creation. Verify
   generation/request fences, pending attachment priority, and suspension before
   rejected-work resumption through PostgreSQL and both adapters.
   After retirement, verify that stale-generation and ARCHIVED receipts retain
   ownership, while a current CLEANED receipt produces an exact fenced release.
   An unassigned retired reservation releases without a native receipt. Release
   succeeds with no ready obligation, and subsequent available work prefers
   resuming its retained original inactive session over creating a new worker.
   For integrated work, distinguish an uncertain push from a confirmed original
   PUBLISHED receipt. Reject a published flag with no confirmed receipt. Require
   current bound certificate acceptance before retirement, and do not suggest
   integration again for a published current-generation result.
   Preview an eligible publication prefix and confirm no batch or Git mutation
   occurs. Follow the exact threshold/completion/quiescence freeze suggestion;
   retained lane ownership or unfinished acceptance prevents a duplicate claim.
   Once fresh scope, owners, actions and publication are resolved, the next
   action is close; closure still performs its own external verification.


### Acceptance REVIEWER-LOSS-API (OBL-160)

Through the shared coordinator API/CLI, call `request-review` with the existing
assignment, current generation, exact candidate, replacement reviewer and
`--loss '{"reviewId":"<lost-review-id>","lossReference":"<observed-loss-reference>"}'`.
Malformed loss records fail before mutation. Concurrent identical requests return
one replacement; conflicting retries fail. After restart, the original request
and verdict remain immutable, its late dispatch/verdict are fenced, and the new
native reviewer supplies a fresh verdict. A timeout alone is not a loss reference.

## Arc ROLL-CLOSE: Close only verified campaign scope

Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-INTERFACES

1. **Step CAMPAIGN-CLOSE:** Acceptance contribution to
   [OBL-69](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69).
   Request closure with an unresolved delivery obligation or stale final gate.
   Closure is refused. Establish all required fresh evidence and request closure
   again; closure succeeds without erasing historical identities or disturbances.

Every Step above identifies its contribution to atomic obligations. The existing
observations are minimum demonstrations: evaluate each referenced canonical
criterion in full, adding its necessary assertions before declaring discharge.
Several Steps may contribute jointly; one passing contribution is not whole
obligation or requirement acceptance. Current satisfaction is derived from the
canonical obligation document and its current Git input revisions/paths; retained historical
runtime results do not establish freshness after relevant inputs change.

### Acceptance ROLL-BINDING-AMENDMENT

Traceability: verifies REQ-ROLLING-GRAPH

Demonstrates [OBL-107](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-107) through Step ROLL-BINDING-API: exercise the typed amendment boundary and observe its entire canonical criterion, including preserved identities/history and rejected invalid revisions. Selector, live lease and acceptance integration still require their application Arcs.

### Acceptance ROLL-BINDING-SELECT

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-BINDING-QUERY demonstrates [OBL-108](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-108): query portable and rolling selection against an explicitly identified coordinator binding history, observe its complete declared criterion, then amend that history and reject the obsolete graph identity. Live lease and candidate acceptance integration remain required.

### Acceptance ROLL-FROZEN-LEASE

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-LEASE-CONTRACT demonstrates [OBL-109](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-109): issue an authorized portable frozen lease, amend coordinator bindings, and verify that the original lease retains its earlier permissions and rejects wrong generations, graph identities and out-of-scope changes. Live database and worker integration remain required.

### Acceptance ROLL-STORED-LEASE

Traceability: verifies REQ-ROLLING-GRAPH
Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-SCHEDULING

Step ROLL-STORE-REVISION demonstrates [OBL-110](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-110): allocate against explicit coordinator binding history, amend it, reject old permissions, acknowledge cessation, adopt the new revision and resume the original session with a new generation. V1 records retain their meanings. Worker delivery and candidate acceptance still require application integration.

### Acceptance ROLL-SUBMISSION

Traceability: verifies REQ-ROLLING-GRAPH
Traceability: verifies REQ-ROLLING-STATE
Traceability: verifies REQ-ROLLING-WORKERS

Step ROLL-WORKER-SUBMIT demonstrates [OBL-111](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-111): submit an actual isolated Git candidate from its stopped retained owner, reject foreign changes and stale evidence, persist it atomically in PostgreSQL and replay the exact submission without duplicate review records. Submission alone leaves obligation acceptance unresolved.
Advance the coordinator increment independently after the worker's finalized
proof. Its original ancestor base remains admissible without changing the
candidate or proof. An unrelated Git root and the unintegrated candidate itself as a concealed
base remain rejected; immutable lease/path/freshness checks still apply.
For a native instruction failure without an obligation dependency, suspend with
empty blockers only after observing that exact failed turn and idle original
actor. A completed unreviewed turn does not qualify. Resumption retains session,
checkout and unfinished work, renews the generation, and preserves the failed
stop record across restart.

### Acceptance ROLL-BOUND-ACCEPTANCE

Traceability: verifies REQ-ROLLING-GRAPH

Step ROLL-ACCEPT-BINDING demonstrates [OBL-112](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-112): read an actual retained PostgreSQL submission, reconcile its Git candidate in a disposable coordinator checkout, and accept only fresh proof for its frozen current binding. Reject stale or forged references, changed inputs and unmet current prerequisites while preserving legacy V1 meanings.

## Recorded execution and remaining acceptance

The component and integration selections are executable through the repository's
configured Node commands after strict TypeScript compilation. The full clean-tree
`npm test` run on `ff5bb07` passed 883 tests, including the PostgreSQL and actual
CLI/MCP adapter cases; TSTS checked 1,253 files without violations. The explicit
native selection `node --test --test-name-pattern='^(live|native App Server)'
dist/tests/rolling-codex.integration.js` subsequently passed all 11 native cases.
It established exact-checkout instruction loading/resumption, worker attachment,
blocking/resumption/recovery, real implementation with semantic rebase, rejected
work returned to the same worker/reviewer, replacement review, and retirement.
It began on `dede454`, before the final OBL-64 projection repair, and is retained
as evidence for that revision, rather than claimed as final current-tree proof.

The [final evidence record](../plans/closed/2026-10-10-rolling-obligation-campaigns/evidence/final-acceptance.md)
retains that invocation and subsequent final verification. OBL-64 regressions
cover working-worker dispatch, known-turn collection, uncertain creation,
attachment/generation fences and suspension before rejected-work resumption.
Current certificate assessment and all final rollups remain required; neither
this Suite nor its execution commands bypass their adequacy and freshness gates.

### No-edit submission demonstration

Within acceptance ROLL-SUBMISSION, step ROLL-WORKER-SUBMIT also exercises a
native inspection-only worker. It establishes fixture value 1, runs focused
QA, retains actual output and submits physical V1 JSON with its unchanged
HEAD. Collection must reach REVIEW in PostgreSQL, retain the same candidate
and replay idempotently after a store restart. A prose final report does not
establish this acceptance. This adds no requirement for an artificial code
change or rebase on an inspection-only obligation.

### Acceptance ROLL-HISTORICAL-PLAN

Traceability: verifies REQ-ROLLING-STATE

Demonstrates [OBL-113](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-113). Establish fresh complete acceptance and DONE sprint/tasklet state in a disposable adopted plan. Move its directory to the configured successful-completion state and repair the manifest locator. Historical inspection preserves the accepted checkpoint and completed state without rewriting old certificate paths or digests. Current-input inspection still reports relocated or changed evidence as stale. Incomplete or invalidated accepted history cannot close a plan. Fixture-only consumers must remain independent of the active campaign's mutable location.

CLI help error-format amendment: select an unknown command, including retired
`traceability index`, outside a Git checkout. The command fails with the
matching root/chapter `-h` page and performs no project mutations. Invalid
index arguments show subcommand help. At 40, 80 and 120 columns, help preserves
its words and indentation, and every output line fits the selected width.
