#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage:
  ./scripts/install.sh

Installs Ponytail skills and global instructions into Codex, then installs all
Ponytail CLI tools into the user's default bin directory.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

main() {
  local ponytail_root

  if [[ "$#" -gt 0 ]]; then
    case "$1" in
      -h|--help)
        [[ "$#" -eq 1 ]] || fail "unknown argument: $2"
        print_usage
        exit 0
        ;;
      *) fail "unknown argument: $1" ;;
    esac
  fi

  ponytail_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  "${ponytail_root}/scripts/install-to-codex.sh"
  "${ponytail_root}/scripts/install-cli.sh"
  exit 0
}

main "$@"
