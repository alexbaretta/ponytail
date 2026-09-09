# Duplicate project configuration directories

Canonical bug: `2026-09-08-duplicate-project-config-directories`

Status: DONE

## Report and impact

`ponytail register` creates project-owned configuration in both `.ponytail`
and `.agents/config`, forcing adopting repositories to maintain two hidden
configuration roots.

## Diagnosis

The exec-policy proposal still uses its original
`.ponytail/codex-execpolicy.json` path after project identity configuration
moved to `.agents/config/ponytail.json`. The CLI, policy compiler, package
manifest, tests, documentation, and generated skill copy retain the old path.

## Resolution

Move the project-owned exec-policy proposal to
`.agents/config/codex-execpolicy.json` and update every active consumer and
owned reference. Keep user-global accepted state under `~/.ponytail`; that is
user configuration rather than a second project-local directory.

## Authority and scope

The user reported this bug and requested correction on 2026-09-08. The atomic
change is confined to the Ponytail repository. Historical completed plan
records remain unchanged.

## Validation and closure

The exec-policy proposal moved to `.agents/config/codex-execpolicy.json`.
Registration initializes both project files in that directory, validation
reads the new canonical path, and permission aggregation reads policy from
each registered repository's blessed worktree. Historical completed plan
records were preserved.

- The deleted path's build-impact query reported no affected targets before
  the move. Final build impact selected the TSTS build because `package.json`
  changed; `npm run build:tsts` passed.
- Focused policy, registration, project validation, packaging, installed TSTS,
  and generated OpenClaw tests passed. Validation also proves that both files
  under `.agents/config` must be tracked.
- Shell parsing, rule-copy validation, version validation, and whitespace
  checks passed.
- The full `npm test` acceptance command passed after the final source edit.
