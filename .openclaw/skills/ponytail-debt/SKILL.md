---
name: ponytail-debt
description: "Harvest exceptional tech-debt: markers into the canonical technical-debt document without creating a second ledger."
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Technical Debt

Use the project's configured technical-debt document. If project-local
configuration names no document, use `tech_debt.md` at the project root.

The canonical document is the source of truth. Prefer a concise entry
there over an inline marker. When an inline marker is unavoidable, use
`tech-debt:` in the language's ordinary comment syntax and state both the
known limitation and the concrete trigger or condition for revisiting it.

To harvest debt:

1. Read the canonical technical-debt document.
2. Search tracked source and documentation for `tech-debt:` markers,
   excluding dependencies, generated output, build output, and VCS data.
3. Add missing entries to the canonical document without duplicating
   existing records.
4. Report malformed markers that lack a limitation or revisit trigger.
5. Report the number of markers found, entries added, and malformed
   markers. If no markers exist, say so without changing the document.

Do not use product or project branding as a debt-marker namespace. Do not
create a second debt ledger.
