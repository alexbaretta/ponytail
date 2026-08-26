#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage:
  ./scripts/install-to-codex.sh [--check] [--dry-run]
    [--codex-home <path>]

Installs enabled bundled skills, the global AGENTS.md, and the project journal
allow rule into CODEX_HOME.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

print_action() {
  printf '%s\n' "$1"
}

registry_status_for_skill() {
  local kind
  local requested_skill="$1"
  local reason
  local skill_name
  local source_relative
  local status
  local hosts

  while IFS=$'\t' read -r kind status skill_name source_relative hosts reason; do
    if [[ -z "${kind}" ]] || [[ "${kind}" == \#* ]] || \
      [[ "${kind}" != 'skill' ]]; then
      continue
    fi

    if [[ "${skill_name}" == "${requested_skill}" ]]; then
      printf '%s\n' "${status}"
      return
    fi
  done < "${INSTALL_TO_CODEX_REGISTRY}"

  return 1
}

manifest_source_for() {
  local requested_kind="$1"
  local requested_name="$2"
  local kind
  local name
  local source_path

  if [[ ! -f "${INSTALL_TO_CODEX_MANIFEST}" ]]; then
    return 1
  fi

  while IFS=$'\t' read -r kind name source_path; do
    if [[ "${kind}" == "${requested_kind}" ]] && \
      [[ "${name}" == "${requested_name}" ]]; then
      printf '%s\n' "${source_path}"
      return
    fi
  done < "${INSTALL_TO_CODEX_MANIFEST}"

  return 1
}

link_matches() {
  local link_path="$1"
  local source_path="$2"

  [[ -L "${link_path}" ]] && [[ "$(readlink "${link_path}")" == "${source_path}" ]]
}

link_is_installer_owned() {
  local kind="$1"
  local name="$2"
  local link_path="$3"
  local previous_source

  if [[ ! -L "${link_path}" ]]; then
    return 1
  fi

  previous_source="$(manifest_source_for "${kind}" "${name}" || true)"
  [[ -n "${previous_source}" ]] && \
    [[ "$(readlink "${link_path}")" == "${previous_source}" ]]
}

installed_skill_matches() {
  local installed_path="$1"
  local source_path="$2"

  [[ -d "${installed_path}" ]] && \
    [[ ! -L "${installed_path}" ]] && \
    diff -qr "${source_path}" "${installed_path}" >/dev/null
}

installed_skill_is_installer_owned() {
  local kind="$1"
  local name="$2"
  local installed_path="$3"
  local previous_source

  previous_source="$(manifest_source_for "${kind}" "${name}" || true)"
  if [[ -z "${previous_source}" ]]; then
    return 1
  fi

  if [[ -L "${installed_path}" ]]; then
    [[ "$(readlink "${installed_path}")" == "${previous_source}" ]]
    return
  fi

  [[ -d "${installed_path}" ]]
}

preflight_skill() {
  local kind="$1"
  local name="$2"
  local installed_path="$3"
  local source_path="$4"

  if installed_skill_matches "${installed_path}" "${source_path}"; then
    return
  fi

  if [[ -L "${installed_path}" ]] || [[ -e "${installed_path}" ]]; then
    if installed_skill_is_installer_owned \
      "${kind}" "${name}" "${installed_path}"; then
      return
    fi
    if [[ "${kind}" == 'bundled' ]] && \
      installed_skill_is_installer_owned \
        'project' "${name}" "${installed_path}"; then
      return
    fi
    fail "refusing to replace unowned skill path: ${installed_path}"
  fi
}

preflight_global_agents() {
  local source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/config/AGENTS.md"
  local target_path="${INSTALL_TO_CODEX_CODEX_HOME}/AGENTS.md"

  if link_matches "${target_path}" "${source_path}"; then
    return
  fi

  if [[ -L "${target_path}" ]]; then
    if link_is_installer_owned 'global' 'AGENTS.md' "${target_path}"; then
      return
    fi
    fail "refusing to replace unowned global instructions symlink: ${target_path}"
  fi

  if [[ -e "${target_path}" ]] && [[ -s "${target_path}" ]]; then
    fail "refusing to replace non-empty global instructions: ${target_path}"
  fi
}

project_journal_rule() {
  local escaped_path="${INSTALL_TO_CODEX_PROJECT_JOURNAL_PATH//\\/\\\\}"
  escaped_path="${escaped_path//\"/\\\"}"
  printf '%s\n' \
    "prefix_rule(pattern=[\"${escaped_path}\", [\"init\", \"start\", \"over\"]], decision=\"allow\", justification=\"Allow fixed project-journal database operations\", match=[\"${escaped_path} init\", \"${escaped_path} start\", \"${escaped_path} over\"], not_match=[\"${escaped_path} run_command\"])"
}

legacy_project_journal_rules() {
  local escaped_path="${INSTALL_TO_CODEX_PROJECT_JOURNAL_PATH//\\/\\\\}"
  escaped_path="${escaped_path//\"/\\\"}"
  printf 'prefix_rule(pattern=["%s"], decision="allow")\n' "${escaped_path}"
  printf '%s\n' \
    "prefix_rule(pattern=[\"${escaped_path}\", [\"start\", \"over\"]], decision=\"allow\", justification=\"Allow fixed project-journal database operations\", match=[\"${escaped_path} start\", \"${escaped_path} over\"], not_match=[\"${escaped_path} run_command\"])"
}

preflight_rules() {
  if [[ -L "${INSTALL_TO_CODEX_RULES_TARGET}" ]] || \
    { [[ -e "${INSTALL_TO_CODEX_RULES_TARGET}" ]] && \
      [[ ! -d "${INSTALL_TO_CODEX_RULES_TARGET}" ]]; }; then
    fail "refusing to replace non-directory rules path: ${INSTALL_TO_CODEX_RULES_TARGET}"
  fi

  if [[ -L "${INSTALL_TO_CODEX_RULES_FILE}" ]] || \
    { [[ -e "${INSTALL_TO_CODEX_RULES_FILE}" ]] && \
      [[ ! -f "${INSTALL_TO_CODEX_RULES_FILE}" ]]; }; then
    fail "refusing to replace non-file rules path: ${INSTALL_TO_CODEX_RULES_FILE}"
  fi
}

preflight_installation() {
  local hosts
  local kind
  local reason
  local skill_name
  local source_relative
  local source_path
  local status

  while IFS=$'\t' read -r kind status skill_name source_relative hosts reason; do
    if [[ -z "${kind}" ]] || [[ "${kind}" == \#* ]] || \
      [[ "${kind}" != 'skill' ]]; then
      continue
    fi

    if [[ "${status}" == 'enabled' ]]; then
      source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/${source_relative}"
      if [[ ! -d "${source_path}" ]]; then
        fail "registered skill directory not found: ${source_path}"
      fi
      preflight_skill \
        'bundled' \
        "${skill_name}" \
        "${INSTALL_TO_CODEX_SKILLS_TARGET}/${skill_name}" \
        "${source_path}"
    elif [[ "${status}" != 'disabled' ]]; then
      fail "invalid registry status for ${skill_name}: ${status}"
    fi
  done < "${INSTALL_TO_CODEX_REGISTRY}"

  preflight_global_agents
  preflight_rules
}

install_link() {
  local link_path="$1"
  local source_path="$2"

  if link_matches "${link_path}" "${source_path}"; then
    return
  fi

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]]; then
    fail "expected symlink ${link_path} -> ${source_path}"
  fi

  print_action "link ${link_path} -> ${source_path}"
  if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'false' ]]; then
    ln -sfn "${source_path}" "${link_path}"
  fi
}

