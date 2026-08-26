#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

main() {
  local database_name
  local project_root
  local -a connection_args

  command -v jq >/dev/null || fail 'jq is required'
  command -v psql >/dev/null || fail 'psql is required'
  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  database_name="$(jq -er '.database.name // "ponytail"' \
    "${project_root}/ponytail-journal.json")"
  connection_args=(--no-psqlrc --set=ON_ERROR_STOP=1 --dbname "${database_name}")

  psql "${connection_args[@]}" <<'SQL'
BEGIN;
CREATE ROLE ponytail_journal_test_alice;
CREATE ROLE ponytail_journal_test_bob;
CREATE ROLE ponytail_journal_test_cto;
GRANT ponytail_reporter TO ponytail_journal_test_alice, ponytail_journal_test_bob;
GRANT ponytail_analyst TO ponytail_journal_test_cto;
SET SESSION AUTHORIZATION ponytail_journal_test_alice;
SELECT ponytail_journal.register_project(
  '019c0000-0000-7000-8000-000000000099',
  'journal-contract-test'
);
SELECT ponytail_journal.register_project(
  '019c0000-0000-7000-8000-000000000099',
  'journal-contract-test'
);
DO $block$
BEGIN
  BEGIN
    PERFORM ponytail_journal.register_project(
      '019c0000-0000-7000-8000-000000000099',
      'different-project-name'
    );
    RAISE EXCEPTION 'conflicting project registration unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'conflicting project registration unexpectedly succeeded' THEN
      RAISE;
    END IF;
  END;
END;
$block$;
SELECT ponytail_journal.start_action(
  '019c0000-0000-7000-8000-000000000099',
  '019c0000-0000-7000-8000-000000000098',
  'root', '2026-08-17-test', 'S01', 'F01', 'S01-F01-T01',
  'unit_test',
  '{"schemaVersion":1,"workstation":{"name":"test"}}',
  '{}'
);
DO $block$
BEGIN
  IF (SELECT count(*) FROM ponytail_journal.action_v1
      WHERE project_id = '019c0000-0000-7000-8000-000000000099') <> 1 THEN
    RAISE EXCEPTION 'reporter cannot select its own action';
  END IF;
  BEGIN
    EXECUTE 'UPDATE ponytail_journal.action_v1 SET payload = payload';
    RAISE EXCEPTION 'reporter unexpectedly updated an action';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$block$;
RESET SESSION AUTHORIZATION;

SET SESSION AUTHORIZATION ponytail_journal_test_bob;
DO $block$
BEGIN
  IF (SELECT count(*) FROM ponytail_journal.action_v1) <> 0 THEN
    RAISE EXCEPTION 'reporter selected another reporter action';
  END IF;
END;
$block$;
RESET SESSION AUTHORIZATION;

SET SESSION AUTHORIZATION ponytail_journal_test_cto;
DO $block$
BEGIN
  IF (SELECT count(*) FROM ponytail_journal.action_v1
      WHERE project_id = '019c0000-0000-7000-8000-000000000099') <> 1 THEN
    RAISE EXCEPTION 'analyst cannot select all actions';
  END IF;
END;
$block$;
RESET SESSION AUTHORIZATION;
ROLLBACK;
SQL
  printf 'PostgreSQL journal contract tests passed.\n'
  exit 0
}

main "$@"
