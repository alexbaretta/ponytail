<!--
Copyright (c) Ponytail contributors.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Repository Configuration

This file configures work on the Ponytail repository. Portable engineering
policy belongs in `skills/ponytail/SKILL.md`; do not duplicate it here.

## Ownership

- Repository and management root: this repository.
- Structure and ownership: `PROJECT_STRUCTURE.md`.
- Project-management root: `pm/`.
- Obligation operations: plan campaign V3 explicitly names the canonical
  repository-relative `obligation_document`. Portable inspection:
  `node skills/plan-execution/scripts/obligations.js <validate|status|select>
  <document-path> <repository-root>`. Rolling campaign inspection:
  `ponytail campaign status --campaign <id>`; coordinator certificate publication:
  `ponytail campaign accept --campaign <id> --review <review-id>
  --candidate <relative-path> --bindings <JSON-array>`. Retained inactive worker
  reactivation uses `resume-worker` with its action ID and generation.
  Adopted subordinate selection uses
  `ready-tasklets.js <sprint.md> [last-id] --obligations <document> --root <root>`.
  Legacy plan/sprint/tasklet readers remain supported. Shared vocabulary:
  `skills/plan-execution/references/glossary.md`.
- Long-lived plans: `pm/plans/<status>/<plan-id>/` for new records.
- Issues (`BUG`, `FEAT`, `CHNG`, `TASK`, and project-defined extensions):
  `pm/bugs/<status>/`; semantics are owned by `issue-tracking`.
- Requirements: linked Markdown rooted at `pm/requirements/index.md`.
- Architecture: linked Markdown rooted at `pm/architecture/index.md`.
- UAT documentation root: `pm/uat`.
- Traceability configuration:
  `.agents/config/project/traceability.json`.
- Traceability check command: `npm run check:traceability`.
- Traceability reverse-view generation command:
  `npm run build:traceability`.
- Traceability TypeScript semantic checker: TSTS through the configured
  traceability command.
- Debugging pattern observations: `pm/debugging-pattern-observations/`.
- Issue types and shared issue/plan lifecycle: use `issue-tracking` defaults.
- Existing records retain their established paths; see `PROJECT_STRUCTURE.md`.
- Technical debt: `tech_debt.md`.
- Ignored temporary artifacts: `tmp/`.
- Reusable skills: `skills/`.
- Project-local skills, when needed: `.agents/skills/`.

Ponytail owns no cloud environments, deployments, or ancillary cloud
services. `PROJECT_STRUCTURE.md` is authoritative for that boundary.

## Commands

- CLI cancellation: Ctrl-C exits with status 130 without a stack trace and
  waits for delegated cancellation cleanup; interrupted index updates resume
  completed commit checkpoints on the next invocation.

- Initial setup: `npm install` and `npm install --prefix ponytail-mcp`.
- Dependency update: use the same two install commands after dependency or
  lockfile changes.
- Build targets: `npm run build` for root TypeScript and `npm run build:tsts`
  for TSTS.
- Build-impact configuration: `ponytail.json`.
- Build-impact query: `node skills/build-impact/scripts/build-impact.js --file <changed-path>`.
- TSTS focused tests after build: `node --test [--test-name-pattern=<pattern>] tsts/dist/test/<file>.test.js`.
- TSTS full unit tests: `npm run test:tsts` (included in `npm test`).
- TypeScript test indexes/audit metadata: not configured; tests discovered in `tsts/test/`.
- Lossless JSON boundaries: `tsts/src/lossless-json.ts`, portable obligation
  parsing in `skills/plan-execution/scripts/obligations.js`, rolling project
  configuration in `src/rolling-campaign.js`, and campaign ledger/
  delivery parsing in `src/campaign-orchestration.js`, using `lossless-json`.
  Obligation/campaign numbers are safe integers, validated before native conversion;
  TSTS retains lossless numeric values. Focused proof:
  `node --test tsts/dist/test/lossless-json.test.js`, `node --test
  dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js`.
  Rolling configuration focused proof: `node --test dist/tests/rolling-campaign.test.js
  dist/tests/rolling-campaign.integration.test.js`.
