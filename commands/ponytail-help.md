<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Help

- `/ponytail off|lite|full|ultra` selects the compaction level. Core
  engineering rules remain active at every level.
- `/ponytail-review` reviews current changes for unnecessary complexity.
- `/ponytail-audit` audits a repository for unnecessary complexity.
- `/ponytail-debt` records exceptional `tech-debt:` markers in the
  project's canonical technical-debt document.
- `/ponytail-help` displays this reference without changing state.

The default level is `full`. Configure it with `PONYTAIL_DEFAULT_MODE`
or `~/.config/ponytail/config.json` using `{"defaultMode":"lite"}`.
