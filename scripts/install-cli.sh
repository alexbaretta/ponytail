#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage:
  ./scripts/install-cli.sh [--check] [--dry-run] [--update-shell-path]
    [--bin-dir <path>] [tool.sh ...]

Installs all Ponytail CLI tools by default, or only the named tools.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

manifest_owns() {
  local manifest_path="$1"
  local tool_name="$2"

  [[ -f "${manifest_path}" ]] && grep -Fxq "${tool_name}" "${manifest_path}"
}

preflight_tool() {
  local manifest_path="$1"
  local source_path="$2"
  local target_path="$3"
  local tool_name="$4"

  if [[ -L "${target_path}" ]]; then
    fail "refusing to replace CLI symlink: ${target_path}"
  fi
  if [[ ! -e "${target_path}" ]]; then
    return
  fi
  [[ -f "${target_path}" ]] || \
    fail "refusing to replace non-file CLI path: ${target_path}"
  if [[ -f "${target_path}" ]] && cmp -s "${source_path}" "${target_path}"; then
    return
  fi
  manifest_owns "${manifest_path}" "${tool_name}" || \
    fail "refusing to replace unowned CLI path: ${target_path}"
}

install_tool() {
  local check="$1"
  local dry_run="$2"
  local source_path="$3"
  local target_path="$4"

  if [[ "${check}" == 'true' ]]; then
    [[ -x "${target_path}" ]] && cmp -s "${source_path}" "${target_path}" || \
      fail "installed CLI differs from source: ${target_path}"
    return
  fi

  if [[ -x "${target_path}" ]] && cmp -s "${source_path}" "${target_path}"; then
    return
  fi
  printf 'install %s -> %s\n' "${source_path}" "${target_path}"
  if [[ "${dry_run}" == 'false' ]]; then
    install -m 0755 "${source_path}" "${target_path}"
  fi
}

record_tools() {
  local manifest_path="$1"
  shift
  local temporary_manifest
  local tool_name

  temporary_manifest="$(mktemp "${manifest_path}.XXXXXX")"
  if [[ -f "${manifest_path}" ]]; then
    cp "${manifest_path}" "${temporary_manifest}"
  fi
  for tool_name in "$@"; do
    if ! grep -Fxq "${tool_name}" "${temporary_manifest}"; then
      printf '%s\n' "${tool_name}" >> "${temporary_manifest}"
    fi
  done
  mv "${temporary_manifest}" "${manifest_path}"
}

path_contains() {
  local directory="$1"
  [[ ":${PATH}:" == *":${directory}:"* ]]
}

update_bashrc() {
  local bashrc_path="$1"
  local bin_dir="$2"
  local path_line

  printf -v path_line 'export PATH=%q:"${PATH}"' "${bin_dir}"
  if [[ -f "${bashrc_path}" ]] && grep -Fxq "${path_line}" "${bashrc_path}"; then
    return
  fi
  printf '\n# Added by Ponytail CLI installer\n%s\n' "${path_line}" >> \
    "${bashrc_path}"
  printf 'updated %s\n' "${bashrc_path}"
}

offer_path_update() {
  local bashrc_path="$1"
  local bin_dir="$2"
  local update_shell_path="$3"
  local answer

  if path_contains "${bin_dir}"; then
    return
  fi
  if [[ "${update_shell_path}" == 'true' ]]; then
    update_bashrc "${bashrc_path}" "${bin_dir}"
    return
  fi

  printf 'Add %s to PATH in %s? [y/N] ' "${bin_dir}" "${bashrc_path}" >&2
  if IFS= read -r answer && [[ "${answer}" =~ ^[Yy]([Ee][Ss])?$ ]]; then
    update_bashrc "${bashrc_path}" "${bin_dir}"
  fi
}

main() {
  local bashrc_path
  local bin_dir
  local check='false'
  local cli_root
  local dry_run='false'
  local manifest_path
  local ponytail_root
  local source_path
  local target_path
  local tool_name
  local update_shell_path='false'
  local -a selected_tools=()

  bin_dir=''
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --bin-dir)
        shift
        [[ "$#" -gt 0 ]] || fail '--bin-dir requires a path'
        bin_dir="$1"
        ;;
      --check) check='true' ;;
      --dry-run) dry_run='true' ;;
      --update-shell-path) update_shell_path='true' ;;
      --help|-h)
        print_usage
        exit 0
        ;;
      --*) fail "unknown option: $1" ;;
      *) selected_tools+=("$1") ;;
    esac
    shift
  done

  [[ -n "${HOME:-}" ]] || fail 'HOME is required'
  if [[ -z "${bin_dir}" ]]; then
    bin_dir="${HOME}/.local/bin"
  fi

  ponytail_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  cli_root="${ponytail_root}/cli"
  if [[ "${#selected_tools[@]}" -eq 0 ]]; then
    for source_path in "${cli_root}"/*.sh; do
      [[ -f "${source_path}" ]] || fail 'no Ponytail CLI tools found'
      selected_tools+=("$(basename "${source_path}")")
    done
  fi

  manifest_path="${bin_dir}/.ponytail-cli-tools"
  for tool_name in "${selected_tools[@]}"; do
    [[ "${tool_name}" != */* ]] || fail "invalid tool name: ${tool_name}"
    source_path="${cli_root}/${tool_name}"
    [[ -f "${source_path}" ]] || fail "unknown Ponytail CLI tool: ${tool_name}"
    preflight_tool \
      "${manifest_path}" "${source_path}" "${bin_dir}/${tool_name}" "${tool_name}"
  done

  if [[ "${check}" == 'false' ]] && [[ "${dry_run}" == 'false' ]]; then
    mkdir -p "${bin_dir}"
  fi
  for tool_name in "${selected_tools[@]}"; do
    source_path="${cli_root}/${tool_name}"
    target_path="${bin_dir}/${tool_name}"
    install_tool "${check}" "${dry_run}" "${source_path}" "${target_path}"
  done

  if [[ "${check}" == 'false' ]] && [[ "${dry_run}" == 'false' ]]; then
    record_tools "${manifest_path}" "${selected_tools[@]}"
    bashrc_path="${HOME}/.bashrc"
    offer_path_update "${bashrc_path}" "${bin_dir}" "${update_shell_path}"
  fi
  exit 0
}

main "$@"
