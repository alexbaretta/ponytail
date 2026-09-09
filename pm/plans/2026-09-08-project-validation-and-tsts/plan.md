# Project validation and installable TSTS

Plan ID: 2026-09-08-project-validation-and-tsts
Status: DONE

## Objective and authority
Implement explicit main-checkout registration, cheap setup validation before Ponytail commands, and local reference QA. Integrate TSTS as an installable CLI with canonical source in Ponytail. User explicitly requested creating and implementing this plan on 2026-09-08.

Management and implementation repository: Ponytail. Read TSTS import source without modifying its checkout. No downstream checkout, home configuration, installation, deployment, or CI mutation is authorized by this plan.

## Contracts
- `register` initializes local metadata and registers the Git main checkout. Dynamic linked worktrees inherit registration.
- Every `ponytail` invocation requires a non-bare Git worktree. Exit 2 means no worktree, 3 means unregistered, 1 means invalid setup/operation, 4 means QA findings. Registration is the only setup-validation exception.
- `validate` checks user registration and local metadata only. `qa` runs moderately expensive local checks, initially references, with no integration suite execution.
- Identity metadata lives in `.ponytail/project.json`: versioned names, repository/package coordinates, dependency manifests, narrow exceptions. Skills consume this as descriptive data.
- Reference search uses tracked working-tree text via Git, without submodule recursion. Only direct declared dependencies or actual submodules permit another registered identity. Registry coverage is explicit, not a proof of global completeness.
- Historical global configuration V1 remains readable and unchanged; registry entries normalize to main-checkout identities at read/use time.

## Sprints
1. [S01](sprints/S01.md): local lifecycle and QA — DONE (03e9579 plus reconciliation commit).
2. [S02](sprints/S02.md): installable TSTS — DONE (41a8103, 7ced1dc plus final reconciliation).

## Acceptance
Focused behavioral tests cover registration from worktrees, distinct errors, validation/QA separation, known foreign names, dependencies/submodules, exceptions, and malformed inputs. Final core acceptance: npm test, rule-copy check, version check. TSTS additionally requires its unit and compiler proof and installed CLI invocation. No full downstream integration suites.

## Questions
S01: none. Implementation choices recorded in sprint before edits.
S02: [RESOLVED] User: "re-release it under the MIT license. Change the copyright claim to Alex Baretta <alex@baretta.com>".

## Evidence
Initial working tree clean. Journal start failed: PostgreSQL Unix socket /tmp/.s.PGSQL.5432 denied by sandbox. Journaling non-blocking; durable evidence remains here.

## Final validation record

Completed on 2026-09-08. Implementation commits: 03e9579 (lifecycle/reference QA), 41a8103 (MIT TSTS CLI), 7ced1dc (Git output independence). S01 lifecycle reconciliation: 30ce95e.

Final npm test passed: 375 tests (290 core, 23 extension, 4 MCP, 58 TSTS), zero failures or skips, plus Codex installer checks. Rule-copy validation passed for all 8 targets; version validation passed for all 7 version files. Build-impact selected TSTS; compiler build passed once after final compiler inputs. Packaging proof confirms compiled runtime inclusion and test-output exclusion. Exact import comparison proves all 12 source/test files preserve revision 23dfee0d97caaaa453c071c6dd6ce50c5e8c1914 semantics apart from authorized headers.

No current-user registration, outside installation, downstream modification, CI/CD action, or integration-suite execution was performed. Repository-local metadata and documentation are committed. Registry coverage remains explicit; names and supported canonical manifests are project-owned. Journal startup was unavailable because the sandbox denied its database socket; durable execution evidence is complete in these plan records.