- Campaign inventory focused proof: `node --test dist/tests/campaign-inventory.test.js
  dist/tests/campaign-report.test.js dist/tests/plan-execution-serial.test.js tests/campaign-census.test.js`.
- Campaign report focused proof: `node --test dist/tests/campaign-report.test.js
  dist/tests/campaign-graph.test.js tests/campaign-census.test.js`.
- Campaign graph focused proof: `node --test dist/tests/campaign-graph.test.js
  dist/tests/campaign-plan-contents.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js`.
- Campaign content focused proof: `node --test dist/tests/campaign-plan-contents.test.js
  tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/ready-sprints.test.js`.
- Portable sprint CLI focused proof: `node --test dist/tests/ready-sprints-cli.test.js
  dist/tests/sprint-metadata.test.js dist/tests/sprint-graph.test.js
  dist/tests/ready-sprints.test.js tests/campaign-census.test.js`.
- Sprint graph focused proof: `node --test dist/tests/sprint-graph.test.js
  dist/tests/ready-sprints.test.js tests/campaign-census.test.js`.
- Sprint metadata focused proof: `node --test dist/tests/sprint-metadata.test.js
  dist/tests/ready-sprints.test.js tests/campaign-census.test.js`.
- Portable tasklet CLI focused proof: `node --test dist/tests/ready-tasklets-cli.test.js
  dist/tests/ready-tasklets.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js tests/campaign-census.test.js`.
- Tasklet selection focused proof: `node --test dist/tests/tasklet-selection.test.js
  dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js`.
- Tasklet graph focused proof: `node --test dist/tests/tasklet-graph.test.js
  dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js`.
- Tasklet metadata focused proof: `node --test dist/tests/tasklet-metadata.test.js
  dist/tests/ready-tasklets.test.js tests/campaign-census.test.js`.
- Campaign dependency focused proof: `node --test dist/tests/campaign-dependencies.test.js
  dist/tests/tasklet-statuses.test.js tests/campaign-census.test.js dist/tests/ready-tasklets.test.js`.
- Campaign scope focused proof: `node --test dist/tests/campaign-scope.test.js
  tests/campaign-census.test.js dist/tests/plan-input.test.js`.
- Unit-test command families:
  - Node focused: `node --test [--test-name-pattern=<pattern>] <test-files>`.
  - Node full: `npm test`.
- Rolling Codex protocol proof: `node --test dist/tests/rolling-codex.test.js`.
- Swarm owner focused proof: `node --test dist/tests/swarm-owner.test.js`.
- Swarm inventory focused proof: `node --test dist/tests/swarm-info.test.js
  dist/tests/swarm-store.integration.test.js
  dist/tests/swarm-info.integration.test.js`; the integration selection uses
  disposable Git worktrees and isolated existing-PostgreSQL project rows.
- Swarm inventory: `ponytail swarm info [--json]`; resolves a managed checkout
  to its user-worktree owner and reports existing campaign-lease provenance.
  V4 reports recorded session bindings and desired names; runtime activity remains unobserved.
  Inspection does not mutate resources; the immutable V1 reader is retained.
- Swarm owner enrollment: `ponytail swarm owner-enroll [--json]` declares a new
  configured user checkout's role without creating a session or worktree.
- Swarm coordinator binding: `ponytail swarm coordinator-bind --thread <id> --session <id>
  [--json]` records the supplied identity and enrolls the configured user checkout;
  `ponytail swarm coordinator-unbind --session <id> [--json]` releases only that
  exact binding and preserves workers/checkouts. Each command has scoped help.
- Git certificate focused proof: `node --test dist/tests/obligations.test.js
  dist/tests/obligation-certificate-bindings.test.js
  dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js`.
  PostgreSQL acceptance proof: `node --test
  --test-name-pattern="integrated certificate assessment"
  dist/tests/rolling-campaign-store.integration.test.js`.
