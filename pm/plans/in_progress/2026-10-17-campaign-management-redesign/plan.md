<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management redesign

- Plan ID: `2026-10-17-campaign-management-redesign`
- Status: in_progress
- Authority: the stakeholder explicitly authorized implementation, repeated
  `scripts/install.sh` installation, and a new coordinator session in Codex project
  gwen-001 to bring Gwen to full campaign completeness. The goal also authorizes
  messaging and replacing that coordinator and its workers when necessary.
  The Gwen coordinator and all Gwen workers, including replacements, must use
  GPT 6.1 Sol (`gpt-6.1-sol`) with `medium` reasoning.
  Kickoff preparation is active; product edits await contract reconciliation and
  the starting-check assessment. No release publication or cloud topology change
  is authorized.
- Management and implementation repository: `/Users/alex/git/ctosclub/ponytail`.
- Planning snapshot: `946e8f69285a597723c2e0eb008afb141cf4c32c`; the supplied
  `docs/campaign-management.md` was subsequently committed with this plan in
  `4dd1fa69`; the final-QA clarification is part of the pending change-set.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-17-campaign-management-redesign","parent_plan_id":null,"depends_on":[]}
-->

## Objective and source

Implement the methodology recorded in
[campaign-management.md](../../../../docs/campaign-management.md): an explicit
requirement/obligation/acceptance/test graph, truthful `(R,A,T,I)` completeness,
commit-attached validation certificates, and autonomous native worker sessions
supervised by a coordinator whose routine work stays small.

That document is the design/provenance owner; this plan owns delivery sequencing
and acceptance. It does not silently promote its proposed details to decisions.
Resolve the implementation questions below under the explicit kickoff authority. At implementation kickoff,
reconcile authorized changes into canonical requirements, UAT, architecture, and
their indexes and configuration. Do not activate new requirements just by drafting
this plan.

Use the current supported V2 planning envelope and STUB sprints while planning is
inactive. Do not create the old certificate/checkpoint ledger to plan its removal.
At activation, explicitly reconcile this plan's execution metadata with the chosen
transition contract; do not silently bypass configured selectors or pretend the
new methodology/tooling already exists.

## Delivery outcomes

These plan-local outcome IDs identify scope for planning, not new approved
requirement IDs or certificates. Canonical product IDs are reconciled at kickoff.

| Outcome | Observable result |
| --- | --- |
| CM-01 | Individually identified obligations reference requirements; acceptances reference obligations; tests reference acceptances; stable code blocks reference obligations. Every required reference resolves and every in-scope object has adequate coverage. |
| CM-02 | Structural and indexed checks detect an acceptance lacking tests even when other acceptances of the same requirement have tests. Unit or integration proof is sufficient when adequate; both layers are not universally required. |
| CM-03 | The campaign completeness vector reports `(R,A,T,I)` from the integrated scope, distinguishes unknown adequacy, and accepts productive descent only under valid review and QA. The coordinator displays it after every accepted merge request using the resulting integrated revision. Discoveries and scope amendments may honestly increase it. |
| CM-04 | Focused worker validation and final full QA produce annotated tags on the tested commits. New passing evidence never requires tracked ledgers, test output, or evidence-only commits. |
| CM-05 | Native worker sessions execute complete assignments autonomously with local adversarial review. Names follow the design record's campaign/sequence/three-letter assignment convention and gain DONE only at final completion. The coordinator resumes or replaces blocked workers, replenishes below target, and permits temporary excess after recovery. |
| CM-06 | Workers own rebase, refreshed proof and review; the coordinator performs mechanical, serialized fast-forward acceptance and remains available for service. |
| CM-07 | Instability observations distinguish regression, stagnation, discoveries, authorized scope changes, and acknowledged waits under the chosen monitoring rule. |
| CM-08 | The swarm CLI chapter and obsolete coordination protocols are retired across CLI, MCP, exports, permissions, documentation, installers, and generated adapters without losing unfinished work or historical interpretability. |
| CM-09 | Ponytail's own active graph/configuration uses the new contract; historical records retain their original meanings; migration is explicit, bounded, restartable, and preserves unrelated projects. |
| CM-10 | Distribution installs the intended skill set and runnable tooling. A worker-reported zero vector is provisional: all workers must be DONE and the coordinator must independently run and verify full automated QA on the integrated candidate. Failed QA reopens repair assignments; final acceptance repeats after repair until all required checks pass. |

## Scope and boundaries

- Update all 17 affected exported skills using the disposition table below.
- Update the structural checker, TSTS semantic checking, graph/index queries,
  coverage diagnostics and reverse generation, not just skill wording.
