<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Full project isolation

[Back to architecture index](index.md)

Ponytail separates three authority scopes:

1. Ponytail-owned portable behavior may be installed globally.
2. User-owned state that is not derived from a project may be global.
3. Project-derived behavior remains in the invoking project's trusted
   configuration layer and project-keyed durable state.

Ordinary project commands receive only the invoking project's validated
configuration. The user registry locates a current registration but does not
serve as an implicit catalog of foreign project identities. A command may
cross that boundary only when its public contract explicitly names another
project or requests global inventory, such as dependency registration,
project listing, or `validate --all`.

Codex execpolicy uses a global baseline projection and a separate
`.codex/rules/ponytail.rules` projection in each invoking worktree. Migration
from legacy aggregate state removes all project-sourced rules from global
authority and creates state only for the project being updated.
