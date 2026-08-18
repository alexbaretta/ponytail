#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage: setup-project-journal.sh [--config <path>]

Creates or reconciles the configured PostgreSQL 18 journal database, roles,
schema, functions, policies, and project registration. Standard PG* variables
may provide setup-time administrative connection settings and credentials.
EOF
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

json_value() {
  local expression="$1"
  local path="$2"
  jq -er "${expression}" "${path}"
}

validate_config() {
  local config_path="$1"
  jq -e '
    type == "object" and
    .schemaVersion == 1 and
    (.projectId | type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")) and
    (.projectName | type == "string" and length > 0) and
    (.database | type == "object") and
    ((.database.name // "ponytail") | type == "string" and length > 0) and
    ((.database.host // "") | type == "string") and
    ((.database.port // 5432) | type == "number" and floor == . and . > 0 and . < 65536) and
    ((.database.role // "") | type == "string")
  ' "${config_path}" >/dev/null || fail "invalid journal configuration: ${config_path}"
}

psql_connection_args() {
  local database="$1"
  local host="$2"
  local port="$3"
  local role="$4"
  connection_args=(--no-psqlrc --set=ON_ERROR_STOP=1 --dbname "${database}")
  [[ -z "${host}" ]] || connection_args+=(--host "${host}")
  [[ -z "${port}" ]] || connection_args+=(--port "${port}")
  [[ -z "${role}" ]] || connection_args+=(--username "${role}")
}

main() {
  local admin_database
  local config_path=''
  local database_name
  local host
  local port
  local project_id
  local project_name
  local project_root
  local reporter_role
  local runtime_role
  local script_root
  local -a connection_args=()

  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --config)
        shift
        [[ "$#" -gt 0 ]] || fail '--config requires a path'
        config_path="$1"
        ;;
      --help|-h)
        print_usage
        exit 0
        ;;
      *) fail "unknown option: $1" ;;
    esac
    shift
  done

  command -v jq >/dev/null || fail 'jq is required'
  command -v psql >/dev/null || fail 'PostgreSQL 18 psql is required'
  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  [[ -n "${config_path}" ]] || config_path="${project_root}/ponytail-journal.json"
  [[ -f "${config_path}" ]] || fail "journal configuration is missing: ${config_path}"
  validate_config "${config_path}"

  database_name="$(json_value '.database.name // "ponytail"' "${config_path}")"
  host="$(jq -r '.database.host // ""' "${config_path}")"
  port="$(jq -r '.database.port // empty' "${config_path}")"
  runtime_role="$(jq -r '.database.role // ""' "${config_path}")"
  [[ -n "${runtime_role}" ]] || runtime_role="$(id -un)"
  project_id="$(json_value '.projectId' "${config_path}")"
  project_name="$(json_value '.projectName' "${config_path}")"
  reporter_role='ponytail_reporter'
  admin_database="${PGDATABASE:-postgres}"

  psql_connection_args "${admin_database}" "${host}" "${port}" "${PGUSER:-}"
  psql "${connection_args[@]}" \
    --set=database_name="${database_name}" \
    --set=runtime_role="${runtime_role}" <<'SQL'
SELECT format('CREATE ROLE %I NOLOGIN', 'ponytail_journal_owner')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ponytail_journal_owner') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'ponytail_super_journalist')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ponytail_super_journalist') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'ponytail_analyst')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ponytail_analyst') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'ponytail_reporter')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ponytail_reporter') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'runtime_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_role') \gexec
SELECT format('GRANT %I TO %I', 'ponytail_reporter', :'runtime_role') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', 'ponytail_journal_owner')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'database_name') \gexec
SQL

  script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  psql_connection_args "${database_name}" "${host}" "${port}" "${PGUSER:-}"
  psql "${connection_args[@]}" --file "${script_root}/project-journal.sql"
  psql "${connection_args[@]}" \
    --set=project_id="${project_id}" \
    --set=project_name="${project_name}" <<'SQL'
SET ROLE ponytail_journal_owner;
INSERT INTO ponytail_journal.project (project_id, project_name)
VALUES (:'project_id'::uuid, :'project_name')
ON CONFLICT (project_id) DO UPDATE SET project_name = EXCLUDED.project_name;
RESET ROLE;
SQL
  printf '{"ok":true,"database":"%s","project_id":"%s"}\n' \
    "${database_name}" "${project_id}"
  exit 0
}

main "$@"
