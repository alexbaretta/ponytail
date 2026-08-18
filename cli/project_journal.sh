#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.

print_usage() {
  cat <<'EOF'
Usage:
  project_journal.sh start [context options] --action-type <type> --description <text>
  project_journal.sh run_command [context options] --action-type <type>
    --description <text> -- '<quoted bash command>'
  project_journal.sh over --plan <plan> --agent-id <canonical-agent-id>

Context options:
  --agent-id <id>             Required canonical agent path.
  --parent-agent-id <id>      Immediate orchestrator; omit for the top-level agent.
  --agent-model <model>       Required when no prior local context exists.
  --plan <plan>               Required dated plan name.
  --sprint <id>               Required when no prior local context exists.
  --feature <id>              Required when no prior local context exists.
  --tasklet <id>              Required when no prior local context exists.
  --prompt-id <uuid>          Reuse one prompt across multiple plans.
EOF
}

emit_error() {
  jq -cn --arg operation "$1" --arg error "$2" \
    '{ok:false, operation:$operation, error:$error}' >&2
}

fail() {
  emit_error "${operation:-project_journal}" "$1"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null || fail "$1 is required"
}

normalize_agent_id() {
  local value="$1"
  value="${value#/}"
  [[ -n "${value}" ]] || fail 'agent ID is required'
  printf '%s\n' "${value}"
}

validate_identifier() {
  local label="$1"
  local value="$2"
  [[ -n "${value}" ]] || fail "${label} is required"
  [[ "${value}" != *$'\n'* ]] || fail "invalid ${label}"
}

discover_project() {
  project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || \
    fail 'not inside a Git worktree'
  config_path="${project_root}/ponytail-journal.json"
  [[ -f "${config_path}" ]] || fail "journal configuration is missing: ${config_path}"
}

