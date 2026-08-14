---
name: project-structure
description: "Project configuration workflow"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Project Structure

Treat the host project workspace's repository-owned configuration as the
source of truth for project-specific structure and commands. This skill
supplies the project-agnostic workflow; the host's agent instructions and
referenced architecture documents supply the values.

A project workspace may contain one repository or several independently
versioned repositories. Use these terms uniformly:

- **management repository**: the repository that owns project-management
  artifacts and project-wide configuration;
- **component repository**: a repository that owns implementation, tests,
  packages, documentation, or infrastructure; and
- **project change-set**: the complete set of coordinated commits needed to
  deliver one approved change across all affected repositories.

A repository may be both the management repository and a component
repository. Do not assume that all project files share one Git history.
The management repository owns the project-wide repository map. Within a
declared component ownership boundary, that component repository's own
instructions and implementation are authoritative unless the project-wide
configuration explicitly assigns authority elsewhere.

## Host Configuration Contract

Use the project-local agent instructions already supplied by the host. They
should identify, directly or by reference:

- the repository structure and ownership document;
- the management repository and project-management root;
- the component-repository inventory and ownership boundaries;
- the documentation placement and source-ownership policy;
- the ignored project-local temporary directory;
- the cloud infrastructure architecture document;
- the initial local-environment setup command;
- the local-environment update command;
- the build-impact configuration and query command;
- build target commands;
- the full release or CI build command and when it applies;
- named unit-test families and their focused and full commands;
- the command that runs all registered integration Arcs;
- Suite selectors and explicit Arc-selection commands;
- the command that lists registered Arcs and focused workflows;
- additional quality commands and when each applies;
- the deployment command or commands;
- other project-specific operational commands;
- cloud environments and their purposes;
- ancillary cloud services and their ownership; and
- canonical contract, generated-artifact, credential, and secret owners when
  those conventions affect file placement.

Keep the agent instructions compact. Put detailed directory trees,
documentation taxonomies, cloud topology, environment inventories, and
service descriptions in referenced project-local documents.

A host may explicitly mark a configuration category not applicable, with a
short reason. Documentation-only repositories, libraries, local-only tools,
and partial component repositories need not invent build, integration,
deployment, cloud, or ancillary-service configuration they do not own.

Integration-test hierarchy and execution semantics use the canonical Suite,
Arc, and Step definitions from `production-test-boundaries`.

Ordinary change validation uses the canonical `build-impact` skill. A host
with buildable targets must configure its query and target commands. A host
without buildable targets may mark build impact not applicable. Keep
release-only or CI-wide builds separate from ordinary agent validation.

Configure unit tests as one named family per independently selected test
runner or language. Each family owns a focused command form that accepts
explicit test files or named cases and a full command for its complete suite.
A host may configure multiple families. There is no portable command default.
Mark a command `not configured` when its owner exists but the command is
missing, and `not applicable` when the host owns no such tests. Missing
focused selection is a configuration discrepancy; never substitute the full
command.

If the current change establishes or changes a required project-specific
value, discover it from authoritative repository sources and add it to the
owning configuration in the same change. If the value already existed in
implementation but was omitted from configuration, treat that omission as a
pre-existing discrepancy under the workflow below. Do not invent a convention
merely to fill a blank.

## Configuration Synchronization Invariant

Whenever implementation work establishes, changes, or invalidates a fact
represented by project-local agent configuration or one of its referenced
documents, update the owning configuration in the same project change-set.

When implementation and configuration have different repository owners,
create selective commits in their owning repositories. When they share an
owner, prefer a single commit unless the host's commit policy requires finer
separation.

Apply this rule even when configuration maintenance was not separately named
in the request. It is part of keeping the implementation complete, not an
unrelated documentation expansion.

Distinguish drift introduced by the current change from drift that already
existed:

- If the current change establishes, changes, or invalidates a configured
  fact, update the configuration in the same change without treating that
  synchronization as additional scope.
- If investigation discovers a pre-existing discrepancy between the
  implementation and project-local configuration, determine the correct state
  from authoritative repository evidence. When that state is unambiguous and
  the repair is narrow, local, reversible, and within established ownership,
  pause only the affected operation, repair the canonical owner, run the
  smallest applicable focused validation, record the repair in the durable
  plan or next progress report, and continue approved work without requesting
  user approval. Separate the repair from unrelated work only when repository
  ownership or the host commit policy requires it.