install_skill_copy() {
  local installed_path="$1"
  local source_path="$2"
  local backup_path=''
  local staged_path

  if installed_skill_matches "${installed_path}" "${source_path}"; then
    return
  fi

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]]; then
    fail "installed skill differs from source: ${installed_path}"
  fi

  print_action "copy ${source_path} -> ${installed_path}"
  if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'true' ]]; then
    return
  fi

  staged_path="$(mktemp -d \
    "${INSTALL_TO_CODEX_SKILLS_TARGET}/.ponytail-install-new.XXXXXX")"
  if ! cp -R "${source_path}/." "${staged_path}/"; then
    rm -rf "${staged_path}"
    fail "could not stage skill copy: ${source_path}"
  fi

  if [[ -L "${installed_path}" ]] || [[ -e "${installed_path}" ]]; then
    backup_path="$(mktemp -d \
      "${INSTALL_TO_CODEX_SKILLS_TARGET}/.ponytail-install-old.XXXXXX")"
    rmdir "${backup_path}"
    mv "${installed_path}" "${backup_path}"
  fi

  if ! mv "${staged_path}" "${installed_path}"; then
    if [[ -n "${backup_path}" ]]; then
      mv "${backup_path}" "${installed_path}"
    fi
    rm -rf "${staged_path}"
    fail "could not install skill copy: ${installed_path}"
  fi

  if [[ -n "${backup_path}" ]]; then
    rm -rf "${backup_path}"
  fi
}