load_config() {
  jq -e '
    type == "object" and .schemaVersion == 1 and
    (.projectId | type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")) and
    (.projectName | type == "string" and length > 0) and
    (.database | type == "object")
  ' "${config_path}" >/dev/null || fail "invalid journal configuration: ${config_path}"
  project_id="$(jq -er '.projectId' "${config_path}")"
  database_name="$(jq -er '.database.name // "ponytail"' "${config_path}")"
  database_host="$(jq -r '.database.host // ""' "${config_path}")"
  database_port="$(jq -r '.database.port // empty' "${config_path}")"
  database_role="$(jq -r '.database.role // ""' "${config_path}")"
  [[ -n "${database_role}" ]] || database_role="$(id -un)"
  password_environment="$(jq -r '.database.passwordEnvironment // ""' "${config_path}")"
  if [[ -n "${password_environment}" ]]; then
    [[ "${password_environment}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || \
      fail 'invalid passwordEnvironment'
    [[ -n "${!password_environment:-}" ]] || \
      fail "password environment variable is missing: ${password_environment}"
    export PGPASSWORD="${!password_environment}"
  fi
}

set_connection_args() {
  connection_args=(
    --no-psqlrc
    --quiet
    --tuples-only
    --no-align
    --set=ON_ERROR_STOP=1
    --dbname "${database_name}"
    --username "${database_role}"
  )
  [[ -z "${database_host}" ]] || connection_args+=(--host "${database_host}")
  [[ -z "${database_port}" ]] || connection_args+=(--port "${database_port}")
}

database_start_action() {
  local payload="$1"
  local previous_patch="$2"
  local requested_prompt="$3"
  psql "${connection_args[@]}" \
    --set=project_id="${project_id}" \
    --set=prompt_id="${requested_prompt}" \
    --set=agent_id="${agent_id}" \
    --set=plan_name="${plan_name}" \
    --set=sprint_id="${sprint_id}" \
    --set=feature_id="${feature_id}" \
    --set=tasklet_id="${tasklet_id}" \
    --set=action_type="${action_type}" \
    --set=payload="${payload}" \
    --set=previous_patch="${previous_patch}" <<'SQL'
SELECT ponytail_journal.start_action(
  :'project_id'::uuid,
  nullif(:'prompt_id', '')::uuid,
  :'agent_id',
  :'plan_name',
  :'sprint_id',
  :'feature_id',
  :'tasklet_id',
  :'action_type',
  :'payload'::jsonb,
  :'previous_patch'::jsonb
);
SQL
}

database_finish_action() {
  local action="$1"
  local end_timestamp="$2"
  local payload_patch="$3"
  psql "${connection_args[@]}" \
    --set=action_id="${action}" \
    --set=end_timestamp="${end_timestamp}" \
    --set=payload_patch="${payload_patch}" <<'SQL'
SELECT ponytail_journal.finish_action(
  :'action_id'::uuid,
  coalesce(nullif(:'end_timestamp', '')::timestamptz, now()),
  :'payload_patch'::jsonb
);
SQL
}

database_heartbeat() {
  local action="$1"
  psql "${connection_args[@]}" --set=action_id="${action}" <<'SQL'
SELECT ponytail_journal.heartbeat_action(:'action_id'::uuid);
SQL
}

acquire_lock() {
  local attempts=0
  mkdir -p "${plan_state}"
  while ! mkdir "${plan_state}/lock" 2>/dev/null; do
    attempts=$((attempts + 1))
    [[ "${attempts}" -lt 200 ]] || fail 'timed out waiting for journal state lock'
    sleep 0.05
  done
  lock_held='true'
}

release_lock() {
  if [[ "${lock_held:-false}" == 'true' ]]; then
    rmdir "${plan_state}/lock" 2>/dev/null || true
    lock_held='false'
  fi
}

set_lock_trap() {
  local quoted_lock
  printf -v quoted_lock '%q' "${plan_state}/lock"
  trap "rmdir -- ${quoted_lock} 2>/dev/null || true" EXIT
}

atomic_write() {
  local destination="$1"
  local contents="$2"
  local temporary="${destination}.tmp.$$"
  printf '%s\n' "${contents}" > "${temporary}"
  mv "${temporary}" "${destination}"
}

file_epoch() {
  local path="$1"
  if stat -f '%m' "${path}" >/dev/null 2>&1; then
    stat -f '%m' "${path}"
  else
    stat -c '%Y' "${path}"
  fi
}

epoch_timestamp() {
  local epoch="$1"
  if date -u -r "${epoch}" '+%Y-%m-%dT%H:%M:%S%z' >/dev/null 2>&1; then
    date -u -r "${epoch}" '+%Y-%m-%dT%H:%M:%S%z'
  else
    date -u -d "@${epoch}" '+%Y-%m-%dT%H:%M:%S%z'
  fi
}

heartbeat_is_alive() {
  local action="$1"
  local pid="$2"
  local process_command
  [[ "${pid}" =~ ^[1-9][0-9]*$ ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  process_command="$(ps -p "${pid}" -o command= 2>/dev/null)" || return 1
  [[ "${process_command}" == *'project_journal.sh'* ]] && \
    [[ "${process_command}" == *"${plan_name}"* ]]
}

stop_heartbeat() {
  local action="$1"
  local pid="$2"
  local attempts=0
  if ! heartbeat_is_alive "${action}" "${pid}"; then
    return
  fi
  kill -TERM "${pid}"
  while kill -0 "${pid}" 2>/dev/null; do
    attempts=$((attempts + 1))
    [[ "${attempts}" -lt 100 ]] || fail 'heartbeat process did not stop'
    sleep 0.05
  done
}

git_payload() {
  local branch
  local changed_paths
  local commit_id
  local developer_email
  local developer_name
  local diff_hash
  local diff_stat
  local dirty='false'
  local worktree
  branch="$(git branch --show-current)"
  commit_id="$(git rev-parse HEAD)"
  developer_name="$(git config user.name || true)"
  developer_email="$(git config user.email || true)"
  worktree="$(git rev-parse --show-toplevel)"
  changed_paths="$(git status --porcelain=v1 | sed 's/^...//' | jq -Rsc 'split("\n") | map(select(length > 0))')"
  if [[ "${changed_paths}" != '[]' ]]; then
    dirty='true'
  fi
  diff_hash="$(git diff --no-ext-diff --binary | shasum -a 256 | awk '{print $1}')"
  diff_stat="$(git diff --stat --no-ext-diff)"
  jq -cn \
    --arg agent_model "${agent_model}" \
    --arg parent_agent_id "${parent_agent_id}" \
    --arg developer_name "${developer_name}" \
    --arg developer_email "${developer_email}" \
    --arg workstation "$(hostname)" \
    --arg worktree "${worktree}" \
    --arg branch "${branch}" \
    --arg commit_id "${commit_id}" \
    --argjson dirty "${dirty}" \
    --arg diff_hash "${diff_hash}" \
    --arg diff_stat "${diff_stat}" \
    --argjson changed_paths "${changed_paths}" \
    --arg description "${description}" \
    --arg command "${command_text}" \
    '{
      schemaVersion: 1,
      agent: {model: $agent_model, parentId: (if $parent_agent_id == "" then null else $parent_agent_id end)},
      developer: {name: $developer_name, email: $developer_email},
      workstation: {name: $workstation},
      git: {
        worktree: $worktree,
        branch: $branch,
        commitId: $commit_id,
        dirty: $dirty,
        diffHash: $diff_hash,
        diffStat: $diff_stat,
        changedPaths: $changed_paths
      },
      action: {description: $description},
      command: (if $command == "" then null else {text: $command} end)
    }'
}

load_existing_context() {
  if [[ ! -f "${action_state}" ]]; then
    return
  fi
  [[ -n "${sprint_id}" ]] || sprint_id="$(jq -er '.sprint_id' "${action_state}")"
  [[ -n "${feature_id}" ]] || feature_id="$(jq -er '.feature_id' "${action_state}")"
  [[ -n "${tasklet_id}" ]] || tasklet_id="$(jq -er '.tasklet_id' "${action_state}")"
  [[ -n "${agent_model}" ]] || agent_model="$(jq -er '.agent_model' "${action_state}")"
  [[ -n "${parent_agent_id}" ]] || parent_agent_id="$(jq -r '.parent_agent_id // ""' "${action_state}")"
}

recover_dead_action() {
  local old_action
  local old_pid
  local recovery_payload
  local recovered_at
  [[ -f "${action_state}" ]] || return 0
  old_action="$(jq -er '.action_id' "${action_state}")"
  old_pid="$(jq -er '.heartbeat_pid' "${action_state}")"
  if heartbeat_is_alive "${old_action}" "${old_pid}"; then
    return 0
  fi
  [[ -f "${heartbeat_file}" ]] || return 0
  recovered_at="$(epoch_timestamp "$(file_epoch "${heartbeat_file}")")"
  recovery_payload='{"action":{"terminationReason":"HEARTBEAT_LOST","timestampSource":"LOCAL_HEARTBEAT"}}'
  database_finish_action "${old_action}" "${recovered_at}" "${recovery_payload}" >/dev/null
  rm -f "${action_state}" "${heartbeat_file}"
}

ensure_prompt() {
  local existing_prompt=''
  if [[ -f "${prompt_state}" ]]; then
    existing_prompt="$(jq -er '.prompt_id' "${prompt_state}")"
  fi
  if [[ -n "${prompt_id}" ]] && [[ -n "${existing_prompt}" ]] && \
    [[ "${prompt_id}" != "${existing_prompt}" ]]; then
    fail 'another prompt is active for this plan'
  fi
  [[ -n "${prompt_id}" ]] || prompt_id="${existing_prompt}"
}

record_action_state() {
  local response="$1"
  local owner_pid="$2"
  local action_id
  local state
  action_id="$(jq -er '.action_id' <<<"${response}")"
  mkdir -p "${agent_state}"
  : > "${heartbeat_file}"
  heartbeat_pid="${owner_pid}"
  state="$(jq -cn \
    --arg action_id "${action_id}" \
    --arg prompt_id "$(jq -er '.prompt_id' <<<"${response}")" \
    --arg agent_id "${agent_id}" \
    --arg parent_agent_id "${parent_agent_id}" \
    --arg agent_model "${agent_model}" \
    --arg sprint_id "${sprint_id}" \
    --arg feature_id "${feature_id}" \
    --arg tasklet_id "${tasklet_id}" \
    --argjson heartbeat_pid "${heartbeat_pid}" \
    '{action_id:$action_id,prompt_id:$prompt_id,agent_id:$agent_id,
      parent_agent_id:(if $parent_agent_id == "" then null else $parent_agent_id end),
      agent_model:$agent_model,sprint_id:$sprint_id,feature_id:$feature_id,
      tasklet_id:$tasklet_id,heartbeat_pid:$heartbeat_pid}')"
  atomic_write "${action_state}" "${state}"
  if [[ ! -f "${prompt_state}" ]]; then
    atomic_write "${prompt_state}" "$(jq -cn --arg prompt_id "$(jq -er '.prompt_id' <<<"${response}")" '{prompt_id:$prompt_id}')"
  fi
}

start_action_operation() {
  local old_action=''
  local old_pid=''
  local payload
  local response
  local result_patch="$1"
  ensure_prompt
  recover_dead_action
  if [[ -f "${action_state}" ]]; then
    old_action="$(jq -er '.action_id' "${action_state}")"
    old_pid="$(jq -er '.heartbeat_pid' "${action_state}")"
  fi
  payload="$(git_payload)"
  response="$(database_start_action "${payload}" "${result_patch}" "${prompt_id}")" || \
    fail 'database action transition failed'
  if [[ -n "${old_action}" ]] && [[ "${old_pid}" != "$$" ]]; then
    stop_heartbeat "${old_action}" "${old_pid}"
  fi
  prompt_id="$(jq -er '.prompt_id' <<<"${response}")"
  record_action_state "${response}" "$$"
  last_response="${response}"
}

parse_context_options() {
  command_text=''
  description=''
  action_type=''
  agent_id=''
  parent_agent_id=''
  agent_model=''
  plan_name=''
  sprint_id=''
  feature_id=''
  tasklet_id=''
  prompt_id=''
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --agent-id|--parent-agent-id|--agent-model|--plan|--sprint|--feature|--tasklet|--prompt-id|--action-type|--description)
        local option="$1"
        shift
        [[ "$#" -gt 0 ]] || fail "${option} requires a value"
        case "${option}" in
          --agent-id) agent_id="$1" ;;
          --parent-agent-id) parent_agent_id="$1" ;;
          --agent-model) agent_model="$1" ;;
          --plan) plan_name="$1" ;;
          --sprint) sprint_id="$1" ;;
          --feature) feature_id="$1" ;;
          --tasklet) tasklet_id="$1" ;;
          --prompt-id) prompt_id="$1" ;;
          --action-type) action_type="$1" ;;
          --description) description="$1" ;;
        esac
        ;;
      --)
        shift
        [[ "$#" -eq 1 ]] || fail 'run_command requires one quoted command after --'
        command_text="$1"
        return 0
        ;;
      *) fail "unknown option: $1" ;;
    esac
    shift
  done
}

