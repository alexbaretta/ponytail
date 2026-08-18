# PostgreSQL Project Journaling

- Plan ID: `2026-08-17-postgresql-project-journaling`
- Status: `IN_PROGRESS`
- Approval: Approved by the user on 2026-08-17 with the instruction to
  implement the plan and validate it by journaling its final tasklets.

## Objective

Add non-blocking, PostgreSQL-backed telemetry for long-lived plan execution so
agent wall-clock activity can later be analyzed by project, plan, sprint,
feature, tasklet, prompt, agent, developer, workstation, model, action type,
and Git state without adding journal records to Git.

## Scope

- Add committed root-level `ponytail-journal.json` configuration containing a stable UUID and
  non-secret PostgreSQL connection settings.
- Add a setup tool that provisions the PostgreSQL database, journal roles,
  stable relational core, JSONB payload, action-type reference data, functions,
  triggers, views, grants, and row-level security policies from scratch and
  reconciles an existing installation idempotently.
- Add `project_journal.sh` as an installable Ponytail CLI with action
  transitions, wrapped commands, heartbeats, recovery, and `over` handling.
- Keep local process coordination under ignored
  `tmp/project-journal/<plan-name>/` state.
- Update the canonical plan-execution skill so agents journal long-lived plan
  activity and report journal failures without stopping approved work.
- Synchronize generated host skill copies, CLI installation, project structure,
  documentation, audit behavior, and focused regression coverage.

## Exclusions

- Velocity, throughput, or ETA calculations.
- Dashboards, archival, or deletion of journal records.
- Storing Git diffs.
- An operating-system service or daemon installed outside the project.
- A third-party schema migration framework.
- Auditing exceptional repairs made by the super-journalist.
- Provisioning or deploying a shared PostgreSQL server.

## Repositories And Boundaries

- Management repository: this repository.
- Component repository: this repository.
- External persistence boundary: a project-configured PostgreSQL 18 database;
  server provisioning and operation remain outside Ponytail.
- Secrets remain outside Git and use standard PostgreSQL authentication inputs.
- Journal failures are telemetry failures, not plan-execution blockers; the
  agent continues and reports the failed attempt in chat.

## Architecture

### Identity and concurrency

- `project_id` is a committed UUIDv7 generated once per configured project.
- `prompt_id` is a UUIDv7 generated automatically when a plan has no active
  prompt/reply iteration.
- One top-level agent may own a plan at a time; its subagents share its
  `prompt_id`.
- A prompt that spans multiple plans explicitly carries its existing
  `prompt_id` when entering another plan.
- Agents pass their canonical `agent_id` and nullable `parent_agent_id` through
  the CLI. The leading slash is removed for local state paths; remaining path
  hierarchy is preserved.
- Tasklet action sequence numbers are unique within project, plan, sprint,
  feature, and tasklet and are allocated under PostgreSQL locking.

### Stable relational core

The action table owns only fields required for relational identity, integrity,
ordering, lifecycle, generated duration, or row-level security:

- action, project, and prompt UUIDs;
- agent ID and reporting database role;
- plan, sprint, feature, and tasklet IDs;
- tasklet-scoped sequence number;
- referenced action type;
- start, heartbeat, and end timestamps;
- generated duration; and
- one JSONB payload for descriptive and extensible observations.

The JSONB payload owns parent-agent identity, agent model, developer Git
identity, workstation and client address, Git snapshot, action description,
termination metadata, outcome, command template, and command result. Changed
paths are represented as JSON arrays. Git diffs are never stored.

The physical table is expected not to be altered after creation. New
descriptive fields extend the JSONB payload. A future change to relational
identity or integrity requires an explicit new physical schema version rather
than opportunistic `ALTER TABLE` migration.

### Access control

- Each developer connects with an individual PostgreSQL login that is a member
  of the reporter role.
- Row-level security limits reporters to rows whose `reported_by` equals their
  `session_user`.
- An analyst role may select all rows for aggregate engineering analysis.
- A super-journalist owns unrestricted repair and schema-maintenance authority
  within the journal boundary; exceptional repair is not itself audited.
