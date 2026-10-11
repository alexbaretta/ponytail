-- Copyright (c) 2026 Alex Baretta. All rights reserved.
-- Licensed under the MIT License. See LICENSE in the project root.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS ponytail_index AUTHORIZATION ponytail_index_owner;
ALTER SCHEMA ponytail_index OWNER TO ponytail_index_owner;

SET ROLE ponytail_index_owner;
SET search_path = ponytail_index, pg_catalog;

CREATE TABLE IF NOT EXISTS schema_version_v1 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL CHECK (schema_version = 1)
);

INSERT INTO schema_version_v1 (schema_version)
VALUES (1)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS project_v1 (
  project_id uuid PRIMARY KEY,
  project_name text NOT NULL UNIQUE,
  CHECK (project_name = btrim(project_name) AND project_name <> '')
);

CREATE TABLE IF NOT EXISTS repository_v1 (
  repository_id uuid PRIMARY KEY DEFAULT uuidv7(),
  project_id uuid NOT NULL REFERENCES project_v1(project_id),
  common_directory text NOT NULL,
  UNIQUE (project_id, common_directory),
  CHECK (common_directory = btrim(common_directory) AND common_directory <> '')
);

CREATE TABLE IF NOT EXISTS worktree_v1 (
  worktree_id uuid PRIMARY KEY DEFAULT uuidv7(),
  repository_id uuid NOT NULL REFERENCES repository_v1(repository_id),
  root_path text NOT NULL,
  UNIQUE (repository_id, root_path),
  CHECK (root_path = btrim(root_path) AND root_path <> '')
);

CREATE TABLE IF NOT EXISTS repository_text_schema_version_v1 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL CHECK (schema_version = 1)
);

INSERT INTO repository_text_schema_version_v1 (schema_version)
VALUES (1)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS text_document_v1 (
  document_id text PRIMARY KEY CHECK (document_id ~ '^[0-9a-f]{64}$'),
  content text NOT NULL
);

CREATE INDEX IF NOT EXISTS text_document_v1_trigram
ON text_document_v1 USING gin (content public.gin_trgm_ops);

CREATE TABLE IF NOT EXISTS git_commit_v1 (
  repository_id uuid NOT NULL REFERENCES repository_v1(repository_id) ON DELETE CASCADE,
  commit_oid text NOT NULL CHECK (commit_oid ~ '^[0-9a-f]{40,64}$'),
  tree_oid text NOT NULL CHECK (tree_oid ~ '^[0-9a-f]{40,64}$'),
  committed_at timestamptz NOT NULL,
  PRIMARY KEY (repository_id, commit_oid)
);