- Implement only the minimum reusable typed components for graph completeness,
  validation tags and campaign acceptance/monitoring selected during design.
- Retire competing session-management commands rather than reintroduce `swarm`
  under another name. Host tools remain the session/worktree lifecycle owner.
- Inventory and reconcile the existing `campaign`, `traceability`, `plan-input`,
  `worktree`, and `rebase` surfaces and their MCP/host consumers. Do not delete
  unrelated functionality merely because it uses an old shared module.
- Preserve historical readers and data without silently continuing obsolete
  dispatch through a fallback path. Remove unused runtime code only after caller
  and distribution analysis proves it is obsolete.
- Stay in this checkout. Do not install globally, modify client projects, start
  actual workers, schedule automations, push tags/branches, publish a release,
  delete live state, or create cloud resources during planning. Later external
  actions require their own applicable authority and exact scope.
- No repository-wide language migration. New/changed supporting implementation
  and tests follow the existing prospective TypeScript/TSTS mandate. Preserve
  completed translations and generate existing runtime launch paths.
- Do not remove canonical requirements, UAT, schemas, durable diagnosis, or design
  records under the guise of removing validation output. No Git history rewrite.

## Skill disposition

| Skill | Action and owner sprint |
| --- | --- |
| swarm | Replace with campaign-management; S05. |
| requirements-traceability | Replace its graph/coverage contract under the same name; S02. |
| worktree-lifecycle | Replace its campaign/pool contract under the same name, preserving resource safety; S05. |
| plan-execution | Substantial edit; retain planning/ordinary execution, remove competing campaign controller and committed certificates; S05. |
| ponytail | Edit always-on integration points and completion-first semantics; S05. |
| requirements | Edit atomic decomposition and scope ownership; S02. |
| user-acceptance-testing | Edit acceptance identities, obligation references, executable coverage and tag evidence; S02/S03. |
| issue-tracking | Edit activation/closure references and certificate links; S05. |
| project-structure | Edit graph/configuration, operational-state and evidence ownership; S05. |
| typescript-unit-testing | Edit stable test identity and acceptance annotations; S02. |
| semantic-rebase | Edit to remove coordinator fast-rebase exception for the adopted workflow; S05. |
| production-test-boundaries | Align test/Arc identity and acceptance references; preserve isolation and real paths; S02. |
| ux-testing | Align acceptance-linked regression proof and certificate references; S03/S05. |
| debugging | Distinguish diagnostic observations from validation certificates; S03/S05. |
| architecture | Clarify durable design versus validation-output ownership; S05. |
| parallel-plan-scheduler | Remove exported skill; preserve necessary historical inspection documentation; S05. |
| qa-swarm | Remove standalone skill; retain exhaustive QA partitioning, revision and resource rules as a campaign-management reference; S05. |

The other 18 enabled skills remain behaviorally unchanged. Rewrite the shared
glossary once, update its consumers, and generate all host copies from canonical
owners. Changes to source skills that generators/tests consume are QA-relevant.

## Design questions before execution approval

S01 records implementation decisions under the explicit kickoff authority.
These choices implement the approved outcomes; they do not authorize additional
product scope. See its decision record for current resolution and remaining work.

| ID | Decision and recommended starting point |
| --- | --- |
| Q1 | Graph ownership/discovery and version transition: settle stable obligation, acceptance, test and code-block syntax; adequacy attestations; explicit in-scope inventory; and compatibility. Prefer canonical annotations/records and derived views, without another manually maintained map. |
| Q2 | Tag contract: settle commands, payload version, naming, trusted result capture, clean tested input identity, review binding, freshness, correction/revocation, and transfer/publication. Prefer one immutable focused-delivery tag and one final acceptance tag; do not require signatures or remote pushes without a stated need. |
| Q3 | Minimal campaign operations/state: settle which current commands remain, how native assignment ownership survives restart, how duplicate/conflicting assignments are prevented, and where small scope/vector observations persist. Prefer host identity/activity plus minimal project-scoped operational state, not another session registry or queue bureaucracy. |
| Q4 | Instability: settle the 30-minute comparison, sampling/active-time rules, scope amendments, churn criterion and escalation. Prefer a diagnostic alert rather than automatic cancellation; do not hide legitimate increases. |
| Q5 | Swarm lifecycle: settle active/blocked/ready/DONE classification, exact assignment completion boundary, wakeup cadence, message authority and host capability limitations. Final QA ownership is resolved by stakeholder clarification: the coordinator independently runs and verifies it after worker completion; it is not delegated to a validation worker. |
| Q6 | Retirement/adoption: choose the bounded transition for existing active campaigns and installed consumers. Preserve original work, branches, tags, historical physical formats and read-only inspection; never migrate or clear another project's live records implicitly. |

