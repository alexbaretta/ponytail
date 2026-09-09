---
description: "Review changes for over-engineering, what can be deleted"
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

Review the current code changes for over-engineering only, not correctness. One line per finding: L<line>: <tag> <what to cut>. <replacement>. Tags: delete (dead code/speculative feature), stdlib (reinvented standard library), native (dependency doing what the platform does), yagni (abstraction with one implementation), shrink (same logic, fewer lines). End with the net lines removable. If nothing to cut: 'Lean already. Ship.'