CREATE TABLE IF NOT EXISTS git_commit_parent_v1 (
  repository_id uuid NOT NULL,
  commit_oid text NOT NULL,
  parent_oid text NOT NULL CHECK (parent_oid ~ '^[0-9a-f]{40,64}$'),
  parent_order integer NOT NULL CHECK (parent_order >= 0),
  PRIMARY KEY (repository_id, commit_oid, parent_order),
  FOREIGN KEY (repository_id, commit_oid)
    REFERENCES git_commit_v1(repository_id, commit_oid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS git_blob_v1 (
  repository_id uuid NOT NULL REFERENCES repository_v1(repository_id) ON DELETE CASCADE,
  blob_oid text NOT NULL CHECK (blob_oid ~ '^[0-9a-f]{40,64}$'),
  byte_length bigint NOT NULL CHECK (byte_length >= 0),
  document_id text REFERENCES text_document_v1(document_id),
  PRIMARY KEY (repository_id, blob_oid)
);

CREATE TABLE IF NOT EXISTS git_tree_entry_v1 (
  repository_id uuid NOT NULL,
  commit_oid text NOT NULL,
  path text NOT NULL,
  mode text NOT NULL CHECK (mode ~ '^[0-7]{6}$'),
  blob_oid text NOT NULL,
  PRIMARY KEY (repository_id, commit_oid, path),
  FOREIGN KEY (repository_id, commit_oid)
    REFERENCES git_commit_v1(repository_id, commit_oid) ON DELETE CASCADE,
  FOREIGN KEY (repository_id, blob_oid)
    REFERENCES git_blob_v1(repository_id, blob_oid),
  CHECK (path = btrim(path) AND path <> '' AND path !~ '(^|/)[.][.]?(/|$)')
);

CREATE INDEX IF NOT EXISTS git_tree_entry_v1_blob
ON git_tree_entry_v1 (repository_id, blob_oid);

CREATE TABLE IF NOT EXISTS git_ref_observation_v1 (
  repository_id uuid NOT NULL REFERENCES repository_v1(repository_id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  ref_name text NOT NULL,
  commit_oid text,
  deleted boolean NOT NULL,
  PRIMARY KEY (repository_id, observed_at, ref_name),
  CHECK (ref_name = btrim(ref_name) AND ref_name <> ''),
  CHECK ((deleted AND commit_oid IS NULL) OR (NOT deleted AND commit_oid ~ '^[0-9a-f]{40,64}$'))
);

CREATE INDEX IF NOT EXISTS git_ref_observation_v1_latest
ON git_ref_observation_v1 (repository_id, ref_name, observed_at DESC);

CREATE TABLE IF NOT EXISTS git_ref_current_v1 (
  repository_id uuid NOT NULL REFERENCES repository_v1(repository_id) ON DELETE CASCADE,
  ref_name text NOT NULL,
  commit_oid text NOT NULL CHECK (commit_oid ~ '^[0-9a-f]{40,64}$'),
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (repository_id, ref_name)
);

CREATE TABLE IF NOT EXISTS worktree_text_generation_v1 (
  generation_id uuid PRIMARY KEY DEFAULT uuidv7(),
  worktree_id uuid NOT NULL REFERENCES worktree_v1(worktree_id) ON DELETE CASCADE,
  head_commit text NOT NULL CHECK (head_commit ~ '^[0-9a-f]{40,64}$'),
  state_digest text NOT NULL CHECK (state_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worktree_text_entry_v1 (
  generation_id uuid NOT NULL REFERENCES worktree_text_generation_v1(generation_id) ON DELETE CASCADE,
  path text NOT NULL,
  state text NOT NULL CHECK (state IN ('modified', 'untracked', 'deleted')),
  document_id text REFERENCES text_document_v1(document_id),
  PRIMARY KEY (generation_id, path),
  CHECK ((state = 'deleted' AND document_id IS NULL) OR
         (state <> 'deleted' AND document_id IS NOT NULL)),
  CHECK (path = btrim(path) AND path <> '' AND path !~ '(^|/)[.][.]?(/|$)')
);

CREATE TABLE IF NOT EXISTS published_worktree_text_generation_v1 (
  worktree_id uuid PRIMARY KEY REFERENCES worktree_v1(worktree_id) ON DELETE CASCADE,
  generation_id uuid NOT NULL UNIQUE
    REFERENCES worktree_text_generation_v1(generation_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parse_result_v1 (
  parse_result_id uuid PRIMARY KEY DEFAULT uuidv7(),
  project_id uuid NOT NULL REFERENCES project_v1(project_id),
  corpus text NOT NULL CHECK (corpus IN ('traceability', 'plans')),
  content_digest text NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  parser_identity text NOT NULL CHECK (parser_identity = btrim(parser_identity) AND parser_identity <> ''),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload ->> 'schemaVersion' = '1'),
  UNIQUE (project_id, corpus, content_digest, parser_identity)
);

CREATE TABLE IF NOT EXISTS generation_v1 (
  generation_id uuid PRIMARY KEY DEFAULT uuidv7(),
  worktree_id uuid NOT NULL REFERENCES worktree_v1(worktree_id),
  corpus text NOT NULL CHECK (corpus IN ('traceability', 'plans')),
  head_commit text NOT NULL CHECK (head_commit ~ '^[0-9a-f]{40,64}$'),
  state_digest text NOT NULL CHECK (state_digest ~ '^[0-9a-f]{64}$'),
  configuration_digest text NOT NULL CHECK (configuration_digest ~ '^[0-9a-f]{64}$'),
  parser_identity text NOT NULL CHECK (parser_identity = btrim(parser_identity) AND parser_identity <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_v1 (
  generation_id uuid NOT NULL REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  path text NOT NULL,
  content_digest text NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  git_state text NOT NULL CHECK (git_state IN ('tracked', 'modified', 'added', 'deleted')),
  parse_result_id uuid REFERENCES parse_result_v1(parse_result_id),
  PRIMARY KEY (generation_id, path),
  CHECK (path = btrim(path) AND path <> '' AND path !~ '(^|/)[.][.]?(/|$)')
);

CREATE TABLE IF NOT EXISTS entity_v1 (
  generation_id uuid NOT NULL REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  entity_kind text NOT NULL,
  path text NOT NULL,
  line integer CHECK (line IS NULL OR line > 0),
  unit_name text,
  annotation text,
  description text,
  PRIMARY KEY (generation_id, entity_id),
  CHECK (entity_id = btrim(entity_id) AND entity_id <> ''),
  CHECK (entity_kind = btrim(entity_kind) AND entity_kind <> '')
);

CREATE TABLE IF NOT EXISTS relationship_v1 (
  generation_id uuid NOT NULL REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  source_entity_id text NOT NULL,
  target_entity_id text NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (generation_id, source_entity_id, target_entity_id, role),
  FOREIGN KEY (generation_id, source_entity_id)
    REFERENCES entity_v1(generation_id, entity_id) ON DELETE CASCADE,
  FOREIGN KEY (generation_id, target_entity_id)
    REFERENCES entity_v1(generation_id, entity_id) ON DELETE CASCADE,
  CHECK (role = btrim(role) AND role <> '')
);

CREATE TABLE IF NOT EXISTS search_document_v2 (
  generation_id uuid NOT NULL REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  document_id text NOT NULL REFERENCES text_document_v1(document_id),
  searchable_entity_id text,
  entity_kind text,
  role text,
  requirement_id text,
  path text,
  unit_name text,
  annotation text,
  description text,
  PRIMARY KEY (generation_id, entity_id),
  FOREIGN KEY (generation_id, entity_id)
    REFERENCES entity_v1(generation_id, entity_id) ON DELETE CASCADE
);

DO $migration$
BEGIN
  IF to_regclass('ponytail_index.search_document_v1') IS NOT NULL THEN
    DELETE FROM generation_v1;
    DROP TABLE search_document_v1;
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS entity_v1_kind
ON entity_v1 (generation_id, entity_kind);

CREATE INDEX IF NOT EXISTS relationship_v1_target
ON relationship_v1 (generation_id, target_entity_id, role);

CREATE TABLE IF NOT EXISTS published_generation_v1 (
  worktree_id uuid NOT NULL REFERENCES worktree_v1(worktree_id) ON DELETE CASCADE,
  corpus text NOT NULL CHECK (corpus IN ('traceability', 'plans')),
  generation_id uuid NOT NULL UNIQUE REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  PRIMARY KEY (worktree_id, corpus)
);

-- Traceability: implements REQ-ROLLING-STATE
-- Traceability: supports REQ-ROLLING-SCHEDULING
CREATE TABLE IF NOT EXISTS rolling_pool_v1 (
  project_id uuid PRIMARY KEY REFERENCES project_v1(project_id) ON DELETE CASCADE,
  managed_directory text NOT NULL CHECK (managed_directory <> '')
);

CREATE TABLE IF NOT EXISTS rolling_campaign_v1 (
  project_id uuid NOT NULL REFERENCES rolling_pool_v1(project_id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  coordinator_root text NOT NULL,
  document_path text NOT NULL,
  bindings_path text NOT NULL,
  graph_digest text NOT NULL CHECK (graph_digest ~ '^[0-9a-f]{64}$'),
  configuration_text text NOT NULL,
  PRIMARY KEY (project_id, campaign_id)
);
ALTER TABLE rolling_campaign_v1
  DROP CONSTRAINT IF EXISTS rolling_campaign_v1_configuration_text_check,
  ADD CONSTRAINT rolling_campaign_v1_configuration_text_check
  CHECK (COALESCE(jsonb_typeof((configuration_text::jsonb)->'schemaVersion') = 'number'
    AND (configuration_text::jsonb)->>'schemaVersion' IN ('1','2'), false));

CREATE TABLE IF NOT EXISTS rolling_worktree_v1 (
  project_id uuid NOT NULL REFERENCES rolling_pool_v1(project_id) ON DELETE CASCADE,
  number bigint NOT NULL CHECK (number BETWEEN 101 AND 9007199254740991),
  root_path text NOT NULL,
  state text NOT NULL CHECK (state IN ('AVAILABLE','PROVISIONING','RESERVED','ACTIVE','QUARANTINED')),
  PRIMARY KEY (project_id, number),
  UNIQUE (project_id, root_path)
);
CREATE INDEX IF NOT EXISTS rolling_worktree_v1_available
ON rolling_worktree_v1 (project_id, number) WHERE state='AVAILABLE';

CREATE TABLE IF NOT EXISTS rolling_assignment_v1 (
  project_id uuid NOT NULL,
  campaign_id text NOT NULL,
  assignment_id uuid PRIMARY KEY,
  obligation_id text NOT NULL,
  worktree_number bigint NOT NULL,
  generation uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('RESERVED','PROVISIONING','ATTACHING','WORKING','REVIEW','REWORK','INTEGRATING','RETIRING','INACTIVE','RELEASED')),
  session_id text,
  activity_stopped boolean NOT NULL DEFAULT false,
  retired boolean NOT NULL DEFAULT false,
  scope_text text NOT NULL,
  blockers_text text NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(blockers_text::jsonb)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id,campaign_id) REFERENCES rolling_campaign_v1(project_id,campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id,worktree_number) REFERENCES rolling_worktree_v1(project_id,number) ON DELETE CASCADE,
  CHECK (state <> 'INACTIVE' OR activity_stopped)
);
ALTER TABLE rolling_assignment_v1
  DROP CONSTRAINT IF EXISTS rolling_assignment_v1_scope_text_check,
  ADD CONSTRAINT rolling_assignment_v1_scope_text_check
  CHECK (COALESCE(jsonb_typeof((scope_text::jsonb)->'schemaVersion') = 'number'
    AND (scope_text::jsonb)->>'schemaVersion' IN ('1','2'), false));
CREATE UNIQUE INDEX IF NOT EXISTS rolling_assignment_v1_obligation_owner
ON rolling_assignment_v1 (project_id,campaign_id,obligation_id) WHERE state <> 'RELEASED';
CREATE UNIQUE INDEX IF NOT EXISTS rolling_assignment_v1_worktree_owner
ON rolling_assignment_v1 (project_id,worktree_number) WHERE state <> 'RELEASED';
CREATE INDEX IF NOT EXISTS rolling_assignment_v1_campaign_state
ON rolling_assignment_v1 (project_id,campaign_id,state,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS rolling_assignment_v1_identity
ON rolling_assignment_v1 (project_id,campaign_id,assignment_id);

CREATE TABLE IF NOT EXISTS rolling_submission_v1 (
  project_id uuid NOT NULL,
  campaign_id text NOT NULL,
  assignment_id uuid NOT NULL,
  generation uuid NOT NULL,
  revision text NOT NULL CHECK (revision ~ '^([a-f0-9]{40}|[a-f0-9]{64})$'),
  submission_text text NOT NULL CHECK (COALESCE(jsonb_typeof((submission_text::jsonb)->'schemaVersion')='number'
    AND (submission_text::jsonb)->>'schemaVersion'='1', false)),
  lease_text text NOT NULL CHECK (COALESCE(jsonb_typeof((lease_text::jsonb)->'schemaVersion')='number'
    AND (lease_text::jsonb)->>'schemaVersion'='1', false)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id,campaign_id,assignment_id,generation,revision),
  FOREIGN KEY (project_id,campaign_id,assignment_id)
    REFERENCES rolling_assignment_v1(project_id,campaign_id,assignment_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS rolling_submission_v1_assignment_history
ON rolling_submission_v1 (project_id,campaign_id,assignment_id,created_at,revision);

CREATE TABLE IF NOT EXISTS rolling_action_v1 (
  project_id uuid NOT NULL,
  campaign_id text NOT NULL,
  action_id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('START_WORKER','RESUME_WORKER')),
  generation uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING','STARTED','COMPLETED','CANCELLED')),
  result_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id,campaign_id) REFERENCES rolling_campaign_v1(project_id,campaign_id) ON DELETE CASCADE,
  UNIQUE (assignment_id,generation,kind)
);
DO $rolling_action_identity$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rolling_action_v1_assignment_identity'
    AND conrelid='ponytail_index.rolling_action_v1'::regclass) THEN
    ALTER TABLE rolling_action_v1 ADD CONSTRAINT rolling_action_v1_assignment_identity
    FOREIGN KEY (project_id,campaign_id,assignment_id)
    REFERENCES rolling_assignment_v1(project_id,campaign_id,assignment_id) ON DELETE CASCADE;
  END IF;
END
$rolling_action_identity$;
CREATE INDEX IF NOT EXISTS rolling_action_v1_pending
ON rolling_action_v1 (project_id,campaign_id,created_at,action_id) WHERE state IN ('PENDING','STARTED');

CREATE OR REPLACE FUNCTION register_project(
  requested_project_id uuid,
  requested_project_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ponytail_index, pg_catalog, pg_temp
AS $function$
BEGIN
  IF requested_project_name IS NULL OR
     requested_project_name <> btrim(requested_project_name) OR
     requested_project_name = '' THEN
    RAISE EXCEPTION 'invalid project_name';
  END IF;
  INSERT INTO project_v1 (project_id, project_name)
  VALUES (requested_project_id, requested_project_name)
  ON CONFLICT (project_id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM project_v1
    WHERE project_id = requested_project_id
      AND project_name = requested_project_name
  ) THEN
    RAISE EXCEPTION 'project registration conflicts with existing project';
  END IF;
END;
$function$;

REVOKE ALL ON SCHEMA ponytail_index FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ponytail_index FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ponytail_index FROM PUBLIC;
GRANT USAGE ON SCHEMA ponytail_index TO ponytail_index_reader, ponytail_index_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA ponytail_index TO ponytail_index_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ponytail_index
TO ponytail_index_writer;
GRANT EXECUTE ON FUNCTION register_project(uuid, text) TO ponytail_index_writer;

RESET ROLE;
COMMIT;
