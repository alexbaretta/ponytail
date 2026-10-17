# Repository traceability and automated QA swarm

- Plan ID: `2026-10-15-repository-qa-swarm`
- Status: in_progress
- Approval: The stakeholder's active goal authorizes analysis of `ponytail
  traceability validate`, creation of a default QA swarm, and correction of all
  traceability and automated QA defects, including full unit/integration tests,
  TSTS and neutrality. Workers should operate autonomously with minimal
  coordinator interactions.
- Repository and management root: `/Users/alex/git/ctosclub/ponytail`.
- Initial revision: `ddaa5e0246bd70b64ae2accc3a697ee2cb6ca7ef` on `local_rules`;
  initially clean.

<!-- ponytail-plan-campaign
{"schemaVersion":3,"id":"2026-10-15-repository-qa-swarm","parent_plan_id":null,"depends_on":[],"obligation_document":"pm/plans/in_progress/2026-10-15-repository-qa-swarm/obligations.json"}
-->

## Scope and acceptance

[The obligation document](obligations.json) owns six inventory obligations
(`OBL-1` through `OBL-6`) and six acceptance rollups (`OBL-7` through `OBL-12`).
Broad QA gates are not atomic delivery obligations. No causal product defect
has yet been confirmed; any discovered repair needs its own bounded delivery
obligation and smallest regression proof before assignment. No product change
or language migration is authorized merely to make a check green.

The final gates are current indexed and structural/semantic traceability,
`npm test`, explicit live native integration acceptance, complete configured
TSTS, adequately scoped neutrality verification, and establishment of the
requested QA swarm. A passing subset or an unexecuted gate cannot close the
plan. Pure planning changes require structural validation; they do not invalidate
unchanged product-test evidence.

This is an initial inspection and validation episode, with no implementation
tasklet graph until a confirmed defect identifies an actual implementation unit.

## Baseline evidence

Retained coordinator output is under the repository's ignored temporary owner,
`tmp/qa-swarm-2026-10-15/`. These are diagnostic results, not accepted certificates.

- `ponytail traceability update-index --json`: traceability generation
  `01a132bc-1d0d-7749-8079-74ee4f887788`, 306 files reused, matching the initial
  revision and source/configuration digests.
- `ponytail traceability validate --json`: 8 rules, zero reported gaps.
  The implementation checks generation freshness against Git, source state,
  configuration and parser identity before evaluating relationships.
- `npm run check:traceability`: 1,091 relationships, no violations.
- `npm run check:tsts`: 1,657 files, no violations; retained in
  `tsts-baseline.log`.
- `node scripts/check-versions.js`: all 7 version files match 4.8.4.
- `node scripts/check-rule-copies.js`: all 8 rule copies match.
- Initial sandboxed `npm test`: 531 passes and 40 failures in the first 571-test
  stage; the retained output demonstrates denied local PostgreSQL connections
  (`EPERM`). This is not accepted product-failure evidence.
- The database-enabled `npm test` run completed every test group: root 571,
  typed root 325, Pi extension 23, MCP 4 and TSTS 100. All 1,023 tests passed
  with zero failures and zero skips; installer tests also passed. The command
  exited 1 only at its final directory check because these new plan files were
  not yet staged. After staging exactly those files, `npm run check:tsts`
  passed for 1,659 files (`tsts-plan-tracked.log`). Retain the initial aggregate
  output in `full-baseline-db.log`; do not relabel its exit status as success.
- Final exact `npm test`: process handle `50968` completed with exit 0.
  `full-final.log` records all 1,023 tests passing, zero failures/skips, installer
  success and the final TSTS check passing for 1,659 files. The tested tree had
  these two plan files staged; product sources, configuration and dependencies
  were unchanged from the initial revision.
- Explicit `node --test dist/tests/rolling-codex.integration.js`: process handle
  `77082` completed with exit 0. `native-integration-baseline.log` records 51
  passes, zero failures/skips and successful finalization. This command imports
  regular fixture scenarios in addition to live native cases; its 51 tests are
  not 51 additional unique tests beyond the full suite.

## Worker strategy and prerequisites

The frozen baseline inventory is retained in `baseline-inventory.json` in that
temporary directory. The configured globs select 59 root JavaScript test files,
68 compiled root test files (including 18 integration-named files), 14 TSTS test
files, 2 Pi-extension files and 1 MCP file: 144 files total. Explicit live native
acceptance and installation/static/generated-artifact gates remain additional
selections. The full `npm test` command remains a final gate; no sharded-equivalence
contract has been adopted.

Partition by runner, measured runtime and verified exclusive-resource
compatibility, up to the default capacity of 10 active worker sessions. Freeze
every complete ordered selection and exact aggregate command before dispatch.
Each worker owns whole-slice execution, diagnosis, causal repair, focused proof,
and local read-only adversarial review. Coordinator contact is reserved for
reviewed repair integration, scope/resource conflicts and final whole-slice
acceptance. Do not create evidence-only increments between selections.

The current owner inventory has no bound coordinator, workers or managed
checkouts. This coordinator chat is associated with the saved Ponytail project
`ae57a0f9-02b0-4b3b-941d-7c9652757ec0`. Worker startup is not established:

- `.agents/config/project/rolling-campaigns.json` is absent. No existing swarm
  manifest supplies the alternative host-managed workflow.
- The exposed `create_thread` schema accepts a saved project and local or new
  managed-worktree environment; it cannot select a designated existing worker
  checkout. Neither private App Server orchestration nor an invented `cwd`
  argument is an allowed substitute under `skills/swarm/SKILL.md`.
- The user-provided project boundary prohibits creating worktrees and modifying
  an outside path without a literal explicit request. No outside checkout has
  been created or modified.
- Variant families and a neutrality audit command are not configured. The
  `variant-neutrality` skill's default is `not configured`; do not invent a
  project family or report this gate as passing. An asynchronous clarification
  requesting the intended contract or audit command is pending.

## Current disposition

No product defect was confirmed by the configured automated checks. No product
source, dependency or configuration was changed. The final full and explicit
native QA processes are terminal and successful; do not restart them without
changed relevant inputs or new evidence.

The requested development swarm has not been created. Its startup constraints
have persisted across the initial goal turn and two continuations. The exposed
host tools cannot start a worker in a designated existing checkout, and the
provided project instructions prohibit creating worktrees. The allowed host
tools have no alternate existing-checkout selector; private App Server
orchestration is explicitly excluded by the swarm skill. A supported host
launch path and authority for the required worker checkouts are needed before
dispatch. Neutrality also needs its stakeholder-defined project contract.

The goal remains unfulfilled. Keep the plan in progress and all acceptance
rollups unresolved until their complete conditions, including actual swarm
establishment and neutrality, have adequate accepted evidence. The diagnostic
results above do not fabricate worker submissions or discharge certificates.
