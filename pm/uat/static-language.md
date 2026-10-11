<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Static language acceptance Suite

## Arc STATIC-LANGUAGE: Validate typed sources and emitted runtime

Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE

1. **Step STATIC-INVENTORY:** Inspect every owned executable source, including
   tests, portable skills and hidden host adapters. No handwritten JavaScript
   or unapproved dynamically typed implementation remains. Every generated
   JavaScript artifact resolves to its checked canonical TypeScript source.
2. **Step STATIC-CHECK:** Run configured strict compiler and existing TSTS checks
   for all owned TypeScript projects. All pass without type-system bypasses;
   configuration does not evade diagnostics by accepting handwritten JavaScript.
3. **Step STATIC-RUNTIME:** Build and install from clean inputs. Exercise focused
   runtime proofs, native worker startup/resume, installers and final repository
   QA against emitted code. Supported behavior and V1 contract meanings remain
   intact; historical JavaScript evidence alone cannot satisfy this Step.