- Campaign client/help compliance proof: `node --test
  dist/tests/campaign-compliance.test.js
  dist/tests/campaign-compliance.integration.test.js tests/cli-tools.test.js`.
- Rolling review focused proof: `node --test dist/tests/rolling-review.test.js
  dist/tests/rolling-codex.test.js dist/tests/rolling-campaign-store.test.js
  dist/tests/rolling-campaign-store.integration.test.js`.
  Explicit live native acceptance: `node --test dist/tests/rolling-codex.integration.js`;
  preserves configured model/permissions and uses disposable checkouts and
  isolated project records in the existing local PostgreSQL database. Includes
  exact-candidate adversarial rejection and persisted decision recovery after
  App Server restart, plus allocation-to-native-worker attachment and same-session
  recovery and exact obligation/traceability/lease/QA instruction delivery to the
  original session. The native worker harness removes inherited Node test-runner
  metadata; model and permissions remain configured by the host. Ordinary focused
  tests use the controlled protocol fixture.
- Rolling worker attachment focused proof: `node --test dist/tests/rolling-worker.test.js
  dist/tests/rolling-campaign-store.integration.test.js`; actual native provisioning
  uses the explicit live native acceptance command above.
- Original worker admission: `ponytail swarm worker-bind --thread <id> --session
  <id> --number <n> --generation <worktree-uuid> --kind <plan|sprint> --assignment
  <full-id> --summary "three word summary" [--lease-generation <campaign-uuid>] [--json]`. Requires an enrolled owner,
  bound coordinator and exact assigned checkout. Records the supplied identity
  and reports the desired name for the coordinator to apply through host tools.
  `swarm info` reports V4 bindings; no swarm command contacts Codex.
- Retained worker inactivity: `ponytail swarm worker-inactive --session <id>
  --generation <worker-uuid> --lease-generation <campaign-uuid>
  [--blockers <JSON-array>] [--json]`. Coordinator establishes quiescence first;
  the command records inactivity without operating the session. Replenish prefers
  the unblocked original worker; renewed worker-bind uses its returned lease generation.
- Final worker naming: `ponytail swarm worker-complete --session <id>
  --generation <worker-uuid> [--json]`. Records completion and reports the desired
  DONE-prefixed name; the coordinator renames the session through host tools.
- Worker detachment: `ponytail swarm worker-unbind --session <id>
  --generation <worker-uuid> [--json]`. The coordinator must stop assigned work and
  establish quiescence before invoking it. Removes database membership and the
  matching session marker; preserves sessions and checkouts. Refuses active Git
  operations and campaign ownership conflicts; releases its matching campaign
  lease and pending actions atomically. Does not contact Codex.
- Swarm checkout lifecycle: `ponytail swarm worktree-assign --base <commit-or-ref>`;
  failed setup retains exact membership and reports number/generation. Resume with
  `ponytail swarm worktree-setup --number <n> --generation <uuid>`. Release with
  `ponytail swarm worktree-release --number <n> --generation <uuid>`; this preserves
  checkout/source, uses project cleanup and refuses retained native ownership.
- Swarm clearing: `ponytail swarm clear [--json]`. The coordinator must first
  establish quiescence through its host tools. Releases this owner’s worker,
  checkout and coordinator associations plus campaign allocation leases/actions;
  preserves session origins, checkouts, source and campaign evidence. Runs project
  resource cleanup with original creation provenance. Does not contact Codex.
- Swarm worktree deletion: `ponytail swarm worktree-delete --number <n>` or
  `ponytail swarm worktree-delete --all [--json]`; checkpoints project cleanup and
  exact Git removal, reports each protected/retained/deleted resource, preserves
  committed source refs and pool history, and retries outstanding deletion only.
- Swarm retained checkout focused proof: `node --test
  dist/tests/swarm-worktrees.integration.test.js
  dist/tests/swarm-store.integration.test.js dist/tests/rolling-reset.integration.test.js`;
  uses disposable Git repositories and isolated project rows in existing PostgreSQL.
