---
name: requirements
description: "Linked requirements and issue activation reconciliation"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements

Maintain the human-language description of what the project must do in its
configured requirements root, by default `pm/requirements`. Aim for complete
coverage of intended behavior over time. Do not invent requirements to fill
gaps or claim completeness without evidence.

Every approved requirement must be traceable to an expressed stakeholder
need, decision, or authoritative external contract. Examples, aspirations,
possible future migrations, architectural preferences, inferred
comprehensiveness, and opportunities discovered during implementation remain
proposals until a stakeholder approves them as requirements. Do not convert
them into active scope merely because they would make the product more useful,
elegant, uniform, extensible, or future-proof.

## A Browsable Markdown Web

Use `index.md` as the entry point. Organize topic pages by the project's domain
and users' needs, with descriptive titles, relative Markdown links, and stable
section anchors. Every requirements page must be reachable from the index
through links and provide a way back to its parent or the index. Cross-link
related concepts so readers can navigate the requirements as a web of pages.
Directories alone are not navigation. No hosted site or site generator is
required; ordinary Markdown browsing must suffice.

Each behavior has one canonical description. Other pages, issues, and plans
link to it rather than maintaining competing copies. Describe actors, intended
outcomes, observable behavior, constraints, relevant failure behavior, and
acceptance examples where they clarify meaning. Separate approved requirements
from proposals and unresolved questions. Distinguish intended behavior from
whether it has been implemented; an active feature's requirement need not
already be available in the product.

Keep implementation algorithms, sprint steps, incident logs, and debugging
evidence with their owning plan or issue. Link them when useful for traceability.
Preserve existing document ownership; link authoritative requirements already
maintained elsewhere instead of duplicating them.

## Issue Activation Gate

Apply this workflow whenever any issue enters the active-work status defined
by `issue-tracking`, including entry from deferred or closed states and custom
status names. The issue's type and epic association do not exempt it.

1. Read the issue's approved scope and the relevant canonical requirements.
   Follow links far enough to find existing definitions and conflicting rules.
2. Reconcile the requirements according to the configured type semantics:
   - `FEAT` adds requirements: write the approved new behavior into its owning
     pages and navigation. If that exact addition was already documented,
     verify and link it; do not create duplicate text.
   - `BUG` may clarify requirements: add or clarify intended behavior when
     absent or ambiguous. If the exact expected behavior is already present,
     no requirements document edit is needed; link that passage and record
     why it already covers the bug.
   - `TASK` requires the same assessment: update requirements if intended
     behavior or constraints change; otherwise record the linked review and
     why no requirements change is needed.
   - For custom types, use their configured requirements effect rather than
     assuming they behave like one of the default tokens.
3. Resolve conflicting or unspecified product decisions with the user when
   they affect the intended result. Do not rewrite requirements to excuse
   observed defective behavior. Keep the active-state transition pending when
   its required requirements change cannot yet be made.
4. Update the requirements documents and the issue's requirements links and
   reconciliation evidence in the same change as the transition. When no
   document edit is needed, the recorded review and exact existing references
   are still required. For work with no relevant product requirement, record
   the reviewed area and the reason instead of inventing a requirement.

An epic's plan links the affected requirements, but a plan link never replaces
this reconciliation. After deferral, rejection, or a scope change, reassess any
requirements introduced by that issue: keep their approval and implementation
state accurate. Do not automatically remove a requirement that remains
approved or is shared by other issues.

When an issue or plan proposes an outcome absent from the approved
requirements, reconcile that outcome with the stakeholder before adding it to
active scope. Approval of a related requirement or broader architectural
direction does not authorize the new outcome.

## Validation

Check changed Markdown structure, relative file links and section anchors,
index reachability, and navigation back to the index. Repair links affected
by issue or plan moves. Review the changed requirements against the approved
scope for contradictions and accidental behavior changes. Use the host's
configured documentation checks; requirements prose alone does not call for
product tests unless a configured execution or generation path consumes it.