prepare_action_context() {
  validate_identifier 'plan' "${plan_name}"
  agent_id="$(normalize_agent_id "${agent_id}")"
  parent_agent_id="${parent_agent_id#/}"
  plan_state="${project_root}/tmp/project-journal/${plan_name}"
  agent_state="${plan_state}/agents/${agent_id}"
  action_state="${agent_state}/current-action"
  heartbeat_file="${agent_state}/heartbeat"
  prompt_state="${plan_state}/prompt"
  acquire_lock
  load_existing_context
  validate_identifier 'agent model' "${agent_model}"
  validate_identifier 'sprint' "${sprint_id}"
  validate_identifier 'feature' "${feature_id}"
  validate_identifier 'tasklet' "${tasklet_id}"
}

run_command_operation() {
  local action_id
  local command_pid
  local command_status
  local iteration=0
  local result_patch
  local start_response
  start_action_operation '{}'
  start_response="${last_response}"
  action_id="$(jq -er '.action_id' "${action_state}")"
  printf '%s\n' "${start_response}"
  release_lock
  bash -c "${command_text}" &
  command_pid="$!"
  while kill -0 "${command_pid}" 2>/dev/null; do
    touch "${heartbeat_file}"
    iteration=$((iteration + 1))
    if [[ $((iteration % 10)) -eq 0 ]]; then
      database_heartbeat "${action_id}" >/dev/null || true
    fi
    sleep 1
  done
  if wait "${command_pid}"; then
    command_status=0
  else
    command_status="$?"
  fi
  acquire_lock
  action_type='waiting_for_agent_action'
  description='Await next agent action'
  command_text=''
  result_patch="$(jq -cn --argjson status "${command_status}" \
    '{action:{outcome:(if $status == 0 then "SUCCEEDED" else "FAILED" end)},command:{exitStatus:$status}}')"
  start_action_operation "${result_patch}"
  action_id="$(jq -er '.action_id' "${action_state}")"
  jq -cn --argjson start "${start_response}" --argjson status "${command_status}" \
    '{ok:($status == 0),action:$start,exit_status:$status}'
  release_lock
  heartbeat_loop "${action_id}"
}

