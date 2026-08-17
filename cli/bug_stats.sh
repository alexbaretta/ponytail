#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

normalize_date() {
  local input="$1"

  if [[ "${input}" =~ ^[0-9]{8}$ ]]; then
    input="${input:0:4}-${input:4:2}-${input:6:2}"
  fi
  if [[ "${input}" != '0000-00-00' ]]; then
    [[ "${input}" =~ ^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$ ]] || \
      fail "invalid date: ${input}"
  fi
  printf '%s\n' "${input}"
}

count_bugs() {
  local bug_date
  local bug_file
  local count=0
  local directory="$1"
  local since="$2"

  if [[ ! -d "${directory}" ]]; then
    printf '0\n'
    return
  fi

  while IFS= read -r bug_file; do
    bug_date="$(basename "${bug_file}")"
    bug_date="${bug_date:0:10}"
    if [[ "${bug_date}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && \
      [[ "${bug_date}" > "${since}" || "${bug_date}" == "${since}" ]]; then
      count=$((count + 1))
    fi
  done < <(find "${directory}" -maxdepth 1 -type f -name '*.md' -print)

  printf '%s\n' "${count}"
}

main() {
  local project_root
  local since
  local state

  [[ "$#" -le 1 ]] || fail 'usage: bug_stats.sh [YYYY-MM-DD|YYYYMMDD]'
  since="$(normalize_date "${1:-0000-00-00}")"
  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  cd "${project_root}"

  for state in open in_progress closed; do
    printf '%s: %s\n' \
      "${state}" \
      "$(count_bugs "pm/bugs/${state}" "${since}")"
  done
  exit 0
}

main "$@"