install_ponytail_skills() {
  local hosts
  local kind
  local reason
  local skill_name
  local source_relative
  local source_path
  local status

  while IFS=$'\t' read -r kind status skill_name source_relative hosts reason; do
    if [[ -z "${kind}" ]] || [[ "${kind}" == \#* ]] || \
      [[ "${kind}" != 'skill' ]]; then
      continue
    fi

    if [[ "${status}" != 'enabled' ]]; then
      continue
    fi

    source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/${source_relative}"
    install_skill_copy \
      "${INSTALL_TO_CODEX_SKILLS_TARGET}/${skill_name}" \
      "${source_path}"
  done < "${INSTALL_TO_CODEX_REGISTRY}"
}

remove_installed_skill() {
  local installed_path="$1"

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]]; then
    fail "obsolete installer-owned skill remains installed: $(basename "${installed_path}")"
  fi

  print_action "remove ${installed_path}"
  if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'false' ]]; then
    rm -rf "${installed_path}"
  fi
}

remove_current_root_stale_links() {
  local link_path
  local link_target
  local skill_name
  local status

  for link_path in "${INSTALL_TO_CODEX_SKILLS_TARGET}"/*; do
    if [[ ! -L "${link_path}" ]]; then
      continue
    fi

    link_target="$(readlink "${link_path}")"
    if [[ "${link_target}" != "${INSTALL_TO_CODEX_PONYTAIL_ROOT}/skills/"* ]]; then
      continue
    fi

    skill_name="$(basename "${link_path}")"
    status="$(registry_status_for_skill "${skill_name}" || true)"
    if [[ "${status}" != 'enabled' ]]; then
      remove_installed_skill "${link_path}"
    fi
  done
}

remove_manifest_stale_links() {
  local kind
  local link_path
  local name
  local source_path
  local status

  if [[ ! -f "${INSTALL_TO_CODEX_MANIFEST}" ]]; then
    return
  fi

  while IFS=$'\t' read -r kind name source_path; do
    if [[ "${kind}" == 'project' ]]; then
      status="$(registry_status_for_skill "${name}" || true)"
      if [[ "${status}" == 'enabled' ]]; then
        continue
      fi
      link_path="${INSTALL_TO_CODEX_SKILLS_TARGET}/${name}"
      if { [[ -L "${link_path}" ]] && \
        [[ "$(readlink "${link_path}")" == "${source_path}" ]]; } || \
        { [[ -d "${link_path}" ]] && [[ ! -L "${link_path}" ]]; }; then
        remove_installed_skill "${link_path}"
      fi
      continue
    fi

    if [[ "${kind}" != 'bundled' ]]; then
      continue
    fi

    status="$(registry_status_for_skill "${name}" || true)"
    if [[ "${status}" == 'enabled' ]]; then
      continue
    fi

    link_path="${INSTALL_TO_CODEX_SKILLS_TARGET}/${name}"
    if { [[ -L "${link_path}" ]] && \
      [[ "$(readlink "${link_path}")" == "${source_path}" ]]; } || \
      { [[ -d "${link_path}" ]] && [[ ! -L "${link_path}" ]]; }; then
      remove_installed_skill "${link_path}"
    fi
  done < "${INSTALL_TO_CODEX_MANIFEST}"
}

install_global_agents() {
  local source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/config/AGENTS.md"
  local target_path="${INSTALL_TO_CODEX_CODEX_HOME}/AGENTS.md"

  if link_matches "${target_path}" "${source_path}"; then
    return
  fi

  if [[ -e "${target_path}" ]] && [[ ! -L "${target_path}" ]]; then
    print_action "remove empty ${target_path}"
    if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'true' ]]; then
      print_action "link ${target_path} -> ${source_path}"
      return
    fi
    rm -f "${target_path}"
  fi

  install_link "${target_path}" "${source_path}"
}

install_project_journal_rule() {
  local legacy_rule
  local rule
  local temporary_rules

  rule="$(project_journal_rule)"
  while IFS= read -r legacy_rule; do
    if [[ -f "${INSTALL_TO_CODEX_RULES_FILE}" ]] && \
      grep -Fxq "${legacy_rule}" "${INSTALL_TO_CODEX_RULES_FILE}"; then
      if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]]; then
        fail "obsolete project journal allow rule remains: ${INSTALL_TO_CODEX_RULES_FILE}"
      fi
      print_action "remove obsolete project journal allow rule from ${INSTALL_TO_CODEX_RULES_FILE}"
      if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'false' ]]; then
        temporary_rules="$(mktemp "${INSTALL_TO_CODEX_RULES_FILE}.XXXXXX")"
        awk -v legacy_rule="${legacy_rule}" \
          '$0 != legacy_rule' "${INSTALL_TO_CODEX_RULES_FILE}" > "${temporary_rules}"
        mv "${temporary_rules}" "${INSTALL_TO_CODEX_RULES_FILE}"
      fi
    fi
  done < <(legacy_project_journal_rules)

  if [[ -f "${INSTALL_TO_CODEX_RULES_FILE}" ]] && \
    grep -Fxq "${rule}" "${INSTALL_TO_CODEX_RULES_FILE}"; then
    return
  fi

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]]; then
    fail "project journal allow rule is missing: ${INSTALL_TO_CODEX_RULES_FILE}"
  fi

  print_action "add project journal allow rule to ${INSTALL_TO_CODEX_RULES_FILE}"
  if [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'true' ]]; then
    return
  fi

  if [[ -s "${INSTALL_TO_CODEX_RULES_FILE}" ]] && \
    [[ -n "$(tail -c 1 "${INSTALL_TO_CODEX_RULES_FILE}")" ]]; then
    printf '\n' >> "${INSTALL_TO_CODEX_RULES_FILE}"
  fi
  printf '%s\n' "${rule}" >> "${INSTALL_TO_CODEX_RULES_FILE}"
}

write_manifest() {
  local hosts
  local kind
  local manifest_temporary
  local reason
  local skill_name
  local source_relative
  local source_path
  local status

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]] || \
    [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'true' ]]; then
    return
  fi

  manifest_temporary="$(mktemp "${INSTALL_TO_CODEX_CODEX_HOME}/.ponytail-install.XXXXXX")"
  while IFS=$'\t' read -r kind status skill_name source_relative hosts reason; do
    if [[ "${kind}" != 'skill' ]] || [[ "${status}" != 'enabled' ]]; then
      continue
    fi
    source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/${source_relative}"
    printf 'bundled\t%s\t%s\n' "${skill_name}" "${source_path}" >> "${manifest_temporary}"
  done < "${INSTALL_TO_CODEX_REGISTRY}"
  printf 'global\tAGENTS.md\t%s\n' \
    "${INSTALL_TO_CODEX_PONYTAIL_ROOT}/config/AGENTS.md" >> "${manifest_temporary}"

  mv "${manifest_temporary}" "${INSTALL_TO_CODEX_MANIFEST}"
}

check_manifest() {
  local hosts
  local kind
  local name
  local reason
  local recorded_source
  local skill_name
  local source_relative
  local source_path
  local status

  if [[ "${INSTALL_TO_CODEX_CHECK}" != 'true' ]]; then
    return
  fi

  while IFS=$'\t' read -r kind status skill_name source_relative hosts reason; do
    if [[ "${kind}" != 'skill' ]] || [[ "${status}" != 'enabled' ]]; then
      continue
    fi
    source_path="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/${source_relative}"
    recorded_source="$(manifest_source_for 'bundled' "${skill_name}" || true)"
    if [[ "${recorded_source}" != "${source_path}" ]]; then
      fail "installer ownership manifest is missing current skill: ${skill_name}"
    fi
  done < "${INSTALL_TO_CODEX_REGISTRY}"

  recorded_source="$(manifest_source_for 'global' 'AGENTS.md' || true)"
  if [[ "${recorded_source}" != "${INSTALL_TO_CODEX_PONYTAIL_ROOT}/config/AGENTS.md" ]]; then
    fail 'installer ownership manifest is missing current global instructions'
  fi

  while IFS=$'\t' read -r kind name source_path; do
    if [[ "${kind}" == 'project' ]]; then
      fail "installer ownership manifest contains obsolete project skill: ${name}"
    fi
  done < "${INSTALL_TO_CODEX_MANIFEST}"
}

parse_arguments() {
  INSTALL_TO_CODEX_CHECK='false'
  INSTALL_TO_CODEX_DRY_RUN='false'
  INSTALL_TO_CODEX_CODEX_HOME=''
  while (($# > 0)); do
    case "$1" in
      --check)
        INSTALL_TO_CODEX_CHECK='true'
        ;;
      --dry-run)
        INSTALL_TO_CODEX_DRY_RUN='true'
        ;;
      --codex-home)
        shift
        (($# > 0)) || fail '--codex-home requires a path'
        INSTALL_TO_CODEX_CODEX_HOME="$1"
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        fail "unknown argument: $1"
        ;;
    esac
    shift
  done

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'true' ]] && \
    [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'true' ]]; then
    fail '--check and --dry-run are mutually exclusive'
  fi

  if [[ -z "${INSTALL_TO_CODEX_CODEX_HOME}" ]]; then
    if [[ -n "${CODEX_HOME:-}" ]]; then
      INSTALL_TO_CODEX_CODEX_HOME="${CODEX_HOME}"
    elif [[ -n "${HOME:-}" ]]; then
      INSTALL_TO_CODEX_CODEX_HOME="${HOME}/.codex"
    else
      fail 'HOME or --codex-home is required'
    fi
  fi
  [[ -n "${HOME:-}" ]] || \
    fail 'HOME is required to configure the project journal allow rule'
}

main() {
  INSTALL_TO_CODEX_PONYTAIL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  INSTALL_TO_CODEX_REGISTRY="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/registry.tsv"
  parse_arguments "$@"
  INSTALL_TO_CODEX_SKILLS_TARGET="${INSTALL_TO_CODEX_CODEX_HOME}/skills"
  INSTALL_TO_CODEX_MANIFEST="${INSTALL_TO_CODEX_CODEX_HOME}/.ponytail-install.tsv"
  INSTALL_TO_CODEX_RULES_TARGET="${INSTALL_TO_CODEX_CODEX_HOME}/rules"
  INSTALL_TO_CODEX_RULES_FILE="${INSTALL_TO_CODEX_RULES_TARGET}/default.rules"
  INSTALL_TO_CODEX_PROJECT_JOURNAL_PATH="${HOME}/.local/bin/project_journal.sh"

  if [[ ! -f "${INSTALL_TO_CODEX_REGISTRY}" ]]; then
    fail "skill registry not found: ${INSTALL_TO_CODEX_REGISTRY}"
  fi

  preflight_installation

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'false' ]] && \
    [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'false' ]]; then
    mkdir -p "${INSTALL_TO_CODEX_SKILLS_TARGET}" "${INSTALL_TO_CODEX_RULES_TARGET}"
  fi

  install_ponytail_skills
  remove_current_root_stale_links
  remove_manifest_stale_links
  install_global_agents
  install_project_journal_rule
  write_manifest
  check_manifest
  exit 0
}

main "$@"
