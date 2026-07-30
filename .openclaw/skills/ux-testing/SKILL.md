---
name: ux-testing
description: "Real-path UX validation"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# UX Testing

Validate user-facing behavior through the same product path available to the
user. Separate interactive evidence, causal unit coverage, and full-stack
integration coverage; each proves a different part of the change.

## Project Configuration Contract

The host configures this skill in `AGENTS.md` with `UX connection skill`,
naming the skill that owns interaction with the project's UX. There is no
generic default. The host's standard project configuration also supplies the
local-environment commands, focused and full unit-test commands, integration
arc inventory, focused integration command, and final acceptance command.

Load and follow the configured UX connection skill before interacting with the
UX. Do not assume a browser, DOM, desktop automation protocol, operating-system
controller, command transport, or framework. Do not silently substitute a
different interaction channel when the configured skill is missing or cannot
perform the required action; report the missing capability under the host's
configuration-discrepancy policy.

## Workflow

1. Define the observable behavior: starting surface, actor or role, required
   state, action, expected result, and negative or failure cases.
2. Use the configured UX connection skill to reproduce the current behavior
   through the real user path. For a bug, distinguish the visible symptom from
   the confirmed causal mechanism.
3. Use controlled evidence to confirm the owning layer. A visual observation,
   correlated log line, or unfalsified hypothesis is not a root-cause proof.
4. Record any review or approval evidence required by the host's active plan or
   bug workflow before changing behavior.
5. Implement the fix in the owning product path. Do not add a testing mode,
   alternate implementation, bypass endpoint, fake dependency, or duplicate
   interaction path.
6. Re-run the real UX workflow through the configured connection skill,
   including the relevant failure or denial path.
7. Add or update focused unit tests for the causal mechanism and integration
   steps for the user-visible workflow. Do not make both layers copies of the
   same mocked call graph.
8. Run the smallest focused unit and integration selections that prove the
   change, then the host's configured milestone gate.

Direct backend, database, or component probes may support differential
diagnosis, but label them as supporting evidence. They do not replace proof
through the configured UX connection skill.

## Integration Regression

Exercise the complete product path with real application components. Keep
state isolated and disposable. Use ephemeral databases and sandbox provider
accounts when the scenario crosses those boundaries; never alter unrelated
local, cloud, or live data.

Do not use mocks, fake provider responses, synthetic production results, or a
test-only product branch in full-stack integration coverage. Harness code may
create state and isolate external dependencies, but must not replace the
product behavior under test.

Extend an existing integration arc when the scenario shares its setup, actor,
fixtures, starting state, and contiguous workflow. Create a new arc when setup,
isolation, provider, role, destructive state, or reset requirements differ
materially. Prefer the smallest selectable portion during development.

## Completion Check

- The configured UX connection skill proves the changed observable behavior.
- Failure, denial, empty, or edge behavior relevant to the change is covered.
- Focused unit tests prove the causal mechanism.
- Full-stack integration steps prove the user workflow without product mocks or
  test-only behavior.
- Test state is isolated from unrelated environments and data.
- Applicable focused tests and the configured milestone gate pass.
- Required plan or bug records contain the implementation and validation
  evidence.

If validation is impossible, report the missing connection capability,
fixture, environment state, or integration seam. Do not claim full UX
validation.
