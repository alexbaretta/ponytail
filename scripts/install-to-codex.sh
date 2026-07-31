#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage:
  ./scripts/install-to-codex.sh [--check] [--dry-run]
    [--codex-home <path>] [--project-skills <directory>]...

Installs enabled bundled skills and the global AGENTS.md into CODEX_HOME.
Project-local skill directories may be supplied explicitly and repeatedly.
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

for_each_project_skill() {
  local callback="$1"
  local project_skills_directory
  local skill_name
  local source_path

  for project_skills_directory in "${INSTALL_TO_CODEX_PROJECT_SKILLS[@]}"; do
    if [[ ! -d "${project_skills_directory}" ]]; then
      fail "project skills directory not found: ${project_skills_directory}"
    fi

    for source_path in "${project_skills_directory}"/*; do
      if [[ ! -d "${source_path}" ]] || [[ ! -f "${source_path}/SKILL.md" ]]; then
        continue
      fi

      skill_name="$(basename "${source_path}")"
      "${callback}" "${skill_name}" "${source_path}"
    done
  done
}

assert_project_skill_name_available() {
  local skill_name="$1"
  local source_path="$2"
  local other_directory
  local other_source
  local status

  status="$(registry_status_for_skill "${skill_name}" || true)"
  if [[ "${status}" == 'enabled' ]]; then
    fail "project skill collides with enabled bundled skill: ${skill_name}"
  fi

  for other_directory in "${INSTALL_TO_CODEX_PROJECT_SKILLS[@]}"; do
    other_source="${other_directory}/${skill_name}"
    if [[ -d "${other_source}" ]] && [[ "${other_source}" != "${source_path}" ]]; then
      fail "project skill name has multiple owners: ${skill_name}"
    fi
  done
}

preflight_project_skill() {
  local skill_name="$1"
  local source_path="$2"
  local status

  status="$(registry_status_for_skill "${skill_name}" || true)"
  if [[ "${status}" != 'enabled' ]] && \
    installed_skill_is_installer_owned \
      'bundled' \
      "${skill_name}" \
      "${INSTALL_TO_CODEX_SKILLS_TARGET}/${skill_name}"; then
    return
  fi

  preflight_skill \
    'project' \
    "${skill_name}" \
    "${INSTALL_TO_CODEX_SKILLS_TARGET}/${skill_name}" \
    "${source_path}"
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

  for_each_project_skill assert_project_skill_name_available
  for_each_project_skill preflight_project_skill
  preflight_global_agents
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

install_project_skill() {
  local skill_name="$1"
  local source_path="$2"

  install_skill_copy "${INSTALL_TO_CODEX_SKILLS_TARGET}/${skill_name}" "${source_path}"
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
      if project_source_is_managed_now "${source_path}" && \
        [[ ! -f "${source_path}/SKILL.md" ]]; then
        link_path="${INSTALL_TO_CODEX_SKILLS_TARGET}/${name}"
        if { [[ -L "${link_path}" ]] && \
          [[ "$(readlink "${link_path}")" == "${source_path}" ]]; } || \
          { [[ -d "${link_path}" ]] && [[ ! -L "${link_path}" ]]; }; then
          remove_installed_skill "${link_path}"
        fi
      fi
      continue
    fi

    if [[ "${kind}" != 'bundled' ]]; then
      continue
    fi

    status="$(registry_status_for_skill "${name}" || true)"
    if [[ "${status}" == 'enabled' ]] || project_skill_name_is_active "${name}"; then
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

project_source_is_managed_now() {
  local source_path="$1"
  local project_skills_directory

  for project_skills_directory in "${INSTALL_TO_CODEX_PROJECT_SKILLS[@]}"; do
    if [[ "${source_path}" == "${project_skills_directory}/"* ]]; then
      return
    fi
  done

  return 1
}

project_skill_name_is_active() {
  local skill_name="$1"
  local project_skills_directory

  for project_skills_directory in "${INSTALL_TO_CODEX_PROJECT_SKILLS[@]}"; do
    if [[ -f "${project_skills_directory}/${skill_name}/SKILL.md" ]]; then
      return
    fi
  done

  return 1
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

  INSTALL_TO_CODEX_MANIFEST_TEMPORARY="${manifest_temporary}"
  for_each_project_skill append_project_manifest_entry
  preserve_unmanaged_project_manifest_entries
  mv "${manifest_temporary}" "${INSTALL_TO_CODEX_MANIFEST}"
}

append_project_manifest_entry() {
  local skill_name="$1"
  local source_path="$2"

  printf 'project\t%s\t%s\n' "${skill_name}" "${source_path}" >> \
    "${INSTALL_TO_CODEX_MANIFEST_TEMPORARY}"
}

preserve_unmanaged_project_manifest_entries() {
  local kind
  local name
  local source_path

  if [[ ! -f "${INSTALL_TO_CODEX_MANIFEST}" ]]; then
    return
  fi

  while IFS=$'\t' read -r kind name source_path; do
    if [[ "${kind}" == 'project' ]] && \
      ! project_source_is_managed_now "${source_path}" && \
      ! project_skill_name_is_active "${name}"; then
      printf 'project\t%s\t%s\n' "${name}" "${source_path}" >> \
        "${INSTALL_TO_CODEX_MANIFEST_TEMPORARY}"
    fi
  done < "${INSTALL_TO_CODEX_MANIFEST}"
}

check_manifest() {
  local hosts
  local kind
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

  for_each_project_skill check_project_manifest_entry
  check_for_stale_managed_project_manifest_entries
}

check_project_manifest_entry() {
  local skill_name="$1"
  local source_path="$2"
  local recorded_source

  recorded_source="$(manifest_source_for 'project' "${skill_name}" || true)"
  if [[ "${recorded_source}" != "${source_path}" ]]; then
    fail "installer ownership manifest is missing current project skill: ${skill_name}"
  fi
}

check_for_stale_managed_project_manifest_entries() {
  local kind
  local name
  local source_path

  if [[ ! -f "${INSTALL_TO_CODEX_MANIFEST}" ]]; then
    return
  fi

  while IFS=$'\t' read -r kind name source_path; do
    if [[ "${kind}" == 'project' ]] && \
      project_source_is_managed_now "${source_path}" && \
      [[ ! -f "${source_path}/SKILL.md" ]]; then
      fail "installer ownership manifest contains stale project skill: ${name}"
    fi
  done < "${INSTALL_TO_CODEX_MANIFEST}"
}

parse_arguments() {
  INSTALL_TO_CODEX_CHECK='false'
  INSTALL_TO_CODEX_DRY_RUN='false'
  INSTALL_TO_CODEX_CODEX_HOME=''
  INSTALL_TO_CODEX_PROJECT_SKILLS=()

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
      --project-skills)
        shift
        (($# > 0)) || fail '--project-skills requires a directory'
        INSTALL_TO_CODEX_PROJECT_SKILLS+=("$1")
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
}

main() {
  INSTALL_TO_CODEX_PONYTAIL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  INSTALL_TO_CODEX_REGISTRY="${INSTALL_TO_CODEX_PONYTAIL_ROOT}/registry.tsv"
  parse_arguments "$@"
  INSTALL_TO_CODEX_SKILLS_TARGET="${INSTALL_TO_CODEX_CODEX_HOME}/skills"
  INSTALL_TO_CODEX_MANIFEST="${INSTALL_TO_CODEX_CODEX_HOME}/.ponytail-install.tsv"

  if [[ ! -f "${INSTALL_TO_CODEX_REGISTRY}" ]]; then
    fail "skill registry not found: ${INSTALL_TO_CODEX_REGISTRY}"
  fi

  preflight_installation

  if [[ "${INSTALL_TO_CODEX_CHECK}" == 'false' ]] && \
    [[ "${INSTALL_TO_CODEX_DRY_RUN}" == 'false' ]]; then
    mkdir -p "${INSTALL_TO_CODEX_SKILLS_TARGET}"
  fi

  install_ponytail_skills
  for_each_project_skill install_project_skill
  remove_current_root_stale_links
  remove_manifest_stale_links
  install_global_agents
  write_manifest
  check_manifest
  exit 0
}

main "$@"
