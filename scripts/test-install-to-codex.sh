#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

assert_link() {
  local link_path="$1"
  local expected_target="$2"

  [[ -L "${link_path}" ]] || fail "expected symlink: ${link_path}"
  [[ "$(readlink "${link_path}")" == "${expected_target}" ]] || \
    fail "unexpected symlink target: ${link_path}"
}

assert_copy() {
  local copy_path="$1"
  local source_path="$2"

  [[ -d "${copy_path}" ]] || fail "expected copied directory: ${copy_path}"
  [[ ! -L "${copy_path}" ]] || fail "expected copy, found symlink: ${copy_path}"
  [[ ! "${source_path}/SKILL.md" -ef "${copy_path}/SKILL.md" ]] || \
    fail "installed skill shares source files: ${copy_path}"
  diff -qr "${source_path}" "${copy_path}" >/dev/null || \
    fail "copied directory differs from source: ${copy_path}"
}

cleanup() {
  local temporary_root="$1"
  local temporary_parent="$2"

  if [[ -n "${temporary_root}" ]] && \
    [[ "${temporary_root}" == "${temporary_parent}/"* ]]; then
    rm -rf "${temporary_root}"
  fi
}

main() {
  local ponytail_root
  local temporary_parent
  local temporary_root

  ponytail_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  temporary_parent="${TMPDIR:-/tmp}"
  temporary_parent="${temporary_parent%/}"
  temporary_root="$(mktemp -d "${temporary_parent}/ponytail-install.XXXXXX")"
  trap 'cleanup "${temporary_root}" "${temporary_parent}"' EXIT
  export HOME="${temporary_root}/home"
  mkdir -p "${temporary_root}/codex/skills" "${temporary_root}/codex/rules"
  printf '%s\n%s\n%s' \
    'prefix_rule(pattern=["existing"], decision="allow")' \
    "prefix_rule(pattern=[\"${HOME}/.local/bin/project_journal.sh\"], decision=\"allow\")" \
    "prefix_rule(pattern=[\"${HOME}/.local/bin/project_journal.sh\", [\"start\", \"over\"]], decision=\"allow\", justification=\"Allow fixed project-journal database operations\", match=[\"${HOME}/.local/bin/project_journal.sh start\", \"${HOME}/.local/bin/project_journal.sh over\"], not_match=[\"${HOME}/.local/bin/project_journal.sh run_command\"])" > \
    "${temporary_root}/codex/rules/default.rules"
  ln -s \
    "${ponytail_root}/skills/git-write-escalation" \
    "${temporary_root}/codex/skills/git-write-escalation"
  ln -s \
    "${ponytail_root}/skills/typed-contract-safety" \
    "${temporary_root}/codex/skills/typed-contract-safety"
  touch "${temporary_root}/codex/AGENTS.md"

  "${ponytail_root}/scripts/install-to-codex.sh" \
    --dry-run \
    --codex-home "${temporary_root}/codex" >/dev/null
  [[ -f "${temporary_root}/codex/AGENTS.md" ]] || \
    fail 'dry-run changed the empty global instructions file'
  [[ "$(wc -l < "${temporary_root}/codex/rules/default.rules")" -eq 2 ]] || \
    fail 'dry-run changed the existing rules file'

  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex"

  assert_link \
    "${temporary_root}/codex/AGENTS.md" \
    "${ponytail_root}/config/AGENTS.md"
  grep -Fxq 'prefix_rule(pattern=["existing"], decision="allow")' \
    "${temporary_root}/codex/rules/default.rules" || \
    fail 'installer replaced an existing Codex rule'
  grep -Fxq \
    "prefix_rule(pattern=[\"${HOME}/.local/bin/project_journal.sh\", [\"init\", \"start\", \"over\"]], decision=\"allow\", justification=\"Allow fixed project-journal database operations\", match=[\"${HOME}/.local/bin/project_journal.sh init\", \"${HOME}/.local/bin/project_journal.sh start\", \"${HOME}/.local/bin/project_journal.sh over\"], not_match=[\"${HOME}/.local/bin/project_journal.sh run_command\"])" \
    "${temporary_root}/codex/rules/default.rules" || \
    fail 'installer did not add the project journal allow rule'
  if grep -Fxq \
    "prefix_rule(pattern=[\"${HOME}/.local/bin/project_journal.sh\"], decision=\"allow\")" \
    "${temporary_root}/codex/rules/default.rules"; then
    fail 'installer retained the broad project journal allow rule'
  fi
  if grep -Fq '["start", "over"]' \
    "${temporary_root}/codex/rules/default.rules"; then
    fail 'installer retained the previous project journal allow rule'
  fi
  printf '%s\n' 'prefix_rule(pattern=["existing"], decision="allow")' > \
    "${temporary_root}/codex/rules/default.rules"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" >/dev/null 2>&1; then
    fail 'installer check accepted a missing project journal allow rule'
  fi
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" >/dev/null
  assert_copy \
    "${temporary_root}/codex/skills/static-type-safety" \
    "${ponytail_root}/skills/static-type-safety"
  [[ ! -e "${temporary_root}/codex/skills/git-write-escalation" ]] || \
    fail 'disabled skill remains installed'
  [[ ! -e "${temporary_root}/codex/skills/typed-contract-safety" ]] || \
    fail 'unregistered skill remains installed'

  rm -rf "${temporary_root}/codex/skills/static-type-safety"
  ln -s \
    "${ponytail_root}/skills/static-type-safety" \
    "${temporary_root}/codex/skills/static-type-safety"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" >/dev/null 2>&1; then
    fail 'installer check accepted a skill symlink'
  fi
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" >/dev/null

  printf '%s\n' 'installed drift' >> \
    "${temporary_root}/codex/skills/static-type-safety/SKILL.md"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" >/dev/null 2>&1; then
    fail 'installer check accepted installed content drift'
  fi
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" >/dev/null
  assert_copy \
    "${temporary_root}/codex/skills/static-type-safety" \
    "${ponytail_root}/skills/static-type-safety"

  printf 'project\texample-project-skill\t%s\n' \
    '/project/.agents/skills/example-project-skill' >> \
    "${temporary_root}/codex/.ponytail-install.tsv"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" >/dev/null 2>&1; then
    fail 'installer check accepted an obsolete project manifest entry'
  fi
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" >/dev/null

  mkdir -p "${temporary_root}/protected-codex/skills"
  printf '%s\n' 'existing instructions' > \
    "${temporary_root}/protected-codex/AGENTS.md"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/protected-codex" >/dev/null 2>&1; then
    fail 'installer replaced non-empty global instructions'
  fi
  [[ -z "$(find "${temporary_root}/protected-codex/skills" -mindepth 1 -print -quit)" ]] || \
    fail 'failed preflight partially installed skills'

  mkdir -p "${temporary_root}/foreign-codex/skills"
  ln -s "${temporary_root}/foreign-owner" \
    "${temporary_root}/foreign-codex/skills/static-type-safety"
  touch "${temporary_root}/foreign-codex/AGENTS.md"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/foreign-codex" >/dev/null 2>&1; then
    fail 'installer replaced an unowned skill symlink'
  fi
  assert_link \
    "${temporary_root}/foreign-codex/skills/static-type-safety" \
    "${temporary_root}/foreign-owner"
  [[ ! -e "${temporary_root}/foreign-codex/skills/api-service-boundaries" ]] || \
    fail 'foreign-link failure partially installed skills'

  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --project-skills "${temporary_root}/project-skills" >/dev/null 2>&1; then
    fail 'installer accepted the removed project-skills option'
  fi

  "${ponytail_root}/scripts/install-to-codex.sh" \
    --dry-run \
    --codex-home "${temporary_root}/fresh-codex" >/dev/null
  [[ ! -e "${temporary_root}/fresh-codex" ]] || \
    fail 'fresh-home dry-run mutated the filesystem'

  env -u HOME -u CODEX_HOME \
    "${ponytail_root}/scripts/install-to-codex.sh" --help >/dev/null

  mkdir -p "${temporary_root}/moved-codex/skills"
  ln -s "/old/ponytail/skills/git-write-escalation" \
    "${temporary_root}/moved-codex/skills/git-write-escalation"
  printf 'bundled\tgit-write-escalation\t%s\n' \
    '/old/ponytail/skills/git-write-escalation' > \
    "${temporary_root}/moved-codex/.ponytail-install.tsv"
  touch "${temporary_root}/moved-codex/AGENTS.md"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/moved-codex" >/dev/null
  [[ ! -L "${temporary_root}/moved-codex/skills/git-write-escalation" ]] || \
    fail 'installer retained a disabled link from a moved ponytail checkout'

  mkdir -p "${temporary_root}/transition-codex/skills"
  touch "${temporary_root}/transition-codex/AGENTS.md"
  ln -s "/project/.agents/skills/example-project-skill" \
    "${temporary_root}/transition-codex/skills/example-project-skill"
  ln -s \
    "/project/.agents/skills/static-type-safety" \
    "${temporary_root}/transition-codex/skills/static-type-safety"
  printf 'project\texample-project-skill\t%s\nproject\tstatic-type-safety\t%s\n' \
    '/project/.agents/skills/example-project-skill' \
    '/project/.agents/skills/static-type-safety' > \
    "${temporary_root}/transition-codex/.ponytail-install.tsv"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/transition-codex" >/dev/null
  [[ ! -L "${temporary_root}/transition-codex/skills/example-project-skill" ]] || \
    fail 'installer retained a formerly managed project skill'
  assert_copy \
    "${temporary_root}/transition-codex/skills/static-type-safety" \
    "${ponytail_root}/skills/static-type-safety"
  if grep -q $'^project\t' "${temporary_root}/transition-codex/.ponytail-install.tsv"; then
    fail 'installer retained project entries in its ownership manifest'
  fi

  printf '%s\n' 'installer tests passed'
  exit 0
}

main "$@"