- Reporters cannot directly update or delete journal rows. Controlled
  security-definer journal functions own sanitized insertion, transitions,
  and heartbeat updates; reporters do not receive raw table insertion rights.
- The setup tool creates the database and owner, super-journalist, analyst,
  reporter-group, and configured reporter-login roles when absent. Setup-time
  administrative connection overrides and credentials remain outside the
  committed project configuration.

### Action lifecycle

- The first intentional action after prompt processing starts wall-clock
  accounting.
- Starting an action atomically closes the same agent's preceding open action
  at the new action's PostgreSQL start timestamp.
- `run_command` stores one quoted Bash command template, runs it with inherited
  environment variables expanded only by the child Bash, records its result,
  and automatically starts `waiting_for_agent_action` after completion.
- Sensitive values are supplied through environment variables and remain
  variable references in the stored command template.
- `over` closes the top-level action, deletes completed prompt state, and emits
  one-line JSON containing the authoritative timestamp for the agent's reply.
- Subagents close their actions without ending the shared prompt.

### Heartbeat and recovery

- A detached internal CLI process touches local heartbeat state every second
  and updates PostgreSQL every ten seconds while its action is on the clock.
- Local state is partitioned by plan and hierarchical agent ID and protected
  by atomic filesystem locks.
- Normal transitions stop and verify the preceding heartbeat before closing
  and replacing its action.
- When a heartbeat process is gone, recovery uses the local heartbeat's last
  touch timestamp; when local state is unavailable, it uses the last database
  heartbeat. The payload records the abnormal termination and timestamp source.
- A living heartbeat remains billable wall-clock time even during model or
  provider stalls.
- PIDs are local coordination data only and are not authoritative journal
  identity.

## Initial Action Types

- `reasoning`
- `waiting_for_agent_action`
- `read_files`
- `edit_files`
- `run_command`
- `build`
- `unit_test`
- `integration_test`
- `interactive_testing`
- `version_control`
- `deploy`

The reference table permits later extension without changing the action table.

## Acceptance Criteria

- The PostgreSQL installer is repeatable and leaves the schema, reference data,
  functions, policies, and grants in the declared state.
- Concurrent agents receive correct tasklet sequence numbers and cannot leave
  more than one open action per project, prompt, and agent.
- Reporters can insert through the supported journaling path and select only
  their own records; analysts can select all records; reporters cannot update
  or delete records directly.
- Action transitions, wrapped commands, `waiting_for_agent_action`, `over`,
  subagent completion, normal heartbeat, and abnormal recovery follow the
  architecture above.
- A missing or unavailable journal configuration or database produces a clear
  JSON failure, does not stop plan work, and is reported by the agent in chat.
- Commands retain their quoted templates without persisting sensitive
  environment values.
- Journal process state remains ignored under `tmp/`; no journal telemetry is
  added to Git.
- CLI installation and project auditing recognize the new owned files and
  configuration.
- Canonical and generated skill copies remain synchronized.
- Focused checks pass during implementation, followed once by the configured
  full test, rule-copy, and version checks at plan final acceptance.

## Sprint Manifest

- [S01](sprints/S01.md): PostgreSQL contract and project configuration — `DONE`
- [S02](sprints/S02.md): CLI lifecycle and heartbeat — `DONE`
- [S03](sprints/S03.md): Agent workflow and project integration — `IN_PROGRESS`
- [S04](sprints/S04.md): Final acceptance and reconciliation — `PENDING`

## Plan-Level Questions

- [RESOLVED] Reporters insert exclusively through controlled journal functions
  so the database boundary can sanitize and validate inputs.
- [RESOLVED] Root-level `ponytail-journal.json` owns committed JSON
  configuration, following Ponytail's existing root-level JSON configuration
  convention.
- [RESOLVED] The setup tool provisions the database and all required roles from
  scratch when its administrative connection is authorized, and idempotently
  reconciles an existing installation.

## Final Validation

Pending execution and approval.
