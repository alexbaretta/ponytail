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
  local project_skills
  local temporary_parent
  local temporary_root

  ponytail_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  temporary_parent="${TMPDIR:-/tmp}"
  temporary_parent="${temporary_parent%/}"
  temporary_root="$(mktemp -d "${temporary_parent}/ponytail-install.XXXXXX")"
  trap 'cleanup "${temporary_root}" "${temporary_parent}"' EXIT
  project_skills="${temporary_root}/project-skills"
  mkdir -p "${project_skills}/example-project-skill"
  touch "${project_skills}/example-project-skill/SKILL.md"
  mkdir -p "${temporary_root}/codex/skills"
  ln -s \
    "${ponytail_root}/skills/git-write-escalation" \
    "${temporary_root}/codex/skills/git-write-escalation"
  ln -s \
    "${ponytail_root}/skills/typed-contract-safety" \
    "${temporary_root}/codex/skills/typed-contract-safety"
  touch "${temporary_root}/codex/AGENTS.md"

  "${ponytail_root}/scripts/install-to-codex.sh" \
    --dry-run \
    --codex-home "${temporary_root}/codex" \
    --project-skills "${project_skills}" >/dev/null
  [[ -f "${temporary_root}/codex/AGENTS.md" ]] || \
    fail 'dry-run changed the empty global instructions file'

  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" \
    --project-skills "${project_skills}"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" \
    --project-skills "${project_skills}"

  assert_link \
    "${temporary_root}/codex/AGENTS.md" \
    "${ponytail_root}/config/AGENTS.md"
  assert_link \
    "${temporary_root}/codex/skills/static-type-safety" \
    "${ponytail_root}/skills/static-type-safety"
  assert_link \
    "${temporary_root}/codex/skills/example-project-skill" \
    "${project_skills}/example-project-skill"
  [[ ! -e "${temporary_root}/codex/skills/git-write-escalation" ]] || \
    fail 'disabled skill remains installed'
  [[ ! -e "${temporary_root}/codex/skills/typed-contract-safety" ]] || \
    fail 'unregistered skill remains installed'

  mv \
    "${project_skills}/example-project-skill/SKILL.md" \
    "${project_skills}/example-project-skill/SKILL.md.removed"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/codex" \
    --project-skills "${project_skills}" >/dev/null
  [[ ! -L "${temporary_root}/codex/skills/example-project-skill" ]] || \
    fail 'installer retained a removed project skill'
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --check \
    --codex-home "${temporary_root}/codex" \
    --project-skills "${project_skills}"

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

  mkdir -p "${temporary_root}/collision-skills/static-type-safety"
  touch "${temporary_root}/collision-skills/static-type-safety/SKILL.md"
  if "${ponytail_root}/scripts/install-to-codex.sh" \
    --dry-run \
    --codex-home "${temporary_root}/collision-codex" \
    --project-skills "${temporary_root}/collision-skills" >/dev/null 2>&1; then
    fail 'installer accepted a bundled/project skill-name collision'
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

  mkdir -p \
    "${temporary_root}/transition-codex/skills" \
    "${temporary_root}/transition-skills/git-write-escalation"
  touch "${temporary_root}/transition-skills/git-write-escalation/SKILL.md"
  touch "${temporary_root}/transition-codex/AGENTS.md"
  ln -s \
    "/old/ponytail/skills/git-write-escalation" \
    "${temporary_root}/transition-codex/skills/git-write-escalation"
  printf 'bundled\tgit-write-escalation\t%s\n' \
    '/old/ponytail/skills/git-write-escalation' > \
    "${temporary_root}/transition-codex/.ponytail-install.tsv"
  "${ponytail_root}/scripts/install-to-codex.sh" \
    --codex-home "${temporary_root}/transition-codex" \
    --project-skills "${temporary_root}/transition-skills" >/dev/null
  assert_link \
    "${temporary_root}/transition-codex/skills/git-write-escalation" \
    "${temporary_root}/transition-skills/git-write-escalation"

  printf '%s\n' 'installer tests passed'
  exit 0
}

main "$@"