- Explicit project reset focused proof: `node --test dist/tests/rolling-reset.test.js
  dist/tests/rolling-reset.integration.test.js`; uses disposable Git repositories,
  controlled native protocol and isolated project rows in existing PostgreSQL.
- Rolling checkout focused proof: `node --test tests/rolling-worktrees.test.js
  tests/rolling-worktrees.integration.test.js`; all Git worktrees belong to
  disposable test repositories.
- Campaign source discovery focused proof: `node --test dist/tests/campaign-plan-sources.test.js tests/campaign-census.test.js tests/project-index.test.js`.
- Campaign plan metadata focused proof: `node --test dist/tests/campaign-plan-metadata.test.js tests/campaign-census.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js`.
- Campaign configuration focused proof: `node --test dist/tests/campaign-configuration.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js`.
- Plan-input queue focused proof: `node --test dist/tests/plan-input-queue.test.js dist/tests/plan-input-command.test.js dist/tests/plan-input.test.js tests/plan-input-hooks.test.js`; the hook tests still await language migration.
- Project database options focused proof: `node --test dist/tests/project-index-database.test.js`.
- Rolling campaign store focused proof: `node --test dist/tests/rolling-campaign-store.test.js
  dist/tests/rolling-campaign-store.integration.test.js`; uses isolated project rows in
  the configured local PostgreSQL database after `./scripts/setup-project-journal.sh`.
- Integration tests: no separate integration suite; supported adapter and
  bundled-subproject behavior is exercised by the Node full command.
- Integration arc listing: not applicable.
- Rule-copy check: `node scripts/check-rule-copies.js`.
- Registry check: `node scripts/registry.js`.
- Portable typed skill runtime generation: `npm run build`; generated-runtime
  consistency check: `node dist/scripts/build-runtime.js --check`.
- Command-adapter generation: `node scripts/build-command-adapters.js
  --write`; omit `--write` to check generated output.
- Runtime-registry generation: `node scripts/build-registry-data.js
  --write`; omit `--write` to check generated output.
- Requirements traceability generation: `npm run build:traceability`;
  validation: `npm run check:traceability`.
- Version check: `node scripts/check-versions.js`.
- Manifest generation: `node scripts/build-manifests.js --write`; omit
  `--write` to check repeated metadata.
- OpenClaw generation: `node scripts/build-openclaw-skills.js`.
- Complete installation: `./scripts/install.sh`.
- Local setup validation: `ponytail validate`.
- Local reference QA: `ponytail qa`; no downstream integration suite.
- Full-text index maintenance: `ponytail search update-index [-j <n_workers>]
  [-n <commits_per_db_transaction>]`; query:
  `ponytail search query <text>` with optional ref, commit, history, and path selectors.
- Traceability/plan index checkpoints: `ponytail traceability index
  [--batch-size <n>] [--rebuild] [--json]`; default batch size is 10 files.
  Durable compatible parse batches survive crashes; publication remains atomic.
- Campaign coordination: `ponytail campaign --help` lists the canonical
  rolling commands; `ponytail campaign <command> --help` describes arguments,
  preconditions, mutations and results. Commands use named flags and return
  `{command, result}` JSON. Initialization: `ponytail campaign init --request
  @<request.json>`; status: `ponytail campaign status --campaign <id>`;
  coordinator decisions: `ponytail campaign next-actions --campaign <id>`;
  graph reconciliation: `ponytail campaign reconcile --campaign <id>`;
  amended-scope renewal: `ponytail campaign renew-lease --campaign <id>
  --assignment <id> --generation <current-uuid>`; requires a stopped inactive
  original owner and renews only its frozen lease, preserving session/checkout.
  allocation: `ponytail campaign replenish --campaign <id> [--release <JSON>]
  [--existing-only true]`. Existing-only admission imports safe retained physical
  pool roots after reset and refuses nonexistent checkout reservations.
  The canonical command registry is `src/rolling-cli-registry.ts`; CLI and the
  optional `ponytail-mcp/rolling.ts` adapter invoke the shared typed operations
  in `src/rolling-operations.ts`. Session API commands are retired from CLI and
  MCP registration; the coordinator operates sessions through host tools and
  records associations with `ponytail swarm`. Historical inspection is explicit through
  `ponytail campaign legacy --command <validate|report|list|status|reservation-audit>
  [--arguments <JSON-array>]`. Legacy scheduling/dispatch is retired from this
  chapter; historical persisted records and their readers remain intact.
