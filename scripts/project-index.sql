-- Copyright (c) 2026 Alex Baretta. All rights reserved.
-- Licensed under the MIT License. See LICENSE in the project root.

BEGIN;

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

CREATE TABLE IF NOT EXISTS search_document_v1 (
  generation_id uuid NOT NULL REFERENCES generation_v1(generation_id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  searchable_entity_id text,
  entity_kind text,
  role text,
  requirement_id text,
  path text,
  unit_name text,
  annotation text,
  description text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(searchable_entity_id, '') || ' ' || coalesce(entity_kind, '') || ' ' ||
      coalesce(role, '') || ' ' || coalesce(requirement_id, '') || ' ' ||
      coalesce(path, '') || ' ' || coalesce(unit_name, '') || ' ' ||
      coalesce(annotation, '') || ' ' || coalesce(description, '')
    )
  ) STORED,
  PRIMARY KEY (generation_id, entity_id),
  FOREIGN KEY (generation_id, entity_id)
    REFERENCES entity_v1(generation_id, entity_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS search_document_v1_vector
ON search_document_v1 USING gin (search_vector);

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
