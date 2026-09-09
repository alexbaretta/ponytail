---
name: cloud-cli-reauth
description: "Cloud CLI authentication recovery"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Cloud CLI Reauthentication

Use this workflow only for a confirmed authentication failure. Preserve the
failed command and its diagnostic output before starting recovery.

## Project Configuration Contract

The host configures this skill in `AGENTS.md` with one `Cloud CLI
reauthentication command` entry per supported CLI, account or profile, and
environment where those distinctions change the command. There is no generic
default. A host that does not support cloud reauthentication may declare the
entry `not applicable`.

## Workflow

1. Identify the cloud CLI, account or profile, environment, and exact command
   that failed.
2. Find the canonical reauthentication command in the host project's local
   configuration.
3. Run that command without substituting a different account, profile,
   environment, or cloud provider. If it requires user interaction, request
   that interaction and resume after it completes.
4. Retry the exact failed command after reauthentication succeeds.
5. Report reauthentication and retry results separately.

## Constraints

- Do not replace the configured command with an ad hoc login command.
- Do not fall back across accounts, profiles, environments, providers, or
  credential stores.
- Do not treat missing permissions, disabled APIs, wrong projects, network
  failures, or malformed commands as authentication expiry.
- If the host project does not configure a reauthentication command, stop and
  report that the required project-local contract is missing.
- If project configuration conflicts with the implementation, apply the host
  project's discrepancy policy before continuing.
