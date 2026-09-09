#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage: plan_pdf.sh [--sprints] <plan-name> [output.pdf]

Renders pm/plans/<plan-name>/plan.md as PDF with Pandoc. With --sprints,
appends the plan's SNN.md sprint files in filename order. The default output is
tmp/<plan-name>.pdf.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

main() {
  local include_sprints='false'
  local output_path
  local plan_name
  local plan_path
  local project_root
  local sprint_path
  local -a markdown_paths

  if [[ "${1:-}" == '--sprints' ]]; then
    include_sprints='true'
    shift
  fi
  if [[ "${1:-}" == '--help' ]] || [[ "${1:-}" == '-h' ]]; then
    print_usage
    exit 0
  fi
  [[ "$#" -ge 1 ]] && [[ "$#" -le 2 ]] || \
    fail 'usage: plan_pdf.sh [--sprints] <plan-name> [output.pdf]'

  plan_name="$1"
  [[ "${plan_name}" != */* ]] || fail 'plan name must be a directory basename'
  output_path="${2:-tmp/${plan_name}.pdf}"
  [[ "${output_path}" == *.pdf ]] || fail 'output path must end in .pdf'
  command -v pandoc >/dev/null 2>&1 || fail 'pandoc is required to render PDFs'

  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  cd "${project_root}"
  plan_path="pm/plans/${plan_name}"
  [[ -f "${plan_path}/plan.md" ]] || \
    fail "plan manifest not found: ${plan_path}/plan.md"

  markdown_paths=("${plan_path}/plan.md")
  if [[ "${include_sprints}" == 'true' ]]; then
    [[ -d "${plan_path}/sprints" ]] || \
      fail "sprint directory not found: ${plan_path}/sprints"
    for sprint_path in "${plan_path}"/sprints/S[0-9][0-9]*.md; do
      [[ -f "${sprint_path}" ]] || continue
      markdown_paths+=("${sprint_path}")
    done
  fi

  mkdir -p "$(dirname "${output_path}")"
  pandoc --standalone "${markdown_paths[@]}" --output "${output_path}"
  printf '%s\n' "${output_path}"
  exit 0
}

main "$@"
