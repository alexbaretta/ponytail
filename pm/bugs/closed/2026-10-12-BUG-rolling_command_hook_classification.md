<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Plan-input hook treats rolling flags as legacy plan names

- ID: 2026-10-12-BUG-rolling_command_hook_classification
- Type: BUG
- Status: CLOSED
- Authority: stakeholder authorized Ponytail tooling repairs for the parallel
  traceability campaign.
Traceability: introduces REQ-PLAN-INPUT-QUEUE from issue 2026-10-12-BUG-rolling_command_hook_classification
Traceability: introduces REQ-ROLLING-INTERFACES from issue 2026-10-12-BUG-rolling_command_hook_classification
- Atomic obligation: the legacy plan-input hook leaves rolling named commands
  to the canonical CLI while preserving historical coordinator authentication.
- Root cause: its legacy campaign regex interprets the first named rolling flag
  as a positional historical plan selector and invokes legacy plan resolution.
- Repair: typed classification consults the canonical rolling command registry.
  Named flags/help remain subject to rolling CLI validation. Positional legacy
  plan commands and historical --json readers retain their existing hook path.
  Classification examines every chained campaign command, so a preceding
  rolling operation does not conceal a later legacy mutation.
- Differential proof: the real hook subprocess rejects named reconcile before
  repair; afterward rolling reconcile/status/help reach CLI validation, while
  unbound positional and chained historical mutations remain denied.
- Validation: focused plan-input regression/queue/command/hook cohort 18/18.
  Full npm test passed 547 legacy, 276 typed, 23 Pi, 4 MCP and 80 TSTS tests,
  installation checks, 903 traceability relationships and TSTS on 1554 files.
  Rule-copy/version checks passed; separate adversarial review accepted.
  Global installed hooks/configuration were not modified.
- Raw evidence: ignored tmp/rolling-hook-before.log and
  tmp/rolling-hook-focused.log.
