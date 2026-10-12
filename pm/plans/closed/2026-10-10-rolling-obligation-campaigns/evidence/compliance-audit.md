# Rolling campaign compliance audit — 2026-10-12

This assessment covers the original campaign contract and the reopened client
interface scope. The removed oversized certificate database is not restored.
Raw run output is retained under ignored `tmp/`; the persistent record contains
bounded conclusions and command references, not repository file-hash manifests.

Delivery scope remains ten atomic obligations: OBL-114–122 and OBL-129.
OBL-123–128 are six inventory reviews; OBL-130–158 enumerate the associated
acceptance, executable-Arc, implementation, independent-proof and integration
responsibilities. OBL-159 is final acceptance. Proof responsibilities and gates
are not additional delivered functionality.

| Requirement | Authoritative implementation and demonstrated behavior |
| --- | --- |
| REQ-ROLLING-CONFIGURATION | `src/rolling-campaign.ts`; configuration and real-Git integration tests establish target precedence, safe N/M values, physical pool anchoring and numbering from 101. |
| REQ-ROLLING-GRAPH | `src/rolling-campaign.ts`, binding history and `rolling-operations.ts`; real coordinator-file changes affect graph identity, stale allocation is rejected, cycles and exact Arc/Step references are validated. Public lease renewal preserves the original stopped owner and fences its former generation. |
| REQ-ROLLING-SCHEDULING | `selectRollingAssignments` and transactional allocation; compatible readiness, resume-first selection, active capacity, shared-path/resource exclusions and release with no ready successor are exercised. |
| REQ-ROLLING-STATE | `src/rolling-campaign-store.ts` and `projectRollingCoordinatorActions`; PostgreSQL tests exercise exact project/actor fences, concurrent allocation, retained uncertain outcomes, executable next actions and closure refusal while proof or actors remain unresolved. |
| REQ-ROLLING-WORKERS | `rolling-worktrees`, `rolling-worker` and `rolling-codex`; ordinary Git pool tests establish setup, ignored markers, original checkout retention, retirement before release and preservation of user work/caches. Native identity/execution proof is a distinct live gate below. |
| REQ-ROLLING-REVIEW | `rolling-review` and `rolling-integration`; exact-candidate review, retained reviewer correction, recorded replacement after loss, full worker rebase, interactive fast-rebase exception, retained conflict repair and observed normal pushes are exercised. Native review/correction is a distinct live gate below. |
| REQ-ROLLING-PUBLICATION | `rolling-publication`; PostgreSQL and real-Git tests establish M thresholds, partial completion/quiescence flushes, full candidate QA, QA failure/race handling, uncertain push observation and campaign synchronization without history reset. |
| REQ-ROLLING-INTERFACES | Typed operation/command registries and shared MCP adapter; actual CLI help succeeds for every advertised chapter/command, explains behavior and arguments, and does not mutate disposable checkout state. Registry-driven MCP invokes the shared operations. |
| REQ-ROLLING-CLIENT-PROTOCOL | Canonical glossary and `references/rolling-campaigns.md`; actual generated exports match their sources. Recursive installer copy checks cover resources. Explicit actor/atomicity definitions, graph authoring/validation/reconciliation, autonomous worker QA/rebase/correction and coordinator review/publication boundaries are present. Serial-only restrictions are confined to legacy selectors. |

The complete original UAT remains in `pm/uat/rolling-campaigns.md`; its
configuration, graph, scheduler, ownership, worker, review, publication, interface,
closure and binding-amendment observations remain acceptance requirements.
The added client-protocol and help acceptances identify each of the ten delivery
obligations, including acceptance Steps rather than assuming whole-Arc coverage.

Current proof:

- `npm test`, source commits `ce2fe6c` and `559017e`: terminal exit 0;
  544 core + 261 typed + 23 extension + 4 MCP + 80 TSTS = 912 passing tests,
  zero failures or skips. Installer checks passed. Final TSTS: 1,508 files,
  zero violations. Log: `tmp/compliance-full-final.log`.
- Focused exported-resource/help/policy proof: 15 passing tests, zero failures
  or skips. Log: `tmp/compliance-policy-final.log`.
- Public stopped-worker rebinding through shared operations and actual
  PostgreSQL: passing; original actor and checkout survive renewal/resumption,
  and obsolete generations are rejected. Log: `tmp/compliance-rebind-pg.log`.
- Rule copies: eight match. Version files: seven pinned at 4.8.4.
  Runtime generation consistency and traceability pass.
- Live native suite: still running; `tmp/compliance-native-final.log`.
  Do not discharge C2 or final acceptance from controlled protocol fixtures.

Current acceptance remains open until the live gate, adequate per-responsibility
assessment, canonical checkpoint acceptance and final structural reconciliation
have succeeded. Passing tests alone are not the completion record.
