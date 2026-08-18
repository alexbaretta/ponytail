BEGIN;

CREATE SCHEMA IF NOT EXISTS ponytail_journal AUTHORIZATION ponytail_journal_owner;
ALTER SCHEMA ponytail_journal OWNER TO ponytail_journal_owner;

SET ROLE ponytail_journal_owner;
SET search_path = ponytail_journal, pg_catalog;

CREATE TABLE IF NOT EXISTS project (
  project_id uuid PRIMARY KEY,
  project_name text NOT NULL UNIQUE,
  CHECK (project_name = btrim(project_name) AND project_name <> '')
);

CREATE TABLE IF NOT EXISTS action_type (
  action_type text PRIMARY KEY,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CHECK (action_type ~ '^[a-z][a-z0-9_]*$')
);

INSERT INTO action_type (action_type, description) VALUES
  ('reasoning', 'Agent-declared reasoning'),
  ('waiting_for_agent_action', 'Automatic interval after a wrapped command'),
  ('read_files', 'Read project files'),
  ('edit_files', 'Edit project files'),
  ('run_command', 'Run a shell command'),
  ('build', 'Build affected targets'),
  ('unit_test', 'Run focused or full unit tests'),
  ('integration_test', 'Run integration tests'),
  ('interactive_testing', 'Run agent-driven interactive testing'),
  ('version_control', 'Run version-control operations'),
  ('deploy', 'Run an authorized deployment')
ON CONFLICT (action_type) DO UPDATE
SET description = EXCLUDED.description,
    active = true;

CREATE TABLE IF NOT EXISTS action_v1 (
  action_id uuid PRIMARY KEY DEFAULT uuidv7(),
  project_id uuid NOT NULL REFERENCES project(project_id),
  prompt_id uuid NOT NULL,
  agent_id text NOT NULL,
  reported_by name NOT NULL DEFAULT session_user,
  plan_name text NOT NULL,
  sprint_id text NOT NULL,
  feature_id text NOT NULL,
  tasklet_id text NOT NULL,
  sequence_number bigint NOT NULL CHECK (sequence_number > 0),
  action_type text NOT NULL REFERENCES action_type(action_type),
  start_timestamp timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  end_timestamp timestamptz,
  duration interval GENERATED ALWAYS AS (end_timestamp - start_timestamp) STORED,
  payload jsonb NOT NULL,
  UNIQUE (
    project_id,
    plan_name,
    sprint_id,
    feature_id,
    tasklet_id,
    sequence_number
  ),
  CHECK (agent_id = btrim(agent_id) AND agent_id <> ''),
  CHECK (plan_name = btrim(plan_name) AND plan_name <> ''),
  CHECK (sprint_id = btrim(sprint_id) AND sprint_id <> ''),
  CHECK (feature_id = btrim(feature_id) AND feature_id <> ''),
  CHECK (tasklet_id = btrim(tasklet_id) AND tasklet_id <> ''),
  CHECK (jsonb_typeof(payload) = 'object'),
  CHECK (payload ->> 'schemaVersion' = '1'),
  CHECK (last_heartbeat_at >= start_timestamp),
  CHECK (end_timestamp IS NULL OR end_timestamp >= start_timestamp)
);

CREATE UNIQUE INDEX IF NOT EXISTS action_v1_one_open_per_agent
ON action_v1 (project_id, prompt_id, agent_id)
WHERE end_timestamp IS NULL;

CREATE INDEX IF NOT EXISTS action_v1_reported_by
ON action_v1 (reported_by);