- Project initialization and registration: `ponytail register`; removal:
  `ponytail unregister <repository-root>`; listing: `ponytail list-projects`.
- Worktree selection: `ponytail bless[-worktree]`; display it with `ponytail
  blessed[-worktree]`.
- Worktree reclamation: `ponytail worktree reclaim [--dry-run] [--json]`;
  lifecycle authority is the invoking project's committed
  `.agents/config/project/worktree-lifecycle.json` adapter.
- Semantic rebase: `ponytail rebase diff <target> [--output <file>]`, then
  `ponytail rebase run <target> --conflicts <selection-file>`; inspect retained
  stops with `ponytail rebase status`, advance with `ponytail rebase continue`,
  or restore the frozen source with `ponytail rebase abort`. These commands run
  no project tests, builds, QA, fetch, push, merge, or publication.
- Worker-owned recovery: `ponytail worktree recover <attachment-token>` from
  an existing neutral cwd; restores only the bound original checkout from its
  main worktree. Campaign worker pairs are retained, not automatically retired.
  An original provisioned worker may receive integrated adoption tooling with
  `ponytail worktree upgrade <attachment-token> --revision <commit>` before
  immediate adoption and attachment; pending upgrades resume through recovery.
- Component registration: `ponytail register-component <name>` and
  `ponytail unregister-component <name>`; listing: `ponytail list-components`.
- Project dependency registration: `ponytail register-dependency <project>` and
  `ponytail unregister-dependency <project>`; listing: `ponytail
  list-dependencies`.
- JavaScript/TypeScript component detection: `ponytail detect-components
  [--language typescript|javascript|auto]`.
- Permission update: `ponytail update-permissions`.
- Codex skill update: `ponytail update-skills`; Codex discovers
  project-local skills from `.agents/skills/` automatically.
- Codex installer tests: `./scripts/test-install-to-codex.sh`.
- TSTS CLI: `tsts --project tsconfig.json`, `tsts --config tsts.json`, or
  `tsts --directory-structure .agents/config/project/directory-structure.json`;
  requires a registered project.
- CLI installation: `./scripts/install-cli.sh`.
- Project-journal setup: `./scripts/setup-project-journal.sh`.
- CLI focused tests: `node --test tests/cli-tools.test.js`.
- Deployment: not applicable.

Use the Node focused command while editing. Run the Node full command, the
rule-copy check, and the version check for final core acceptance.

## Local Rules

- When instructions, requirements, skills, or coordinator guidance contradict,
  ask the user to resolve the conflict before continuing the affected work.
  Apply the canonical contradiction-resolution principle in
  `skills/ponytail/SKILL.md`; another agent cannot resolve it on the user's behalf.
- Do not invent requirements. Stick to what the user tells you in the chat or
  shares with you as requirements files.
- The user's language and static-type-safety mandates apply prospectively
  only to code introduced by our work, specifically the Codex plan-execution
  CLI and its supporting implementation, tests and tooling. Write that code
  in TypeScript with strong static types and apply TSTS to it. These mandates
  do not authorize migrating pre-existing Ponytail code or impose a language
  migration requirement on client projects. Preserve translations already
  completed; do not translate them back. This scope correction supersedes
  broader language-migration scope in existing plan records.
- Keep generated host adapters synchronized with their canonical sources in
  the same commit.
- Do not hand-edit generated skill copies when the owning generator can
  produce the change.
- Preserve the benchmark boundary: core commands, dependencies, packages, and
  CI must not execute or provision benchmark behavior.
- Never commit generated distributable archives or other binary release
  artifacts.
- Follow the active plan under `pm/plans/` for multi-step work.
