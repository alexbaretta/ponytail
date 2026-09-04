# Codex Execpolicy Management

- Plan ID: `2026-09-04-codex-execpolicy`
- Status: `DONE`
- Approval: on 2026-09-04 the user explicitly requested implementation after
  acknowledging that accepted shared allow and deny rules can grant authority
  or deny service to every Codex agent using the same user configuration.

## Objective

Replace the rule-condensing proof of concept with a user-approved policy
pipeline that imports existing Codex rules once, combines Ponytail baseline
policy with registered project proposals, stores the accepted source of truth
under `~/.ponytail`, and atomically installs a reconstructible Codex policy.

## Scope

- Define versioned Ponytail baseline, project proposal, and accepted-state
  contracts.
- Implement proposal discovery, normalization, review, acceptance, synthesis,
  restoration, and check modes in the Ponytail CLI.
- Require user confirmation for every effective policy change, including
  project-local scripts and restrictive directives.
- Integrate the complete pipeline into `scripts/install.sh` without changing a
  real user policy during automated tests.
- Add a focused reusable skill, documentation, ownership records, and tests.

## Exclusions

- No attempt to prove arbitrary package-manager or repository scripts safe.
- No live mutation of the invoking user's `~/.ponytail` or `~/.codex` during
  implementation acceptance.
- No replacement of administrator-managed Codex policy.
- No compatibility promise beyond the current preview Codex prefix-rule
  language.

## Sprint

- [S01](sprints/S01.md): implement and validate the V1 policy pipeline. Status:
  `DONE`.

## Acceptance

- Existing Codex prefix rules are imported once and survive loss of
  `~/.codex`.
- Repository files can only propose changes; accepted state under
  `~/.ponytail` is authoritative.
- A policy change is displayed and requires an interactive confirmation or an
  explicit proposal digest; noninteractive ambiguity fails without mutation.
- Accepted `prompt` and `forbidden` rules override overlapping allows through
  native Codex strictest-decision semantics.
- Generated state and Codex output use atomic replacement and reject symlinked
  ownership targets.
- The combined installer exercises the full pipeline.
- Focused tests and final Ponytail acceptance pass.

## Final Validation

- `npm test` passed: 259 core tests, 23 Pi extension tests, and 4 MCP tests,
  including registry, generated-output, rule-copy, installer, and isolated
  end-to-end policy checks.
- `PONYTAIL_CODEX_EXECUTABLE=/Applications/ChatGPT.app/Contents/Resources/codex
  node --test tests/condense-codex-rules.test.js` passed all 6 tests through
  Codex's installed execpolicy parser.
- `node scripts/check-versions.js` confirmed all version owners remain aligned.
- No command wrote to the invoking user's live `~/.ponytail` or `~/.codex`.
