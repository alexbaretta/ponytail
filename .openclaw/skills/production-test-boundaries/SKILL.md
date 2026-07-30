---
name: production-test-boundaries
description: "Production and test architecture separation"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Production Test Boundaries

Production artifacts contain product behavior. Test harnesses own test
configuration and orchestration without changing the product path they prove.

## Project Configuration Contract

Use the host's configured unit, integration, focused-workflow, build,
packaging, and final-acceptance commands. The host should also identify, directly
or by reference, its production compilation and packaging inputs and its
integration-environment setup when those are not discoverable from those
commands.

Do not invent a test environment, provider substitute, or integration command
when project configuration is absent. Apply the host's configuration-
discrepancy policy.

## Production Boundary

- Keep test modes, test-only environment variables, fake scenarios, synthetic
  responses, test-only commands, and test-conditioned branches out of
  production compilation inputs and shipped artifacts.
- Keep test doubles in test or test-support compilation inputs. Production code
  must not import them, read their configuration, or coordinate their state.
- Keep every production call path canonical. Testing must not introduce a
  second implementation or bypass the behavior under test.
- Inspect compilation and packaging inputs before adding test infrastructure.
  Add a focused automated guard when test support could otherwise be imported,
  bundled, configured, or enabled by production code.

## Unit-Test Boundary

Use real in-process production dependencies when they are deterministic and
safe. Replace only unavailable, nondeterministic, destructive, or external
boundaries such as databases, cloud services, third-party services, devices,
clocks, or process boundaries.

Keep doubles behaviorally subordinate to the production contract. Do not copy
production transformation or validation logic into a double. Apply the host's
language-specific unit-testing and static-contract skills for fixture and
double typing.

## Integration Boundary

Run the complete executable product stack without mocks, fakes, test-mode
product branches, or synthetic provider responses. The integration harness,
not production code, owns repeatable isolated configuration, including:

- an isolated database prepared with the same migrations and owned custom SQL
  as the target environment;
- real sandbox accounts or services for configured external dependencies; and
- credentials, endpoints, cleanup, and isolation that prevent effects on
  development, cloud, or live environment data outside the test run.

An integration check that replaces the boundary whose behavior it claims to
prove is not integration evidence. Record unavailable external proof as an
explicitly unverified gate rather than substituting a fake success.

## Review Checklist

- Production compilation and packaging inputs contain no test mechanism.
- Production behavior has one path regardless of who invokes it.
- Unit doubles replace only legitimate boundaries.
- Integration tests execute the real vertical slice with isolated state.
- Focused guards prevent test support from entering shipped artifacts.
