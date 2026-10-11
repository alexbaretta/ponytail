<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Static language acceptance Suite

[UAT index](index.md) | [Requirements](../requirements/static-language.md)

## Arc STATIC-LANGUAGE: Validate typed sources and emitted runtime

Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE

1. **Step STATIC-INVENTORY:** Inspect every owned executable source, including
   tests, portable skills and hidden host adapters. No handwritten JavaScript
   or unapproved dynamically typed implementation remains. Every generated
   JavaScript artifact resolves to its checked canonical TypeScript source.
2. **Step STATIC-CHECK:** Acceptance contribution to
   [OBL-70](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-70) and
   [OBL-71](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-71). Run configured strict compiler and existing TSTS checks
   for all owned TypeScript projects. All pass without type-system bypasses;
   configuration does not evade diagnostics by accepting handwritten JavaScript.
3. **Step STATIC-RUNTIME:** Acceptance contribution to
   [OBL-72](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-72)
   and the pending per-operation migration obligations. Build and install from clean inputs. Exercise focused
   runtime proofs, native worker startup/resume, installers and final repository
   QA against emitted code. Supported behavior and V1 contract meanings remain
   intact; historical JavaScript evidence alone cannot satisfy this Step.

STATIC-INVENTORY must enumerate and register the remaining per-operation atomic
obligations before their assignments or final acceptance. STATIC-RUNTIME then
identifies the exact registered IDs demonstrated by each focused operation proof.
Until that reconciliation is complete, the inventory and whole-language acceptance
remain unresolved even when the compiler/checker/runtime foundation passes.

### Acceptance STATIC-INVENTORY-PRESENTATION

Demonstrates
[OBL-73](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-73)
through STATIC-RUNTIME. Execute typed formatter proof for physical V2/V3 and
empty valid inventories, then existing census CLI proof. Observe exact summaries,
both diagnostic levels, unmanaged references, input preservation and final
newline through the generated typed runtime. Strict build and unchanged TSTS
must pass. This proves this operation only; whole-language acceptance remains open.

### Acceptance STATIC-CAMPAIGN-LISTING

Demonstrates
[OBL-74](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-74)
through STATIC-RUNTIME. Execute the existing campaign listing CLI proof against
the generated typed owner. Observe all five normalized lifecycle filters, active
membership precedence and unchanged output. Verify invalid inventory rejection,
strict build and unchanged TSTS. This demonstrates listing only; activation,
dispatch replacement and whole-language acceptance remain open.

### Acceptance STATIC-CAMPAIGN-ACTIVATION

Demonstrates
[OBL-75](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-75)
through STATIC-RUNTIME. Activate a pending campaign through the generated typed
owner and existing CLI. Observe the move, canonical status, internal and external
relative links with suffixes, unchanged absolute/URL/anchor links and symlink
exclusion. A failed write must restore the directory and original Markdown bytes.
Check existing-destination and invalid-status errors and already-active behavior.
Strict build and unchanged TSTS must pass; this proves activation only.

### Acceptance STATIC-CAMPAIGN-INVOCATION

Demonstrates [OBL-76](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-76)
through STATIC-RUNTIME. Parse list/activate/validate/report arguments and execute
existing census CLI/format proof. Observe all status flags, required inputs,
validate-all JSON rules, ordered table overrides and JSON/table incompatibility.
Invalid commands, options, duplicates and extra inputs return CAMPAIGN_USAGE with
the established usage message. Strict build and unchanged TSTS must pass.
Legacy dispatch routing is not demonstrated by this acceptance.