Stop and request user direction when authoritative sources conflict; the
correct state or owner is ambiguous; the repair would materially broaden
approved scope; it would change product behavior, a public contract, data
retention or persistence, authorization, security posture, infrastructure
topology, deployment responsibility, or external-system state; it is
destructive or difficult to reverse; it requires authority not granted by the
user; it would overwrite user-owned uncommitted work; or focused validation
reveals a larger unresolved defect. Continue independent approved work when
the discrepancy blocks only one path and the plan does not require strict
serial execution.

An explicit diagnosis-only or report-only instruction prohibits repair. Report
the discrepancy and avoid claims that depend on its unresolved facts.

Examples:

- Adding, removing, renaming, or changing an option of a canonical command
  requires updating the project-local command inventory.
- Adding, removing, renaming, or changing the owner of a directory requires
  updating the repository structure document.
- Changing where a class of documentation belongs requires updating the
  documentation structure policy.
- Changing the scratch directory or its safety rules requires updating the
  temporary-artifact configuration.
- Adding or changing a cloud environment, ancillary service, infrastructure
  owner, or deployment topology requires updating the cloud infrastructure
  architecture document.
- Replacing a source of truth, generator, credential location, or secret owner
  requires updating the corresponding ownership entry.

Do not update configuration for an implementation detail that the
configuration intentionally does not model. Do not create duplicated command
or structure inventories: update the single declared owner and keep compact
agent instructions as references where appropriate.

Before completing or committing the change:

1. Inspect the diff for facts that affect configured commands, paths,
   ownership, environments, services, or operational entry points.
2. Update each affected configuration owner.
3. Check links, paths, command names, options, and environment names against
   the implementation.
4. Include the implementation and its configuration updates in the same
   project change-set, using selective commits in their owning repositories.
5. Treat a stale configuration owner as an incomplete change.

## Placement Workflow

1. Identify the project-workspace root, management repository, affected
   component repositories, and source owner for the requested work.
2. Consult only the referenced structure or configuration documents relevant
   to the change.
3. Place source, tests, contracts, generated artifacts, documentation,
   infrastructure, and agent assets under their declared owners.
4. Preserve dependency direction and canonical-source boundaries declared by
   the host.
5. Update links and inventories when files or owners move.
6. Apply the configuration synchronization invariant before validation and
   commit.

If the intended owner does not exist, update the documented target structure
as part of the approved work before creating an alternative layout.

## Documentation Placement

- Classify documentation by audience, source owner, and whether it is
  handwritten or generated.
- Keep canonical package or SDK documentation beside its declared owner when
  the host requires that layout.
- Keep generated documentation tied to its generator or canonical input.
- Preserve one source of truth and update inbound links after a move.
- Do not delete documentation without the authority required by the host.

## Temporary Artifacts

- Store project-specific logs, downloads, screenshots, probes, traces, and
  investigation evidence under the configured ignored temporary directory for
  the project workspace or owning component repository.
- Verify that the directory is ignored before writing into it.
- Use a task-specific subdirectory and descriptive filenames.
- Keep temporary artifacts out of commits unless the user explicitly promotes
  an artifact into repository source.
- Follow the host's credential and sensitive-data policy for temporary
  evidence.

Do not default to a system temporary directory or a home-directory download
folder when the host has configured a project-local temporary owner.

## Cloud Infrastructure Structure

Use the host's cloud infrastructure architecture document for:

- environment names, purposes, and isolation boundaries;
- provider and region ownership;
- shared versus environment-local infrastructure;
- deployment entry points;
- state, artifact, secret, identity, network, and database ownership; and
- ancillary services such as VPNs, registries, observability, email, or issue
  tracking systems.

Keep architectural facts and operational commands distinct: the architecture
document explains the topology and ownership, while the command inventory
identifies canonical entry points.

## Stop Conditions

- Stop if competing documents claim the same source ownership and the conflict
  materially affects the requested work.
- Stop for a pre-existing implementation/configuration discrepancy only when
  its correct resolution is ambiguous or requires a material decision outside
  approved scope. Do not stop for a source-proven mechanical synchronization
  repair covered by this skill.
- Stop if the intended placement or configuration update would materially
  broaden the approved scope.
- Stop before inventing a new owner when the host configuration is ambiguous.
- Do not stop merely because the current change requires a synchronized
  configuration edit already covered by this skill.