over_operation() {
  local action_id
  local heartbeat_pid_value
  local other_action
  local response
  [[ -f "${action_state}" ]] || fail 'no active action for this agent and plan'
  if [[ -z "${parent_agent_id}" ]]; then
    while IFS= read -r other_action; do
      [[ "${other_action}" == "${action_state}" ]] && continue
      fail "subagent action remains open: ${other_action}"
    done < <(find "${plan_state}/agents" -name current-action -type f 2>/dev/null)
  fi
  action_id="$(jq -er '.action_id' "${action_state}")"
  heartbeat_pid_value="$(jq -er '.heartbeat_pid' "${action_state}")"
  response="$(database_finish_action "${action_id}" '' \
    '{"action":{"terminationReason":"NORMAL","timestampSource":"DATABASE"}}')" || \
    fail 'database action completion failed'
  stop_heartbeat "${action_id}" "${heartbeat_pid_value}"
  rm -f "${action_state}" "${heartbeat_file}"
  if [[ -z "${parent_agent_id}" ]]; then
    rm -f "${prompt_state}"
  fi
  printf '%s\n' "${response}"
}

heartbeat_loop() {
  local action="$1"
  local iteration=0
  trap 'exit 0' TERM INT
  while true; do
    touch "${heartbeat_file}"
    iteration=$((iteration + 1))
    if [[ $((iteration % 10)) -eq 0 ]]; then
      database_heartbeat "${action}" >/dev/null || true
    fi
    sleep 1
  done
}

