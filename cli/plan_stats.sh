#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

count_task_lines() {
  local match_output
  local pattern="$1"
  local plan_path="$2"
  local status

  status=0
  match_output="$(git grep -F -e "${pattern}" -- "${plan_path}" 2>/dev/null)" || \
    status=$?
  if [[ "${status}" -ne 0 ]] && [[ "${status}" -ne 1 ]]; then
    fail "could not search plan: ${plan_path}"
  fi

  if [[ -z "${match_output}" ]]; then
    printf '0\n'
  else
    printf '%s\n' "${match_output}" | wc -l | tr -d ' '
  fi
}

main() {
  local plan_name
  local plan_path
  local project_root

  [[ "$#" -eq 1 ]] || fail 'usage: plan_stats.sh <plan-name>'
  plan_name="$1"
  [[ "${plan_name}" != */* ]] || fail 'plan name must be a directory basename'

  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  cd "${project_root}"

  plan_path="pm/plans/${plan_name}"
  [[ -d "${plan_path}" ]] || fail "plan directory not found: ${plan_path}"

  printf 'open: %s\n' "$(count_task_lines ' [ ]' "${plan_path}")"
  printf 'done: %s\n' "$(count_task_lines ' [DONE]' "${plan_path}")"
  exit 0
}

main "$@"
