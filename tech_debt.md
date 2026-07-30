<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>

Licensed under the MIT License. See LICENSE in the project root.
-->

# Technical Debt

## Gemini CLI support

Ponytail intentionally removed its Gemini CLI extension adapter so Codex
can automatically discover the shared lifecycle configuration at
`hooks/hooks.json`. Gemini CLI automatically loads that same path using an
incompatible hook contract and does not support declaring a different
hook path in `gemini-extension.json`.

Restoring Gemini CLI support requires either host-specific distribution
packages or upstream support for manifest-declared Gemini hook paths. The
upstream limitation is tracked in
[google-gemini/gemini-cli#25630](https://github.com/google-gemini/gemini-cli/issues/25630).

Codex's bundled `plugin-creator` validator still rejects the otherwise
supported `hooks` manifest field. Ponytail now uses automatic discovery,
so that defect no longer blocks validation. It remains tracked in
[openai/codex#27141](https://github.com/openai/codex/issues/27141).

## Uninstaller parsing

The uninstaller recognizes shell command segments using a narrow
separator heuristic and leaves malformed `settings.json` files untouched
because it cannot safely reconstruct them. Revisit this when a supported
host exposes a structured uninstallation API.

## Status-line install paths

Ponytail embeds its install path in a status-line shell command only when
the path contains allowlisted ordinary path characters. Other paths fall
back to manual status-line setup. Revisit this when every supported host
provides a shell-independent status API.
