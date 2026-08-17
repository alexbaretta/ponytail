#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage: audit_pm.sh [--fix]

Audits the current Git project's mandated pm/ directory structure. With
--fix, date-prefixes tracked plan directories and bug files from Git history.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 2
}

report() {
  local path="$1"
  local message="$2"

  printf 'ERROR %s: %s\n' "${path}" "${message}"
  issues=$((issues + 1))
}

valid_date_prefix() {
  local name="$1"
  [[ "${name}" =~ ^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-.+ ]]
}

date_like_prefix() {
  local name="$1"
  [[ "${name}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+ ]]
}

oldest_history_date() {
  local path="$1"
  local follow="$2"
  local dates

  if [[ "${follow}" == 'true' ]]; then
    dates="$(git log --follow --format='%ad' --date=format:%Y-%m-%d -- "${path}")"
  else
    dates="$(git log --format='%ad' --date=format:%Y-%m-%d -- "${path}")"
  fi
  if [[ -n "${dates}" ]]; then
    printf '%s\n' "${dates}" | tail -n 1
  fi
}

fix_missing_prefix() {
  local path="$1"
  local follow="$2"
  local creation_date
  local name
  local parent
  local target

  renamed_path="${path}"
  creation_date="$(oldest_history_date "${path}" "${follow}")"
  if [[ -z "${creation_date}" ]]; then
    report "${path}" 'missing date prefix; Git creation date unavailable'
    return
  fi

  name="$(basename "${path}")"
  parent="$(dirname "${path}")"
  target="${parent}/${creation_date}-${name}"
  if [[ -e "${target}" ]] || [[ -L "${target}" ]]; then
    report "${path}" "missing date prefix; destination exists: ${target}"
    return
  fi
  if ! git mv -- "${path}" "${target}"; then
    report "${path}" 'missing date prefix; git mv failed'
    return
  fi

  renamed_path="${target}"
  printf 'FIXED %s -> %s\n' "${path}" "${target}"
}

audit_sprints() {
  local entry
  local name
  local sprints_path="$1"

  while IFS= read -r -d '' entry; do
    name="$(basename "${entry}")"
    if [[ ! -f "${entry}" ]] || [[ -L "${entry}" ]] || \
      [[ ! "${name}" =~ ^S[0-9]{2,}\.md$ ]]; then
      report "${entry}" 'expected a sprint file named SNN.md'
    fi
  done < <(find "${sprints_path}" -mindepth 1 -maxdepth 1 -print0)
}

audit_plan() {
  local entry
  local fix="$1"
  local name
  local plan_path="$2"

  name="$(basename "${plan_path}")"
  if ! valid_date_prefix "${name}"; then
    if date_like_prefix "${name}"; then
      report "${plan_path}" 'plan directory has an invalid date prefix'
    elif [[ "${fix}" == 'true' ]]; then
      fix_missing_prefix "${plan_path}" 'false'
      plan_path="${renamed_path}"
    else
      report "${plan_path}" 'plan directory is missing a YYYY-MM-DD- prefix'
    fi
  fi

  [[ -f "${plan_path}/plan.md" ]] && [[ ! -L "${plan_path}/plan.md" ]] || \
    report "${plan_path}/plan.md" 'required plan manifest is missing'
  if [[ -d "${plan_path}/sprints" ]] && [[ ! -L "${plan_path}/sprints" ]]; then
    audit_sprints "${plan_path}/sprints"
  else
    report "${plan_path}/sprints" 'required sprint directory is missing'
  fi

  while IFS= read -r -d '' entry; do
    name="$(basename "${entry}")"
    if [[ "${name}" != 'plan.md' ]] && [[ "${name}" != 'sprints' ]]; then
      report "${entry}" 'unexpected entry in plan directory'
    fi
  done < <(find "${plan_path}" -mindepth 1 -maxdepth 1 -print0)
}

audit_plans() {
  local entry
  local fix="$1"
  local plans_path='pm/plans'

  if [[ ! -d "${plans_path}" ]] || [[ -L "${plans_path}" ]]; then
    report "${plans_path}" 'required plans directory is missing'
    return
  fi

  while IFS= read -r -d '' entry; do
    if [[ -d "${entry}" ]] && [[ ! -L "${entry}" ]]; then
      audit_plan "${fix}" "${entry}"
    else
      report "${entry}" 'expected a dated plan directory'
    fi
  done < <(find "${plans_path}" -mindepth 1 -maxdepth 1 -print0)
}

audit_bug_file() {
  local bug_path="$1"
  local fix="$2"
  local name

  name="$(basename "${bug_path}")"
  if [[ ! -f "${bug_path}" ]] || [[ -L "${bug_path}" ]] || \
    [[ "${name}" != *.md ]]; then
    report "${bug_path}" 'expected a Markdown bug report file'
    return
  fi
  if valid_date_prefix "${name}"; then
    return
  fi
  if date_like_prefix "${name}"; then
    report "${bug_path}" 'bug filename has an invalid date prefix'
  elif [[ "${fix}" == 'true' ]]; then
    fix_missing_prefix "${bug_path}" 'true'
  else
    report "${bug_path}" 'bug filename is missing a YYYY-MM-DD- prefix'
  fi
}

audit_bug_duplicates() {
  local bug_path
  local candidate
  local count
  local name
  local state

  while IFS= read -r -d '' bug_path; do
    [[ -f "${bug_path}" ]] || continue
    name="$(basename "${bug_path}")"
    count=0
    for state in open in_progress closed; do
      candidate="pm/bugs/${state}/${name}"
      if [[ -f "${candidate}" ]]; then
        count=$((count + 1))
      fi
    done
    if [[ "${count}" -gt 1 ]] && [[ "${bug_path}" == "pm/bugs/open/${name}" ]]; then
      report "${name}" 'same bug file exists in multiple lifecycle directories'
    elif [[ "${count}" -gt 1 ]] && [[ ! -f "pm/bugs/open/${name}" ]] && \
      [[ "${bug_path}" == "pm/bugs/in_progress/${name}" ]]; then
      report "${name}" 'same bug file exists in multiple lifecycle directories'
    fi
  done < <(find pm/bugs/open pm/bugs/in_progress pm/bugs/closed \
    -maxdepth 1 -type f -print0 2>/dev/null)
}

audit_bugs() {
  local entry
  local fix="$1"
  local name
  local state

  if [[ ! -e 'pm/bugs' ]]; then
    return
  fi
  if [[ ! -d 'pm/bugs' ]] || [[ -L 'pm/bugs' ]]; then
    report 'pm/bugs' 'expected a bug lifecycle directory'
    return
  fi

  while IFS= read -r -d '' entry; do
    name="$(basename "${entry}")"
    if [[ ! -d "${entry}" ]] || [[ -L "${entry}" ]] || \
      { [[ "${name}" != 'open' ]] && [[ "${name}" != 'in_progress' ]] && \
        [[ "${name}" != 'closed' ]]; }; then
      report "${entry}" 'unexpected entry under pm/bugs'
    fi
  done < <(find pm/bugs -mindepth 1 -maxdepth 1 -print0)

  for state in open in_progress closed; do
    [[ -d "pm/bugs/${state}" ]] && [[ ! -L "pm/bugs/${state}" ]] || continue
    while IFS= read -r -d '' entry; do
      audit_bug_file "${entry}" "${fix}"
    done < <(find "pm/bugs/${state}" -mindepth 1 -maxdepth 1 -print0)
  done
  audit_bug_duplicates
}

audit_pm_root() {
  local entry
  local name

  while IFS= read -r -d '' entry; do
    name="$(basename "${entry}")"
    if [[ "${name}" != 'plans' ]] && [[ "${name}" != 'bugs' ]]; then
      report "${entry}" 'unexpected entry under pm/'
    fi
  done < <(find pm -mindepth 1 -maxdepth 1 -print0)
}

main() {
  local fix='false'
  local issues=0
  local project_root
  local renamed_path

  if [[ "$#" -gt 1 ]]; then
    fail 'usage: audit_pm.sh [--fix]'
  fi
  if [[ "$#" -eq 1 ]]; then
    case "$1" in
      --fix) fix='true' ;;
      --help|-h)
        print_usage
        exit 0
        ;;
      *) fail "unknown option: $1" ;;
    esac
  fi

  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  cd "${project_root}"
  [[ -d pm ]] && [[ ! -L pm ]] || fail 'pm directory is missing'

  audit_pm_root
  audit_plans "${fix}"
  audit_bugs "${fix}"

  if [[ "${issues}" -gt 0 ]]; then
    printf 'PM audit found %s deviation(s).\n' "${issues}"
    exit 1
  fi
  printf 'PM structure is compliant.\n'
  exit 0
}

main "$@"