ALTER TABLE action_v1 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION require_text(value text, field_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF value IS NULL OR value <> btrim(value) OR value = '' OR value ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'invalid %', field_name;
  END IF;
  RETURN value;
END;
$function$;

CREATE OR REPLACE FUNCTION start_action(
  requested_project_id uuid,
  requested_prompt_id uuid,
  requested_agent_id text,
  requested_plan_name text,
  requested_sprint_id text,
  requested_feature_id text,
  requested_tasklet_id text,
  requested_action_type text,
  requested_payload jsonb,
  previous_payload_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ponytail_journal, pg_catalog, pg_temp
AS $function$
DECLARE
  action_timestamp timestamptz := now();
  allocated_sequence bigint;
  created_action_id uuid;
  effective_prompt_id uuid := coalesce(requested_prompt_id, uuidv7());
BEGIN
  PERFORM require_text(requested_agent_id, 'agent_id');
  PERFORM require_text(requested_plan_name, 'plan_name');
  PERFORM require_text(requested_sprint_id, 'sprint_id');
  PERFORM require_text(requested_feature_id, 'feature_id');
  PERFORM require_text(requested_tasklet_id, 'tasklet_id');
  PERFORM require_text(requested_action_type, 'action_type');
  IF jsonb_typeof(requested_payload) <> 'object' OR
     requested_payload ->> 'schemaVersion' <> '1' OR
     jsonb_typeof(previous_payload_patch) <> 'object' THEN
    RAISE EXCEPTION 'invalid action payload';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM action_type
    WHERE action_type = requested_action_type AND active
  ) THEN
    RAISE EXCEPTION 'unknown or inactive action type: %', requested_action_type;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    requested_project_id::text || E'\n' || requested_plan_name || E'\n' ||
    requested_sprint_id || E'\n' || requested_feature_id || E'\n' ||
    requested_tasklet_id,
    0
  ));

  UPDATE action_v1
  SET end_timestamp = action_timestamp,
      last_heartbeat_at = action_timestamp,
      payload = payload || previous_payload_patch
  WHERE project_id = requested_project_id
    AND prompt_id = effective_prompt_id
    AND agent_id = requested_agent_id
    AND end_timestamp IS NULL;

  SELECT coalesce(max(sequence_number), 0) + 1
  INTO allocated_sequence
  FROM action_v1
  WHERE project_id = requested_project_id
    AND plan_name = requested_plan_name
    AND sprint_id = requested_sprint_id
    AND feature_id = requested_feature_id
    AND tasklet_id = requested_tasklet_id;

  INSERT INTO action_v1 (
    project_id, prompt_id, agent_id, reported_by, plan_name, sprint_id,
    feature_id, tasklet_id, sequence_number, action_type, start_timestamp,
    last_heartbeat_at, payload
  ) VALUES (
    requested_project_id, effective_prompt_id, requested_agent_id, session_user,
    requested_plan_name, requested_sprint_id, requested_feature_id,
    requested_tasklet_id, allocated_sequence, requested_action_type,
    action_timestamp, action_timestamp,
    jsonb_set(
      requested_payload,
      '{workstation,clientAddress}',
      coalesce(to_jsonb(inet_client_addr()), 'null'::jsonb),
      true
    )
  ) RETURNING action_id INTO created_action_id;

  RETURN jsonb_build_object(
    'ok', true,
    'prompt_id', effective_prompt_id,
    'action_id', created_action_id,
    'sequence_number', allocated_sequence,
    'timestamp', to_char(action_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION heartbeat_action(requested_action_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ponytail_journal, pg_catalog, pg_temp
AS $function$
DECLARE
  heartbeat_timestamp timestamptz := now();
BEGIN
  UPDATE action_v1
  SET last_heartbeat_at = heartbeat_timestamp
  WHERE action_id = requested_action_id
    AND reported_by = session_user
    AND end_timestamp IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'open action not found';
  END IF;
  RETURN jsonb_build_object('ok', true, 'timestamp', heartbeat_timestamp);
END;
$function$;

CREATE OR REPLACE FUNCTION finish_action(
  requested_action_id uuid,
  requested_end_timestamp timestamptz DEFAULT now(),
  requested_payload_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ponytail_journal, pg_catalog, pg_temp
AS $function$
DECLARE
  finished_timestamp timestamptz;
BEGIN
  IF jsonb_typeof(requested_payload_patch) <> 'object' THEN
    RAISE EXCEPTION 'invalid action payload patch';
  END IF;
  UPDATE action_v1
  SET end_timestamp = greatest(start_timestamp, requested_end_timestamp),
      last_heartbeat_at = greatest(last_heartbeat_at, requested_end_timestamp),
      payload = payload || requested_payload_patch
  WHERE action_id = requested_action_id
    AND reported_by = session_user
    AND end_timestamp IS NULL
  RETURNING end_timestamp INTO finished_timestamp;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'open action not found';
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'action_id', requested_action_id,
    'timestamp', to_char(finished_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM')
  );
END;
$function$;

DROP POLICY IF EXISTS reporter_own_rows ON action_v1;
CREATE POLICY reporter_own_rows ON action_v1
FOR SELECT TO ponytail_reporter
USING (reported_by = session_user);

DROP POLICY IF EXISTS analyst_all_rows ON action_v1;
CREATE POLICY analyst_all_rows ON action_v1
FOR SELECT TO ponytail_analyst
USING (true);

REVOKE ALL ON SCHEMA ponytail_journal FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ponytail_journal FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ponytail_journal FROM PUBLIC;
GRANT USAGE ON SCHEMA ponytail_journal TO ponytail_reporter, ponytail_analyst,
  ponytail_super_journalist;
GRANT SELECT ON action_v1, project, action_type TO ponytail_reporter;
GRANT SELECT ON action_v1, project, action_type TO ponytail_analyst;
GRANT EXECUTE ON FUNCTION start_action(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb),
  heartbeat_action(uuid), finish_action(uuid, timestamptz, jsonb)
TO ponytail_reporter;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ponytail_journal
TO ponytail_super_journalist;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ponytail_journal
TO ponytail_super_journalist;

RESET ROLE;
COMMIT;
