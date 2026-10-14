# Swarm completion audit

Audited source revision: `13dbcd45`. Authority: the stakeholder's swarm definition
and clarification that Ponytail manages associations and worktrees, while the
coordinator alone operates sessions through host tools.

This is an evidence map, not a certificate or discharge checkpoint. The original
ledger still reports zero discharged obligations. Final acceptance is open.

| Obligation | Authoritative implementation | Behavioral evidence |
| --- | --- | --- |
| OBL-1 | `src/swarm-owner.ts` | `swarm-owner.test.ts` and `swarm-info.integration.test.ts`: owner/managed equivalence, sibling isolation and ambiguous identity refusal. |
| OBL-2 | `src/swarm-store.ts` coordinator bindings | `swarm-store.integration.test.ts`: competing bindings, stale unbind refusal and retained orphan workers. |
| OBL-3 | `src/swarm-info.ts` V4 inventory | Real CLI/PG inventory Arc: read-only owner scoping, empty inventory and recorded session/checkout associations. |
| OBL-4 | V4 unobserved runtime activity | CLI inventory fixture installs a failing Codex executable and verifies it is never invoked; missing checkouts remain explicit. |
| OBL-5 | Worker binding and session-origin records | Concurrent admission has one winner; cross-owner and cross-checkout rebinding fail without changing origins. |
| OBL-6 | Worker removal and campaign lease fencing | Actual CLI detachment cancels matching pending allocation actions, preserves evidence/source, and removes only the matching marker. Host quiescence is a precondition. |
| OBL-7 | Removed-session provenance and binding | Original identity can rebind to the same owner/checkout; clearing preserves origins and does not authorize cross-owner attachment. Host resumption is separate. |
| OBL-8 | `swarmWorkerName` and assignment-number mapping | Worker storage Arc proves W/P/S numbering, shared full-plan mapping and exactly three summary words; the skill directs host naming. |
| OBL-9 | Worker completion metadata | Completion reports the DONE-prefixed desired name while preserving membership and acceptance state; host applies the name. |
| OBL-10 | Reserve/provision/setup lifecycle | Installed CLI and competing-owner Arcs prove lowest eligible number, creation above 100, exact setup intent/base and failed-setup recovery. |
| OBL-11 | Release and retained pool allocation | Release preserves checkout/source; same-owner and cross-owner reuse work after relinquishment. Markers, Git operations and dirty source prevent unsafe allocation. |
| OBL-12 | Selected unassigned deletion | Installed CLI Arc protects assigned/user resources, retains committed source refs and retries failed cleanup. |
| OBL-13 | All-unassigned deletion | Installed CLI Arc reports protected/retained/deleted results and retries only outstanding deletion. |
| OBL-14 | Owner-scoped clear | Installed CLI and PG Arcs release associations/leases/actions, preserve origins/source/evidence, isolate sibling owners and permit retained-resource reuse. |
| OBL-15 | Swarm help/registry and shared operations | Scoped help tests, installed CLI Arcs and MCP parity prove resource operations share ownership; prior session API commands are unavailable. |
| OBL-16 | Registered swarm skill and generated exports | Real isolated installer copies the skill; command/help checks validate prescribed operations. Independent scenario review accepts parallel scheduling, retained-worker priority and truthful host capability/identity boundaries. |

Tests named above live under `tests/`. Disposable fixtures use real Git and the
existing PostgreSQL with isolated project IDs; they do not operate GWEN sessions.
Historical native protocol tests do not establish new swarm runtime capabilities.

## Live diagnostic evidence

On 2026-10-14, the current CLI was invoked read-only from GWEN's user checkout
and managed checkout 101. Both resolved owner
`/Users/alex/git/gwen.vc/gwen-worktrees/gwen-001` and returned seven campaign-lease
checkouts (101–107), six session IDs, no recorded coordinator and no adopted swarm
worker bindings. Checkout 104 was RESERVED without a session. Runtime activity
was unobserved. This proves routing and inventory, not active development or
adoption; no campaign was cleared or resumed.

## Outstanding final assessment

The final-source typed test command passed all 325 tests (269 seconds), including
the shared PostgreSQL/Git Arcs. After the procedural review corrected the skill's
session-identity acquisition instructions, both skill/installer checks passed.
The skill explicitly distinguishes returned thread/host metadata from a trusted
session ID and retains reservations when the host cannot provide that identity.
TSTS's full unit command passed 100 tests; the Pi extension passed 23 tests and
the isolated Codex installer suite passed. The legacy full Node selection passed
558 of 559 tests. Its single failure was the configured traceability checker.
After canonical reverse-view regeneration, the focused rerun confirms that only
the three TypeScript-source coverage findings remain; stale generated locations
are repaired. The legacy selection and `npm test` are not passing acceptance.
`npm test` stops at three coverage findings for the separate
`REQ-TYPESCRIPT-ONLY-SOURCE` requirement. Do not label that command passing or
invent a repository-wide migration to bypass it. Reconcile the plan's stale
activation baseline with the authorized session-operation scope, assess compact
Git-revision-based evidence, and update durable obligation status only after its
actual gates are satisfied.

The append-only `SWARM-B2` / `SWARM-CP2` rebaseline now activates the corrected
requirement source through the canonical checkpoint validator, preserving B1,
all 22 known responsibilities and zero discharge credit. It adds no file-hash
certificate inventory. Certificate assessment remains pending.