main() {
  local operation
  local subcommand="${1:-}"
  local script_path
  local project_root=''
  local config_path=''
  local project_id=''
  local database_name=''
  local database_host=''
  local database_port=''
  local database_role=''
  local password_environment=''
  local plan_state=''
  local agent_state=''
  local action_state=''
  local heartbeat_file=''
  local prompt_state=''
  local lock_held='false'
  local heartbeat_pid=''
  local last_response=''
  local -a connection_args=()
  local action_type=''
  local agent_id=''
  local parent_agent_id=''
  local agent_model=''
  local plan_name=''
  local sprint_id=''
  local feature_id=''
  local tasklet_id=''
  local prompt_id=''
  local description=''
  local command_text=''

  script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
  operation="${subcommand:-project_journal}"
  shift || true
  case "${subcommand}" in
    start|run_command)
      parse_context_options "$@"
      [[ "${subcommand}" != 'run_command' ]] || [[ -n "${command_text}" ]] || \
        fail 'run_command requires one quoted command after --'
      validate_identifier 'action type' "${action_type}"
      validate_identifier 'description' "${description}"
      require_command jq
      require_command psql
      discover_project
      load_config
      set_connection_args
      prepare_action_context
      set_lock_trap
      if [[ "${subcommand}" == 'start' ]]; then
        [[ -z "${command_text}" ]] || fail 'start does not accept a command'
        start_action_operation '{}'
        printf '%s\n' "${last_response}"
        release_lock
        heartbeat_loop "$(jq -er '.action_id' "${action_state}")"
      else
        run_command_operation
      fi
      release_lock
      ;;
    over)
      parse_context_options "$@"
      [[ -z "${action_type}${description}${command_text}" ]] || \
        fail 'over accepts only context options'
      require_command jq
      require_command psql
      discover_project
      load_config
      set_connection_args
      validate_identifier 'plan' "${plan_name}"
      agent_id="$(normalize_agent_id "${agent_id}")"
      plan_state="${project_root}/tmp/project-journal/${plan_name}"
      agent_state="${plan_state}/agents/${agent_id}"
      action_state="${agent_state}/current-action"
      heartbeat_file="${agent_state}/heartbeat"
      prompt_state="${plan_state}/prompt"
      acquire_lock
      set_lock_trap
      load_existing_context
      over_operation
      release_lock
      ;;
    --help|-h|help)
      print_usage
      ;;
    '')
      print_usage >&2
      exit 1
      ;;
    *) fail "unknown command: ${subcommand}" ;;
  esac
  exit 0
}

main "$@"