## Sprint manifest

Every sprint is initially planning STUB, with execution absent. The sequence orders
shared schema, generated, configuration and command owners. Detailed atomic
tasklet graphs and exact write paths are prepared/reviewed after the relevant
contracts are settled and before implementation; draft work packages are not
execution leases.

| Sprint | Objective | Planning prerequisite | Outcomes |
| --- | --- | --- | --- |
| [S01](sprints/S01.md) | Reconcile contracts, commands and adoption decisions | none | all design questions |
| [S02](sprints/S02.md) | Implement the canonical traceability graph | S01 | CM-01, CM-02 |
| [S03](sprints/S03.md) | Implement commit-attached validation | S02 | CM-04 |
| [S04](sprints/S04.md) | Implement completeness, acceptance and monitoring | S03 | CM-03, CM-06, CM-07 |
| [S05](sprints/S05.md) | Replace swarm policy and retire obsolete CLI/export paths | S04 | CM-05, CM-08 |
| [S06](sprints/S06.md) | Adopt, migrate and prove distribution/final acceptance | S05 | CM-09, CM-10 |

Prefer independently conforming increments. New supported schemas/readers may
coexist during explicit transition, but there must be one canonical execution
path per adopted mode and no undocumented fallback. Do not export instructions
for commands that are not installed and proven.

## Validation and acceptance

Planning validation covers metadata, dependencies, links and truthful readiness.
It does not establish a green product baseline or claim implementation readiness.
Before kickoff, run the current configured starting checks on the exact tree and
record any precise pre-existing failure admitted into this repair scope. No
blanket exemption from unrelated failures.

During implementation, use configured focused Node/TSTS commands, query
`node skills/build-impact/scripts/build-impact.js --file <changed-path>` and build
only affected targets after their final inputs change. Reuse relevant unchanged
proof. Feature and sprint gates add only distinct integration proof.

Final acceptance requires all CM outcomes, agreed Q resolutions, required local
adversarial review, and the final revised QA/tag workflow. Run `npm test`,
`node scripts/check-rule-copies.js`, and `node scripts/check-versions.js` after
final relevant edits, with generated runtime/registry/adapters/manifests,
traceability and installer/distribution consistency. The current full command
already includes many component checks; do not duplicate them without cause.
Respect build-impact policy when reconciling its unconditional nested builds.

The final integration workflow must prove: missing acceptance coverage cannot
pass; unit-only or integration-only adequate coverage is accepted; failed or
misaligned proof cannot lower T/I; productive integrated descent and disturbances
are distinct; worker-local review and exact tagged fast-forward delivery work;
blocked replacement and resumed excess capacity work; restart does not duplicate
ownership; and final QA certificates leave the tracked source tree unchanged.
It must also prove that worker-reported zero cannot close the campaign, retained
unfinished workers prevent DONE, failed coordinator QA reopens worker repair
assignments, and only a subsequent independent full passing run on the repaired
integrated candidate permits campaign DONE and its acceptance certificate.

Use disposable in-scope Git fixtures and isolated rows in the existing local
PostgreSQL where needed. Controlled host fixtures prove orchestration logic but
do not establish real Codex liveness. S06 separately verifies available native
capabilities in an explicitly authorized pilot, or reports that acceptance gate
unmet. No unconditional worker-continuity guarantee is claimed.

Final validation results belong in the adopted tag mechanism, with references
from lifecycle records. During bootstrap, keep run output in ignored temporary
storage; never fabricate passing tags from prose or historical DONE flags.

## Current state

S01 contract reconciliation is complete under explicit kickoff authority. Q1–Q6
are resolved by the decision record in S01. Canonical activated requirements and
acceptances are linked from their indexes; implementation remains outstanding.
The starting suite completed on unchanged product inputs. Its final TSTS gate
failed only on the two new untracked prose pages, then passed after staging
(1,707 files, no violations). Diagnostic logs stay ignored in
`tmp/campaign-redesign/`; do not rerun the completed baseline without new cause.

The existing Gwen coordinator is `01a14dc3-a37a-7582-a6c9-cd132c8d8e7b`, named
Gwen traceability campaign coordinator, created with `gpt-6.1-sol` / `medium`.
It verified its identity and cwd and is idle awaiting installed tooling. No
Gwen campaign or workers have started. Resume this coordinator at pilot kickoff.
